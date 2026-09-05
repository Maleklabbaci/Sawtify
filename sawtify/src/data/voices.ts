import { Voice, CreditPack } from '../types';

export type LanguageCode = 'fr' | 'ar';

export const VOICES_FR: Voice[] = [
  {
    id: 'voice_amin',
    geminiVoice: 'Puck',
    name: 'Amine',
    locale: 'ar-DZ',
    dialect: 'Darja algérienne • Voix masculine naturelle et jeune',
    gender: 'male',
    icon: 'mic',
    category: 'commercial',
    sampleText: 'Salam alaykoum khawti ! Avec Sawtify, vos textes deviennent une voix humaine 100% naturelle et de haute qualité.',
    badge: 'Le plus populaire',
    styles: ['Naturel', 'Dynamique', 'Publicitaire']
  },
  {
    id: 'voice_yasmin',
    geminiVoice: 'Kore',
    name: 'Yasmine',
    locale: 'ar-DZ',
    dialect: 'Darja algérienne • Voix féminine chaleureuse et souriante',
    gender: 'female',
    icon: 'sparkles',
    category: 'commercial',
    sampleText: 'Bienvenue à tous ! Découvrez la synthèse vocale IA algérienne au son chaleureux et d\'une clarté parfaite.',
    badge: 'Publicité & Commerce',
    styles: ['Fluide', 'Souriante', 'Marketing']
  },
  {
    id: 'voice_khalid',
    geminiVoice: 'Charon',
    name: 'Khalid',
    locale: 'ar-DZ',
    dialect: 'Darja algérienne • Voix masculine posée et solennelle',
    gender: 'male',
    icon: 'radio',
    category: 'formal',
    sampleText: 'Nous vous présentons aujourd\'hui une technologie vocale d\'élite, avec une articulation précise et équilibrée.',
    badge: 'Documentaire & Formel',
    styles: ['Solennel', 'Documentaire', 'Journalistique']
  },
  {
    id: 'voice_maryam',
    geminiVoice: 'Zephyr',
    name: 'Maryam',
    locale: 'ar-DZ',
    dialect: 'Darja algérienne • Voix féminine douce et élégante',
    gender: 'female',
    icon: 'podcast',
    category: 'narrative',
    sampleText: 'Écoutez une diction fluide et harmonieuse, apportant une touche d\'élégance à tous vos podcasts et vidéos.',
    badge: 'Podcast & Documentaire',
    styles: ['Professionnel', 'Apaisant', 'Pédagogique']
  },
  {
    id: 'voice_rashid',
    geminiVoice: 'Fenrir',
    name: 'Rachid',
    locale: 'ar-DZ',
    dialect: 'Darja algérienne • Voix masculine puissante et percutante',
    gender: 'male',
    icon: 'flame',
    category: 'commercial',
    sampleText: 'Bienvenue à tous ! Une expérience sonore algérienne dynamique et percutante, idéale pour vos spots publicitaires.',
    badge: 'Énergique & Publicité',
    styles: ['Puissant', 'Expressif', 'Récit']
  },
  {
    id: 'voice_layla',
    geminiVoice: 'Aoede',
    name: 'Layla',
    locale: 'ar-DZ',
    dialect: 'Darja algérienne • Voix féminine moderne et rythmée',
    gender: 'female',
    icon: 'zap',
    category: 'social',
    sampleText: 'Bonjour à tous ! Une voix dynamique, fraîche et rapide, parfaite pour vos stories Instagram et vidéos TikTok.',
    badge: 'TikTok & Réseaux',
    styles: ['Dynamique', 'Interactif', 'Lumineux']
  },
  {
    id: 'voice_bilal',
    geminiVoice: 'Orus',
    name: 'Bilal',
    locale: 'ar-DZ',
    dialect: 'Darja algérienne • Voix masculine profonde et narrative',
    gender: 'male',
    icon: 'audio-lines',
    category: 'narrative',
    sampleText: 'Avec Sawtify, le rendu vocal est si naturel qu\'on croirait un présentateur en studio d\'enregistrement.',
    badge: 'Narration & Récit',
    styles: ['Chaleureux', 'Authentique', 'Narratif']
  },
  {
    id: 'voice_nour',
    geminiVoice: 'Sulafat',
    name: 'Nour',
    locale: 'ar-DZ',
    dialect: 'Darja algérienne • Voix féminine douce et limpide',
    gender: 'female',
    icon: 'volume-2',
    category: 'social',
    sampleText: 'Profitez d\'une élocution limpide et agréable pour tous les auditeurs, avec une intonation douce et fluide.',
    badge: 'Doux & Fluide',
    styles: ['Doux', 'Harmonieux', 'Interactif']
  },
  {
    id: 'voice_faycal',
    geminiVoice: 'Leda',
    name: 'Fayçal',
    locale: 'ar-DZ',
    dialect: 'Darja algérienne • Voix masculine affirmée et directe',
    gender: 'male',
    icon: 'megaphone',
    category: 'commercial',
    sampleText: 'Vous recherchez une voix-off professionnelle pour votre entreprise ou vos produits ? Vous êtes au bon endroit.',
    badge: 'Commerce & Vente',
    styles: ['Assuré', 'Commercial', 'Direct']
  }
];

