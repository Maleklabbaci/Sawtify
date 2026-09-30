/**
 * MÉMOIRE DU STUDIO — « ce que Sawtify a appris de toi »
 * ---------------------------------------------------------------------------
 * Objectif : arrêter de proposer les mêmes 4 exemples à tout le monde
 * (e-commerce, restaurant, immobilier, événement) quand l'utilisateur écrit
 * depuis des semaines sur un autre sujet. Si quelqu'un fait des scripts sur
 * l'IA, le studio doit lui proposer des exemples sur l'IA.
 *
 * Comment ça marche, en clair :
 *   1. Le studio lit TES textes (ceux que tu génères, ceux que tu décris en
 *      mode « script ») et repère le domaine : IA, e-commerce, restauration,
 *      formation, podcast, santé, immobilier, mode, services, voyage.
 *   2. Chaque domaine a des exemples écrits à la main (FR + darija), pas des
 *      phrases génériques.
 *   3. Le texte en cours d'écriture compte aussi : dès que tu tapes un
 *      paragraphe sur un sujet, les suggestions suivent immédiatement.
 *   4. Chaque domaine confirmé (génération faite, suggestion cliquée) renforce
 *      la mémoire : le studio se souvient d'une session à l'autre.
 *
 * VIE PRIVÉE : tout se passe dans TON navigateur (localStorage). Aucun texte
 * n'est envoyé au serveur pour deviner le domaine, aucun appel IA n'est
 * facturé, et `forgetTaste()` efface tout.
 */

import type { LanguageCode } from '../data/voices';

export type ComposerMode = 'voice' | 'script';

export type NicheIcon =
  | 'sparkles' | 'cart' | 'food' | 'home' | 'school'
  | 'mic' | 'heart' | 'shirt' | 'briefcase' | 'plane';

export interface Starter {
  /** Libellé court affiché sur la puce (ex. « Formation IA »). */
  label: Record<LanguageCode, string>;
  /** Texte proposé : à lire en mode « voix », à décrire en mode « script ». */
  text: Record<LanguageCode, string>;
}

export interface Niche {
  id: string;
  name: Record<LanguageCode, string>;
  icon: NicheIcon;
  /**
   * Termes SIGNATURE (+4) : impossible de tomber dessus par hasard
   * (« intelligence artificielle », « pâtisserie », « بودكاست »).
   */
  signature: RegExp;
  /** Termes spécifiques mais ambigus seuls (+2) : « café », « menu », « mode ». */
  strong: RegExp;
  /** Termes d'ambiance (+1 chacun, 2 maximum) : « livraison », « client »… */
  weak: RegExp;
  voice: Starter[];
  script: Starter[];
}

