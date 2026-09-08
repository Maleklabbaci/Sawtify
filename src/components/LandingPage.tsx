import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowUpRight,
  Play,
  Pause,
  Plus,
  Menu,
  X,
  Check,
  Star,
  Sparkles,
  Command,
  Cpu,
  Waves,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence, useScroll, useTransform } from "motion/react";

interface LandingPageProps {
  onLoginClick: () => void;
  onSigninClick: () => void;
  language: "fr" | "ar";
  setLanguage: (lang: "fr" | "ar") => void;
}

/* =========================================================
   GLOBAL — typographie premium + touches AI
========================================================= */
const GlobalStyles = () => (
  <style>{`
    html {
      scroll-behavior: smooth;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
    }
    body { overflow-x: hidden; }

    .sw-focus:focus-visible {
      outline: 1.5px solid #6366F1;
      outline-offset: 3px;
      border-radius: 4px;
    }

    /* Hairlines premium */
    .sw-hairline {
      background-image: linear-gradient(to right, transparent, rgba(17,17,17,0.12), transparent);
      height: 1px;
    }

    /* Grille perspective AI subtile */
    .sw-grid {
      background-image:
        linear-gradient(rgba(99,102,241,0.08) 1px, transparent 1px),
        linear-gradient(90deg, rgba(99,102,241,0.08) 1px, transparent 1px);
      background-size: 56px 56px;
    }
    .sw-grid-dark {
      background-image:
        linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
      background-size: 56px 56px;
    }

    /* Dot pattern */
    .sw-dots {
      background-image: radial-gradient(rgba(17,17,17,0.14) 1px, transparent 1px);
      background-size: 22px 22px;
    }

    /* Glow subtil */
    .sw-glow {
      position: absolute;
      border-radius: 9999px;
      filter: blur(80px);
      pointer-events: none;
    }

    /* Noise texture optionnelle */
    .sw-noise::before {
      content: "";
      position: absolute;
      inset: 0;
      opacity: 0.025;
      pointer-events: none;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    }

    /* Shimmer texte AI */
    @keyframes sw-shimmer {
      0% { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
    .sw-shimmer-text {
      background: linear-gradient(90deg, #6366F1 0%, #A78BFA 25%, #6366F1 50%, #A78BFA 75%, #6366F1 100%);
      background-size: 200% auto;
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      animation: sw-shimmer 5s linear infinite;
    }

    /* Pulse live discret */
    @keyframes sw-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    .sw-pulse { animation: sw-pulse 2s ease-in-out infinite; }

    /* Border gradient AI */
    .sw-border-gradient {
      position: relative;
      background: #FAFAF7;
    }
    .sw-border-gradient::before {
      content: "";
      position: absolute;
      inset: 0;
      padding: 1px;
      border-radius: inherit;
      background: linear-gradient(135deg, rgba(99,102,241,0.4), rgba(167,139,250,0.15), rgba(99,102,241,0.4));
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      pointer-events: none;
    }

    @media (prefers-reduced-motion: reduce) {
      html { scroll-behavior: auto; }
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }
  `}</style>
);

/* =========================================================
   Fix RTL nombres
========================================================= */
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

/* =========================================================
   Counter animé
========================================================= */
const Counter = ({
  target,
  suffix = "",
  duration = 1800,
  className = "",
  style = {},
}: {
  target: number;
  suffix?: string;
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
}) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting || started.current) return;
        started.current = true;
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 4);
          setCount(Math.round(eased * target));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [target, duration]);

  return (
    <Num className={className} style={style}>
      <span ref={ref}>
        {count.toLocaleString("en-US")}
        {suffix}
      </span>
    </Num>
  );
};

/* =========================================================
   Web Audio API — waveform réelle
========================================================= */
function useAudioVisualizer(
  audioEl: HTMLAudioElement | null,
  isPlaying: boolean,
  barCount = 48
) {
  const [bars, setBars] = useState<number[]>(Array(barCount).fill(8));
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>();
  const sourceMap = useRef<WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>>(
    new WeakMap()
  );

  useEffect(() => {
    if (!isPlaying || !audioEl) {
      setBars(Array(barCount).fill(8));
      return;
    }
    let analyser: AnalyserNode | null = null;
    try {
      if (!ctxRef.current) {
        ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = ctxRef.current;
      if (ctx.state === "suspended") ctx.resume();

      let source = sourceMap.current.get(audioEl);
      if (!source) {
        source = ctx.createMediaElementSource(audioEl);
        sourceMap.current.set(audioEl, source);
      }
      analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.82;
      source.connect(analyser);
      analyser.connect(ctx.destination);

      const data = new Uint8Array(analyser.frequencyBinCount);
      const local = analyser;
      const tick = () => {
        local.getByteFrequencyData(data);
        setBars(
          Array.from(data.slice(0, barCount)).map((v) => Math.max(6, (v / 255) * 100))
        );
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {}

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      analyser?.disconnect();
    };
  }, [isPlaying, audioEl, barCount]);

  return bars;
}

/* =========================================================
   Scroll state
========================================================= */
function useScrollState() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 20);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return scrolled;
}

