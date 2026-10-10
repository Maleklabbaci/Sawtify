import React, { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  AudioLines, Bot, Check, CheckCircle2, ChevronRight, CircleHelp, Mic, MicOff,
  Minus, Phone, Plus, Send, ShieldCheck, Sparkles, Store, Volume2, X,
} from 'lucide-react';
import { API_BASE_URL } from '../config/apiBase';
import { answerAgentQuestion } from '../services/agentReply';
import {
  createDemoAgentStore, DEMO_AGENT_STORE, makeAgentId, readAgentStore, saveAgentStore,
  type AgentOrder, type AgentProduct, type AgentRequestType, type AgentStore,
} from '../services/agentSawtify';

type ConversationMessage = { id: string; role: 'customer' | 'assistant'; text: string };
type BrowserRecognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
};
type RecognitionConstructor = new () => BrowserRecognition;

const formatMoney = (amount: number, arabic: boolean) => `${new Intl.NumberFormat(arabic ? 'ar-DZ' : 'fr-DZ', { maximumFractionDigits: 0 }).format(amount)} ${arabic ? 'دج' : 'DA'}`;
const makeRequestId = () => typeof crypto !== 'undefined' && 'randomUUID' in crypto
  ? crypto.randomUUID()
  : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    return (char === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });

const sectorRequestTypes = (sector: AgentStore['sector']): AgentRequestType[] => {
  if (sector === 'health') return ['appointment'];
  if (sector === 'services') return ['quote', 'appointment'];
  if (sector === 'restaurant') return ['reservation'];
  if (sector === 'hospitality') return ['reservation', 'room_service'];
  return [];
};

const requestTypeLabel = (type: AgentRequestType, arabic: boolean) => {
  const labels: Record<AgentRequestType, [string, string]> = {
    order: ['Commande', 'طلب'],
    appointment: ['Rendez-vous', 'موعد'],
    quote: ['Demander un devis', 'طلب عرض سعر'],
    reservation: ['Réservation', 'حجز'],
    room_service: ['Room service', 'خدمة الغرف'],
  };
  return labels[type][arabic ? 1 : 0];
};

type RequestForm = { name: string; phone: string; wilaya: string; title: string; details: string; preferredAt: string; preferredUntil: string; partySize: number };

