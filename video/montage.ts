/* ===================================================================
   MONTAGE VIDÉO AUTOMATIQUE (Gemini + FFmpeg)
   Pipeline : rushs + voix  →  1) Gemini choisit l'ordre des séquences,
   les coupes (start/end par rush) et time les captions  →  2) FFmpeg
   découpe, enchaîne, incruste les sous-titres ASS et rend le MP4 9:16.

   Ce module est volontairement sans dépendance au serveur : il reçoit
   tout par paramètres (chemin FFmpeg, appel Gemini, chemins fichiers)
   pour rester testable hors ligne (scripts/test-montage-pipeline.ts).

   Polices : uniquement des polices Google gratuites, livrées en TTF par
   les paquets @expo-google-fonts/* (licence OFL). Le filtre `subtitles`
   de FFmpeg reçoit un `fontsdir` temporaire contenant la police choisie
   (graisses 400 + 700) — plus la police arabe de secours si besoin.
   =================================================================== */
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import path from "path";
import { spawn } from "node:child_process";

/* ------------------------------------------------------------------ */
/*  Polices Google gratuites (sélecteur côté studio)                   */
/* ------------------------------------------------------------------ */

/** Les 7 polices proposées dans le sélecteur du studio. */
export const VIDEO_CAPTION_FONTS = ["Cairo", "Tajawal", "Amiri", "Noto Sans Arabic", "Inter", "Montserrat", "Roboto"] as const;
export type VideoCaptionFont = (typeof VIDEO_CAPTION_FONTS)[number];

/** Police arabe de secours : appliquée aux lignes de captions en écriture
 *  arabe quand la police choisie ne couvre pas l'arabe (Inter, Montserrat,
 *  Roboto). Cairo : tracé moderne, excellent en petit corps sur vidéo. */
export const ARABIC_FALLBACK_FONT: VideoCaptionFont = "Cairo";

const VIDEO_FONT_PACKAGES: Record<VideoCaptionFont, string> = {
  "Cairo": "@expo-google-fonts/cairo",
  "Tajawal": "@expo-google-fonts/tajawal",
  "Amiri": "@expo-google-fonts/amiri",
  "Noto Sans Arabic": "@expo-google-fonts/noto-sans-arabic",
  "Inter": "@expo-google-fonts/inter",
  "Montserrat": "@expo-google-fonts/montserrat",
  "Roboto": "@expo-google-fonts/roboto",
};

const ARABIC_SCRIPT_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
export function hasArabicScript(text: string): boolean {
  return ARABIC_SCRIPT_RE.test(text || "");
}

/** TTF d'une famille Google installée via @expo-google-fonts (graisse 400 ou 700).
 *  Layout du paquet : <poids><Nom>/<Famille>_<poids><Style>.ttf — on cherche par
 *  dossier puis, en dernier recours, on prend le premier .ttf trouvé. */
export function resolveFontFile(family: string, weight: 400 | 700, projectRoot = process.cwd()): string | null {
  const pkg = VIDEO_FONT_PACKAGES[family as VideoCaptionFont];
  if (!pkg) return null;
  const root = path.join(projectRoot, "node_modules", pkg);
  if (!existsSync(root)) return null;
  const dirCandidates = weight === 700 ? ["700Bold", "700", "Bold"] : ["400Regular", "400", "Regular"];
  for (const dirName of dirCandidates) {
    const sub = path.join(root, dirName);
    if (!existsSync(sub)) continue;
    const file = readdirSync(sub).find((name) => /\.ttf$/i.test(name));
    if (file) return path.join(sub, file);
  }
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = readdirSync(path.join(root, entry.name)).find((name) => /\.ttf$/i.test(name));
    if (file) return path.join(root, entry.name, file);
  }
  return null;
}

/** Prépare le dossier de polices du job : copie la police choisie (400 + 700)
 *  et la police arabe de secours, puis renvoie le chemin du dossier — passé
 *  au filtre `subtitles` via `fontsdir`. */
export function stageFontsForJob(jobId: string, fontFamily: string, storageDir: string, projectRoot = process.cwd()): string | null {
  const families = new Set<string>([fontFamily || ARABIC_FALLBACK_FONT, ARABIC_FALLBACK_FONT]);
  const files: string[] = [];
  for (const family of families) {
    for (const weight of [400, 700] as const) {
      const file = resolveFontFile(family, weight, projectRoot);
      if (file) files.push(file);
    }
  }
  if (!files.length) return null;
  const dir = path.join(storageDir, `${jobId}-fonts`);
  mkdirSync(dir, { recursive: true });
  for (const file of files) copyFileSync(file, path.join(dir, path.basename(file)));
  return dir;
}

