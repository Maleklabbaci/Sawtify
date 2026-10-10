import React, { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  AudioLines, CheckCircle2, Headphones, Mic, MicOff, Minus, MessageSquareText,
  Phone, Plus, ShieldCheck, Store, Volume2, X,
} from 'lucide-react';
import { API_BASE_URL } from '../config/apiBase';
import { answerAgentQuestion } from '../services/agentReply';
import { isSupabaseConfigured, supabase } from '../services/supabaseClient';
import type { AgentLiveSession } from '../services/agentLive';
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
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLiveSession, setIsLiveSession] = useState(false);
  const [hint, setHint] = useState('');
  const [caption, setCaption] = useState('');
  const [textQuestion, setTextQuestion] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [showManualOptions, setShowManualOptions] = useState(false);
  const [orderProduct, setOrderProduct] = useState<AgentProduct | null>(null);
  const [orderSaved, setOrderSaved] = useState(false);
  const [orderForm, setOrderForm] = useState({ name: '', phone: '', wilaya: '', size: '', quantity: 1 });
  const [businessRequestType, setBusinessRequestType] = useState<AgentRequestType | null>(null);
  const [businessRequestSaved, setBusinessRequestSaved] = useState(false);
  const [businessRequestError, setBusinessRequestError] = useState('');
  const [businessRequestForm, setBusinessRequestForm] = useState<RequestForm>({ name: '', phone: '', wilaya: '', title: '', details: '', preferredAt: '', preferredUntil: '', partySize: 2 });
  const recognitionRef = useRef<BrowserRecognition | null>(null);
  const liveConnectionRef = useRef<AgentLiveSession | null>(null);
  const liveConnectingRef = useRef(false);
  const componentMountedRef = useRef(false);
  const storeRef = useRef(store);
  const languageRef = useRef(language);
  const orderRequestIdRef = useRef('');
  const businessRequestIdRef = useRef('');
  const autoStartAttemptedRef = useRef(false);
  const respondingRef = useRef(false);
  const startListeningRef = useRef<() => void>(() => {});
  storeRef.current = store;
  languageRef.current = language;
  const isArabic = language === 'ar';
  const bi = (fr: string, ar: string) => isArabic ? ar : fr;
  const availableProducts = store.products.filter((product) => product.active);
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
      autoStartAttemptedRef.current = false;
      recognitionRef.current?.abort?.();
      liveConnectionRef.current?.close();
      liveConnectionRef.current = null;
      setStoreLoading(true);
      setStoreError('');
      try {
        const response = await fetch(`${API_BASE_URL}/api/agent/sawtify/public/${encodeURIComponent(slug)}`);
        const body = await response.json();
        if (!response.ok || !body.success || !body.store) {
          throw new Error(response.status === 404
            ? bi('Cette boutique est introuvable.', 'المتجر غير موجود.')
            : bi('Cette boutique est momentanément indisponible. Réessayez plus tard.', 'المتجر ما راهوش متوفر حالياً. عاود من بعد.'));
        }
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
    document.documentElement.lang = isArabic ? 'ar' : 'fr';
    document.documentElement.dir = isArabic ? 'rtl' : 'ltr';
  }, [isArabic]);

  useEffect(() => {
    componentMountedRef.current = true;
    return () => {
      componentMountedRef.current = false;
      recognitionRef.current?.abort?.();
      liveConnectionRef.current?.close();
      liveConnectionRef.current = null;
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
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
          const message = response.status === 402
            ? bi('Le solde vocal de cette boutique est épuisé. Réessayez plus tard.', 'رصيد الصوت تاع المتجر سالى. عاود من بعد.')
            : response.status === 423
              ? bi('Cet assistant est en pause pour le moment.', 'المساعد متوقف مؤقتاً.')
              : bi('Je ne peux pas répondre pour le moment. Réessayez dans un instant.', 'ما نقدرش نجاوبك حالياً. عاود بعد شوية.');
          throw new Error(message);
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

  const startBrowserRecognition = () => {
    if (isResponding || isConnecting) return;
    const speechWindow = window as Window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
    const Constructor = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Constructor) {
      setHint(bi('La commande vocale n’est pas disponible ici. Vous pouvez écrire votre question.', 'الأوامر الصوتية ما هيش متوفرة هنا. تقدر تكتب سؤالك.'));
      setShowTextInput(true);
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
        if (transcript) void answerCustomer(transcript);
        else setHint(bi('Je n’ai pas bien entendu. Réessayez ou écrivez votre question.', 'ما سمعتكش مليح. عاود ولا اكتب سؤالك.'));
      };
      recognition.onerror = (event) => {
        setIsListening(false);
        setHint(event?.error === 'not-allowed' || event?.error === 'service-not-allowed'
          ? bi('Autorisez le micro dans votre navigateur ou écrivez votre question.', 'اسمح للمتصفح يستعمل الميكرو ولا اكتب سؤالك.')
          : bi('Je n’ai pas pu capter votre voix. Réessayez ou écrivez votre question.', 'ما قدرتش نسمع صوتك. عاود ولا اكتب سؤالك.'));
        setShowTextInput(true);
      };
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
      setHint(bi('Je vous écoute…', 'راني نسمع فيك…'));
      setIsListening(true);
      recognition.start();
    } catch {
      setIsListening(false);
      setHint(bi('Le micro n’a pas pu démarrer. Autorisez-le ou écrivez votre question.', 'ما قدرش الميكرو يبدا. اسمحلو ولا اكتب سؤالك.'));
      setShowTextInput(true);
    }
  };

  const startListening = async () => {
    if (liveConnectionRef.current) {
      stopListening();
      return;
    }
    if (liveConnectingRef.current || isConnecting || isResponding) return;
    if (!storeRef.current.isActive) {
      setHint(bi('Cet assistant est en pause pour le moment.', 'المساعد متوقف مؤقتاً.'));
      return;
    }
    if (isDemoPreview) {
      startBrowserRecognition();
      return;
    }
    if (!isSupabaseConfigured) {
      setHint(bi('Je n’arrive pas à vous écouter pour le moment. Vous pouvez écrire votre question.', 'ما قدرتش نسمعك حالياً. تقدر تكتب سؤالك.'));
      setShowTextInput(true);
      return;
    }
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || typeof AudioContext === 'undefined') {
      setHint(bi('Le micro n’est pas disponible sur cet appareil. Vous pouvez écrire votre question.', 'الميكرو ما هوش متوفر في هاذ الجهاز. تقدر تكتب سؤالك.'));
      setShowTextInput(true);
      return;
    }

    liveConnectingRef.current = true;
    setIsConnecting(true);
    setHint(bi('Un instant…', 'لحظة برك…'));
    let microphone: MediaStream | null = null;
    let audioContext: AudioContext | null = null;
    const releasePendingResources = () => {
      microphone?.getTracks().forEach((track) => track.stop());
      microphone = null;
      if (audioContext && audioContext.state !== 'closed') void audioContext.close().catch(() => undefined);
      audioContext = null;
    };
    try {
      audioContext = new AudioContext();
      const contextReady = audioContext.resume().catch(() => undefined);
      const { connectAgentLive } = await import('../services/agentLive');
      if (!componentMountedRef.current) { releasePendingResources(); return; }
      microphone = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      if (!componentMountedRef.current) { releasePendingResources(); return; }
      const tokenResponse = await fetch(`${API_BASE_URL}/api/agent/sawtify/live-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, language: languageRef.current }),
      });
      const tokenBody = await tokenResponse.json().catch(() => ({}));
      if (tokenResponse.status === 402) throw new Error('insufficient_minutes');
      if (tokenResponse.status === 423) throw new Error('store_paused');
      if (!tokenResponse.ok || !tokenBody.success || typeof tokenBody.token !== 'string' || typeof tokenBody.model !== 'string' || !tokenBody.config) {
        throw new Error('live_unavailable');
      }

      await contextReady;
      if (!componentMountedRef.current) { releasePendingResources(); return; }
      const connection = await connectAgentLive({
        token: tokenBody.token,
        model: tokenBody.model,
        config: tokenBody.config,
        microphone,
        audioContext,
        callbacks: {
          onInputTranscription: (text) => { if (componentMountedRef.current) { setCaption(text.trim()); setHint(''); } },
          onOutputTranscription: (text) => { if (componentMountedRef.current) { setCaption(text.trim()); setHint(''); } },
          onSpeaking: (speaking) => { if (componentMountedRef.current) setIsSpeaking(speaking); },
          onTurnComplete: () => { if (componentMountedRef.current) { setIsResponding(false); setHint(''); } },
          onToolCall: async (call) => {
            if (call.name !== 'agent_turn' || !call.args) return { success: false, answer: bi('Je n’ai pas pu traiter cette demande. Réessayons.', 'ما قدرتش نعالج هاذ الطلب. نعاودو.') };
            if (!componentMountedRef.current) return null;
            setIsResponding(true);
            setHint(bi('Je vérifie les informations…', 'جاري التحقق من المعلومات…'));
            try {
              const { data, error } = await supabase.functions.invoke('agent-sawtify-tools', {
                body: {
                  slug: storeRef.current.slug || slug,
                  language: languageRef.current,
                  requestId: makeRequestId(),
                  toolName: call.name,
                  arguments: call.args,
                },
              });
              if (!componentMountedRef.current) return null;
              if (error) {
                const status = Number((error as { context?: { status?: number } }).context?.status || 0);
                if (status === 402) {
                  setHint(bi('Le solde vocal de cette boutique est épuisé. Le propriétaire doit le recharger.', 'رصيد الصوت تاع المتجر سالى. لازم المالك يعاود يشحنو.'));
                } else if (status === 429) {
                  setHint(bi('Trop de demandes en peu de temps. Réessayez dans un instant.', 'طلبات كثيرة في وقت قصير. عاود بعد شوية.'));
                } else {
                  setHint(bi('Je n’ai pas pu joindre la boutique pour le moment. Vous pouvez écrire votre question.', 'ما قدرتش نوصل للمتجر حالياً. تقدر تكتب سؤالك.'));
                }
                setShowTextInput(true);
                setIsResponding(false);
                setIsListening(false);
                setIsLiveSession(false);
                const activeConnection = liveConnectionRef.current;
                liveConnectionRef.current = null;
                activeConnection?.close();
                return null;
              }
              if (!componentMountedRef.current) return null;
              const result = data as Record<string, unknown> | null;
              if (!result?.success || typeof result.answer !== 'string') throw new Error('tool_failed');
              setHint('');
              return { success: true, answer: result.answer, action: result.action };
            } catch {
              if (!componentMountedRef.current) return null;
              setHint(bi('Je n’ai pas pu terminer cette réponse. Vous pouvez réessayer ou écrire votre question.', 'ما قدرتش نكمل الإجابة. تقدر تعاود ولا تكتب سؤالك.'));
              setShowTextInput(true);
              setIsResponding(false);
              setIsListening(false);
              setIsLiveSession(false);
              const activeConnection = liveConnectionRef.current;
              liveConnectionRef.current = null;
              activeConnection?.close();
              return null;
            }
          },
          onError: () => {
            if (!componentMountedRef.current) return;
            setIsListening(false);
            setIsLiveSession(false);
            setIsResponding(false);
            setShowTextInput(true);
            setHint(bi('Je ne vous entends plus. Réessayez ou écrivez votre question.', 'ما بقيتش نسمعك. عاود ولا اكتب سؤالك.'));
            const activeConnection = liveConnectionRef.current;
            liveConnectionRef.current = null;
            activeConnection?.close();
          },
          onClose: () => {
            if (!componentMountedRef.current) return;
            setIsListening(false);
            setIsLiveSession(false);
            setIsSpeaking(false);
          },
        },
      });
      if (!componentMountedRef.current) {
        connection.close();
        return;
      }
      liveConnectionRef.current = connection;
      microphone = null;
      audioContext = null;
      setIsLiveSession(true);
      setIsListening(true);
      setIsSpeaking(false);
      setCaption('');
      setHint(bi('Je vous écoute…', 'راني نسمع فيك…'));
    } catch (error: any) {
      releasePendingResources();
      if (!componentMountedRef.current) return;
      setIsListening(false);
      setIsLiveSession(false);
      setIsSpeaking(false);
      setShowTextInput(true);
      const reason = error?.message === 'insufficient_minutes'
        ? bi('Le solde vocal de cette boutique est épuisé. Le propriétaire doit le recharger.', 'رصيد الصوت تاع المتجر سالى. لازم المالك يعاود يشحنو.')
        : error?.message === 'store_paused'
          ? bi('Cette boutique est en pause pour le moment.', 'المتجر متوقف مؤقتاً.')
          : error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError'
            ? bi('Autorisez l’accès au micro pour parler, ou écrivez votre question.', 'اسمح باستعمال الميكرو باش تهدر، ولا اكتب سؤالك.')
            : bi('Je n’arrive pas à démarrer l’écoute. Réessayez ou écrivez votre question.', 'ما قدرتش نبدا نسمعك. عاود ولا اكتب سؤالك.');
      setHint(reason);
    } finally {
      liveConnectingRef.current = false;
      if (componentMountedRef.current) setIsConnecting(false);
    }
  };

  startListeningRef.current = () => { void startListening(); };
  useEffect(() => {
    if (storeLoading || !store.isActive || autoStartAttemptedRef.current) return;
    const timer = window.setTimeout(() => {
      if (autoStartAttemptedRef.current) return;
      autoStartAttemptedRef.current = true;
      startListeningRef.current();
    }, 350);
    return () => window.clearTimeout(timer);
  }, [storeLoading, store.isActive, slug]);

  const stopListening = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    const activeConnection = liveConnectionRef.current;
    liveConnectionRef.current = null;
    activeConnection?.close();
    setIsLiveSession(false);
    setIsListening(false);
    setIsSpeaking(false);
    setHint(bi('Micro coupé. Touchez la bulle pour reprendre.', 'الميكرو تسد. اضغط على الفقاعة باش تعاود.'));
  };

  const submitTextQuestion = (event: React.FormEvent) => {
    event.preventDefault();
    const question = textQuestion.trim();
    if (!question || isResponding || isConnecting) return;
    setTextQuestion('');
    setShowTextInput(false);
    if (liveConnectionRef.current && isLiveSession) {
      setCaption(question);
      setIsResponding(true);
      setHint(bi('Je prépare ma réponse…', 'جاري تحضير الإجابة…'));
      liveConnectionRef.current.sendText(question);
      return;
    }
    if (isListening) stopListening();
    void answerCustomer(question);
  };

  const changeLanguage = (nextLanguage: 'fr' | 'ar') => {
    if (nextLanguage === languageRef.current) return;
    languageRef.current = nextLanguage;
    setLanguage(nextLanguage);
    if (liveConnectionRef.current) {
      const activeConnection = liveConnectionRef.current;
      liveConnectionRef.current = null;
      activeConnection.close();
      setIsLiveSession(false);
      setIsListening(false);
      setIsSpeaking(false);
      void startListening();
    }
  };

  const openOrder = (product: AgentProduct) => {
    if (!store.isActive) {
      setHint(bi('La boutique est en pause et ne prend pas de demandes.', 'المتجر متوقف مؤقتاً وما يستقبلش الطلبات.'));
      return;
    }
    if (liveConnectionRef.current || recognitionRef.current) stopListening();
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
      if (!response.ok || !body.success || !body.order) throw new Error(response.status >= 500
        ? bi('La demande n’a pas pu être transmise. Réessayez plus tard.', 'ما قدرناش نبعثو الطلب. عاود من بعد.')
        : body.error || bi('La demande n’a pas pu être envoyée.', 'ما قدرناش نبعثو الطلب.'));
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
    if (liveConnectionRef.current || recognitionRef.current) stopListening();
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
      if (!response.ok || !body.success || !body.order) throw new Error(response.status >= 500
        ? bi('La demande n’a pas pu être transmise. Réessayez plus tard.', 'ما قدرناش نبعثو الطلب. عاود من بعد.')
        : body.error || bi('Impossible d’envoyer la demande.', 'ما قدرناش نبعثو الطلب.'));
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

  if (storeLoading) return <main className="saw-app-background flex min-h-screen items-center justify-center p-6 text-center text-sm font-semibold text-slate-600">{bi('Chargement de la boutique…', 'جاري تحميل المتجر…')}</main>;
  if (storeError) return <main className="saw-app-background flex min-h-screen items-center justify-center p-6"><section className="max-w-lg rounded-3xl border border-amber-200 bg-white p-7 text-center shadow-lg"><Store className="mx-auto h-8 w-8 text-violet-700" /><h1 className="mt-3 text-lg font-black text-slate-900">{bi('Boutique introuvable', 'المتجر غير موجود')}</h1><p role="status" className="mt-2 text-sm leading-6 text-slate-600">{storeError}</p><a href="/agent-ai" className="mt-5 inline-flex rounded-xl bg-violet-700 px-4 py-2.5 text-xs font-bold text-white">{bi('Découvrir Agent Sawtify', 'اكتشف Agent Sawtify')}</a></section></main>;

  return (
    <main className="agent-call-shell" dir={isArabic ? 'rtl' : 'ltr'} style={{ fontFamily: isArabic ? 'var(--font-sans-arabic)' : "'Sora', var(--font-sans-latin)" }}>
      <div className="agent-call-liquid-bg" aria-hidden="true">
        <span className="agent-call-blob agent-call-blob-one" />
        <span className="agent-call-blob agent-call-blob-two" />
        <span className="agent-call-blob agent-call-blob-three" />
        <span className="agent-call-grain" />
      </div>
      <Helmet>
        <title>{bi(`Parler avec ${store.name} · Sawtify`, `تواصل مع ${store.name} · Sawtify`)}</title>
        <meta name="description" content={bi(`Parlez avec l’assistant de ${store.name}.`, `تواصل بالصوت مع مساعد ${store.name}.`)} />
      </Helmet>

      <header className="agent-call-top">
        <div className="agent-call-shop-pill">
          <span className="agent-call-shop-mark" aria-hidden="true"><AudioLines className="h-5 w-5" /></span>
          <div className="agent-call-shop-copy">
            <p className="agent-call-shop-name">{store.name}</p>
            <p className="agent-call-shop-meta">{store.category || sectorName}{store.location ? ` · ${store.location}` : ''}</p>
          </div>
          <span className={`agent-call-availability ${store.isActive ? 'is-active' : ''}`} title={store.isActive ? bi('Disponible', 'متاح') : bi('En pause', 'متوقف')} />
        </div>
        <div className="agent-call-language" role="group" aria-label={bi('Langue', 'اللغة')}>
          <button type="button" onClick={() => changeLanguage('fr')} aria-pressed={language === 'fr'} className={language === 'fr' ? 'selected' : ''}>FR</button>
          <button type="button" onClick={() => changeLanguage('ar')} aria-pressed={language === 'ar'} className={language === 'ar' ? 'selected' : ''}>دارجة</button>
        </div>
      </header>

      <section className="agent-call-stage" aria-label={bi('Conversation vocale', 'محادثة صوتية')}>
        <div className="agent-call-orb-wrap">
          <span className={`agent-call-orb-aura ${isListening ? 'active' : ''}`} aria-hidden="true" />
          <button
            type="button"
            onClick={isListening ? stopListening : () => { void startListening(); }}
            disabled={!store.isActive || isConnecting}
            aria-pressed={isListening}
            aria-label={isListening ? bi('Arrêter le micro', 'حبس الميكرو') : bi('Parler avec la boutique', 'اهدر مع المتجر')}
            className={`aura-wrapper agent-call-orb ${isListening ? 'listening' : ''} ${isSpeaking ? 'speaking' : ''} ${isConnecting ? 'connecting' : ''}`}
          >
            <span className="layer-core">
              <span className="aura-fluid aura-fluid-1" />
              <span className="aura-fluid aura-fluid-2" />
              <span className="aura-fluid aura-fluid-3" />
              <span className="aura-gloss" />
            </span>
            <span className="sr-only">{isListening ? bi('Touchez pour arrêter', 'اضغط باش تحبس') : bi('Touchez pour parler', 'اضغط باش تهدر')}</span>
          </button>
        </div>

        <div className="agent-call-caption" role="status" aria-live="polite" aria-atomic="true">
          <span className={`agent-call-status-dot ${isSpeaking ? 'speaking' : isListening ? 'listening' : ''}`} />
          <p>{isConnecting
            ? bi('Un instant…', 'لحظة برك…')
            : isSpeaking
              ? bi('Je vous réponds…', 'راني نجاوبك…')
              : isListening
                ? bi('Je vous écoute…', 'راني نسمع فيك…')
                : hint || caption || messages.at(-1)?.text || greeting}</p>
        </div>

        <div className="agent-call-actions">
          <button type="button" onClick={() => setShowTextInput((visible) => !visible)} aria-expanded={showTextInput} className="agent-call-secondary-action">
            <MessageSquareText className="h-4 w-4" />{bi('Écrire', 'اكتب')}
          </button>
          <button type="button" onClick={() => setShowManualOptions((visible) => !visible)} aria-expanded={showManualOptions} className="agent-call-secondary-action">
            <Headphones className="h-4 w-4" />{bi('Autres options', 'خيارات أخرى')}
          </button>
          <button type="button" onClick={isListening ? stopListening : () => { void startListening(); }} disabled={!store.isActive || isConnecting} className={`agent-call-mic-button ${isListening ? 'is-active' : ''}`} aria-label={isListening ? bi('Couper le micro', 'حبس الميكرو') : bi('Activer le micro', 'شغل الميكرو')}>
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
        </div>

        {showTextInput && (
          <form onSubmit={submitTextQuestion} className="agent-call-text-form">
            <input
              autoFocus
              value={textQuestion}
              onChange={(event) => setTextQuestion(event.target.value)}
              disabled={isResponding || isConnecting}
              maxLength={1200}
              className="agent-call-text-input"
              placeholder={bi('Écrivez votre question…', 'اكتب سؤالك…')}
              aria-label={bi('Votre question', 'سؤالك')}
            />
            <button type="submit" disabled={isResponding || isConnecting || !textQuestion.trim()} aria-label={bi('Envoyer', 'أرسل')}>
              <Volume2 className="h-4 w-4" />
            </button>
          </form>
        )}

        {showManualOptions && (
          <section className="agent-call-options" aria-label={bi('Options de demande', 'خيارات الطلب')}>
            <div className="agent-call-options-heading">
              <p>{isCommerce ? bi('Choisir un article', 'اختار منتج') : bi('Choisir une demande', 'اختار طلب')}</p>
              <button type="button" onClick={() => setShowManualOptions(false)} aria-label={bi('Fermer les options', 'سد الخيارات')}><X className="h-4 w-4" /></button>
            </div>
            {isCommerce ? (
              availableProducts.some((product) => product.stock > 0) ? availableProducts.filter((product) => product.stock > 0).slice(0, 8).map((product) => (
                <button key={product.id} type="button" className="agent-call-option-row" onClick={() => { setShowManualOptions(false); openOrder(product); }}>
                  <span>{product.name}</span><span>{formatMoney(product.priceDzd, isArabic)}</span>
                </button>
              )) : <p className="agent-call-options-empty">{bi('Aucun article disponible.', 'ما كاين حتى منتج متوفر.')}</p>
            ) : availableRequestTypes.map((requestType) => (
              <button key={requestType} type="button" className="agent-call-option-row" onClick={() => { setShowManualOptions(false); openBusinessRequest(requestType); }}>
                <span>{requestTypeLabel(requestType, isArabic)}</span><span>›</span>
              </button>
            ))}
          </section>
        )}

        <p className="agent-call-privacy">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
          {isDemoPreview
            ? bi('Aperçu local : vos demandes restent dans ce navigateur.', 'معاينة محلية: طلباتك تبقى في هذا المتصفح.')
            : bi('Votre voix est traitée pour répondre. Les demandes confirmées sont transmises à cette activité ; Sawtify n’enregistre pas le texte de la conversation.', 'صوتك يتعالج باش نجاوبوك. الطلبات اللي تأكدها تتبعث للنشاط؛ Sawtify ما تسجلش كلام المحادثة.')}
        </p>
      </section>

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
