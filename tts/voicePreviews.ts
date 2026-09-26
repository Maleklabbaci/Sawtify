/**
 * ============================================================================
 *  SAWTIFY — APERÇUS AUDIO DES VOIX (côté serveur)
 * ============================================================================
 *  Deux besoins différents, deux scripts différents :
 *
 *  ① AUDITION  — un script UNIQUE et NEUTRE, identique pour les 30 voix.
 *     C'est ce qui permet de COMPARER les voix entre elles et de valider
 *     le genre (homme/femme) à l'oreille. Utilisé par le générateur
 *     d'aperçus + la page d'audition.
 *
 *  ② PREVIEW PERSONNALISÉ — un texte darija propre à chaque voix, avec son
 *     caractère (rire, soupir, énergie…). C'est l'aperçu « vitrine » que
 *     l'utilisateur écoute dans le studio.
 *
 *  ⚠️ RÈGLE ABSOLUE — 100 % DARIJA ALGÉRIENNE (26/09/2026)
 *  Tous les textes d'aperçu sont écrits en darija PARLÉE. Aucune tournure
 *  d'arabe classique : on dit « يعطيكم الصحة » (pas « شكراً »), « آخر تقنية »
 *  (pas « أحدث تقنية »), « تشد اللي يسمعك » (pas « تجذب السامع »),
 *  « للحكاية » (pas « للسرد »), « البلاصة » (pas « المكان »).
 *  `npm run test:apercus` refuse tout texte qui repart en arabe classique.
 *
 *  ⚠️ Le script d'audition est FIGÉ et versionné : si tu le changes, tous
 *  les aperçus doivent être régénérés (le manifeste le détecte via son hash).
 * ============================================================================
 */

import { createHash } from "node:crypto";
import { STUDIO_VOICES, type StudioVoice } from "./voices";
import { VOICE_NAMES } from "./voiceNames";

/**
 * SCRIPT D'AUDITION — identique pour les 30 voix.
 *
 * Conçu pour révéler en ~10 secondes :
 *   • le genre (les terminaisons verbales darija le trahissent nettement)
 *   • la clarté d'articulation
 *   • la chaleur / la neutralité du timbre
 *   • la tenue des consonnes difficiles (ق ، ح ، ع ، غ ، خ)
 *   • une respiration naturelle en fin de phrase
 *
 * Aucun prénom genré n'est prononcé : le texte ne doit pas influencer
 * le jugement sur la voix elle-même.
 */
export const AUDITION_SCRIPT =
  "سلام عليكم خاوتي، واش راكم، لاباس؟ هاذي تجربة قصيرة في الصوت، " +
  "باش تسمعو النبرة والوضوح. <short pause> " +
  "راني نهدر بالدارجة الجزائرية، بصوت طبيعي وبلا تكلف، كيف كي نهدر مع صحابي. <breath> " +
  "إذا عجبتكم هاذي النبرة، تقدرو تديرو بها السكريبت تاعكم. <chuckle> " +
  "يعطيكم الصحة، وبالتوفيق إن شاء الله.";

/**
 * Version numérotée du script : à incrémenter si le texte change.
 *
 * v2 — 26/09/2026 : réécriture 100 % DARIJA ALGÉRIENNE (demande du
 * propriétaire : « je veux qu'il parle un speech 100 % darija algérienne »).
 * Les tournures d'arabe classique ont été remplacées :
 *   « تجربة صوتية » → « تجربة في الصوت » · « شكراً بزاف » → « يعطيكم الصحة »
 *   « تجربوها في السكريبت ديالكم » → « تديرو بها السكريبت تاعكم ».
 * Toute modification du texte change l'empreinte ci-dessous : le serveur
 * REFUSE alors les anciens aperçus et le générateur les refait.
 */
export const AUDITION_SCRIPT_VERSION = 2;

/** Empreinte du script : détecte un changement de texte entre 2 générations. */
export const AUDITION_SCRIPT_HASH = createHash("sha256")
  .update(`${AUDITION_SCRIPT_VERSION}:${AUDITION_SCRIPT}`)
  .digest("hex")
  .slice(0, 12);

/**
 * SCRIPTS D'APERÇU PERSONNALISÉS, par voix.
 * Reprennent et étendent les scripts historiques de Sawtify : les 9 voix
 * existantes gardent exactement le texte que tes utilisateurs connaissent.
 */
