import React from 'react';
import { Helmet } from 'react-helmet-async';
import {
  ArrowLeft, ArrowRight, AudioLines, Bot, Briefcase, Check,
  CreditCard, HeartPulse, MessageCircle, Mic2, QrCode, ShieldCheck, ShoppingBag,
  Sparkles, UtensilsCrossed, UserRound, Wallet,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { AGENT_PRICING_OFFERS } from '../config/agentPricing';

interface AgentInfoPageProps {
  isLoggedIn: boolean;
  onBack: () => void;
  onOpenAgent: () => void;
  onOpenStudio: () => void;
  onLogin: () => void;
  onSignup: () => void;
}

const formatDzd = (amount: number, isArabic: boolean) =>
  `${new Intl.NumberFormat(isArabic ? 'ar-DZ' : 'fr-DZ', { maximumFractionDigits: 0 }).format(amount)} ${isArabic ? 'دج' : 'DA'}`;

export const AgentInfoPage: React.FC<AgentInfoPageProps> = ({
  isLoggedIn, onBack, onOpenAgent, onOpenStudio, onLogin, onSignup,
}) => {
  const { language, setLanguage } = useLanguage();
  const isArabic = language === 'ar';
  const bi = (fr: string, ar: string) => isArabic ? ar : fr;
  const plans = AGENT_PRICING_OFFERS.filter((offer) => offer.kind === 'subscription');
  const topups = AGENT_PRICING_OFFERS.filter((offer) => offer.kind === 'topup');

  const sectors = [
    {
      icon: ShoppingBag,
      title: bi('E-commerce', 'التجارة الإلكترونية'),
      text: bi('Présentez vos offres, prix et disponibilités, répondez aux questions et recevez des commandes.', 'عرّف بعروضك وأسعارك وتوفّر المنتجات، جاوب على الأسئلة واستقبل الطلبات.'),
    },
    {
      icon: HeartPulse,
      title: bi('Santé et médical', 'الصحة والطب'),
      text: bi('Aidez les patients à trouver les informations pratiques et à demander un rendez-vous. Aucun diagnostic ni prescription.', 'عاون المرضى يلقاو المعلومات ويحجزو موعد. بلا تشخيص ولا وصفات طبية.'),
    },
    {
      icon: Briefcase,
      title: bi('Services et artisans', 'الخدمات والحرفيين'),
      text: bi('Présentez vos prestations, recueillez les demandes de devis et organisez les rendez-vous.', 'عرّف بخدماتك واستقبل طلبات الأسعار ونظّم المواعيد.'),
    },
    {
      icon: UtensilsCrossed,
      title: bi('Restauration et hôtellerie', 'المطاعم والفنادق'),
      text: bi('Répondez sur le menu et les services, recevez les réservations de table ou de séjour et les demandes de room service.', 'جاوب على القائمة والخدمات، واستقبل حجوزات الطاولات والإقامة وطلبات خدمة الغرف.'),
    },
  ];

  const features = [
    { icon: AudioLines, title: bi('Une expérience vocale', 'تجربة بالصوت'), text: bi('Vos clients peuvent parler ou écrire, en français ou en darija.', 'زبائنك يقدرو يهضرو ولا يكتبو بالفرنسية ولا بالدارجة.') },
    { icon: MessageCircle, title: bi('Des réponses préparées', 'أجوبة جاهزة'), text: bi('Ajoutez les informations et questions fréquentes propres à votre activité.', 'زيد المعلومات والأسئلة المتكررة الخاصة بنشاطك.') },
    { icon: QrCode, title: bi('Un lien à partager', 'رابط للمشاركة'), text: bi('Une page publique simple, accessible par lien ou QR code, sans compte client.', 'صفحة عامة وبسيطة، تفتح بالرابط ولا QR، بلا حساب للزبون.') },
  ];

  const renderOffer = (offer: typeof AGENT_PRICING_OFFERS[number]) => (
    <article key={offer.id} className={`rounded-2xl border p-4 ${offer.highlighted ? 'border-violet-300 bg-violet-50/80 ring-1 ring-violet-100' : 'border-slate-200 bg-white/80'}`}>
      <p className="text-[10px] font-black uppercase tracking-[.14em] text-violet-700">{bi(offer.kind === 'subscription' ? 'Forfait mensuel' : 'Recharge de minutes', offer.kind === 'subscription' ? 'عرض شهري' : 'شحن الدقائق')}</p>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-extrabold text-slate-900">{isArabic ? offer.nameAr : offer.nameFr}{offer.kind === 'subscription' ? bi(' / mois', ' / شهر') : ''}</h3>
        <strong className="text-xl font-black text-slate-950">{formatDzd(offer.priceDzd, isArabic)}</strong>
      </div>
      <p className="mt-2 text-xs font-semibold text-slate-500">{offer.minutes} {bi('minutes', 'دقيقة')}{offer.kind === 'subscription' ? bi(' par mois', ' في الشهر') : ''}</p>
    </article>
  );

  return (
    <main className="saw-app-background min-h-screen text-slate-900" dir={isArabic ? 'rtl' : 'ltr'}>
      <Helmet>
        <title>{bi('Agent Sawtify · assistant vocal pour votre activité', 'Agent Sawtify · مساعد صوتي لنشاطك')}</title>
        <meta name="description" content={bi('Un assistant vocal Sawtify pour le commerce, la santé, les services, la restauration et l’hôtellerie.', 'مساعد Sawtify صوتي للتجارة والصحة والخدمات والمطاعم والفنادق.')} />
      </Helmet>

      <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-black tracking-tight text-slate-900 transition hover:bg-white/70" aria-label={bi('Retour à Sawtify', 'العودة إلى Sawtify')}>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-700 text-white"><AudioLines className="h-5 w-5" /></span>
            Sawtify
          </button>
          <span className="hidden h-6 w-px bg-violet-200 sm:block" />
          <span className="hidden text-xs font-bold text-slate-500 sm:block">Agent Sawtify</span>
        </div>
        <nav className="flex items-center gap-2" aria-label={bi('Actions du compte', 'إجراءات الحساب')}>
          <button type="button" onClick={() => setLanguage(isArabic ? 'fr' : 'ar')} className="saw-flat rounded-lg px-3 py-2 text-[10px] font-bold text-slate-700">{isArabic ? 'FR' : 'عربي'}</button>
          {!isLoggedIn && <button type="button" onClick={onLogin} className="saw-flat hidden rounded-lg px-3 py-2 text-xs font-bold text-slate-700 sm:inline-flex">{bi('Connexion', 'تسجيل الدخول')}</button>}
          <button type="button" onClick={onOpenAgent} className="saw-flat-violet inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-extrabold sm:px-4">
            <Bot className="h-4 w-4" />{bi(isLoggedIn ? 'Mon espace' : 'Accéder à mon espace', isLoggedIn ? 'مساحتي' : 'ادخل لمساحتي')}
          </button>
        </nav>
      </header>

      <section className="mx-auto grid w-full max-w-7xl items-center gap-8 px-4 pb-10 pt-7 sm:px-6 sm:pb-14 sm:pt-12 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:pb-20">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/75 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.14em] text-violet-800"><Sparkles className="h-3.5 w-3.5" />{bi('Un assistant · plusieurs métiers', 'مساعد واحد · قطاعات مختلفة')}</span>
          <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.08] tracking-[-.045em] text-[#2e1065] sm:text-5xl lg:text-6xl">{bi('Votre activité reste à l’écoute, même quand vous êtes occupé.', 'نشاطك يبقى قريب من زبائنو حتى كي تكون مشغول.')}</h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base sm:leading-8">{bi('Agent Sawtify accueille vos clients par la voix, répond à partir des informations que vous préparez et facilite les commandes, rendez-vous, devis et réservations.', 'Agent Sawtify يستقبل الزبائن بالصوت، يجاوب بالمعلومات اللي تحضّرها ويسهّل الطلبات والمواعيد وعروض الأسعار والحجوزات.')}</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={onOpenAgent} className="saw-flat-violet inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-extrabold">
              <Bot className="h-4 w-4" />{bi(isLoggedIn ? 'Ouvrir mon espace Agent' : 'Se connecter pour continuer', isLoggedIn ? 'افتح مساحة Agent' : 'سجّل الدخول للمتابعة')}<ArrowRight className="h-4 w-4" />
            </button>
            {!isLoggedIn ? (
              <button type="button" onClick={onSignup} className="saw-flat inline-flex items-center justify-center gap-2 rounded-xl bg-white/70 px-5 py-3.5 text-sm font-bold text-violet-900">{bi('Créer un compte Sawtify', 'أنشئ حساب Sawtify')}</button>
            ) : (
              <button type="button" onClick={onOpenStudio} className="saw-flat inline-flex items-center justify-center gap-2 rounded-xl bg-white/70 px-5 py-3.5 text-sm font-bold text-violet-900"><Mic2 className="h-4 w-4" />{bi('Ouvrir la voix off', 'افتح التعليق الصوتي')}</button>
            )}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] font-semibold text-slate-500">
            <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600" />{bi('Même compte Sawtify', 'نفس حساب Sawtify')}</span>
            <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600" />{bi('Français et darija', 'الفرنسية والدارجة')}</span>
            <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600" />{bi('Sans compte client', 'بلا حساب للزبون')}</span>
          </div>
        </div>

        <div className="saw-glass relative mx-auto w-full max-w-xl overflow-hidden rounded-[28px] p-4 sm:p-6">
          <div aria-hidden="true" className="pointer-events-none absolute -end-16 -top-20 h-52 w-52 rounded-full bg-violet-200/50" />
          <div className="relative">
            <div className="flex items-center gap-3 border-b border-violet-100 pb-4"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-700 text-white"><Bot className="h-5 w-5" /></span><div><p className="text-[10px] font-black uppercase tracking-[.13em] text-violet-700">Agent Sawtify</p><p className="text-sm font-extrabold text-slate-900">{bi('Exemple de parcours client', 'مثال على تجربة الزبون')}</p></div><span className="ms-auto flex h-2.5 w-2.5 rounded-full bg-emerald-500" /></div>
            <div className="mt-5 space-y-3 text-xs leading-5">
              <p className="ms-auto max-w-[88%] rounded-2xl rounded-ee-sm bg-violet-700 px-3.5 py-2.5 text-white">{bi('Bonjour, je voudrais réserver pour deux personnes.', 'سلام، حاب نحجز لشخصين.')}</p>
              <p className="max-w-[88%] rounded-2xl rounded-es-sm border border-violet-100 bg-white px-3.5 py-2.5 text-slate-700">{bi('Avec plaisir. Pour quelle date et à quelle heure souhaitez-vous venir ?', 'مرحبا بيك. لأي تاريخ ووقت تحب الحجز؟')}</p>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {sectors.map(({ icon: Icon, title }) => <span key={title} className="inline-flex min-w-0 items-center gap-1.5 rounded-xl border border-violet-100 bg-white/80 px-2.5 py-2 text-[9px] font-bold text-slate-600"><Icon className="h-3.5 w-3.5 shrink-0 text-violet-700" /><span className="truncate">{title}</span></span>)}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8" aria-labelledby="agent-sectors-title">
        <div className="mb-5 max-w-3xl"><p className="text-[10px] font-black uppercase tracking-[.16em] text-violet-700">{bi('Une base, des usages adaptés', 'نفس الأساس واستعمالات مختلفة')}</p><h2 id="agent-sectors-title" className="mt-2 text-2xl font-black tracking-tight text-[#2e1065] sm:text-3xl">{bi('Pensé pour les activités qui accueillent du public', 'مناسب للأنشطة اللي تتعامل مع الزبائن')}</h2></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {sectors.map(({ icon: Icon, title, text }) => <article key={title} className="saw-glass rounded-2xl p-4 sm:p-5"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><Icon className="h-5 w-5" /></span><h3 className="mt-4 text-sm font-extrabold text-slate-900">{title}</h3><p className="mt-2 text-xs leading-5 text-slate-600">{text}</p></article>)}
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[.85fr_1.15fr] lg:px-8">
        <div className="saw-glass rounded-[26px] p-5 sm:p-7"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><ShieldCheck className="h-5 w-5" /></span><h2 className="mt-4 text-xl font-black text-[#2e1065]">{bi('Des limites claires, dès le départ', 'حدود واضحة من البداية')}</h2><ul className="mt-4 space-y-3 text-xs leading-5 text-slate-600"><li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{bi('Pas de demandes illégales, dangereuses, trompeuses ou contraires à l’éthique.', 'لا للطلبات غير القانونية أو الخطيرة أو المضللة أو المخالفة للأخلاق.')}</li><li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{bi('Dans le domaine médical : prise de rendez-vous et informations pratiques uniquement, sans diagnostic ni prescription.', 'في المجال الطبي: حجز المواعيد والمعلومات العملية فقط، بلا تشخيص ولا وصفات.')}</li><li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{bi('Les échanges vocaux ne sont pas enregistrés comme des conversations.', 'المحادثات الصوتية ما تتسجلش كمحادثات.')}</li></ul></div>
        <div className="saw-glass rounded-[26px] p-5 sm:p-7"><div className="grid gap-4 sm:grid-cols-3">{features.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-2xl border border-violet-100 bg-white/65 p-4"><Icon className="h-5 w-5 text-violet-700" /><h3 className="mt-3 text-xs font-extrabold text-slate-900">{title}</h3><p className="mt-2 text-[10px] leading-5 text-slate-600">{text}</p></article>)}</div><div className="mt-4 flex items-start gap-3 rounded-2xl border border-violet-100 bg-violet-50/70 p-4"><UserRound className="mt-0.5 h-4 w-4 shrink-0 text-violet-700" /><p className="text-[11px] leading-5 text-slate-600">{bi('Vous gardez la main : préparez les informations, les réponses, les offres et les règles de votre activité.', 'أنت تتحكم: حضّر المعلومات والأجوبة والعروض والقواعد الخاصة بنشاطك.')}</p></div></div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8" aria-labelledby="agent-pricing-title">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-violet-700">{bi('Un portefeuille dédié', 'رصيد خاص')}</p><h2 id="agent-pricing-title" className="mt-2 text-2xl font-black tracking-tight text-[#2e1065] sm:text-3xl">{bi('Des minutes Agent, séparées des points voix off', 'دقائق Agent منفصلة على نقاط التعليق الصوتي')}</h2></div><CreditCard className="hidden h-8 w-8 text-violet-500 sm:block" /></div>
        <div className="grid gap-4 rounded-[28px] border border-violet-100 bg-white/65 p-4 sm:p-6 lg:grid-cols-[.8fr_1.2fr]">
          <div><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700"><Wallet className="h-5 w-5" /></span><h3 className="mt-4 text-lg font-black text-slate-900">{bi('Un compte. Deux espaces.', 'حساب واحد. مساحتين.')}</h3><p className="mt-2 text-xs leading-6 text-slate-600">{bi('Connectez-vous une seule fois à Sawtify. Les minutes Agent et les points de voix off ont des soldes distincts.', 'سجّل الدخول مرة وحدة إلى Sawtify. دقائق Agent ونقاط التعليق الصوتي عندهم أرصدة منفصلة.')}</p><p className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-slate-500"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{bi('Paiement des forfaits et recharges Agent via SlickPay.', 'الدفع على عروض وشحن Agent عبر SlickPay.')}</p></div>
          <div><div className="grid gap-3 sm:grid-cols-2">{plans.map(renderOffer)}</div><div className="mt-3 grid gap-3 sm:grid-cols-2">{topups.map(renderOffer)}</div></div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-12 pt-7 text-center sm:px-6 lg:px-8">
        <div className="saw-glass rounded-[28px] px-5 py-8 sm:px-8 sm:py-10"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-700 text-white"><Bot className="h-6 w-6" /></span><h2 className="mt-4 text-2xl font-black tracking-tight text-[#2e1065] sm:text-3xl">{bi('Prêt à accueillir vos clients autrement ?', 'حاب تستقبل زبائنك بطريقة جديدة؟')}</h2><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">{bi('Configurez votre espace Agent, puis partagez votre lien client.', 'حضّر مساحة Agent تاعك، ومن بعد شارك رابط الزبائن.')}</p><div className="mt-6 flex flex-wrap justify-center gap-3"><button type="button" onClick={onOpenAgent} className="saw-flat-violet inline-flex items-center gap-2 rounded-xl px-5 py-3.5 text-sm font-extrabold">{bi(isLoggedIn ? 'Ouvrir mon espace Agent' : 'Se connecter pour continuer', isLoggedIn ? 'افتح مساحة Agent' : 'سجّل الدخول للمتابعة')}<ArrowRight className="h-4 w-4" /></button>{!isLoggedIn && <button type="button" onClick={onLogin} className="saw-flat rounded-xl bg-white/70 px-5 py-3.5 text-sm font-bold text-violet-900">{bi('J’ai déjà un compte', 'عندي حساب من قبل')}</button>}</div></div>
        <button type="button" onClick={onBack} className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-slate-500 transition hover:text-violet-800"><ArrowLeft className="h-3.5 w-3.5" />{bi('Retour à Sawtify', 'العودة إلى Sawtify')}</button>
      </section>

      <footer className="border-t border-violet-100 px-4 py-5 text-center text-[10px] text-slate-500">© {new Date().getFullYear()} Sawtify · {bi('Voix off et Agent IA, avec un seul compte.', 'تعليق صوتي وAgent IA بحساب واحد.')}</footer>
    </main>
  );
};
