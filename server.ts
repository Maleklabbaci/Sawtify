import express from "express";
import compression from "compression";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

// ==========================================================================
// CONCURRENCY LIMITER (Fix: expose activeCount / pendingCount)
// ==========================================================================
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
const SLICKPAY_API_KEY = process.env.SLICKPAY_API_KEY || process.env.SLICKPAY_PUBLIC_KEY || "";
const SLICKPAY_SANDBOX_KEY = process.env.SLICKPAY_SANDBOX_KEY || "";
const SLICKPAY_BASE_URL = process.env.SLICKPAY_BASE_URL || "https://prodapi.slick-pay.com/api/v2";
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || "";
const FRONTEND_URL = process.env.FRONTEND_URL || "";

if (!GEMINI_API_KEY) console.warn("[Config] GEMINI_API_KEY manquante");
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) console.warn("[Config] SUPABASE manquants");
if (!SUPABASE_JWT_SECRET) console.warn("[Config] SUPABASE_JWT_SECRET manquante — vérification JWT en ligne utilisée (plus lent)");
if (!SLICKPAY_API_KEY) console.warn("[Config] SLICKPAY_API_KEY manquante");

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

const SLICKPAY_CONTACT_CACHE = new Map<string, string>();

const LLM_RESPONSE_CACHE = new Map<string, { result: string; ts: number }>();
const LLM_CACHE_MAX_SIZE = 200;
const LLM_CACHE_TTL_MS = 1000 * 60 * 30;
const DAILY_TTS_LIMIT = Number(process.env.DAILY_TTS_LIMIT) || 20;

const VALID_GATEWAYS = new Set(['edahabia', 'cib', 'slickpay', 'satim']);
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
  const forwarded = req.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return req.ip || "unknown";
}

function getPublicUrl(req?: express.Request, path = "/"): string {
  const configured = FRONTEND_URL ? FRONTEND_URL.replace(/\/+$/, "") : "";
  if (configured) return `${configured}${path}`;
  if (!req) return path;
  const trustedProto = req.get("x-forwarded-proto") || (req.protocol === "https" ? "https" : "http");
  const host = req.get("x-forwarded-host") || req.get("host") || "localhost";
  return `${trustedProto}://${host}${path}`;
}

async function verifySlickPayInvoice(invoiceId: string): Promise<{ paid: boolean; data?: any }> {
  if (!SLICKPAY_API_KEY) return { paid: false };
  const endpoints = [
    `${SLICKPAY_BASE_URL.replace(/\/+$/, "")}/users/invoices/${invoiceId}`,
    `https://prodapi.slick-pay.com/api/v2/users/invoices/${invoiceId}`,
  ];
  if (!SLICKPAY_BASE_URL.includes("devapi")) endpoints.push(`https://devapi.slick-pay.com/api/v2/users/invoices/${invoiceId}`);
  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, { headers: { "Authorization": `Bearer ${SLICKPAY_API_KEY}`, "Accept": "application/json" } });
      if (!res.ok) continue;
      const data = await res.json();
      const invoiceData = data.invoice || data.data || data;
      const status = (invoiceData.status || "").toLowerCase();
      const isPaid = status === "completed" || status === "paid" || status === "success" || invoiceData.completed === true;
      return { paid: isPaid, data: invoiceData };
    } catch (e) {}
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
  } catch (e) {}
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
  try { await supabaseClient.from("invoices").update({ status, ...extra, updated_at: new Date().toISOString() }).eq("id", invoiceId); } catch (e) {}
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

function generateSmoothVocalWavBuffer(durationSec = 2.5, baseFreq = 160): Buffer {
  const sampleRate = 24000; const totalSamples = Math.floor(sampleRate * Math.max(1.2, Math.min(durationSec, 15))); const pcmBuffer = Buffer.alloc(totalSamples * 2);
  for (let i = 0; i < totalSamples; i++) { const t = i / sampleRate; const cadence = Math.sin(t * 3.5) * 12.0; const f0 = baseFreq + cadence; const s1 = Math.sin(2.0 * Math.PI * f0 * t) * 0.45; const s2 = Math.sin(2.0 * Math.PI * (f0 * 2.1) * t) * 0.25; const s3 = Math.sin(2.0 * Math.PI * (f0 * 3.2) * t) * 0.15; const syllable = 0.5 * (1.0 + Math.cos(2.0 * Math.PI * t * 3.2)); const envelope = Math.sin((Math.PI * i) / totalSamples) * syllable; let sampleVal = Math.floor((s1 + s2 + s3) * envelope * 24000.0); sampleVal = Math.max(-32768, Math.min(32767, sampleVal)); pcmBuffer.writeInt16LE(sampleVal, i * 2); }
  return pcmToWavBuffer(pcmBuffer, sampleRate, 1, 16);
}

const GEMINI_VOICE_MAP: Record<string, string> = {
  voice_amin: "Puck", voice_khalid: "Puck", voice_rashid: "Puck", voice_bilal: "Puck", voice_faycal: "Puck",
  voice_yasmin: "Zephyr", voice_maryam: "Zephyr", voice_layla: "Zephyr", voice_nour: "Zephyr",
  Puck: "Puck", Zephyr: "Zephyr", Charon: "Charon", Kore: "Kore", Fenrir: "Fenrir", Aoede: "Aoede", Orus: "Orus", Sulafat: "Sulafat", Leda: "Leda",
  voice_dz_amine: "Puck", voice_dz_yasmine: "Zephyr", voice_ar_sofiane: "Puck", voice_fr_ines: "Zephyr", voice_dz_rachid: "Puck", voice_en_lina: "Zephyr",
};

