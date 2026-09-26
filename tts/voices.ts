/**
 * ============================================================================
 *  SAWTIFY — CATALOGUE DES 30 VOIX STUDIO GEMINI 3.8 TTS
 * ============================================================================
 *  Source : documentation officielle Gemini 3.8 TTS (24/09/2026)
 *  → « Prebuilt voices » (30 voix) + « Extended Voice Library »
 *
 *  ⚠️ IMPORTANT SUR LE GENRE (homme/femme)
 *  Google ne publie PAS le genre des 30 voix studio : la doc officielle
 *  donne uniquement un descripteur de CARACTÈRE (« Bright », « Gravelly »,
 *  « Warm »…). Le genre réel doit être vérifié À L'OREILLE.
 *
 *  - `gender` n'est renseigné que pour les 9 voix DÉJÀ UTILISÉES par Sawtify
 *    (vérifiées en production dans l'ancien code).
 *  - `gender: "unknown"` = à auditer lors de la génération des previews.
 *
 *  Pour un filtrage par genre FIABLE, utiliser la bibliothèque étendue
 *  (GET /v1beta/voices?gender=female) — voir tts/voiceLibrary.ts.
 * ============================================================================
 */

export type VoiceGender = "male" | "female" | "unknown";

export type StudioVoice = {
  /** Nom exact attendu par l'API Google. */
  id: string;
  /** Descripteur officiel Google (un mot). */
  character: string;
  /** Traduction française du descripteur. */
  characterFr: string;
  /** Traduction arabe du descripteur. */
  characterAr: string;
  gender: VoiceGender;
  /** Utilisée par Sawtify avant le passage à 3.8 (compatibilité des anciens IDs). */
  legacyFor?: string[];
};

/**
 * Les 30 voix studio officielles, dans l'ordre du tableau Google.
 * `character` = traduction littérale du descripteur officiel.
 */
export const STUDIO_VOICES: StudioVoice[] = [
  // ── Les 9 voix DÉJÀ en production chez Sawtify (genre vérifié) ────────────
  { id: "Puck",     character: "Upbeat",        characterFr: "Enjoué",          characterAr: "مرح",      gender: "male",   legacyFor: ["voice_amin", "voice_dz_amine", "voice_ar_sofiane"] },
  { id: "Charon",   character: "Informative",   characterFr: "Informatif",      characterAr: "معلوماتي", gender: "male",   legacyFor: ["voice_khalid"] },
  { id: "Fenrir",   character: "Excitable",     characterFr: "Excitant",        characterAr: "متحمس",    gender: "male",   legacyFor: ["voice_rashid", "voice_dz_rachid"] },
  { id: "Algenib",  character: "Gravelly",      characterFr: "Grave / rocailleux", characterAr: "أجش",   gender: "male",   legacyFor: ["voice_bilal"] },
  { id: "Orus",     character: "Firm",          characterFr: "Ferme",           characterAr: "حازم",     gender: "male",   legacyFor: ["voice_faycal"] },
  { id: "Zephyr",   character: "Bright",        characterFr: "Éclatant",        characterAr: "مشرق",     gender: "female", legacyFor: ["voice_yasmin", "voice_dz_yasmine"] },
  { id: "Sulafat",  character: "Warm",          characterFr: "Chaleureux",      characterAr: "دافئ",     gender: "female", legacyFor: ["voice_maryam", "voice_fr_ines"] },
  { id: "Leda",     character: "Youthful",      characterFr: "Juvénile",        characterAr: "شبابي",    gender: "female", legacyFor: ["voice_layla", "voice_en_lina"] },
  { id: "Achernar", character: "Soft",          characterFr: "Doux",            characterAr: "ناعم",     gender: "female", legacyFor: ["voice_nour"] },

  // ── Les 21 autres voix studio (genre à auditer) ──────────────────────────
  { id: "Kore",            character: "Firm",          characterFr: "Ferme",              characterAr: "حازم",          gender: "unknown" },
  { id: "Aoede",           character: "Breezy",        characterFr: "Léger / aérien",     characterAr: "خفيف",          gender: "unknown" },
  { id: "Callirrhoe",      character: "Easy-going",    characterFr: "Décontracté",        characterAr: "مرتاح",         gender: "unknown" },
  { id: "Autonoe",         character: "Bright",        characterFr: "Éclatant",           characterAr: "مشرق",          gender: "unknown" },
  { id: "Enceladus",       character: "Breathy",       characterFr: "Soufflé / aéré",     characterAr: "متنفس",         gender: "unknown" },
  { id: "Iapetus",         character: "Clear",         characterFr: "Clair",              characterAr: "واضح",          gender: "unknown" },
  { id: "Umbriel",         character: "Easy-going",    characterFr: "Décontracté",        characterAr: "مرتاح",         gender: "unknown" },
  { id: "Algieba",         character: "Smooth",        characterFr: "Lisse",              characterAr: "سلس",           gender: "unknown" },
  { id: "Despina",         character: "Smooth",        characterFr: "Lisse",              characterAr: "سلس",           gender: "unknown" },
  { id: "Erinome",         character: "Clear",         characterFr: "Clair",              characterAr: "واضح",          gender: "unknown" },
  { id: "Rasalgethi",      character: "Informative",   characterFr: "Informatif",         characterAr: "معلوماتي",      gender: "unknown" },
  { id: "Laomedeia",       character: "Upbeat",        characterFr: "Enjoué",             characterAr: "مرح",           gender: "unknown" },
  { id: "Alnilam",         character: "Firm",          characterFr: "Ferme",              characterAr: "حازم",          gender: "unknown" },
  { id: "Schedar",         character: "Even",          characterFr: "Égal / posé",        characterAr: "متوازن",        gender: "unknown" },
  { id: "Gacrux",          character: "Mature",        characterFr: "Mûr",                characterAr: "ناضج",          gender: "unknown" },
  { id: "Pulcherrima",     character: "Forward",       characterFr: "Direct / assuré",    characterAr: "مباشر",         gender: "unknown" },
  { id: "Achird",          character: "Friendly",      characterFr: "Amical",             characterAr: "ودود",          gender: "unknown" },
  { id: "Zubenelgenubi",   character: "Casual",        characterFr: "Décontracté",        characterAr: "عفوي",          gender: "unknown" },
  { id: "Vindemiatrix",    character: "Gentle",        characterFr: "Doux / délicat",     characterAr: "لطيف",          gender: "unknown" },
  { id: "Sadachbia",       character: "Lively",        characterFr: "Vivant",             characterAr: "حيوي",          gender: "unknown" },
  { id: "Sadaltager",      character: "Knowledgeable", characterFr: "Savant / érudit",    characterAr: "مثقف",          gender: "unknown" },
];

