import express from "express";
import compression from "compression";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import jwt from "jsonwebtoken";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import crypto from "crypto";
import { createHash, randomBytes } from "node:crypto";
import * as lamejsModule from "lamejs";
import ffmpegPath from "ffmpeg-static";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";

// ===================================================================
//  MOTEUR TTS À DOUBLE MODE (Gemini 3.8 / 3.1)
//
//  ⚠️  ATTENTION À NE PAS CONFONDRE LES DEUX MODÈLES GEMINI DU PROJET :
//
//   ① GEMINI_TTS_MODEL  (plus bas, ~L167)
//      = GÉNÉRATEUR DE VOIX (text-to-speech)
//      → peut basculer entre gemini-3.1-flash-tts-preview et gemini-3.8-flash-tts
//      → C'EST LE SEUL MODÈLE QUE CE MOTEUR CONCERNE
//
//   ② GEMINI_TEXT_MODEL (~L990)
//      = GÉNÉRATEUR DE SCRIPT + CORRECTEUR (texte)
//      → RESTE SUR gemini-3.1-flash-lite, JAMAIS TOUCHÉ PAR CE MOTEUR
//
//  Le moteur s'adapte automatiquement au modèle de voix configuré :
//  aucune autre partie du serveur n'a besoin de savoir lequel est actif.
// ===================================================================
import {
  buildTtsRequest,
  extractAudioFromResponse,
  resolveEngineMode,
  describeEngine,
  legacyFidelityReport,
  splitIntoChunksForTTS,
  parallelMap,
  // « Lis exactement ce qui est écrit » — source UNIQUE, partagée avec le
  // générateur d'aperçus de voix (voir tts/engine.ts).
  VERBATIM_INSTRUCTION,
} from "./tts/engine";
import { parseTranscript, VOCAL_TAGS } from "./tts/vocalTags";
import { LEGACY_VOICE_MIGRATION } from "./tts/voices";
import { resolveVoiceName, voiceNameStats, voiceNameEntry, VOICE_NAMES } from "./tts/voiceNames";
import {
  AUDITION_SCRIPT,
  AUDITION_SCRIPT_HASH,
  AUDITION_SCRIPT_VERSION,
  VOICE_PREVIEW_TEXTS,
  previewFileName,
  previewTargets,
  validateManifest,
  voicesNeedingGenderValidation,
  type VoicePreviewManifest,
} from "./tts/voicePreviews";

dotenv.config();

// Filet de sécurité global : une erreur non attrapée quelque part dans le code
// (paiement, TTS, LLM...) ne doit JAMAIS faire planter tout le processus
// Node — sinon Render renvoie des 502 à TOUS les utilisateurs le temps du
// redémarrage, pour un bug qui ne concernait qu'une seule requête.
process.on("uncaughtException", (err) => {
  console.error("[FATAL] Exception non interceptée (processus maintenu en vie) :", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[FATAL] Promesse rejetée non interceptée (processus maintenu en vie) :", reason);
});

// ===================================================================
//  CHANGELOG DE CE FICHIER :
// FIX n°1 : suppression totale du fallback audio synthétique (sinusoïdes =
//          son 100% robotique) et de sa mise en cache/persistance à vie.
//          Échec Gemini → 503, rien n'est débité ni empoisonné.
// FIX n°2 : les balises d'émotion restent des AUDIO TAGS natifs en anglais
//          ([excited], [whispers], [very fast]...) compris directement par
//          Gemini TTS, au lieu d'être converties en prose arabe lue à voix haute.
// FIX n°3 : prompt "Director's Notes" court et positif (structure officielle
//          Google), avec persona par voix. L'ancien mur de règles produisait
//          un débit mécanique hyper-articulé.
// FIX n°4 : 9 personas → 9 vraies voix Gemini distinctes (avant : tous les
//          hommes = Puck, toutes les femmes = Zephyr).
// FIX n°5 : la voix Gemini fait partie de la clé de cache des previews —
//          changer la map invalide automatiquement les anciennes previews.
//
// ─── FIX TTS (blocage + son coupé avant la fin) ───
// FIX TTS-A (BLOCAGE) : timeout sur TOUTE l'opération Gemini TTS (headers +
//          lecture du corps). Avant, un fetch stallé pendait à vie et gardait
//          un slot du TTS_CONCURRENCY occupé pour toujours → au bout de 6
//          requêtes mortes, "Le serveur vocal est occupé" pour tout le monde.
// FIX TTS-B (SON COUPÉ) : validation de finishReason. Un audio tronqué
//          (MAX_TOKENS / OTHER / SAFETY...) est REJETÉ et retenté, jamais
//          renvoyé comme succès ni facturé au client.
// FIX TTS-C (SON COUPÉ) : découpage du texte en morceaux par fin de phrase
//          (~800 chars max) + silence de 200ms entre morceaux + concaténation
//          PCM. Fini les requêtes de 5000 chars d'un coup que Gemini coupe
//          en route. Chaque morceau est validé individuellement.
// FIX TTS-BIS : suppression de la fausse stratégie "streaming" SSE (elle
//          bufferisait TOUT via response.text() avant de parser = zéro
//          bénéfice de latence, toute la fragilité). Non-streaming uniquement.
// FIX TTS-D : le "... " d'intro n'est appliqué qu'au PREMIER morceau, et la
//          pause finale " ..." qu'au DERNIER (sinon : trous de silence
//          artificiels entre chaque morceau).
// FIX TTS-E : garde-fou durée — si l'audio généré est absurdement plus court
//          que ce que le texte devrait donner à l'oral → rejet, aucun débit.
//
// ─── MIGRATION GEMINI 3.8 TTS (générateur de VOIX uniquement) ───
// 3.8-1 : le moteur `tts/engine.ts` remplace la construction manuelle de la
//         requête. Il s'adapte AUTOMATIQUEMENT au modèle de voix configuré :
//         mode "legacy" (3.1, comportement historique) ou "modern" (3.8+).
//         Bascule = la seule variable GEMINI_TTS_MODEL. Aucun autre code à
//         toucher, retour arrière immédiat.
// 3.8-2 : catalogue `tts/vocalTags.ts` — 35 sons humains officiels, avec
//         nettoyage automatique des balises inconnues et des bruitages non
//         humains (applaudissements…) que Google déconseille explicitement.
// 3.8-3 : sortie forcée en PCM brut (AUDIO_L16) dans les DEUX modes. Le 3.8
//         renvoie du WAV complet par défaut → l'en-tête RIFF est retiré
//         automatiquement. Sans ça : craquement de 44 octets en début de
//         piste et durée faussée (donc points facturés trop haut).
// 3.8-4 : « comment dire » sorti du texte en mode modern → part dans
//         `speech_metadata.style`. La doc Google est explicite : garder les
//         blocs « DIRECTOR'S NOTES » dans le texte est LA première cause de
//         dérive de voix sur 3.8. Le mode legacy les conserve à l'identique.
// 3.8-5 : 30 voix studio exposées via tts/voices.ts, avec migration
//         automatique des 9 identifiants historiques → aucun utilisateur,
//         aucun historique, aucune clé API existante n'est perdu.
//
// ⚠️ Ce qui n'est PAS touché : GEMINI_TEXT_MODEL (générateur de script +
//    correcteur) reste sur gemini-3.1-flash-lite. Les deux modèles sont
//    totalement indépendants.
// ===================================================================
// ===================================================================
//  CONCURRENCY LIMITER (Fix: expose activeCount / pendingCount)
// ===================================================================
function createLimiter(concurrency: number) {
  let active = 0;
  const queue: Array<() => void> = [];
  const next = () => {
    active--;
    if (queue.length > 0) queue.shift()!();
  };
  const limit = function <T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const run = () => {
        active++;
        fn().then(
          (v) => { resolve(v); next(); },
          (e) => { reject(e); next(); }
        );
      };
      if (active < concurrency) run();
      else queue.push(run);
    });
  };
  Object.defineProperty(limit, 'activeCount', { get: () => active, enumerable: true });
  Object.defineProperty(limit, 'pendingCount', { get: () => queue.length, enumerable: true });
  return limit;
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const SLICKPAY_PROD_KEY = process.env.SLICKPAY_API_KEY || process.env.SLICKPAY_PUBLIC_KEY || "";
const SLICKPAY_SANDBOX_KEY = process.env.SLICKPAY_SANDBOX_KEY || "";
const SLICKPAY_MODE = (process.env.SLICKPAY_MODE || "production").toLowerCase();
const SLICKPAY_IS_SANDBOX = SLICKPAY_MODE === "sandbox" || SLICKPAY_MODE === "dev" || SLICKPAY_MODE === "test";
const SLICKPAY_API_KEY = SLICKPAY_IS_SANDBOX ? (SLICKPAY_SANDBOX_KEY || SLICKPAY_PROD_KEY) : SLICKPAY_PROD_KEY;
const SLICKPAY_BASE_URL = process.env.SLICKPAY_BASE_URL || (SLICKPAY_IS_SANDBOX ? "https://devapi.slick-pay.com/api/v2" : "https://prodapi.slick-pay.com/api/v2");
const SLICKPAY_WEBHOOK_SECRET = process.env.SLICKPAY_WEBHOOK_SECRET || "";
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || "";
const FRONTEND_URL = process.env.FRONTEND_URL || "";
const PUBLIC_MEDIA_URL = (process.env.PUBLIC_MEDIA_URL || "https://sawtify.space").replace(/\/+$/, "");
const lamejs: any = (lamejsModule as any).default || lamejsModule;
const VIDEO_STORAGE_DIR = path.join(process.cwd(), "storage", "video");
const VIDEO_POINTS_PER_MINUTE = 70;
type VideoJob = { userId: string; status: "queued" | "processing" | "ready" | "failed"; outputPath?: string; cost?: number; error?: string; createdAt: number };
const VIDEO_JOBS = new Map<string, VideoJob>();

if (!GEMINI_API_KEY) console.warn("[Config] GEMINI_API_KEY manquante");
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) console.warn("[Config] SUPABASE manquants");
if (!SUPABASE_JWT_SECRET) console.warn("[Config] SUPABASE_JWT_SECRET manquante — vérification JWT en ligne utilisée (plus lent)");
if (!SLICKPAY_API_KEY) console.warn("[Config] SLICKPAY_API_KEY manquante");
if (SLICKPAY_IS_SANDBOX && !SLICKPAY_SANDBOX_KEY) console.warn("[Config] SLICKPAY_MODE=sandbox mais SLICKPAY_SANDBOX_KEY manquante — retombe sur la clé prod (probablement invalide sur devapi).");
console.log(`[Config] SlickPay: mode=${SLICKPAY_IS_SANDBOX ? "sandbox" : "production"} base_url=${SLICKPAY_BASE_URL}`);


let supabaseClient: any = null;
try { 
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY); 
} catch (err) { 
  console.warn("[Supabase] Init warning:", err); 
}

const INVOICE_REGISTRY = new Map<string | number, {
  invoiceId: string | number; packId: string; packName: string; points: number; amountDZD: number;
  paymentMethod: string; status: 'pending' | 'completed' | 'paid' | 'failed'; paymentUrl?: string;
  createdAt: string; userId?: string; credited?: boolean;
}>();

function verifySupabaseToken(token: string): string | null {
  if (!SUPABASE_JWT_SECRET) return null;
  try {
    const decoded = jwt.verify(token, SUPABASE_JWT_SECRET, { algorithms: ["HS256"] }) as any;
    if (decoded.sub) return decoded.sub as string;
    if (decoded.user_id) return decoded.user_id as string;
    return null;
  } catch (err) {
    return null;
  }
}

async function getUserIdFromAuthHeader(req: express.Request): Promise<string | null> {
  try {
    const authHeader = req.get('authorization') || req.get('Authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token || !supabaseClient) return null;
    const localUserId = verifySupabaseToken(token);
    if (localUserId) return localUserId;
    const { data, error } = await supabaseClient.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user.id as string;
  } catch { return null; }
}

const TTS_CONCURRENCY_LIMIT = Number(process.env.TTS_CONCURRENCY_LIMIT) || 6;
const TTS_CONCURRENCY = createLimiter(TTS_CONCURRENCY_LIMIT);
const TTS_QUEUE_MAX_PENDING = Number(process.env.TTS_QUEUE_MAX_PENDING) || 3;

// ===================================================================
//  NOUVEAUX PARAMÈTRES TTS (tous surchargables via .env, valeurs par défaut saines)
// ===================================================================
// ===================================================================
//  ① MODÈLE DU GÉNÉRATEUR DE VOIX (TTS) — SEUL MODÈLE CONCERNÉ PAR 3.8
//
//  gemini-3.1-flash-tts-preview  →  mode LEGACY  (comportement historique)
//  gemini-3.8-flash-tts          →  mode MODERN  (35 sons, style, voix sur mesure)
//  gemini-3.8-flash-lite-tts     →  mode MODERN  (moins cher, 100 langues)
//
//  Bascule = cette seule variable d'environnement. Retour arrière immédiat.
// ===================================================================
const TTS_MODEL = process.env.GEMINI_TTS_MODEL || "gemini-3.8-flash-tts";
/** Mode déduit automatiquement du modèle de voix : "legacy" ou "modern". */
const TTS_ENGINE_MODE = resolveEngineMode(TTS_MODEL);

/**
 * INVENTER UN STYLE À PARTIR DES BALISES ? NON (décision du 26/09/2026).
 *
 * On envoie désormais à Gemini UNIQUEMENT ce que l'utilisateur a réglé :
 * sa vitesse et sa hauteur de voix. Rien d'autre.
 *
 * Pourquoi ce choix : `speech_metadata.style` est SOUTENU (il s'applique à
 * toute la réplique) alors qu'une balise est PONCTUELLE (elle arrive à un
 * instant précis). Déduire un style d'un seul `<laugh>` faisait livrer un
 * texte grave sur un ton joyeux.
 *
 * Pour revenir à l'ancien comportement sans redéployer de code :
 *     TTS_AUTO_STYLE=1
 */
const TTS_AUTO_STYLE = process.env.TTS_AUTO_STYLE === "1";

// ── Diagnostic du moteur de VOIX au démarrage (après déclaration de TTS_MODEL) ──
// Affiche clairement QUEL modèle de voix est actif et ce que ça implique.
// ⚠️ Le modèle de SCRIPT/CORRECTEUR est totalement indépendant
//    (voir GEMINI_TEXT_MODEL plus bas) et n'est jamais touché ici.
console.log(describeEngine(TTS_MODEL));
if (TTS_ENGINE_MODE === "modern") {
  const fid = legacyFidelityReport();
  console.log(
    `[TTS] ${VOCAL_TAGS.length} sons humains disponibles ` +
    `(le mode 3.1 n'en exprimerait que ${fid.distinctLegacyTags}, soit ${fid.fidelityPercent}%)`
  );
} else {
  console.log(
    `[TTS] ⚠️  Mode 3.1 : ${legacyFidelityReport().distinctLegacyTags} sons distincts seulement. ` +
    `Pour les ${VOCAL_TAGS.length} sons + le style séparé : GEMINI_TTS_MODEL=gemini-3.8-flash-tts`
  );
}

// Diagnostic du catalogue de voix (prénoms + écritures acceptées).
{
  const vs = voiceNameStats();
  console.log(
    `[Voix] ${vs.total} voix disponibles (${vs.prenomsConfirmes} prénoms confirmés, ` +
    `${vs.prenomsAConfirmer} à valider à l'écoute) — ${vs.ecrituresAcceptees} écritures acceptées ` +
    `(français, arabe, slug, nom technique, anciens identifiants).`
  );
}
const TTS_FETCH_TIMEOUT_MS = Number(process.env.TTS_FETCH_TIMEOUT_MS) || 45000;   // FIX TTS-A
const TTS_CHUNK_MAX_CHARS = Number(process.env.TTS_CHUNK_MAX_CHARS) || 800;       // FIX TTS-C
const TTS_CHUNK_GAP_MS = Number(process.env.TTS_CHUNK_GAP_MS) || 200;             // FIX TTS-C
const TTS_BYTES_PER_SECOND = 48000;        // 24kHz × 16-bit × mono = 48000 bytes/s
const TTS_CHARS_PER_SECOND_ESTIMATE = 14;  // darija parlée ≈ 14 chars/seconde (FIX TTS-E)

const SLICKPAY_CONTACT_CACHE = new Map<string, string>();

const LLM_RESPONSE_CACHE = new Map<string, { result: GeminiTextResult; ts: number }>();
const LLM_CACHE_MAX_SIZE = 200;
const LLM_CACHE_TTL_MS = 1000 * 60 * 30;
const DAILY_TTS_LIMIT = Number(process.env.DAILY_TTS_LIMIT) || 20;
// FIX COST-1 : quota journalier pour les appels LLM payants (Magique + Script),
// distinct du quota TTS. Comptés à partir de gemini_call_log (billable=true).
const DAILY_LLM_LIMIT = Number(process.env.DAILY_LLM_LIMIT) || 30;
// FIX COST-2 : au-delà de ce nombre d'appels Gemini (tous types confondus, preview
// gratuite incluse) par utilisateur et par jour, une alerte silencieuse est levée
// côté serveur — jamais visible côté client.
const GEMINI_ALERT_THRESHOLD = Number(process.env.GEMINI_ALERT_THRESHOLD) || 60;
const ADMIN_ALERT_WEBHOOK_URL = process.env.ADMIN_ALERT_WEBHOOK_URL || "";
const DAILY_GEMINI_LIMIT = Number(process.env.DAILY_GEMINI_LIMIT) || 30;
const API_MIN_BALANCE = 1000;
const GENERATION_RETENTION_DAYS = 7;
const API_KEY_PREFIX = "swt_beta_";
const USD_TO_DZD = 260;
const ADMIN_USER_IDS = new Set((process.env.ADMIN_USER_IDS || "").split(",").map((id) => id.trim()).filter(Boolean));
const ADMIN_EMAILS = new Set([
  "abdelmaleklabbaci01@gmail.com",
  ...(process.env.ADMIN_EMAILS || "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean),
]);
const GEMINI_TTS_INPUT_USD_PER_1M = 1;
const GEMINI_TTS_AUDIO_USD_PER_1M = 20;
// FIX COST-4 : valeur réelle observée (~32 tokens/s en sortie audio Gemini TTS),
// pas 25. Sert uniquement au calcul de coût/marge admin (analytics) — n'affecte
// PAS computePointsCost, qui reste un barème points indépendant du coût réel.
const GEMINI_AUDIO_TOKENS_PER_SECOND = Number(process.env.GEMINI_AUDIO_TOKENS_PER_SECOND) || 32;

// FIX COST-5 : plafond de caractères par génération. Par défaut 1200 (au lieu de
// 5000) pour couper le coût max d'une génération — un compte peut débloquer
// jusqu'à TTS_MAX_CHARS_UNLOCKED en gardant un solde ≥ TTS_UNLOCK_BALANCE_THRESHOLD
// points (signal qu'il a déjà payé / a de la marge dessus).
const TTS_MAX_CHARS_DEFAULT = Number(process.env.TTS_MAX_CHARS_DEFAULT) || 1200;
const TTS_MAX_CHARS_UNLOCKED = Number(process.env.TTS_MAX_CHARS_UNLOCKED) || 5000;
const TTS_UNLOCK_BALANCE_THRESHOLD = Number(process.env.TTS_UNLOCK_BALANCE_THRESHOLD) || 1000;

// FIX COST-6 : plafonne la durée audio générable par les comptes free_trial
// (jamais eu de transaction complétée) à ~30-40s, pour couper le coût max
// d'une génération 100% gratuite. N'affecte pas les comptes ayant déjà payé.
const FREE_TRIAL_MAX_DURATION_SECONDS = Number(process.env.FREE_TRIAL_MAX_DURATION_SECONDS) || 45;
// Après ce nombre de points déjà dépensés (générations passées), le plafond
// d'essai gratuit (FREE_TRIAL_MAX_DURATION_SECONDS) est levé : l'utilisateur
// retombe alors sous la limite normale de caractères (TTS_MAX_CHARS_DEFAULT).
const FREE_TRIAL_UNLOCK_POINTS_THRESHOLD = Number(process.env.FREE_TRIAL_UNLOCK_POINTS_THRESHOLD) || 100;

function hashApiKey(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function newApiKey(): string {
  return `${API_KEY_PREFIX}${randomBytes(32).toString("base64url")}`;
}

async function recordGeminiUsage(params: { userId?: string | null; operation: "tts" | "enhance" | "script" | "preview"; characters?: number; success: boolean; model?: string; metadata?: Record<string, unknown> }): Promise<number | null> {
  if (!supabaseClient) return null;
  try {
    await supabaseClient.from("gemini_usage_logs").insert({
      user_id: params.userId || null, operation: params.operation, model: params.model || null,
      characters: params.characters || 0, success: params.success, metadata: params.metadata || {},
    });
    if (!params.userId) return null;
    const since = new Date(); since.setHours(0, 0, 0, 0);
    const { count } = await supabaseClient.from("gemini_usage_logs").select("id", { count: "exact", head: true })
      .eq("user_id", params.userId).neq("operation", "preview").gte("created_at", since.toISOString());
    const total = count || 0;
    if (total >= Math.max(10, DAILY_GEMINI_LIMIT * 0.75)) console.warn(`[Gemini ALERT] user=${params.userId} ${total}/${DAILY_GEMINI_LIMIT} appels aujourd'hui`);
    return total;
  } catch (err: any) {
    console.warn("[Gemini usage log unavailable]", err?.message || err);
    return null;
  }
}

async function hasReachedDailyGeminiLimit(userId: string): Promise<boolean> {
  if (!supabaseClient || DAILY_GEMINI_LIMIT <= 0) return false;
  try {
    const since = new Date(); since.setHours(0, 0, 0, 0);
    const { count, error } = await supabaseClient.from("gemini_usage_logs").select("id", { count: "exact", head: true })
      .eq("user_id", userId).neq("operation", "preview").gte("created_at", since.toISOString());
    return !error && (count || 0) >= DAILY_GEMINI_LIMIT;
  } catch { return false; }
}

async function cleanupExpiredGenerations(): Promise<void> {
  if (!supabaseClient) return;
  const cutoff = new Date(Date.now() - GENERATION_RETENTION_DAYS * 86400000).toISOString();
  try {
    let deleted = 0;
    for (let batch = 0; batch < 20; batch++) {
      const { data: rows } = await supabaseClient.from("voice_generations").select("id, audio_storage_path").lt("created_at", cutoff).order("created_at", { ascending: true }).limit(500);
      if (!rows?.length) break;
      const paths = rows.map((row: any) => row.audio_storage_path).filter(Boolean);
      if (paths.length) await supabaseClient.storage.from("audio-generations").remove(paths);
      const ids = rows.map((row: any) => row.id);
      await supabaseClient.from("voice_generations").delete().in("id", ids);
      deleted += ids.length;
      if (rows.length < 500) break;
    }
    // Les générations Developer possèdent deux fichiers (WAV + MP3) et ne
    // sont pas toujours liées à une ligne voice_generations. On les parcourt
    // par utilisateur/clé pour éviter de laisser le Storage gratuit se remplir.
    const { data: userFolders } = await supabaseClient.storage.from("audio-generations").list("", { limit: 1000 });
    for (const userFolder of userFolders || []) {
      if (!userFolder.id) continue;
      const { data: developerFolders } = await supabaseClient.storage.from("audio-generations").list(`${userFolder.name}/developer`, { limit: 1000 });
      for (const keyFolder of developerFolders || []) {
        if (!keyFolder.id) continue;
        const base = `${userFolder.name}/developer/${keyFolder.name}`;
        const { data: mediaFiles } = await supabaseClient.storage.from("audio-generations").list(base, { limit: 1000 });
        const expired = (mediaFiles || []).filter((file: any) => {
          const timestamp = Number(String(file.name).replace(/\.(wav|mp3)$/i, ""));
          return /^(\d+)\.(wav|mp3)$/i.test(String(file.name)) && Number.isFinite(timestamp) && timestamp < Date.now() - GENERATION_RETENTION_DAYS * 86400000;
        }).map((file: any) => `${base}/${file.name}`);
        if (expired.length) await supabaseClient.storage.from("audio-generations").remove(expired);
      }
    }
    if (deleted) console.log(`[Retention] ${deleted} génération(s) supprimée(s) après ${GENERATION_RETENTION_DAYS} jours`);
  } catch (err: any) { console.warn("[Retention] nettoyage impossible:", err?.message || err); }
}

const VALID_GATEWAYS = new Set(['edahabia', 'cib', 'slickpay', 'satim']);
const PAYMENT_FEE_RATE = 0.03;
function mapGateway(method: string | undefined): string { 
  return VALID_GATEWAYS.has((method || '').toLowerCase()) ? method!.toLowerCase() : 'slickpay'; 
}

async function creditIfPaid(invoiceId: string | number): Promise<{ credited: boolean; newBalance?: number; error?: string }> {
  const entry = await loadInvoice(String(invoiceId));
  if (!entry) return { credited: false, error: 'invoice_unknown' };
  if (entry.credited) return { credited: true };
  if (!entry.userId) return { credited: false, error: 'no_user_linked' };
  if (!supabaseClient) return { credited: false, error: 'supabase_unavailable' };
  const { data, error } = await supabaseClient.rpc('credit_user_balance', { p_user_id: entry.userId, p_pack_id: entry.packId, p_gateway: mapGateway(entry.paymentMethod), p_gateway_reference: String(invoiceId), p_amount_dzd: entry.amountDZD, p_points: entry.points, p_payload: { source: 'sawtify_server', invoiceId } });
  if (error) return { credited: false, error: error.message };
  entry.credited = true; entry.status = 'completed';
  await saveInvoice(entry);
  return { credited: true, newBalance: data?.new_balance };
}

async function getUserBalance(userId: string): Promise<number | null> {
  if (!supabaseClient) return null;
  try {
    const { data: profile } = await supabaseClient.from("profiles").select("credits_balance").eq("id", userId).single();
    return profile ? profile.credits_balance : null;
  } catch { return null; }
}

async function isAdminRequest(req: express.Request): Promise<{ userId: string | null; role: string | null }> {
  const userId = await getUserIdFromAuthHeader(req);
  if (!userId || !supabaseClient) return { userId: null, role: null };
  if (ADMIN_USER_IDS.has(userId)) return { userId, role: "owner" };
  try {
    const { data: profile } = await supabaseClient.from("profiles").select("email").eq("id", userId).maybeSingle();
    if (profile?.email && ADMIN_EMAILS.has(String(profile.email).toLowerCase())) return { userId, role: "owner" };
    const { data } = await supabaseClient.from("admin_users").select("role, active").eq("user_id", userId).eq("active", true).maybeSingle();
    return data ? { userId, role: data.role } : { userId, role: null };
  } catch { return { userId, role: null }; }
}

async function hasReachedDailyTTSLimit(userId: string): Promise<boolean> {
  if (!supabaseClient || DAILY_TTS_LIMIT <= 0) return false;
  try {
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const { count, error } = await supabaseClient.from("voice_generations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId).gte("created_at", since.toISOString());
    if (error) return false;
    return (count || 0) >= DAILY_TTS_LIMIT;
  } catch { return false; }
}

/* ===================================================================   FIX COST-1/2/3 : OBSERVABILITÉ GEMINI (journalisation + quota LLM + alerte)
   — Ne modifie jamais la réponse HTTP renvoyée au client : purement interne.
   — logGeminiCall() est LE point de passage unique de tout appel Gemini
     (preview, tts, enhance, script) : un seul format de log, une seule table.
   ========================================================================== */
async function logGeminiCall(params: {
  userId: string | null; callType: "preview" | "tts" | "enhance" | "script";
  billable: boolean; pointsCost: number; charCount?: number; success: boolean; latencyMs?: number;
  model?: string; inputTokens?: number; outputTokens?: number; totalCostUsd?: number;
}): Promise<void> {
  const { userId, callType, billable, pointsCost, charCount, success, latencyMs, model, inputTokens, outputTokens, totalCostUsd } = params;
  // Toujours en console (survit même si Supabase est indisponible).
  console.log(JSON.stringify({
    event: "gemini_call", type: callType, userId, billable, points_cost: pointsCost,
    chars: charCount ?? null, success, latency_ms: latencyMs ?? null, model: model ?? null,
    input_tokens: inputTokens ?? null, output_tokens: outputTokens ?? null, cost_usd: totalCostUsd ?? null, ts: new Date().toISOString(),
  }));
  if (!supabaseClient || !userId) return;
  try {
    await supabaseClient.from("gemini_call_log").insert({
      user_id: userId, call_type: callType, billable, points_cost: pointsCost,
      char_count: charCount ?? null, success, latency_ms: latencyMs ?? null, model: model ?? null,
      input_tokens: inputTokens ?? null, output_tokens: outputTokens ?? null, total_cost_usd: totalCostUsd ?? null,
    });
  } catch { /* la journalisation ne doit jamais casser la réponse utilisateur */ }
  // Vérification du seuil d'alerte : asynchrone, jamais bloquante pour la requête en cours.
  checkAndRaiseUsageAlert(userId).catch(() => {});
}

async function checkAndRaiseUsageAlert(userId: string): Promise<void> {
  if (!supabaseClient || GEMINI_ALERT_THRESHOLD <= 0) return;
  try {
    const since = new Date(); since.setHours(0, 0, 0, 0);
    const { count } = await supabaseClient.from("gemini_call_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId).gte("created_at", since.toISOString());
    const callCount = count || 0;
    if (callCount < GEMINI_ALERT_THRESHOLD) return;
    // Une seule alerte par utilisateur par jour, grâce à la contrainte UNIQUE(user_id, alert_date).
    const { error: insertError } = await supabaseClient.from("gemini_usage_alerts")
      .insert({ user_id: userId, call_count: callCount, threshold: GEMINI_ALERT_THRESHOLD });
    if (insertError) return; // déjà alerté aujourd'hui → pas de spam
    console.warn(JSON.stringify({ event: "gemini_usage_alert", userId, call_count: callCount, threshold: GEMINI_ALERT_THRESHOLD }));
    if (ADMIN_ALERT_WEBHOOK_URL) {
      fetch(ADMIN_ALERT_WEBHOOK_URL, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: `⚠️ Sawtify : l'utilisateur ${userId} a dépassé ${GEMINI_ALERT_THRESHOLD} appels Gemini aujourd'hui (${callCount}).` }),
      }).catch(() => {});
    }
  } catch { /* best-effort : ne jamais impacter le flux principal */ }
}

async function hasReachedDailyLLMLimit(userId: string): Promise<boolean> {
  if (!supabaseClient || DAILY_LLM_LIMIT <= 0) return false;
  try {
    const since = new Date(); since.setHours(0, 0, 0, 0);
    const { count, error } = await supabaseClient.from("gemini_call_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId).in("call_type", ["enhance", "script"]).eq("billable", true)
      .gte("created_at", since.toISOString());
    if (error) return false;
    return (count || 0) >= DAILY_LLM_LIMIT;
  } catch { return false; }
}

async function deductCredits(userId: string, amount: number): Promise<{ success: boolean; remaining?: number; error?: string }> {
  if (!supabaseClient) return { success: false, error: "Base de données inaccessible." };
  try {
    const { data, error } = await supabaseClient.rpc('deduct_user_credits_service', { p_user_id: userId, p_amount: amount });
    if (error) return { success: false, error: error.message };
    if (!data?.success) return { success: false, error: data?.error || "Solde de points insuffisant." };
    return { success: true, remaining: data.remaining_balance };
  } catch (err: any) { return { success: false, error: err.message }; }
}

function getClientIp(req: express.Request): string {
  // req.ip (calculé par Express via "trust proxy") renvoyait une adresse
  // interne au réseau Render (plage 10.x.x.x) au lieu de la vraie IP
  // publique du visiteur — ce qui cassait silencieusement l'anti-abus par
  // IP (bonus de bienvenue). Le header X-Forwarded-For contient la vraie
  // chaîne de proxys ; la toute première valeur est systématiquement l'IP
  // d'origine du visiteur, quel que soit le nombre de sauts internes.
  const xff = req.headers["x-forwarded-for"];
  const first = Array.isArray(xff) ? xff[0] : xff;
  if (first) {
    const ip = first.split(",")[0].trim();
    if (ip) return ip;
  }
  return req.ip || req.socket.remoteAddress || "unknown";
}

function getPublicUrl(req?: express.Request, path = "/"): string {
  const configured = FRONTEND_URL ? FRONTEND_URL.replace(/\/+$/, "") : "";
  if (configured) return `${configured}${path}`;
  if (!req) return path;
  const trustedProto = req.get("x-forwarded-proto") || (req.protocol === "https" ? "https" : "http");
  const host = req.get("x-forwarded-host") || req.get("host") || "localhost";
  return `${trustedProto}://${host}${path}`;
}

async function verifySlickPayInvoice(invoiceId: string): Promise<{ paid: boolean; data?: any; httpStatus?: number }> {
  if (!SLICKPAY_API_KEY) return { paid: false };
  const endpoints = [
    `${SLICKPAY_BASE_URL.replace(/\/+$/, "")}/users/invoices/${invoiceId}`,
    `https://prodapi.slick-pay.com/api/v2/users/invoices/${invoiceId}`,
    `https://api.slick-pay.com/api/v2/users/invoices/${invoiceId}`,
  ];
  if (!SLICKPAY_BASE_URL.includes("devapi")) endpoints.push(`https://devapi.slick-pay.com/api/v2/users/invoices/${invoiceId}`);
  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, { headers: { "Authorization": `Bearer ${SLICKPAY_API_KEY}`, "Accept": "application/json" } });
      if (!res.ok) continue;
      const data = await res.json();
      const invoiceData = data.invoice || data.data || data;
      const status = String(invoiceData.payment_status || invoiceData.status || "").toLowerCase();
      const isPaid = status === "completed" || status === "paid" || status === "success" || invoiceData.completed === true || invoiceData.paid === true;
      return { paid: isPaid, data: invoiceData, httpStatus: res.status };
    } catch (e: any) { console.warn(`[SlickPay] Vérification paiement échouée sur ${ep}:`, e?.message || e); }
  }
  return { paid: false };
}

