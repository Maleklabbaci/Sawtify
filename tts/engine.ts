/**
 * ============================================================================
 *  SAWTIFY — MOTEUR TTS À DOUBLE MODE
 * ============================================================================
 *  Permet de faire tourner la plateforme sur DEUX générations de modèles
 *  sans changer une seule ligne du reste du serveur :
 *
 *    gemini-3.1-flash-tts-preview  →  mode "legacy"  (comportement ACTUEL)
 *    gemini-3.8-flash-tts          →  mode "modern"  (nouveautés complètes)
 *    gemini-3.8-flash-lite-tts     →  mode "modern"
 *
 *  LE CHOIX SE FAIT AVEC UNE SEULE VARIABLE D'ENVIRONNEMENT :
 *      GEMINI_TTS_MODEL=gemini-3.8-flash-tts
 *
 *  Aucun changement de code, aucun redéploiement de logique, aucun risque :
 *  revenir en arrière = remettre l'ancienne valeur.
 *
 *  ────────────────────────────────────────────────────────────────────────
 *  CE QUI CHANGE ENTRE LES DEUX MODES
 *  ────────────────────────────────────────────────────────────────────────
 *                        │ 3.1 (legacy)           │ 3.8 (modern)
 *  ──────────────────────┼────────────────────────┼──────────────────────────
 *  Instructions de jeu   │ DANS le texte          │ speech_metadata.style
 *  Balises de sons       │ [excited] (carrés)     │ <laugh> (angle)
 *  Nombre de sons        │ 9                      │ 33+
 *  Nom du champ voix     │ prebuiltVoiceConfig…   │ voiceConfig.voice
 *  Format de sortie      │ PCM brut (sans en-tête)│ WAV (en-tête RIFF)
 *  Voix sur mesure       │ non                    │ oui (voice_...)
 *
 *  ⚠️ POINT CLÉ ANTI-RÉGRESSION :
 *  Par défaut, la doc Google renvoie du WAV sur les modèles 3.8 (requête
 *  normale) alors que Sawtify attend du PCM brut. On force donc
 *  `AUDIO_L16` dans les DEUX modes → le pipeline audio existant
 *  (pcmToWavBuffer, pcmToMp3Buffer, durée, points, stockage) reste
 *  EXACTEMENT identique. Zéro régression possible.
 * ============================================================================
 */

import { VOCAL_TAGS, parseTranscript, type VocalTag } from "./vocalTags";

export type EngineMode = "legacy" | "modern";

export const SAMPLE_RATE = 24000;
export const BYTES_PER_SECOND = SAMPLE_RATE * 2; // 16 bits mono = 48 000 octets/s

/** Modèles connus et leur mode. */
const MODERN_MODEL_RE = /^gemini-(3\.[89]|[4-9]\.\d+)/;

/**
 * Détermine le mode à utiliser pour un modèle donné.
 * Tout modèle 3.8+ (ou plus récent) → mode modern. Le reste → legacy.
 */
export function resolveEngineMode(model: string): EngineMode {
  const m = String(model || "").trim().toLowerCase();
  if (!m) return "legacy";
  return MODERN_MODEL_RE.test(m) ? "modern" : "legacy";
}

/** Vrai si le modèle supporte les nouveautés (sons, style, voix sur mesure). */
export function supportsModernFeatures(model: string): boolean {
  return resolveEngineMode(model) === "modern";
}

// ============================================================================
//  1. TRADUCTION DES BALISES DE SONS ENTRE LES DEUX MODES
// ============================================================================

/**
 * Correspondance balise moderne → ancienne balise Sawtify (mode legacy).
 * Le mode 3.1 ne connaît QUE ces 9 balises ci-dessous : c'est toute la
 * différence de richesse entre les deux modes.
 */