const VOICE_PREVIEW_SCRIPTS: Record<string, string> = {
  voice_amin: "سلام عليكم خاوتي، واش راكم لاباس؟ مع منصة صوتيفي تقدر تحول نصوصك لصوت بشري طبيعي.",
  voice_yasmin: "مرحبا بيكم كاملين! هادي أحسن منصة جزائرية بالذكاء الاصطناعي الصوتي، بنطق دقيق وصوت دافئ.",
  voice_khalid: "السلام عليكم ورحمة الله، نقدّم ليكم اليوم أحدث تقنية في الصوت الرقمي، بصوت موزون ونقي.",
  voice_maryam: "سلام، استمعوا لنطق دارجة جزائرية نقية وسلسة، تزيد لمسة احترافية لكل الفيديوهات.",
  voice_rashid: "يا هلا بيكم خاوتنا العزاز! هاذي تجربة صوتية جزائرية قوية وحماسية!",
  voice_layla: "أهلاً وسهلاً بيكم! صوت حيوي وخفيف، يوالم ستوريات إنستغرام وتيك توك.",
  voice_bilal: "صحا خاوتي، مع صوتيفي الصوت يخرج طبيعي وسلس كأنو متحدث جزائري حقيقي.",
  voice_nour: "مرحباً بيكم، تمتعوا بنطق دارجة واضحة، بنبرة خفيفة ومريحة تسمعها بلا ما تعيا.",
  voice_faycal: "واش راكم خاوتي؟ إلى راك تحوس على فويس أوفر احترافية للمشروع ديالك، راك في المكان الصحيح."
};

const PREVIEW_AUDIO_CACHE: Map<string, string> = new Map();
// Une même preview peut être demandée plusieurs fois lors de clics rapides ou
// de remounts frontend. Réutiliser la promesse évite de lancer plusieurs appels Gemini.
const PREVIEW_INFLIGHT: Map<string, Promise<string>> = new Map();
const PREVIEW_BUCKET = "voice-previews";

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

async function savePersistentPreview(cacheKey: string, dataUri: string): Promise<void> {
  if (!supabaseClient) return;
  try {
    const bytes = Buffer.from(dataUri.split(",")[1] || "", "base64");
    await supabaseClient.storage.from(PREVIEW_BUCKET).upload(`${cacheKey}.wav`, bytes, { contentType: "audio/wav", upsert: true });
  } catch (err: any) { console.warn(`[Preview cache] sauvegarde impossible: ${err?.message || err}`); }
}

function normalizeTextForTTS(text: string): string {
  let normalized = text;
  normalized = normalized.replace(/([0-9])([ا-يa-zA-Z])/g, '$1 $2');
  normalized = normalized.replace(/([ا-يa-zA-Z])([0-9])/g, '$1 $2');
  normalized = normalized.replace(/([a-zA-Z])([ا-ي])/g, '$1 $2');
  normalized = normalized.replace(/([ا-ي])([a-zA-Z])/g, '$1 $2');
  normalized = normalized.replace(/\s+/g, ' ').trim();
  if (!/[.!؟?…]$/.test(normalized)) normalized = normalized + " ...";
  return normalized;
}

function injectNaturalFiller(text: string): string {
  let clean = text.trim();
  if (clean.startsWith("...") || clean.startsWith("…")) return clean;
  return `... ${clean}`;
}

const EMOTION_TAG_MAP: Record<string, { inline: string; prompt: string }> = {
  excited: { inline: "، بحماس واضح وطاقة عالية، ", prompt: "اقرأ بحماس شديد جداً، طاقة عالية، وفرح واضح في الصوت." },
  natural: { inline: "، بشكل عفوي وطبيعي، ", prompt: "اقرأ بأسلوب عفوي وطبيعي جداً كأنك تتحدث مع صديق." },
  calm: { inline: "، بهدوء وطمأنينة، ", prompt: "اقرأ بهدوء تام، راحة، وطمأنينة." },
  dramatic: { inline: "، بنبرة درامية ومؤثرة، ", prompt: "اقرأ بأسلوب درامي، مؤثر، وجدي جداً." },
  whispers: { inline: "، بصوت خافت قريب من الهمس، ", prompt: "اقرأ بصوت خافت جداً، أقرب إلى الهمس." },
  whisper: { inline: "، بصوت خافت قريب من الهمس، ", prompt: "اقرأ بصوت خافت جداً، أقرب إلى الهمس." },
  fast: { inline: "، بسرعة وحيوية، ", prompt: "اقرأ بسرعة فائقة وحيوية." },
  articulated: { inline: "، بنطق واضح ومفصل، ", prompt: "انطق كل حرف بوضوح تام وتأنٍ." },
  laughter: { inline: "، مع لمسة ضحك خفيفة، ", prompt: "أضف لمسة مرح وضحكة خفيفة طبيعية في النبرة." },
  breathing: { inline: "، ... نفس عميق ... ، ", prompt: "أدرج تنفسات طبيعية وقصيرة بين الجمل." },
};

function extractAndApplyEmotionTags(rawText: string): { textForSpeech: string; tags: string[] } {
  const tags: string[] = [];
  const textForSpeech = rawText.replace(/\[([^\]]+)\]/g, (_match, rawTag: string) => {
    const tag = String(rawTag).toLowerCase().trim();
    tags.push(tag);
    const mapped = EMOTION_TAG_MAP[tag];
    return mapped ? mapped.inline : "، ";
  });
  return { textForSpeech, tags };
}