/** Rattachement au vocabulaire du serveur (detectSector) quand il existe. */
export const NICHES: Niche[] = [
  {
    id: 'ia',
    name: { fr: 'Intelligence artificielle', ar: 'الذكاء الاصطناعي' },
    icon: 'sparkles',
    signature: /intelligence artificielle|ذكاء اصطناعي|شات جي بي تي|chatgpt|openai|machine learning|deep learning|midjourney|prompt\b/i,
    strong: /\bia\b|automatisation|no.?code|saas|algorithme|أتمتة|خوارزمي|ذكاء اصطناعي مبتدئ/i,
    weak: /outil|assistant|modèle|génér|données|أداة|نموذج|توليد/i,
    voice: [
      {
        label: { fr: 'Formation IA pratique', ar: 'تكوين في الذكاء الاصطناعي' },
        text: {
          fr: '[natural] Tu veux utiliser l’intelligence artificielle dans ton travail ? Voici une méthode simple, étape par étape, sans jargon.',
          ar: '[natural] تحب تستعمل الذكاء الاصطناعي في خدمتك؟ هذي طريقة بسيطة، خطوة بخطوة، وبلا تعقيد.',
        },
      },
      {
        label: { fr: 'Outil IA pour créateurs', ar: 'أداة ذكاء اصطناعي للمبدعين' },
        text: {
          fr: '[excited] Cette semaine, je te montre comment produire une vidéo complète en 10 minutes avec l’IA, même si tu débutes.',
          ar: '[excited] هذي السيمانة نوري لك كيفاش تخرج فيديو كامل في 10 دقائق بالذكاء الاصطناعي، حتى إذا كنت مبتدئ.',
        },
      },
      {
        label: { fr: 'Gagner du temps', ar: 'ربح الوقت' },
        text: {
          fr: '[calm] Imagine gagner deux heures par jour : laisse l’IA répondre à tes clients pendant que tu te concentres sur l’essentiel.',
          ar: '[calm] تخيّل تربح ساعتين في النهار: خلّي الذكاء الاصطناعي يجاوب الزبائن وأنت تركّز على المهم.',
        },
      },
    ],
    script: [
      {
        label: { fr: 'Formation IA en ligne', ar: 'دورة ذكاء اصطناعي أونلاين' },
        text: {
          fr: 'Formation en ligne sur l’IA pour débutants : 12 leçons courtes, exemples concrets, accès à vie',
          ar: 'دورة أونلاين على الذكاء الاصطناعي للمبتدئين: 12 درس قصير، أمثلة عملية، دخول مدى الحياة',
        },
      },
      {
        label: { fr: 'Outil IA de voix off', ar: 'أداة تحويل النص لصوت' },
        text: {
          fr: 'Outil IA qui transforme un texte en voix off en 30 secondes, essai gratuit',
          ar: 'أداة ذكاء اصطناعي تحوّل النص لفويس أوف في 30 ثانية، تجربة مجانية',
        },
      },
    ],
  },
  {
    id: 'ecommerce',
    name: { fr: 'E-commerce', ar: 'البيع أونلاين' },
    icon: 'cart',
    signature: /e.?commerce|dropshipping|boutique en ligne|متجر|إيكوميرس|بيع أونلاين/i,
    strong: /livraison|commande|stock|توصيل|سلعة|طلب/i,
    weak: /produit|promo|prix|panier|تخفيضات|منتج|سعر|عرض/i,
    voice: [
      {
        label: { fr: 'Promo boutique en ligne', ar: 'تخفيضات متجر أونلاين' },
        text: {
          fr: '[excited] Nouveauté ! Cette semaine seulement : -30% sur toute la boutique... [natural] Livraison partout en Algérie.',
          ar: '[excited] جديد! هذي السيمانة برك: -30% على كامل المتجر... [natural] توصيل لكامل ولايات الجزائر.',
        },
      },
      {
        label: { fr: 'Commande simple', ar: 'الطلب بسهولة' },
        text: {
          fr: '[natural] Tu cherches un produit de qualité sans te déplacer ? Commande maintenant, on livre jusqu’à ta porte.',
          ar: '[natural] تبحث على سلعة مليحة بلا ما تتحرّك؟ اطلب درك، نوصلولك حتى لباب الدار.',
        },
      },
      {
        label: { fr: 'Paiement à la réception', ar: 'الدفع عند الاستلام' },
        text: {
          fr: '[calm] Paiement à la réception, échange sous 48 heures : achète en toute confiance.',
          ar: '[calm] الدفع عند الاستلام، التبديل في 48 ساعة: اشري بكل ثقة.',
        },
      },
    ],
    script: [
      {
        label: { fr: 'Boutique de vêtements', ar: 'متجر ملابس' },
        text: {
          fr: 'Boutique de vêtements en ligne, promo -30% cette semaine, livraison partout en Algérie',
          ar: 'متجر ملابس أونلاين، تخفيضات -30% هذي السيمانة، توصيل لكامل الجزائر',
        },
      },
      {
        label: { fr: 'Coffret de parfums', ar: 'علبة عطور' },
        text: {
          fr: 'Coffret de parfums à 2500 DZD, paiement à la réception, livraison en 48 h',
          ar: 'علبة عطور بـ 2500 دج، الدفع عند الاستلام، توصيل في 48 ساعة',
        },
      },
    ],
  },
  {
    id: 'restauration',
    name: { fr: 'Restauration', ar: 'المطاعم' },
    icon: 'food',
    signature: /restaurant|pizzeria|fast.?food|pâtisserie|مطعم|بيتزا|حلويات/i,
    strong: /café|menu|plat|cuisine|مقهى|منو|كسكس|أكل|عجينة/i,
    weak: /repas|livraison|commande|طبق|طلب/i,
    voice: [
      {
        label: { fr: 'Nouvelle ouverture', ar: 'افتتاح جديد' },
        text: {
          fr: '[excited] Nouveau à Alger : notre pizzeria vient d’ouvrir... [calm] Pâte fraîche et produits du jour.',
          ar: '[excited] جديد في الجزائر العاصمة: البيتزا تاعنا حلّت... [calm] عجينة طرية ومكوّنات النهار.',
        },
      },
      {
        label: { fr: 'Menu livré chaud', ar: 'منو يوصل سخون' },
        text: {
          fr: '[natural] Un menu complet à 900 DZD, livré chaud chez toi en moins de 30 minutes.',
          ar: '[natural] منو كامل بـ 900 دج، يوصلك سخون في أقل من 30 دقيقة.',
        },
      },
      {
        label: { fr: 'Réservation week-end', ar: 'حجز الويكاند' },
        text: {
          fr: '[calm] Réserve ta table pour ce week-end : spécialités traditionnelles et ambiance familiale.',
          ar: '[calm] احجز طاولتك لهذا الويكاند: أطباق تقليدية وجو عائلي.',
        },
      },
    ],
    script: [
      {
        label: { fr: 'Restaurant traditionnel', ar: 'مطعم تقليدي' },
        text: {
          fr: 'Restaurant traditionnel à Oran, menu à 900 DZD, livraison rapide',
          ar: 'مطعم تقليدي في وهران، منو بـ 900 دج، توصيل سريع',
        },
      },
      {
        label: { fr: 'Pâtisserie maison', ar: 'حلويات بيتية' },
        text: {
          fr: 'Pâtisserie maison : commandes de gâteaux pour mariages et anniversaires',
          ar: 'حلويات بيتية: طلبات قاطو للأعراس وأعياد الميلاد',
        },
      },
    ],
  },
  {
    id: 'immobilier',
    name: { fr: 'Immobilier', ar: 'العقارات' },
    icon: 'home',
    signature: /immobilier|appartement|villa|terrain|عقار|شقة|فيلا|محل تجاري/i,
    strong: /quartier|étage|m²|location|بيع|كراء|حي|طابق/i,
    weak: /vente|proche des services|local commercial|متر مربع/i,
    voice: [
      {
        label: { fr: 'Appartement à vendre', ar: 'شقة للبيع' },
        text: {
          fr: '[natural] Appartement F3 à vendre à Oran, quartier calme, proche de toutes les commodités.',
          ar: '[natural] شقة F3 للبيع في وهران، حي هادئ وقريب من كل الخدمات.',
        },
      },
      {
        label: { fr: 'Programme neuf', ar: 'مشروع جديد' },
        text: {
          fr: '[excited] Promotion exclusive : 3 logements F4 avec vue sur mer... [calm] Crédit bancaire facilité.',
          ar: '[excited] عرض خاص: 3 شقق F4 بإطلالة على البحر... [calm] تسهيلات في القرض البنكي.',
        },
      },
      {
        label: { fr: 'Estimation gratuite', ar: 'تقييم مجاني' },
        text: {
          fr: '[calm] Tu vends ton bien ? Fais-le estimer gratuitement en 24 heures.',
          ar: '[calm] تحب تبيع عقارك؟ تقييم مجاني في 24 ساعة.',
        },
      },
    ],
    script: [
      {
        label: { fr: 'F3 à Oran', ar: 'شقة F3 في وهران' },
        text: {
          fr: 'Appartement F3 à vendre à Oran, 95 m², quartier calme, 3e étage',
          ar: 'شقة F3 للبيع في وهران، 95 م²، حي هادئ، الطابق الثالث',
        },
      },
      {
        label: { fr: 'Promotion F4', ar: 'مشروع شقق F4' },
        text: {
          fr: 'Promotion immobilière à Bordj Bou Arreridj : F4 avec crédit facilité',
          ar: 'مشروع عقاري في برج بوعريريج: شقق F4 بتسهيلات بنكية',
        },
      },
    ],
  },
  {
    id: 'education',
    name: { fr: 'Formation', ar: 'التكوين والتعليم' },
    icon: 'school',
    signature: /centre de formation|soutien scolaire|école|université|مدرسة|جامعة|دروس/i,
    strong: /formation|cours|étudiant|écolier|تكوين|دورة|تلميذ|طالب/i,
    weak: /apprend|inscription|attestation|séance|élève|apprenant|تعلم|تسجيل|شهادة|حصص/i,
    voice: [
      {
        label: { fr: 'Formation bureautique', ar: 'تكوين إعلام آلي' },
        text: {
          fr: '[calm] Formation en bureautique et comptabilité pour débutants : 12 séances pratiques, attestation à la fin.',
          ar: '[calm] تكوين في الإعلام الآلي والمحاسبة للمبتدئين: 12 حصة تطبيقية وشهادة في الأخير.',
        },
      },
      {
        label: { fr: 'Places limitées', ar: 'المقاعد محدودة' },
        text: {
          fr: '[excited] Inscriptions ouvertes... [natural] Places limitées à un groupe de 15 apprenants.',
          ar: '[excited] التسجيلات مفتوحة... [natural] المقاعد محدودة لمجموعة من 15 متربص.',
        },
      },
      {
        label: { fr: 'Soutien scolaire', ar: 'دروس الدعم' },
        text: {
          fr: '[natural] Soutien scolaire à domicile : maths et physique, du collège au lycée.',
          ar: '[natural] دروس دعم في الرياضيات والفيزياء من المتوسط للثانوي.',
        },
      },
    ],
    script: [
      {
        label: { fr: 'Centre de formation', ar: 'مركز تكوين' },
        text: {
          fr: 'Centre de formation en informatique à Blida, sessions du soir, attestation',
          ar: 'مركز تكوين في الإعلام الآلي في البليدة، حصص مسائية، شهادة',
        },
      },
      {
        label: { fr: 'Cours d’anglais', ar: 'دروس إنجليزية' },
        text: {
          fr: 'Cours d’anglais en ligne, 2 séances par semaine, professeur natif',
          ar: 'دروس إنجليزية أونلاين، حصتين في الأسبوع، أستاذ native',
        },
      },
    ],
  },
  {
    id: 'podcast',
    name: { fr: 'Podcast & YouTube', ar: 'البودكاست ويوتيوب' },
    icon: 'mic',
    signature: /podcast|youtube|podcasteur|بودكاست|يوتيوب/i,
    strong: /épisode|chaîne|حلقة|قناة/i,
    weak: /abonne|auditeur|audience|contenu|اشترك|متابع|محتوى/i,
    voice: [
      {
        label: { fr: 'Intro d’épisode', ar: 'مقدمة حلقة' },
        text: {
          fr: '[natural] Bienvenue dans ce nouvel épisode : aujourd’hui on parle d’entrepreneuriat, sans langue de bois.',
          ar: '[natural] مرحبا بيكم في حلقة جديدة: اليوم نحكيو على الريادة والبيزنس، بلا زواق.',
        },
      },
      {
        label: { fr: 'Appel à s’abonner', ar: 'دعوة للاشتراك' },
        text: {
          fr: '[excited] Abonne-toi si tu veux une nouvelle vidéo chaque dimanche sur le business en Algérie.',
          ar: '[excited] اشترك إذا راك تحب فيديو جديد كل يوم أحد على البيزنس في الجزائر.',
        },
      },
      {
        label: { fr: 'Sujet unique', ar: 'موضوع واحد' },
        text: {
          fr: '[calm] Cette semaine, un seul sujet : comment négocier ton salaire, concrètement.',
          ar: '[calm] هذي السيمانة موضوع واحد: كيفاش تتفاوض على راتبك، بلا كلام زايد.',
        },
      },
    ],
    script: [
      {
        label: { fr: 'Épisode entrepreneuriat', ar: 'حلقة على الريادة' },
        text: {
          fr: 'Épisode de podcast sur l’entrepreneuriat en Algérie, 15 minutes, ton direct',
          ar: 'حلقة بودكاست على الريادة في الجزائر، 15 دقيقة، بأسلوب مباشر',
        },
      },
      {
        label: { fr: 'Vidéo tech 5 min', ar: 'فيديو تقني 5 دقائق' },
        text: {
          fr: 'Chaîne YouTube d’actualité tech, vidéo de 5 minutes, rythme rapide',
          ar: 'قناة يوتيوب للأخبار التكنولوجية، فيديو 5 دقائق، إيقاع سريع',
        },
      },
    ],
  },
  {
    id: 'sante',
    name: { fr: 'Santé', ar: 'الصحة' },
    icon: 'heart',
    signature: /clinique|pharmacie|dentaire|عيادة|صيدلية/i,
    strong: /médecin|analyse|patient|traitement|طبيب|تحاليل|مريض|علاج/i,
    weak: /consultation|santé|bilan|استشارة|فحص|صحة/i,
    voice: [
      {
        label: { fr: 'Clinique privée', ar: 'عيادة خاصة' },
        text: {
          fr: '[calm] Clinique privée à Blida : prise en charge complète, analyses le jour même.',
          ar: '[calm] عيادة خاصة في البليدة: تكفّل كامل، تحاليل في نفس النهار.',
        },
      },
      {
        label: { fr: 'Sans rendez-vous', ar: 'بلا موعد' },
        text: {
          fr: '[natural] Consultation sans rendez-vous du samedi au jeudi, de 8 h à 16 h.',
          ar: '[natural] استشارة بلا موعد من السبت للخميس، من 8 للـ16.',
        },
      },
      {
        label: { fr: 'Bilan complet', ar: 'فحص كامل' },
        text: {
          fr: '[calm] Prends soin de toi : un bilan complet en 40 minutes, résultats par e-mail.',
          ar: '[calm] دي على روحك: فحص كامل في 40 دقيقة، النتائج بالإيميل.',
        },
      },
    ],
    script: [
      {
        label: { fr: 'Clinique à Blida', ar: 'عيادة في البليدة' },
        text: {
          fr: 'Clinique privée à Blida : prise en charge complète, analyses le jour même',
          ar: 'عيادة خاصة في البليدة: تكفّل كامل وتحاليل في نفس النهار',
        },
      },
      {
        label: { fr: 'Pharmacie en ligne', ar: 'صيدلية أونلاين' },
        text: {
          fr: 'Pharmacie en ligne : livraison de médicaments à domicile',
          ar: 'صيدلية أونلاين: توصيل الأدوية للدار',
        },
      },
    ],
  },
  {
    id: 'mode',
    name: { fr: 'Mode & beauté', ar: 'الملابس والتجميل' },
    icon: 'shirt',
    signature: /vêtement|caftan|robe|parfum|cosmétique|maquillage|ملابس|قفطان|قندورة|عطر|تجميل/i,
    strong: /collection|sur mesure|beauté|mode|مجموعة|على المقاس/i,
    weak: /taille|bijou|talons|قياس|مجوهرات/i,
    voice: [
      {
        label: { fr: 'Nouvelle collection', ar: 'مجموعة جديدة' },
        text: {
          fr: '[excited] Nouvelle collection arrivée... [natural] Coupes modernes, tailles du S au XXL.',
          ar: '[excited] مجموعة جديدة وصلت... [natural] قياسات من S للـXXL.',
        },
      },
      {
        label: { fr: 'Sur mesure', ar: 'على المقاس' },
        text: {
          fr: '[calm] Caftans et robes traditionnelles faits main, sur mesure en 7 jours.',
          ar: '[calm] قفاطن وحنابل باليد، على المقاس في 7 أيام.',
        },
      },
      {
        label: { fr: 'Deuxième casse de prix', ar: 'تخفيضات الموسم' },
        text: {
          fr: '[natural] C’est la deuxième casse de prix de l’année : tout à -50% jusqu’à dimanche.',
          ar: '[natural] ثاني تخفيض في العام: كلشي -50% حتى للحد.',
        },
      },
    ],
    script: [
      {
        label: { fr: 'Caftans sur mesure', ar: 'قفاطن على المقاس' },
        text: {
          fr: 'Boutique de caftans sur mesure à Constantine, livraison 58 wilayas',
          ar: 'متجر قفاطن على المقاس في قسنطينة، توصيل لـ58 ولاية',
        },
      },
      {
        label: { fr: 'Parfums & cosmétiques', ar: 'عطور ومستحضرات' },
        text: {
          fr: 'Coffret de cosmétiques naturels, prix de lancement, livraison 48 h',
          ar: 'علبة مستحضرات تجميل طبيعية، سعر الافتتاح، توصيل في 48 ساعة',
        },
      },
    ],
  },
  {
    id: 'services',
    name: { fr: 'Services & agences', ar: 'الخدمات والوكالات' },
    icon: 'briefcase',
    signature: /agence|plombier|électricien|site web|développeur|وكالة|سباك|كهربائي/i,
    strong: /marketing|publicité|artisan|freelance|إعلانات|حرفي|تسويق/i,
    weak: /devis|client|prestation|تسعيرة|زبون|خدمة/i,
    voice: [
      {
        label: { fr: 'Agence digitale', ar: 'وكالة رقمية' },
        text: {
          fr: '[natural] Agence digitale : sites web, publicité Facebook et gestion de pages, dès 15 000 DZD.',
          ar: '[natural] وكالة رقمية: مواقع، إعلانات فيسبوك وتسيير الصفحات، بداية من 15.000 دج.',
        },
      },
      {
        label: { fr: 'Dépannage rapide', ar: 'تدخل سريع' },
        text: {
          fr: '[calm] Plombier, électricien, peintre : intervention en moins de 2 heures sur Alger.',
          ar: '[calm] سباك، كهربائي، صبّاغ: تدخّل في أقل من ساعتين في الجزائر العاصمة.',
        },
      },
      {
        label: { fr: 'Devis gratuit', ar: 'تسعيرة مجانية' },
        text: {
          fr: '[excited] Ton commerce mérite une vraie présence en ligne... [natural] Devis gratuit en 24 h.',
          ar: '[excited] محلك يستاهل حضور قوي على الأنترنت... [natural] تسعيرة مجانية في 24 ساعة.',
        },
      },
    ],
    script: [
      {
        label: { fr: 'Agence Facebook Ads', ar: 'وكالة إعلانات' },
        text: {
          fr: 'Agence de publicité Facebook à Alger : sites web et gestion de pages',
          ar: 'وكالة إعلانات فيسبوك في الجزائر العاصمة: مواقع وتسيير صفحات',
        },
      },
      {
        label: { fr: 'Plomberie à domicile', ar: 'خدمة السباكة' },
        text: {
          fr: 'Service de plomberie à domicile, intervention rapide, devis gratuit',
          ar: 'خدمة السباكة في الدار، تدخل سريع، تسعيرة مجانية',
        },
      },
    ],
  },
  {
    id: 'tourisme',
    name: { fr: 'Voyage & tourisme', ar: 'السفر والسياحة' },
    icon: 'plane',
    signature: /voyage|omra|hôtel|séjour|عمرة|سفر|فندق/i,
    strong: /tourisme|billet|vacances|رحلة|تذكرة|سياحة/i,
    weak: /destination|vol|عطلة|إقامة/i,
    voice: [
      {
        label: { fr: 'Formule Omra', ar: 'فورمول العمرة' },
        text: {
          fr: '[excited] Omra 2026 : formules complètes avec hôtel proche du Haram... [calm] Places limitées.',
          ar: '[excited] العمرة 2026: فورمولات كاملة مع فندق قريب من الحرم... [calm] المقاعد محدودة.',
        },
      },
      {
        label: { fr: 'Week-end nature', ar: 'ويكاند في الطبيعة' },
        text: {
          fr: '[natural] Week-end à Tikjda : transport, repas et guide inclus, à partir de 12 000 DZD.',
          ar: '[natural] ويكاند في تيكجدة: النقل، الماكلة والمرشد داخلين، بداية من 12.000 دج.',
        },
      },
      {
        label: { fr: 'Billet d’avion', ar: 'تذكرة طائرة' },
        text: {
          fr: '[calm] Réserve ton billet d’avion en quelques clics, paiement en plusieurs fois.',
          ar: '[calm] احجز تذكرتك في شوي كليكات، دفع بالتقسيط.',
        },
      },
    ],
    script: [
      {
        label: { fr: 'Agence Omra', ar: 'وكالة عمرة' },
        text: {
          fr: 'Agence de voyage à Oran : omra 2026, formules complètes',
          ar: 'وكالة سفر في وهران: العمرة 2026، فورمولات كاملة',
        },
      },
      {
        label: { fr: 'Séjour à Djanet', ar: 'إقامة في جانت' },
        text: {
          fr: 'Séjour de 5 jours à Djanet, transport et guide inclus',
          ar: 'إقامة 5 أيام في جانت، النقل والمرشد داخلين',
        },
      },
    ],
  },
];

