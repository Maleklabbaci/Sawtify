import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'fr' | 'ar';

export interface Translations {
  // Navigation & Header
  appTitle: string;
  appSubtitle: string;
  studioTab: string;
  historyTab: string;
  pricingTab: string;
  pointsLabel: string;
  rechargeBtn: string;
  switchLangLabel: string;

  // Active Voice & Parameters
  activeVoiceHeader: string;
  voiceGenderFemale: string;
  voiceGenderMale: string;
  listenPreviewTooltip: string;
  speedLabel: string;
  speedSlow: string;
  speedNormal: string;
  speedFast: string;
  pitchLabel: string;
  pitchDeep: string;
  pitchNatural: string;
  pitchHigh: string;
  resetTooltip: string;

  // Voice Catalog
  catalogHeader: string;
  allGenders: string;
  maleGenders: string;
  femaleGenders: string;
  categoryAll: string;
  categoryCommercial: string;
  categoryNarrative: string;
  categorySocial: string;
  categoryFormal: string;

  // Script Studio
  emotionLabel: string;
  scriptTemplatesBtn: string;
  scriptPlaceholder: string;
  copyScriptTooltip: string;
  charsCount: string;
  costLabel: string;
  generateBtn: string;
  generatingBtn: string;

  // Audio Player & Downloads
  audioPlayerHeader: string;
  latencyLabel: string;
  audioQuality: string;
  convertingStatus: string;
  compressionLabel: string;
  downloadMp3: string;
  downloadWav: string;

  // Insufficient balance modal/alert
  insufficientTitle: string;
  insufficientDesc: string;
  rechargeNowBtn: string;

  // History Page
  historyHeader: string;
  historySubtitle: string;
  searchPlaceholder: string;
  filterAllVoices: string;
  emptyHistoryTitle: string;
  emptyHistorySubtitle: string;
  openStudioBtn: string;
  durationLabel: string;
  dateLabel: string;
  voiceLabel: string;
  deleteTooltip: string;

  // Recharge Modal
  rechargeModalTitle: string;
  rechargeModalSubtitle: string;
  choosePackStep: string;
  approxGenerations: string;
  paymentMethodStep: string;
  edahabiaTitle: string;
  cibTitle: string;
  cardNumLabel: string;
  expiryLabel: string;
  cvvLabel: string;
  cardHolderLabel: string;
  securityNotice: string;
  payBtn: string;
  processingBtn: string;
  cancelBtn: string;

  // Footer & Notifications
  footerTagline: string;
  footerSpecs: string;
  toastDeducted: string;
  toastRecharged: string;
}

