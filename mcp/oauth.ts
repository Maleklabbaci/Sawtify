import express from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";

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
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

function redirectAllowed(uri: string): boolean {
  try {
    const u = new URL(uri);
    if (u.protocol === "https:") return true;
    return u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1");
  } catch { return false; }
}

export function signAccessToken(deps: OAuthDeps, userId: string): string {
  return jwt.sign({ typ: "access", sub: userId, aud: `${deps.baseUrl}/mcp` }, deps.secret, { algorithm: "HS256", expiresIn: ACCESS_TTL });
}

export function verifyAccessToken(deps: OAuthDeps, token: string): string | null {
  try {
    const d = jwt.verify(token, deps.secret, { algorithms: ["HS256"], audience: `${deps.baseUrl}/mcp` }) as any;
    return d.typ === "access" && d.sub ? String(d.sub) : null;
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

  // --- Page d'autorisation (connexion Supabase + consentement)
  app.get("/oauth/authorize", (req, res) => {
    const q = req.query as Record<string, string>;
    const client = readClient(q.client_id);
    if (!client || !client.redirect_uris.includes(q.redirect_uri)) return res.status(400).send("Client ou redirect_uri invalide.");
    if (q.response_type !== "code" || !q.code_challenge || q.code_challenge_method !== "S256") {
      return res.status(400).send("Paramètres OAuth invalides (PKCE S256 requis).");
    }
    const params = { client_id: q.client_id, redirect_uri: q.redirect_uri, code_challenge: q.code_challenge, state: q.state || "" };
    res.set({ "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Frame-Options": "DENY" });
    res.send(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Connecter Sawtify</title>
<style>body{font-family:system-ui,sans-serif;background:#0b0b10;color:#fff;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}
.c{background:#15151d;border:1px solid #2a2a36;border-radius:16px;padding:28px;width:min(92vw,380px)}h1{font-size:20px;margin:0 0 6px}p{color:#aaa;font-size:14px}
input{width:100%;box-sizing:border-box;padding:12px;margin:6px 0;border-radius:10px;border:1px solid #333;background:#0f0f15;color:#fff}
button{width:100%;padding:12px;margin-top:8px;border:0;border-radius:10px;font-weight:600;cursor:pointer;background:#7c5cff;color:#fff}button.s{background:#22222d}
#e{color:#ff6b6b;font-size:13px;min-height:18px}</style></head><body><div class="c">
<h1>Connecter Sawtify</h1><p><b>${esc(client.name)}</b> demande l'accès à ton compte Sawtify : générer des voix, consulter ton solde et ton historique. Les crédits de ton compte seront utilisés.</p>
<div id="login" hidden><input id="em" type="email" placeholder="Email" autocomplete="email"><input id="pw" type="password" placeholder="Mot de passe" autocomplete="current-password">
<button id="go">Se connecter</button><button class="s" id="gg">Continuer avec Google</button></div>
<div id="consent" hidden><p id="who"></p><button id="ok">Autoriser</button><button class="s" id="no">Refuser</button></div><div id="e"></div></div>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script>
const P=${JSON.stringify(params).replace(/</g, "\\u003c")};
const sb=supabase.createClient(${JSON.stringify(deps.supabaseUrl)},${JSON.stringify(deps.supabaseAnonKey)});
const $=id=>document.getElementById(id), err=m=>$("e").textContent=m||"";
async function show(){const{data}=await sb.auth.getSession();
 if(data.session){$("login").hidden=true;$("consent").hidden=false;$("who").textContent="Connecté : "+data.session.user.email;}
 else{$("login").hidden=false;$("consent").hidden=true;}}
$("go").onclick=async()=>{err();const{error}=await sb.auth.signInWithPassword({email:$("em").value,password:$("pw").value});error?err("Identifiants invalides."):show();};
$("gg").onclick=()=>sb.auth.signInWithOAuth({provider:"google",options:{redirectTo:location.href}});
$("no").onclick=()=>{location.href=P.redirect_uri+(P.redirect_uri.includes("?")?"&":"?")+"error=access_denied"+(P.state?"&state="+encodeURIComponent(P.state):"");};
$("ok").onclick=async()=>{err();const{data}=await sb.auth.getSession();if(!data.session)return show();
 const r=await fetch("/oauth/approve",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+data.session.access_token},body:JSON.stringify(P)});
 const j=await r.json();j.redirect?location.href=j.redirect:err(j.error||"Erreur.");};
show();
</script></body></html>`);
  });

  // --- Approbation : vérifie la session Supabase, émet le code
  app.post("/oauth/approve", json, async (req, res) => {
    const token = (req.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const userId = token ? await deps.getUserIdFromBearer(token) : null;
    if (!userId) return res.status(401).json({ error: "Session invalide." });
    const { client_id, redirect_uri, code_challenge, state } = req.body || {};
    const client = readClient(client_id);
    if (!client || !client.redirect_uris.includes(redirect_uri) || typeof code_challenge !== "string") return res.status(400).json({ error: "Requête invalide." });
    const code = jwt.sign({ typ: "code", sub: userId, cid: client_id, ru: redirect_uri, cc: code_challenge, jti: crypto.randomUUID() }, secret, { algorithm: "HS256", expiresIn: CODE_TTL });
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
    const issue = (userId: string) => res.json({
      access_token: signAccessToken(deps, userId),
      token_type: "Bearer",
      expires_in: ACCESS_TTL,
      refresh_token: jwt.sign({ typ: "refresh", sub: userId, cid: b.client_id }, secret, { algorithm: "HS256", expiresIn: REFRESH_TTL }),
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
        return issue(d.sub);
      }
      if (b.grant_type === "refresh_token") {
        const d = jwt.verify(String(b.refresh_token || ""), secret, { algorithms: ["HS256"] }) as any;
        if (d.typ !== "refresh") return fail("invalid_grant");
        return issue(d.sub);
      }
      return fail("unsupported_grant_type");
    } catch { return fail("invalid_grant"); }
  });
}