function buildEmotionPromptInstruction(tags: string[]): string {
  if (!tags.length) return "";
  const unique = [...new Set(tags.map(t => t.toLowerCase()))];
  const lines = unique.map(t => EMOTION_TAG_MAP[t]?.prompt).filter(Boolean);
  if (!lines.length) return "";
  const dominant = EMOTION_TAG_MAP[unique[0]]?.prompt || "";
  return `
العواطف المطلوبة في هذا الأداء الصوتي (مهم جداً — يجب احترامها من أول كلمة):
- العاطفة الرئيسية من البداية: ${dominant}
${lines.length > 1 ? `- تغيّر العواطف أثناء النص حسب الإرشادات المدمجة في النص.\n- التزم بكل تغيير عاطفي مذكور.` : ""}
- لا تبدأ بنبرة آلية محايدة ثم تتحول لاحقاً: ابدأ مباشرة بالعاطفة الرئيسية.`;
}

const REGION_GUIDES: Record<string, string> = {
  general: "Utilise une Darija algérienne standard et neutre, comprise dans tout le pays.",
  centre: "Utilise la Darija d'Alger et du centre : accent doux, mots comme 'واش', 'كيفاش', 'خويا', 'بصح'. Style urbain et posé.",
  ouest: "Utilise la Darija de l'Ouest (Oran, Tlemcen) : accent chantant, mots comme 'وشراك', 'دير', 'اسمع', 'خويا واعر', 'بلاطي'. Ton chaleureux et expressif.",
  est: "Utilise la Darija de l'Est (Constantine, Annaba, Sétif) : accent marqué, mots comme 'شوف', 'ياخي', 'زعمة', 'ماشي هكاك'. Ton direct et vif."
};

function getRegionGuide(region: string): string { return REGION_GUIDES[region] || REGION_GUIDES.general; }

// ==========================================================================
// FIX : SSE PARSER FOR STREAMING TTS
// ==========================================================================
async function parseSSEAudioChunks(response: Response): Promise<Buffer | null> {
  const fullText = await response.text();
  const pcmChunks: Buffer[] = [];

  for (const line of fullText.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data: ")) continue;
    const jsonStr = trimmed.slice(6);
    if (!jsonStr || jsonStr === "[DONE]") continue;
    try {
      const chunk = JSON.parse(jsonStr);
      const parts = chunk.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          pcmChunks.push(Buffer.from(part.inlineData.data, "base64"));
        }
      }
    } catch (_e) { /* skip malformed */ }
  }

  if (pcmChunks.length === 0) return null;
  return Buffer.concat(pcmChunks);
}

