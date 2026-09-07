import React, { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Play,
  Pause,
  ShieldCheck,
  Sparkles,
  Mic,
  Zap,
  ChevronDown,
  Volume2,
  Youtube,
  Instagram,
  Music2,
  Video,
  Megaphone,
  Mic2,
  Star,
  Rocket,
  Camera,
  Headphones,
  Waves,
  Check,
  Layers,
  Building2,
  FileText,
  SpellCheck2,
  Languages,
} from "lucide-react";
import { motion } from "motion/react";

interface LandingPageProps {
  onLoginClick: () => void;
  onSigninClick: () => void;
  language: "fr" | "ar";
  setLanguage: (lang: "fr" | "ar") => void;
}

/* ---------------------------------------------------
   Fix bug RTL : isole les chiffres pour éviter
   l'inversion bidi (ex: "1 350" -> "350 1")
--------------------------------------------------- */
const Num = ({
  children,
  className = "",
  style = {},
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) => (
  <span
    dir="ltr"
    style={{ unicodeBidi: "isolate", ...style }}
    className={`inline-block ${className}`}
  >
    {children}
  </span>
);

/* ---------------------------------------------------
   Web Audio API — vraie waveform réactive
   FIX: WeakMap pour créer UNE source par élément audio
--------------------------------------------------- */
function useAudioVisualizer(
  audioEl: HTMLAudioElement | null,
  isPlaying: boolean,
  barCount = 28
) {
  const [bars, setBars] = useState<number[]>(Array(barCount).fill(14));
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>();
  const sourceMapRef = useRef<WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>>(
    new WeakMap()
  );

  useEffect(() => {
    if (!isPlaying || !audioEl) {
      setBars(Array(barCount).fill(14));
      return;
    }

    let analyser: AnalyserNode | null = null;

    try {
      if (!ctxRef.current) {
        ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = ctxRef.current;

      let source = sourceMapRef.current.get(audioEl);
      if (!source) {
        source = ctx.createMediaElementSource(audioEl);
        sourceMapRef.current.set(audioEl, source);
      }

      analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyser.connect(ctx.destination);

      const data = new Uint8Array(analyser.frequencyBinCount);
      const localAnalyser = analyser;

      const tick = () => {
        localAnalyser.getByteFrequencyData(data);
        setBars(Array.from(data.slice(0, barCount)).map((v) => Math.max(12, (v / 255) * 100)));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      // fallback silencieux
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      analyser?.disconnect();
    };
  }, [isPlaying, audioEl, barCount]);

  return bars;
}

/* ---------------------------------------------------
   Transition courbe entre sections
--------------------------------------------------- */
const SectionWave = ({
  fromColor = "#0f0818",
  toColor = "#F7F5F1",
  flip = false,
}: {
  fromColor?: string;
  toColor?: string;
  flip?: boolean;
}) => (
  <div className="relative" style={{ backgroundColor: fromColor }}>
    <svg
      viewBox="0 0 1440 120"
      className={`w-full h-[60px] sm:h-[100px] block ${flip ? "rotate-180" : ""}`}
      preserveAspectRatio="none"
    >
      <path
        d="M0,64 C240,120 480,0 720,32 C960,64 1200,120 1440,64 L1440,120 L0,120 Z"
        fill={toColor}
      />
    </svg>
  </div>
);

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };

const LOGO_URL = "https://i.ibb.co/nqShkPNP/68126702-75e5-4de6-9b53-e51800b05e4a.jpg";
const HERO_BG_URL = "https://i.ibb.co/zTwPD6gj/HEROBACKGROUND.jpg";

/* ---------------------------------------------------
   Particules figées (plus de Math.random() dans le render)
--------------------------------------------------- */
const PARTICLES = [
  { x: "15%", size: 4, delay: 0, duration: 4.2 },
  { x: "35%", size: 3, delay: 1, duration: 5.1 },
  { x: "55%", size: 5, delay: 2, duration: 4.6 },
  { x: "75%", size: 3, delay: 0.5, duration: 5.4 },
  { x: "90%", size: 4, delay: 1.5, duration: 4.8 },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onLoginClick,
  onSigninClick,
  language,
  setLanguage,
}) => {
  const isRTL = language === "ar";
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [currentAudioEl, setCurrentAudioEl] = useState<HTMLAudioElement | null>(null);
  const bars = useAudioVisualizer(currentAudioEl, playingId !== null);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
  }, [language, isRTL]);

  const ArrowIcon = ({ className = "w-4 h-4" }: { className?: string }) =>
    isRTL ? <ArrowLeft className={className} /> : <ArrowRight className={className} />;

  const t = {
    navHome: isRTL ? "الرئيسية" : "Accueil",
    navServices: isRTL ? "الخدمات" : "Services",
    navAbout: isRTL ? "من نحن" : "À propos",
    navMore: isRTL ? "المزيد" : "Plus",
    cta: isRTL ? "ابدأ الآن" : "Commencer",

    heroLine1: isRTL ? "صوت واضح." : "Voix claire.",
    heroLine2: isRTL ? "عاطفة حقيقية." : "Émotion réelle.",
    heroLine3: isRTL ? "أثر دائم." : "Impact durable.",
    heroSub: isRTL
      ? "نساعد المبدعين والعلامات التجارية على تحويل نصوصهم إلى أصوات ذكاء اصطناعي بالدارجة الجزائرية، طبيعية وجاهزة للاستخدام فوراً."
      : "Nous aidons créateurs et marques à donner vie à leurs textes grâce à des voix IA en darija algérienne, naturelles et prêtes à l'emploi.",
    viewDemo: isRTL ? "شاهد العرض" : "Voir la démo",
    bookCall: isRTL ? "ابدأ مجاناً" : "Essayer gratuitement",
    trustLine: isRTL ? "دفع محلي عبر SATIM" : "Paiement local via SATIM",

    partnershipsLabel: isRTL ? "• شراكات" : "• Technologie",
    partnershipsTitle: isRTL
      ? "تقنية صوتية مصممة للمبدعين الجزائريين."
      : "Une technologie vocale pensée pour les créateurs algériens.",
    partnershipsDesc: isRTL
      ? "من توليد السيناريو إلى التصدير النهائي، نجمع بين الذكاء الاصطناعي المتقدم والأصالة الثقافية لمساعدة المبدعين على الإنتاج أسرع دون التضحية بالجودة."
      : "De la génération de script à l'export final, nous combinons IA de pointe et authenticité culturelle pour produire plus vite, sans sacrifier la qualité.",
    stat1: isRTL ? "رضا المبدعين" : "Satisfaction créateurs",
    stat2: isRTL ? "أصوات متاحة" : "Voix disponibles",
    stat3: isRTL ? "مبدع نشط" : "Créateurs actifs",

    aboutLabel: isRTL ? "• من نحن" : "• À propos",
    aboutTitle: isRTL
      ? "نساعد المبدعين على منح صوت بشري لأفكارهم."
      : "Nous aidons les créateurs à donner une voix humaine à leurs idées.",
    aboutDesc: isRTL
      ? "Sawtify يجمع بين الذكاء الاصطناعي والأصالة الصوتية حتى يتمكن كل مبدع أو علامة تجارية من إنتاج تعليقات صوتية بالدارجة، دون استوديو أو حجز ممثل صوتي."
      : "Sawtify combine intelligence artificielle et authenticité vocale pour que chaque créateur puisse produire des voix off en darija, sans studio ni comédien à réserver.",
    learnMore: isRTL ? "اعرف أكثر" : "En savoir plus",

    perfLabel: isRTL ? "الأداء" : "Performance",
    perfSubLabel: isRTL ? "وقت الإنتاج" : "Temps de production",
    perfStat: "-68%",
    perfNote: isRTL ? "مقارنة بالتسجيل الاستوديو التقليدي" : "vs enregistrement studio classique",

    showcaseLabel: isRTL ? "• جودة احترافية" : "• Qualité professionnelle",
    showcaseTitle: isRTL ? "من الفكرة إلى الصوت النهائي." : "De l'idée au son final.",
    showcaseSub: isRTL
      ? "خط إنتاج احترافي مصمم للمبدعين الذين لا يملكون وقتاً للانتظار."
      : "Un pipeline de production pensé pour les créateurs qui n'ont pas de temps à perdre.",

    ctaBadge: isRTL ? "عرض محدود" : "Offre de lancement",
    ctaTitle: isRTL
      ? "50 نقطة مجانية عند التسجيل الآن."
      : "50 points offerts pour votre première voix.",
    ctaSub: isRTL
      ? "بدون بطاقة بنكية. جرّب الجودة بنفسك في أقل من دقيقة."
      : "Sans carte bancaire. Testez la qualité vous-même en moins d'une minute.",
    ctaButton: isRTL ? "ابدأ مجاناً" : "Commencer gratuitement",

    pricingLabel: isRTL ? "• الأسعار" : "• Tarifs",
    pricingTitle: isRTL ? "ادفع فقط لما تستخدمه" : "Payez seulement ce que vous utilisez",
    pricingSub: isRTL
      ? "بدون اشتراك شهري. النقاط لا تنتهي صلاحيتها أبداً."
      : "Sans abonnement mensuel. Les points achetés n'expirent jamais.",

    faqKicker: isRTL ? "الأسئلة" : "FAQ",
    faqTitle: isRTL ? "الأسئلة الشائعة" : "Ce qu'on nous demande souvent",
  };

  const badges = [
    { icon: Sparkles, label: isRTL ? "ذكاء اصطناعي" : "IA native", color: "bg-violet-500", pos: "top-[20%] left-[10%] md:left-[18%]" },
    { icon: Zap, label: isRTL ? "سريع" : "Ultra rapide", color: "bg-fuchsia-500", pos: "top-[18%] right-[8%] md:right-[16%]" },
    { icon: Star, label: isRTL ? "احترافي" : "Qualité pro", color: "bg-indigo-500", pos: "top-[42%] right-[4%] md:right-[10%]" },
    { icon: Rocket, label: isRTL ? "نمو أسرع" : "Grow faster", color: "bg-violet-400", pos: "top-[46%] left-[4%] md:left-[8%]" },
    { icon: Mic, label: isRTL ? "دارجة أصيلة" : "Feel Darija", color: "bg-purple-500", pos: "top-[54%] right-[20%] md:right-[26%]" },
  ];

  const logos = [
    { icon: Youtube, name: "YouTube" },
    { icon: Music2, name: "TikTok" },
    { icon: Instagram, name: "Instagram" },
    { icon: Video, name: "Reels" },
    { icon: Megaphone, name: "Ads" },
    { icon: Mic2, name: "Podcasts" },
  ];

  const perfTags = isRTL
    ? ["سريع", "ذكاء اصطناعي", "دارجة", "جودة استوديو"]
    : ["Rapide", "IA native", "Darija", "Studio quality"];

  const quickFeatures = [
    {
      icon: FileText,
      title: isRTL ? "توليد سكريبت مستهدف" : "Générateur de script ciblé",
      desc: isRTL
        ? "سكريبتات مصممة خصيصاً للسوق الجزائري، جاهزة للتوليد الصوتي مباشرة."
        : "Scripts pensés pour le marché algérien, prêts à être transformés en voix.",
    },
    {
      icon: SpellCheck2,
      title: isRTL ? "مصحّح ذكي" : "Correcteur intelligent",
      desc: isRTL
        ? "يصحح نصك تلقائياً قبل التوليد لضمان نطق مثالي."
        : "Corrige automatiquement ton texte avant génération pour un rendu parfait.",
    },
    {
      icon: Languages,
      title: isRTL ? "دعم اللهجات" : "Support des lahjat",
      desc: isRTL
        ? "عدة لهجات جزائرية متاحة، وليس دارجة عامة موحدة."
        : "Plusieurs lahjat algériennes disponibles, pas une darija générique.",
    },
  ];

  const voices = [
    { id: "amin", name: isRTL ? "أمين" : "Amin", tag: isRTL ? "تجاري • دارجة" : "Commercial · Darija", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
    { id: "yasmine", name: isRTL ? "ياسمين" : "Yasmine", tag: isRTL ? "إعلان • ناعم" : "Publicité · Douce", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
    { id: "khalid", name: isRTL ? "خالد" : "Khalid", tag: isRTL ? "وثائقي • عميق" : "Documentaire · Grave", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
    { id: "layla", name: isRTL ? "ليلى" : "Layla", tag: isRTL ? "سوشيال • حيوي" : "Social · Énergique", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
  ];

  const pricingPlans = [
    {
      icon: Zap,
      points: "100",
      bonus: null as string | null,
      price: "500",
      desc: isRTL ? "مثالي للتجربة وإنشاء 5 أصوات." : "Idéal pour tester et créer 5 voix-off haute définition.",
      popular: false,
    },
    {
      icon: Zap,
      points: "220",
      bonus: "10%+",
      price: "1 000",
      desc: isRTL ? "الأكثر طلباً في الجزائر. +20 نقطة مجانية." : "Le plus populaire en Algérie. +20 points offerts.",
      popular: true,
    },
    {
      icon: Layers,
      points: "600",
      bonus: "20%+",
      price: "2 500",
      desc: isRTL ? "للمبدعين المنتظمين والوكالات." : "Pour les créateurs réguliers et agences. +100 points offerts.",
      popular: false,
    },
    {
      icon: Building2,
      points: "1 350",
      bonus: "35%+",
      price: "5 000",
      desc: isRTL ? "حجم موسّع ودعم مخصص وأولوية." : "Volume étendu, support dédié et accès prioritaire aux modèles.",
      popular: false,
    },
  ];

  const pricingFeatures = [
    isRTL ? "جودة استوديو 24 kHz" : "Qualité studio 24 kHz",
    isRTL ? "تحميل MP3 & WAV" : "Téléchargement MP3 & WAV",
    isRTL ? "استخدام تجاري كامل" : "Usage commercial complet",
    isRTL ? "نقاط صالحة مدى الحياة" : "Crédits valables à vie",
  ];

  const showcaseItems = [
    {
      img: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?q=80&w=1200&auto=format&fit=crop",
      icon: Waves,
      label: isRTL ? "استوديو رقمي" : "Studio numérique",
      title: isRTL ? "بيئة إنتاج متكاملة" : "Environnement de production complet",
    },
    {
      img: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?q=80&w=1200&auto=format&fit=crop",
      icon: Camera,
      label: isRTL ? "إنتاج المحتوى" : "Production de contenu",
    },
    {
      img: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=1200&auto=format&fit=crop",
      icon: Headphones,
      label: isRTL ? "مونتاج احترافي" : "Montage professionnel",
    },
  ];

  const faqs = isRTL
    ? [
        { q: "هل الأصوات صالحة للاستخدام التجاري؟", a: "نعم. كل الملفات قابلة للاستخدام في الإعلانات، الريلز، اليوتيوب والمشاريع التجارية." },
        { q: "كيف يعمل نظام النقاط؟", a: "تشتري رصيداً مرة واحدة. التوليد الصوتي = 20 نقطة. النقاط لا تنتهي صلاحيتها." },
        { q: "هل تدعمون الذهبية و CIB؟", a: "نعم عبر SATIM. الدفع محلي بالدينار الجزائري." },
        { q: "هل هناك اشتراك شهري؟", a: "لا. Sawtify نظام دفع مقابل الاستخدام فقط." },
      ]
    : [
        { q: "Les voix sont-elles libres de droits ?", a: "Oui. Usage commercial autorisé : pubs, reels, YouTube, projets clients." },
        { q: "Comment fonctionne le système de points ?", a: "Tu achètes un pack une fois. Une génération vocale coûte 20 points. Les points n'expirent jamais." },
        { q: "Edahabia et CIB sont-ils acceptés ?", a: "Oui, via SATIM. Paiement 100% local, en dinars algériens." },
        { q: "Y a-t-il un abonnement mensuel ?", a: "Non. Sawtify fonctionne uniquement en Pay-As-You-Go." },
      ];

  const toggleVoice = (id: string, url: string) => {
    if (playingId === id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }

    audioRef.current?.pause();

    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.src = url;

    audioRef.current = audio;
    setCurrentAudioEl(audio);

    audio.play().catch(() => {
      setPlayingId(null);
    });

    audio.onended = () => setPlayingId(null);
    setPlayingId(id);
  };

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="min-h-screen bg-white text-[#141118] selection:bg-purple-200 selection:text-purple-900"
      style={{
        fontFamily: isRTL
          ? "'Cairo', 'Inter', ui-sans-serif, system-ui, sans-serif"
          : "'Inter', ui-sans-serif, system-ui, sans-serif",
      }}
    >
      {/* =========================================================
          HEADER
      ========================================================= */}
      <header className="absolute top-0 inset-x-0 z-50">
        <div className="mx-auto max-w-6xl px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-white shadow-sm shrink-0">
              <img src={LOGO_URL} alt="Sawtify" className="w-full h-full object-cover" />
            </div>
            <span className="font-semibold text-white text-[15px] tracking-tight">Sawtify</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-[13px] font-medium text-white/80">
            <a href="#home" className="hover:text-white transition-colors">{t.navHome}</a>
            <a href="#voices" className="hover:text-white transition-colors">{t.navServices}</a>
            <a href="#about" className="hover:text-white transition-colors">{t.navAbout}</a>
            <a href="#pricing" className="hover:text-white transition-colors">{t.navMore}</a>
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLanguage(language === "fr" ? "ar" : "fr")}
              className="w-8 h-8 rounded-full text-[11px] font-bold text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              {language === "fr" ? "AR" : "FR"}
            </button>
            <button
              type="button"
              onClick={onSigninClick}
              className="rounded-full bg-white text-[#141118] px-5 py-2.5 text-[13px] font-semibold hover:bg-purple-100 transition-colors"
            >
              {t.cta}
            </button>
          </div>
        </div>
      </header>

      {/* =========================================================
          HERO
      ========================================================= */}
      <section id="home" className="relative h-[780px] sm:h-[860px] overflow-hidden bg-[#0f0818]">
        <img
          src={HERO_BG_URL}
          alt="Sawtify hero"
          className="absolute inset-0 w-full h-full object-cover object-top"
        />
        <div className="absolute -left-1/3 top-0 w-[160%] h-full bg-gradient-to-tr from-violet-200/25 via-transparent to-transparent blur-3xl rotate-12 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#1a0f2e]/60 to-[#0f0818]" />

        {badges.map((b, i) => (
          <motion.div
            key={b.label}
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
            className={`hidden sm:flex absolute ${b.pos} items-center gap-1.5 bg-black/40 backdrop-blur-md border border-white/10 rounded-full pe-3 ps-1 py-1 text-[11px] font-medium text-white shadow-lg`}
          >
            <span className={`w-5 h-5 rounded-full ${b.color} flex items-center justify-center`}>
              <b.icon className="w-3 h-3 text-white" />
            </span>
            {b.label}
          </motion.div>
        ))}

        <div className="absolute inset-x-0 bottom-[64px] sm:bottom-[90px] px-6 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-4xl sm:text-6xl lg:text-[4rem] leading-[1.06] font-medium tracking-tight text-white mb-5"
            style={{ fontFamily: isRTL ? "'Cairo', serif" : "'Fraunces', Georgia, serif" }}
          >
            {t.heroLine1}
            <br />
            {t.heroLine2}
            <br />
            {t.heroLine3}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="text-white/60 text-sm sm:text-base max-w-lg mx-auto mb-8"
          >
            {t.heroSub}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="flex items-center justify-center gap-3 mb-4"
          >
            <button
              type="button"
              onClick={onLoginClick}
              className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white px-5 py-3 text-sm font-medium hover:bg-white/20 transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              {t.viewDemo}
            </button>
            <button
              type="button"
              onClick={onSigninClick}
              className="inline-flex items-center gap-2 rounded-full bg-violet-400 text-[#140a24] px-6 py-3 text-sm font-semibold hover:bg-violet-300 transition-colors"
            >
              {t.bookCall}
              <ArrowIcon />
            </button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.65 }}
            className="inline-flex items-center gap-1.5 text-[11px] text-white/40"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            {t.trustLine}
          </motion.p>
        </div>
      </section>

      {/* =========================================================
          QUICK FEATURES — animée
      ========================================================= */}
      <section className="relative bg-white border-b border-[#141118]/10 overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 py-14 sm:py-16">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            variants={stagger}
            className="grid sm:grid-cols-3 gap-5 sm:gap-6"
          >
            {quickFeatures.map((f, i) => (
              <motion.div
                key={f.title}
                variants={{
                  hidden: { opacity: 0, y: 40, scale: 0.95 },
                  show: {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
                  },
                }}
                whileHover={{ y: -6 }}
                className="group relative rounded-2xl border border-[#141118]/8 bg-white p-6 cursor-default transition-shadow hover:shadow-[0_20px_40px_rgba(124,58,237,0.12)]"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative mb-4">
                  <motion.div
                    animate={{ scale: [1, 1.06, 1] }}
                    transition={{
                      duration: 2.5,
                      repeat: Infinity,
                      repeatType: "loop",
                      delay: i * 0.3,
                      ease: "easeInOut",
                    }}
                    className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center relative z-10 group-hover:bg-purple-600 group-hover:text-white transition-colors duration-300"
                  >
                    <f.icon className="w-6 h-6" />
                  </motion.div>
                  <motion.div
                    animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
                    transition={{
                      duration: 2.5,
                      repeat: Infinity,
                      delay: i * 0.3,
                      ease: "easeInOut",
                    }}
                    className="absolute inset-0 w-12 h-12 rounded-xl bg-purple-400/30"
                  />
                </div>

                <h3 className="relative font-semibold text-[15px] text-[#141118] mb-2">{f.title}</h3>
                <p className="relative text-[13px] text-[#141118]/55 leading-relaxed">{f.desc}</p>

                <motion.div
                  initial={{ width: "0%" }}
                  whileInView={{ width: "40%" }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
                  className="h-[2px] bg-purple-500 mt-4 rounded-full"
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* =========================================================
          PARTNERSHIPS / STATS
      ========================================================= */}
      <section className="relative bg-[#0f0818] pt-16 pb-20">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="text-[11px] font-medium text-white/40 tracking-wide mb-4">
              {t.partnershipsLabel}
            </div>
            <h2
              className="text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-violet-400 max-w-2xl leading-[1.15] mb-5"
              style={{ fontFamily: isRTL ? "'Cairo', serif" : "'Fraunces', Georgia, serif" }}
            >
              {t.partnershipsTitle}
            </h2>
            <p className="text-white/45 text-sm sm:text-base max-w-xl leading-relaxed mb-12">
              {t.partnershipsDesc}
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={stagger}
            className="grid grid-cols-3 gap-6 sm:gap-12 mb-16"
          >
            {[
              { n: "98%", l: t.stat1 },
              { n: "12+", l: t.stat2 },
              { n: "1,200+", l: t.stat3 },
            ].map((s) => (
              <motion.div key={s.l} variants={fadeUp}>
                <Num
                  className="text-3xl sm:text-5xl font-medium tracking-tight text-violet-400"
                  style={{ fontFamily: isRTL ? "'Cairo', serif" : "'Fraunces', Georgia, serif" }}
                >
                  {s.n}
                </Num>
                <div className="text-[11px] sm:text-sm text-white/40 mt-1.5">{s.l}</div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex flex-wrap justify-center gap-3"
          >
            {logos.map((l) => (
              <div
                key={l.name}
                className="flex items-center gap-2 bg-white rounded-full pe-4 ps-2 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.25)] border border-black/5"
              >
                <span className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center">
                  <l.icon className="w-3.5 h-3.5" />
                </span>
                <span className="text-[13px] font-medium text-[#141118]">{l.name}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* =========================================================
          TRANSITION COURBE
      ========================================================= */}
      <SectionWave fromColor="#0f0818" toColor="#F7F5F1" />

      {/* =========================================================
          SHOWCASE PHOTOS PRO
      ========================================================= */}
      <section className="bg-[#F7F5F1] pt-4 pb-24 sm:pb-28">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-xl mx-auto mb-12"
          >
            <div className="text-[11px] font-medium text-purple-700 tracking-wide mb-3">
              {t.showcaseLabel}
            </div>
            <h2
              className="text-3xl sm:text-4xl font-medium tracking-tight text-[#141118]"
              style={{ fontFamily: isRTL ? "'Cairo', serif" : "'Fraunces', Georgia, serif" }}
            >
              {t.showcaseTitle}
            </h2>
            <p className="text-[#141118]/50 text-sm sm:text-base mt-3">{t.showcaseSub}</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-4 sm:gap-5">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative rounded-3xl overflow-hidden aspect-[4/5] md:row-span-2 group"
            >
              <img
                src={showcaseItems[0].img}
                alt={showcaseItems[0].label}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f0818]/85 via-[#0f0818]/10 to-transparent" />
              <div className="absolute bottom-0 inset-x-0 p-6">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1.5 text-xs font-medium text-white mb-3">
                  <Waves className="w-3.5 h-3.5" />
                  {showcaseItems[0].label}
                </span>
                <h3
                  className="text-white text-xl font-medium"
                  style={{ fontFamily: isRTL ? "'Cairo', serif" : "'Fraunces', Georgia, serif" }}
                >
                  {showcaseItems[0].title}
                </h3>
              </div>
            </motion.div>

            {showcaseItems.slice(1).map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 + i * 0.1 }}
                className="relative rounded-3xl overflow-hidden aspect-[16/9] group"
              >
                <img
                  src={item.img}
                  alt={item.label}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f0818]/80 via-transparent to-transparent" />
                <div className="absolute bottom-0 inset-x-0 p-5">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1.5 text-xs font-medium text-white">
                    <item.icon className="w-3.5 h-3.5" />
                    {item.label}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          ABOUT
      ========================================================= */}
      <section id="about" className="relative bg-[#F7F5F1] pb-24 sm:pb-28">
        <div className="mx-auto max-w-6xl px-6 grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="text-[11px] font-medium text-[#141118]/40 tracking-wide mb-4">
              {t.aboutLabel}
            </div>
            <h2
              className="text-3xl sm:text-4xl font-medium tracking-tight text-[#141118] leading-[1.15] mb-5"
              style={{ fontFamily: isRTL ? "'Cairo', serif" : "'Fraunces', Georgia, serif" }}
            >
              {t.aboutTitle}
            </h2>
            <p className="text-[#141118]/55 text-sm sm:text-base leading-relaxed mb-8 max-w-md">
              {t.aboutDesc}
            </p>
            <button
              type="button"
              onClick={onLoginClick}
              className="inline-flex items-center gap-2 rounded-full bg-[#141118] text-white px-6 py-3 text-sm font-medium hover:bg-purple-700 transition-colors"
            >
              {t.learnMore}
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30, rotate: -2 }}
            whileInView={{ opacity: 1, y: 0, rotate: -2 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative mx-auto w-full max-w-[280px]"
          >
            <div className="rounded-3xl bg-[#141118] text-white p-6 shadow-[0_30px_60px_rgba(20,17,24,0.25)]">
              <div className="flex items-center gap-2 mb-6">
                <span className="w-6 h-6 rounded-full bg-violet-400/20 text-violet-400 flex items-center justify-center">
                  <Volume2 className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-medium text-white/70">{t.perfLabel}</span>
              </div>

              <div className="text-xs text-white/40 mb-1">{t.perfSubLabel}</div>
              <div className="flex items-end gap-3 mb-2">
                <Num
                  className="text-4xl font-medium tracking-tight text-violet-400"
                  style={{ fontFamily: isRTL ? "'Cairo', serif" : "'Fraunces', Georgia, serif" }}
                >
                  {t.perfStat}
                </Num>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/10 mb-2 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: "68%" }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: 0.3 }}
                  className="h-full rounded-full bg-violet-400"
                />
              </div>
              <div className="text-[11px] text-white/35 mb-6">{t.perfNote}</div>

              <div className="grid grid-cols-2 gap-2">
                {perfTags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] font-medium text-white/70 bg-white/5 border border-white/10 rounded-full px-2.5 py-1.5 text-center"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* =========================================================
          VOICES
      ========================================================= */}
      <section id="voices" className="bg-white border-t border-[#141118]/10">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-3xl sm:text-4xl font-medium tracking-tight text-[#141118] mb-10"
            style={{ fontFamily: isRTL ? "'Cairo', serif" : "'Fraunces', Georgia, serif" }}
          >
            {isRTL ? "أصوات " : "Des voix "}
            <span className="text-purple-700">{isRTL ? "بعاطفة حقيقية." : "avec du caractère."}</span>
          </motion.h2>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={stagger}
            className="divide-y divide-[#141118]/10 border-t border-b border-[#141118]/10"
          >
            {voices.map((v) => {
              const active = playingId === v.id;
              return (
                <motion.button
                  key={v.id}
                  type="button"
                  variants={fadeUp}
                  onClick={() => toggleVoice(v.id, v.url)}
                  className="w-full flex items-center gap-5 py-5 text-start group"
                >
                  <div
                    className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center border transition-colors ${
                      active
                        ? "bg-purple-700 border-purple-700 text-white"
                        : "border-[#141118]/15 text-[#141118] group-hover:border-purple-400"
                    }`}
                  >
                    {active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ms-0.5" />}
                  </div>
                  <div className="w-32 sm:w-40 shrink-0">
                    <div className="font-medium text-[#141118]">{v.name}</div>
                    <div className="text-xs text-[#141118]/45">{v.tag}</div>
                  </div>
                  <div className="flex-1 flex items-end gap-[3px] h-8">
                    {bars.map((h, i) => (
                      <span
                        key={i}
                        className={`flex-1 rounded-full transition-all duration-150 ${
                          active ? "bg-purple-600" : "bg-[#141118]/10"
                        }`}
                        style={{ height: active ? `${h}%` : "20%" }}
                      />
                    ))}
                  </div>
                  <ArrowIcon className="w-4 h-4 text-[#141118]/20 group-hover:text-purple-600 transition-colors shrink-0" />
                </motion.button>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* =========================================================
          CTA PERFORMANT — carte BLANCHE flottante + rotation
      ========================================================= */}
      <section className="bg-[#141118] py-4">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            animate={{
              y: [0, -8, 0],
              rotate: [-1, 0.5, -1],
            }}
            transition={{
              opacity: { duration: 0.7 },
              y: { duration: 5, repeat: Infinity, ease: "easeInOut" },
              rotate: { duration: 6, repeat: Infinity, ease: "easeInOut" },
            }}
            className="relative rounded-[2rem] overflow-hidden border border-[#141118]/10 bg-white shadow-[0_30px_80px_rgba(0,0,0,0.35)]"
          >
            {/* Glow violet doux sur fond blanc */}
            <motion.div
              className="absolute w-72 h-72 bg-violet-300/30 blur-[100px] rounded-full pointer-events-none"
              animate={{ x: ["-10%", "10%", "-10%"], y: ["-20%", "10%", "-20%"] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
              style={{ top: "-30%", right: "-10%" }}
            />
            <motion.div
              className="absolute w-72 h-72 bg-fuchsia-200/25 blur-[100px] rounded-full pointer-events-none"
              animate={{ x: ["10%", "-10%", "10%"], y: ["10%", "-10%", "10%"] }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
              style={{ bottom: "-30%", left: "-10%" }}
            />

            {/* Particules discrètes */}
            {PARTICLES.map((p, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full bg-violet-400/40 pointer-events-none"
                style={{ left: p.x, width: p.size, height: p.size, bottom: "10%" }}
                animate={{ y: [0, -80, 0], opacity: [0, 0.8, 0] }}
                transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
              />
            ))}

            <div className="relative flex flex-col md:flex-row items-center justify-between gap-8 px-8 sm:px-12 py-12 sm:py-14">
              <div className="text-center md:text-start flex-1">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="inline-flex items-center gap-2 rounded-full bg-purple-100 border border-purple-200 px-3 py-1.5 text-xs font-medium text-purple-700 mb-5"
                >
                  <motion.span
                    animate={{ rotate: [0, 15, -15, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
                  >
                    <Zap className="w-3.5 h-3.5" />
                  </motion.span>
                  {t.ctaBadge}
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="text-2xl sm:text-4xl font-medium tracking-tight text-[#141118] leading-[1.2] mb-3"
                  style={{ fontFamily: isRTL ? "'Cairo', serif" : "'Fraunces', Georgia, serif" }}
                >
                  {t.ctaTitle}
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="text-[#141118]/50 text-sm sm:text-base max-w-md mx-auto md:mx-0"
                >
                  {t.ctaSub}
                </motion.p>
              </div>

              <motion.button
                type="button"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onSigninClick}
                className="group relative inline-flex items-center gap-3 rounded-full bg-violet-600 text-white pe-2 ps-7 py-2.5 text-sm font-semibold shrink-0 shadow-[0_10px_30px_rgba(124,58,237,0.35)]"
              >
                <motion.span
                  className="absolute inset-0 rounded-full bg-violet-600"
                  animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
                <span className="relative">{t.ctaButton}</span>
                <span className="relative w-10 h-10 rounded-full bg-white text-violet-600 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                  <ArrowIcon className="w-4 h-4" />
                </span>
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* =========================================================
          PRICING
      ========================================================= */}
      <section id="pricing" className="bg-[#FAFAFC] py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-xl mx-auto mb-14"
          >
            <div className="text-[11px] font-medium text-purple-700 tracking-wide mb-3">
              {t.pricingLabel}
            </div>
            <h2
              className="text-3xl sm:text-4xl font-medium tracking-tight text-[#141118] mb-3"
              style={{ fontFamily: isRTL ? "'Cairo', serif" : "'Fraunces', Georgia, serif" }}
            >
              {t.pricingTitle}
            </h2>
            <p className="text-[#141118]/50 text-sm sm:text-base">{t.pricingSub}</p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={stagger}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5"
          >
            {pricingPlans.map((p) => (
              <motion.div
                key={p.points}
                variants={fadeUp}
                className={`relative rounded-3xl p-6 pt-8 bg-white transition-shadow ${
                  p.popular
                    ? "border-2 border-violet-500 shadow-[0_20px_50px_rgba(139,92,246,0.15)]"
                    : "border border-[#141118]/10 hover:shadow-[0_10px_30px_rgba(0,0,0,0.06)]"
                }`}
              >
                {p.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full bg-violet-600 text-white text-[11px] font-bold px-4 py-1.5 shadow-lg whitespace-nowrap">
                    <Zap className="w-3 h-3 fill-white" />
                    {isRTL ? "الأكثر طلباً" : "PLUS POPULAIRE"}
                  </div>
                )}

                <div className="flex items-center justify-between mb-5">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      p.popular ? "bg-violet-100 text-violet-700" : "bg-[#141118]/5 text-[#141118]/60"
                    }`}
                  >
                    <p.icon className="w-5 h-5" />
                  </div>
                  {p.bonus && (
                    <span className="text-[11px] font-semibold text-violet-700 bg-violet-50 rounded-full px-2.5 py-1">
                      <Num>{p.bonus}</Num> Bonus
                    </span>
                  )}
                </div>

                <div className="text-2xl font-semibold text-[#141118] mb-1.5">
                  <Num>{p.points}</Num> {isRTL ? "نقطة" : "Points"}
                </div>
                <p className="text-[13px] text-[#141118]/50 leading-relaxed mb-5 min-h-[42px]">{p.desc}</p>

                <div className="flex items-baseline gap-1.5 mb-6">
                  <Num
                    className="text-3xl font-bold tracking-tight text-[#141118]"
                    style={{ fontFamily: isRTL ? "'Cairo', serif" : "'Fraunces', Georgia, serif" }}
                  >
                    {p.price}
                  </Num>
                  <span className="text-sm text-[#141118]/40 font-medium">DZD</span>
                </div>

                <div className="h-px bg-[#141118]/10 mb-5" />

                <div className="space-y-2.5 mb-6">
                  {pricingFeatures.map((f) => (
                    <div key={f} className="flex items-center gap-2.5 text-[13px] text-[#141118]/70">
                      <Check className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={onSigninClick}
                  className={`w-full rounded-xl py-3 text-sm font-semibold transition-colors ${
                    p.popular
                      ? "bg-violet-600 text-white hover:bg-violet-700"
                      : "bg-[#141118]/5 text-[#141118] hover:bg-[#141118]/10"
                  }`}
                >
                  {p.popular ? (
                    `✓ ${isRTL ? "النقاط المختارة" : "Points sélectionnés"}`
                  ) : (
                    <>
                      {isRTL ? "اختيار" : "Choisir"} <Num>{p.points}</Num> {isRTL ? "نقطة" : "points"}
                    </>
                  )}
                </button>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* =========================================================
          FAQ
      ========================================================= */}
      <section className="bg-white border-t border-[#141118]/10">
        <div className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
          <div className="text-xs text-purple-700 font-medium mb-3">{t.faqKicker}</div>
          <h2
            className="text-3xl font-medium tracking-tight text-[#141118] mb-8"
            style={{ fontFamily: isRTL ? "'Cairo', serif" : "'Fraunces', Georgia, serif" }}
          >
            {t.faqTitle}
          </h2>

          <div className="border-t border-[#141118]/10">
            {faqs.map((f, i) => {
              const open = openFaq === i;
              return (
                <div key={f.q} className="border-b border-[#141118]/10">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : i)}
                    className="w-full py-5 flex items-start gap-4 text-start"
                  >
                    <span className="text-xs font-mono text-[#141118]/30 pt-0.5 w-6 shrink-0">
                      <Num>{String(i + 1).padStart(2, "0")}</Num>
                    </span>
                    <span className="flex-1 font-medium text-[15px] text-[#141118]">{f.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-[#141118]/35 mt-0.5 shrink-0 transition-transform duration-300 ${
                        open ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  <motion.div
                    initial={false}
                    animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <p className="ps-10 pb-5 text-sm text-[#141118]/55 leading-relaxed max-w-xl">{f.a}</p>
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================
          FOOTER
      ========================================================= */}
      <footer className="bg-[#0f0818] text-white/50">
        <div className="mx-auto max-w-6xl px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-white shrink-0">
              <img src={LOGO_URL} alt="Sawtify" className="w-full h-full object-cover" />
            </div>
            <span className="font-semibold text-white text-sm">Sawtify</span>
            <span className="text-white/30 text-sm">© 2026</span>
          </div>
          <div className="text-xs">SATIM · Edahabia · CIB</div>
        </div>
      </footer>
    </div>
  );
};