/* ==========================================================================
   MÉMOIRE (localStorage) — pondérations, jamais de texte stocké
   ========================================================================== */

export interface TasteSnapshot {
  /** Domaine → poids cumulé (générations passées). */
  scores: Record<string, number>;
  /** Domaine → nombre de fois où l'utilisateur a cliqué une suggestion du domaine. */
  picks: Record<string, number>;
  updatedAt: string | null;
}

const STORAGE_KEY = 'sawtify_taste_v1';
const EMPTY: TasteSnapshot = { scores: {}, picks: {}, updatedAt: null };

/** Poids à partir duquel on considère qu'un domaine est « connu ». */
const MEMORY_THRESHOLD = 4;
/** Nombre de domaines gardés en mémoire (les autres sont oubliés). */
const MAX_TRACKED = 6;

export function loadTaste(): TasteSnapshot {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as TasteSnapshot;
    if (!parsed || typeof parsed !== 'object') return { ...EMPTY };
    return {
      scores: parsed.scores && typeof parsed.scores === 'object' ? parsed.scores : {},
      picks: parsed.picks && typeof parsed.picks === 'object' ? parsed.picks : {},
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
    };
  } catch {
    return { ...EMPTY };
  }
}

export function persistTaste(snapshot: TasteSnapshot): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)); } catch { /* stockage plein ou désactivé */ }
}

