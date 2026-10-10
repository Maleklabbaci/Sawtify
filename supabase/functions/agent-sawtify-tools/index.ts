// @ts-expect-error Deno resolves remote URL imports when deploying the Edge Function.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};
import { answerAgentQuestion, containsHealthClinicalContent, isDisallowedAgentIntent } from '../_shared/agentReply.ts';

type Language = 'fr' | 'ar' | 'en';
type Sector = 'commerce' | 'health' | 'services' | 'restaurant' | 'hospitality';
type Product = {
  id: string;
  name: string;
  category: string;
  description: string;
  priceDzd: number;
  stock: number;
  sizes: string[];
  active: boolean;
};
type Faq = { id: string; question: string; answer: string; active: boolean };
type Store = {
  id: string;
  owner_user_id: string;
  slug: string;
  name: string;
  sector: Sector;
  products: Product[];
  faqs: Faq[];
};
type ToolArgs = Record<string, unknown>;
type PreparedTurn = {
  answer: string;
  action: 'reply' | 'place_order' | 'submit_request';
  pendingAction?: { type: 'place_order' | 'submit_request'; payload: Record<string, unknown> };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
};
const MAX_REQUESTS_PER_MINUTE = 24;
const MAX_INPUT_CHARS = 1200;
const rateWindow = new Map<string, number[]>();
const serviceUrl = Deno.env.get('SUPABASE_URL') || '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = serviceUrl && serviceRoleKey
  ? createClient(serviceUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function cleanText(value: unknown, maxLength: number): string {
  return (typeof value === 'string' ? value : '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function normalizeSlug(value: unknown): string {
  return cleanText(value, 80)
    .toLocaleLowerCase('en')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function rateLimitKey(request: Request, slug: string): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const address = forwarded || request.headers.get('x-real-ip') || 'unknown';
  return `${address}:${slug}`;
}

function allowRequest(key: string): boolean {
  const now = Date.now();
  const recent = (rateWindow.get(key) || []).filter((timestamp) => now - timestamp < 60_000);
  if (recent.length >= MAX_REQUESTS_PER_MINUTE) return false;
  recent.push(now);
  rateWindow.set(key, recent);
  if (rateWindow.size > 4000) {
    for (const [entryKey, timestamps] of rateWindow) {
      if (!timestamps.some((timestamp) => now - timestamp < 60_000)) rateWindow.delete(entryKey);
    }
  }
  return true;
}

function storeFromDatabase(row: Record<string, unknown>): Store {
  const data = row.store_data && typeof row.store_data === 'object'
    ? row.store_data as Record<string, unknown>
    : {};
  const sourceProducts = Array.isArray(data.products) ? data.products.slice(0, 200) : [];
  const products = sourceProducts.map((value, index): Product => {
    const product = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    const price = Number(product.priceDzd);
    const stock = Number(product.stock);
    const sizes = Array.isArray(product.sizes)
      ? product.sizes.slice(0, 30).map((size) => cleanText(size, 32)).filter(Boolean)
      : [];
    return {
      id: cleanText(product.id, 80) || `product-${index + 1}`,
      name: cleanText(product.name, 120) || 'Produit',
      category: cleanText(product.category, 80),
      description: cleanText(product.description, 600),
      priceDzd: Number.isFinite(price) ? Math.max(0, Math.min(1_000_000_000, price)) : 0,
      stock: Number.isFinite(stock) ? Math.max(0, Math.min(1_000_000, Math.floor(stock))) : 0,
      sizes,
      active: product.active !== false,
    };
  });
  const sourceFaqs = Array.isArray(data.faqs) ? data.faqs.slice(0, 100) : [];
  const faqs = sourceFaqs.map((value, index): Faq => {
    const faq = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    return {
      id: cleanText(faq.id, 80) || `faq-${index + 1}`,
      question: cleanText(faq.question, 300),
      answer: cleanText(faq.answer, 1200),
      active: faq.active !== false,
    };
  });
  const sectorValue = cleanText(data.sector, 20);
  const sector: Sector = ['commerce', 'health', 'services', 'restaurant', 'hospitality'].includes(sectorValue)
    ? sectorValue as Sector
    : 'commerce';
  return {
    id: cleanText(row.id, 80),
    owner_user_id: cleanText(row.owner_user_id, 80),
    slug: cleanText(row.slug, 60),
    name: cleanText(data.name, 120) || 'Ma boutique',
    sector,
    products,
    faqs,
  };
}

function languageText(language: Language, french: string, arabic: string, english = french): string {
  return language === 'ar' ? arabic : language === 'en' ? english : french;
}

function normalizePhone(value: unknown): string {
  return cleanText(value, 24);
}

function isValidPhone(value: string): boolean {
  const digitCount = value.replace(/\D/g, '').length;
  return /^[+0-9().\s-]{7,24}$/.test(value) && digitCount >= 7;
}

function parseIsoDate(value: unknown): string | null {
  const raw = cleanText(value, 40);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function formatDateForSpeech(value: string | null, language: Language): string {
  if (!value) return '';
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-DZ' : language === 'en' ? 'en-DZ' : 'fr-DZ', {
    dateStyle: 'long', timeStyle: 'short', timeZone: 'Africa/Algiers',
  }).format(new Date(value));
}

function requiredFieldAnswer(field: string, language: Language): string {
  const fields: Record<string, [string, string, string]> = {
    product: ['Quel produit souhaitez-vous ?', 'واش هو المنتج اللي حاب تطلبو؟', 'Which product would you like?'],
    name: ['Quel nom puis-je transmettre à la boutique ?', 'واش هو الاسم اللي نبعثو للمتجر؟', 'What name should I give the store?'],
    phone: ['Quel numéro de téléphone la boutique peut-elle utiliser pour vous recontacter ?', 'واش هو رقم الهاتف اللي يقدرو يتصلو بيك فيه؟', 'Which phone number can the store use to contact you?'],
    wilaya: ['Dans quelle ville ou wilaya êtes-vous ?', 'في أي مدينة ولا ولاية راك؟', 'Which city or wilaya are you in?'],
    size: ['Quelle taille ou variante souhaitez-vous ?', 'واش هو المقاس ولا الخيار اللي تحبو؟', 'Which size or variant would you like?'],
    service: ['Quel service ou sujet souhaitez-vous demander ?', 'واش هي الخدمة ولا الطلب اللي حاب تديرو؟', 'Which service or request would you like?'],
    date: ['Quel jour et quelle heure vous conviennent ?', 'واش هو النهار والوقت اللي يناسبوك؟', 'Which day and time work for you?'],
    stayDates: ['Quelles sont vos dates d’arrivée et de départ ?', 'واش هما تاريخ الوصول والمغادرة؟', 'What are your arrival and departure dates?'],
    partySize: ['Combien de personnes seront présentes ?', 'شحال من شخص راح يكون؟', 'How many people will be attending?'],
    room: ['Quel est votre numéro de chambre et quel service souhaitez-vous ?', 'واش هو رقم الغرفة والخدمة اللي تحتاجها؟', 'What is your room number, and what service do you need?'],
  };
  const pair = fields[field] || fields.service;
  return pair[language === 'ar' ? 1 : language === 'en' ? 2 : 0];
}

function formatMoney(amount: number, language: Language): string {
  const arabic = language === 'ar';
  const locale = arabic ? 'ar-DZ' : language === 'en' ? 'en-DZ' : 'fr-DZ';
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(amount)} ${arabic ? 'دج' : 'DA'}`;
}

function prepareOrder(store: Store, args: ToolArgs, language: Language): PreparedTurn {
  const question = cleanText(args.question, MAX_INPUT_CHARS);
  const details = cleanText(args.details, 500);
  const productId = cleanText(args.productId, 80);
  const product = store.products.find((candidate) => candidate.id === productId && candidate.active);
  const customerName = cleanText(args.customerName, 80);
  const phone = normalizePhone(args.phone);
  const wilaya = cleanText(args.wilaya, 50);
  const size = cleanText(args.size, 32);
  const quantity = Number(args.quantity);
  const confirmed = args.confirmed === true;
  const reply = (answer: string): PreparedTurn => ({ answer, action: 'reply' });

  if (store.sector !== 'commerce') {
    return reply(languageText(language, 'Cette activité ne propose pas de commande de produit. Je peux vous aider avec une demande adaptée à ses services.', 'هذا النشاط ما يوفرش طلب منتجات. نقدر نعاونك بطلب مناسب للخدمات تاعو.', 'This business does not take product orders. I can help with a request related to its services.'));
  }
  if (isDisallowedAgentIntent(`${question} ${details} ${product?.name || ''}`)) {
    return reply(answerAgentQuestion(store, question, language));
  }
  if (!product) return reply(requiredFieldAnswer('product', language));
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
    return reply(languageText(language, 'Quelle quantité souhaitez-vous, entre 1 et 100 ?', 'شحال من قطعة تحب، بين 1 و100؟', 'What quantity would you like, from 1 to 100?'));
  }
  if (product.stock < quantity) {
    return reply(languageText(language, `${product.name} n’est disponible qu’en ${product.stock} exemplaire${product.stock > 1 ? 's' : ''}.`, `${product.name} متوفر غير بـ${product.stock} قطعة.`, `${product.name} has only ${product.stock} available.`));
  }
  if (product.sizes.length && !product.sizes.includes(size)) return reply(requiredFieldAnswer('size', language));
  if (customerName.length < 2) return reply(requiredFieldAnswer('name', language));
  if (!isValidPhone(phone)) return reply(requiredFieldAnswer('phone', language));
  if (!wilaya) return reply(requiredFieldAnswer('wilaya', language));

  if (!confirmed) {
    const summary = languageText(
      language,
      `Récapitulatif : ${quantity} × ${product.name}${size ? `, variante ${size}` : ''}, soit ${formatMoney(product.priceDzd * quantity, language)}, pour ${customerName} à ${wilaya}. Souhaitez-vous que je transmette cette demande à la boutique ?`,
      `نراجعو الطلب: ${quantity} × ${product.name}${size ? `، المقاس ${size}` : ''}، المجموع ${formatMoney(product.priceDzd * quantity, language)}، باسم ${customerName} في ${wilaya}. تحب نبعث الطلب للمتجر؟`,
      `Order summary: ${quantity} × ${product.name}${size ? `, variant ${size}` : ''}, total ${formatMoney(product.priceDzd * quantity, language)}, for ${customerName} in ${wilaya}. Would you like me to send this request to the store?`,
    );
    return reply(summary);
  }

  const answer = languageText(
    language,
    'Votre demande est enregistrée et sera transmise à la boutique à la fin de l’appel. Elle vous recontactera pour confirmer la disponibilité et la livraison.',
    'تسجل طلبك، ونبعثوه للمتجر كي تسالي المكالمة. يرجعلك باش يأكد التوفر والتوصيل.',
    'Your request is ready and will be sent to the store when this call ends. The store will contact you to confirm availability and delivery.',
  );
  return {
    answer,
    action: 'place_order',
    pendingAction: {
      type: 'place_order',
      payload: { customerName, phone, wilaya, productId: product.id, size, quantity },
    },
  };
}

function prepareRequest(store: Store, args: ToolArgs, language: Language): PreparedTurn {
  const question = cleanText(args.question, MAX_INPUT_CHARS);
  const requestType = cleanText(args.requestType, 24);
  const titleInput = cleanText(args.requestTitle, 120);
  const details = cleanText(args.details, 500);
  const customerName = cleanText(args.customerName, 80);
  const phone = normalizePhone(args.phone);
  const wilaya = cleanText(args.wilaya, 50);
  const preferredAt = parseIsoDate(args.preferredAt);
  const preferredUntil = parseIsoDate(args.preferredUntil);
  const partySize = Number(args.partySize);
  const confirmed = args.confirmed === true;
  const reply = (answer: string): PreparedTurn => ({ answer, action: 'reply' });

  const allowedBySector: Record<Sector, string[]> = {
    commerce: [],
    health: ['appointment'],
    services: ['appointment', 'quote'],
    restaurant: ['reservation'],
    hospitality: ['reservation', 'room_service'],
  };
  if (!allowedBySector[store.sector].includes(requestType)) {
    return reply(languageText(language, 'Cette activité ne propose pas ce type de demande.', 'هذا النشاط ما يوفرش هاذ النوع من الطلبات.', 'This business does not offer that type of request.'));
  }
  if (isDisallowedAgentIntent(`${question} ${titleInput} ${details}`)) {
    return reply(answerAgentQuestion(store, question, language));
  }
  if (store.sector === 'health' && containsHealthClinicalContent(`${question} ${titleInput} ${details}`)) {
    return reply(answerAgentQuestion(store, question, language));
  }
  if (store.sector === 'health' && details) {
    return reply(languageText(language, 'Pour protéger vos informations, ne communiquez aucun détail médical. Cette activité traite uniquement les demandes de rendez-vous.', 'باش نحافظو على معلوماتك، ما تبعث حتى تفاصيل طبية. هذا النشاط يستقبل غير طلبات المواعيد.', 'For your privacy, do not share medical details. This business only handles appointment requests.'));
  }

  const title = titleInput || languageText(language, 'Demande de service', 'طلب خدمة', 'Service request');
  const isReservation = requestType === 'reservation' && (store.sector === 'restaurant' || store.sector === 'hospitality');
  const isStay = requestType === 'reservation' && store.sector === 'hospitality';
  const isRoomService = requestType === 'room_service' && store.sector === 'hospitality';
  const requiresDate = requestType === 'appointment' || (requestType === 'reservation' && store.sector === 'restaurant');
  const validatedPartySize = Number.isInteger(partySize) && partySize >= 1 && partySize <= 30 ? partySize : null;

  if (customerName.length < 2) return reply(requiredFieldAnswer('name', language));
  if (!isValidPhone(phone)) return reply(requiredFieldAnswer('phone', language));
  if (!wilaya) return reply(requiredFieldAnswer('wilaya', language));
  if (!title.trim()) return reply(requiredFieldAnswer('service', language));
  if (requiresDate && !preferredAt) return reply(requiredFieldAnswer('date', language));
  if (isStay && (!preferredAt || !preferredUntil || preferredUntil <= preferredAt)) return reply(requiredFieldAnswer('stayDates', language));
  if (isReservation && !validatedPartySize) return reply(requiredFieldAnswer('partySize', language));
  if (isRoomService && !details) return reply(requiredFieldAnswer('room', language));
  if (details.length > 500) return reply(languageText(language, 'Le détail de la demande est trop long. Pouvez-vous le résumer ?', 'تفاصيل الطلب طويلة بزاف، تقدر تلخّصها؟', 'The request details are too long. Could you shorten them?'));

  const finalTitle = isReservation && validatedPartySize
    ? cleanText(`${title} · ${validatedPartySize} ${language === 'ar' ? 'أشخاص' : language === 'en' ? 'people' : 'personnes'}`, 120)
    : title;
  const spokenPreferredAt = formatDateForSpeech(preferredAt, language);
  const spokenPreferredUntil = formatDateForSpeech(preferredUntil, language);
  if (!confirmed) {
    const answer = languageText(
      language,
      `Je vais transmettre à l’activité : « ${finalTitle} »${spokenPreferredAt ? `, le ${spokenPreferredAt}` : ''}${spokenPreferredUntil ? ` au ${spokenPreferredUntil}` : ''}, pour ${customerName}. Confirmez-vous l’envoi ?`,
      `راح نبعث للنشاط: « ${finalTitle} »${spokenPreferredAt ? `، في ${spokenPreferredAt}` : ''}${spokenPreferredUntil ? ` حتى ${spokenPreferredUntil}` : ''}، باسم ${customerName}. تأكد الإرسال؟`,
      `I’ll send this to the business: “${finalTitle}”${spokenPreferredAt ? `, on ${spokenPreferredAt}` : ''}${spokenPreferredUntil ? ` through ${spokenPreferredUntil}` : ''}, for ${customerName}. Do you confirm?`,
    );
    return reply(answer);
  }

  const answer = languageText(
    language,
    'Votre demande est enregistrée et sera transmise à l’activité à la fin de l’appel. Elle vous recontactera pour confirmer les détails.',
    'تسجل طلبك، ونبعثوه للنشاط كي تسالي المكالمة. يرجعولك باش يأكدو التفاصيل.',
    'Your request is ready and will be sent to the business when this call ends. They will contact you to confirm the details.',
  );
  return {
    answer,
    action: 'submit_request',
    pendingAction: {
      type: 'submit_request',
      payload: {
        customerName, phone, wilaya, requestType, requestTitle: finalTitle,
        details: store.sector === 'health' ? '' : details,
        preferredAt, preferredUntil,
      },
    },
  };
}

function databaseFailureAnswer(error: string | null, language: Language, store: Store): string | null {
  if (!error) return null;
  if (error === 'insufficient_stock') {
    return languageText(language, 'Le stock vient de changer et cette demande n’a pas été transmise. Je peux vérifier une autre variante.', 'تبدل المخزون وما تبعثش الطلب. نقدر نشوفلك خيار آخر.', 'The stock has changed, so the request was not sent. I can check another option.');
  }
  if (error === 'invalid_size') {
    return languageText(language, 'Cette variante n’est plus disponible et la demande n’a pas été transmise.', 'هاذ المقاس ما بقاش متوفر وما تبعثش الطلب.', 'This variant is no longer available, so the request was not sent.');
  }
  if (error === 'product_unavailable' || error === 'store_unavailable') {
    return languageText(language, 'Cette offre n’est plus disponible et la demande n’a pas été transmise.', 'هاذ العرض ما بقاش متوفر وما تبعثش الطلب.', 'This offer is no longer available, so the request was not sent.');
  }
  if (error === 'invalid_request_type' || error === 'invalid_stay_dates' || error === 'medical_details_not_allowed') {
    return languageText(language, 'Les informations ne permettent pas de transmettre la demande. Vérifions-les ensemble.', 'المعلومات ما تسمحش بإرسال الطلب. نراجعوها مع بعض.', 'These details are not enough to send the request. Let’s review them together.');
  }
  return languageText(language, `Je n’ai pas pu transmettre cette demande à ${store.name}. Réessayons dans un instant.`, `ما قدرتش نبعث الطلب لـ${store.name}. نعاودو بعد شوية.`, `I couldn’t send this request to ${store.name}. Let’s try again in a moment.`);
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { status: 204, headers: corsHeaders });
  if (request.method !== 'POST') return json({ success: false, error: 'method_not_allowed' }, 405);
  if (!supabase) return json({ success: false, error: 'service_unavailable' }, 503);

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    body = parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
  } catch {
    return json({ success: false, error: 'invalid_json' }, 400);
  }

  const slug = normalizeSlug(body.slug);
  const language: Language = body.language === 'ar' ? 'ar' : body.language === 'en' ? 'en' : 'fr';
  const requestId = body.requestId;
  const callId = typeof body.callId === 'string' ? body.callId : null;
  const toolName = cleanText(body.toolName, 80);
  const args = body.arguments && typeof body.arguments === 'object' && !Array.isArray(body.arguments)
    ? body.arguments as ToolArgs
    : {};
  if (!slug || !isUuid(callId) || !isUuid(requestId) || toolName !== 'agent_turn') {
    return json({ success: false, error: 'invalid_tool_request' }, 400);
  }
  if (!allowRequest(rateLimitKey(request, slug))) return json({ success: false, error: 'rate_limited' }, 429);

  const question = cleanText(args.question, MAX_INPUT_CHARS);
  if (!question) return json({ success: false, error: 'empty_question' }, 400);

  try {
    const { data: row, error: storeError } = await supabase
      .from('agent_sawtify_stores')
      .select('id, owner_user_id, slug, store_data, is_active')
      .eq('slug', slug)
      .maybeSingle();
    if (storeError) return json({ success: false, error: 'store_unavailable' }, 503);
    if (!row || !row.is_active) return json({ success: false, error: 'store_paused' }, 404);

    const store = storeFromDatabase(row as Record<string, unknown>);
    const { data: call, error: callError } = await supabase
      .from('agent_sawtify_call_sessions')
      .select('id, store_id, store_slug, language, status')
      .eq('id', callId)
      .maybeSingle();
    if (callError) return json({ success: false, error: 'call_unavailable' }, 503);
    if (!call || call.status !== 'active' || call.store_id !== store.id || call.store_slug !== store.slug) {
      return json({ success: false, error: 'call_not_active' }, 409);
    }
    if (call.language !== language) return json({ success: false, error: 'session_language_mismatch' }, 409);
    const action = cleanText(args.action, 30);
    let prepared: PreparedTurn;
    if (action === 'place_order') prepared = prepareOrder(store, { ...args, question }, language);
    else if (action === 'submit_request') prepared = prepareRequest(store, { ...args, question }, language);
    else prepared = { answer: answerAgentQuestion(store, question, language), action: 'reply' };

    let finalAnswer = prepared.answer;
    if (prepared.pendingAction) {
      const { data: stagedData, error: stagedError } = await supabase.rpc('stage_agent_sawtify_call_action', {
        p_call_id: callId,
        p_request_id: requestId,
        p_action_type: prepared.pendingAction.type,
        p_action_data: prepared.pendingAction.payload,
      });
      if (stagedError) return json({ success: false, error: 'call_action_unavailable' }, 503);
      const staged = Array.isArray(stagedData) ? stagedData[0] : stagedData;
      if (!staged?.success) {
        finalAnswer = databaseFailureAnswer(cleanText(staged?.error, 40) || 'database_error', language, store)
          || languageText(language, 'Je n’ai pas pu enregistrer cette demande.', 'ما قدرتش نسجل هاذ الطلب.', 'I could not save this request.');
      }
    }

    return json({ success: true, answer: finalAnswer, action: prepared.action });
  } catch {
    return json({ success: false, error: 'tool_execution_failed' }, 500);
  }
});