export const VOICES_AR: Voice[] = [
  {
    id: 'voice_amin',
    geminiVoice: 'Puck',
    name: 'أمين',
    locale: 'ar-DZ',
    dialect: 'دارجة جزائرية • صوت رجالي طبيعي وشبابي',
    gender: 'male',
    icon: 'mic',
    category: 'commercial',
    sampleText: 'سلام عليكم خاوتي، واش راكم لاباس؟ مع منصة صوتيفي تقدر تحول نصوصك لصوت بشري طبيعي مئة بالمئة بلا أي نبرة آلية وبأعلى جودة.',
    badge: 'الأكثر طلباً',
    styles: ['طبيعي', 'حيوي', 'إعلاني']
  },
  {
    id: 'voice_yasmin',
    geminiVoice: 'Kore',
    name: 'ياسمين',
    locale: 'ar-DZ',
    dialect: 'دارجة جزائرية • صوت نسائي دافئ ومبتسم',
    gender: 'female',
    icon: 'sparkles',
    category: 'commercial',
    sampleText: 'مرحبا بيكم كاملين! هادي أحسن منصة جزائرية بالذكاء الاصطناعي الصوتي، بنطق دقيق، صوت دافئ وبلا أي روبوتيك.',
    badge: 'إعلانات وتجارة',
    styles: ['انسيابي', 'مبتسم', 'تسويقي']
  },
  {
    id: 'voice_khalid',
    geminiVoice: 'Charon',
    name: 'خالد',
    locale: 'ar-DZ',
    dialect: 'دارجة جزائرية • صوت رجالي وقور ورزين',
    gender: 'male',
    icon: 'radio',
    category: 'formal',
    sampleText: 'السلام عليكم ورحمة الله، نقدّم ليكم اليوم أحدث تقنية في الصوت الرقمي، بصوت موزون ونقي ومخارج حروف واضحة ومتقنة.',
    badge: 'وثائقي ورسمي',
    styles: ['وقور', 'وثائقي', 'إخباري']
  },
  {
    id: 'voice_maryam',
    geminiVoice: 'Zephyr',
    name: 'مريم',
    locale: 'ar-DZ',
    dialect: 'دارجة جزائرية • صوت نسائي هادئ وأنيق',
    gender: 'female',
    icon: 'podcast',
    category: 'narrative',
    sampleText: 'سلام، استمعوا لنطق دارجة جزائرية نقية وسلسة، تزيد لمسة احترافية وهادئة لكل الفيديوهات والبودكاست ديالكم.',
    badge: 'بودكاست ورواية',
    styles: ['احترافي', 'هادئ', 'تعليمي']
  },
  {
    id: 'voice_rashid',
    geminiVoice: 'Fenrir',
    name: 'رشيد',
    locale: 'ar-DZ',
    dialect: 'دارجة جزائرية • صوت رجالي قوي وحماسي',
    gender: 'male',
    icon: 'flame',
    category: 'commercial',
    sampleText: 'يا هلا بيكم خاوتنا العزاز! هاذي تجربة صوتية جزائرية قوية وصافية، هايلة للسبوتات الإشهارية والحكايات المشوقة.',
    badge: 'حماسي وإشهاري',
    styles: ['قوي', 'معبر', 'قصصي']
  },
  {
    id: 'voice_layla',
    geminiVoice: 'Aoede',
    name: 'ليلى',
    locale: 'ar-DZ',
    dialect: 'دارجة جزائرية • صوت نسائي عصري ومشرق',
    gender: 'female',
    icon: 'zap',
    category: 'social',
    sampleText: 'أهلاً وسهلاً بيكم! صوت حيوي، خفيف على الودن وسريع، يوالم ستوريات إنستغرام، تيك توك وخدمة الزبائن.',
    badge: 'تيك توك وريلز',
    styles: ['حيوي', 'تفاعلي', 'مشرق']
  },
  {
    id: 'voice_bilal',
    geminiVoice: 'Orus',
    name: 'بلال',
    locale: 'ar-DZ',
    dialect: 'دارجة جزائرية • صوت رجالي دافئ وعميق',
    gender: 'male',
    icon: 'audio-lines',
    category: 'narrative',
    sampleText: 'صحا خاوتي، مع صوتيفي ما تزيدش تشقى تسجل، الصوت يخرج طبيعي وسلس كأنو متحدث جزائري حقيقي معاك في الستوديو.',
    badge: 'سردي وقصصي',
    styles: ['دافئ', 'طبيعي', 'سردي']
  },
  {
    id: 'voice_nour',
    geminiVoice: 'Sulafat',
    name: 'نور',
    locale: 'ar-DZ',
    dialect: 'دارجة جزائرية • صوت نسائي ناعم وواضح',
    gender: 'female',
    icon: 'volume-2',
    category: 'social',
    sampleText: 'مرحباً بيكم، تمتعوا بنطق دارجة واضحة ومفهومة عند كامل الجزائريين، بنبرة خفيفة ومريحة تسمعها بلا ما تعيا.',
    badge: 'لطيف ومرن',
    styles: ['لطيف', 'ناعم', 'تفاعلي']
  },
  {
    id: 'voice_faycal',
    geminiVoice: 'Leda',
    name: 'فيصل',
    locale: 'ar-DZ',
    dialect: 'دارجة جزائرية • صوت رجالي واثق ومباشر',
    gender: 'male',
    icon: 'megaphone',
    category: 'commercial',
    sampleText: 'واش راكم خاوتي؟ إلى راك تحوس على فويس أوفر دارجة جزائرية احترافية للمشروع ولا السلعة ديالك، راك في المكان الصحيح.',
    badge: 'تجارة وتسويق',
    styles: ['واثق', 'تجاري', 'مباشر']
  }
];

