// @ts-expect-error Deno resolves remote URL imports when deploying the Edge Function.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};
import { answerAgentQuestion, containsHealthClinicalContent, isDisallowedAgentIntent } from '../_shared/agentReply.ts';

type Language = 'fr' | 'ar';
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
  apply?: () => Promise<string | null>;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
};
const MAX_REQUESTS_PER_MINUTE = 24;
const MAX_INPUT_CHARS = 1200;
const CHARS_PER_SECOND = 14;
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

function languageText(language: Language, french: string, arabic: string): string {
  return language === 'ar' ? arabic : french;
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
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-DZ' : 'fr-DZ', {
    dateStyle: 'long', timeStyle: 'short', timeZone: 'Africa/Algiers',
  }).format(new Date(value));
}

function requiredFieldAnswer(field: string, language: Language): string {
  const fields: Record<string, [string, string]> = {
    product: ['Quel produit souhaitez-vous ?', 'واش هو المنتج اللي حاب تطلبو؟'],
    name: ['Quel nom puis-je transmettre à la boutique ?', 'واش هو الاسم اللي نبعثو للمتجر؟'],
    phone: ['Quel numéro de téléphone la boutique peut-elle utiliser pour vous recontacter ?', 'واش هو رقم الهاتف اللي يقدرو يتصلو بيك فيه؟'],
    wilaya: ['Dans quelle ville ou wilaya êtes-vous ?', 'في أي مدينة ولا ولاية راك؟'],
    size: ['Quelle taille ou variante souhaitez-vous ?', 'واش هو المقاس ولا الخيار اللي تحبو؟'],
    service: ['Quel service ou sujet souhaitez-vous demander ?', 'واش هي الخدمة ولا الطلب اللي حاب تديرو؟'],
    date: ['Quel jour et quelle heure vous conviennent ?', 'واش هو النهار والوقت اللي يناسبوك؟'],
    stayDates: ['Quelles sont vos dates d’arrivée et de départ ?', 'واش هما تاريخ الوصول والمغادرة؟'],
    partySize: ['Combien de personnes seront présentes ?', 'شحال من شخص راح يكون؟'],
    room: ['Quel est votre numéro de chambre et quel service souhaitez-vous ?', 'واش هو رقم الغرفة والخدمة اللي تحتاجها؟'],
  };
  const pair = fields[field] || fields.service;
  return pair[language === 'ar' ? 1 : 0];
}

function formatMoney(amount: number, language: Language): string {
  const arabic = language === 'ar';
  return `${new Intl.NumberFormat(arabic ? 'ar-DZ' : 'fr-DZ', { maximumFractionDigits: 0 }).format(amount)} ${arabic ? 'دج' : 'DA'}`;
}

function prepareOrder(store: Store, args: ToolArgs, language: Language, requestId: string): PreparedTurn {
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
    return reply(languageText(language, 'Cette activité ne propose pas de commande de produit. Je peux vous aider avec une demande adaptée à ses services.', 'هذا النشاط ما يوفرش طلب منتجات. نقدر نعاونك بطلب مناسب للخدمات تاعو.'));
  }
  if (isDisallowedAgentIntent(`${question} ${details} ${product?.name || ''}`)) {
    return reply(answerAgentQuestion(store, question, language));
  }
  if (!product) return reply(requiredFieldAnswer('product', language));
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
    return reply(languageText(language, 'Quelle quantité souhaitez-vous, entre 1 et 100 ?', 'شحال من قطعة تحب، بين 1 و100؟'));
  }
  if (product.stock < quantity) {
    return reply(languageText(language, `${product.name} n’est disponible qu’en ${product.stock} exemplaire${product.stock > 1 ? 's' : ''}.`, `${product.name} متوفر غير بـ${product.stock} قطعة.`));
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
    );
    return reply(summary);
  }

  const answer = languageText(
    language,
    'Votre demande est transmise à la boutique. Elle vous recontactera pour confirmer la disponibilité et la livraison.',
    'وصل طلبك للمتجر. يرجعلك باش يأكد التوفر والتوصيل.',
  );
  return {
    answer,
    action: 'place_order',
    apply: async () => {
      try {
        const { data, error } = await supabase!.rpc('create_agent_sawtify_order', {
          p_store_id: store.id,
          p_request_id: requestId,
          p_customer_name: customerName,
          p_phone: phone,
          p_wilaya: wilaya,
          p_product_id: product.id,
          p_size: size,
          p_quantity: quantity,
        });
        if (error) return 'database_error';
        const result = Array.isArray(data) ? data[0] : data;
        if (!result?.success) return cleanText(result?.error, 40) || 'order_error';
        return null;
      } catch {
        return 'database_error';
      }
    },
  };
}

