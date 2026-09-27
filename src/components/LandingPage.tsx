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
  ArrowLeft,
  Play,
  Pause,
  Plus,
  Menu,
  X,
  Check,
  Star,
  ShoppingBag,
  Clapperboard,
  Mic2,
  Phone,
  ShieldCheck,
  Gift,
  SkipBack,
  SkipForward,
  Lock,
  Crown,
  Mic,
  Sparkles,
  Users,
  Zap,
  Globe,
  Headphones,
  ChevronRight,
  Volume2,
  MessageSquare,
  FileAudio,
  Download,
  CreditCard,
  Clock,
  Award,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface LandingPageProps {
  onLoginClick: () => void;
  onSigninClick: () => void;
  language: "fr" | "ar";
  setLanguage: (lang: "fr" | "ar") => void;
}

/* ═══════════ PALETTE DARK ═══════════ */
const BG_DARK = "#06060e";
const BG_CARD = "#0e0e1a";
const BG_CARD_HOVER = "#14142a";
const PURPLE = "#8B5CF6";
const PURPLE_LIGHT = "#A78BFA";
const PURPLE_GLOW = "rgba(139,92,246,0.35)";
const PURPLE_SOFT = "rgba(139,92,246,0.08)";
const VIOLET = "#7C3AED";
const PINK = "#EC4899";
const TEXT_PRIMARY = "#F1F0F5";
const TEXT_SECONDARY = "rgba(241,240,245,0.55)";
const TEXT_MUTED = "rgba(241,240,245,0.35)";
const BORDER = "rgba(255,255,255,0.08)";
const BORDER_LIGHT = "rgba(255,255,255,0.12)";

const HERO_PHOTO_URL = "/hero-luxe.jpg";
const INTRO_AUDIO_URL =
  "https://res.cloudinary.com/gz65ybug/video/upload/v1789055318/Generated_Audio_September_10_2026_-_4_29PM.wav";
const LOGO =
  "https://i.ibb.co/nqShkPNP/68126702-75e5-4de6-9b53-e51800b05e4a.jpg";
const AR_STACK = "'Cairo', sans-serif";
const FR_STACK = "'Inter', sans-serif";
const FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Inter:wght@400;500;600;700;800;900&display=swap";

/* ═══════════ STYLES GLOBAUX ══════════ */
const GlobalStyles = () => (
  <style>{`
    html { scroll-behavior: smooth; -webkit-font-smoothing: antialiased; }
    body { background: ${BG_DARK}; color: ${TEXT_PRIMARY}; margin: 0; }
    #sawtify-dark { overflow-x: clip; }
    #sawtify-dark * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    #sawtify-dark ::selection { background: ${PURPLE}; color: #fff; }
    #sawtify-dark .scrollbar-none { scrollbar-width: none; -ms-overflow-style: none; }
    #sawtify-dark .scrollbar-none::-webkit-scrollbar { display: none; }
    @keyframes wave { 0%, 100% { transform: scaleY(0.2); } 50% { transform: scaleY(1); } }
    #sawtify-dark .wave-bar { animation: wave 1.3s ease-in-out infinite; transform-origin: bottom; }
    #sawtify-dark .focus-ring:focus-visible { outline: 2px solid ${PURPLE}; outline-offset: 3px; border-radius: 10px; }
    @keyframes spin-slow { to { transform: rotate(360deg); } }
    @keyframes pulse-glow { 0%, 100% { box-shadow: 0 0 30px rgba(139,92,246,0.3), 0 0 60px rgba(139,92,246,0.1); } 50% { box-shadow: 0 0 50px rgba(139,92,246,0.5), 0 0 100px rgba(139,92,246,0.2); } }
    @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
    @keyframes gradient-shift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
    #sawtify-dark .orb-glow { animation: pulse-glow 3s ease-in-out infinite; }
    #sawtify-dark .float-anim { animation: float 4s ease-in-out infinite; }
    #sawtify-dark .gradient-text { background: linear-gradient(135deg, #fff 0%, ${PURPLE_LIGHT} 50%, ${PINK} 100%); background-size: 200% 200%; animation: gradient-shift 4s ease infinite; -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    #sawtify-dark .glass { background: rgba(14,14,26,0.6); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
    @media (prefers-reduced-motion: reduce) {
      html { scroll-behavior: auto; }
      *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
    }
  `}</style>
);

