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
  "سلام عليكم خاوتي، واش راكم لاباس؟ هاذي تجربة صوتية قصيرة، " +
  "باش تسمعو النبرة والوضوح. <short pause> " +
  "راني نهدر بالدارجة الجزائرية، بصوت طبيعي وبلا تكلف. <breath> " +
  "إذا عجبتكم هاذي النبرة، تقدرو تجربوها في السكريبت ديالكم. <chuckle> " +
  "شكراً بزاف، وبالتوفيق إن شاء الله.";

/** Version numérotée du script : à incrémenter si le texte change. */
export const AUDITION_SCRIPT_VERSION = 1;

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
  Zephyr:   "مرحبا بيكم كاملين! هادي أحسن منصة جزائرية بالذكاء الاصطناعي الصوتي، بنطق دقيق وصوت دافئ.",
  Charon:   "السلام عليكم ورحمة الله، نقدّم ليكم اليوم أحدث تقنية في الصوت الرقمي، بصوت موزون ونقي.",
  Sulafat:  "سلام، استمعوا لنطق دارجة جزائرية نقية وسلسة، تزيد لمسة احترافية لكل الفيديوهات.",
  Fenrir:   "يا هلا بيكم خاوتنا العزاز! هاذي تجربة صوتية جزائرية قوية وحماسية!",
  Leda:     "أهلاً وسهلاً بيكم! صوت حيوي وخفيف، يوالم ستوريات إنستغرام وتيك توك.",
  Algenib:  "صحا خاوتي، مع صوتيفي الصوت يخرج طبيعي وسلس كأنو متحدث جزائري حقيقي.",
  Achernar: "مرحباً بيكم، تمتعوا بنطق دارجة واضحة، بنبرة خفيفة ومريحة تسمعها بلا ما تعيا.",
  Orus:     "واش راكم خاوتي؟ إلى راك تحوس على فويس أوفر احترافية للمشروع ديالك، راك في المكان الصحيح.",

  // ── Les 21 nouvelles voix : même esprit, caractère mis en avant ──
  Kore:          "اسمحلي نقولها ليك بصراحة، هاذي منصة تخلي الصوت يخرج مقنع وواضح.",
  Aoede:         "أهلاً بيك، الصوت خفيف ومرتاح، يزيد لمسة ناعمة للفيديو ديالك.",
  Callirrhoe:    "صحا خويا، راني نهدر معاك بطبيعية، بلا تكلف وبلا مبالغة.",
  Autonoe:       "مرحبا! نبرة مشرقة وفرحة، تجذب السامع من أول كلمة.",
  Enceladus:     "اقرب شوية... هاذي نبرة هادية وقريبة، تخلي الكلام يبان صادق.",
  Iapetus:       "كل كلمة واضحة، بلا تشويش، من أول الجملة حتى لآخرها.",
  Umbriel:       "هكاك بكل بساطة، صوت عادي ومريح، كيف كي تهدر مع صحابك.",
  Algieba:       "الصوت سلس، يجري مع الكلام بلا ما تحس بأي اصطدام.",
  Despina:       "نبرة ناعمة وسلسة، تنفع للسرد الطويل بلا تعب.",
  Erinome:       "دقة في النطق، ووضوح في كل حرف، خاصة في الكلمات الصعيبة.",
  Rasalgethi:    "المعلومة توصل بسرعة وكيما لازم، بنبرة مثقفة ومرتبة.",
  Laomedeia:     "أهلاً! نبرة مرحة وخفيفة، تخلي المحتوى ديالك يولي ممتع.",
  Alnilam:       "كلام ثابت ومتوازن، ما يهبطش وما يطلعش، يمشي على وتيرة واحدة.",
  Schedar:       "نبرة معتدلة، لا قوية بزاف ولا ضعيفة، نورمال وطبيعية.",
  Gacrux:        "بخبرة وبتمهل، الصوت يعطي ثقة ويعطي للكلام وزن.",
  Pulcherrima:   "راني نقولها ليك مباشرة: هاذي هي الحاجة لي راك تحوس عليها.",
  Achird:        "مرحبا بيك، نبرة ودودة، تحس بيها قريبة منك كي تهدر.",
  Zubenelgenubi: "هكاك عادي، بلا رسميات، كي كلام بين صحاب.",
  Vindemiatrix:  "نبرة رقيقة ولطيفة، تنفع للمحتوى الحساس والهادئ.",
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
