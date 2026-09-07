// Section DARIJA_REGIONS mise à jour pour Alger (Centre)

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
    fillers: ["غاية", "شوالا", "غادي", "دروك", "بصح", "معنتها"],
    sampleHooks: [
      "بصح راك باغي تزيد في le chiffre d'affaires؟",
      "معنتها المشكل ماهوش في السلعة، المشكل في le marketing...",
      "شحال من واحد يضيع فلوسه على بيبليسيتي خاوية..."
    ],
    cta: ["اتصل بينا دروك", "كليكي لتحت وسجل رقمك", "تواصل معانا دروك"],
    notes: "Darija de l'Ouest algérien (Oran, Mostaganem, Tlemcen). Utilise des expressions comme غادي, شوالا, دروك, غاية, باغي."
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
    notes: "Darija de l'Est algérien (Constantine, Annaba, Sétif). Utilise des mots comme ياخي, علابالك, قداه, ملا, ياسر."
  }
};
