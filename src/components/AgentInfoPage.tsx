import React from 'react';
import { Helmet } from 'react-helmet-async';
import {
  ArrowLeft, ArrowRight, AudioLines, Bot, Check, CreditCard, MessageCircle,
  Mic2, QrCode, Sparkles, Store, UserRound, Wallet,
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

  const features = [
    { icon: Store, title: bi('Votre catalogue au centre', 'كتالوجك في الواجهة'), text: bi('Présentez prix, tailles, stock et détails utiles dans un espace dédié à votre boutique.', 'عرّف بالأسعار والمقاسات والمخزون والتفاصيل المهمة في مساحة متجرك.') },
    { icon: MessageCircle, title: bi('Des réponses préparées', 'أجوبة جاهزة'), text: bi('Ajoutez vos questions fréquentes sur la livraison, les échanges et vos produits.', 'زيد الأسئلة المتكررة حول التوصيل والتبديل والمنتجات.') },
    { icon: AudioLines, title: bi('Une expérience vocale', 'تجربة بالصوت'), text: bi('Choisissez une voix et testez une expérience en français ou en darija.', 'اختار صوت وجرّب تجربة بالفرنسية ولا بالدارجة.') },
    { icon: QrCode, title: bi('Un lien et un QR', 'رابط ورمز QR'), text: bi('Préparez un lien client et son QR code pour les partager facilement.', 'حضّر رابط للزبائن ورمز QR باش تشاركهم بسهولة.') },
  ];

  const steps = [
    { number: '01', icon: UserRound, title: bi('Utilisez votre compte Sawtify', 'استعمل حساب Sawtify تاعك'), text: bi('Pas de deuxième compte : connectez-vous avec les mêmes identifiants que pour la voix off.', 'ما تحتاجش حساب ثاني: ادخل بنفس معلومات حساب التعليق الصوتي.') },
    { number: '02', icon: Store, title: bi('Préparez votre espace boutique', 'حضّر مساحة متجرك'), text: bi('Renseignez votre boutique, votre catalogue, vos réponses fréquentes et la voix choisie.', 'دخل معلومات المتجر والكتالوج والأسئلة المتكررة والصوت اللي اخترتو.') },
    { number: '03', icon: Mic2, title: bi('Testez et partagez', 'جرّب وشارك'), text: bi('Vérifiez la page client, puis partagez le lien ou le QR code avec vos clients.', 'تأكد من صفحة الزبون، ومن بعد شارك الرابط ولا رمز QR مع زبائنك.') },
  ];

  const renderOffer = (offer: typeof AGENT_PRICING_OFFERS[number]) => (
    <article key={offer.id} className={`rounded-2xl border p-4 ${offer.highlighted ? 'border-violet-300 bg-violet-50/80 ring-1 ring-violet-100' : 'border-slate-200 bg-white'}`}>
      <p className="text-[10px] font-black uppercase tracking-[.14em] text-violet-700">{bi(offer.kind === 'subscription' ? 'Forfait mensuel' : 'Recharge de minutes', offer.kind === 'subscription' ? 'عرض شهري' : 'شحن الدقائق')}</p>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-extrabold text-slate-900">{isArabic ? offer.nameAr : offer.nameFr}{offer.kind === 'subscription' ? bi(' / mois', ' / شهر') : ''}</h3>
        <strong className="text-xl font-black text-slate-950">{formatDzd(offer.priceDzd, isArabic)}</strong>
      </div>
      <p className="mt-2 text-xs font-semibold text-slate-500">{offer.minutes} {bi('minutes', 'دقيقة')}{offer.kind === 'subscription' ? bi(' par mois', ' في الشهر') : ''}</p>
    </article>
  );

  return (
    <main className="min-h-screen overflow-hidden bg-[#090611] text-white" dir={isArabic ? 'rtl' : 'ltr'}>
      <Helmet>
        <title>{bi('Agent IA pour votre boutique · Sawtify', 'مساعد Sawtify الذكي لمتجرك')}</title>
        <meta name="description" content={bi('Découvrez Agent IA Sawtify : préparez un assistant vocal de boutique, son catalogue, sa FAQ et son lien client.', 'اكتشف مساعد Sawtify الذكي: حضّر مساعد صوتي لمتجرك والكتالوج والأسئلة المتكررة ورابط الزبائن.')}/>
      </Helmet>
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[660px] bg-[radial-gradient(ellipse_at_50%_0%,rgba(139,92,246,.24),transparent_62%)]" />

      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-5 sm:px-6 lg:px-8">
        <button type="button" onClick={onBack} className="flex items-center gap-2 text-sm font-black tracking-tight text-white" aria-label={bi('Retour à Sawtify', 'العودة إلى Sawtify')}>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500"><AudioLines className="h-5 w-5" /></span>
          Sawtify
        </button>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setLanguage(isArabic ? 'fr' : 'ar')} className="rounded-lg border border-white/15 px-3 py-2 text-[10px] font-bold text-slate-200 hover:bg-white/10">{isArabic ? 'FR' : 'عربي'}</button>
          {!isLoggedIn && <button type="button" onClick={onLogin} className="hidden rounded-lg px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/10 sm:inline-flex">{bi('Se connecter', 'تسجيل الدخول')}</button>}
          <button type="button" onClick={onOpenAgent} className="inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-xs font-extrabold text-violet-800 shadow-lg shadow-violet-950/20 transition hover:bg-violet-50 sm:px-4">
            <Bot className="h-4 w-4" />{bi(isLoggedIn ? 'Ouvrir Agent IA' : 'Voir Agent IA', isLoggedIn ? 'افتح Agent IA' : 'شاهد Agent IA')}
          </button>
        </div>
      </header>

      <section className="relative z-[1] mx-auto grid w-full max-w-7xl items-center gap-12 px-4 pb-20 pt-10 sm:px-6 sm:pt-16 lg:grid-cols-[1.08fr_.92fr] lg:px-8 lg:pb-28 lg:pt-20">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-300/25 bg-violet-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.15em] text-violet-200"><Sparkles className="h-3.5 w-3.5" />{bi('Agent IA · espace boutique', 'مساعد ذكي · مساحة المتجر')}</span>
          <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[1.08] tracking-[-.04em] sm:text-5xl lg:text-6xl">{bi('Votre boutique répond. Même quand vous êtes occupé.', 'متجرك يجاوب حتى كي تكون مشغول.')}</h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base sm:leading-8">{bi('Préparez un assistant vocal pour présenter vos produits, répondre aux questions fréquentes et orienter vos clients depuis une page simple à partager.', 'حضّر مساعد صوتي يعرّف بمنتجاتك، يجاوب على الأسئلة المتكررة ويوجّه زبائنك من صفحة سهلة للمشاركة.')}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={onOpenAgent} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-violet-950/30 transition hover:brightness-110">
              <Bot className="h-4 w-4" />{bi(isLoggedIn ? 'Entrer dans mon Agent IA' : 'Découvrir l’espace Agent IA', isLoggedIn ? 'ادخل لمساعدي الذكي' : 'اكتشف مساحة Agent IA')}<ArrowRight className="h-4 w-4" />
            </button>
            {!isLoggedIn ? (
              <button type="button" onClick={onSignup} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-white/10">{bi('Créer mon compte Sawtify', 'أنشئ حساب Sawtify')}</button>
            ) : (
              <button type="button" onClick={onOpenStudio} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-white/10"><Mic2 className="h-4 w-4" />{bi('Ouvrir la voix off', 'افتح التعليق الصوتي')}</button>
            )}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] font-semibold text-slate-400"><span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" />{bi('Un seul compte Sawtify', 'حساب Sawtify واحد')}</span><span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" />{bi('Studio voix off + Agent IA', 'استوديو التعليق الصوتي + Agent IA')}</span><span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" />{bi('Français et darija', 'الفرنسية والدارجة')}</span></div>
        </div>

        <div className="relative mx-auto w-full max-w-xl">
          <div className="absolute -inset-8 rounded-[40px] bg-gradient-to-br from-violet-600/20 via-fuchsia-500/10 to-cyan-400/10 blur-3xl" />
          <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[#11101b]/95 p-5 shadow-[0_30px_100px_rgba(0,0,0,.4)] sm:p-7">
            <div className="flex items-center justify-between border-b border-white/10 pb-4"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500"><Bot className="h-5 w-5" /></span><div><p className="text-[10px] font-black uppercase tracking-[.15em] text-violet-300">Agent IA Sawtify</p><p className="mt-1 text-sm font-extrabold">{bi('Assistant de boutique', 'مساعد المتجر')}</p></div></div><span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[9px] font-bold text-emerald-300">{bi('Aperçu', 'معاينة')}</span></div>
            <div className="mt-5 space-y-3">
              <div className="max-w-[88%] rounded-2xl rounded-bs-sm border border-white/10 bg-white/5 px-4 py-3 text-xs leading-6 text-slate-200">{bi('Bonjour ! Je peux vous renseigner sur nos produits, les tailles et la livraison. Que recherchez-vous ?', 'سلام! نقدر نعاونك بالمنتجات والمقاسات والتوصيل. واش حاب تعرف؟')}</div>
              <div className="ms-auto max-w-[78%] rounded-2xl rounded-be-sm bg-violet-600 px-4 py-3 text-xs leading-6 text-white">{bi('Vous avez la taille 40 ?', 'كاين المقاس 40؟')}</div>
              <div className="flex max-w-[92%] items-center gap-2 rounded-2xl rounded-bs-sm border border-violet-400/20 bg-violet-500/10 px-4 py-3 text-xs leading-6 text-violet-100"><AudioLines className="h-4 w-4 shrink-0 text-violet-300" />{bi('Oui, la taille 40 est disponible. Voulez-vous voir les autres tailles ?', 'إيه، المقاس 40 متوفر. تحب تشوف المقاسات الأخرى؟')}</div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-4"><span className="rounded-full border border-white/10 px-3 py-1.5 text-[9px] font-bold text-slate-400">{bi('Catalogue', 'الكتالوج')}</span><span className="rounded-full border border-white/10 px-3 py-1.5 text-[9px] font-bold text-slate-400">FAQ</span><span className="rounded-full border border-white/10 px-3 py-1.5 text-[9px] font-bold text-slate-400">{bi('Voix', 'الصوت')}</span><span className="rounded-full border border-white/10 px-3 py-1.5 text-[9px] font-bold text-slate-400">QR</span></div>
          </div>
        </div>
      </section>

      <section className="relative z-[1] mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-2xl text-center"><p className="text-[10px] font-black uppercase tracking-[.2em] text-violet-300">{bi('À quoi sert Agent IA ?', 'واش يدير Agent IA؟')}</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{bi('Un espace simple pour accueillir vos clients', 'مساحة بسيطة لاستقبال زبائنك')}</h2><p className="mt-3 text-sm leading-7 text-slate-400">{bi('Centralisez les informations utiles à votre assistant et donnez à vos clients un point de contact vocal.', 'جمع المعلومات المهمة لمساعدك وخلي لزبائنك وسيلة تواصل بالصوت.')}</p></div>
        <div className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {features.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-2xl border border-white/10 bg-white/[.035] p-5"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300"><Icon className="h-5 w-5" /></span><h3 className="mt-4 text-sm font-extrabold">{title}</h3><p className="mt-2 text-xs leading-6 text-slate-400">{text}</p></article>)}
        </div>
      </section>

      <section className="relative z-[1] mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-2xl text-center"><p className="text-[10px] font-black uppercase tracking-[.2em] text-violet-300">{bi('En trois étapes', 'في ثلاث خطوات')}</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{bi('Comment ça marche ?', 'كيفاش يخدم؟')}</h2></div>
        <div className="mt-9 grid gap-4 lg:grid-cols-3">
          {steps.map(({ number, icon: Icon, title, text }) => <article key={number} className="rounded-2xl border border-white/10 bg-[#11101b] p-5 sm:p-6"><div className="flex items-center justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300"><Icon className="h-5 w-5" /></span><span className="text-2xl font-black text-white/10">{number}</span></div><h3 className="mt-5 text-base font-extrabold">{title}</h3><p className="mt-2 text-xs leading-6 text-slate-400">{text}</p></article>)}
        </div>
      </section>

      <section className="relative z-[1] mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-8 rounded-[28px] border border-violet-300/20 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/[.04] p-5 sm:p-8 lg:grid-cols-[.85fr_1.15fr] lg:p-10">
          <div><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300"><Wallet className="h-5 w-5" /></span><h2 className="mt-4 text-2xl font-black">{bi('Un compte. Deux espaces.', 'حساب واحد. مساحتين.')}</h2><p className="mt-3 text-sm leading-7 text-slate-300">{bi('Connectez-vous une seule fois à Sawtify. Passez librement du Studio voix off à Agent IA avec le même compte.', 'سجّل الدخول مرة وحدة إلى Sawtify. تنقّل بين استوديو التعليق الصوتي وAgent IA بنفس الحساب.')}</p><div className="mt-5 space-y-3 text-xs leading-5 text-slate-300"><p className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />{bi('Vos points servent aux voix off dans le Studio.', 'نقاطك تستعملها للتعليق الصوتي في الاستوديو.')}</p><p className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />{bi('Les minutes Agent ont leur propre solde et leurs forfaits SlickPay.', 'دقائق Agent عندها رصيد وعروض SlickPay خاصة بها.')}</p></div></div>
          <div><div className="grid gap-3 sm:grid-cols-2">{plans.map(renderOffer)}</div><div className="mt-3 grid gap-3 sm:grid-cols-2">{topups.map(renderOffer)}</div><p className="mt-3 text-[10px] leading-5 text-slate-500">{bi('Paiement des minutes Agent via SlickPay. Les points de voix off restent séparés.', 'الدفع على دقائق Agent عبر SlickPay. نقاط التعليق الصوتي تبقى منفصلة.')}</p></div>
        </div>
      </section>

      <section className="relative z-[1] mx-auto w-full max-w-7xl px-4 pb-20 pt-8 text-center sm:px-6 lg:px-8">
        <h2 className="text-3xl font-black tracking-tight sm:text-4xl">{bi('Prêt à découvrir Agent IA ?', 'حاب تكتشف Agent IA؟')}</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400">{bi('Ouvrez votre espace ou connectez-vous à votre compte Sawtify existant.', 'افتح مساحتك ولا ادخل لحساب Sawtify اللي عندك.')}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3"><button type="button" onClick={onOpenAgent} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3.5 text-sm font-extrabold text-white"><Bot className="h-4 w-4" />{bi(isLoggedIn ? 'Ouvrir Agent IA' : 'Continuer vers Agent IA', isLoggedIn ? 'افتح Agent IA' : 'واصل إلى Agent IA')}<ArrowRight className="h-4 w-4" /></button>{!isLoggedIn && <button type="button" onClick={onLogin} className="rounded-xl border border-white/15 px-5 py-3.5 text-sm font-bold text-slate-200 hover:bg-white/10">{bi('J’ai déjà un compte', 'عندي حساب من قبل')}</button>}</div>
        <p className="mx-auto mt-8 max-w-2xl text-[10px] leading-5 text-slate-500">{bi('Note : l’espace Agent est actuellement présenté en aperçu. Les réglages de démonstration sont conservés localement sur cet appareil.', 'ملاحظة: مساحة Agent معروضة حالياً في وضع المعاينة. إعدادات العرض التجريبي محفوظة محلياً على هذا الجهاز.')}</p>
        <button type="button" onClick={onBack} className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-slate-500 transition hover:text-white"><ArrowLeft className="h-3.5 w-3.5" />{bi('Retour au site Sawtify', 'العودة إلى Sawtify')}</button>
      </section>

      <footer className="border-t border-white/10 px-4 py-5 text-center text-[10px] text-slate-500">© {new Date().getFullYear()} Sawtify · {bi('Voix off et Agent IA, avec un seul compte.', 'تعليق صوتي وAgent IA بحساب واحد.')}</footer>
    </main>
  );
};
