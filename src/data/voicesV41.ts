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
 *  1) L'`id` DOIT ÊTRE LE SLUG (« karim », « aya »…), jamais « voice_karim ».
 *     Le serveur réserve le préfixe `voice_` aux voix SUR MESURE de Google :
 *     un « voice_karim » inconnu lui serait transmis tel quel et l'API le
 *     rejetterait. Le slug, lui, est reconnu et traduit vers la bonne voix.
 *     (Les 9 identifiants historiques `voice_amin`… font exception : ils sont
 *     traduits par la table de migration, pour ne rien casser chez les
 *     utilisateurs existants.)
 *
 *  2) `gender: 'unknown'` EST VOLONTAIRE.
 *     Google ne publie pas le genre des voix studio — seulement un descripteur
 *     de caractère (« Bright », « Warm »…). Deviner le genre serait mentir à
 *     l'utilisateur. Le genre se renseigne après écoute, voix par voix.
 *     `npm run apercus:voix` puis la page /audition-voix.html servent à ça.
 */

import type { Voice } from '../types';

/** Genre non confirmé : voir règle n°2 en tête de fichier. */
export const GENDER_A_CONFIRMER = 'unknown' as const;

type NouvelleVoix = {
  /** Slug = identifiant envoyé au serveur. */
  slug: string;
  /** Nom exact de la voix côté moteur vocal. */
  geminiVoice: string;
  name: string;
  nameAr: string;
  /** Descripteur officiel traduit (voir tts/voices.ts). */
  caractere: string;
  caractereAr: string;
  icon: string;
  category: Voice['category'];
};

/**
 * Les 21 voix, dans l'ordre du catalogue officiel.
 * `caractere` reprend la traduction du descripteur Google.
 */
const NOUVELLES_VOIX: NouvelleVoix[] = [
  { slug: 'karim',  geminiVoice: 'Kore',           name: 'Karim',  nameAr: 'كريم',   caractere: 'Ferme',            caractereAr: 'حازم',        icon: 'mic',         category: 'formal' },
  { slug: 'aya',    geminiVoice: 'Aoede',          name: 'Aya',    nameAr: 'آية',    caractere: 'Léger et aérien',  caractereAr: 'خفيف',        icon: 'sparkles',    category: 'social' },
  { slug: 'sami',   geminiVoice: 'Callirrhoe',     name: 'Sami',   nameAr: 'سامي',   caractere: 'Décontracté',      caractereAr: 'مرتاح',       icon: 'podcast',     category: 'social' },
  { slug: 'nada',   geminiVoice: 'Autonoe',        name: 'Nada',   nameAr: 'ندى',    caractere: 'Éclatant',         caractereAr: 'مشرق',        icon: 'sparkles',    category: 'commercial' },
  { slug: 'anis',   geminiVoice: 'Enceladus',      name: 'Anis',   nameAr: 'أنيس',   caractere: 'Soufflé et aéré',  caractereAr: 'متنفس',       icon: 'volume-2',    category: 'narrative' },
  { slug: 'zaki',   geminiVoice: 'Iapetus',        name: 'Zaki',   nameAr: 'زكي',    caractere: 'Clair',            caractereAr: 'واضح',        icon: 'mic',         category: 'formal' },
  { slug: 'walid',  geminiVoice: 'Umbriel',        name: 'Walid',  nameAr: 'وليد',   caractere: 'Décontracté',      caractereAr: 'مرتاح',       icon: 'radio',       category: 'social' },
  { slug: 'nabil',  geminiVoice: 'Algieba',        name: 'Nabil',  nameAr: 'نبيل',   caractere: 'Lisse',            caractereAr: 'ناعم',        icon: 'audio-lines', category: 'narrative' },
  { slug: 'salma',  geminiVoice: 'Despina',        name: 'Salma',  nameAr: 'سلمى',   caractere: 'Lisse',            caractereAr: 'ناعم',        icon: 'sparkles',    category: 'narrative' },
  { slug: 'rania',  geminiVoice: 'Erinome',        name: 'Rania',  nameAr: 'رانيا',  caractere: 'Clair',            caractereAr: 'واضح',        icon: 'mic',         category: 'formal' },
  { slug: 'hakim',  geminiVoice: 'Rasalgethi',     name: 'Hakim',  nameAr: 'حكيم',   caractere: 'Informatif',       caractereAr: 'معلوماتي',    icon: 'podcast',     category: 'formal' },
  { slug: 'riad',   geminiVoice: 'Laomedeia',      name: 'Riad',   nameAr: 'رياض',   caractere: 'Enjoué',           caractereAr: 'مرح',         icon: 'flame',       category: 'commercial' },
  { slug: 'adel',   geminiVoice: 'Alnilam',        name: 'Adel',   nameAr: 'عادل',   caractere: 'Ferme',            caractereAr: 'حازم',        icon: 'mic',         category: 'formal' },
  { slug: 'nassim', geminiVoice: 'Schedar',        name: 'Nassim', nameAr: 'نسيم',   caractere: 'Égal et posé',     caractereAr: 'رزين',        icon: 'audio-lines', category: 'narrative' },
  { slug: 'omar',   geminiVoice: 'Gacrux',         name: 'Omar',   nameAr: 'عمر',    caractere: 'Mûr',              caractereAr: 'ناضج',        icon: 'headphones',  category: 'narrative' },
  { slug: 'yacine', geminiVoice: 'Pulcherrima',    name: 'Yacine', nameAr: 'ياسين',  caractere: 'Direct et assuré', caractereAr: 'واثق',        icon: 'megaphone',   category: 'commercial' },
  { slug: 'hicham', geminiVoice: 'Achird',         name: 'Hicham', nameAr: 'هشام',   caractere: 'Amical',           caractereAr: 'ودود',        icon: 'podcast',     category: 'social' },
  { slug: 'reda',   geminiVoice: 'Zubenelgenubi',  name: 'Reda',   nameAr: 'رضا',    caractere: 'Décontracté',      caractereAr: 'مرتاح',       icon: 'radio',       category: 'social' },
  { slug: 'amina',  geminiVoice: 'Vindemiatrix',   name: 'Amina',  nameAr: 'أمينة',  caractere: 'Doux et délicat',  caractereAr: 'لطيف',        icon: 'sparkles',    category: 'narrative' },
  { slug: 'sara',   geminiVoice: 'Sadachbia',      name: 'Sara',   nameAr: 'سارة',   caractere: 'Vivant',           caractereAr: 'حيوي',        icon: 'zap',         category: 'social' },
  { slug: 'mourad', geminiVoice: 'Sadaltager',     name: 'Mourad', nameAr: 'مراد',   caractere: 'Savant et érudit', caractereAr: 'عالِم',       icon: 'headphones',  category: 'formal' },
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
    gender: GENDER_A_CONFIRMER,
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
