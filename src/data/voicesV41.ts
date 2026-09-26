/**
 * ============================================================================
 *  SAWTIFY 4.1 — LES 21 NOUVELLES VOIX, CÔTÉ INTERFACE
 * ============================================================================
 *
 *  Pourquoi ce fichier existe
 *  --------------------------
 *  Le serveur connaissait déjà les 30 voix studio, mais l'interface n'en
 *  proposait que 9 : les 21 nouvelles existaient sans être atteignables. Un
 *  utilisateur ne pouvait donc pas les choisir, alors que Sawtify les annonçait.
 *  Ce fichier comble exactement ce trou.
 *
 *  ⚠️ DEUX RÈGLES À NE PAS ENFREINDRE
 *  ---------------------------------
 *
 *  1) L'`id` DOIT ÊTRE LE SLUG (« ines », « aya »…), jamais « voice_ines ».
 *     Le serveur réserve le préfixe `voice_` aux voix SUR MESURE de Google :
 *     un « voice_ines » inconnu lui serait transmis tel quel et l'API le
 *     rejetterait. Le slug, lui, est reconnu et traduit vers la bonne voix.
 *     (Les 9 identifiants historiques `voice_amin`… font exception : ils sont
 *     traduits par la table de migration, pour ne rien casser chez les
 *     utilisateurs existants.)
 *
 *  2) LE GENRE EST DÉSORMAIS CONFIRMÉ — NE PLUS LE REMETTRE À « unknown ».
 *     Corrigé le 26/09 : le genre officiel de chaque voix Google (liste
 *     "Voix féminines" / "Voix masculines" du catalogue Gemini TTS) a été
 *     mappé ci-dessous. Deux effets concrets de l'ancien `unknown` :
 *       - les filtres Homme / Femme du studio (`voice.gender === genderFilter`)
 *         cachaient les 21 nouvelles voix dès qu'un filtre était actif ;
 *       - `<VoiceGlyph gender=.../>` est typé `'male' | 'female'` : lui
 *         passer `'unknown'` était un mésaccord de type.
 *     5 prénoms ne correspondaient pas au genre réel de la voix Google
 *     (ex. « Karim », « Riad », « Omar » posés sur des voix officiellement
 *     féminines, « Sara » sur une voix masculine) : ils ont été renommés
 *     (voir Ines, Feriel, Hanane, Widad, Fares ci-dessous) plutôt que
 *     laissés à l'identique avec juste le genre corrigé, pour éviter un nom
 *     féminin sur une voix étiquetée masculine ou l'inverse.
 */

import type { Voice } from '../types';

type NouvelleVoix = {
  /** Slug = identifiant envoyé au serveur. */
  slug: string;
  /** Nom exact de la voix côté moteur vocal. */
  geminiVoice: string;
  name: string;
  nameAr: string;
  /** Genre officiel de la voix Google (catalogue Gemini TTS). */
  gender: 'male' | 'female';
  /** Descripteur officiel traduit (voir tts/voices.ts). Accordé au féminin : "voix" est féminin. */
  caractere: string;
  caractereAr: string;
  icon: string;
  category: Voice['category'];
};

/**
 * Les 21 voix, groupées par genre officiel (féminines puis masculines),
 * dans l'ordre du catalogue Google.
 */