export const CREDIT_PACKS_FR: CreditPack[] = [
  {
    id: 'pack_starter',
    name: '100 Points',
    points: 100,
    priceDZD: 500,
    tagline: 'Idéal pour tester et créer 5 voix-off haute définition.',
  },
  {
    id: 'pack_pro',
    name: '220 Points',
    points: 220,
    priceDZD: 1000,
    bonusPercent: 10,
    isPopular: true,
    tagline: 'Le plus populaire en Algérie. +20 points offerts (11 générations complètes).',
  },
  {
    id: 'pack_studio',
    name: '600 Points',
    points: 600,
    priceDZD: 2500,
    bonusPercent: 20,
    tagline: 'Pour les créateurs réguliers et agences. +100 points offerts.',
  },
  {
    id: 'pack_business',
    name: '1 350 Points',
    points: 1350,
    priceDZD: 5000,
    bonusPercent: 35,
    tagline: 'Volume étendu, support dédié et accès prioritaire aux modèles.',
  }
];

export const CREDIT_PACKS_AR: CreditPack[] = [
  {
    id: 'pack_starter',
    name: '100 نقطة',
    points: 100,
    priceDZD: 500,
    tagline: 'مثالية للتجربة وإنشاء 5 تسجيلات صوتية عالية الدقة.',
  },
  {
    id: 'pack_pro',
    name: '220 نقطة',
    points: 220,
    priceDZD: 1000,
    bonusPercent: 10,
    isPopular: true,
    tagline: 'الأكثر طلباً في الجزائر. +20 نقطة مهداة (11 تسجيلاً كاملاً).',
  },
  {
    id: 'pack_studio',
    name: '600 نقطة',
    points: 600,
    priceDZD: 2500,
    bonusPercent: 20,
    tagline: 'للوكالات وصناع المحتوى المنتظمين. +100 نقطة مهداة.',
  },
  {
    id: 'pack_business',
    name: '1350 نقطة',
    points: 1350,
    priceDZD: 5000,
    bonusPercent: 35,
    tagline: 'رصيد ضخم، دعم مخصص وأولوية الوصول لأحدث النماذج الصوتية.',
  }
];

