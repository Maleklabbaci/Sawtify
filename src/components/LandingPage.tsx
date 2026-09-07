import React, { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Play,
  Pause,
  ShieldCheck,
  Volume2,
  Sparkles,
  Mic,
  Zap,
  Download,
  Star,
  ChevronDown,
  CheckCircle2,
  AudioLines,
} from "lucide-react";
import { motion } from "motion/react";

interface LandingPageProps {
  onLoginClick: () => void;
  onSigninClick: () => void;
  language: "fr" | "ar";
  setLanguage: (lang: "fr" | "ar") => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onLoginClick,
  onSigninClick,
  language,
  setLanguage,
}) => {
  const isRTL = language === "ar";
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    const v = videoRef.current;
    if (v) {
      v.playbackRate = 1;
      v.play().catch(() => {});
    }
  }, []);

  const ArrowIcon = ({ className = "w-4 h-4" }: { className?: string }) =>
    isRTL ? <ArrowLeft className={className} /> : <ArrowRight className={className} />;

  const t = {
    navAbout: isRTL ? "من نحن" : "À propos",
    navVoices: isRTL ? "الأصوات" : "Voix",
    navFeatures: isRTL ? "الميزات" : "Fonctionnalités",
    navPricing: isRTL ? "الأسعار" : "Tarifs",
    login: isRTL ? "دخول" : "Connexion",
    start: isRTL ? "ابدأ الآن" : "Commencer",
    badge: isRTL ? "منصة الصوت الذكي رقم 1 في الجزائر" : "N°1 de la voix IA en Algérie",
    heroTitleA: isRTL ? "حوّل أي نص إلى" : "Transformez vos textes en",
    heroTitleB: isRTL ? "صوت بشري أصيل" : "voix humaine authentique",
    heroDesc: isRTL
      ? "أنشئ تعليقات صوتية بالدارجة الجزائرية بجودة استوديو. سريعة، طبيعية، وجاهزة للإعلانات والريلز."
      : "Créez des voice-over en darija algérienne, qualité studio. Rapide, naturelle, prête pour pubs et reels.",
    ctaPrimary: isRTL ? "ابدأ مجاناً" : "Essayer gratuitement",
    ctaSecondary: isRTL ? "استمع للأصوات" : "Écouter les voix",
    statsUsers: isRTL ? "مستخدم" : "Créateurs",
    statsVoices: isRTL ? "أصوات" : "Voix",
    statsLatency: isRTL ? "ثوانٍ" : "Secondes",
    statsLocal: isRTL ? "دفع محلي" : "Paiement local",
    sectionVoices: isRTL ? "أصوات حقيقية" : "Des voix réelles",
    sectionVoicesSub: isRTL ? "عاطفة حقيقية." : "Une émotion réelle.",
    sectionFeatures: isRTL ? "كل ما تحتاجه" : "Tout ce qu’il faut",
    sectionFeaturesSub: isRTL ? "لصناعة صوت مثالي." : "pour un son parfait.",
    pricingTitle: isRTL ? "ادفع فقط لما تستخدمه" : "Payez seulement ce que vous utilisez",
    pricingSub: isRTL ? "بدون اشتراك شهري. النقاط لا تنتهي." : "Sans abonnement. Les points n’expirent pas.",
    faqTitle: isRTL ? "الأسئلة الشائعة" : "Questions fréquentes",
    finalTitleA: isRTL ? "ابدأ صناعة" : "Commencez à créer",
    finalTitleB: isRTL ? "صوتك" : "votre voix",
    finalTitleC: isRTL ? "اليوم." : "aujourd’hui.",
    finalSub: isRTL ? "50 نقطة مجانية عند التسجيل." : "50 points offerts à l’inscription.",
  };

  const voices = [
    {
      id: "amin",
      name: isRTL ? "أمين" : "Amin",
      tag: isRTL ? "تجاري • دارجة" : "Commercial • Darija",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    },
    {
      id: "yasmine",
      name: isRTL ? "ياسمين" : "Yasmine",
      tag: isRTL ? "إعلان • ناعم" : "Ads • Soft",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    },
    {
      id: "khalid",
      name: isRTL ? "خالد" : "Khalid",
      tag: isRTL ? "وثائقي • عميق" : "Doc • Deep",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    },
    {
      id: "layla",
      name: isRTL ? "ليلى" : "Layla",
      tag: isRTL ? "سوشيال • حيوي" : "Social • Energetic",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    },
  ];

  const features = [
    {
      icon: Mic,
      title: isRTL ? "دارجة أصيلة" : "Darija authentique",
      desc: isRTL
        ? "نبرات جزائرية حقيقية، مع code-switching طبيعي FR/AR."
        : "Vraies intonations algériennes, code-switching FR/AR naturel.",
    },
    {
      icon: Sparkles,
      title: isRTL ? "محسّن سيناريو" : "Script enhancer",
      desc: isRTL
        ? "حسّن نصك للع口语 مع balises d’émotion."
        : "Optimise ton texte pour l’oral avec balises d’émotion.",
    },
    {
      icon: Volume2,
      title: isRTL ? "تحكم دقيق" : "Contrôle précis",
      desc: isRTL
        ? "السرعة، النبرة، الوقفات: تحكم كامل."
        : "Vitesse, pitch, pauses: contrôle total.",
    },
    {
      icon: Download,
      title: isRTL ? "تصدير فوري" : "Export instantané",
      desc: isRTL
        ? "MP3 / WAV جاهز للمونتاج."
        : "MP3 / WAV prêts pour le montage.",
    },
    {
      icon: Zap,
      title: isRTL ? "توليد سريع" : "Génération rapide",
      desc: isRTL
        ? "من النص إلى الصوت في ثوانٍ."
        : "Du texte à la voix en quelques secondes.",
    },
    {
      icon: ShieldCheck,
      title: isRTL ? "دفع جزائري" : "Paiement algérien",
      desc: isRTL
        ? "Edahabia & CIB عبر SATIM."
        : "Edahabia & CIB via SATIM.",
    },
  ];

  const plans = [
    {
      name: isRTL ? "Starter" : "Starter",
      price: "990",
      points: "500",
      desc: isRTL ? "للتجربة والبداية" : "Pour tester et démarrer",
      popular: false,
    },
    {
      name: isRTL ? "Pro" : "Pro",
      price: "2 490",
      points: "1 500",
      desc: isRTL ? "للمبدعين النشطين" : "Pour créateurs actifs",
      popular: true,
    },
    {
      name: isRTL ? "Agency" : "Agency",
      price: "4 990",
      points: "3 500",
      desc: isRTL ? "للفرق والوكالات" : "Pour équipes & agences",
      popular: false,
    },
  ];

  const faqs = isRTL
    ? [
        {
          q: "هل الأصوات صالحة للاستخدام التجاري؟",
          a: "نعم. كل الملفات قابلة للاستخدام في الإعلانات، الريلز، اليوتيوب والمشاريع التجارية.",
        },
        {
          q: "كيف يعمل نظام النقاط؟",
          a: "تشتري رصيداً مرة واحدة. التوليد الصوتي = 20 نقطة. النقاط لا تنتهي صلاحيتها.",
        },
        {
          q: "هل تدعمون الذهبية و CIB؟",
          a: "نعم عبر SATIM. الدفع محلي بالدينار الجزائري.",
        },
        {
          q: "هل هناك اشتراك شهري؟",
          a: "لا. Sawtify Pay-As-You-Go: تدفع فقط ما تستخدمه.",
        },
      ]
    : [
        {
          q: "Les voix sont-elles libres de droits ?",
          a: "Oui. Usage commercial autorisé: pubs, reels, YouTube, projets pro.",
        },
        {
          q: "Comment marche le système de points ?",
          a: "Tu achètes un pack une fois. 1 génération vocale = 20 points. Les points n’expirent jamais.",
        },
        {
          q: "Edahabia et CIB sont-ils acceptés ?",
          a: "Oui, via SATIM. Paiement local en DZD.",
        },
        {
          q: "Y a-t-il un abonnement mensuel ?",
          a: "Non. Sawtify est 100% Pay-As-You-Go.",
        },
      ];

  const toggleVoice = (id: string, url: string) => {
    if (playingId === id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    audioRef.current?.pause();
    audioRef.current = new Audio(url);
    audioRef.current.play();
    audioRef.current.onended = () => setPlayingId(null);
    setPlayingId(id);
  };

  return (
    <div
      className="min-h-screen bg-[#F4F1EC] text-slate-900 overflow-x-hidden"
      dir={isRTL ? "rtl" : "ltr"}
      style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}
    >
      {/* subtle top glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.12),transparent_55%)]" />

      {/* floating nav */}
      <div className="sticky top-4 z-50 px-4">
        <div className="mx-auto max-w-6xl rounded-full border border-white/70 bg-white/80 backdrop-blur-xl shadow-[0_10px_40px_rgba(15,23,42,0.08)] px-3 py-2 flex items-center justify-between">
          <div className="hidden md:flex items-center gap-5 text-sm text-slate-600 px-3">
            <a href="#about" className="hover:text-slate-900 transition">{t.navAbout}</a>
            <a href="#voices" className="hover:text-slate-900 transition">{t.navVoices}</a>
          </div>

          <div className="flex items-center gap-2 px-2">
            <div className="w-8 h-8 rounded-full bg-purple-700 overflow-hidden shadow-sm">
              <img
                src="https://i.ibb.co/nqShkPNP/68126702-75e5-4de6-9b53-e51800b05e4a.jpg"
                alt="Sawtify"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="font-semibold tracking-tight">Sawtify</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-5 text-sm text-slate-600 px-2">
              <a href="#features" className="hover:text-slate-900 transition">{t.navFeatures}</a>
              <a href="#pricing" className="hover:text-slate-900 transition">{t.navPricing}</a>
            </div>
            <button
              onClick={() => setLanguage(language === "fr" ? "ar" : "fr")}
              className="px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 hover:bg-slate-200 transition"
            >
              {language === "fr" ? "AR" : "FR"}
            </button>
            <button
              onClick={onLoginClick}
              className="hidden sm:inline-flex px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-slate-900"
            >
              {t.login}
            </button>
            <button
              onClick={onSigninClick}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-950 text-white px-4 py-2 text-sm font-semibold hover:bg-purple-700 transition"
            >
              {t.start}
              <ArrowIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* HERO CARD */}
      <section id="about" className="relative z-10 px-4 pt-6 pb-8">
        <div className="mx-auto max-w-6xl rounded-[2rem] bg-white shadow-[0_20px_80px_rgba(15,23,42,0.08)] overflow-hidden">
          <div className="grid lg:grid-cols-2 gap-8 items-center p-6 sm:p-10 lg:p-12">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-purple-50 text-purple-700 border border-purple-100 px-3 py-1 text-xs font-semibold mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                {t.badge}
              </div>

              <h1
                className="text-4xl sm:text-5xl lg:text-[3.4rem] leading-[1.08] font-semibold tracking-tight text-slate-950 mb-5"
                style={{ fontFamily: "Fraunces, Georgia, serif" }}
              >
                {t.heroTitleA}
                <br />
                <span className="italic text-purple-700">{t.heroTitleB}</span>
              </h1>

              <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-xl mb-7">
                {t.heroDesc}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-8">
                <button
                  onClick={onSigninClick}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 text-white px-6 py-3 text-sm font-semibold hover:bg-purple-700 transition"
                >
                  {t.ctaPrimary}
                  <ArrowIcon />
                </button>
                <a
                  href="#voices"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-800 hover:border-slate-400 transition"
                >
                  <Play className="w-4 h-4" />
                  {t.ctaSecondary}
                </a>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-purple-600" /> SATIM
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-purple-600" /> Edahabia / CIB
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-purple-600" /> Studio quality
                </span>
              </div>
            </div>

            {/* right visual */}
            <div className="relative">
              <div className="absolute -top-3 -right-2 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold px-3 py-1 border border-purple-200">
                50 pts free
              </div>
              <div className="relative rounded-[1.6rem] overflow-hidden bg-slate-100 aspect-[4/5] sm:aspect-[5/6]">
                <video
                  ref={videoRef}
                  src="https://res.cloudinary.com/gz65ybug/video/upload/v1788621700/Robot_looking_with_microphone_1080p_202609051613.mp4"
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-white/90 backdrop-blur-md border border-white p-4 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-700 text-white flex items-center justify-center">
                      <AudioLines className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {isRTL ? "جودة استوديو فورية" : "Qualité studio instantanée"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {isRTL ? "دارجة • عربية • FR mix" : "Darija • Arabe • FR mix"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <section className="relative z-10 px-4 pb-10">
        <div className="mx-auto max-w-6xl rounded-[1.6rem] bg-[#111111] text-white px-6 py-6 sm:px-10 sm:py-7 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { n: "1k+", l: t.statsUsers },
            { n: "12", l: t.statsVoices },
            { n: "<3s", l: t.statsLatency },
            { n: "100%", l: t.statsLocal },
          ].map((s) => (
            <div key={s.l} className="text-center md:text-left">
              <div
                className="text-3xl sm:text-4xl font-semibold tracking-tight"
                style={{ fontFamily: "Fraunces, Georgia, serif" }}
              >
                {s.n}
              </div>
              <div className="text-xs sm:text-sm text-white/55 mt-1">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* VOICES */}
      <section id="voices" className="relative z-10 px-4 py-14">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 max-w-2xl">
            <h2
              className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-950"
              style={{ fontFamily: "Fraunces, Georgia, serif" }}
            >
              {t.sectionVoices} <span className="italic text-purple-700">{t.sectionVoicesSub}</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {voices.map((v) => {
              const active = playingId === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => toggleVoice(v.id, v.url)}
                  className={`text-left rounded-3xl border p-5 transition shadow-sm hover:shadow-md ${
                    active
                      ? "bg-purple-700 border-purple-700 text-white"
                      : "bg-white border-slate-200 hover:border-purple-200"
                  }`}
                >
                  <div className="flex items-start justify-between mb-8">
                    <div>
                      <div className="font-semibold text-lg">{v.name}</div>
                      <div className={`text-xs mt-1 ${active ? "text-purple-100" : "text-slate-500"}`}>
                        {v.tag}
                      </div>
                    </div>
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center ${
                        active ? "bg-white text-purple-700" : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ms-0.5" />}
                    </div>
                  </div>
                  <div className="flex items-end gap-1 h-10">
                    {Array.from({ length: 22 }).map((_, i) => (
                      <span
                        key={i}
                        className={`flex-1 rounded-full ${active ? "bg-white/80" : "bg-slate-200"}`}
                        style={{
                          height: `${18 + ((i * 17) % 70)}%`,
                        }}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative z-10 px-4 py-8">
        <div className="mx-auto max-w-6xl rounded-[2rem] bg-[#111111] text-white p-6 sm:p-10">
          <div className="mb-10 max-w-2xl">
            <div className="inline-flex rounded-full bg-purple-500 text-white text-xs font-bold px-3 py-1 mb-4">
              {isRTL ? "الميزات" : "Features"}
            </div>
            <h2
              className="text-3xl sm:text-4xl font-semibold tracking-tight"
              style={{ fontFamily: "Fraunces, Georgia, serif" }}
            >
              {t.sectionFeatures} <span className="italic text-purple-300">{t.sectionFeaturesSub}</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-3xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 transition"
              >
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-300 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5" />
                </div>
                <div className="font-semibold mb-2">{f.title}</div>
                <p className="text-sm text-white/60 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="relative z-10 px-4 py-14">
        <div className="mx-auto max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2
              className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-950 mb-3"
              style={{ fontFamily: "Fraunces, Georgia, serif" }}
            >
              {t.pricingTitle}
            </h2>
            <p className="text-slate-600">{t.pricingSub}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {plans.map((p) => (
              <div
                key={p.name}
                className={`rounded-[1.6rem] p-6 border shadow-sm ${
                  p.popular
                    ? "bg-slate-950 text-white border-slate-950"
                    : "bg-white border-slate-200"
                }`}
              >
                {p.popular && (
                  <div className="inline-flex mb-4 rounded-full bg-purple-500 text-white text-[11px] font-bold px-2.5 py-1">
                    {isRTL ? "الأكثر طلباً" : "Populaire"}
                  </div>
                )}
                <div className={`text-sm font-semibold mb-1 ${p.popular ? "text-purple-300" : "text-purple-700"}`}>
                  {p.name}
                </div>
                <div className={`text-sm mb-5 ${p.popular ? "text-white/60" : "text-slate-500"}`}>{p.desc}</div>
                <div className="mb-2">
                  <span
                    className="text-4xl font-semibold tracking-tight"
                    style={{ fontFamily: "Fraunces, Georgia, serif" }}
                  >
                    {p.price}
                  </span>
                  <span className={`text-sm ms-1 ${p.popular ? "text-white/50" : "text-slate-500"}`}>DZD</span>
                </div>
                <div className={`text-lg font-semibold mb-6 ${p.popular ? "text-purple-300" : "text-purple-700"}`}>
                  {p.points} {isRTL ? "نقطة" : "points"}
                </div>
                <button
                  onClick={onSigninClick}
                  className={`w-full rounded-full py-3 text-sm font-semibold transition ${
                    p.popular
                      ? "bg-white text-slate-950 hover:bg-purple-100"
                      : "bg-slate-950 text-white hover:bg-purple-700"
                  }`}
                >
                  {isRTL ? "اختيار الباقة" : "Choisir"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative z-10 px-4 pb-10">
        <div className="mx-auto max-w-3xl rounded-[2rem] bg-white border border-slate-200 p-6 sm:p-8">
          <h2
            className="text-3xl font-semibold tracking-tight mb-6"
            style={{ fontFamily: "Fraunces, Georgia, serif" }}
          >
            {t.faqTitle}
          </h2>
          <div className="space-y-3">
            {faqs.map((f, i) => {
              const open = openFaq === i;
              return (
                <div key={f.q} className="rounded-2xl border border-slate-200 overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(open ? null : i)}
                    className="w-full px-4 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition"
                  >
                    <span className="font-medium text-sm sm:text-base pe-4">{f.q}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
                  </button>
                  {open && <div className="px-4 pb-4 text-sm text-slate-600 leading-relaxed">{f.a}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative z-10 px-4 pb-10">
        <div className="mx-auto max-w-6xl rounded-[2rem] bg-slate-950 text-white p-8 sm:p-12 text-center overflow-hidden relative">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-80 bg-purple-600/20 blur-3xl rounded-full" />
          <h2
            className="relative text-3xl sm:text-5xl font-semibold tracking-tight mb-4"
            style={{ fontFamily: "Fraunces, Georgia, serif" }}
          >
            {t.finalTitleA} <span className="italic text-purple-300">{t.finalTitleB}</span> {t.finalTitleC}
          </h2>
          <p className="relative text-white/60 mb-7">{t.finalSub}</p>
          <button
            onClick={onSigninClick}
            className="relative inline-flex items-center gap-2 rounded-full bg-white text-slate-950 px-6 py-3 text-sm font-semibold hover:bg-purple-100 transition"
          >
            {t.ctaPrimary}
            <ArrowIcon />
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 px-4 pb-8">
        <div className="mx-auto max-w-6xl rounded-[1.6rem] bg-purple-600 text-white px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-white/20">
              <img
                src="https://i.ibb.co/nqShkPNP/68126702-75e5-4de6-9b53-e51800b05e4a.jpg"
                alt="Sawtify"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="font-semibold">Sawtify</span>
            <span className="text-white/70 text-sm">© 2026</span>
          </div>
          <div className="text-sm text-white/80">SATIM • Edahabia • CIB</div>
        </div>
      </footer>
    </div>
  );
};
