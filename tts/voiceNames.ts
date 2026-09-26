/**
 * ============================================================================
 *  SAWTIFY — SYSTÈME DE NOMS DES VOIX (côté serveur)
 * ============================================================================
 *  POURQUOI CE FICHIER EXISTE
 *
 *  ① Google impose des noms TECHNIQUES en anglais (« Puck », « Kore »,
 *     « Sadachbia »…). Ces noms sont OBLIGATOIRES : l'API refuse toute
 *     autre écriture. On ne peut donc PAS les renommer.
 *
 *  ② Tes utilisateurs, eux, doivent voir des noms ALGÉRIENS, en français
 *     ET en arabe (« Amine » / « أمين »).
 *
 *  D'où ce fichier : une couche de noms HUMAINS par-dessus les noms
 *  techniques. L'utilisateur écrit « Amine », « أمين » ou « Puck » —
 *  les trois fonctionnent et donnent la même voix.
 *
 *  ⚠️ IMPORTANT — LES 21 NOUVELLES VOIX
 *  Google ne publie PAS le genre de ses voix studio. Les prénoms proposés
 *  ci-dessous sont donc des PROPOSITIONS à valider à l'oreille.
 *  Si un prénom ne colle pas (voix masculine avec un prénom féminin),
 *  c'est ICI qu'il faut le changer — UN SEUL endroit, et c'est réglé
 *  partout (API, interface, historique).
 * ============================================================================
 */

import { STUDIO_VOICES } from "./voices";
import { LEGACY_VOICE_MIGRATION } from "./voices";

export type VoiceNameEntry = {
  /** Nom technique Google — OBLIGATOIRE pour l'API. Ne jamais modifier. */
  id: string;
  /** Prénom affiché aux utilisateurs (français / latin). */
  fr: string;
  /** Prénom affiché aux utilisateurs (arabe). */
  ar: string;
  /** Identifiant URL-safe pour l'interface. */
  slug: string;
  /** Descripteur officiel Google, traduit. */
  caractereFr: string;
  caractereAr: string;
  /** Genre PROBABLE — présent uniquement pour les 9 voix historiques. */
  gender: "male" | "female" | "unknown";
  /** true = prénom à confirmer à l'oreille (voix jamais utilisée avant). */
  aConfirmer?: boolean;
};

/**
 * LES 30 VOIX STUDIO AVEC LEUR PRÉNOM ALGÉRIEN.
 *
 * Les 9 premières sont les voix HISTORIQUES de Sawtify : elles gardent
 * EXACTEMENT le prénom que tes utilisateurs connaissent déjà.
 */