export const STYLE_TAGS_FR = [
  { tag: '[natural]', label: 'Voix 100% Naturelle', desc: 'Zéro ton robotique, intonation humaine et vivante' },
  { tag: '[articulated]', label: 'Diction Parfaite', desc: 'Articulation nette et précise de chaque consonne' },
  { tag: '[whispers]', label: 'Chuchotement', desc: 'Ton intimiste, doux et confidentiel' },
  { tag: '[excited]', label: 'Énergique / Enthousiaste', desc: 'Idéal pour promotions et e-commerce' },
  { tag: '[calm]', label: 'Calme & Posé', desc: 'Méditation, e-learning ou tutoriel' },
  { tag: '[dramatic]', label: 'Dramatique & Captivant', desc: 'Cinéma, storytelling et documentaires' },
  { tag: '[fast]', label: 'Rythme Rapide', desc: 'Spot radio et formats courts 15s' },
  { tag: '[breathing]', label: 'Respiration Réaliste', desc: 'Pauses et micro-souffles physiologiques' },
  { tag: '[laughter]', label: 'Sourire & Rire Léger', desc: 'Touche amicale, chaleureuse et spontanée' },
];

export const STYLE_TAGS_AR = [
  { tag: '[natural]', label: 'صوت بشري طبيعي 100%', desc: 'بلا أي نبرة آلية، نطق حي وطبيعي' },
  { tag: '[articulated]', label: 'مخارج حروف متقنة', desc: 'نطق واضح وصافي لكامل الحروف ومخارجها' },
  { tag: '[whispers]', label: 'همس دافئ', desc: 'نبرة هادئة وقريبة من القلب' },
  { tag: '[excited]', label: 'حماسي ونشيط', desc: 'مثالي للإعلانات والعروض الترويجية' },
  { tag: '[calm]', label: 'هادئ ورزين', desc: 'مناسب للشروحات والكتب الصوتية' },
  { tag: '[dramatic]', label: 'درامي ومؤثر', desc: 'للسرد القصصي والأفلام الوثائقية' },
  { tag: '[fast]', label: 'إيقاع سريع', desc: 'للإعلانات القصيرة وسبوتات الراديو' },
  { tag: '[breathing]', label: 'تنفس طبيعي', desc: 'وقفات تنفس واقعية بين الجمل' },
  { tag: '[laughter]', label: 'ضحكة ونبرة مبتسمة', desc: 'لمسة ودودة وعفوية' },
];

