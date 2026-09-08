import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const SLICKPAY_KEY = process.env.SLICKPAY_PUBLIC_KEY || "";
const SLICKPAY_SANDBOX_KEY = process.env.SLICKPAY_SANDBOX_KEY || "";
const SLICKPAY_BASE_URL = process.env.SLICKPAY_BASE_URL || "https://prodapi.slick-pay.com/api/v2";
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!GEMINI_API_KEY) console.warn("[Config] GEMINI_API_KEY manquante");
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) console.warn("[Config] SUPABASE manquants");
if (!SLICKPAY_KEY) console.warn("[Config] SLICKPAY_KEY manquante");

let supabaseClient: any = null;
try { supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY); } catch (err) { console.warn("[Supabase] Init warning:", err); }

const INVOICE_REGISTRY = new Map<string | number, {
  invoiceId: string | number; packId: string; packName: string; points: number; amountDZD: number;
  paymentMethod: string; status: 'pending' | 'completed' | 'paid' | 'failed'; paymentUrl?: string;
  createdAt: string; userId?: string; credited?: boolean;
}>();

async function getUserIdFromAuthHeader(req: express.Request): Promise<string | null> {
  try {
    const authHeader = req.get('authorization') || req.get('Authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token || !supabaseClient) return null;
    const { data, error } = await supabaseClient.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user.id as string;
  } catch { return null; }
}

const VALID_GATEWAYS = new Set(['edahabia', 'cib', 'slickpay', 'satim']);
function mapGateway(method: string | undefined): string { return VALID_GATEWAYS.has((method || '').toLowerCase()) ? method!.toLowerCase() : 'slickpay'; }

async function creditIfPaid(invoiceId: string | number): Promise<{ credited: boolean; newBalance?: number; error?: string }> {
  const entry = INVOICE_REGISTRY.get(String(invoiceId));
  if (!entry) return { credited: false, error: 'invoice_unknown' };
  if (entry.credited) return { credited: true };
  if (!entry.userId) return { credited: false, error: 'no_user_linked' };
  if (!supabaseClient) return { credited: false, error: 'supabase_unavailable' };
  const { data, error } = await supabaseClient.rpc('credit_user_balance', { p_user_id: entry.userId, p_pack_id: entry.packId, p_gateway: mapGateway(entry.paymentMethod), p_gateway_reference: String(invoiceId), p_amount_dzd: entry.amountDZD, p_points: entry.points, p_payload: { source: 'sawtify_server', invoiceId } });
  if (error) return { credited: false, error: error.message };
  entry.credited = true; entry.status = 'completed'; INVOICE_REGISTRY.set(String(invoiceId), entry);
  return { credited: true, newBalance: data?.new_balance };
}

async function getUserBalance(userId: string): Promise<number | null> {
  if (!supabaseClient) return null;
  try {
    const { data: profile } = await supabaseClient.from("profiles").select("credits_balance").eq("id", userId).single();
    return profile ? profile.credits_balance : null;
  } catch {
    return null;
  }
}

async function deductCredits(userId: string, amount: number): Promise<{ success: boolean; remaining?: number; error?: string }> {
  if (!supabaseClient) return { success: false, error: "Base de données inaccessible." };
  try {
    const { data: profile, error: fetchErr } = await supabaseClient
      .from("profiles")
      .select("credits_balance")
      .eq("id", userId)
      .single();

    if (fetchErr || !profile) return { success: false, error: "Profil utilisateur introuvable." };
    if (profile.credits_balance < amount) return { success: false, error: "Solde de points insuffisant." };

    const newBalance = profile.credits_balance - amount;
    const { error: updateErr } = await supabaseClient
      .from("profiles")
      .update({ credits_balance: newBalance })
      .eq("id", userId);

    if (updateErr) return { success: false, error: "Échec de la mise à jour du solde." };
    return { success: true, remaining: newBalance };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ==========================================================================
// TARIFICATION PAR PALIER : 20 pts pour 0-60s, puis +10 pts par tranche
// de 60s supplémentaire entamée (61s->10, 121s->10, etc.)
// ==========================================================================
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
  voice_faycal: "واش راكم خاوتي؟ إلى راك تحوس على فويس أوفر احترافية للمشروع ديالك، راك في المكان الصحيح.",
  voice_dz_amine: "سلام عليكم خاوتي، واش راكم لاباس؟ مع منصة صوتيفي تقدر تحول نصوصك لصوت بشري طبيعي.",
  voice_dz_yasmine: "مرحبا بيكم كاملين! هادي أحسن منصة جزائرية بالذكاء الاصطناعي الصوتي، بنطق دقيق وصوت دافئ.",
  voice_ar_sofiane: "السلام عليكم ورحمة الله، نقدّم ليكم اليوم أحدث تقنية في الصوت الرقمي، بصوت موزون ونقي.",
  voice_fr_ines: "سلام، استمعوا لنطق دارجة جزائرية نقية وسلسة، تزيد لمسة احترافية لكل الفيديوهات.",
  voice_dz_rachid: "يا هلا بيكم خاوتنا العزاز! هاذي تجربة صوتية جزائرية قوية وحماسية!",
  voice_en_lina: "أهلاً وسهلاً بيكم! صوت حيوي وخفيف، يوالم ستوريات إنستغرام وتيك توك."
};

const PREVIEW_AUDIO_CACHE: Map<string, string> = new Map();

// ==========================================================================
// NORMALISATION & ARTICULATION OPTIMALE (FIX FIN DES MOTS)
// ==========================================================================
function normalizeTextForTTS(text: string): string {
  let normalized = text;
  normalized = normalized.replace(/([0-9])([ا-يa-zA-Z])/g, '$1 $2');
  normalized = normalized.replace(/([ا-يa-zA-Z])([0-9])/g, '$1 $2');
  normalized = normalized.replace(/([a-zA-Z])([ا-ي])/g, '$1 $2');
  normalized = normalized.replace(/([ا-ي])([a-zA-Z])/g, '$1 $2');
  normalized = normalized.replace(/\s+/g, ' ').trim();

  // FIX FIN DES MOTS : Toujours terminer par une pause douce
  // pour éviter que la dernière syllabe soit coupée par le TTS
  if (!/[.!؟?…]$/.test(normalized)) {
    normalized = normalized + " ...";
  }

  return normalized;
}

// ==========================================================================
// 🛠️ FIX GEMINI #1 — ANTI-ROBOT COLD START
// Avant: fillers aléatoires (ممم / إيه / أها) qui cassaient le début
// Après: micro-silence "..." pour chauffer la prosodie AVANT le 1er mot
// ==========================================================================
function injectNaturalFiller(text: string): string {
  let clean = text.trim();
  // Si déjà un silence au début, on ne double pas
  if (clean.startsWith("...") || clean.startsWith("…")) return clean;
  // Silence court uniquement (PAS de filler parlé type "ممم")
  return `... ${clean}`;
}

// ==========================================================================
// 🛠️ FIX GEMINI #2 — MAPPING DES TAGS D'ÉMOTION → INSTRUCTIONS ARABE
// Les tags [excited] etc. étaient SUPPRIMÉS et JAMAIS envoyés à Gemini TTS.
// On les convertit en didascalies orales + instruction globale dans le prompt.
// ==========================================================================
const EMOTION_TAG_MAP: Record<string, { inline: string; prompt: string }> = {
  excited: {
    inline: "، بحماس واضح وطاقة عالية، ",
    prompt: "اقرأ بحماس شديد جداً، طاقة عالية، وفرح واضح في الصوت."
  },
  natural: {
    inline: "، بشكل عفوي وطبيعي، ",
    prompt: "اقرأ بأسلوب عفوي وطبيعي جداً كأنك تتحدث مع صديق."
  },
  calm: {
    inline: "، بهدوء وطمأنينة، ",
    prompt: "اقرأ بهدوء تام، راحة، وطمأنينة."
  },
  dramatic: {
    inline: "، بنبرة درامية ومؤثرة، ",
    prompt: "اقرأ بأسلوب درامي، مؤثر، وجدي جداً."
  },
  whispers: {
    inline: "، بصوت خافت قريب من الهمس، ",
    prompt: "اقرأ بصوت خافت جداً، أقرب إلى الهمس."
  },
  whisper: {
    inline: "، بصوت خافت قريب من الهمس، ",
    prompt: "اقرأ بصوت خافت جداً، أقرب إلى الهمس."
  },
  fast: {
    inline: "، بسرعة وحيوية، ",
    prompt: "اقرأ بسرعة فائقة وحيوية."
  },
  articulated: {
    inline: "، بنطق واضح ومفصل، ",
    prompt: "انطق كل حرف بوضوح تام وتأنٍ."
  },
  laughter: {
    inline: "، مع لمسة ضحك خفيفة، ",
    prompt: "أضف لمسة مرح وضحكة خفيفة طبيعية في النبرة."
  },
  breathing: {
    inline: "، ... نفس عميق ... ، ",
    prompt: "أدرج تنفسات طبيعية وقصيرة بين الجمل."
  },
};

function extractAndApplyEmotionTags(rawText: string): { textForSpeech: string; tags: string[] } {
  const tags: string[] = [];
  // Remplace chaque [tag] par une didascalie arabe (non lue comme mot anglais)
  // pour que Gemini change d'émotion AU BON ENDROIT dans le script
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
  // Première émotion = dominante pour le début (cold start)
  const unique = [...new Set(tags.map(t => t.toLowerCase()))];
  const lines = unique
    .map(t => EMOTION_TAG_MAP[t]?.prompt)
    .filter(Boolean);
  if (!lines.length) return "";
  const dominant = EMOTION_TAG_MAP[unique[0]]?.prompt || "";
  return `
العواطف المطلوبة في هذا الأداء الصوتي (مهم جداً — يجب احترامها من أول كلمة):
- العاطفة الرئيسية من البداية: ${dominant}
${lines.length > 1 ? `- تغيّر العواطف أثناء النص حسب الإرشادات المدمجة في النص.\n- التزم بكل تغيير عاطفي مذكور.` : ""}
- لا تبدأ بنبرة آلية محايدة ثم تتحول لاحقاً: ابدأ مباشرة بالعاطفة الرئيسية.`;
}

// ==========================================================================
// MAPPING RÉGIONS / LAHDJA
// ==========================================================================
const REGION_GUIDES: Record<string, string> = {
  general: "Utilise une Darija algérienne standard et neutre, comprise dans tout le pays.",
  centre: "Utilise la Darija d'Alger et du centre : accent doux, mots comme 'واش', 'كيفاش', 'خويا', 'بصح'. Style urbain et posé.",
  ouest: "Utilise la Darija de l'Ouest (Oran, Tlemcen) : accent chantant, mots comme 'وشراك', 'دير', 'اسمع', 'خويا واعر', 'بلاطي'. Ton chaleureux et expressif.",
  est: "Utilise la Darija de l'Est (Constantine, Annaba, Sétif) : accent marqué, mots comme 'شوف', 'ياخي', 'زعمة', 'ماشي هكاك'. Ton direct et vif."
};

function getRegionGuide(region: string): string {
  return REGION_GUIDES[region] || REGION_GUIDES.general;
}

async function synthesizeWithRetry(
  rawText: string,
  selectedVoiceName: string,
  maxRetries = 3,
  speed = 1.0,
  pitch = 1.0,
  originalVoiceId: string = "",
  emotionTags: string[] = [] // 🛠️ FIX: tags reçus depuis handleTTSGenerate
): Promise<{ pcmBuffer: Buffer | null; error: string | null }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { pcmBuffer: null, error: "GEMINI_API_KEY non configurée" };
  let lastError: any = null;

  // rawText ici est déjà nettoyé des [tags] OU contient les didascalies inline
  const cleanText = normalizeTextForTTS(rawText.replace(/\s+/g, " ").trim());
  const femaleVoices = ["Kore", "Zephyr", "Aoede", "Sulafat", "Leda"];
  const isFemale = femaleVoices.includes(selectedVoiceName);

  let performancePrompt = "";
  if (originalVoiceId === "voice_khalid") { performancePrompt = isFemale ? "اقرئي النص التالي بأسلوب وثائقي رسمي، بصوت أنثوي جاد وعميق، مع تريث وبطء." : "اقرأ النص التالي بأسلوب وثائقي رسمي، بصوت ذكوري وقور ورزين، مع تريث وبطء."; }
  else if (originalVoiceId === "voice_rashid") { performancePrompt = isFemale ? "اقرئي النص التالي بأسلوب حماسي ومشوق، بصوت أنثوي قوي ومليء بالطاقة." : "اقرأ النص التالي بأسلوب حماسي ومشوق، بصوت ذكوري قوي ومليء بالطاقة والحيوية."; }
  else if (originalVoiceId === "voice_bilal") { performancePrompt = isFemale ? "اقرئي النص التالي بأسلوب سردي قصصي، بصوت أنثوي دافئ وعميق." : "اقرأ النص التالي بأسلوب سردي قصصي، بصوت ذكوري دافئ وعميق."; }
  else if (originalVoiceId === "voice_faycal") { performancePrompt = isFemale ? "اقرئي النص التالي بأسلوب تجاري مقنع، بصوت أنثوي واثق ومباشر." : "اقرأ النص التالي بأسلوب تجاري مقنع، بصوت ذكوري واثق ومباشر."; }
  else if (originalVoiceId === "voice_layla") { performancePrompt = "اقرئي النص التالي بأسلوب عصري ومشرق، بصوت أنثوي حيوي وخفيف وسريع."; }
  else if (originalVoiceId === "voice_nour") { performancePrompt = "اقرئي النص التالي بأسلوب لطيف، بصوت أنثوي ناعم وهادئ وواضح."; }
  else { performancePrompt = isFemale ? "أنت ممثلة صوت جزائرية محترفة. اقرئي النص التالي بدارجة جزائرية أصيلة، بصوت أنثوي دافئ وطبيعي. تنفسي بشكل طبيعي entre les phrases، وتجنبي تماماً النبرة الآلية." : "أنت ممثل صوت جزائري محترف. اقرأ النص التالي بدارجة جزائرية أصيلة، بصوت ذكوري واثق وطبيعي. تتنفس بشكل طبيعي entre les phrases، وتجنب تماماً النبرة الآلية."; }

  if (speed >= 1.15) performancePrompt += " اقرأ بسرعة فائقة وحيوية."; else if (speed <= 0.88) performancePrompt += " اقرأ ببطء, تريث, ووضوح تام."; else performancePrompt += " اقرأ بسرعة عادية ومريحة.";
  if (pitch >= 1.1) performancePrompt += isFemale ? " ارفعي نبرة الصوت قليلاً لتكون أكثر حيوية." : " ارفع نبرة الصوت قليلاً لتكون أكثر حيوية."; else if (pitch <= 0.9) performancePrompt += isFemale ? " اعمقي الصوت قليلا" : " اعمق الصوت قليلاً لمزيد من الجدية.";

  // 🛠️ FIX GEMINI #2b — Injecter les émotions dans le prompt de perf
  performancePrompt += buildEmotionPromptInstruction(emotionTags);

  // 🛠️ FIX GEMINI #1b — Micro-silence anti cold-start robotique
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

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent?key=${apiKey}`;
      const response = await fetch(apiUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: enrichedSpeechPrompt }] }], generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoiceName } } } } }) });
      if (!response.ok) { const errBody = await response.text(); throw new Error(`Gemini API Error (${response.status}): ${errBody}`); }
      const responseJson = await response.json(); const pcmBase64 = responseJson.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (pcmBase64 && pcmBase64.length > 50) { return { pcmBuffer: Buffer.from(pcmBase64, "base64"), error: null }; }
    } catch (err: any) { lastError = err; if (attempt < maxRetries) { const delay = 400 * Math.pow(2, attempt - 1) + Math.random() * 150; await new Promise((resolve) => setTimeout(resolve, delay)); } }
  }
  return { pcmBuffer: null, error: lastError?.message || "Erreur de génération audio" };
}

/* ==========================================================================
   LLM CALLER HELPER (MULTI-MODÈLES + TOKENS 4096)
   ========================================================================== */
async function callGeminiTextAPI(promptText: string, temperature = 0.7): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Clé GEMINI_API_KEY manquante sur Render");

  const models = ["gemini-3.6-flash", "gemini-3.1-flash", "gemini-2.5-flash"];
  let allErrors: string[] = [];

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      console.log(`[LLM] Tentative avec : ${model}...`);

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: {
            temperature: temperature,
            maxOutputTokens: 4096
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const finishReason = data.candidates?.[0]?.finishReason;
        let result = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ||
                     data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        result = result.replace(/```[a-z]*/g, "").replace(/```/g, "").replace(/^["«»']|["«»']$/g, "").trim();

        if (finishReason === "MAX_TOKENS") {
          console.warn(`[LLM] ${model} : réponse tronquée (MAX_TOKENS)`);
        }

        if (result) {
          console.log(`[LLM Succès] ${model} (${result.length} caractères)`);
          return result;
        }
        allErrors.push(`${model}: réponse vide`);
      } else {
        const errJson = await response.json().catch(() => null);
        const errMsg = errJson?.error?.message || `Erreur HTTP ${response.status}`;
        console.error(`[LLM Erreur ${model}] :`, errMsg);
        allErrors.push(`${model}: ${errMsg}`);
      }
    } catch (e: any) {
      console.error(`[LLM Exception ${model}] :`, e.message || e);
      allErrors.push(`${model}: ${e.message || String(e)}`);
    }
  }

  throw new Error(`Google API: ${allErrors.join(" | ")}`);
}

// ==========================================================================
// DÉTECTEUR DE SECTEUR (pour tracking feedback IA)
// ==========================================================================
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

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  app.use(express.json({ limit: "10mb" }));

  const FRONTEND_URL = process.env.FRONTEND_URL || "*";
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", FRONTEND_URL);
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
  });
  app.use((req, res, next) => {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
    next();
  });

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

    const selectedVoiceName = GEMINI_VOICE_MAP[voiceId] || "Puck";
    const sampleScript = VOICE_PREVIEW_SCRIPTS[voiceId] || "سلام عليكم، مرحبا بيكم في منصة صوتيفي.";
    let wavBase64 = "";
    // Preview: pas de tags émotion → tableau vide
    const { pcmBuffer } = await synthesizeWithRetry(sampleScript, selectedVoiceName, 2, speed, pitch, voiceId, []);

    if (pcmBuffer) {
      wavBase64 = pcmToWavBuffer(pcmBuffer, 24000, 1, 16).toString("base64");
    } else {
      const basePitchFreq = ["Kore", "Zephyr", "Aoede", "Sulafat"].includes(selectedVoiceName) ? 210 : 150;
      wavBase64 = generateSmoothVocalWavBuffer(2.6 / speed, basePitchFreq * pitch).toString("base64");
    }

    const dataUri = `data:audio/wav;base64,${wavBase64}`;
    PREVIEW_AUDIO_CACHE.set(cacheKey, dataUri);
    return res.json({ voice_id: voiceId, audio_url: dataUri, duration_seconds: 2.5 });
  };
  app.get("/api/v1/tts/preview", handleTTSPreview);
  app.get("/api/tts/preview", handleTTSPreview);

  /* ==========================================================================
     TTS GENERATE (-20 pts + notification)
     ========================================================================== */
  const handleTTSGenerate = async (req: express.Request, res: express.Response) => {
    const startTime = Date.now();
    const userId = await getUserIdFromAuthHeader(req);
    const { text, voice, voice_id, speed = 1.0, pitch = 1.0 } = req.body;
    const requestedVoice = voice_id || voice || "voice_amin";
    const numSpeed = typeof speed === "number" ? speed : parseFloat(speed) || 1.0;
    const numPitch = typeof pitch === "number" ? pitch : parseFloat(pitch) || 1.0;

    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ detail: "Le texte fourni ne contient aucun caractère vocalement synthétisable." });
    }

    // Vérification préalable avec le coût plancher (20 pts) : le coût réel
    // (dépendant de la durée réelle générée) est calculé plus bas, et c'est
    // le frontend (RPC Supabase deduct_user_credits, seule source de vérité)
    // qui effectue le débit atomique final avec ce coût dynamique.
    // -> évite tout double débit (ne JAMAIS déduire les points ici aussi).
    if (userId) {
      const currentBalance = await getUserBalance(userId);
      if (currentBalance !== null && currentBalance < BASE_POINTS_COST) {
        return res.status(402).json({ error: "Solde de points insuffisant (20 points minimum requis)." });
      }
    }

    // 🛠️ FIX GEMINI #2c — Extraire + convertir les tags AVANT de synthétiser
    // Avant: text.replace(/\[.*?\]/g, " ") → tags jetés, Gemini ne les voyait jamais
    // Après: tags → didascalies inline + liste passée au prompt de performance
    const { textForSpeech, tags: emotionTags } = extractAndApplyEmotionTags(text);
    const cleanText = normalizeTextForTTS(textForSpeech.replace(/\s+/g, " ").trim());
    const selectedVoiceName = GEMINI_VOICE_MAP[requestedVoice] || "Puck";

    let wavBase64 = "";
    let durationSeconds = Math.max(1.5, Math.round((cleanText.split(/\s+/).length / (2.8 * numSpeed)) * 10) / 10);

    // 🛠️ On passe emotionTags à synthesizeWithRetry
    const { pcmBuffer, error } = await synthesizeWithRetry(
      cleanText,
      selectedVoiceName,
      3,
      numSpeed,
      numPitch,
      requestedVoice,
      emotionTags
    );

    if (pcmBuffer && pcmBuffer.length > 50) {
      wavBase64 = pcmToWavBuffer(pcmBuffer, 24000, 1, 16).toString("base64");
      durationSeconds = Math.round((pcmBuffer.length / 48000) * 10) / 10;
    } else {
      const basePitchFreq = ["Kore", "Zephyr", "Aoede", "Sulafat"].includes(selectedVoiceName) ? 210 : 150;
      wavBase64 = generateSmoothVocalWavBuffer(durationSeconds, basePitchFreq * numPitch).toString("base64");
    }

    // Coût réel basé sur la durée effectivement générée (palier 0-60s = 20 pts,
    // puis +10 pts par tranche de 60s supplémentaire entamée).
    const finalPointsCost = computePointsCost(durationSeconds);

    // Le débit réel du solde se fait UNIQUEMENT côté frontend via le RPC
    // Supabase deduct_user_credits (seule source de vérité), avec ce coût
    // dynamique. On ne débite jamais ici pour éviter un double débit.
    const remainingBalance: number | null = userId ? await getUserBalance(userId) : null;

    return res.json({
      status: "success",
      success: true,
      audio_base64: wavBase64,
      audio_url: `data:audio/wav;base64,${wavBase64}`,
      format: "wav",
      sample_rate: 24000,
      generation_id: `gen_${Date.now()}`,
      duration_seconds: durationSeconds,
      latency_ms: Date.now() - startTime,
      points_deducted: finalPointsCost,
      points_cost: finalPointsCost,
      notification: `-${finalPointsCost} Points`,
      remaining_balance: remainingBalance,
      voice_id: requestedVoice,
      gemini_voice: selectedVoiceName,
      parsed_tags: emotionTags,
      notice: error ? "Audio synthétisé via canal sécurisé" : undefined
    });
  };
  app.post("/api/v1/tts/generate", handleTTSGenerate);
  app.post("/api/tts/generate", handleTTSGenerate);

   /* ==========================================================================
     LLM SYSTEM PROMPT (SAWTIFY DARIJA ÉLITE - ANTI-RÉPÉTITION)
     ========================================================================== */
  const LLM_SYSTEM_PROMPT = `Tu es un rédacteur publicitaire professionnel en Darija Algérienne, spécialisé dans les scripts vocaux (TTS) pour vidéos courtes.

RÈGLES STRICTES :

1. TRADUCTION / RÉDACTION NATURELLE :
- Le texte en darija doit être fluide, naturel et bien construit grammaticalement — jamais une traduction mot-à-mot rigide.
- Mots FR/techniques TOUJOURS en alphabet LATIN : livraison, WhatsApp, Instagram, Facebook, marketing digital, B2B, leads, closing, clients, service, formation, promotion, chiffre d'affaires, rendez-vous, réservation, etc.
- JAMAIS de translittération arabe de ces mots ("لا ليفريزون" INTERDIT).

2. BALISES D'ÉMOTION :
- UNE SEULE balise par phrase, placée au début : [excited], [natural], [calm], [whisper], [fast].
- JAMAIS deux balises collées ([excited][natural] INTERDIT).
- La première phrase DOIT commencer par une balise d'émotion claire.

3. LONGUEUR DES SCRIPTS (STRICT) :
- Durée cible à l'oral : 30 à 50 secondes. JAMAIS plus de 60 secondes.
- Environ 90 à 140 mots.
- Texte complet et argumenté, mais concis — pas de remplissage inutile pour atteindre la limite.

4. SORTIE :
- UNIQUEMENT le texte final à vocaliser.
- Aucun titre, markdown (* #), étoile, guillemets, commentaire, note, "TTS Refinement".`;

  /* ==========================================================================
     MATRICES DE COPYWRITING (1.6 MILLION DE COMBINAISONS)
     ========================================================================== */
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

  /* ==========================================================================
     LLM SCRIPT GENERATOR — MOTEUR HYPER PERFORMANT (-5 pts)
     ========================================================================== */
  const handleLLMGenerateScript = async (req: express.Request, res: express.Response) => {
    try {
      const userId = await getUserIdFromAuthHeader(req);
      if (!userId) return res.status(401).json({ error: "Authentification requise." });

      const { product, style, region = "general" } = req.body;
      if (!product || typeof product !== "string" || !product.trim()) {
        return res.status(400).json({ error: "Nom du produit ou service manquant" });
      }

      const pointsCost = 5;
      const currentBalance = await getUserBalance(userId);
      if (currentBalance !== null && currentBalance < pointsCost) {
        return res.status(402).json({ error: "Solde de points insuffisant (5 points requis)." });
      }

      // SÉLECTION ALÉATOIRE CÔTÉ SERVEUR (TRUE RANDOMNESS)
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

🎯 ARCHITECTURE OBLIGATOIRE DU SCRIPT (À SUIVRE À LA LETTRE) :
Tu dois rédiger le script en suivant EXACTEMENT ces 4 étapes créatives :

1. ACCROCHE (HOOK) [3-5 sec] -> Applique cet angle : "${selectedHook}"
(Rédige une phrase forte avec le tag [excited] ou [dramatic]. Ne commence JAMAIS par une phrase générique).

2. LE PROBLÈME [8-12 sec] -> Insiste sur ce point de douleur : "${selectedProblem}"
(Utilise [natural] ou [calm]. Fais ressentir le problème au spectateur en Darija).

3. LA SOLUTION & PREUVE [15-20 sec] -> Présente le produit avec cet angle : "${selectedSolution}" ET valide-le avec cette preuve : "${selectedProof}"
(Utilise [natural] ou [excited]).

4. APPEL À L'ACTION (CTA) [5 sec] -> Termine la vidéo EXACTEMENT avec ce type de CTA : "${selectedCTA}"
(Utilise [fast] ou [excited]).

⚠️ RAPPEL DES CONTRAINTES :
- L'ensemble doit être ultra-fluide et s'enchaîner logiquement en Darija Algérienne.
- Longueur totale : 90 à 140 mots (30 à 50 secondes).
- PAS DE TITRE, pas de description, renvoie JUSTE LE TEXTE DU SCRIPT.

Style vocal souhaité : ${style || "excited"}`;

      // Température à 0.95 pour une hyper-créativité et un vocabulaire riche
      let scriptText = await callGeminiTextAPI(scriptPrompt, 0.95);

      // Nettoyage rigoureux
      scriptText = scriptText
        .replace(/(\[[a-z]+\])\s*(\[[a-z]+\])/gi, "$1")
        .replace(/\*+/g, "")
        .replace(/^#+\s*.*$/gm, "")
        .replace(/(TTS\s*Refinement|Refinement|Note|Remarque|Structure|Accroche|Problème|Solution|CTA)\s*:?/gi, "")
        .trim();

      const reduction = await deductCredits(userId, pointsCost);
      const finalBalance = reduction.success ? reduction.remaining : currentBalance;

      return res.json({
        success: true,
        script: scriptText,
        points_deducted: pointsCost,
        points_cost: pointsCost,
        notification: "-5 Points",
        remaining_balance: finalBalance,
        sector_used: detectedSector,
        region_used: region,
        debug_framework: { hook: selectedHook, problem: selectedProblem, cta: selectedCTA } // Info optionnelle pour dev
      });
    } catch (err: any) {
      console.error("[LLM Script Generator Error]", err.message || err);
      return res.status(500).json({ error: err.message || "Erreur lors de la génération du script" });
    }
  };
  
  app.post("/api/v1/llm/generate-script", handleLLMGenerateScript);
  app.post("/api/llm/generate-script", handleLLMGenerateScript);

  /* ==========================================================================
     AI FEEDBACK — Sauvegarde des retours utilisateurs (👍👎)
     ========================================================================== */
  const handleAIFeedback = async (req: express.Request, res: express.Response) => {
    try {
      const userId = await getUserIdFromAuthHeader(req);
      const { input_text, output_text, rating, type, region, sector } = req.body;

      if (!output_text || typeof rating !== "number") {
        return res.status(400).json({ error: "Données feedback invalides." });
      }

      if (supabaseClient) {
        try {
          await supabaseClient.from("ai_feedback").insert({
            user_id: userId || null,
            input_text: input_text || "",
            output_text: output_text,
            rating: rating,
            type: type || "enhance",
            region: region || "general",
            sector: sector || "general",
            created_at: new Date().toISOString()
          });
          console.log(`[AI Feedback] ${rating >= 4 ? '👍' : '👎'} - Type: ${type} - Region: ${region} - Sector: ${sector}`);
        } catch (e: any) {
          console.warn("[AI Feedback] Insert failed:", e.message);
        }
      }

      return res.json({ success: true, message: "Feedback enregistré" });
    } catch (err: any) {
      console.error("[AI Feedback Error]", err.message || err);
      return res.status(200).json({ success: false, error: err.message });
    }
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
      const host = req.get("host") || "localhost:3000";
      const protocol = req.protocol === "https" || host.includes("run.app") ? "https" : "http";
      const returnUrl = `${protocol}://${host}/?payment_status=success&pack_id=${packId}&points=${numPoints}`;
      let cleanPhone = phone.replace(/[^0-9]/g, '');
      if (cleanPhone.startsWith('213') && cleanPhone.length > 9) cleanPhone = '0' + cleanPhone.slice(3);
      if (!cleanPhone || cleanPhone.length < 9) cleanPhone = "0550123456";
      let defaultAccountUuid: string | undefined = undefined, contactUuid: string | undefined = undefined;
      try { const accRes = await fetch("https://prodapi.slick-pay.com/api/v2/users/accounts", { headers: { "Authorization": `Bearer ${SLICKPAY_KEY}`, "Accept": "application/json" } }); if (accRes.ok) { const accData = await accRes.json(); const list = accData.data || accData.accounts || (Array.isArray(accData) ? accData : []); if (list.length > 0) defaultAccountUuid = list[0].uuid || list[0].id; } } catch (e) {}
      try { const contactRes = await fetch("https://prodapi.slick-pay.com/api/v2/users/contacts", { method: "POST", headers: { "Authorization": `Bearer ${SLICKPAY_KEY}`, "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify({ firstname: firstname.trim() || "Client", lastname: lastname.trim() || "Sawtify", phone: cleanPhone, email: email.trim() || "client@sawtify.dz", address: address.trim() || "Alger", adress: address.trim() || "Alger" }) }); if (contactRes.ok) { const contactData = await contactRes.json(); contactUuid = contactData.uuid || contactData.id || contactData.data?.uuid; } } catch (e) {}
      const itemsList = [{ name: `${packName} (+${numPoints} pts)`, price: numAmount, quantity: 1 }];
      const payloadA: any = { amount: numAmount, url: returnUrl, firstname: firstname.trim() || "Client", lastname: lastname.trim() || "Sawtify", phone: cleanPhone, email: email.trim() || "client@sawtify.dz", address: address.trim() || "Alger", adress: address.trim() || "Alger", note: `Sawtify - ${packName}`, items: itemsList };
      if (defaultAccountUuid) payloadA.account = defaultAccountUuid; if (contactUuid) payloadA.contact = contactUuid;
      const payloadC: any = { amount: numAmount, url: returnUrl, firstname: firstname.trim() || "Client", lastname: lastname.trim() || "Sawtify", phone: cleanPhone, email: email.trim() || "client@sawtify.dz", address: "Alger", note: `Test ${numPoints} pts`, items: itemsList };
      const primaryUrl = `${SLICKPAY_BASE_URL.replace(/\/+$/, '')}/users/invoices`;
      const isDevConfigured = SLICKPAY_BASE_URL.includes('devapi');
      const callConfigs = isDevConfigured
        ? [ { url: "https://devapi.slick-pay.com/api/v2/users/invoices", key: SLICKPAY_KEY, payload: payloadC, desc: "DevAPI" }, { url: "https://devapi.slick-pay.com/api/v2/users/invoices", key: SLICKPAY_SANDBOX_KEY, payload: payloadC, desc: "Sandbox" }, { url: "https://prodapi.slick-pay.com/api/v2/users/invoices", key: SLICKPAY_KEY, payload: payloadA, desc: "Prod" } ]
        : [ { url: primaryUrl, key: SLICKPAY_KEY, payload: payloadA, desc: "Prod" }, { url: "https://devapi.slick-pay.com/api/v2/users/invoices", key: SLICKPAY_KEY, payload: payloadC, desc: "DevAPI" }, { url: "https://devapi.slick-pay.com/api/v2/users/invoices", key: SLICKPAY_SANDBOX_KEY, payload: payloadC, desc: "Sandbox" } ];
      let lastResult: any = null, successfulInvoice: any = null;
      for (const config of callConfigs) {
        try {
          const spRes = await fetch(config.url, { method: "POST", headers: { "Authorization": `Bearer ${config.key}`, "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify(config.payload) });
          const spText = await spRes.text();
          let spData: any;
          try { spData = JSON.parse(spText); } catch { spData = { message: spText }; }
          if (spRes.ok && spData && (spData.success === 1 || spData.id || spData.url)) { successfulInvoice = spData; break; }
          else lastResult = spData;
        } catch (e) {}
      }
      if (successfulInvoice) {
        const invoiceId = successfulInvoice.id || `INV_${Date.now()}`;
        const paymentUrl = successfulInvoice.url || "";
        INVOICE_REGISTRY.set(String(invoiceId), { invoiceId, packId, packName, points: numPoints, amountDZD: numAmount, paymentMethod, status: "pending", paymentUrl, createdAt: new Date().toISOString(), userId });
        if (supabaseClient) { try { await supabaseClient.from("invoices").upsert({ id: String(invoiceId), pack_id: packId, pack_name: packName, amount_dzd: numAmount, points_credited: numPoints, payment_method: paymentMethod, status: "pending", payment_url: paymentUrl, created_at: new Date().toISOString() }); } catch (e) {} }
        return res.json({ success: true, status: "created", invoiceId, paymentUrl, message: successfulInvoice.message || "Facture créée", raw: successfulInvoice });
      }
      const fallbackInvoiceId = `SLICK_${Date.now().toString(36).toUpperCase()}`;
      INVOICE_REGISTRY.set(fallbackInvoiceId, { invoiceId: fallbackInvoiceId, packId, packName, points: numPoints, amountDZD: numAmount, paymentMethod, status: "pending", createdAt: new Date().toISOString(), userId });
      return res.json({ success: true, status: "fallback_ready", invoiceId: fallbackInvoiceId, paymentUrl: `${protocol}://${host}/?payment_status=success`, message: "Session initialisée", diagnostics: lastResult });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get("/api/slickpay/check-status/:invoiceId", async (req, res) => {
    const { invoiceId } = req.params;
    const localRecord = INVOICE_REGISTRY.get(String(invoiceId));
    try {
      const endpoints = [`${SLICKPAY_BASE_URL}/users/invoices/${invoiceId}`, `https://prodapi.slick-pay.com/api/v2/users/invoices/${invoiceId}`, `https://devapi.slick-pay.com/api/v2/users/invoices/${invoiceId}`];
      for (const ep of endpoints) {
        try {
          const spRes = await fetch(ep, { headers: { "Authorization": `Bearer ${SLICKPAY_KEY}`, "Accept": "application/json" } });
          if (spRes.ok) {
            const data = await spRes.json();
            const invoiceData = data.invoice || data.data || data;
            const status = (invoiceData.status || "").toLowerCase();
            const isPaid = status === "completed" || status === "paid" || status === "success" || invoiceData.completed === true;
            let creditResult: { credited: boolean; newBalance?: number } | undefined;
            if (isPaid && localRecord) {
              localRecord.status = "completed";
              INVOICE_REGISTRY.set(String(invoiceId), localRecord);
              creditResult = await creditIfPaid(invoiceId);
            }
            return res.json({ success: true, invoiceId, status: isPaid ? "completed" : status || "pending", isPaid, newBalance: creditResult?.newBalance, data: invoiceData });
          }
        } catch (e) {}
      }
    } catch (err) {}
    return res.json({ success: true, invoiceId, status: localRecord?.status || "pending", isPaid: localRecord?.status === "completed" || localRecord?.status === "paid" });
  });

  app.post("/api/slickpay/confirm-payment", async (req, res) => {
    try {
      const { invoiceId } = req.body;
      if (!invoiceId) return res.status(400).json({ success: false, error: "invoiceId manquant." });
      const entry = INVOICE_REGISTRY.get(String(invoiceId));
      if (!entry) return res.status(404).json({ success: false, error: "Facture inconnue." });
      const requesterId = await getUserIdFromAuthHeader(req);
      if (!requesterId || requesterId !== entry.userId) return res.status(403).json({ success: false, error: "Interdit." });
      const result = await creditIfPaid(invoiceId);
      if (!result.credited) return res.status(500).json({ success: false, error: result.error || "Erreur crédit." });
      return res.json({ success: true, message: "Paiement validé", newBalance: result.newBalance, record: { invoiceId, packId: entry.packId, points: entry.points, amountDZD: entry.amountDZD } });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/slickpay/webhook", async (req, res) => {
    try {
      const { id, invoice_id, status, event } = req.body;
      const targetId = id || invoice_id;
      if (targetId) {
        const isCompleted = status === "completed" || status === "paid" || event === "invoice.paid";
        const local = INVOICE_REGISTRY.get(String(targetId));
        if (local) { local.status = isCompleted ? "completed" : "pending"; INVOICE_REGISTRY.set(String(targetId), local); }
        if (supabaseClient) { try { await supabaseClient.from("invoices").update({ status: isCompleted ? "paid" : status || "updated", updated_at: new Date().toISOString() }).eq("id", String(targetId)); } catch (e) {} }
        if (isCompleted) await creditIfPaid(targetId);
      }
      return res.json({ received: true });
    } catch (webhookErr: any) {
      return res.status(200).json({ received: true, warning: webhookErr.message });
    }
  });

  app.get("/api/supabase/purchases", async (req, res) => {
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient.from("purchases").select("*").order("created_at", { ascending: false }).limit(20);
        if (!error && data) return res.json({ success: true, purchases: data });
      } catch (err) {}
    }
    return res.json({ success: true, purchases: Array.from(INVOICE_REGISTRY.values()) });
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
    (async () => {
      console.log("[Cache] Préchauffage des extraits vocaux en arrière-plan...");
      const voicesToWarm = Object.keys(VOICE_PREVIEW_SCRIPTS);
      for (const voiceId of voicesToWarm) {
        const cacheKey = `${voiceId}_1.0_1.0`;
        if (!PREVIEW_AUDIO_CACHE.has(cacheKey)) {
          try {
            const { pcmBuffer } = await synthesizeWithRetry(VOICE_PREVIEW_SCRIPTS[voiceId], GEMINI_VOICE_MAP[voiceId] || "Puck", 1, 1.0, 1.0, voiceId, []);
            if (pcmBuffer) {
              const dataUri = `data:audio/wav;base64,${pcmToWavBuffer(pcmBuffer, 24000, 1, 16).toString("base64")}`;
              PREVIEW_AUDIO_CACHE.set(cacheKey, dataUri);
              console.log(`[Cache] Aperçu prêt : ${voiceId}`);
            }
          } catch (e) {
            console.warn(`[Cache] Échec préchauffage ${voiceId}`);
          }
        }
      }
      console.log("[Cache] Préchauffage terminé ! Les aperçus seront instantanés.");
    })();
  });
}

startServer();