function prepareRequest(store: Store, args: ToolArgs, language: Language, requestId: string): PreparedTurn {
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
    return reply(languageText(language, 'Cette activité ne propose pas ce type de demande.', 'هذا النشاط ما يوفرش هاذ النوع من الطلبات.'));
  }
  if (isDisallowedAgentIntent(`${question} ${titleInput} ${details}`)) {
    return reply(answerAgentQuestion(store, question, language));
  }
  if (store.sector === 'health' && containsHealthClinicalContent(`${question} ${titleInput} ${details}`)) {
    return reply(answerAgentQuestion(store, question, language));
  }
  if (store.sector === 'health' && details) {
    return reply(languageText(language, 'Pour protéger vos informations, ne communiquez aucun détail médical. Cette activité traite uniquement les demandes de rendez-vous.', 'باش نحافظو على معلوماتك، ما تبعث حتى تفاصيل طبية. هذا النشاط يستقبل غير طلبات المواعيد.'));
  }

  const title = titleInput || languageText(language, 'Demande de service', 'طلب خدمة');
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
  if (details.length > 500) return reply(languageText(language, 'Le détail de la demande est trop long. Pouvez-vous le résumer ?', 'تفاصيل الطلب طويلة بزاف، تقدر تلخّصها؟'));

  const finalTitle = isReservation && validatedPartySize
    ? cleanText(`${title} · ${validatedPartySize} ${language === 'ar' ? 'أشخاص' : 'personnes'}`, 120)
    : title;
  const spokenPreferredAt = formatDateForSpeech(preferredAt, language);
  const spokenPreferredUntil = formatDateForSpeech(preferredUntil, language);
  if (!confirmed) {
    const answer = languageText(
      language,
      `Je vais transmettre à l’activité : « ${finalTitle} »${spokenPreferredAt ? `, le ${spokenPreferredAt}` : ''}${spokenPreferredUntil ? ` au ${spokenPreferredUntil}` : ''}, pour ${customerName}. Confirmez-vous l’envoi ?`,
      `راح نبعث للنشاط: « ${finalTitle} »${spokenPreferredAt ? `، في ${spokenPreferredAt}` : ''}${spokenPreferredUntil ? ` حتى ${spokenPreferredUntil}` : ''}، باسم ${customerName}. تأكد الإرسال؟`,
    );
    return reply(answer);
  }

  const answer = languageText(
    language,
    'Votre demande est transmise à l’activité. Elle vous recontactera pour confirmer les détails.',
    'وصل طلبك للنشاط. يرجعولك باش يأكدو التفاصيل.',
  );
  return {
    answer,
    action: 'submit_request',
    apply: async () => {
      try {
        const { data, error } = await supabase!.rpc('create_agent_sawtify_request', {
          p_store_id: store.id,
          p_request_id: requestId,
          p_customer_name: customerName,
          p_phone: phone,
          p_wilaya: wilaya,
          p_request_type: requestType,
          p_request_title: finalTitle,
          p_details: store.sector === 'health' ? '' : details,
          p_preferred_at: preferredAt,
          p_preferred_until: preferredUntil,
        });
        if (error) return 'database_error';
        const result = Array.isArray(data) ? data[0] : data;
        if (!result?.success) return cleanText(result?.error, 40) || 'request_error';
        return null;
      } catch {
        return 'database_error';
      }
    },
  };
}