export const SAMPLE_PROMPTS_FR = [
  {
    title: '🇩🇿 Spot Publicitaire Voix-Off',
    text: '[natural] [articulated] Bonjour à tous ! Avec la plateforme Sawtify, transformez vos textes en une voix humaine fluide, vivante et d\'une clarté studio absolue, sans aucune sonorité robotique.'
  },
  {
    title: '🛍️ Annonce E-commerce & Livraison 58 Wilayas',
    text: '[excited] [articulated] Ne manquez pas cette opportunité exclusive ! [calm] Livraison express disponible dans les 58 wilayas jusqu\'à votre porte avec paiement sécurisé à la réception. Commandez dès maintenant !'
  },
  {
    title: '🎙️ Podcast & Narration Storytelling',
    text: '[natural] [articulated] Bienvenue dans cet épisode dédié à l\'innovation sonore. Nous explorons aujourd\'hui les nouvelles frontières de la voix avec une articulation soignée et chaleureuse.'
  },
  {
    title: '📞 Standard Téléphonique & Répondeur IVR',
    text: '[natural] [articulated] Bienvenue sur notre standard d\'accueil. [calm] Pour le service commercial, appuyez sur 1. Pour l\'assistance technique, appuyez sur 2. Merci de votre fidélité.'
  },
  {
    title: '📱 Story Réseaux Sociaux & Vidéo Courte',
    text: '[excited] [natural] Salut l\'équipe ! Découvrez sans attendre notre nouvelle sélection avec des finitions haut de gamme au meilleur tarif. Rendez-vous sur le lien en description !'
  }
];

export const SAMPLE_PROMPTS_AR = [
  {
    title: '🇩🇿 سبوت إشهاري بالدارجة الجزائرية',
    text: '[natural] [articulated] سلام عليكم خاوتي! مع منصة صوتيفي، كل كلمة تخرج بنطق دارجة نقي ومفهوم مئة بالمئة، صوت دافئ وبلا أي تصنع أو روبوتيك.'
  },
  {
    title: '🛍️ إعلان إيكوميرس وتوصيل 58 ولاية',
    text: '[excited] [articulated] هاد البروموسيون ما تتعاودش خاوتنا! [calm] التوصيل متوفر لـ 58 ولاية حتى لباب الدار والدفع عند الاستلام. اطلب درك وما تترددش!'
  },
  {
    title: '🎙️ بودكاست ومحتوى يوتيوب بالدارجة',
    text: '[natural] [articulated] مرحبا بيكم في هاد الحلقة الجديدة. اليوم راح نحكيو على موضوع يهم كامل الجزائريين، بنبرة عفوية وقريبة من القلب.'
  },
  {
    title: '📞 خدمة الزبائن والموزع الصوتي (IVR)',
    text: '[natural] [articulated] مرحباً بكم في خدمة الزبائن. [calm] للتواصل باللغة العربية والدارجة اضغط على الرقم واحد. Pour le français, tapez deux. شكراً لثقتكم بنا.'
  },
  {
    title: '📱 ستوري ريلز وتيك توك شبابي',
    text: '[excited] [natural] واش راكم ليكيب؟ شوفو هاد الهاتف الجديد واش فيه مواصفات خيالية وسومة ولا في الأحلام، شوفو الرابط في البايو!'
  }
];

// Helper functions for dynamic language support
export function getVoices(lang: LanguageCode = 'fr'): Voice[] {
  return lang === 'ar' ? VOICES_AR : VOICES_FR;
}

export function getCreditPacks(lang: LanguageCode = 'fr'): CreditPack[] {
  return lang === 'ar' ? CREDIT_PACKS_AR : CREDIT_PACKS_FR;
}

export function getStyleTags(lang: LanguageCode = 'fr') {
  return lang === 'ar' ? STYLE_TAGS_AR : STYLE_TAGS_FR;
}

export function getSamplePrompts(lang: LanguageCode = 'fr') {
  return lang === 'ar' ? SAMPLE_PROMPTS_AR : SAMPLE_PROMPTS_FR;
}

// Fallback exports for backward compatibility
export const VOICES = VOICES_FR;
export const CREDIT_PACKS = CREDIT_PACKS_FR;
export const STYLE_TAGS = STYLE_TAGS_FR;
export const SAMPLE_PROMPTS = SAMPLE_PROMPTS_FR;