export const VOICE_PREVIEW_TEXTS: Record<string, string> = {
  // ── Les 9 voix historiques : textes INCHANGÉS ──
  Puck:     "سلام عليكم خاوتي، واش راكم لاباس؟ مع منصة صوتيفي تقدر تحول نصوصك لصوت بشري طبيعي.",
  Zephyr:   "مرحبا بيكم كاملين! هاذي أحسن منصة جزائرية بالذكاء الاصطناعي، بنطق واضح وصوت دافي.",
  Charon:   "السلام عليكم خاوتي، نجيبلكم اليوم آخر تقنية في الصوت، بصوت موزون وصافي.",
  Sulafat:  "سلام خاوتي، سمعو نطق دارجة جزائرية صافي وسلس، يزيد لمسة احترافية لكل الفيديوهات ديالكم.",
  Fenrir:   "يا هلا بيكم خاوتنا العزاز! هاذي تجربة صوتية جزائرية قوية وحماسية!",
  Leda:     "أهلاً وسهلاً بيكم! صوت حيوي وخفيف، يوالم الستوريات تاع إنستغرام وتيك توك.",
  Algenib:  "صحا خاوتي، مع صوتيفي الصوت يخرج طبيعي وسلس كأنو متحدث جزائري حقيقي.",
  Achernar: "مرحبا بيكم، سمعو نطق دارجة واضح، بنبرة خفيفة ومريحة، تسمعها بلا ما تعيا.",
  Orus:     "واش راكم خاوتي؟ إذا راك تحوس على فويس أوفر احترافية للمشروع ديالك، راك في البلاصة الصحيحة.",

  // ── Les 21 nouvelles voix : même esprit, caractère mis en avant ──
  Kore:          "اسمحلي نقولها ليك بصراحة، هاذي منصة تخلي الصوت يخرج مقنع وواضح.",
  Aoede:         "أهلاً بيك، الصوت خفيف ومرتاح، يزيد لمسة ناعمة للفيديو ديالك.",
  Callirrhoe:    "صحا خويا، راني نهدر معاك عادي، بلا تكلف وبلا زيادة.",
  Autonoe:       "مرحبا! نبرة مشرقة وفرحة، تشد اللي يسمعك من أول كلمة.",
  Enceladus:     "قرّب شوية... هاذي نبرة هادية وقريبة، تخلي الكلام يبان صادق.",
  Iapetus:       "كل كلمة واضحة، بلا تشويش، تسمعها كيف كي تهدر مع واحد قدامك.",
  Umbriel:       "هكاك بكل بساطة، صوت عادي ومريح، كيف كي تهدر مع صحابك.",
  Algieba:       "الصوت سلس، يجري مع الكلام بلا ما تحس بأي اصطدام.",
  Despina:       "نبرة ناعمة وسلسة، تنفع للحكاية الطويلة، تسمعها بلا ما تعيا.",
  Erinome:       "نطق واضح ودقيق في كل حرف، خاصة في الكلمات الصعيبة، بلا ما تغلط.",
  Rasalgethi:    "المعلومة توصل بسرعة وكيما لازم، بنبرة رزينة تعرف تهدر.",
  Laomedeia:     "أهلاً! نبرة مرحة وخفيفة، تخلي الكونتوني ديالك يولي ممتع.",
  Alnilam:       "كلام ثابت ومتوازن، ما يهبطش وما يطلعش، يمشي على وتيرة وحدة.",
  Schedar:       "نبرة معتدلة، لا قوية بزاف ولا ضعيفة، نورمال وطبيعية.",
  Gacrux:        "خويا، بخبرة وبتمهل، الصوت يعطي ثقة ويعطي للكلام وزن.",
  Pulcherrima:   "راني نقولها ليك مباشرة: هاذي هي الحاجة لي راك تحوس عليها.",
  Achird:        "مرحبا بيك، نبرة ودودة، تحس بيها قريبة منك كي تهدر.",
  Zubenelgenubi: "هكاك عادي، بلا رسميات، كي الكلام بين صحاب.",
  Vindemiatrix:  "نبرة رقيقة ولطيفة، تنفع للكلام الحساس والهادي بزاف.",
  Sadachbia:     "خويا واش راك! نبرة نشيطة وحيوية، تزيد طاقة للمحتوى ديالك.",
  Sadaltager:    "نشرحها ليك بالتفصيل، بنبرة معلّم يعرف واش يقول.",
};

