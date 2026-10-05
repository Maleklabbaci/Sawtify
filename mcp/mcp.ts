import express from "express";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { registerOAuth, verifyAccessToken, OAuthDeps } from "./oauth.js";

export interface McpDeps {
  baseUrl: string;                       // URL publique (https://sawtify.space)
  internalUrl: string;                   // http://127.0.0.1:PORT
  supabaseClient: any;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseJwtSecret: string;
  oauthSecret: string;
  getUserBalance: (userId: string) => Promise<number | null>;
  getUserIdFromBearer: (token: string) => Promise<string | null>;
  resolveDeveloperKey: (req: express.Request) => Promise<{ id: string; userId: string } | null>;
}

const MEDIA_KEY_ID = "00000000-0000-0000-0000-000000000000"; // dossier "mcp" dans le bucket, servi par /api/v1/developer/media

const TTS_GUIDE = [
  "Génère un fichier audio (voix off) à partir d'un texte et renvoie un lien d'écoute. Consomme des points du compte Sawtify connecté.",
  "Registre : 'darija' (défaut, arabe algérien), 'fusha' ou 'francais'. Écris le texte directement dans la langue voulue ; pour la darija, utilise l'alphabet arabe.",
  "Écris les nombres en toutes lettres (ex: « واحد », « un ») pour une bonne prononciation.",
  "Balises d'émotion/sons possibles dans le texte : <laugh>, <giggle>, <sigh>, <cough>, <whispers>, <short pause>… (accepte aussi le français : <rire>, <soupir>, <chuchotement>, et l'arabe : <ضحكة>, <تنهد>, <همس>). Place-en une ou deux pour rendre la voix plus naturelle.",
  "Maximum 5000 caractères. Utilise d'abord lister_voix pour choisir une voix.",
].join(" ");

function mintInternalToken(secret: string, userId: string): string {
  return jwt.sign({ sub: userId, role: "authenticated", aud: "authenticated" }, secret, { algorithm: "HS256", expiresIn: "3m" });
}

