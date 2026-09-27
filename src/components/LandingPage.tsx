import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import { Helmet } from "react-helmet-async";
import {
  ArrowRight,
  Play,
  Pause,
  Menu,
  X,
  Check,
  Star,
  Mic,
  Sparkles,
  Users,
  Zap,
  Volume2,
  Download,
  Clock,
  Award,
  Plus,
  Minus,
  SkipBack,
  SkipForward,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence, useInView } from "motion/react";

export interface LandingPageProps {
  onLoginClick: () => void;
  onSigninClick: () => void;
  language: "fr" | "ar";
  setLanguage: (lang: "fr" | "ar") => void;
}

/* ═══════════ DARK MODE PALETTE ═══════════ */
const BG_BLACK = "#000000";
const BG_ZINC_950 = "#09090B";
const BG_ZINC_900 = "#18181B";
const BG_CARD = "rgba(24, 24, 27, 0.5)";
const NEON_GREEN = "#00FF66";
const NEON_GREEN_GLOW = "rgba(0, 255, 102, 0.15)";
const TEXT_WHITE = "#FFFFFF";
const TEXT_ZINC_400 = "#A1A1AA";
const TEXT_ZINC_600 = "#52525B";
const BORDER_ZINC_700 = "#3F3F46";
const BORDER_ZINC_800 = "#27272A";

const HERO_IMAGE = "https://res.cloudinary.com/gz65ybug/image/upload/v1790474727/Gemini_Generated_Image_emb779emb779emb7.jpg";
const INTRO_AUDIO_URL = "https://res.cloudinary.com/gz65ybug/video/upload/v1789055318/Generated_Audio_September_10_2026_-_4_29PM.wav";
const AMINE_AUDIO = "https://res.cloudinary.com/gz65ybug/video/upload/v1789139928/AMINE.mp3";
const YASMINE_AUDIO = "https://res.cloudinary.com/gz65ybug/video/upload/v1789139890/YASMINE.mp3";
const KHALID_AUDIO = "https://res.cloudinary.com/gz65ybug/video/upload/v1789139847/KHALED.wav";

const LOGO = "https://i.ibb.co/nqShkPNP/68126702-75e5-4de6-9b53-e51800b05e4a.jpg";

const AR_STACK = "'Cairo', sans-serif";
const FR_STACK = "'Plus Jakarta Sans', 'Inter', sans-serif";
const FONTS_URL = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Cairo:wght@400;600;700;800;900&family=Inter:wght@400;500;600;700;800;900&display=swap";

/* ═══════════ GLOBAL STYLES ═══════════ */
const GlobalStyles = () => (
  <style>{`
    html { scroll-behavior: smooth; -webkit-font-smoothing: antialiased; }
    body { background: ${BG_ZINC_950}; color: ${TEXT_WHITE}; margin: 0; font-family: ${FR_STACK}; }
    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    ::selection { background: ${NEON_GREEN}; color: ${BG_BLACK}; }
    
    @keyframes marquee {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    
    @keyframes wave {
      0%, 100% { transform: scaleY(0.3); }
      50% { transform: scaleY(1); }
    }
    
    @keyframes pulse-glow {
      0%, 100% { box-shadow: 0 0 20px ${NEON_GREEN_GLOW}; }
      50% { box-shadow: 0 0 40px rgba(0, 255, 102, 0.3); }
    }
    
    .wave-bar {
      animation: wave 1.2s ease-in-out infinite;
      transform-origin: bottom;
    }
    
    .glass-dark {
      background: rgba(24, 24, 27, 0.8);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid ${BORDER_ZINC_700};
    }
    
    .neon-glow {
      animation: pulse-glow 3s ease-in-out infinite;
    }
    
    .marquee-container {
      display: flex;
      overflow: hidden;
      user-select: none;
    }
    
    .marquee-content {
      display: flex;
      animation: marquee 40s linear infinite;
      will-change: transform;
    }
    
    @media (prefers-reduced-motion: reduce) {
      html { scroll-behavior: auto; }
      *, *::before, *::after { animation-duration: 0.01ms !important; }
    }
  `}</style>
);