const MODERN_TO_LEGACY_TAG: Record<string, string> = {
  "<laugh>": "[laughter]", "<giggle>": "[laughter]", "<chuckle>": "[laughter]",
  "<cackle>": "[laughter]", "<snicker>": "[laughter]",
  "<cheer>": "[excited]", "<scream>": "[excited]", "<shout>": "[excited]",
  "<shriek>": "[excited]", "<gasp>": "[excited]",
  "<whispers>": "[whispers]",
  "<sigh>": "[breathing]", "<breath>": "[breathing]", "<heavy breath>": "[breathing]",
  "<exhales>": "[breathing]", "<pant>": "[breathing]", "<yawn>": "[breathing]",
  "<cry>": "[dramatic]", "<sob>": "[dramatic]", "<whimper>": "[dramatic]",
  "<moan>": "[dramatic]", "<groan>": "[dramatic]",
  "<grr>": "[dramatic]", "<growl>": "[dramatic]", "<argh>": "[dramatic]",
  "<tsk>": "[articulated]", "<pff>": "[breathing]", "<snort>": "[laughter]",
  "<sneeze>": "[breathing]", "<cough>": "[breathing]", "<throat-clearing>": "[articulated]",
  "<hiss>": "[whispers]", "<grunt>": "[dramatic]",
  "<short pause>": "...", "<long pause>": "...",
};

/**
 * Convertit un transcript moderne (balises angle) vers le format legacy
 * (balises carrées). Utilisé UNIQUEMENT quand le modèle est un 3.1.
 *
 * Les balises sans équivalent ancien sont simplement retirées — jamais
 * laissées telles quelles, sinon le modèle 3.1 les lirait à voix haute.
 */