/* ═══════════ PRIMITIVES ═══════════ */
const Logo = ({ size = 36, light = true }: { size?: number; light?: boolean }) => {
  const [err, setErr] = useState(false);
  return (
    <div className="flex items-center gap-2.5 select-none">
      <div
        className="rounded-xl overflow-hidden shrink-0"
        style={{
          width: size,
          height: size,
          boxShadow: `0 0 20px ${PURPLE_GLOW}`,
          border: `1px solid ${BORDER_LIGHT}`,
        }}
      >
        {!err ? (
          <img
            src={LOGO}
            alt="Sawtify"
            width={size}
            height={size}
            decoding="async"
            onError={() => setErr(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center font-bold text-white"
            style={{ background: `linear-gradient(135deg, ${PURPLE}, ${VIOLET})`, fontSize: size * 0.5 }}
          >
            S
          </div>
        )}
      </div>
      <span className="font-extrabold text-[18px] tracking-tight" style={{ color: light ? "#fff" : TEXT_PRIMARY }}>
        Sawtify
      </span>
    </div>
  );
};

const Num = ({ children }: { children: React.ReactNode }) => (
  <span dir="ltr" style={{ unicodeBidi: "isolate" }} className="inline-block tabular-nums">
    {children}
  </span>
);

const Label = ({ children }: { children: React.ReactNode }) => (
  <span
    className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3.5 py-1.5 rounded-full"
    style={{ background: PURPLE_SOFT, color: PURPLE_LIGHT, border: `1px solid rgba(139,92,246,0.2)` }}
  >
    <Sparkles className="w-3 h-3" />
    {children}
  </span>
);

const SectionHead = ({
  eyebrow,
  title,
  sub,
  center = false,
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
  center?: boolean;
}) => (
  <div className={center ? "text-center mx-auto max-w-2xl" : "max-w-2xl"}>
    {eyebrow && <Label>{eyebrow}</Label>}
    <h2 className="mt-4 text-[clamp(1.8rem,4vw,2.8rem)] leading-[1.1] tracking-[-0.02em] font-extrabold text-white">
      {title}
    </h2>
    {sub && <p className="mt-4 text-[14px] text-[rgba(241,240,245,0.5)] leading-relaxed">{sub}</p>}
  </div>
);

const Waveform = React.memo(function Waveform({
  color,
  playing,
  bars = 40,
}: {
  color: string;
  playing: boolean;
  bars?: number;
}) {
  return (
    <div className="flex items-end justify-center gap-[2px] h-20 w-full" dir="ltr" aria-hidden>
      {Array.from({ length: bars }).map((_, i) => {
        const h = 15 + Math.abs(Math.sin(i * 0.55) * Math.cos(i * 0.31)) * 85;
        return (
          <span
            key={i}
            className={`flex-1 rounded-full origin-bottom ${playing ? "wave-bar" : ""}`}
            style={{
              height: `${h}%`,
              maxWidth: 3,
              background: `linear-gradient(to top, ${color}, ${PURPLE_LIGHT})`,
              opacity: playing ? 0.9 : 0.25,
              animationDelay: `${(i % 10) * 0.08}s`,
            }}
          />
        );
      })}
    </div>
  );
});

/* ═══════════ LECTEUR AUDIO UNIFIÉ ═══════════ */
function useVoicePlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);
  const rafRef = useRef<number | null>(null);
  const rateRef = useRef(1);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [level, setLevel] = useState(0);

  const ensure = useCallback(() => {
    if (audioRef.current) return audioRef.current;
    const a = new Audio();
    a.preload = "none";
    a.crossOrigin = "anonymous";
    a.addEventListener("timeupdate", () => {
      if (a.duration > 0) {
        setProgress(a.currentTime / a.duration);
        setElapsed(a.currentTime);
        setDuration(a.duration);
      }
    });
    a.addEventListener("ended", () => {
      setPlayingId(null);
      setProgress(0);
      setElapsed(0);
      setLevel(0);
    });
    audioRef.current = a;
    return a;
  }, []);

  const tick = useCallback(() => {
    const a = audioRef.current;
    if (!a || a.paused) {
      setLevel(0);
      return;
    }
    if (analyserRef.current && dataRef.current) {
      analyserRef.current.getByteFrequencyData(dataRef.current);
      let sum = 0;
      for (let i = 2; i < 30; i++) sum += dataRef.current[i];
      setLevel(Math.min(1, (sum / 28 / 255) * 2.2));
    } else {
      const t = performance.now() * 0.011;
      setLevel(Math.min(1, Math.abs(Math.sin(t) * Math.cos(t * 0.7)) * 0.8 + 0.15));
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const initAnalyser = useCallback((a: HTMLAudioElement) => {
    if (ctxRef.current) return;
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AC();
      const src = ctx.createMediaElementSource(a);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.7;
      src.connect(analyser);
      analyser.connect(ctx.destination);
      ctxRef.current = ctx;
      analyserRef.current = analyser;
      dataRef.current = new Uint8Array(analyser.frequencyBinCount);
    } catch {
      // Fallback to synthetic wave
    }
  }, []);

  const play = useCallback(
    (id: string, url?: string) => {
      if (!url) return;
      const a = ensure();
      a.pause();
      a.src = url;
      a.playbackRate = rateRef.current;
      initAnalyser(a);
      a.play()
        .then(() => {
          setPlayingId(id);
          if (ctxRef.current?.state === "suspended") ctxRef.current.resume().catch(() => {});
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
          rafRef.current = requestAnimationFrame(tick);
        })
        .catch(() => setPlayingId(null));
    },
    [ensure, initAnalyser, tick]
  );

  const stop = useCallback(() => {
    audioRef.current?.pause();
    setPlayingId(null);
    setProgress(0);
    setElapsed(0);
    setLevel(0);
  }, []);

  const toggle = useCallback(
    (id: string, url?: string) => {
      if (playingId === id) stop();
      else play(id, url);
    },
    [playingId, play, stop]
  );

  const setSpeed = useCallback((s: number) => {
    rateRef.current = s;
    if (audioRef.current) audioRef.current.playbackRate = s;
  }, []);

  useEffect(
    () => () => {
      audioRef.current?.pause();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ctxRef.current?.close().catch(() => {});
    },
    []
  );

  return { playingId, progress, elapsed, duration, level, play, stop, toggle, setSpeed };
}

/* ══════════ BOULE MICRO GLOWING ═══════════ */
const MicOrb = ({
  playing,
  level,
  onTap,
}: {
  playing: boolean;
  level: number;
  onTap: () => void;
}) => {
  const scale = playing ? 1 + level * 0.12 : 1;
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label={playing ? "Pause" : "Play"}
      className="relative w-[160px] h-[160px] sm:w-[200px] sm:h-[200px] mx-auto block focus-ring rounded-full cursor-pointer"
    >
      {/* Outer glow rings */}
      <motion.div
        className="absolute inset-[-20px] rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${PURPLE_GLOW} 0%, transparent 70%)`,
        }}
        animate={{
          opacity: playing ? 0.4 + level * 0.4 : 0.2,
          scale: playing ? [1, 1.08, 1] : [1, 1.02, 1],
        }}
        transition={{ duration: playing ? 1.4 : 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-[-40px] rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 60%)`,
        }}
        animate={{
          opacity: playing ? 0.3 + level * 0.3 : 0.15,
          scale: playing ? [1, 1.12, 1] : [1, 1.03, 1],
        }}
        transition={{ duration: playing ? 1.8 : 4, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Core orb */}
      <motion.div
        className="orb-glow absolute inset-0 rounded-full"
        style={{
          background: `linear-gradient(135deg, ${PURPLE} 0%, ${VIOLET} 50%, ${PINK} 100%)`,
          boxShadow: `0 0 40px ${PURPLE_GLOW}, inset 0 0 30px rgba(255,255,255,0.1)`,
        }}
        animate={{ scale }}
        transition={{ duration: 0.15 }}
      />
      {/* Inner highlight */}
      <div
        className="absolute inset-[15%] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.3), transparent 60%)",
        }}
      />
      {/* Mic icon */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {playing ? (
          <Pause className="w-8 h-8 text-white fill-current" />
        ) : (
          <Mic className="w-8 h-8 text-white" />
        )}
      </div>
      {/* Sound waves */}
      {playing &&
        Array.from({ length: 16 }).map((_, i) => {
          const angle = (i / 16) * 360;
          const len = 4 + Math.sin(i * 1.7 + level * 10) * level * 12;
          return (
            <span
              key={i}
              aria-hidden
              className="absolute rounded-full bg-white/50"
              style={{
                width: 2,
                height: 6 + Math.max(0, len),
                top: "50%",
                left: "50%",
                transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-88px)`,
                transition: "height 0.1s ease-out",
              }}
            />
          );
        })}
    </button>
  );
};