/* ═══════════ HOOKS ═══════════ */
function useScrolled(threshold = 50) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > threshold);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold]);
  return scrolled;
}

function useVoicePlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);

  const play = useCallback((id: string, url: string) => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.addEventListener("timeupdate", () => {
        if (audioRef.current && audioRef.current.duration > 0) {
          setProgress(audioRef.current.currentTime / audioRef.current.duration);
          setElapsed(audioRef.current.currentTime);
          setDuration(audioRef.current.duration);
        }
      });
      audioRef.current.addEventListener("ended", () => {
        setPlayingId(null);
        setProgress(0);
        setElapsed(0);
      });
    }
    audioRef.current.pause();
    audioRef.current.src = url;
    audioRef.current.play().then(() => setPlayingId(id)).catch(() => setPlayingId(null));
  }, []);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    setPlayingId(null);
    setProgress(0);
    setElapsed(0);
  }, []);

  const toggle = useCallback((id: string, url: string) => {
    if (playingId === id) stop();
    else play(id, url);
  }, [playingId, play, stop]);

  return { playingId, progress, elapsed, duration, toggle, stop };
}

/* ═══════════ COMPONENTS ═══════════ */
const Logo = ({ size = 36 }: { size?: number }) => {
  const [err, setErr] = useState(false);
  return (
    <div className="flex items-center gap-2.5 select-none">
      <div
        className="rounded-2xl overflow-hidden shrink-0"
        style={{ width: size, height: size, boxShadow: `0 0 15px ${NEON_GREEN_GLOW}` }}
      >
        {!err ? (
          <img src={LOGO} alt="Sawtify" width={size} height={size} onError={() => setErr(true)} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-bold" style={{ background: NEON_GREEN, color: BG_BLACK, fontSize: size * 0.5 }}>S</div>
        )}
      </div>
      <span className="font-extrabold text-[18px] tracking-tight text-white">Sawtify</span>
    </div>
  );
};

const AnimatedSection = ({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.8, type: "spring", bounce: 0.4, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const WaveBar = ({ height, delay }: { height: number; delay: number }) => (
  <div
    className="wave-bar w-1 rounded-full"
    style={{ height: `${height}%`, background: NEON_GREEN, animationDelay: `${delay}s` }}
  />
);

const AudioWidget = ({ playing }: { playing: boolean }) => (
  <div className="glass-dark p-6 rounded-[32px] shadow-2xl neon-glow" style={{ maxWidth: 320 }}>
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: NEON_GREEN }}>
        <Mic className="w-5 h-5" style={{ color: BG_BLACK }} />
      </div>
      <div>
        <p className="text-sm font-bold text-white">Génération en cours...</p>
        <p className="text-xs" style={{ color: TEXT_ZINC_400 }}>Daridja Algérienne</p>
      </div>
    </div>
    <div className="flex items-end justify-center gap-1 h-16">
      {Array.from({ length: 20 }).map((_, i) => (
        <WaveBar key={i} height={20 + Math.random() * 80} delay={i * 0.05} />
      ))}
    </div>
  </div>
);

const PricingSlider = () => {
  const [words, setWords] = useState(5000);
  const price = Math.round((words / 1000) * 2.5);
  return (
    <div className="p-10 rounded-[32px] shadow-2xl" style={{ background: NEON_GREEN }}>
      <h3 className="text-2xl font-bold mb-6" style={{ color: BG_BLACK }}>
        <span className="text-6xl font-extrabold">{price} DZD</span> / mois
      </h3>
      <div className="mb-6">
        <label className="block text-sm font-semibold mb-3" style={{ color: BG_BLACK }}>
          Nombre de mots : {words.toLocaleString()}
        </label>
        <input
          type="range"
          min="1000"
          max="50000"
          step="1000"
          value={words}
          onChange={(e) => setWords(Number(e.target.value))}
          className="w-full h-3 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${BG_BLACK} 0%, ${BG_BLACK} ${(words / 50000) * 100}%, rgba(0,0,0,0.2) ${(words / 50000) * 100}%, rgba(0,0,0,0.2) 100%)`,
          }}
        />
      </div>
      <ul className="space-y-3 mb-8">
        {["30 voix algériennes", "Génération instantanée", "Support prioritaire"].map((item, i) => (
          <li key={i} className="flex items-center gap-2 text-sm font-semibold" style={{ color: BG_BLACK }}>
            <Check className="w-5 h-5" />
            {item}
          </li>
        ))}
      </ul>
      <button className="w-full py-4 rounded-full font-bold text-white transition hover:opacity-90" style={{ background: BG_BLACK }}>
        Commencer maintenant
      </button>
    </div>
  );
};