/** Efface tout : le studio redevient vierge, sans mémoire. */
export function forgetTaste(): TasteSnapshot {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  return { ...EMPTY };
}

function prune(scores: Record<string, number>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(scores).sort((a, b) => b[1] - a[1]).slice(0, MAX_TRACKED),
  );
}

/** Analyse d'un texte : quels domaines sont présents, et avec quelle force. */
export function scanText(text: string): { id: string; points: number }[] {
  const clean = (text || '').slice(0, 4000);
  if (!clean.trim()) return [];
  const found: { id: string; points: number }[] = [];
  for (const niche of NICHES) {
    let points = 0;
    if (niche.signature.test(clean)) points += 4;
    if (niche.strong.test(clean)) points += 2;
    const weakHits = clean.match(new RegExp(niche.weak.source, 'gi'));
    if (weakHits) points += Math.min(2, weakHits.length);
    if (points > 0) found.push({ id: niche.id, points });
  }
  return found.sort((a, b) => b.points - a.points);
}

/** Le studio apprend d'un texte réel (génération faite, script demandé…). */
export function learnFromText(snapshot: TasteSnapshot, text: string, weight = 1): TasteSnapshot {
  const hits = scanText(text);
  if (!hits.length) return snapshot;
  const scores = { ...snapshot.scores };
  for (const hit of hits) scores[hit.id] = (scores[hit.id] || 0) + hit.points * weight;
  return { scores: prune(scores), picks: snapshot.picks, updatedAt: new Date().toISOString() };
}

