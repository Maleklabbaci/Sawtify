import "dotenv/config";

import { createClient } from "@supabase/supabase-js";
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  buildTtsRequest,
  extractAudioFromResponse,
  pcmDurationSeconds,
  VERBATIM_INSTRUCTION,
} from "../tts/engine";
import {
  AUDITION_SCRIPT,
  AUDITION_SCRIPT_HASH,
  AUDITION_SCRIPT_VERSION,
  previewFileName,
  previewTargets,
  validateManifest,
  type VoicePreviewEntry,
  type VoicePreviewManifest,
} from "../tts/voicePreviews";
import { resolveGeminiVoiceName, VOICE_MAPPING } from "../tts/voiceMapping";
import { resolveVoiceName } from "../tts/voiceNames";
import {
  GEMINI_TTS_MAX_ATTEMPTS,
  GeminiHttpError,
  geminiRetryDelayMs,
  isGeminiDailyQuotaError,
  isRetryableGeminiError,
} from "../tts/retryPolicy";
import {
  getGeminiApiKeyCandidates,
  hasAnyGeminiApiKey,
  markGeminiFreeQuotaExhausted,
} from "../tts/geminiApiKeys";

const MODEL = process.env.GEMINI_TTS_MODEL || "gemini-3.8-flash-tts";
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const BUCKET = "voice-previews";
const SAMPLE_RATE = 24_000;
const OUTPUT_DIR = join(process.cwd(), "storage", "voice-previews");
const MANIFEST_PATH = join(process.cwd(), "tts", "preview-manifest.json");
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";

const argumentsList = process.argv.slice(2);
const force = argumentsList.includes("--force");
const simulate = argumentsList.includes("--simule");
const upload = argumentsList.includes("--upload");
const voiceFilterValues = argumentsList
  .filter((arg) => arg.startsWith("--voix="))
  .flatMap((arg) => arg.slice("--voix=".length).split(","))
  .map((voice) => voice.trim())
  .filter(Boolean);