/* ═══════════ DONNÉES SAWTIFY ═══════════ */
type VoiceCard = {
  id: string;
  nameFr: string;
  nameAr: string;
  tagFr: string;
  tagAr: string;
  location: string;
  rating?: number;
  reviews?: number;
  color: string;
  sampleFr: string;
  sampleAr: string;
  audioUrl?: string;
};

const VOICES: VoiceCard[] = [
  {
    id: "amine",
    nameFr: "Amine",
    nameAr: "أمين",
    tagFr: "Voix commerciale",
    tagAr: "صوت تجاري",
    location: "Alger",
    rating: 4.9,
    reviews: 234,
    color: "#8B5CF6",
    sampleFr:
      "Salam 3likoum khawti! M3a Sawtify, nassek yewli sawt tabi3i, wadeh, wahli l i3lanat.",
    sampleAr: "سلام عليكم خاوتي! مع صوتيفي، نصوصكم تولي صوت طبيعي وواضح.",
    audioUrl:
      "https://res.cloudinary.com/gz65ybug/video/upload/v1789139928/AMINE.mp3",
  },
  {
    id: "yasmine",
    nameFr: "Yasmine",
    nameAr: "ياسمين",
    tagFr: "Voix publicitaire",
    tagAr: "صوت إعلاني",
    location: "Oran",
    rating: 4.8,
    reviews: 189,
    color: "#EC4899",
    sampleFr:
      "Marhba bikom kamlin! Tawsil 58 wilaya, payment 3and l istlam.",
    sampleAr: "مرحبا بيكم كاملين! التوصيل لـ 58 ولاية والدفع عند الاستلام.",
    audioUrl:
      "https://res.cloudinary.com/gz65ybug/video/upload/v1789139890/YASMINE.mp3",
  },
  {
    id: "khalid",
    nameFr: "Khalid",
    nameAr: "خالد",
    tagFr: "Voix documentaire",
    tagAr: "صوت وثائقي",
    location: "Constantine",
    rating: 5.0,
    reviews: 312,
    color: "#3B82F6",
    sampleFr:
      "Nqeddmlkom lyom notq mawzoun w dqi9, l watha2iqiyat w contenu rassmi.",
    sampleAr: "نقدّم ليكم اليوم نطق موزون ودقيق للوثائقيات.",
    audioUrl:
      "https://res.cloudinary.com/gz65ybug/video/upload/v1789139847/KHALED.wav",
  },
  {
    id: "layla",
    nameFr: "Layla",
    nameAr: "ليلى",
    tagFr: "Voix social media",
    tagAr: "صوت سوشيال",
    location: "Annaba",
    rating: 4.9,
    reviews: 156,
    color: "#F59E0B",
    sampleFr:
      "Salut l'équipe ! Une voix vive, parfaite pour Reels et TikTok.",
    sampleAr: "واش راكم ليكيب؟ صوت حيوي هايل للريلز وتيك توك.",
  },
  {
    id: "yacine",
    nameFr: "Yacine",
    nameAr: "ياسين",
    tagFr: "Voix éducative",
    tagAr: "صوت تعليمي",
    location: "Sétif",
    rating: 4.7,
    reviews: 98,
    color: "#10B981",
    sampleFr:
      "Dans cette leçon, on avance pas à pas. Une voix claire pour l'e-learning.",
    sampleAr: "في هاد الدرس نمشيو خطوة بخطوة. صوت واضح للشروحات.",
  },
  {
    id: "nadia",
    nameFr: "Nadia",
    nameAr: "نادية",
    tagFr: "Voix podcast",
    tagAr: "صوت بودكاست",
    location: "Tlemcen",
    rating: 4.9,
    reviews: 267,
    color: "#8B5CF6",
    sampleFr:
      "Bienvenue dans cet épisode. Une voix chaleureuse pour vos podcasts.",
    sampleAr: "مرحبا بيكم في هاد الحلقة. صوت دافئ للبودكاست.",
  },
];

const LANDING_IDS = ["amine", "yasmine", "khalid"] as const;
const LANDING_VOICES = VOICES.filter((v) =>
  (LANDING_IDS as readonly string[]).includes(v.id)
);
const HIDDEN_VOICES = VOICES.filter(
  (v) => !(LANDING_IDS as readonly string[]).includes(v.id)
);

const COST_STEPS = [
  { sec: 60, pts: 20, labelFr: "0–60 s", labelAr: "0–60 ث" },
  { sec: 120, pts: 30, labelFr: "2 min", labelAr: "2 دق" },
  { sec: 180, pts: 40, labelFr: "3 min", labelAr: "3 دق" },
  { sec: 240, pts: 50, labelFr: "4 min", labelAr: "4 دق" },
];
const fmtTime = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const SPEEDS = [0.75, 1, 1.25, 1.5] as const;

