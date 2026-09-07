// ==========================================================================
// SAWTIFY — DARIJA KNOWLEDGE (LAHDJA + SECTEURS)
// src/data/darija_knowledge.ts
// ==========================================================================

export interface RegionInfo {
  id: string;
  nameAr: string;
  nameFr: string;
  fillers: string[];
  sampleHooks: string[];
  cta: string[];
  notes: string;
}

export const DARIJA_REGIONS: Record<string, RegionInfo> = {
  general: {
    id: "general",
    nameAr: "عام (Nationale)",
    nameFr: "Général",
    fillers: ["بصح", "يعني", "درْك", "خاوتي", "اليوم"],
    sampleHooks: [
      "راك حاب تكبر بروجيك؟",
      "عندك مشكل مع les ventes؟",
      "لوكان نقولك على حل بسيط..."
    ],
    cta: ["تواصل معانا sur WhatsApp", "كليكي على le lien في bio", "اطلب دوكا"],
    notes: "Darija algérienne standard, claire et fluide, comprise dans toutes les wilayas."
  },

  centre: {
    id: "centre",
    nameAr: "الوسط (Alger / Centre)",
    nameFr: "Centre (Alger)",
    fillers: ["نورمالمو", "على جال", "واش راك", "خلاص", "صحا خو", "غير كيما", "دوكا", "خو"],
    sampleHooks: [
      "واش راك خو، عيان من التسويق الكلاسيك؟",
      "نورمالمو راك تخسر في l'argent بلا نتيجة...",
      "على جال الناس لي حابة تClosé des leads..."
    ],
    cta: ["ابعث message sur WhatsApp", "دخل للسيت دوكا", "DM ديريكت"],
    notes: "Darija algéroise urbaine et dynamique. Utilise خو, دوكا, et le franglais naturel (leads, closing, marketing, livraison, client)."
  },

  ouest: {
    id: "ouest",
    nameAr: "الغرب (Oran / Ouest)",
    nameFr: "Ouest (Oran)",
    fillers: ["غاية", "شوالا", "غادي", "دروك", "بصح", "معنتها", "باغي", "شحال"],
    sampleHooks: [
      "بصح راك باغي تزيد في le chiffre d'affaires؟",
      "معنتها المشكل ماهوش في السلعة، المشكل في le marketing...",
      "شحال من واحد يضيع فلوسه على بيبليسيتي خاوية..."
    ],
    cta: ["اتصل بينا دروك", "كليكي لتحت وسجل رقمك", "تواصل معانا دروك"],
    notes: "Darija de l'Ouest algérien (Oran, Mostaganem, Tlemcen). Utilise غادي, شوالا, دروك, غاية, باغي, معنتها."
  },

  est: {
    id: "est",
    nameAr: "الشرق (Constantine / Est)",
    nameFr: "Est (Constantine)",
    fillers: ["ياخي", "علابالك", "نتوما", "قداه", "هكا", "ملا", "ياسر"],
    sampleHooks: [
      "ياخي راك حاب تحل مشكل les clients؟",
      "علابالك بلي التسويق تبدّل كامل...",
      "نتوما لي عندكم service و ما عندكمش leads..."
    ],
    cta: ["تكلم معانا درك", "أرسل message sur WhatsApp", "سجل نفسك في la liste"],
    notes: "Darija de l'Est algérien (Constantine, Annaba, Sétif). Utilise ياخي, علابالك, قداه, ملا, ياسر, نتوما."
  }
};

export type RegionId = keyof typeof DARIJA_REGIONS;

// ==========================================================================
// SECTEURS (Knowledge métier Algérie)
// ==========================================================================

export const DARIJA_SECTORS: Record<
  string,
  { name: string; vocab: string[]; cta: string }
> = {
  ecommerce: {
    name: "E-commerce & Vente Produit",
    vocab: [
      "livraison متوفرة",
      "livraison في 58 ولاية",
      "الدفع à la livraison",
      "qualité TOP",
      "سومة هابلة",
      "stock محدود",
      "promotion ما تتراطاش",
      "pack"
    ],
    cta: "اطلب المنتج درك قبل ما يخلص le stock!"
  },
  b2b_services: {
    name: "Services & B2B / Agences",
    vocab: [
      "chiffre d'affaires",
      "closer des leads",
      "service client",
      "rendez-vous مضمون",
      "خدمة احترافية",
      "équipe متخصصة",
      "réservation",
      "pack pro"
    ],
    cta: "تواصل معانا sur WhatsApp ولا احجز rendez-vous درك!"
  },
  beaute_cosmetique: {
    name: "Beauté & Cosmétique",
    vocab: [
      "sérum",
      "peau",
      "شعر",
      "كريم",
      "produit naturel",
      "نتيجة مضمونة",
      "éclat",
      "routine"
    ],
    cta: "اطلبي درك واستفادي من la promotion!"
  },
  formation_coaching: {
    name: "Formations & Coaching",
    vocab: [
      "formation pratique",
      "masterclass",
      "certificat",
      "coaching",
      "places محدودة",
      "compétences",
      "تتعلم من الصفر"
    ],
    cta: "سجل نفسك في la liste قبل ما يغلقوا les places!"
  },
  immobilier: {
    name: "Immobilier & Logement",
    vocab: [
      "appartement",
      "دار",
      "F3",
      "F4",
      "acte notarié",
      "promotion immobilière",
      "بلاصة ما تتنسايمش",
      "vue magnifique"
    ],
    cta: "اتصل بينا باش تدير la visite ديالك!"
  },
  tech_apps: {
    name: "Tech, SaaS & Applications",
    vocab: [
      "application",
      "site web",
      "plateforme",
      "facile à utiliser",
      "gain de temps",
      "digital",
      "abonnement"
    ],
    cta: "جرب la plateforme مجانا ولا télécharge l'application!"
  },
  general: {
    name: "Général",
    vocab: ["qualité", "service", "promotion", "livraison", "prix raisonnable"],
    cta: "تواصل معانا درك واستفاد من العرض!"
  }
};

/** Détection auto du secteur selon le texte produit */
export function detectSector(text: string): keyof typeof DARIJA_SECTORS {
  const t = (text || "").toLowerCase();
  if (/كريم|sérum|peau|شعر|maquillage|beauté|جمال|بشرة|cosmetic/.test(t)) return "beaute_cosmetique";
  if (/formation|cours|دورة|تدريب|coaching|تعلم|masterclass|ت direkt/.test(t)) return "formation_coaching";
  if (/appartement|شقة|دار|f3|f4|immobilier|عقار|villa|logement/.test(t)) return "immobilier";
  if (/app|application|site|saas|plateforme|تطبيق|موقع|logiciel/.test(t)) return "tech_apps";
  if (/marketing|lead|b2b|agence|service|خدمة|شركات|clients|chiffre|closing/.test(t)) return "b2b_services";
  if (/produit|منتج|شراء|بيع|ساعة|حذاء|chaussure|sac|vêtement|boutique/.test(t)) return "ecommerce";
  return "general";
}

export function getRegion(regionId?: string): RegionInfo {
  const id = (regionId || "general").toLowerCase();
  return DARIJA_REGIONS[id] || DARIJA_REGIONS.general;
}