export const VOICE_NAMES: VoiceNameEntry[] = [
  // ═══════════════════════════════════════════════════════════════════════
  //  LES 9 VOIX HISTORIQUES — prénoms INCHANGÉS (tes utilisateurs les
  //  connaissent, l'historique et les statistiques s'y réfèrent)
  // ═══════════════════════════════════════════════════════════════════════
  { id: "Puck",     fr: "Amine",  ar: "أمين",   slug: "amine",  caractereFr: "Voix enjouée et dynamique",      caractereAr: "مرح وحماسي",     gender: "male" },
  { id: "Charon",   fr: "Khalid", ar: "خالد",   slug: "khalid", caractereFr: "Voix informative et posée",       caractereAr: "معلوماتي ورصين", gender: "male" },
  { id: "Fenrir",   fr: "Rachid", ar: "رشيد",   slug: "rachid", caractereFr: "Voix énergique et survoltée",      caractereAr: "متحمس وقوي",     gender: "male" },
  { id: "Algenib",  fr: "Bilal",  ar: "بلال",   slug: "bilal",  caractereFr: "Voix grave et rocailleuse", caractereAr: "أجش وعميق",     gender: "male" },
  { id: "Orus",     fr: "Fayçal", ar: "فيصل",   slug: "faycal", caractereFr: "Voix ferme et assurée",          caractereAr: "حازم وواثق",     gender: "male" },
  { id: "Zephyr",   fr: "Yasmine", ar: "ياسمين", slug: "yasmine", caractereFr: "Voix éclatante et souriante", caractereAr: "مشرقة ومبتسمة", gender: "female" },
  { id: "Sulafat",  fr: "Maryam", ar: "مريم",   slug: "maryam", caractereFr: "Voix chaleureuse et douce",     caractereAr: "دافئة ولطيفة",   gender: "female" },
  { id: "Leda",     fr: "Layla",  ar: "ليلى",   slug: "layla",  caractereFr: "Voix juvénile et vive",         caractereAr: "شابة وحيوية",    gender: "female" },
  { id: "Achernar", fr: "Nour",   ar: "نور",    slug: "nour",    caractereFr: "Voix douce et apaisante",      caractereAr: "ناعمة ومريحة", gender: "female" },

  // ═══════════════════════════════════════════════════════════════════════
  //  LES 21 NOUVELLES VOIX — prénoms PROPOSÉS, à confirmer à l'écoute
  //  (aConfirmer: true → à valider quand tu généreras les aperçus audio)
  // ═══════════════════════════════════════════════════════════════════════
  // LES 21 NOUVELLES VOIX — TRIÉES : femmes d'abord, puis hommes.
  //
  // ⚠️ Le prénom suit TOUJOURS le genre RÉEL de la voix. Une voix féminine
  //    porte un prénom féminin, et le descripteur est accordé en conséquence.
  //    Le `slug` ne change JAMAIS : c'est l'identifiant stocké dans
  //    l'historique et les statistiques des utilisateurs.
  // ═══════════════════════════════════════════════════════════════════════
  // LES 21 NOUVELLES VOIX — TRIÉES : les femmes d'abord, puis les hommes.
  //
  // ⚠️ Le prénom suit TOUJOURS le genre RÉEL de la voix. Liste de référence
  //    du 26/09/2026 : 13 femmes, 17 hommes. Le `slug` ne change JAMAIS :
  //    c'est l'identifiant stocké dans l'historique des utilisateurs.
  // ═══════════════════════════════════════════════════════════════════════
  // ── Femmes (9) ──────────────────────────────────────────────────────────
  { id: "Kore", fr: "Karima", ar: "كريمة", slug: "karim", caractereFr: "Voix ferme et autoritaire", caractereAr: "حازمة وواثقة", gender: "female" },
  { id: "Aoede", fr: "Aya", ar: "آية", slug: "aya", caractereFr: "Voix légère et aérienne", caractereAr: "خفيفة ومشرقة", gender: "female" },
  { id: "Callirrhoe", fr: "Samia", ar: "سامية", slug: "sami", caractereFr: "Voix décontractée et cool", caractereAr: "مرتاحة وهادئة", gender: "female" },
  { id: "Autonoe", fr: "Nada", ar: "ندى", slug: "nada", caractereFr: "Voix éclatante et joyeuse", caractereAr: "مشرقة وفرحة", gender: "female" },
  { id: "Despina", fr: "Salma", ar: "سلمى", slug: "salma", caractereFr: "Voix lisse et douce", caractereAr: "ناعمة وسلسة", gender: "female" },
  { id: "Erinome", fr: "Rania", ar: "رانيا", slug: "rania", caractereFr: "Voix claire et précise", caractereAr: "واضحة ومحددة", gender: "female" },
  { id: "Laomedeia", fr: "Rym", ar: "ريم", slug: "riad", caractereFr: "Voix enjouée et vive", caractereAr: "مرحة وخفيفة", gender: "female" },
  { id: "Vindemiatrix", fr: "Nassima", ar: "نسيمة", slug: "nassim", caractereFr: "Voix douce et délicate", caractereAr: "ناعمة ولطيفة", gender: "female" },
  { id: "Gacrux", fr: "Souad", ar: "سعاد", slug: "omar", caractereFr: "Voix mûre et expérimentée", caractereAr: "ناضجة وحكيمة", gender: "female" },
  // ── Hommes (12) ─────────────────────────────────────────────────────────
  { id: "Enceladus", fr: "Anis", ar: "أنيس", slug: "anis", caractereFr: "Voix soufflée et intime", caractereAr: "نفَسي وخفيف", gender: "male" },
  { id: "Iapetus", fr: "Zaki", ar: "زكي", slug: "zaki", caractereFr: "Voix claire et nette", caractereAr: "واضح ونقي", gender: "male" },
  { id: "Umbriel", fr: "Walid", ar: "وليد", slug: "walid", caractereFr: "Voix décontractée et simple", caractereAr: "عفوي وهادئ", gender: "male" },
  { id: "Algieba", fr: "Nabil", ar: "نبيل", slug: "nabil", caractereFr: "Voix lisse et fluide", caractereAr: "سلس وسهل", gender: "male" },
  { id: "Rasalgethi", fr: "Hakim", ar: "حكيم", slug: "hakim", caractereFr: "Voix informative et érudite", caractereAr: "إخباري ورصين", gender: "male" },
  { id: "Alnilam", fr: "Adel", ar: "عادل", slug: "adel", caractereFr: "Voix ferme et stable", caractereAr: "حازم ومتوازن", gender: "male" },
  { id: "Achird", fr: "Hicham", ar: "هشام", slug: "hicham", caractereFr: "Voix amicale et proche", caractereAr: "ودود وقريب", gender: "male" },
  { id: "Zubenelgenubi", fr: "Reda", ar: "رضا", slug: "reda", caractereFr: "Voix décontractée et naturelle", caractereAr: "عفوي وطبيعي", gender: "male" },
  { id: "Pulcherrima", fr: "Yacine", ar: "ياسين", slug: "yacine", caractereFr: "Voix directe et assurée", caractereAr: "مباشر وواثق", gender: "male" },
  { id: "Schedar", fr: "Amir", ar: "أمير", slug: "amina", caractereFr: "Voix égale et posée", caractereAr: "متوازن وهادئ", gender: "male" },
  { id: "Sadachbia", fr: "Sofiane", ar: "سفيان", slug: "sara", caractereFr: "Voix vivante et animée", caractereAr: "حيوي ونشيط", gender: "male" },
  { id: "Sadaltager", fr: "Mourad", ar: "مراد", slug: "mourad", caractereFr: "Voix savante et pédagogue", caractereAr: "مثقّف ورصين", gender: "male" },
];

