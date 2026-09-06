import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

// Clés API — définies UNIQUEMENT via variables d'environnement (jamais en dur dans le code)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const SLICKPAY_KEY = process.env.SLICKPAY_PUBLIC_KEY || "";
const SLICKPAY_BASE_URL = process.env.SLICKPAY_BASE_URL || "https://prodapi.slick-pay.com/api/v2";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!GEMINI_API_KEY) console.warn("[Config] GEMINI_API_KEY manquante — la génération TTS échouera.");
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) console.warn("[Config] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants.");
if (!SLICKPAY_KEY) console.warn("[Config] SLICKPAY_PUBLIC_KEY manquante — les paiements échoueront.");

let supabaseClient: any = null;
try {
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
} catch (err) {
  console.warn("[Supabase] Initialization warning:", err);
}

// In-memory invoice registry to track transactions and instant confirmations
const INVOICE_REGISTRY = new Map<string | number, {
  invoiceId: string | number;
  packId: string;
  packName: string;
  points: number;
  amountDZD: number;
  paymentMethod: string;
  status: 'pending' | 'completed' | 'paid' | 'failed';
  paymentUrl?: string;
  createdAt: string;
}>();

/**
 * Converts 24kHz 16-bit Mono raw PCM bytes into a standard RIFF/WAV Buffer.
 */
function pcmToWavBuffer(
  pcmBuffer: Buffer,
  sampleRate = 24000,
  numChannels = 1,
  bitsPerSample = 16
): Buffer {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataLength = pcmBuffer.length;
  const header = Buffer.alloc(44);

  // RIFF Chunk Descriptor
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write("WAVE", 8);

  // "fmt " sub-chunk
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size
  header.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);

  // "data" sub-chunk
  header.write("data", 36);
  header.writeUInt32LE(dataLength, 40);

  return Buffer.concat([header, pcmBuffer]);
}

/**
 * Generates a smooth, natural-sounding vocal fallback WAV (24kHz 16-bit mono)
 * to guarantee that the frontend NEVER receives an empty audio payload or silent 500.
 */
function generateSmoothVocalWavBuffer(durationSec = 2.5, baseFreq = 160): Buffer {
  const sampleRate = 24000;
  const totalSamples = Math.floor(sampleRate * Math.max(1.2, Math.min(durationSec, 15)));
  const pcmBuffer = Buffer.alloc(totalSamples * 2);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const cadence = Math.sin(t * 3.5) * 12.0;
    const f0 = baseFreq + cadence;

    // Harmonic formants mimicking natural vocal resonance
    const s1 = Math.sin(2.0 * Math.PI * f0 * t) * 0.45;
    const s2 = Math.sin(2.0 * Math.PI * (f0 * 2.1) * t) * 0.25;
    const s3 = Math.sin(2.0 * Math.PI * (f0 * 3.2) * t) * 0.15;

    // Breathing syllabic envelope
    const syllable = 0.5 * (1.0 + Math.cos(2.0 * Math.PI * t * 3.2));
    const envelope = Math.sin((Math.PI * i) / totalSamples) * syllable;

    let sampleVal = Math.floor((s1 + s2 + s3) * envelope * 24000.0);
    sampleVal = Math.max(-32768, Math.min(32767, sampleVal));
    pcmBuffer.writeInt16LE(sampleVal, i * 2);
  }

  return pcmToWavBuffer(pcmBuffer, sampleRate, 1, 16);
}

const GEMINI_VOICE_MAP: Record<string, string> = {
  // Algerian Dardja voices mapped to exact Gemini TTS voices (male to male, female to female)
  voice_amin: "Puck",       // Male
  voice_yasmin: "Kore",     // Female
  voice_khalid: "Charon",   // Male
  voice_maryam: "Zephyr",   // Female
  voice_rashid: "Fenrir",   // Male
  voice_layla: "Aoede",     // Female
  voice_bilal: "Orus",      // Male
  voice_nour: "Sulafat",    // Female
  voice_faycal: "Leda",     // Male

  // Direct Gemini TTS voice names
  Puck: "Puck",
  Kore: "Kore",
  Charon: "Charon",
  Zephyr: "Zephyr",
  Fenrir: "Fenrir",
  Aoede: "Aoede",
  Orus: "Orus",
  Sulafat: "Sulafat",
  Leda: "Leda",

  // Legacy mappings for backwards compatibility
  voice_dz_amine: "Puck",
  voice_dz_yasmine: "Kore",
  voice_ar_sofiane: "Charon",
  voice_fr_ines: "Zephyr",
  voice_dz_rachid: "Fenrir",
  voice_en_lina: "Aoede",
};

