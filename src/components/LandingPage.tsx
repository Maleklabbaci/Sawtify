import React, { useEffect, useRef, useState, useCallback, useMemo, Suspense } from "react";
import {
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  Play,
  Pause,
  Plus,
  Menu,
  X,
  Check,
  Star,
  Sparkles,
  Command,
  Waves,
  ArrowUpRight,
  Volume2,
} from "lucide-react";
import { motion, AnimatePresence, useScroll, useTransform, useMotionValue, useSpring } from "motion/react";

interface LandingPageProps {
  onLoginClick: () => void;
  onSigninClick: () => void;
  language: "fr" | "ar";
  setLanguage: (lang: "fr" | "ar") => void;
}

/* =========================================================
   GLOBAL STYLES — Typographies premium & Animations
========================================================= */
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=Instrument+Serif:ital@0;1&family=Space+Grotesk:wght@300..700&family=JetBrains+Mono:wght@400;500&family=Cairo:wght@200..900&family=Vazirmatn:wght@100..900&display=swap');

    * { -webkit-tap-highlight-color: transparent; }
    html {
      scroll-behavior: smooth;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
    }
    body { overflow-x: hidden; background: #FAFAF7; }

    /* Orbe lumineuse flottante */
    @keyframes sw-orb-float {
      0%, 100% { transform: translate(0, 0) scale(1); }
      25% { transform: translate(4%, -5%) scale(1.08); }
      50% { transform: translate(-3%, 4%) scale(0.95); }
      75% { transform: translate(5%, 2%) scale(1.04); }
    }
    .sw-orb-float { animation: sw-orb-float 18s ease-in-out infinite; }

    /* Grille perspective 3D */
    .sw-grid {
      background-image:
        linear-gradient(rgba(99,102,241,0.07) 1px, transparent 1px),
        linear-gradient(90deg, rgba(99,102,241,0.07) 1px, transparent 1px);
      background-size: 60px 60px;
      mask-image: radial-gradient(ellipse at center, black 30%, transparent 75%);
      -webkit-mask-image: radial-gradient(ellipse at center, black 30%, transparent 75%);
    }

    /* Shimmer text animé pour titre AI */
    @keyframes sw-shimmer {
      0% { background-position: 0% 50%; }
      100% { background-position: 200% 50%; }
    }
    .sw-shimmer-text {
      background: linear-gradient(110deg, #6366F1 0%, #C4B5FD 25%, #6366F1 50%, #C4B5FD 75%, #6366F1 100%);
      background-size: 200% auto;
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      animation: sw-shimmer 6s linear infinite;
    }

    /* Texte gradient statique (couleur luxe) */
    .sw-lux-gradient {
      background: linear-gradient(135deg, #6366F1 0%, #4338CA 100%);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }

    /* Pulse live */
    @keyframes sw-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(1.3); }
    }
    .sw-pulse-dot::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: currentColor;
      animation: sw-pulse 2s ease-in-out infinite;
      opacity: 0.5;
    }

    /* Waveform idle (respiration) */
    @keyframes sw-wave-idle {
      0%, 100% { transform: scaleY(0.4); }
      50% { transform: scaleY(1); }
    }
    .sw-wave-idle { animation: sw-wave-idle 1.6s ease-in-out infinite; transform-origin: bottom; }

    /* Soulignement nav animé */
    .sw-nav-link { position: relative; }
    .sw-nav-link::after {
      content: "";
      position: absolute;
      left: 0; right: 0; bottom: -4px;
      height: 1px;
      background: currentColor;
      transform: scaleX(0);
      transform-origin: right;
      transition: transform 0.4s cubic-bezier(0.22,1,0.36,1);
    }
    [dir="rtl"] .sw-nav-link::after { transform-origin: left; }
    .sw-nav-link:hover::after { transform: scaleX(1); transform-origin: left; }
    [dir="rtl"] .sw-nav-link:hover::after { transform-origin: right; }

    /* Lift tactile */
    .sw-lift { transition: transform 0.5s cubic-bezier(0.22,1,0.36,1); }
    .sw-lift:hover { transform: translateY(-6px); }
    .sw-lift:active { transform: translateY(-2px); }

    /* Border gradient animé */
    .sw-border-grad {
      position: relative;
    }
    .sw-border-grad::before {
      content: "";
      position: absolute;
      inset: 0;
      padding: 1px;
      border-radius: inherit;
      background: linear-gradient(135deg, rgba(99,102,241,0.5), rgba(196,181,253,0.2), rgba(99,102,241,0.5));
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      pointer-events: none;
    }

    /* Marquee infini */
    @keyframes sw-marquee {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    [dir="rtl"] .sw-marquee { animation-name: sw-marquee-rtl; }
    @keyframes sw-marquee-rtl {
      0% { transform: translateX(0); }
      100% { transform: translateX(50%); }
    }
    .sw-marquee-track {
      animation: sw-marquee 40s linear infinite;
      display: flex;
      width: max-content;
    }
    [dir="rtl"] .sw-marquee-track {
      animation-name: sw-marquee-rtl;
    }
    .sw-marquee-track:hover { animation-play-state: paused; }

    /* Cursor personnalisé */
    .sw-cursor-dot {
      position: fixed;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #6366F1;
      pointer-events: none;
      z-index: 9999;
      mix-blend-mode: difference;
      transition: transform 0.15s ease;
    }
    .sw-cursor-ring {
      position: fixed;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 1.5px solid rgba(99,102,241,0.5);
      pointer-events: none;
      z-index: 9998;
      transition: transform 0.3s ease, width 0.3s ease, height 0.3s ease;
    }

    /* Bouton magnétique */
    .sw-magnetic { transition: transform 0.3s cubic-bezier(0.22,1,0.36,1); }

    /* Spotlight au hover (cartes) */
    .sw-spotlight {
      position: relative;
      overflow: hidden;
    }
    .sw-spotlight::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle 200px at var(--mx, 50%) var(--my, 50%),
        rgba(99,102,241,0.08) 0%, transparent 50%);
      opacity: 0;
      transition: opacity 0.4s;
      pointer-events: none;
    }
    .sw-spotlight:hover::before { opacity: 1; }

    /* Texte qui apparaît au hover */
    .sw-text-reveal { overflow: hidden; display: inline-block; }
    .sw-text-reveal > span { display: inline-block; }

    /* Grain texture */
    .sw-grain::after {
      content: "";
      position: absolute;
      inset: 0;
      opacity: 0.04;
      pointer-events: none;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
      mix-blend-mode: multiply;
    }

    /* Curseur texte vertical */
    .sw-vertical-text {
      writing-mode: vertical-rl;
      transform: rotate(180deg);
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
      }
    }

    /* Focus visible */
    .sw-focus:focus-visible {
      outline: 1.5px solid #6366F1;
      outline-offset: 3px;
      border-radius: 6px;
    }

    /* Selection */
    ::selection { background: #6366F1; color: white; }
  `}</style>
);

/* =========================================================
   UTILITAIRES
========================================================= */
const Num = ({ children, className = "", style = {} }: any) => (
  <span dir="ltr" style={{ unicodeBidi: "isolate", ...style }} className={`inline-block ${className}`}>
    {children}
  </span>
);

const Counter = ({ target, suffix = "", duration = 2000, className = "", style = {} }: any) => {
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
      { threshold: 0.3 }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [target, duration]);

  return (
    <Num className={className} style={style}>
      <span ref={ref}>
        {count.toLocaleString("en-US")}{suffix}
      </span>
    </Num>
  );
};

/* Cursor personnalisé */
const Cursor = () => {
  const dotX = useMotionValue(-100);
  const dotY = useMotionValue(-100);
  const ringX = useSpring(dotX, { damping: 30, stiffness: 200 });
  const ringY = useSpring(dotY, { damping: 30, stiffness: 200 });

  useEffect(() => {
    const move = (e: MouseEvent) => {
      dotX.set(e.clientX - 4);
      dotY.set(e.clientY - 4);
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, [dotX, dotY]);

  return (
    <>
      <motion.div
        className="sw-cursor-dot hidden lg:block"
        style={{ x: dotX, y: dotY }}
      />
      <motion.div
        className="sw-cursor-ring hidden lg:block"
        style={{ x: ringX, y: ringY, translateX: "-50%", translateY: "-50%" }}
      />
    </>
  );
};

/* Bouton magnétique */
const Magnetic = ({ children, strength = 0.3, className = "" }: any) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { damping: 20, stiffness: 200 });
  const sy = useSpring(y, { damping: 20, stiffness: 200 });

  const handleMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const cx = e.clientX - rect.left - rect.width / 2;
    const cy = e.clientY - rect.top - rect.height / 2;
    x.set(cx * strength);
    y.set(cy * strength);
  };
  const reset = () => { x.set(0); y.set(0); };

  return (
    <motion.div ref={ref} onMouseMove={handleMove} onMouseLeave={reset} style={{ x: sx, y: sy }} className={className}>
      {children}
    </motion.div>
  );
};

/* Reveal on scroll */
const Reveal = ({ children, delay = 0, y = 24, className = "" }: any) => (
  <motion.div
    initial={{ opacity: 0, y }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-60px" }}
    transition={{ duration: 1.1, delay, ease: [0.16, 1, 0.3, 1] }}
    className={className}
  >
    {children}
  </motion.div>
);

/* Audio visualizer */
function useAudioVisualizer(audioEl: HTMLAudioElement | null, isPlaying: boolean, barCount = 48) {
  const [bars, setBars] = useState<number[]>(() => Array(barCount).fill(0.3));
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>();
  const sourceMap = useRef<WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>>(new WeakMap());

  useEffect(() => {
    if (!isPlaying || !audioEl) {
      setBars(Array(barCount).fill(0.3));
      return;
    }
    let analyser: AnalyserNode | null = null;
    try {
      if (!ctxRef.current) ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = ctxRef.current!;
      if (ctx.state === "suspended") ctx.resume();
      let source = sourceMap.current.get(audioEl);
      if (!source) {
        source = ctx.createMediaElementSource(audioEl);
        sourceMap.current.set(audioEl, source);
      }
      analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.85;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!analyser) return;
        analyser.getByteFrequencyData(data);
        setBars(Array.from(data.slice(0, barCount)).map((v) => Math.max(0.1, v / 255)));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {}
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      try { analyser?.disconnect(); } catch {}
    };
  }, [isPlaying, audioEl, barCount]);

  return bars;
}

function useScrollState() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 30);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return scrolled;
}

const LOGO_URL = "https://i.ibb.co/nqShkPNP/68126702-75e5-4de6-9b53-e51800b05e4a.jpg";

/* =========================================================
   COMPOSANT PRINCIPAL
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
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  const bars = useAudioVisualizer(currentAudioEl, playingId !== null);
  const scrolled = useScrollState();

  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.96]);
  const { scrollYProgress: pageProgress } = useScroll();

  /* Mouse parallax */
  useEffect(() => {
    const move = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 30,
        y: (e.clientY / window.innerHeight - 0.5) * 30,
      });
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
  }, [language, isRTL]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setDemoStep((s) => (s + 1) % 4), 2400);
    return () => clearInterval(id);
  }, []);

  useEffect(() => () => { audioRef.current?.pause(); audioRef.current = null; }, []);

  const ArrowIcon = ({ className = "w-4 h-4" }: any) =>
    isRTL ? <ArrowLeft className={className} /> : <ArrowRight className={className} />;

  /* COPY */
  const t = {
    skip: isRTL ? "تخطي إلى المحتوى" : "Aller au contenu",
    navWork: isRTL ? "الأصوات" : "Voix",
    navHow: isRTL ? "الطريقة" : "Process",
    navPricing: isRTL ? "الأسعار" : "Tarifs",
    navFaq: "FAQ",
    signin: isRTL ? "دخول" : "Connexion",
    start: isRTL ? "ابدأ الآن" : "Commencer",

    liveBadge: isRTL ? "النموذج v2.1 مباشر" : "Modèle v2.1 · En ligne",
    heroKicker: isRTL ? "استوديو صوتي · ذكاء اصطناعي" : "Studio vocal · Intelligence artificielle",
    heroTitle1: isRTL ? "الصوت الذي" : "La voix que",
    heroTitle2: isRTL ? "يستحقه نصك." : "ton texte mérite.",
    heroSub: isRTL
      ? "نموذج ذكاء اصطناعي مدرّب على الدارجة الجزائرية. توليد صوتي طبيعي في أقل من 30 ثانية."
      : "Une IA entraînée sur la darija algérienne. Voix naturelle générée en moins de 30 secondes.",
    tryFree: isRTL ? "تجربة مجانية" : "Essayer gratuitement",
    listenDemo: isRTL ? "استمع للعرض" : "Écouter la démo",

    processKicker: isRTL ? "الطريقة" : "Process",
    processTitle: isRTL ? "من نص إلى صوت." : "D'un texte à une voix.",
    step1t: isRTL ? "اكتب" : "Écris",
    step1d: isRTL ? "الصق نصك، أو ولّده بالذكاء الاصطناعي." : "Colle ton texte, ou génère-le via IA.",
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
    { id: "amin", name: isRTL ? "أمين" : "Amin", tag: isRTL ? "تجاري" : "Commercial", duration: "0:24", lang: "DZ · M", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
    { id: "yasmine", name: isRTL ? "ياسمين" : "Yasmine", tag: isRTL ? "إعلاني" : "Publicitaire", duration: "0:18", lang: "DZ · F", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
    { id: "khalid", name: isRTL ? "خالد" : "Khalid", tag: isRTL ? "وثائقي" : "Documentaire", duration: "0:31", lang: "DZ · M", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
    { id: "layla", name: isRTL ? "ليلى" : "Layla", tag: isRTL ? "سوشيال" : "Social", duration: "0:22", lang: "DZ · F", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
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
    const id = setInterval(() => setActiveTesti((p) => (p + 1) % testimonials.length), 7500);
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

  /* HANDLERS */
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
    const top = el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: "smooth" });
  }, []);

  const [footerToast, setFooterToast] = useState<string | null>(null);
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | 'cookies' | null>(null);
  const showFooterToast = (msg: string) => {
    setFooterToast(msg);
    setTimeout(() => setFooterToast(null), 2800);
  };
  const LEGAL_CONTENT: Record<'terms' | 'privacy' | 'cookies', { fr: [string, string]; ar: [string, string] }> = {
    terms: {
      fr: ["Conditions d'utilisation", "En utilisant Sawtify, tu acceptes que le service soit fourni « en l'état ». Les points consommés ne sont pas remboursables. L'usage de voix générées pour créer du contenu trompeur, diffamatoire ou usurpant l'identité d'un tiers est interdit."],
      ar: ["شروط الاستخدام", "باستخدامك لـ Sawtify، فإنك توافق على أن الخدمة تُقدَّم \"كما هي\". النقاط المستهلكة غير قابلة للاسترجاع. يُمنع استخدام الأصوات المولّدة لإنشاء محتوى مضلل أو تشهيري أو انتحال هوية شخص دون موافقته."],
    },
    privacy: {
      fr: ["Politique de confidentialité", "Nous collectons ton e-mail, ton solde de points et l'historique de tes générations pour faire fonctionner le service. Ces données ne sont jamais revendues à des tiers. Tu peux demander la suppression de ton compte à tout moment."],
      ar: ["سياسة الخصوصية", "نجمع بريدك الإلكتروني، رصيد نقاطك، وسجل توليداتك لتشغيل الخدمة. لا تُباع هذه البيانات أبداً لأطراف ثالثة. يمكنك طلب حذف حسابك وبياناتك في أي وقت."],
    },
    cookies: {
      fr: ["Cookies", "Sawtify utilise uniquement des cookies techniques indispensables (session, préférence de langue). Aucun cookie publicitaire ou de tracking tiers."],
      ar: ["ملفات تعريف الارتباط", "يستخدم Sawtify فقط ملفات تعريف الارتباط التقنية الضرورية (جلسة الاتصال، تفضيل اللغة). لا يتم استخدام أي كوكيز إعلانية أو تتبع."],
    },
  };

  /* Typographies distinctives */
  const serif = isRTL ? "'Vazirmatn', serif" : "'Fraunces', serif";
  const display = isRTL ? "'Vazirmatn', sans-serif" : "'Instrument Serif', serif";
  const sans = isRTL ? "'Vazirmatn', sans-serif" : "'Space Grotesk', sans-serif";
  const mono = "'JetBrains Mono', monospace";

  /* Spotlights pour cartes */
  const handleSpotlight = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  /* =======================================================
     RENDER
  ======================================================= */
  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="min-h-screen bg-[#FAFAF7] text-[#111111]"
      style={{ fontFamily: sans }}
    >
      <GlobalStyles />
      <Cursor />

      {/* Progress bar */}
      <motion.div
        aria-hidden="true"
        className="fixed top-0 inset-x-0 h-[2px] bg-gradient-to-r from-[#6366F1] via-[#A78BFA] to-[#6366F1] origin-left z-[60]"
        style={{ scaleX: pageProgress }}
      />

      <a href="#home" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:start-4 focus:z-[100] focus:bg-[#111] focus:text-white focus:px-4 focus:py-2 focus:rounded text-xs">
        {t.skip}
      </a>

      {/* =====================================================
          HEADER
      ===================================================== */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-700 ${
          scrolled
            ? "bg-[#FAFAF7]/75 backdrop-blur-2xl border-b border-black/[0.06]"
            : "bg-transparent"
        }`}
      >
        <div className="relative mx-auto max-w-[1320px] px-6 h-16 flex items-center justify-between">
          <a href="#home" onClick={(e) => { e.preventDefault(); smoothTo("#home"); }} className="relative z-10 flex items-center gap-2 sw-focus" aria-label="Sawtify">
            <motion.div
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="w-7 h-7 rounded-full overflow-hidden bg-black shrink-0"
            >
              <img src={LOGO_URL} alt="" className="w-full h-full object-cover" />
            </motion.div>
            <span className="font-semibold text-[15px] tracking-[-0.02em]">Sawtify</span>
            <span className="hidden sm:inline text-[10px] text-[#6366F1] border border-[#6366F1]/25 rounded px-1.5 py-px ms-1" style={{ fontFamily: mono }}>
              v2.1
            </span>
          </a>

          <nav className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-9 text-[13px] text-[#111]/60" aria-label="Principale">
            {nav.map((l) => (
              <a key={l.href} href={l.href} onClick={(e) => { e.preventDefault(); smoothTo(l.href); }} className="hover:text-[#111] transition-colors duration-200 sw-focus sw-nav-link">
                {l.label}
              </a>
            ))}
          </nav>

          <div className="relative z-10 flex items-center gap-2">
            <button
              onClick={() => setLanguage(language === "fr" ? "ar" : "fr")}
              aria-label={t.switchLang}
              className="hidden sm:inline-flex w-8 h-8 items-center justify-center text-[11px] font-medium text-[#111]/60 hover:text-[#111] transition-colors sw-focus rounded"
              style={{ fontFamily: mono }}
            >
              {language === "fr" ? "AR" : "FR"}
            </button>
            <button onClick={onLoginClick} className="hidden md:inline-flex px-3 h-8 text-[13px] font-medium text-[#111]/70 hover:text-[#111] transition-colors sw-focus rounded">
              {t.signin}
            </button>
            <Magnetic strength={0.25}>
              <button onClick={onSigninClick} className="group relative inline-flex items-center gap-2 h-11 px-5 bg-[#111] text-[#FAFAF7] text-[14px] font-medium rounded-full overflow-hidden sw-focus">
                <motion.span
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-r from-[#6366F1] to-[#A78BFA]"
                  initial={{ x: "-100%" }}
                  whileHover={{ x: 0 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                />
                <span className="relative flex items-center gap-2">
                  {t.tryFree}
                  <ArrowIcon className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </span>
              </button>
            </Magnetic>
            <button onClick={() => setMenuOpen(true)} aria-label={t.open} aria-expanded={menuOpen} className="md:hidden w-9 h-9 flex items-center justify-center hover:bg-black/5 rounded sw-focus">
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
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-[55] bg-black/30 backdrop-blur-sm md:hidden"
            />
            <motion.div
              initial={{ x: isRTL ? "-100%" : "100%" }} animate={{ x: 0 }} exit={{ x: isRTL ? "-100%" : "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 280 }}
              className="fixed inset-y-0 end-0 z-[60] w-[88%] max-w-sm bg-[#FAFAF7] md:hidden flex flex-col"
            >
              <div className="flex items-center justify-between px-6 h-16 border-b border-black/[0.06]">
                <span className="font-semibold text-[15px]">Sawtify</span>
                <button onClick={() => setMenuOpen(false)} aria-label={t.close} className="w-9 h-9 flex items-center justify-center rounded hover:bg-black/5 sw-focus">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <nav className="flex-1 px-6 py-8 flex flex-col gap-1">
                {nav.map((l, i) => (
                  <motion.a
                    key={l.href} href={l.href}
                    onClick={(e) => { e.preventDefault(); smoothTo(l.href); }}
                    initial={{ opacity: 0, x: isRTL ? -12 : 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.06 * i + 0.15 }}
                    className="flex items-center justify-between py-4 text-[18px] border-b border-black/[0.05] sw-focus"
                  >
                    {l.label}
                    <ArrowIcon className="w-4 h-4 opacity-30" />
                  </motion.a>
                ))}
              </nav>
              <div className="px-6 pb-8 pt-2 space-y-2">
                <button onClick={() => { setMenuOpen(false); onSigninClick(); }} className="w-full rounded-full bg-[#111] text-[#FAFAF7] py-3.5 text-[14px] font-medium sw-focus">
                  {t.start}
                </button>
                <button onClick={() => { setMenuOpen(false); onLoginClick(); }} className="w-full rounded-full border border-black/10 py-3.5 text-[14px] font-medium sw-focus">
                  {t.signin}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* =====================================================
          HERO — Ultra créatif
      ===================================================== */}
      <section
        id="home"
        ref={heroRef}
        className="relative pt-32 sm:pt-40 pb-20 overflow-hidden sw-grain"
        aria-label="Introduction"
      >
        {/* Grille perspective avec parallax */}
        <motion.div
          aria-hidden="true"
          className="absolute inset-0 sw-grid opacity-80 pointer-events-none"
          style={{
            x: mousePos.x * 0.3,
            y: mousePos.y * 0.3 + (typeof heroY === 'object' ? 0 : 0),
          }}
        />

        {/* Orbes lumineuses */}
        <motion.div
          aria-hidden="true"
          className="absolute sw-glow sw-orb-float w-[600px] h-[600px] bg-[#6366F1]/15"
          style={{ top: "-15%", right: "-10%", filter: "blur(100px)" }}
        />
        <motion.div
          aria-hidden="true"
          className="absolute sw-glow sw-orb-float w-[500px] h-[500px] bg-[#A78BFA]/12"
          style={{ top: "40%", left: "-8%", filter: "blur(120px)", animationDelay: "4s" }}
        />
        <motion.div
          aria-hidden="true"
          className="absolute sw-glow sw-orb-float w-[400px] h-[400px] bg-[#6366F1]/8"
          style={{ bottom: "-10%", right: "30%", filter: "blur(90px)", animationDelay: "8s" }}
        />

        {/* Texte vertical décoratif */}
        <div className="absolute top-32 end-8 hidden xl:block pointer-events-none">
          <div className="sw-vertical-text text-[10px] tracking-[0.4em] text-[#111]/25 uppercase" style={{ fontFamily: mono }}>
            sawtify · studio · 2026
          </div>
        </div>

        <div className="relative mx-auto max-w-[1320px] px-6">
          <motion.div style={{ y: heroY, opacity: heroOpacity, scale: heroScale }}>
            <Reveal>
              <div className="inline-flex items-center gap-2 mb-8 px-3 py-1.5 rounded-full bg-white/70 backdrop-blur-md border border-black/[0.06] shadow-[0_4px_12px_rgba(0,0,0,0.03)]">
                <span className="relative flex w-1.5 h-1.5">
                  <span className="absolute inset-0 rounded-full bg-emerald-500 sw-pulse" />
                  <span className="relative rounded-full w-1.5 h-1.5 bg-emerald-500" />
                </span>
                <span className="text-[11px] text-[#111]/70 tracking-wide" style={{ fontFamily: mono }}>
                  {t.liveBadge}
                </span>
              </div>
            </Reveal>

            <Reveal delay={0.05}>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#111]/45 mb-6 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#6366F1]" />
                {t.heroKicker}
              </p>
            </Reveal>

            <Reveal delay={0.1} y={32}>
              <h1
                className="text-[clamp(3rem,9vw,7rem)] leading-[0.95] tracking-[-0.04em] text-[#111] max-w-5xl font-normal"
                style={{ fontFamily: display, fontWeight: isRTL ? 700 : 400 }}
              >
                {t.heroTitle1}
                <br />
                <span className="italic sw-shimmer-text">{t.heroTitle2}</span>
              </h1>
            </Reveal>

            <Reveal delay={0.25}>
              <p className="mt-8 text-[16px] sm:text-[18px] leading-[1.55] text-[#111]/60 max-w-lg">
                {t.heroSub}
              </p>
            </Reveal>

            <Reveal delay={0.35}>
              <div className="mt-10 flex flex-wrap items-center gap-3">
                <Magnetic>
                  <button onClick={onSigninClick} className="group relative inline-flex items-center gap-2 h-12 px-6 bg-[#111] text-[#FAFAF7] text-[14px] font-medium rounded-full overflow-hidden sw-focus">
                    <motion.span
                      aria-hidden="true"
                      className="absolute inset-0 bg-gradient-to-r from-[#6366F1] via-[#818CF8] to-[#6366F1]"
                      initial={{ x: "-100%" }}
                      whileHover={{ x: 0 }}
                      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    />
                    <span className="relative flex items-center gap-2">
                      {t.tryFree}
                      <ArrowIcon className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </span>
                  </button>
                </Magnetic>

                <button onClick={() => smoothTo("#voices")} className="group inline-flex items-center gap-3 h-12 px-4 text-[14px] font-medium text-[#111] rounded-full hover:bg-black/5 transition-colors sw-focus">
                  <span className="relative w-7 h-7 rounded-full bg-[#111] text-[#FAFAF7] flex items-center justify-center group-hover:bg-[#6366F1] transition-colors">
                    <Play className="w-2.5 h-2.5 ms-0.5 fill-current" />
                  </span>
                  {t.listenDemo}
                </button>
              </div>
            </Reveal>
          </motion.div>

          {/* Terminal + Waveform avec parallax souris */}
          <Reveal delay={0.5}>
            <motion.div
              className="mt-20 sm:mt-28 grid lg:grid-cols-12 gap-6 items-start"
              style={{
                rotateX: mousePos.y * -0.2,
                rotateY: mousePos.x * -0.2,
                transformPerspective: 1200,
              }}
            >
              {/* Terminal card */}
              <div className="lg:col-span-5 sw-border-grad rounded-2xl overflow-hidden bg-white shadow-[0_20px_60px_-15px_rgba(99,102,241,0.15)]">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-black/[0.06] bg-[#FAFAF7]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-black/15" />
                    <span className="w-2 h-2 rounded-full bg-black/15" />
                    <span className="w-2 h-2 rounded-full bg-black/15" />
                  </div>
                  <span className="text-[10px] text-[#111]/40" style={{ fontFamily: mono }}>
                    sawtify.dz
                  </span>
                </div>
                <div className="p-5 space-y-2 min-h-[180px]" style={{ fontFamily: mono }}>
                  {demoLines.map((line, i) => (
                    <motion.div
                      key={line.label}
                      animate={{ opacity: i <= demoStep ? 1 : 0.25 }}
                      transition={{ duration: 0.4 }}
                      className="flex items-baseline gap-3 text-[12px]"
                    >
                      <span className="text-[#6366F1] w-14 shrink-0">{line.label}</span>
                      <span className="text-[#111]/85 truncate">{i <= demoStep ? line.text : "—"}</span>
                      {i === demoStep && (
                        <motion.span
                          animate={{ opacity: [1, 0, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                          className="text-[#6366F1]"
                        >
                          ▊
                        </motion.span>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Waveform avec effet audio */}
              <div className="lg:col-span-7 relative">
                <div className="flex items-end gap-[3px] h-20" dir="ltr" aria-hidden="true">
                  {Array.from({ length: 90 }).map((_, i) => {
                    const seed = Math.sin(i * 0.6) * Math.cos(i * 0.3);
                    const h = 12 + Math.abs(seed) * 55;
                    return (
                      <motion.span
                        key={i}
                        initial={{ scaleY: 0, opacity: 0 }}
                        whileInView={{ scaleY: 1, opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.5 + i * 0.01, ease: [0.16, 1, 0.3, 1] }}
                        className="flex-1 origin-bottom sw-wave-idle"
                        style={{
                          height: `${h}%`,
                          maxWidth: 3,
                          animationDelay: `${(i % 12) * 0.15}s`,
                          background: i % 7 === 0 ? "#6366F1" : i % 5 === 0 ? "#A78BFA" : "#111",
                        }}
                      />
                    );
                  })}
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px] text-[#111]/40" style={{ fontFamily: mono }}>
                  <span>00:00</span>
                  <span>24 kHz · stereo · 320 kbps</span>
                  <span>00:24</span>
                </div>
              </div>
            </motion.div>
          </Reveal>
        </div>
      </section>

      {/* =====================================================
          MARQUEE — Bandeau de confiance infini
      ===================================================== */}
      <section className="py-12 border-y border-[#111]/8 bg-[#FAFAF7] overflow-hidden">
        <div className="relative">
          <div className="absolute inset-y-0 start-0 w-32 bg-gradient-to-r from-[#FAFAF7] to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-y-0 end-0 w-32 bg-gradient-to-l from-[#FAFAF7] to-transparent z-10 pointer-events-none" />
          <div className="sw-marquee-track">
            {[...Array(2)].map((_, dup) => (
              <div key={dup} className="flex items-center gap-12 px-6 shrink-0">
                {[
                  "Trusted by 1 200+ creators",
                  "★ 4.9 / 5",
                  "Edahabia · CIB · SATIM",
                  "24 kHz · MP3 / WAV",
                  "Made in Algeria",
                  "API publique · v2.1",
                  "30s average generation",
                ].map((item, i) => (
                  <span key={i} className="flex items-center gap-12 text-[13px] text-[#111]/40 whitespace-nowrap">
                    <span style={{ fontFamily: mono }}>{item}</span>
                    <span className="w-1 h-1 rounded-full bg-[#111]/25" />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================
          PROCESS
      ===================================================== */}
      <section id="process" className="py-24 sm:py-36 relative">
        <div className="mx-auto max-w-[1320px] px-6">
          <div className="grid lg:grid-cols-12 gap-12 mb-20">
            <Reveal className="lg:col-span-5">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#111]/45 mb-5" style={{ fontFamily: mono }}>
                <span className="text-[#6366F1]">/</span> {t.processKicker}
              </p>
              <h2 className="text-[clamp(2.25rem,5vw,4rem)] leading-[1.02] tracking-[-0.03em] text-[#111]" style={{ fontFamily: display, fontWeight: isRTL ? 700 : 400 }}>
                {t.processTitle.split('.')[0]}.<br />
                <span className="italic sw-shimmer-text">{t.processTitle.split('.')[1]}.</span>
              </h2>
            </Reveal>
            <Reveal delay={0.1} className="lg:col-span-5 lg:col-start-8 lg:mt-4">
              <p className="text-[15px] leading-[1.65] text-[#111]/55 max-w-md">
                {isRTL
                  ? "بدون استوديو. بدون ممثل. بدون انتظار. فقط ثلاث خطوات، ثلاثون ثانية، وصوت جاهز."
                  : "Pas de studio, pas de comédien, pas d'attente. Trois étapes, trente secondes, une voix prête."}
              </p>
            </Reveal>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.1}>
                <motion.div
                  whileHover={{ y: -8 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="sw-spotlight sw-border-grad relative bg-white rounded-2xl p-8 h-full"
                  onMouseMove={handleSpotlight}
                >
                  <div className="flex items-center justify-between mb-12">
                    <span className="text-[11px] text-[#111]/40" style={{ fontFamily: mono }}>
                      <Num>{s.n}</Num>
                    </span>
                    <div className="w-10 h-10 rounded-full border border-[#111]/10 flex items-center justify-center">
                      <s.icon className="w-4 h-4 text-[#6366F1]" />
                    </div>
                  </div>
                  <h3 className="text-[28px] leading-tight tracking-[-0.02em] text-[#111] mb-3" style={{ fontFamily: display, fontWeight: isRTL ? 700 : 400 }}>
                    {s.t}
                  </h3>
                  <p className="text-[14px] leading-[1.6] text-[#111]/55">{s.d}</p>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================
          VOICES
      ===================================================== */}
      <section id="voices" className="py-24 sm:py-36 relative bg-[#FAFAF7]">
        <div className="mx-auto max-w-[1320px] px-6">
          <div className="grid lg:grid-cols-12 gap-8 mb-16 items-end">
            <Reveal className="lg:col-span-7">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#111]/45 mb-5" style={{ fontFamily: mono }}>
                <span className="text-[#6366F1]">/</span> {t.voicesKicker}
              </p>
              <h2 className="text-[clamp(2.25rem,5vw,4rem)] leading-[1.02] tracking-[-0.03em]" style={{ fontFamily: display, fontWeight: isRTL ? 700 : 400 }}>
                {t.voicesTitle}
              </h2>
            </Reveal>
            <Reveal delay={0.1} className="lg:col-span-4 lg:col-start-9">
              <p className="text-[14px] leading-[1.65] text-[#111]/55">{t.voicesSub}</p>
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
                  transition={{ duration: 0.7, delay: idx * 0.05, ease: [0.16, 1, 0.3, 1] }}
                  className={`border-b border-[#111]/12 sw-spotlight transition-colors duration-500 ${active ? "bg-white" : ""}`}
                  onMouseMove={handleSpotlight}
                >
                  <button
                    onClick={() => toggleVoice(v.id, v.url)}
                    aria-label={`${active ? "Pause" : "Play"} ${v.name}`}
                    aria-pressed={active}
                    className="w-full flex items-center gap-4 sm:gap-6 py-6 sm:py-7 px-2 text-start sw-focus relative z-10"
                  >
                    <div className={`w-11 h-11 shrink-0 rounded-full border flex items-center justify-center transition-all duration-500 ${active ? "bg-[#6366F1] border-[#6366F1] text-white scale-110 shadow-[0_0_0_6px_rgba(99,102,241,0.15)]" : "border-[#111]/20 group-hover:border-[#111]"}`}>
                      {active ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 ms-0.5 fill-current" />}
                    </div>

                    <div className="w-24 sm:w-40 shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="text-[19px] sm:text-[22px] text-[#111] tracking-[-0.02em]" style={{ fontFamily: display, fontWeight: isRTL ? 700 : 400 }}>
                          {v.name}
                        </div>
                        <span className="hidden sm:inline text-[9px] text-[#111]/40 border border-[#111]/15 rounded px-1.5 py-px" style={{ fontFamily: mono }}>
                          {v.lang}
                        </span>
                      </div>
                      <div className="text-[12px] text-[#111]/45 mt-0.5">{v.tag}</div>
                    </div>

                    <div className="flex-1 flex items-center gap-[2px] h-12 min-w-0" aria-hidden="true" dir="ltr">
                      {bars.map((h, i) => (
                        <span
                          key={i}
                          className="flex-1 rounded-full transition-all duration-100"
                          style={{
                            height: `${active ? Math.max(8, h * 100) : 18}%`,
                            maxWidth: 3,
                            background: active ? (i % 5 === 0 ? "#6366F1" : "#111") : "rgba(17,17,17,0.12)",
                          }}
                        />
                      ))}
                    </div>

                    <Num className="text-[11px] text-[#111]/40 shrink-0 hidden sm:inline" style={{ fontFamily: mono }}>
                      {v.duration}
                    </Num>
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================
          METRICS — Dark luxe avec halo
      ===================================================== */}
      <section className="relative bg-[#0A0A0B] text-[#FAFAF7] py-24 sm:py-36 overflow-hidden">
        <div className="absolute inset-0 sw-grid opacity-30 pointer-events-none" style={{ filter: "invert(1)" }} />
        <motion.div
          aria-hidden="true"
          className="absolute sw-orb-float w-[700px] h-[700px] bg-[#6366F1]/15"
          style={{ top: "-20%", right: "-15%", filter: "blur(100px)" }}
        />
        <motion.div
          aria-hidden="true"
          className="absolute sw-orb-float w-[500px] h-[500px] bg-[#A78BFA]/10"
          style={{ bottom: "-10%", left: "-10%", filter: "blur(120px)", animationDelay: "5s" }}
        />

        <div className="relative mx-auto max-w-[1320px] px-6">
          <div className="grid lg:grid-cols-12 gap-12 mb-16">
            <Reveal className="lg:col-span-7">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/40 mb-5" style={{ fontFamily: mono }}>
                <span className="text-[#A78BFA]">/</span> {t.metricsKicker}
              </p>
              <h2 className="text-[clamp(2.25rem,5vw,4rem)] leading-[1.02] tracking-[-0.03em] text-white" style={{ fontFamily: display, fontWeight: isRTL ? 700 : 400 }}>
                {t.metricsTitle.split('.')[0]}.<br />
                <span className="italic sw-shimmer-text">{t.metricsTitle.split('.')[1]}.</span>
              </h2>
            </Reveal>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-12 gap-x-6">
            {metrics.map((m, i) => (
              <Reveal key={m.l} delay={i * 0.08}>
                <div className="border-t border-white/15 pt-6 relative">
                  <div className="absolute -top-px start-0 w-8 h-px bg-[#6366F1]" />
                  <Counter
                    target={m.n}
                    suffix={m.s}
                    className="text-[clamp(2.75rem,6vw,4.5rem)] leading-none tracking-[-0.04em] text-white"
                    style={{ fontFamily: display, fontWeight: isRTL ? 700 : 300 }}
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
        <div className="mx-auto max-w-[1320px] px-6">
          <div className="grid lg:grid-cols-12 gap-8 mb-16">
            <Reveal className="lg:col-span-7">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#111]/45 mb-5" style={{ fontFamily: mono }}>
                <span className="text-[#6366F1]">/</span> {t.testKicker}
              </p>
              <h2 className="text-[clamp(2.25rem,5vw,4rem)] leading-[1.02] tracking-[-0.03em]" style={{ fontFamily: display, fontWeight: isRTL ? 700 : 400 }}>
                {t.testTitle}
              </h2>
            </Reveal>
          </div>

          <div className="grid lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 relative min-h-[240px]">
              <AnimatePresence mode="wait">
                <motion.figure
                  key={activeTesti}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="flex gap-1 mb-6">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 text-[#6366F1] fill-[#6366F1]" />
                    ))}
                  </div>
                  <blockquote className="text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.25] tracking-[-0.02em] text-[#111]" style={{ fontFamily: display, fontWeight: isRTL ? 700 : 400 }}>
                    <span className="text-[#6366F1]">"</span>
                    {testimonials[activeTesti].q}
                    <span className="text-[#6366F1]">"</span>
                  </blockquote>
                  <figcaption className="mt-8 flex items-center gap-3">
                    <div className="w-px h-12 bg-gradient-to-b from-[#6366F1] to-transparent" />
                    <div>
                      <div className="text-[14px] font-medium">{testimonials[activeTesti].n}</div>
                      <div className="text-[12px] text-[#111]/50 mt-0.5">{testimonials[activeTesti].r}</div>
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
                    onClick={() => setActiveTesti(i)}
                    aria-label={`Témoignage ${i + 1}`}
                    className="p-1 sw-focus"
                  >
                    <span className={`block transition-all duration-500 ${activeTesti === i ? "w-8 h-px bg-[#6366F1]" : "w-4 h-px bg-[#111]/25 hover:bg-[#111]/50"}`} />
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 ms-auto lg:ms-0">
                <button onClick={() => setActiveTesti((p) => (p - 1 + testimonials.length) % testimonials.length)} aria-label={t.prev} className="w-10 h-10 rounded-full border border-[#111]/15 flex items-center justify-center hover:border-[#6366F1] hover:text-[#6366F1] transition-colors sw-focus">
                  {isRTL ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => setActiveTesti((p) => (p + 1) % testimonials.length)} aria-label={t.next} className="w-10 h-10 rounded-full border border-[#111]/15 flex items-center justify-center hover:border-[#6366F1] hover:text-[#6366F1] transition-colors sw-focus">
                  {isRTL ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          PRICING
      ===================================================== */}
      <section id="pricing" className="py-24 sm:py-36 relative">
        <div className="mx-auto max-w-[1320px] px-6">
          <div className="grid lg:grid-cols-12 gap-12 mb-16">
            <Reveal className="lg:col-span-7">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#111]/45 mb-5" style={{ fontFamily: mono }}>
                <span className="text-[#6366F1]">/</span> {t.pricingKicker}
              </p>
              <h2 className="text-[clamp(2.25rem,5vw,4rem)] leading-[1.02] tracking-[-0.03em]" style={{ fontFamily: display, fontWeight: isRTL ? 700 : 400 }}>
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
                <motion.div
                  whileHover={{ y: -8 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className={`relative p-8 border-r border-b border-[#111]/12 h-full flex flex-col sw-spotlight ${p.featured ? "bg-[#0A0A0B] text-[#FAFAF7]" : "hover:bg-black/[0.02]"}`}
                  onMouseMove={handleSpotlight}
                >
                  {p.featured && (
                    <>
                      <div aria-hidden="true" className="absolute inset-0 sw-grid opacity-30 pointer-events-none" style={{ filter: "invert(1)" }} />
                      <span className="absolute top-4 end-4 z-10 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.15em] text-[#A78BFA] bg-white/5 border border-white/10 rounded-full px-2 py-1" style={{ fontFamily: mono }}>
                        {isRTL ? "شائع" : "popular"}
                      </span>
                    </>
                  )}

                  <div className="relative">
                    <Num className={`text-[48px] leading-none tracking-[-0.03em] block mb-2 ${p.featured ? "text-white" : "text-[#111]"}`} style={{ fontFamily: display, fontWeight: isRTL ? 700 : 400 }}>
                      {p.pts}
                    </Num>
                    <div className={`text-[13px] mb-8 ${p.featured ? "text-white/60" : "text-[#111]/50"}`}>
                      {isRTL ? "نقطة" : "points"}
                    </div>
                  </div>

                  <p className={`relative text-[13px] leading-relaxed mb-8 ${p.featured ? "text-white/70" : "text-[#111]/55"}`}>
                    {p.desc}
                  </p>

                  <div className={`relative h-px mb-6 ${p.featured ? "bg-white/15" : "bg-[#111]/10"}`} />

                  <ul className="relative space-y-2 mb-10 list-none">
                    {features.map((f) => (
                      <li key={f} className={`flex items-center gap-2 text-[12px] ${p.featured ? "text-white/70" : "text-[#111]/55"}`}>
                        <Check className={`w-3 h-3 shrink-0 ${p.featured ? "text-[#A78BFA]" : "text-[#6366F1]"}`} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <div className="relative mt-auto">
                    <div className="flex items-baseline gap-1.5 mb-6">
                      <Num className={`text-[30px] tracking-[-0.02em] ${p.featured ? "text-white" : "text-[#111]"}`} style={{ fontFamily: display, fontWeight: isRTL ? 700 : 400 }}>
                        {p.price}
                      </Num>
                      <span className={`text-[12px] ${p.featured ? "text-white/50" : "text-[#111]/45"}`} style={{ fontFamily: mono }}>
                        DZD
                      </span>
                    </div>

                    <Magnetic>
                      <button onClick={onSigninClick} className={`w-full h-11 rounded-full text-[13px] font-medium transition-all duration-500 sw-focus ${p.featured ? "bg-white text-[#111] hover:bg-[#A78BFA] hover:text-white" : "border border-[#111]/15 hover:border-[#6366F1] hover:bg-[#6366F1] hover:text-white"}`}>
                        {isRTL ? "اختيار" : "Choisir"}
                      </button>
                    </Magnetic>
                  </div>
                </motion.div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.3}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-[#111]/45" style={{ fontFamily: mono }}>
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
        <div className="mx-auto max-w-[1320px] px-6">
          <div className="grid lg:grid-cols-12 gap-12">
            <Reveal className="lg:col-span-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#111]/45 mb-5" style={{ fontFamily: mono }}>
                <span className="text-[#6366F1]">/</span> {t.faqKicker}
              </p>
              <h2 className="text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.02] tracking-[-0.03em]" style={{ fontFamily: display, fontWeight: isRTL ? 700 : 400 }}>
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
                        <button onClick={() => setOpenFaq(open ? null : i)} aria-expanded={open} className="w-full py-6 flex items-start gap-6 text-start sw-focus group">
                          <span className="flex-1 text-[16px] sm:text-[17px] leading-snug pt-0.5 group-hover:text-[#6366F1] transition-colors duration-300">{f.q}</span>
                          <span className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors duration-300 ${open ? "border-[#6366F1] bg-[#6366F1] text-white rotate-45" : "border-[#111]/25"}`}>
                            <Plus className="w-3 h-3" />
                          </span>
                        </button>
                        <AnimatePresence initial={false}>
                          {open && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ height: { duration: 0.4 }, opacity: { duration: 0.25 } }}
                              className="overflow-hidden"
                            >
                              <p className="pb-6 pe-12 text-[14px] leading-[1.7] text-[#111]/60 max-w-xl">{f.a}</p>
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
          CTA
      ===================================================== */}
      <section className="py-32 sm:py-48 relative overflow-hidden">
        <div aria-hidden="true" className="absolute sw-orb-float w-[600px] h-[600px] bg-[#6366F1]/10" style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)", filter: "blur(120px)" }} />
        <div className="relative mx-auto max-w-[900px] px-6 text-center">
          <Reveal>
            <h2 className="text-[clamp(2.75rem,7vw,5.5rem)] leading-[0.98] tracking-[-0.04em]" style={{ fontFamily: display, fontWeight: isRTL ? 700 : 400 }}>
              {t.ctaTitle.split('.').map((part, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <br />}
                  {i === 1 ? <span className="italic sw-shimmer-text">{part}.</span> : part + (i === 0 ? '.' : '')}
                </React.Fragment>
              ))}
            </h2>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="mt-6 text-[15px] text-[#111]/55">{t.ctaSub}</p>
          </Reveal>
          <Reveal delay={0.25}>
            <Magnetic strength={0.35}>
              <button onClick={onSigninClick} className="group relative mt-10 inline-flex items-center gap-2 h-12 px-7 bg-[#111] text-[#FAFAF7] text-[14px] font-medium rounded-full overflow-hidden sw-focus">
                <motion.span aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[#6366F1] via-[#818CF8] to-[#A78BFA]" initial={{ x: "-100%" }} whileHover={{ x: 0 }} transition={{ duration: 0.6 }} />
                <span className="relative flex items-center gap-2">
                  {t.start}
                  <ArrowIcon className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </button>
            </Magnetic>
          </Reveal>
        </div>
      </section>

      {/* =====================================================
          FOOTER
      ===================================================== */}
      <footer className="border-t border-[#111]/10">
        <div className="mx-auto max-w-[1320px] px-6 py-14">
          <div className="grid md:grid-cols-12 gap-10 mb-16">
            <div className="md:col-span-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-full overflow-hidden bg-black">
                  <img src={LOGO_URL} alt="" loading="lazy" className="w-full h-full object-cover" />
                </div>
                <span className="text-[15px] font-semibold tracking-[-0.02em]">Sawtify</span>
                <span className="text-[10px] text-[#6366F1] border border-[#6366F1]/25 rounded px-1.5 py-px" style={{ fontFamily: mono }}>
                  v2.1
                </span>
              </div>
              <p className="text-[13px] text-[#111]/55 max-w-xs leading-relaxed mb-6">{t.footTag}</p>
              <div className="inline-flex items-center gap-2 text-[11px] text-[#111]/45" style={{ fontFamily: mono }}>
                <span className="relative flex w-1.5 h-1.5">
                  <span className="absolute inset-0 rounded-full bg-emerald-500 sw-pulse" />
                  <span className="relative rounded-full w-1.5 h-1.5 bg-emerald-500" />
                </span>
                All systems operational
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="text-[11px] uppercase tracking-[0.15em] text-[#111]/35 mb-4" style={{ fontFamily: mono }}>{isRTL ? "المنتج" : "Produit"}</div>
              <ul className="space-y-2.5 list-none text-[13px]">
                <li><a href="#voices" onClick={(e) => { e.preventDefault(); smoothTo("#voices"); }} className="text-[#111]/70 hover:text-[#6366F1] transition-colors">{t.navWork}</a></li>
                <li><a href="#pricing" onClick={(e) => { e.preventDefault(); smoothTo("#pricing"); }} className="text-[#111]/70 hover:text-[#6366F1] transition-colors">{t.navPricing}</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); showFooterToast(isRTL ? "API قريباً" : "API bientôt disponible"); }} className="text-[#111]/70 hover:text-[#6366F1] transition-colors cursor-pointer">API</a></li>
              </ul>
            </div>

            <div className="md:col-span-2">
              <div className="text-[11px] uppercase tracking-[0.15em] text-[#111]/35 mb-4" style={{ fontFamily: mono }}>{isRTL ? "الشركة" : "Compagnie"}</div>
              <ul className="space-y-2.5 list-none text-[13px]">
                <li><a href="#process" onClick={(e) => { e.preventDefault(); smoothTo("#process"); }} className="text-[#111]/70 hover:text-[#6366F1] transition-colors cursor-pointer">{isRTL ? "من نحن" : "À propos"}</a></li>
                <li><a href="mailto:contact@sawtify.dz" className="text-[#111]/70 hover:text-[#6366F1] transition-colors">{isRTL ? "اتصل" : "Contact"}</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); showFooterToast(isRTL ? "المدونة قريباً" : "Blog bientôt disponible"); }} className="text-[#111]/70 hover:text-[#6366F1] transition-colors cursor-pointer">{isRTL ? "المدونة" : "Blog"}</a></li>
              </ul>
            </div>

            <div className="md:col-span-3">
              <div className="text-[11px] uppercase tracking-[0.15em] text-[#111]/35 mb-4" style={{ fontFamily: mono }}>{isRTL ? "قانوني" : "Légal"}</div>
              <ul className="space-y-2.5 list-none text-[13px]">
                <li><a href="#" onClick={(e) => { e.preventDefault(); setLegalModal('terms'); }} className="text-[#111]/70 hover:text-[#6366F1] transition-colors cursor-pointer">{isRTL ? "شروط الاستخدام" : "Conditions"}</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); setLegalModal('privacy'); }} className="text-[#111]/70 hover:text-[#6366F1] transition-colors cursor-pointer">{isRTL ? "الخصوصية" : "Confidentialité"}</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); setLegalModal('cookies'); }} className="text-[#111]/70 hover:text-[#6366F1] transition-colors cursor-pointer">Cookies</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-[#111]/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[12px] text-[#111]/40" style={{ fontFamily: mono }}>
              © <Num>2026</Num> Sawtify · All rights reserved
            </p>
            <div className="flex items-center gap-4 text-[12px] text-[#111]/40" style={{ fontFamily: mono }}>
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
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label={t.back}
            className="fixed bottom-6 end-6 z-40 w-11 h-11 rounded-full bg-[#111] text-[#FAFAF7] flex items-center justify-center hover:bg-[#6366F1] transition-colors sw-focus shadow-2xl"
          >
            <ArrowUp className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {footerToast && (
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
            className="fixed bottom-6 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 z-[70] bg-[#111] text-white text-[13px] px-4 py-2.5 rounded-full shadow-2xl"
          >
            {footerToast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal légal */}
      <AnimatePresence>
        {legalModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setLegalModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-md w-full p-7 shadow-2xl"
              dir={isRTL ? "rtl" : "ltr"}
            >
              <h3 className="text-lg font-bold mb-3" style={{ fontFamily: display }}>
                {isRTL ? LEGAL_CONTENT[legalModal].ar[0] : LEGAL_CONTENT[legalModal].fr[0]}
              </h3>
              <p className="text-[13px] leading-relaxed text-[#111]/70 mb-6">
                {isRTL ? LEGAL_CONTENT[legalModal].ar[1] : LEGAL_CONTENT[legalModal].fr[1]}
              </p>
              <button onClick={() => setLegalModal(null)} className="w-full py-2.5 rounded-xl bg-[#111] text-white text-sm font-semibold hover:bg-[#6366F1] transition-colors cursor-pointer">
                {isRTL ? "إغلاق" : "Fermer"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LandingPage;