function buildServer(deps: McpDeps, userId: string): McpServer {
  const server = new McpServer({ name: "sawtify", version: "1.0.0" });
  const text = (t: string) => ({ content: [{ type: "text" as const, text: t }] });
  const fail = (t: string) => ({ content: [{ type: "text" as const, text: t }], isError: true });

  server.registerTool("lister_voix", {
    title: "Lister les voix Sawtify",
    description: "Liste les 30 voix disponibles (prénom, caractère, genre) avec un lien d'aperçu gratuit. À appeler avant generer_voix pour choisir la voix.",
    inputSchema: { langue: z.enum(["fr", "ar"]).default("fr").describe("Langue des descriptions") },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ langue }) => {
    try {
      const r = await fetch(`${deps.internalUrl}/api/v1/tts/voices?lang=${langue}`, { signal: AbortSignal.timeout(20000) });
      const j: any = await r.json();
      const lignes = (j.voices || []).map((v: any) =>
        `- ${v.name_fr} / ${v.name_ar} (id: ${v.id}) — ${v.caractere || ""} — ${v.gender === "male" ? "homme" : v.gender === "female" ? "femme" : "genre à confirmer"}${v.preview_url ? ` — aperçu: ${String(v.preview_url).startsWith("http") ? v.preview_url : deps.baseUrl + v.preview_url}` : ""}`);
      return text(`${lignes.length} voix. Utilise le prénom ou l'id dans generer_voix.\n${lignes.join("\n")}`);
    } catch { return fail("Impossible de charger les voix pour le moment."); }
  });

  server.registerTool("generer_voix", {
    title: "Générer une voix off",
    description: TTS_GUIDE,
    inputSchema: {
      texte: z.string().min(1).max(5000).describe("Le script à lire, balises d'émotion incluses"),
      voix: z.string().default("Amine").describe("Prénom ou id de la voix (voir lister_voix)"),
      registre: z.enum(["darija", "fusha", "francais"]).default("darija"),
      intensite: z.enum(["low", "normal", "high"]).default("normal").describe("Intensité de l'émotion"),
      vitesse: z.number().min(0.5).max(2).default(1).describe("Vitesse de lecture (1 = normal)"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  }, async ({ texte, voix, registre, intensite, vitesse }) => {
    try {
      const token = mintInternalToken(deps.supabaseJwtSecret, userId);
      const r = await fetch(`${deps.internalUrl}/api/v1/tts/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: texte, voice_id: voix, register: registre, intensity: intensite, speed: vitesse }),
        signal: AbortSignal.timeout(150000),
      });
      const j: any = await r.json().catch(() => ({}));
      if (!r.ok || !j.audio_base64) {
        const msg = j.error || j.detail || j.message || `Erreur ${r.status}`;
        return fail(r.status === 402 ? `Solde insuffisant : ${msg}. L'utilisateur doit recharger ses points sur sawtify.space.` : `Génération impossible : ${msg}`);
      }
      const wav = Buffer.from(j.audio_base64, "base64");
      const fileName = `${Date.now()}.wav`;
      const path = `${userId}/developer/${MEDIA_KEY_ID}/${fileName}`;
      const up = await deps.supabaseClient.storage.from("audio-generations").upload(path, wav, { contentType: "audio/wav", upsert: false });
      if (up.error) return fail("Audio généré et facturé, mais le lien n'a pas pu être créé. Réessaie depuis sawtify.space (historique).");
      const url = `${deps.baseUrl}/api/v1/developer/media/${userId}/${MEDIA_KEY_ID}/${fileName}`;
      return text(`Voix générée (${j.duration_seconds}s, voix ${j.voice_id}).\nÉcouter / télécharger : ${url}\nLien valable 7 jours.\nPoints débités : ${j.points_deducted} — solde restant : ${j.remaining_balance}.`);
    } catch (e: any) {
      return fail(e?.name === "TimeoutError" ? "La génération a pris trop de temps. Réessaie avec un texte plus court." : "Génération indisponible pour le moment.");
    }
  });

  server.registerTool("voir_credits", {
    title: "Voir le solde de points",
    description: "Renvoie le solde de points du compte Sawtify connecté. À vérifier avant une longue génération.",
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async () => {
    const b = await deps.getUserBalance(userId);
    return b === null ? fail("Solde indisponible.") : text(`Solde : ${b} points.`);
  });

  server.registerTool("historique_generations", {
    title: "Historique des générations",
    description: "Liste les dernières générations vocales du compte (texte, voix, durée, points, lien audio si disponible).",
    inputSchema: { limite: z.number().int().min(1).max(20).default(10) },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ limite }) => {
    const { data, error } = await deps.supabaseClient.from("voice_generations")
      .select("id, voice_name, text_prompt, points_deducted, audio_duration_seconds, audio_storage_path, created_at")
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(limite);
    if (error) return fail("Historique indisponible.");
    if (!data?.length) return text("Aucune génération pour le moment.");
    return text(data.map((g: any) =>
      `- ${String(g.created_at).slice(0, 16).replace("T", " ")} · ${g.voice_name} · ${g.audio_duration_seconds ?? "?"}s · ${g.points_deducted} pts · « ${String(g.text_prompt || "").slice(0, 80)} »${g.audio_storage_path ? ` · ${deps.baseUrl}/api/audio/${g.id}` : ""}`).join("\n"));
  });

  return server;
}

export function registerMcp(app: express.Express, deps: McpDeps) {
  // CORS ouvert pour MCP/OAuth (clients navigateur, Inspector) — l'auth reste obligatoire.
  app.use(["/mcp", "/oauth", "/.well-known"], (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,Mcp-Session-Id,Mcp-Protocol-Version,X-Sawtify-API-Key");
    res.setHeader("Access-Control-Expose-Headers", "WWW-Authenticate,Mcp-Session-Id");
    if (req.method === "OPTIONS") return res.status(204).end();
    next();
  });

  const limiter = rateLimit({ windowMs: 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false, handler: (_q, r) => r.status(429).json({ error: "Trop de requêtes." }) });
  app.use(["/mcp", "/oauth"], limiter);

  const oauthDeps: OAuthDeps = {
    baseUrl: deps.baseUrl, secret: deps.oauthSecret,
    supabaseUrl: deps.supabaseUrl, supabaseAnonKey: deps.supabaseAnonKey,
    getUserIdFromBearer: deps.getUserIdFromBearer,
  };
  registerOAuth(app, oauthDeps);

  const unauthorized = (res: express.Response) => {
    res.set("WWW-Authenticate", `Bearer resource_metadata="${deps.baseUrl}/.well-known/oauth-protected-resource"`);
    return res.status(401).json({ jsonrpc: "2.0", error: { code: -32001, message: "Authentification requise." }, id: null });
  };

  app.post("/mcp", express.json({ limit: "1mb" }), async (req, res) => {
    const bearer = (req.get("authorization") || "").replace(/^Bearer\s+/i, "");
    let userId = bearer ? verifyAccessToken(oauthDeps, bearer) : null;
    if (!userId) userId = (await deps.resolveDeveloperKey(req))?.userId ?? null; // clé swt_beta_… (Claude Code, Gemini CLI)
    if (!userId) return unauthorized(res);

    const server = buildServer(deps, userId);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on("close", () => { transport.close(); server.close(); });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch {
      if (!res.headersSent) res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Erreur interne." }, id: null });
    }
  });

  const notAllowed = (_req: express.Request, res: express.Response) =>
    res.status(405).set("Allow", "POST").json({ jsonrpc: "2.0", error: { code: -32000, message: "Méthode non autorisée." }, id: null });
  app.get("/mcp", notAllowed);
  app.delete("/mcp", notAllowed);
}