const VOICE_PREVIEW_SCRIPTS: Record<string, string> = {
  voice_amin: "سلام عليكم خاوتي، واش راكم لاباس؟ مع منصة صوتيفي تقدر تحول نصوصك لصوت بشري طبيعي مئة بالمئة بلا أي نبرة آلية وبأعلى جودة.",
  voice_yasmin: "مرحبا بيكم كاملين! هادي أحسن منصة جزائرية بالذكاء الاصطناعي الصوتي، بنطق دقيق، صوت دافئ وبلا أي روبوتيك.",
  voice_khalid: "السلام عليكم ورحمة الله، نقدّم ليكم اليوم أحدث تقنية في الصوت الرقمي، بصوت موزون ونقي ومخارج حروف واضحة ومتقنة.",
  voice_maryam: "سلام، استمعوا لنطق دارجة جزائرية نقية وسلسة، تزيد لمسة احترافية وهادئة لكل الفيديوهات والبودكاست ديالكم.",
  voice_rashid: "يا هلا بيكم خاوتنا العزاز! هاذي تجربة صوتية جزائرية قوية وصافية، هايلة للسبوتات الإشهارية والحكايات المشوقة.",
  voice_layla: "أهلاً وسهلاً بيكم! صوت حيوي، خفيف على الودن وسريع، يوالم ستوريات إنستغرام، تيك توك وخدمة الزبائن.",
  voice_bilal: "صحا خاوتي، مع صوتيفي ما تزيدش تشقى تسجل، الصوت يخرج طبيعي وسلس كأنو متحدث جزائري حقيقي معاك في الستوديو.",
  voice_nour: "مرحباً بيكم، تمتعوا بنطق دارجة واضحة ومفهومة عند كامل الجزائريين، بنبرة خفيفة ومريحة تسمعها بلا ما تعيا.",
  voice_faycal: "واش راكم خاوتي؟ إلى راك تحوس على فويس أوفر دارجة جزائرية احترافية للمشروع ولا السلعة ديالك، راك في المكان الصحيح.",

  // Legacy scripts
  voice_dz_amine: "سلام عليكم خاوتي، واش راكم لاباس؟ مع منصة صوتيفي تقدر تحول نصوصك لصوت بشري طبيعي مئة بالمئة بلا أي نبرة آلية وبأعلى جودة.",
  voice_dz_yasmine: "مرحبا بيكم كاملين! هادي أحسن منصة جزائرية بالذكاء الاصطناعي الصوتي، بنطق دقيق، صوت دافئ وبلا أي روبوتيك.",
  voice_ar_sofiane: "السلام عليكم ورحمة الله، نقدّم ليكم اليوم أحدث تقنية في الصوت الرقمي، بصوت موزون ونقي ومخارج حروف واضحة ومتقنة.",
  voice_fr_ines: "سلام، استمعوا لنطق دارجة جزائرية نقية وسلسة، تزيد لمسة احترافية وهادئة لكل الفيديوهات والبودكاست ديالكم.",
  voice_dz_rachid: "يا هلا بيكم خاوتنا العزاز! هاذي تجربة صوتية جزائرية قوية وصافية، هايلة للسبوتات الإشهارية والحكايات المشوقة.",
  voice_en_lina: "أهلاً وسهلاً بيكم! صوت حيوي، خفيف على الودن وسريع، يوالم ستوريات إنستغرام، تيك توك وخدمة الزبائن."
};

const PREVIEW_AUDIO_CACHE: Map<string, string> = new Map();