const voiceFilters = voiceFilterValues.map((voice) => resolveGeminiVoiceName(voice));
const modelArgument = argumentsList.find((arg) => arg.startsWith("--modele="));
const requestedModel = modelArgument?.slice("--modele=".length).trim();
const model = requestedModel || MODEL;
const delayArgument = argumentsList.find((arg) => arg.startsWith("--delai="));
const delayValue = Number(delayArgument?.slice("--delai=".length) ?? 400);
const delayBetweenVoicesMs = Number.isFinite(delayValue) ? Math.max(0, Math.min(60_000, Math.floor(delayValue))) : 400;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pcmToWav(pcm: Buffer): Buffer {
  const channels = 1;
  const bitsPerSample = 16;
  const byteRate = SAMPLE_RATE * channels * bitsPerSample / 8;
  const blockAlign = channels * bitsPerSample / 8;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

function wavDurationSeconds(wav: Buffer): number {
  if (wav.length >= 44 && wav.toString("ascii", 0, 4) === "RIFF" && wav.toString("ascii", 8, 12) === "WAVE") {
    const rate = wav.readUInt32LE(24) || SAMPLE_RATE;
    const channels = wav.readUInt16LE(22) || 1;
    const bits = wav.readUInt16LE(34) || 16;
    const dataSize = Math.min(wav.readUInt32LE(40), Math.max(0, wav.length - 44));
    return dataSize / (rate * channels * bits / 8);
  }
  return pcmDurationSeconds(wav);
}

function retryAfterMilliseconds(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;
  const date = Date.parse(header);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : undefined;
}

async function generateWav(voiceId: string, apiKey: string): Promise<Buffer> {
  const voiceName = resolveGeminiVoiceName(voiceId);
  const request = buildTtsRequest({
    model,
    rawText: AUDITION_SCRIPT,
    voiceName,
    output: "wav",
    sampleRate: SAMPLE_RATE,
    register: "darija",
    verbatimInstruction: VERBATIM_INSTRUCTION,
    isFirstChunk: true,
  });
  const controller = new AbortController();
  const timeoutMs = Math.max(1_000, Number(process.env.TTS_FETCH_TIMEOUT_MS) || 30_000);
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${GEMINI_URL}/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(request.body),
      signal: controller.signal,
    });
    if (!response.ok) {
      const responseText = await response.text().catch(() => "");
      throw new GeminiHttpError(response.status, responseText, retryAfterMilliseconds(response.headers.get("retry-after")));
    }

    const json = await response.json();
    const extracted = extractAudioFromResponse(json);
    if (!extracted.audio) {
      throw new Error(extracted.textInsteadOfAudio
        ? `Gemini a renvoyé du texte au lieu d'audio : ${extracted.textInsteadOfAudio}`
        : `Réponse Gemini sans audio (finishReason=${extracted.finishReason || "absent"})`);
    }
    if (extracted.finishReason && extracted.finishReason !== "STOP") {
      throw new Error(`Réponse audio incomplète (finishReason=${extracted.finishReason})`);
    }
    return pcmToWav(extracted.audio.pcm);
  } catch (error: any) {
    if (error?.name === "AbortError" || error?.name === "TimeoutError") {
      const timeoutError = new Error(`Timeout Gemini après ${timeoutMs} ms`);
      timeoutError.name = "TimeoutError";
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function generateWavWithRetry(voiceId: string): Promise<Buffer> {
  let activeKey = getGeminiApiKeyCandidates(model)[0];
  if (!activeKey) {
    throw new Error(hasAnyGeminiApiKey()
      ? "Quota gratuit Gemini épuisé; configure GEMINI_API_KEY_PAID pour la relève."
      : "Aucune clé Gemini configurée; ajoute GEMINI_API_KEY_FREE ou GEMINI_API_KEY_PAID.");
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= GEMINI_TTS_MAX_ATTEMPTS; attempt++) {
    try {
      return await generateWav(voiceId, activeKey.apiKey);
    } catch (error) {
      lastError = error;
      if (activeKey.tier === "free" && isGeminiDailyQuotaError(error)) {
        const resetAt = markGeminiFreeQuotaExhausted(activeKey.apiKey, model);
        const paidKey = getGeminiApiKeyCandidates(model)
          .find((candidate) => candidate.tier === "paid" && candidate.apiKey !== activeKey.apiKey);
        if (paidKey && attempt < GEMINI_TTS_MAX_ATTEMPTS) {
          activeKey = paidKey;
          console.warn(`[Aperçus] Quota gratuite épuisée; relais payant pour ${voiceId}${resetAt ? ` jusqu'au ${new Date(resetAt).toISOString()}` : ""}.`);
          continue;
        }
        console.warn(`[Aperçus] Quota gratuite épuisée; ${paidKey ? "limite de tentatives atteinte" : "aucune clé payante de relève"}.`);
        break;
      }

      const retryable = isRetryableGeminiError(error);
      console.warn(`[Aperçus] ${voiceId} — tentative ${attempt}/${GEMINI_TTS_MAX_ATTEMPTS} avec tier=${activeKey.tier}${retryable ? " temporaire" : " terminale"} : ${String((error as Error)?.message || error)}`);
      if (!retryable || attempt >= GEMINI_TTS_MAX_ATTEMPTS) break;
      await delay(geminiRetryDelayMs(error, attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError || "Erreur Gemini inconnue"));
}

async function writeAtomically(filePath: string, bytes: Buffer | string): Promise<void> {
  const temporary = `${filePath}.tmp-${process.pid}`;
  await writeFile(temporary, bytes);
  await rename(temporary, filePath);
}

async function readPreviousManifest(): Promise<VoicePreviewManifest | null> {
  if (!existsSync(MANIFEST_PATH)) return null;
  try {
    const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8")) as Partial<VoicePreviewManifest>;
    if (!manifest || !Array.isArray(manifest.voices)) {
      console.warn("[Aperçus] Ancien manifeste ignoré : champ voices invalide.");
      return null;
    }
    return manifest as VoicePreviewManifest;
  } catch (error: any) {
    console.warn(`[Aperçus] Ancien manifeste ignoré : ${error?.message || error}`);
    return null;
  }
}

async function uploadWav(storage: ReturnType<typeof createClient>["storage"], voiceId: string, wav: Buffer): Promise<string> {
  const objectName = `studio_${voiceId}.wav`;
  const { error } = await storage.from(BUCKET).upload(objectName, wav, { contentType: "audio/wav", upsert: true });
  if (error) throw new Error(`Upload Supabase ${objectName} impossible : ${error.message}`);
  const { data } = storage.from(BUCKET).getPublicUrl(objectName);
  return data.publicUrl;
}

async function main() {
  if (!simulate && !getGeminiApiKeyCandidates(model).length) {
    throw new Error(hasAnyGeminiApiKey()
      ? "Quota gratuit épuisé sans clé payante de relève configurée."
      : "Clé Gemini absente. Configure GEMINI_API_KEY_FREE/GEMINI_API_KEY_PAID ou utilise --simule.");
  }
  if (upload && (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY)) {
    throw new Error("--upload exige SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans l'environnement; ne colle pas la clé dans le code.");
  }

  const allTargets = previewTargets();
  const validGeminiVoiceIds = new Set(allTargets.map((target) => target.geminiVoiceId));
  const mappingByLowercase = new Map(
    Object.entries(VOICE_MAPPING).map(([alias, geminiVoice]) => [alias.toLowerCase(), geminiVoice]),
  );
  const unknown = [...new Set(voiceFilterValues)].filter((voice) => {
    const mapped = mappingByLowercase.get(voice.toLowerCase());
    const resolved = mapped || resolveVoiceName(voice);
    return !resolved || !validGeminiVoiceIds.has(resolveGeminiVoiceName(resolved));
  });
  if (unknown.length) throw new Error(`Voix inconnue(s) : ${unknown.join(", ")}`);

  const selected = voiceFilters.length
    ? allTargets.filter((target) => voiceFilters.includes(target.geminiVoiceId))
    : allTargets;
  if (argumentsList.some((arg) => arg.startsWith("--voix=")) && !voiceFilters.length) {
    throw new Error("Aucune voix valide après --voix=.");
  }
  if (!selected.length) throw new Error("Aucune voix sélectionnée.");

  const supabase = upload ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) : null;
  await mkdir(OUTPUT_DIR, { recursive: true });

  const previous = await readPreviousManifest();
  const previousIsCurrent = Boolean(
    previous
      && Array.isArray(previous.voices)
      && previous.scriptHash === AUDITION_SCRIPT_HASH
      && previous.model === model,
  );
  const entries = new Map<string, VoicePreviewEntry>();
  if (previousIsCurrent && previous) {
    const validVoiceIds = new Set(allTargets.map((target) => target.geminiVoiceId));
    for (const entry of previous.voices) {
      if (!entry || !validVoiceIds.has(entry.voiceId) || entry.file !== previewFileName(entry.voiceId)) continue;
      if (existsSync(join(OUTPUT_DIR, entry.file))) entries.set(entry.voiceId, entry);
    }
  }

  let failures = 0;
  let abortRemaining = false;
  console.log(`[Aperçus] ${selected.length} voix sélectionnée(s), modèle ${model}, max ${GEMINI_TTS_MAX_ATTEMPTS} tentative(s) par voix.`);
  for (let index = 0; index < selected.length; index++) {
    const target = selected[index];
    const voiceId = target.geminiVoiceId;
    const file = previewFileName(voiceId);
    const filePath = join(OUTPUT_DIR, file);
    const previousEntry = entries.get(voiceId);

    try {
      let wav: Buffer;
      let generatedAt: string;
      if (!force && previousIsCurrent && previousEntry && existsSync(filePath)) {
        wav = await readFile(filePath);
        generatedAt = previousEntry.generatedAt;
        console.log(`[Aperçus ↷] ${voiceId} existe déjà — ignorée.`);
      } else {
        wav = simulate
          ? pcmToWav(Buffer.alloc(SAMPLE_RATE * 2))
          : await generateWavWithRetry(voiceId);
        generatedAt = new Date().toISOString();
        await writeAtomically(filePath, wav);
        console.log(`[Aperçus ✓] ${voiceId} — ${wav.length} octets`);
      }

      const entry: VoicePreviewEntry = {
        voiceId,
        legacyId: target.legacyId,
        nameFr: target.nameFr,
        nameAr: target.nameAr,
        file,
        ...(previousEntry?.url ? { url: previousEntry.url } : {}),
        durationSeconds: Math.round(wavDurationSeconds(wav) * 100) / 100,
        bytes: wav.length,
        generatedAt,
        model,
        gender: target.voice.gender,
      };
      // Garder le WAV local dans le manifeste même si l'upload échoue; une relance
      // pourra retenter l'upload sans repayer la génération Gemini.
      entries.set(voiceId, entry);
      if (supabase) {
        try {
          const publicUrl = await uploadWav(supabase.storage, voiceId, wav);
          entries.set(voiceId, { ...entry, url: publicUrl });
        } catch (uploadError: any) {
          failures++;
          abortRemaining = true;
          console.error(`[Aperçus ⚠] ${voiceId} générée localement, upload Supabase échoué : ${uploadError?.message || uploadError}`);
        }
      }
    } catch (error: any) {
      failures++;
      const status = (error as { status?: number })?.status;
      if (status !== undefined && status >= 400 && status < 500) abortRemaining = true;
      console.error(`[Aperçus ✗] ${voiceId}${status ? ` (HTTP ${status})` : ""} : ${error?.message || error}`);
      // Pas de boucle globale : une voix en échec ne bloque pas les suivantes.
    }

    const manifest: VoicePreviewManifest = {
      version: AUDITION_SCRIPT_VERSION,
      scriptHash: AUDITION_SCRIPT_HASH,
      model,
      generatedAt: new Date().toISOString(),
      count: entries.size,
      voices: allTargets.flatMap((target) => {
        const entry = entries.get(target.geminiVoiceId);
        return entry ? [entry] : [];
      }),
    };
    await writeAtomically(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");
    await writeAtomically(join(OUTPUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

    if (abortRemaining) {
      console.warn("[Aperçus] Arrêt anticipé après erreur Gemini terminale ou échec de Storage; aucune autre génération ne sera lancée.");
      break;
    }
    if (index < selected.length - 1 && delayBetweenVoicesMs > 0) await delay(delayBetweenVoicesMs);
  }

  const finalManifest: VoicePreviewManifest = {
    version: AUDITION_SCRIPT_VERSION,
    scriptHash: AUDITION_SCRIPT_HASH,
    model,
    generatedAt: new Date().toISOString(),
    count: entries.size,
    voices: allTargets.flatMap((target) => {
      const entry = entries.get(target.geminiVoiceId);
      return entry ? [entry] : [];
    }),
  };
  await writeAtomically(MANIFEST_PATH, JSON.stringify(finalManifest, null, 2) + "\n");
  await writeAtomically(join(OUTPUT_DIR, "manifest.json"), JSON.stringify(finalManifest, null, 2) + "\n");

  if (supabase) {
    const { error } = await supabase.storage.from(BUCKET).upload(
      "manifest.json",
      Buffer.from(JSON.stringify(finalManifest, null, 2)),
      { contentType: "application/json", upsert: true },
    );
    if (error) {
      failures++;
      console.error(`[Aperçus ✗] Upload du manifeste impossible : ${error.message}`);
    }
  }

  const validity = validateManifest(finalManifest);
  for (const warning of validity.avertissements) console.warn(`[Aperçus] ⚠️ ${warning}`);
  console.log(`[Aperçus] Terminé : ${entries.size}/${allTargets.length} entrées au manifeste; ${failures} erreur(s).`);
  if (failures > 0 || !validity.ok) process.exitCode = 1;
}

main().catch((error: any) => {
  console.error(`[Aperçus] Arrêt propre : ${error?.message || error}`);
  process.exitCode = 1;
});