async function loadInvoice(invoiceId: string): Promise<any | null> {
  let local = INVOICE_REGISTRY.get(invoiceId);
  if (local) return local;
  if (!supabaseClient) return null;
  try {
    const { data, error } = await supabaseClient.from("invoices").select("*").eq("id", invoiceId).single();
    if (!error && data) { INVOICE_REGISTRY.set(invoiceId, data); return data; }
  } catch (e: any) { console.warn(`[Invoices] Chargement échoué pour ${invoiceId}:`, e?.message || e); }
  return null;
}

async function saveInvoice(entry: any): Promise<void> {
  INVOICE_REGISTRY.set(String(entry.id), entry);
  if (!supabaseClient) return;
  try {
    await supabaseClient.from("invoices").upsert({
      id: String(entry.id), user_id: entry.userId, pack_id: entry.packId, pack_name: entry.packName,
      amount_dzd: entry.amountDZD, points_credited: entry.points, payment_method: entry.paymentMethod,
      status: entry.status, payment_url: entry.paymentUrl, payload: entry.payload || {},
      created_at: entry.createdAt || new Date().toISOString(), updated_at: new Date().toISOString()
    });
  } catch (e) { console.warn("[Invoices] Save failed:", e); }
}

async function updateInvoiceStatus(invoiceId: string, status: string, extra: any = {}): Promise<void> {
  const local = INVOICE_REGISTRY.get(invoiceId);
  if (local) { local.status = status as any; Object.assign(local, extra); INVOICE_REGISTRY.set(invoiceId, local); }
  if (!supabaseClient) return;
  try { await supabaseClient.from("invoices").update({ status, ...extra, updated_at: new Date().toISOString() }).eq("id", invoiceId); } catch (e: any) { console.warn(`[Invoices] Mise à jour statut échouée pour ${invoiceId}:`, e?.message || e); }
}

const BASE_POINTS_COST = 20;
const EXTRA_POINTS_PER_MINUTE = 10;
function computePointsCost(durationSeconds: number): number {
  if (durationSeconds <= 60) return BASE_POINTS_COST;
  const extraBlocks = Math.ceil((durationSeconds - 60) / 60);
  return BASE_POINTS_COST + extraBlocks * EXTRA_POINTS_PER_MINUTE;
}