// ==========================================================================
// SYNTHESIZE WITH RETRY (FIX: lowercase "audio", streaming, explicit male/female)
// ==========================================================================
async function synthesizeWithRetry(
  rawText: string,
  selectedVoiceName: string,
  maxRetries = 3,
  speed = 1.0,
  pitch = 1.0,
  originalVoiceId: string = "",
  emotionTags: string[] = []
): Promise<{ pcmBuffer: Buffer | null; error: string | null; usedStreaming: boolean }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { pcmBuffer: null, error: "GEMINI_API_KEY non configurée", usedStreaming: false };
  let lastError: any = null;

  const cleanText = normalizeTextForTTS(rawText.replace(/\s+/g, " ").trim());
  const femaleVoices = ["Kore", "Zephyr", "Aoede", "Sulafat", "Leda"];
  const isFemale = femaleVoices.includes(selectedVoiceName);

  // FIX: Prompts explicites pour Amin et Faycal pour garantir voix masculine
  let performancePrompt = "";
  if (originalVoiceId === "voice_amin") { performancePrompt = "اقرأ النص التالي بأسلوب شبابي ودود، بصوت ذكوري طبيعي وحيوي."; }
  else if (originalVoiceId === "voice_khalid") { performancePrompt = "اقرأ النص التالي بأسلوب وثائقي رسمي، بصوت ذكوري وقور ورزين، مع تريث وبطء."; }
  else if (originalVoiceId === "voice_rashid") { performancePrompt = "اقرأ النص التالي بأسلوب حماسي ومشوق، بصوت ذكوري قوي ومليء بالطاقة والحيوية."; }
  else if (originalVoiceId === "voice_bilal") { performancePrompt = "اقرأ النص التالي بأسلوب سردي قصصي، بصوت ذكوري دافئ وعميق."; }
  else if (originalVoiceId === "voice_faycal") { performancePrompt = "اقرأ النص التالي بأسلوب تجاري مقنع، بصوت ذكوري واثق ومباشر."; }
  else if (originalVoiceId === "voice_layla") { performancePrompt = "اقرئي النص التالي بأسلوب عصري ومشرق، بصوت أنثوي حيوي وخفيف وسريع."; }
  else if (originalVoiceId === "voice_nour") { performancePrompt = "اقرئي النص التالي بأسلوب لطيف، بصوت أنثوي ناعم وهادئ وواضح."; }
  else { performancePrompt = isFemale ? "أنت ممثلة صوت جزائرية محترفة. اقرئي النص التالي بدارجة جزائرية أصيلة، بصوت أنثوي دافئ وطبيعي." : "أنت ممثل صوت جزائري محترف. اقرأ النص التالي بدارجة جزائرية أصيلة، بصوت ذكوري واثق وطبيعي."; }

  if (speed >= 1.15) performancePrompt += " اقرأ بسرعة فائقة وحيوية."; else if (speed <= 0.88) performancePrompt += " اقرأ ببطء, تريث, ووضوح تام."; else performancePrompt += " اقرأ بسرعة عادية ومريحة.";
  if (pitch >= 1.1) performancePrompt += isFemale ? " ارفعي نبرة الصوت قليلاً لتكون أكثر حيوية." : " ارفع نبرة الصوت قليلاً لتكون أكثر حيوية."; else if (pitch <= 0.9) performancePrompt += isFemale ? " اعمقي الصوت قليلا" : " اعمق الصوت قليلاً لمزيد من الجدية.";

  performancePrompt += buildEmotionPromptInstruction(emotionTags);
  const preparedText = injectNaturalFiller(cleanText);

  const enrichedSpeechPrompt = `${performancePrompt}

قواعد النطق ومخارج الحروف (مهمة جداً):
- انطق كل كلمة بوضوح تام، واحرص على إخراج مخارج الحروف كاملة وبشكل صحيح.
- لا تأكل أواخر الكلمات أو الحروف الأخيرة، وأعطِ كل حرف حقه في النطق.
- ابدأ مباشرة بالعاطفة المطلوبة من أول مقطع صوتي — ممنوع تبدأ بنبرة روبوتية محايدة.
- النقاط الثلاث في البداية (...) هي صمت قصير فقط: لا تنطقها ولا تقل "نقطة".
- إذا وُجدت إرشادات عاطفية داخل النص (مثل "بحماس" أو "بهدوء") فطبّقها فوراً عند تلك اللحظة، دون قراءتها ككلمات حرفية إن أمكن، أو ادمجها كنبرة.
- عند نهاية الجمل، اخفض نبرة الصوت تدريجياً وبشكل مريح دون قطع مفاجئ في الصوت.

النص:
${preparedText}`;

  const requestBody = {
    contents: [{ parts: [{ text: enrichedSpeechPrompt }] }],
    generationConfig: {
      responseModalities: ["audio"], // FIX: minuscules obligatoires
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: selectedVoiceName }
        }
      }
    }
  };

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // STRATÉGIE 1 : Streaming (Officiel pour TTS Preview)
      const streamUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:streamGenerateContent?alt=sse&key=${apiKey}`;
      console.log(`[TTS] Attempt ${attempt}/${maxRetries} — Streaming...`);
      
      const streamRes = await fetch(streamUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(requestBody) });

      if (streamRes.ok) {
        const pcmBuffer = await parseSSEAudioChunks(streamRes);
        if (pcmBuffer && pcmBuffer.length > 100) {
          console.log(`[TTS ✓] Streaming OK — ${pcmBuffer.length} bytes PCM, voice=${selectedVoiceName}`);
          return { pcmBuffer, error: null, usedStreaming: true };
        }
        console.warn(`[TTS] Streaming HTTP 200 mais aucun audio — fallback non-streaming`);
      } else {
        const errText = await streamRes.text();
        console.error(`[TTS] Streaming HTTP ${streamRes.status}: ${errText.substring(0, 500)}`);
      }

      // STRATÉGIE 2 : Non-streaming (Fallback)
      const nonStreamUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent?key=${apiKey}`;
      console.log(`[TTS] Attempt ${attempt}/${maxRetries} — Non-streaming...`);

      const nsRes = await fetch(nonStreamUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(requestBody) });

      if (!nsRes.ok) {
        const errText = await nsRes.text();
        console.error(`[TTS] Non-streaming HTTP ${nsRes.status}: ${errText.substring(0, 500)}`);
        throw new Error(`Gemini API ${nsRes.status}: ${errText.substring(0, 200)}`);
      }

      const nsJson = await nsRes.json();
      const pcmBase64 = nsJson.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (pcmBase64 && pcmBase64.length > 50) {
        const pcmBuffer = Buffer.from(pcmBase64, "base64");
        console.log(`[TTS ✓] Non-streaming OK — ${pcmBuffer.length} bytes PCM, voice=${selectedVoiceName}`);
        return { pcmBuffer, error: null, usedStreaming: false };
      }

      // Diagnostics
      const textPart = nsJson.candidates?.[0]?.content?.parts?.[0]?.text;
      if (textPart) {
        console.error(`[TTS] ⚠️  Gemini a renvoyé du TEXTE au lieu d'AUDIO : "${textPart.substring(0, 150)}"`);
      }
      console.error(`[TTS] Réponse sans audio. Keys:`, JSON.stringify(Object.keys(nsJson)));
      throw new Error("No audio data in Gemini response");

    } catch (err: any) {
      console.error(`[TTS ✗] Attempt ${attempt}/${maxRetries} FAILED:`, err.message || err);
      lastError = err;
      if (attempt < maxRetries) {
        const delay = 400 * Math.pow(2, attempt - 1) + Math.random() * 150;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  console.error(`[TTS] ═══ ALL ${maxRetries} ATTEMPTS FAILED ═══ Last error:`, lastError?.message);
  return { pcmBuffer: null, error: lastError?.message || "Erreur de génération audio", usedStreaming: false };
}


/* ==========================================================================
   LLM CALLER HELPER
   ========================================================================== */
function simpleHash(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
  return (h >>> 0).toString(36);
}

async function callGeminiTextAPI(promptText: string, temperature = 0.7): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Clé GEMINI_API_KEY manquante sur Render");

  const cacheKey = `${temperature.toFixed(2)}:${simpleHash(promptText)}`;
  const cached = LLM_RESPONSE_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.ts < LLM_CACHE_TTL_MS) return cached.result;

  // Un seul fallback : une panne ne doit pas transformer une action en 3 appels.
  const models = ["gemini-3.6-flash", "gemini-2.5-flash"];
  let allErrors: string[] = [];

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }], generationConfig: { temperature, maxOutputTokens: 4096 } }) });
      if (response.ok) {
        const data = await response.json();
        let result = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") || data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        result = result.replace(/```[a-z]*/g, "").replace(/```/g, "").replace(/^["«»']|["«»']$/g, "").trim();
        if (result) {
          LLM_RESPONSE_CACHE.set(cacheKey, { result, ts: Date.now() });
          if (LLM_RESPONSE_CACHE.size > LLM_CACHE_MAX_SIZE) { const oldestKey = LLM_RESPONSE_CACHE.keys().next().value; if (oldestKey) LLM_RESPONSE_CACHE.delete(oldestKey); }
          return result;
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
  "NICHE TARGETING : استهداف فئة (إلى كنت طالب/خدام/أم، هاد الفيديو ليك...)",
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
  "Ajoute une DIMENSION ÉMOTIONNELLE plus深い : joue sur la curiosité, l'urgence ou la connivence avec l'auditeur.",
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
  return (text.match(/\[(excited|natural|calm|whisper|fast|dramatic)\]/gi) || []).length;
}

