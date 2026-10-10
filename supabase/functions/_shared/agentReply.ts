type AgentSector = 'commerce' | 'health' | 'services' | 'restaurant' | 'hospitality';
type AgentReplyProduct = {
  id: string; name: string; category: string; description: string;
  priceDzd: number; stock: number; sizes: string[]; active: boolean;
};
type AgentReplyFaq = { id: string; question: string; answer: string; active: boolean };
type AgentReplyStore = {
  products: AgentReplyProduct[];
  faqs: AgentReplyFaq[];
  sector?: AgentSector;
  name?: string;
  category?: string;
  location?: string;
};

const normalize = (value: string) => value.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’']/g, ' ');
const formatMoney = (amount: number, arabic: boolean) => `${new Intl.NumberFormat(arabic ? 'ar-DZ' : 'fr-DZ', { maximumFractionDigits: 0 }).format(amount)} ${arabic ? 'دج' : 'DA'}`;

const DISALLOWED_INTENT = /\b(arme|armes|pistolet|fusil|explosif|bombe|poison|drogue|cocaine|heroine|meth|fraude|arnaque|faux papiers|falsifier|pirater|piratage|ransomware|voler un compte|intimidation|harceler|haine|suicide|automutilation|pot.?de.?vin|corrompre|sans licence|sans autorisation|contourner la loi|non conforme|illegal|unlicensed|bribery|discrimination|kill someone|make a bomb|weapon|explosive|poison|drug dealing|scam|phishing|steal an account)\b|سلاح|قنبلة|متفجرات|سم|مخدرات|كوكايين|هيروين|سرقة|نحتال|احتيال|تزوير|تهريب|قرصنة|نخترق|رشوة|بلا رخصة|بلا تصريح|انتحار|نأذي روحي|نقتل/i;
const MEDICAL_ADVICE_INTENT = /diagnostic|diagnostiquer|sympt[oô]me|traitement|prescription|ordonnance|m[eé]dicament|posologie|dosage|dose|gu[eé]rir|maladie|douleur|fi[eè]vre|vomissement|naus[eé]e|toux|diarrh[eé]e|allergie|rash|saignement|ت[شس]خيص|أعراض|اعراض|علاج|دواء|وصفة|جرعة|مرض|نشفى|يوجع|حمى|سعال|قيء|غثيان|حساسية|طفح|نزيف/i;
const MEDICAL_EMERGENCY_INTENT = /urgence|urgent|douleur (?:dans la )?poitrine|difficult[eé] de respirer|ne respire plus|perte de connaissance|saignement important|chest pain|can't breathe|cannot breathe|unconscious|heavy bleeding|استعجال|ما نقدرش نتنفس|صعوبة التنفس|ألم في الصدر|وجع الصدر|فاقد الوعي|نزيف قوي/i;

const refusal = (arabic: boolean) => arabic
  ? 'ما نقدرش نعاون في طلب غير قانوني أو خطير أو مخالف للأخلاق. نقدر نساعدك غير بمعلومات وخدمات آمنة وقانونية.'
  : 'Je ne peux pas aider pour une demande illégale, dangereuse ou contraire à l’éthique. Je peux uniquement vous orienter vers les informations et services autorisés.';

const medicalBoundary = (arabic: boolean) => arabic
  ? 'نقدر نعاونك غير بالمعلومات العملية وحجز موعد. ما نقدرش نشخّص ولا نوصف دواء؛ تواصل مع مهني صحي مؤهّل.'
  : 'Je peux vous aider pour les informations pratiques et la prise de rendez-vous, mais pas poser un diagnostic ni prescrire un traitement. Adressez-vous à un professionnel de santé.';

const emergencyGuidance = (arabic: boolean) => arabic
  ? 'إذا كانت الحالة مستعجلة أو فيها خطر مباشر، اتصل بخدمات الاستعجال المحلية أو توجّه لأقرب مصلحة استعجالات الآن. هذا المساعد ما يقدرش يقيّم الحالة.'
  : 'Si la situation est urgente ou présente un danger immédiat, contactez les services d’urgence locaux ou rendez-vous aux urgences maintenant. Cet assistant ne peut pas évaluer votre état.';