/** Signal fort : l'utilisateur a cliqué une suggestion de ce domaine. */
export function rememberPick(snapshot: TasteSnapshot, nicheId: string, weight = 3): TasteSnapshot {
  return {
    scores: prune({ ...snapshot.scores, [nicheId]: (snapshot.scores[nicheId] || 0) + weight }),
    picks: { ...snapshot.picks, [nicheId]: (snapshot.picks[nicheId] || 0) + 1 },
    updatedAt: new Date().toISOString(),
  };
}

export interface NicheMatch {
  niche: Niche;
  /** 'live' = déduit du texte en cours d'écriture, 'memory' = appris des textes passés. */
  source: 'live' | 'memory';
}

/**
 * Le domaine à afficher MAINTENANT :
 *   1. le texte en cours d'écriture (signal immédiat, le plus fort) ;
 *   2. sinon la mémoire des textes déjà générés.
 */
export function bestNiche(snapshot: TasteSnapshot, liveText = ''): NicheMatch | null {
  const live = scanText(liveText);
  if (live.length && live[0].points >= 4) {
    const niche = NICHES.find((n) => n.id === live[0].id);
    if (niche) return { niche, source: 'live' };
  }
  const best = Object.entries(snapshot.scores).sort((a, b) => b[1] - a[1])[0];
  if (!best || best[1] < MEMORY_THRESHOLD) return null;
  const niche = NICHES.find((n) => n.id === best[0]);
  return niche ? { niche, source: 'memory' } : null;
}