function databaseFailureAnswer(error: string | null, language: Language, store: Store): string | null {
  if (!error) return null;
  if (error === 'insufficient_stock') {
    return languageText(language, 'Le stock vient de changer et cette demande n’a pas été transmise. Je peux vérifier une autre variante.', 'تبدل المخزون وما تبعثش الطلب. نقدر نشوفلك خيار آخر.');
  }
  if (error === 'invalid_size') {
    return languageText(language, 'Cette variante n’est plus disponible et la demande n’a pas été transmise.', 'هاذ المقاس ما بقاش متوفر وما تبعثش الطلب.');
  }
  if (error === 'product_unavailable' || error === 'store_unavailable') {
    return languageText(language, 'Cette offre n’est plus disponible et la demande n’a pas été transmise.', 'هاذ العرض ما بقاش متوفر وما تبعثش الطلب.');
  }
  if (error === 'invalid_request_type' || error === 'invalid_stay_dates' || error === 'medical_details_not_allowed') {
    return languageText(language, 'Les informations ne permettent pas de transmettre la demande. Vérifions-les ensemble.', 'المعلومات ما تسمحش بإرسال الطلب. نراجعوها مع بعض.');
  }
  return languageText(language, `Je n’ai pas pu transmettre cette demande à ${store.name}. Réessayons dans un instant.`, `ما قدرتش نبعث الطلب لـ${store.name}. نعاودو بعد شوية.`);
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
  const language: Language = body.language === 'ar' ? 'ar' : 'fr';
  const requestId = body.requestId;
  const toolName = cleanText(body.toolName, 80);
  const args = body.arguments && typeof body.arguments === 'object' && !Array.isArray(body.arguments)
    ? body.arguments as ToolArgs
    : {};
  if (!slug || !isUuid(requestId) || toolName !== 'agent_turn') {
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
    const action = cleanText(args.action, 30);
    let prepared: PreparedTurn;
    if (action === 'place_order') prepared = prepareOrder(store, { ...args, question }, language, requestId);
    else if (action === 'submit_request') prepared = prepareRequest(store, { ...args, question }, language, requestId);
    else prepared = { answer: answerAgentQuestion(store, question, language), action: 'reply' };

    const inputCharacters = Math.min(MAX_INPUT_CHARS, question.length + cleanText(args.details, 500).length);
    const outputCharacters = Math.max(1, Math.min(4000, prepared.answer.length));
    const billableSeconds = Math.max(1, Math.min(300, Math.ceil((inputCharacters + outputCharacters) / CHARS_PER_SECOND)));
    const { data: usageData, error: usageError } = await supabase.rpc('consume_agent_sawtify_conversation', {
      p_request_id: requestId,
      p_user_id: store.owner_user_id,
      p_store_id: store.id,
      p_store_slug: store.slug,
      p_input_characters: inputCharacters,
      p_output_characters: outputCharacters,
      p_seconds: billableSeconds,
    });
    if (usageError) return json({ success: false, error: 'usage_unavailable' }, 503);
    const usage = Array.isArray(usageData) ? usageData[0] : usageData;
    if (!usage?.success) {
      if (usage?.error === 'insufficient_minutes' || usage?.error === 'wallet_not_found') {
        return json({ success: false, error: 'insufficient_minutes' }, 402);
      }
      return json({ success: false, error: 'usage_not_validated' }, 409);
    }

    let finalAnswer = prepared.answer;
    if (prepared.apply) {
      const applyError = await prepared.apply();
      const failureAnswer = databaseFailureAnswer(applyError, language, store);
      if (failureAnswer) finalAnswer = failureAnswer;
    }

    return json({
      success: true,
      answer: finalAnswer,
      action: prepared.action,
      consumed_seconds: Number(usage.consumed_seconds || billableSeconds),
      remaining_seconds: Number(usage.remaining_seconds || 0),
    });
  } catch {
    return json({ success: false, error: 'tool_execution_failed' }, 500);
  }
});