/* ------------------------------------------------------------------ */
/*  Analyse des médias (durée + présence d'une piste audio)            */
/* ------------------------------------------------------------------ */

export type MontageClip = { id: string; name: string; kind: "video" | "image"; path: string; duration: number | null; hasAudio: boolean };

export function probeMediaStreams(ffmpegPath: string, filePath: string): Promise<{ duration: number | null; hasAudio: boolean }> {
  return new Promise((resolve) => {
    if (!ffmpegPath || !existsSync(filePath)) return resolve({ duration: null, hasAudio: false });
    const child = spawn(ffmpegPath, ["-i", filePath, "-f", "null", "-"], { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr?.on("data", (chunk) => { stderr = `${stderr}${chunk}`.slice(-16000); });
    child.on("error", () => resolve({ duration: null, hasAudio: false }));
    child.on("close", () => {
      const durationMatch = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
      const duration = durationMatch ? Number(durationMatch[1]) * 3600 + Number(durationMatch[2]) * 60 + Number(durationMatch[3]) : null;
      resolve({ duration, hasAudio: /Stream\s+#\d+:\d+.*: Audio:/.test(stderr) });
    });
  });
}

/* ------------------------------------------------------------------ */
/*  Plan de montage (segments = coupes, captions minutées)             */
/* ------------------------------------------------------------------ */

export type MontageAudioMode = "voice" | "original";
export type MontageSegment = { clip: number; start: number; end: number; freeze?: number };
export type MontageCaption = { start: number; end: number; text: string };
export type MontagePlan = { segments: MontageSegment[]; captions: MontageCaption[]; source: "gemini" | "fallback" };

const MIN_SEGMENT_S = 0.6;
const MAX_SEGMENT_S = 120;
const MAX_TOTAL_S = 900; // 15 min : au-delà, le rendu n'est plus raisonnable sur Render
const MAX_FREEZE_GAP_S = 30; // gel d'image maximal du dernier plan (voix plus longue que les rushs)
const MAX_CAPTION_CHARS = 180;

/** Découpe un script en chunks « taille caption » (déterministe, ordre conservé).
 *  Gemini ne touche qu'aux timings : le texte affiché reste exactement le script. */
export function chunkScriptForCaptions(script: string, maxChars = 34): string[] {
  const clean = (script || "").replace(/\[[^\]]*\]/g, " ").replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const chunks: string[] = [];
  let current = "";
  for (const word of clean.split(" ")) {
    if (current && `${current} ${word}`.length > maxChars) { chunks.push(current); current = word; } else { current = current ? `${current} ${word}` : word; }
    if (current.length > maxChars * 2) { chunks.push(current.slice(0, maxChars)); current = current.slice(maxChars).trim(); }
  }
  if (current) chunks.push(current);
  return chunks.slice(0, 200);
}

function clamp(value: number, min: number, max: number): number { return Math.min(max, Math.max(min, value)); }

function segmentMaxDuration(clip: MontageClip): number {
  return clip.kind === "image" ? MAX_SEGMENT_S : Math.max(MIN_SEGMENT_S, Math.min(clip.duration ?? MAX_SEGMENT_S, MAX_SEGMENT_S));
}

/** Valide/répare les segments bruts de Gemini : un segment par clip au plus,
 *  coupes dans les limites du rush, durées minimales, total plafonné.
 *  L'ordre des segments est conservé (Gemini peut réordonner les rushs). */
export function sanitizeSegments(rawSegments: unknown, clips: MontageClip[], targetDuration: number | null): MontageSegment[] {
  const seen = new Set<number>();
  const segments: MontageSegment[] = [];
  let total = 0;
  for (const item of Array.isArray(rawSegments) ? rawSegments : []) {
    const clipIndex = Math.trunc(Number(item?.clip));
    if (!Number.isInteger(clipIndex) || clipIndex < 0 || clipIndex >= clips.length || seen.has(clipIndex)) continue;
    const clip = clips[clipIndex];
    const max = segmentMaxDuration(clip);
    let start = Number.isFinite(Number(item?.start)) ? Number(item.start) : 0;
    let end = Number.isFinite(Number(item?.end)) ? Number(item.end) : 0;
    if (end - start < MIN_SEGMENT_S) { end = start + MIN_SEGMENT_S; }
    if (clip.kind === "image") start = 0;
    start = clamp(start, 0, Math.max(0, max - MIN_SEGMENT_S));
    end = clamp(end, start + MIN_SEGMENT_S, max);
    if (total + (end - start) > MAX_TOTAL_S) break;
    seen.add(clipIndex);
    total += end - start;
    segments.push({ clip: clipIndex, start, end });
  }
  if (segments.length && targetDuration && targetDuration > 0) balanceSegmentsToTarget(segments, clips, targetDuration);
  return segments;
}

/** Ajuste les segments pour coller à la durée exacte de la voix : mise à
 *  l'échelle proportionnelle (les images absorbent l'essentiel), puis gel de
 *  la dernière image si les rushs sont plus courts que la voix. */
function balanceSegmentsToTarget(segments: MontageSegment[], clips: MontageClip[], target: number): void {
  for (let pass = 0; pass < 6; pass += 1) {
    const total = segments.reduce((sum, segment) => sum + (segment.end - segment.start), 0);
    if (total <= 0 || Math.abs(total - target) < 0.15) return;
    const factor = target / total;
    for (const segment of segments) {
      const max = segmentMaxDuration(clips[segment.clip]);
      segment.end = segment.start + clamp((segment.end - segment.start) * factor, MIN_SEGMENT_S, max);
    }
  }
  let gap = target - segments.reduce((sum, segment) => sum + (segment.end - segment.start), 0);
  for (const segment of segments) { // les images peuvent durer aussi longtemps que voulu
    if (gap <= 0.15) break;
    if (clips[segment.clip].kind !== "image") continue;
    const add = Math.min(gap, MAX_SEGMENT_S - (segment.end - segment.start));
    if (add > 0) { segment.end += add; gap -= add; }
  }
  if (gap > 0.15) {
    const last = segments[segments.length - 1];
    if (clips[last.clip].kind === "image") last.end += gap;
    else last.freeze = Math.min(gap, MAX_FREEZE_GAP_S);
  }
}

/** Plan de secours déterministe : chaque rush utilisé une fois (partie centrale),
 *  durées réparties équitablement — même sans Gemini, le montage part. */
export function fallbackSegments(clips: MontageClip[], targetDuration: number | null): MontageSegment[] {
  const usable = clips.map((clip, index) => ({ clip, index })).filter(({ clip }) => clip.kind === "image" || (clip.duration ?? 0) >= MIN_SEGMENT_S);
  if (!usable.length) return clips.length ? [{ clip: 0, start: 0, end: MIN_SEGMENT_S }] : [];
  const target = targetDuration && targetDuration > 0
    ? targetDuration
    : Math.min(MAX_TOTAL_S, usable.reduce((sum, { clip }) => sum + segmentMaxDuration(clip), 0));
  const per = Math.max(MIN_SEGMENT_S, target / usable.length);
  return usable.map(({ clip, index }) => {
    if (clip.kind === "image") return { clip: index, start: 0, end: per };
    const source = Math.max(MIN_SEGMENT_S, clip.duration ?? per);
    const start = clamp(source * 0.1, 0, Math.max(0, source - per));
    return { clip: index, start, end: clamp(start + per, MIN_SEGMENT_S, source) };
  });
}

/** Distribue uniformément les chunks de texte sur une durée (plan de secours). */
export function evenCaptions(chunks: string[], duration: number): MontageCaption[] {
  if (!chunks.length || duration <= 0) return [];
  const step = duration / chunks.length;
  return chunks.map((text, index) => ({ start: index * step, end: Math.min(duration, (index + 1) * step), text }));
}

/** Recolle les timings de captions (Gemini ou secours) : triés, sans
 *  chevauchement (on décale), textes identiques collés fusionnés, petits
 *  trous lissés pour éviter le clignotement, bordures ramenées dans [0, total]. */
export function buildTimedCaptions(rawTimings: unknown, chunks: string[], total: number): MontageCaption[] {
  if (!chunks.length || total <= 0) return [];
  const even = evenCaptions(chunks, total);
  const timed = new Map<number, { start: number; end: number }>();
  for (const item of Array.isArray(rawTimings) ? rawTimings : []) {
    const index = Math.trunc(Number(item?.i));
    const start = Number(item?.start);
    const end = Number(item?.end);
    if (!Number.isInteger(index) || index < 0 || index >= chunks.length || !Number.isFinite(start) || !Number.isFinite(end)) continue;
    if (end - start < 0.2) continue;
    timed.set(index, { start: clamp(start, 0, total), end: clamp(end, 0, total) });
  }
  const merged: MontageCaption[] = chunks
    .map((text, index) => {
      const timing = timed.get(index) ?? { start: even[index].start, end: even[index].end };
      return { start: timing.start, end: Math.max(timing.end, timing.start + 0.2), text };
    })
    .sort((a, b) => a.start - b.start);
  const cleaned: MontageCaption[] = [];
  for (const caption of merged) {
    const previous = cleaned[cleaned.length - 1];
    let start = caption.start;
    let end = Math.max(caption.end, start + 0.2);
    if (previous) {
      if (start < previous.end - 0.05) { start = previous.end; end = Math.max(end, start + 0.2); } // décale au lieu de chevaucher
      if (start - previous.end <= 1.2 && previous.text === caption.text) { previous.end = Math.max(previous.end, end); continue; } // même texte collé : fusion
    }
    if (start >= total - 0.1) break;
    cleaned.push({ start, end: Math.min(end, total), text: caption.text });
  }
  for (let index = 0; index + 1 < cleaned.length; index += 1) { // comble les trous courts
    const gap = cleaned[index + 1].start - cleaned[index].end;
    if (gap > 0 && gap <= 1.2) cleaned[index].end = cleaned[index + 1].start;
  }
  if (cleaned.length) { // la dernière caption tient jusqu'au bout si elle frôle la fin
    const lastGap = total - cleaned[cleaned.length - 1].end;
    if (lastGap > 0 && lastGap <= 2) cleaned[cleaned.length - 1].end = total;
  }
  return cleaned;
}

/* ------------------------------------------------------------------ */
/*  Appel Gemini : plan de montage en JSON                             */
/* ------------------------------------------------------------------ */

export type GeminiPlanCall = (prompt: string) => Promise<{ text: string; model: string; inputTokens: number; outputTokens: number; costUsd: number }>;
export type GeminiPlanStats = { model: string; inputTokens: number; outputTokens: number; costUsd: number; latencyMs: number; success: boolean };

function extractJson(text: string): unknown {
  const cleaned = String(text || "").replace(/```json/gi, "").replace(/```/g, "").trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first === -1 || last <= first) return null;
  try { return JSON.parse(cleaned.slice(first, last + 1)); } catch { return null; }
}

export function buildMontagePrompt(options: { chunks: string[]; clips: MontageClip[]; targetDuration: number | null; audioMode: MontageAudioMode; scriptLanguage: string }): string {
  const { chunks, clips, targetDuration, audioMode, scriptLanguage } = options;
  const clipLines = clips.map((clip, index) => `${index}: ${clip.kind === "image" ? "image" : `vidéo, ${Math.round((clip.duration ?? 0) * 10) / 10}s`}`).join("\n");
  const durationLine = targetDuration
    ? `Durée finale EXACTE de la vidéo : ${targetDuration.toFixed(1)} secondes (durée de la voix off).`
    : "Pas de voix off : la durée finale sera la somme des segments (vise un montage rythmé, 60 à 180 secondes au total).";
  const captionsRule = chunks.length
    ? [
        `Règles pour les captions (texte déjà découpé ; ${scriptLanguage}) :`,
        '- Chaque entrée {"i": index, "start": s, "end": e} time le chunk numéro i (0-based), dans l\'ordre, sans chevauchement.',
        "- Durée de chaque caption : 1,2 à 4 s ; couvre toute la durée finale, du début à la fin.",
        `- Chunks (affichés tels quels, ne les modifie pas) :`,
        JSON.stringify(chunks),
      ].join("\n")
    : '- Aucun texte fourni : renvoie "captions": [].';
  return [
    "Tu es un monteur vidéo professionnel pour Sawtify (montages verticaux 9:16, 720x1280, réseaux sociaux).",
    'Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, au format exact :',
    '{"segments":[{"clip":0,"start":0,"end":5.2}],"captions":[{"i":0,"start":0,"end":3.1}]}',
    "",
    "Rushs disponibles (numérotés ; tu peux changer l'ordre final) :",
    clipLines,
    durationLine,
    audioMode === "voice"
      ? "La voix off Sawtify couvre toute la durée : la somme des segments doit faire EXACTEMENT la durée finale (±0,5 s)."
      : "Mode « audio d'origine » : chaque coupe garde le son du rush à cet endroit — choisis des moments qui se suffisent à eux-mêmes.",
    "",
    "Règles pour les segments (coupes) :",
    "- Au plus un segment par rush ; tu peux écarter un rush faible (flou, hors sujet).",
    "- start/end en secondes, dans les limites du rush ; images : start=0, durée libre (60 s max).",
    "- Ordre narratif : accroche forte au début, chute ou appel à l'action à la fin ; coupes dynamiques de 2 à 8 s en général.",
    "",
    captionsRule,
    "",
    "JSON uniquement :",
  ].join("\n");
}

export async function planMontageWithGemini(options: {
  geminiCall: GeminiPlanCall;
  script: string;
  clips: MontageClip[];
  targetDuration: number | null;
  audioMode: MontageAudioMode;
}): Promise<{ plan: MontagePlan; gemini: GeminiPlanStats }> {
  const { geminiCall, script, clips, targetDuration, audioMode } = options;
  const chunks = chunkScriptForCaptions(script);
  const scriptLanguage = hasArabicScript(script) ? "garder l'arabe/darija telle quelle" : "garder la langue du texte";
  const startedAt = Date.now();
  try {
    const response = await geminiCall(buildMontagePrompt({ chunks, clips, targetDuration, audioMode, scriptLanguage }));
    const parsed = extractJson(response.text) as { segments?: unknown; captions?: unknown } | null;
    if (!parsed || !Array.isArray(parsed.segments) || !parsed.segments.length) throw new Error("plan Gemini illisible ou vide");
    const segments = sanitizeSegments(parsed.segments, clips, targetDuration);
    if (!segments.length) throw new Error("plan Gemini sans segment exploitable");
    const plannedTotal = plannedDurationSeconds(segments);
    const captions = buildTimedCaptions(parsed.captions, chunks, Math.max(plannedTotal, targetDuration ?? 0));
    return {
      plan: { segments, captions, source: "gemini" },
      gemini: { model: response.model, inputTokens: response.inputTokens, outputTokens: response.outputTokens, costUsd: response.costUsd, latencyMs: Date.now() - startedAt, success: true },
    };
  } catch {
    // Plan de secours déterministe : même sans Gemini (quota, timeout, JSON cassé),
    // le montage part quand même — coupes équitables, captions réparties à égalité.
    const segments = fallbackSegments(clips, targetDuration);
    const total = plannedDurationSeconds(segments);
    return {
      plan: { segments, captions: evenCaptions(chunks, total), source: "fallback" },
      gemini: { model: "gemini-3.1-flash-lite", inputTokens: 0, outputTokens: 0, costUsd: 0, latencyMs: Date.now() - startedAt, success: false },
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Sous-titres ASS (2 styles : police choisie + secours arabe)        */
/* ------------------------------------------------------------------ */

const CAPTION_COLORS: Record<string, string> = {
  white: "&H00FFFFFF", yellow: "&H0000EFFF", cyan: "&H00FFFF00", pink: "&H00FF66FF", lime: "&H0000FF66",
  orange: "&H000080FF", blue: "&H00FFCC00", red: "&H000000FF", purple: "&H00CC66FF", gold: "&H0000D7FF",
  mint: "&H00AAFFDD", sky: "&H00FFDD88", coral: "&H005080FF", violet: "&H00EE99FF", cream: "&H00DDFFFF",
  electric: "&H00FFFF00", rose: "&H007799FF", aqua: "&H00FFFFAA", sun: "&H0000CCFF", mono: "&H00FFFFFF",
};
const CAPTION_STYLE_NAMES = ["bold", "boxed", "shadow", "outline", "karaoke", "minimal", "neon", "bubble", "lower", "center", "top", "impact", "clean", "marker", "glow", "split", "rounded", "news", "reel", "cinema"];
export const MONTAGE_CAPTION_STYLES = CAPTION_STYLE_NAMES;
export const MONTAGE_CAPTION_THEMES = Object.keys(CAPTION_COLORS);

function assTime(seconds: number): string {
  const cs = Math.max(0, Math.round(seconds * 100));
  const h = Math.floor(cs / 360000);
  const m = Math.floor((cs % 360000) / 6000);
  const s = Math.floor((cs % 6000) / 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs % 100).padStart(2, "0")}`;
}
function assEscape(value: string): string { return value.replace(/[{}]/g, "").replace(/\\/g, "\\\\").replace(/\n/g, " "); }

/** Coupe une ligne trop longue en 2 lignes équilibrées (sur espaces — sans
 *  jamais couper un mot arabe en deux). */
function assWrap(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const words = text.split(" ");
  if (words.length < 2) return text;
  const half = Math.floor(text.length / 2);
  let best = -1;
  let bestDistance = Infinity;
  let offset = 0;
  for (let index = 0; index < words.length - 1; index += 1) {
    offset += words[index].length + 1;
    const distance = Math.abs(offset - half);
    if (distance < bestDistance) { bestDistance = distance; best = index; }
  }
  return `${words.slice(0, best + 1).join(" ")}\\N${words.slice(best + 1).join(" ")}`;
}

export function buildCaptionsAss(captions: MontageCaption[], fontFamily: string, theme: string, style: string, requestedSize?: number, fallbackFontFamily: string = ARABIC_FALLBACK_FONT): string {
  const primaryFont = fontFamily || ARABIC_FALLBACK_FONT;
  const needsArabicFallback = fallbackFontFamily !== primaryFont && captions.some((caption) => hasArabicScript(caption.text));
  const longest = captions.reduce((max, caption) => Math.max(max, caption.text.length), 0);
  const autoSize = longest > 46 ? 36 : longest > 38 ? 42 : longest > 30 ? 48 : 54;
  const fontSize = Math.max(24, Math.min(76, Math.round(Number(requestedSize) || autoSize)));
  const color = CAPTION_COLORS[CAPTION_COLORS[theme] ? theme : "white"];
  const styleName = CAPTION_STYLE_NAMES.includes(style) ? style : "bold";
  const bold = !["minimal", "cinema"].includes(styleName) ? 1 : 0;
  const outline = ["boxed", "outline", "neon", "impact", "news", "reel"].includes(styleName) ? 4 : 2;
  const alignment = ["top", "news"].includes(styleName) ? 8 : ["lower"].includes(styleName) ? 2 : 5;
  const marginV = alignment === 8 ? 100 : alignment === 2 ? 180 : 260;
  const styleLine = (name: string, font: string) =>
    `Style: ${name},${font},${fontSize},${color},${color},&H00101010,&H99000000,${bold},0,0,0,100,100,0,0,1,${outline},2,${alignment},36,36,${marginV},1`;
  const header = [
    "[Script Info]",
    "ScriptType: v4.00+",
    "PlayResX: 720",
    "PlayResY: 1280",
    "WrapStyle: 0",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    styleLine("Sawtify", primaryFont),
    ...(needsArabicFallback ? [styleLine("SawtifyAr", fallbackFontFamily)] : []),
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    "",
  ].join("\n");
  const events = captions.map((caption) => {
    const styleForLine = needsArabicFallback && hasArabicScript(caption.text) ? "SawtifyAr" : "Sawtify";
    return `Dialogue: 0,${assTime(caption.start)},${assTime(caption.end)},${styleForLine},,0,0,0,,${assWrap(assEscape(caption.text), 34)}`;
  });
  return header + events.join("\n") + "\n";
}

/* ------------------------------------------------------------------ */
/*  Construction de la commande FFmpeg                                 */
/* ------------------------------------------------------------------ */

function escapeFilterPath(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'");
}

export function buildMontageFfmpegArgs(options: {
  clips: MontageClip[];
  segments: MontageSegment[];
  audioMode: MontageAudioMode;
  audioPath: string | null;
  captionsPath: string | null;
  fontsDir: string | null;
  outputPath: string;
  targetDuration: number | null;
}): string[] {
  const { clips, segments, audioMode, audioPath, captionsPath, fontsDir, outputPath, targetDuration } = options;
  const inputArgs: string[] = [];
  clips.forEach((clip) => {
    if (clip.kind === "image") inputArgs.push("-loop", "1");
    inputArgs.push("-i", clip.path);
  });
  let nextInputIndex = clips.length;
  let voiceAudioInputIndex = -1;
  if (audioMode === "voice" && audioPath) {
    voiceAudioInputIndex = nextInputIndex;
    nextInputIndex += 1;
    inputArgs.push("-i", audioPath);
  }
  // Mode « audio d'origine » : les images (et les vidéos muettes) reçoivent du
  // silence généré, pour que l'audio reste aligné avec la vidéo découpée.
  const silenceInputByClip = new Map<number, number>();
  if (audioMode === "original") {
    for (const segment of segments) {
      const clip = clips[segment.clip];
      if (clip.kind === "video" && clip.hasAudio) continue;
      const duration = segment.end - segment.start + (segment.freeze ?? 0);
      inputArgs.push("-f", "lavfi", "-t", duration.toFixed(3), "-i", "anullsrc=sample_rate=44100:channel_layout=stereo");
      silenceInputByClip.set(segment.clip, nextInputIndex);
      nextInputIndex += 1;
    }
  }

  const chains: string[] = [];
  const videoLabels: string[] = [];
  const audioLabels: string[] = [];
  segments.forEach((segment, position) => {
    const clip = clips[segment.clip];
    const isLast = position === segments.length - 1;
    let video = `[${segment.clip}:v]trim=start=${segment.start.toFixed(3)}:end=${segment.end.toFixed(3)},setpts=PTS-STARTPTS,scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,setsar=1,fps=30,format=yuv420p`;
    if (isLast && (segment.freeze ?? 0) > 0.05) video += `,tpad=stop_mode=clone:stop_duration=${segment.freeze!.toFixed(3)}`;
    video += `[v${position}]`;
    chains.push(video);
    videoLabels.push(`[v${position}]`);
    if (audioMode === "original") {
      const duration = segment.end - segment.start + (segment.freeze ?? 0);
      const silenceIndex = silenceInputByClip.get(segment.clip);
      const audio = silenceIndex !== undefined
        ? `[${silenceIndex}:a]atrim=start=0:end=${duration.toFixed(3)},asetpts=PTS-STARTPTS`
        : `[${segment.clip}:a]atrim=start=${segment.start.toFixed(3)}:end=${segment.end.toFixed(3)},asetpts=PTS-STARTPTS`;
      chains.push(`${audio}[a${position}]`);
      audioLabels.push(`[a${position}]`);
    }
  });

  let baseVideoLabel = videoLabels[0];
  let baseAudioLabel = audioLabels[0];
  if (segments.length > 1) {
    chains.push(`${videoLabels.join("")}concat=n=${segments.length}:v=1:a=0[vbase]`);
    baseVideoLabel = "[vbase]";
    if (audioMode === "original") {
      // Concat audio séparé (v=0:a=1) : le concat mixte v=1:a=1 attendrait des
      // entrées vidéo/audio entrelacées, pas nos flux déjà normalisés.
      chains.push(`${audioLabels.join("")}concat=n=${segments.length}:v=0:a=1[abase]`);
      baseAudioLabel = "[abase]";
    }
  }

  let finalVideoLabel = baseVideoLabel;
  if (captionsPath) {
    const fontsPart = fontsDir ? `:fontsdir='${escapeFilterPath(fontsDir)}'` : "";
    chains.push(`${baseVideoLabel}subtitles=filename='${escapeFilterPath(captionsPath)}'${fontsPart}[vout]`);
    finalVideoLabel = "[vout]";
  }

  const args: string[] = ["-y", ...inputArgs, "-filter_complex", chains.join(";"), "-map", finalVideoLabel];
  if (audioMode === "voice" && voiceAudioInputIndex >= 0) args.push("-map", `${voiceAudioInputIndex}:a`);
  else if (audioMode === "original" && segments.length > 0) args.push("-map", baseAudioLabel);
  if (targetDuration && targetDuration > 0) args.push("-t", targetDuration.toFixed(3));
  args.push(
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-crf", "26",
    "-threads", "2",
    "-c:a", "aac",
    "-b:a", "128k",
    "-ar", "44100",
    "-ac", "2",
    "-movflags", "+faststart",
    outputPath,
  );
  return args;
}

export function runFfmpeg(ffmpegPath: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) return reject(new Error("FFmpeg indisponible."));
    const child = spawn(ffmpegPath, args, { stdio: ["ignore", "ignore", "pipe"] });
    let error = "";
    child.stderr?.on("data", (chunk) => { error = `${error}${chunk}`.slice(-6000); });
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`FFmpeg: ${error}`))));
  });
}

/** Durée finale prévue par le plan (segments + gel éventuel de la dernière image). */
export function plannedDurationSeconds(segments: MontageSegment[]): number {
  return segments.reduce((sum, segment) => sum + (segment.end - segment.start) + (segment.freeze ?? 0), 0);
}
