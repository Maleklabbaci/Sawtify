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
 *  2) LE GENRE EST DÉSORMAIS CONNU POUR LES 30 VOIX.
 *     Il vient de la liste de référence fournie par le propriétaire du
 *     projet (12 femmes, 18 hommes), croisée avec le catalogue officiel.
 *     Chaque prénom et chaque descripteur suit donc le genre RÉEL de la
 *     voix : une voix féminine porte un prénom féminin et un descripteur
 *     accordé au féminin. Plus aucun « unknown ».
 *
 *  3) L'ORDRE COMPTE : femmes d'abord, puis hommes. C'est ce qui donne un
 *     catalogue lisible quand on ne filtre pas.
 */

import type { Voice } from '../types';

/** Conservé pour compatibilité : plus aucune voix ne l'utilise (règle n°2). */
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
  /** Genre RÉEL de la voix, vérifié auprès du catalogue officiel. */
  gender: 'male' | 'female';
};

/**
 * Les 21 voix, dans l'ordre du catalogue officiel.
 * `caractere` reprend la traduction du descripteur Google.
 */
/**
 * ⚠️ ACCORD FRANÇAIS — à ne pas « simplifier ».
 * Ces descripteurs sont affichés tels quels après le mot « Voix » :
 *     Darja algérienne • Voix décontractée
 * « Voix » est FÉMININ en français. Les descripteurs doivent donc TOUS être
 * au féminin. Ils étaient au masculin à l'origine (« Voix décontracté »,
 * « Voix clair », « Voix enjoué », « Voix mûr »…), ce qui se lit comme une
 * faute dès la première ligne de la liste des voix. Corrigé le 26/09/2026.
 * Idem pour le champ arabe, qui suit directement « صوت ».
 */
const NOUVELLES_VOIX: NouvelleVoix[] = [
  // Les femmes d'abord (9), les hommes ensuite (12) : ordre du catalogue.
  // ── Femmes (9) ──────────────────────────────────────────────────────────
  { slug: 'ines', geminiVoice: 'Kore', name: 'Ines', nameAr: 'إيناس', caractere: 'Ferme', caractereAr: 'حازم', icon: 'mic', category: 'formal', gender: 'female' },
  { slug: 'aya', geminiVoice: 'Aoede', name: 'Aya', nameAr: 'آية', caractere: 'Légère et aérienne', caractereAr: 'خفيف', icon: 'sparkles', category: 'social', gender: 'female' },
  { slug: 'feriel', geminiVoice: 'Callirrhoe', name: 'Feriel', nameAr: 'فريال', caractere: 'Décontractée', caractereAr: 'مرتاح', icon: 'podcast', category: 'social', gender: 'female' },
  { slug: 'nada', geminiVoice: 'Autonoe', name: 'Nada', nameAr: 'ندى', caractere: 'Éclatante', caractereAr: 'مشرق', icon: 'sparkles', category: 'commercial', gender: 'female' },
  { slug: 'salma', geminiVoice: 'Despina', name: 'Salma', nameAr: 'سلمى', caractere: 'Lisse', caractereAr: 'سلس', icon: 'sparkles', category: 'narrative', gender: 'female' },
  { slug: 'rania', geminiVoice: 'Erinome', name: 'Rania', nameAr: 'رانيا', caractere: 'Claire', caractereAr: 'واضح', icon: 'mic', category: 'formal', gender: 'female' },
  { slug: 'hanane', geminiVoice: 'Laomedeia', name: 'Hanane', nameAr: 'حنان', caractere: 'Enjouée', caractereAr: 'مرح', icon: 'flame', category: 'commercial', gender: 'female' },
  { slug: 'nassim', geminiVoice: 'Vindemiatrix', name: 'Nassima', nameAr: 'نسيمة', caractere: 'Douce', caractereAr: 'ناعم', icon: 'audio-lines', category: 'narrative', gender: 'female' },
  { slug: 'widad', geminiVoice: 'Gacrux', name: 'Widad', nameAr: 'وداد', caractere: 'Mûre', caractereAr: 'ناضج', icon: 'headphones', category: 'narrative', gender: 'female' },
  // ── Hommes (12) ─────────────────────────────────────────────────────────
  { slug: 'anis', geminiVoice: 'Enceladus', name: 'Anis', nameAr: 'أنيس', caractere: 'Soufflé et aéré', caractereAr: 'نفَسي وخفيف', icon: 'volume-2', category: 'narrative', gender: 'male' },
  { slug: 'zaki', geminiVoice: 'Iapetus', name: 'Zaki', nameAr: 'زكي', caractere: 'Clair', caractereAr: 'واضح', icon: 'mic', category: 'formal', gender: 'male' },
  { slug: 'walid', geminiVoice: 'Umbriel', name: 'Walid', nameAr: 'وليد', caractere: 'Décontracté', caractereAr: 'مرتاح', icon: 'radio', category: 'social', gender: 'male' },
  { slug: 'nabil', geminiVoice: 'Algieba', name: 'Nabil', nameAr: 'نبيل', caractere: 'Lisse', caractereAr: 'سلس', icon: 'audio-lines', category: 'narrative', gender: 'male' },
  { slug: 'hakim', geminiVoice: 'Rasalgethi', name: 'Hakim', nameAr: 'حكيم', caractere: 'Informatif', caractereAr: 'إخباري', icon: 'podcast', category: 'formal', gender: 'male' },
  { slug: 'adel', geminiVoice: 'Alnilam', name: 'Adel', nameAr: 'عادل', caractere: 'Ferme', caractereAr: 'حازم', icon: 'mic', category: 'formal', gender: 'male' },
  { slug: 'hicham', geminiVoice: 'Achird', name: 'Hicham', nameAr: 'هشام', caractere: 'Amical', caractereAr: 'ودود', icon: 'podcast', category: 'social', gender: 'male' },
  { slug: 'reda', geminiVoice: 'Zubenelgenubi', name: 'Reda', nameAr: 'رضا', caractere: 'Décontracté', caractereAr: 'عفوي', icon: 'radio', category: 'social', gender: 'male' },
  { slug: 'yacine', geminiVoice: 'Pulcherrima', name: 'Yacine', nameAr: 'ياسين', caractere: 'Direct et assuré', caractereAr: 'مباشر', icon: 'megaphone', category: 'commercial', gender: 'male' },
  { slug: 'amina', geminiVoice: 'Schedar', name: 'Amir', nameAr: 'أمير', caractere: 'Égal et posé', caractereAr: 'متوازن', icon: 'sparkles', category: 'narrative', gender: 'male' },
  { slug: 'fares', geminiVoice: 'Sadachbia', name: 'Fares', nameAr: 'فارس', caractere: 'Vivant', caractereAr: 'حيوي', icon: 'zap', category: 'social', gender: 'male' },
  { slug: 'mourad', geminiVoice: 'Sadaltager', name: 'Mourad', nameAr: 'مراد', caractere: 'Savant et érudit', caractereAr: 'مثقّف ورصين', icon: 'headphones', category: 'formal', gender: 'male' },
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
