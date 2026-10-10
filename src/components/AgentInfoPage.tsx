import React, { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  ArrowLeft, ArrowRight, AudioLines, Bot, Briefcase, BedDouble, Check, ChevronDown, Clock,
  HeartPulse, Languages, Link2, Mic2, Moon, Play, QrCode, ShieldCheck, ShoppingBag,
  Sparkles, Square, UtensilsCrossed, Volume2, Wallet, Zap,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { AGENT_PRICING_OFFERS } from '../config/agentPricing';
import { BUBBLE_PALETTES } from './VoiceBubble';

interface AgentInfoPageProps {
  isLoggedIn: boolean;
  onBack: () => void;
  onOpenAgent: () => void;
  onOpenStudio: () => void;
  onLogin: () => void;
  onSignup: () => void;
}

const LOGO_URL = 'https://i.ibb.co/nqShkPNP/68126702-75e5-4de6-9b53-e51800b05e4a.jpg';

const formatDzd = (amount: number, isArabic: boolean) =>
  `${new Intl.NumberFormat(isArabic ? 'ar-DZ' : 'fr-DZ', { maximumFractionDigits: 0 }).format(amount)} ${isArabic ? 'دج' : 'DA'}`;

const SawLogo: React.FC<{ size?: number; dark?: boolean }> = ({ size = 36, dark = false }) => {
  const [failed, setFailed] = useState(false);
  return (
    <span className="inline-flex select-none items-center gap-2.5">
      <span className="shrink-0 overflow-hidden rounded-xl shadow-md shadow-violet-300/50" style={{ width: size, height: size }}>
        {failed
          ? <span className="flex h-full w-full items-center justify-center bg-violet-700 font-black text-white" style={{ fontSize: size * 0.5 }}>S</span>
          : <img src={LOGO_URL} alt="Sawtify" width={size} height={size} onError={() => setFailed(true)} className="h-full w-full object-cover" />}
      </span>
      <span className={`text-base font-black tracking-tight ${dark ? 'text-white' : 'text-[#2e1065]'}`}>Sawtify</span>
    </span>
  );
};

type Scenario = {
  id: string; icon: typeof ShoppingBag; label: [string, string]; store: [string, string];
  customer: [string, string]; agent: [string, string]; result: [string, string]; palette: number;
};

const SCENARIOS: Scenario[] = [
  { id: 'shop', icon: ShoppingBag, palette: 0, label: ['Boutique', 'متجر'], store: ['Atelier Amine', 'أتيليي أمين'],
    customer: ['Vous livrez à Oran ? La taille 40 est disponible ?', 'توصلو لوهران؟ واش كاين المقاس 40؟'],
    agent: ['Oui, nous livrons à Oran en 48 heures. La taille 40 est en stock. Je note votre commande ?', 'إيه، نوصلو لوهران في 48 ساعة. المقاس 40 متوفر. نسجّل لك الطلب؟'],
    result: ['Commande reçue · Yasmine B. · Oran', 'طلب جديد · ياسمين · وهران'] },
  { id: 'food', icon: UtensilsCrossed, palette: 3, label: ['Restaurant', 'مطعم'], store: ['Dar El Founoun', 'دار الفنون'],
    customer: ['Je voudrais une table pour quatre ce soir.', 'حاب طاولة لأربعة الليلة.'],
    agent: ['Avec plaisir. À quelle heure souhaitez-vous venir ? Je transmets la demande au restaurant.', 'بكل سرور. في أي وقت تحب تجي؟ نبعث الطلب للمطعم.'],
    result: ['Réservation · 4 personnes · 20h30', 'حجز · 4 أشخاص · 20:30'] },
  { id: 'care', icon: HeartPulse, palette: 2, label: ['Cabinet', 'عيادة'], store: ['Cabinet Dr Meriem', 'عيادة د. مريم'],
    customer: ['Je veux un rendez-vous samedi matin.', 'حاب موعد نهار السبت صباحاً.'],
    agent: ['Bien sûr. Donnez-moi votre nom et votre numéro, le cabinet vous confirmera l’horaire.', 'أكيد. عطيني اسمك ورقمك، والعيادة تأكدلك الوقت.'],
    result: ['Demande de RDV · samedi matin', 'طلب موعد · السبت صباحاً'] },
  { id: 'hotel', icon: BedDouble, palette: 1, label: ['Hôtel', 'فندق'], store: ['Hôtel Tassili', 'فندق الطاسيلي'],
    customer: ['Avez-vous une chambre double du 12 au 15 ?', 'عندكم غرفة مزدوجة من 12 حتى 15؟'],
    agent: ['Je peux transmettre votre demande de séjour. Quel est votre nom et votre numéro ?', 'نقدر نبعث طلب الإقامة تاعك. شنو اسمك ورقمك؟'],
    result: ['Séjour · 3 nuits · chambre double', 'إقامة · 3 ليالي · غرفة مزدوجة'] },
];

export const AgentInfoPage: React.FC<AgentInfoPageProps> = ({
  isLoggedIn, onBack, onOpenAgent, onOpenStudio, onLogin, onSignup,
}) => {
  const { language, setLanguage } = useLanguage();
  const isArabic = language === 'ar';
  const bi = (fr: string, ar: string) => isArabic ? ar : fr;
  const pick = (pair: [string, string]) => pair[isArabic ? 1 : 0];
  const plans = AGENT_PRICING_OFFERS.filter((offer) => offer.kind === 'subscription');
  const topups = AGENT_PRICING_OFFERS.filter((offer) => offer.kind === 'topup');
  const Arrow = ArrowRight;
  const arrowCls = `h-4 w-4 ${isArabic ? 'rotate-180' : ''}`;

  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id);
  const [step, setStep] = useState(0);
  const [listening, setListening] = useState(false);
  const timers = useRef<number[]>([]);
  const scenario = SCENARIOS.find((s) => s.id === scenarioId) || SCENARIOS[0];
  const palette = BUBBLE_PALETTES[scenario.palette];

  const stopAudio = () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); setListening(false); };

  const play = (id: string) => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    stopAudio();
    setScenarioId(id);
    setStep(0);
    [500, 1500, 3000, 4200].forEach((delay, index) => timers.current.push(window.setTimeout(() => setStep(index + 1), delay)));
  };

  useEffect(() => { play(SCENARIOS[0].id); return () => { timers.current.forEach((t) => window.clearTimeout(t)); stopAudio(); }; /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const listenDemo = () => {
    if (!('speechSynthesis' in window)) return;
    if (listening) { stopAudio(); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(pick(scenario.agent));
    utterance.lang = isArabic ? 'ar-SA' : 'fr-FR';
    utterance.rate = 0.96;
    utterance.onend = () => setListening(false);
    utterance.onerror = () => setListening(false);
    setStep(4);
    setListening(true);
    window.speechSynthesis.speak(utterance);
  };

  const primaryAction = isLoggedIn ? onOpenAgent : onSignup;
  const primaryLabel = bi(isLoggedIn ? 'Ouvrir mon espace Agent' : 'Créer mon agent', isLoggedIn ? 'افتح مساحة Agent' : 'أنشئ مساعدي');

  const sectors = [
    { icon: ShoppingBag, title: bi('E-commerce', 'التجارة الإلكترونية'), text: bi('Prix, tailles, stock, livraison : l’agent répond et recueille les commandes.', 'الأسعار والمقاسات والمخزون والتوصيل: المساعد يجاوب ويستقبل الطلبات.') },
    { icon: HeartPulse, title: bi('Santé et médical', 'الصحة والطب'), text: bi('Infos pratiques et prise de rendez-vous. Jamais de diagnostic ni de prescription.', 'معلومات عملية وحجز مواعيد. بلا تشخيص ولا وصفات.') },
    { icon: Briefcase, title: bi('Services et artisans', 'الخدمات والحرفيين'), text: bi('Présentez vos prestations, recevez les demandes de devis et de rendez-vous.', 'عرّف بخدماتك واستقبل طلبات الأسعار والمواعيد.') },
    { icon: BedDouble, title: bi('Restauration et hôtellerie', 'المطاعم والفنادق'), text: bi('Menu, tables, séjours, room service : tout passe par la voix.', 'القائمة والطاولات والإقامة وخدمة الغرف: كلش بالصوت.') },
  ];

  const steps = [
    { icon: Sparkles, title: bi('Préparez', 'حضّر'), text: bi('Ajoutez vos produits ou services, vos prix et vos questions fréquentes.', 'زيد منتجاتك أو خدماتك، الأسعار والأسئلة المتكررة.') },
    { icon: Link2, title: bi('Partagez', 'شارك'), text: bi('Un lien et un QR code prêts à poster sur Instagram, WhatsApp ou en boutique.', 'رابط وQR جاهزين للنشر على إنستغرام وواتساب أو في المحل.') },
    { icon: Zap, title: bi('Recevez', 'استقبل'), text: bi('L’agent accueille vos clients par la voix et vous transmet commandes et rendez-vous.', 'المساعد يستقبل زبائنك بالصوت ويوصلك الطلبات والمواعيد.') },
  ];

  const perks = [
    { icon: Moon, title: bi('Disponible 24h/24', 'متاح 24/24'), text: bi('Même la nuit et pendant vos congés.', 'حتى في الليل وخلال العطل.') },
    { icon: Languages, title: bi('Français et darija', 'فرنسية ودارجة'), text: bi('Vos clients parlent comme ils veulent.', 'زبائنك يهدرو كيما يحبو.') },
    { icon: QrCode, title: bi('Zéro installation', 'بلا تحميل'), text: bi('Une simple page web, sans compte client.', 'صفحة ويب بسيطة، بلا حساب للزبون.') },
    { icon: Clock, title: bi('Vous payez à la minute', 'تدفع بالدقيقة'), text: bi('Un forfait mensuel ou des recharges.', 'عرض شهري أو شحن.') },
  ];

  const faqs = [
    { q: bi('Mes clients doivent-ils créer un compte ?', 'واش الزبائن لازم يديرو حساب؟'), a: bi('Non. Ils ouvrent votre lien, parlent ou écrivent, et c’est tout.', 'لا. يفتحو الرابط ويهدرو ولا يكتبو، وخلاص.') },
    { q: bi('L’agent peut-il se tromper ?', 'واش المساعد يقدر يغلط؟'), a: bi('Il répond à partir des informations que vous préparez. Chaque commande ou rendez-vous est confirmé par vous avant d’être définitif.', 'يجاوب بالمعلومات اللي تحضّرها. كل طلب أو موعد تأكدو أنت قبل ما يولي نهائي.') },
    { q: bi('Et pour le médical ?', 'وبالنسبة للطب؟'), a: bi('Uniquement prise de rendez-vous et informations pratiques : aucun diagnostic, aucune prescription.', 'غير حجز المواعيد والمعلومات العملية: بلا تشخيص ولا وصفات.') },
    { q: bi('Comment fonctionne le paiement ?', 'كيفاش يتم الدفع؟'), a: bi('Forfaits et recharges payés via SlickPay. Les minutes Agent sont séparées de vos points voix off.', 'العروض والشحن تتدفع عبر SlickPay. دقائق Agent منفصلة على نقاط التعليق الصوتي.') },
  ];

  const renderOffer = (offer: typeof AGENT_PRICING_OFFERS[number]) => (
    <article key={offer.id} className={`relative rounded-2xl border p-5 transition hover:-translate-y-0.5 ${offer.highlighted ? 'border-violet-400 bg-white shadow-xl shadow-violet-200/60 ring-2 ring-violet-200' : 'border-violet-100 bg-white/85 shadow-sm'}`}>
      {offer.highlighted && <span className="absolute -top-3 start-5 rounded-full bg-violet-700 px-3 py-1 text-[10px] font-black text-white">{bi('Le plus choisi', 'الأكثر اختياراً')}</span>}
      <p className="text-[10px] font-black uppercase tracking-[.14em] text-violet-700">{bi(offer.kind === 'subscription' ? 'Forfait mensuel' : 'Recharge', offer.kind === 'subscription' ? 'عرض شهري' : 'شحن')}</p>
      <h3 className="mt-2 text-base font-extrabold text-slate-900">{isArabic ? offer.nameAr : offer.nameFr}</h3>
      <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{formatDzd(offer.priceDzd, isArabic)}<span className="text-xs font-bold text-slate-400">{offer.kind === 'subscription' ? bi(' / mois', ' / شهر') : ''}</span></p>
      <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500"><Check className="h-3.5 w-3.5 text-emerald-600" />{offer.minutes} {bi('minutes', 'دقيقة')}</p>
    </article>
  );

  const orbVars = { '--vb-base': palette.base, '--vb-liquid-1': palette.liquid1, '--vb-liquid-2': palette.liquid2, '--vb-liquid-3': palette.liquid3 } as React.CSSProperties;

  return (
    <main className="saw-app-background min-h-screen pb-24 text-slate-900 lg:pb-0" dir={isArabic ? 'rtl' : 'ltr'} style={{ fontFamily: isArabic ? 'var(--font-sans-arabic)' : undefined }}>
      <Helmet>
        <title>{bi('Agent Sawtify · assistant vocal pour votre activité', 'Agent Sawtify · مساعد صوتي لنشاطك')}</title>
        <meta name="description" content={bi('Un assistant vocal Sawtify pour le commerce, la santé, les services, la restauration et l’hôtellerie.', 'مساعد Sawtify صوتي للتجارة والصحة والخدمات والمطاعم والفنادق.')} />
      </Helmet>

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-violet-100/80 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={onBack} aria-label={bi('Retour à Sawtify', 'العودة إلى Sawtify')} className="rounded-xl transition hover:opacity-80"><SawLogo /></button>
            <span className="hidden rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-violet-800 sm:inline-flex">Agent IA</span>
          </div>
          <nav className="hidden items-center gap-6 text-xs font-bold text-slate-600 lg:flex" aria-label={bi('Sections', 'الأقسام')}>
            <a href="#demo" className="transition hover:text-violet-700">{bi('Démo', 'تجربة')}</a>
            <a href="#how" className="transition hover:text-violet-700">{bi('Comment ça marche', 'كيفاش يخدم')}</a>
            <a href="#sectors" className="transition hover:text-violet-700">{bi('Secteurs', 'القطاعات')}</a>
            <a href="#pricing" className="transition hover:text-violet-700">{bi('Tarifs', 'الأسعار')}</a>
            <a href="#faq" className="transition hover:text-violet-700">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setLanguage(isArabic ? 'fr' : 'ar')} className="rounded-lg border border-violet-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 transition hover:bg-violet-50">{isArabic ? 'FR' : 'عربي'}</button>
            {!isLoggedIn && <button type="button" onClick={onLogin} className="rounded-xl border border-violet-200 bg-white px-3.5 py-2.5 text-xs font-extrabold text-violet-800 transition hover:bg-violet-50">{bi('Connexion', 'دخول')}</button>}
            <button type="button" onClick={primaryAction} className="hidden items-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-violet-300/50 transition hover:bg-violet-600 sm:inline-flex">{isLoggedIn ? bi('Mon espace', 'مساحتي') : bi('Commencer', 'ابدأ')}<Arrow className={arrowCls} /></button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative mx-auto grid w-full max-w-7xl items-center gap-10 px-4 pb-14 pt-10 sm:px-6 sm:pt-14 lg:grid-cols-[1.02fr_.98fr] lg:gap-14 lg:px-8 lg:pb-24">
        <div aria-hidden="true" className="pointer-events-none absolute -top-20 start-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-fuchsia-200/40 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3.5 py-1.5 text-[11px] font-black text-violet-800 shadow-sm"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />{bi('Nouveau · l’assistant qui répond à votre place', 'جديد · مساعد يجاوب بدلك')}</span>
          <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[1.08] tracking-[-.04em] text-[#2e1065] sm:text-5xl lg:text-[3.6rem]">
            {bi('Et si votre commerce ', 'واش لو كان نشاطك ')}
            <span className="bg-gradient-to-r from-violet-700 via-fuchsia-600 to-violet-500 bg-clip-text text-transparent">{bi('parlait à vos clients', 'يهدر مع زبائنو')}</span>
            {bi(' pendant que vous dormez ?', ' وأنت راقد؟')}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-slate-600">{bi('Agent Sawtify accueille vos clients par la voix, en français ou en darija, répond avec vos infos et vous envoie commandes, rendez-vous et réservations.', 'Agent Sawtify يستقبل زبائنك بالصوت، بالفرنسية ولا بالدارجة، يجاوب بمعلوماتك ويبعثلك الطلبات والمواعيد والحجوزات.')}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={primaryAction} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-700 px-6 py-4 text-sm font-black text-white shadow-xl shadow-violet-300/60 transition hover:-translate-y-0.5 hover:bg-violet-600"><Bot className="h-4 w-4" />{primaryLabel}<Arrow className={arrowCls} /></button>
            <a href="#demo" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-white px-6 py-4 text-sm font-black text-violet-900 shadow-sm transition hover:bg-violet-50"><Play className="h-4 w-4" />{bi('Voir une conversation', 'شوف محادثة')}</a>
          </div>
          <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-500">
            {[bi('Même compte Sawtify', 'نفس حساب Sawtify'), bi('Français et darija', 'فرنسية ودارجة'), bi('Sans compte client', 'بلا حساب للزبون')].map((item) => <li key={item} className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-600" />{item}</li>)}
          </ul>
        </div>

        {/* Phone demo */}
        <div id="demo" className="relative mx-auto w-full max-w-md scroll-mt-24">
          <div aria-hidden="true" className="absolute -inset-6 rounded-[48px] bg-gradient-to-br from-violet-300/40 via-fuchsia-200/40 to-transparent blur-2xl" />
          <div className="relative rounded-[40px] border-[7px] border-[#2e1065] bg-white shadow-2xl shadow-violet-400/40">
            <div className="mx-auto mt-2 h-1.5 w-20 rounded-full bg-[#2e1065]/15" />
            <div className="flex items-center gap-3 border-b border-violet-100 px-5 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-700 to-fuchsia-500 text-white"><Bot className="h-4 w-4" /></span>
              <div className="min-w-0"><p className="truncate text-sm font-black text-slate-900">{pick(scenario.store)}</p><p className="text-[10px] font-bold text-emerald-600">{bi('● Assistant en ligne', '● المساعد متصل')}</p></div>
            </div>
            <div className="flex min-h-[290px] flex-col justify-end gap-3 px-4 py-4 text-[13px] leading-6" aria-live="polite">
              {step >= 1 && <p className="ms-auto max-w-[85%] rounded-2xl rounded-ee-sm bg-violet-700 px-4 py-2.5 text-white shadow-md">{pick(scenario.customer)}</p>}
              {step === 2 && <p className="flex w-16 justify-center gap-1 rounded-2xl rounded-es-sm border border-violet-100 bg-violet-50 px-4 py-3" aria-label="…">{[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-violet-400" style={{ animationDelay: `${i * 0.15}s` }} />)}</p>}
              {step >= 3 && <p className="max-w-[88%] rounded-2xl rounded-es-sm border border-violet-100 bg-white px-4 py-2.5 text-slate-700 shadow-md">{pick(scenario.agent)}</p>}
              {step >= 4 && <p className="inline-flex items-center gap-2 self-center rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-[11px] font-extrabold text-emerald-800"><Check className="h-3.5 w-3.5" />{pick(scenario.result)}</p>}
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-violet-100 px-4 py-3">
              <span className="saw-vb-bubble shrink-0" style={{ ...orbVars, width: 52, height: 52, transform: listening || step === 3 ? 'scale(1.12)' : 'scale(1)', transition: 'transform .4s' }} aria-hidden="true">
                <span className="saw-vb-liquid saw-vb-liquid-1" /><span className="saw-vb-liquid saw-vb-liquid-2" /><span className="saw-vb-liquid saw-vb-liquid-3" /><span className="saw-vb-shine" />
              </span>
              <button type="button" onClick={listenDemo} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-3 text-xs font-extrabold text-white transition hover:bg-violet-600">
                {listening ? <Square className="h-3.5 w-3.5" /> : <Volume2 className="h-4 w-4" />}{listening ? bi('Arrêter', 'أوقف') : bi('Écouter la réponse', 'اسمع الجواب')}
              </button>
            </div>
          </div>
          <div className="relative mt-5 flex flex-wrap justify-center gap-2" role="tablist" aria-label={bi('Choisir un métier', 'اختار نشاط')}>
            {SCENARIOS.map((item) => { const Icon = item.icon; const active = item.id === scenarioId; return (
              <button key={item.id} type="button" role="tab" aria-selected={active} onClick={() => play(item.id)} className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[11px] font-extrabold transition ${active ? 'border-violet-700 bg-violet-700 text-white shadow-md shadow-violet-300/50' : 'border-violet-200 bg-white text-violet-800 hover:bg-violet-50'}`}><Icon className="h-3.5 w-3.5" />{pick(item.label)}</button>
            ); })}
          </div>
        </div>
      </section>

      {/* ── Perks strip ── */}
      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-px overflow-hidden rounded-3xl border border-violet-100 bg-violet-100 sm:grid-cols-2 lg:grid-cols-4">
          {perks.map(({ icon: Icon, title, text }) => <div key={title} className="flex items-start gap-3 bg-white/90 p-5"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><Icon className="h-5 w-5" /></span><div><p className="text-sm font-extrabold text-slate-900">{title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{text}</p></div></div>)}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="mx-auto w-full max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-2xl text-center"><p className="text-[11px] font-black uppercase tracking-[.16em] text-violet-700">{bi('En 3 étapes', 'في 3 خطوات')}</p><h2 className="mt-2 text-3xl font-black tracking-tight text-[#2e1065] sm:text-4xl">{bi('Prêt en quelques minutes, sans technique', 'جاهز في دقائق، بلا تعقيد')}</h2></div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {steps.map(({ icon: Icon, title, text }, index) => (
            <article key={title} className="saw-glass group relative overflow-hidden rounded-3xl p-6 transition hover:-translate-y-1">
              <span className="absolute -end-2 -top-5 select-none text-[110px] font-black leading-none text-violet-100/80">{index + 1}</span>
              <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-700 to-fuchsia-500 text-white shadow-lg shadow-violet-300/50"><Icon className="h-5 w-5" /></span>
              <h3 className="relative mt-5 text-lg font-black text-[#2e1065]">{title}</h3>
              <p className="relative mt-2 text-sm leading-6 text-slate-600">{text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Sectors ── */}
      <section id="sectors" className="mx-auto w-full max-w-7xl scroll-mt-20 px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
        <div className="mb-8 max-w-2xl"><p className="text-[11px] font-black uppercase tracking-[.16em] text-violet-700">{bi('Un assistant, plusieurs métiers', 'مساعد واحد، قطاعات مختلفة')}</p><h2 className="mt-2 text-3xl font-black tracking-tight text-[#2e1065] sm:text-4xl">{bi('Pensé pour les activités qui accueillent du public', 'مناسب للأنشطة اللي تستقبل الزبائن')}</h2></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {sectors.map(({ icon: Icon, title, text }) => <article key={title} className="saw-glass rounded-3xl p-6 transition hover:-translate-y-1 hover:shadow-xl"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700"><Icon className="h-5 w-5" /></span><h3 className="mt-5 text-base font-extrabold text-slate-900">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></article>)}
        </div>
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-xs leading-6 text-emerald-900"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />{bi('Des limites claires : pas de demandes illégales ou trompeuses, et en médical, uniquement la prise de rendez-vous.', 'حدود واضحة: لا للطلبات غير القانونية أو المضللة، وفي الطب غير حجز المواعيد.')}</div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="mx-auto w-full max-w-7xl scroll-mt-20 px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
        <div className="mx-auto max-w-2xl text-center"><p className="text-[11px] font-black uppercase tracking-[.16em] text-violet-700">{bi('Tarifs', 'الأسعار')}</p><h2 className="mt-2 text-3xl font-black tracking-tight text-[#2e1065] sm:text-4xl">{bi('Des minutes Agent, séparées de vos points voix off', 'دقائق Agent منفصلة على نقاط التعليق الصوتي')}</h2><p className="mt-3 flex items-center justify-center gap-2 text-xs font-semibold text-slate-500"><Wallet className="h-4 w-4 text-violet-600" />{bi('Un seul compte Sawtify, deux soldes distincts.', 'حساب Sawtify واحد، رصيدين منفصلين.')}</p></div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{[...plans, ...topups].map(renderOffer)}</div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="mx-auto w-full max-w-3xl scroll-mt-20 px-4 pb-16 sm:px-6 lg:pb-24">
        <h2 className="text-center text-3xl font-black tracking-tight text-[#2e1065]">{bi('Vous vous demandez…', 'تسأل راسك…')}</h2>
        <div className="mt-8 space-y-3">
          {faqs.map(({ q, a }) => (
            <details key={q} className="saw-glass group rounded-2xl px-5 py-4 open:shadow-lg">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-extrabold text-slate-900 [&::-webkit-details-marker]:hidden">{q}<ChevronDown className="h-4 w-4 shrink-0 text-violet-600 transition group-open:rotate-180" /></summary>
              <p className="mt-3 text-sm leading-6 text-slate-600">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="mx-auto w-full max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-[#2e1065] via-violet-800 to-fuchsia-700 px-6 py-14 text-center shadow-2xl shadow-violet-400/40 sm:px-12">
          <div aria-hidden="true" className="pointer-events-none absolute -top-24 start-10 h-64 w-64 rounded-full bg-fuchsia-400/30 blur-3xl" />
          <div className="relative">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur"><AudioLines className="h-7 w-7" /></span>
            <h2 className="mx-auto mt-5 max-w-2xl text-3xl font-black tracking-tight text-white sm:text-4xl">{bi('Laissez votre prochain client vous entendre.', 'خلي زبونك الجاي يسمعك.')}</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-violet-100">{bi('Configurez votre espace Agent, puis partagez votre lien.', 'حضّر مساحة Agent تاعك، ومن بعد شارك رابطك.')}</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <button type="button" onClick={primaryAction} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-7 py-4 text-sm font-black text-violet-800 shadow-xl transition hover:-translate-y-0.5 hover:bg-violet-50"><Bot className="h-4 w-4" />{primaryLabel}<Arrow className={arrowCls} /></button>
              {isLoggedIn
                ? <button type="button" onClick={onOpenStudio} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/40 px-7 py-4 text-sm font-black text-white transition hover:bg-white/10"><Mic2 className="h-4 w-4" />{bi('Ouvrir la voix off', 'افتح التعليق الصوتي')}</button>
                : <button type="button" onClick={onLogin} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/40 px-7 py-4 text-sm font-black text-white transition hover:bg-white/10">{bi('J’ai déjà un compte', 'عندي حساب')}</button>}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-violet-100 bg-white/60 px-4 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <SawLogo size={30} />
          <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 transition hover:text-violet-800"><ArrowLeft className={`h-3.5 w-3.5 ${isArabic ? 'rotate-180' : ''}`} />{bi('Retour à Sawtify', 'العودة إلى Sawtify')}</button>
          <p className="text-[11px] text-slate-500">© {new Date().getFullYear()} Sawtify · {bi('Voix off et Agent IA, avec un seul compte.', 'تعليق صوتي وAgent IA بحساب واحد.')}</p>
        </div>
      </footer>

      {/* Mobile sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-violet-100 bg-white/90 p-3 backdrop-blur-xl lg:hidden" style={{ paddingBottom: 'calc(.75rem + env(safe-area-inset-bottom, 0px))' }}>
        <button type="button" onClick={primaryAction} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-700 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-violet-300/60"><Bot className="h-4 w-4" />{primaryLabel}<Arrow className={arrowCls} /></button>
      </div>
    </main>
  );
};