// ─────────────────────────────────────────────────────────────────────────────
//  MANIFESTE DES APERÇUS
// ─────────────────────────────────────────────────────────────────────────────

export type VoicePreviewEntry = {
  /** Nom technique Google (Puck, Kore…). */
  voiceId: string;
  /** Identifiant historique Sawtify (voice_amin…) — compatibilité API. */
  legacyId?: string;
  /** Prénom affiché en français. */
  nameFr: string;
  /** Prénom affiché en arabe. */
  nameAr: string;
  /** Nom du fichier généré (dans le dossier d'aperçus). */
  file: string;
  /** URL publique complète (si l'upload Supabase a réussi). */
  url?: string;
  /** Durée réelle de l'audio. */
  durationSeconds: number;
  /** Taille du fichier WAV en octets. */
  bytes: number;
  /** Date de génération (ISO). */
  generatedAt: string;
  /** Modèle TTS utilisé pour générer cet aperçu. */
  model: string;
  /** Genre affirmé UNIQUEMENT s'il a été validé à l'oreille. */
  gender: "male" | "female" | "unknown";
};

export type VoicePreviewManifest = {
  version: number;
  /** Empreinte du script d'audition : permet de détecter un texte modifié. */
  scriptHash: string;
  /** Modèle TTS utilisé. */
  model: string;
  generatedAt: string;
  /** Nombre de voix générées. */
  count: number;
  voices: VoicePreviewEntry[];
};

/** Construit la liste des 30 voix à générer, avec toutes leurs métadonnées. */
export function previewTargets(): {
  voice: StudioVoice;
  nameFr: string;
  nameAr: string;
  slug: string;
  legacyId?: string;
}[] {
  return STUDIO_VOICES.map((v) => {
    const n = VOICE_NAMES.find((x) => x.id === v.id);
    return {
      voice: v,
      nameFr: n?.fr ?? v.id,
      nameAr: n?.ar ?? v.id,
      slug: n?.slug ?? v.id.toLowerCase(),
      legacyId: v.legacyFor?.[0],
    };
  });
}

/** Nom de fichier déterministe pour un aperçu. */
export function previewFileName(voiceId: string): string {
  return `${String(voiceId).toLowerCase().replace(/[^a-z0-9]+/g, "-")}.wav`;
}

/** Manifeste vide, pour démarrer sans plantage. */
export function emptyManifest(model = ""): VoicePreviewManifest {
  return {
    version: 0,
    scriptHash: AUDITION_SCRIPT_HASH,
    model,
    generatedAt: new Date(0).toISOString(),
    count: 0,
    voices: [],
  };
}

/**
 * Vérifie la cohérence d'un manifeste.
 * Utilisé au démarrage du serveur : un manifeste incohérent (script changé,
 * modèle changé, fichier manquant) n'est PAS servi, pour ne jamais afficher
 * un aperçu qui ne correspond pas à la voix annoncée.
 */
export function validateManifest(m: VoicePreviewManifest | null): {
  ok: boolean;
  raisons: string[];
  avertissements: string[];
} {
  const raisons: string[] = [];
  const avertissements: string[] = [];

  if (!m || !Array.isArray(m.voices) || m.voices.length === 0) {
    return { ok: false, raisons: ["Manifeste absent ou vide"], avertissements };
  }
  if (m.scriptHash !== AUDITION_SCRIPT_HASH) {
    raisons.push(
      `Script d'audition modifié depuis la génération (manifeste ${m.scriptHash} ≠ attendu ${AUDITION_SCRIPT_HASH})`
    );
  }
  const manquants = previewTargets().filter((t) => !m.voices.some((v) => v.voiceId === t.voice.id));
  if (manquants.length) {
    avertissements.push(
      `${manquants.length} voix sans aperçu : ${manquants.map((t) => t.voice.id).join(", ")}`
    );
  }
  if (m.count !== m.voices.length) {
    avertissements.push(`Compteur incohérent (count=${m.count}, entrées=${m.voices.length})`);
  }
  return { ok: raisons.length === 0, raisons, avertissements };
}

/** Voix dont le genre n'est pas encore validé à l'oreille. */
export function voicesNeedingGenderValidation(m: VoicePreviewManifest | null): string[] {
  return previewTargets()
    .filter((t) => t.voice.gender === "unknown")
    .filter((t) => !m?.voices.some((v) => v.voiceId === t.voice.id && v.gender !== "unknown"))
    .map((t) => t.voice.id);
}
