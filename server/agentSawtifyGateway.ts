import type { Express, Request, RequestHandler } from "express";
import type { Server as HttpServer } from "node:http";
import { existsSync } from "node:fs";
import path from "node:path";
import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { WebSocket, WebSocketServer } from "ws";

type GatewayOptions = {
  app: Express;
  httpServer: HttpServer;
  supabase: any;
  resolveUserId: (request: Request) => Promise<string | null>;
  requireAgentAccess: RequestHandler;
  ownerLimiter: RequestHandler;
  allowedOrigins: string[];
  isProduction: boolean;
};

type SocketContext =
  | { kind: "unauthenticated" }
  | { kind: "dashboard"; storeId: string; ownerUserId: string }
  | { kind: "gateway"; gatewayId: string; storeId: string; ownerUserId: string };

type GatewayEventType =
  | "gateway_connected" | "gateway_disconnected" | "telemetry"
  | "inbound_call" | "call_state" | "inbound_sms" | "sms_state"
  | "job_dispatched" | "job_started" | "job_completed" | "job_failed" | "gateway_revoked";

const API_KEY_PREFIX = "swt_gw_";
const PAIRING_TTL_MS = 5 * 60 * 1000;
const DASHBOARD_TICKET_TTL_MS = 90 * 1000;
const ACTIVE_GATEWAY_LIMIT = 10;
const APK_PATH = path.join(process.cwd(), "downloads", "sawtify-gateway.apk");

const sha256 = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");
const makeDeviceKey = () => `${API_KEY_PREFIX}${randomBytes(32).toString("base64url")}`;
const validUuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const safeText = (value: unknown, maxLength: number) => typeof value === "string" ? value.trim().slice(0, maxLength) : "";
const safeInteger = (value: unknown, min: number, max: number): number | null => {
  const number = typeof value === "number" ? value : Number.NaN;
  return Number.isInteger(number) && number >= min && number <= max ? number : null;
};
const nowIso = () => new Date().toISOString();
const timingSafeHexEqual = (expectedHex: string, actualHex: string) => {
  if (!/^[0-9a-f]{64}$/i.test(expectedHex) || !/^[0-9a-f]{64}$/i.test(actualHex)) return false;
  return timingSafeEqual(Buffer.from(expectedHex, "hex"), Buffer.from(actualHex, "hex"));
};

function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  const digits = trimmed.replace(/[^0-9]/g, "");
  if (!digits) return null;
  let normalized: string;
  if (trimmed.startsWith("+")) normalized = `+${digits}`;
  else if (trimmed.startsWith("00")) normalized = `+${digits.slice(2)}`;
  else if (digits.startsWith("213")) normalized = `+${digits}`;
  else if (digits.startsWith("0")) normalized = `+213${digits.slice(1)}`;
  else normalized = `+${digits}`;
  return /^\+[1-9]\d{7,14}$/.test(normalized) ? normalized : null;
}

function sanitizeSimSlots(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 2).flatMap((entry: any) => {
    if (!entry || typeof entry !== "object") return [];
    const slot = safeText(entry.slot, 2);
    if (!/^[01]$/.test(slot)) return [];
    const state = ["ready", "no_service", "disabled", "unknown"].includes(entry.state) ? entry.state : "unknown";
    const operator = safeText(entry.operator, 40);
    return [{ slot, state, operator }];
  });
}

function sanitizeCapabilities(value: unknown) {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    outbound_call: source.outbound_call === true,
    inbound_call: source.inbound_call === true,
    sms_send: source.sms_send === true,
    sms_receive: source.sms_receive === true,
    pcm_audio: source.pcm_audio === true,
  };
}

function sendJson(socket: WebSocket, packet: Record<string, unknown>) {
  if (socket.readyState !== WebSocket.OPEN) return false;
  try {
    socket.send(JSON.stringify(packet));
    return true;
  } catch {
    return false;
  }
}

