import React, { useEffect, useRef, useState, useCallback } from "react";
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
   GLOBAL STYLES
========================================================= */
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=Instrument+Serif:ital@0;1&family=Space+Grotesk:wght@300..700&family=JetBrains+Mono:wght@400;500&family=Tajawal:wght@200;300;400;500;700;900&display=swap');

    * { -webkit-tap-highlight-color: transparent; }
    html {
      scroll-behavior: smooth;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
    }
    body {
      overflow-x: hidden;
      background: #08070F;
      color: #F4F1FF;
    }

    /* ===== Aurora orbs ===== */
    @keyframes sw-aurora-1 {
      0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); }
      33% { transform: translate(15%, -10%) scale(1.15) rotate(120deg); }
      66% { transform: translate(-10%, 15%) scale(0.9) rotate(240deg); }
    }
    @keyframes sw-aurora-2 {
      0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); }
      50% { transform: translate(-20%, 10%) scale(1.2) rotate(180deg); }
    }
    @keyframes sw-aurora-3 {
      0%, 100% { transform: translate(0, 0) scale(1); }
      25% { transform: translate(8%, 12%) scale(1.1); }
      50% { transform: translate(-12%, -8%) scale(0.95); }
      75% { transform: translate(10%, 5%) scale(1.05); }
    }
    .sw-aurora-1 { animation: sw-aurora-1 22s ease-in-out infinite; }
    .sw-aurora-2 { animation: sw-aurora-2 28s ease-in-out infinite; }
    .sw-aurora-3 { animation: sw-aurora-3 18s ease-in-out infinite; }

    /* ===== Grid 3D floor ===== */
    .sw-grid-3d {
      background-image:
        linear-gradient(rgba(168, 85, 247, 0.15) 1px, transparent 1px),
        linear-gradient(90deg, rgba(168, 85, 247, 0.15) 1px, transparent 1px);
      background-size: 50px 50px;
      transform: perspective(800px) rotateX(60deg) translateZ(-100px);
      transform-origin: center top;
      mask-image: linear-gradient(to bottom, transparent 0%, black 30%, black 70%, transparent 100%);
      -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 30%, black 70%, transparent 100%);
    }

    /* ===== Shimmer text ===== */
    @keyframes sw-shimmer {
      0% { background-position: 0% 50%; }
      100% { background-position: 200% 50%; }
    }
    .sw-shimmer {
      background: linear-gradient(110deg, #A78BFA 0%, #C4B5FD 25%, #DDD6FE 50%, #C4B5FD 75%, #A78BFA 100%);
      background-size: 200% auto;
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      animation: sw-shimmer 6s linear infinite;
    }

    /* ===== Glass morphism ===== */
    .sw-glass {
      background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .sw-glass-strong {
      background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%);
      backdrop-filter: blur(30px) saturate(200%);
      -webkit-backdrop-filter: blur(30px) saturate(200%);
      border: 1px solid rgba(255, 255, 255, 0.12);
    }

    /* ===== Glow borders ===== */
    .sw-border-glow {
      position: relative;
    }
    .sw-border-glow::before {
      content: "";
      position: absolute;
      inset: 0;
      padding: 1px;
      border-radius: inherit;
      background: linear-gradient(135deg, rgba(167, 139, 250, 0.5), rgba(99, 102, 241, 0.2), rgba(167, 139, 250, 0.5));
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      pointer-events: none;
    }
    .sw-border-glow-strong {
      position: relative;
    }
    .sw-border-glow-strong::before {
      content: "";
      position: absolute;
      inset: 0;
      padding: 1.5px;
      border-radius: inherit;
      background: linear-gradient(135deg, #A78BFA 0%, transparent 50%, #6366F1 100%);
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      pointer-events: none;
    }

    /* ===== Glow shadows ===== */
    .sw-glow-sm { box-shadow: 0 0 40px -10px rgba(167, 139, 250, 0.4); }
    .sw-glow-md { box-shadow: 0 0 80px -20px rgba(139, 92, 246, 0.5), 0 20px 60px -20px rgba(0,0,0,0.5); }
    .sw-glow-lg { box-shadow: 0 0 120px -20px rgba(139, 92, 246, 0.6), 0 40px 100px -30px rgba(0,0,0,0.7); }
    .sw-glow-text { text-shadow: 0 0 40px rgba(167, 139, 250, 0.5); }

    /* ===== Neon button ===== */
    .sw-btn-neon {
      position: relative;
      background: linear-gradient(135deg, #A78BFA 0%, #6366F1 100%);
      box-shadow:
        0 0 20px rgba(167, 139, 250, 0.4),
        0 10px 40px -10px rgba(139, 92, 246, 0.6),
        inset 0 1px 0 rgba(255, 255, 255, 0.2);
    }
    .sw-btn-neon::before {
      content: "";
      position: absolute;
      inset: -2px;
      border-radius: inherit;
      background: linear-gradient(135deg, #A78BFA, #6366F1, #A78BFA);
      filter: blur(12px);
      opacity: 0.6;
      z-index: -1;
      transition: opacity 0.4s;
    }
    .sw-btn-neon:hover::before { opacity: 1; }

    /* ===== Marquee ===== */
    @keyframes sw-marquee {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    .sw-marquee-track {
      animation: sw-marquee 35s linear infinite;
      display: flex;
      width: max-content;
    }
    .sw-marquee-track:hover { animation-play-state: paused; }

    /* ===== Pulse ===== */
    @keyframes sw-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(1.4); }
    }
    .sw-pulse-ring::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: currentColor;
      animation: sw-pulse 2s ease-in-out infinite;
      opacity: 0.5;
    }

    /* ===== Wave idle ===== */
    @keyframes sw-wave-idle {
      0%, 100% { transform: scaleY(0.3); }
      50% { transform: scaleY(1); }
    }
    .sw-wave-idle { animation: sw-wave-idle 1.4s ease-in-out infinite; transform-origin: bottom; }

    /* ===== Float ===== */
    @keyframes sw-float {
      0%, 100% { transform: translateY(0) rotateZ(0); }
      50% { transform: translateY(-12px) rotateZ(2deg); }
    }
    .sw-float { animation: sw-float 6s ease-in-out infinite; }

    /* ===== Nav link ===== */
    .sw-nav-link { position: relative; }
    .sw-nav-link::after {
      content: "";
      position: absolute;
      left: 0; right: 0; bottom: -6px;
      height: 1px;
      background: linear-gradient(90deg, transparent, #A78BFA, transparent);
      transform: scaleX(0);
      transition: transform 0.4s cubic-bezier(0.22,1,0.36,1);
    }
    .sw-nav-link:hover::after { transform: scaleX(1); }

    /* ===== Spotlight ===== */
    .sw-spotlight {
      position: relative;
      overflow: hidden;
    }
    .sw-spotlight::after {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle 250px at var(--mx, 50%) var(--my, 50%),
        rgba(167, 139, 250, 0.15) 0%, transparent 50%);
      opacity: 0;
      transition: opacity 0.4s;
      pointer-events: none;
    }
    .sw-spotlight:hover::after { opacity: 1; }

    /* ===== Focus ===== */
    .sw-focus:focus-visible {
      outline: 1.5px solid #A78BFA;
      outline-offset: 3px;
      border-radius: 6px;
    }

    /* ===== Selection ===== */
    ::selection { background: #A78BFA; color: #08070F; }

    /* ===== Scrollbar ===== */
    ::-webkit-scrollbar { width: 10px; height: 10px; }
    ::-webkit-scrollbar-track { background: #08070F; }
    ::-webkit-scrollbar-thumb {
      background: linear-gradient(180deg, #6366F1, #A78BFA);
      border-radius: 10px;
    }
    ::-webkit-scrollbar-thumb:hover { background: #A78BFA; }

    /* ===== Reduced motion ===== */
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
      }
    }

    /* ===== Image card 3D ===== */
    .sw-img-card {
      transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.6s;
    }

    /* ===== Holographic gradient ===== */
    .sw-holo {
      background: linear-gradient(135deg,
        rgba(167, 139, 250, 0.1) 0%,
        rgba(99, 102, 241, 0.05) 50%,
        rgba(196, 181, 253, 0.1) 100%);
    }
  `}</style>
);

/* =========================================================
   UTILS
========================================================= */
const Num = ({ children, className = "", style = {} }: any) => (
  <span dir="ltr" style={{ unicodeBidi: "isolate", ...style }} className={`inline-block ${className}`}>
    {children}
  </span>
);

const Counter = ({ target, suffix = "", duration = 2200, className = "", style = {} }: any) => {
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
      <span ref={ref}>{count.toLocaleString("en-US")}{suffix}</span>
    </Num>
  );
};

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

const Reveal = ({ children, delay = 0, y = 32, className = "" }: any) => (
  <motion.div
    initial={{ opacity: 0, y }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-80px" }}
    transition={{ duration: 1.2, delay, ease: [0.16, 1, 0.3, 1] }}
    className={className}
  >
    {children}
  </motion.div>
);

const Tilt = ({ children, intensity = 8, className = "" }: any) => {
  const ref = useRef<HTMLDivElement>(null);
  const rotateX = useSpring(0, { damping: 20, stiffness: 200 });
  const rotateY = useSpring(0, { damping: 20, stiffness: 200 });

  const handleMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    rotateY.set(px * intensity);
    rotateX.set(-py * intensity);
  };
  const reset = () => { rotateX.set(0); rotateY.set(0); };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d", transformPerspective: 1000 }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

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
   Aurora background
========================================================= */
const AuroraBackground = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
    <div className="absolute inset-0 bg-[#08070F]" />
    <div
      className="sw-orb sw-aurora-1"
      style={{
        width: 800, height: 800,
        top: "-15%", left: "-10%",
        background: "radial-gradient(circle, #6366F1 0%, transparent 70%)",
        opacity: 0.35, filter: "blur(60px)", position: "absolute", borderRadius: "50%",
      }}
    />
    <div
      className="sw-orb sw-aurora-2"
      style={{
        width: 700, height: 700,
        top: "30%", right: "-15%",
        background: "radial-gradient(circle, #A78BFA 0%, transparent 70%)",
        opacity: 0.3, filter: "blur(60px)", position: "absolute", borderRadius: "50%",
      }}
    />
    <div
      className="sw-orb sw-aurora-3"
      style={{
        width: 600, height: 600,
        bottom: "-10%", left: "20%",
        background: "radial-gradient(circle, #7C3AED 0%, transparent 70%)",
        opacity: 0.25, filter: "blur(60px)", position: "absolute", borderRadius: "50%",
      }}
    />
  </div>
);

/* =========================================================
   MAIN
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
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTesti, setActiveTesti] = useState(0);
  const [demoStep, setDemoStep] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const scrolled = useScrollState();
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const { scrollYProgress: pageProgress } = useScroll();

  useEffect(() => {
    const move = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 40,
        y: (e.clientY / window.innerHeight - 0.5) * 40,
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
    const id = setInterval(() => setDemoStep((s) => (s + 1) % 4), 2200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => () => { audioRef.current?.pause(); }, []);

  const ArrowIcon = ({ className = "w-4 h-4" }: any) =>
    isRTL ? <ArrowLeft className={className} /> : <ArrowRight className={className} />;

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
    { n: "01", t: t.step1t, d: t.step1d, icon: Command, color: "#A78BFA", img: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&h=600&fit=crop&q=80" },
    { n: "02", t: t.step2t, d: t.step2d, icon: Waves, color: "#818CF8", img: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800&h=600&fit=crop&q=80" },
    { n: "03", t: t.step3t, d: t.step3d, icon: ArrowUpRight, color: "#6366F1", img: "https://images.unsplash.com/photo-1493421419110-74f4e85ba126?w=800&h=600&fit=crop&q=80" },
  ];

  const voices = [
    { id: "amin", name: isRTL ? "أمين" : "Amin", tag: isRTL ? "تجاري" : "Commercial", duration: "0:24", lang: "DZ · M", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&q=80" },
    { id: "yasmine", name: isRTL ? "ياسمين" : "Yasmine", tag: isRTL ? "إعلاني" : "Publicitaire", duration: "0:18", lang: "DZ · F", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&q=80" },
    { id: "khalid", name: isRTL ? "خالد" : "Khalid", tag: isRTL ? "وثائقي" : "Documentaire", duration: "0:31", lang: "DZ · M", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&q=80" },
    { id: "layla", name: isRTL ? "ليلى" : "Layla", tag: isRTL ? "سوشيال" : "Social", duration: "0:22", lang: "DZ · F", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3", img: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&q=80" },
  ];

  const metrics = [
    { n: 12, s: "+", l: isRTL ? "صوت" : "Voix" },
    { n: 1200, s: "+", l: isRTL ? "مبدع" : "Créateurs" },
    { n: 98, s: "%", l: isRTL ? "رضا" : "Satisfaction" },
    { n: 30, s: "s", l: isRTL ? "متوسط الإنتاج" : "Génération moyenne" },
  ];

  const testimonials = isRTL
    ? [
        { q: "Sawtify ولّاني نخرج الريلز في وقت قصير. الجودة قريبة من الاستوديو.", n: "أمين بلعيد", r: "منشئ محتوى، الجزائر", img: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&h=200&fit=crop&q=80" },
        { q: "الدارجة طبيعية، الزبائن ما حسّوش أن الصوت اصطناعي.", n: "ياسمين قادري", r: "وكالة إشهار، وهران", img: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=200&h=200&fit=crop&q=80" },
        { q: "الدفع بالذهبية سهّل عليّ كلش. أحسن أداة لقيتها.", n: "خالد مرزوق", r: "متجر إلكتروني، قسنطينة", img: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&q=80" },
      ]
    : [
        { q: "Sawtify me fait sortir mes reels en un temps record. La qualité frôle celle du studio.", n: "Amine Belaid", r: "Créateur, Alger", img: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&h=200&fit=crop&q=80" },
        { q: "La darija est naturelle. Les clients ne réalisent pas que la voix est synthétique.", n: "Yasmine Kadri", r: "Agence pub, Oran", img: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=200&h=200&fit=crop&q=80" },
        { q: "Le paiement Edahabia a tout changé pour moi. Le meilleur outil que j'ai testé.", n: "Khaled Merzoug", r: "E-commerce, Constantine", img: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&q=80" },
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

  // FIX FONT : Tajawal pour l'arabe, plus de Vazirmatn
  const display = isRTL ? "'Tajawal', sans-serif" : "'Instrument Serif', serif";
  const sans = isRTL ? "'Tajawal', sans-serif" : "'Space Grotesk', sans-serif";
  const mono = "'JetBrains Mono', monospace";

  const handleSpotlight = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="min-h-screen bg-[#08070F] text-[#F4F1FF] relative"
      style={{ fontFamily: sans }}
    >
      <GlobalStyles />
      <AuroraBackground />

      {/* Progress bar — FIX RTL: use transform-origin based on dir */}
      <motion.div
        aria-hidden="true"
        className="fixed top-0 inset-x-0 h-[2px] z-[60] origin-left"
        style={{
          scaleX: pageProgress,
          background: "linear-gradient(90deg, #6366F1, #A78BFA, #DDD6FE, #A78BFA, #6366F1)",
          backgroundSize: "200% 100%",
          transformOrigin: isRTL ? "right center" : "left center",
        }}
      />

      <a href="#home" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:start-4 focus:z-[100] focus:bg-[#A78BFA] focus:text-[#08070F] focus:px-4 focus:py-2 focus:rounded text-xs">
        {t.skip}
      </a>

      {/* =====================================================
          HEADER
      ===================================================== */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-700 ${
          scrolled ? "sw-glass-strong border-b border-white/[0.06]" : "bg-transparent"
        }`}
      >
        <div className="relative mx-auto max-w-[1320px] px-6 h-16 flex items-center justify-between">
          <a href="#home" onClick={(e) => { e.preventDefault(); smoothTo("#home"); }} className="relative z-10 flex items-center gap-2.5 sw-focus" aria-label="Sawtify">
            <motion.div
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="w-8 h-8 rounded-xl overflow-hidden bg-gradient-to-br from-[#A78BFA] to-[#6366F1] shrink-0 flex items-center justify-center sw-glow-sm"
            >
              <img src={LOGO_URL} alt="" className="w-full h-full object-cover" />
            </motion.div>
            <span className="font-semibold text-[15px] tracking-[-0.02em] text-white">Sawtify</span>
            <span className="hidden sm:inline text-[10px] text-[#A78BFA] border border-[#A78BFA]/30 rounded-full px-2 py-px ms-1 bg-[#A78BFA]/5" style={{ fontFamily: mono }}>
              v2.1
            </span>
          </a>

          <nav className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-9 text-[13px] text-white/60" aria-label="Principale">
            {nav.map((l) => (
              <a key={l.href} href={l.href} onClick={(e) => { e.preventDefault(); smoothTo(l.href); }} className="hover:text-white transition-colors duration-200 sw-focus sw-nav-link">
                {l.label}
              </a>
            ))}
          </nav>

          <div className="relative z-10 flex items-center gap-2">
            <button
              onClick={() => setLanguage(language === "fr" ? "ar" : "fr")}
              aria-label={t.switchLang}
              className="hidden sm:inline-flex w-8 h-8 items-center justify-center text-[11px] font-medium text-white/60 hover:text-white transition-colors sw-focus rounded-full border border-white/10 hover:border-[#A78BFA]/40"
              style={{ fontFamily: mono }}
            >
              {language === "fr" ? "AR" : "FR"}
            </button>
            <button onClick={onLoginClick} className="hidden md:inline-flex px-3 h-8 text-[13px] font-medium text-white/70 hover:text-white transition-colors sw-focus rounded">
              {t.signin}
            </button>
            <Magnetic strength={0.25}>
              <button onClick={onSigninClick} className="sw-btn-neon group relative inline-flex items-center gap-2 h-11 px-5 text-[#08070F] text-[14px] font-semibold rounded-full sw-focus">
                <span className="relative flex items-center gap-2">
                  {t.tryFree}
                  <ArrowIcon className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </span>
              </button>
            </Magnetic>
            <button onClick={() => setMenuOpen(true)} aria-label={t.open} aria-expanded={menuOpen} className="md:hidden w-9 h-9 flex items-center justify-center hover:bg-white/5 rounded sw-focus border border-white/10">
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
              className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm md:hidden"
            />
            <motion.div
              initial={{ x: isRTL ? "-100%" : "100%" }} animate={{ x: 0 }} exit={{ x: isRTL ? "-100%" : "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 280 }}
              className="fixed inset-y-0 end-0 z-[60] w-[88%] max-w-sm sw-glass-strong md:hidden flex flex-col border-s border-white/10"
            >
              <div className="flex items-center justify-between px-6 h-16 border-b border-white/10">
                <span className="font-semibold text-[15px]">Sawtify</span>
                <button onClick={() => setMenuOpen(false)} aria-label={t.close} className="w-9 h-9 flex items-center justify-center rounded hover:bg-white/5 sw-focus">
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
                    className="flex items-center justify-between py-4 text-[18px] border-b border-white/5 sw-focus"
                  >
                    {l.label}
                    <ArrowIcon className="w-4 h-4 opacity-30" />
                  </motion.a>
                ))}
              </nav>
              <div className="px-6 pb-8 pt-2 space-y-2">
                <button onClick={() => { setMenuOpen(false); onSigninClick(); }} className="w-full rounded-full sw-btn-neon text-[#08070F] py-3.5 text-[14px] font-semibold sw-focus">
                  {t.start}
                </button>
                <button onClick={() => { setMenuOpen(false); onLoginClick(); }} className="w-full rounded-full border border-white/15 py-3.5 text-[14px] font-medium sw-focus">
                  {t.signin}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* =====================================================
          HERO
      ===================================================== */}
      <section
        id="home"
        ref={heroRef}
        className="relative pt-32 sm:pt-40 pb-24 overflow-hidden"
        aria-label="Introduction"
      >
        <div className="absolute inset-x-0 top-0 h-[60%] sw-grid-3d opacity-60 pointer-events-none" />

        <div className="relative mx-auto max-w-[1320px] px-6">
          <motion.div style={{ y: heroY, opacity: heroOpacity }}>
            <Reveal>
              <div className="inline-flex items-center gap-2 mb-8 px-3.5 py-1.5 rounded-full sw-glass border border-white/10">
                <span className="relative flex w-1.5 h-1.5">
                  <span className="absolute inset-0 rounded-full bg-emerald-400 sw-pulse" />
                  <span className="relative rounded-full w-1.5 h-1.5 bg-emerald-400" />
                </span>
                <span className="text-[11px] text-white/80 tracking-wide" style={{ fontFamily: mono }}>
                  {t.liveBadge}
                </span>
              </div>
            </Reveal>

            <Reveal delay={0.05}>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#A78BFA] mb-6 flex items-center gap-2" style={{ fontFamily: mono }}>
                <Sparkles className="w-3.5 h-3.5" />
                {t.heroKicker}
              </p>
            </Reveal>

            <div className="grid lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7">
                <Reveal delay={0.1} y={40}>
                  <h1
                    className="text-[clamp(3rem,9vw,7.5rem)] leading-[0.95] tracking-[-0.04em] text-white max-w-5xl sw-glow-text"
                    style={{ fontFamily: display, fontWeight: isRTL ? 700 : 400 }}
                  >
                    {t.heroTitle1}
                    <br />
                    <span className="italic sw-shimmer">{t.heroTitle2}</span>
                  </h1>
                </Reveal>

                <Reveal delay={0.25}>
                  <p className="mt-8 text-[16px] sm:text-[18px] leading-[1.55] text-white/55 max-w-lg">
                    {t.heroSub}
                  </p>
                </Reveal>

                <Reveal delay={0.35}>
                  <div className="mt-10 flex flex-wrap items-center gap-3">
                    <Magnetic>
                      <button onClick={onSigninClick} className="sw-btn-neon group relative inline-flex items-center gap-2 h-12 px-6 text-[#08070F] text-[14px] font-semibold rounded-full sw-focus">
                        <span className="relative flex items-center gap-2">
                          {t.tryFree}
                          <ArrowIcon className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                        </span>
                      </button>
                    </Magnetic>

                    <button onClick={() => smoothTo("#voices")} className="group inline-flex items-center gap-3 h-12 px-5 text-[14px] font-medium text-white rounded-full sw-glass border border-white/10 hover:border-[#A78BFA]/40 transition-all sw-focus">
                      <span className="relative w-7 h-7 rounded-full bg-gradient-to-br from-[#A78BFA] to-[#6366F1] flex items-center justify-center text-[#08070F]">
                        <Play className="w-2.5 h-3 fill-current" />
                      </span>
                      {t.listenDemo}
                    </button>
                  </div>
                </Reveal>
              </div>

              {/* Hero visual: photo 3D */}
              <div className="lg:col-span-5 hidden lg:block">
                <Reveal delay={0.4}>
                  <Tilt intensity={8}>
                    <div
                      className="relative sw-img-card rounded-3xl overflow-hidden sw-border-glow-strong sw-glow-lg"
                      style={{ transformStyle: "preserve-3d" }}
                    >
                      <div
                        className="aspect-[4/5] relative"
                        style={{
                          backgroundImage: "url('https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=900&h=1100&fit=crop&q=80')",
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-[#08070F] via-transparent to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-br from-[#6366F1]/30 via-transparent to-[#A78BFA]/30 mix-blend-overlay" />
                        <div className="absolute top-4 start-4 sw-glass rounded-full px-3 py-1.5 flex items-center gap-2 text-[11px] text-white" style={{ fontFamily: mono }}>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          REC · 00:24
                        </div>
                        <div className="absolute bottom-4 start-4 end-4 sw-glass rounded-2xl p-4">
                          <div className="flex items-end gap-[2px] h-8 mb-2" dir="ltr">
                            {Array.from({ length: 32 }).map((_, i) => {
                              const h = 20 + Math.abs(Math.sin(i * 0.7) * Math.cos(i * 0.4)) * 80;
                              return (
                                <span
                                  key={i}
                                  className="flex-1 rounded-full bg-gradient-to-t from-[#A78BFA] to-[#DDD6FE] sw-wave-idle"
                                  style={{ height: `${h}%`, maxWidth: 3, animationDelay: `${(i % 8) * 0.1}s` }}
                                />
                              );
                            })}
                          </div>
                          <div className="text-[10px] text-white/60" style={{ fontFamily: mono }}>
                            sawtify-v2.1 · 24kHz · stereo
                          </div>
                        </div>
                      </div>
                    </div>
                  </Tilt>
                </Reveal>
              </div>
            </div>
          </motion.div>

          {/* Terminal + Waveform */}
          <Reveal delay={0.5}>
            <Tilt intensity={4}>
              <div className="mt-20 sm:mt-28 grid lg:grid-cols-12 gap-6 items-stretch">
                <div className="lg:col-span-5 sw-glass rounded-2xl overflow-hidden sw-border-glow" style={{ transformStyle: "preserve-3d" }}>
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-white/20" />
                      <span className="w-2 h-2 rounded-full bg-white/20" />
                      <span className="w-2 h-2 rounded-full bg-white/20" />
                    </div>
                    <span className="text-[10px] text-white/40" style={{ fontFamily: mono }}>sawtify.dz</span>
                  </div>
                  <div className="p-5 space-y-2 min-h-[180px]" style={{ fontFamily: mono }}>
                    {demoLines.map((line, i) => (
                      <motion.div
                        key={line.label}
                        animate={{ opacity: i <= demoStep ? 1 : 0.25 }}
                        transition={{ duration: 0.4 }}
                        className="flex items-baseline gap-3 text-[12px]"
                      >
                        <span className="text-[#A78BFA] w-14 shrink-0">{line.label}</span>
                        <span className="text-white/85 truncate">{i <= demoStep ? line.text : "—"}</span>
                        {i === demoStep && (
                          <motion.span
                            animate={{ opacity: [1, 0, 1] }}
                            transition={{ duration: 1, repeat: Infinity }}
                            className="text-[#A78BFA]"
                          >
                            ▊
                          </motion.span>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-7 sw-glass rounded-2xl p-6 sw-border-glow relative overflow-hidden">
                  <div className="flex items-center gap-2 mb-3 text-[10px] text-white/50" style={{ fontFamily: mono }}>
                    <Volume2 className="w-3 h-3 text-[#A78BFA]" />
                    <span>output_preview.wav</span>
                    <span className="ms-auto">0:24</span>
                  </div>
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
                          className="flex-1 origin-bottom sw-wave-idle rounded-full"
                          style={{
                            height: `${h}%`,
                            maxWidth: 3,
                            animationDelay: `${(i % 12) * 0.12}s`,
                            background: i % 7 === 0
                              ? "linear-gradient(180deg, #A78BFA, #6366F1)"
                              : i % 5 === 0
                                ? "#A78BFA"
                                : "rgba(255,255,255,0.5)",
                          }}
                        />
                      );
                    })}
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[10px] text-white/40" style={{ fontFamily: mono }}>
                    <span>00:00</span>
                    <span>24 kHz · stereo · 320 kbps</span>
                    <span>00:24</span>
                  </div>
                </div>
              </div>
            </Tilt>
          </Reveal>
        </div>
      </section>

      {/* =====================================================
          MARQUEE
      ===================================================== */}
      <section className="py-12 border-y border-white/10 bg-black/30 overflow-hidden backdrop-blur-sm">
        <div className="relative">
          <div className="absolute inset-y-0 start-0 w-32 bg-gradient-to-r from-[#08070F] to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-y-0 end-0 w-32 bg-gradient-to-l from-[#08070F] to-transparent z-10 pointer-events-none" />
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
                  <span key={i} className="flex items-center gap-12 text-[13px] text-white/40 whitespace-nowrap">
                    <span style={{ fontFamily: mono }}>{item}</span>
                    <span className="w-1 h-1 rounded-full bg-[#A78BFA]" />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================
          PROCESS — avec photos 3D
      ===================================================== */}
      <section id="process" className="py-24 sm:py-36 relative">
        <div className="mx-auto max-w-[1320px] px-6">
          <div className="grid lg:grid-cols-12 gap-12 mb-20">
            <Reveal className="lg:col-span-5">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#A78BFA] mb-5" style={{ fontFamily: mono }}>
                <span className="text-white/40">/</span> {t.processKicker}
              </p>
              <h2 className="text-[clamp(2.25rem,5vw,4rem)] leading-[1.02] tracking-[-0.03em] text-white" style={{ fontFamily: display, fontWeight: isRTL ? 700 : 400 }}>
                {t.processTitle.split('.')[0]}.<br />
                <span className="italic sw-shimmer">{t.processTitle.split('.')[1]}.</span>
              </h2>
            </Reveal>
            <Reveal delay={0.1} className="lg:col-span-5 lg:col-start-8 lg:mt-4">
              <p className="text-[15px] leading-[1.65] text-white/55 max-w-md">
                {isRTL
                  ? "بدون استوديو. بدون ممثل. بدون انتظار. فقط ثلاث خطوات، ثلاثون ثانية، وصوت جاهز."
                  : "Pas de studio, pas de comédien, pas d'attente. Trois étapes, trente secondes, une voix prête."}
              </p>
            </Reveal>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.1}>
                <Tilt intensity={6}>
                  <div
                    className="sw-glass rounded-2xl h-full sw-border-glow sw-spotlight relative overflow-hidden group"
                    onMouseMove={handleSpotlight}
                    style={{ transformStyle: "preserve-3d" }}
                  >
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <img
                        src={s.img}
                        alt=""
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#08070F] via-[#08070F]/40 to-transparent" />
                      <div
                        className="absolute inset-0 mix-blend-overlay opacity-50"
                        style={{ background: `linear-gradient(135deg, ${s.color}66 0%, transparent 60%)` }}
                      />
                      <div className="absolute top-4 start-4 sw-glass rounded-full px-3 py-1 text-[11px] text-white flex items-center gap-2" style={{ fontFamily: mono }}>
                        <span>{s.n}</span>
                      </div>
                      <div
                        className="absolute top-4 end-4 w-11 h-11 rounded-xl flex items-center justify-center sw-border-glow sw-glass"
                      >
                        <s.icon className="w-5 h-5" style={{ color: s.color }} />
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="text-[24px] leading-tight tracking-[-0.02em] text-white mb-2" style={{ fontFamily: display, fontWeight: isRTL ? 700 : 400 }}>
                        {s.t}
                      </h3>
                      <p className="text-[13px] leading-[1.6] text-white/55">{s.d}</p>
                    </div>
                  </div>
                </Tilt>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================
          VOICES — avec portraits
      ===================================================== */}
      <section id="voices" className="py-24 sm:py-36 relative">
        <div className="mx-auto max-w-[1320px] px-6">
          <div className="grid lg:grid-cols-12 gap-8 mb-16 items-end">
            <Reveal className="lg:col-span-7">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#A78BFA] mb-5" style={{ fontFamily: mono }}>
                <span className="text-white/40">/</span> {t.voicesKicker}
              </p>
              <h2 className="text-[clamp(2.25rem,5vw,4rem)] leading-[1.02] tracking-[-0.03em] text-white" style={{ fontFamily: display, fontWeight: isRTL ? 700 : 400 }}>
                {t.voicesTitle}
              </h2>
            </Reveal>
            <Reveal delay={0.1} className="lg:col-span-4 lg:col-start-9">
              <p className="text-[14px] leading-[1.65] text-white/55">{t.voicesSub}</p>
            </Reveal>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {voices.map((v, idx) => {
              const active = playingId === v.id;
              return (
                <Reveal key={v.id} delay={idx * 0.05}>
                  <Tilt intensity={6}>
                    <div
                      className={`sw-glass rounded-2xl overflow-hidden sw-border-glow sw-spotlight group transition-all duration-500 ${active ? "sw-glow-md" : ""}`}
                      onMouseMove={handleSpotlight}
                      style={{ transformStyle: "preserve-3d" }}
                    >
                      <button
                        onClick={() => toggleVoice(v.id, v.url)}
                        aria-label={`${active ? "Pause" : "Play"} ${v.name}`}
                        aria-pressed={active}
                        className="w-full text-start sw-focus block"
                      >
                        <div className="relative aspect-square overflow-hidden">
                          <img
                            src={v.img}
                            alt={v.name}
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#08070F] via-transparent to-transparent" />
                          <div className={`absolute inset-0 mix-blend-overlay transition-opacity duration-500 ${active ? "opacity-60" : "opacity-30"}`} style={{ background: "linear-gradient(135deg, #6366F1 0%, #A78BFA 100%)" }} />
                          <div className={`absolute top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 ${active ? "scale-110 sw-btn-neon" : "bg-white/10 backdrop-blur-md border border-white/20 opacity-0 group-hover:opacity-100"}`}>
                            {active ? <Pause className="w-5 h-5 text-[#08070F] fill-current" /> : <Play className="w-5 h-5 text-white fill-current ms-0.5" />}
                          </div>
                          {active && (
                            <div className="absolute bottom-3 start-3 end-3 flex items-end gap-[2px] h-8" dir="ltr">
                              {Array.from({ length: 24 }).map((_, i) => {
                                const h = 20 + Math.abs(Math.sin((i + idx) * 0.7) * Math.cos(i * 0.4)) * 80;
                                return (
                                  <span
                                    key={i}
                                    className="flex-1 rounded-full bg-gradient-to-t from-[#A78BFA] to-[#DDD6FE] sw-wave-idle"
                                    style={{ height: `${h}%`, maxWidth: 3, animationDelay: `${(i % 8) * 0.1}s` }}
                                  />
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-[18px] text-white tracking-[-0.01em]" style={{ fontFamily: display, fontWeight: isRTL ? 700 : 400 }}>
                              {v.name}
                            </div>
                            <span className="text-[9px] text-[#A78BFA] border border-[#A78BFA]/30 rounded-full px-1.5 py-px bg-[#A78BFA]/5" style={{ fontFamily: mono }}>
                              {v.lang}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-white/50">{v.tag}</span>
                            <span className="text-white/40" style={{ fontFamily: mono }}>{v.duration}</span>
                          </div>
                        </div>
                      </button>
                    </div>
                  </Tilt>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================
          METRICS
      ===================================================== */}
      <section className="relative py-24 sm:py-36 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#08070F] via-[#1A0F2E] to-[#08070F] pointer-events-none" />

        <div className="relative mx-auto max-w-[1320px] px-6">
          <div className="grid lg:grid-cols-12 gap-12 mb-16">
            <Reveal className="lg:col-span-7">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#A78BFA] mb-5" style={{ fontFamily: mono }}>
                <span className="text-white/40">/</span> {t.metricsKicker}
              </p>
              <h2 className="text-[clamp(2.25rem,5vw,4rem)] leading-[1.02] tracking-[-0.03em] text-white" style={{ fontFamily: display, fontWeight: isRTL ? 700 : 400 }}>
                {t.metricsTitle.split('.')[0]}.<br />
                <span className="italic sw-shimmer">{t.metricsTitle.split('.')[1]}.</span>
              </h2>
            </Reveal>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-12 gap-x-6">
            {metrics.map((m, i) => (
              <Reveal key={m.l} delay={i * 0.08}>
                <div className="border-t border-white/15 pt-6 relative">
                  <div className="absolute -top-px start-0 w-12 h-[2px] bg-gradient-to-r from-[#A78BFA] to-transparent" />
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
          TESTIMONIALS — avec photos
      ===================================================== */}
      <section className="py-24 sm:py-36 relative">
        <div className="mx-auto max-w-[1320px] px-6">
          <div className="grid lg:grid-cols-12 gap-8 mb-16">
            <Reveal className="lg:col-span-7">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#A78BFA] mb-5" style={{ fontFamily: mono }}>
                <span className="text-white/40">/</span> {t.testKicker}
              </p>
              <h2 className="text-[clamp(2.25rem,5vw,4rem)] leading-[1.02] tracking-[-0.03em] text-white" style={{ fontFamily: display, fontWeight: isRTL ? 700 : 400 }}>
                {t.testTitle}
              </h2>
            </Reveal>
          </div>

          <div className="grid lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 relative min-h-[280px]">
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
                      <Star key={i} className="w-3.5 h-3.5 text-[#A78BFA] fill-[#A78BFA]" />
                    ))}
                  </div>
                  <blockquote className="text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.25] tracking-[-0.02em] text-white" style={{ fontFamily: display, fontWeight: isRTL ? 700 : 400 }}>
                    <span className="text-[#A78BFA]">"</span>
                    {testimonials[activeTesti].q}
                    <span className="text-[#A78BFA]">"</span>
                  </blockquote>
                  <figcaption className="mt-8 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full overflow-hidden sw-border-glow shrink-0">
                      <img src={testimonials[activeTesti].img} alt={testimonials[activeTesti].n} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <div className="text-[15px] font-semibold text-white">{testimonials[activeTesti].n}</div>
                      <div className="text-[12px] text-white/50 mt-0.5">{testimonials[activeTesti].r}</div>
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
                    <span className={`block transition-all duration-500 ${activeTesti === i ? "w-8 h-px bg-[#A78BFA]" : "w-4 h-px bg-white/25 hover:bg-white/50"}`} />
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 ms-auto lg:ms-0">
                <button onClick={() => setActiveTesti((p) => (p - 1 + testimonials.length) % testimonials.length)} aria-label={t.prev} className="w-10 h-10 rounded-full border border-white/15 flex items-center justify-center hover:border-[#A78BFA] hover:text-[#A78BFA] transition-colors sw-focus">
                  {isRTL ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => setActiveTesti((p) => (p + 1) % testimonials.length)} aria-label={t.next} className="w-10 h-10 rounded-full border border-white/15 flex items-center justify-center hover:border-[#A78BFA] hover:text-[#A78BFA] transition-colors sw-focus">
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
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#A78BFA] mb-5" style={{ fontFamily: mono }}>
                <span className="text-white/40">/</span> {t.pricingKicker}
              </p>
              <h2 className="text-[clamp(2.25rem,5vw,4rem)] leading-[1.02] tracking-[-0.03em] text-white" style={{ fontFamily: display, fontWeight: isRTL ? 700 : 400 }}>
                {t.pricingTitle}
              </h2>
            </Reveal>
            <Reveal delay={0.1} className="lg:col-span-4 lg:col-start-9 lg:mt-3">
              <p className="text-[14px] leading-[1.65] text-white/55">{t.pricingSub}</p>
            </Reveal>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {pricing.map((p, i) => (
              <Reveal key={p.pts} delay={i * 0.06}>
                <Tilt intensity={5}>
                  <div
                    className={`relative p-8 h-full flex flex-col rounded-2xl sw-spotlight overflow-hidden ${
                      p.featured ? "sw-glass-strong sw-border-glow-strong sw-glow-md bg-gradient-to-br from-[#1A0F2E] to-[#08070F]" : "sw-glass sw-border-glow"
                    }`}
                    onMouseMove={handleSpotlight}
                    style={{ transformStyle: "preserve-3d" }}
                  >
                    {p.featured && (
                      <>
                        <div className="absolute -top-20 -end-20 w-60 h-60 rounded-full opacity-40 pointer-events-none" style={{ background: "radial-gradient(circle, #A78BFA 0%, transparent 70%)", filter: "blur(60px)" }} />
                        <span className="absolute top-4 end-4 z-10 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.15em] text-[#08070F] bg-gradient-to-r from-[#A78BFA] to-[#DDD6FE] rounded-full px-2.5 py-1 font-semibold" style={{ fontFamily: mono }}>
                          <Sparkles className="w-2.5 h-2.5" />
                          {isRTL ? "شائع" : "popular"}
                        </span>
                      </>
                    )}

                    <div className="relative">
                      <Num className="text-[48px] leading-none tracking-[-0.03em] block mb-2 text-white" style={{ fontFamily: display, fontWeight: isRTL ? 700 : 400 }}>
                        {p.pts}
                      </Num>
                      <div className="text-[13px] mb-8 text-white/50">
                        {isRTL ? "نقطة" : "points"}
                      </div>
                    </div>

                    <p className="relative text-[13px] leading-relaxed mb-8 text-white/55">{p.desc}</p>

                    <div className="relative h-px mb-6 bg-white/10" />

                    <ul className="relative space-y-2.5 mb-10 list-none">
                      {features.map((f) => (
                        <li key={f} className="flex items-center gap-2.5 text-[12px] text-white/65">
                          <span className="w-4 h-4 rounded-full bg-[#A78BFA]/15 flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5 text-[#A78BFA]" />
                          </span>
                          {f}
                        </li>
                      ))}
                    </ul>

                    <div className="relative mt-auto">
                      <div className="flex items-baseline gap-1.5 mb-6">
                        <Num className="text-[30px] tracking-[-0.02em] text-white" style={{ fontFamily: display, fontWeight: isRTL ? 700 : 400 }}>
                          {p.price}
                        </Num>
                        <span className="text-[12px] text-white/50" style={{ fontFamily: mono }}>DZD</span>
                      </div>

                      <Magnetic>
                        <button onClick={onSigninClick} className={`w-full h-11 rounded-full text-[13px] font-semibold transition-all duration-500 sw-focus ${
                          p.featured ? "sw-btn-neon text-[#08070F]" : "border border-white/15 hover:border-[#A78BFA] hover:bg-[#A78BFA] hover:text-[#08070F] text-white"
                        }`}>
                          {isRTL ? "اختيار" : "Choisir"}
                        </button>
                      </Magnetic>
                    </div>
                  </div>
                </Tilt>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.3}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-white/40" style={{ fontFamily: mono }}>
              <span>SATIM</span>
              <span className="w-px h-3 bg-white/20" />
              <span>Edahabia</span>
              <span className="w-px h-3 bg-white/20" />
              <span>CIB</span>
              <span className="w-px h-3 bg-white/20" />
              <span>{isRTL ? "بالدينار الجزائري" : "En dinars algériens"}</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* =====================================================
          FAQ
      ===================================================== */}
      <section id="faq" className="py-24 sm:py-36 relative">
        <div className="mx-auto max-w-[1320px] px-6">
          <div className="grid lg:grid-cols-12 gap-12">
            <Reveal className="lg:col-span-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#A78BFA] mb-5" style={{ fontFamily: mono }}>
                <span className="text-white/40">/</span> {t.faqKicker}
              </p>
              <h2 className="text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.02] tracking-[-0.03em] text-white" style={{ fontFamily: display, fontWeight: isRTL ? 700 : 400 }}>
                {t.faqTitle}
              </h2>
            </Reveal>

            <div className="lg:col-span-7 lg:col-start-6">
              <div className="sw-glass rounded-2xl overflow-hidden sw-border-glow">
                {faqs.map((f, i) => {
                  const open = openFaq === i;
                  return (
                    <Reveal key={f.q} delay={i * 0.04}>
                      <div className="border-b border-white/5 last:border-b-0">
                        <button onClick={() => setOpenFaq(open ? null : i)} aria-expanded={open} className="w-full py-6 px-6 flex items-start gap-6 text-start sw-focus group">
                          <span className="flex-1 text-[16px] sm:text-[17px] leading-snug pt-0.5 text-white group-hover:text-[#A78BFA] transition-colors duration-300">{f.q}</span>
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-all duration-300 ${open ? "bg-gradient-to-br from-[#A78BFA] to-[#6366F1] text-[#08070F] rotate-45" : "border border-white/20"}`}>
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
                              <p className="pb-6 px-6 pe-12 text-[14px] leading-[1.7] text-white/55 max-w-xl">{f.a}</p>
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
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="sw-orb sw-aurora-1"
            style={{ width: 800, height: 800, top: "10%", left: "20%", background: "radial-gradient(circle, #A78BFA 0%, transparent 70%)", opacity: 0.3, position: "absolute", borderRadius: "50%", filter: "blur(60px)" }}
          />
        </div>
        <div className="relative mx-auto max-w-[900px] px-6 text-center">
          <Reveal>
            <h2 className="text-[clamp(2.75rem,7vw,5.5rem)] leading-[0.98] tracking-[-0.04em] text-white" style={{ fontFamily: display, fontWeight: isRTL ? 700 : 400 }}>
              {t.ctaTitle.split('.').map((part, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <br />}
                  {i === 1 ? <span className="italic sw-shimmer">{part}.</span> : part + (i === 0 ? '.' : '')}
                </React.Fragment>
              ))}
            </h2>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="mt-6 text-[15px] text-white/55">{t.ctaSub}</p>
          </Reveal>
          <Reveal delay={0.25}>
            <Magnetic strength={0.35}>
              <button onClick={onSigninClick} className="sw-btn-neon group relative mt-10 inline-flex items-center gap-2 h-12 px-7 text-[#08070F] text-[14px] font-semibold rounded-full sw-focus">
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
      <footer className="border-t border-white/10 sw-glass">
        <div className="mx-auto max-w-[1320px] px-6 py-14">
          <div className="grid md:grid-cols-12 gap-10 mb-16">
            <div className="md:col-span-5">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-xl overflow-hidden bg-gradient-to-br from-[#A78BFA] to-[#6366F1]">
                  <img src={LOGO_URL} alt="" loading="lazy" className="w-full h-full object-cover" />
                </div>
                <span className="text-[15px] font-semibold tracking-[-0.02em] text-white">Sawtify</span>
                <span className="text-[10px] text-[#A78BFA] border border-[#A78BFA]/30 rounded-full px-2 py-px" style={{ fontFamily: mono }}>v2.1</span>
              </div>
              <p className="text-[13px] text-white/50 max-w-xs leading-relaxed mb-6">{t.footTag}</p>
              <div className="inline-flex items-center gap-2 text-[11px] text-white/50" style={{ fontFamily: mono }}>
                <span className="relative flex w-1.5 h-1.5">
                  <span className="absolute inset-0 rounded-full bg-emerald-400 sw-pulse" />
                  <span className="relative rounded-full w-1.5 h-1.5 bg-emerald-400" />
                </span>
                All systems operational
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="text-[11px] uppercase tracking-[0.15em] text-white/35 mb-4" style={{ fontFamily: mono }}>{isRTL ? "المنتج" : "Produit"}</div>
              <ul className="space-y-2.5 list-none text-[13px]">
                <li><a href="#voices" onClick={(e) => { e.preventDefault(); smoothTo("#voices"); }} className="text-white/70 hover:text-[#A78BFA] transition-colors">{t.navWork}</a></li>
                <li><a href="#pricing" onClick={(e) => { e.preventDefault(); smoothTo("#pricing"); }} className="text-white/70 hover:text-[#A78BFA] transition-colors">{t.navPricing}</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); showFooterToast(isRTL ? "API قريباً" : "API bientôt disponible"); }} className="text-white/70 hover:text-[#A78BFA] transition-colors cursor-pointer">API</a></li>
              </ul>
            </div>

            <div className="md:col-span-2">
              <div className="text-[11px] uppercase tracking-[0.15em] text-white/35 mb-4" style={{ fontFamily: mono }}>{isRTL ? "الشركة" : "Compagnie"}</div>
              <ul className="space-y-2.5 list-none text-[13px]">
                <li><a href="#process" onClick={(e) => { e.preventDefault(); smoothTo("#process"); }} className="text-white/70 hover:text-[#A78BFA] transition-colors cursor-pointer">{isRTL ? "من نحن" : "À propos"}</a></li>
                <li><a href="mailto:contact@sawtify.dz" className="text-white/70 hover:text-[#A78BFA] transition-colors">{isRTL ? "اتصل" : "Contact"}</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); showFooterToast(isRTL ? "المدونة قريباً" : "Blog bientôt disponible"); }} className="text-white/70 hover:text-[#A78BFA] transition-colors cursor-pointer">{isRTL ? "المدونة" : "Blog"}</a></li>
              </ul>
            </div>

            <div className="md:col-span-3">
              <div className="text-[11px] uppercase tracking-[0.15em] text-white/35 mb-4" style={{ fontFamily: mono }}>{isRTL ? "قانوني" : "Légal"}</div>
              <ul className="space-y-2.5 list-none text-[13px]">
                <li><a href="#" onClick={(e) => { e.preventDefault(); setLegalModal('terms'); }} className="text-white/70 hover:text-[#A78BFA] transition-colors cursor-pointer">{isRTL ? "شروط الاستخدام" : "Conditions"}</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); setLegalModal('privacy'); }} className="text-white/70 hover:text-[#A78BFA] transition-colors cursor-pointer">{isRTL ? "الخصوصية" : "Confidentialité"}</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); setLegalModal('cookies'); }} className="text-white/70 hover:text-[#A78BFA] transition-colors cursor-pointer">Cookies</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[12px] text-white/40" style={{ fontFamily: mono }}>
              © <Num>2026</Num> Sawtify · All rights reserved
            </p>
            <div className="flex items-center gap-4 text-[12px] text-white/40" style={{ fontFamily: mono }}>
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
            className="fixed bottom-6 end-6 z-40 w-11 h-11 rounded-full sw-btn-neon flex items-center justify-center sw-focus"
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
            className="fixed bottom-6 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 z-[70] sw-glass-strong text-white text-[13px] px-4 py-2.5 rounded-full sw-glow-sm"
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
            className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-md flex items-center justify-center p-6"
            onClick={() => setLegalModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="sw-glass-strong rounded-2xl max-w-md w-full p-7 sw-border-glow-strong sw-glow-md"
              dir={isRTL ? "rtl" : "ltr"}
            >
              <h3 className="text-lg font-bold mb-3 text-white" style={{ fontFamily: display }}>
                {isRTL ? LEGAL_CONTENT[legalModal].ar[0] : LEGAL_CONTENT[legalModal].fr[0]}
              </h3>
              <p className="text-[13px] leading-relaxed text-white/70 mb-6">
                {isRTL ? LEGAL_CONTENT[legalModal].ar[1] : LEGAL_CONTENT[legalModal].fr[1]}
              </p>
              <button onClick={() => setLegalModal(null)} className="w-full py-2.5 rounded-xl sw-btn-neon text-[#08070F] text-sm font-semibold cursor-pointer">
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
