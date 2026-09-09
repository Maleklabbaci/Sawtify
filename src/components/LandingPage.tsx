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
  ArrowUpRight,  // ✅ AJOUTÉ
  Volume2,
} from "lucide-react";
import { motion, AnimatePresence, useScroll, useMotionValue, useSpring } from "motion/react";

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
    @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Archivo:wght@400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;600&family=Noto+Kufi+Arabic:wght@400;500;700;900&display=swap');

    * { -webkit-tap-highlight-color: transparent; }
    html {
      scroll-behavior: smooth;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    body {
      overflow-x: hidden;
      background: #0A0612;
      color: #F4F1FF;
      font-family: 'Archivo', sans-serif;
    }

    @keyframes aurora {
      0%, 100% { transform: translate(0,0) scale(1); }
      50% { transform: translate(8%, -10%) scale(1.15); }
    }
    .aurora-1 { animation: aurora 20s ease-in-out infinite; }
    .aurora-2 { animation: aurora 25s ease-in-out infinite reverse; }

    @keyframes marquee {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    .marquee-track {
      animation: marquee 30s linear infinite;
      display: flex;
      width: max-content;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(1.5); }
    }
    .pulse-dot::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: currentColor;
      animation: pulse 2s ease-in-out infinite;
      opacity: 0.5;
    }

    @keyframes wave {
      0%, 100% { transform: scaleY(0.3); }
      50% { transform: scaleY(1); }
    }
    .wave-bar { animation: wave 1.4s ease-in-out infinite; transform-origin: bottom; }

    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
    .float { animation: float 5s ease-in-out infinite; }
    .float-slow { animation: float 8s ease-in-out infinite; }

    @keyframes spin-slow { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .spin-slow { animation: spin-slow 20s linear infinite; }
    .spin-reverse { animation: spin-slow 30s linear infinite reverse; }

    @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }
    .blink { animation: blink 1s step-end infinite; }

    @keyframes shimmer {
      0% { background-position: 0% 50%; }
      100% { background-position: 200% 50%; }
    }
    .text-shimmer {
      background: linear-gradient(110deg, #fff 0%, #A78BFA 25%, #fff 50%, #A78BFA 75%, #fff 100%);
      background-size: 200% auto;
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      animation: shimmer 5s linear infinite;
    }

    .glow-sm { box-shadow: 0 0 30px -5px rgba(167, 139, 250, 0.4); }
    .glow-md { box-shadow: 0 0 60px -10px rgba(139, 92, 246, 0.5); }
    .glow-lg { box-shadow: 0 20px 80px -20px rgba(139, 92, 246, 0.6), 0 0 40px -10px rgba(167, 139, 250, 0.4); }

    .focus-ring:focus-visible {
      outline: 2px solid #A78BFA;
      outline-offset: 3px;
    }

    ::selection { background: #A78BFA; color: #0A0612; }

    ::-webkit-scrollbar { width: 8px; }
    ::-webkit-scrollbar-track { background: #0A0612; }
    ::-webkit-scrollbar-thumb { background: #7C3AED; border-radius: 8px; }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
      }
    }
  `}</style>
);

/* =========================================================
   SVG COMPONENTS
========================================================= */
const HeroVisual = () => (
  <div className="relative w-full aspect-square max-w-[500px] mx-auto">
    <div className="absolute inset-0 rounded-full border border-white/10 spin-slow" />
    <div className="absolute inset-4 rounded-full border border-white/10 spin-reverse" />
    <div className="absolute inset-10 rounded-full border border-white/5" />

    <div className="absolute inset-[20%] rounded-full bg-gradient-to-br from-[#A78BFA] via-[#7C3AED] to-[#4338CA] glow-lg float" />
    <div className="absolute inset-[25%] rounded-full bg-gradient-to-tr from-transparent via-white/20 to-transparent" />

    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 400" style={{ transform: "rotate(-90deg)" }}>
      {[180, 140, 100, 60].map((r, i) => (
        <circle
          key={r}
          cx="200" cy="200" r={r}
          fill="none"
          stroke="url(#gradPurple)"
          strokeWidth="1.5"
          strokeDasharray={`${4 + i * 2} ${8 + i * 4}`}
          opacity={0.6 - i * 0.1}
        />
      ))}
      <defs>
        <linearGradient id="gradPurple" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#A78BFA" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>
      </defs>
    </svg>

    {[
      { top: "10%", left: "10%" },
      { top: "10%", right: "10%" },
      { bottom: "10%", left: "10%" },
      { bottom: "10%", right: "10%" },
    ].map((pos, i) => (
      <div
        key={i}
        className="absolute w-2 h-2 rounded-full bg-[#A78BFA] glow-sm"
        style={pos as any}
      />
    ))}

    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#0A0612] border border-white/10 rounded-full px-3 py-1 text-[10px] text-[#A78BFA] font-mono">
      v2.1
    </div>
    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-[#0A0612] border border-white/10 rounded-full px-3 py-1 text-[10px] text-white/60 font-mono">
      24kHz · DZ
    </div>
  </div>
);

const VoiceAvatar = ({ id, color, active }: { id: string; color: string; active: boolean }) => {
  const patterns: Record<string, React.ReactNode> = {
    amin: (
      <g>
        <circle cx="50" cy="50" r="35" fill="none" stroke={color} strokeWidth="1.5" />
        <circle cx="50" cy="50" r="20" fill={color} opacity="0.3" />
        <path d="M 50 30 L 50 70 M 30 50 L 70 50" stroke={color} strokeWidth="1.5" />
      </g>
    ),
    yasmine: (
      <g>
        <rect x="20" y="20" width="60" height="60" fill="none" stroke={color} strokeWidth="1.5" transform="rotate(45 50 50)" />
        <circle cx="50" cy="50" r="15" fill={color} opacity="0.4" />
      </g>
    ),
    khalid: (
      <g>
        <polygon points="50,15 85,80 15,80" fill="none" stroke={color} strokeWidth="1.5" />
        <polygon points="50,30 70,70 30,70" fill={color} opacity="0.3" />
      </g>
    ),
    layla: (
      <g>
        <path d="M 20 50 Q 35 20, 50 50 T 80 50" fill="none" stroke={color} strokeWidth="2" />
        <path d="M 20 60 Q 35 30, 50 60 T 80 60" fill={color} opacity="0.2" />
        <circle cx="50" cy="50" r="5" fill={color} />
      </g>
    ),
  };
  return (
    <div
      className={`relative aspect-square rounded-2xl overflow-hidden border transition-all duration-500 ${
        active ? "border-[#A78BFA] glow-md" : "border-white/10"
      }`}
      style={{ background: `linear-gradient(135deg, ${color}22 0%, #0A0612 100%)` }}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full p-6">
        {patterns[id]}
      </svg>
      {active && (
        <div className="absolute inset-0 bg-gradient-to-t from-[#A78BFA]/30 to-transparent" />
      )}
    </div>
  );
};

const StepIcon = ({ num, color }: { num: string; color: string }) => (
  <div className="relative w-16 h-16">
    <div
      className="absolute inset-0 rounded-2xl"
      style={{ background: `linear-gradient(135deg, ${color}40 0%, transparent 100%)` }}
    />
    <div className="absolute inset-0 flex items-center justify-center">
      <span className="text-3xl font-black" style={{ color, fontFamily: "'Archivo Black', sans-serif" }}>
        {num}
      </span>
    </div>
    <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full" style={{ background: color }} />
  </div>
);

/* =========================================================
   UTILS
========================================================= */
const Num = ({ children, className = "", style = {} }: any) => (
  <span dir="ltr" style={{ unicodeBidi: "isolate", ...style }} className={`inline-block ${className}`}>
    {children}
  </span>
);

const Counter = ({ target, suffix = "", duration = 2000 }: any) => {
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
          setCount(Math.round((1 - Math.pow(1 - p, 4)) * target));
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
    <Num className="tabular-nums">
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
    x.set((e.clientX - rect.left - rect.width / 2) * strength);
    y.set((e.clientY - rect.top - rect.height / 2) * strength);
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
    viewport={{ once: true, margin: "-60px" }}
    transition={{ duration: 1, delay, ease: [0.16, 1, 0.3, 1] }}
    className={className}
  >
    {children}
  </motion.div>
);

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
  const [typedText, setTypedText] = useState("");

  const scrolled = useScrollState();
  const { scrollYProgress } = useScroll();

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
    const phrases = isRTL
      ? ["«مرحبا بيكم في متجرنا»", "«نقدمو لكم أحسن العروض»", "«تواصلو معانا دروك»"]
      : ["«Bienvenue dans notre boutique»", "«Découvrez nos offres exclusives»", "«Contactez-nous dès maintenant»"];
    let i = 0, j = 0, deleting = false;
    const tick = () => {
      const phrase = phrases[i];
      if (!deleting) {
        setTypedText(phrase.slice(0, j + 1));
        j++;
        if (j === phrase.length) { deleting = true; setTimeout(tick, 1800); return; }
      } else {
        setTypedText(phrase.slice(0, j - 1));
        j--;
        if (j === 0) { deleting = false; i = (i + 1) % phrases.length; }
      }
      setTimeout(tick, deleting ? 30 : 60);
    };
    tick();
  }, [isRTL]);

  useEffect(() => () => { audioRef.current?.pause(); }, []);

  const ArrowIcon = ({ className = "w-4 h-4" }: any) =>
    isRTL ? <ArrowLeft className={className} /> : <ArrowRight className={className} />;

  const t = {
    skip: isRTL ? "تخطي" : "Skip",
    navWork: isRTL ? "الأصوات" : "Voix",
    navHow: isRTL ? "الطريقة" : "Process",
    navPricing: isRTL ? "الأسعار" : "Tarifs",
    navFaq: "FAQ",
    signin: isRTL ? "دخول" : "Connexion",
    start: isRTL ? "ابدأ الآن" : "Commencer",
    liveBadge: isRTL ? "v2.1 · مباشر" : "v2.1 · LIVE",
    heroKicker: isRTL ? "استوديو صوتي بالذكاء الاصطناعي" : "AI Voice Studio",
    heroTitle1: isRTL ? "حوّل النص" : "Turn text",
    heroTitle2: isRTL ? "إلى صوت حقيقي" : "into real voice.",
    heroSub: isRTL
      ? "أصوات طبيعية بالدارجة. 30 ثانية. بدون معدات."
      : "Natural voices in darija. 30 seconds. No gear needed.",
    tryFree: isRTL ? "جرّب مجاناً" : "Try free",
    listenDemo: isRTL ? "استمع" : "Listen",
    processKicker: "PROCESS",
    processTitle: isRTL ? "ثلاث خطوات." : "Three steps.",
    processSub: isRTL
      ? "بدون تعقيد. فقط اكتب، اختر، صدّر."
      : "No complexity. Just write, pick, export.",
    step1t: isRTL ? "اكتب" : "Write",
    step1d: isRTL ? "ألصق نصّك أو استخدم الذكاء الاصطناعي." : "Paste your text or use AI to generate it.",
    step2t: isRTL ? "اختر" : "Pick",
    step2d: isRTL ? "12 صوتاً، لهجات مختلفة، نبرات لا نهائية." : "12 voices, multiple dialects, endless tones.",
    step3t: isRTL ? "صدّر" : "Export",
    step3d: isRTL ? "MP3 أو WAV. بدون علامة مائية." : "MP3 or WAV. No watermark.",
    voicesKicker: "VOICES",
    voicesTitle: isRTL ? "كلّ صوت عالم." : "Each voice, a world.",
    voicesSub: isRTL
      ? "مدربة على الدارجة الحقيقية."
      : "Trained on real Algerian darija.",
    metricsKicker: "NUMBERS",
    metricsTitle: isRTL ? "النتائج تتكلم." : "Results speak.",
    testKicker: "TESTIMONIALS",
    testTitle: isRTL ? "المبدعون يثقون." : "Creators trust us.",
    pricingKicker: "PRICING",
    pricingTitle: isRTL ? "ادفع مرة. استخدم للأبد." : "Pay once. Use forever.",
    pricingSub: isRTL
      ? "نقاط بدون انتهاء صلاحية."
      : "Points that never expire.",
    faqKicker: "FAQ",
    faqTitle: isRTL ? "الأسئلة." : "Questions.",
    ctaTitle: isRTL ? "جاهز؟" : "Ready?",
    ctaSub: isRTL ? "50 نقطة مجانية بدون بطاقة." : "50 free points. No card.",
    footTag: isRTL ? "صنع في الجزائر." : "Made in Algeria.",
    switchLang: isRTL ? "FR" : "AR",
    close: isRTL ? "إغلاق" : "Close",
    open: isRTL ? "قائمة" : "Menu",
    back: isRTL ? "للأعلى" : "Top",
  };

  const nav = [
    { href: "#voices", label: t.navWork },
    { href: "#process", label: t.navHow },
    { href: "#pricing", label: t.navPricing },
    { href: "#faq", label: t.navFaq },
  ];

  const steps = [
    { n: "1", t: t.step1t, d: t.step1d, color: "#A78BFA" },
    { n: "2", t: t.step2t, d: t.step2d, color: "#818CF8" },
    { n: "3", t: t.step3t, d: t.step3d, color: "#6366F1" },
  ];

  const voices = [
    { id: "amin", name: "Amin", tag: isRTL ? "تجاري" : "Commercial", duration: "0:24", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", color: "#A78BFA" },
    { id: "yasmine", name: "Yasmine", tag: isRTL ? "إعلاني" : "Ads", duration: "0:18", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", color: "#F472B6" },
    { id: "khalid", name: "Khalid", tag: isRTL ? "وثائقي" : "Documentary", duration: "0:31", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", color: "#34D399" },
    { id: "layla", name: "Layla", tag: isRTL ? "سوشيال" : "Social", duration: "0:22", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3", color: "#FBBF24" },
  ];

  const metrics = [
    { n: 12, s: "+", l: isRTL ? "صوت" : "Voices" },
    { n: 1200, s: "+", l: isRTL ? "مستخدم" : "Users" },
    { n: 98, s: "%", l: isRTL ? "رضا" : "Happy" },
    { n: 30, s: "s", l: isRTL ? "إنتاج" : "Gen" },
  ];

  const testimonials = isRTL
    ? [
        { q: "Sawtify غيّرت طريقة خدمتي. جودة الاستوديو في 30 ثانية.", n: "أمين ب.", r: "كرييتور، الجزائر" },
        { q: "الزبائن ما يحسّوش أن الصوت اصطناعي. هذا اللي يهمّني.", n: "ياسمين ق.", r: "وكالة، وهران" },
        { q: "أحسن استثمار لقيتو. الدفع بالذهبية سهّل كلش.", n: "خالد م.", r: "إيكومرس، قسنطينة" },
      ]
    : [
        { q: "Sawtify changed my workflow. Studio quality in 30 seconds.", n: "Amine B.", r: "Creator, Alger" },
        { q: "Clients don't notice it's AI. That's all I need.", n: "Yasmine K.", r: "Agency, Oran" },
        { q: "Best investment. Edahabia payment is a game-changer.", n: "Khaled M.", r: "E-com, Constantine" },
      ];

  useEffect(() => {
    const id = setInterval(() => setActiveTesti((p) => (p + 1) % testimonials.length), 6500);
    return () => clearInterval(id);
  }, [testimonials.length]);

  const pricing = [
    { pts: "100", price: "500" },
    { pts: "220", price: "1 000", featured: true },
    { pts: "600", price: "2 500" },
    { pts: "1 350", price: "5 000" },
  ];

  const faqs = isRTL
    ? [
        { q: "هل الأصوات تجارية؟", a: "نعم. استخدامها حر تماماً." },
        { q: "كيف تشتغل النقاط؟", a: "تشتري مرة، تستعمل دائماً. توليد = 20 نقطة." },
        { q: "الذهبية و CIB؟", a: "نعم، عبر SATIM." },
        { q: "وقت التوليد؟", a: "أقل من 30 ثانية." },
        { q: "تجربة مجانية؟", a: "50 نقطة عند التسجيل." },
      ]
    : [
        { q: "Commercial use?", a: "Yes. 100% royalty-free." },
        { q: "How do points work?", a: "Buy once, keep forever. 1 gen = 20 pts." },
        { q: "Edahabia & CIB?", a: "Yes, via SATIM." },
        { q: "Generation time?", a: "Under 30 seconds." },
        { q: "Free trial?", a: "50 points on signup." },
      ];

  const toggleVoice = (id: string, url: string) => {
    if (playingId === id) { audioRef.current?.pause(); setPlayingId(null); return; }
    audioRef.current?.pause();
    const audio = new Audio(); audio.src = url; audioRef.current = audio;
    audio.play().catch(() => setPlayingId(null));
    audio.onended = () => setPlayingId(null);
    setPlayingId(id);
  };

  const smoothTo = useCallback((href: string) => {
    setMenuOpen(false);
    const el = document.querySelector(href);
    if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" });
  }, []);

  const sans = isRTL ? "'Noto Kufi Arabic', sans-serif" : "'Archivo', sans-serif";
  const display = isRTL ? "'Noto Kufi Arabic', sans-serif" : "'Archivo Black', sans-serif";

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen text-[#F4F1FF] relative" style={{ fontFamily: sans }}>
      <GlobalStyles />

      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[#0A0612]" />
        <div
          className="absolute aurora-1"
          style={{ width: 700, height: 700, top: "-20%", left: "-10%", background: "radial-gradient(circle, #7C3AED 0%, transparent 70%)", opacity: 0.3, filter: "blur(80px)", borderRadius: "50%" }}
        />
        <div
          className="absolute aurora-2"
          style={{ width: 600, height: 600, bottom: "-15%", right: "-10%", background: "radial-gradient(circle, #A78BFA 0%, transparent 70%)", opacity: 0.25, filter: "blur(80px)", borderRadius: "50%" }}
        />
      </div>

      <motion.div
        aria-hidden="true"
        className="fixed top-0 inset-x-0 h-[3px] z-[60]"
        style={{
          scaleX: scrollYProgress,
          background: "linear-gradient(90deg, #A78BFA, #DDD6FE)",
          transformOrigin: isRTL ? "right" : "left",
        }}
      />

      {/* HEADER */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${scrolled ? "bg-[#0A0612]/80 backdrop-blur-xl border-b border-white/5" : ""}`}>
        <div className="mx-auto max-w-[1400px] px-6 h-16 flex items-center justify-between">
          <a href="#home" onClick={(e) => { e.preventDefault(); smoothTo("#home"); }} className="flex items-center gap-2.5 focus-ring">
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-gradient-to-br from-[#A78BFA] to-[#7C3AED] flex items-center justify-center">
              <img src={LOGO_URL} alt="" className="w-full h-full object-cover" />
            </div>
            <span className="font-black text-[16px] tracking-tight">Sawtify</span>
          </a>

          <nav className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-7 text-[13px] font-medium text-white/60">
            {nav.map((l) => (
              <a key={l.href} href={l.href} onClick={(e) => { e.preventDefault(); smoothTo(l.href); }} className="hover:text-white transition-colors focus-ring">
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button onClick={() => setLanguage(language === "fr" ? "ar" : "fr")} className="w-9 h-9 rounded-lg border border-white/10 text-[11px] font-mono font-bold text-white/60 hover:text-white hover:border-[#A78BFA] transition focus-ring">
              {t.switchLang}
            </button>
            <button onClick={onLoginClick} className="hidden md:block text-[13px] font-medium text-white/70 hover:text-white px-3 focus-ring">
              {t.signin}
            </button>
            <Magnetic strength={0.2}>
              <button onClick={onSigninClick} className="group h-10 px-5 bg-white text-[#0A0612] text-[13px] font-bold rounded-full flex items-center gap-2 hover:bg-[#A78BFA] transition focus-ring">
                {t.tryFree}
                <ArrowIcon className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </Magnetic>
            <button onClick={() => setMenuOpen(true)} aria-label={t.open} className="md:hidden w-10 h-10 rounded-lg border border-white/10 flex items-center justify-center focus-ring">
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE DRAWER */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenuOpen(false)} className="fixed inset-0 z-[55] bg-black/70 md:hidden" />
            <motion.div
              initial={{ x: isRTL ? "-100%" : "100%" }} animate={{ x: 0 }} exit={{ x: isRTL ? "-100%" : "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 280 }}
              className="fixed inset-y-0 end-0 z-[60] w-[85%] max-w-sm bg-[#0A0612] border-s border-white/10 md:hidden flex flex-col"
            >
              <div className="flex items-center justify-between px-5 h-16 border-b border-white/10">
                <span className="font-black">Sawtify</span>
                <button onClick={() => setMenuOpen(false)} className="w-9 h-9 rounded-lg border border-white/10 flex items-center justify-center focus-ring">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <nav className="flex-1 px-5 py-6 flex flex-col gap-1">
                {nav.map((l) => (
                  <a key={l.href} href={l.href} onClick={(e) => { e.preventDefault(); smoothTo(l.href); }} className="py-4 text-[18px] font-bold border-b border-white/5 focus-ring">
                    {l.label}
                  </a>
                ))}
              </nav>
              <div className="p-5 space-y-2">
                <button onClick={() => { setMenuOpen(false); onSigninClick(); }} className="w-full h-12 rounded-full bg-white text-[#0A0612] font-bold">
                  {t.start}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* HERO */}
      <section id="home" className="relative pt-32 sm:pt-40 pb-20 overflow-hidden">
        <div className="mx-auto max-w-[1400px] px-6">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7">
              <Reveal>
                <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03]">
                  <span className="relative flex w-1.5 h-1.5">
                    <span className="absolute inset-0 rounded-full bg-emerald-400 pulse-dot" />
                    <span className="relative rounded-full w-1.5 h-1.5 bg-emerald-400" />
                  </span>
                  <span className="text-[10px] font-mono font-bold tracking-widest text-white/80">{t.liveBadge}</span>
                </div>
              </Reveal>

              <Reveal delay={0.1}>
                <p className="text-[11px] font-mono font-bold tracking-[0.2em] text-[#A78BFA] mb-5">// {t.heroKicker}</p>
              </Reveal>

              <Reveal delay={0.15}>
                <h1
                  className="text-[clamp(2.75rem,8.5vw,7rem)] leading-[0.9] tracking-[-0.04em] text-white"
                  style={{ fontFamily: display }}
                >
                  {t.heroTitle1}
                  <br />
                  <span className="text-shimmer">{t.heroTitle2}</span>
                </h1>
              </Reveal>

              <Reveal delay={0.25}>
                <div className="mt-8 max-w-md">
                  <div className="font-mono text-[12px] text-white/40 mb-2">$ sawtify generate</div>
                  <div className="text-[15px] text-white/80 min-h-[24px]" style={{ fontFamily: isRTL ? sans : "'IBM Plex Mono', monospace" }}>
                    {typedText}
                    <span className="inline-block w-2 h-4 bg-[#A78BFA] ms-1 align-middle blink" />
                  </div>
                </div>
              </Reveal>

              <Reveal delay={0.35}>
                <p className="mt-6 text-[15px] text-white/55 max-w-md">{t.heroSub}</p>
              </Reveal>

              <Reveal delay={0.45}>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Magnetic>
                    <button onClick={onSigninClick} className="group h-12 px-6 bg-white text-[#0A0612] text-[14px] font-bold rounded-full flex items-center gap-2 hover:bg-[#A78BFA] transition focus-ring">
                      {t.tryFree}
                      <ArrowIcon className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </Magnetic>
                  <button onClick={() => smoothTo("#voices")} className="group h-12 px-5 rounded-full border border-white/15 hover:border-[#A78BFA] text-white text-[14px] font-medium flex items-center gap-2.5 transition focus-ring">
                    <span className="w-7 h-7 rounded-full bg-[#A78BFA] text-[#0A0612] flex items-center justify-center">
                      <Play className="w-2.5 h-3 fill-current" />
                    </span>
                    {t.listenDemo}
                  </button>
                </div>
              </Reveal>

              <Reveal delay={0.55}>
                <div className="mt-10 flex items-center gap-6 text-[11px] font-mono text-white/40">
                  <div className="flex -space-x-1.5">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="w-6 h-6 rounded-full border-2 border-[#0A0612]" style={{ background: ["#A78BFA", "#818CF8", "#6366F1", "#7C3AED"][i] }} />
                    ))}
                  </div>
                  <span>1 200+ creators</span>
                  <span>·</span>
                  <span>★ 4.9</span>
                </div>
              </Reveal>
            </div>

            <div className="lg:col-span-5">
              <Reveal delay={0.3}>
                <div className="relative">
                  <HeroVisual />
                  <div className="absolute top-[20%] -start-6 sm:-start-12 bg-[#0A0612] border border-white/10 rounded-2xl px-4 py-3 float glow-sm">
                    <div className="text-[10px] font-mono text-white/40">GENERATION</div>
                    <div className="text-[20px] font-black text-white" style={{ fontFamily: display }}>~30s</div>
                  </div>
                  <div className="absolute bottom-[15%] -end-6 sm:-end-12 bg-[#0A0612] border border-white/10 rounded-2xl px-4 py-3 float-slow glow-sm" style={{ animationDelay: "2s" }}>
                    <div className="text-[10px] font-mono text-white/40">QUALITY</div>
                    <div className="text-[20px] font-black text-[#A78BFA]" style={{ fontFamily: display }}>24 kHz</div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <section className="py-8 border-y border-white/5 overflow-hidden bg-black/30">
        <div className="relative">
          <div className="absolute inset-y-0 start-0 w-24 bg-gradient-to-r from-[#0A0612] to-transparent z-10" />
          <div className="absolute inset-y-0 end-0 w-24 bg-gradient-to-l from-[#0A0612] to-transparent z-10" />
          <div className="marquee-track">
            {[0, 1].map((dup) => (
              <div key={dup} className="flex items-center gap-12 px-6 shrink-0">
                {["Edahabia", "CIB", "SATIM", "MP3 / WAV", "24 kHz", "Made in Algeria", "API v2.1", "★ 4.9", "1 200+ users"].map((s, i) => (
                  <span key={i} className="flex items-center gap-12 text-[13px] font-mono font-bold text-white/50 whitespace-nowrap">
                    {s}
                    <span className="w-1.5 h-1.5 rounded-full bg-[#A78BFA]" />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROCESS */}
      <section id="process" className="py-24 sm:py-32 relative">
        <div className="mx-auto max-w-[1400px] px-6">
          <Reveal>
            <p className="text-[11px] font-mono font-bold tracking-[0.2em] text-[#A78BFA] mb-5">// {t.processKicker}</p>
            <h2 className="text-[clamp(2.5rem,6vw,4.5rem)] leading-[0.95] tracking-[-0.03em] text-white mb-4" style={{ fontFamily: display }}>
              {t.processTitle}
            </h2>
            <p className="text-[15px] text-white/55 max-w-md mb-16">{t.processSub}</p>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-4">
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.1}>
                <div className="group relative bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-white/10 rounded-3xl p-8 transition-all duration-500">
                  <div className="flex items-start justify-between mb-12">
                    <StepIcon num={s.n} color={s.color} />
                    {/* ✅ ArrowUpRight maintenant correctement importé */}
                    <ArrowUpRight className="w-5 h-5 text-white/20 group-hover:text-[#A78BFA] group-hover:rotate-45 transition-all duration-500" />
                  </div>
                  <h3 className="text-[28px] tracking-[-0.02em] text-white mb-3" style={{ fontFamily: display }}>
                    {s.t}
                  </h3>
                  <p className="text-[13px] leading-[1.6] text-white/55">{s.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* VOICES */}
      <section id="voices" className="py-24 sm:py-32 relative">
        <div className="mx-auto max-w-[1400px] px-6">
          <div className="grid lg:grid-cols-12 gap-8 mb-16 items-end">
            <Reveal className="lg:col-span-7">
              <p className="text-[11px] font-mono font-bold tracking-[0.2em] text-[#A78BFA] mb-5">// {t.voicesKicker}</p>
              <h2 className="text-[clamp(2.5rem,6vw,4.5rem)] leading-[0.95] tracking-[-0.03em] text-white" style={{ fontFamily: display }}>
                {t.voicesTitle}
              </h2>
            </Reveal>
            <Reveal delay={0.1} className="lg:col-span-4 lg:col-start-9">
              <p className="text-[14px] text-white/55">{t.voicesSub}</p>
            </Reveal>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {voices.map((v, idx) => {
              const active = playingId === v.id;
              return (
                <Reveal key={v.id} delay={idx * 0.05}>
                  <button
                    onClick={() => toggleVoice(v.id, v.url)}
                    aria-label={`${active ? "Pause" : "Play"} ${v.name}`}
                    className={`group relative w-full text-start rounded-2xl overflow-hidden border transition-all duration-500 ${
                      active ? "border-[#A78BFA] bg-white/[0.04] glow-md" : "border-white/5 hover:border-white/15 bg-white/[0.02] hover:bg-white/[0.04]"
                    } focus-ring`}
                  >
                    <div className="p-5">
                      <VoiceAvatar id={v.id} color={v.color} active={active} />
                    </div>
                    <div className="px-5 pb-5">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-[18px] font-black text-white tracking-tight">{v.name}</div>
                        <span className="text-[10px] font-mono text-white/40">{v.duration}</span>
                      </div>
                      <div className="text-[12px] text-white/50">{v.tag}</div>
                    </div>
                    {active && (
                      <div className="px-5 pb-5 flex items-end gap-[2px] h-10" dir="ltr">
                        {Array.from({ length: 24 }).map((_, i) => {
                          const h = 20 + Math.abs(Math.sin((i + idx) * 0.7)) * 80;
                          return (
                            <span
                              key={i}
                              className="flex-1 rounded-full wave-bar"
                              style={{ height: `${h}%`, maxWidth: 2, background: v.color, animationDelay: `${(i % 8) * 0.1}s` }}
                            />
                          );
                        })}
                      </div>
                    )}
                    <div className={`absolute top-7 end-7 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      active ? "bg-[#A78BFA] text-[#0A0612]" : "bg-white text-[#0A0612] opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
                    }`}>
                      {active ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ms-0.5" />}
                    </div>
                  </button>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* METRICS */}
      <section className="py-24 sm:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#1A0F2E]/40 to-transparent" />
        <div className="relative mx-auto max-w-[1400px] px-6">
          <Reveal>
            <p className="text-[11px] font-mono font-bold tracking-[0.2em] text-[#A78BFA] mb-5">// {t.metricsKicker}</p>
            <h2 className="text-[clamp(2.5rem,6vw,4.5rem)] leading-[0.95] tracking-[-0.03em] text-white mb-16" style={{ fontFamily: display }}>
              {t.metricsTitle}
            </h2>
          </Reveal>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-12 gap-x-6">
            {metrics.map((m, i) => (
              <Reveal key={m.l} delay={i * 0.08}>
                <div>
                  <div className="text-[clamp(3rem,7vw,5rem)] leading-none tracking-[-0.04em] text-white" style={{ fontFamily: display }}>
                    <Counter target={m.n} suffix={m.s} />
                  </div>
                  <div className="text-[12px] font-mono text-white/40 mt-3 uppercase tracking-wider">{m.l}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24 sm:py-32 relative">
        <div className="mx-auto max-w-[1400px] px-6">
          <Reveal>
            <p className="text-[11px] font-mono font-bold tracking-[0.2em] text-[#A78BFA] mb-5">// {t.testKicker}</p>
            <h2 className="text-[clamp(2.5rem,6vw,4.5rem)] leading-[0.95] tracking-[-0.03em] text-white mb-12" style={{ fontFamily: display }}>
              {t.testTitle}
            </h2>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="relative bg-white/[0.02] border border-white/5 rounded-3xl p-8 sm:p-12 min-h-[280px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTesti}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="flex gap-1 mb-6">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-[#A78BFA] text-[#A78BFA]" />
                    ))}
                  </div>
                  <blockquote className="text-[clamp(1.5rem,3.5vw,2.5rem)] leading-[1.2] tracking-[-0.02em] text-white" style={{ fontFamily: display }}>
                    "{testimonials[activeTesti].q}"
                  </blockquote>
                  <div className="mt-8 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#A78BFA] to-[#7C3AED] flex items-center justify-center font-black text-white text-[18px]">
                      {testimonials[activeTesti].n.charAt(0)}
                    </div>
                    <div>
                      <div className="text-[14px] font-bold text-white">{testimonials[activeTesti].n}</div>
                      <div className="text-[12px] text-white/50">{testimonials[activeTesti].r}</div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              <div className="absolute bottom-6 end-6 flex items-center gap-2">
                <button onClick={() => setActiveTesti((p) => (p - 1 + testimonials.length) % testimonials.length)} className="w-10 h-10 rounded-full border border-white/10 hover:border-[#A78BFA] flex items-center justify-center focus-ring">
                  {isRTL ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => setActiveTesti((p) => (p + 1) % testimonials.length)} className="w-10 h-10 rounded-full border border-white/10 hover:border-[#A78BFA] flex items-center justify-center focus-ring">
                  {isRTL ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24 sm:py-32 relative">
        <div className="mx-auto max-w-[1400px] px-6">
          <div className="grid lg:grid-cols-12 gap-8 mb-16">
            <Reveal className="lg:col-span-7">
              <p className="text-[11px] font-mono font-bold tracking-[0.2em] text-[#A78BFA] mb-5">// {t.pricingKicker}</p>
              <h2 className="text-[clamp(2.5rem,6vw,4.5rem)] leading-[0.95] tracking-[-0.03em] text-white" style={{ fontFamily: display }}>
                {t.pricingTitle}
              </h2>
            </Reveal>
            <Reveal delay={0.1} className="lg:col-span-4 lg:col-start-9 lg:mt-3">
              <p className="text-[14px] text-white/55">{t.pricingSub}</p>
            </Reveal>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {pricing.map((p, i) => (
              <Reveal key={p.pts} delay={i * 0.06}>
                <div className={`group relative p-7 h-full flex flex-col rounded-2xl border transition-all duration-500 hover:translate-y-[-4px] ${
                  p.featured ? "bg-gradient-to-br from-[#1A0F2E] to-[#0A0612] border-[#A78BFA]/30 glow-md" : "bg-white/[0.02] border-white/5 hover:border-white/15"
                }`}>
                  {p.featured && (
                    <div className="absolute -top-2 start-1/2 -translate-x-1/2 px-3 py-0.5 bg-[#A78BFA] text-[#0A0612] text-[9px] font-black tracking-widest rounded-full">
                      POPULAR
                    </div>
                  )}
                  <div className="text-[48px] leading-none tracking-[-0.03em] text-white mb-1" style={{ fontFamily: display }}>
                    <Num>{p.pts}</Num>
                  </div>
                  <div className="text-[11px] font-mono text-white/40 mb-6">POINTS</div>
                  <div className="h-px bg-white/10 mb-6" />
                  <ul className="space-y-2 mb-8 list-none flex-1">
                    {[isRTL ? "24 kHz جودة" : "24 kHz quality", "MP3 + WAV", isRTL ? "تجاري" : "Commercial", isRTL ? "بدون انتهاء" : "No expiry"].map((f) => (
                      <li key={f} className="flex items-center gap-2 text-[12px] text-white/65">
                        <Check className="w-3.5 h-3.5 text-[#A78BFA]" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-baseline gap-1.5 mb-5">
                    <div className="text-[26px] font-black text-white" style={{ fontFamily: display }}>
                      <Num>{p.price}</Num>
                    </div>
                    <span className="text-[11px] font-mono text-white/40">DZD</span>
                  </div>
                  <button onClick={onSigninClick} className={`h-11 rounded-full text-[13px] font-bold transition focus-ring ${
                    p.featured ? "bg-[#A78BFA] text-[#0A0612] hover:bg-white" : "bg-white text-[#0A0612] hover:bg-[#A78BFA]"
                  }`}>
                    {isRTL ? "اختر" : "Choose"}
                  </button>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 sm:py-32 relative">
        <div className="mx-auto max-w-[1400px] px-6">
          <div className="grid lg:grid-cols-12 gap-10">
            <Reveal className="lg:col-span-4">
              <p className="text-[11px] font-mono font-bold tracking-[0.2em] text-[#A78BFA] mb-5">// {t.faqKicker}</p>
              <h2 className="text-[clamp(2.5rem,6vw,4rem)] leading-[0.95] tracking-[-0.03em] text-white" style={{ fontFamily: display }}>
                {t.faqTitle}
              </h2>
            </Reveal>

            <div className="lg:col-span-7 lg:col-start-6">
              <div className="border-t border-white/10">
                {faqs.map((f, i) => {
                  const open = openFaq === i;
                  return (
                    <Reveal key={f.q} delay={i * 0.04}>
                      <div className="border-b border-white/10">
                        <button onClick={() => setOpenFaq(open ? null : i)} className="w-full py-5 flex items-center gap-4 text-start focus-ring group">
                          <span className="text-[10px] font-mono text-white/30 w-6 shrink-0">{String(i + 1).padStart(2, "0")}</span>
                          <span className="flex-1 text-[15px] font-medium text-white group-hover:text-[#A78BFA] transition-colors">{f.q}</span>
                          <Plus className={`w-4 h-4 text-white/40 transition-transform ${open ? "rotate-45 text-[#A78BFA]" : ""}`} />
                        </button>
                        <AnimatePresence initial={false}>
                          {open && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="overflow-hidden"
                            >
                              <p className="pb-5 ps-10 pe-4 text-[13px] text-white/55 leading-relaxed">{f.a}</p>
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

      {/* CTA */}
      <section className="py-32 sm:py-40 relative overflow-hidden">
        <div className="mx-auto max-w-[900px] px-6 text-center">
          <Reveal>
            <h2 className="text-[clamp(3rem,8vw,6rem)] leading-[0.9] tracking-[-0.04em] text-white" style={{ fontFamily: display }}>
              {t.ctaTitle}
            </h2>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="mt-6 text-[15px] text-white/55">{t.ctaSub}</p>
          </Reveal>
          <Reveal delay={0.25}>
            <Magnetic>
              <button onClick={onSigninClick} className="group mt-10 h-14 px-8 bg-white text-[#0A0612] text-[15px] font-black rounded-full inline-flex items-center gap-2 hover:bg-[#A78BFA] transition focus-ring">
                {t.start}
                <ArrowIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </Magnetic>
          </Reveal>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-10">
        <div className="mx-auto max-w-[1400px] px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg overflow-hidden bg-gradient-to-br from-[#A78BFA] to-[#7C3AED]">
              <img src={LOGO_URL} alt="" className="w-full h-full object-cover" />
            </div>
            <span className="font-black text-[14px]">Sawtify</span>
            <span className="text-[10px] font-mono text-white/30">v2.1</span>
          </div>
          <div className="text-[11px] font-mono text-white/40">
            © <Num>2026</Num> · {t.footTag} · SATIM · Edahabia · CIB
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
