import express from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { renderAuthorizePage } from "./authorizePage";

/**
 * OAuth 2.1 minimal et SANS base de données pour le connecteur MCP Sawtify.
 * - client_id = JWT signé (inscription dynamique, RFC 7591)
 * - code d'autorisation = JWT court (5 min) lié au PKCE S256
 * - access token = JWT 1 h, refresh token = JWT 30 j
 * L'identité de l'utilisateur vient de Supabase Auth (page /oauth/authorize).
 */

export interface OAuthDeps {
  baseUrl: string;                 // ex: https://sawtify.space
  secret: string;                  // MCP_OAUTH_SECRET (ou dérivé)
  supabaseUrl: string;
  supabaseAnonKey: string;
  getUserIdFromBearer: (token: string) => Promise<string | null>; // jeton Supabase -> userId
}

const ACCESS_TTL = 60 * 60;            // 1 h
const REFRESH_TTL = 30 * 24 * 3600;    // 30 j
const CODE_TTL = 5 * 60;               // 5 min
const usedCodes = new Map<string, number>(); // jti -> exp (usage unique, instance unique)

const b64url = (buf: Buffer) => buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function redirectAllowed(uri: string): boolean {
  try {
    const u = new URL(uri);
    if (u.protocol === "https:") return true;
    return u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1");
  } catch { return false; }
}

export function signAccessToken(deps: OAuthDeps, userId: string, clientName = ""): string {
  return jwt.sign({ typ: "access", sub: userId, cn: clientName, aud: `${deps.baseUrl}/mcp` }, deps.secret, { algorithm: "HS256", expiresIn: ACCESS_TTL });
}

export function verifyAccessToken(deps: OAuthDeps, token: string): { userId: string; clientName: string } | null {
  try {
    const d = jwt.verify(token, deps.secret, { algorithms: ["HS256"], audience: `${deps.baseUrl}/mcp` }) as any;
    return d.typ === "access" && d.sub ? { userId: String(d.sub), clientName: String(d.cn || "") } : null;
  } catch { return null; }
}