// ==========================================================================
// START SERVER
// ==========================================================================
async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(compression());
  app.use(express.json({ limit: "10mb" }));

  const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false, handler: (req, res) => res.status(429).json({ error: "Trop de requêtes." }) });
  app.use(globalLimiter);

  const previewLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, handler: (req, res) => res.status(429).json({ error: "Trop de previews." }) });
  const ttsLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, handler: (req, res) => res.status(429).json({ error: "Trop de générations." }) });
  const llmLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, handler: (req, res) => res.status(429).json({ error: "Trop de requêtes LLM." }) });

  const allowedOrigin = FRONTEND_URL || (process.env.NODE_ENV !== "production" ? "*" : "");
  app.use((req, res, next) => {
    const origin = req.get("origin") || "";
    if (allowedOrigin === "*" || !allowedOrigin || origin === allowedOrigin) res.setHeader("Access-Control-Allow-Origin", allowedOrigin || origin || "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
  });
  app.use((req, res, next) => { res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups"); next(); });

  app.get("/api/health", (req, res) => res.json({ status: "ok", service: "sawtify-tts-server", voices_count: 9 }));

  /* ==========================================================================
     TTS PREVIEW (gratuit)
     ========================================================================== */
  const handleTTSPreview = async (req: express.Request, res: express.Response) => {
    const voiceId = (req.query.voice_id as string) || "voice_amin";
    const speed = parseFloat(req.query.speed as string) || 1.0;
    const pitch = parseFloat(req.query.pitch as string) || 1.0;
    const cacheKey = `${voiceId}_${speed.toFixed(1)}_${pitch.toFixed(1)}`;

    if (PREVIEW_AUDIO_CACHE.has(cacheKey)) {
      return res.json({ voice_id: voiceId, audio_url: PREVIEW_AUDIO_CACHE.get(cacheKey)!, duration_seconds: 2.5 });
    }
    const inflight = PREVIEW_INFLIGHT.get(cacheKey);
    if (inflight) {
      const audioUrl = await inflight;
      return res.json({ voice_id: voiceId, audio_url: audioUrl, duration_seconds: 2.5 });
    }

    const persistentPreview = await loadPersistentPreview(cacheKey);
    if (persistentPreview) {
      return res.json({ voice_id: voiceId, audio_url: persistentPreview, duration_seconds: 2.5 });
    }

    const selectedVoiceName = GEMINI_VOICE_MAP[voiceId] || "Puck";
    const sampleScript = VOICE_PREVIEW_SCRIPTS[voiceId] || "سلام عليكم، مرحبا بيكم في منصة صوتيفي.";
    const generation = (async () => {
      let wavBase64 = "";
      const { pcmBuffer, error: synthError } = await synthesizeWithRetry(sampleScript, selectedVoiceName, 2, speed, pitch, voiceId, []);
      if (pcmBuffer) {
        wavBase64 = pcmToWavBuffer(pcmBuffer, 24000, 1, 16).toString("base64");
      } else {
        console.warn(`[TTS Preview] Fallback synthétique pour ${voiceId} — erreur: ${synthError}`);
        const basePitchFreq = ["Kore", "Zephyr", "Aoede", "Sulafat"].includes(selectedVoiceName) ? 210 : 150;
        wavBase64 = generateSmoothVocalWavBuffer(2.6 / speed, basePitchFreq * pitch).toString("base64");
      }
      const dataUri = `data:audio/wav;base64,${wavBase64}`;
      PREVIEW_AUDIO_CACHE.set(cacheKey, dataUri);
      await savePersistentPreview(cacheKey, dataUri);
      return dataUri;
    })();
    PREVIEW_INFLIGHT.set(cacheKey, generation);
    try {
      const dataUri = await generation;
      return res.json({ voice_id: voiceId, audio_url: dataUri, duration_seconds: 2.5 });
    } finally {
      PREVIEW_INFLIGHT.delete(cacheKey);
    }
  };
  app.get("/api/v1/tts/preview", previewLimiter, handleTTSPreview);
  app.get("/api/tts/preview", previewLimiter, handleTTSPreview);

  /* ==========================================================================
     TTS GENERATE (débit côté serveur)
     ========================================================================== */
  const handleTTSGenerate = async (req: express.Request, res: express.Response) => {
    const queueFull = (TTS_CONCURRENCY as any).activeCount >= TTS_CONCURRENCY_LIMIT && (TTS_CONCURRENCY as any).pendingCount >= TTS_QUEUE_MAX_PENDING;
    if (queueFull) {
      return res.status(503).json({ error: "Le serveur vocal est occupé.", retry_after: 4, message: "Génération en cours… Réessayez dans quelques instants 🎙️" });
    }

    await TTS_CONCURRENCY(async () => {
      const startTime = Date.now();
      const userId = await getUserIdFromAuthHeader(req);
      const { text, voice, voice_id, speed = 1.0, pitch = 1.0 } = req.body;
      const requestedVoice = voice_id || voice || "voice_amin";
      const numSpeed = typeof speed === "number" ? speed : parseFloat(speed) || 1.0;
      const numPitch = typeof pitch === "number" ? pitch : parseFloat(pitch) || 1.0;

      if (!text || typeof text !== "string" || !text.trim()) {
        return res.status(400).json({ detail: "Le texte fourni ne contient aucun caractère vocalement synthétisable." });
      }
      if (text.length > 5000) {
        return res.status(400).json({ error: "Texte trop long (maximum 5000 caractères)." });
      }
      // Une requête anonyme ou sans solde ne doit jamais atteindre Gemini.
      if (!userId) return res.status(401).json({ error: "Authentification requise." });
      if (!supabaseClient) return res.status(503).json({ error: "Base de données indisponible." });
      const balanceBeforeGeneration = await getUserBalance(userId);
      if (balanceBeforeGeneration === null) return res.status(503).json({ error: "Impossible de vérifier le solde. Aucun point n'a été débité." });
      if (balanceBeforeGeneration !== null && balanceBeforeGeneration < BASE_POINTS_COST) {
        return res.status(402).json({ error: `Solde de points insuffisant (${BASE_POINTS_COST} points minimum requis).` });
      }
      if (await hasReachedDailyTTSLimit(userId)) {
        return res.status(429).json({ error: `Limite quotidienne atteinte (${DAILY_TTS_LIMIT} générations audio).` });
      }

      const { textForSpeech, tags: emotionTags } = extractAndApplyEmotionTags(text);
      const cleanText = normalizeTextForTTS(textForSpeech.replace(/\s+/g, " ").trim());
      const selectedVoiceName = GEMINI_VOICE_MAP[requestedVoice] || "Puck";

      let wavBase64 = "";
      let durationSeconds = Math.max(1.5, Math.round((cleanText.split(/\s+/).length / (2.8 * numSpeed)) * 10) / 10);

      const { pcmBuffer, error: synthError, usedStreaming } = await synthesizeWithRetry(cleanText, selectedVoiceName, 2, numSpeed, numPitch, requestedVoice, emotionTags);
      console.log(JSON.stringify({ event: "gemini_tts", userId, voice: requestedVoice, chars: text.length, success: Boolean(pcmBuffer), maxRetries: 2 }));
      const usedFallback = !pcmBuffer;

      // Un audio synthétique n'est pas la voix payante demandée : ne jamais le
      // retourner comme une génération réussie et ne jamais débiter l'utilisateur.
      if (usedFallback) {
        return res.status(503).json({ error: "Le service vocal est temporairement indisponible. Aucun point n'a été débité.", retry_after: 15, detail: synthError });
      }

      if (pcmBuffer && pcmBuffer.length > 50) {
        wavBase64 = pcmToWavBuffer(pcmBuffer, 24000, 1, 16).toString("base64");
        durationSeconds = Math.round((pcmBuffer.length / 48000) * 10) / 10;
      } else {
        console.error(`[TTS Generate] ⚠️  FALLBACK SYNTHÉTIQUE — Gemini TTS a échoué: ${synthError}`);
        const basePitchFreq = ["Kore", "Zephyr", "Aoede", "Sulafat"].includes(selectedVoiceName) ? 210 : 150;
        wavBase64 = generateSmoothVocalWavBuffer(durationSeconds, basePitchFreq * numPitch).toString("base64");
      }

      const finalPointsCost = computePointsCost(durationSeconds);

      let generationId: string | null = null;
      let remainingBalance: number | null = null;
      if (userId) {
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
      }

      return res.json({
        status: "success", success: true, audio_base64: wavBase64, audio_url: `data:audio/wav;base64,${wavBase64}`,
        format: "wav", sample_rate: 24000, generation_id: generationId || `gen_${Date.now()}`,
        duration_seconds: durationSeconds, latency_ms: Date.now() - startTime,
        points_deducted: userId ? finalPointsCost : 0, points_cost: userId ? finalPointsCost : 0,
        notification: userId ? `-${finalPointsCost} Points` : "Aperçu gratuit",
        remaining_balance: remainingBalance, voice_id: requestedVoice, gemini_voice: selectedVoiceName,
        parsed_tags: emotionTags,
        used_gemini_tts: !usedFallback, used_streaming: usedStreaming && !usedFallback,
        synth_fallback: usedFallback, synth_error: usedFallback ? synthError : undefined,
      });
    });
  };
  app.post("/api/v1/tts/generate", ttsLimiter, handleTTSGenerate);
  app.post("/api/tts/generate", ttsLimiter, handleTTSGenerate);

  /* ==========================================================================
     LLM SYSTEM PROMPT
     ========================================================================== */
  const LLM_SYSTEM_PROMPT = `Tu es un rédacteur publicitaire professionnel en Darija Algérienne, spécialisé dans les scripts vocaux (TTS) pour vidéos courtes.

RÈGLES STRICTES :

1. TRADUCTION / RÉDACTION NATURELLE :
- Le texte en darija doit être fluide, naturel et bien construit grammaticalement.
- Mots FR/techniques TOUJOURS en alphabet LATIN : livraison, WhatsApp, Instagram, Facebook, marketing digital, B2B, leads, closing, clients, service, formation, promotion, chiffre d'affaires, rendez-vous, réservation, etc.
- JAMAIS de translittération arabe de ces mots ("لا ليفريزون" INTERDIT).

2. BALISES D'ÉMOTION :
- UNE SEULE balise par phrase, placée au début : [excited], [natural], [calm], [whisper], [fast].
- JAMAIS deux balises collées ([excited][natural] INTERDIT).
- La première phrase DOIT commencer par une balise d'émotion claire.

3. LONGUEUR DES SCRIPTS (STRICT) :
- Durée cible à l'oral : 30 à 40 secondes. JAMAIS plus de 40 secondes.
- Environ 90 à 120 mots.
- Texte complet et argumenté, mais concis.

4. SORTIE :
- UNIQUEMENT le texte final à vocaliser.
- Aucun titre, markdown, étoile, guillemets, commentaire, note, "TTS Refinement".`;

  /* ==========================================================================
     LLM ENHANCE — المحسن السحري (-2 pts)
     ========================================================================== */
  const handleLLMEnhance = async (req: express.Request, res: express.Response) => {
    try {
      const userId = await getUserIdFromAuthHeader(req);
      if (!userId) return res.status(401).json({ error: "Authentification requise." });
      const { text, region = "general" } = req.body;
      if (!text || typeof text !== "string" || !text.trim()) return res.status(400).json({ error: "Texte manquant ou invalide" });
      if (text.length > 2000) return res.status(400).json({ error: "Texte trop long (maximum 2000 caractères)." });

      const pointsCost = 2;
      const currentBalance = await getUserBalance(userId);
      if (currentBalance === null) return res.status(503).json({ error: "Impossible de vérifier le solde. Aucun point n'a été débité." });
      if (currentBalance !== null && currentBalance < pointsCost) return res.status(402).json({ error: "Solde de points insuffisant (2 points requis)." });

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
3. Ajoute AU MINIMUM ${expectedMinTags} balises d'émotion ([excited], [natural], [calm], [whisper], [fast]). La PREMIÈRE phrase DOIT commencer par une balise. JAMAIS deux balises collées.
4. Alterne phrases courtes et moyennes. Utilise "..." pour les pauses.
5. Renvoie UNIQUEMENT le texte final à vocaliser.

${isRetry ? `⚠️ TENTATIVE #2 : Respecte STRICTEMENT : minimum ${expectedMinTags} balises, longueur minimale ${Math.floor(wordCount * 0.9)} mots.` : ""}

📝 TEXTE ORIGINAL :
${text}

Génère maintenant la version optimisée :`;

      let enhancedText = await callGeminiTextAPI(buildEnhancePrompt(false), 0.6);
      enhancedText = enhancedText.replace(/(\[[a-z]+\])\s*(\[[a-z]+\])/gi, "$1").replace(/\*+/g, "").replace(/^#+\s*.*$/gm, "").replace(/(TTS\s*Refinement|Refinement|Note|Remarque|Voici|Texte\s*amélioré|Version\s*optimisée)\s*:?/gi, "").replace(/^["«»']|["«»']$/g, "").replace(/```[a-z]*/g, "").replace(/```/g, "").replace(/\n{3,}/g, "\n\n").trim();

      const tagCount = countEmotionTags(enhancedText);
      const isTooShort = enhancedText.length < text.length * 0.6;
      const missingTags = tagCount < expectedMinTags;
      const latinPreserved = validateLatinPreservation(text, enhancedText);
      const startsWithTag = /^\[(excited|natural|calm|whisper|fast|dramatic)\]/i.test(enhancedText.trim());

      // Une seule génération Gemini par clic. Le nettoyage local ci-dessous
      // fournit un résultat sûr sans lancer une seconde requête payante.

      if (enhancedText.length < text.length * 0.4) enhancedText = /^\[/.test(text.trim()) ? text.trim() : `[natural] ${text.trim()}`;
      if (!/^\[(excited|natural|calm|whisper|fast|dramatic)\]/i.test(enhancedText.trim())) enhancedText = `[natural] ${enhancedText}`;

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
  app.post("/api/v1/llm/enhance", llmLimiter, handleLLMEnhance);
  app.post("/api/llm/enhance", llmLimiter, handleLLMEnhance);

  /* ==========================================================================
     LLM SCRIPT GENERATOR (-5 pts)
     ========================================================================== */
  const handleLLMGenerateScript = async (req: express.Request, res: express.Response) => {
    try {
      const userId = await getUserIdFromAuthHeader(req);
      if (!userId) return res.status(401).json({ error: "Authentification requise." });
      const { product, style, region = "general" } = req.body;
      if (!product || typeof product !== "string" || !product.trim()) return res.status(400).json({ error: "Nom du produit ou service manquant" });
      if (product.length > 200) return res.status(400).json({ error: "Nom du produit trop long (maximum 200 caractères)." });

      const pointsCost = 5;
      const currentBalance = await getUserBalance(userId);
      if (currentBalance === null) return res.status(503).json({ error: "Impossible de vérifier le solde. Aucun point n'a été débité." });
      if (currentBalance !== null && currentBalance < pointsCost) return res.status(402).json({ error: "Solde de points insuffisant (5 points requis)." });

      const selectedHook = HOOKS[Math.floor(Math.random() * HOOKS.length)];
      const selectedProblem = PROBLEMS[Math.floor(Math.random() * PROBLEMS.length)];
      const selectedSolution = SOLUTIONS[Math.floor(Math.random() * SOLUTIONS.length)];
      const selectedProof = PROOFS[Math.floor(Math.random() * PROOFS.length)];
      const selectedCTA = CTAS[Math.floor(Math.random() * CTAS.length)];

      const regionGuide = getRegionGuide(region);
      const detectedSector = detectSector(product);

      const scriptPrompt = `${LLM_SYSTEM_PROMPT}

LAHDJA CIBLE : ${regionGuide}
SECTEUR DÉTECTÉ : ${detectedSector}
SUJET / PRODUIT : "${product}"

🎯 ARCHITECTURE OBLIGATOIRE DU SCRIPT :
1. ACCROCHE (HOOK) [3-5 sec] -> "${selectedHook}"
2. LE PROBLÈME [8-12 sec] -> "${selectedProblem}"
3. LA SOLUTION & PREUVE [15-20 sec] -> "${selectedSolution}" ET "${selectedProof}"
4. APPEL À L'ACTION (CTA) [5 sec] -> "${selectedCTA}"

⚠️ CONTRAINTES : Fluide en Darija, 90 à 120 mots, PAS DE TITRE, JUSTE LE TEXTE.
Style vocal souhaité : ${style || "excited"}`;

      let scriptText = await callGeminiTextAPI(scriptPrompt, 0.95);
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
  app.post("/api/v1/llm/generate-script", llmLimiter, handleLLMGenerateScript);
  app.post("/api/llm/generate-script", llmLimiter, handleLLMGenerateScript);

  /* ==========================================================================
     AI FEEDBACK
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
    } catch (err: any) { return res.status(200).json({ success: false, error: err.message }); }
  };
  app.post("/api/v1/ai/feedback", handleAIFeedback);
  app.post("/api/ai/feedback", handleAIFeedback);

  /* ==========================================================================
     SLICKPAY
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
        packName = packRow.name; numAmount = Number(packRow.price_dzd); numPoints = Number(packRow.points);
      } else return res.status(503).json({ success: false, error: "Paiement indisponible." });

      const returnUrl = getPublicUrl(req, `/?payment_status=success&pack_id=${packId}&points=${numPoints}`);
      let cleanPhone = phone.replace(/[^0-9]/g, '');
      if (cleanPhone.startsWith('213') && cleanPhone.length > 9) cleanPhone = '0' + cleanPhone.slice(3);
      if (!cleanPhone || cleanPhone.length < 9) cleanPhone = "0550123456";
      let defaultAccountUuid: string | undefined = undefined, contactUuid: string | undefined = undefined;
      const slickPayApiRoot = SLICKPAY_BASE_URL.replace(/\/+$/, "");
      try { const accRes = await fetch(`${slickPayApiRoot}/users/accounts`, { headers: { "Authorization": `Bearer ${SLICKPAY_API_KEY}`, "Accept": "application/json" } }); if (accRes.ok) { const accData = await accRes.json(); const list = accData.data || accData.accounts || (Array.isArray(accData) ? accData : []); if (list.length > 0) defaultAccountUuid = list[0].uuid || list[0].id; } } catch (e) {}

      const contactCacheKey = email.trim().toLowerCase();
      contactUuid = SLICKPAY_CONTACT_CACHE.get(contactCacheKey);
      if (!contactUuid) {
        try {
          const contactRes = await fetch(`${slickPayApiRoot}/users/contacts`, { method: "POST", headers: { "Authorization": `Bearer ${SLICKPAY_API_KEY}`, "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify({ firstname: firstname.trim() || "Client", lastname: lastname.trim() || "Sawtify", phone: cleanPhone, email: email.trim() || "client@sawtify.dz", address: address.trim() || "Alger", adress: address.trim() || "Alger" }) });
          if (contactRes.ok) { const contactData = await contactRes.json(); contactUuid = contactData.uuid || contactData.id || contactData.data?.uuid; if (contactUuid) SLICKPAY_CONTACT_CACHE.set(contactCacheKey, contactUuid); }
        } catch (e) {}
      }
      const itemsList = [{ name: `${packName} (+${numPoints} pts)`, price: numAmount, quantity: 1 }];
      const payload: any = { amount: numAmount, url: returnUrl, firstname: firstname.trim() || "Client", lastname: lastname.trim() || "Sawtify", phone: cleanPhone, email: email.trim() || "client@sawtify.dz", address: address.trim() || "Alger", adress: address.trim() || "Alger", note: `Sawtify - ${packName}`, items: itemsList };
      if (defaultAccountUuid) payload.account = defaultAccountUuid; if (contactUuid) payload.contact = contactUuid;
      const primaryUrl = `${SLICKPAY_BASE_URL.replace(/\/+$/, '')}/users/invoices`;

      const spRes = await fetch(primaryUrl, { method: "POST", headers: { "Authorization": `Bearer ${SLICKPAY_API_KEY}`, "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify(payload) });
      const spText = await spRes.text();
      let spData: any;
      try { spData = JSON.parse(spText); } catch { spData = { message: spText }; }
      if (!spRes.ok || !(spData && (spData.success === 1 || spData.id || spData.url))) return res.status(502).json({ success: false, error: "Impossible de créer la facture SlickPay.", diagnostics: spData });

      const invoiceId = spData.id || `INV_${Date.now()}`;
      const paymentUrl = spData.url || "";
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
    if (verification.paid && localRecord && localRecord.status !== "completed" && localRecord.status !== "paid") {
      await updateInvoiceStatus(invoiceId, "completed");
      const creditResult = await creditIfPaid(invoiceId);
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
      await updateInvoiceStatus(invoiceId, "completed");
      const result = await creditIfPaid(invoiceId);
      if (!result.credited) return res.status(500).json({ success: false, error: result.error || "Erreur crédit." });
      return res.json({ success: true, message: "Paiement validé", newBalance: result.newBalance, record: { invoiceId, packId: entry.packId, points: entry.points, amountDZD: entry.amountDZD } });
    } catch (err: any) { return res.status(500).json({ success: false, error: err.message }); }
  });

  app.post("/api/slickpay/webhook", async (req, res) => {
    try {
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
      const { data: inserted, error: insertErr } = await supabaseClient.from("ip_claims").insert({ ip, user_id: userId }).select().single();
      if (!insertErr && inserted) return res.json({ success: true, welcomeGranted: true });
      await supabaseClient.from("profiles").update({ credits_balance: 0 }).eq("id", userId).eq("credits_balance", 50);
      return res.json({ success: true, welcomeGranted: false });
    } catch (err: any) { return res.status(500).json({ success: false, error: err.message }); }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Aucun préchauffage Gemini au démarrage : une instance redémarrée ne doit
  // pas consommer 9 requêtes avant même qu'un utilisateur clique sur Preview.
}

startServer();
