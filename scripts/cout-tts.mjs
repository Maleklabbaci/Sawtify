#!/usr/bin/env node
/**
 * ============================================================================
 *  SAWTIFY — CALCULATEUR DE COÛT RÉEL TTS (Gemini 3.8 Flash TTS / Flash-Lite)
 * ============================================================================
 *  Ce script ne fait AUCUNE supposition "à la louche" : il réplique
 *  LIGNE PAR LIGNE la logique de génération réellement présente dans
 *  server.ts (chunking, normalisation, prompt "DIRECTOR'S NOTES", gap de
 *  silence, barème de points) puis applique la grille tarifaire OFFICIELLE
 *  Google du 23/09/2026.
 *
 *  Usage :
 *    node scripts/cout-tts.mjs                     # rapport complet
 *    node scripts/cout-tts.mjs --duration=60       # une durée précise
 *    TTS_CHUNK_MAX_CHARS=1200 node scripts/cout-tts.mjs   # tester un réglage
 *    node scripts/cout-tts.mjs --json              # sortie machine
 * ============================================================================
 */

// ─────────────────────────────────────────────────────────────────────────────
//  1. PARAMÈTRES DE PRODUCTION (copiés de server.ts — mêmes valeurs par défaut)
// ─────────────────────────────────────────────────────────────────────────────
const P = {
  TTS_CHUNK_MAX_CHARS: Number(process.env.TTS_CHUNK_MAX_CHARS) || 800,
  TTS_CHARS_PER_SECOND_ESTIMATE: 14,
  TTS_CHUNK_GAP_MS: 200,
  TTS_BYTES_PER_SECOND: 48000,
  BASE_POINTS_COST: 20,
  EXTRA_POINTS_PER_MINUTE: 10,
  USD_TO_DZD: 260,
  RETRY_FAIL_RATE: Number(process.env.RETRY_FAIL_RATE) || 0.06, // 6% : un morceau échoue puis est rejoué
  MAX_CHARS_DEFAULT: 1200,
  MAX_CHARS_UNLOCKED: 5000,
  FREE_TRIAL_MAX_DURATION_SECONDS: 45,
  WELCOME_POINTS: 50,
  MILESTONE_EVERY: 10,
  MILESTONE_BONUS_POINTS: 30,
};

// ─────────────────────────────────────────────────────────────────────────────
//  2. GRILLE TARIFAIRE OFFICIELLE GOOGLE (USD / 1M tokens)
//     Source : ai.google.dev/gemini-api/docs/pricing (relevé le 26/09/2026)
//     ⚠️ 1 seconde d'audio = 25 tokens (footnote officielle "25 tokens per
//        second of audio", confirmée par "$0.00225 / 10 s" à $9/1M).
// ─────────────────────────────────────────────────────────────────────────────
const AUDIO_TOKENS_PER_SECOND = 25;

const MODELS = {
  "gemini-3.8-flash-tts": {
    label: "3.8 Flash TTS (studio)",
    in2026: 0.5, out2026: 9.0,     // jusqu'au 31/12/2026
    in2027: 1.0, out2027: 18.0,    // à partir du 01/01/2027
  },
  "gemini-3.8-flash-lite-tts": {
    label: "3.8 Flash-Lite TTS (volume)",
    in2026: 0.5, out2026: 6.0,
    in2027: 1.0, out2027: 12.0,
  },
  "gemini-3.1-flash-tts-preview": {
    label: "3.1 Flash TTS (ACTUEL Sawtify)",
    in2026: 1.0, out2026: 20.0,
    in2027: 1.0, out2027: 20.0,    // modèle legacy, pas de hausse annoncée
  },
};

// ─────────────────────────────────────────────────────────────────────────────
//  3. RATIOS DE TOKENISATION
//     Le coût AUDIO est exact (déterministe). Le coût TEXTE est estimé :
//     Google ne publie pas de tokenizer hors-ligne. On encadre la fourchette.
//     - Anglais (le prompt DIRECTOR'S NOTES) : ~4.0 caractères/token
//     - Arabe/darija (le transcript)         : ~2.0 caractères/token
// ─────────────────────────────────────────────────────────────────────────────
const TOK = {
  en: { typical: 4.0, low: 3.5, high: 4.5 },
  ar: { typical: 2.0, low: 1.6, high: 2.5 },
};