function pcmToWavBuffer(pcmBuffer: Buffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Buffer {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8; const blockAlign = (numChannels * bitsPerSample) / 8; const dataLength = pcmBuffer.length; const header = Buffer.alloc(44);
  header.write("RIFF", 0); header.writeUInt32LE(36 + dataLength, 4); header.write("WAVE", 8); header.write("fmt ", 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(numChannels, 22); header.writeUInt32LE(sampleRate, 24); header.writeUInt32LE(byteRate, 28); header.writeUInt16LE(blockAlign, 32); header.writeUInt16LE(bitsPerSample, 34); header.write("data", 36); header.writeUInt32LE(dataLength, 40);
  return Buffer.concat([header, pcmBuffer]);
}

function pcmToMp3Buffer(pcmBuffer: Buffer, sampleRate = 24000): Buffer {
  const encoder = new lamejs.Mp3Encoder(1, sampleRate, 128);
  const samples = new Int16Array(pcmBuffer.buffer, pcmBuffer.byteOffset, Math.floor(pcmBuffer.length / 2));
  const chunks: Buffer[] = [];
  const blockSize = 1152;
  for (let offset = 0; offset < samples.length; offset += blockSize) {
    const encoded = encoder.encodeBuffer(samples.subarray(offset, Math.min(offset + blockSize, samples.length)));
    if (encoded.length) chunks.push(Buffer.from(encoded));
  }
  const flushed = encoder.flush();
  if (flushed.length) chunks.push(Buffer.from(flushed));
  return Buffer.concat(chunks);
}

// FIX n°1 : generateSmoothVocalWavBuffer SUPPRIMÉ intégralement.
// C'était lui qui produisait le son "100% robotique" (sinusoïdes pures)
// chaque fois que Gemini échouait — et il était mis en cache + persisté
// dans Supabase Storage, donc une voix restait robotique À VIE après
// une seule erreur Gemini.

// ===================================================================
//  FIX n°4 : 9 personas → 9 vraies voix Gemini distinctes, alignées sur le
// profil naturel de chaque voix (avant : 5 hommes = Puck, 4 femmes = Zephyr,
// et on demandait à Puck "Upbeat" d'être un narrateur posé → incohérence).
// ===================================================================
const GEMINI_VOICE_MAP: Record<string, string> = {
  // ── Hommes ──
  voice_amin:   "Puck",     // Upbeat      → jeune, sympa, dynamique
  voice_khalid: "Charon",   // Informative → narrateur documentaire, posé
  voice_rashid: "Fenrir",   // Excitable   → hype, énergie
  voice_bilal:  "Algenib",  // Gravelly    → voix grave, conteur
  voice_faycal: "Orus",     // Firm        → vendeur sûr de lui
  // ── Femmes ──
  voice_yasmin: "Zephyr",   // Bright      → jeune femme enjouée
  voice_maryam: "Sulafat",  // Warm        → chaleureuse
  voice_layla:  "Leda",     // Youthful    → jeune, vive
  voice_nour:   "Achernar", // Soft        → douce, calme
  // ── Pass-through technique ──
  Puck: "Puck", Zephyr: "Zephyr", Charon: "Charon", Kore: "Kore", Fenrir: "Fenrir",
  Aoede: "Aoede", Orus: "Orus", Sulafat: "Sulafat", Leda: "Leda",
  // ── Alias legacy (alignés sur les nouvelles voix) ──
  voice_dz_amine: "Puck", voice_dz_yasmine: "Zephyr", voice_ar_sofiane: "Puck",
  voice_fr_ines: "Sulafat", voice_dz_rachid: "Fenrir", voice_en_lina: "Leda",
};

// ── Extension 3.8 : accès aux 30 voix studio ──────────────────────────────
// On AJOUTE les correspondances manquantes sans jamais écraser les entrées
// ci-dessus (les voix historiques gardent donc exactement le même rendu).
// Permet aussi d'envoyer directement un nom de voix officiel ("Kore",
// "Sadachbia"…) ou une voix sur mesure ("voice_abc123") depuis l'API.
for (const [legacyId, studioVoice] of Object.entries(LEGACY_VOICE_MIGRATION)) {
  if (!(legacyId in GEMINI_VOICE_MAP)) GEMINI_VOICE_MAP[legacyId] = studioVoice;
}

/**
 * ★ POINT D'ENTRÉE UNIQUE POUR TOUTES LES VOIX ★
 *
 * Accepte N'IMPORTE QUELLE écriture et renvoie toujours le nom technique
 * officiel attendu par Google :
 *
 *   "voice_amin"  → "Puck"      (identifiant historique Sawtify)
 *   "Amine"       → "Puck"      (prénom français)
 *   "أمين"         → "Puck"      (prénom arabe)
 *   "amine"       → "Puck"      (slug)
 *   "Puck"        → "Puck"      (nom technique)
 *   "Karim"       → "Kore"      (nouvelle voix studio, en français)
 *   "كريم"         → "Kore"      (nouvelle voix studio, en arabe)
 *   "voice_xyz"   → "voice_xyz" (voix sur mesure, laissée telle quelle)
 *   "inconnu"     → "Puck"      (repli sûr : jamais de voix invalide envoyée)
 *
 * Remplace la double logique GEMINI_VOICE_MAP + LEGACY_VOICE_MIGRATION :
 * un seul endroit décide, donc aucune incohérence possible entre les routes.
 */
function resolveRequestedVoice(requested: unknown): string {
  const builtin = GEMINI_VOICE_MAP[String(requested)] || LEGACY_VOICE_MIGRATION[String(requested)];
  if (builtin) return builtin;
  return resolveVoiceName(String(requested || "")) || "Puck";
}

// Source : liste de reference verifiee (13 femmes / 17 hommes), 26/09/2026.
// Attention : Zephyr, Achernar et Gacrux sont des voix de FEMME, et
// Pulcherrima / Schedar des voix d'HOMME — l'inverse de ce que
// laissait croire la premiere liste.
const FEMALE_GEMINI_VOICES = new Set([
  "Achernar", "Aoede", "Autonoe", "Callirrhoe", "Despina", "Erinome",
  "Gacrux", "Kore", "Laomedeia", "Leda", "Sulafat", "Vindemiatrix", "Zephyr",
]);

// FIX n°3 : persona EN CLAIR par voix (Audio Profile du guide officiel Google).
const VOICE_PERSONAS: Record<string, string> = {
  voice_amin:   "Amin, a young friendly Algerian man. Casual, upbeat, talking like a friend.",
  voice_khalid: "Khalid, a mature Algerian narrator. Calm, informative, documentary tone, measured.",
  voice_rashid: "Rachid, an energetic Algerian hype announcer. High energy, punchy, infectious.",
  voice_bilal:  "Bilal, a warm Algerian storyteller. Deep voice, intimate narration.",
  voice_faycal: "Faycal, a confident Algerian salesman. Direct, persuasive, assured.",
  voice_yasmin: "Yasmin, a bright cheerful Algerian young woman. Lively and warm.",
  voice_maryam: "Maryam, a warm gentle Algerian woman. Soft, friendly, reassuring.",
  voice_layla:  "Layla, a youthful playful Algerian girl. Bubbly, fast, short-form video energy.",
  voice_nour:   "Nour, a soft calm Algerian woman. Soothing, slow, relaxing.",
};

/* ===================================================================   LE CARACTÈRE DE LA VOIX, VERSION COURTE (pour le mode 3.8)
   ────────────────────────────────────────────────────────────────────
   En 3.1, ce caractère voyageait dans la ligne « Speaker: » des DIRECTOR'S
   NOTES de l'ancien prompt :

       Speaker: Amin, a young friendly Algerian man. Casual, upbeat,
                talking like a friend.

   Le passage à la 3.8 a supprimé ce bloc — à raison, Google en fait la 1re
   cause de dérive de voix — et l'information est partie avec. Résultat : la
   voix ne savait plus DU TOUT comment parler, elle ne recevait qu'un texte à
   lire.

   On la remet ici, mais en gardant seulement la partie « comment dire » :
   le nom et l'identité (« Amin, a young friendly Algerian man ») n'ont rien
   à faire dans un champ de style — c'est la VOIX choisie qui porte le
   personnage (Puck = Upbeat, Charon = Informative…). Ce qui manquait, c'est
   l'indication de JEU, et elle tient en 5 mots.
   ========================================================================== */
const VOICE_DELIVERY: Record<string, string> = {
  voice_amin:   "casual, upbeat, like a friend talking",
  voice_khalid: "calm, measured, documentary narration",
  voice_rashid: "high energy, punchy, hype announcer",
  voice_bilal:  "warm and deep, intimate storytelling",
  voice_faycal: "confident, direct, persuasive",
  voice_yasmin: "bright and cheerful, lively",
  voice_maryam: "warm and gentle, reassuring",
  voice_layla:  "youthful and playful, bubbly",
  voice_nour:   "soft, calm and soothing",
};
// Les voix hors de cette table (les 21 nouvelles, dont Google ne publie pas
// le caractère) gardent une indication neutre — jamais rien de contradictoire.
const VOICE_DELIVERY_FALLBACK = "warm, confident and natural";

// ── LES 9 IDENTIFIANTS HISTORIQUES (voice_amin, voice_yasmin…) ─────────────
// Ils pointent vers la MÊME voix que dans le catalogue : le texte prononcé est
// donc celui de `VOICE_PREVIEW_TEXTS`, sans la moindre copie à maintenir.
// Avant, ce tableau recopiait 9 phrases — restées en arabe classique après la
// réécriture 100 % darija du 26/09/2026, donc prêtes à ressortir en MSA chez
// un ancien client. Désormais impossible : une seule source.
const VOICE_PREVIEW_SCRIPTS: Record<string, string> = Object.fromEntries(
  Object.entries(LEGACY_VOICE_MIGRATION).map(([legacyId, studioVoice]) => [
    legacyId,
    VOICE_PREVIEW_TEXTS[studioVoice as string] || AUDITION_SCRIPT,
  ])
);

const PREVIEW_AUDIO_CACHE: Map<string, string> = new Map();
const PREVIEW_INFLIGHT: Map<string, Promise<string>> = new Map();
const PREVIEW_BUCKET = "voice-previews";
/**
 * Les aperçus DÉJÀ présents dans le stockage (clé canonique `studio_<voix>`).
 * Rempli par le préchauffage au démarrage, et mis à jour à chaque nouvel
 * aperçu enregistré. Sert à répondre « oui, l'aperçu existe » SANS
 * télécharger le fichier : on renvoie alors son adresse publique (le
 * navigateur la charge depuis le CDN, et le serveur ne garde rien en mémoire).
 */
const PREVIEW_STORAGE_KEYS: Set<string> = new Set();
/** Où en est le préchauffage des aperçus (visible sur /api/v1/tts/preview-status). */
const PREVIEW_WARM_STATE = {
  demarre: false,
  en_cours: false,
  total: 0,
  faits: 0,
  echecs: 0,
  termines: 0,
  derniereErreur: null as string | null,
  debut: null as string | null,
  fin: null as string | null,
  /* Un quota Gemini (code 429) n'est pas une panne : c'est le plus souvent une
     limite PAR MINUTE. Ces deux champs disent si une nouvelle passe est déjà
     programmée toute seule, et quand. */
  quota_atteint: false,
  reprises: 0,
  prochaineTentative: null as string | null,
};
/** Adresse PUBLIQUE d'un aperçu stocké (bucket public → CDN Supabase). */
const publicPreviewUrl = (key: string): string | null =>
  SUPABASE_URL ? `${SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/public/${PREVIEW_BUCKET}/${key}.wav` : null;
/** Dossier local des aperçus générés par `npm run apercus:voix`. */
const PREVIEW_DIR = path.join(process.cwd(), "storage", "voice-previews");

/* ===================================================================
   MANIFESTE DES 30 APERÇUS (généré par scripts/generer-apercus-voix.ts)

   Pourquoi un manifeste et pas un appel Gemini à chaque fois ?
     • un aperçu est un contenu FIGÉ : il ne doit jamais coûter un centime
       de plus d'une fois à l'autre ;
     • les 30 aperçus doivent être comparables entre eux (même script) ;
     • si le texte d'audition change, le manifeste est invalidé tout seul
       grâce à son empreinte (scriptHash) — donc jamais d'aperçu périmé.

   Le serveur cherche le manifeste à 2 endroits, dans cet ordre :
     1) tts/preview-manifest.json            (écrit par le générateur)
     2) storage/voice-previews/manifest.json (copie de production)
   =================================================================== */
function loadPreviewManifest(): VoicePreviewManifest | null {
  const candidats = [
    path.join(process.cwd(), "tts", "preview-manifest.json"),
    path.join(PREVIEW_DIR, "manifest.json"),
  ];
  for (const p of candidats) {
    if (!existsSync(p)) continue;
    try {
      const m = JSON.parse(readFileSync(p, "utf8")) as VoicePreviewManifest;
      const v = validateManifest(m);
      if (!v.ok) { console.warn(`[Aperçus] manifeste ignoré (${path.basename(p)}) : ${v.raisons.join(" ; ")}`); continue; }
      for (const a of v.avertissements) console.warn(`[Aperçus] ⚠️  ${a}`);
      return m;
    } catch (err: any) {
      console.warn(`[Aperçus] manifeste illisible (${path.basename(p)}) : ${err?.message || err}`);
    }
  }
  return null;
}

const PREVIEW_MANIFEST = loadPreviewManifest();
/** Index voix technique → entrée du manifeste. */
const PREVIEW_INDEX = new Map<string, NonNullable<VoicePreviewManifest>["voices"][number]>(
  (PREVIEW_MANIFEST?.voices || []).map((v) => [v.voiceId, v])
);

// ── Diagnostic des aperçus au démarrage ──
if (PREVIEW_MANIFEST) {
  const manquantes = voicesNeedingGenderValidation(PREVIEW_MANIFEST);
  console.log(
    `[Aperçus] ✅ ${PREVIEW_MANIFEST.count}/30 voix · script v${PREVIEW_MANIFEST.version} ` +
    `(${AUDITION_SCRIPT_HASH}) · modèle ${PREVIEW_MANIFEST.model}`
  );
  if (manquantes.length) console.log(`[Aperçus] ${manquantes.length} voix à valider à l'oreille → /audition-voix.html`);
} else {
  console.log(`[Aperçus] ⚠️  Aucun aperçu généré. Lance : npm run apercus:voix`);
}

/**
 * Récupère l'aperçu FIGÉ d'une voix, s'il existe.
 * Renvoie une URL (Supabase publique) ou un data-URI (fichier local).
 * Aucun appel Gemini → aucun coût.
 */
function getCachedPreviewUrl(voiceName: string): string | null {
  const entry = PREVIEW_INDEX.get(voiceName);
  const file = entry?.file || previewFileName(voiceName);
  const cacheKey = `studio_${voiceName}`;

  // 1) déjà chargé en mémoire
  if (PREVIEW_AUDIO_CACHE.has(cacheKey)) return PREVIEW_AUDIO_CACHE.get(cacheKey)!;
  // 2) URL publique Supabase (le navigateur la charge tout seul)
  if (entry?.url) { PREVIEW_AUDIO_CACHE.set(cacheKey, entry.url); return entry.url; }
  // 3) fichier local (développement)
  const localPath = path.join(PREVIEW_DIR, file);
  if (existsSync(localPath)) {
    const dataUri = `data:audio/wav;base64,${readFileSync(localPath).toString("base64")}`;
    PREVIEW_AUDIO_CACHE.set(cacheKey, dataUri);
    return dataUri;
  }
  return null;
}


async function loadPersistentPreview(cacheKey: string): Promise<string | null> {
  if (!supabaseClient) return null;
  try {
    const filePath = `${cacheKey}.wav`;
    const { data, error } = await supabaseClient.storage.from(PREVIEW_BUCKET).download(filePath);
    if (error || !data) return null;
    const bytes = Buffer.from(await data.arrayBuffer());
    const dataUri = `data:audio/wav;base64,${bytes.toString("base64")}`;
    PREVIEW_AUDIO_CACHE.set(cacheKey, dataUri);
    return dataUri;
  } catch { return null; }
}

/**
 * CLÉ CANONIQUE D'UN APERÇU — `studio_<nom technique de la voix>`.
 *
 * ⚠️ POURQUOI PAS LA CLÉ DE LA REQUÊTE : celle-ci contient l'identifiant
 * envoyé par le client ET la vitesse/hauteur. « Amin », « voice_amin », le
 * slug « amin » et le prénom arabe désignent LA MÊME VOIX — ils créaient donc
 * jusqu'à 4 entrées différentes dans le stockage, donc 4 générations payées
 * et 4 fichiers identiques. Avec cette clé canonique, une seule : l'aperçu
 * généré une fois est servi à tout le monde, quelle que soit l'écriture
 * utilisée (c'est aussi la clé déjà utilisée par le cache mémoire de
 * `getCachedPreviewUrl`, donc les deux se répondent).
 */
const previewKeyForVoice = (voiceName: string): string => `studio_${voiceName}`;

/** Texte d'aperçu d'une voix (vitrine si elle existe, sinon audition). */
function previewScriptForVoice(voiceName: string, voiceId: string): string {
  return (
    VOICE_PREVIEW_TEXTS[voiceName] ||
    VOICE_PREVIEW_SCRIPTS[voiceId] ||
    VOICE_PREVIEW_SCRIPTS[voiceName] ||
    AUDITION_SCRIPT
  );
}

/**
 * Génère l'aperçu d'UNE voix et renvoie un data-URI WAV prêt à servir.
 * Utilisé par la route publique ET par le préchauffage du démarrage : il n'y
 * a donc qu'un seul code qui sait fabriquer un aperçu.
 */
async function generateVoicePreviewDataUri(voiceName: string, voiceId: string): Promise<string> {
  const script = previewScriptForVoice(voiceName, voiceId);
  const { pcmBuffer, error } = await synthesizeWithRetry(script, voiceName, 3, 1.0, 1.0, voiceId, []);
  if (!pcmBuffer || error) throw new Error(error || "Audio d'aperçu vide");
  return `data:audio/wav;base64,${pcmToWavBuffer(pcmBuffer, 24000, 1, 16).toString("base64")}`;
}

async function savePersistentPreview(cacheKey: string, dataUri: string): Promise<void> {
  if (!supabaseClient) return;
  try {
    const bytes = Buffer.from(dataUri.split(",")[1] || "", "base64");
    await supabaseClient.storage.from(PREVIEW_BUCKET).upload(`${cacheKey}.wav`, bytes, { contentType: "audio/wav", upsert: true });
  } catch (err: any) { console.warn(`[Preview cache] sauvegarde impossible: ${err?.message || err}`); }
}

function normalizeTextForTTS(text: string, addTrailingPause = true): string {
  let normalized = text;
  normalized = normalized.replace(/([0-9])([ا-يa-zA-Z])/g, '$1 $2');
  normalized = normalized.replace(/([ا-يa-zA-Z])([0-9])/g, '$1 $2');
  normalized = normalized.replace(/([a-zA-Z])([ا-ي])/g, '$1 $2');
  normalized = normalized.replace(/([ا-ي])([a-zA-Z])/g, '$1 $2');
  normalized = normalized.replace(/\s+/g, ' ').trim();
  // FIX TTS-D : la pause finale "..." ne s'ajoute qu'au DERNIER morceau.
  // Sinon chaque morceau du texte se terminerait par un trou de silence
  // artificiel au moment du collage.
  if (addTrailingPause && !/[.!؟?…]$/.test(normalized)) normalized = normalized + " ...";
  return normalized;
}

function injectNaturalFiller(text: string): string {
  let clean = text.trim();
  if (clean.startsWith("...") || clean.startsWith("…")) return clean;
  return `... ${clean}`;
}

// ===================================================================
// ===================================================================
//  Les balises d'émotion sont gérées par `tts/vocalTags.ts` (catalogue des
//  40 sons) et `tts/engine.ts`. L'ancien EMOTION_TAG_MAP et sa fonction
//  extractAndApplyEmotionTags ont été SUPPRIMÉS le 26/09/2026 : plus
//  appelés nulle part, ils faisaient croire à une seconde table de balises
//  et ont induit un audit en erreur.
// ===================================================================
// Renfort de ton en anglais, court et positif (combinable aux audio tags
// selon la doc : "combine them with a context prompt to set the overall tone").
const EMOTION_TONE_EN: Record<string, string> = {
  excited: "excited and high-energy",
  natural: "spontaneous and natural, like talking to a friend",
  calm: "calm and soothing",
  dramatic: "serious and dramatic",
  serious: "serious and dramatic",
  whispers: "soft, close to a whisper",
  whisper: "soft, close to a whisper",
  fast: "fast and lively",
  articulated: "clearly articulated",
  laughter: "cheerful, with a light laugh in the voice",
  laughs: "cheerful, with a light laugh in the voice",
  breathing: "relaxed, with natural breaths between sentences",
  sighs: "relaxed, with natural breaths between sentences",
};

/**
 * Traduit une liste de balises (anciennes OU nouvelles) en une consigne
 * de ton, utilisée UNIQUEMENT par le mode legacy (3.1).
 *
 * En mode modern (3.8), le moteur déduit lui-même le style à partir des
 * balises — cette fonction n'est donc pas utilisée pour le style 3.8.
 *
 * Gère les deux syntaxes pour ne RIEN casser quand on bascule entre les modes :
 *   • ancienne : ["excited", "laughter"]       → table EMOTION_TONE_EN
 *   • nouvelle : ["<cheer>", "<laugh>"]        → styleHint du catalogue 3.8
 */
function buildEmotionPromptInstruction(tags: string[]): string {
  if (!tags.length) return "";

  // 1) Nouvelle syntaxe (<laugh>, <sigh>…) → on lit le styleHint du catalogue.
  const modern = tags.map((t) => String(t).toLowerCase()).find((t) => t.startsWith("<"));
  if (modern) {
    const found = VOCAL_TAGS.find((v) => v.tag === modern || (v.aliases || []).includes(modern));
    if (found?.styleHint) {
      return `Start ${found.styleHint} from the very first word and keep it consistent.`;
    }
  }

  // 2) Ancienne syntaxe → table historique (comportement inchangé).
  const dominant = EMOTION_TONE_EN[String(tags[0]).toLowerCase()];
  return dominant ? `Start ${dominant} from the very first word and keep it consistent.` : "";
}

const REGION_GUIDES: Record<string, string> = {
  general: "Utilise une Darija algérienne standard et neutre, comprise dans tout le pays.",
  centre: "Utilise la Darija d'Alger et du centre : accent doux, mots comme 'واش', 'كيفاش', 'خويا', 'بصح'. Style urbain et posé.",
  ouest: "Utilise la Darija de l'Ouest (Oran, Tlemcen) : accent chantant, mots comme 'وشراك', 'دير', 'اسمع', 'خويا واعر', 'بلاطي'. Ton chaleureux et expressif.",
  est: "Utilise la Darija de l'Est (Constantine, Annaba, Sétif) : accent marqué, mots comme 'شوف', 'ياخي', 'زعمة', 'ماشي هكاك'. Ton direct et vif."
};

function getRegionGuide(region: string): string { return REGION_GUIDES[region] || REGION_GUIDES.general; }

// ===================================================================
//  FIX TTS-C : DÉCOUPAGE DU TEXTE EN MORCEAUX
// On coupe UNIQUEMENT sur des fins de phrase (jamais au milieu d'un mot ou
// d'une idée) pour que les coutures entre morceaux soient inaudibles.
// ===================================================================
// hardSplitByWords() vit désormais dans tts/engine.ts — testée automatiquement.

// splitIntoChunksForTTS() vit désormais dans tts/engine.ts — testée automatiquement.

// ===================================================================
//  FIX TTS-A + FIX TTS-B : APPEL GEMINI TTS NON-STREAMING AVEC CHRONOMÈTRE
// ET VALIDATION finishReason.
// - Timeout sur TOUTE l'opération (envoi + headers + lecture du corps).
//   Un appel qui traîne → abort → retry. Fini les fetch qui pendent à vie
//   en gardant un slot du TTS_CONCURRENCY otage.
// - Si finishReason != STOP (MAX_TOKENS, OTHER, SAFETY...) → l'audio est
//   probablement TRONQUÉ → on le REJETTE. Avant, un son coupé en plein
//   milieu était renvoyé comme un succès et FACTURÉ au client.
// ===================================================================

/* ===================================================================
   APPEL GEMINI — LA CLÉ API PART DANS L'EN-TÊTE, PLUS DANS L'ADRESSE

   Avant :  …:generateContent?key=LA_CLE
   Après  :  …:generateContent   +   en-tête « x-goog-api-key »

   Pourquoi : une adresse se retrouve partout — journaux du serveur, journaux
   du proxy, messages d'erreur, historique du navigateur. Un en-tête, non.
   C'est aussi la méthode utilisée dans la documentation officielle Google.

   SÉCURITÉ : si Google refuse malgré tout l'appel avec l'en-tête (401 ou 403),
   on retente UNE seule fois avec l'ancienne méthode. Ce changement ne peut donc
   pas casser la production — au pire, il ne change rien.
   =================================================================== */
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

async function appelleGemini(
  modele: string,
  apiKey: string,
  corps: unknown,
  options: { signal?: AbortSignal; timeoutMs?: number } = {}
): Promise<Response> {
  const urlSansCle = `${GEMINI_BASE}/${modele}:generateContent`;
  // Un seul signal possible : celui qu'on nous passe, ou un délai maximal.
  const signal = options.signal ?? (options.timeoutMs ? AbortSignal.timeout(options.timeoutMs) : undefined);
  const corpsJson = JSON.stringify(corps);

  const reponse = await fetch(urlSansCle, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: corpsJson,
    ...(signal ? { signal } : {}),
  });
  if (reponse.status !== 401 && reponse.status !== 403) return reponse;

  // Repli : ancienne méthode (clé dans l'adresse). On ne retente qu'ici,
  // et une seule fois, pour ne pas doubler les appels facturés.
  console.warn(`[Gemini] L'en-tête x-goog-api-key a été refusé (${reponse.status}) — repli sur la clé dans l'adresse`);
  return fetch(`${urlSansCle}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: corpsJson,
    ...(signal ? { signal } : {}),
  });
}

async function callGeminiTTSNonStreaming(requestBody: any): Promise<Buffer> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY non configurée");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TTS_FETCH_TIMEOUT_MS);

  try {
    const res = await appelleGemini(TTS_MODEL, apiKey, requestBody, { signal: controller.signal });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Gemini API ${res.status}: ${errText.substring(0, 200)}`);
    }

    const json = await res.json();

    // ── Extraction via le moteur TTS ──────────────────────────────────────
    // Le moteur normalise TOUT en PCM brut sans en-tête, quel que soit le
    // mode : le 3.1 renvoie du PCM brut, le 3.8 renvoie un WAV complet
    // (en-tête RIFF de 44 octets) → ici on retire l'en-tête automatiquement.
    // Sans ça, un WAV 3.8 serait traité comme du PCM : craquement en début
    // de piste + durée faussée + points facturés trop haut.
    const extracted = extractAudioFromResponse(json);
    const finishReason = extracted.finishReason;
    // Variable locale : garantit un typage sûr même sans compilateur disponible.
    const audio = extracted.audio;

    if (!audio) {
      if (extracted.textInsteadOfAudio) {
        throw new Error(`Gemini a renvoyé du TEXTE au lieu d'AUDIO : "${extracted.textInsteadOfAudio}"`);
      }
      throw new Error(`Réponse sans audio (finishReason=${finishReason || "absent"})`);
    }

    // FIX TTS-B : audio tronqué → REJET (le niveau supérieur retentera).
    if (finishReason && finishReason !== "STOP") {
      throw new Error(`Audio incomplet (finishReason=${finishReason})`);
    }

    if (audio.received === "wav") {
      console.log(`[TTS] En-tête WAV retiré automatiquement (${audio.headerStripped} octets) — modèle ${TTS_MODEL}`);
    }

    return audio.pcm;
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error(`Timeout Gemini TTS après ${TTS_FETCH_TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ===================================================================
//  SYNTHESIZE WITH RETRY (réécrit : chunking + timeout + finishReason)
// L'ancienne stratégie "streaming" SSE est SUPPRIMÉE (FIX TTS-BIS) : elle
// bufferisait toute la réponse avant de parser (aucun gain de latence) et
// était la source principale des blocages et coupures aléatoires.
// ===================================================================

async function synthesizeWithRetry(
  rawText: string,
  selectedVoiceName: string,
  maxRetries = 3,
  speed = 1.0,
  pitch = 1.0,
  originalVoiceId: string = "",
  emotionTags: string[] = [],
  register: "darija" | "fusha" | "francais" = "darija",
  intensity: "low" | "normal" | "high" = "normal"
): Promise<{ pcmBuffer: Buffer | null; error: string | null; usedStreaming: boolean; chunkCount: number }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { pcmBuffer: null, error: "GEMINI_API_KEY non configurée", usedStreaming: false, chunkCount: 0 };

  const isFemale = FEMALE_GEMINI_VOICES.has(selectedVoiceName);
  const persona = VOICE_PERSONAS[originalVoiceId] || (isFemale
    ? "A professional Algerian female voice actor, warm, confident and natural."
    : "A professional Algerian male voice actor, warm, confident and natural.");

  const pace = speed >= 1.15
    ? "Fast, energetic pace, short-form video energy."
    : speed <= 0.88
      ? "Slow, deliberate pace, taking time with every sentence."
      : "Natural conversational pace.";
  const pitchNote = pitch >= 1.1 ? "Slightly higher pitch, lively." : pitch <= 0.9 ? "Slightly lower pitch, grounded." : "";
  const emotionNote = buildEmotionPromptInstruction(emotionTags);
  // Version courte du persona, pour le champ `style` du 3.8 (voir VOICE_DELIVERY).
  const character = VOICE_DELIVERY[originalVoiceId] || VOICE_DELIVERY_FALLBACK;

  // ── Style pour le mode MODERN (3.8) ──────────────────────────────────────
  // En 3.8, le « comment dire » vit dans `speech_metadata.style` et doit
  // rester COURT (la doc Google : « extra prompt text increases drift »).
  // On n'y met donc QUE ce que l'utilisateur a réglé explicitement (sa
  // vitesse et sa hauteur de voix). L'émotion, elle, est déduite par le
  // moteur à partir des balises de sons présentes dans le texte : un seul
  // endroit décide, donc aucune incohérence possible, et surtout aucune
  // longue description de personnage (la 1re cause de dérive de voix en 3.8).
  const modernStyleParts: string[] = [];
  if (speed >= 1.15) modernStyleParts.push("speaking rapidly");
  else if (speed <= 0.88) modernStyleParts.push("speaking slowly");
  if (pitch >= 1.1) modernStyleParts.push("higher pitch, lively");
  else if (pitch <= 0.9) modernStyleParts.push("lower pitch, grounded");
  const modernStyle = modernStyleParts.length > 0 ? modernStyleParts.join(", ") : null;

  // FIX TTS-C : on découpe le texte complet AVANT toute génération.
  const cleanFullText = rawText.replace(/\s+/g, " ").trim();
  if (!cleanFullText) return { pcmBuffer: null, error: "Texte vide", usedStreaming: false, chunkCount: 0 };

  const chunks = splitIntoChunksForTTS(cleanFullText, TTS_CHUNK_MAX_CHARS);
  console.log(`[TTS] ${cleanFullText.length} chars → ${chunks.length} morceau(x) (voice=${selectedVoiceName}, model=${TTS_MODEL})`);

  const gapBytes = Math.round(TTS_BYTES_PER_SECOND * (TTS_CHUNK_GAP_MS / 1000));

  // ── COMBIEN DE MORCEAUX EN MÊME TEMPS ? ─────────────────────────────────
  // 3 par défaut. C'est le réglage qui décide de la rapidité sur un texte
  // long : 4 morceaux prenaient 4 fois le temps d'un seul, ils prennent
  // maintenant ~1,5 fois. Réglable sans redéployer : TTS_CHUNK_CONCURRENCY.
  // On ne monte pas plus haut que 4 pour ne pas déclencher de refus (429)
  // côté Google — les retries resteraient sinon plus lents que le gain.
  const parallelisme = (() => {
    const n = Number(process.env.TTS_CHUNK_CONCURRENCY);
    if (Number.isFinite(n) && n >= 1) return Math.max(1, Math.min(4, Math.floor(n)));
    return 3;
  })();

  // ── GÉNÉRATION DES MORCEAUX (en parallèle, mais résultat ORDONNÉ) ───────
  // Chaque morceau a droit à ses propres retries, exactement comme avant.
  // Un seul morceau définitivement en échec → génération ANNULÉE (aucun
  // audio partiel renvoyé, aucun point débité) : le comportement de
  // facturation est STRICTEMENT inchangé.
  const generation = await parallelMap(chunks, parallelisme, async (chunk, ci) => {
    const isLastChunk = ci === chunks.length - 1;

    // FIX TTS-D : intro "..." uniquement sur le 1er morceau,
    // pause finale "..." uniquement sur le dernier.
    let chunkText = normalizeTextForTTS(chunk, isLastChunk);
    if (ci === 0) chunkText = injectNaturalFiller(chunkText);

    // ── Construction de la requête par le MOTEUR TTS ─────────────────────
    // Le moteur choisit TOUT SEUL le bon format selon TTS_MODEL :
    //   • mode modern (3.8) : transcript verbatim + `speech_metadata.style`
    //     séparé (règle Google : les instructions dans le texte font dériver
    //     la voix) + balises en crochets ANGLE.
    //   • mode legacy (3.1) : "DIRECTOR'S NOTES" préfixées + balises en
    //     crochets CARRÉS + ancien champ prebuiltVoiceConfig.
    // Dans les deux cas, la sortie est forcée en PCM brut (AUDIO_L16) pour
    // que pcmToWavBuffer / pcmToMp3Buffer / la durée / les points restent
    // EXACTEMENT identiques.
    const built = buildTtsRequest({
      model: TTS_MODEL,
      rawText: chunkText,
      voiceName: selectedVoiceName,
      style: TTS_ENGINE_MODE === "modern" ? modernStyle : null,
      character: TTS_ENGINE_MODE === "modern" ? character : null,
      autoStyle: TTS_AUTO_STYLE,
      legacyPersona: persona,
      legacyNotes: [
        `Pace: ${pace}`,
        pitchNote ? `Pitch: ${pitchNote}` : "",
        emotionNote ? `Tone: ${emotionNote}` : "",
      ],
      // « Lis exactement ce qui est écrit » — voir VERBATIM_INSTRUCTION.
      verbatimInstruction: VERBATIM_INSTRUCTION,
      output: "pcm",
      register,
      intensity,
    });

    if (built.warnings.length) {
      console.warn(`[TTS] Morceau ${ci + 1} — ${built.warnings.join(" | ")}`);
    }

    let lastChunkError: any = null;
    // Seuil de plausibilité par morceau : au moins 25% de la durée attendue
    // pour CE morceau (et jamais moins de 0.05s). Avant, le seuil était fixe
    // à 100 octets (~2 millisecondes) : ça ne rejetait quasiment RIEN — un
    // morceau tronqué ou un souffle isolé passait comme "succès".
    const minPlausibleBytes = Math.max(
      2400,
      Math.round((chunkText.length / TTS_CHARS_PER_SECOND_ESTIMATE) * TTS_BYTES_PER_SECOND * 0.25)
    );
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const pcmBuffer = await callGeminiTTSNonStreaming(built.body);
        if (!pcmBuffer || pcmBuffer.length <= minPlausibleBytes) {
          throw new Error(`Audio vide ou trop court (${pcmBuffer?.length || 0} octets, minimum plausible ${minPlausibleBytes})`);
        }
        console.log(`[TTS ✓] Morceau ${ci + 1}/${chunks.length} OK — ${pcmBuffer.length} bytes PCM`);
        return pcmBuffer;
      } catch (err: any) {
        lastChunkError = err;
        console.error(`[TTS ✗] Morceau ${ci + 1}/${chunks.length} — tentative ${attempt}/${maxRetries} échouée : ${err?.message || err}`);
        if (attempt < maxRetries) {
          const delay = 400 * Math.pow(2, attempt - 1) + Math.random() * 150;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    console.error(`[TTS] ═══ Morceau ${ci + 1}/${chunks.length} en échec après ${maxRetries} tentatives — génération ANNULÉE (aucun point débité) ═══ Dernière erreur : ${lastChunkError?.message}`);
    throw lastChunkError || new Error("Erreur de génération audio");
  });

  if (!generation.ok) {
    const errFautive: any = generation.error;
    return {
      pcmBuffer: null,
      error: `Morceau ${generation.index + 1}/${chunks.length} : ${errFautive?.message || "Erreur de génération audio"}`,
      usedStreaming: false,
      chunkCount: chunks.length,
    };
  }

  // FIX TTS-C : assemblage DANS L'ORDRE du texte (jamais dans l'ordre
  // d'arrivée des réponses) + un court silence naturel entre les morceaux.
  const pcmChunks: Buffer[] = [];
  for (let i = 0; i < generation.results.length; i++) {
    if (pcmChunks.length > 0) pcmChunks.push(Buffer.alloc(gapBytes));
    pcmChunks.push(generation.results[i]);
  }

  const totalBuffer = Buffer.concat(pcmChunks);
  const totalSeconds = totalBuffer.length / TTS_BYTES_PER_SECOND;

  // FIX TTS-E : garde-fou anti-troncature silencieuse. Si l'audio total est
  // absurdement plus court que ce que le texte devrait donner à l'oral
  // (~14 chars/s en darija), on rejette → 503 → aucun point débité.
  // FIX TTS-E : garde-fou anti-troncature silencieuse — appliqué à TOUTE
  // longueur de texte désormais (avant : uniquement > 150 caractères, donc un
  // voix-off court de 4 secondes ~ 55 caractères n'était JAMAIS vérifié — un
  // clip tronqué ou quasi-vide passait comme "succès" et était facturé).
  // Tolérance plus large sur les textes courts (30% au lieu de 40%) : la
  // pause fixe d'intro/fin pèse proportionnellement plus sur 4 secondes.
  {
    const expectedSeconds = cleanFullText.length / TTS_CHARS_PER_SECOND_ESTIMATE;
    const minRatio = expectedSeconds < 3 ? 0.3 : 0.4;
    if (totalSeconds < expectedSeconds * minRatio) {
      console.error(`[TTS] ⚠️ Durée suspecte : ${totalSeconds.toFixed(1)}s générées pour ~${expectedSeconds.toFixed(1)}s attendues — REJET`);
      return {
        pcmBuffer: null,
        error: `Audio suspect : ${totalSeconds.toFixed(1)}s générées pour ~${expectedSeconds.toFixed(1)}s attendues`,
        usedStreaming: false,
        chunkCount: chunks.length
      };
    }
  }

  console.log(`[TTS ✓] Génération complète — ${chunks.length} morceau(x) en ${parallelisme} parallèle(s), ${totalBuffer.length} bytes PCM (~${totalSeconds.toFixed(1)}s), voice=${selectedVoiceName}`);
  return { pcmBuffer: totalBuffer, error: null, usedStreaming: false, chunkCount: chunks.length };
}


/* ===================================================================   LLM CALLER HELPER
   ========================================================================== */
type GeminiTextResult = {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
};

const GEMINI_TEXT_MODEL = "gemini-3.1-flash-lite";
const GEMINI_TEXT_INPUT_USD_PER_1M = 0.25;
const GEMINI_TEXT_OUTPUT_USD_PER_1M = 1.50;

function simpleHash(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
  return (h >>> 0).toString(36);
}

async function callGeminiTextAPI(promptText: string, temperature = 0.7): Promise<GeminiTextResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Clé GEMINI_API_KEY manquante sur Render");

  const cacheKey = `${temperature.toFixed(2)}:${simpleHash(promptText)}`;
  const cached = LLM_RESPONSE_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.ts < LLM_CACHE_TTL_MS) return cached.result;

  const models = [GEMINI_TEXT_MODEL];
  let allErrors: string[] = [];

  for (const model of models) {
    try {
      const response = await appelleGemini(model, apiKey, { contents: [{ parts: [{ text: promptText }] }], generationConfig: { temperature, maxOutputTokens: 4096 } }, { timeoutMs: 12000 });
      if (response.ok) {
        const data = await response.json();
        let result = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") || data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        result = result.replace(/```[a-z]*/g, "").replace(/```/g, "").replace(/^["«»']|["«»']$/g, "").trim();
        const usage = data.usageMetadata || {};
        const inputTokens = Number(usage.promptTokenCount || 0);
        const outputTokens = Number(usage.candidatesTokenCount || 0) + Number(usage.thoughtsTokenCount || 0);
        const totalTokens = Number(usage.totalTokenCount || inputTokens + outputTokens);
        const costUsd = (inputTokens / 1_000_000) * GEMINI_TEXT_INPUT_USD_PER_1M + (outputTokens / 1_000_000) * GEMINI_TEXT_OUTPUT_USD_PER_1M;
        if (result) {
          const response: GeminiTextResult = { text: result, model, inputTokens, outputTokens, totalTokens, costUsd };
          LLM_RESPONSE_CACHE.set(cacheKey, { result: response, ts: Date.now() });
          if (LLM_RESPONSE_CACHE.size > LLM_CACHE_MAX_SIZE) { const oldestKey = LLM_RESPONSE_CACHE.keys().next().value; if (oldestKey) LLM_RESPONSE_CACHE.delete(oldestKey); }
          return response;
        }
        allErrors.push(`${model}: réponse vide`);
      } else {
        const errJson = await response.json().catch(() => null);
        allErrors.push(`${model}: ${errJson?.error?.message || `HTTP ${response.status}`}`);
      }
    } catch (e: any) { allErrors.push(`${model}: ${e.message || String(e)}`); }
  }
  throw new Error(`Google API: ${allErrors.join(" | ")}`);
}

function detectSector(product: string): string {
  const p = product.toLowerCase();
  if (/formation|cours|école|université|study|apprend|learn/i.test(p)) return "education";
  if (/vetement|habit|jean|chemise|robe|قميص|قندورة/i.test(p)) return "mode";
  if (/parfum|cosmetic|creme|maquillage|beauté|عطر|كريم/i.test(p)) return "beauté";
  if (/food|restaurant|pizza|burger|مطعم|كسكس|أكل/i.test(p)) return "restauration";
  if (/watch|montre|bijou|ساعة|مجوهرات/i.test(p)) return "accessoires";
  if (/service|marketing|agence|digital|B2B|coaching/i.test(p)) return "services";
  if (/sport|fitness|gym|رياضة/i.test(p)) return "sport";
  if (/immo|maison|appartement|villa|عقار/i.test(p)) return "immobilier";
  return "general";
}

const HOOKS = [
  "LE SECRET : اكشف عن سر أو حيلة (السر اللي ما حابينكش تعرفوه...)",
  "L'ERREUR : حذر من غلطة شائعة (أكبر غلطة راهي تخسّرك دراهمك...)",
  "STORYTELLING : قصة سريعة (لوكان نحكيكم واش صرالي...)",
  "QUESTION CHOC : سؤال يستفز المتابع (علاش مازلت تضيع وقتك في...)",
  "AVANT/APRÈS : مقارنة صريحة (كيفاش تحولت من المعاناة إلى...)",
  "PROMESSE DIRECTE : نتيجة سريعة (كيفاش تتحصل على النتيجة في أقل من...)",
  "POV : مشهد تخيلي (POV: لما تجرّب هاد الحل لأول مرة...)",
  "DISQUALIFICATION : تصفية المتابعين (إذا كنت حاب نتائج بدون تعب، فوت هاد الفيديو...)",
  "MYTH BUSTING : تفكيك خرافة (أكبر كذبة مأمنين بيها الناس هي...)",
  "FRUSTRATION : ضرب على الوتر الحساس (عييت من نفس المشكل كل يوم؟)",
  "ÉCONOMIE : توفير المال (كيفاش توفر كثر من 50% من مصاريفك...)",
  "DÉFI : تحدي مباشر (نتحداك تجرّب هاد المنتوج وما يعجبكش...)",
  "CONFESSION : اعتراف صادق (باش نكون صريح معاك 100%...)",
  "PREUVE SOCIALE : دليل الجماهير (علاش آلاف الجزائريين شراو هاد...)",
  "LAZY-FIX : حل للناس العجازين (أسهل طريقة للناس اللي ماعندهُمش الوقت...)",
  "COMPARAISON : مقارنة شرسة (علاش هاد الحل خير بـ 10 مرات من القديم...)",
  "NICHE TARGETING : استهداف فئة (إذا كنت طالب/خدام/أم، هاد الفيديو ليك...)",
  "REGRET : ندم مستقبلي (الندم الوحيد اللي راح تحس بيه هو علاش ما شريتوش بكري...)",
  "STATISTIQUE : رقم صادم (80% من الناس يضيعوا دراهمهم في باطل بسبب...)",
  "CURIOSITÉ : تشويق واكتشاف (شوف واش كاين داخل هاد الباكي اللي داير حالة...)"
];

const PROBLEMS = [
  "PERTE D'ARGENT : الشعور بتضييع الدراهم في السلعة العيانة.",
  "PERTE DE TEMPS : المعاناة مع الطرق البطيئة اللي تدي الوقت.",
  "FRUSTRATION/ÉCHECS : جرب بزاف صوالح من قبل وما نفعووش.",
  "HONTE/GÊNE : الإحراج وانعدام الثقة بالنفس قدام الناس.",
  "COMPLEXITÉ : التعقيد والخطوات الصعبة اللي تعيّي الراس.",
  "FAUSSE QUALITÉ : السلعة المقلدة اللي تخسر بالخف.",
  "MAUVAIS SERVICE : غياب خدمة ما بعد البيع والمتابعة.",
  "PEUR DE L'ARNAQUE : الخوف من الشراء أونلاين والنصب.",
  "STRESS : الضغط العصبي والتخمام الزايد.",
  "IGNORANCE : عدم معرفة منين يبدا وكيفاش يتصرف.",
  "PRIX EXCESSIFS : الأسعار الغالية بلا فايدة.",
  "DÉLAIS DE LIVRAISON : الروطار في التوصيل أو السلعة توصل مكسرة.",
  "RUPTURE : تبرك على السلعة وما تلقاهاش.",
  "FATIGUE : التعب الجسدي والجهد الكبير.",
  "ROUTINE : الملل من الحلول التقليدية العادية.",
  "INSECURITÉ : الشك في القدرات أو عدم الرضا عن المظهر.",
  "OVERWHELM : التشتت وكثرة الخيارات في السوق.",
  "NON-LOCALISÉ : منتجات ما تليقش للعقلية والواقع الجزائري.",
  "SANS GARANTIE : الشراء بلا ضمان (ضمانة).",
  "DÉPENDANCE : الاحتياج للناس باش يكملولك خدمتك."
];

const SOLUTIONS = [
  "LE SHORTCUT : حل يختصر أشهر من التعب في دقائق.",
  "L'ALL-IN-ONE : كلشي متوفر في منتج/خدمة وحدة.",
  "PLUG & PLAY : واجد للاستعمال، ساهل ماهل.",
  "ALTERNATIVE INTELLIGENTE : البديل الذكي والأرخص.",
  "QUALITÉ PREMIUM : كاليتي واعرة تشد معاك عوام.",
  "AUTOMATISATION : الخدمة تدار وحدها بلا ما تعيي روحك.",
  "SECRET DES PROS : التقنية اللي يستعملوها غير المحترفين.",
  "PACK ÉCONOMIQUE : باك كامل بسعر مهبول.",
  "FORMULE GARANTIE : حل مضمون مع إمكانية التبديل.",
  "SIMPLICITÉ : تصميم بسيط يخدم بيه الصغير والكبير.",
  "ADAPTATION DZ : مخدوم خصيصاً للمواطن الجزائري.",
  "BOOST CONFIANCE : يرجعلك الثقة في روحك بالخف.",
  "DESIGN MODERNE : مظهر شباب يحمر الوجه.",
  "GAIN DE TEMPS : تكمل خدمتك في ثواني.",
  "RENTABILITÉ : يرجعلك دراهمو من الاستعمال الأول.",
  "VIP SERVICE : توصيل للدار مع شوف السلعة وخلص.",
  "ÉCOLOGIQUE/DURABLE : حل اقتصادي ما يضرش الجيب.",
  "EXCLUSIVITÉ : حصري وما تلقاهش في الحوانت.",
  "GUIDE PAS À PAS : تبعك خطوة بخطوة حتى تنجح.",
  "TRANQUILLITÉ : راحة البال، تهنى من التخمام."
];

const PROOFS = [
  "CHIFFRES : أرقام حقيقية (+90% نسبة رضا، 5000 طلب).",
  "TÉMOIGNAGES : آراء الزبائن فرحانين بالنتيجة.",
  "DÉMO DIRECTE : النتيجة تبان قدام عينيك في الفيديو.",
  "GARANTIE : ضمان استرجاع الأموال إلى ما عجبكش.",
  "LIVRAISON : توصيل لـ 58 ولاية سريع ومضمون.",
  "AVANT/APRÈS : الفرق الواضح بين كيفاش كان وكيفاش ولى.",
  "CERTIFICATION : سلعة أصلية ومطابقة للمعايير.",
  "PRIX IMBATTABLE : أحسن سومة في السوق مقارنة بالكاليتي.",
  "RAPIDITÉ : نتيجة تبان في أقل من أسبوع.",
  "SUPPORT : خدمة زبائن معاك 7/7 أيام."
];

const CTAS = [
  "WHATSAPP : ابعتلنا ميساج في الواتساب ذروك...",
  "LIEN SITE : كليكي على الرابط في البيو واطلب...",
  "DM : ابعتلنا ميساج في البريفي نبعتولك التفاصيل...",
  "APPEL : عيطلنا في الرقم الظاهر في الشاشة...",
  "URGENCE STOCK : اطلب ذروك قبل ما يخلص الاستوك...",
  "LIVRAISON GRATUITE : كوموندي اليوم والـ livraison باطل...",
  "OFFRE 24H : العرض يخلص بعد 24 ساعة، زرب روحك...",
  "COMMENTAIRE : خلي كومنتار بـ [مهتم] نبعتولك...",
  "PROMO 1+1 : اشري وحدة ودي الزاوجة باطل، كليكي هنا...",
  "RÉSERVATION : ريزيرفي بلاصتك قبل ما يكمل العدد...",
  "BÉNÉFICE : حاب تتهنى من هاد المشكل؟ كليكي واطلب...",
  "PROFIL : ادخل للبروفيل وشوف الكاتالوج كامل...",
  "CODE PROMO : استعمل كود SAWTIFY10 ودي تخفيض...",
  "SAUVEGARDER : خبي هاد الفيديو وبارطاجيه مع صاحبك...",
  "SANS RISQUE : جرب السلعة وخلص عند الباب...",
  "MAGASIN : زورونا في الحانوت ديالنا أو طلب أونلاين...",
  "DÉFI CTA : ما تراطيش هاد لافار، كليكي واشري...",
  "ÉTUDIANT/PRO : كاين برومو سبيسيال لأول 20 واحد...",
  "FORMULAIRE : عمر الفورميلار في 30 ثانية وتجيك للدار...",
  "CADEAU : اطلب اليوم ويدي كادو مجاني مع السلعة..."
];

const ENHANCE_BOOSTERS = [
  "Rends le rythme plus PUNCHY : phrases courtes, impact immédiat, comme un pub TikTok qui accroche en 3 secondes.",
  "Ajoute une DIMENSION ÉMOTIONNELLE plus forte : joue sur la curiosité, l'urgence ou la connivence avec l'auditeur.",
  "Injecte de la SPONTANÉITÉ ORALE : petites hésitations naturelles, expressions typiques Darija, comme un vrai humain qui parle.",
  "Optimise pour le SCROLL-STOPPING : la première phrase doit obliger l'auditeur à s'arrêter et écouter.",
  "Renforce la DIMENSION STORYTELLING : transforme les infos en mini-scène vivante.",
  "Améliore le FLOW & RYTHME : alterne phrases courtes et longues, joue sur les pauses pour créer du suspense.",
  "Boost le CÔTÉ AUTHENTIQUE ALGÉRIEN : utilise des tournures locales fortes."
];

function detectTextType(text: string): { type: string; guidance: string } {
  const hasCTA = /whatsapp|kliki|cliquez|ابعت|اطلب|كوموندي|كليكي|رابط|lien|dm|inbox/i.test(text);
  const hasStory = /كنت|كان|واحد النهار|قصة|صرالي|سمعت|شفت/i.test(text);
  const hasEducation = /كيفاش|علاش|طريقة|نتعلم|فورماسيون|formation|cours|dars/i.test(text);
  const hasCommercial = /سومة|prix|dzd|دج|promo|تخفيض|solde|livraison/i.test(text);
  const hasProfessional = /b2b|service|entreprise|société|شركة|professionnel|expert/i.test(text);

  if (hasCTA && hasCommercial) return { type: "PUBLICITÉ COMMERCIALE avec CTA", guidance: "Optimise pour la CONVERSION : hook fort, bénéfice clair, urgence à la fin." };
  if (hasStory) return { type: "STORYTELLING / RÉCIT", guidance: "Préserve la narration : garde le suspense, les détails vivants. Utilise [natural] et [calm]." };
  if (hasEducation) return { type: "CONTENU ÉDUCATIF / TUTORIEL", guidance: "Rends l'info CLAIRE et STRUCTURÉE : ton pédagogique. Utilise [calm] et [natural]." };
  if (hasCommercial) return { type: "PRÉSENTATION COMMERCIALE", guidance: "Mets en valeur les BÉNÉFICES clients : ton confiant. Alterne [excited] et [natural]." };
  if (hasProfessional) return { type: "CONTENU PROFESSIONNEL / B2B", guidance: "Ton POSÉ et CRÉDIBLE : évite le vocabulaire trop familier. Privilégie [calm] et [natural]." };
  return { type: "CONTENU GÉNÉRAL", guidance: "Adapte-toi au ton naturel du texte original." };
}

function analyzeEnergyLevel(text: string): string {
  const exclamations = (text.match(/[!؟?]/g) || []).length;
  const hasStrongWords = /رائع|مذهل|مهبول|واعر|خطير|فرصة|urgence|فوراً|زربوا|احنا/i.test(text);
  const wordCount = text.split(/\s+/).length;
  const exclamRatio = exclamations / Math.max(wordCount, 1);
  if (exclamRatio > 0.05 || hasStrongWords) return "ÉNERGIE HAUTE";
  if (exclamRatio < 0.01 && wordCount > 40) return "ÉNERGIE POSÉE";
  return "ÉNERGIE ÉQUILIBRÉE";
}

function extractLatinWords(text: string): string[] {
  const matches = text.match(/[a-zA-Z][a-zA-Z0-9]{2,}/g) || [];
  return [...new Set(matches.map(w => w.toLowerCase()))];
}

function validateLatinPreservation(original: string, enhanced: string): boolean {
  const originalLatins = extractLatinWords(original);
  const enhancedLower = enhanced.toLowerCase();
  if (originalLatins.length === 0) return true;
  const preserved = originalLatins.filter(w => enhancedLower.includes(w));
  return preserved.length >= Math.floor(originalLatins.length * 0.7);
}

function countEmotionTags(text: string): number {
  return (text.match(/\[(excited|natural|calm)\]/gi) || []).length;
}

function runVideoFfmpeg(args: string[]) {
  return new Promise<void>((resolve, reject) => {
    if (!ffmpegPath) return reject(new Error("FFmpeg indisponible."));
    const child = spawn(ffmpegPath, args, { stdio: ["ignore", "ignore", "pipe"] });
    let error = "";
    child.stderr.on("data", (chunk) => { error = `${error}${chunk}`.slice(-5000); });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error(`FFmpeg: ${error}`)));
  });
}

function probeVideoDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) return reject(new Error("FFmpeg indisponible."));
    const child = spawn(ffmpegPath, ["-i", filePath, "-f", "null", "-"], { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr = `${stderr}${chunk}`.slice(-12000); });
    child.on("error", reject);
    child.on("close", () => {
      const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
      if (!match) return reject(new Error("Durée audio introuvable."));
      resolve(Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]));
    });
  });
}

const CAPTION_THEMES = ["white", "yellow", "cyan", "pink", "lime", "orange", "blue", "red", "purple", "gold", "mint", "sky", "coral", "violet", "cream", "electric", "rose", "aqua", "sun", "mono"];
const CAPTION_COLORS: Record<string, string> = { white: "&H00FFFFFF", yellow: "&H0000EFFF", cyan: "&H00FFFF00", pink: "&H00FF66FF", lime: "&H0000FF66", orange: "&H000080FF", blue: "&H00FFCC00", red: "&H000000FF", purple: "&H00CC66FF", gold: "&H0000D7FF", mint: "&H00AAFFDD", sky: "&H00FFDD88", coral: "&H005080FF", violet: "&H00EE99FF", cream: "&H00DDFFFF", electric: "&H00FFFF00", rose: "&H007799FF", aqua: "&H00FFFFAA", sun: "&H0000CCFF", mono: "&H00FFFFFF" };
const CAPTION_STYLES = ["bold", "boxed", "shadow", "outline", "karaoke", "minimal", "neon", "bubble", "lower", "center", "top", "impact", "clean", "marker", "glow", "split", "rounded", "news", "reel", "cinema"];
function assTime(seconds: number): string { const cs = Math.max(0, Math.round(seconds * 100)); const h = Math.floor(cs / 360000); const m = Math.floor((cs % 360000) / 6000); const s = Math.floor((cs % 6000) / 100); const c = cs % 100; return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(c).padStart(2, "0")}`; }
function assEscape(value: string): string { return value.replace(/[{}]/g, "").replace(/\\/g, "\\\\").replace(/\n/g, " "); }
function buildCaptionsAss(script: string, duration: number, fontFamily: string, theme: string, style: string, requestedSize?: number): string {
  const words = script.replace(/\[[^\]]+\]/g, "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const chunks: string[] = []; let current = "";
  for (const word of words) { if (current && `${current} ${word}`.length > 32) { chunks.push(current); current = word; } else current = current ? `${current} ${word}` : word; }
  if (current) chunks.push(current);
  const maxChars = Math.max(...chunks.map((chunk) => chunk.length), 0);
  const autoSize = maxChars > 46 ? 36 : maxChars > 38 ? 42 : maxChars > 30 ? 48 : 54;
  const fontSize = Math.max(24, Math.min(76, Number(requestedSize) || autoSize));
  const color = CAPTION_COLORS[CAPTION_THEMES.includes(theme) ? theme : "white"];
  const bold = CAPTION_STYLES.includes(style) && !["minimal", "cinema"].includes(style) ? 1 : 0;
  const outline = ["boxed", "outline", "neon", "impact", "news", "reel"].includes(style) ? 4 : 2;
  const alignment = ["top", "news"].includes(style) ? 8 : ["lower"].includes(style) ? 2 : 5;
  const marginV = alignment === 8 ? 100 : alignment === 2 ? 180 : 260;
  const header = `[Script Info]\nScriptType: v4.00+\nPlayResX: 720\nPlayResY: 1280\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Sawtify,${fontFamily || "Cairo"},${fontSize},${color},${color},&H00101010,&H99000000,${bold},0,0,0,100,100,0,0,1,${outline},2,${alignment},36,36,${marginV},1\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
  const step = duration / Math.max(chunks.length, 1);
  return header + chunks.map((chunk, index) => { const wordsInLine = chunk.split(" "); const midpoint = Math.ceil(wordsInLine.length / 2); const display = wordsInLine.length > 4 ? `${wordsInLine.slice(0, midpoint).join(" ")}\\N${wordsInLine.slice(midpoint).join(" ")}` : chunk; return `Dialogue: 0,${assTime(index * step)},${assTime(Math.min(duration, (index + 1) * step))},Sawtify,,0,0,0,,${assEscape(display)}`; }).join("\n") + "\n";
}

// ===================================================================
//  START SERVER
// ===================================================================
async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // "true" fait confiance à toute la chaîne de proxys de Render pour lire la
  // vraie IP d'origine (X-Forwarded-For) — avec juste "1", req.ip résolvait
  // une adresse interne (10.x.x.x), ce qui cassait le rate-limiting par IP.
  app.set("trust proxy", true);

  app.use(compression());
  app.use(express.json({ limit: "10mb" }));

  const allowedOrigins = new Set((FRONTEND_URL || "https://sawtify.space").split(",").map((value) => value.trim().replace(/\/+$/, "")).filter(Boolean));
  app.use((req, res, next) => {
    const origin = String(req.get("origin") || "").replace(/\/+$/, "");
    if (origin && (allowedOrigins.has(origin) || process.env.NODE_ENV !== "production")) res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Sawtify-API-Key,X-File-Name,X-File-Type");
    res.setHeader("Access-Control-Expose-Headers", "Content-Type,Content-Disposition,X-Request-Id");
    res.setHeader("Vary", "Origin");
    if (req.method === "OPTIONS") return res.status(204).end();
    next();
  });

  const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false, handler: (req, res) => res.status(429).json({ error: "Trop de requêtes." }) });
  app.use(globalLimiter);

  const resolveUserIdMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    (req as any).resolvedUserId = await getUserIdFromAuthHeader(req);
    next();
  };
  const perUserKey = (req: express.Request): string => {
    const resolved = (req as any).resolvedUserId as string | null | undefined;
    return resolved || ipKeyGenerator(req.ip || "unknown");
  };
  const previewLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, keyGenerator: perUserKey, handler: (req, res) => res.status(429).json({ error: "Trop de previews." }) });
  const ttsLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, keyGenerator: perUserKey, handler: (req, res) => res.status(429).json({ error: "Trop de générations." }) });
  const llmLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, keyGenerator: perUserKey, handler: (req, res) => res.status(429).json({ error: "Trop de requêtes LLM." }) });

  app.use((req, res, next) => { res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups"); next(); });

  app.get("/api/health", (req, res) => res.json({ status: "ok", service: "sawtify-tts-server", voices_count: 9 }));

  app.post("/api/video/upload", resolveUserIdMiddleware, express.raw({ type: "application/octet-stream", limit: "250mb" }), async (req, res) => {
    const userId = (req as any).resolvedUserId as string | null;
    if (!userId) return res.status(401).json({ error: "Authentification requise." });
    const body = Buffer.isBuffer(req.body) ? req.body : Buffer.from([]);
    if (!body.length) return res.status(400).json({ error: "Fichier vidéo vide." });
    const original = decodeURIComponent(String(req.query.filename || req.get("x-file-name") || "video.mp4")).replace(/[^a-zA-Z0-9._-]/g, "_");
    const ext = path.extname(original).toLowerCase() || ".mp4";
    const id = `${crypto.randomUUID()}${ext}`;
    await mkdir(VIDEO_STORAGE_DIR, { recursive: true });
    await writeFile(path.join(VIDEO_STORAGE_DIR, id), body);
    return res.json({ id, name: original, kind: String(req.query.filetype || req.get("x-file-type") || "").startsWith("image/") ? "image" : "video", url: `/api/video/file/${id}` });
  });

  app.get("/api/video/file/:id", resolveUserIdMiddleware, async (req, res) => {
    if (!(req as any).resolvedUserId) return res.status(401).end();
    const id = path.basename(req.params.id);
    const filePath = path.join(VIDEO_STORAGE_DIR, id);
    if (!existsSync(filePath)) return res.status(404).end();
    return res.sendFile(filePath);
  });

  app.post("/api/video/render", resolveUserIdMiddleware, async (req, res) => {
    const userId = (req as any).resolvedUserId as string | null;
    if (!userId) return res.status(401).json({ error: "Authentification requise." });
    const balance = await getUserBalance(userId);
    if (balance === null) return res.status(503).json({ error: "Impossible de vérifier le solde." });
    if (balance <= API_MIN_BALANCE) return res.status(403).json({ error: "Le montage vidéo nécessite plus de 1000 points.", current_balance: balance });
    const audioUrl = String(req.body?.audioUrl || "");
    const script = String(req.body?.script || "");
    const videos = Array.isArray(req.body?.videos) ? req.body.videos : [];
    if (script.length > 30000) return res.status(413).json({ error: `Script trop long : ${script.length} caractères. La limite est de 30 000 caractères.` });
    if (!audioUrl || !videos.length) return res.status(400).json({ error: "Ajoute une voix et au moins une vidéo." });
    const videoPaths = videos.map((item: any) => path.join(VIDEO_STORAGE_DIR, path.basename(String(item.id || ""))));
    if (videoPaths.some((filePath: string) => !existsSync(filePath))) return res.status(404).json({ error: "Un fichier vidéo est introuvable. Réuploade les rushs." });
    const jobId = crypto.randomUUID();
    const audioPath = path.join(VIDEO_STORAGE_DIR, `${jobId}-audio`);
    const outputPath = path.join(VIDEO_STORAGE_DIR, `${jobId}-result.mp4`);
    const captionPath = path.join(VIDEO_STORAGE_DIR, `${jobId}-captions.ass`);
    try {
      const remote = await fetch(audioUrl);
      if (!remote.ok) return res.status(502).json({ error: "Impossible de récupérer la voix Sawtify." });
      await writeFile(audioPath, Buffer.from(await remote.arrayBuffer()));
      const durationSeconds = await probeVideoDuration(audioPath);
      const billedMinutes = Math.max(1, Math.ceil(durationSeconds / 60));
      const montageCost = billedMinutes * VIDEO_POINTS_PER_MINUTE;
      if (balance < montageCost) return res.status(402).json({ error: `Solde insuffisant : ce montage coûte ${montageCost} points (${billedMinutes} min).`, required_points: montageCost, current_balance: balance, duration_seconds: durationSeconds });
      VIDEO_JOBS.set(jobId, { userId, status: "queued", cost: montageCost, createdAt: Date.now() });
      void (async () => {
        const job = VIDEO_JOBS.get(jobId);
        if (!job) return;
        job.status = "processing";
        try {
          const montagePrompt = `Prépare un plan de montage vidéo court et professionnel pour Sawtify. Durée: ${durationSeconds.toFixed(1)} secondes. Script: ${script.slice(0, 5000)}`;
          const montagePlan = await Promise.race([callGeminiTextAPI(montagePrompt, 0.35).then((result) => result.text), new Promise<string>((resolve) => setTimeout(() => resolve("plan-standard"), 2500))]).catch(() => "plan-standard");
          console.log(`[Video/Gemini] job=${jobId} ${montagePlan.length > 0 ? "plan prêt" : "plan standard"}, coût=${montageCost}`);
          await writeFile(captionPath, buildCaptionsAss(script, durationSeconds, String(req.body?.captionFont || "Cairo"), String(req.body?.captionTheme || "white"), String(req.body?.captionStyle || "bold"), Number(req.body?.captionSize)), "utf8");
          const segmentDuration = durationSeconds / videoPaths.length;
          const inputArgs: string[] = [];
          videoPaths.forEach((filePath: string, index: number) => { if (String(videos[index]?.kind) === "image") inputArgs.push("-loop", "1"); else inputArgs.push("-stream_loop", "-1"); inputArgs.push("-i", filePath); });
          inputArgs.push("-i", audioPath);
          const videoFilters = videoPaths.map((_filePath: string, index: number) => `[${index}:v]scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,format=yuv420p,trim=duration=${segmentDuration.toFixed(3)},setpts=PTS-STARTPTS[v${index}]`).join(";");
          const concatInputs = videoPaths.map((_filePath: string, index: number) => `[v${index}]`).join("");
          const filterComplex = `${videoFilters};${concatInputs}concat=n=${videoPaths.length}:v=1:a=0[base];[base]subtitles=${captionPath.replace(/:/g, "\\:")}[vout]`;
          await runVideoFfmpeg(["-y", ...inputArgs, "-filter_complex", filterComplex, "-map", "[vout]", "-map", `${videoPaths.length}:a:0`, "-t", durationSeconds.toFixed(3), "-c:v", "libx264", "-preset", "ultrafast", "-crf", "28", "-threads", "1", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", outputPath]);
          const debit = await deductCredits(userId, montageCost);
          if (!debit.success) throw new Error(debit.error || "Points insuffisants.");
          job.status = "ready";
          job.outputPath = outputPath;
        } catch (error: any) {
          job.status = "failed";
          job.error = error?.message || "Rendu vidéo impossible.";
          console.error(`[Video] job=${jobId} failed`, error);
          await Promise.allSettled([import("node:fs/promises").then(({ unlink }) => unlink(outputPath)).catch(() => undefined)]);
        } finally {
          await Promise.allSettled([import("node:fs/promises").then(({ unlink }) => unlink(audioPath)).catch(() => undefined), import("node:fs/promises").then(({ unlink }) => unlink(captionPath)).catch(() => undefined)]);
        }
      })();
      return res.status(202).json({ jobId, status: "queued", cost: montageCost, duration_seconds: durationSeconds, pollAfterMs: 2000 });
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || "Rendu vidéo impossible." });
    }
  });
  app.get("/api/video/render/:jobId", resolveUserIdMiddleware, async (req, res) => {
    const userId = (req as any).resolvedUserId as string | null;
    const job = VIDEO_JOBS.get(path.basename(req.params.jobId));
    if (!userId || !job || job.userId !== userId) return res.status(404).json({ error: "Tâche introuvable." });
    if (job.status === "failed") { VIDEO_JOBS.delete(req.params.jobId); return res.status(500).json({ status: "failed", error: job.error || "Rendu vidéo impossible." }); }
    if (job.status !== "ready") return res.json({ status: job.status, cost: job.cost });
    return res.json({ status: "ready", downloadUrl: `/api/video/render/${encodeURIComponent(req.params.jobId)}/download`, cost: job.cost });
  });
  app.get("/api/video/render/:jobId/download", resolveUserIdMiddleware, async (req, res) => {
    const userId = (req as any).resolvedUserId as string | null;
    const job = VIDEO_JOBS.get(path.basename(req.params.jobId));
    if (!userId || !job || job.userId !== userId || job.status !== "ready" || !job.outputPath || !existsSync(job.outputPath)) return res.status(404).json({ error: "Vidéo indisponible." });
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Disposition", "attachment; filename=sawtify-montage.mp4");
    return res.send(await readFile(job.outputPath));
  });

  // ===================================================================  // SAWTIFY DEVELOPER API — BETA
  // Authentification par clé dédiée, jamais par la clé Gemini.
  // ===================================================================
  const resolveDeveloperKey = async (req: express.Request): Promise<{ id: string; userId: string } | null> => {
    if (!supabaseClient) return null;
    const raw = req.get("x-sawtify-api-key") || req.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
    if (!raw.startsWith(API_KEY_PREFIX)) return null;
    const { data } = await supabaseClient.from("developer_api_keys").select("id, user_id").eq("key_hash", hashApiKey(raw)).eq("active", true).maybeSingle();
    return data ? { id: data.id, userId: data.user_id } : null;
  };

  app.post("/api/v1/developer/keys", resolveUserIdMiddleware, async (req, res) => {
    const userId = (req as any).resolvedUserId ?? await getUserIdFromAuthHeader(req);
    if (!userId || !supabaseClient) return res.status(401).json({ error: "Authentification requise." });
    const balance = await getUserBalance(userId);
    if (balance === null) return res.status(503).json({ error: "Impossible de vérifier le solde." });
    if (balance <= API_MIN_BALANCE) return res.status(403).json({ error: `L'API Beta nécessite plus de ${API_MIN_BALANCE} points disponibles.`, required_balance: API_MIN_BALANCE + 1, current_balance: balance });
    const rawKey = newApiKey();
    const name = typeof req.body?.name === "string" ? req.body.name.trim().slice(0, 80) : "Application Beta";
    const { data, error } = await supabaseClient.from("developer_api_keys").insert({ user_id: userId, name, key_prefix: rawKey.slice(0, 16), key_hash: hashApiKey(rawKey) }).select("id, name, key_prefix, created_at").single();
    if (error) return res.status(500).json({ error: "Impossible de créer la clé API." });
    return res.status(201).json({ beta: true, warning: "Copiez cette clé maintenant. Elle ne sera plus affichée.", api_key: rawKey, key: data });
  });

  app.get("/api/v1/developer/keys", resolveUserIdMiddleware, async (req, res) => {
    const userId = (req as any).resolvedUserId ?? await getUserIdFromAuthHeader(req);
    if (!userId || !supabaseClient) return res.status(401).json({ error: "Authentification requise." });
    const { data, error } = await supabaseClient.from("developer_api_keys").select("id, name, key_prefix, active, last_used_at, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(20);
    if (error) return res.status(500).json({ error: "Impossible de charger les clés API." });
    return res.json({ beta: true, keys: data || [] });
  });

  app.delete("/api/v1/developer/keys/:id", resolveUserIdMiddleware, async (req, res) => {
    const userId = (req as any).resolvedUserId ?? await getUserIdFromAuthHeader(req);
    if (!userId || !supabaseClient) return res.status(401).json({ error: "Authentification requise." });
    await supabaseClient.from("developer_api_keys").update({ active: false }).eq("id", req.params.id).eq("user_id", userId);
    return res.json({ success: true });
  });

  app.get("/api/v1/developer/usage", resolveUserIdMiddleware, async (req, res) => {
    const userId = (req as any).resolvedUserId ?? await getUserIdFromAuthHeader(req);
    if (!userId || !supabaseClient) return res.status(401).json({ error: "Authentification requise." });
    try {
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const [{ data: logs }, { data: keys }] = await Promise.all([
        supabaseClient.from("gemini_usage_logs").select("operation, characters, created_at, metadata").eq("user_id", userId).eq("operation", "tts").gte("created_at", since).limit(1000),
        supabaseClient.from("developer_api_keys").select("id, name, key_prefix, active, last_used_at, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
      ]);
      const rows = logs || [];
      const characters = rows.reduce((sum: number, row: any) => sum + (Number(row.characters) || 0), 0);
      const estimatedMinutes = Math.round((characters / TTS_CHARS_PER_SECOND_ESTIMATE / 60) * 10) / 10;
      return res.json({ period_days: 30, api_calls: rows.length, characters, estimated_minutes: estimatedMinutes, active_keys: (keys || []).filter((key: any) => key.active).length, keys: keys || [], daily: rows.reduce((out: Record<string, number>, row: any) => { const day = String(row.created_at).slice(0, 10); out[day] = (out[day] || 0) + 1; return out; }, {}) });
    } catch (error: any) { return res.status(500).json({ error: "Impossible de charger les statistiques API.", detail: error?.message }); }
  });

  app.get("/api/admin/overview", async (req, res) => {
    const admin = await isAdminRequest(req);
    if (!admin.userId || !admin.role) return res.status(403).json({ error: "Accès Admin interdit." });
    if (!supabaseClient) return res.status(503).json({ error: "Base de données indisponible." });
    try {
      const since30 = new Date(Date.now() - 30 * 86400000).toISOString();
      const [{ data: profiles }, { data: transactions }, { data: generations }, { data: usageLogs }] = await Promise.all([
        supabaseClient.from("profiles").select("id, email, full_name, credits_balance, total_generated_audios, created_at, updated_at").order("created_at", { ascending: false }).limit(5000),
        supabaseClient.from("transactions").select("user_id, amount_dzd, points_credited, status, gateway, created_at").limit(10000),
        supabaseClient.from("voice_generations").select("user_id, generation_source, points_deducted, audio_duration_seconds, char_count, created_at").limit(20000),
        supabaseClient.from("gemini_usage_logs").select("user_id, operation, model, characters, success, metadata, created_at").limit(20000),
      ]);
      const { data: authUsersData, error: authUsersError } = await supabaseClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const realAuthIds = authUsersError ? null : new Set((authUsersData?.users || []).map((user: any) => user.id));
      const authById = new Map<string, any>((authUsersData?.users || []).map((user: any) => [user.id, user] as [string, any]));
      const users = (profiles || []).map((profile: any) => { const authUser = authById.get(profile.id); return { ...profile, phone: authUser?.user_metadata?.phone_number || authUser?.phone || null }; });
      const paidTx = (transactions || []).filter((row: any) => row.status === "completed");
      const filteredTransactions = paidTx;
      const paidUserIds = new Set(filteredTransactions.map((row: any) => row.user_id));
      const gens = generations || [];
      const freeGenerations = gens.filter((row: any) => row.generation_source === "free_trial" || (row.generation_source === "legacy" && !paidUserIds.has(row.user_id))).length;
      const paidGenerations = gens.filter((row: any) => row.generation_source === "paid_balance" || (row.generation_source === "legacy" && paidUserIds.has(row.user_id))).length;
      const apiGenerations = gens.filter((row: any) => row.generation_source === "developer_api").length;
      const revenueDzd = filteredTransactions.reduce((sum: number, row: any) => sum + Number(row.amount_dzd || 0), 0);
      const paidPointsIssued = filteredTransactions.reduce((sum: number, row: any) => sum + Number(row.points_credited || 0), 0);
      const pointsConsumed = gens.reduce((sum: number, row: any) => sum + Number(row.points_deducted || 0), 0);
      const pointValueDzd = paidPointsIssued > 0 ? revenueDzd / paidPointsIssued : 0;
      const logs = usageLogs || [];
      let geminiUsd = 0;
      let geminiInputTokens = 0;
      let geminiOutputTokens = 0;
      const geminiByUser = new Map<string, { costUsd: number; calls: number; characters: number; inputTokens: number; outputTokens: number }>();
      let freeGeminiUsd = 0;
      let paidGeminiUsd = 0;
      for (const log of logs) {
        const chars = Number(log.characters || 0);
        const metadata = log.metadata && typeof log.metadata === "object" ? log.metadata : {};
        const metadataCost = Number((metadata as any).cost_usd);
        const inputTokens = Number((metadata as any).input_tokens || 0);
        const outputTokens = Number((metadata as any).output_tokens || 0);
        geminiInputTokens += inputTokens;
        geminiOutputTokens += outputTokens;
        const estimatedInputTokens = chars / 4;
        let logCost = 0;
        if (Number.isFinite(metadataCost) && metadataCost >= 0) {
          logCost = metadataCost;
        } else if (log.operation === "tts" || log.operation === "preview") {
          const seconds = log.operation === "preview" ? 2.5 : chars / TTS_CHARS_PER_SECOND_ESTIMATE;
          logCost = (estimatedInputTokens / 1_000_000) * GEMINI_TTS_INPUT_USD_PER_1M + ((seconds * GEMINI_AUDIO_TOKENS_PER_SECOND) / 1_000_000) * GEMINI_TTS_AUDIO_USD_PER_1M;
        } else {
          // Conservative estimate for text features; exact billing remains visible in Google Cloud.
          logCost = (estimatedInputTokens / 1_000_000) * 0.30 + (Math.max(estimatedInputTokens, 1) / 1_000_000) * 1.50;
        }
        geminiUsd += logCost;
        const userKey = String(log.user_id || "unknown");
        const userCost = geminiByUser.get(userKey) || { costUsd: 0, calls: 0, characters: 0, inputTokens: 0, outputTokens: 0 };
        userCost.costUsd += logCost;
        userCost.calls += 1;
        userCost.characters += chars;
        userCost.inputTokens += inputTokens;
        userCost.outputTokens += outputTokens;
        geminiByUser.set(userKey, userCost);
        if (paidUserIds.has(log.user_id)) paidGeminiUsd += logCost; else freeGeminiUsd += logCost;
      }
      const geminiCostDzd = geminiUsd * USD_TO_DZD;
      const grossMarginDzd = revenueDzd - geminiCostDzd;
      const activeUsers30d = users.filter((row: any) => String(row.updated_at || row.created_at) >= since30).length;
      // FIX ADMIN-PAGINATION : on renvoie tous les comptes (jusqu'à la limite déjà
      // appliquée sur la requête `users`, 5000) au lieu de les tronquer à 20 ici —
      // la pagination (20/page) est désormais gérée côté front (AdminPage.tsx).
      const recentUsers = users.map((user: any) => ({
        ...user,
        gemini_calls: geminiByUser.get(user.id)?.calls || 0,
        gemini_characters: geminiByUser.get(user.id)?.characters || 0,
        gemini_cost_usd: geminiByUser.get(user.id)?.costUsd || 0,
        gemini_cost_dzd: (geminiByUser.get(user.id)?.costUsd || 0) * USD_TO_DZD,
      }));
      const recentPayments = paidTx.sort((a: any, b: any) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 20);
      await supabaseClient.from("admin_audit_log").insert({ admin_user_id: admin.userId, action: "view_admin_overview", metadata: { role: admin.role } });
      return res.json({ summary: { total_users: users.length, free_trial_users: users.filter((u: any) => !paidUserIds.has(u.id)).length, paid_users: paidUserIds.size, active_users_30d: activeUsers30d, generations_total: gens.length, free_generations: freeGenerations, paid_generations: paidGenerations, api_generations: apiGenerations, revenue_dzd: revenueDzd, points_consumed: pointsConsumed, paid_points_issued: paidPointsIssued, point_value_dzd: pointValueDzd, gemini_calls: logs.length, gemini_input_tokens: geminiInputTokens, gemini_output_tokens: geminiOutputTokens, gemini_cost_usd: geminiUsd, gemini_cost_dzd: geminiCostDzd, free_gemini_cost_dzd: freeGeminiUsd * USD_TO_DZD, paid_gemini_cost_dzd: paidGeminiUsd * USD_TO_DZD, text_input_usd_per_1m: GEMINI_TEXT_INPUT_USD_PER_1M, text_output_usd_per_1m: GEMINI_TEXT_OUTPUT_USD_PER_1M, average_cost_per_generation_dzd: gens.length ? geminiCostDzd / gens.length : 0, gross_margin_dzd: grossMarginDzd, gross_margin_percent: revenueDzd > 0 ? (grossMarginDzd / revenueDzd) * 100 : 0, usd_to_dzd: USD_TO_DZD }, recent_users: recentUsers, recent_payments: recentPayments, cost_model: { text_model: GEMINI_TEXT_MODEL, text_input_usd_per_1m: GEMINI_TEXT_INPUT_USD_PER_1M, text_output_usd_per_1m: GEMINI_TEXT_OUTPUT_USD_PER_1M, tts_model: TTS_MODEL, tts_input_usd_per_1m: GEMINI_TTS_INPUT_USD_PER_1M, tts_audio_usd_per_1m: GEMINI_TTS_AUDIO_USD_PER_1M, audio_tokens_per_second: GEMINI_AUDIO_TOKENS_PER_SECOND } });
    } catch (error: any) { return res.status(500).json({ error: "Impossible de charger le dashboard Admin.", detail: error?.message }); }
  });

  app.get("/api/admin/users/:userId", async (req, res) => {
    const admin = await isAdminRequest(req);
    if (!admin.userId || !admin.role) return res.status(403).json({ error: "Accès Admin interdit." });
    if (!supabaseClient || !/^[0-9a-f-]{36}$/i.test(req.params.userId)) return res.status(400).json({ error: "Utilisateur invalide." });
    try {
      const userId = req.params.userId;
      const { data: profile, error: profileError } = await supabaseClient.from("profiles").select("id, email, full_name, credits_balance, total_generated_audios, created_at, updated_at").eq("id", userId).maybeSingle();
      if (profileError) return res.status(500).json({ error: "Impossible de lire le profil utilisateur.", detail: profileError.message });
      if (!profile) return res.status(404).json({ error: "Profil utilisateur introuvable.", detail: "Cet identifiant existe peut-être dans Auth mais pas dans public.profiles." });
      const [{ data: generations, error: generationsError }, { data: transactions }, { data: usageLogs }] = await Promise.all([
        supabaseClient.from("voice_generations").select("id, voice_id, voice_name, text_prompt, char_count, points_deducted, audio_storage_path, audio_duration_seconds, latency_ms, status, generation_source, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(200),
        supabaseClient.from("transactions").select("id, amount_dzd, points_credited, status, gateway, gateway_reference, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
        supabaseClient.from("gemini_usage_logs").select("operation, model, characters, success, metadata, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(200),
      ]);
      if (generationsError) return res.status(500).json({ error: "Impossible de lire les générations de cet utilisateur.", detail: generationsError.message });
      const signedGenerations = await Promise.all((generations || []).map(async (generation: any) => {
        let audioUrl: string | null = null;
        if (generation.audio_storage_path) {
          const signed = await supabaseClient!.storage.from("audio-generations").createSignedUrl(generation.audio_storage_path, 3600);
          audioUrl = signed.data?.signedUrl || null;
        }
        return { ...generation, audio_url: audioUrl };
      }));
      const userUsageLogs = usageLogs || [];
      const userGeminiCostUsd = userUsageLogs.reduce((sum: number, log: any) => sum + Math.max(0, Number(log.metadata?.cost_usd || 0)), 0);
      const userInputTokens = userUsageLogs.reduce((sum: number, log: any) => sum + Math.max(0, Number(log.metadata?.input_tokens || 0)), 0);
      const userOutputTokens = userUsageLogs.reduce((sum: number, log: any) => sum + Math.max(0, Number(log.metadata?.output_tokens || 0)), 0);
      const { data: authUser } = await supabaseClient.auth.admin.getUserById(userId);
      await supabaseClient.from("admin_audit_log").insert({ admin_user_id: admin.userId, action: "view_admin_user_detail", metadata: { viewed_user_id: userId, role: admin.role } });
      return res.json({ profile: { ...profile, phone: authUser?.user?.phone || authUser?.user?.user_metadata?.phone_number || null, last_sign_in_at: authUser?.user?.last_sign_in_at || null, onboarding_completed_at: authUser?.user?.user_metadata?.onboarding_completed_at || null, acquisition_source: authUser?.user?.user_metadata?.acquisition_source || null }, generations: signedGenerations, transactions: transactions || [], usage_logs: userUsageLogs, usage_summary: { calls: userUsageLogs.length, input_tokens: userInputTokens, output_tokens: userOutputTokens, cost_usd: userGeminiCostUsd, cost_dzd: userGeminiCostUsd * USD_TO_DZD, model: GEMINI_TEXT_MODEL } });
    } catch (error: any) { return res.status(500).json({ error: "Impossible de charger le détail utilisateur.", detail: error?.message }); }
  });

  app.post("/api/marketing/events", async (req, res) => {
    if (!supabaseClient) return res.status(503).json({ error: "Base de données indisponible." });
    const { sessionId, eventName, path: eventPath, source, medium, campaign, referrer, metadata } = req.body || {};
    const allowed = new Set(["landing_view", "landing_90_percent", "signup_open", "google_signup_click", "oauth_return", "account_created", "onboarding_completed"]);
    if (typeof sessionId !== "string" || sessionId.length < 16 || sessionId.length > 100 || !allowed.has(eventName)) return res.status(400).json({ error: "Événement invalide." });
    const { error } = await supabaseClient.from("marketing_events").insert({ session_id: sessionId.slice(0, 100), event_name: eventName, path: typeof eventPath === "string" ? eventPath.slice(0, 200) : null, source: typeof source === "string" ? source.slice(0, 80) : null, medium: typeof medium === "string" ? medium.slice(0, 80) : null, campaign: typeof campaign === "string" ? campaign.slice(0, 120) : null, referrer: typeof referrer === "string" ? referrer.slice(0, 300) : null, metadata: metadata && typeof metadata === "object" ? metadata : {} });
    if (error) return res.status(500).json({ error: "Événement non enregistré." });
    return res.status(204).end();
  });

  app.get("/api/admin/marketing-funnel", async (req, res) => {
    const admin = await isAdminRequest(req);
    if (!admin.userId || !admin.role || !supabaseClient) return res.status(403).json({ error: "Accès Admin interdit." });
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data, error } = await supabaseClient.from("marketing_events").select("session_id,event_name,source,medium,campaign,created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(100000);
    if (error) return res.status(500).json({ error: "Impossible de charger le funnel. Vérifie la migration marketing_funnel.sql." });
    const rows = data || [];
    const stages = ["landing_view", "landing_90_percent", "signup_open", "google_signup_click", "oauth_return", "account_created", "onboarding_completed"];
    const counts = Object.fromEntries(stages.map((stage) => [stage, new Set(rows.filter((row: any) => row.event_name === stage).map((row: any) => row.session_id)).size]));
    const campaigns: Record<string, any> = {};
    for (const row of rows) { const key = row.campaign || row.source || "direct"; campaigns[key] ||= { name: key, sessions: new Set<string>(), signup_open: new Set<string>(), account_created: new Set<string>(), onboarding_completed: new Set<string>() }; campaigns[key].sessions.add(row.session_id); if (row.event_name === "signup_open") campaigns[key].signup_open.add(row.session_id); if (row.event_name === "account_created") campaigns[key].account_created.add(row.session_id); if (row.event_name === "onboarding_completed") campaigns[key].onboarding_completed.add(row.session_id); }
    return res.json({ period_days: 30, counts, campaigns: Object.values(campaigns).map((item: any) => ({ name: item.name, visitors: item.sessions.size, signup_open: item.signup_open.size, accounts: item.account_created.size, onboarding: item.onboarding_completed.size })) });
  });

  app.get("/api/audio/:generationId", async (req, res) => {
    if (!supabaseClient || !/^[0-9a-f-]{36}$/i.test(req.params.generationId)) return res.status(404).json({ error: "Audio introuvable." });
    try {
      const { data: generation, error } = await supabaseClient.from("voice_generations").select("audio_storage_path").eq("id", req.params.generationId).maybeSingle();
      if (error || !generation?.audio_storage_path) return res.status(404).json({ error: "Audio introuvable ou non stocké." });
      const { data: signed, error: signedError } = await supabaseClient.storage.from("audio-generations").createSignedUrl(generation.audio_storage_path, 3600);
      if (signedError || !signed?.signedUrl) return res.status(404).json({ error: "Lien audio indisponible." });
      return res.redirect(302, signed.signedUrl);
    } catch { return res.status(404).json({ error: "Audio introuvable." }); }
  });

  // URL média sans query-string Supabase : certains intégrateurs refusent les
  // URLs signées ou ne savent pas télécharger leur token. L'URL reste publique
  // comme toute URL média d'automatisation, mais elle expire après 7 jours.
  app.get("/api/v1/developer/media/:userId/:keyId/:fileName", async (req, res) => {
    const { userId, keyId, fileName } = req.params;
    if (!/^[0-9a-f-]{36}$/i.test(userId) || !/^[0-9a-f-]{36}$/i.test(keyId) || !/^\d+\.(wav|mp3)$/i.test(fileName)) {
      return res.status(404).json({ error: "Media introuvable." });
    }
    const createdAt = Number(fileName.slice(0, -4));
    if (!Number.isFinite(createdAt) || Date.now() - createdAt > 7 * 86400 * 1000 || createdAt > Date.now() + 60000) {
      return res.status(410).json({ error: "URL média expirée." });
    }
    const filePath = `${userId}/developer/${keyId}/${fileName}`;
    const { data, error } = await supabaseClient.storage.from("audio-generations").download(filePath);
    if (error || !data) return res.status(404).json({ error: "Media introuvable ou supprimé." });
    const isMp3 = fileName.toLowerCase().endsWith(".mp3");
    res.set({ "Content-Type": isMp3 ? "audio/mpeg" : "audio/wav", "Content-Length": String(data.size), "Content-Disposition": `inline; filename=sawtify-output.${isMp3 ? "mp3" : "wav"}`, "Accept-Ranges": "bytes", "Cache-Control": "public, max-age=3600" });
    return res.send(Buffer.from(await data.arrayBuffer()));
  });

  app.post("/api/v1/developer/tts", async (req, res) => {
    const key = await resolveDeveloperKey(req);
    if (!key || !supabaseClient) return res.status(401).json({ error: "Clé API Beta invalide ou absente." });
    const { text, voice_id = "voice_amin", speed = 1, pitch = 1, format = "wav", register = "darija", intensity = "normal" } = req.body || {};
    const safeDevRegister = ["darija", "fusha", "francais"].includes(register) ? register : "darija";
    const safeDevIntensity = ["low", "normal", "high"].includes(intensity) ? intensity : "normal";
    if (typeof text !== "string" || !text.trim()) return res.status(400).json({ error: "text est obligatoire." });
    if (text.length > TTS_MAX_CHARS_UNLOCKED) return res.status(400).json({ error: `text dépasse ${TTS_MAX_CHARS_UNLOCKED} caractères.` });
    if (format !== "wav" && format !== "json") return res.status(400).json({ error: "format doit être wav ou json." });
    const balance = await getUserBalance(key.userId);
    if (balance === null) return res.status(503).json({ error: "Impossible de vérifier le solde." });
    if (balance <= API_MIN_BALANCE) return res.status(403).json({ error: `L'API Beta est disponible au-dessus de ${API_MIN_BALANCE} points.`, required_balance: API_MIN_BALANCE + 1, current_balance: balance });
    const estimatedDuration = Math.ceil(text.trim().length / TTS_CHARS_PER_SECOND_ESTIMATE);
    const estimatedCost = computePointsCost(estimatedDuration);
    if (balance < estimatedCost) return res.status(402).json({ error: "Solde insuffisant pour ce texte.", estimated_duration_seconds: estimatedDuration, estimated_points_required: estimatedCost, current_balance: balance });
    if (await hasReachedDailyTTSLimit(key.userId)) return res.status(429).json({ error: `Quota quotidien atteint (${DAILY_TTS_LIMIT} générations).` });
    const selectedVoiceName =
      resolveRequestedVoice(voice_id);
    // API développeur : les balises sont analysées comme partout ailleurs,
    // donc les clients existants qui envoient `[excited]` continuent de
    // fonctionner, et les nouveaux peuvent utiliser `<laugh>`, `<sigh>`…
    const devApi = parseTranscript(text);
    const devTags = devApi.tags.map((t) => t.tag);
    const started = Date.now();
    const generated = await synthesizeWithRetry(devApi.text.trim(), selectedVoiceName, 3, Number(speed) || 1, Number(pitch) || 1, voice_id, devTags, safeDevRegister, safeDevIntensity);
    const usageCount = await recordGeminiUsage({ userId: key.userId, operation: "tts", characters: text.length, success: Boolean(generated.pcmBuffer), model: TTS_MODEL, metadata: { source: "developer_api", key_id: key.id } });
    if (!generated.pcmBuffer) return res.status(503).json({ error: "Génération indisponible; aucun point débité.", detail: generated.error });
    const duration = Math.round((generated.pcmBuffer.length / 48000) * 10) / 10;
    const cost = computePointsCost(duration);
    const wav = pcmToWavBuffer(generated.pcmBuffer, 24000, 1, 16);
    const mp3 = pcmToMp3Buffer(generated.pcmBuffer, 24000);
    const { data, error } = await supabaseClient.rpc("deduct_and_record_generation_service", { p_user_id: key.userId, p_amount: cost, p_voice_id: voice_id, p_voice_name: selectedVoiceName, p_prompt: text.trim(), p_char_count: text.length, p_duration: duration, p_latency: Date.now() - started });
    if (error || !data?.success) return res.status(402).json({ error: error?.message || data?.error || "Solde insuffisant; aucun audio validé." });
    if (data.generation_id) await supabaseClient.from("voice_generations").update({ generation_source: "developer_api" }).eq("id", data.generation_id).eq("user_id", key.userId);
    const bonus = await supabaseClient.rpc("award_generation_milestone_bonus", { p_user_id: key.userId });
    await supabaseClient.from("developer_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", key.id);
    const mediaPath = `${key.userId}/developer/${key.id}/${Date.now()}.wav`;
    const { error: mediaUploadError } = await supabaseClient.storage.from("audio-generations").upload(mediaPath, wav, { contentType: "audio/wav", upsert: false });
    const mp3Path = mediaPath.replace(/\.wav$/, ".mp3");
    const { error: mp3UploadError } = await supabaseClient.storage.from("audio-generations").upload(mp3Path, mp3, { contentType: "audio/mpeg", upsert: false });
    let mediaUrl: string | null = null;
    let mp3Url: string | null = null;
    if (!mediaUploadError) {
      mediaUrl = `${PUBLIC_MEDIA_URL}/api/v1/developer/media/${key.userId}/${key.id}/${mediaPath.split("/").pop()}`;
    }
    if (!mp3UploadError) {
      mp3Url = `${PUBLIC_MEDIA_URL}/api/v1/developer/media/${key.userId}/${key.id}/${mp3Path.split("/").pop()}`;
    }
    const pointsRemaining = bonus.data?.awarded ? bonus.data.new_balance : data.remaining_balance;
    const responseMeta = { success: true, beta: true, format: "wav", mime_type: "audio/wav", media_type: "audio/wav", media_url: mediaUrl, audio_url: mediaUrl, wav_url: mediaUrl, mp3_url: mp3Url, mp3_mime_type: "audio/mpeg", sample_rate: 24000, duration_seconds: duration, points_deducted: cost, points_remaining: pointsRemaining, remaining_balance: pointsRemaining, milestone_bonus: bonus.data?.awarded ? 30 : 0, daily_gemini_calls: usageCount, media_url_expires_in_seconds: mediaUrl || mp3Url ? 7 * 86400 : null };
    if (format === "json") return res.json({ ...responseMeta, audio_base64: wav.toString("base64") });
    res.set({ "Content-Type": "audio/wav", "Content-Disposition": "attachment; filename=sawtify-output.wav", "X-Sawtify-Format": "wav", "X-Sawtify-Media-URL": mediaUrl || "", "X-Sawtify-Duration": String(duration), "X-Sawtify-Points": String(cost), "X-Sawtify-Milestone-Bonus": bonus.data?.awarded ? "30" : "0", "X-Sawtify-Remaining-Balance": String(bonus.data?.awarded ? bonus.data.new_balance : data.remaining_balance ?? "") });
    return res.send(wav);
  });
  app.get("/api/v1/developer/tts", (_req, res) => {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Méthode incorrecte. Utilisez POST avec un body JSON contenant text, voice_id et format." });
  });

  /* ===================================================================     TTS PREVIEW (gratuit)
     FIX n°1 + FIX n°5 : plus de fallback synthétique ; la voix Gemini fait
     partie de la cacheKey (invalidation auto si la map change) ; un échec
     Gemini renvoie 503 SANS rien mettre en cache ni persister.
     (Bénéficie automatiquement des FIX TTS-A à TTS-E : les scripts de preview
     sont courts → 1 seul morceau, comportement identique à avant.)
     ========================================================================== */
  const handleTTSPreview = async (req: express.Request, res: express.Response) => {
    const previewUserId = (req as any).resolvedUserId ?? await getUserIdFromAuthHeader(req);
    const voiceId = (req.query.voice_id as string) || "voice_amin";
    const speed = parseFloat(req.query.speed as string) || 1.0;
    const pitch = parseFloat(req.query.pitch as string) || 1.0;

    // FIX n°5 : la voix Gemini est dans la clé de cache.
    // MIGRATION 30 VOIX : plus de « GEMINI_VOICE_MAP[...] || Puck » ici.
    // resolveRequestedVoice() accepte les 9 anciens IDs, les 30 prénoms
    // français, les prénoms arabes, les slugs et les noms techniques.
    const selectedVoiceName = resolveRequestedVoice(voiceId);
    const cacheKey = `${voiceId}_${selectedVoiceName}_${speed.toFixed(1)}_${pitch.toFixed(1)}`;

    // ── APERÇU FIGÉ (le moins cher et le plus rapide) ──
    // Si l'aperçu de cette voix a déjà été généré par `npm run apercus:voix`,
    // on le sert directement : 0 appel Gemini, 0 point, réponse instantanée.
    // Vitesse et hauteur n'ont pas d'incidence : l'aperçu est un échantillon fixe.
    const frozen = getCachedPreviewUrl(selectedVoiceName);
    if (frozen) {
      const entry = PREVIEW_INDEX.get(selectedVoiceName);
      return res.json({
        voice_id: voiceId,
        voice_name: selectedVoiceName,
        display_name: voiceNameEntry(selectedVoiceName)?.fr || selectedVoiceName,
        audio_url: frozen,
        duration_seconds: entry?.durationSeconds ?? 2.5,
        cached: true,
        source: "manifest",
      });
    }

    if (PREVIEW_AUDIO_CACHE.has(cacheKey)) {
      return res.json({ voice_id: voiceId, voice_name: selectedVoiceName, audio_url: PREVIEW_AUDIO_CACHE.get(cacheKey)!, duration_seconds: 2.5, cached: true, source: "memory" });
    }

    // ── APERÇU DÉJÀ FABRIQUÉ, TOUTES ÉCRITURES CONFONDUES ────────────────
    // On interroge la clé canonique AVANT de dépenser un appel Gemini : un
    // aperçu généré une fois (par le préchauffage ou par n'importe quel
    // utilisateur) est servi à tous, même si la voix est écrite autrement.
    const canonicalKey = previewKeyForVoice(selectedVoiceName);
    // 1) On SAIT qu'il existe (index du préchauffage) → adresse directe du CDN.
    if (PREVIEW_STORAGE_KEYS.has(canonicalKey)) {
      const url = publicPreviewUrl(canonicalKey);
      if (url) {
        return res.json({ voice_id: voiceId, voice_name: selectedVoiceName, display_name: voiceNameEntry(selectedVoiceName)?.fr || selectedVoiceName, audio_url: url, duration_seconds: PREVIEW_INDEX.get(selectedVoiceName)?.durationSeconds ?? 2.5, cached: true, source: "supabase-cdn" });
      }
    }
    // 2) Sinon on vérifie une fois (et on mémorise pour les fois suivantes).
    const canonicalPreview = await loadPersistentPreview(canonicalKey);
    if (canonicalPreview) {
      PREVIEW_STORAGE_KEYS.add(canonicalKey);
      const url = publicPreviewUrl(canonicalKey) || canonicalPreview;
      return res.json({ voice_id: voiceId, voice_name: selectedVoiceName, display_name: voiceNameEntry(selectedVoiceName)?.fr || selectedVoiceName, audio_url: url, duration_seconds: PREVIEW_INDEX.get(selectedVoiceName)?.durationSeconds ?? 2.5, cached: true, source: "supabase" });
    }
    const inflight = PREVIEW_INFLIGHT.get(cacheKey);
    if (inflight) {
      try {
        const audioUrl = await inflight;
        return res.json({ voice_id: voiceId, voice_name: selectedVoiceName, audio_url: audioUrl, duration_seconds: 2.5, cached: true, source: "inflight" });
      } catch (err: any) {
        return res.status(503).json({ error: "Aperçu vocal temporairement indisponible, réessaie dans quelques secondes.", detail: err?.message });
      }
    }

    // ⚠️ NE PAS relire l'ANCIENNE clé de stockage (« voice_amin_Puck_1.0_1.0 ») :
    // ces fichiers datent d'avant la réécriture 100 % darija et contiennent
    // l'ancien texte en arabe classique. Les servir, c'est faire entendre à
    // l'utilisateur l'ancienne version — exactement ce qu'on ne veut pas.
    // Ils sont supprimés du stockage par le préchauffage (voir plus bas).

    // Texte de l'aperçu : d'abord le texte « vitrine » propre à la voix,
    // sinon l'ancien script pour compatibilité, sinon le script d'audition.
    const legacyKey = previewTargets().find((t) => t.voice.id === selectedVoiceName)?.legacyId || voiceId;
    const sampleScript =
      VOICE_PREVIEW_TEXTS[selectedVoiceName] ||
      VOICE_PREVIEW_SCRIPTS[legacyKey] ||
      VOICE_PREVIEW_SCRIPTS[voiceId] ||
      AUDITION_SCRIPT;
    const generation = (async () => {
      // FIX n°1 : SEUL du vrai audio Gemini est caché/persisté.
      // Échec → exception → 503. Jamais de sinusoïdes robotiques en cache.
      // FIX COST-3 : ce bloc n'est atteint que sur un vrai cache miss (mémoire +
      // persistant), donc ce log reflète un vrai appel Gemini, pas une requête HTTP.
      const previewStart = Date.now();
      const { pcmBuffer, error: synthError } = await synthesizeWithRetry(sampleScript, selectedVoiceName, 3, speed, pitch, voiceId, []);
      logGeminiCall({ userId: previewUserId ?? null, callType: "preview", billable: false, pointsCost: 0, charCount: sampleScript.length, success: Boolean(pcmBuffer), latencyMs: Date.now() - previewStart });
      if (!pcmBuffer || pcmBuffer.length <= 50) {
        throw new Error(synthError || "Gemini TTS indisponible");
      }
      const dataUri = `data:audio/wav;base64,${pcmToWavBuffer(pcmBuffer, 24000, 1, 16).toString("base64")}`;
      PREVIEW_AUDIO_CACHE.set(cacheKey, dataUri);
      // Enregistrement sous la clé CANONIQUE : c'est ce qui fait qu'un seul
      // aperçu suffit pour toutes les écritures de la même voix.
      PREVIEW_AUDIO_CACHE.set(canonicalKey, dataUri);
      await savePersistentPreview(canonicalKey, dataUri);
      await recordGeminiUsage({ userId: previewUserId, operation: "preview", characters: sampleScript.length, success: true, model: TTS_MODEL, metadata: { voice: voiceId, free: true } });
      return dataUri;
    })();
    PREVIEW_INFLIGHT.set(cacheKey, generation);
    try {
      const dataUri = await generation;
      return res.json({ voice_id: voiceId, voice_name: selectedVoiceName, audio_url: dataUri, duration_seconds: 2.5, cached: false, source: "gemini" });
    } catch (err: any) {
      return res.status(503).json({ error: "Aperçu vocal temporairement indisponible, réessaie dans quelques secondes.", detail: err?.message });
    } finally {
      PREVIEW_INFLIGHT.delete(cacheKey);
    }
  };
  app.get("/api/v1/tts/preview", previewLimiter, handleTTSPreview);
  app.get("/api/tts/preview", previewLimiter, handleTTSPreview);

  /* ===================================================================
     SUIVI DES APERÇUS — « où en est la génération des 30 voix ? »
     -------------------------------------------------------------------
     Réponse lisible directement dans un navigateur :
       { "prets": 12, "total": 30, "en_cours": true, "restant": 18, ... }
     Aucune donnée sensible : que des noms de voix et des compteurs.
     =================================================================== */
  const handlePreviewStatus = (_req: express.Request, res: express.Response) => {
    const total = previewTargets().length;
    const prets = previewTargets().filter((t) => PREVIEW_STORAGE_KEYS.has(previewKeyForVoice(t.voice.id))).length;
    const manquants = previewTargets()
      .filter((t) => !PREVIEW_STORAGE_KEYS.has(previewKeyForVoice(t.voice.id)))
      .map((t) => t.voice.id);
    res.set("Cache-Control", "no-store");
    res.json({
      prets,
      total,
      restant: total - prets,
      en_cours: PREVIEW_WARM_STATE.en_cours,
      mode: "inutile de lancer une commande : le serveur fabrique les aperçus manquants tout seul, en tâche de fond, au démarrage",
      script_version: AUDITION_SCRIPT_VERSION,
      langues: "100 % darija algérienne",
      bucket: PREVIEW_BUCKET,
      bucket_public: Boolean(SUPABASE_URL),
      voix_manquantes: manquants,
      detail: PREVIEW_WARM_STATE,
    });
  };
  app.get("/api/v1/tts/preview-status", handlePreviewStatus);
  app.get("/api/tts/preview-status", handlePreviewStatus);

  /* ===================================================================
     LISTE DES 30 VOIX (API)
     -------------------------------------------------------------------
     Renvoie TOUT ce qu'un développeur a besoin de savoir sur chaque voix :
     prénom français, prénom arabe, nom technique, caractère, genre,
     et l'URL de son aperçu audio quand il a été généré.

     `?lang=ar` pour les textes en arabe. `?avec_apercu=1` pour ne garder
     que les voix dont l'aperçu existe déjà.
     =================================================================== */
  app.get("/api/v1/tts/voices", (req, res) => {
    const lang = (req.query.lang as string) === "ar" ? "ar" : "fr";
    const seulementAvecApercu = req.query.avec_apercu === "1";

    let voix = previewTargets().map((t) => {
      const n = VOICE_NAMES.find((x) => x.id === t.voice.id);
      const entry = PREVIEW_INDEX.get(t.voice.id);
      const apercu = getCachedPreviewUrl(t.voice.id);
      return {
        id: t.voice.id,
        name_fr: t.nameFr,
        name_ar: t.nameAr,
        slug: t.slug,
        legacy_id: t.legacyId ?? null,
        caractere: lang === "fr" ? n?.caractereFr : n?.caractereAr,
        gender: n?.gender ?? "unknown",
        a_confirmer: Boolean(n?.aConfirmer),
        preview_url: apercu && !apercu.startsWith("data:") ? apercu : apercu ? `/api/v1/tts/preview?voice_id=${encodeURIComponent(t.voice.id)}` : null,
        preview_seconds: entry?.durationSeconds ?? null,
      };
    });
    if (seulementAvecApercu) voix = voix.filter((v) => v.preview_url);

    res.set("Cache-Control", "public, max-age=300");
    res.json({
      model: TTS_MODEL,
      lang,
      count: voix.length,
      total: previewTargets().length,
      audition_script_version: AUDITION_SCRIPT_VERSION,
      gender_valides: PREVIEW_MANIFEST ? PREVIEW_MANIFEST.count : 0,
      voices: voix,
    });
  });
  app.get("/api/tts/voices", (req, res) => res.redirect(307, `/api/v1/tts/voices?${new URLSearchParams(req.query as any).toString()}`));

  /* ===================================================================
     MANIFESTE DES APERÇUS (API)
     Renvoie le manifeste tel quel : noms des fichiers WAV, durées, dates,
     empreinte du script. Sert aux outils internes et au diagnostic.
     =================================================================== */
  app.get("/api/v1/tts/preview-manifest", (_req, res) => {
    if (!PREVIEW_MANIFEST) {
      return res.status(404).json({
        error: "Aucun aperçu généré pour le moment.",
        comment_faire: "npm run apercus:voix",
        script_version_attendu: AUDITION_SCRIPT_VERSION,
      });
    }
    res.set("Cache-Control", "public, max-age=300");
    res.json({ ...PREVIEW_MANIFEST, script_version: AUDITION_SCRIPT_VERSION, a_valider_a_loreille: voicesNeedingGenderValidation(PREVIEW_MANIFEST) });
  });

  /* ===================================================================     TTS GENERATE (débit côté serveur)
     Bénéficie des FIX TTS-A → TTS-E :
     - plus de blocage infini (timeout 45s par appel Gemini)
     - un son coupé en plein milieu (finishReason != STOP) est rejeté/retenté
     - les textes longs sont générés morceau par morceau puis collés
     - si un morceau échoue → 503 et AUCUN point n'est débité
     ========================================================================== */
  const handleTTSGenerate = async (req: express.Request, res: express.Response) => {
    const queueFull = (TTS_CONCURRENCY as any).activeCount >= TTS_CONCURRENCY_LIMIT && (TTS_CONCURRENCY as any).pendingCount >= TTS_QUEUE_MAX_PENDING;
    if (queueFull) {
      return res.status(503).json({ error: "Le serveur vocal est occupé.", retry_after: 4, message: "Génération en cours… Réessayez dans quelques instants 🎙️" });
    }

    await TTS_CONCURRENCY(async () => {
      const startTime = Date.now();
      const userId = (req as any).resolvedUserId ?? await getUserIdFromAuthHeader(req);
      const { text, voice, voice_id, speed = 1.0, pitch = 1.0, register = "darija", intensity = "normal" } = req.body;
      const safeRegister = ["darija", "fusha", "francais"].includes(register) ? register : "darija";
      const safeIntensity = ["low", "normal", "high"].includes(intensity) ? intensity : "normal";
      const requestedVoice = voice_id || voice || "voice_amin";
      const numSpeed = typeof speed === "number" ? speed : parseFloat(speed) || 1.0;
      const numPitch = typeof pitch === "number" ? pitch : parseFloat(pitch) || 1.0;

      if (!text || typeof text !== "string" || !text.trim()) {
        return res.status(400).json({ detail: "Le texte fourni ne contient aucun caractère vocalement synthétisable." });
      }
      if (!userId) return res.status(401).json({ error: "Authentification requise." });
      if (!supabaseClient) return res.status(503).json({ error: "Base de données indisponible." });

      const [balanceBeforeGeneration, paidTxCountResult, pointsSpentResult] = await Promise.all([
        getUserBalance(userId),
        supabaseClient.from("transactions").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "completed"),
        supabaseClient.from("voice_generations").select("points_deducted").eq("user_id", userId),
      ]);
      const paidTransactionCount = paidTxCountResult.count || 0;
      const isPaidUser = paidTransactionCount > 0;
      const totalPointsSpent = (pointsSpentResult.data || []).reduce(
        (sum: number, row: any) => sum + Number(row.points_deducted || 0), 0
      );
      // FIX COST-6bis : passé ce seuil de points déjà consommés, on considère l'utilisateur
      // suffisamment engagé pour lever le plafond de durée de l'essai gratuit, même sans paiement.
      const hasUnlockedFreeTrialCap = isPaidUser || totalPointsSpent >= FREE_TRIAL_UNLOCK_POINTS_THRESHOLD;

      if (balanceBeforeGeneration === null) return res.status(503).json({ error: "Impossible de vérifier le solde. Aucun point n'a été débité." });
      if (balanceBeforeGeneration !== null && balanceBeforeGeneration < BASE_POINTS_COST) {
        return res.status(402).json({ error: `Solde de points insuffisant (${BASE_POINTS_COST} points minimum requis).` });
      }

      // FIX COST-5 : 1200 caractères par défaut, débloqué jusqu'à 5000 pour les
      // comptes qui gardent un solde ≥ TTS_UNLOCK_BALANCE_THRESHOLD points.
      const unlocked = balanceBeforeGeneration >= TTS_UNLOCK_BALANCE_THRESHOLD;
      const maxChars = unlocked ? TTS_MAX_CHARS_UNLOCKED : TTS_MAX_CHARS_DEFAULT;
      if (text.length > maxChars) {
        return res.status(400).json({
          error: unlocked
            ? `Texte trop long (maximum ${maxChars} caractères).`
            : `Texte trop long (maximum ${maxChars} caractères). Gardez un solde d'au moins ${TTS_UNLOCK_BALANCE_THRESHOLD} points pour débloquer jusqu'à ${TTS_MAX_CHARS_UNLOCKED} caractères.`,
          max_chars: maxChars, unlock_threshold: TTS_UNLOCK_BALANCE_THRESHOLD, unlock_max_chars: TTS_MAX_CHARS_UNLOCKED, unlocked,
        });
      }

      // FIX COST-6 : plafonne la durée pour les comptes qui n'ont ni payé, ni dépassé
      // le seuil de points déjà dépensés (FREE_TRIAL_UNLOCK_POINTS_THRESHOLD).
      if (!hasUnlockedFreeTrialCap) {
        const freeTrialMaxChars = FREE_TRIAL_MAX_DURATION_SECONDS * TTS_CHARS_PER_SECOND_ESTIMATE;
        if (text.trim().length > freeTrialMaxChars) {
          return res.status(400).json({
            error: `Version d'essai gratuite limitée à ${FREE_TRIAL_MAX_DURATION_SECONDS}s d'audio (~${freeTrialMaxChars} caractères). Achetez des points pour générer plus long.`,
            max_duration_seconds: FREE_TRIAL_MAX_DURATION_SECONDS, max_chars: freeTrialMaxChars, free_trial: true,
          });
        }
      }

      const estimatedDuration = Math.ceil(text.trim().length / TTS_CHARS_PER_SECOND_ESTIMATE);
      const estimatedCost = computePointsCost(estimatedDuration);
      if (balanceBeforeGeneration < estimatedCost) {
        return res.status(402).json({ error: "Solde insuffisant pour ce texte.", estimated_duration_seconds: estimatedDuration, estimated_points_required: estimatedCost, current_balance: balanceBeforeGeneration });
      }
      if (await hasReachedDailyTTSLimit(userId)) {
        return res.status(429).json({ error: `Limite quotidienne atteinte (${DAILY_TTS_LIMIT} générations audio).` });
      }
      if (await hasReachedDailyGeminiLimit(userId)) {
        return res.status(429).json({ error: `Limite quotidienne Gemini atteinte (${DAILY_GEMINI_LIMIT} appels).` });
      }

      // FIX n°2 + 3.8 : analyse des balises par le MOTEUR (gère les deux
      // syntaxes — ancienne `[excited]` et nouvelle `<laugh>` — et retire
      // les balises inconnues de Google ainsi que les bruitages non humains
      // qui dégradent l'audio). Le transcript envoyé ne contient donc QUE
      // des balises officielles.
      const analysed = parseTranscript(text);
      const emotionTags = analysed.tags.map((t) => t.tag);
      const textForSpeech = analysed.text;
      if (analysed.unknownTags.length || analysed.forbiddenSfx.length) {
        console.warn(`[TTS] Balises nettoyées du transcript : ${[
          ...analysed.unknownTags,
          ...analysed.forbiddenSfx.map((s) => `[${s}]`),
        ].join(", ")}`);
      }
      const selectedVoiceName =
        resolveRequestedVoice(requestedVoice);

      // Un voix-off court (~4-7s, sous 100 caractères) coûte le même prix à
      // retenter : on insiste plus fort (5 tentatives par morceau au lieu de
      // 3) pour viser un résultat quasi garanti sur ce format très demandé.
      const maxRetriesForThisCall = textForSpeech.trim().length < 100 ? 5 : 3;
      const { pcmBuffer, error: synthError, usedStreaming, chunkCount } = await synthesizeWithRetry(textForSpeech, selectedVoiceName, maxRetriesForThisCall, numSpeed, numPitch, requestedVoice, emotionTags, safeRegister, safeIntensity);
      // FIX COST-3 : génération payante → billable=true, séparée des previews gratuites (billable=false).
      logGeminiCall({ userId, callType: "tts", billable: true, pointsCost: BASE_POINTS_COST, charCount: text.length, success: Boolean(pcmBuffer), latencyMs: Date.now() - startTime });
      const geminiUsageCount = await recordGeminiUsage({ userId, operation: "tts", characters: text.length, success: Boolean(pcmBuffer), model: TTS_MODEL, metadata: { voice: requestedVoice, chunks: chunkCount } });
      console.log(JSON.stringify({ event: "gemini_tts", userId, voice: requestedVoice, chars: text.length, chunks: chunkCount, success: Boolean(pcmBuffer), daily_calls: geminiUsageCount, maxRetries: 3 }));

      // FIX n°1 + FIX TTS-B : échec Gemini (ou audio tronqué) → 503 explicite.
      // JAMAIS d'audio partiel ni synthétique facturé comme une vraie génération.
      if (!pcmBuffer || pcmBuffer.length <= 50) {
        return res.status(503).json({ error: "Le service vocal est temporairement indisponible. Aucun point n'a été débité.", retry_after: 15, detail: synthError });
      }

      const wavBase64 = pcmToWavBuffer(pcmBuffer, 24000, 1, 16).toString("base64");
      const durationSeconds = Math.round((pcmBuffer.length / 48000) * 10) / 10;

      const finalPointsCost = computePointsCost(durationSeconds);

      let generationId: string | null = null;
      let remainingBalance: number | null = null;
      const { data, error: rpcError } = await supabaseClient.rpc('deduct_and_record_generation_service', {
        p_user_id: userId, p_amount: finalPointsCost, p_voice_id: requestedVoice, p_voice_name: selectedVoiceName,
        p_prompt: text, p_char_count: text.length, p_duration: durationSeconds, p_latency: Date.now() - startTime,
      });
      if (rpcError || !data?.success) {
        const msg = rpcError?.message || data?.error || "Solde insuffisant ou erreur de débit.";
        return res.status(rpcError ? 500 : 402).json({ error: msg });
      }
      generationId = data.generation_id;
      remainingBalance = data.remaining_balance;
      if (generationId) await supabaseClient.from("voice_generations").update({ generation_source: paidTransactionCount ? "paid_balance" : "free_trial" }).eq("id", generationId).eq("user_id", userId);
      const milestoneBonus = await supabaseClient.rpc("award_generation_milestone_bonus", { p_user_id: userId });
      if (milestoneBonus.data?.awarded) remainingBalance = milestoneBonus.data.new_balance;

      return res.json({
        status: "success", success: true, audio_base64: wavBase64, audio_url: `data:audio/wav;base64,${wavBase64}`,
        format: "wav", sample_rate: 24000, generation_id: generationId || `gen_${Date.now()}`,
        duration_seconds: durationSeconds, latency_ms: Date.now() - startTime,
        points_deducted: finalPointsCost, points_cost: finalPointsCost, milestone_bonus: milestoneBonus.data?.awarded ? 30 : 0,
        notification: `-${finalPointsCost} Points`,
        remaining_balance: remainingBalance, voice_id: requestedVoice, gemini_voice: selectedVoiceName,
        parsed_tags: emotionTags,
        used_gemini_tts: true, used_streaming: usedStreaming,
        chunks: chunkCount,
        synth_fallback: false,
      });
    });
  };
  app.post("/api/v1/tts/generate", resolveUserIdMiddleware, ttsLimiter, handleTTSGenerate);
  app.post("/api/tts/generate", resolveUserIdMiddleware, ttsLimiter, handleTTSGenerate);

  /* ===================================================================     LLM SYSTEM PROMPT
     ========================================================================== */
  const LLM_SYSTEM_PROMPT = `Tu es un rédacteur publicitaire professionnel en Darija Algérienne, spécialisé dans les scripts vocaux (TTS) pour vidéos courtes.

RÈGLES STRICTES :

1. TRADUCTION / RÉDACTION NATURELLE :
- Le texte en darija doit être fluide, naturel et bien construit grammaticalement.
- Mots FR/techniques TOUJOURS en alphabet LATIN : livraison, WhatsApp, Instagram, Facebook, marketing digital, B2B, leads, closing, clients, service, formation, promotion, chiffre d'affaires, rendez-vous, réservation, etc.
- JAMAIS de translittération arabe de ces mots ("لا ليفريزون" INTERDIT).

2. BALISES D'ÉMOTION (LIMITÉES) :
- Utilise UNIQUEMENT ces 3 balises, jamais d'autres : [excited], [natural], [calm].
- Maximum 2 balises différentes dans tout le script (pas une par phrase).
- Si le client ne demande aucun ton particulier, reste simple : UNE SEULE balise [natural] au tout début, rien d'autre.
- JAMAIS deux balises collées ([excited][natural] INTERDIT).
- JAMAIS de balise inventée ([whisper], [fast], [sigh], [laugh], etc. INTERDITS — non supportées par le moteur vocal).
- ⚠️ CRITIQUE : les balises restent TOUJOURS exactement en anglais et en alphabet latin, MÊME quand le texte autour est en arabe/darija. INTERDIT de les traduire ou translittérer en arabe (ex: "[متحمس]", "[هادئ]" INTERDITS). Écris littéralement "[excited]", "[natural]" ou "[calm]", crochets inclus, sans aucune modification.

3. LONGUEUR DES SCRIPTS :
- Par défaut (si le client ne précise rien) : 30 à 40 secondes, environ 90 à 120 mots.
- Si le client demande une durée précise (ex: "20 secondes"), respecte CETTE durée en priorité, même si c'est plus court.
- Texte complet et argumenté, mais concis — jamais étiré artificiellement pour atteindre un nombre de mots.

4. SORTIE :
- UNIQUEMENT le texte final à vocaliser.
- Aucun titre, markdown, étoile, guillemets, commentaire, note, "TTS Refinement".`;

  /* ===================================================================     LLM ENHANCE — المحسن السحري (-2 pts)
     ========================================================================== */
  const handleLLMEnhance = async (req: express.Request, res: express.Response) => {
    try {
      const userId = (req as any).resolvedUserId ?? await getUserIdFromAuthHeader(req);
      if (!userId) return res.status(401).json({ error: "Authentification requise." });
      const { text, region = "general" } = req.body;
      if (!text || typeof text !== "string" || !text.trim()) return res.status(400).json({ error: "Texte manquant ou invalide" });
      if (text.length > 2000) return res.status(400).json({ error: "Texte trop long (maximum 2000 caractères)." });
      if (await hasReachedDailyGeminiLimit(userId)) return res.status(429).json({ error: `Limite quotidienne Gemini atteinte (${DAILY_GEMINI_LIMIT} appels).` });

      const pointsCost = 2;
      const currentBalance = await getUserBalance(userId);
      if (currentBalance === null) return res.status(503).json({ error: "Impossible de vérifier le solde. Aucun point n'a été débité." });
      if (currentBalance !== null && currentBalance < pointsCost) return res.status(402).json({ error: "Solde de points insuffisant (2 points requis)." });
      // FIX COST-1 : quota journalier LLM (partagé avec le générateur de script).
      if (await hasReachedDailyLLMLimit(userId)) {
        return res.status(429).json({ error: `Limite quotidienne atteinte (${DAILY_LLM_LIMIT} générations IA texte).` });
      }

      const regionGuide = getRegionGuide(region);
      const { type: textType, guidance: typeGuidance } = detectTextType(text);
      const energyLevel = analyzeEnergyLevel(text);
      const originalLatinWords = extractLatinWords(text);
      const wordCount = text.split(/\s+/).length;
      const expectedMinTags = Math.min(8, Math.max(2, Math.floor(wordCount / 25)));
      const randomBooster = ENHANCE_BOOSTERS[Math.floor(Math.random() * ENHANCE_BOOSTERS.length)];

      const buildEnhancePrompt = (isRetry: boolean = false) => `Tu es un DIRECTEUR ARTISTIQUE + rédacteur TTS ÉLITE spécialisé en Darija Algérienne pour vidéos courtes.

📍 LAHDJA CIBLE : ${regionGuide}
🎯 TYPE DE TEXTE DÉTECTÉ : ${textType}
${typeGuidance}
⚡ NIVEAU D'ÉNERGIE ORIGINAL : ${energyLevel}
🎨 DIRECTION CRÉATIVE : ${randomBooster}
${originalLatinWords.length > 0 ? `🔒 MOTS FRANÇAIS/TECHNIQUES À GARDER EN LATIN : ${originalLatinWords.join(", ")}` : ""}

🚨 RÈGLES ABSOLUES :
1. NE COUPE RIEN. Longueur cible : ${wordCount} à ${Math.floor(wordCount * 1.3)} mots.
2. Garde TOUS les mots FR/techniques en ALPHABET LATIN.
3. Ajoute AU MINIMUM ${expectedMinTags} balises d'émotion, UNIQUEMENT parmi : [excited], [natural], [calm]. La PREMIÈRE phrase DOIT commencer par une balise. JAMAIS deux balises collées. JAMAIS d'autre balise ([whisper], [fast], [dramatic]... INTERDITES — non supportées par le moteur vocal).
4. ⚠️ CRITIQUE : les balises restent TOUJOURS en anglais et alphabet latin exact — "[excited]", "[natural]", "[calm]" — MÊME dans un texte en arabe/darija. INTERDIT de les traduire ou translittérer en arabe.
5. Alterne phrases courtes et moyennes. Utilise "..." pour les pauses.
6. Renvoie UNIQUEMENT le texte final à vocaliser.

${isRetry ? `⚠️ TENTATIVE #2 : Respecte STRICTEMENT : minimum ${expectedMinTags} balises, longueur minimale ${Math.floor(wordCount * 0.9)} mots.` : ""}

📝 TEXTE ORIGINAL :
${text}

Génère maintenant la version optimisée :`;

      const enhanceCallStart = Date.now();
      const enhancedResult = await callGeminiTextAPI(buildEnhancePrompt(false), 0.6);
      let enhancedText = enhancedResult.text;
      logGeminiCall({ userId, callType: "enhance", billable: true, pointsCost, charCount: text.length, success: Boolean(enhancedText), latencyMs: Date.now() - enhanceCallStart, model: enhancedResult.model, inputTokens: enhancedResult.inputTokens, outputTokens: enhancedResult.outputTokens, totalCostUsd: enhancedResult.costUsd });
      await recordGeminiUsage({ userId, operation: "enhance", characters: text.length, success: Boolean(enhancedText), model: enhancedResult.model, metadata: { region, input_tokens: enhancedResult.inputTokens, output_tokens: enhancedResult.outputTokens, total_tokens: enhancedResult.totalTokens, cost_usd: enhancedResult.costUsd } });
      enhancedText = enhancedText.replace(/(\[[a-z]+\])\s*(\[[a-z]+\])/gi, "$1").replace(/\*+/g, "").replace(/^#+\s*.*$/gm, "").replace(/(TTS\s*Refinement|Refinement|Note|Remarque|Voici|Texte\s*amélioré|Version\s*optimisée)\s*:?/gi, "").replace(/^["«»']|["«»']$/g, "").replace(/```[a-z]*/g, "").replace(/```/g, "").replace(/\n{3,}/g, "\n\n").trim();

      const tagCount = countEmotionTags(enhancedText);
      const isTooShort = enhancedText.length < text.length * 0.6;
      const missingTags = tagCount < expectedMinTags;
      const latinPreserved = validateLatinPreservation(text, enhancedText);
      const startsWithTag = /^\[(excited|natural|calm)\]/i.test(enhancedText.trim());

      // Filet de sécurité : reconvertit en anglais toute balise que le modèle
      // aurait quand même traduite/translittérée en arabe.
      const ARABIC_TAG_MAP: Record<string, string> = {
        "متحمس": "excited", "حماس": "excited", "طبيعي": "natural", "عادي": "natural", "هادئ": "calm", "هادئة": "calm",
      };
      enhancedText = enhancedText.replace(/\[([^\]]+)\]/g, (full, inner) => {
        const key = inner.trim();
        return ARABIC_TAG_MAP[key] ? `[${ARABIC_TAG_MAP[key]}]` : full;
      });

      if (enhancedText.length < text.length * 0.4) enhancedText = /^\[/.test(text.trim()) ? text.trim() : `[natural] ${text.trim()}`;
      if (!/^\[(excited|natural|calm)\]/i.test(enhancedText.trim())) enhancedText = `[natural] ${enhancedText}`;

      const reduction = await deductCredits(userId, pointsCost);
      if (!reduction.success) {
        return res.status(402).json({ error: reduction.error || "Le débit des points a échoué. Aucun résultat payant n'a été validé." });
      }
      const finalBalance = reduction.remaining;

      return res.json({
        success: true, enhanced_text: enhancedText, points_deducted: pointsCost, points_cost: pointsCost,
        notification: "-2 Points", remaining_balance: finalBalance, region_used: region,
        analysis: { detected_type: textType, energy_level: energyLevel, original_word_count: wordCount, enhanced_word_count: enhancedText.split(/\s+/).length, emotion_tags_count: countEmotionTags(enhancedText), improvement_ratio_percent: Math.round(((enhancedText.length - text.length) / text.length) * 100), latin_words_preserved: originalLatinWords.length > 0 ? validateLatinPreservation(text, enhancedText) : true }
      });
    } catch (err: any) { console.error("[LLM Enhance Error]", err.message || err); return res.status(500).json({ error: err.message || "Erreur lors de l'amélioration du texte" }); }
  };
  app.post("/api/v1/llm/enhance", resolveUserIdMiddleware, llmLimiter, handleLLMEnhance);
  app.post("/api/llm/enhance", resolveUserIdMiddleware, llmLimiter, handleLLMEnhance);

  /* ===================================================================     LLM SCRIPT GENERATOR (-5 pts)
     ========================================================================== */
  const handleLLMGenerateScript = async (req: express.Request, res: express.Response) => {
    try {
      const userId = (req as any).resolvedUserId ?? await getUserIdFromAuthHeader(req);
      if (!userId) return res.status(401).json({ error: "Authentification requise." });
      const { product, style, region = "general" } = req.body;
      if (!product || typeof product !== "string" || !product.trim()) return res.status(400).json({ error: "Nom du produit ou service manquant" });
      if (product.length > 200) return res.status(400).json({ error: "Nom du produit trop long (maximum 200 caractères)." });
      if (await hasReachedDailyGeminiLimit(userId)) return res.status(429).json({ error: `Limite quotidienne Gemini atteinte (${DAILY_GEMINI_LIMIT} appels).` });

      const pointsCost = 5;
      const currentBalance = await getUserBalance(userId);
      if (currentBalance === null) return res.status(503).json({ error: "Impossible de vérifier le solde. Aucun point n'a été débité." });
      if (currentBalance !== null && currentBalance < pointsCost) return res.status(402).json({ error: "Solde de points insuffisant (5 points requis)." });
      // FIX COST-1 : même quota journalier LLM que le bouton Magique.
      if (await hasReachedDailyLLMLimit(userId)) {
        return res.status(429).json({ error: `Limite quotidienne atteinte (${DAILY_LLM_LIMIT} générations IA texte).` });
      }

      const selectedHook = HOOKS[Math.floor(Math.random() * HOOKS.length)];
      const selectedProblem = PROBLEMS[Math.floor(Math.random() * PROBLEMS.length)];
      const selectedSolution = SOLUTIONS[Math.floor(Math.random() * SOLUTIONS.length)];
      const selectedProof = PROOFS[Math.floor(Math.random() * PROOFS.length)];
      const selectedCTA = CTAS[Math.floor(Math.random() * CTAS.length)];

      const regionGuide = getRegionGuide(region);
      const detectedSector = detectSector(product);

      // Détection d'une durée explicitement demandée par le client (ex: "20 secondes", "30s").
      const durationMatch = product.match(/(\d{1,3})\s*(?:sec(?:ondes?)?|s\b)/i);
      const requestedSeconds = durationMatch ? Math.min(90, Math.max(5, parseInt(durationMatch[1], 10))) : null;
      // ~2.3 mots/seconde à l'oral en darija — sert juste de repère, pas une règle stricte.
      const wordTarget = requestedSeconds ? Math.round(requestedSeconds * 2.3) : null;
      // Toute instruction custom du client (durée, mots à inclure, sujet libre, ton...) prime
      // TOUJOURS sur la structure par défaut ci-dessous, qui n'est qu'un guide de secours.
      const customInstructionsBlock = wordTarget
        ? `\n\n⚠️ INSTRUCTION PRIORITAIRE DU CLIENT : durée demandée ≈ ${requestedSeconds} sec (~${wordTarget} mots). Respecte cette longueur AVANT toute autre contrainte, quitte à raccourcir ou fusionner les étapes de la structure ci-dessous.`
        : "";

      const scriptPrompt = `${LLM_SYSTEM_PROMPT}

LAHDJA CIBLE : ${regionGuide}
SECTEUR DÉTECTÉ : ${detectedSector}
DEMANDE DU CLIENT (à suivre au mot près si elle contient des instructions précises — sujet, mots à inclure, ton, longueur) : "${product}"

🎯 STRUCTURE PAR DÉFAUT (uniquement si le client ne donne pas d'instructions contraires) :
1. ACCROCHE (HOOK) [2-3 sec] -> "${selectedHook}"
2. LE PROBLÈME [5-7 sec] -> "${selectedProblem}"
3. LA SOLUTION & PREUVE [8-11 sec] -> "${selectedSolution}" ET "${selectedProof}"
4. APPEL À L'ACTION (CTA) [3-4 sec] -> "${selectedCTA}"

⚠️ RÈGLE ABSOLUE : si la demande du client précise un sujet exact, des mots à utiliser, une durée, ou "suis exactement ce que je dis" — IGNORE la structure ci-dessus et écris uniquement ce qui est demandé, sans l'étirer artificiellement.${customInstructionsBlock}

⚠️ CONTRAINTES GÉNÉRALES : Fluide en Darija, ${wordTarget ? `environ ${wordTarget} mots (± 15%)` : "45 à 60 mots par défaut (≈20-25 secondes à l'oral, format vidéo courte) si aucune longueur n'est précisée"}, PAS DE TITRE, JUSTE LE TEXTE.
Style vocal souhaité : ${style || "excited"}`;

      const scriptCallStart = Date.now();
      const scriptResult = await callGeminiTextAPI(scriptPrompt, 0.95);
      let scriptText = scriptResult.text;
      logGeminiCall({ userId, callType: "script", billable: true, pointsCost, charCount: product.length, success: Boolean(scriptText), latencyMs: Date.now() - scriptCallStart, model: scriptResult.model, inputTokens: scriptResult.inputTokens, outputTokens: scriptResult.outputTokens, totalCostUsd: scriptResult.costUsd });
      await recordGeminiUsage({ userId, operation: "script", characters: product.length, success: Boolean(scriptText), model: scriptResult.model, metadata: { region, input_tokens: scriptResult.inputTokens, output_tokens: scriptResult.outputTokens, total_tokens: scriptResult.totalTokens, cost_usd: scriptResult.costUsd } });
      // Filet de sécurité : si le modèle traduit quand même les balises en arabe
      // malgré la consigne, on les reconvertit en anglais (le moteur TTS ne
      // reconnaît que [excited]/[natural]/[calm] en anglais).
      const ARABIC_TAG_MAP: Record<string, string> = {
        "متحمس": "excited", "حماس": "excited", "طبيعي": "natural", "عادي": "natural", "هادئ": "calm", "هادئة": "calm",
      };
      scriptText = scriptText.replace(/\[([^\]]+)\]/g, (full, inner) => {
        const key = inner.trim();
        return ARABIC_TAG_MAP[key] ? `[${ARABIC_TAG_MAP[key]}]` : full;
      });
      scriptText = scriptText.replace(/(\[[a-z]+\])\s*(\[[a-z]+\])/gi, "$1").replace(/\*+/g, "").replace(/^#+\s*.*$/gm, "").replace(/(TTS\s*Refinement|Refinement|Note|Remarque|Structure|Accroche|Problème|Solution|CTA)\s*:?/gi, "").trim();

      const reduction = await deductCredits(userId, pointsCost);
      if (!reduction.success) {
        return res.status(402).json({ error: reduction.error || "Le débit des points a échoué. Aucun résultat payant n'a été validé." });
      }
      const finalBalance = reduction.remaining;

      return res.json({
        success: true, script: scriptText, points_deducted: pointsCost, points_cost: pointsCost,
        notification: "-5 Points", remaining_balance: finalBalance, sector_used: detectedSector, region_used: region,
        debug_framework: { hook: selectedHook, problem: selectedProblem, cta: selectedCTA }
      });
    } catch (err: any) { console.error("[LLM Script Generator Error]", err.message || err); return res.status(500).json({ error: err.message || "Erreur lors de la génération du script" }); }
  };
  app.post("/api/v1/llm/generate-script", resolveUserIdMiddleware, llmLimiter, handleLLMGenerateScript);
  app.post("/api/llm/generate-script", resolveUserIdMiddleware, llmLimiter, handleLLMGenerateScript);

  /* ===================================================================     AI FEEDBACK
     ========================================================================== */
  const handleAIFeedback = async (req: express.Request, res: express.Response) => {
    try {
      const userId = await getUserIdFromAuthHeader(req);
      const { input_text, output_text, rating, type, region, sector } = req.body;
      if (!userId) return res.status(401).json({ error: "Authentification requise." });
      if (!output_text || typeof rating !== "number" || rating < 1 || rating > 5) return res.status(400).json({ error: "Données feedback invalides." });
      if (supabaseClient) {
        try { await supabaseClient.from("ai_feedback").insert({ user_id: userId || null, input_text: input_text || "", output_text, rating, type: type || "enhance", region: region || "general", sector: sector || "general", created_at: new Date().toISOString() }); } catch (e: any) { console.warn("[AI Feedback] Insert failed:", e.message); }
      }
      return res.json({ success: true, message: "Feedback enregistré" });
    } catch (err: any) { console.error("[AI Feedback] Erreur:", err.message || err); return res.status(500).json({ success: false, error: err.message }); }
  };
  app.post("/api/v1/ai/feedback", handleAIFeedback);
  app.post("/api/ai/feedback", handleAIFeedback);

  /* ===================================================================     SLICKPAY
     ========================================================================== */
  app.post("/api/slickpay/create-invoice", async (req, res) => {
    try {
      const userId = await getUserIdFromAuthHeader(req);
      if (!userId) return res.status(401).json({ success: false, error: "Authentification requise." });
      const { packId, firstname = "Client", lastname = "Sawtify", phone = "0550123456", email = "client@sawtify.dz", address = "Alger, Algérie", paymentMethod = "edahabia" } = req.body;
      let packName = "Pack Sawtify TTS", numAmount = 0, numPoints = 0;
      if (supabaseClient) {
        const { data: packRow, error: packErr } = await supabaseClient.from("credit_packs").select("name, points, price_dzd").eq("id", packId).eq("is_active", true).single();
        if (packErr || !packRow) return res.status(400).json({ success: false, error: "Pack inconnu." });
        packName = packRow.name; numAmount = Math.round(Number(packRow.price_dzd) * (1 + PAYMENT_FEE_RATE)); numPoints = Number(packRow.points);
      } else return res.status(503).json({ success: false, error: "Paiement indisponible." });

      const returnUrl = getPublicUrl(req, `/?payment_status=success&pack_id=${packId}&points=${numPoints}`);
      let defaultAccountUuid: string | undefined = undefined, contactUuid: string | undefined = undefined;
      const slickPayApiRoot = SLICKPAY_BASE_URL.replace(/\/+$/, "");
      try { const accRes = await fetch(`${slickPayApiRoot}/users/accounts`, { headers: { "Authorization": `Bearer ${SLICKPAY_API_KEY}`, "Accept": "application/json" } }); if (accRes.ok) { const accData = await accRes.json(); const list = accData.data || accData.accounts || (Array.isArray(accData) ? accData : []); if (list.length > 0) defaultAccountUuid = list[0].uuid || list[0].id; } } catch (e) {}

      const contactCacheKey = email.trim().toLowerCase();
      contactUuid = SLICKPAY_CONTACT_CACHE.get(contactCacheKey);
      let contactErrorDetail = "";
      if (!contactUuid) {
        try {
          const contactTitle = `${firstname.trim() || "Client"} ${lastname.trim() || "Sawtify"}`.trim();
          // SlickPay exige un champ "rib" pour créer un contact, alors que
          // Sawtify ne collecte jamais de RIB (paiement par carte uniquement).
          // Le rib est factice et ALÉATOIRE à chaque tentative (et non plus
          // dérivé de l'e-mail) : un rib déterministe entre en collision avec
          // le contact déjà créé côté SlickPay dès que le cache mémoire
          // (SLICKPAY_CONTACT_CACHE) est vidé par un redémarrage serveur,
          // provoquant l'erreur 422 "La valeur du champ rib est déjà utilisée."
          const makeFakeRib = () => crypto.randomBytes(16).toString("hex").replace(/[a-f]/g, "").padEnd(20, "0").slice(0, 20);
          let contactRes: Response, contactBodyText: string, contactData: any;
          for (let attempt = 0; attempt < 3; attempt++) {
            contactRes = await fetch(`${slickPayApiRoot}/users/contacts`, { method: "POST", headers: { "Authorization": `Bearer ${SLICKPAY_API_KEY}`, "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify({ title: contactTitle, firstname: firstname.trim() || "Client", lastname: lastname.trim() || "Sawtify", email: email.trim() || "client@sawtify.dz", address: address.trim() || "Alger", rib: makeFakeRib() }) });
            contactBodyText = await contactRes.text();
            try { contactData = JSON.parse(contactBodyText); } catch { contactData = { message: contactBodyText }; }
            if (contactRes.ok) break;
            const isRibConflict = contactRes.status === 422 && JSON.stringify(contactData?.errors || contactData).includes("rib");
            if (!isRibConflict) break; // autre erreur : inutile de retenter
          }
          if (contactRes!.ok) { contactUuid = contactData.uuid || contactData.id || contactData.data?.uuid; if (contactUuid) SLICKPAY_CONTACT_CACHE.set(contactCacheKey, contactUuid); }
          else { contactErrorDetail = contactData?.message || `HTTP ${contactRes!.status}`; console.warn("[SlickPay create contact] échec:", contactRes!.status, contactData); }
        } catch (e: any) { contactErrorDetail = e?.message || "Erreur réseau"; console.warn("[SlickPay create contact] erreur réseau:", e?.message || e); }
      }
      const itemsList = [{ name: `${packName} (+${numPoints} pts, frais de paiement inclus)`, price: numAmount, quantity: 1 }];
      const payload: any = { amount: numAmount, url: returnUrl, webhook_url: getPublicUrl(req, "/api/slickpay/webhook"), webhook_meta_data: [{ invoice_source: "sawtify", user_id: userId, pack_id: String(packId) }], firstname: firstname.trim() || "Client", lastname: lastname.trim() || "Sawtify", phone: phone.trim() || "0550123456", email: email.trim() || "client@sawtify.dz", address: address.trim() || "Alger, Algérie", note: `Sawtify - ${packName}`, items: itemsList };
      if (defaultAccountUuid) payload.account = defaultAccountUuid; if (contactUuid) payload.contact = contactUuid;
      const primaryUrl = `${SLICKPAY_BASE_URL.replace(/\/+$/, '')}/users/invoices`;

      if (!SLICKPAY_API_KEY) return res.status(503).json({ success: false, error: "SlickPay n'est pas configuré sur le serveur." });
      if (!contactUuid) {
        const errorId = `SP-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;
        console.error(`[SlickPay ${errorId}] Contact impossible à créer:`, contactErrorDetail || "erreur inconnue");
        return res.status(502).json({ success: false, error: "Impossible de créer le contact SlickPay.", error_id: errorId, error_code: "SLICKPAY_CONTACT_CREATE_FAILED", diagnostics: contactErrorDetail || "SlickPay a refusé la création du contact." });
      }
      const spRes = await fetch(primaryUrl, { method: "POST", headers: { "Authorization": `Bearer ${SLICKPAY_API_KEY}`, "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify(payload) });
      const spText = await spRes.text();
      let spData: any;
      try { spData = JSON.parse(spText); } catch { spData = { message: spText }; }
      const invoiceData = spData?.data || spData?.invoice || spData;
      if (!spRes.ok || !(invoiceData && (invoiceData.id || invoiceData.uuid || invoiceData.url))) {
        console.error("[SlickPay create invoice]", spRes.status, spData);
        const errorId = `SP-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;
        console.error(`[SlickPay ${errorId}] Facture refusée:`, spRes.status, spData);
        return res.status(502).json({ success: false, error: "Impossible de créer la facture SlickPay.", error_id: errorId, error_code: "SLICKPAY_INVOICE_CREATE_FAILED", diagnostics: spData?.message || spData?.error || `HTTP ${spRes.status}` });
      }

      const invoiceId = invoiceData.id || invoiceData.uuid || `INV_${Date.now()}`;
      const paymentUrl = invoiceData.url || invoiceData.payment_url || "";
      const entry = { id: String(invoiceId), invoiceId, packId, packName, points: numPoints, amountDZD: numAmount, paymentMethod, status: "pending", paymentUrl, createdAt: new Date().toISOString(), userId, payload: spData };
      await saveInvoice(entry);
      return res.json({ success: true, status: "created", invoiceId, paymentUrl, message: spData.message || "Facture créée", raw: spData });
    } catch (err: any) { return res.status(500).json({ success: false, error: err.message }); }
  });

  app.get("/api/slickpay/check-status/:invoiceId", async (req, res) => {
    const { invoiceId } = req.params;
    const localRecord = await loadInvoice(String(invoiceId));
    const requesterId = await getUserIdFromAuthHeader(req);
    if (!requesterId || !localRecord || requesterId !== localRecord.userId) {
      return res.status(403).json({ success: false, error: "Accès interdit." });
    }
    const verification = await verifySlickPayInvoice(invoiceId);
    if (verification.paid && localRecord) {
      const creditResult = await creditIfPaid(invoiceId);
      if (!creditResult.credited) return res.status(500).json({ success: false, error: creditResult.error || "Crédit du compte impossible." });
      await updateInvoiceStatus(invoiceId, "completed");
      return res.json({ success: true, invoiceId, status: "completed", isPaid: true, newBalance: creditResult.newBalance, data: verification.data });
    }
    const currentStatus = verification.data?.status?.toLowerCase() || localRecord?.status || "pending";
    return res.json({ success: true, invoiceId, status: currentStatus, isPaid: verification.paid, data: verification.data });
  });

  app.post("/api/slickpay/confirm-payment", async (req, res) => {
    try {
      const { invoiceId } = req.body;
      if (!invoiceId) return res.status(400).json({ success: false, error: "invoiceId manquant." });
      const entry = await loadInvoice(String(invoiceId));
      if (!entry) return res.status(404).json({ success: false, error: "Facture inconnue." });
      const requesterId = await getUserIdFromAuthHeader(req);
      if (!requesterId || requesterId !== entry.userId) return res.status(403).json({ success: false, error: "Interdit." });
      const verification = await verifySlickPayInvoice(invoiceId);
      if (!verification.paid) return res.status(402).json({ success: false, error: "Paiement non confirmé par SlickPay." });
      const result = await creditIfPaid(invoiceId);
      if (!result.credited) return res.status(500).json({ success: false, error: result.error || "Erreur crédit." });
      await updateInvoiceStatus(invoiceId, "completed");
      return res.json({ success: true, message: "Paiement validé", newBalance: result.newBalance, record: { invoiceId, packId: entry.packId, points: entry.points, amountDZD: entry.amountDZD } });
    } catch (err: any) { return res.status(500).json({ success: false, error: err.message }); }
  });

  app.post("/api/slickpay/webhook", async (req, res) => {
    try {
      if (SLICKPAY_WEBHOOK_SECRET) {
        const providedSecret = (req.query.secret as string) || req.get("x-slickpay-secret") || "";
        if (providedSecret !== SLICKPAY_WEBHOOK_SECRET) {
          console.warn("[SlickPay Webhook] Secret invalide ou absent — requête ignorée.");
          return res.status(200).json({ received: true, warning: "invalid_secret" });
        }
      }
      const { id, invoice_id } = req.body;
      const targetId = id || invoice_id;
      if (!targetId) return res.json({ received: true, warning: "No invoice id" });
      const verification = await verifySlickPayInvoice(targetId);
      if (verification.paid) { const local = await loadInvoice(String(targetId)); if (local) await updateInvoiceStatus(String(targetId), "completed"); await creditIfPaid(targetId); }
      return res.json({ received: true });
    } catch (webhookErr: any) { return res.status(200).json({ received: true, warning: webhookErr.message }); }
  });

  app.get("/api/supabase/purchases", async (req, res) => {
    const userId = await getUserIdFromAuthHeader(req);
    if (supabaseClient && userId) {
      try { const { data, error } = await supabaseClient.from("transactions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50); if (!error && data) return res.json({ success: true, purchases: data }); } catch (err) {}
    }
    return res.json({ success: true, purchases: [] });
  });

  app.post("/api/auth/claim-welcome-bonus", async (req, res) => {
    try {
      const userId = await getUserIdFromAuthHeader(req);
      if (!userId) return res.status(401).json({ success: false, error: "Authentification requise." });
      if (!supabaseClient) return res.status(503).json({ success: false, error: "Service indisponible." });
      const ip = getClientIp(req);

      let insertErr: any = null, inserted: any = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        const result = await supabaseClient.from("ip_claims").insert({ ip, user_id: userId }).select().single();
        inserted = result.data; insertErr = result.error;
        if (!insertErr || insertErr.code === "23505") break; // succès, ou vrai doublon (IP déjà utilisée) → pas la peine de réessayer
        console.warn(`[Welcome Bonus] Tentative ${attempt}/3 échouée (erreur technique, pas un doublon):`, insertErr.message);
        if (attempt < 3) await new Promise(r => setTimeout(r, 300 * attempt));
      }

      if (!insertErr && inserted) return res.json({ success: true, welcomeGranted: true });
      if (insertErr && insertErr.code !== "23505") {
        console.error("[Welcome Bonus] Échec après 3 tentatives, bonus NON accordé pour rester sûr:", insertErr.message);
        return res.status(503).json({ success: false, error: "Impossible de vérifier ton bonus pour le moment. Réessaie dans un instant." });
      }
      await supabaseClient.from("profiles").update({ credits_balance: 0 }).eq("id", userId).eq("credits_balance", 50);
      return res.json({ success: true, welcomeGranted: false });
    } catch (err: any) { return res.status(500).json({ success: false, error: err.message }); }
  });

  /* ===================================================================
     SERVICE DES APERÇUS AUDIO LOCAUX
     Les WAV générés par `npm run apercus:voix` sont dans storage/.
     Ce dossier n'est PAS copié dans dist/ au build : cette route les sert
     donc aussi en production, pour que public/audition-voix.html et
     l'API `/voices` fonctionnent même sans Supabase.
     (En production, préfère quand même `--upload` : les fichiers sont alors
     servis par Supabase, donc plus rapides et déchargés du serveur Node.)
     =================================================================== */
  app.use("/storage/voice-previews", (req, res, next) => {
    // On n'autorise QUE les .wav/.json : rien d'autre n'est exposé.
    if (!/\.(wav|json)$/i.test(req.path)) return next();
    res.set("Cache-Control", "public, max-age=86400");
    next();
  }, express.static(PREVIEW_DIR, { fallthrough: true, index: false, dotfiles: "deny" }));

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    // ── CACHE NAVIGATEUR ────────────────────────────────────────────────────
    // Sans consigne de cache, le navigateur REVALIDait tout à chaque visite :
    // 1 Mo de JS à re-télécharger, sur données mobiles, à chaque ouverture.
    // Les fichiers de /assets/ portent une empreinte dans leur nom (le
    // contenu ne change jamais sans changer d'adresse) : on peut donc les
    // garder UN AN, et la visite suivante est quasi instantanée.
    // index.html, lui, ne doit JAMAIS être gardé (sinon l'utilisateur reste
    // bloqué sur une ancienne version après un déploiement).
    app.use(express.static(distPath, {
      index: false,
      etag: true,
      lastModified: true,
      setHeaders: (res, filePath) => {
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        } else if (filePath.endsWith(".html")) {
          res.setHeader("Cache-Control", "no-cache, must-revalidate");
        } else if (/\.(png|jpe?g|svg|webp|ico|woff2?|ttf|mp3|wav)$/i.test(filePath)) {
          res.setHeader("Cache-Control", "public, max-age=2592000");
        }
      },
    }));
    app.use("/api", (req, res, next) => {
      if (req.method === "GET" || req.method === "HEAD") return res.status(404).json({ error: "Endpoint API introuvable." });
      return res.status(404).json({ error: "Endpoint API ou méthode introuvable." });
    });
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.use((error: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(`[API error] ${req.method} ${req.path}`, error?.stack || error);
    if (res.headersSent) return;
    res.status(error?.status || 500).json({ error: error?.message || "Erreur interne du serveur." });
  });

  /* ===================================================================
     PRÉCHAUFFAGE DES APERÇUS DE VOIX — 26/09/2026
     -------------------------------------------------------------------
     POURQUOI : sans ça, le 1er visiteur qui clique ▶ sur une voix attend
     4 à 8 secondes pendant que l'aperçu se fabrique. Et chaque fois qu'un
     utilisateur écrit la voix autrement (« Amin », « voice_amin », le nom
     arabe…), c'était une NOUVELLE génération payée pour le même son.

     CE QUE FAIT CETTE FONCTION, au démarrage :
       • regarde quelles voix ont déjà un aperçu dans le stockage ;
       • fabrique les manquants UN PAR UN, en tâche de fond (le site répond
         normalement pendant ce temps — rien n'est bloqué) ;
       • les enregistre définitivement (le coût n'est payé qu'UNE fois).

     COÛT : 30 aperçus ≈ 3 DZD au total, une seule fois. Ensuite, plus jamais.
     Le texte prononcé est celui de `VOICE_PREVIEW_TEXTS`, en darija, et la
     voix reçoit la consigne « lis exactement ce qui est écrit ».

     POUR DÉSACTIVER : variable TTS_WARM_PREVIEWS=0 (aucun redéploiement du
     code n'est nécessaire, c'est un simple réglage).
     =================================================================== */
  async function warmMissingVoicePreviews(): Promise<void> {
    if (process.env.TTS_WARM_PREVIEWS === "0") {
      console.log("[Aperçus] Préchauffage désactivé (TTS_WARM_PREVIEWS=0).");
      return;
    }
    if (!process.env.GEMINI_API_KEY) {
      console.log("[Aperçus] Préchauffage ignoré : GEMINI_API_KEY absente (normal en local).");
      return;
    }
    if (!supabaseClient) {
      console.log("[Aperçus] Préchauffage ignoré : stockage Supabase indisponible — un aperçu généré serait perdu au redémarrage.");
      return;
    }

    try {
      // 1) Que possède-t-on déjà ? (un seul appel réseau)
      const { data: fichiers } = await supabaseClient.storage.from(PREVIEW_BUCKET).list("", { limit: 1000 });
      for (const f of fichiers || []) {
        const nom = String((f as any).name || "");
        if (nom.endsWith(".wav")) PREVIEW_STORAGE_KEYS.add(nom.replace(/\.wav$/, ""));
      }
      const presents = new Set((fichiers || []).map((f: any) => String(f.name)));

      // ── MÉNAGE : les aperçus au FORMAT PÉRIMÉ ────────────────────────────
      // Avant le 26/09/2026, un aperçu était enregistré sous la clé de la
      // requête : « voice_amin_Puck_1.0_1.0.wav ». Ces fichiers contiennent
      // l'ANCIEN texte (arabe classique) et un ancien mapping de voix
      // (« voice_yacine » pointait sur Puck — c'est désormais Pulcherrima).
      // Le nouveau code ne les lit plus ; on les supprime pour ne pas laisser
      // de faux aperçus dormir dans le stockage. Le format valide aujourd'hui
      // est « studio_<Voix>.wav » — jamais touché par ce ménage.
      const ANCIEN_FORMAT = /^.+_[0-9]+\.[0-9]+_[0-9]+\.[0-9]+\.wav$/;
      const anciens = (fichiers || [])
        .map((f: any) => String(f.name))
        .filter((n) => ANCIEN_FORMAT.test(n) && !n.startsWith("studio_"));
      if (anciens.length) {
        const { error: errSupp } = await supabaseClient.storage.from(PREVIEW_BUCKET).remove(anciens);
        if (errSupp) console.warn(`[Aperçus] Ménage impossible : ${errSupp.message}`);
        else console.log(`[Aperçus] ${anciens.length} ancien(s) aperçu(s) supprimé(s) — format périmé, texte en arabe classique : ${anciens.join(", ")}`);
      }
      const manquantes = previewTargets().filter((t) => {
        // Seul le format CANONIQUE compte : « studio_<voix>.wav ».
        if (presents.has(`${previewKeyForVoice(t.voice.id)}.wav`)) return false;
        if (getCachedPreviewUrl(t.voice.id)) return false;  // local ou mémoire
        return true;
      });

      if (manquantes.length === 0) {
        PREVIEW_WARM_STATE.demarre = true;
        PREVIEW_WARM_STATE.en_cours = false;
        PREVIEW_WARM_STATE.total = previewTargets().length;
        PREVIEW_WARM_STATE.termines = PREVIEW_STORAGE_KEYS.size;
        PREVIEW_WARM_STATE.fin = new Date().toISOString();
        console.log(`[Aperçus] Les ${previewTargets().length} aperçus sont déjà en place — rien à générer.`);
        return;
      }
      PREVIEW_WARM_STATE.demarre = true;
      PREVIEW_WARM_STATE.en_cours = true;
      PREVIEW_WARM_STATE.total = previewTargets().length;
      PREVIEW_WARM_STATE.termines = presents.size;
      PREVIEW_WARM_STATE.debut = new Date().toISOString();
      console.log(`[Aperçus] ${manquantes.length} aperçu(x) manquant(s) → génération en tâche de fond (le site reste disponible).`);
      console.log(`[Aperçus] Suivi en direct : /api/v1/tts/preview-status`);

      let faits = 0, echecs = 0;
      const MAX_TENTATIVES = 4;   // 1 essai, puis 3 reprises espacées
      for (const t of manquantes) {
        const key = previewKeyForVoice(t.voice.id);
        let enregistre = false;
        for (let tentative = 1; tentative <= MAX_TENTATIVES && !enregistre; tentative++) {
          try {
            const dataUri = await generateVoicePreviewDataUri(t.voice.id, t.legacyId || t.voice.id);
            PREVIEW_AUDIO_CACHE.set(key, dataUri);
            await savePersistentPreview(key, dataUri);
            PREVIEW_STORAGE_KEYS.add(key);
            PREVIEW_WARM_STATE.faits = ++faits;
            PREVIEW_WARM_STATE.quota_atteint = false;
            enregistre = true;
            console.log(`[Aperçus ✓] ${t.voice.id} (${t.nameFr}) — ${faits}/${manquantes.length}${tentative > 1 ? ` (réussi à la tentative ${tentative})` : ""}`);
          } catch (err: any) {
            const msg = String(err?.message || err);
            PREVIEW_WARM_STATE.derniereErreur = `${t.voice.id} : ${msg}`;
            // « 429 / quota / RESOURCE_EXHAUSTED » ne veut PAS dire « échec » :
            // ça veut dire « tu vas trop vite ». C'est presque toujours une
            // limite PAR MINUTE — donc on attend et on recommence, au lieu de
            // laisser la voix sans aperçu pour toujours.
            const quota = /(^|\D)429(\D|$)|quota|RESOURCE_EXHAUSTED|rate ?limit|too many requests/i.test(msg);
            PREVIEW_WARM_STATE.quota_atteint = quota;
            if (quota && tentative < MAX_TENTATIVES) {
              const attente = 20000 * tentative;   // 20 s, puis 40 s, puis 60 s
              console.warn(`[Aperçus ⏳] ${t.voice.id} : quota atteint (429) — nouvelle tentative ${tentative + 1}/${MAX_TENTATIVES} dans ${Math.round(attente / 1000)} s.`);
              await new Promise((r) => setTimeout(r, attente));
            } else {
              echecs++;
              PREVIEW_WARM_STATE.echecs = echecs;
              console.warn(`[Aperçus ✗] ${t.voice.id} : ${msg}`);
              // Stockage qui refuse TOUT (bucket absent ou non public) : ce
              // n'est pas un quota, inutile de gaspiller 30 générations. On
              // s'arrête tout de suite et on dit exactement quoi faire.
              if (faits === 0 && echecs === 1 && !quota) {
                console.warn(`[Aperçus] Arrêt : le 1er enregistrement a échoué. Crée un bucket PUBLIC nommé « ${PREVIEW_BUCKET} » dans Supabase Storage, puis redémarre.`);
                return;
              }
              break;
            }
          }
        }
        await new Promise((r) => setTimeout(r, 2000)); // on ne bouscule pas l'API
      }
      PREVIEW_WARM_STATE.en_cours = false;
      PREVIEW_WARM_STATE.fin = new Date().toISOString();
      PREVIEW_WARM_STATE.termines = PREVIEW_STORAGE_KEYS.size;
      console.log(`[Aperçus] Préchauffage terminé : ${faits} généré(s), ${echecs} échec(s). Coût ≈ ${(faits * 0.004).toFixed(3)} $ une seule fois.`);
      // Il manque encore des voix ? On repasse TOUT SEUL dans 10 minutes : un
      // quota remis à zéro au bout d'une minute suffira, et sinon les reprises
      // finiront par passer. Rien à relancer à la main. 3 reprises maximum,
      // pour ne jamais boucler sans fin.
      if (echecs > 0 && PREVIEW_WARM_STATE.reprises < 3) {
        PREVIEW_WARM_STATE.reprises += 1;
        const dans = 10 * 60 * 1000;
        PREVIEW_WARM_STATE.prochaineTentative = new Date(Date.now() + dans).toISOString();
        console.log(`[Aperçus] ${echecs} voix encore sans aperçu → nouvelle passe automatique dans 10 min (reprise ${PREVIEW_WARM_STATE.reprises}/3).`);
        setTimeout(() => { void warmMissingVoicePreviews(); }, dans);
      } else if (echecs === 0) {
        PREVIEW_WARM_STATE.prochaineTentative = null;
      }
    } catch (err: any) {
      console.warn(`[Aperçus] Préchauffage impossible : ${err?.message || err}`);
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    // Les aperçus manquants se fabriquent tout seuls, en tâche de fond :
    // aucune commande à lancer, aucun terminal. Voir warmMissingVoicePreviews.
    setTimeout(() => { void warmMissingVoicePreviews(); }, 3000);
    void cleanupExpiredGenerations();
    setInterval(() => void cleanupExpiredGenerations(), 24 * 60 * 60 * 1000).unref();
  });
}

startServer();