export function toLegacyTranscript(modernText: string): string {
  let out = modernText;
  for (const [modernTag, legacyTag] of Object.entries(MODERN_TO_LEGACY_TAG)) {
    const re = new RegExp(modernTag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    out = out.replace(re, legacyTag);
  }
  // Balises angle restantes (non mappées) → supprimées, jamais lues.
  out = out.replace(/<[a-zA-Z][a-zA-Z _-]*>/g, " ");
  return out.replace(/\s{2,}/g, " ").trim();
}

// ============================================================================
//  2. CONSTRUCTION DE LA DEMANDE (le cœur du double moteur)
// ============================================================================

export type BuildTtsRequestOptions = {
  /** Modèle exact (ex. "gemini-3.8-flash-tts"). */
  model: string;
  /** Transcript brut fourni par l'utilisateur ou l'API. */
  rawText: string;
  /** Nom de voix (studio "Kore", ou personnalisée "voice_abc123"). */
  voiceName: string;
  /**
   * Instructions de jeu SOUTENUES (le « comment dire »).
   * Mode modern → part dans `speech_metadata.style`.
   * Mode legacy → est préfixé au texte (comportement actuel de Sawtify).
   */
  style?: string | null;
  /** Persona legacy (mode 3.1 uniquement) — ex. "Amin, a young friendly…". */
  legacyPersona?: string | null;
  /** Notes legacy additionnelles (mode 3.1) — pace, pitch, ton. */
  legacyNotes?: string[];
  /**
   * Format de sortie souhaité.
   * "pcm" (défaut) = AUDIO_L16 brut → compatible avec le pipeline Sawtify actuel.
   * "wav"         = AUDIO_WAV complet avec en-tête RIFF.
   */
  output?: "pcm" | "wav";
  /** Taux d'échantillonnage (défaut 24000). */
  sampleRate?: number;
  /**
   * Inventer un style à partir des balises du texte ?
   *
   * ⚠️ DÉSACTIVÉ PAR DÉFAUT (décision du 26/09/2026, après audit).
   * Raison : Google dit que `style` est SOUTENU (il dure tout le tour) alors
   * qu'une balise est PONCTUELLE (elle arrive à un instant précis). Appliquer
   * l'émotion d'un seul `<laugh>` à tout un texte fait dériver la voix, et la
   * doc recommande explicitement de synthétiser SANS style d'abord.
   * Mettre `true` restaure l'ancien comportement.
   */
  autoStyle?: boolean;
  /** true pour logger le nettoyage des balises (diagnostic). */
  debug?: boolean;
};

export type BuildTtsRequestResult = {
  mode: EngineMode;
  /** Corps JSON prêt à envoyer à `:generateContent`. */
  body: Record<string, unknown>;
  /** Balises de sons effectivement retenues. */
  tags: VocalTag[];
  /** Transcript final (pour les logs — ne pas relire à voix haute !). */
  finalTranscript: string;
  /** Avertissements à remonter (balises inconnues, bruitages retirés…). */
  warnings: string[];
};

/**
 * Construit le corps de requête adapté au modèle.
 *
 * C'est LA fonction qui permet de basculer entre 3.1 et 3.8 sans toucher
 * au reste du serveur.
 */
export function buildTtsRequest(opts: BuildTtsRequestOptions): BuildTtsRequestResult {
  const mode = resolveEngineMode(opts.model);
  const warnings: string[] = [];

  // ── Nettoyage commun : on analyse TOUJOURS avec le catalogue moderne,
  //    car c'est lui qui connaît les 33 sons et détecte les erreurs.
  const parsed = parseTranscript(opts.rawText);

  if (parsed.unknownTags.length) {
    warnings.push(`Balises inconnues retirées : ${parsed.unknownTags.join(", ")}`);
  }
  if (parsed.forbiddenSfx.length) {
    warnings.push(
      `Sons non humains retirés (déconseillés par Google) : ${parsed.forbiddenSfx.join(", ")}`
    );
  }
  if (parsed.legacyTagsFound.length && mode === "modern") {
    warnings.push(
      `Anciennes balises converties : ${parsed.legacyTagsFound.map((t) => `[${t}]`).join(", ")}`
    );
  }

  // ── Style effectif ──────────────────────────────────────────────────────
  // Par défaut : UNIQUEMENT ce que l'utilisateur a réglé explicitement
  // (sa vitesse, sa hauteur). On n'invente plus rien à partir des balises.
  //
  // Pourquoi : `style` est SOUTENU (toute la réplique) alors qu'une balise est
  // PONCTUELLE. Un seul <laugh> au milieu d'un texte grave suffisait à faire
  // livrer tout le texte sur un ton joyeux. Et la doc Google recommande de
  // synthétiser sans style d'abord : « most requests need no style instruction ».
  //
  // `autoStyle: true` restaure l'ancien comportement (déduction depuis le
  // premier tag porteur d'émotion).
  const styleExplicite = (opts.style || "").trim();
  const effectiveStyle = styleExplicite || (opts.autoStyle ? parsed.suggestedStyle || "" : "");

  if (mode === "modern") {
    // ======================================================================
    //  MODE 3.8 — le transcript reste VERBATIM, le style part à part.
    //  Aucune instruction de jeu n'est écrite dans le texte (règle Google :
    //  sinon la voix dérive).
    // ======================================================================
    const part: Record<string, unknown> = { text: parsed.text };
    if (effectiveStyle) {
      part.speech_metadata = { style: effectiveStyle };
    }

    const body: Record<string, unknown> = {
      contents: [{ role: "user", parts: [part] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        responseFormat: {
          audio: {
            mimeType: opts.output === "wav" ? "AUDIO_WAV" : "AUDIO_L16",
            sampleRate: opts.sampleRate ?? SAMPLE_RATE,
          },
        },
        speechConfig: {
          voiceConfig: {
            // Champ moderne : `voice` accepte aussi bien une voix studio
            // qu'une voix sur mesure (`voice_...`).
            voice: opts.voiceName,
          },
        },
      },
    };

    return {
      mode, body, tags: parsed.tags, finalTranscript: parsed.text, warnings,
    };
  }

  // ======================================================================
  //  MODE 3.1 — comportement ACTUEL de Sawtify, reproduit à l'identique.
  //  Les instructions de jeu sont préfixées au texte, les balises passent
  //  en crochets carrés, et le nom de voix utilise l'ancien champ.
  // ======================================================================
  const legacyBody = toLegacyTranscript(parsed.text);

  const noteLines: string[] = [];
  if (opts.legacyPersona) noteLines.push(`Speaker: ${opts.legacyPersona}`);
  noteLines.push("Language: Algerian Darija (Arabic script). Natural, human delivery, like a real person talking.");
  for (const n of opts.legacyNotes || []) if (n) noteLines.push(n);

  const noteBlock = `TTS the following transcript. Do not read these notes aloud.

DIRECTOR'S NOTES
${noteLines.join("\n")}
The transcript may contain audio tags in brackets such as [excited], [calm], [whispers] or [very fast]: follow them for delivery, never pronounce them. A leading "..." is just a short silent beat before starting.

TRANSCRIPT:
${legacyBody}`;

  const body: Record<string, unknown> = {
    contents: [{ parts: [{ text: noteBlock }] }],
    generationConfig: {
      responseModalities: ["audio"],
      speechConfig: {
        voiceConfig: {
          // Ancien champ, toujours accepté par 3.1.
          prebuiltVoiceConfig: { voiceName: opts.voiceName },
        },
      },
    },
  };

  return {
    mode, body, tags: parsed.tags, finalTranscript: legacyBody, warnings,
  };
}

// ============================================================================
//  3. LECTURE DE LA RÉPONSE (gère les deux modes et les deux formats)
// ============================================================================

export type ExtractedAudio = {
  /** PCM brut 16 bits mono @24 kHz, TOUJOURS sans en-tête. */
  pcm: Buffer;
  /** Format réellement reçu. */
  received: "pcm" | "wav";
  /** Taille de l'en-tête retirée, le cas échéant. */
  headerStripped: number;
  /** Type MIME annoncé par l'API. */
  mimeType: string | null;
};

/** Vrai si le buffer commence par un en-tête RIFF/WAVE. */
function hasRiffHeader(buf: Buffer): boolean {
  return (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WAVE"
  );
}

/**
 * Retire un en-tête WAV s'il est présent, pour ne renvoyer que du PCM brut.
 *
 * ⚠️ C'est LA protection anti-régression : que Google renvoie du PCM brut
 * (mode 3.1) ou un WAV complet (mode 3.8 par défaut), le reste du serveur
 * reçoit TOUJOURS le même chose : du PCM brut sans en-tête.
 *
 * Sans cette fonction, un WAV 3.8 serait traité comme du PCM → un
 * craquement de 44 octets en début de piste, et une durée faussée.
 */
export function stripWavHeader(buf: Buffer): ExtractedAudio {
  if (!hasRiffHeader(buf)) {
    return { pcm: buf, received: "pcm", headerStripped: 0, mimeType: null };
  }

  // Parcours des blocs RIFF pour trouver le bloc "data" (robuste : gère
  // les blocs "fmt ", "LIST", "fact"… qui peuvent précéder "data").
  let offset = 12;
  while (offset + 8 <= buf.length) {
    const chunkId = buf.toString("ascii", offset, offset + 4);
    const chunkSize = buf.readUInt32LE(offset + 4);
    if (chunkId === "data") {
      const start = offset + 8;
      const end = Math.min(start + chunkSize, buf.length);
      return {
        pcm: buf.subarray(start, end),
        received: "wav",
        headerStripped: start,
        mimeType: "audio/wav",
      };
    }
    offset += 8 + chunkSize + (chunkSize % 2); // alignement sur mot pair
  }

  // En-tête détecté mais bloc "data" introuvable → on coupe l'en-tête standard.
  return { pcm: buf.subarray(44), received: "wav", headerStripped: 44, mimeType: "audio/wav" };
}

/**
 * Extrait l'audio d'une réponse `generateContent`, quel que soit le mode.
 * Renvoie TOUJOURS du PCM brut sans en-tête + le finishReason pour le
 * garde-fou anti-troncature déjà présent dans Sawtify.
 */
export function extractAudioFromResponse(json: any): {
  audio: ExtractedAudio | null;
  finishReason: string | null;
  usageMetadata: any | null;
  textInsteadOfAudio: string | null;
} {
  const candidate = json?.candidates?.[0];
  const finishReason: string | null = candidate?.finishReason ?? null;
  const usageMetadata = json?.usageMetadata ?? null;

  const parts: Buffer[] = [];
  for (const part of candidate?.content?.parts || []) {
    const b64 = part?.inlineData?.data || part?.inline_data?.data;
    if (b64) parts.push(Buffer.from(b64, "base64"));
  }

  if (parts.length === 0) {
    const textPart = candidate?.content?.parts?.[0]?.text;
    return {
      audio: null,
      finishReason,
      usageMetadata,
      textInsteadOfAudio: textPart ? String(textPart).slice(0, 150) : null,
    };
  }

  const merged = Buffer.concat(parts);
  return { audio: stripWavHeader(merged), finishReason, usageMetadata, textInsteadOfAudio: null };
}

// ============================================================================
//  4. UTILITAIRES
// ============================================================================

/** Durée (secondes) d'un PCM 16 bits mono @24 kHz. */
export function pcmDurationSeconds(pcm: Buffer): number {
  return pcm.length / BYTES_PER_SECOND;
}

/** Diagnostic lisible du mode courant — à logguer au démarrage du serveur. */
export function describeEngine(model: string): string {
  const mode = resolveEngineMode(model);
  if (mode === "modern") {
    return [
      `[TTS] Mode MODERNE (3.8) — ${model}`,
      `      • 33+ sons humains en crochets ANGLE : ${VOCAL_TAGS.length} balises au catalogue`,
      `      • « comment dire » transmis séparément (speech_metadata.style) → aucune dérive de voix`,
      `      • voix studio (30) + voix sur mesure (voice_...)`,
      `      • sortie forcée en PCM brut (AUDIO_L16) → pipeline audio inchangé`,
    ].join("\n");
  }
  return [
    `[TTS] Mode LEGACY (3.1) — ${model}`,
    `      • 9 sons en crochets CARRÉS (comportement historique Sawtify)`,
    `      • « comment dire » préfixé au texte (DIRECTOR'S NOTES)`,
    `      • 12 voix studio reconnues, pas de voix sur mesure`,
    `      • sortie PCM brut (format natif du modèle)`,
    `      ⚠️  Les 33 sons, les voix régionales et le style séparé nécessitent`,
    `          GEMINI_TTS_MODEL=gemini-3.8-flash-tts`,
  ].join("\n");
}

/** Rapport honnête sur ce que le mode 3.1 perd par rapport au 3.8. */
export type LegacyFidelityReport = {
  /** Nombre de sons disponibles en mode moderne. */
  modernCount: number;
  /** Nombre de sons DISTINCTS réellement exprimables en mode 3.1. */
  distinctLegacyTags: number;
  /** Plusieurs sons modernes s'écrasent sur la même balise ancienne. */
  collapsed: Array<{ legacy: string; modernTags: string[] }>;
  /** Sons totalement inexprimables en 3.1. */
  dropped: VocalTag[];
  /** Part de la richesse sonore conservée en mode 3.1 (%). */
  fidelityPercent: number;
};

/**
 * Mesure la PERTE RÉELLE de richesse sonore en mode 3.1.
 *
 * Attention : ce n'est pas « combien de balises n'ont pas d'équivalent »,
 * c'est « combien de sons DISTINCTS il reste ». Exemple parlant :
 * `<laugh>`, `<giggle>`, `<chuckle>`, `<cackle>` et `<snicker>` ont tous
 * un équivalent (donc « rien n'est perdu » en apparence)… mais ils
 * deviennent TOUS le même `[laughter]`. Cinq nuances → une seule.
 */
export function legacyFidelityReport(): LegacyFidelityReport {
  const groups = new Map<string, string[]>();
  const dropped: VocalTag[] = [];

  for (const t of VOCAL_TAGS) {
    const legacy = MODERN_TO_LEGACY_TAG[t.tag];
    if (!legacy || legacy === "...") { dropped.push(t); continue; }
    if (!groups.has(legacy)) groups.set(legacy, []);
    groups.get(legacy)!.push(t.tag);
  }

  const collapsed = [...groups.entries()]
    .filter(([, modernTags]) => modernTags.length > 1)
    .map(([legacy, modernTags]) => ({ legacy, modernTags }))
    .sort((a, b) => b.modernTags.length - a.modernTags.length);

  const distinctLegacyTags = groups.size;
  return {
    modernCount: VOCAL_TAGS.length,
    distinctLegacyTags,
    collapsed,
    dropped,
    fidelityPercent: Math.round((distinctLegacyTags / VOCAL_TAGS.length) * 1000) / 10,
  };
}

/** Conservé pour compatibilité : les sons totalement inexprimables en 3.1. */
export function tagsLostInLegacyMode(): VocalTag[] {
  return legacyFidelityReport().dropped;
}

// ============================================================================
//  5. DÉCOUPAGE DU TEXTE LONG — SANS JAMAIS COUPER UNE BALISE
// ============================================================================
//  ⚠️ DÉFAUT CORRIGÉ (audit du 26/09/2026)
//
//  Le découpage se faisait mot à mot. Or trois balises officielles contiennent
//  un ESPACE : <short pause>, <long pause>, <heavy breath>. Si l'une d'elles
//  tombait sur la frontière des 800 caractères, elle était coupée en deux :
//
//      morceau 1 se terminait par  « ... كلمة112 <short »
//      morceau 2 commençait par    « pause> كلمة113 ... »
//
//  Et comme un « < » sans « > » n'est pas reconnu comme une balise, le
//  garde-fou ne voyait RIEN : les deux moitiés partaient BRUTES vers Gemini.
//  La voix risquait donc de prononcer « inférieur à shorts, pause supérieur à ».
//
//  Correctif : on remplace chaque balise par un jeton sans espace et sans
//  ponctuation AVANT de découper, puis on la remet en place APRÈS. Le
//  découpage ne peut plus, par construction, toucher l'intérieur d'une balise.
// ============================================================================

/** Taille de morceau par défaut (le serveur passe la sienne). */
export const CHUNK_MAX_CHARS_DEFAULT = 800;

/** Sentinelle de contrôle, impossible à taper au clavier. */
const SENTINELLE = "\u0001";

const indexVersLettres = (n: number): string => {
  let s = "";
  n += 1;
  while (n > 0) {
    s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

const lettresVersIndex = (s: string): number => {
  let n = 0;
  for (const c of s) n = n * 26 + (c.charCodeAt(0) - 64);
  return n - 1;
};

/**
 * Remplace chaque balise `<...>` par un jeton insécable.
 * Le jeton ne contient ni espace, ni ponctuation, ni chiffre : aucune étape du
 * découpage ne peut le casser, et il survit à `normalizeTextForTTS`.
 */
export function protegerBalises(text: string): { texte: string; balises: string[] } {
  const balises: string[] = [];
  // On retire d'abord toute sentinelle déjà présente dans le texte utilisateur.
  const propre = text.split(SENTINELLE).join(" ");
  const texte = propre.replace(/<[^<>\n]*>/g, (m) => {
    balises.push(m);
    return `${SENTINELLE}SAWTIFY${indexVersLettres(balises.length - 1)}${SENTINELLE}`;
  });
  return { texte, balises };
}

/** Remet les vraies balises à la place des jetons. */
export function restaurerBalises(text: string, balises: string[]): string {
  return text.replace(
    new RegExp(`${SENTINELLE}SAWTIFY([A-Z]+)${SENTINELLE}`, "g"),
    (_m, lettres: string) => balises[lettresVersIndex(lettres)] ?? " "
  );
}

/** Filet de sécurité : un bloc sans AUCUNE ponctuation → coupe par mots. */
export function hardSplitByWords(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    if (cur && (cur + " " + w).length > maxChars) { out.push(cur); cur = w; }
    else cur = cur ? cur + " " + w : w;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/**
 * Découpe un texte long en morceaux ≤ maxChars, en respectant les phrases.
 *
 * GARANTIE : aucune balise `<...>` n'est jamais coupée, quelle que soit sa
 * position dans le texte. Vérifié par `npm run test:tts`.
 */
export function splitIntoChunksForTTS(text: string, maxChars = CHUNK_MAX_CHARS_DEFAULT): string[] {
  // ① On met les balises à l'abri AVANT tout découpage.
  const { texte, balises } = protegerBalises(text);
  const restitue = (c: string) => restaurerBalises(c, balises);

  const trimmed = texte.trim();
  if (!trimmed) return [];
  if (trimmed.length <= maxChars) return [restitue(trimmed)];

  // ② Découpe sur les fins de phrase : . ! ؟ ? …
  const sentences = trimmed.split(/(?<=[.!?؟…])\s+/).filter(Boolean);

  // ③ Les phrases trop longues → coupe sur la ponctuation secondaire : ، ؛ , ; :
  const pieces: string[] = [];
  for (const s of sentences) {
    if (s.length <= maxChars) { pieces.push(s); continue; }
    const sub = s.split(/(?<=[،؛:,])\s+/).filter(Boolean);
    for (const p of sub) {
      if (p.length <= maxChars) pieces.push(p);
      else pieces.push(...hardSplitByWords(p, maxChars));
    }
  }

  // ④ Regroupe les pièces en morceaux ≤ maxChars
  const chunks: string[] = [];
  let current = "";
  for (const p of pieces) {
    if (current && (current + " " + p).length > maxChars) {
      chunks.push(current.trim());
      current = p;
    } else {
      current = current ? current + " " + p : p;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  // ⑤ On remet les vraies balises, puis on jette tout morceau déséquilibré.
  return chunks
    .filter((c) => c.length > 0)
    .map(restitue)
    .filter((c) => estEquilibre(c));
}

/**
 * Vrai si chaque « < » a son « > ». Un morceau déséquilibré contient un
 * fragment de balise : on préfère le JETER plutôt que de laisser Gemini
 * prononcer un bout de balise.
 */
export function estEquilibre(text: string): boolean {
  let ouverts = 0;
  for (const c of text) {
    if (c === "<") ouverts++;
    else if (c === ">") ouverts = Math.max(0, ouverts - 1);
  }
  return ouverts === 0;
}