// ─────────────────────────────────────────────────────────────────────────────
//  4. ESPACE DE TRAVAIL POINTS → DZD (src/data/voices.ts, CREDIT_PACKS_FR)
// ─────────────────────────────────────────────────────────────────────────────
const PACKS = [
  { id: "pack_starter",  points: 100,  priceDZD: 500 },
  { id: "pack_pro",      points: 220,  priceDZD: 1000 },
  { id: "pack_studio",   points: 600,  priceDZD: 2500 },
  { id: "pack_business", points: 1350, priceDZD: 5000 },
];
const packValue = (p) => p.priceDZD / p.points; // DZD par point

// ─────────────────────────────────────────────────────────────────────────────
//  5. CODE DE PRODUCTION RÉPLIQUÉ (verbatim depuis server.ts)
// ─────────────────────────────────────────────────────────────────────────────
function normalizeTextForTTS(text, addTrailingPause = true) {
  let n = text;
  n = n.replace(/([0-9])([ا-يa-zA-Z])/g, "$1 $2");
  n = n.replace(/([ا-يa-zA-Z])([0-9])/g, "$1 $2");
  n = n.replace(/([a-zA-Z])([ا-ي])/g, "$1 $2");
  n = n.replace(/([ا-ي])([a-zA-Z])/g, "$1 $2");
  n = n.replace(/\s+/g, " ").trim();
  if (addTrailingPause && !/[.!؟?…]$/.test(n)) n = n + " ...";
  return n;
}
function injectNaturalFiller(text) {
  const clean = text.trim();
  if (clean.startsWith("...") || clean.startsWith("…")) return clean;
  return `... ${clean}`;
}
function hardSplitByWords(text, maxChars) {
  const words = text.split(" ");
  const out = []; let cur = "";
  for (const w of words) {
    if (cur && (cur + " " + w).length > maxChars) { out.push(cur); cur = w; }
    else cur = cur ? cur + " " + w : w;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
function splitIntoChunksForTTS(text, maxChars = P.TTS_CHUNK_MAX_CHARS) {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= maxChars) return [trimmed];
  const sentences = trimmed.split(/(?<=[.!?؟…])\s+/).filter(Boolean);
  const pieces = [];
  for (const s of sentences) {
    if (s.length <= maxChars) { pieces.push(s); continue; }
    const sub = s.split(/(?<=[،؛:,])\s+/).filter(Boolean);
    for (const p of sub) {
      if (p.length <= maxChars) pieces.push(p);
      else pieces.push(...hardSplitByWords(p, maxChars));
    }
  }
  const chunks = []; let current = "";
  for (const p of pieces) {
    if (current && (current + " " + p).length > maxChars) { chunks.push(current.trim()); current = p; }
    else current = current ? current + " " + p : p;
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter((c) => c.length > 0);
}
function computePointsCost(durationSeconds) {
  if (durationSeconds <= 60) return P.BASE_POINTS_COST;
  const extraBlocks = Math.ceil((durationSeconds - 60) / 60);
  return P.BASE_POINTS_COST + extraBlocks * P.EXTRA_POINTS_PER_MINUTE;
}

// Personas officiels (server.ts → VOICE_PERSONAS)
const VOICE_PERSONAS = {
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

/** Prompt EXACT envoyé à Gemini, recopié de buildTTSPrompt() dans server.ts. */
function buildTTSPrompt(preparedText, persona, pace, pitchNote, emotionNote) {
  return `TTS the following transcript. Do not read these notes aloud.

DIRECTOR'S NOTES
Speaker: ${persona}
Language: Algerian Darija (Arabic script). Natural, human delivery, like a real person talking.
Pace: ${pace}${pitchNote ? `\nPitch: ${pitchNote}` : ""}${emotionNote ? `\nTone: ${emotionNote}` : ""}
The transcript may contain audio tags in brackets such as [excited], [calm], [whispers] or [very fast]: follow them for delivery, never pronounce them. A leading "..." is just a short silent beat before starting.

TRANSCRIPT:
${preparedText}`;
}

// Scénario par défaut = réglages réels d'une génération "voix off publicitaire"
const SCENARIO = {
  voiceId: "voice_amin",
  speed: 1.0,   // → pace "Natural conversational pace."
  pitch: 1.0,   // → pas de ligne Pitch
  emotion: "[excited]", // → "excited and high-energy"
};
const PACE = "Natural conversational pace.";
const PITCH_NOTE = "";
const EMOTION_NOTE = "Start excited and high-energy from the very first word and keep it consistent.";

/** Corpus darija réaliste (extraits des scripts de preview de Sawtify + phrases type). */
const DARIJA_CORPUS = [
  "سلام عليكم خاوتي، واش راكم لاباس؟",
  "مع منصة صوتيفي تقدر تحول نصوصك لصوت بشري طبيعي.",
  "مرحبا بيكم كاملين! هادي أحسن منصة جزائرية بالذكاء الاصطناعي الصوتي، بنطق دقيق وصوت دافئ يسمعها بلا ما تعيا.",
  "الصوت يخرج طبيعي وسلس كأنو متحدث جزائري حقيقي، بلا ما تحس بلي راهي آلة.",
  "إلى راك تحوس على فويس أوفر احترافية للمشروع ديالك، راك في المكان الصحيح.",
  "تزيد لمسة احترافية لكل الفيديوهات.",
  "وتساعدك تربح وقت كبير في المونتاج، خاصة كي تكون عندك عشرات الفيديوهات في الشهر.",
  "الدفع ساهل بالكارت الذهبية أو سي آي بي، والرصيد يتحسب بالكام، بلا ما تعقّد روحك.",
  "جرّب دقيقة كاملة باش تسمع الفرق بعينيك، وبعدها قرر واش راك رايح تدير.",
  "هاذي تجربة صوتية جزائرية قوية، مصممة على قياس المحتوى المحلي.",
  "الفيديو يولي يجذب أكثر كي يكون فيه صوت واضح ومنظم.",
];
/** Construit un texte d'AU PLUS `chars` caractères (phrases entières, comme un vrai script). */
function buildDarijaText(chars) {
  let out = "";
  const pool = [...DARIJA_CORPUS].sort((a, b) => b.length - a.length); // longues d'abord, puis plus courtes pour finir au plus près
  for (const s of pool) {
    while (out.length + s.length + 1 <= chars) out += s + " ";
  }
  return out.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
//  6. MOTEUR DE CALCUL
// ─────────────────────────────────────────────────────────────────────────────
function analyse({ targetSeconds, model, year = 2026, chunkMax = P.TTS_CHUNK_MAX_CHARS, precision = "typical", audioTokPerSec = AUDIO_TOKENS_PER_SECOND }) {
  const targetChars = Math.round(targetSeconds * P.TTS_CHARS_PER_SECOND_ESTIMATE);
  const rawText = buildDarijaText(targetChars);
  const chars = rawText.length;
  // Durée audio telle que la plateforme la déduit de son propre modèle de débit
  // (server.ts : TTS_CHARS_PER_SECOND_ESTIMATE = 14 car/s). C'est aussi la base
  // du barème de points (computePointsCost reçoit la durée réelle mesurée).
  const deliveredSeconds = +(chars / P.TTS_CHARS_PER_SECOND_ESTIMATE).toFixed(2);

  // → exactement ce que fait synthesizeWithRetry()
  const chunks = splitIntoChunksForTTS(rawText, chunkMax);
  let templateChars = 0, transcriptChars = 0, chunkChars = [];

  for (let ci = 0; ci < chunks.length; ci++) {
    const isLast = ci === chunks.length - 1;
    let chunkText = normalizeTextForTTS(chunks[ci], isLast);
    if (ci === 0) chunkText = injectNaturalFiller(chunkText);
    const prompt = buildTTSPrompt(chunkText, VOICE_PERSONAS[SCENARIO.voiceId], PACE, PITCH_NOTE, EMOTION_NOTE);
    templateChars += prompt.length - chunkText.length; // en-tête DIRECTOR'S NOTES (payé à CHAQUE morceau)
    transcriptChars += chunkText.length;
    chunkChars.push(chunkText.length);
  }

  // Tokens d'entrée
  const enRatio = TOK.en[precision], arRatio = TOK.ar[precision];
  const promptTokens = Math.ceil(templateChars / enRatio);
  const transcriptTokens = Math.ceil(transcriptChars / arRatio);
  const inputTokens = promptTokens + transcriptTokens;

  // Tokens de sortie (audio) — EXACT
  const gaps = (chunks.length - 1) * (P.TTS_CHUNK_GAP_MS / 1000); // silence local, NON facturé par Google
  const billedAudioSeconds = Math.max(0, deliveredSeconds - gaps);
  const audioTokens = Math.ceil(billedAudioSeconds * audioTokPerSec);

  const m = MODELS[model];
  const inPrice = year === 2026 ? m.in2026 : m.in2027;
  const outPrice = year === 2026 ? m.out2026 : m.out2027;

  const inputUSD = (inputTokens / 1e6) * inPrice;
  const audioUSD = (audioTokens / 1e6) * outPrice;
  const baseUSD = inputUSD + audioUSD;

  // Pertes réelles : un morceau rejeté (finishReason != STOP) est facturé par
  // Google mais renvoyé en erreur par Sawtify (aucun point débité au client).
  const wasteUSD = baseUSD * P.RETRY_FAIL_RATE;
  const realUSD = baseUSD + wasteUSD;

  // Facturation client (points)
  const points = computePointsCost(deliveredSeconds);
  const revenueByPack = PACKS.map((p) => ({ id: p.id, dzd: points * packValue(p) }));

  return {
    targetSeconds, deliveredSeconds, model, year, precision, chunkMax, audioTokPerSec,
    chars, chunkCount: chunks.length, chunkChars,
    templateChars, transcriptChars, promptTokens, transcriptTokens, inputTokens,
    billedAudioSeconds: +billedAudioSeconds.toFixed(2), audioTokens, gaps: +gaps.toFixed(2),
    inputUSD, audioUSD, baseUSD, wasteUSD, realUSD,
    realDZD: realUSD * P.USD_TO_DZD,
    perSecondUSD: realUSD / deliveredSeconds,
    perMinuteUSD: (realUSD / deliveredSeconds) * 60,
    points,
    dzdParPoint: (realUSD * P.USD_TO_DZD) / points,
    revenueByPack,
    promptSharePct: (inputUSD / baseUSD) * 100,
    audioSharePct: (audioUSD / baseUSD) * 100,
  };
}

/**
 * PIRE CAS ÉCONOMIQUE : l'utilisateur qui maximise l'audio obtenu par point.
 * Le barème est un escalier (20 pts ≤60s, puis +10 pts par tranche de 60s) :
 * le pire cas est donc de générer PILE en haut de chaque tranche.
 */
function worstCaseForPoints(points, model) {
  const blocks = (points - P.BASE_POINTS_COST) / P.EXTRA_POINTS_PER_MINUTE;
  const maxSeconds = 60 + blocks * 60; // ex. 30 pts → 120 s
  const chars = Math.floor(maxSeconds * P.TTS_CHARS_PER_SECOND_ESTIMATE);
  const chunks = splitIntoChunksForTTS(buildDarijaText(chars), P.TTS_CHUNK_MAX_CHARS);
  const templateChars = chunks.length * (buildTTSPrompt("", VOICE_PERSONAS[SCENARIO.voiceId], PACE, PITCH_NOTE, EMOTION_NOTE).length);
  const transcriptChars = chars + chunks.length * 2;
  const inputTokens = Math.ceil(templateChars / TOK.en.typical) + Math.ceil(transcriptChars / TOK.ar.typical);
  const audioTokens = Math.ceil((maxSeconds - (chunks.length - 1) * 0.2) * AUDIO_TOKENS_PER_SECOND);
  const m = MODELS[model];
  const base = (inputTokens / 1e6) * m.in2026 + (audioTokens / 1e6) * m.out2026;
  const real = base * (1 + P.RETRY_FAIL_RATE);
  const dzdReal = real * P.USD_TO_DZD;
  const worstPack = PACKS[PACKS.length - 1]; // pack le moins cher au point
  const bestPack = PACKS[0];
  return {
    points, maxSeconds, chunks: chunks.length, inputTokens, audioTokens,
    usd: real, dzd: dzdReal,
    dzdParPoint: dzdReal / points,
    margeWorst: ((worstPack.priceDZD / worstPack.points * points - dzdReal) / (worstPack.priceDZD / worstPack.points * points)) * 100,
    margeBest: ((bestPack.priceDZD / bestPack.points * points - dzdReal) / (bestPack.priceDZD / bestPack.points * points)) * 100,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  7. RENDU DU RAPPORT
// ─────────────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const asJson = argv.includes("--json");
const oneDuration = (() => {
  const a = argv.find((x) => x.startsWith("--duration="));
  return a ? Number(a.split("=")[1]) : null;
})();
const usd = (v, d = 6) => `$${v.toFixed(d)}`;
const dzd = (v) => `${v.toFixed(2)} DZD`;

function report() {
  const durations = oneDuration ? [oneDuration] : [15, 30, 45, 60, 90, 120, 300];
  const lines = [];
  const push = (s = "") => lines.push(s);

  push("═".repeat(100));
  push("  SAWTIFY — COÛT RÉEL DE PRODUCTION TTS (grille tarifaire Google du 23/09/2026)");
  push("═".repeat(100));
  push(`  Chunking : ${P.TTS_CHUNK_MAX_CHARS} car/morceau  |  Débit utilisé : ${P.TTS_CHARS_PER_SECOND_ESTIMATE} car/s  |  Gap entre morceaux : ${P.TTS_CHUNK_GAP_MS} ms`);
  push(`  Audio facturé par Google : ${AUDIO_TOKENS_PER_SECOND} tokens/seconde d'audio produit  (footnote officielle pricing)`);
  push(`  Taux USD→DZD : ${P.USD_TO_DZD} (taux parallèle, constante USD_TO_DZD de server.ts)  |  Pertes/retries simulées : ${(P.RETRY_FAIL_RATE * 100).toFixed(0)}%`);
  push("");
  push("  ▸ LE SEUL CHIFFRE QUI COMPTE, EXACT AU TOKEN PRÈS :");
  push("      1 seconde d'audio = 25 tokens  →  25 × $9,00/1M = $0,000225/s  =  $0,013500 / minute   (3.8 Flash TTS)");
  push("                                     →  25 × $6,00/1M = $0,000150/s  =  $0,009000 / minute   (3.8 Flash-Lite TTS)");
  push("                                     →  25 × $20,00/1M = $0,000500/s =  $0,030000 / minute   (3.1 actuel)");
  push("");

  for (const model of ["gemini-3.8-flash-tts", "gemini-3.8-flash-lite-tts", "gemini-3.1-flash-tts-preview"]) {
    push("─".repeat(100));
    push(`  ${MODELS[model].label}   [${model}]`);
    push(`  Entrée ${MODELS[model].in2026}$/1M texte  |  Sortie audio ${MODELS[model].out2026}$/1M  — en 2027 : ${MODELS[model].in2027}$ / ${MODELS[model].out2027}$`);
    push("─".repeat(100));
    push("  Audio   Morc.  Tok.in  Tok.audio | Coût entrée  Coût audio | COÛT TOTAL  DZD/clip  Points  Revenu pack Business");
    push("  " + "-".repeat(96));
    for (const d of durations) {
      const r = analyse({ targetSeconds: d, model });
      const revBiz = r.revenueByPack.find((p) => p.id === "pack_business").dzd;
      const pad = (s, n) => String(s).padStart(n);
      push(
        `  ${pad(Math.round(r.deliveredSeconds) + "s", 5)}  ${pad(r.chunkCount, 5)}  ${pad(r.inputTokens, 6)}  ${pad(r.audioTokens, 9)} | ${pad(usd(r.inputUSD), 11)}  ${pad(usd(r.audioUSD), 11)} | ${pad(usd(r.realUSD, 5), 10)} ${pad(dzd(r.realDZD), 9)}  ${pad(r.points, 5)}  ${pad(dzd(revBiz), 9)}`
      );
    }
    push("");
  }

  // ─── Focus 1 minute ───
  const focus = analyse({ targetSeconds: 60, model: "gemini-3.8-flash-tts" });
  const focus31 = analyse({ targetSeconds: 60, model: "gemini-3.1-flash-tts-preview" });
  const focusLite = analyse({ targetSeconds: 60, model: "gemini-3.8-flash-lite-tts" });
  push("═".repeat(100));
  push("  ★ DÉTAIL COMPLET : 1 MINUTE DE VOIX OFF (darija, voix Amine, tag [excited], prompt réel de production)");
  push("═".repeat(100));
  push(`  Script darija                  : ${focus.chars} caractères → ${focus.deliveredSeconds}s d'audio (modèle ${P.TTS_CHARS_PER_SECOND_ESTIMATE} car/s)`);
  push(`  Morceaux réellement envoyés    : ${focus.chunkCount} appel(s) API  (contenu : ${focus.chunkChars.join(" + ")} car)`);
  push(`  En-tête DIRECTOR'S NOTES        : ${focus.templateChars} car payés en entrée (facturé ${focus.chunkCount}× — coût caché du chunking)`);
  push(`  Transcript (ce que la voix lit) : ${focus.transcriptChars} car, espaces/ponctuation normalisés inclus`);
  push("");
  push(`  tokens ENTRÉE  : ${focus.promptTokens} (prompt anglais) + ${focus.transcriptTokens} (darija arabe) = ${focus.inputTokens} tokens  →  ${usd(focus.inputUSD)}`);
  push(`  tokens SORTIE  : ${focus.audioTokens} tokens audio (= ${focus.billedAudioSeconds}s facturées ; les ${focus.gaps}s de silence local entre morceaux ne sont PAS facturés)`);
  push(`                   ${usd(focus.audioUSD)}  ← ${focus.audioSharePct.toFixed(1)}% DU COÛT TOTAL`);
  push(`  pertes retries : ${usd(focus.wasteUSD)}  (${(P.RETRY_FAIL_RATE * 100).toFixed(0)}% : tentative facturée puis rejetée par le garde-fou finishReason)`);
  push("");
  push("  ╔" + "═".repeat(96) + "╗");
  const headline = `  ║  COÛT RÉEL D'UNE VOIX OFF DE 1 MINUTE = ${usd(focus.realUSD, 5)}   ≈   ${focus.realDZD.toFixed(2)} DZD`;
  push(headline + " ".repeat(98 - headline.length) + "║");
  push("  ╚" + "═".repeat(96) + "╝");
  push(`    dont coût strict Google (sans pertes) : ${usd(focus.baseUSD)} = ${(focus.baseUSD * P.USD_TO_DZD).toFixed(2)} DZD`);
  push(`    avec 3.8 Flash-Lite TTS (moins cher)  : ${usd(focusLite.realUSD, 5)} = ${(focusLite.realDZD).toFixed(2)} DZD`);
  push(`    avec 3.1 Flash TTS (ce que tu paies AUJOURD'HUI) : ${usd(focus31.realUSD, 5)} = ${(focus31.realDZD).toFixed(2)} DZD`);
  push(`    → ÉCONOMIE IMMÉDIATE EN PASSANT À 3.8 : ${(((focus31.realUSD - focus.realUSD) / focus31.realUSD) * 100).toFixed(0)}%`);
  push("");
  push("  Ce que TU factures au client (20 points pour 1 minute) :");
  for (const r of focus.revenueByPack) {
    const pack = PACKS.find((p) => p.id === r.id);
    const marge = ((r.dzd - focus.realDZD) / r.dzd) * 100;
    push(`    · ${pack.id.padEnd(15)} ${String(pack.points).padStart(4)} pts = ${String(pack.priceDZD).padStart(4)} DZD  →  20 pts = ${r.dzd.toFixed(2).padStart(6)} DZD  |  marge brute ${marge.toFixed(1)}%`);
  }
  push("");

  // ─── Pire cas ───
  push("═".repeat(100));
  push("  ⚠ PIRE CAS ÉCONOMIQUE (l'utilisateur qui optimise son audio par point)");
  push("═".repeat(100));
  push("  Le barème est un escalier : 20 pts ≤ 60 s, puis +10 pts par tranche de 60 s entamée.");
  push("  Le pire cas = générer PILE en haut de la tranche (ex. 119,9 s pour 30 points).");
  push("");
  push("  Points  Audio max  Morceaux  Coût réel    DZD      DZD/point   Marge (pack Business)");
  push("  " + "-".repeat(86));
  for (const pts of [20, 30, 40, 60, 80, 120, 200]) {
    const w = worstCaseForPoints(pts, "gemini-3.8-flash-tts");
    push(
      `  ${String(pts).padStart(5)}  ${String(w.maxSeconds + "s").padStart(8)}  ${String(w.chunks).padStart(8)}  ${usd(w.usd, 5).padStart(10)}  ${dzd(w.dzd).padStart(9)}  ${w.dzdParPoint.toFixed(4).padStart(9)}   ${w.margeWorst.toFixed(1)}%`
    );
  }
  push("");
  const w30 = worstCaseForPoints(30, "gemini-3.8-flash-tts");
  push(`  ▸ MÊME DANS LE PIRE CAS, ton coût est de ${w30.dzdParPoint.toFixed(3)} DZD par point,`);
  push(`    alors que tu vends le point entre ${packValue(PACKS[PACKS.length - 1]).toFixed(2)} et ${packValue(PACKS[0]).toFixed(2)} DZD.`);
  push(`    → Marge brute garantie minimum ≈ ${w30.margeWorst.toFixed(0)}% (pack Business) à ${w30.margeBest.toFixed(0)}% (pack Starter).`);
  push("");

  // ─── Impact du chunking ───
  push("═".repeat(100));
  push("  IMPACT DU RÉGLAGE TTS_CHUNK_MAX_CHARS (1 minute de texte)");
  push("═".repeat(100));
  push("  Chunk  Morceaux  Tok.in  Coût entrée  Coût total (strict)   Écart    Verdict");
  push("  " + "-".repeat(92));
  const variants = [400, 600, 800, 1000, 1200, 1600, 2000, 5000];
  const vres = variants.map((c) => ({ c, r: analyse({ targetSeconds: 60, model: "gemini-3.8-flash-tts", chunkMax: c }) }));
  const best = Math.min(...vres.map((x) => x.r.baseUSD));
  for (const { c, r } of vres) {
    const over = ((r.baseUSD - best) / best) * 100;
    const verdict = c === P.TTS_CHUNK_MAX_CHARS ? "← ACTUEL" : over > 1 ? "un peu plus cher" : "équivalent";
    push(
      `  ${String(c).padStart(5)}  ${String(r.chunkCount).padStart(8)}  ${String(r.inputTokens).padStart(6)}  ${usd(r.inputUSD).padStart(11)}  ${usd(r.baseUSD).padStart(19)}  ${(over > 0.05 ? "+" + over.toFixed(2) : over.toFixed(2)) + "%"}    ${verdict}`
    );
  }
  push("");
  const headerPerChunk = focus.templateChars / focus.chunkCount;
  const costPerExtraChunk = ((headerPerChunk / TOK.en.typical) / 1e6) * MODELS["gemini-3.8-flash-tts"].in2026;
  push(`  ▸ En-tête de prompt : ${Math.round(headerPerChunk)} caractères anglais par morceau.`);
  push(`    Un morceau supplémentaire coûte ${usd(costPerExtraChunk)} d'entrée, soit ${((costPerExtraChunk / focus.baseUSD) * 100).toFixed(1)}% du clip.`);
  push("    Autrement dit : LE CHUNKING NE COÛTE PAS D'ARGENT, il coûte de la LATENCE");
  push(`    (${vres.find((v) => v.c === 800).r.chunkCount} allers-retours API au lieu de 1 pour 1 minute de texte).`);
  push("    Baisser TTS_CHUNK_MAX_CHARS ne se justifie PAS économiquement — seulement pour la robustesse (FIX TTS-C).");
  push("");

  // ─── 2027 ───
  push("═".repeat(100));
  push("  HORIZON 2027 : Google DOUBLE le prix de l'audio le 01/01/2027");
  push("═".repeat(100));
  push("  Modèle                       1 min en 2026   1 min en 2027    Δ      Marge 2027 (pack Business)");
  push("  " + "-".repeat(92));
  const revBiz30 = 30 * packValue(PACKS[PACKS.length - 1]);
  for (const model of ["gemini-3.8-flash-tts", "gemini-3.8-flash-lite-tts"]) {
    const a = analyse({ targetSeconds: 60, model, year: 2026 });
    const b = analyse({ targetSeconds: 60, model, year: 2027 });
    push(
      `  ${MODELS[model].label.padEnd(28)} ${dzd(a.realDZD).padStart(12)}  ${dzd(b.realDZD).padStart(13)}   +${(((b.realDZD - a.realDZD) / a.realDZD) * 100).toFixed(0)}%   ${(((revBiz30 - b.realDZD) / revBiz30) * 100).toFixed(1)}%`
    );
  }
  push("  ▸ La marge reste > 89% : pas d'urgence tarifaire, mais anticiper le réglage de prix 2027 est sain.");
  push("");

  // ─── Autres coûts plateforme ───
  push("═".repeat(100));
  push("  AUTRES POSTES DE COÛT DE LA PLATEFORME");
  push("═".repeat(100));
  const free = analyse({ targetSeconds: P.FREE_TRIAL_MAX_DURATION_SECONDS, model: "gemini-3.8-flash-tts" });
  push(`  · Inscription gratuite (${P.WELCOME_POINTS} pts offerts, cap ${P.FREE_TRIAL_MAX_DURATION_SECONDS}s) :`);
  push(`      - 1 génération de ${P.FREE_TRIAL_MAX_DURATION_SECONDS}s = ${usd(free.realUSD)} = ${dzd(free.realDZD)}`);
  push(`      - ${P.WELCOME_POINTS} pts = 2 générations de 20 pts → coût max réel d'un inscrit gratuit ≈ ${dzd(2 * free.realDZD)}`);
  push(`      - 100 inscriptions gratuites/jour ≈ ${dzd(200 * free.realDZD)}/jour  ≈  ${dzd(200 * free.realDZD * 30)}/mois`);
  push(`  · Bonus palier (tous les ${P.MILESTONE_EVERY} générations → +${P.MILESTONE_BONUS_POINTS} pts) :`);
  push(`      - c'est une remise réelle de ${((P.MILESTONE_BONUS_POINTS / (10 * 20)) * 100).toFixed(0)}% (200 pts payés + ${P.MILESTONE_BONUS_POINTS} offerts)`);
  push(`      - COGS de ce cadeau : ${dzd(P.MILESTONE_BONUS_POINTS * (focus.realDZD / focus.points))}  (valeur catalogue : ${dzd(P.MILESTONE_BONUS_POINTS * packValue(PACKS[0]))} au pack Starter)`);
  push("  · Stockage : la génération web renvoie le WAV en base64 et ne stocke RIEN → 0 DZD");
  push("      (seuls l'API développeur et les previews utilisent Supabase Storage, purgés à 7 jours)");
  push("  · Encodage MP3 (lamejs) & conversion ffmpeg.wasm : 100% local, aucune API payante → 0 DZD");
  push("  · Hébergement Render + Supabase : coût fixe (≈ $7-32/mois), amorti sur le volume");
  push("");

  // ─── Sensibilités ───
  push("═".repeat(100));
  push("  SENSIBILITÉS (ce qui peut faire bouger le chiffre)");
  push("═".repeat(100));
  push("  1) Tokenisation du texte — incertitude réelle, mais elle ne pèse que ~3% du coût :");
  for (const prec of ["low", "typical", "high"]) {
    const r = analyse({ targetSeconds: 60, model: "gemini-3.8-flash-tts", precision: prec });
    const label = prec === "low" ? "pessimiste (AR 1,6 car/token)" : prec === "high" ? "optimiste (AR 2,5 car/token)" : "typique (EN 4,0 / AR 2,0 car/token)";
    push(`       ${label.padEnd(38)} ${usd(r.realUSD, 5)}  =  ${dzd(r.realDZD)}`);
  }
  push("");
  push("  2) 25 tokens/s (doc officielle) vs 32 tokens/s (constante GEMINI_AUDIO_TOKENS_PER_SECOND observée dans ton code) :");
  const t25 = analyse({ targetSeconds: 60, model: "gemini-3.8-flash-tts", audioTokPerSec: 25 });
  const t32 = analyse({ targetSeconds: 60, model: "gemini-3.8-flash-tts", audioTokPerSec: 32 });
  push(`       25 tok/s → ${usd(t25.realUSD, 5)} = ${dzd(t25.realDZD)}   |   32 tok/s → ${usd(t32.realUSD, 5)} = ${dzd(t32.realDZD)}   (+${(((t32.realUSD - t25.realUSD) / t25.realUSD) * 100).toFixed(0)}%)`);
  push("");
  push("  3) Taux de change USD→DZD (sensible sur le marché parallèle) :");
  for (const rate of [240, 260, 280]) {
    push(`       1 USD = ${rate} DZD  →  1 minute = ${((focus.realUSD * rate)).toFixed(2)} DZD`);
  }
  push("");
  push("  4) Ce que Google facture VRAIMENT : la durée AUDIO produite, pas ton texte.");
  push("       → $0,000225 par seconde d'audio. Si la voix parle plus vite que 14 car/s, tu produis");
  push("         moins de secondes pour le même texte : ton coût baisse, mais ton barème points ne bouge pas.");
  push("");

  return lines.join("\n");
}

if (asJson) {
  const out = {};
  for (const model of Object.keys(MODELS)) {
    out[model] = [15, 30, 60, 120, 300].map((d) => analyse({ targetSeconds: d, model }));
  }
  console.log(JSON.stringify(out, null, 2));
} else {
  console.log(report());
}
