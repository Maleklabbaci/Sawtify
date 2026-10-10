import React, { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  AudioLines, Bot, Check, CheckCircle2, ChevronRight, CircleHelp, Mic, MicOff,
  Minus, Phone, Plus, ShieldCheck, Sparkles, Store, Volume2, X,
} from 'lucide-react';
import {
  DEMO_AGENT_STORE, makeAgentId, readAgentStore, saveAgentStore,
  type AgentOrder, type AgentProduct, type AgentStore,
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

const normalize = (value: string) => value.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’']/g, ' ');
const formatMoney = (amount: number, arabic: boolean) => `${new Intl.NumberFormat(arabic ? 'ar-DZ' : 'fr-DZ', { maximumFractionDigits: 0 }).format(amount)} ${arabic ? 'دج' : 'DA'}`;

export const AgentCallPage: React.FC<{ slug: string }> = ({ slug }) => {
  const [store, setStore] = useState<AgentStore>(() => readAgentStore());
  const [language, setLanguage] = useState<'fr' | 'ar'>(() => {
    const initial = readAgentStore().language;
    return initial === 'ar' ? 'ar' : 'fr';
  });
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [hint, setHint] = useState('');
  const [orderProduct, setOrderProduct] = useState<AgentProduct | null>(null);
  const [orderSaved, setOrderSaved] = useState(false);
  const [orderForm, setOrderForm] = useState({ name: '', phone: '', wilaya: '', size: '', quantity: 1 });
  const recognitionRef = useRef<BrowserRecognition | null>(null);
  const conversationEndRef = useRef<HTMLDivElement | null>(null);
  const isArabic = language === 'ar';
  const bi = (fr: string, ar: string) => isArabic ? ar : fr;
  const availableProducts = store.products.filter((product) => product.active);
  const availableFaqs = store.faqs.filter((faq) => faq.active);
  const greeting = store.greeting === DEMO_AGENT_STORE.greeting && isArabic
    ? `سلام! مرحبا بيك عند ${store.name}. نقدر نعاونك بالمنتجات، الأسعار ولا التوصيل، واش حاب تعرف؟`
    : store.greeting || bi('Bonjour ! Comment puis-je vous aider ?', 'سلام، كيفاش نقدر نعاونك؟');

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

  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = isArabic ? 'ar-SA' : 'fr-FR';
    utterance.rate = 0.96;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const findReply = (question: string) => {
    const normalized = normalize(question);
    const product = store.products.find((item) => item.active && normalize(item.name).split(' ').some((word) => word.length > 3 && normalized.includes(word)));
    const asksPrice = /prix|combien|cout|coute|tarif|price|بشحال|قداش|السعر/.test(normalized);
    const asksDelivery = /livr|livraison|wilaya|wila|وصل|توصيل|توص|ولاية/.test(normalized);
    const asksSize = /taille|pointure|point|size|مقاس|قياس/.test(normalized);
    const asksStock = /stock|dispon|reste|restant|متوفر|كاين|موجود/.test(normalized);

    if (!product && asksSize) {
      const requestedSize = normalized.match(/\b\d{2}\b/)?.[0];
      const matchingProduct = store.products.find((item) => item.active && item.stock > 0 && (requestedSize ? item.sizes.includes(requestedSize) : item.sizes.length > 0));
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
      const faq = availableFaqs.find((item) => /livr|wilaya|وصل|توصيل|ولاية/i.test(`${item.question} ${item.answer}`));
      return isArabic
        ? faq?.answer.includes('58') ? 'إيه، نوصلو لـ58 ولاية، والخلاص يكون كي توصلك الطلبية.' : 'أكيد، ابعثلي الولاية تاعك ونأكدلك تفاصيل التوصيل.'
        : faq?.answer || 'Oui, nous livrons dans les 58 wilayas. Le paiement se fait à la livraison.';
    }
    if (asksPrice) return isArabic
      ? `نقدر نعاونك في الأسعار. المنتجات المتوفرة عندنا: ${availableProducts.slice(0, 3).map((item) => `${item.name} بـ ${formatMoney(item.priceDzd, true)}`).join('، ')}.`
      : `Bien sûr. Voici quelques prix : ${availableProducts.slice(0, 3).map((item) => `${item.name} à ${formatMoney(item.priceDzd, false)}`).join(' · ')}.`;

    if (/commande|commander|acheter|réserve|reserve|طلب|نشري|نطلب/.test(normalized)) return isArabic
      ? 'مرحبا، قولّي اسم المنتج والمقاس اللي تحبو ونكملو الطلب.'
      : 'Avec plaisir ! Dites-moi quel produit vous intéresse et la taille souhaitée, puis je note votre demande.';

    const faq = availableFaqs.find((item) => normalize(item.question).split(' ').filter((word) => word.length > 4).some((word) => normalized.includes(word)));
    if (faq) return faq.answer;
    return isArabic
      ? 'نقدر نعاونك بالأسعار، المقاسات ولا التوصيل. قولّي واش حاب تعرف؟'
      : 'Je peux vous renseigner sur les prix, les tailles, le stock ou la livraison. Qu’aimeriez-vous savoir ?';
  };

  const answerCustomer = (question: string) => {
    if (!store.isActive) {
      setHint(bi('Cet assistant est en pause pour le moment.', 'المساعد متوقف مؤقتاً.'));
      return;
    }
    const answer = findReply(question);
    setMessages((current) => [
      ...current,
      { id: makeAgentId('msg'), role: 'customer', text: question },
      { id: makeAgentId('msg'), role: 'assistant', text: answer },
    ]);
    speak(answer);
    setHint('');
  };

  const startListening = () => {
    if (!store.isActive) {
      setHint(bi('Cet assistant est en pause pour le moment.', 'المساعد متوقف مؤقتاً.'));
      return;
    }
    const speechWindow = window as Window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
    const Constructor = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Constructor) {
      setHint(bi('La commande vocale n’est pas disponible ici. Essayez une question suggérée juste en dessous.', 'الأوامر الصوتية ما تخدمش هنا. جرّب سؤال من الاقتراحات لتحت.'));
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
        setHint(event?.error === 'not-allowed'
          ? bi('Autorisez le micro pour essayer la démo vocale.', 'اسمح باستعمال الميكرو باش تجرب المعاينة الصوتية.')
          : bi('Je n’ai pas pu vous entendre. Réessayez ou choisissez une question.', 'ما قدرتش نسمعك. عاود ولا اختار سؤال.'));
      };
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
      setHint(bi('Je vous écoute…', 'راني نسمع فيك…'));
      setIsListening(true);
      recognition.start();
    } catch {
      setIsListening(false);
      setHint(bi('Le micro n’a pas pu démarrer. Essayez une question suggérée.', 'الميكرو ما قدرش يخدم. جرّب سؤال من الاقتراحات.'));
    }
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setHint('');
  };

  const openOrder = (product: AgentProduct) => {
    setOrderProduct(product);
    setOrderSaved(false);
    setOrderForm({ name: '', phone: '', wilaya: '', size: product.sizes[0] || '', quantity: 1 });
  };

  const submitOrder = (event: React.FormEvent) => {
    event.preventDefault();
    if (!orderProduct || !orderForm.name.trim() || !orderForm.phone.trim() || !orderForm.wilaya.trim()) return;
    const order: AgentOrder = {
      id: makeAgentId('cmd'),
      createdAt: new Date().toISOString(),
      customerName: orderForm.name.trim(),
      phone: orderForm.phone.trim(),
      wilaya: orderForm.wilaya.trim(),
      productId: orderProduct.id,
      productName: orderProduct.name,
      size: orderForm.size,
      quantity: Math.min(Math.max(1, orderForm.quantity), Math.max(1, orderProduct.stock)),
      amountDzd: orderProduct.priceDzd * Math.min(Math.max(1, orderForm.quantity), Math.max(1, orderProduct.stock)),
      status: 'new',
    };
    const latest = readAgentStore();
    const next = { ...latest, orders: [order, ...latest.orders] };
    saveAgentStore(next);
    setStore(next);
    setOrderSaved(true);
    setMessages((current) => [...current, { id: makeAgentId('msg'), role: 'customer', text: bi(`Demande envoyée pour ${orderProduct.name}.`, `تم إرسال طلب ${orderProduct.name}.`) }, { id: makeAgentId('msg'), role: 'assistant', text: bi('Merci ! Votre demande est bien notée. La boutique vous recontactera pour confirmer les détails.', 'يعطيك الصحة! سجّلنا طلبك، والمتجر يتصل بيك باش يأكد التفاصيل.') }]);
  };

  const questions = isArabic
    ? ['بشحال Sneakers Atlas؟', 'توصلو لوهران؟', 'واش كاين المقاس 40؟']
    : ['Combien coûte Sneakers Atlas ?', 'Vous livrez à Oran ?', 'La taille 40 est disponible ?'];

  return (
    <main className="saw-app-background min-h-screen px-3 pb-8 pt-3 text-slate-900 sm:px-6 sm:pt-5" dir={isArabic ? 'rtl' : 'ltr'} style={{ fontFamily: isArabic ? 'var(--font-sans-arabic)' : "'Sora', var(--font-sans-latin)" }}>
      <Helmet>
        <title>{bi(`Parler avec ${store.name} · Sawtify`, `تواصل مع ${store.name} · Sawtify`)}</title>
        <meta name="description" content={bi(`Découvrez ${store.name} et posez vos questions directement à son assistant.`, `اكتشف ${store.name} واسأل المساعد مباشرة.`)} />
      </Helmet>
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-amber-950">
          <p className="flex items-start gap-2 text-[11px] leading-5 sm:text-xs"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /><span><strong>{bi('Aperçu de démonstration.', 'معاينة تجريبية.')}</strong> {bi('Les commandes sont enregistrées uniquement dans ce navigateur et ne sont pas envoyées à la boutique.', 'الطلبات تتحفظ غير في هذا المتصفح وما تتبعثش للمتجر.')}</span></p>
          <a href="/agent-sawtify" className="shrink-0 rounded-xl border border-amber-300 bg-white/75 px-3 py-2 text-[10px] font-extrabold text-amber-900 transition hover:bg-white">{bi('Espace vendeur', 'مساحة التاجر')}</a>
        </div>

        <header className="mb-4 flex items-center justify-between gap-3 rounded-[22px] border border-white/80 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-xl sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-700 to-fuchsia-500 text-white shadow-md shadow-violet-300/40"><AudioLines className="h-5 w-5" /></span>
            <div className="min-w-0"><p className="truncate text-sm font-black text-slate-950">{store.name}</p><p className="truncate text-[10px] font-semibold text-slate-500">{store.category} · {store.location}</p></div>
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
              <div className="flex items-center gap-3"><span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-700 to-fuchsia-500 text-white shadow-lg shadow-violet-300/35"><Bot className="h-5 w-5" /><span className="absolute -bottom-1 -end-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" /></span><div><p className="text-[10px] font-black uppercase tracking-[.15em] text-violet-700">{bi('Agent Sawtify', 'مساعد Sawtify')}</p><p className="text-sm font-extrabold text-slate-950">{bi('Votre assistant boutique', 'مساعد المتجر')}</p></div></div>
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
                  {questions.map((question) => <button key={question} type="button" onClick={() => answerCustomer(question)} className="rounded-full border border-violet-200 bg-white px-3 py-2 text-[10px] font-bold text-violet-800 transition hover:border-violet-400 hover:bg-violet-50">{question}</button>)}
                </div>
                {hint && <p role="status" className={`mt-3 text-xs font-semibold ${isListening ? 'text-violet-700' : 'text-slate-500'}`}>{hint}</p>}
                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="text-[10px] leading-4 text-slate-400">{bi('Une démo rapide, sans compte ni application.', 'معاينة بسيطة، بلا حساب ولا تطبيق.')}</div>
                  <button type="button" onClick={isListening ? stopListening : startListening} className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white shadow-lg transition active:scale-95 ${isListening ? 'animate-pulse bg-rose-600 shadow-rose-200' : 'bg-violet-700 shadow-violet-300/50 hover:bg-violet-600'}`} aria-label={isListening ? bi('Arrêter le micro', 'أوقف الميكرو') : bi('Parler à l’assistant', 'اهدر مع المساعد')}>
                    {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <section className="saw-glass rounded-[26px] p-4 sm:p-5">
              <div className="mb-4 flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.15em] text-violet-700">{bi('La boutique', 'المتجر')}</p><h2 className="mt-1 text-base font-black text-slate-950">{store.name}</h2><p className="mt-1 text-xs text-slate-500">{store.category} · {store.location}</p></div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><Store className="h-5 w-5" /></span></div>
              <div className="flex flex-wrap gap-2 text-[10px] font-bold text-slate-600"><span className="rounded-full bg-white px-2.5 py-1.5">{bi('Français', 'الفرنسية')}</span><span className="rounded-full bg-white px-2.5 py-1.5">الدارجة</span><span className="rounded-full bg-white px-2.5 py-1.5">{bi('Sans inscription', 'بلا تسجيل')}</span></div>
            </section>

            <section className="saw-glass rounded-[26px] p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-3"><div><h2 className="text-sm font-black text-slate-950">{bi('Les produits', 'المنتجات')}</h2><p className="mt-1 text-[10px] text-slate-500">{bi('Demandez un article ou sa disponibilité.', 'اطلب منتج ولا اسأل على التوفر.')}</p></div><span className="rounded-full bg-violet-100 px-2 py-1 text-[10px] font-bold text-violet-800">{availableProducts.length}</span></div>
              <div className="space-y-2.5">
                {availableProducts.length ? availableProducts.map((product) => (
                  <article key={product.id} className="rounded-2xl border border-slate-100 bg-white/90 p-3">
                    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-xs font-extrabold text-slate-900">{product.name}</h3><p className="mt-1 text-[10px] leading-4 text-slate-500">{product.stock > 0 ? `${product.stock} ${bi('en stock', 'في المخزون')}` : bi('Rupture de stock', 'نفد المخزون')}{product.sizes.length ? ` · ${product.sizes.join(', ')}` : ''}</p></div><span className="shrink-0 text-xs font-black text-violet-800">{formatMoney(product.priceDzd, isArabic)}</span></div>
                    {product.stock > 0 && <button type="button" onClick={() => openOrder(product)} className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-violet-50 px-3 py-2 text-[10px] font-extrabold text-violet-800 transition hover:bg-violet-100">{bi('Demander cet article', 'اطلب هذا المنتج')}<ChevronRight className="h-3.5 w-3.5" /></button>}
                  </article>
                )) : <div className="rounded-2xl bg-white/75 px-4 py-6 text-center text-xs text-slate-500">{bi('Aucun produit pour le moment.', 'ما كاين حتى منتج حالياً.')}</div>}
              </div>
            </section>

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
            <div className="mb-5 flex items-start justify-between gap-3"><div><span className="text-[10px] font-black uppercase tracking-[.15em] text-violet-700">{bi('Votre demande', 'طلبك')}</span><h2 className="mt-1 text-lg font-black text-slate-950">{orderSaved ? bi('Demande enregistrée !', 'تم تسجيل الطلب!') : orderProduct.name}</h2><p className="mt-1 text-xs text-slate-500">{orderSaved ? bi('Ceci est une démonstration locale, rien ne sera envoyé à la boutique.', 'هذي معاينة محلية، ما راح يتبعث والو للمتجر.') : `${formatMoney(orderProduct.priceDzd, isArabic)} · ${orderProduct.stock} ${bi('disponibles', 'متوفر')}`}</p></div><button type="button" onClick={() => setOrderProduct(null)} className="rounded-xl bg-slate-100 p-2 text-slate-500 hover:bg-slate-200" aria-label={bi('Fermer', 'إغلاق')}><X className="h-4 w-4" /></button></div>
            {orderSaved ? <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-6 w-6" /></span><p className="mt-3 text-sm font-extrabold text-emerald-900">{bi('Merci ! Votre demande est bien notée.', 'يعطيك الصحة! تسجّل طلبك.')}</p><button type="button" onClick={() => setOrderProduct(null)} className="mt-4 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-800">{bi('Terminé', 'تم')}</button></div> : (
              <form onSubmit={submitOrder} className="space-y-3">
                <label className="block"><span className="mb-1.5 block text-[11px] font-bold text-slate-700">{bi('Votre nom *', 'اسمك *')}</span><input required maxLength={80} value={orderForm.name} onChange={(event) => setOrderForm((form) => ({ ...form, name: event.target.value }))} className={formInput} placeholder={bi('Ex. Yasmine B.', 'مثال: ياسمين')} /></label>
                <div className="grid gap-3 sm:grid-cols-2"><label className="block"><span className="mb-1.5 block text-[11px] font-bold text-slate-700">{bi('Téléphone *', 'رقم الهاتف *')}</span><input required type="tel" inputMode="tel" maxLength={20} value={orderForm.phone} onChange={(event) => setOrderForm((form) => ({ ...form, phone: event.target.value }))} className={formInput} placeholder="05 00 00 00 00" /></label><label className="block"><span className="mb-1.5 block text-[11px] font-bold text-slate-700">{bi('Wilaya *', 'الولاية *')}</span><input required maxLength={40} value={orderForm.wilaya} onChange={(event) => setOrderForm((form) => ({ ...form, wilaya: event.target.value }))} className={formInput} placeholder={bi('Oran', 'وهران')} /></label></div>
                <div className="grid gap-3 sm:grid-cols-2"><label className="block"><span className="mb-1.5 block text-[11px] font-bold text-slate-700">{bi('Taille / variante', 'المقاس / الخيار')}</span>{orderProduct.sizes.length ? <select value={orderForm.size} onChange={(event) => setOrderForm((form) => ({ ...form, size: event.target.value }))} className={formInput}>{orderProduct.sizes.map((size) => <option key={size} value={size}>{size}</option>)}</select> : <input value={orderForm.size} onChange={(event) => setOrderForm((form) => ({ ...form, size: event.target.value }))} className={formInput} placeholder="—" />}</label><label className="block"><span className="mb-1.5 block text-[11px] font-bold text-slate-700">{bi('Quantité', 'الكمية')}</span><span className="flex items-center gap-2"><button type="button" onClick={() => setOrderForm((form) => ({ ...form, quantity: Math.max(1, form.quantity - 1) }))} className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50" aria-label={bi('Réduire', 'نقص')}><Minus className="h-4 w-4" /></button><input type="number" min="1" max={Math.max(1, orderProduct.stock)} value={orderForm.quantity} onChange={(event) => setOrderForm((form) => ({ ...form, quantity: Math.min(Math.max(1, Number(event.target.value) || 1), Math.max(1, orderProduct.stock)) }))} className={`${formInput} text-center`} /><button type="button" onClick={() => setOrderForm((form) => ({ ...form, quantity: Math.min(Math.max(1, orderProduct.stock), form.quantity + 1) }))} className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50" aria-label={bi('Augmenter', 'زيد')}><Plus className="h-4 w-4" /></button></span></label></div>
                <div className="rounded-xl bg-violet-50 px-3.5 py-3 text-xs"><div className="flex items-center justify-between text-slate-600"><span>{bi('Sous-total', 'المجموع')}</span><strong className="text-sm font-black text-violet-900">{formatMoney(orderProduct.priceDzd * orderForm.quantity, isArabic)}</strong></div><p className="mt-1 text-[10px] text-slate-500">{bi('Le montant final sera confirmé par la boutique.', 'السعر النهائي يأكدو المتجر.')}</p></div>
                <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-violet-600"><Phone className="h-4 w-4" />{bi('Envoyer ma demande', 'ابعث طلبي')}</button>
              </form>
            )}
          </section>
        </div>
      )}
    </main>
  );
};

const formInput = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100';