export function isDisallowedAgentIntent(text: string): boolean {
  return DISALLOWED_INTENT.test(normalize(text));
}

export function containsHealthClinicalContent(text: string): boolean {
  const normalized = normalize(text);
  return MEDICAL_EMERGENCY_INTENT.test(normalized) || MEDICAL_ADVICE_INTENT.test(normalized);
}

const sectorLabel = (sector: AgentSector | undefined, arabic: boolean) => {
  if (sector === 'health') return arabic ? 'المركز الصحي' : 'le centre de santé';
  if (sector === 'services') return arabic ? 'الخدمة' : 'la prestation';
  if (sector === 'restaurant') return arabic ? 'المطعم' : 'le restaurant';
  if (sector === 'hospitality') return arabic ? 'الفندق' : 'l’établissement';
  return arabic ? 'المتجر' : 'la boutique';
};

/** Rule-based, server-metered reply logic shared by the customer page and local demo. */
export function answerAgentQuestion(
  store: AgentReplyStore,
  question: string,
  language: 'fr' | 'ar',
): string {
  const isArabic = language === 'ar';
  const sector = store.sector || 'commerce';
  const products = store.products.filter((product) => product.active && !isDisallowedAgentIntent(`${product.name} ${product.category} ${product.description}`));
  const faqs = store.faqs.filter((faq) => faq.active);
  const normalized = normalize(question);
  const product = products.find((item) => normalize(item.name).split(' ').some((word) => word.length > 3 && normalized.includes(word)));
  const asksPrice = /prix|combien|cout|coute|tarif|price|بشحال|قداش|السعر/.test(normalized);
  const asksDelivery = /livr|livraison|wilaya|wila|وصل|توصيل|توص|ولاية/.test(normalized);
  const asksSize = /taille|pointure|point|size|مقاس|قياس/.test(normalized);
  const asksStock = /stock|dispon|reste|restant|متوفر|كاين|موجود/.test(normalized);
  const asksAppointment = /rendez.?vous|consultation|prendre.*(?:rdv|rendez)|appointment|book.*visit|موعد|نحجز|حجز.*موعد/.test(normalized);
  const asksQuote = /devis|estimation|tarif|prix|quote|estimate|عرض سعر|تقدير السعر/.test(normalized);
  const asksReservation = /reserv|table|chambre|nuit|room service|reservation|booking|حجز|طاولة|غرفة|ليلة|خدمة الغرف/.test(normalized);

  // Refuse dangerous or unlawful requests before consulting business FAQs.
  if (isDisallowedAgentIntent(normalized)) return refusal(isArabic);

  if (sector === 'health' && MEDICAL_EMERGENCY_INTENT.test(normalized)) return emergencyGuidance(isArabic);
  if (sector === 'health' && MEDICAL_ADVICE_INTENT.test(normalized)) return medicalBoundary(isArabic);

  const matchingFaq = faqs.find((item) => normalize(item.question).split(' ').filter((word) => word.length > 4).some((word) => normalized.includes(word)));
  if (matchingFaq) {
    if (isDisallowedAgentIntent(matchingFaq.answer)) return refusal(isArabic);
    if (sector === 'health' && MEDICAL_ADVICE_INTENT.test(normalize(matchingFaq.answer))) return medicalBoundary(isArabic);
    return matchingFaq.answer;
  }

  // Sector-specific guardrails for voice and typed fallback. Actual submissions
  // go through the server-validated Edge Function; transcripts are not persisted.
  if (sector === 'health') {
    if (asksAppointment) return isArabic
      ? 'نقدر نعاونك تطلب موعد. قولّي الخدمة والوقت اللي يناسبك، وما تبعثش أعراض ولا معلومات طبية.'
      : 'Je peux prendre votre demande de rendez-vous. Dites-moi le service et le créneau souhaités, sans communiquer de symptômes ni d’informations médicales.';
    return isArabic
      ? `مرحبا بيك عند ${store.name || 'المركز الصحي'}. نقدر نجاوب على المعلومات العملية ونعاونك في حجز موعد فقط.`
      : `Bienvenue chez ${store.name || 'le centre de santé'}. Je peux renseigner sur les informations pratiques et vous aider à demander un rendez-vous.`;
  }

  if (sector === 'services') {
    if (asksQuote) return isArabic
      ? 'باش تطلب عرض سعر، قولّي الخدمة المطلوبة والوقت المناسب ومعلومات الاتصال.'
      : 'Pour un devis, indiquez-moi la prestation souhaitée, vos disponibilités et vos coordonnées.';
    if (asksAppointment) return isArabic
      ? 'قولّي الخدمة والوقت اللي يناسبك، ومقدم الخدمة يرجعلك باش يأكد الموعد.'
      : 'Dites-moi la prestation et le créneau souhaités ; le professionnel vous recontactera pour confirmer le rendez-vous.';
    if (product && asksPrice) return isArabic
      ? `${product.name}: ${formatMoney(product.priceDzd, true)}. تقدر تبعث طلب عرض سعر باش يتأكد السعر النهائي.`
      : `${product.name} : ${formatMoney(product.priceDzd, false)}. Vous pouvez demander un devis pour confirmer le prix final.`;
    return isArabic
      ? `نقدر نعرّفك بخدمات ${store.name || 'مقدم الخدمة'} ونعاونك تطلب عرض سعر ولا موعد.`
      : `Je peux vous présenter les prestations de ${store.name || 'ce professionnel'} et vous aider à demander un devis ou un rendez-vous.`;
  }

  if (sector === 'restaurant') {
    if (asksReservation) return isArabic
      ? 'باش تحجز طاولة، قولّي التاريخ والساعة وعدد الأشخاص، ومن بعد نطلب معلومات الاتصال.'
      : 'Pour réserver une table, indiquez-moi la date, l’heure et le nombre de personnes ; je vous demanderai ensuite vos coordonnées.';
    if (asksPrice && products.length) return isArabic
      ? `تقدر تشوف بعض العروض: ${products.slice(0, 3).map((item) => `${item.name} بـ ${formatMoney(item.priceDzd, true)}`).join('، ')}.`
      : `Voici quelques éléments du menu : ${products.slice(0, 3).map((item) => `${item.name} à ${formatMoney(item.priceDzd, false)}`).join(' · ')}.`;
    return isArabic
      ? `مرحبا بيك عند ${store.name || 'المطعم'}. نقدر نعاونك بمعلومات القائمة ولا حجز طاولة.`
      : `Bienvenue chez ${store.name || 'le restaurant'}. Je peux vous renseigner sur le menu ou vous aider à réserver une table.`;
  }

  if (sector === 'hospitality') {
    if (/room service|خدمة الغرف/.test(normalized)) return isArabic
      ? 'قولّي رقم الغرفة والخدمة المطلوبة فقط؛ ما تبعثش معلومات الدفع.'
      : 'Envoyez une demande de room service avec le numéro de chambre et votre demande. Ne transmettez aucune donnée de paiement.';
    if (asksReservation) return isArabic
      ? 'للحجز، قولّي تاريخ الوصول والمغادرة وعدد الأشخاص، ومن بعد نطلب معلومات الاتصال.'
      : 'Pour réserver un séjour, indiquez les dates d’arrivée et de départ ainsi que le nombre de personnes ; je vous demanderai ensuite vos coordonnées.';
    return isArabic
      ? `مرحبا بيك عند ${store.name || 'المؤسسة'}. نقدر نعاونك بمعلومات الإقامة، الحجز ولا خدمة الغرف.`
      : `Bienvenue chez ${store.name || 'cet établissement'}. Je peux vous renseigner sur le séjour, les réservations ou le room service.`;
  }

  if (!product && asksSize) {
    const requestedSize = normalized.match(/\b\d{2}\b/)?.[0];
    const matchingProduct = products.find((item) => item.stock > 0 && (requestedSize ? item.sizes.includes(requestedSize) : item.sizes.length > 0));
    if (matchingProduct) return isArabic
      ? `إيه، ${matchingProduct.name} متوفر بالمقاس ${requestedSize || matchingProduct.sizes[0]}. كاين كذلك: ${matchingProduct.sizes.join('، ')}.`
      : `Oui, ${matchingProduct.name} est disponible en taille ${requestedSize || matchingProduct.sizes[0]}. Tailles proposées : ${matchingProduct.sizes.join(', ')}.`;
  }

  if (product) {
    if (product.stock <= 0) return isArabic
      ? `سمحلي، ${product.name} راه مخلّص حالياً. تحب نعاونك في منتج آخر؟`
      : `Désolé, ${product.name} est en rupture pour le moment. Voulez-vous découvrir un autre article ?`;
    if (asksPrice) return isArabic
      ? `${product.name} راه بـ ${formatMoney(product.priceDzd, true)}. كاين ${product.stock} في المخزون. تحب تطلبو؟`
      : `${product.name} est à ${formatMoney(product.priceDzd, false)}. Il en reste ${product.stock} en stock. Je peux prendre votre demande si vous le souhaitez.`;
    if (asksSize && product.sizes.length) return isArabic
      ? `بالنسبة لـ ${product.name}، المقاسات المتوفرة: ${product.sizes.join('، ')}. واش هو المقاس اللي تحب؟`
      : `Pour ${product.name}, les variantes disponibles sont : ${product.sizes.join(', ')}. Quelle taille recherchez-vous ?`;
    if (asksStock) return isArabic
      ? `إيه، ${product.name} متوفر. بقالو ${product.stock} في المخزون.${product.sizes.length ? ` المقاسات: ${product.sizes.join('، ')}.` : ''}`
      : `Oui, ${product.name} est disponible. Il en reste ${product.stock}.${product.sizes.length ? ` Tailles : ${product.sizes.join(', ')}.` : ''}`;
    return isArabic
      ? `${product.name} بسعر ${formatMoney(product.priceDzd, true)}. ${product.description || `بقالو ${product.stock} في المخزون.`} تحب تعرف على المقاسات ولا التوصيل؟`
      : `${product.name} est proposé à ${formatMoney(product.priceDzd, false)}. ${product.description || `${product.stock} en stock.`} Vous voulez connaître les tailles ou la livraison ?`;
  }

  if (asksDelivery) {
    const faq = faqs.find((item) => /livr|wilaya|وصل|توصيل|ولاية/i.test(`${item.question} ${item.answer}`));
    return isArabic
      ? faq?.answer.includes('58') ? 'إيه، نوصلو لـ58 ولاية، والخلاص يكون كي توصلك الطلبية.' : 'أكيد، ابعثلي الولاية تاعك ونأكدلك تفاصيل التوصيل.'
      : faq?.answer || 'Oui, nous livrons dans les 58 wilayas. Le paiement se fait à la livraison.';
  }

  if (asksPrice) return isArabic
    ? `نقدر نعاونك في الأسعار. المنتجات المتوفرة عندنا: ${products.slice(0, 3).map((item) => `${item.name} بـ ${formatMoney(item.priceDzd, true)}`).join('، ')}.`
    : `Bien sûr. Voici quelques prix : ${products.slice(0, 3).map((item) => `${item.name} à ${formatMoney(item.priceDzd, false)}`).join(' · ')}.`;

  if (/commande|commander|acheter|réserve|reserve|طلب|نشري|نطلب/.test(normalized)) return isArabic
    ? 'مرحبا، قولّي اسم المنتج والمقاس اللي تحبو ونكملو الطلب.'
    : 'Avec plaisir ! Dites-moi quel produit vous intéresse et la taille souhaitée, puis je note votre demande.';

  const sectorName = sectorLabel(sector, isArabic);
  return isArabic
    ? `نقدر نعاونك بمعلومات ${sectorName}، و${sector === 'commerce' ? 'الأسعار والمقاسات والتوصيل' : 'الخدمات أو المواعيد والحجوزات'}. واش حاب تعرف؟`
    : `Je peux vous renseigner sur ${sectorName}${sector === 'commerce' ? ', les prix, les variantes ou la livraison' : ', les prestations, rendez-vous ou réservations'}. Que souhaitez-vous savoir ?`;
}