const NOUVELLES_VOIX: NouvelleVoix[] = [
  // ---- Voix féminines ------------------------------------------------------
  { slug: 'aya',    geminiVoice: 'Aoede',         name: 'Aya',    nameAr: 'آية',    gender: 'female', caractere: 'Légère et aérienne',    caractereAr: 'خفيف',     icon: 'sparkles',    category: 'social' },
  { slug: 'nada',   geminiVoice: 'Autonoe',       name: 'Nada',   nameAr: 'ندى',    gender: 'female', caractere: 'Éclatante',              caractereAr: 'مشرق',     icon: 'sparkles',    category: 'commercial' },
  { slug: 'feriel', geminiVoice: 'Callirrhoe',    name: 'Feriel', nameAr: 'فريال',  gender: 'female', caractere: 'Décontractée',           caractereAr: 'مرتاح',    icon: 'podcast',     category: 'social' },
  { slug: 'salma',  geminiVoice: 'Despina',       name: 'Salma',  nameAr: 'سلمى',   gender: 'female', caractere: 'Lisse',                  caractereAr: 'ناعم',     icon: 'sparkles',    category: 'narrative' },
  { slug: 'rania',  geminiVoice: 'Erinome',       name: 'Rania',  nameAr: 'رانيا',  gender: 'female', caractere: 'Claire',                 caractereAr: 'واضح',     icon: 'mic',         category: 'formal' },
  { slug: 'widad',  geminiVoice: 'Gacrux',        name: 'Widad',  nameAr: 'وداد',   gender: 'female', caractere: 'Mûre',                   caractereAr: 'ناضج',     icon: 'headphones',  category: 'narrative' },
  { slug: 'ines',   geminiVoice: 'Kore',          name: 'Ines',   nameAr: 'إيناس',  gender: 'female', caractere: 'Ferme',                  caractereAr: 'حازم',     icon: 'mic',         category: 'formal' },
  { slug: 'hanane', geminiVoice: 'Laomedeia',     name: 'Hanane', nameAr: 'حنان',   gender: 'female', caractere: 'Enjouée',                caractereAr: 'مرح',      icon: 'flame',       category: 'commercial' },
  { slug: 'amina',  geminiVoice: 'Vindemiatrix',  name: 'Amina',  nameAr: 'أمينة',  gender: 'female', caractere: 'Douce et délicate',      caractereAr: 'لطيف',     icon: 'sparkles',    category: 'narrative' },

  // ---- Voix masculines ------------------------------------------------------
  { slug: 'hicham', geminiVoice: 'Achird',        name: 'Hicham', nameAr: 'هشام',  gender: 'male',   caractere: 'Amicale',                caractereAr: 'ودود',     icon: 'podcast',     category: 'social' },
  { slug: 'nabil',  geminiVoice: 'Algieba',       name: 'Nabil',  nameAr: 'نبيل',  gender: 'male',   caractere: 'Lisse',                  caractereAr: 'ناعم',     icon: 'audio-lines', category: 'narrative' },
  { slug: 'adel',   geminiVoice: 'Alnilam',       name: 'Adel',   nameAr: 'عادل',  gender: 'male',   caractere: 'Ferme',                  caractereAr: 'حازم',     icon: 'mic',         category: 'formal' },
  { slug: 'anis',   geminiVoice: 'Enceladus',     name: 'Anis',   nameAr: 'أنيس',  gender: 'male',   caractere: 'Soufflée et aérée',      caractereAr: 'متنفس',    icon: 'volume-2',    category: 'narrative' },
  { slug: 'zaki',   geminiVoice: 'Iapetus',       name: 'Zaki',   nameAr: 'زكي',   gender: 'male',   caractere: 'Claire',                 caractereAr: 'واضح',     icon: 'mic',         category: 'formal' },
  { slug: 'yacine', geminiVoice: 'Pulcherrima',   name: 'Yacine', nameAr: 'ياسين', gender: 'male',   caractere: 'Directe et assurée',     caractereAr: 'واثق',     icon: 'megaphone',   category: 'commercial' },
  { slug: 'hakim',  geminiVoice: 'Rasalgethi',    name: 'Hakim',  nameAr: 'حكيم',  gender: 'male',   caractere: 'Informative',            caractereAr: 'معلوماتي', icon: 'podcast',     category: 'formal' },
  { slug: 'fares',  geminiVoice: 'Sadachbia',     name: 'Fares',  nameAr: 'فارس',  gender: 'male',   caractere: 'Vivante',                caractereAr: 'حيوي',     icon: 'zap',         category: 'social' },
  { slug: 'mourad', geminiVoice: 'Sadaltager',    name: 'Mourad', nameAr: 'مراد',  gender: 'male',   caractere: 'Savante et érudite',     caractereAr: 'عالِم',    icon: 'headphones',  category: 'formal' },
  { slug: 'nassim', geminiVoice: 'Schedar',       name: 'Nassim', nameAr: 'نسيم',  gender: 'male',   caractere: 'Égale et posée',         caractereAr: 'رزين',     icon: 'audio-lines', category: 'narrative' },
  { slug: 'walid',  geminiVoice: 'Umbriel',       name: 'Walid',  nameAr: 'وليد',  gender: 'male',   caractere: 'Décontractée',           caractereAr: 'مرتاح',    icon: 'radio',       category: 'social' },
  { slug: 'reda',   geminiVoice: 'Zubenelgenubi', name: 'Reda',   nameAr: 'رضا',   gender: 'male',   caractere: 'Décontractée',           caractereAr: 'مرتاح',    icon: 'radio',       category: 'social' },
];