/** Index rapide par ID (insensible à la casse). */
export const STUDIO_VOICE_INDEX = new Map<string, StudioVoice>(
  STUDIO_VOICES.map((v) => [v.id.toLowerCase(), v])
);

/** Retrouve une voix studio par son nom, quelle que soit la casse. */
export function findStudioVoice(name: string): StudioVoice | null {
  return STUDIO_VOICE_INDEX.get(String(name || "").toLowerCase()) ?? null;
}

/**
 * Voix FEMININES connues sur les 30 (d'après l'usage historique Sawtify).
 * ⚠️ Non exhaustif : sert uniquement d'indice, pas de vérité officielle.
 */
export const KNOWN_FEMALE_VOICES = new Set(
  STUDIO_VOICES.filter((v) => v.gender === "female").map((v) => v.id)
);

/**
 * Migration des anciens identifiants Sawtify (voice_amin, voice_yasmin…)
 * vers les voix studio 3.8. Utilisé pour ne perdre AUCUN utilisateur existant
 * (l'historique, les favoris, les clés API pointent sur ces IDs).
 */
export const LEGACY_VOICE_MIGRATION: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const v of STUDIO_VOICES) {
    for (const legacy of v.legacyFor || []) m[legacy] = v.id;
  }
  // Pass-through technique : si un client envoie déjà un nom de voix officiel.
  for (const v of STUDIO_VOICES) m[v.id] = v.id;
  return m;
})();

/**
 * Descripteurs de caractère officiels → texte de style exploitable.
 * Sert à générer un `speech_metadata.style` de départ cohérent avec la voix,
 * SANS jamais mettre le nom, l'âge ou le genre dans le style
 * (la doc l'interdit explicitement : « Do not try to change immutable
 * speaker traits in style »).
 */
export const CHARACTER_STYLE_HINT: Record<string, string> = {
  Upbeat: "energetic and upbeat",
  Informative: "clear and informative",
  Excitable: "excited and high-energy",
  Gravelly: "low, gravelly and warm",
  Firm: "confident and firm",
  Bright: "bright and cheerful",
  Warm: "warm and friendly",
  Youthful: "young and playful",
  Soft: "soft and gentle",
  Breezy: "light and breezy",
  "Easy-going": "relaxed and easy-going",
  Breathy: "soft and breathy",
  Clear: "clear and articulate",
  Smooth: "smooth and flowing",
  Even: "steady and even",
  Mature: "mature and assured",
  Forward: "direct and assertive",
  Friendly: "friendly and approachable",
  Casual: "casual and laid-back",
  Gentle: "gentle and delicate",
  Lively: "lively and animated",
  Knowledgeable: "knowledgeable and authoritative",
};