/* =========================================================
   Reveal on scroll
========================================================= */
const Reveal = ({
  children,
  delay = 0,
  y = 20,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-80px" }}
    transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
    className={className}
  >
    {children}
  </motion.div>
);

const LOGO_URL = "https://i.ibb.co/nqShkPNP/68126702-75e5-4de6-9b53-e51800b05e4a.jpg";

/* =========================================================
   COMPOSANT
========================================================= */
export const LandingPage: React.FC<LandingPageProps> = ({
  onLoginClick,
  onSigninClick,
  language,
  setLanguage,
}) => {
  const isRTL = language === "ar";
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [currentAudioEl, setCurrentAudioEl] = useState<HTMLAudioElement | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTesti, setActiveTesti] = useState(0);
  const [demoStep, setDemoStep] = useState(0);

  const bars = useAudioVisualizer(currentAudioEl, playingId !== null);
  const scrolled = useScrollState();

  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroTitleY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const heroGridY = useTransform(scrollYProgress, [0, 1], [0, 150]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
  }, [language, isRTL]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Cycle terminal demo
  useEffect(() => {
    const id = setInterval(() => setDemoStep((s) => (s + 1) % 4), 2600);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const ArrowIcon = ({ className = "w-4 h-4" }: { className?: string }) =>
    isRTL ? <ArrowLeft className={className} /> : <ArrowRight className={className} />;

  /* ---------------------- COPY ---------------------- */
  const t = {
    skip: isRTL ? "تخطي" : "Aller au contenu",
    navWork: isRTL ? "الأصوات" : "Voix",
    navHow: isRTL ? "الطريقة" : "Process",
    navPricing: isRTL ? "الأسعار" : "Tarifs",
    navFaq: "FAQ",
    signin: isRTL ? "دخول" : "Connexion",
    start: isRTL ? "ابدأ" : "Commencer",

    liveBadge: isRTL ? "النموذج v2.1 مباشر" : "Modèle v2.1 en ligne",
    heroKicker: isRTL ? "استوديو صوتي بالذكاء الاصطناعي" : "Studio vocal propulsé par IA",
    heroTitle1: isRTL ? "الصوت الذي" : "La voix que",
    heroTitle2: isRTL ? "يستحقه نصك." : "mérite ton texte.",
    heroSub: isRTL
      ? "نموذج ذكاء اصطناعي مدرّب على الدارجة الجزائرية. توليد صوتي طبيعي في أقل من 30 ثانية."
      : "Un modèle d'IA entraîné sur la darija algérienne. Génération vocale naturelle en moins de 30 secondes.",
    tryFree: isRTL ? "جرّب مجاناً" : "Essayer gratuitement",
    listenDemo: isRTL ? "استمع للعرض" : "Écouter la démo",

    processKicker: isRTL ? "الطريقة" : "Process",
    processTitle: isRTL ? "من نص إلى صوت." : "D'un texte à une voix.",
    step1t: isRTL ? "اكتب" : "Écris",
    step1d: isRTL ? "الصق نصك، أو ولّده بالذكاء الاصطناعي." : "Colle ton texte, ou génère-le via l'IA.",
    step2t: isRTL ? "اختر" : "Choisis",
    step2d: isRTL ? "12 صوتاً، لهجات متعددة، نبرات مختلفة." : "12 voix, plusieurs lahjat, plusieurs tons.",
    step3t: isRTL ? "صدّر" : "Exporte",
    step3d: isRTL ? "MP3 أو WAV، جودة 24 kHz، بدون علامة." : "MP3 ou WAV, 24 kHz, sans watermark.",

    voicesKicker: isRTL ? "الأصوات" : "Bibliothèque",
    voicesTitle: isRTL ? "كل صوت له طابعه." : "Chaque voix a son grain.",
    voicesSub: isRTL
      ? "أربعة أصوات مختارة يدوياً، مدربة على الدارجة الحقيقية."
      : "Quatre voix sélectionnées à la main, entraînées sur de la vraie darija.",

    metricsKicker: isRTL ? "أرقام" : "Metrics",
    metricsTitle: isRTL ? "بناء بصبر. استخدام كل يوم." : "Construit patiemment. Utilisé chaque jour.",

    testKicker: isRTL ? "شهادات" : "Témoignages",
    testTitle: isRTL ? "المبدعون يتحدثون." : "Les créateurs parlent.",

    pricingKicker: isRTL ? "الأسعار" : "Tarifs",
    pricingTitle: isRTL ? "بسيط. بدون اشتراك." : "Simple. Sans abonnement.",
    pricingSub: isRTL
      ? "نقاط تُشترى مرة واحدة، تُستهلك بسرعتك، ولا تنتهي أبداً."
      : "Des points achetés une fois, utilisés à ton rythme. Jamais expirés.",

    faqKicker: "FAQ",
    faqTitle: isRTL ? "أسئلة، أجوبة." : "Questions, réponses.",

    ctaTitle: isRTL ? "ابدأ. النص ينتظر صوته." : "Commence. Ton texte attend sa voix.",
    ctaSub: isRTL ? "50 نقطة مجانية. بدون بطاقة." : "50 points offerts. Sans carte bancaire.",

    footTag: isRTL
      ? "صنع في الجزائر. للمبدعين في كل مكان."
      : "Fait en Algérie. Pour les créateurs, partout.",
    footPay: isRTL ? "دفع محلي" : "Paiement local",
    switchLang: isRTL ? "Passer en français" : "التبديل إلى العربية",
    close: isRTL ? "إغلاق" : "Fermer",
    open: isRTL ? "قائمة" : "Menu",
    prev: isRTL ? "السابق" : "Précédent",
    next: isRTL ? "التالي" : "Suivant",
    back: isRTL ? "للأعلى" : "Haut de page",
  };

  const nav = [
    { href: "#voices", label: t.navWork },
    { href: "#process", label: t.navHow },
    { href: "#pricing", label: t.navPricing },
    { href: "#faq", label: t.navFaq },
  ];

  const steps = [
    { n: "01", t: t.step1t, d: t.step1d, icon: Command },
    { n: "02", t: t.step2t, d: t.step2d, icon: Waves },
    { n: "03", t: t.step3t, d: t.step3d, icon: ArrowUpRight },
  ];

  const voices = [
    {
      id: "amin",
      name: isRTL ? "أمين" : "Amin",
      tag: isRTL ? "تجاري" : "Commercial",
      duration: "0:24",
      lang: "DZ · M",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    },
    {
      id: "yasmine",
      name: isRTL ? "ياسمين" : "Yasmine",
      tag: isRTL ? "إعلاني" : "Publicitaire",
      duration: "0:18",
      lang: "DZ · F",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    },
    {
      id: "khalid",
      name: isRTL ? "خالد" : "Khalid",
      tag: isRTL ? "وثائقي" : "Documentaire",
      duration: "0:31",
      lang: "DZ · M",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    },
    {
      id: "layla",
      name: isRTL ? "ليلى" : "Layla",
      tag: isRTL ? "سوشيال" : "Social",
      duration: "0:22",
      lang: "DZ · F",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    },
  ];

  const metrics = [
    { n: 12, s: "+", l: isRTL ? "صوت" : "Voix" },
    { n: 1200, s: "+", l: isRTL ? "مبدع" : "Créateurs" },
    { n: 98, s: "%", l: isRTL ? "رضا" : "Satisfaction" },
    { n: 30, s: "s", l: isRTL ? "متوسط الإنتاج" : "Génération moyenne" },
  ];

  const testimonials = isRTL
    ? [
        { q: "Sawtify ولّاني نخرج الريلز في وقت قصير. الجودة قريبة من الاستوديو.", n: "أمين بلعيد", r: "منشئ محتوى، الجزائر" },
        { q: "الدارجة طبيعية، الزبائن ما حسّوش أن الصوت اصطناعي.", n: "ياسمين قادري", r: "وكالة إشهار، وهران" },
        { q: "الدفع بالذهبية سهّل عليّ كلش. أحسن أداة لقيتها.", n: "خالد مرزوق", r: "متجر إلكتروني، قسنطينة" },
      ]
    : [
        { q: "Sawtify me fait sortir mes reels en un temps record. La qualité frôle celle du studio.", n: "Amine Belaid", r: "Créateur, Alger" },
        { q: "La darija est naturelle. Les clients ne réalisent pas que la voix est synthétique.", n: "Yasmine Kadri", r: "Agence pub, Oran" },
        { q: "Le paiement Edahabia a tout changé pour moi. Le meilleur outil que j'ai testé.", n: "Khaled Merzoug", r: "E-commerce, Constantine" },
      ];

  useEffect(() => {
    const id = setInterval(
      () => setActiveTesti((p) => (p + 1) % testimonials.length),
      7000
    );
    return () => clearInterval(id);
  }, [testimonials.length]);

  const pricing = [
    { pts: "100", price: "500", desc: isRTL ? "للتجربة." : "Pour tester." },
    { pts: "220", price: "1 000", desc: isRTL ? "الأكثر اختياراً." : "Le plus choisi.", featured: true },
    { pts: "600", price: "2 500", desc: isRTL ? "للمنتظمين." : "Pour les réguliers." },
    { pts: "1 350", price: "5 000", desc: isRTL ? "للوكالات." : "Pour les agences." },
  ];

  const features = [
    isRTL ? "جودة 24 kHz" : "Qualité 24 kHz",
    isRTL ? "MP3 و WAV" : "MP3 & WAV",
    isRTL ? "استخدام تجاري" : "Usage commercial",
    isRTL ? "بدون انتهاء صلاحية" : "Sans expiration",
  ];

  const faqs = isRTL
    ? [
        { q: "هل الأصوات صالحة للاستخدام التجاري؟", a: "نعم. تُستخدم بحرية في الإعلانات، الفيديوهات، ومشاريع الزبائن." },
        { q: "كيف يعمل نظام النقاط؟", a: "تشتري رصيداً مرة واحدة. توليد صوت = 20 نقطة. لا انتهاء صلاحية." },
        { q: "هل تدعمون الذهبية و CIB؟", a: "نعم، عبر SATIM. دفع محلي بالدينار." },
        { q: "كم تستغرق كل عملية توليد؟", a: "أقل من 30 ثانية للنص العادي." },
        { q: "هل يمكنني تجربة الأداة قبل الشراء؟", a: "نعم. 50 نقطة مجانية عند التسجيل." },
      ]
    : [
        { q: "Les voix sont-elles libres de droits ?", a: "Oui. Utilisation commerciale libre : pubs, vidéos, projets clients." },
        { q: "Comment fonctionnent les points ?", a: "Tu achètes un crédit une fois. Une génération = 20 points. Aucune expiration." },
        { q: "Edahabia et CIB sont-ils acceptés ?", a: "Oui, via SATIM. Paiement local en dinars." },
        { q: "Combien de temps prend une génération ?", a: "Moins de 30 secondes pour un texte standard." },
        { q: "Puis-je tester avant d'acheter ?", a: "Oui. 50 points offerts à l'inscription." },
      ];

  const demoLines = [
    { label: "input", text: isRTL ? "«مرحبا بيكم في متجرنا…»" : "« Ahlan bikoum fi matjarna… »" },
    { label: "voice", text: "Amin · DZ" },
    { label: "model", text: "sawtify-v2.1 · 24 kHz" },
    { label: "output", text: "voice_a72f.mp3 · 0:24 · 1.2 MB" },
  ];

  /* ---------------------- HANDLERS ---------------------- */
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
    audio.play().catch(() => setPlayingId(null));
    audio.onended = () => setPlayingId(null);
    setPlayingId(id);
  };

  const smoothTo = useCallback((href: string) => {
    setMenuOpen(false);
    const el = document.querySelector(href);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 60;
    window.scrollTo({ top, behavior: "smooth" });
  }, []);

  const serif = isRTL ? "'Cairo', serif" : "'Fraunces', 'Times New Roman', serif";
  const sans = isRTL
    ? "'Cairo', 'Inter', ui-sans-serif, system-ui, sans-serif"
    : "'Inter', ui-sans-serif, system-ui, sans-serif";
  const mono = "'JetBrains Mono', 'SF Mono', ui-monospace, monospace";

  /* =======================================================
     RENDER
  ======================================================= */
  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="min-h-screen bg-[#FAFAF7] text-[#111111] selection:bg-[#6366F1] selection:text-white"
      style={{ fontFamily: sans }}
    >
      <GlobalStyles />

      <a
        href="#home"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:start-4 focus:z-[100] focus:bg-[#111] focus:text-white focus:px-4 focus:py-2 focus:rounded text-xs font-medium"
      >
        {t.skip}
      </a>

      {/* =====================================================
          HEADER
      ===================================================== */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ease-out ${
          scrolled
            ? "bg-[#FAFAF7]/80 backdrop-blur-xl border-b border-black/[0.06]"
            : "bg-transparent border-b border-transparent"
        }`}
      >
        <div className="mx-auto max-w-[1200px] px-6 h-16 flex items-center justify-between">
          <a
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              smoothTo("#home");
            }}
            className="flex items-center gap-2 sw-focus"
            aria-label="Sawtify"
          >
            <div className="w-6 h-6 rounded-full overflow-hidden bg-black shrink-0">
              <img
                src={LOGO_URL}
                alt=""
                width={24}
                height={24}
                decoding="async"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="font-medium text-[14px] text-[#111] tracking-tight">
              Sawtify
            </span>
            <span
              className="hidden sm:inline text-[10px] text-[#6366F1] border border-[#6366F1]/25 rounded px-1.5 py-px ms-1"
              style={{ fontFamily: mono }}
            >
              v2.1
            </span>
          </a>

          <nav
            className="hidden md:flex items-center gap-8 text-[13px] text-[#111]/65"
            aria-label="Principale"
          >
            {nav.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={(e) => {
                  e.preventDefault();
                  smoothTo(l.href);
                }}
                className="hover:text-[#111] transition-colors duration-200 sw-focus"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setLanguage(language === "fr" ? "ar" : "fr")}
              aria-label={t.switchLang}
              className="hidden sm:inline-flex w-8 h-8 items-center justify-center text-[11px] font-medium text-[#111]/60 hover:text-[#111] transition-colors sw-focus rounded"
              style={{ fontFamily: mono }}
            >
              {language === "fr" ? "AR" : "FR"}
            </button>

            <button
              type="button"
              onClick={onLoginClick}
              className="hidden md:inline-flex px-3 h-8 text-[13px] font-medium text-[#111]/70 hover:text-[#111] transition-colors sw-focus rounded"
            >
              {t.signin}
            </button>

            <button
              type="button"
              onClick={onSigninClick}
              className="hidden md:inline-flex items-center gap-1.5 h-8 px-3.5 bg-[#111] text-[#FAFAF7] text-[13px] font-medium rounded-full hover:bg-[#111]/85 transition-colors sw-focus"
            >
              {t.start}
              <ArrowIcon className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label={t.open}
              aria-expanded={menuOpen}
              className="md:hidden w-9 h-9 flex items-center justify-center text-[#111] hover:bg-black/5 rounded transition-colors sw-focus"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE DRAWER */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-[55] bg-black/20 md:hidden"
              aria-hidden="true"
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              initial={{ x: isRTL ? "-100%" : "100%" }}
              animate={{ x: 0 }}
              exit={{ x: isRTL ? "-100%" : "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 300 }}
              className="fixed inset-y-0 end-0 z-[60] w-[86%] max-w-sm bg-[#FAFAF7] md:hidden flex flex-col"
            >
              <div className="flex items-center justify-between px-6 h-16 border-b border-black/[0.06]">
                <span className="font-medium text-[14px]">Sawtify</span>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  aria-label={t.close}
                  className="w-9 h-9 flex items-center justify-center rounded hover:bg-black/5 transition-colors sw-focus"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <nav className="flex-1 px-6 py-8 flex flex-col gap-1">
                {nav.map((l, i) => (
                  <motion.a
                    key={l.href}
                    href={l.href}
                    onClick={(e) => {
                      e.preventDefault();
                      smoothTo(l.href);
                    }}
                    initial={{ opacity: 0, x: isRTL ? -12 : 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.06 * i + 0.15, duration: 0.4 }}
                    className="flex items-center justify-between py-4 text-[17px] text-[#111] border-b border-black/[0.05] sw-focus"
                  >
                    {l.label}
                    <ArrowIcon className="w-4 h-4 opacity-30" />
                  </motion.a>
                ))}

                <button
                  type="button"
                  onClick={() => setLanguage(language === "fr" ? "ar" : "fr")}
                  className="flex items-center justify-between py-4 text-[17px] text-[#111]/60 border-b border-black/[0.05] sw-focus"
                >
                  {language === "fr" ? "العربية" : "Français"}
                  <span className="text-xs" style={{ fontFamily: mono }}>
                    {language === "fr" ? "AR" : "FR"}
                  </span>
                </button>
              </nav>

              <div className="px-6 pb-8 pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onSigninClick();
                  }}
                  className="w-full rounded-full bg-[#111] text-[#FAFAF7] py-3.5 text-[14px] font-medium sw-focus"
                >
                  {t.start}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onLoginClick();
                  }}
                  className="w-full rounded-full border border-black/10 text-[#111] py-3.5 text-[14px] font-medium sw-focus"
                >
                  {t.signin}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* =====================================================
          HERO — luxury + grille AI perspective
      ===================================================== */}
      <section
        id="home"
        ref={heroRef}
        className="relative pt-36 sm:pt-44 pb-20 sm:pb-28 overflow-hidden sw-noise"
        aria-label="Introduction"
      >
        {/* Grille perspective AI */}
        <motion.div
          aria-hidden="true"
          style={{ y: heroGridY }}
          className="absolute inset-0 sw-grid opacity-70 pointer-events-none"
        />
        {/* Fade top/bottom sur la grille */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, #FAFAF7 0%, transparent 20%, transparent 60%, #FAFAF7 100%)",
          }}
        />
        {/* Glow subtils indigo */}
        <div
          aria-hidden="true"
          className="sw-glow w-[500px] h-[500px] bg-[#6366F1]/12"
          style={{ top: "-10%", right: "-10%" }}
        />
        <div
          aria-hidden="true"
          className="sw-glow w-[400px] h-[400px] bg-[#A78BFA]/10"
          style={{ top: "40%", left: "-5%" }}
        />

        <div className="relative mx-auto max-w-[1200px] px-6">
          <motion.div style={{ y: heroTitleY, opacity: heroOpacity }}>
            {/* Live badge */}
            <Reveal>
              <div className="inline-flex items-center gap-2 mb-8 px-3 py-1.5 rounded-full bg-white/60 backdrop-blur-sm border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                <span className="relative flex w-1.5 h-1.5">
                  <span className="absolute inset-0 rounded-full bg-emerald-500 sw-pulse" />
                  <span className="relative rounded-full w-1.5 h-1.5 bg-emerald-500" />
                </span>
                <span
                  className="text-[11px] text-[#111]/70 tracking-wide"
                  style={{ fontFamily: mono }}
                >
                  {t.liveBadge}
                </span>
              </div>
            </Reveal>

            <Reveal delay={0.05}>
              <p
                className="text-[11px] uppercase tracking-[0.18em] text-[#111]/45 mb-6"
                style={{ letterSpacing: isRTL ? "0.05em" : "0.18em" }}
              >
                <Sparkles className="inline w-3 h-3 me-1.5 -mt-0.5 text-[#6366F1]" />
                {t.heroKicker}
              </p>
            </Reveal>

            <Reveal delay={0.1} y={28}>
              <h1
                className="text-[clamp(2.5rem,7vw,5.75rem)] leading-[1.02] tracking-[-0.03em] text-[#111] max-w-4xl font-normal"
                style={{ fontFamily: serif }}
              >
                {t.heroTitle1}
                <br />
                <span className="italic sw-shimmer-text">{t.heroTitle2}</span>
              </h1>
            </Reveal>

            <Reveal delay={0.25}>
              <p className="mt-8 text-[16px] sm:text-[17px] leading-[1.6] text-[#111]/60 max-w-lg">
                {t.heroSub}
              </p>
            </Reveal>

            <Reveal delay={0.35}>
              <div className="mt-10 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onSigninClick}
                  className="group relative inline-flex items-center gap-2 h-11 px-5 bg-[#111] text-[#FAFAF7] text-[14px] font-medium rounded-full hover:bg-[#111]/88 transition-all duration-300 sw-focus overflow-hidden"
                >
                  {/* Subtle inner glow */}
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background:
                        "linear-gradient(90deg, transparent, rgba(99,102,241,0.4), transparent)",
                    }}
                  />
                  <span className="relative flex items-center gap-2">
                    {t.tryFree}
                    <ArrowIcon className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => smoothTo("#voices")}
                  className="group inline-flex items-center gap-2 h-11 px-5 text-[14px] font-medium text-[#111] rounded-full hover:bg-black/5 transition-colors sw-focus"
                >
                  <span className="w-6 h-6 rounded-full border border-[#111]/25 flex items-center justify-center group-hover:border-[#6366F1] transition-colors">
                    <Play className="w-2.5 h-2.5 ms-0.5 fill-current" />
                  </span>
                  {t.listenDemo}
                </button>
              </div>
            </Reveal>
          </motion.div>

          {/* Terminal AI card + waveform */}
          <Reveal delay={0.5}>
            <div className="mt-20 sm:mt-28 grid lg:grid-cols-12 gap-6 items-start">
              {/* Terminal card */}
              <div className="lg:col-span-5 rounded-2xl bg-white border border-black/[0.08] shadow-[0_2px_10px_rgba(0,0,0,0.04)] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-black/[0.06] bg-[#FAFAF7]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-black/15" />
                    <span className="w-2 h-2 rounded-full bg-black/15" />
                    <span className="w-2 h-2 rounded-full bg-black/15" />
                  </div>
                  <span
                    className="text-[10px] text-[#111]/40"
                    style={{ fontFamily: mono }}
                  >
                    sawtify.dz
                  </span>
                </div>
                <div
                  className="p-5 space-y-2 min-h-[180px]"
                  style={{ fontFamily: mono }}
                >
                  {demoLines.map((line, i) => (
                    <motion.div
                      key={line.label}
                      initial={{ opacity: 0.3 }}
                      animate={{
                        opacity: i <= demoStep ? 1 : 0.3,
                      }}
                      transition={{ duration: 0.4 }}
                      className="flex items-baseline gap-3 text-[12px]"
                    >
                      <span className="text-[#6366F1] w-14 shrink-0">
                        {line.label}
                      </span>
                      <span className="text-[#111]/85 truncate">
                        {i <= demoStep ? line.text : "—"}
                      </span>
                      {i === demoStep && (
                        <motion.span
                          animate={{ opacity: [1, 0, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                          className="text-[#111]/40"
                        >
                          ▊
                        </motion.span>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Waveform */}
              <div className="lg:col-span-7">
                <div
                  className="flex items-end gap-[3px] h-16 opacity-80"
                  dir="ltr"
                  aria-hidden="true"
                >
                  {Array.from({ length: 90 }).map((_, i) => {
                    const seed = Math.sin(i * 0.6) * Math.cos(i * 0.3);
                    const h = 8 + Math.abs(seed) * 55;
                    return (
                      <motion.span
                        key={i}
                        initial={{ scaleY: 0.2, opacity: 0 }}
                        whileInView={{ scaleY: 1, opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{
                          duration: 0.6,
                          delay: 0.5 + i * 0.008,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        className="flex-1 rounded-full origin-bottom"
                        style={{
                          height: `${h}%`,
                          maxWidth: 3,
                          background:
                            i % 7 === 0
                              ? "#6366F1"
                              : i % 5 === 0
                              ? "#A78BFA"
                              : "#111",
                        }}
                      />
                    );
                  })}
                </div>
                <div
                  className="mt-3 flex items-center justify-between text-[10px] text-[#111]/40"
                  style={{ fontFamily: mono }}
                >
                  <span>00:00</span>
                  <span>24 kHz · stereo</span>
                  <span>00:24</span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <div className="mx-auto max-w-[1200px] px-6">
        <div className="sw-hairline" />
      </div>

      {/* =====================================================
          PROCESS
      ===================================================== */}
      <section id="process" className="py-24 sm:py-36 relative">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 mb-20">
            <Reveal className="lg:col-span-5">
              <p
                className="text-[11px] uppercase tracking-[0.18em] text-[#111]/45 mb-5"
                style={{ fontFamily: mono }}
              >
                <span className="text-[#6366F1]">/</span> {t.processKicker}
              </p>
              <h2
                className="text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.05] tracking-[-0.02em] text-[#111]"
                style={{ fontFamily: serif }}
              >
                {t.processTitle}
              </h2>
            </Reveal>

            <Reveal delay={0.1} className="lg:col-span-6 lg:col-start-7 lg:mt-4">
              <p className="text-[15px] leading-[1.65] text-[#111]/55 max-w-md">
                {isRTL
                  ? "بدون استوديو. بدون ممثل. بدون انتظار. فقط ثلاث خطوات، ثلاثون ثانية، وصوت جاهز."
                  : "Pas de studio, pas de comédien, pas d'attente. Trois étapes, trente secondes, une voix prête."}
              </p>
            </Reveal>
          </div>

          <div className="grid md:grid-cols-3 gap-x-8 gap-y-12 md:gap-x-12">
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.1}>
                <div className="border-t border-[#111]/12 pt-6 group">
                  <div className="flex items-baseline justify-between mb-8">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[11px] text-[#111]/40 tabular-nums"
                        style={{ fontFamily: mono }}
                      >
                        <Num>{s.n}</Num>
                      </span>
                      <s.icon className="w-3.5 h-3.5 text-[#6366F1] opacity-70" />
                    </div>
                    <motion.div
                      initial={{ scaleX: 0 }}
                      whileInView={{ scaleX: 1 }}
                      viewport={{ once: true }}
                      transition={{
                        duration: 1,
                        delay: 0.4 + i * 0.15,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      style={{ transformOrigin: isRTL ? "right" : "left" }}
                      className="h-px w-16 bg-gradient-to-r from-[#111]/30 to-transparent"
                    />
                  </div>
                  <h3
                    className="text-[26px] leading-tight tracking-[-0.01em] text-[#111] mb-3 group-hover:text-[#6366F1] transition-colors duration-500"
                    style={{ fontFamily: serif }}
                  >
                    {s.t}
                  </h3>
                  <p className="text-[14px] leading-[1.6] text-[#111]/55 max-w-xs">
                    {s.d}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1200px] px-6">
        <div className="sw-hairline" />
      </div>

      {/* =====================================================
          VOICES
      ===================================================== */}
      <section id="voices" className="py-24 sm:py-36 relative">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="grid lg:grid-cols-12 gap-8 mb-16 items-end">
            <Reveal className="lg:col-span-7">
              <p
                className="text-[11px] uppercase tracking-[0.18em] text-[#111]/45 mb-5"
                style={{ fontFamily: mono }}
              >
                <span className="text-[#6366F1]">/</span> {t.voicesKicker}
              </p>
              <h2
                className="text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.05] tracking-[-0.02em] text-[#111]"
                style={{ fontFamily: serif }}
              >
                {t.voicesTitle}
              </h2>
            </Reveal>
            <Reveal delay={0.1} className="lg:col-span-4 lg:col-start-9">
              <p className="text-[14px] leading-[1.65] text-[#111]/55">
                {t.voicesSub}
              </p>
            </Reveal>
          </div>

          <div className="border-t border-[#111]/12">
            {voices.map((v, idx) => {
              const active = playingId === v.id;
              return (
                <motion.div
                  key={v.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{
                    duration: 0.6,
                    delay: idx * 0.05,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className={`border-b border-[#111]/12 group transition-colors duration-500 ${
                    active ? "bg-white" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleVoice(v.id, v.url)}
                    aria-label={`${active ? "Pause" : "Play"} ${v.name}`}
                    aria-pressed={active}
                    className="w-full flex items-center gap-4 sm:gap-6 py-6 sm:py-7 px-2 text-start sw-focus"
                  >
                    <div
                      className={`w-10 h-10 shrink-0 rounded-full border flex items-center justify-center transition-all duration-300 ${
                        active
                          ? "bg-[#6366F1] border-[#6366F1] text-white shadow-[0_0_0_4px_rgba(99,102,241,0.15)]"
                          : "border-[#111]/20 text-[#111] group-hover:border-[#111] group-hover:bg-[#111] group-hover:text-[#FAFAF7]"
                      }`}
                    >
                      {active ? (
                        <Pause className="w-3.5 h-3.5 fill-current" />
                      ) : (
                        <Play className="w-3.5 h-3.5 ms-0.5 fill-current" />
                      )}
                    </div>

                    <div className="w-24 sm:w-40 shrink-0">
                      <div className="flex items-center gap-2">
                        <div
                          className="text-[18px] sm:text-[20px] text-[#111] tracking-[-0.01em]"
                          style={{ fontFamily: serif }}
                        >
                          {v.name}
                        </div>
                        <span
                          className="hidden sm:inline text-[9px] text-[#111]/40 border border-[#111]/15 rounded px-1 py-px"
                          style={{ fontFamily: mono }}
                        >
                          {v.lang}
                        </span>
                      </div>
                      <div className="text-[12px] text-[#111]/45 mt-0.5">{v.tag}</div>
                    </div>

                    <div
                      className="flex-1 flex items-center gap-[2px] h-10 min-w-0"
                      aria-hidden="true"
                      dir="ltr"
                    >
                      {bars.map((h, i) => (
                        <span
                          key={i}
                          className="flex-1 rounded-full transition-all duration-100"
                          style={{
                            height: active ? `${Math.max(10, h)}%` : "18%",
                            maxWidth: 3,
                            background: active
                              ? i % 5 === 0
                                ? "#6366F1"
                                : "#111"
                              : "rgba(17,17,17,0.12)",
                          }}
                        />
                      ))}
                    </div>

                    <Num
                      className="text-[11px] text-[#111]/40 tabular-nums shrink-0 hidden sm:inline"
                      style={{ fontFamily: mono }}
                    >
                      {v.duration}
                    </Num>
                  </button>
                </motion.div>
              );
            })}
          </div>

          <Reveal delay={0.2}>
            <div
              className="mt-10 flex items-center gap-2.5 text-[12px] text-[#111]/50"
              style={{ fontFamily: mono }}
            >
              <span className="relative flex w-1.5 h-1.5">
                <span className="absolute inset-0 rounded-full bg-[#6366F1] sw-pulse" />
                <span className="relative rounded-full w-1.5 h-1.5 bg-[#6366F1]" />
              </span>
              {isRTL ? "أصوات جديدة كل شهر" : "New voices monthly"}
            </div>
          </Reveal>
        </div>
      </section>

      {/* =====================================================
          MÉTRIQUES — dark, avec grille AI
      ===================================================== */}
      <section className="relative bg-[#0A0A0B] text-[#FAFAF7] py-24 sm:py-36 overflow-hidden">
        <div className="absolute inset-0 sw-grid-dark opacity-40 pointer-events-none" />
        <div
          aria-hidden="true"
          className="sw-glow w-[600px] h-[600px] bg-[#6366F1]/15"
          style={{ top: "-20%", right: "-15%" }}
        />
        <div
          aria-hidden="true"
          className="sw-glow w-[400px] h-[400px] bg-[#A78BFA]/10"
          style={{ bottom: "-10%", left: "-10%" }}
        />

        <div className="relative mx-auto max-w-[1200px] px-6">
          <div className="grid lg:grid-cols-12 gap-12 mb-16">
            <Reveal className="lg:col-span-6">
              <p
                className="text-[11px] uppercase tracking-[0.18em] text-white/40 mb-5"
                style={{ fontFamily: mono }}
              >
                <span className="text-[#A78BFA]">/</span> {t.metricsKicker}
              </p>
              <h2
                className="text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.05] tracking-[-0.02em] text-white"
                style={{ fontFamily: serif }}
              >
                {t.metricsTitle}
              </h2>
            </Reveal>
            <Reveal delay={0.1} className="lg:col-span-4 lg:col-start-9 lg:mt-4">
              <div
                className="flex items-center gap-2 text-[11px] text-white/50"
                style={{ fontFamily: mono }}
              >
                <Cpu className="w-3.5 h-3.5 text-[#A78BFA]" />
                {isRTL ? "محدّث في الوقت الحقيقي" : "Updated in real time"}
              </div>
            </Reveal>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-12 gap-x-6">
            {metrics.map((m, i) => (
              <Reveal key={m.l} delay={i * 0.08}>
                <div className="border-t border-white/15 pt-6 relative">
                  <div
                    className="absolute -top-px start-0 w-8 h-px bg-[#6366F1]"
                    aria-hidden="true"
                  />
                  <Counter
                    target={m.n}
                    suffix={m.s}
                    className="text-[clamp(2.5rem,5vw,4rem)] leading-none tracking-[-0.03em] text-white"
                    style={{ fontFamily: serif }}
                  />
                  <div className="text-[13px] text-white/50 mt-4">{m.l}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================
          TESTIMONIALS
      ===================================================== */}
      <section className="py-24 sm:py-36 relative">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="grid lg:grid-cols-12 gap-8 mb-16">
            <Reveal className="lg:col-span-6">
              <p
                className="text-[11px] uppercase tracking-[0.18em] text-[#111]/45 mb-5"
                style={{ fontFamily: mono }}
              >
                <span className="text-[#6366F1]">/</span> {t.testKicker}
              </p>
              <h2
                className="text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.05] tracking-[-0.02em] text-[#111]"
                style={{ fontFamily: serif }}
              >
                {t.testTitle}
              </h2>
            </Reveal>
          </div>

          <div className="grid lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 relative min-h-[220px] sm:min-h-[180px]">
              <AnimatePresence mode="wait">
                <motion.figure
                  key={activeTesti}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="flex gap-1 mb-6" aria-label="5 / 5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className="w-3.5 h-3.5 text-[#6366F1] fill-[#6366F1]"
                      />
                    ))}
                  </div>
                  <blockquote
                    className="text-[clamp(1.5rem,3vw,2.25rem)] leading-[1.3] tracking-[-0.015em] text-[#111]"
                    style={{ fontFamily: serif }}
                  >
                    "{testimonials[activeTesti].q}"
                  </blockquote>
                  <figcaption className="mt-8 flex items-center gap-3">
                    <div className="w-px h-10 bg-gradient-to-b from-[#6366F1] to-transparent" />
                    <div>
                      <div className="text-[14px] font-medium text-[#111]">
                        {testimonials[activeTesti].n}
                      </div>
                      <div className="text-[12px] text-[#111]/50 mt-0.5">
                        {testimonials[activeTesti].r}
                      </div>
                    </div>
                  </figcaption>
                </motion.figure>
              </AnimatePresence>
            </div>

            <div className="lg:col-span-3 lg:col-start-10 flex lg:flex-col items-center lg:items-end gap-4 lg:gap-6">
              <div className="flex lg:flex-col gap-2">
                {testimonials.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveTesti(i)}
                    aria-label={`Témoignage ${i + 1}`}
                    aria-current={activeTesti === i}
                    className="group p-1 sw-focus"
                  >
                    <span
                      className={`block transition-all duration-500 ${
                        activeTesti === i
                          ? "w-8 h-px bg-[#6366F1]"
                          : "w-4 h-px bg-[#111]/25 group-hover:bg-[#111]/50"
                      }`}
                    />
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 ms-auto lg:ms-0">
                <button
                  type="button"
                  onClick={() =>
                    setActiveTesti(
                      (p) => (p - 1 + testimonials.length) % testimonials.length
                    )
                  }
                  aria-label={t.prev}
                  className="w-9 h-9 rounded-full border border-[#111]/15 flex items-center justify-center hover:border-[#6366F1] hover:text-[#6366F1] transition-colors sw-focus"
                >
                  {isRTL ? (
                    <ArrowRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowLeft className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTesti((p) => (p + 1) % testimonials.length)}
                  aria-label={t.next}
                  className="w-9 h-9 rounded-full border border-[#111]/15 flex items-center justify-center hover:border-[#6366F1] hover:text-[#6366F1] transition-colors sw-focus"
                >
                  {isRTL ? (
                    <ArrowLeft className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1200px] px-6">
        <div className="sw-hairline" />
      </div>

      {/* =====================================================
          PRICING
      ===================================================== */}
      <section id="pricing" className="py-24 sm:py-36 relative">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="grid lg:grid-cols-12 gap-12 mb-16">
            <Reveal className="lg:col-span-7">
              <p
                className="text-[11px] uppercase tracking-[0.18em] text-[#111]/45 mb-5"
                style={{ fontFamily: mono }}
              >
                <span className="text-[#6366F1]">/</span> {t.pricingKicker}
              </p>
              <h2
                className="text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.05] tracking-[-0.02em] text-[#111]"
                style={{ fontFamily: serif }}
              >
                {t.pricingTitle}
              </h2>
            </Reveal>
            <Reveal delay={0.1} className="lg:col-span-4 lg:col-start-9 lg:mt-3">
              <p className="text-[14px] leading-[1.65] text-[#111]/55">{t.pricingSub}</p>
            </Reveal>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 border-t border-l border-[#111]/12">
            {pricing.map((p, i) => (
              <Reveal key={p.pts} delay={i * 0.06}>
                <div
                  className={`relative p-8 border-r border-b border-[#111]/12 h-full flex flex-col transition-colors duration-300 group ${
                    p.featured
                      ? "bg-[#0A0A0B] text-[#FAFAF7]"
                      : "bg-transparent hover:bg-black/[0.02]"
                  }`}
                >
                  {p.featured && (
                    <>
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 sw-grid-dark opacity-30 pointer-events-none"
                      />
                      <span
                        className="absolute top-4 end-4 z-10 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.15em] text-[#A78BFA] bg-white/5 border border-white/10 rounded-full px-2 py-1"
                        style={{ fontFamily: mono }}
                      >
                        <Zap className="w-2.5 h-2.5" />
                        {isRTL ? "شائع" : "popular"}
                      </span>
                    </>
                  )}

                  <div className="relative">
                    <Num
                      className={`text-[44px] leading-none tracking-[-0.02em] block mb-2 ${
                        p.featured ? "text-white" : "text-[#111]"
                      }`}
                      style={{ fontFamily: serif }}
                    >
                      {p.pts}
                    </Num>
                    <div
                      className={`text-[13px] mb-8 ${
                        p.featured ? "text-white/60" : "text-[#111]/50"
                      }`}
                    >
                      {isRTL ? "نقطة" : "points"}
                    </div>
                  </div>

                  <p
                    className={`relative text-[13px] leading-relaxed mb-8 ${
                      p.featured ? "text-white/70" : "text-[#111]/55"
                    }`}
                  >
                    {p.desc}
                  </p>

                  <div
                    className={`relative h-px mb-6 ${
                      p.featured ? "bg-white/15" : "bg-[#111]/10"
                    }`}
                  />

                  <ul className="relative space-y-2 mb-10 list-none">
                    {features.map((f) => (
                      <li
                        key={f}
                        className={`flex items-center gap-2 text-[12px] ${
                          p.featured ? "text-white/70" : "text-[#111]/55"
                        }`}
                      >
                        <Check
                          className={`w-3 h-3 shrink-0 ${
                            p.featured ? "text-[#A78BFA]" : "text-[#6366F1]"
                          }`}
                        />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <div className="relative mt-auto">
                    <div className="flex items-baseline gap-1.5 mb-6">
                      <Num
                        className={`text-[28px] tracking-[-0.02em] ${
                          p.featured ? "text-white" : "text-[#111]"
                        }`}
                        style={{ fontFamily: serif }}
                      >
                        {p.price}
                      </Num>
                      <span
                        className={`text-[12px] ${
                          p.featured ? "text-white/50" : "text-[#111]/45"
                        }`}
                        style={{ fontFamily: mono }}
                      >
                        DZD
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={onSigninClick}
                      className={`w-full h-11 rounded-full text-[13px] font-medium transition-all sw-focus ${
                        p.featured
                          ? "bg-white text-[#111] hover:bg-[#A78BFA] hover:text-white"
                          : "border border-[#111]/15 text-[#111] hover:border-[#6366F1] hover:bg-[#6366F1] hover:text-white"
                      }`}
                    >
                      {isRTL ? "اختيار" : "Choisir"}
                    </button>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.3}>
            <div
              className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-[#111]/45"
              style={{ fontFamily: mono }}
            >
              <span>SATIM</span>
              <span className="w-px h-3 bg-[#111]/20" />
              <span>Edahabia</span>
              <span className="w-px h-3 bg-[#111]/20" />
              <span>CIB</span>
              <span className="w-px h-3 bg-[#111]/20" />
              <span>{isRTL ? "بالدينار الجزائري" : "En dinars algériens"}</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* =====================================================
          FAQ
      ===================================================== */}
      <section id="faq" className="py-24 sm:py-36 bg-[#F4F3EF] relative">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="grid lg:grid-cols-12 gap-12">
            <Reveal className="lg:col-span-4">
              <p
                className="text-[11px] uppercase tracking-[0.18em] text-[#111]/45 mb-5"
                style={{ fontFamily: mono }}
              >
                <span className="text-[#6366F1]">/</span> {t.faqKicker}
              </p>
              <h2
                className="text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.05] tracking-[-0.02em] text-[#111]"
                style={{ fontFamily: serif }}
              >
                {t.faqTitle}
              </h2>
            </Reveal>

            <div className="lg:col-span-7 lg:col-start-6">
              <div className="border-t border-[#111]/15">
                {faqs.map((f, i) => {
                  const open = openFaq === i;
                  return (
                    <Reveal key={f.q} delay={i * 0.04}>
                      <div className="border-b border-[#111]/15">
                        <button
                          type="button"
                          onClick={() => setOpenFaq(open ? null : i)}
                          aria-expanded={open}
                          className="w-full py-6 flex items-start gap-6 text-start sw-focus group"
                        >
                          <span className="flex-1 text-[16px] sm:text-[17px] text-[#111] leading-snug pt-0.5 group-hover:text-[#6366F1] transition-colors duration-300">
                            {f.q}
                          </span>
                          <span
                            className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors duration-300 ${
                              open ? "border-[#6366F1] bg-[#6366F1] text-white" : "border-[#111]/25"
                            }`}
                          >
                            <motion.div
                              animate={{ rotate: open ? 45 : 0 }}
                              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                            >
                              <Plus className="w-3 h-3" />
                            </motion.div>
                          </span>
                        </button>

                        <AnimatePresence initial={false}>
                          {open && (
                            <motion.div
                              key="content"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{
                                height: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
                                opacity: { duration: 0.25, delay: open ? 0.1 : 0 },
                              }}
                              className="overflow-hidden"
                            >
                              <p className="pb-6 pe-12 text-[14px] leading-[1.7] text-[#111]/60 max-w-xl">
                                {f.a}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </Reveal>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          CTA — luxury minimal avec glow AI
      ===================================================== */}
      <section className="py-32 sm:py-48 relative overflow-hidden">
        <div
          aria-hidden="true"
          className="sw-glow w-[500px] h-[500px] bg-[#6366F1]/8"
          style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
        />
        <div className="relative mx-auto max-w-[900px] px-6 text-center">
          <Reveal>
            <h2
              className="text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.05] tracking-[-0.025em] text-[#111]"
              style={{ fontFamily: serif }}
            >
              {t.ctaTitle}
            </h2>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="mt-6 text-[15px] text-[#111]/55">{t.ctaSub}</p>
          </Reveal>
          <Reveal delay={0.25}>
            <button
              type="button"
              onClick={onSigninClick}
              className="group relative mt-10 inline-flex items-center gap-2 h-12 px-6 bg-[#111] text-[#FAFAF7] text-[14px] font-medium rounded-full hover:bg-[#111]/85 transition-all duration-300 sw-focus overflow-hidden"
            >
              <span
                aria-hidden="true"
                className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(99,102,241,0.5), transparent)",
                }}
              />
              <span className="relative flex items-center gap-2">
                {t.start}
                <ArrowIcon className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </button>
          </Reveal>
        </div>
      </section>

      {/* =====================================================
          FOOTER
      ===================================================== */}
      <footer className="border-t border-[#111]/10">
        <div className="mx-auto max-w-[1200px] px-6 py-14">
          <div className="grid md:grid-cols-12 gap-10 mb-16">
            <div className="md:col-span-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full overflow-hidden bg-black">
                  <img
                    src={LOGO_URL}
                    alt=""
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-[14px] font-medium">Sawtify</span>
                <span
                  className="text-[10px] text-[#6366F1] border border-[#6366F1]/25 rounded px-1.5 py-px"
                  style={{ fontFamily: mono }}
                >
                  v2.1
                </span>
              </div>
              <p className="text-[13px] text-[#111]/55 max-w-xs leading-relaxed mb-6">
                {t.footTag}
              </p>
              <div
                className="inline-flex items-center gap-2 text-[11px] text-[#111]/45"
                style={{ fontFamily: mono }}
              >
                <span className="relative flex w-1.5 h-1.5">
                  <span className="absolute inset-0 rounded-full bg-emerald-500 sw-pulse" />
                  <span className="relative rounded-full w-1.5 h-1.5 bg-emerald-500" />
                </span>
                All systems operational
              </div>
            </div>

            <div className="md:col-span-2">
              <div
                className="text-[11px] uppercase tracking-[0.15em] text-[#111]/35 mb-4"
                style={{ fontFamily: mono }}
              >
                {isRTL ? "المنتج" : "Produit"}
              </div>
              <ul className="space-y-2.5 list-none text-[13px]">
                <li>
                  <a
                    href="#voices"
                    onClick={(e) => {
                      e.preventDefault();
                      smoothTo("#voices");
                    }}
                    className="text-[#111]/70 hover:text-[#6366F1] transition-colors"
                  >
                    {t.navWork}
                  </a>
                </li>
                <li>
                  <a
                    href="#pricing"
                    onClick={(e) => {
                      e.preventDefault();
                      smoothTo("#pricing");
                    }}
                    className="text-[#111]/70 hover:text-[#6366F1] transition-colors"
                  >
                    {t.navPricing}
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-[#111]/70 hover:text-[#6366F1] transition-colors"
                  >
                    API
                  </a>
                </li>
              </ul>
            </div>

            <div className="md:col-span-2">
              <div
                className="text-[11px] uppercase tracking-[0.15em] text-[#111]/35 mb-4"
                style={{ fontFamily: mono }}
              >
                {isRTL ? "الشركة" : "Compagnie"}
              </div>
              <ul className="space-y-2.5 list-none text-[13px]">
                <li>
                  <a
                    href="#"
                    className="text-[#111]/70 hover:text-[#6366F1] transition-colors"
                  >
                    {isRTL ? "من نحن" : "À propos"}
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-[#111]/70 hover:text-[#6366F1] transition-colors"
                  >
                    {isRTL ? "اتصل" : "Contact"}
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-[#111]/70 hover:text-[#6366F1] transition-colors"
                  >
                    {isRTL ? "المدونة" : "Blog"}
                  </a>
                </li>
              </ul>
            </div>

            <div className="md:col-span-3">
              <div
                className="text-[11px] uppercase tracking-[0.15em] text-[#111]/35 mb-4"
                style={{ fontFamily: mono }}
              >
                {isRTL ? "قانوني" : "Légal"}
              </div>
              <ul className="space-y-2.5 list-none text-[13px]">
                <li>
                  <a
                    href="#"
                    className="text-[#111]/70 hover:text-[#6366F1] transition-colors"
                  >
                    {isRTL ? "شروط الاستخدام" : "Conditions"}
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-[#111]/70 hover:text-[#6366F1] transition-colors"
                  >
                    {isRTL ? "الخصوصية" : "Confidentialité"}
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-[#111]/70 hover:text-[#6366F1] transition-colors"
                  >
                    Cookies
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-[#111]/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p
              className="text-[12px] text-[#111]/40"
              style={{ fontFamily: mono }}
            >
              © <Num>2026</Num> Sawtify · All rights reserved
            </p>
            <div
              className="flex items-center gap-4 text-[12px] text-[#111]/40"
              style={{ fontFamily: mono }}
            >
              <span>{t.footPay}</span>
              <span>·</span>
              <span>SATIM · Edahabia · CIB</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Back to top */}
      <AnimatePresence>
        {scrolled && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.3 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label={t.back}
            className="fixed bottom-6 end-6 z-40 w-10 h-10 rounded-full bg-[#111] text-[#FAFAF7] flex items-center justify-center hover:bg-[#6366F1] transition-colors sw-focus"
          >
            <ArrowUp className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LandingPage;