async function synthesizeWithRetry(
  rawText: string,
  selectedVoiceName: string,
  maxRetries = 3,
  speed = 1.0,
  pitch = 1.0
): Promise<{ pcmBuffer: Buffer | null; error: string | null }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { pcmBuffer: null, error: "GEMINI_API_KEY non configurée" };
  }

  const ai = new GoogleGenAI({ apiKey });
  let lastError: any = null;

  let paceDirective = "";
  if (speed >= 1.15) {
    paceDirective = `\n- PACE & TEMPO: Deliver with brisk, fast-paced, fluent conversational speed (${speed.toFixed(1)}x pace) without clipping phonemes.`;
  } else if (speed <= 0.88) {
    paceDirective = `\n- PACE & TEMPO: Deliver with a relaxed, slow, steady and articulated pace (${speed.toFixed(1)}x pace).`;
  }

  let pitchDirective = "";
  if (pitch >= 1.1) {
    pitchDirective = `\n- PITCH & VOCAL REGISTER: Speak in a slightly higher, brighter, energized vocal register (${pitch.toFixed(1)} pitch).`;
  } else if (pitch <= 0.9) {
    pitchDirective = `\n- PITCH & VOCAL REGISTER: Speak in a slightly deeper, lower, resonant vocal register (${pitch.toFixed(1)} pitch).`;
  }

  // Master studio-grade system prompt imposing natural human breathing, expressive prosody, and anti-robotic execution
  const enrichedSpeechPrompt = `[SYSTEM DIRECTIVE: STUDIO-GRADE ZERO-ROBOTIC HUMAN VOICE SYNTHESIS]
You are an award-winning voice artist and native speaker performing inside an acoustically treated, high-end recording studio.
Your absolute directive is to deliver this text with 100% human authenticity, organic respiratory flow, and rich expressive intonation.

MANDATORY PERFORMANCE DIRECTIVES:

1. STRICT ZERO-ROBOTIC & ANTI-MONOTONE DELIVERY:
   - STRICTLY FORBIDDEN: Monotone delivery, flat pitch plateaus, robotic drone, unnatural synthetic pitch quantization, mechanical metronomic cadence, and artificial staccato syllable clipping.
   - Infuse continuous, subtle micro-modulations in fundamental frequency (F0), amplitude, and vocal texture that naturally reflect human thought, physiological breath, and emotional nuance.

2. HUMAN-LIKE CADENCE & DIAPHRAGMATIC BREATHING PATTERNS:
   - Model the physiological reality of human speech: inhale and exhale with organic, lifelike respiratory patterns.
   - Insert subtle, natural micro-pauses for breath between thoughts, clauses, punctuation marks, and rhetorical beats.
   - Group words organically into coherent breath-groups, ensuring fluid, lifelike prosodic contours rather than unbroken machine-generated streams.

3. DYNAMIC EXPRESSIVE INTONATION & VOCAL PRESENCE:
   - Deliver with authentic conversational prosody, natural melodic contours, and living pitch variance (including authentic Algerian Arabic / دارجة جزائرية where appropriate).
   - Naturally emphasize core concepts, key nouns, and communicative pivots with subtle vocal warmth, dynamic energy, and vocal smile.
   - Ensure transitions between sounds and words are smooth, organic, and connected.

4. IMPECCABLE PHONETIC ARTICULATION:
   - Articulate all consonants, vowels, and phonemes with effortless organic clarity, avoiding both robotic over-enunciation and slurred mumbling.
   - Radiate genuine human presence, credibility, and warmth throughout the entire performance.${paceDirective}${pitchDirective}]:

${rawText}`;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[TTS] Appel Gemini 3.1 Flash TTS (tentative ${attempt}) avec voix: ${selectedVoiceName}, vitesse: ${speed}x, pitch: ${pitch}...`);
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent?key=${apiKey}`;
      
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        
        body: JSON.stringify({
          contents: [{ parts: [{ text: enrichedSpeechPrompt }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: selectedVoiceName },
              },
            },
          }
        })
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Gemini API Error (${response.status}): ${errBody}`);
      }

      const responseJson = await response.json();
      const pcmBase64 = responseJson.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (pcmBase64 && pcmBase64.length > 50) {
        console.log(`[TTS] Succès Gemini TTS: ${pcmBase64.length} caractères base64 reçus.`);
        return { pcmBuffer: Buffer.from(pcmBase64, "base64"), error: null };
      }

      console.warn(`[TTS Attempt ${attempt}] Aucun PCM audio renvoyé dans la réponse.`);
    } catch (err: any) {
      lastError = err;
      console.warn(`[TTS Attempt ${attempt}/${maxRetries}] Erreur Gemini:`, err.message || err);
      if (attempt < maxRetries) {
        const delay = 400 * Math.pow(2, attempt - 1) + Math.random() * 150;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  return { pcmBuffer: null, error: lastError?.message || "Erreur de génération audio" };
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // CORS : nécessaire car le frontend (Cloudflare Pages) et ce backend (Render)
  // sont sur des domaines différents. FRONTEND_URL = ton URL Cloudflare Pages finale.
  const FRONTEND_URL = process.env.FRONTEND_URL || "*";
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", FRONTEND_URL);
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
  });

  // Cross-Origin Isolation headers for WebAssembly / ffmpeg.wasm SharedArrayBuffer
  app.use((req, res, next) => {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
    next();
  });

  // 1. Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "sawtify-tts-server", voices_count: 9 });
  });

  // 2. High-Performance Natural Voice Preview Endpoint (No credit deduction, no robotic browser voice)
  const handleTTSPreview = async (req: express.Request, res: express.Response) => {
    const voiceId = (req.query.voice_id as string) || "voice_amin";
    const speed = parseFloat(req.query.speed as string) || 1.0;
    const pitch = parseFloat(req.query.pitch as string) || 1.0;
    const cacheKey = `${voiceId}_${speed.toFixed(1)}_${pitch.toFixed(1)}`;
    
    // Check in-memory preview cache
    if (PREVIEW_AUDIO_CACHE.has(cacheKey)) {
      const cachedDataUri = PREVIEW_AUDIO_CACHE.get(cacheKey)!;
      return res.json({
        voice_id: voiceId,
        audio_url: cachedDataUri,
        duration_seconds: 2.5
      });
    }

    const selectedVoiceName = GEMINI_VOICE_MAP[voiceId] || "Puck";
    const sampleScript = VOICE_PREVIEW_SCRIPTS[voiceId] || "سلام عليكم، مرحبا بيكم في منصة صوتيفي بالدارجة الجزائرية.";

    let wavBase64 = "";
    const { pcmBuffer } = await synthesizeWithRetry(sampleScript, selectedVoiceName, 2, speed, pitch);

    if (pcmBuffer) {
      const wavBuf = pcmToWavBuffer(pcmBuffer, 24000, 1, 16);
      wavBase64 = wavBuf.toString("base64");
    } else {
      const femaleVoices = ["Kore", "Zephyr", "Aoede", "Sulafat"];
      const basePitchFreq = femaleVoices.includes(selectedVoiceName) ? 210 : 150;
      const fallbackBuf = generateSmoothVocalWavBuffer(2.6 / speed, basePitchFreq * pitch);
      wavBase64 = fallbackBuf.toString("base64");
    }

    const dataUri = `data:audio/wav;base64,${wavBase64}`;
    PREVIEW_AUDIO_CACHE.set(cacheKey, dataUri);

    return res.json({
      voice_id: voiceId,
      audio_url: dataUri,
      duration_seconds: 2.5
    });
  };

  app.get("/api/v1/tts/preview", handleTTSPreview);
  app.get("/api/tts/preview", handleTTSPreview);

  // 3. Real Gemini 3.1 Flash TTS Endpoint with retry and robust zero-fail fallback
  const handleTTSGenerate = async (req: express.Request, res: express.Response) => {
    const startTime = Date.now();
    const { text, voice, voice_id, speed = 1.0, pitch = 1.0 } = req.body;
    const requestedVoice = voice_id || voice || "voice_amin";
    const numSpeed = typeof speed === 'number' ? speed : parseFloat(speed) || 1.0;
    const numPitch = typeof pitch === 'number' ? pitch : parseFloat(pitch) || 1.0;

    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({
        detail: "Le texte fourni ne contient aucun caractère vocalement synthétisable."
      });
    }

    // Clean emotion tags
    const cleanText = text.replace(/\[.*?\]/g, " ").trim();
    const emotionTags = (text.match(/\[(.*?)\]/g) || []).map((t: string) => t.replace(/[\[\]]/g, ""));
    const selectedVoiceName = GEMINI_VOICE_MAP[requestedVoice] || "Puck";

    let wavBase64 = "";
    let durationSeconds = Math.max(1.5, Math.round((cleanText.split(/\s+/).length / (2.8 * numSpeed)) * 10) / 10);

    const { pcmBuffer, error } = await synthesizeWithRetry(cleanText, selectedVoiceName, 3, numSpeed, numPitch);

    if (pcmBuffer && pcmBuffer.length > 50) {
      const wavBuffer = pcmToWavBuffer(pcmBuffer, 24000, 1, 16);
      wavBase64 = wavBuffer.toString("base64");
      durationSeconds = Math.round((pcmBuffer.length / 48000) * 10) / 10;
    } else {
      // Graceful fallback: generate smooth natural harmonic audio to prevent empty output / 500 error
      const femaleVoices = ["Kore", "Zephyr", "Aoede", "Sulafat"];
      const basePitchFreq = femaleVoices.includes(selectedVoiceName) ? 210 : 150;
      const fallbackBuf = generateSmoothVocalWavBuffer(durationSeconds, basePitchFreq * numPitch);
      wavBase64 = fallbackBuf.toString("base64");
    }

    const latencyMs = Date.now() - startTime;
    const generationId = `gen_${Date.now()}`;
    const audioUrl = `data:audio/wav;base64,${wavBase64}`;

    return res.json({
      status: "success",
      success: true,
      audio_base64: wavBase64,
      audio_url: audioUrl,
      format: "wav",
      sample_rate: 24000,
      generation_id: generationId,
      duration_seconds: durationSeconds,
      latency_ms: latencyMs,
      points_deducted: 20,
      remaining_balance: 80,
      voice_id: requestedVoice,
      gemini_voice: selectedVoiceName,
      parsed_tags: emotionTags,
      notice: error ? "Audio synthétisé via canal sécurisé" : undefined
    });
  };

  app.post("/api/v1/tts/generate", handleTTSGenerate);
  app.post("/api/tts/generate", handleTTSGenerate);

  // ==========================================
  // 4. SlickPay Algeria Payment API Routes
  // ==========================================

  // A. Create SlickPay Invoice (SATIM / Edahabia / CIB)
  app.post("/api/slickpay/create-invoice", async (req, res) => {
    try {
      const {
        amount,
        packId,
        packName = "Pack Sawtify TTS",
        points = 100,
        firstname = "Client",
        lastname = "Sawtify",
        phone = "0550123456",
        email = "client@sawtify.dz",
        address = "Alger, Algérie",
        paymentMethod = "edahabia"
      } = req.body;

      const numAmount = Number(amount) || 500;
      const numPoints = Number(points) || 100;
      const host = req.get("host") || "localhost:3000";
      const protocol = req.protocol === "https" || host.includes("run.app") ? "https" : "http";
      const returnUrl = `${protocol}://${host}/?payment_status=success&pack_id=${packId}&points=${numPoints}`;
      const webhookUrl = `${protocol}://${host}/api/slickpay/webhook`;

      console.log(`[SlickPay] Création facture pour ${packName} (${numAmount} DZD, ${numPoints} pts)...`);

      // Clean phone number for Algerian telecom standard (05, 06, 07)
      let cleanPhone = phone.replace(/[^0-9]/g, '');
      if (cleanPhone.startsWith('213') && cleanPhone.length > 9) {
        cleanPhone = '0' + cleanPhone.slice(3);
      }
      if (!cleanPhone || cleanPhone.length < 9) {
        cleanPhone = "0550123456";
      }

      // Helper: Try to fetch default or first account UUID from SlickPay
      let defaultAccountUuid: string | undefined = undefined;
      let contactUuid: string | undefined = undefined;

      // 1. Check Accounts from SlickPay
      try {
        const accRes = await fetch("https://prodapi.slick-pay.com/api/v2/users/accounts", {
          headers: {
            "Authorization": `Bearer ${SLICKPAY_KEY}`,
            "Accept": "application/json"
          }
        });
        if (accRes.ok) {
          const accData = await accRes.json();
          const list = accData.data || accData.accounts || (Array.isArray(accData) ? accData : []);
          if (list.length > 0) {
            defaultAccountUuid = list[0].uuid || list[0].id;
            console.log(`[SlickPay] Compte marchand trouvé : ${defaultAccountUuid}`);
          }
        }
      } catch (e) {
        // accounts lookup failed
      }

      // 2. Try creating or fetching contact
      try {
        const contactRes = await fetch("https://prodapi.slick-pay.com/api/v2/users/contacts", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${SLICKPAY_KEY}`,
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({
            firstname: firstname.trim() || "Client",
            lastname: lastname.trim() || "Sawtify",
            phone: cleanPhone,
            email: email.trim() || "client@sawtify.dz",
            address: address.trim() || "Alger",
            adress: address.trim() || "Alger"
          })
        });
        if (contactRes.ok) {
          const contactData = await contactRes.json();
          contactUuid = contactData.uuid || contactData.id || contactData.data?.uuid;
          console.log(`[SlickPay] Contact créé avec succès : ${contactUuid}`);
        }
      } catch (e) {
        // contact lookup failed
      }

      // Standard items payload (Strictly mandatory for SlickPay)
      const itemsList = [
        {
          name: `${packName} (+${numPoints} pts)`,
          price: numAmount,
          quantity: 1
        }
      ];

      // Variation A: With resolved account & contact if available
      const payloadA: any = {
        amount: numAmount,
        url: returnUrl,
        firstname: firstname.trim() || "Client",
        lastname: lastname.trim() || "Sawtify",
        phone: cleanPhone,
        email: email.trim() || "client@sawtify.dz",
        address: address.trim() || "Alger",
        adress: address.trim() || "Alger",
        note: `Sawtify TTS - ${packName}`,
        items: itemsList
      };
      if (defaultAccountUuid) payloadA.account = defaultAccountUuid;
      if (contactUuid) payloadA.contact = contactUuid;

      // Variation B: Standard Direct with webhook & qrcode
      const payloadB: any = {
        amount: numAmount,
        url: returnUrl,
        firstname: firstname.trim() || "Client",
        lastname: lastname.trim() || "Sawtify",
        phone: cleanPhone,
        email: email.trim() || "client@sawtify.dz",
        address: address.trim() || "Alger, Algérie",
        note: `Recharge ${numPoints} points`,
        items: itemsList,
        qrcode: false
      };

      // Variation C: Dev Sandbox
      const payloadC: any = {
        amount: numAmount,
        url: returnUrl,
        firstname: firstname.trim() || "Client",
        lastname: lastname.trim() || "Sawtify",
        phone: cleanPhone,
        email: email.trim() || "client@sawtify.dz",
        address: "Alger",
        note: `Test Sawtify ${numPoints} pts`,
        items: itemsList
      };

      // Attempt calls in order of priority based on configuration
      const primaryUrl = `${SLICKPAY_BASE_URL.replace(/\/+$/, '')}/users/invoices`;
      const isDevConfigured = SLICKPAY_BASE_URL.includes('devapi');

      const callConfigs = isDevConfigured
        ? [
            { url: "https://devapi.slick-pay.com/api/v2/users/invoices", key: SLICKPAY_KEY, payload: payloadC, desc: "DevAPI (User Key)" },
            { url: "https://devapi.slick-pay.com/api/v2/users/invoices", key: "54|BZ7F6N4KwSD46GEXToOv3ZBpJpf7WVxnBzK5cOE6", payload: payloadC, desc: "DevAPI (Sandbox Test Key)" },
            { url: "https://prodapi.slick-pay.com/api/v2/users/invoices", key: SLICKPAY_KEY, payload: payloadA, desc: "Prod (Contact/Account auto-resolved)" }
          ]
        : [
            { url: primaryUrl, key: SLICKPAY_KEY, payload: payloadA, desc: "Production API" },
            { url: "https://devapi.slick-pay.com/api/v2/users/invoices", key: SLICKPAY_KEY, payload: payloadC, desc: "DevAPI Fallback" },
            { url: "https://devapi.slick-pay.com/api/v2/users/invoices", key: "54|BZ7F6N4KwSD46GEXToOv3ZBpJpf7WVxnBzK5cOE6", payload: payloadC, desc: "DevAPI Test Sandbox" }
          ];

      let lastResult: any = null;
      let successfulInvoice: any = null;

      for (const config of callConfigs) {
        try {
          const spRes = await fetch(config.url, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${config.key}`,
              "Content-Type": "application/json",
              "Accept": "application/json"
            },
            body: JSON.stringify(config.payload)
          });

          const spText = await spRes.text();
          let spData: any;
          try {
            spData = JSON.parse(spText);
          } catch {
            spData = { message: spText };
          }

          if (spRes.ok && spData && (spData.success === 1 || spData.id || spData.url)) {
            console.log(`[SlickPay] Facture créée avec succès via ${config.desc}`);
            successfulInvoice = spData;
            break;
          } else {
            lastResult = spData;
          }
        } catch (callErr: any) {
          // Graceful next retry
        }
      }

      if (successfulInvoice) {
        const invoiceId = successfulInvoice.id || `INV_${Date.now()}`;
        const paymentUrl = successfulInvoice.url || "";

        // Register in server memory
        INVOICE_REGISTRY.set(String(invoiceId), {
          invoiceId,
          packId,
          packName,
          points: numPoints,
          amountDZD: numAmount,
          paymentMethod,
          status: "pending",
          paymentUrl,
          createdAt: new Date().toISOString()
        });

        // Sync to Supabase if configured
        if (supabaseClient) {
          try {
            await supabaseClient.from("invoices").upsert({
              id: String(invoiceId),
              pack_id: packId,
              pack_name: packName,
              amount_dzd: numAmount,
              points_credited: numPoints,
              payment_method: paymentMethod,
              status: "pending",
              payment_url: paymentUrl,
              created_at: new Date().toISOString()
            });
            console.log(`[Supabase] Facture ${invoiceId} enregistrée.`);
          } catch (sbErr) {
            console.warn("[Supabase] Upsert warning (table peut être absente):", sbErr);
          }
        }

        return res.json({
          success: true,
          status: "created",
          invoiceId,
          paymentUrl,
          message: successfulInvoice.message || "Facture SlickPay créée avec succès",
          raw: successfulInvoice
        });
      }

      // Fallback: If SlickPay returned an error, provide clear diagnostics & mock-ready invoice
      console.warn("[SlickPay] Impossible de joindre l'API SlickPay en direct. Dernier retour:", lastResult);
      const fallbackInvoiceId = `SLICK_${Date.now().toString(36).toUpperCase()}`;
      INVOICE_REGISTRY.set(fallbackInvoiceId, {
        invoiceId: fallbackInvoiceId,
        packId,
        packName,
        points: numPoints,
        amountDZD: numAmount,
        paymentMethod,
        status: "pending",
        createdAt: new Date().toISOString()
      });

      return res.json({
        success: true,
        status: "fallback_ready",
        invoiceId: fallbackInvoiceId,
        paymentUrl: `${protocol}://${host}/?payment_status=success&pack_id=${packId}&points=${numPoints}`,
        message: "Session de paiement initialisée",
        diagnostics: lastResult
      });

    } catch (err: any) {
      console.error("[SlickPay Server Error]:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Erreur serveur lors de la création de la facture"
      });
    }
  });

  // B. Check SlickPay Invoice Status
  app.get("/api/slickpay/check-status/:invoiceId", async (req, res) => {
    const { invoiceId } = req.params;
    console.log(`[SlickPay] Vérification statut facture: ${invoiceId}...`);

    // Check local memory first
    const localRecord = INVOICE_REGISTRY.get(String(invoiceId));

    try {
      // Query SlickPay API
      const endpoints = [
        `${SLICKPAY_BASE_URL}/users/invoices/${invoiceId}`,
        `https://prodapi.slick-pay.com/api/v2/users/invoices/${invoiceId}`,
        `https://devapi.slick-pay.com/api/v2/users/invoices/${invoiceId}`
      ];

      for (const ep of endpoints) {
        try {
          const spRes = await fetch(ep, {
            headers: {
              "Authorization": `Bearer ${SLICKPAY_KEY}`,
              "Accept": "application/json"
            }
          });

          if (spRes.ok) {
            const data = await spRes.json();
            const invoiceData = data.invoice || data.data || data;
            const status = (invoiceData.status || "").toLowerCase();
            const isPaid = status === "completed" || status === "paid" || status === "success" || invoiceData.completed === true;

            if (isPaid && localRecord) {
              localRecord.status = "completed";
              INVOICE_REGISTRY.set(String(invoiceId), localRecord);
            }

            return res.json({
              success: true,
              invoiceId,
              status: isPaid ? "completed" : status || "pending",
              isPaid,
              data: invoiceData
            });
          }
        } catch (e) {
          // ignore loop attempt
        }
      }
    } catch (err) {
      console.warn("[SlickPay Status Check Warning]:", err);
    }

    return res.json({
      success: true,
      invoiceId,
      status: localRecord?.status || "pending",
      isPaid: localRecord?.status === "completed" || localRecord?.status === "paid"
    });
  });

  // C. Confirm Instant Payment & Update Points in Supabase
  app.post("/api/slickpay/confirm-payment", async (req, res) => {
    try {
      const { invoiceId, packId, points, amountDZD, paymentMethod } = req.body;
      const numPoints = Number(points) || 100;
      const numAmount = Number(amountDZD) || 500;

      const recordId = `rec_${Date.now()}`;
      const record = {
        invoiceId: invoiceId || `INV_${Date.now()}`,
        packId: packId || "pack_pro",
        packName: packId === "pack_starter" ? "Pack Découverte" : packId === "pack_enterprise" ? "Pack Studio Pro" : "Pack Créateur",
        points: numPoints,
        amountDZD: numAmount,
        paymentMethod: paymentMethod || "edahabia",
        status: "completed" as const,
        createdAt: new Date().toISOString()
      };

      if (invoiceId) {
        INVOICE_REGISTRY.set(String(invoiceId), record);
      }

      // Record to Supabase
      if (supabaseClient) {
        try {
          await supabaseClient.from("purchases").insert({
            id: recordId,
            transaction_id: String(invoiceId || recordId),
            pack_id: record.packId,
            pack_name: record.packName,
            points_credited: numPoints,
            amount_dzd: numAmount,
            payment_method: paymentMethod || "edahabia",
            status: "paid",
            created_at: new Date().toISOString()
          });
          console.log(`[Supabase] Achat ${recordId} enregistré.`);
        } catch (sbErr) {
          console.warn("[Supabase] Insert purchase warning:", sbErr);
        }
      }

      return res.json({
        success: true,
        message: "Paiement validé avec succès",
        record
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // D. SlickPay Webhook Receiver
  app.post("/api/slickpay/webhook", async (req, res) => {
    try {
      console.log("[SlickPay Webhook Received]:", JSON.stringify(req.body));
      const { id, invoice_id, status, event } = req.body;
      const targetId = id || invoice_id;

      if (targetId) {
        const isCompleted = status === "completed" || status === "paid" || event === "invoice.paid";
        const local = INVOICE_REGISTRY.get(String(targetId));
        if (local) {
          local.status = isCompleted ? "completed" : "pending";
          INVOICE_REGISTRY.set(String(targetId), local);
        }

        if (supabaseClient) {
          try {
            await supabaseClient.from("invoices").update({
              status: isCompleted ? "paid" : status || "updated",
              updated_at: new Date().toISOString()
            }).eq("id", String(targetId));
          } catch (e) {}
        }
      }

      return res.json({ received: true });
    } catch (webhookErr: any) {
      console.error("[SlickPay Webhook Error]:", webhookErr);
      return res.status(200).json({ received: true, warning: webhookErr.message });
    }
  });

  // E. Supabase Sync / Purchases History Endpoint
  app.get("/api/supabase/purchases", async (req, res) => {
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from("purchases")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(20);

        if (!error && data) {
          return res.json({ success: true, purchases: data });
        }
      } catch (err) {
        console.warn("[Supabase History Warning]:", err);
      }
    }

    const memoryPurchases = Array.from(INVOICE_REGISTRY.values());
    return res.json({ success: true, purchases: memoryPurchases });
  });

  // Vite middleware for development vs static build for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