export function registerOAuth(app: express.Express, deps: OAuthDeps) {
  const { baseUrl, secret } = deps;
  const form = express.urlencoded({ extended: false, limit: "50kb" });
  const json = express.json({ limit: "50kb" });

  const protectedResource = (_req: express.Request, res: express.Response) => res.json({
    resource: `${baseUrl}/mcp`,
    authorization_servers: [baseUrl],
    bearer_methods_supported: ["header"],
    scopes_supported: ["sawtify"],
    resource_name: "Sawtify",
  });
  app.get("/.well-known/oauth-protected-resource", protectedResource);
  app.get("/.well-known/oauth-protected-resource/mcp", protectedResource);

  const authServer = (_req: express.Request, res: express.Response) => res.json({
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/oauth/authorize`,
    token_endpoint: `${baseUrl}/oauth/token`,
    registration_endpoint: `${baseUrl}/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: ["sawtify"],
  });
  app.get("/.well-known/oauth-authorization-server", authServer);
  app.get("/.well-known/oauth-authorization-server/mcp", authServer);
  app.get("/.well-known/openid-configuration", authServer);

  // --- Inscription dynamique du client (Claude, ChatGPT, etc.)
  app.post("/oauth/register", json, (req, res) => {
    const uris: unknown = req.body?.redirect_uris;
    if (!Array.isArray(uris) || !uris.length || uris.length > 10 || !uris.every((u) => typeof u === "string" && redirectAllowed(u))) {
      return res.status(400).json({ error: "invalid_redirect_uri", error_description: "redirect_uris (https ou localhost) requis." });
    }
    const name = typeof req.body?.client_name === "string" ? req.body.client_name.slice(0, 80) : "Client MCP";
    const client_id = jwt.sign({ typ: "client", redirect_uris: uris, name }, secret, { algorithm: "HS256" });
    res.status(201).json({
      client_id, client_name: name, redirect_uris: uris,
      grant_types: ["authorization_code", "refresh_token"], response_types: ["code"],
      token_endpoint_auth_method: "none",
    });
  });

  const readClient = (client_id: unknown): { redirect_uris: string[]; name: string } | null => {
    try {
      const d = jwt.verify(String(client_id || ""), secret, { algorithms: ["HS256"] }) as any;
      return d.typ === "client" ? { redirect_uris: d.redirect_uris, name: d.name } : null;
    } catch { return null; }
  };

  // --- Page d'autorisation (connexion / inscription Supabase + consentement), design identique au login de la plateforme.
  // Sans paramètres (retour de Google ou du mail de confirmation) : la page reprend ceux gardés dans sessionStorage.
  app.get("/oauth/authorize", (req, res) => {
    const q = req.query as Record<string, string>;
    res.set({ "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Frame-Options": "DENY", "Referrer-Policy": "no-referrer" });
    let params = null;
    if (q.client_id) {
      const client = readClient(q.client_id);
      if (!client || !client.redirect_uris.includes(q.redirect_uri)) return res.status(400).send("Client ou redirect_uri invalide.");
      if (q.response_type !== "code" || !q.code_challenge || q.code_challenge_method !== "S256") {
        return res.status(400).send("Paramètres OAuth invalides (PKCE S256 requis).");
      }
      params = { client_id: q.client_id, redirect_uri: q.redirect_uri, code_challenge: q.code_challenge, state: q.state || "", client_name: client.name };
    }
    res.send(renderAuthorizePage({ supabaseUrl: deps.supabaseUrl, supabaseAnonKey: deps.supabaseAnonKey, params }));
  });

  // --- Approbation : vérifie la session Supabase, émet le code
  app.post("/oauth/approve", json, async (req, res) => {
    const token = (req.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const userId = token ? await deps.getUserIdFromBearer(token) : null;
    if (!userId) return res.status(401).json({ error: "Session invalide." });
    const { client_id, redirect_uri, code_challenge, state } = req.body || {};
    const client = readClient(client_id);
    if (!client || !client.redirect_uris.includes(redirect_uri) || typeof code_challenge !== "string") return res.status(400).json({ error: "Requête invalide." });
    const code = jwt.sign({ typ: "code", sub: userId, cid: client_id, cn: client.name, ru: redirect_uri, cc: code_challenge, jti: crypto.randomUUID() }, secret, { algorithm: "HS256", expiresIn: CODE_TTL });
    const u = new URL(redirect_uri);
    u.searchParams.set("code", code);
    if (state) u.searchParams.set("state", String(state));
    res.json({ redirect: u.toString() });
  });

  // --- Échange code / refresh -> tokens
  app.post("/oauth/token", form, json, (req, res) => {
    res.set("Cache-Control", "no-store");
    const b = req.body || {};
    const fail = (error: string, status = 400) => res.status(status).json({ error });
    const issue = (userId: string, clientName = "") => res.json({
      access_token: signAccessToken(deps, userId, clientName),
      token_type: "Bearer",
      expires_in: ACCESS_TTL,
      refresh_token: jwt.sign({ typ: "refresh", sub: userId, cid: b.client_id, cn: clientName }, secret, { algorithm: "HS256", expiresIn: REFRESH_TTL }),
      scope: "sawtify",
    });
    try {
      if (b.grant_type === "authorization_code") {
        const d = jwt.verify(String(b.code || ""), secret, { algorithms: ["HS256"] }) as any;
        if (d.typ !== "code" || d.cid !== b.client_id || d.ru !== b.redirect_uri) return fail("invalid_grant");
        const challenge = b64url(crypto.createHash("sha256").update(String(b.code_verifier || "")).digest());
        if (!b.code_verifier || challenge !== d.cc) return fail("invalid_grant");
        const now = Date.now();
        for (const [k, exp] of usedCodes) if (exp < now) usedCodes.delete(k);
        if (usedCodes.has(d.jti)) return fail("invalid_grant");
        usedCodes.set(d.jti, now + CODE_TTL * 1000);
        return issue(d.sub, String(d.cn || ""));
      }
      if (b.grant_type === "refresh_token") {
        const d = jwt.verify(String(b.refresh_token || ""), secret, { algorithms: ["HS256"] }) as any;
        if (d.typ !== "refresh") return fail("invalid_grant");
        return issue(d.sub, String(d.cn || ""));
      }
      return fail("unsupported_grant_type");
    } catch { return fail("invalid_grant"); }
  });
}