/** Vérification : chaque voix studio doit avoir son prénom. */
const MANQUANTES = STUDIO_VOICES.filter((v) => !VOICE_NAMES.some((n) => n.id === v.id)).map((v) => v.id);
if (MANQUANTES.length) {
  console.warn(`[Voix] ⚠️  Aucun prénom défini pour : ${MANQUANTES.join(", ")}`);
}

// ─────────────────────────────────────────────────────────────────────────────
//  RÉSOLUTION : n'importe quelle écriture → nom technique officiel
// ─────────────────────────────────────────────────────────────────────────────

/** Normalise pour la recherche : minuscules, accents retirés, arabes unifiés. */
function norm(s: string): string {
  return String(s)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f\u064b-\u0652\u0670\u06d6-\u06ed]/g, "")
    .replace(/[\u0623\u0625\u0622\u0671]/g, "\u0627")
    .replace(/\u0629/g, "\u0647")
    .replace(/\u0649/g, "\u064a")
    .replace(/[\u0640]/g, "")
    .replace(/[^a-z0-9\u0600-\u06ff]/g, "")
    .trim();
}

/** Index : toutes les écritures (FR, AR, slug, technique) → entrée. */
const LOOKUP: Map<string, VoiceNameEntry> = (() => {
  const m = new Map<string, VoiceNameEntry>();
  for (const n of VOICE_NAMES) {
    for (const w of [n.id, n.fr, n.ar, n.slug]) {
      const k = norm(w);
      if (k && !m.has(k)) m.set(k, n);
    }
  }
  return m;
})();

/**
 * Transforme n'importe quelle écriture en nom technique officiel.
 *
 *   resolveVoiceName("Amine")   → "Puck"
 *   resolveVoiceName("أمين")     → "Puck"
 *   resolveVoiceName("amine")   → "Puck"
 *   resolveVoiceName("Puck")    → "Puck"
 *   resolveVoiceName("voice_amin") → "Puck"   (ancien identifiant)
 *   resolveVoiceName("voice_xxxx") → tel quel (voix sur mesure, à venir)
 *   resolveVoiceName("inconnu") → null
 */
export function resolveVoiceName(input: string): string | null {
  const raw = String(input || "").trim();
  if (!raw) return null;

  // ① PRIORITÉ ABSOLUE aux anciens identifiants Sawtify (voice_amin,
  //    voice_yasmin…). ⚠️ Eux aussi commencent par « voice_ », comme les
  //    voix sur mesure de Google. Sans ce test EN PREMIER, un ancien
  //    identifiant partirait tel quel à l'API et serait REJETÉ : tous les
  //    utilisateurs existants, l'historique et les clés API seraient cassés.
  const legacy = LEGACY_VOICE_MIGRATION[raw] || LEGACY_VOICE_MIGRATION[raw.toLowerCase()];
  if (legacy) return legacy;

  // ② Prénom français / arabe / slug / nom technique officiel.
  const found = LOOKUP.get(norm(raw));
  if (found) return found.id;

  // ③ Voix sur mesure Google (`voice_...`) — impossibles à connaître à
  //    l'avance, on les laisse passer telles quelles.
  if (/^voice_[a-z0-9_-]+$/i.test(raw)) return raw;

  return null;
}

/** Fiche complète d'une voix à partir de n'importe quelle écriture. */
export function voiceNameEntry(input: string): VoiceNameEntry | null {
  return LOOKUP.get(norm(String(input || ""))) ?? null;
}

/** Toutes les voix avec leurs noms, pour l'API et la documentation. */
export function listVoices(lang: "fr" | "ar" = "fr") {
  return VOICE_NAMES.map((n) => ({
    id: n.id,
    name: lang === "fr" ? n.fr : n.ar,
    slug: n.slug,
    caractere: lang === "fr" ? n.caractereFr : n.caractereAr,
    gender: n.gender,
    a_confirmer: Boolean(n.aConfirmer),
  }));
}

/** Statistiques utiles pour le diagnostic au démarrage. */
export function voiceNameStats() {
  const aConfirmer = VOICE_NAMES.filter((n) => n.aConfirmer).length;
  const connues = VOICE_NAMES.filter((n) => !n.aConfirmer).length;
  const ecritures = LOOKUP.size;
  return {
    total: VOICE_NAMES.length,
    prenomsConfirmes: connues,
    prenomsAConfirmer: aConfirmer,
    ecrituresAcceptees: ecritures,
  };
}

/** Prénoms dont le genre reste à valider à l'écoute. */
export function voicesToVerify(): VoiceNameEntry[] {
  return VOICE_NAMES.filter((n) => n.aConfirmer);
}