export const AgentCallPage: React.FC<{ slug: string }> = ({ slug }) => {
  const isDemoPreview = new URLSearchParams(window.location.search).get('demo') === '1';
  const [store, setStore] = useState<AgentStore>(() => isDemoPreview ? readAgentStore() : createDemoAgentStore());
  const [storeLoading, setStoreLoading] = useState(!isDemoPreview);
  const [storeError, setStoreError] = useState('');
  const [language, setLanguage] = useState<'fr' | 'ar'>(() => {
    const initial = isDemoPreview ? readAgentStore().language : 'fr';
    return initial === 'ar' ? 'ar' : 'fr';
  });
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isResponding, setIsResponding] = useState(false);
  const [hint, setHint] = useState('');
  const [textQuestion, setTextQuestion] = useState('');
  const [orderProduct, setOrderProduct] = useState<AgentProduct | null>(null);
  const [orderSaved, setOrderSaved] = useState(false);
  const [orderForm, setOrderForm] = useState({ name: '', phone: '', wilaya: '', size: '', quantity: 1 });
  const [businessRequestType, setBusinessRequestType] = useState<AgentRequestType | null>(null);
  const [businessRequestSaved, setBusinessRequestSaved] = useState(false);
  const [businessRequestError, setBusinessRequestError] = useState('');
  const [businessRequestForm, setBusinessRequestForm] = useState<RequestForm>({ name: '', phone: '', wilaya: '', title: '', details: '', preferredAt: '', preferredUntil: '', partySize: 2 });
  const recognitionRef = useRef<BrowserRecognition | null>(null);
  const conversationEndRef = useRef<HTMLDivElement | null>(null);
  const orderRequestIdRef = useRef('');
  const businessRequestIdRef = useRef('');
  const autoStartAttemptedRef = useRef(false);
  const respondingRef = useRef(false);
  const startListeningRef = useRef<() => void>(() => {});
  const isArabic = language === 'ar';
  const bi = (fr: string, ar: string) => isArabic ? ar : fr;
  const availableProducts = store.products.filter((product) => product.active);
  const availableFaqs = store.faqs.filter((faq) => faq.active);
  const isCommerce = store.sector === 'commerce';
  const availableRequestTypes = sectorRequestTypes(store.sector);
  const sectorName = store.sector === 'health' ? bi('Santé et médical', 'الصحة والطب') : store.sector === 'services' ? bi('Services et artisans', 'الخدمات والحرفيين') : store.sector === 'restaurant' ? bi('Restauration', 'المطاعم') : store.sector === 'hospitality' ? bi('Hôtellerie', 'الفنادق') : bi('E-commerce', 'التجارة الإلكترونية');
  const greeting = store.greeting === DEMO_AGENT_STORE.greeting
    ? store.sector === 'health'
      ? bi(`Bonjour, bienvenue chez ${store.name}. Je peux vous renseigner et vous aider à demander un rendez-vous.`, `سلام، مرحبا بيك عند ${store.name}. نقدر نعاونك بالمعلومات وحجز موعد.`)
      : store.sector === 'services'
        ? bi(`Bonjour, bienvenue chez ${store.name}. Je peux vous présenter nos prestations et vous aider à demander un devis ou un rendez-vous.`, `سلام، مرحبا بيك عند ${store.name}. نقدر نعرّفك بخدماتنا ونعاونك تطلب سعر ولا موعد.`)
        : store.sector === 'restaurant'
          ? bi(`Bonjour, bienvenue chez ${store.name}. Je peux vous renseigner sur le menu ou vous aider à réserver une table.`, `سلام، مرحبا بيك عند ${store.name}. نقدر نعاونك بمعلومات القائمة ولا حجز طاولة.`)
          : store.sector === 'hospitality'
            ? bi(`Bonjour, bienvenue chez ${store.name}. Je peux vous renseigner sur les séjours, réservations et services.`, `سلام، مرحبا بيك عند ${store.name}. نقدر نعاونك بمعلومات الإقامة والحجوزات والخدمات.`)
            : isArabic
              ? `سلام! مرحبا بيك عند ${store.name}. نقدر نعاونك بالمنتجات، الأسعار ولا التوصيل، واش حاب تعرف؟`
              : DEMO_AGENT_STORE.greeting
    : store.greeting || bi('Bonjour ! Comment puis-je vous aider ?', 'سلام، كيفاش نقدر نعاونك؟');

  useEffect(() => {
    if (isDemoPreview) {
      setStore(readAgentStore());
      setStoreLoading(false);
      return;
    }
    let active = true;
    const loadStore = async () => {
      setStoreLoading(true);
      setStoreError('');
      try {
        const response = await fetch(`${API_BASE_URL}/api/agent/sawtify/public/${encodeURIComponent(slug)}`);
        const body = await response.json();
        if (!response.ok || !body.success || !body.store) throw new Error(body.error || 'Cette boutique est introuvable.');
        if (!active) return;
        setStore({ ...body.store, orders: [] });
        setLanguage(body.store.language === 'ar' ? 'ar' : 'fr');
      } catch (error: any) {
        if (active) setStoreError(error?.message || 'Impossible de charger cette boutique pour le moment.');
      } finally {
        if (active) setStoreLoading(false);
      }
    };
    void loadStore();
    return () => { active = false; };
  }, [isDemoPreview, slug]);

  useEffect(() => {
    if (!messages.length) return;
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  useEffect(() => {
    document.documentElement.lang = isArabic ? 'ar' : 'fr';
    document.documentElement.dir = isArabic ? 'rtl' : 'ltr';
  }, [isArabic]);

  useEffect(() => () => {
    recognitionRef.current?.abort?.();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  const speak = (text: string) => new Promise<void>((resolve) => {
    if (!('speechSynthesis' in window)) { resolve(); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = isArabic ? 'ar-SA' : 'fr-FR';
    utterance.rate = 0.96;
    let finished = false;
    let fallbackTimer: number | undefined;
    const finish = () => {
      if (finished) return;
      finished = true;
      if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
      setIsSpeaking(false);
      resolve();
    };
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = finish;
    utterance.onerror = finish;
    fallbackTimer = window.setTimeout(finish, Math.min(120_000, Math.max(10_000, Math.ceil(text.length / 10) * 1000 + 5_000)));
    try { window.speechSynthesis.speak(utterance); }
    catch { finish(); }
  });

  const answerCustomer = async (question: string) => {
    if (!store.isActive) {
      setHint(bi('Cet assistant est en pause pour le moment.', 'المساعد متوقف مؤقتاً.'));
      return;
    }
    if (respondingRef.current || !question.trim()) return;
    respondingRef.current = true;
    setIsResponding(true);
    setHint(bi('Préparation de la réponse…', 'جاري تحضير الإجابة…'));
    try {
      let answer: string;
      let estimatedSeconds = 0;
      let consumedSeconds = 0;
      let remainingSeconds = 0;
      if (isDemoPreview) {
        answer = answerAgentQuestion(store, question, language);
      } else {
        const response = await fetch(`${API_BASE_URL}/api/agent/sawtify/respond`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug, question, language }),
        });
        const body = await response.json();
        const serverEstimate = Number(body.estimated_seconds);
        if (!response.ok || !body.success || typeof body.answer !== 'string'
            || !Number.isFinite(serverEstimate) || serverEstimate < 1
            || !Number.isFinite(Number(body.consumed_seconds)) || !Number.isFinite(Number(body.remaining_seconds))) {
          throw new Error(body.error || bi('Impossible de répondre pour le moment.', 'ما قدرناش نجاوبو حالياً.'));
        }
        answer = body.answer;
        estimatedSeconds = serverEstimate;
        consumedSeconds = Number(body.consumed_seconds);
        remainingSeconds = Number(body.remaining_seconds);
      }

      setMessages((current) => [
        ...current,
        { id: makeAgentId('msg'), role: 'customer', text: question },
        { id: makeAgentId('msg'), role: 'assistant', text: answer },
      ]);
      setHint('');
      await speak(answer);

      if (isDemoPreview) {
        setHint(bi('Aperçu de démonstration : aucun solde n’est débité.', 'معاينة تجريبية: ما تخصم حتى مدة من الرصيد.'));
      } else {
        setHint(bi(
          `Durée estimée décomptée : ${consumedSeconds || estimatedSeconds} s · solde restant : ${remainingSeconds} s.`,
          `المدة التقديرية المخصومة: ${consumedSeconds || estimatedSeconds} ث · الرصيد المتبقي: ${remainingSeconds} ث.`,
        ));
      }
    } catch (error: any) {
      setHint(error?.message || bi('Impossible de répondre pour le moment.', 'ما قدرناش نجاوبو حالياً.'));
    } finally {
      respondingRef.current = false;
      setIsResponding(false);
    }
  };

  const startListening = () => {
    if (isResponding) return;
    if (!store.isActive) {
      setHint(bi('Cet assistant est en pause pour le moment.', 'المساعد متوقف مؤقتاً.'));
      return;
    }
    const speechWindow = window as Window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
    const Constructor = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Constructor) {
      setHint(bi('La commande vocale n’est pas prise en charge par ce navigateur. Écrivez votre question ou choisissez une suggestion ci-dessous.', 'المتصفح ما يدعمش الأوامر الصوتية. اكتب سؤالك ولا اختار اقتراح من لتحت.'));
      return;
    }
    try {
      recognitionRef.current?.abort?.();
      const recognition = new Constructor();
      recognition.lang = isArabic ? 'ar-DZ' : 'fr-DZ';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript?.trim();
        setIsListening(false);
        if (transcript) answerCustomer(transcript);
        else setHint(bi('Je n’ai pas bien entendu. Réessayez ou choisissez une question.', 'ما سمعتكش مليح. عاود ولا اختار سؤال.'));
      };
      recognition.onerror = (event) => {
        setIsListening(false);
        setHint(event?.error === 'not-allowed' || event?.error === 'service-not-allowed'
          ? bi('Le navigateur a bloqué le démarrage automatique. Autorisez le micro ou touchez le bouton micro, ou écrivez votre question.', 'المتصفح منع التشغيل التلقائي. اسمح بالميكرو ولا اضغط على زر الميكرو، أو اكتب سؤالك.')
          : bi('Je n’ai pas pu capter votre voix. Réessayez avec le micro ou écrivez votre question.', 'ما قدرتش نسمع صوتك. عاود بالميكرو ولا اكتب سؤالك.'));
      };
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
      setHint(bi('Je vous écoute…', 'راني نسمع فيك…'));
      setIsListening(true);
      recognition.start();
    } catch {
      setIsListening(false);
      setHint(bi('Le navigateur a bloqué le micro au démarrage. Touchez le bouton micro pour réessayer, ou écrivez votre question.', 'المتصفح منع الميكرو عند التشغيل. اضغط على زر الميكرو لإعادة المحاولة، أو اكتب سؤالك.'));
    }
  };

  startListeningRef.current = startListening;
  useEffect(() => {
    if (storeLoading || !store.isActive || autoStartAttemptedRef.current) return;
    autoStartAttemptedRef.current = true;
    const timer = window.setTimeout(() => startListeningRef.current(), 250);
    return () => window.clearTimeout(timer);
  }, [storeLoading, store.isActive]);

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setHint('');
  };

  const submitTextQuestion = (event: React.FormEvent) => {
    event.preventDefault();
    const question = textQuestion.trim();
    if (!question || isResponding) return;
    setTextQuestion('');
    void answerCustomer(question);
  };

  const openOrder = (product: AgentProduct) => {
    if (!store.isActive) {
      setHint(bi('La boutique est en pause et ne prend pas de demandes.', 'المتجر متوقف مؤقتاً وما يستقبلش الطلبات.'));
      return;
    }
    orderRequestIdRef.current = makeRequestId();
    setOrderProduct(product);
    setOrderSaved(false);
    setOrderForm({ name: '', phone: '', wilaya: '', size: product.sizes[0] || '', quantity: 1 });
  };

  const updateOrderForm = (patch: Partial<typeof orderForm>) => {
    orderRequestIdRef.current = makeRequestId();
    setOrderForm((current) => ({ ...current, ...patch }));
  };

  const updateOrderQuantity = (update: (quantity: number) => number) => {
    orderRequestIdRef.current = makeRequestId();
    setOrderForm((current) => ({ ...current, quantity: update(current.quantity) }));
  };

  const submitOrder = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!orderProduct || !orderForm.name.trim() || !orderForm.phone.trim() || !orderForm.wilaya.trim() || isResponding) return;
    const quantity = Math.min(Math.max(1, orderForm.quantity), Math.max(1, orderProduct.stock));
    if (!orderRequestIdRef.current) orderRequestIdRef.current = makeRequestId();
    const requestId = orderRequestIdRef.current;
    if (isDemoPreview) {
      const order: AgentOrder = {
        id: makeAgentId('cmd'),
        createdAt: new Date().toISOString(),
        customerName: orderForm.name.trim(),
        phone: orderForm.phone.trim(),
        wilaya: orderForm.wilaya.trim(),
        productId: orderProduct.id,
        productName: orderProduct.name,
        size: orderForm.size,
        quantity,
        amountDzd: orderProduct.priceDzd * quantity,
        status: 'new',
      };
      const latest = readAgentStore();
      const updatedStore = {
        ...latest,
        orders: [order, ...latest.orders],
        products: latest.products.map((product) => product.id === orderProduct.id ? { ...product, stock: Math.max(0, product.stock - quantity) } : product),
      };
      saveAgentStore(updatedStore);
      setStore(updatedStore);
      setOrderSaved(true);
      setMessages((current) => [...current,
        { id: makeAgentId('msg'), role: 'customer', text: bi(`Demande envoyée pour ${orderProduct.name}.`, `تم إرسال طلب ${orderProduct.name}.`) },
        { id: makeAgentId('msg'), role: 'assistant', text: bi('Aperçu de démonstration : cette demande reste dans ce navigateur et n’est pas transmise à la boutique.', 'معاينة تجريبية: الطلب يبقى في هذا المتصفح وما يتبعثش للمتجر.') },
      ]);
      return;
    }

    setIsResponding(true);
    setHint(bi('Envoi de votre demande à la boutique…', 'جاري إرسال طلبك للمتجر…'));
    try {
      const response = await fetch(`${API_BASE_URL}/api/agent/sawtify/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          requestId,
          customerName: orderForm.name.trim(),
          phone: orderForm.phone.trim(),
          wilaya: orderForm.wilaya.trim(),
          productId: orderProduct.id,
          size: orderForm.size,
          quantity,
        }),
      });
      const body = await response.json();
      if (!response.ok || !body.success || !body.order) throw new Error(body.error || bi('La demande n’a pas pu être envoyée.', 'ما قدرناش نبعثو الطلب.'));
      setStore((current) => ({
        ...current,
        products: current.products.map((product) => product.id === orderProduct.id && body.product_stock_remaining !== null && body.product_stock_remaining !== undefined && Number.isFinite(Number(body.product_stock_remaining))
          ? { ...product, stock: Number(body.product_stock_remaining) }
          : product),
      }));
      setOrderSaved(true);
      setHint('');
      setMessages((current) => [...current,
        { id: makeAgentId('msg'), role: 'customer', text: bi(`Demande envoyée pour ${orderProduct.name}.`, `تم إرسال طلب ${orderProduct.name}.`) },
        { id: makeAgentId('msg'), role: 'assistant', text: bi('Merci ! Votre demande est transmise à la boutique. Elle vous recontactera pour confirmer les détails.', 'يعطيك الصحة! وصل طلبك للمتجر، ويتصل بيك باش يأكد التفاصيل.') },
      ]);
    } catch (error: any) {
      setHint(error?.message || bi('La demande n’a pas pu être envoyée.', 'ما قدرناش نبعثو الطلب.'));
    } finally {
      setIsResponding(false);
    }
  };

  const openBusinessRequest = (requestType: AgentRequestType, title = '') => {
    if (!store.isActive) {
      setHint(bi('Cette activité est en pause et ne prend pas de demandes.', 'هذا النشاط متوقف مؤقتاً وما يستقبلش الطلبات.'));
      return;
    }
    businessRequestIdRef.current = makeRequestId();
    setBusinessRequestType(requestType);
    setBusinessRequestSaved(false);
    setBusinessRequestError('');
    setBusinessRequestForm({ name: '', phone: '', wilaya: '', title: title || requestTypeLabel(requestType, isArabic), details: '', preferredAt: '', preferredUntil: '', partySize: 2 });
  };

  const updateBusinessRequestForm = (patch: Partial<RequestForm>) => {
    businessRequestIdRef.current = makeRequestId();
    setBusinessRequestForm((current) => ({ ...current, ...patch }));
  };

  const submitBusinessRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!businessRequestType || !businessRequestForm.name.trim() || !businessRequestForm.phone.trim() || !businessRequestForm.wilaya.trim() || !businessRequestForm.title.trim() || isResponding) return;
    const preferredAt = businessRequestForm.preferredAt ? new Date(businessRequestForm.preferredAt) : null;
    const preferredUntil = businessRequestForm.preferredUntil ? new Date(businessRequestForm.preferredUntil) : null;
    const isStayBooking = businessRequestType === 'reservation' && store.sector === 'hospitality';
    if ((businessRequestForm.preferredAt && (!preferredAt || !Number.isFinite(preferredAt.getTime())))
        || (businessRequestForm.preferredUntil && (!preferredUntil || !Number.isFinite(preferredUntil.getTime())))) {
      setBusinessRequestError(bi('Vérifiez les dates et heures choisies.', 'تأكّد من التواريخ والأوقات اللي اخترتهم.'));
      return;
    }
    if (isStayBooking && (!preferredAt || !preferredUntil || preferredUntil <= preferredAt)) {
      setBusinessRequestError(bi('Pour un séjour, indiquez une arrivée puis un départ ultérieur.', 'لحجز الإقامة، حدّد الوصول ثم المغادرة في وقت لاحق.'));
      return;
    }
    setBusinessRequestError('');
    if (!businessRequestIdRef.current) businessRequestIdRef.current = makeRequestId();
    const requestId = businessRequestIdRef.current;
    const details = store.sector === 'health' ? '' : businessRequestType === 'reservation' && (store.sector === 'restaurant' || store.sector === 'hospitality')
      ? `${bi('Nombre de personnes', 'عدد الأشخاص')}: ${Math.min(30, Math.max(1, businessRequestForm.partySize))}${businessRequestForm.details.trim() ? ` · ${businessRequestForm.details.trim()}` : ''}`
      : businessRequestForm.details.trim();

    setIsResponding(true);
    setHint(bi('Envoi de votre demande…', 'جاري إرسال طلبك…'));
    try {
      if (isDemoPreview) {
        const request: AgentOrder = {
          id: makeAgentId('req'),
          createdAt: new Date().toISOString(),
          customerName: businessRequestForm.name.trim(),
          phone: businessRequestForm.phone.trim(),
          wilaya: businessRequestForm.wilaya.trim(),
          productId: `request-${businessRequestType}`,
          productName: businessRequestForm.title.trim(),
          size: '',
          quantity: 1,
          amountDzd: 0,
          status: 'new',
          requestType: businessRequestType,
          details,
          preferredAt: preferredAt?.toISOString() || null,
          preferredUntil: preferredUntil?.toISOString() || null,
        };
        const latest = readAgentStore();
        const updatedStore = { ...latest, orders: [request, ...latest.orders] };
        saveAgentStore(updatedStore);
        setStore(updatedStore);
        setBusinessRequestSaved(true);
        setMessages((current) => [...current,
          { id: makeAgentId('msg'), role: 'customer', text: request.productName },
          { id: makeAgentId('msg'), role: 'assistant', text: bi('Aperçu de démonstration : la demande reste dans ce navigateur et n’entraîne aucun débit.', 'معاينة تجريبية: الطلب يبقى في هذا المتصفح وما يخصم حتى رصيد.') },
        ]);
        setHint('');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/agent/sawtify/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          requestId,
          customerName: businessRequestForm.name.trim(),
          phone: businessRequestForm.phone.trim(),
          wilaya: businessRequestForm.wilaya.trim(),
          requestType: businessRequestType,
          title: businessRequestForm.title.trim(),
          details,
          preferredAt: preferredAt?.toISOString() || '',
          preferredUntil: preferredUntil?.toISOString() || '',
        }),
      });
      const body = await response.json();
      if (!response.ok || !body.success || !body.order) throw new Error(body.error || bi('Impossible d’envoyer la demande.', 'ما قدرناش نبعثو الطلب.'));
      setBusinessRequestSaved(true);
      setHint('');
      setMessages((current) => [...current,
        { id: makeAgentId('msg'), role: 'customer', text: businessRequestForm.title.trim() },
        { id: makeAgentId('msg'), role: 'assistant', text: bi('Merci. Votre demande a été transmise ; l’activité vous recontactera pour confirmer.', 'يعطيك الصحة. وصل طلبك، ويتصلو بيك باش يأكدو التفاصيل.') },
      ]);
    } catch (error: any) {
      const message = error?.message || bi('Impossible d’envoyer la demande.', 'ما قدرناش نبعثو الطلب.');
      setBusinessRequestError(message);
      setHint(message);
    } finally {
      setIsResponding(false);
    }
  };

  const questions = isArabic
    ? ['بشحال Sneakers Atlas؟', 'توصلو لوهران؟', 'واش كاين المقاس 40؟']
    : ['Combien coûte Sneakers Atlas ?', 'Vous livrez à Oran ?', 'La taille 40 est disponible ?'];

  if (storeLoading) return <main className="saw-app-background flex min-h-screen items-center justify-center p-6 text-center text-sm font-semibold text-slate-600">{bi('Chargement de la boutique…', 'جاري تحميل المتجر…')}</main>;
  if (storeError) return <main className="saw-app-background flex min-h-screen items-center justify-center p-6"><section className="max-w-lg rounded-3xl border border-amber-200 bg-white p-7 text-center shadow-lg"><Store className="mx-auto h-8 w-8 text-violet-700" /><h1 className="mt-3 text-lg font-black text-slate-900">{bi('Boutique introuvable', 'المتجر غير موجود')}</h1><p role="status" className="mt-2 text-sm leading-6 text-slate-600">{storeError}</p><a href="/agent-ai" className="mt-5 inline-flex rounded-xl bg-violet-700 px-4 py-2.5 text-xs font-bold text-white">{bi('Découvrir Agent Sawtify', 'اكتشف Agent Sawtify')}</a></section></main>;

  return (
    <main className="saw-app-background min-h-screen px-3 pb-8 pt-3 text-slate-900 sm:px-6 sm:pt-5" dir={isArabic ? 'rtl' : 'ltr'} style={{ fontFamily: isArabic ? 'var(--font-sans-arabic)' : "'Sora', var(--font-sans-latin)" }}>
      <Helmet>
        <title>{bi(`Parler avec ${store.name} · Sawtify`, `تواصل مع ${store.name} · Sawtify`)}</title>
        <meta name="description" content={bi(`Découvrez ${store.name} et posez vos questions directement à son assistant.`, `اكتشف ${store.name} واسأل المساعد مباشرة.`)} />
      </Helmet>
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-amber-950">
          <p className="flex items-start gap-2 text-[11px] leading-5 sm:text-xs"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /><span><strong>{isDemoPreview ? bi('Démo vocale.', 'معاينة صوتية.') : bi('Assistant vocal.', 'مساعد صوتي.')}</strong> {isDemoPreview
            ? bi('Les demandes de démonstration restent dans ce navigateur et ne sont pas envoyées à la boutique.', 'طلبات المعاينة تبقى في هذا المتصفح وما تتبعثش للمتجر.')
            : bi('Les commandes, rendez-vous, devis et réservations sont transmis à cette activité. Les échanges restent dans ce navigateur ; seule une durée d’usage estimée est enregistrée, pas le contenu des conversations.', 'الطلبات والمواعيد وعروض الأسعار والحجوزات تتبعث لهذا النشاط. المحادثات تبقى في هذا المتصفح؛ نسجلو غير مدة استعمال تقديرية، ماشي محتوى المحادثة.')}</span></p>
          <a href="/agent-sawtify" className="shrink-0 rounded-xl border border-amber-300 bg-white/75 px-3 py-2 text-[10px] font-extrabold text-amber-900 transition hover:bg-white">{bi('Espace vendeur', 'مساحة التاجر')}</a>
        </div>

        <header className="mb-4 flex items-center justify-between gap-3 rounded-[22px] border border-white/80 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-xl sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-700 to-fuchsia-500 text-white shadow-md shadow-violet-300/40"><AudioLines className="h-5 w-5" /></span>
            <div className="min-w-0"><p className="truncate text-sm font-black text-slate-950">{store.name}</p><p className="truncate text-[10px] font-semibold text-slate-500">{store.category || sectorName}{store.location ? ` · ${store.location}` : ''}</p></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
              <button type="button" onClick={() => setLanguage('fr')} className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold ${language === 'fr' ? 'bg-violet-700 text-white' : 'text-slate-500 hover:bg-violet-50'}`}>FR</button>
              <button type="button" onClick={() => setLanguage('ar')} className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold ${language === 'ar' ? 'bg-violet-700 text-white' : 'text-slate-500 hover:bg-violet-50'}`}>دارجة</button>
            </div>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-bold ${store.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}><span className={`h-1.5 w-1.5 rounded-full ${store.isActive ? 'animate-pulse bg-emerald-500' : 'bg-slate-400'}`} />{store.isActive ? bi('Disponible', 'متاح') : bi('En pause', 'متوقف')}</span>
          </div>
        </header>

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,.75fr)]">
          <section className="saw-glass overflow-hidden rounded-[28px]">
            <div className="flex items-center justify-between gap-3 border-b border-violet-100/70 bg-white/55 px-4 py-4 sm:px-6">
              <div className="flex items-center gap-3"><span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-700 to-fuchsia-500 text-white shadow-lg shadow-violet-300/35"><Bot className="h-5 w-5" /><span className={`absolute -bottom-1 -end-1 h-3.5 w-3.5 rounded-full border-2 border-white ${store.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} /></span><div><p className="text-[10px] font-black uppercase tracking-[.15em] text-violet-700">{bi('Agent Sawtify', 'مساعد Sawtify')}</p><p className="text-sm font-extrabold text-slate-950">{bi('Votre assistant', 'مساعدك')}</p></div></div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1.5 text-[10px] font-bold text-violet-800"><CheckCircle2 className="h-3.5 w-3.5" />{bi('Accès direct', 'دخول مباشر')}</span>
            </div>

            <div className="flex min-h-[440px] flex-col px-4 py-5 sm:min-h-[500px] sm:px-6">
              <div className="flex-1 space-y-4">
                <div className="flex items-end gap-2"><span className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700"><Bot className="h-4 w-4" /></span><div className="max-w-[88%] rounded-[20px] rounded-bs-sm border border-violet-100 bg-white px-4 py-3 text-sm leading-6 text-slate-700 shadow-sm">{greeting}</div></div>
                {messages.map((message) => (
                  <div key={message.id} className={`flex items-end gap-2 ${message.role === 'customer' ? 'justify-end' : ''}`}>
                    {message.role === 'assistant' && <span className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700"><Bot className="h-4 w-4" /></span>}
                    <div className={`max-w-[88%] rounded-[20px] px-4 py-3 text-sm leading-6 shadow-sm ${message.role === 'assistant' ? 'rounded-bs-sm border border-violet-100 bg-white text-slate-700' : 'rounded-be-sm bg-violet-700 text-white'}`}>{message.text}</div>
                  </div>
                ))}
                {isSpeaking && <div className="ms-9 flex items-center gap-2 text-[10px] font-semibold text-violet-700"><Volume2 className="h-3.5 w-3.5 animate-pulse" />{bi('Réponse vocale en cours…', 'المساعد راه يجاوب بالصوت…')}</div>}
                <div ref={conversationEndRef} />
              </div>

              <div className="mt-6 border-t border-violet-100/70 pt-4">
                <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[.13em] text-slate-500">{bi('Essayez une question', 'جرّب سؤال')}</p>
                <div className="flex flex-wrap gap-2">
                  {questions.map((question) => <button key={question} type="button" disabled={isResponding} onClick={() => void answerCustomer(question)} className="rounded-full border border-violet-200 bg-white px-3 py-2 text-[10px] font-bold text-violet-800 transition hover:border-violet-400 hover:bg-violet-50 disabled:cursor-wait disabled:opacity-50">{question}</button>)}
                </div>
                {hint && <p role="status" className={`mt-3 text-xs font-semibold ${isListening ? 'text-violet-700' : 'text-slate-500'}`}>{hint}</p>}
                <form onSubmit={submitTextQuestion} className="mt-4 flex items-center gap-2">
                  <input value={textQuestion} onChange={(event) => setTextQuestion(event.target.value)} disabled={isResponding} maxLength={1200} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:bg-slate-50" placeholder={bi('Écrivez votre question…', 'اكتب سؤالك…')} aria-label={bi('Votre question', 'سؤالك')} />
                  <button type="submit" disabled={isResponding || !textQuestion.trim()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-700 text-white transition hover:bg-violet-600 disabled:cursor-wait disabled:opacity-50" aria-label={bi('Envoyer la question', 'أرسل السؤال')}><Send className="h-4 w-4" /></button>
                </form>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="text-[10px] leading-4 text-slate-400">{bi('Le micro essaie de démarrer automatiquement. Vous pouvez aussi écrire.', 'نحاولو نشغلو الميكرو تلقائياً. تقدر تكتب كذلك.')}</div>
                  <button type="button" disabled={isResponding || !store.isActive} onClick={isListening ? stopListening : startListening} className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow-lg transition active:scale-95 disabled:cursor-wait disabled:opacity-60 ${isListening ? 'animate-pulse bg-rose-600 shadow-rose-200' : 'bg-violet-700 shadow-violet-300/50 hover:bg-violet-600'}`} aria-label={isListening ? bi('Arrêter le micro', 'أوقف الميكرو') : bi('Parler à l’assistant', 'اهدر مع المساعد')}>
                    {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <section className="saw-glass rounded-[26px] p-4 sm:p-5">
              <div className="mb-4 flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.15em] text-violet-700">{sectorName}</p><h2 className="mt-1 text-base font-black text-slate-950">{store.name}</h2><p className="mt-1 text-xs text-slate-500">{store.category || sectorName}{store.location ? ` · ${store.location}` : ''}</p></div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><Store className="h-5 w-5" /></span></div>
              <div className="flex flex-wrap gap-2 text-[10px] font-bold text-slate-600"><span className="rounded-full bg-white px-2.5 py-1.5">{bi('Français', 'الفرنسية')}</span><span className="rounded-full bg-white px-2.5 py-1.5">الدارجة</span><span className="rounded-full bg-white px-2.5 py-1.5">{bi('Sans inscription', 'بلا تسجيل')}</span></div>
            </section>

            {isCommerce ? (
              <section className="saw-glass rounded-[26px] p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-3"><div><h2 className="text-sm font-black text-slate-950">{bi('Les produits', 'المنتجات')}</h2><p className="mt-1 text-[10px] text-slate-500">{bi('Demandez un article ou sa disponibilité.', 'اطلب منتج ولا اسأل على التوفر.')}</p></div><span className="rounded-full bg-violet-100 px-2 py-1 text-[10px] font-bold text-violet-800">{availableProducts.length}</span></div>
                <div className="space-y-2.5">
                  {availableProducts.length ? availableProducts.map((product) => (
                    <article key={product.id} className="rounded-2xl border border-slate-100 bg-white/90 p-3">
                      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-xs font-extrabold text-slate-900">{product.name}</h3><p className="mt-1 text-[10px] leading-4 text-slate-500">{product.stock > 0 ? `${product.stock} ${bi('en stock', 'في المخزون')}` : bi('Rupture de stock', 'نفد المخزون')}{product.sizes.length ? ` · ${product.sizes.join(', ')}` : ''}</p></div><span className="shrink-0 text-xs font-black text-violet-800">{formatMoney(product.priceDzd, isArabic)}</span></div>
                      {product.stock > 0 && store.isActive && <button type="button" onClick={() => openOrder(product)} className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-violet-50 px-3 py-2 text-[10px] font-extrabold text-violet-800 transition hover:bg-violet-100">{bi('Demander cet article', 'اطلب هذا المنتج')}<ChevronRight className="h-3.5 w-3.5" /></button>}
                    </article>
                  )) : <div className="rounded-2xl bg-white/75 px-4 py-6 text-center text-xs text-slate-500">{bi('Aucun produit pour le moment.', 'ما كاين حتى منتج حالياً.')}</div>}
                </div>
              </section>
            ) : (
              <>
                <section className="saw-glass rounded-[26px] p-4 sm:p-5">
                  <div className="mb-3 flex items-center justify-between gap-3"><div><h2 className="text-sm font-black text-slate-950">{bi('Offres et prestations', 'العروض والخدمات')}</h2><p className="mt-1 text-[10px] text-slate-500">{bi('Choisissez une offre pour préparer votre demande.', 'اختار عرض باش تحضّر طلبك.')}</p></div><span className="rounded-full bg-violet-100 px-2 py-1 text-[10px] font-bold text-violet-800">{availableProducts.length}</span></div>
                  <div className="space-y-2.5">{availableProducts.length ? availableProducts.map((product) => {
                    const defaultType = availableRequestTypes[0];
                    return <article key={product.id} className="rounded-2xl border border-slate-100 bg-white/90 p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-xs font-extrabold text-slate-900">{product.name}</h3><p className="mt-1 text-[10px] leading-4 text-slate-500">{product.description || product.category || sectorName}</p></div><span className="shrink-0 text-xs font-black text-violet-800">{product.priceDzd > 0 ? formatMoney(product.priceDzd, isArabic) : bi('Sur devis', 'حسب الطلب')}</span></div>{store.isActive && defaultType && <button type="button" onClick={() => openBusinessRequest(defaultType, product.name)} className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-violet-50 px-3 py-2 text-[10px] font-extrabold text-violet-800 transition hover:bg-violet-100">{requestTypeLabel(defaultType, isArabic)}<ChevronRight className="h-3.5 w-3.5" /></button>}</article>;
                  }) : <div className="rounded-2xl bg-white/75 px-4 py-6 text-center text-xs text-slate-500">{bi('Aucune offre renseignée pour le moment.', 'مازال ما كاين حتى عرض.')}</div>}</div>
                </section>
                <section className="saw-glass rounded-[26px] p-4 sm:p-5"><div className="mb-3"><h2 className="text-sm font-black text-slate-950">{bi('Faire une demande', 'أرسل طلباً')}</h2><p className="mt-1 text-[10px] text-slate-500">{store.sector === 'health' ? bi('Uniquement pour un rendez-vous : aucun diagnostic ni prescription.', 'لحجز موعد فقط: بلا تشخيص ولا وصفة طبية.') : bi('Votre demande sera confirmée directement par l’activité.', 'النشاط يأكد معاك الطلب مباشرة.')}</p></div><div className="grid gap-2">{availableRequestTypes.map((type) => <button key={type} type="button" disabled={!store.isActive} onClick={() => openBusinessRequest(type)} className="inline-flex w-full items-center justify-between rounded-xl border border-violet-100 bg-white px-3 py-2.5 text-start text-[11px] font-extrabold text-violet-800 transition hover:bg-violet-50 disabled:opacity-50"><span>{requestTypeLabel(type, isArabic)}</span><ChevronRight className="h-3.5 w-3.5" /></button>)}</div></section>
              </>
            )}

            <section className="saw-glass rounded-[26px] p-4 sm:p-5">
              <div className="mb-3 flex items-center gap-2"><CircleHelp className="h-4 w-4 text-violet-700" /><h2 className="text-sm font-black text-slate-950">{bi('Infos pratiques', 'معلومات مفيدة')}</h2></div>
              <ul className="space-y-2.5">
                {availableFaqs.slice(0, 3).map((faq) => <li key={faq.id} className="flex gap-2 text-[11px] leading-5 text-slate-600"><Check className="mt-1 h-3 w-3 shrink-0 text-emerald-600" /><span><strong className="text-slate-800">{faq.question}</strong><br />{faq.answer}</span></li>)}
                {!availableFaqs.length && <li className="text-xs text-slate-500">{bi('La boutique peut ajouter ses réponses depuis son espace.', 'المتجر يقدر يضيف أجوبته من المساحة تاعو.')}</li>}
              </ul>
            </section>

            <div className="rounded-2xl border border-white/90 bg-white/65 px-4 py-3 text-[10px] leading-4 text-slate-500"><span className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />{bi('Votre demande sera vérifiée directement avec la boutique avant confirmation.', 'المتجر يأكد معاك الطلب قبل ما يتسجل نهائياً.')}</span></div>
          </aside>
        </div>

        <footer className="mt-5 flex flex-col items-center justify-between gap-3 text-center text-[10px] font-medium text-slate-400 sm:flex-row sm:text-start"><span>© {new Date().getFullYear()} Sawtify · {bi('Une voix proche de vous.', 'صوت قريب ليك.')}</span><a href="/agent-sawtify" className="inline-flex items-center gap-1 text-violet-700 hover:text-violet-900">{bi('Découvrir Agent Sawtify', 'اكتشف Agent Sawtify')} <ChevronRight className="h-3 w-3" /></a></footer>
      </div>

      {orderProduct && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOrderProduct(null); }}>
          <section role="dialog" aria-modal="true" aria-label={bi('Demander un article', 'طلب منتج')} dir={isArabic ? 'rtl' : 'ltr'} className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[28px] border border-white bg-white p-5 shadow-2xl sm:rounded-[28px] sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-3"><div><span className="text-[10px] font-black uppercase tracking-[.15em] text-violet-700">{bi('Votre demande', 'طلبك')}</span><h2 className="mt-1 text-lg font-black text-slate-950">{orderSaved ? bi('Demande enregistrée !', 'تم تسجيل الطلب!') : orderProduct.name}</h2><p className="mt-1 text-xs text-slate-500">{orderSaved ? isDemoPreview
              ? bi('Demande de démonstration enregistrée dans ce navigateur.', 'تم حفظ طلب المعاينة في هذا المتصفح.')
              : bi('Demande transmise à la boutique; elle vous contactera pour confirmer.', 'تم إرسال الطلب للمتجر، ويتصل بيك باش يأكد التفاصيل.')
              : `${formatMoney(orderProduct.priceDzd, isArabic)} · ${orderProduct.stock} ${bi('disponibles', 'متوفر')}`}</p></div><button type="button" onClick={() => setOrderProduct(null)} className="rounded-xl bg-slate-100 p-2 text-slate-500 hover:bg-slate-200" aria-label={bi('Fermer', 'إغلاق')}><X className="h-4 w-4" /></button></div>
            {orderSaved ? <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-6 w-6" /></span><p className="mt-3 text-sm font-extrabold text-emerald-900">{bi('Merci ! Votre demande est bien notée.', 'يعطيك الصحة! تسجّل طلبك.')}</p><button type="button" onClick={() => setOrderProduct(null)} className="mt-4 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-800">{bi('Terminé', 'تم')}</button></div> : (
              <form onSubmit={submitOrder} className="space-y-3">
                <label className="block"><span className="mb-1.5 block text-[11px] font-bold text-slate-700">{bi('Votre nom *', 'اسمك *')}</span><input required maxLength={80} value={orderForm.name} onChange={(event) => updateOrderForm({ name: event.target.value })} className={formInput} placeholder={bi('Ex. Yasmine B.', 'مثال: ياسمين')} /></label>
                <div className="grid gap-3 sm:grid-cols-2"><label className="block"><span className="mb-1.5 block text-[11px] font-bold text-slate-700">{bi('Téléphone *', 'رقم الهاتف *')}</span><input required type="tel" inputMode="tel" maxLength={20} value={orderForm.phone} onChange={(event) => updateOrderForm({ phone: event.target.value })} className={formInput} placeholder="05 00 00 00 00" /></label><label className="block"><span className="mb-1.5 block text-[11px] font-bold text-slate-700">{bi('Wilaya *', 'الولاية *')}</span><input required maxLength={40} value={orderForm.wilaya} onChange={(event) => updateOrderForm({ wilaya: event.target.value })} className={formInput} placeholder={bi('Oran', 'وهران')} /></label></div>
                <div className="grid gap-3 sm:grid-cols-2"><label className="block"><span className="mb-1.5 block text-[11px] font-bold text-slate-700">{bi('Taille / variante', 'المقاس / الخيار')}</span>{orderProduct.sizes.length ? <select value={orderForm.size} onChange={(event) => updateOrderForm({ size: event.target.value })} className={formInput}>{orderProduct.sizes.map((size) => <option key={size} value={size}>{size}</option>)}</select> : <input value={orderForm.size} onChange={(event) => updateOrderForm({ size: event.target.value })} className={formInput} placeholder="—" />}</label><label className="block"><span className="mb-1.5 block text-[11px] font-bold text-slate-700">{bi('Quantité', 'الكمية')}</span><span className="flex items-center gap-2"><button type="button" onClick={() => updateOrderQuantity((quantity) => Math.max(1, quantity - 1))} className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50" aria-label={bi('Réduire', 'نقص')}><Minus className="h-4 w-4" /></button><input type="number" min="1" max={Math.max(1, orderProduct.stock)} value={orderForm.quantity} onChange={(event) => updateOrderForm({ quantity: Math.min(Math.max(1, Number(event.target.value) || 1), Math.max(1, orderProduct.stock)) })} className={`${formInput} text-center`} /><button type="button" onClick={() => updateOrderQuantity((quantity) => Math.min(Math.max(1, orderProduct.stock), quantity + 1))} className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50" aria-label={bi('Augmenter', 'زيد')}><Plus className="h-4 w-4" /></button></span></label></div>
                <div className="rounded-xl bg-violet-50 px-3.5 py-3 text-xs"><div className="flex items-center justify-between text-slate-600"><span>{bi('Sous-total', 'المجموع')}</span><strong className="text-sm font-black text-violet-900">{formatMoney(orderProduct.priceDzd * orderForm.quantity, isArabic)}</strong></div><p className="mt-1 text-[10px] text-slate-500">{bi('Le montant final sera confirmé par la boutique.', 'السعر النهائي يأكدو المتجر.')}</p></div>
                <button type="submit" disabled={isResponding} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-violet-600 disabled:cursor-wait disabled:opacity-60"><Phone className="h-4 w-4" />{isResponding ? bi('Envoi…', 'جاري الإرسال…') : bi('Envoyer ma demande', 'ابعث طلبي')}</button>
              </form>
            )}
          </section>
        </div>
      )}

      {businessRequestType && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setBusinessRequestType(null); }}>
          <section role="dialog" aria-modal="true" aria-label={requestTypeLabel(businessRequestType, isArabic)} dir={isArabic ? 'rtl' : 'ltr'} className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[28px] border border-white bg-white p-5 shadow-2xl sm:rounded-[28px] sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-3"><div><span className="text-[10px] font-black uppercase tracking-[.15em] text-violet-700">{requestTypeLabel(businessRequestType, isArabic)}</span><h2 className="mt-1 text-lg font-black text-slate-950">{businessRequestSaved ? bi('Demande envoyée !', 'تم إرسال الطلب!') : businessRequestForm.title}</h2><p className="mt-1 text-xs text-slate-500">{businessRequestSaved ? bi('L’activité vous recontactera pour confirmer.', 'النشاط يرجعلك باش يأكد التفاصيل.') : bi('Remplissez ces quelques informations pour transmettre votre demande.', 'عمّر هاذ المعلومات باش تبعث طلبك.')}</p></div><button type="button" onClick={() => setBusinessRequestType(null)} className="rounded-xl bg-slate-100 p-2 text-slate-500 hover:bg-slate-200" aria-label={bi('Fermer', 'إغلاق')}><X className="h-4 w-4" /></button></div>
            {businessRequestSaved ? (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-6 w-6" /></span><p className="mt-3 text-sm font-extrabold text-emerald-900">{bi('Merci, votre demande a bien été transmise.', 'يعطيك الصحة، وصل طلبك.')}</p><button type="button" onClick={() => setBusinessRequestType(null)} className="mt-4 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-800">{bi('Terminé', 'تم')}</button></div>
            ) : (
              <form onSubmit={submitBusinessRequest} className="space-y-3">
                <label className="block"><span className="mb-1.5 block text-[11px] font-bold text-slate-700">{store.sector === 'health' ? bi('Service souhaité *', 'الخدمة المطلوبة *') : bi('Sujet de la demande *', 'موضوع الطلب *')}</span><input required maxLength={120} value={businessRequestForm.title} onChange={(event) => updateBusinessRequestForm({ title: event.target.value })} className={formInput} /></label>
                <div className="grid gap-3 sm:grid-cols-2"><label className="block"><span className="mb-1.5 block text-[11px] font-bold text-slate-700">{bi('Votre nom *', 'اسمك *')}</span><input required maxLength={80} value={businessRequestForm.name} onChange={(event) => updateBusinessRequestForm({ name: event.target.value })} className={formInput} placeholder={bi('Ex. Yasmine B.', 'مثال: ياسمين')} /></label><label className="block"><span className="mb-1.5 block text-[11px] font-bold text-slate-700">{bi('Téléphone *', 'رقم الهاتف *')}</span><input required type="tel" inputMode="tel" maxLength={24} value={businessRequestForm.phone} onChange={(event) => updateBusinessRequestForm({ phone: event.target.value })} className={formInput} placeholder="05 00 00 00 00" /></label></div>
                <div className="grid gap-3 sm:grid-cols-2"><label className="block"><span className="mb-1.5 block text-[11px] font-bold text-slate-700">{bi('Ville / wilaya *', 'المدينة / الولاية *')}</span><input required maxLength={50} value={businessRequestForm.wilaya} onChange={(event) => updateBusinessRequestForm({ wilaya: event.target.value })} className={formInput} placeholder={bi('Oran', 'وهران')} /></label><label className="block"><span className="mb-1.5 block text-[11px] font-bold text-slate-700">{businessRequestType === 'reservation' && store.sector === 'hospitality' ? bi('Arrivée souhaitée *', 'تاريخ الوصول *') : bi('Date et heure souhaitées', 'التاريخ والوقت المطلوبان')}</span><input type={businessRequestType === 'reservation' && store.sector === 'hospitality' ? 'date' : 'datetime-local'} required={businessRequestType === 'reservation' && store.sector === 'hospitality'} value={businessRequestForm.preferredAt} onChange={(event) => updateBusinessRequestForm({ preferredAt: event.target.value })} className={formInput} /></label>{businessRequestType === 'reservation' && store.sector === 'hospitality' && <label className="block"><span className="mb-1.5 block text-[11px] font-bold text-slate-700">{bi('Départ souhaité *', 'تاريخ المغادرة *')}</span><input type="date" required min={businessRequestForm.preferredAt || undefined} value={businessRequestForm.preferredUntil} onChange={(event) => updateBusinessRequestForm({ preferredUntil: event.target.value })} className={formInput} /></label>}</div>
                {businessRequestType === 'reservation' && (store.sector === 'restaurant' || store.sector === 'hospitality') && <label className="block"><span className="mb-1.5 block text-[11px] font-bold text-slate-700">{bi('Nombre de personnes', 'عدد الأشخاص')}</span><input type="number" min="1" max="30" value={businessRequestForm.partySize} onChange={(event) => updateBusinessRequestForm({ partySize: Math.min(30, Math.max(1, Number(event.target.value) || 1)) })} className={formInput} /></label>}
                {store.sector === 'health' ? (
                  <p className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[11px] leading-5 text-amber-900"><ShieldCheck className="me-1.5 inline h-4 w-4 align-[-3px]" />{bi('Ne saisissez aucun symptôme ni détail médical. Cet espace sert uniquement à organiser un rendez-vous ; aucun diagnostic ni traitement ne sera fourni.', 'ما تكتب حتى أعراض ولا تفاصيل طبية. الاستمارة غير لتنظيم موعد؛ ما كاين لا تشخيص لا علاج.')}</p>
                ) : (
                  <label className="block"><span className="mb-1.5 block text-[11px] font-bold text-slate-700">{store.sector === 'hospitality' && businessRequestType === 'room_service' ? bi('Détails de la demande (sans données de paiement)', 'تفاصيل الطلب (بلا معلومات الدفع)') : bi('Précisions (facultatif)', 'تفاصيل إضافية (اختياري)')}</span><textarea maxLength={500} rows={3} value={businessRequestForm.details} onChange={(event) => updateBusinessRequestForm({ details: event.target.value })} className={`${formInput} resize-y`} placeholder={store.sector === 'hospitality' && businessRequestType === 'room_service' ? bi('Ex. numéro de chambre et service souhaité', 'مثال: رقم الغرفة والخدمة المطلوبة') : bi('Ajoutez une précision utile…', 'أضف معلومة مفيدة…')} /></label>
                )}
                {businessRequestError && <p role="alert" className="text-xs font-semibold text-rose-600">{businessRequestError}</p>}
                <button type="submit" disabled={isResponding} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-violet-600 disabled:cursor-wait disabled:opacity-60"><Phone className="h-4 w-4" />{isResponding ? bi('Envoi…', 'جاري الإرسال…') : bi('Envoyer ma demande', 'ابعث طلبي')}</button>
              </form>
            )}
          </section>
        </div>
      )}
    </main>
  );
};

const formInput = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100';