/** Phrases d'exemple, choisies selon l'usage prévu de la voix. */
const EXEMPLES: Record<Voice['category'], string> = {
  commercial:
    'عرض خاص اليوم فقط! مع صوتيفي، النص ديالك يولي صوت واضح وجذاب، يوصل للزبون من أول كلمة.',
  social:
    'واش راكم خاوتي! جيت اليوم بحاجة زوينة، خليو الفيديو هذا حتى الأخير وما تنساوش الإعجاب.',
  narrative:
    'كان يا ما كان، في بلاد بعيدة، واحد الحكاية ما تنساش… اسمعوها كاملة بنبرة هادية ومريحة.',
  formal:
    'السلام عليكم ورحمة الله. نقدّم ليكم اليوم شرحاً واضحاً ودقيقاً، بخطوات مبسّطة وسهلة.',
};

/** Libellés de style : le caractère + l'usage, comme pour les 9 voix existantes. */
const STYLES: Record<Voice['category'], string[]> = {
  commercial: ['Accrocheur', 'Clair', 'Vente'],
  social: ['Amical', 'Spontané', 'Vidéo courte'],
  narrative: ['Posé', 'Paisible', 'Récit'],
  formal: ['Professionnel', 'Précis', 'Exposé'],
};

/** Exemples et libellés arabes, alignés sur le style de VOICES_AR. */
const EXEMPLES_AR: Record<Voice['category'], string> = {
  commercial:
    'عرض خاص اليوم فقط! مع صوتيفي، نصّك يولّي صوت واضح وجذّاب، يوصل للزبون من أول كلمة.',
  social:
    'واش راكم خاوتي! جيت اليوم بحاجة زوينة، خلّيو الفيديو هذا حتى الأخير وما تنساوش الإعجاب.',
  narrative:
    'كان يا ما كان، في بلاد بعيدة، واحد الحكاية ما تنساش… اسمعوها كاملة بنبرة هادية ومريحة.',
  formal:
    'السلام عليكم ورحمة الله. نقدّم ليكم اليوم شرحاً واضحاً ودقيقاً، بخطوات مبسّطة وسهلة.',
};

const STYLES_AR: Record<Voice['category'], string[]> = {
  commercial: ['جذّاب', 'واضح', 'إعلاني'],
  social: ['ودود', 'عفوي', 'فيديو قصير'],
  narrative: ['هادئ', 'مريح', 'سردي'],
  formal: ['احترافي', 'دقيق', 'شرح'],
};

const BADGE = { fr: 'Nouveau 4.1', ar: 'جديد 4.1' } as const;

/**
 * Construit l'objet `Voice` attendu par l'interface.
 * La voix entendue est la même dans les deux langues : seul l'affichage change.
 */
function versVoice(v: NouvelleVoix, lang: 'fr' | 'ar'): Voice {
  const ar = lang === 'ar';
  return {
    id: v.slug,
    geminiVoice: v.geminiVoice,
    name: ar ? v.nameAr : v.name,
    locale: 'ar-DZ',
    dialect: ar
      ? `دارجة جزائرية • صوت ${v.caractereAr}`
      : `Darja algérienne • Voix ${v.caractere.toLowerCase()}`,
    gender: v.gender,
    icon: v.icon,
    category: v.category,
    sampleText: ar ? EXEMPLES_AR[v.category] : EXEMPLES[v.category],
    badge: ar ? BADGE.ar : BADGE.fr,
    styles: ar ? STYLES_AR[v.category] : STYLES[v.category],
  };
}

/** Les 21 nouvelles voix, prêtes à être ajoutées au studio (interface FR). */
export const VOICES_V41: Voice[] = NOUVELLES_VOIX.map((v) => versVoice(v, 'fr'));

/** Les mêmes 21 voix, avec les libellés en arabe. */
export const VOICES_V41_AR: Voice[] = NOUVELLES_VOIX.map((v) => versVoice(v, 'ar'));