/* ==========================================================================
   SUGGESTIONS
   ========================================================================== */

export interface Suggestion {
  /** Identifiant du domaine (absent pour les exemples génériques). */
  nicheId?: string;
  icon: NicheIcon | 'radio' | 'message' | 'shop' | 'podcast';
  label: string;
  starter: string;
}

/** Exemples par défaut, quand on ne sait encore rien de l'utilisateur. */
export function genericSuggestions(mode: ComposerMode, lang: LanguageCode): Suggestion[] {
  if (mode === 'voice') {
    return lang === 'ar'
      ? [
          { icon: 'radio', label: 'إذاعة راديو 15 ثانية', starter: 'جديد! هذ السيمانة غير، استفد من -30% على كامل المتجر... [excited] زربوا!' },
          { icon: 'message', label: 'رسالة واتساب احترافية', starter: 'سلام، شكرا على رسالتك. [calm] فريقنا غادي يرد عليك في أقرب وقت.' },
          { icon: 'shop', label: 'تعليق صوتي للمتجر', starter: 'اكتشف مجموعتنا الجديدة... [natural] توصيل مجاني لكامل الجزائر!' },
          { icon: 'podcast', label: 'مقدمة بودكاست بالدارجة', starter: 'أهلا بكم في البودكاست تاعنا... [natural] اليوم نحكيلكم على قصة تعلم منها.' },
        ]
      : [
          { icon: 'radio', label: 'Pub radio de 15 secondes', starter: 'Nouveauté ! Cette semaine seulement, profitez de -30% sur toute la boutique... [excited] Foncez !' },
          { icon: 'message', label: 'Message WhatsApp pro', starter: 'Bonjour, merci pour votre message. [calm] Notre équipe vous répondra dans les plus brefs délais.' },
          { icon: 'shop', label: 'Voix off e-commerce', starter: 'Découvrez notre nouvelle collection... [natural] Livraison gratuite partout en Algérie !' },
          { icon: 'podcast', label: 'Intro podcast en darija', starter: 'أهلا بكم في البودكاست تاعنا... [natural] اليوم نحكيلكم على قصة تعلم منها.' },
        ];
  }
  return lang === 'ar'
    ? [
        { icon: 'shop', label: 'متجر إلكتروني — تخفيضات -30%', starter: 'متجر ملابس إلكتروني، تخفيضات -30% هذ السيمانة، توصيل لكامل الجزائر' },
        { icon: 'food', label: 'مطعم — افتتاح جديد', starter: 'مطعم جديد في الجزائر العاصمة، مطبخ تقليدي، أجواء عائلية' },
        { icon: 'home', label: 'عقار — شقة للبيع', starter: 'شقة F3 للبيع في وهران، حي هادئ قريب من كل الخدمات' },
        { icon: 'sparkles', label: 'حدث — سهرة نهاية الأسبوع', starter: 'سهرة فنية هذا السبت في قسنطينة، موسيقى مباشرة وأنشطة' },
      ]
    : [
        { icon: 'shop', label: 'Boutique en ligne — promo -30%', starter: 'Boutique de vêtements en ligne, promo -30% cette semaine, livraison partout en Algérie' },
        { icon: 'food', label: 'Restaurant — nouvelle ouverture', starter: 'Nouveau restaurant à Alger qui vient d’ouvrir, cuisine traditionnelle, ambiance familiale' },
        { icon: 'home', label: 'Immobilier — appartement à vendre', starter: 'Appartement F3 à vendre à Oran, quartier calme, proche de tous les services' },
        { icon: 'sparkles', label: 'Événement — soirée du week-end', starter: 'Soirée événementielle ce samedi à Constantine, musique live et animations' },
      ];
}

/** Exemples du domaine détecté, dans la langue courante. */
export function nicheSuggestions(niche: Niche, mode: ComposerMode, lang: LanguageCode): Suggestion[] {
  const starters = mode === 'voice' ? niche.voice : niche.script;
  return starters.map((starter) => ({
    nicheId: niche.id,
    icon: niche.icon,
    label: starter.label[lang],
    starter: starter.text[lang],
  }));
}

/**
 * La rangée finale : d'abord les exemples du domaine de l'utilisateur,
 * puis — seulement s'il reste de la place — les exemples génériques.
 */
export function buildSuggestions(
  match: NicheMatch | null,
  mode: ComposerMode,
  lang: LanguageCode,
  total = 4,
): { suggestions: Suggestion[]; personalized: boolean } {
  const generic = genericSuggestions(mode, lang);
  if (!match) return { suggestions: generic.slice(0, total), personalized: false };
  const own = nicheSuggestions(match.niche, mode, lang);
  const keepGeneric = Math.max(1, total - own.length);
  return {
    suggestions: [...own, ...generic.slice(0, keepGeneric)].slice(0, total),
    personalized: own.length > 0,
  };
}

export function nicheName(niche: Niche, lang: LanguageCode): string {
  return niche.name[lang];
}