/* ═══════════ COMPOSANT PRINCIPAL ═══════════ */
export const LandingPage: React.FC<LandingPageProps> = ({
  onLoginClick,
  onSigninClick,
  language,
  setLanguage,
}) => {
  const isRTL = language === "ar";
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTesti, setActiveTesti] = useState(0);
  const [featuredId, setFeaturedId] = useState("amine");
  const [listenVoice, setListenVoice] = useState<VoiceCard | null>(null);
  const [legal, setLegal] = useState<null | "cgu" | "privacy">(null);
  const [costIdx, setCostIdx] = useState(0);
  const [speed, setSpeed] = useState<number>(1);

  const scrolled = useScrolled();
  const player = useVoicePlayer();
  const overlayOpen = menuOpen || !!listenVoice || !!legal;

  const bootRef = useRef(false);
  useLayoutEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem("sawtify_lang");
    } catch {}
    const target = saved === "fr" || saved === "ar" ? saved : "ar";
    if (target !== language) setLanguage(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    document.body.style.background = BG_DARK;
  }, [language, isRTL]);

  useEffect(() => {
    document.body.style.overflow = overlayOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [overlayOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMenuOpen(false);
      setListenVoice(null);
      setLegal(null);
      player.stop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [player]);

  const goSignup = useCallback(() => {
    player.stop();
    onSigninClick();
  }, [player, onSigninClick]);

  const t = useMemo(
    () => ({
      skip: isRTL ? "تخطَّ إلى المحتوى" : "Aller au contenu",
      navVoices: isRTL ? "الأصوات" : "Voix",
      navFeatures: isRTL ? "المميزات" : "Features",
      navPricing: isRTL ? "الأسعار" : "Pricing",
      navFaq: isRTL ? "أسئلة" : "FAQ",
      navContact: isRTL ? "تواصل" : "Contact",
      signin: isRTL ? "دخول" : "Sign In",
      start: isRTL ? "ابدأ مجاناً" : "Get Started",
      tryFree: isRTL ? "جرّب مجاناً" : "Try for free",
      learnMore: isRTL ? "اعرف أكثر" : "Learn More",
      pause: isRTL ? "إيقاف" : "Pause",
      heroBadge: isRTL ? "موثوق من 54,000 مستخدم" : "Trusted by 54,000 People",
      heroTitle1: isRTL ? "غيّر العالم" : "Change the World",
      heroTitle2: isRTL ? "بصوت الذكاء الاصطناعي!" : "with Voice AI!",
      heroSub: isRTL
        ? "نصّك بالدارجة الجزائرية يولي صوت طبيعي في 30 ثانية. 50 نقطة هدية وقت التسجيل."
        : "Your Algerian darija text becomes a natural voice in 30 seconds. 50 free points on signup.",
      showcase: isRTL
        ? "أظهر تصاميمك باحترافية"
        : "SHOWCASE YOUR DESIGNS PROFESSIONALLY",
      studioPrice: isRTL ? "في الستوديو" : "En studio",
      priceOld: isRTL ? "8 000 – 20 000 دج" : "8 000 à 20 000 DZD",
      priceNow: isRTL ? "من 500 دج" : "dès 500 DZD",
      check1: isRTL ? "الدفع بالذهبية أو CIB" : "Edahabia / CIB Payment",
      check2: isRTL ? "بلا علامة مائية" : "No watermark",
      check3: isRTL ? "النقاط ما تنتهيش" : "Points never expire",
      tapOrb: isRTL ? "دوس باش تسمع" : "Tap to listen",
      compareTitle: isRTL
        ? "الستوديو ضد صوتيفي."
        : "Classic Studio vs Sawtify.",
      compareSub: isRTL
        ? "علاش تدفع 20 000 دج وتسنّى أسبوع؟"
        : "Why pay 20,000 DZD and wait a week?",
      compareOld: isRTL ? "الطريقة القديمة" : "Old Way",
      saveUp: isRTL ? "توفّر حتى" : "Save up to",
      guaranteeTitle: isRTL
        ? "ضمان صوتيفي: ماكش تخسر والو."
        : "Sawtify Guarantee: Zero risk.",
      guaranteeBody: isRTL
        ? "ما عجبكش الصوت؟ نرجعو لك نقاطك، بلا أسئلة."
        : "Don't like the voice? Your points are refunded, no questions.",
      popularTitle: isRTL ? "30 صوتاً. هنا غي 3." : "30 Voices. Only 3 here.",
      popularSub: isRTL
        ? "الباقي تسمعو في الاستوديو."
        : "The rest are in the studio.",
      listenInStudio: isRTL ? "اسمع البداية" : "Listen to preview",
      listenBody: isRTL
        ? "هذي غير أول جملة. الصوت الكامل في الاستوديو."
        : "This is just the first sentence. Full voice in the studio.",
      journeyTitle: isRTL
        ? "أربع خطوات. والصوت يخرج."
        : "Four steps. Voice out.",
      journeySub: isRTL
        ? "بلا كابينة. بلا ميكرو. بلا انتظار."
        : "No booth. No mic. No waiting.",
      useTitle: isRTL
        ? "ملي يتكلّم، ما يعودش نص."
        : "When it speaks, it's no longer text.",
      costTitle: isRTL ? "أرخص مما تتخيّل." : "Cheaper than you think.",
      costSub: isRTL
        ? "20 نقطة لأول 60 ثانية، وزيد 10 لكل دقيقة."
        : "20 points for first 60 seconds, then +10 per minute.",
      metricsTitle: isRTL ? "الأرقام ما تكذبش." : "The numbers don't lie.",
      testTitle: isRTL
        ? "اللي يسمعو يظنّو بنادم."
        : "Whoever listens thinks it's human.",
      pricingTitle: isRTL ? "نقاط. بلا اشتراك." : "Points. No subscription.",
      pricingSub: isRTL
        ? "بالدينار. بلا تاريخ انتهاء."
        : "In dinars. No expiration.",
      welcomeBanner: isRTL
        ? "هدية التسجيل: 50 نقطة بالمجان."
        : "Signup gift: 50 free points.",
      bannerSub: isRTL
        ? "بلا بطاقة · النقاط ما تنتهيش أبداً"
        : "No card · points never expire",
      choose: isRTL ? "اختيار" : "Choose",
      popular: isRTL ? "الأكثر طلباً" : "Most Popular",
      faqTitle: isRTL ? "أسئلة شائعة" : "FAQ",
      ctaTitle: isRTL ? "واش راك تنتضر؟" : "Ready to start?",
      ctaSub: isRTL ? "50 نقطة بالمجان. بلا بطاقة." : "50 free points. No card.",
      footTag: isRTL ? "صُنع في الجزائر" : "Made in Algeria",
      switchLang: isRTL ? "FR" : "ع",
      close: isRTL ? "إغلاق" : "Close",
      open: isRTL ? "القائمة" : "Menu",
      cgu: isRTL ? "شروط الاستخدام" : "Terms",
      privacy: isRTL ? "الخصوصية" : "Privacy",
      contact: isRTL ? "تواصل" : "Contact",
      pts: isRTL ? "نقطة" : "pts",
      moreVoices: isRTL ? "دخول للاستوديو" : "Access studio",
      features: isRTL ? "المميزات" : "Features",
      about: isRTL ? "حول" : "About",
      solution: isRTL ? "الحل" : "Solution",
      blog: isRTL ? "المدونة" : "Blog",
    }),
    [isRTL]
  );

  const nav = useMemo(
    () => [
      { target: "#voices", label: t.navVoices },
      { target: "#features", label: t.navFeatures },
      { target: "#pricing", label: t.navPricing },
      { target: "#faq", label: t.navFaq },
      { target: "#contact", label: t.navContact },
    ],
    [t]
  );

  const featured = VOICES.find((v) => v.id === featuredId) || VOICES[0];
  const heroPlaying =
    player.playingId === "intro" || player.playingId === featured.id;

  useEffect(() => {
    if (listenVoice || player.playingId) return;
    const id = window.setInterval(() => {
      setFeaturedId((prev) => {
        const i = LANDING_VOICES.findIndex((v) => v.id === prev);
        return LANDING_VOICES[(i + 1) % LANDING_VOICES.length].id;
      });
    }, 5200);
    return () => window.clearInterval(id);
  }, [listenVoice, player.playingId]);

  const stepVoice = (dir: 1 | -1) => {
    player.stop();
    const i = LANDING_VOICES.findIndex((v) => v.id === featuredId);
    setFeaturedId(
      LANDING_VOICES[(i + dir + LANDING_VOICES.length) % LANDING_VOICES.length]
        .id
    );
  };
  const applySpeed = (s: number) => {
    setSpeed(s);
    player.setSpeed(s);
  };

  const journeySteps = useMemo(
    () => [
      {
        n: "01",
        icon: MessageSquare,
        t: isRTL ? "اكتب" : "Write",
        d: isRTL ? "ألصق نصّك بالدارجة." : "Paste your darija text.",
      },
      {
        n: "02",
        icon: Volume2,
        t: isRTL ? "اختر" : "Choose",
        d: isRTL ? "30 صوتاً. هنا نعرضو غي 3." : "30 voices. We show only 3.",
      },
      {
        n: "03",
        icon: Zap,
        t: isRTL ? "اضبط" : "Adjust",
        d: isRTL ? "السرعة والنبرة." : "Speed and tone.",
      },
      {
        n: "04",
        icon: Download,
        t: isRTL ? "حمّل" : "Download",
        d: isRTL ? "MP3 أو WAV. بلا علامة مائية." : "MP3 or WAV. No watermark.",
      },
    ],
    [isRTL]
  );

  const features = useMemo(
    () => [
      {
        icon: Globe,
        t: isRTL ? "الدارجة الجزائرية" : "Algerian Darija",
        d: isRTL
          ? "أول منصة متخصصة في الدارجة. نطق طبيعي 100٪."
          : "First platform specialized in darija. 100% natural pronunciation.",
      },
      {
        icon: Zap,
        t: isRTL ? "30 ثانية" : "30 Seconds",
        d: isRTL
          ? "من النص إلى الصوت في أقل من دقيقة."
          : "From text to voice in under a minute.",
      },
      {
        icon: CreditCard,
        t: isRTL ? "دفع محلي" : "Local Payment",
        d: isRTL
          ? "Edahabia و CIB عبر SATIM. بالدينار."
          : "Edahabia & CIB via SATIM. In dinars.",
      },
      {
        icon: ShieldCheck,
        t: isRTL ? "جودة استوديو" : "Studio Quality",
        d: isRTL
          ? "24 kHz. بلا علامة مائية. استعمال تجاري كامل."
          : "24 kHz. No watermark. Full commercial use.",
      },
      {
        icon: Clock,
        t: isRTL ? "نقاط بلا انتهاء" : "Points Never Expire",
        d: isRTL
          ? "اشري مرة، استعمل للأبد."
          : "Buy once, use forever.",
      },
      {
        icon: Award,
        t: isRTL ? "30 صوتاً" : "30 Voices",
        d: isRTL
          ? "رجال ونساء. تجاري، وثائقي، سوشيال."
          : "Male & female. Commercial, documentary, social.",
      },
    ],
    [isRTL]
  );

  const uses = useMemo(
    () => [
      {
        icon: ShoppingBag,
        t: isRTL ? "تجارة إلكترونية" : "E-commerce",
        d: isRTL ? "سبوت وتوصيل 58 ولاية." : "Spots, delivery 58 wilayas.",
      },
      {
        icon: Clapperboard,
        t: isRTL ? "ريلز وتيك توك" : "Reels & TikTok",
        d: isRTL ? "صوت قصير وحيوي." : "Short, lively voice.",
      },
      {
        icon: Mic2,
        t: isRTL ? "بودكاست ويوتيوب" : "Podcast & YouTube",
        d: isRTL ? "سرد طويل ونبرة ثابتة." : "Long narration, stable tone.",
      },
      {
        icon: Phone,
        t: isRTL ? "موزّع هاتفي" : "Phone System",
        d: isRTL ? "خدمة الزبائن." : "Customer service.",
      },
    ],
    [isRTL]
  );

  const metrics = useMemo(
    () => [
      { n: "30", l: isRTL ? "صوت" : "Voices", icon: Volume2 },
      { n: "54K+", l: isRTL ? "مستخدم" : "Users", icon: Users },
      { n: "50K+", l: isRTL ? "صوت مُولَّد" : "Voices Generated", icon: FileAudio },
      { n: "99%", l: isRTL ? "طبيعي" : "Natural", icon: Award },
    ],
    [isRTL]
  );

  const testimonials = useMemo(
    () =>
      isRTL
        ? [
            {
              q: "جرّبت 5 منصات قبل صوتيفي. هنا الصوت يبان بنادم بصح.",
              n: "أمين ب.",
              r: "صانع محتوى، الجزائر",
            },
            {
              q: "خدمت بيه للإعلانات التجارية. نتيجة احترافية بلا ما نحتاج ستوديو.",
              n: "ياسمين ق.",
              r: "وكالة إشهار، وهران",
            },
            {
              q: "أحسن صوت جزائري سمعتو. طبيعي 100٪ والدفع بالذهبية ساهل.",
              n: "خالد م.",
              r: "تاجر إلكتروني، قسنطينة",
            },
          ]
        : [
            {
              q: "J'ai testé 5 plateformes avant Sawtify. Ici, la voix sonne vraiment humaine.",
              n: "Amine B.",
              r: "Créateur, Alger",
            },
            {
              q: "Utilisé pour mes pubs. Un rendu pro, sans studio.",
              n: "Yasmine K.",
              r: "Agence pub, Oran",
            },
            {
              q: "La meilleure voix algérienne que j'ai entendue. Le paiement Edahabia est simple.",
              n: "Khaled M.",
              r: "E-commerçant, Constantine",
            },
          ],
    [isRTL]
  );

  useEffect(() => {
    const id = setInterval(
      () => setActiveTesti((p) => (p + 1) % testimonials.length),
      6500
    );
    return () => clearInterval(id);
  }, [testimonials.length]);

  const compareRows = useMemo(
    () =>
      isRTL
        ? [
            { label: "الوقت", old: "3 إلى 7 أيام", now: "30 ثانية" },
            { label: "التكلفة", old: "8 000 – 20 000 دج", now: "من 500 دج" },
            { label: "الميكرو والستوديو", old: "لازم", now: "غير متصفّحك" },
            {
              label: "اللغة",
              old: "فرنسية أو فصحى",
              now: "الدارجة الجزائرية",
            },
          ]
        : [
            { label: "Time", old: "3 to 7 days", now: "30 seconds" },
            { label: "Cost", old: "8,000 – 20,000 DZD", now: "from 500 DZD" },
            { label: "Mic & Studio", old: "Required", now: "Just a browser" },
            {
              label: "Language",
              old: "French / Literary",
              now: "Algerian Darija",
            },
          ],
    [isRTL]
  );

  const pricing = useMemo(
    () => [
      {
        pts: "100",
        price: "500",
        desc: isRTL ? "للتجربة الحرة." : "To discover the platform.",
      },
      {
        pts: "220",
        price: "1 000",
        featured: true,
        desc: isRTL ? "الأكثر طلباً." : "The most popular choice.",
      },
      {
        pts: "600",
        price: "2 500",
        desc: isRTL ? "لمن يخدم يومياً." : "For regular usage.",
      },
      {
        pts: "1 350",
        price: "5 000",
        desc: isRTL ? "للمحترفين — حجم كبير." : "For professionals.",
      },
    ],
    [isRTL]
  );

  const faqs = useMemo(
    () =>
      isRTL
        ? [
            {
              q: "واش إذا ما عجبنيش الصوت؟",
              a: "ماكش تخسر والو. النقاط ترجع لبالاك.",
            },
            {
              q: "هل الصوت يبان كي بنادم؟",
              a: "نعم. دارجة حيّة، 24 kHz. 99٪ ما يفرّقوش.",
            },
            {
              q: "نقدر نستعملو في الإعلان؟",
              a: "نعم، استعمال تجاري كامل بلا علامة مائية.",
            },
            {
              q: "كيفاش تخدم النقاط؟",
              a: "20 نقطة لـ 0–60 ثانية، وزيد 10 لكل دقيقة. ما تنتهيش.",
            },
            {
              q: "الذهبية و CIB؟",
              a: "نعم، عبر SATIM، بالدينار.",
            },
          ]
        : [
            {
              q: "What if I don't like the voice?",
              a: "Zero risk: your points are refunded.",
            },
            {
              q: "Does the voice sound human?",
              a: "Yes, living darija, 24 kHz. 99% can't tell the difference.",
            },
            {
              q: "Can I use it for ads?",
              a: "Yes, full commercial use, no watermark.",
            },
            {
              q: "How do points work?",
              a: "20 points for 0–60s, then +10/minute. They never expire.",
            },
            {
              q: "Edahabia and CIB?",
              a: "Yes, via SATIM, in dinars.",
            },
          ],
    [isRTL]
  );

  const trust = useMemo(
    () => [
      { k: "Edahabia", v: isRTL ? "بريد الجزائر" : "La Poste" },
      { k: "CIB", v: isRTL ? "البنوك" : "Banks" },
      { k: "24 kHz", v: isRTL ? "جودة استوديو" : "Studio Quality" },
      { k: "MP3 · WAV", v: isRTL ? "بلا علامة مائية" : "No Watermark" },
    ],
    [isRTL]
  );

  const smoothTo = useCallback((href: string) => {
    setMenuOpen(false);
    const el = document.querySelector(href) as HTMLElement | null;
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const openListen = (voice: VoiceCard) => {
    setFeaturedId(voice.id);
    setListenVoice(voice);
    player.play(voice.id, voice.audioUrl);
  };

  const ar = isRTL ? AR_STACK : FR_STACK;
  const ArrowIcon = ({ className = "w-4 h-4" }: { className?: string }) =>
    isRTL ? (
      <ArrowLeft className={className} />
    ) : (
      <ArrowRight className={className} />
    );
  const legalCopy = {
    cgu: isRTL
      ? "شروط الاستخدام: صوتيفي منصة جزائرية لتحويل النص إلى صوت بالدارجة. الحساب شخصي. النقاط لا تنتهي صلاحيتها. الدفع عبر SATIM."
      : "Terms of Use: Sawtify is an Algerian text-to-voice platform in darija. The account is personal. Points never expire. Payment via SATIM.",
    privacy: isRTL
      ? "الخصوصية: نحتفظ بالحد الأدنى من البيانات لتشغيل الحساب. لا نبيع بياناتك. صوتيفي لا يخزّن أرقام البطاقات."
      : "Privacy: We keep minimum data to run your account. We don't sell your data. No card numbers stored.",
  };

  return (
    <div
      id="sawtify-dark"
      dir={isRTL ? "rtl" : "ltr"}
      className="min-h-screen relative"
      style={{ fontFamily: ar, color: TEXT_PRIMARY }}
    >
      <GlobalStyles />
      <Helmet>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link rel="stylesheet" href={FONTS_URL} />
        {isRTL ? (
          <>
            <title>
              صوتيفي — أول مولّد أصوات بالذكاء الاصطناعي للدارجة الجزائرية
            </title>
            <meta
              name="description"
              content="صوتيفي: أول منصة تحويل النص إلى صوت متخصصة في الدارجة الجزائرية. دفع محلي CIB و Edahabia."
            />
            <html lang="ar" dir="rtl" />
          </>
        ) : (
          <>
            <title>
              Sawtify — Change the World with Voice AI | Algerian Darija
              Text-to-Speech
            </title>
            <meta
              name="description"
              content="First AI voice generator in Algerian darija. Local payment CIB & Edahabia. 30 voices."
            />
            <html lang="fr" dir="ltr" />
          </>
        )}
        <link rel="canonical" href="https://sawtify.space/" />
      </Helmet>

      <a
        href="#home"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-[90] focus:px-4 focus:py-2 focus:rounded-full focus:font-bold focus:text-sm text-white"
        style={{ background: PURPLE }}
      >
        {t.skip}
      </a>

      {/* ═══════════ HEADER ═══════════ */}
      <header
        className={`fixed inset-x-0 z-[60] transition-all duration-500 ${
          scrolled ? "py-2" : "py-3"
        }`}
        style={{
          background: scrolled
            ? "rgba(6,6,14,0.85)"
            : "transparent",
          backdropFilter: scrolled ? "blur(20px)" : "none",
          borderBottom: scrolled ? `1px solid ${BORDER}` : "1px solid transparent",
        }}
      >
        <div className="mx-auto max-w-[1280px] px-5 sm:px-6 h-16 flex items-center justify-between">
          <a
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              smoothTo("#home");
            }}
            className="focus-ring flex items-center gap-2.5"
          >
            <Logo size={36} />
          </a>

          <nav className="hidden lg:flex items-center gap-8 text-[13px] font-medium"
            style={{ color: TEXT_SECONDARY }}>
            {nav.map((l) => (
              <a
                key={l.target}
                href={l.target}
                onClick={(e) => {
                  e.preventDefault();
                  smoothTo(l.target);
                }}
                className="transition-colors hover:text-white focus-ring"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={switchLang}
              className="w-9 h-9 rounded-full text-[11px] font-bold transition hover:bg-white/10 focus-ring flex items-center justify-center"
              style={{ color: TEXT_SECONDARY, border: `1px solid ${BORDER}` }}
              aria-label={
                isRTL ? "التبديل إلى الفرنسية" : "Switch to Arabic"
              }
            >
              {t.switchLang}
            </button>
            <button
              type="button"
              onClick={onLoginClick}
              className="hidden md:block text-[13px] font-medium px-4 transition hover:text-white focus-ring"
              style={{ color: TEXT_SECONDARY }}
            >
              {t.signin}
            </button>
            <button
              type="button"
              onClick={goSignup}
              className="h-10 px-5 rounded-full text-[13px] font-bold focus-ring transition active:scale-95 text-white"
              style={{
                background: `linear-gradient(135deg, ${PURPLE}, ${VIOLET})`,
                boxShadow: `0 4px 20px ${PURPLE_GLOW}`,
              }}
            >
              {t.start}
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label={t.open}
              className="lg:hidden w-10 h-10 rounded-full flex items-center justify-center transition hover:bg-white/10 focus-ring"
              style={{ color: TEXT_PRIMARY }}
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ══════════ MOBILE MENU ═══════════ */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm lg:hidden"
            />
            <motion.div
              initial={{ x: isRTL ? "-100%" : "100%" }}
              animate={{ x: 0 }}
              exit={{ x: isRTL ? "-100%" : "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 280 }}
              className="fixed inset-y-0 end-0 z-[60] w-[85%] max-w-sm flex flex-col shadow-2xl lg:hidden"
              style={{
                background: BG_CARD,
                border: `1px solid ${BORDER}`,
              }}
            >
              <div
                className="flex items-center justify-between px-5 h-16"
                style={{ borderBottom: `1px solid ${BORDER}` }}
              >
                <Logo size={34} />
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center focus-ring"
                  aria-label={t.close}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex-1 px-5 py-6 flex flex-col">
                {nav.map((l) => (
                  <a
                    key={l.target}
                    href={l.target}
                    onClick={(e) => {
                      e.preventDefault();
                      smoothTo(l.target);
                    }}
                    className="py-4 text-[17px] font-bold text-white hover:text-[var(--purple-light)] border-b border-white/5 focus-ring"
                  >
                    {l.label}
                  </a>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onLoginClick();
                  }}
                  className="mt-4 py-3 text-start text-[15px] font-semibold text-white/70 hover:text-white"
                >
                  {t.signin}
                </button>
              </nav>
              <div
                className="p-5"
                style={{
                  paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    goSignup();
                  }}
                  className="w-full h-12 rounded-full font-bold text-white transition shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${PURPLE}, ${VIOLET})`,
                  }}
                >
                  {t.start}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="relative z-[1]">
        {/* ═══════════ HERO ═══════════ */}
        <section
          id="home"
          className="relative min-h-screen flex items-center overflow-hidden"
          style={{
            paddingTop: "calc(80px + env(safe-area-inset-top, 0px))",
          }}
        >
          {/* Background effects */}
          <div className="absolute inset-0" aria-hidden>
            {/* Dark base */}
            <div
              className="absolute inset-0"
              style={{ background: BG_DARK }}
            />
            {/* Purple gradient top */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full opacity-30"
              style={{
                background: `radial-gradient(ellipse, ${PURPLE} 0%, transparent 70%)`,
                filter: "blur(80px)",
              }}
            />
            {/* Violet accent right */}
            <div
              className="absolute top-20 right-0 w-[400px] h-[400px] rounded-full opacity-20"
              style={{
                background: `radial-gradient(circle, ${VIOLET} 0%, transparent 70%)`,
                filter: "blur(60px)",
              }}
            />
            {/* Pink accent left */}
            <div
              className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full opacity-15"
              style={{
                background: `radial-gradient(circle, ${PINK} 0%, transparent 70%)`,
                filter: "blur(50px)",
              }}
            />
            {/* Grid pattern */}
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                backgroundSize: "60px 60px",
              }}
            />
          </div>

          <div className="relative z-[1] mx-auto max-w-[1280px] px-5 sm:px-6 w-full py-16 sm:py-20">
            <div className="max-w-3xl mx-auto text-center">
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 text-[12px] font-medium mb-8 px-4 py-2 rounded-full"
                style={{
                  background: "rgba(139,92,246,0.1)",
                  border: "1px solid rgba(139,92,246,0.25)",
                  color: PURPLE_LIGHT,
                }}
              >
                <Star className="w-3.5 h-3.5 fill-current" />
                {t.heroBadge}
              </motion.div>

              {/* Title */}
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1 }}
                className="text-[clamp(2.5rem,7vw,5rem)] leading-[1.05] tracking-[-0.03em] font-extrabold"
              >
                <span className="text-white">{t.heroTitle1}</span>
                <br />
                <span className="gradient-text">{t.heroTitle2}</span>
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.25 }}
                className="mt-6 text-[15px] sm:text-[17px] max-w-xl mx-auto leading-relaxed"
                style={{ color: TEXT_SECONDARY }}
              >
                {t.heroSub}
              </motion.p>

              {/* Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.35 }}
                className="mt-8 flex items-center justify-center gap-4 flex-wrap"
              >
                <button
                  type="button"
                  onClick={goSignup}
                  className="h-13 px-8 rounded-full text-[14px] font-bold text-white focus-ring transition hover:scale-105 active:scale-95 flex items-center gap-2"
                  style={{
                    background: `linear-gradient(135deg, ${PURPLE}, ${VIOLET})`,
                    boxShadow: `0 8px 32px ${PURPLE_GLOW}`,
                    height: 52,
                  }}
                >
                  {t.tryFree}
                  <ArrowIcon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => smoothTo("#features")}
                  className="h-[52px] px-8 rounded-full text-[14px] font-medium focus-ring transition hover:bg-white/10 flex items-center gap-2"
                  style={{
                    color: TEXT_PRIMARY,
                    border: `1px solid ${BORDER_LIGHT}`,
                  }}
                >
                  {t.learnMore}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </motion.div>

              {/* Mic Orb */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="mt-14 float-anim"
              >
                <MicOrb
                  playing={heroPlaying}
                  level={player.level}
                  onTap={() =>
                    heroPlaying
                      ? player.stop()
                      : player.play("intro", INTRO_AUDIO_URL)
                  }
                />
                <p
                  className="mt-5 text-[12px] font-medium"
                  style={{ color: TEXT_MUTED }}
                >
                  {t.tapOrb}
                </p>
              </motion.div>

              {/* Voice controls */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.7 }}
                className="mt-8 max-w-sm mx-auto"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-[13px] font-bold text-white truncate">
                    {isRTL ? featured.nameAr : featured.nameFr}
                  </span>
                  <span
                    className="text-[11px] truncate"
                    style={{ color: TEXT_MUTED }}
                  >
                    {isRTL ? featured.tagAr : featured.tagFr} ·{" "}
                    {featured.location}
                  </span>
                </div>
                <div dir="ltr" className="flex items-center gap-2.5">
                  <span
                    className="text-[10px] w-8 shrink-0 tabular-nums"
                    style={{ color: TEXT_MUTED }}
                  >
                    {fmtTime(
                      player.playingId === featured.id ? player.elapsed : 0
                    )}
                  </span>
                  <div
                    className="relative flex-1 h-1 rounded-full overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.08)" }}
                  >
                    <div
                      className="absolute inset-y-0 start-0 rounded-full"
                      style={{
                        width: `${
                          (player.playingId === featured.id
                            ? player.progress
                            : 0) * 100
                        }%`,
                        background: `linear-gradient(90deg, ${PURPLE}, ${PURPLE_LIGHT})`,
                        transition: "width 0.2s linear",
                      }}
                    />
                  </div>
                  <span
                    className="text-[10px] w-8 shrink-0 text-end tabular-nums"
                    style={{ color: TEXT_MUTED }}
                  >
                    {fmtTime(
                      player.playingId === featured.id ? player.duration : 0
                    )}
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <div dir="ltr" className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => stepVoice(-1)}
                      className="w-8 h-8 rounded-full flex items-center justify-center focus-ring transition hover:bg-white/10"
                      style={{ border: `1px solid ${BORDER}`, color: TEXT_SECONDARY }}
                    >
                      <SkipBack className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        player.toggle(featured.id, featured.audioUrl)
                      }
                      className="w-8 h-8 rounded-full flex items-center justify-center focus-ring transition hover:bg-white/10"
                      style={{ border: `1px solid ${BORDER}`, color: TEXT_PRIMARY }}
                    >
                      {player.playingId === featured.id ? (
                        <Pause className="w-3.5 h-3.5 fill-current" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current translate-x-[1px]" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => stepVoice(1)}
                      className="w-8 h-8 rounded-full flex items-center justify-center focus-ring transition hover:bg-white/10"
                      style={{ border: `1px solid ${BORDER}`, color: TEXT_SECONDARY }}
                    >
                      <SkipForward className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div
                    dir="ltr"
                    className="flex items-center rounded-lg overflow-hidden"
                    style={{ border: `1px solid ${BORDER}` }}
                  >
                    {SPEEDS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => applySpeed(s)}
                        aria-pressed={speed === s}
                        className={`px-2.5 py-1 text-[10px] font-semibold transition ${
                          speed === s
                            ? "text-white"
                            : "hover:bg-white/5"
                        }`}
                        style={
                          speed === s
                            ? { background: PURPLE, color: "#fff" }
                            : { color: TEXT_MUTED }
                        }
                      >
                        {s}x
                      </button>
))}  
                                      </div>
                </div>

                                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      );
    }
    
    export default LandingPage;