const FAQItem = ({ q, a }: { q: string; a: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b pb-6" style={{ borderColor: BORDER_ZINC_800 }}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-4 text-left">
        <span className="text-lg font-bold" style={{ color: NEON_GREEN }}>{q}</span>
        {open ? <Minus className="w-6 h-6" style={{ color: NEON_GREEN }} /> : <Plus className="w-6 h-6" style={{ color: NEON_GREEN }} />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <p className="text-base leading-relaxed" style={{ color: TEXT_ZINC_400 }}>{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const VoiceTestCard = ({ name, role, audioUrl, player }: { name: string; role: string; audioUrl: string; player: any }) => {
  const playing = player.playingId === audioUrl;
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="p-6 rounded-[32px] border"
      style={{ background: BG_CARD, borderColor: BORDER_ZINC_800 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="font-bold text-white">{name}</h4>
          <p className="text-sm" style={{ color: TEXT_ZINC_400 }}>{role}</p>
        </div>
        <button
          onClick={() => player.toggle(audioUrl, audioUrl)}
          className="w-12 h-12 rounded-full flex items-center justify-center transition hover:scale-110"
          style={{ background: NEON_GREEN }}
        >
          {playing ? <Pause className="w-5 h-5" style={{ color: BG_BLACK }} /> : <Play className="w-5 h-5" style={{ color: BG_BLACK }} />}
        </button>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: BORDER_ZINC_800 }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: NEON_GREEN, width: `${playing ? player.progress * 100 : 0}%` }}
          transition={{ duration: 0.2 }}
        />
      </div>
    </motion.div>
  );
};

/* ═══════════ MAIN COMPONENT ═══════════ */
export const LandingPage: React.FC<LandingPageProps> = ({
  onLoginClick,
  onSigninClick,
  language,
  setLanguage,
}) => {
  const isRTL = language === "ar";
  const [menuOpen, setMenuOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const scrolled = useScrolled();
  const player = useVoicePlayer();

  const bootRef = useRef(false);
  useLayoutEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem("sawtify_lang");
    } catch {}
    const target = saved === "fr" || saved === "ar" ? saved : "fr";
    if (target !== language) setLanguage(target);
  }, [language, setLanguage]);

  const switchLang = useCallback(() => {
    const next = language === "fr" ? "ar" : "fr";
    try {
      window.localStorage.setItem("sawtify_lang", next);
    } catch {}
    setLanguage(next);
  }, [language, setLanguage]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
  }, [language, isRTL]);

  const t = useMemo(
    () => ({
      heroTitle: isRTL ? "صوّت محتواك بالدارجة الجزائرية" : "Générez la voix de vos contenus",
      heroSub: isRTL
        ? "أول منصة ذكاء اصطناعي للدارجة الجزائرية. جودة استوديو في 30 ثانية."
        : "Première plateforme IA en darija algérienne. Qualité studio en 30 secondes.",
      signup: isRTL ? "إنشاء حساب" : "Sign up",
      signin: isRTL ? "تسجيل الدخول" : "Se connecter",
      features: isRTL ? "المميزات" : "Fonctionnalités",
      pricing: isRTL ? "الأسعار" : "Tarifs",
      faq: isRTL ? "أسئلة شائعة" : "FAQ",
      joined: isRTL ? "انضم إلينا +500 مبدع" : "Rejoint par +500 créateurs",
      transparent: isRTL ? "سعر شفاف. بدون رسوم خفية." : "Un tarif transparent. Pas de frais cachés.",
      faqTitle: isRTL ? "الأسئلة الشائعة" : "Questions Fréquentes",
      experts: isRTL ? "تحدث مع خبرائنا" : "Speak to our experts",
      testVoices: isRTL ? "اختبر أصواتنا" : "Testez nos voix",
    }),
    [isRTL]
  );

  const nav = [
    { label: t.features, href: "#features" },
    { label: t.pricing, href: "#pricing" },
    { label: t.faq, href: "#faq" },
  ];

  const logos = ["Google Gemini", "TikTok", "YouTube", "Instagram", "Meta"];

  const faqs = isRTL
    ? [
        { q: "ما هو Sawtify؟", a: "منصة لتحويل النص إلى صوت بالدارجة الجزائرية باستخدام الذكاء الاصطناعي." },
        { q: "كم من الوقت يستغرق؟", a: "أقل من دقيقة لتوليد صوت احترافي بجودة استوديو." },
        { q: "هل يمكنني استخدامه تجاريًا؟", a: "نعم، جميع الأصوات مرخصة للاستخدام التجاري الكامل." },
        { q: "كيف يتم الدفع؟", a: "نقبل Edahabia و CIB عبر SATIM. بالدينار الجزائري." },
      ]
    : [
        { q: "Qu'est-ce que Sawtify ?", a: "Plateforme de conversion texte-voix en darija algérienne avec IA." },
        { q: "Combien de temps ça prend ?", a: "Moins d'une minute pour générer une voix professionnelle." },
        { q: "Usage commercial autorisé ?", a: "Oui, toutes les voix sont sous licence commerciale complète." },
        { q: "Modes de paiement ?", a: "Edahabia & CIB via SATIM. En dinars algériens." },
      ];

  const voices = [
    { name: "Amine", role: "Voix commerciale", audioUrl: AMINE_AUDIO },
    { name: "Yasmine", role: "Voix publicitaire", audioUrl: YASMINE_AUDIO },
    { name: "Khalid", role: "Voix documentaire", audioUrl: KHALID_AUDIO },
  ];

  return (
    <div dir={isRTL ? "rtl" : "ltr"} style={{ fontFamily: isRTL ? AR_STACK : FR_STACK }}>
      <GlobalStyles />
      <Helmet>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONTS_URL} />
        <title>Sawtify — {t.heroTitle}</title>
        <meta name="description" content={t.heroSub} />
      </Helmet>

      {/* ═══════════ NAVBAR ═══════════ */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "backdrop-blur-md" : ""}`}
        style={{ background: scrolled ? "rgba(9, 9, 11, 0.7)" : "transparent", padding: "1rem 2rem" }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Logo size={36} />

          <nav className="hidden lg:flex items-center gap-8">
            {nav.map((item) => (
              <a key={item.href} href={item.href} className="text-sm font-semibold hover:text-white transition" style={{ color: TEXT_ZINC_400 }}>
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <button
              onClick={switchLang}
              className="text-sm font-semibold px-4 py-2 rounded-full hover:bg-zinc-800 transition"
              style={{ color: TEXT_ZINC_400, border: `1px solid ${BORDER_ZINC_800}` }}
            >
              {isRTL ? "FR" : "ع"}
            </button>
            <button onClick={onLoginClick} className="hidden md:block text-sm font-semibold hover:text-white transition" style={{ color: TEXT_ZINC_400 }}>
              {t.signin}
            </button>
            <button onClick={onSigninClick} className="px-6 py-2.5 rounded-full text-sm font-bold transition hover:scale-105" style={{ background: TEXT_WHITE, color: BG_BLACK }}>
              {t.signup}
            </button>
            <button onClick={() => setMenuOpen(true)} className="lg:hidden text-white">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* ═══════════ MOBILE MENU ═══════════ */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenuOpen(false)} className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm" />
            <motion.div
              initial={{ x: isRTL ? "-100%" : "100%" }}
              animate={{ x: 0 }}
              exit={{ x: isRTL ? "-100%" : "100%" }}
              className="fixed inset-y-0 end-0 z-[70] w-80 p-6"
              style={{ background: BG_ZINC_900 }}
            >
              <button onClick={() => setMenuOpen(false)} className="mb-8 text-white">
                <X className="w-6 h-6" />
              </button>
              <nav className="flex flex-col gap-6">
                {nav.map((item) => (
                  <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className="text-lg font-bold text-white hover:text-emerald-400">
                    {item.label}
                  </a>
                ))}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${HERO_IMAGE})`,
            filter: "brightness(0.4) contrast(1.2)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to top, ${BG_ZINC_950} 0%, rgba(9, 9, 11, 0.8) 50%, transparent 100%)`,
          }}
        />
        <div className="relative z-10 text-center px-6 max-w-4xl">
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
            className="text-5xl md:text-7xl font-extrabold leading-tight mb-6 tracking-tight"
            style={{ color: TEXT_WHITE, textShadow: `0 0 30px ${NEON_GREEN_GLOW}` }}
          >
            {t.heroTitle}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl md:text-2xl mb-8"
            style={{ color: TEXT_ZINC_400 }}
          >
            {t.heroSub}
          </motion.p>
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            onClick={onSigninClick}
            className="px-10 py-4 rounded-full text-lg font-bold transition hover:scale-105"
            style={{ background: NEON_GREEN, color: BG_BLACK }}
          >
            {t.signup} →
          </motion.button>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="absolute bottom-10 right-10 hidden lg:block"
        >
          <AudioWidget playing={playing} />
        </motion.div>
      </section>

      {/* ═══════════ SOCIAL PROOF ═══════════ */}
      <AnimatedSection>
        <div className="py-12" style={{ background: BG_ZINC_950 }}>
          <p className="text-center mb-6 text-sm font-semibold" style={{ color: TEXT_ZINC_600 }}>{t.joined}</p>
          <div className="marquee-container">
            <div className="marquee-content">
              {[...logos, ...logos].map((logo, i) => (
                <div key={i} className="flex items-center justify-center px-12" style={{ color: TEXT_ZINC_600, fontSize: "1.5rem", fontWeight: 700, filter: "grayscale(100%)", opacity: 0.5 }}>
                  {logo}
                </div>
              ))}
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* ═══════════ VOICE TESTS ═══════════ */}
      <AnimatedSection>
        <section className="py-24 px-6" style={{ background: BG_BLACK }}>
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl md:text-6xl font-extrabold text-center mb-4 tracking-tight text-white">{t.testVoices}</h2>
            <p className="text-center mb-12 text-xl" style={{ color: TEXT_ZINC_400 }}>Écoutez nos 3 voix les plus populaires</p>
            <div className="grid md:grid-cols-3 gap-6">
              {voices.map((voice, i) => (
                <AnimatedSection key={i} delay={i * 0.2}>
                  <VoiceTestCard {...voice} player={player} />
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>
      </AnimatedSection>

      {/* ═══════════ BENTO GRID ═══════════ */}
      <AnimatedSection>
        <section id="features" className="py-24 px-6" style={{ background: BG_BLACK }}>
          <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl md:text-6xl font-extrabold text-center mb-16 tracking-tight text-white">Génération instantanée</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <motion.div
                whileHover={{ y: -4, boxShadow: `0 0 15px ${NEON_GREEN_GLOW}` }}
                className="md:col-span-2 p-10 rounded-[32px] border"
                style={{ background: BG_CARD, borderColor: BORDER_ZINC_800 }}
              >
                <h3 className="text-3xl font-bold mb-4 text-white">Interface Simple</h3>
                <p className="text-lg mb-6" style={{ color: TEXT_ZINC_400 }}>Collez votre texte, choisissez une voix, téléchargez en MP3.</p>
                <div className="h-48 rounded-2xl" style={{ background: BG_ZINC_900 }} />
              </motion.div>

              <motion.div
                whileHover={{ y: -4, boxShadow: `0 0 15px ${NEON_GREEN_GLOW}` }}
                className="p-10 rounded-[32px] border flex flex-col items-center justify-center text-center"
                style={{ background: BG_CARD, borderColor: BORDER_ZINC_800 }}
              >
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 neon-glow" style={{ background: NEON_GREEN }}>
                  <Zap className="w-8 h-8" style={{ color: BG_BLACK }} />
                </div>
                <h3 className="text-2xl font-bold text-white">30 secondes</h3>
                <p className="text-sm mt-2" style={{ color: TEXT_ZINC_400 }}>Génération ultra-rapide</p>
              </motion.div>

              <motion.div
                whileHover={{ y: -4, boxShadow: `0 0 15px ${NEON_GREEN_GLOW}` }}
                className="p-10 rounded-[32px] border"
                style={{ background: BG_CARD, borderColor: BORDER_ZINC_800 }}
              >
                <h3 className="text-2xl font-bold mb-4 text-white">30 Voix</h3>
                <p className="text-lg" style={{ color: TEXT_ZINC_400 }}>Hommes, femmes. Commercial, documentaire, social media.</p>
              </motion.div>

              <motion.div
                whileHover={{ y: -4, boxShadow: `0 0 15px ${NEON_GREEN_GLOW}` }}
                className="md:col-span-2 p-10 rounded-[32px] border"
                style={{ background: BG_CARD, borderColor: BORDER_ZINC_800 }}
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: NEON_GREEN }}>
                    <Check className="w-6 h-6" style={{ color: BG_BLACK }} />
                  </div>
                  <h3 className="text-2xl font-bold text-white">Usage Commercial Complet</h3>
                </div>
                <p className="text-lg" style={{ color: TEXT_ZINC_400 }}>Utilisez vos audios pour YouTube, TikTok, publicités, podcasts. Sans restriction.</p>
              </motion.div>
            </div>
          </div>
        </section>
      </AnimatedSection>

      {/* ═══════════ PRICING ═══════════ */}
      <AnimatedSection>
        <section id="pricing" className="py-24 px-6" style={{ background: BG_ZINC_950 }}>
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight text-white">{t.transparent}</h2>
              <p className="text-xl" style={{ color: TEXT_ZINC_400 }}>Payez uniquement pour ce que vous utilisez. Pas d'abonnement caché. Points valables à vie.</p>
            </div>
            <PricingSlider />
          </div>
        </section>
      </AnimatedSection>

      {/* ═══════════ FAQ ═══════════ */}
      <AnimatedSection>
        <section id="faq" className="py-24 px-6" style={{ background: BG_BLACK }}>
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-5xl md:text-6xl font-extrabold mb-6 tracking-tight" style={{ color: NEON_GREEN }}>{t.faqTitle}</h2>
            </div>
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <FAQItem key={i} q={faq.q} a={faq.a} />
              ))}
            </div>
          </div>
        </section>
      </AnimatedSection>

      {/* ═══════════ CTA ═══════════ */}
      <AnimatedSection>
        <section className="py-32 px-6" style={{ background: BG_ZINC_950 }}>
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-5xl md:text-7xl font-extrabold mb-8 tracking-tight text-white">{t.experts}</h2>
            <button
              onClick={onSigninClick}
              className="px-10 py-5 rounded-full text-lg font-bold transition hover:scale-105 flex items-center gap-3 mx-auto"
              style={{ background: "transparent", border: `2px solid ${NEON_GREEN}`, color: NEON_GREEN }}
            >
              Commencer gratuitement
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </section>
      </AnimatedSection>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer style={{ background: BG_ZINC_950 }} className="py-16 px-6 border-t" style={{ borderColor: BORDER_ZINC_800 }}>
        <div className="max-w-7xl mx-auto text-center">
          <Logo size={40} />
          <div className="flex items-center justify-center gap-6 mt-6 text-sm" style={{ color: TEXT_ZINC_600 }}>
            <a href="#" className="hover:text-white transition">Conditions</a>
            <a href="#" className="hover:text-white transition">Confidentialité</a>
            <a href="#" className="hover:text-white transition">Contact</a>
          </div>
          <p className="mt-4 text-sm" style={{ color: TEXT_ZINC_600 }}>© 2026 Sawtify. Made in Algeria 🇩🇿</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