export const translations: Record<Language, Translations> = {
  fr: {
    appTitle: 'Sawtify',
    appSubtitle: 'Studio TTS Algérien',
    studioTab: 'Studio Vocal',
    historyTab: 'Historique',
    pricingTab: 'Points & Tarifs',
    pointsLabel: 'points',
    rechargeBtn: 'Recharger',
    switchLangLabel: 'العربية',

    activeVoiceHeader: 'Voix Active & Paramètres',
    voiceGenderFemale: 'Voix Féminine',
    voiceGenderMale: 'Voix Masculine',
    listenPreviewTooltip: 'Écouter un extrait vocal',
    speedLabel: 'Vitesse de diction',
    speedSlow: '0.7x (Posé)',
    speedNormal: '1.0x (Standard)',
    speedFast: '1.5x (Rapide)',
    pitchLabel: 'Hauteur tonale (Pitch)',
    pitchDeep: '0.8 (Grave)',
    pitchNatural: '1.0 (Naturel)',
    pitchHigh: '1.3 (Aigu)',
    resetTooltip: 'Réinitialiser',

    catalogHeader: 'Catalogue des Voix',
    allGenders: 'Tous',
    maleGenders: 'Hommes',
    femaleGenders: 'Femmes',
    categoryAll: 'Tous les styles',
    categoryCommercial: 'Publicité & Vente',
    categoryNarrative: 'Narration & Podcast',
    categorySocial: 'Shorts & Réseaux',
    categoryFormal: 'Officiel & Documentaire',

    emotionLabel: 'Émotions :',
    scriptTemplatesBtn: 'Modèles de script',
    scriptPlaceholder: 'Rédigez ou collez votre script en دارجة جزائرية ou arabe ici...',
    copyScriptTooltip: 'Copier le script',
    charsCount: 'caractères',
    costLabel: 'Coût',
    generateBtn: 'Générer la voix (20 pts)',
    generatingBtn: 'Synthèse vocale en cours...',

    audioPlayerHeader: 'Master Audio 24 kHz',
    latencyLabel: 'Latence',
    audioQuality: '24 kHz Studio Master',
    convertingStatus: 'Conversion .wav vers .mp3 en cours...',
    compressionLabel: 'compression web',
    downloadMp3: 'Télécharger MP3 (Allégé)',
    downloadWav: 'Télécharger WAV (Studio)',

    insufficientTitle: 'Solde insuffisant',
    insufficientDesc: 'Votre solde est de {balance} points. Il vous faut 20 points pour générer un enregistrement vocal.',
    rechargeNowBtn: 'Recharger mon solde',

    historyHeader: 'Historique des Générations',
    historySubtitle: 'Retrouvez et téléchargez tous vos enregistrements générés.',
    searchPlaceholder: 'Rechercher dans les scripts générés...',
    filterAllVoices: 'Toutes les voix',
    emptyHistoryTitle: 'Aucune génération pour le moment',
    emptyHistorySubtitle: 'Créez votre première voix IA en دارجة جزائرية dans le Studio.',
    openStudioBtn: 'Ouvrir le Studio',
    durationLabel: 'Durée',
    dateLabel: 'Date',
    voiceLabel: 'Voix',
    deleteTooltip: 'Supprimer',

    rechargeModalTitle: 'Recharger vos crédits',
    rechargeModalSubtitle: 'Paiement 100% sécurisé en Algérie via carte Edahabia ou CIB.',
    choosePackStep: '1. Choisissez le montant de points',
    approxGenerations: 'soit ~{count} générations',
    paymentMethodStep: '2. Moyen de paiement',
    edahabiaTitle: 'Carte Edahabia (Poste Algérie)',
    cibTitle: 'Carte Bancaire CIB (Toutes banques)',
    cardNumLabel: 'Numéro de carte (16 chiffres)',
    expiryLabel: "Date d'expiration",
    cvvLabel: 'Code CVV / CVC (3 chiffres)',
    cardHolderLabel: 'Nom du porteur de carte',
    securityNotice: 'Transactions chiffrées SSL 256-bit conformes SATIM & GIE Monétique.',
    payBtn: 'Payer {amount} DZD et créditer {points} pts',
    processingBtn: 'Validation bancaire en cours...',
    cancelBtn: 'Annuler',

    footerTagline: 'Sawtify • Studio Text-to-Speech Algérien',
    footerSpecs: 'Paiements CIB & Edahabia • Traitement IA basse-latence',
    toastDeducted: '20 pts déduits • Reste : {balance} pts',
    toastRecharged: '+{points} points crédités ({method})'
  },
  ar: {
    appTitle: 'صوتيفي',
    appSubtitle: 'منصة الذكاء الاصطناعي الصوتي بالدارجة الجزائرية',
    studioTab: 'ستوديو الصوت',
    historyTab: 'سجل التوليد',
    pricingTab: 'شحن النقاط',
    pointsLabel: 'نقطة',
    rechargeBtn: 'شحن الرصيد',
    switchLangLabel: 'Français',

    activeVoiceHeader: 'الصوت المختار والإعدادات',
    voiceGenderFemale: 'صوت نسائي',
    voiceGenderMale: 'صوت رجالي',
    listenPreviewTooltip: 'استماع لنموذج الصوت',
    speedLabel: 'سرعة النطق',
    speedSlow: '0.7x (هادئ)',
    speedNormal: '1.0x (طبيعي)',
    speedFast: '1.5x (سريع)',
    pitchLabel: 'طبقة النبرة (Pitch)',
    pitchDeep: '0.8 (رخيم)',
    pitchNatural: '1.0 (طبيعي)',
    pitchHigh: '1.3 (حاد)',
    resetTooltip: 'إعادة ضبط',

    catalogHeader: 'دليل الأصوات المتاحة',
    allGenders: 'الكل',
    maleGenders: 'رجال',
    femaleGenders: 'نساء',
    categoryAll: 'جميع الأنماط',
    categoryCommercial: 'إعلانات وتجارة',
    categoryNarrative: 'سرد وبودكاست',
    categorySocial: 'ريلز وتيك توك',
    categoryFormal: 'رسمي ووثائقي',

    emotionLabel: 'المؤثرات الصوتية :',
    scriptTemplatesBtn: 'نماذج نصوص جاهزة',
    scriptPlaceholder: 'اكتب أو الصق نصك بالدارجة الجزائرية أو العربية هنا...',
    copyScriptTooltip: 'نسخ النص',
    charsCount: 'حرف',
    costLabel: 'التكلفة',
    generateBtn: 'توليد الصوت (20 نقطة)',
    generatingBtn: 'جاري توليد الصوت الذكي...',

    audioPlayerHeader: 'التسجيل الصوتي النهائي (24 kHz)',
    latencyLabel: 'زمن الاستجابة',
    audioQuality: '24 kHz جودة استوديو',
    convertingStatus: 'جاري التحويل وضغط ملف MP3...',
    compressionLabel: 'ضغط للويب',
    downloadMp3: 'تحميل MP3 (خفيف وسريع)',
    downloadWav: 'تحميل WAV (استوديو خام)',

    insufficientTitle: 'رصيد النقاط غير كافٍ',
    insufficientDesc: 'رصيدك الحالي هو {balance} نقطة. تحتاج إلى 20 نقطة لتوليد تسجيل صوتي جديد.',
    rechargeNowBtn: 'شحن الرصيد الآن',

    historyHeader: 'سجل التوليد الصوتي',
    historySubtitle: 'استمع وحمّل جميع التسجيلات الصوتية التي قمت بتوليدها سابقاً.',
    searchPlaceholder: 'ابحث في النصوص والتسجيلات السابقة...',
    filterAllVoices: 'جميع الأصوات',
    emptyHistoryTitle: 'لم تقم بأي توليد صوتي بعد',
    emptyHistorySubtitle: 'ابدأ الآن بتحويل أول نص بالدارجة الجزائرية إلى صوت واقعي في الاستوديو.',
    openStudioBtn: 'الانتقال إلى الاستوديو',
    durationLabel: 'المدة',
    dateLabel: 'التاريخ',
    voiceLabel: 'الصوت',
    deleteTooltip: 'حذف',

    rechargeModalTitle: 'شحن رصيد النقاط',
    rechargeModalSubtitle: 'دفع محلي آمن 100% في الجزائر عبر البطاقة الذهبية أو بطاقة CIB.',
    choosePackStep: '1. اختر عدد النقاط المراد شحنها',
    approxGenerations: 'ما يعادل ~{count} تسجيل صوتي',
    paymentMethodStep: '2. وسيلة الدفع',
    edahabiaTitle: 'البطاقة الذهبية (بريد الجزائر)',
    cibTitle: 'بطاقة CIB البنكية (جميع البنوك)',
    cardNumLabel: 'رقم البطاقة (16 رقماً)',
    expiryLabel: 'تاريخ نهاية الصلاحية',
    cvvLabel: 'رمز الأمان CVV (3 أرقام)',
    cardHolderLabel: 'اسم صاحب البطاقة الكامل',
    securityNotice: 'معاملات بنكية مشفرة 256-bit مطابقة لمعايير SATIM و GIE Monétique.',
    payBtn: 'دفع {amount} دج وشحن {points} نقطة',
    processingBtn: 'جاري التحقق البنكي...',
    cancelBtn: 'إلغاء',

    footerTagline: 'صوتيفي • منصة تحويل النص إلى صوت بشري بالدارجة الجزائرية',
    footerSpecs: 'دفع إلكتروني عبر الذهبية و CIB • ذكاء اصطناعي فائق السرعة',
    toastDeducted: 'تم خصم 20 نقطة • الرصيد المتبقي : {balance} نقطة',
    toastRecharged: 'تمت إضافة +{points} نقطة بنجاح ({method})'
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: Translations;
  isRTL: boolean;
  isTransitioning: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('sawtify_lang');
      return (saved === 'ar' || saved === 'fr') ? saved : 'fr';
    } catch {
      return 'fr';
    }
  });
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  const setLanguage = (lang: Language) => {
    if (lang === language) return;
    setIsTransitioning(true);
    
    // Quick micro-fade out before layout flips
    setTimeout(() => {
      setLanguageState(lang);
      try {
        localStorage.setItem('sawtify_lang', lang);
      } catch {}
      
      const newIsRTL = lang === 'ar';
      document.documentElement.dir = newIsRTL ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;

      setTimeout(() => {
        setIsTransitioning(false);
      }, 100);
    }, 80);
  };

  const toggleLanguage = () => {
    setLanguage(language === 'fr' ? 'ar' : 'fr');
  };

  const isRTL = language === 'ar';

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language, isRTL]);

  const value = {
    language,
    setLanguage,
    toggleLanguage,
    t: translations[language],
    isRTL,
    isTransitioning
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