export function registerAgentSawtifyGateway(options: GatewayOptions) {
  const { app, httpServer, supabase } = options;
  const gatewaySockets = new Map<string, WebSocket>();
  const dashboardSockets = new Map<string, Set<WebSocket>>();
  const socketContexts = new WeakMap<WebSocket, SocketContext>();
  const lastTelemetryEvent = new Map<string, number>();
  const lastAudioBridgeWarning = new Map<string, number>();
  const gatewayWss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024, perMessageDeflate: false });
  const frontendOrigins = new Set(options.allowedOrigins.map((origin) => origin.replace(/\/+$/, "")).filter(Boolean));

  const writeEvent = async (input: {
    storeId: string;
    ownerUserId: string;
    gatewayId?: string | null;
    jobId?: string | null;
    eventType: GatewayEventType;
    details?: Record<string, unknown>;
  }) => {
    if (!supabase) return;
    try {
      const { error } = await supabase.from("agent_sawtify_gateway_events").insert({
        store_id: input.storeId,
        owner_user_id: input.ownerUserId,
        gateway_id: input.gatewayId || null,
        job_id: input.jobId || null,
        event_type: input.eventType,
        details: input.details || {},
      });
      if (error) console.warn("[Gateway] Événement non enregistré:", error.message);
    } catch (error: any) {
      console.warn("[Gateway] Journalisation indisponible:", error?.message || error);
    }
  };

  const broadcast = (storeId: string, packet: Record<string, unknown>) => {
    const sockets = dashboardSockets.get(storeId);
    if (!sockets) return;
    const encoded = JSON.stringify(packet);
    for (const socket of sockets) {
      if (socket.readyState === WebSocket.OPEN) socket.send(encoded);
      else sockets.delete(socket);
    }
    if (sockets.size === 0) dashboardSockets.delete(storeId);
  };

  const findOwnedStore = async (ownerUserId: string) => {
    const { data, error } = await supabase.from("agent_sawtify_stores")
      .select("id, slug")
      .eq("owner_user_id", ownerUserId)
      .maybeSingle();
    return { store: data || null, error: error || null };
  };

  const getGatewaySnapshot = async (storeId: string, ownerUserId: string) => {
    const { data, error } = await supabase.from("agent_sawtify_gateways")
      .select("id, device_id, device_name, status, battery_percent, network_state, signal_percent, active_sim_slot, sim_slots, capabilities, last_seen_at, paired_at, created_at")
      .eq("store_id", storeId)
      .eq("owner_user_id", ownerUserId)
      .is("revoked_at", null)
      .order("paired_at", { ascending: false })
      .limit(ACTIVE_GATEWAY_LIMIT);
    if (error) throw new Error(error.message);
    return (data || []).map((gateway: any) => ({
      ...gateway,
      online: gatewaySockets.get(gateway.id)?.readyState === WebSocket.OPEN,
      status: gatewaySockets.get(gateway.id)?.readyState === WebSocket.OPEN ? "online" : "offline",
    }));
  };

  const queuePendingJobs = async (gatewayId: string, socket: WebSocket, storeId: string, ownerUserId: string) => {
    const { data, error } = await supabase.from("agent_sawtify_gateway_jobs")
      .select("id, action, destination, message_text, sim_slot, order_id, created_at")
      .eq("gateway_id", gatewayId)
      .eq("store_id", storeId)
      .eq("owner_user_id", ownerUserId)
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(5);
    if (error) {
      console.warn("[Gateway] File de commandes indisponible:", error.message);
      return;
    }
    for (const job of data || []) {
      const stale = !job.created_at || Date.parse(job.created_at) < Date.now() - 2 * 60 * 1000;
      let requestStillConfirmed = false;
      if (!stale && job.order_id) {
        const { data: order } = await supabase.from("agent_sawtify_orders")
          .select("id, status")
          .eq("id", job.order_id).eq("store_id", storeId).eq("owner_user_id", ownerUserId)
          .maybeSingle();
        requestStillConfirmed = order?.status === "confirmed";
      }
      if (stale || !requestStillConfirmed) {
        const failedAt = nowIso();
        const errorCode = stale ? "COMMAND_EXPIRED" : "CUSTOMER_REQUEST_NOT_CONFIRMED";
        await supabase.from("agent_sawtify_gateway_jobs")
          .update({ status: "failed", error_code: errorCode, finished_at: failedAt })
          .eq("id", job.id).eq("gateway_id", gatewayId).eq("status", "queued");
        await writeEvent({ storeId, ownerUserId, gatewayId, jobId: job.id, eventType: "job_failed", details: { action: job.action, error_code: errorCode } });
        broadcast(storeId, { type: "job_update", job: { id: job.id, status: "failed", error_code: errorCode, finished_at: failedAt } });
        continue;
      }
      const dispatchedAt = nowIso();
      const { error: updateError } = await supabase.from("agent_sawtify_gateway_jobs")
        .update({ status: "dispatched", dispatched_at: dispatchedAt })
        .eq("id", job.id)
        .eq("gateway_id", gatewayId)
        .eq("status", "queued");
      if (updateError) break;
      const sent = sendJson(socket, {
        type: "command",
        command: {
          id: job.id,
          action: job.action === "outbound_call" ? "telephony.place_call" : "sms.send",
          issued_at: dispatchedAt,
          expires_at: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
          payload: {
            destination: job.destination,
            message: job.action === "send_sms" ? job.message_text : undefined,
            sim_slot: job.sim_slot,
          },
        },
      });
      if (!sent) {
        await supabase.from("agent_sawtify_gateway_jobs").update({ status: "queued", dispatched_at: null }).eq("id", job.id).eq("status", "dispatched");
        break;
      }
      await writeEvent({ storeId, ownerUserId, gatewayId, jobId: job.id, eventType: "job_dispatched", details: { action: job.action } });
      broadcast(storeId, { type: "job_update", job: { id: job.id, status: "dispatched", dispatched_at: dispatchedAt } });
    }
  };

  const dashboardOriginAllowed = (request: any) => {
    const origin = String(request.headers?.origin || "").replace(/\/+$/, "");
    if (!origin) return true; // Android/native clients do not send Origin.
    return !options.isProduction || frontendOrigins.has(origin);
  };

  const gatewayWsPath = "/api/agent/sawtify/gateway/ws";
  httpServer.on("upgrade", (request, socket, head) => {
    let pathname = "";
    try { pathname = new URL(request.url || "/", "http://localhost").pathname; } catch { socket.destroy(); return; }
    if (pathname !== gatewayWsPath) {
      if (options.isProduction) socket.destroy(); // In development, Vite owns its HMR upgrade paths.
      return;
    }
    gatewayWss.handleUpgrade(request, socket, head, (websocket) => {
      gatewayWss.emit("connection", websocket, request);
    });
  });

  gatewayWss.on("connection", (socket, request) => {
    socketContexts.set(socket, { kind: "unauthenticated" });
    const authTimeout = setTimeout(() => socket.close(4001, "Authentication required"), 10_000);

    socket.on("message", (raw) => {
      void (async () => {
        let message: any;
        try { message = JSON.parse(raw.toString()); } catch { socket.close(4002, "Invalid JSON"); return; }
        if (!message || typeof message !== "object" || Array.isArray(message)) return;

        const context = socketContexts.get(socket) || { kind: "unauthenticated" as const };
        if (context.kind === "unauthenticated") {
          if (message.type === "dashboard_auth") {
            if (!dashboardOriginAllowed(request)) { socket.close(4003, "Origin not allowed"); return; }
            const ticket = safeText(message.ticket, 200);
            if (ticket.length < 32 || !supabase) { socket.close(4001, "Invalid ticket"); return; }
            const ticketHash = sha256(ticket);
            const now = nowIso();
            const { data: claimed, error } = await supabase.from("agent_sawtify_gateway_ws_tickets")
              .update({ consumed_at: now })
              .eq("ticket_hash", ticketHash)
              .is("consumed_at", null)
              .gt("expires_at", now)
              .select("store_id, owner_user_id")
              .maybeSingle();
            if (error || !claimed) { socket.close(4001, "Expired ticket"); return; }
            clearTimeout(authTimeout);
            const dashboardContext: SocketContext = { kind: "dashboard", storeId: claimed.store_id, ownerUserId: claimed.owner_user_id };
            socketContexts.set(socket, dashboardContext);
            const peers = dashboardSockets.get(claimed.store_id) || new Set<WebSocket>();
            peers.add(socket);
            dashboardSockets.set(claimed.store_id, peers);
            try {
              const gateways = await getGatewaySnapshot(claimed.store_id, claimed.owner_user_id);
              sendJson(socket, { type: "gateway_snapshot", gateways, received_at: nowIso() });
            } catch {
              sendJson(socket, { type: "gateway_error", error: "Les données de la passerelle ne sont pas disponibles." });
            }
            return;
          }

          if (message.type === "claim_pairing") {
            if (!supabase) { socket.close(1013, "Database unavailable"); return; }
            const pairingToken = safeText(message.pairing_token, 200);
            const deviceId = safeText(message.device_id, 128);
            const deviceName = safeText(message.device_name, 80) || "Passerelle Sawtify";
            if (pairingToken.length < 32 || deviceId.length < 8 || !/^[A-Za-z0-9._:-]+$/.test(deviceId)) { socket.close(4002, "Invalid pairing request"); return; }
            const now = nowIso();
            const { data: pairing, error: pairingError } = await supabase.from("agent_sawtify_gateway_pairing_tokens")
              .update({ claimed_at: now })
              .eq("token_hash", sha256(pairingToken))
              .is("claimed_at", null)
              .gt("expires_at", now)
              .select("id, store_id, owner_user_id")
              .maybeSingle();
            if (pairingError || !pairing) { socket.close(4001, "Pairing token expired or used"); return; }
            const { store, error: storeError } = await findOwnedStore(pairing.owner_user_id);
            if (storeError || !store || store.id !== pairing.store_id) { socket.close(4003, "Store unavailable"); return; }
            const { count, error: countError } = await supabase.from("agent_sawtify_gateways")
              .select("id", { count: "exact", head: true })
              .eq("owner_user_id", pairing.owner_user_id)
              .is("revoked_at", null);
            if (countError || Number(count || 0) >= ACTIVE_GATEWAY_LIMIT) { socket.close(4004, "Gateway limit reached"); return; }

            const deviceKey = makeDeviceKey();
            const gatewayId = randomUUID();
            const { data: gateway, error: insertError } = await supabase.from("agent_sawtify_gateways").insert({
              id: gatewayId,
              store_id: pairing.store_id,
              owner_user_id: pairing.owner_user_id,
              device_id: deviceId,
              device_name: deviceName,
              api_key_prefix: deviceKey.slice(0, 24),
              api_key_hash: sha256(deviceKey),
              status: "online",
              last_seen_at: now,
              paired_at: now,
            }).select("id").single();
            if (insertError || !gateway) {
              console.warn("[Gateway] Appairage non enregistré:", insertError?.message);
              socket.close(4005, "Could not register gateway");
              return;
            }
            clearTimeout(authTimeout);
            const prior = gatewaySockets.get(gatewayId);
            if (prior && prior !== socket) prior.close(4002, "Replaced by another session");
            gatewaySockets.set(gatewayId, socket);
            socketContexts.set(socket, { kind: "gateway", gatewayId, storeId: pairing.store_id, ownerUserId: pairing.owner_user_id });
            if (!sendJson(socket, { type: "paired", gateway_id: gatewayId, device_key: deviceKey, server_time: now })) {
              socket.close(1011, "Could not deliver device key");
              return;
            }
            await writeEvent({ storeId: pairing.store_id, ownerUserId: pairing.owner_user_id, gatewayId, eventType: "gateway_connected", details: { pairing: true } });
            broadcast(pairing.store_id, { type: "gateway_changed", gateway_id: gatewayId, online: true, paired: true });
            await queuePendingJobs(gatewayId, socket, pairing.store_id, pairing.owner_user_id);
            return;
          }

          if (message.type === "authenticate") {
            const deviceKey = safeText(message.device_key, 200);
            if (!supabase || !deviceKey.startsWith(API_KEY_PREFIX) || deviceKey.length < 40) { socket.close(4001, "Invalid device key"); return; }
            const keyPrefix = deviceKey.slice(0, 24);
            const { data: candidate, error } = await supabase.from("agent_sawtify_gateways")
              .select("id, store_id, owner_user_id, api_key_hash, revoked_at")
              .eq("api_key_prefix", keyPrefix)
              .maybeSingle();
            if (error || !candidate || candidate.revoked_at || !timingSafeHexEqual(candidate.api_key_hash, sha256(deviceKey))) {
              socket.close(4001, "Invalid device key");
              return;
            }
            clearTimeout(authTimeout);
            const previous = gatewaySockets.get(candidate.id);
            if (previous && previous !== socket) previous.close(4002, "Replaced by another session");
            gatewaySockets.set(candidate.id, socket);
            socketContexts.set(socket, { kind: "gateway", gatewayId: candidate.id, storeId: candidate.store_id, ownerUserId: candidate.owner_user_id });
            const connectedAt = nowIso();
            await supabase.from("agent_sawtify_gateways").update({ status: "online", last_seen_at: connectedAt, updated_at: connectedAt }).eq("id", candidate.id);
            await writeEvent({ storeId: candidate.store_id, ownerUserId: candidate.owner_user_id, gatewayId: candidate.id, eventType: "gateway_connected", details: { pairing: false } });
            broadcast(candidate.store_id, { type: "gateway_changed", gateway_id: candidate.id, online: true });
            sendJson(socket, { type: "authenticated", gateway_id: candidate.id, server_time: connectedAt });
            await queuePendingJobs(candidate.id, socket, candidate.store_id, candidate.owner_user_id);
            return;
          }

          socket.close(4001, "Authentication required");
          return;
        }

        if (context.kind === "dashboard") {
          // No browser-originated commands. GSM actions are only queued through authenticated,
          // audited REST endpoints after explicit consent confirmation.
          return;
        }

        if (message.type === "audio_frame") {
          const encoded = safeText(message.pcm_base64, 12_000);
          const validFrame = message.sample_rate_hz === 16_000
            && message.encoding === "pcm_s16le"
            && encoded.length > 0
            && /^[A-Za-z0-9+/]*={0,2}$/.test(encoded);
          if (!validFrame) { sendJson(socket, { type: "gateway_error", code: "INVALID_AUDIO_FRAME", error: "Trame PCM invalide." }); return; }
          const frame = Buffer.from(encoded, "base64");
          if (frame.length === 0 || frame.length > 8_192 || frame.length % 2 !== 0) { sendJson(socket, { type: "gateway_error", code: "INVALID_AUDIO_FRAME", error: "Taille de trame PCM invalide." }); return; }
          // Audio is never persisted. A server-side Gemini Live bridge is required before
          // microphone frames can be consumed; reject rather than silently dropping or
          // pretending that a GSM call is an AI voice session.
          const lastWarning = lastAudioBridgeWarning.get(context.gatewayId) || 0;
          if (Date.now() - lastWarning > 30_000) {
            lastAudioBridgeWarning.set(context.gatewayId, Date.now());
            sendJson(socket, { type: "gateway_error", code: "LIVE_AUDIO_BRIDGE_NOT_CONFIGURED", error: "Le relais audio Live côté serveur n’est pas encore configuré." });
          }
          return;
        }

        if (message.type === "telemetry") {
          const battery = safeInteger(message.battery_percent, 0, 100);
          const signal = safeInteger(message.signal_percent, 0, 100);
          const networkState = ["connected", "no_service", "airplane_mode", "unknown"].includes(message.network_state) ? message.network_state : "unknown";
          const simSlots = sanitizeSimSlots(message.sim_slots);
          const activeSimSlot = /^[01]$/.test(String(message.active_sim_slot ?? "")) ? String(message.active_sim_slot) : null;
          const capabilities = sanitizeCapabilities(message.capabilities);
          const seenAt = nowIso();
          const update = {
            status: "online",
            battery_percent: battery,
            signal_percent: signal,
            network_state: networkState,
            active_sim_slot: activeSimSlot,
            sim_slots: simSlots,
            capabilities,
            last_seen_at: seenAt,
            updated_at: seenAt,
          };
          const { error } = await supabase.from("agent_sawtify_gateways").update(update)
            .eq("id", context.gatewayId).eq("store_id", context.storeId).is("revoked_at", null);
          if (error) { sendJson(socket, { type: "gateway_error", error: "La télémétrie n’a pas pu être enregistrée." }); return; }
          const packet = { type: "gateway_telemetry", gateway_id: context.gatewayId, online: true, telemetry: { ...update, sim_slots: simSlots } };
          broadcast(context.storeId, packet);
          const lastEvent = lastTelemetryEvent.get(context.gatewayId) || 0;
          if (Date.now() - lastEvent >= 60_000) {
            lastTelemetryEvent.set(context.gatewayId, Date.now());
            await writeEvent({ storeId: context.storeId, ownerUserId: context.ownerUserId, gatewayId: context.gatewayId, eventType: "telemetry", details: { network_state: networkState, battery_percent: battery, signal_percent: signal } });
          }
          return;
        }

        if (message.type === "call_event") {
          const direction = ["inbound", "outbound", "unknown"].includes(message.direction) ? message.direction : "unknown";
          const state = ["ringing", "active", "ended", "missed", "rejected"].includes(message.state) ? message.state : "unknown";
          const simSlot = /^[01]$/.test(String(message.sim_slot ?? "")) ? String(message.sim_slot) : null;
          const eventType: GatewayEventType = direction === "inbound" && state === "ringing" ? "inbound_call" : "call_state";
          const details = { direction, state, sim_slot: simSlot };
          const { error } = await supabase.from("agent_sawtify_gateways")
            .update({ last_seen_at: nowIso(), updated_at: nowIso() }).eq("id", context.gatewayId).is("revoked_at", null);
          if (error) return;
          await writeEvent({ storeId: context.storeId, ownerUserId: context.ownerUserId, gatewayId: context.gatewayId, eventType, details });
          broadcast(context.storeId, { type: "gateway_event", gateway_id: context.gatewayId, event_type: eventType, details, created_at: nowIso() });
          return;
        }

        if (message.type === "sms_event") {
          // SMS body, sender number, and SIM identifiers are deliberately never forwarded or stored.
          const direction = message.direction === "inbound" ? "inbound" : "outbound";
          const details = { direction, state: message.state === "failed" ? "failed" : direction === "inbound" ? "received" : "sent", sim_slot: /^[01]$/.test(String(message.sim_slot ?? "")) ? String(message.sim_slot) : null };
          const { error } = await supabase.from("agent_sawtify_gateways")
            .update({ last_seen_at: nowIso(), updated_at: nowIso() }).eq("id", context.gatewayId).is("revoked_at", null);
          if (error) return;
          const eventType: GatewayEventType = direction === "inbound" ? "inbound_sms" : "sms_state";
          await writeEvent({ storeId: context.storeId, ownerUserId: context.ownerUserId, gatewayId: context.gatewayId, eventType, details });
          broadcast(context.storeId, { type: "gateway_event", gateway_id: context.gatewayId, event_type: eventType, details, created_at: nowIso() });
          return;
        }

        if (message.type === "job_result") {
          const jobId = validUuid(message.job_id) ? message.job_id : "";
          const nextStatus = ["accepted", "running", "completed", "failed"].includes(message.status) ? message.status : "";
          if (!jobId || !nextStatus) return;
          const finishedAt = ["completed", "failed"].includes(nextStatus) ? nowIso() : null;
          const errorCode = safeText(message.error_code, 64).replace(/[^A-Za-z0-9_-]/g, "");
          const result = {
            sim_slot: /^[01]$/.test(String(message.sim_slot ?? "")) ? String(message.sim_slot) : null,
            duration_seconds: safeInteger(message.duration_seconds, 0, 24 * 60 * 60),
          };
          const update: Record<string, unknown> = {
            status: nextStatus,
            result,
            error_code: nextStatus === "failed" ? (errorCode || "DEVICE_ACTION_FAILED") : null,
            ...(nextStatus === "running" ? { started_at: nowIso() } : {}),
            ...(finishedAt ? { finished_at: finishedAt } : {}),
          };
          const { data: job, error } = await supabase.from("agent_sawtify_gateway_jobs")
            .update(update)
            .eq("id", jobId)
            .eq("gateway_id", context.gatewayId)
            .eq("store_id", context.storeId)
            .select("id, action, status, error_code, finished_at")
            .maybeSingle();
          if (error || !job) return;
          const eventType: GatewayEventType = nextStatus === "completed" ? "job_completed" : nextStatus === "failed" ? "job_failed" : nextStatus === "running" ? "job_started" : "job_dispatched";
          await writeEvent({ storeId: context.storeId, ownerUserId: context.ownerUserId, gatewayId: context.gatewayId, jobId, eventType, details: { action: job.action, status: job.status, error_code: job.error_code } });
          broadcast(context.storeId, { type: "job_update", job });
          return;
        }

        if (message.type === "heartbeat") {
          sendJson(socket, { type: "heartbeat_ack", at: nowIso() });
        }
      })().catch((error: any) => {
        console.warn("[Gateway WS] Message traité en erreur:", error?.message || error);
      });
    });

    socket.on("close", (code) => {
      clearTimeout(authTimeout);
      const context = socketContexts.get(socket);
      if (context?.kind === "dashboard") {
        const peers = dashboardSockets.get(context.storeId);
        peers?.delete(socket);
        if (peers?.size === 0) dashboardSockets.delete(context.storeId);
      } else if (context?.kind === "gateway" && gatewaySockets.get(context.gatewayId) === socket) {
        gatewaySockets.delete(context.gatewayId);
        const disconnectedAt = nowIso();
        void supabase.from("agent_sawtify_gateways")
          .update({ status: "offline", last_seen_at: disconnectedAt, updated_at: disconnectedAt })
          .eq("id", context.gatewayId)
          .is("revoked_at", null)
          .then(async ({ error }: any) => {
            if (error) console.warn("[Gateway] État hors ligne non enregistré:", error.message);
            await writeEvent({ storeId: context.storeId, ownerUserId: context.ownerUserId, gatewayId: context.gatewayId, eventType: "gateway_disconnected", details: { code } });
          })
          .catch((error: any) => console.warn("[Gateway] Fermeture non enregistrée:", error?.message || error));
        broadcast(context.storeId, { type: "gateway_changed", gateway_id: context.gatewayId, online: false, last_seen_at: disconnectedAt });
      }
    });

    socket.on("error", (error) => console.warn("[Gateway WS] Socket error:", error.message));
  });

  // APK served at the requested stable URL when a signed build is actually present.
  app.get("/downloads/sawtify-gateway.apk", (_request, response) => {
    if (!existsSync(APK_PATH)) return response.status(404).type("text/plain").send("APK Sawtify Gateway non disponible : aucune version compilée et signée n’est installée sur ce serveur.");
    response.setHeader("Content-Type", "application/vnd.android.package-archive");
    response.setHeader("Cache-Control", "no-store");
    return response.download(APK_PATH, "sawtify-gateway.apk");
  });

  app.get("/api/agent/sawtify/gateway/state", options.requireAgentAccess, async (request, response) => {
    const ownerUserId = await options.resolveUserId(request);
    if (!ownerUserId) return response.status(401).json({ success: false, error: "Authentification requise." });
    if (!supabase) return response.status(503).json({ success: false, error: "Base de données indisponible." });
    const { store, error: storeError } = await findOwnedStore(ownerUserId);
    if (storeError) return response.status(503).json({ success: false, error: "Impossible de charger votre boutique." });
    if (!store) return response.status(404).json({ success: false, error: "Créez d’abord votre boutique Agent Sawtify." });
    try {
      const [{ data: gateways, error: gatewaysError }, { data: jobs, error: jobsError }, { data: events, error: eventsError }, { count: pendingJobsCount, error: pendingJobsError }] = await Promise.all([
        supabase.from("agent_sawtify_gateways")
          .select("id, device_id, device_name, status, battery_percent, network_state, signal_percent, active_sim_slot, sim_slots, capabilities, last_seen_at, paired_at, created_at")
          .eq("store_id", store.id).eq("owner_user_id", ownerUserId).is("revoked_at", null)
          .order("paired_at", { ascending: false }).limit(ACTIVE_GATEWAY_LIMIT),
        supabase.from("agent_sawtify_gateway_jobs")
          .select("id, gateway_id, order_id, action, destination, sim_slot, status, error_code, created_at, dispatched_at, finished_at")
          .eq("store_id", store.id).eq("owner_user_id", ownerUserId)
          .order("created_at", { ascending: false }).limit(30),
        supabase.from("agent_sawtify_gateway_events")
          .select("id, gateway_id, job_id, event_type, details, created_at")
          .eq("store_id", store.id).eq("owner_user_id", ownerUserId)
          .order("created_at", { ascending: false }).limit(30),
        supabase.from("agent_sawtify_gateway_jobs")
          .select("id", { count: "exact", head: true })
          .eq("store_id", store.id).eq("owner_user_id", ownerUserId)
          .in("status", ["queued", "dispatched", "accepted", "running"]),
      ]);
      const error = gatewaysError || jobsError || eventsError || pendingJobsError;
      if (error) {
        console.warn("[Gateway] Tables non disponibles:", error.message);
        return response.status(503).json({ success: false, error: "La migration Supabase Passerelle GSM n’est pas encore appliquée." });
      }
      const gatewayRows = (gateways || []).map((gateway: any) => ({
        ...gateway,
        online: gatewaySockets.get(gateway.id)?.readyState === WebSocket.OPEN,
        status: gatewaySockets.get(gateway.id)?.readyState === WebSocket.OPEN ? "online" : "offline",
      }));
      const activeCount = gatewayRows.length;
      const onlineCount = gatewayRows.filter((gateway: any) => gateway.online).length;
      const pendingCount = Number(pendingJobsCount || 0);
      const stats = {
        gateways_total: activeCount,
        gateways_online: onlineCount,
        jobs_pending: pendingCount,
        jobs_last_30: (jobs || []).length,
        events_last_30: (events || []).length,
      };
      return response.json({
        success: true,
        features: { sms_gateway_ready: true, gsm_ai_call_ready: false },
        gateways: gatewayRows,
        jobs: (jobs || []).map((job: any) => {
          const { destination, ...safeJob } = job;
          return { ...safeJob, destination_masked: `${String(destination || "").slice(0, 4)}••••${String(destination || "").slice(-2)}` };
        }),
        events: events || [],
        stats,
        apk: { available: existsSync(APK_PATH), download_path: "/downloads/sawtify-gateway.apk" },
        updated_at: nowIso(),
      });
    } catch (error: any) {
      console.error("[Gateway] État impossible à charger:", error?.message || error);
      return response.status(503).json({ success: false, error: "Impossible de charger les données réelles de la passerelle." });
    }
  });

  app.post("/api/agent/sawtify/gateway/pairing-token", options.requireAgentAccess, options.ownerLimiter, async (request, response) => {
    const ownerUserId = await options.resolveUserId(request);
    if (!ownerUserId) return response.status(401).json({ success: false, error: "Authentification requise." });
    if (!supabase) return response.status(503).json({ success: false, error: "Base de données indisponible." });
    const { store, error: storeError } = await findOwnedStore(ownerUserId);
    if (storeError) return response.status(503).json({ success: false, error: "Impossible de vérifier la boutique." });
    if (!store) return response.status(404).json({ success: false, error: "Créez d’abord votre boutique Agent Sawtify." });
    try {
      const { count, error: countError } = await supabase.from("agent_sawtify_gateways")
        .select("id", { count: "exact", head: true }).eq("owner_user_id", ownerUserId).is("revoked_at", null);
      if (countError) return response.status(503).json({ success: false, error: "Impossible de vérifier le nombre de passerelles." });
      if (Number(count || 0) >= ACTIVE_GATEWAY_LIMIT) return response.status(429).json({ success: false, error: `Limite de ${ACTIVE_GATEWAY_LIMIT} passerelles actives atteinte.` });
      const now = Date.now();
      const pairingToken = randomBytes(32).toString("base64url");
      const expiresAt = new Date(now + PAIRING_TTL_MS).toISOString();
      await supabase.from("agent_sawtify_gateway_pairing_tokens").delete().eq("owner_user_id", ownerUserId).is("claimed_at", null);
      const { error } = await supabase.from("agent_sawtify_gateway_pairing_tokens").insert({
        store_id: store.id,
        owner_user_id: ownerUserId,
        token_hash: sha256(pairingToken),
        expires_at: expiresAt,
      });
      if (error) {
        console.warn("[Gateway] Jeton d’appairage non enregistré:", error.message);
        return response.status(503).json({ success: false, error: "La migration Supabase Passerelle GSM est-elle appliquée ?" });
      }
      return response.status(201).json({ success: true, pairing_token: pairingToken, expires_at: expiresAt });
    } catch (error: any) {
      return response.status(500).json({ success: false, error: "Impossible de créer un jeton d’appairage." });
    }
  });

  app.post("/api/agent/sawtify/gateway/ws-ticket", options.requireAgentAccess, async (request, response) => {
    const ownerUserId = await options.resolveUserId(request);
    if (!ownerUserId) return response.status(401).json({ success: false, error: "Authentification requise." });
    if (!supabase) return response.status(503).json({ success: false, error: "Base de données indisponible." });
    const { store, error: storeError } = await findOwnedStore(ownerUserId);
    if (storeError) return response.status(503).json({ success: false, error: "Impossible de vérifier la boutique." });
    if (!store) return response.status(404).json({ success: false, error: "Boutique introuvable." });
    const ticket = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + DASHBOARD_TICKET_TTL_MS).toISOString();
    const { error } = await supabase.from("agent_sawtify_gateway_ws_tickets").insert({
      store_id: store.id,
      owner_user_id: ownerUserId,
      ticket_hash: sha256(ticket),
      expires_at: expiresAt,
    });
    if (error) return response.status(503).json({ success: false, error: "Impossible de créer le ticket WebSocket." });
    return response.json({ success: true, ticket, expires_at: expiresAt });
  });

  app.delete("/api/agent/sawtify/gateway/:gatewayId", options.requireAgentAccess, options.ownerLimiter, async (request, response) => {
    const ownerUserId = await options.resolveUserId(request);
    if (!ownerUserId) return response.status(401).json({ success: false, error: "Authentification requise." });
    if (!validUuid(request.params.gatewayId) || !supabase) return response.status(404).json({ success: false, error: "Passerelle introuvable." });
    const { store, error: storeError } = await findOwnedStore(ownerUserId);
    if (storeError || !store) return response.status(404).json({ success: false, error: "Boutique introuvable." });
    const revokedAt = nowIso();
    const { data, error } = await supabase.from("agent_sawtify_gateways")
      .update({ status: "revoked", revoked_at: revokedAt, updated_at: revokedAt })
      .eq("id", request.params.gatewayId).eq("owner_user_id", ownerUserId).eq("store_id", store.id).is("revoked_at", null)
      .select("id")
      .maybeSingle();
    if (error) return response.status(503).json({ success: false, error: "Impossible de révoquer la passerelle." });
    if (!data) return response.status(404).json({ success: false, error: "Passerelle introuvable." });
    const socket = gatewaySockets.get(data.id);
    if (socket) socket.close(4003, "Device revoked");
    await writeEvent({ storeId: store.id, ownerUserId, gatewayId: data.id, eventType: "gateway_revoked", details: {} });
    broadcast(store.id, { type: "gateway_changed", gateway_id: data.id, online: false, revoked: true });
    return response.json({ success: true });
  });

  app.post("/api/agent/sawtify/gateway/jobs", options.requireAgentAccess, options.ownerLimiter, async (request, response) => {
    const ownerUserId = await options.resolveUserId(request);
    if (!ownerUserId) return response.status(401).json({ success: false, error: "Authentification requise." });
    if (!supabase) return response.status(503).json({ success: false, error: "Base de données indisponible." });
    const action = request.body?.action === "outbound_call" || request.body?.action === "send_sms" ? request.body.action : null;
    if (action === "outbound_call") {
      return response.status(501).json({ success: false, error: "Un appel GSM avec voix IA est désactivé tant que le pont audio Live côté serveur n’est pas configuré. Aucun appel n’a été lancé." });
    }
    const gatewayId = request.body?.gatewayId;
    const orderId = request.body?.orderId;
    const idempotencyKey = safeText(request.body?.idempotencyKey, 100);
    const consentMethod = request.body?.consentMethod;
    const consentReference = safeText(request.body?.consentReference, 160);
    const simSlot = request.body?.simSlot === null || request.body?.simSlot === "" || request.body?.simSlot === undefined ? null : safeText(request.body.simSlot, 2);
    const rawMessage = request.body?.message;
    const messageText = safeText(rawMessage, 320);
    if (!action || !validUuid(gatewayId) || !validUuid(orderId)) return response.status(400).json({ success: false, error: "Commande invalide." });
    if (request.body?.consentConfirmed !== true || !["explicit_customer_request", "recorded_opt_in"].includes(consentMethod) || consentReference.length < 6) {
      return response.status(400).json({ success: false, error: "Confirmez le consentement du client et référencez son accord avant l’action." });
    }
    if (idempotencyKey.length < 16 || !/^[A-Za-z0-9._:-]+$/.test(idempotencyKey)) return response.status(400).json({ success: false, error: "Identifiant de commande invalide." });
    if (simSlot !== null && !/^[01]$/.test(simSlot)) return response.status(400).json({ success: false, error: "Sélection SIM invalide." });
    if (action === "send_sms" && (typeof rawMessage !== "string" || rawMessage.trim().length < 1 || rawMessage.length > 320)) return response.status(400).json({ success: false, error: "Le SMS doit contenir entre 1 et 320 caractères." });

    const { store, error: storeError } = await findOwnedStore(ownerUserId);
    if (storeError || !store) return response.status(404).json({ success: false, error: "Boutique introuvable." });
    const { data: existing } = await supabase.from("agent_sawtify_gateway_jobs")
      .select("id, status, action").eq("owner_user_id", ownerUserId).eq("idempotency_key", idempotencyKey).maybeSingle();
    if (existing) return response.json({ success: true, job: existing, duplicate: true });

    const { data: gateway, error: gatewayError } = await supabase.from("agent_sawtify_gateways")
      .select("id, sim_slots, status")
      .eq("id", gatewayId).eq("store_id", store.id).eq("owner_user_id", ownerUserId).is("revoked_at", null).maybeSingle();
    if (gatewayError || !gateway) return response.status(404).json({ success: false, error: "Passerelle introuvable." });
    const liveSocket = gatewaySockets.get(gatewayId);
    if (!liveSocket || liveSocket.readyState !== WebSocket.OPEN) return response.status(409).json({ success: false, error: "La passerelle est hors ligne. Aucune action n’a été envoyée." });
    if (simSlot !== null && !sanitizeSimSlots(gateway.sim_slots).some((sim: any) => sim.slot === simSlot && sim.state === "ready")) {
      return response.status(400).json({ success: false, error: "La SIM sélectionnée n’est pas signalée prête par la passerelle." });
    }

    const { data: order, error: orderError } = await supabase.from("agent_sawtify_orders")
      .select("id, phone, status")
      .eq("id", orderId).eq("owner_user_id", ownerUserId).eq("store_id", store.id).maybeSingle();
    if (orderError || !order) return response.status(404).json({ success: false, error: "Demande client introuvable." });
    if (order.status !== "confirmed") return response.status(409).json({ success: false, error: "Confirmez d’abord la demande client dans l’onglet Demandes." });
    const destination = normalizePhone(order.phone);
    if (!destination) return response.status(400).json({ success: false, error: "Le numéro lié à la demande n’est pas valide." });

    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: rateError } = await supabase.from("agent_sawtify_gateway_jobs")
      .select("id", { count: "exact", head: true })
      .eq("owner_user_id", ownerUserId).eq("action", action).gte("created_at", since);
    const hourlyLimit = action === "outbound_call" ? 5 : 10;
    if (rateError) return response.status(503).json({ success: false, error: "Impossible de vérifier la limite d’envoi." });
    if (Number(count || 0) >= hourlyLimit) return response.status(429).json({ success: false, error: "Limite horaire atteinte pour cette passerelle." });

    const createdAt = nowIso();
    const { data: job, error: insertError } = await supabase.from("agent_sawtify_gateway_jobs").insert({
      store_id: store.id,
      owner_user_id: ownerUserId,
      gateway_id: gatewayId,
      order_id: orderId,
      action,
      destination,
      message_text: action === "send_sms" ? messageText : null,
      sim_slot: simSlot,
      consent_method: consentMethod,
      consent_reference_hash: sha256(consentReference),
      consent_confirmed_at: createdAt,
      authorized_by: ownerUserId,
      idempotency_key: idempotencyKey,
      status: "queued",
    }).select("id, gateway_id, order_id, action, status, created_at").single();
    if (insertError || !job) {
      if (/duplicate key|unique constraint/i.test(String(insertError?.message || ""))) {
        const { data: duplicate } = await supabase.from("agent_sawtify_gateway_jobs").select("id, status, action").eq("owner_user_id", ownerUserId).eq("idempotency_key", idempotencyKey).maybeSingle();
        if (duplicate) return response.json({ success: true, job: duplicate, duplicate: true });
      }
      return response.status(503).json({ success: false, error: "La commande n’a pas pu être journalisée." });
    }

    const { error: dispatchUpdateError } = await supabase.from("agent_sawtify_gateway_jobs")
      .update({ status: "dispatched", dispatched_at: createdAt }).eq("id", job.id).eq("status", "queued");
    if (dispatchUpdateError) return response.status(503).json({ success: false, error: "La commande est enregistrée mais n’a pas pu être transmise." });
    const commandSent = sendJson(liveSocket, {
      type: "command",
      command: {
        id: job.id,
        action: action === "outbound_call" ? "telephony.place_call" : "sms.send",
        issued_at: createdAt,
        expires_at: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
        payload: { destination, message: action === "send_sms" ? messageText : undefined, sim_slot: simSlot },
      },
    });
    if (!commandSent) {
      const failedAt = nowIso();
      await supabase.from("agent_sawtify_gateway_jobs").update({ status: "failed", error_code: "DEVICE_DISCONNECTED", finished_at: failedAt }).eq("id", job.id).eq("status", "dispatched");
      await writeEvent({ storeId: store.id, ownerUserId, gatewayId, jobId: job.id, eventType: "job_failed", details: { action, error_code: "DEVICE_DISCONNECTED" } });
      return response.status(409).json({ success: false, error: "La connexion de la passerelle a été perdue. Aucune action n’a été envoyée." });
    }
    await writeEvent({ storeId: store.id, ownerUserId, gatewayId, jobId: job.id, eventType: "job_dispatched", details: { action } });
    broadcast(store.id, { type: "job_update", job: { ...job, status: "dispatched", dispatched_at: createdAt } });
    return response.status(202).json({ success: true, job: { ...job, status: "dispatched", dispatched_at: createdAt } });
  });

  const heartbeat = setInterval(() => {
    for (const socket of gatewayWss.clients) {
      if (socket.readyState === WebSocket.OPEN) socket.ping();
    }
  }, 30_000);
  heartbeat.unref();

  return {
    close: () => {
      clearInterval(heartbeat);
      for (const socket of gatewayWss.clients) socket.close(1001, "Server shutting down");
      gatewayWss.close();
    },
  };
}
