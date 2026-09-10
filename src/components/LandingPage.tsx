import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  ArrowRight, ArrowLeft, Play, Plus, Menu, X,
  Check, Star, Headphones, ShoppingBag, Clapperboard, Mic2, Phone, ShieldCheck, Gift, Pause, Volume2, VolumeX
} from "lucide-react";
import { motion, AnimatePresence, useScroll, useInView } from "motion/react";

export interface LandingPageProps {
  onLoginClick: () => void;
  onSigninClick: () => void;
  language: "fr" | "ar";
  setLanguage: (lang: "fr" | "ar") => void;
}

const ACCENT = "#6E5FE8";
const INK = "#0F0F1A";
const PAPER = "#FAFAF7";
const LOGO = "https://i.ibb.co/nqShkPNP/68126702-75e5-4de6-9b53-e51800b05e4a.jpg";
const INTRO_AUDIO_URL = "https://res.cloudinary.com/gz65ybug/video/upload/v1788998622/discution.wav";
const HERO_VIDEO_URL = "https://res.cloudinary.com/gz65ybug/video/upload/v1788621700/Robot_looking_with_microphone_1080p_202609051613.mp4";

const GlobalStyles = () => (
  <style>{`
    * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
    html { scroll-behavior: smooth; -webkit-font-smoothing: antialiased; }
    body { overflow-x: hidden; background: ${PAPER}; color: ${INK}; }

    @keyframes wave { 0%, 100% { transform: scaleY(0.28); } 50% { transform: scaleY(1); } }
    .wave-bar { animation: wave 1.3s ease-in-out infinite; transform-origin: bottom; }

    @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
    .float { animation: float 5s ease-in-out infinite; }
    .float-slow { animation: float 7s ease-in-out infinite; }

    .robot-glow { filter: drop-shadow(0 10px 20px rgba(110, 95, 232, 0.4)); }

    .focus-ring:focus-visible { outline: 2px solid ${ACCENT}; outline-offset: 3px; border-radius: 12px; }
    ::selection { background: ${ACCENT}; color: ${PAPER}; }
    ::-webkit-scrollbar { width: 10px; }
    ::-webkit-scrollbar-track { background: ${PAPER}; }
    ::-webkit-scrollbar-thumb { background: ${ACCENT}; border-radius: 10px; }

    @keyframes blink { 50% { opacity: 0; } }
    .caret { display: inline-block; width: 2px; height: 1em; margin-inline-start: 2px; background: ${ACCENT}; animation: blink 1s step-end infinite; vertical-align: -2px; }

    .card-lift { transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s; }
    @media (hover: hover) {
      .card-lift:hover { transform: translateY(-6px); box-shadow: 0 20px 50px -20px rgba(110, 95, 232, 0.3); }
    }

    @media (prefers-reduced-motion: reduce) {
      html { scroll-behavior: auto; }
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
      .wave-bar, .float, .float-slow { animation: none !important; }
    }
  `}</style>
);

const Logo = ({ size = 40, showText = true, dark = false }: { size?: number; showText?: boolean; dark?: boolean }) => {
  const [imgError, setImgError] = useState(false);
  return (
    <div className="flex items-center gap-2.5 select-none">
      <div
        className="rounded-2xl overflow-hidden shrink-0 relative"
        style={{
          width: size, height: size,
          background: "linear-gradient(135deg, #6E5FE8 0%, #5B4DD8 100%)",
          boxShadow: "0 4px 14px rgba(110, 95, 232, 0.3)",
        }}
      >
        {!imgError ? (
          <img src={LOGO} alt="Sawtify" width={size} height={size} decoding="async"
            onError={() => setImgError(true)} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white font-extrabold" style={{ fontSize: size * 0.5 }}>S</div>
        )}
      </div>
      {showText && (
        <span className="font-extrabold text-[20px] tracking-tight" style={{ color: dark ? PAPER : INK }}>Sawtify</span>
      )}
    </div>
  );
};

const Num = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <span dir="ltr" style={{ unicodeBidi: "isolate", fontFamily: "'Outfit', sans-serif" }} className={`inline-block tabular-nums ${className}`}>
    {children}
  </span>
);

const Counter = ({ target, suffix = "", duration = 1800 }: { target: number; suffix?: string; duration?: number }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const obs = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry?.isIntersecting || started.current) return;
      started.current = true;
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        setCount(Math.round((1 - Math.pow(1 - p, 4)) * target));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.3 });
    obs.observe(node);
    return () => obs.disconnect();
  }, [target, duration]);

  return <span ref={ref}>{count.toLocaleString("fr-FR")}{suffix}</span>;
};

const SlideUp = ({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 32 }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

function useScrolled() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return scrolled;
}

const Waveform = ({ color, playing, bars = 36 }: { color: string; playing: boolean; bars?: number }) => (
  <div className="flex items-end justify-center gap-[3px] h-28 w-full" dir="ltr" aria-hidden>
    {Array.from({ length: bars }).map((_, i) => {
      const h = 18 + Math.abs(Math.sin(i * 0.55) * Math.cos(i * 0.31)) * 82;
      return (
        <span
          key={i}
          className={`flex-1 rounded-full origin-bottom ${playing ? "wave-bar" : ""}`}
          style={{
            height: `${h}%`,
            maxWidth: 4,
            background: i % 6 === 0 ? color : INK,
            opacity: playing ? 1 : 0.55,
            animationDelay: `${(i % 10) * 0.1}s`,
          }}
        />
      );
    })}
  </div>
);

// --- ROBOT WIDGET WITH AUDIO SYNCHRONIZED MOUTH ANIMATION ---
const RobotWidget = ({
  isPlaying,
  volume,
  onToggle,
  isRTL,
}: {
  isPlaying: boolean;
  volume: number; // 0 to 1
  onToggle: () => void;
  isRTL: boolean;
}) => {
  const mouthHeight = isPlaying ? Math.max(3, Math.min(22, 4 + volume * 24)) : 3;

  return (
    <motion.div
      initial={{ y: 120, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", damping: 20, stiffness: 120, delay: 0.5 }}
      className="fixed bottom-0 end-4 sm:end-8 z-[80] flex flex-col items-center select-none"
    >
      {/* Speech Bubble */}
      <AnimatePresence>
        <motion.div
          key={isPlaying ? "speaking" : "idle"}
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.9 }}
          onClick={onToggle}
          className="mb-2 px-3.5 py-2 rounded-2xl bg-[#0F0F1A] text-white text-[12px] font-semibold shadow-2xl flex items-center gap-2 cursor-pointer border border-white/10 hover:border-[#6E5FE8] transition"
        >
          <span className="w-2 h-2 rounded-full bg-[#6E5FE8] animate-ping" />
          <span>
            {isPlaying
              ? (isRTL ? "صحا! اني نحكي معاك 🎙️" : "Ecoute ma voix ! 🎙️")
              : (isRTL ? "انقر هنا للاستماع 💬" : "Cliquez pour écouter 💬")}
          </span>
          {isPlaying ? <Volume2 className="w-3.5 h-3.5 text-[#9D8FFF]" /> : <VolumeX className="w-3.5 h-3.5 text-white/50" />}
        </motion.div>
      </AnimatePresence>

      {/* Robot Body Button */}
      <button
        type="button"
        onClick={onToggle}
        aria-label="Toggle Audio Robot"
        className="relative group focus:outline-none robot-glow cursor-pointer transition transform hover:-translate-y-2"
      >
        <svg
          width="110"
          height="120"
          viewBox="0 0 110 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="overflow-visible"
        >
          {/* Head Outer Frame */}
          <rect x="10" y="20" width="90" height="75" rx="28" fill="#0F0F1A" stroke="#6E5FE8" strokeWidth="4" />
          
          {/* Antenna */}
          <line x1="55" y1="20" x2="55" y2="6" stroke="#6E5FE8" strokeWidth="4" strokeLinecap="round" />
          <circle cx="55" cy="5" r="6" fill={isPlaying ? "#10B981" : "#6E5FE8"} className={isPlaying ? "animate-pulse" : ""} />

          {/* Visor Screen */}
          <rect x="20" y="32" width="70" height="50" rx="18" fill="#18182A" stroke="rgba(110,95,232,0.4)" strokeWidth="2" />

          {/* Glowing Eyes */}
          <circle cx="38" cy="48" r="7" fill={isPlaying ? "#00E5FF" : "#6E5FE8"} />
          <circle cx="38" cy="46" r="2.5" fill="#FFFFFF" />
          
          <circle cx="72" cy="48" r="7" fill={isPlaying ? "#00E5FF" : "#6E5FE8"} />
          <circle cx="72" cy="46" r="2.5" fill="#FFFFFF" />

          {/* Animated Mouth Synced to Audio */}
          <g transform="translate(55, 68)">
            <rect
              x="-18"
              y={-mouthHeight / 2}
              width="36"
              height={mouthHeight}
              rx={Math.min(mouthHeight / 2, 8)}
              fill={isPlaying ? "#6E5FE8" : "#2D2D44"}
              className="transition-all duration-75 ease-out"
            />
            {isPlaying && (
              <path
                d={`M -12 0 L -6 ${-mouthHeight / 3} L 0 ${mouthHeight / 3} L 6 ${-mouthHeight / 3} L 12 0`}
                stroke="#FFFFFF"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
            )}
          </g>

          {/* Ears */}
          <rect x="2" y="45" width="8" height="20" rx="4" fill="#6E5FE8" />
          <rect x="100" y="45" width="8" height="20" rx="4" fill="#6E5FE8" />

          {/* Base */}
          <path d="M 25 95 C 25 95 35 118 55 118 C 75 118 85 95 85 95 Z" fill="#0F0F1A" stroke="#6E5FE8" strokeWidth="3" />
        </svg>
      </button>
    </motion.div>
  );
};

type VoiceCard = {
  id: string;
  nameFr: string;
  nameAr: string;
  tagFr: string;
  tagAr: string;
  location: string;
  gender: "male" | "female";
  category: "commercial" | "narrative" | "social" | "formal";
  rating?: number;
  reviews?: number;
  color: string;
  sampleFr: string;
  sampleAr: string;
};

const VOICES: VoiceCard[] = [
  { id: "amine", nameFr: "Amine", nameAr: "أمين", tagFr: "Voix commerciale", tagAr: "صوت تجاري", location: "Alger, DZ", gender: "male", category: "commercial", rating: 4.9, reviews: 234, color: "#6E5FE8", sampleFr: "Salam 3likoum khawti! M3a Sawtify, nassek yewli sawt tabi3i, wadeh, wahli l i3lanat.", sampleAr: "سلام عليكم خاوتي! مع صوتيفي، نصوصكم تولي صوت طبيعي، واضح، جاهز للإعلانات." },
  { id: "yasmine", nameFr: "Yasmine", nameAr: "ياسمين", tagFr: "Voix publicitaire", tagAr: "صوت إعلاني", location: "Oran, DZ", gender: "female", category: "commercial", rating: 4.8, reviews: 189, color: "#F472B6", sampleFr: "Marhba bikom kamlin! Tawsil 58 wilaya, payment 3and l istlam. Tleb dorka.", sampleAr: "مرحبا بيكم كاملين! التوصيل لـ 58 ولاية والدفع عند الاستلام. اطلب درك." },
  { id: "khalid", nameFr: "Khalid", nameAr: "خالد", tagFr: "Voix documentaire", tagAr: "صوت وثائقي", location: "Constantine, DZ", gender: "male", category: "formal", rating: 5.0, reviews: 312, color: "#10B981", sampleFr: "Nqeddmlkom lyom notq mawzoun w dqi9, l watha2iqiyat w contenu rassmi.", sampleAr: "نقدّم ليكم اليوم نطق موزون ودقيق، للوثائقيات والمحتوى الرسمي." },
  { id: "layla", nameFr: "Layla", nameAr: "ليلى", tagFr: "Voix social media", tagAr: "صوت سوشيال", location: "Annaba, DZ", gender: "female", category: "social", rating: 4.9, reviews: 156, color: "#F59E0B", sampleFr: "Salut l'équipe ! Une voix vive, parfaite pour Reels, TikTok et stories.", sampleAr: "واش راكم ليكيب؟ صوت حيوي، هايل للريلز وتيك توك والستوريز." },
  { id: "yacine", nameFr: "Yacine", nameAr: "ياسين", tagFr: "Voix éducative", tagAr: "صوت تعليمي", location: "Sétif, DZ", gender: "male", category: "narrative", rating: 4.7, reviews: 98, color: "#3B82F6", sampleFr: "Dans cette leçon, on avance pas à pas. Une voix claire, pour e-learning et tutos.", sampleAr: "في هاد الدرس، نمشيو خطوة بخطوة. صوت واضح للشروحات والدروس." },
  { id: "nadia", nameFr: "Nadia", nameAr: "نادية", tagFr: "Voix podcast", tagAr: "صوت بودكاست", location: "Tlemcen, DZ", gender: "female", category: "narrative", rating: 4.9, reviews: 267, color: "#8B5CF6", sampleFr: "Bienvenue dans cet épisode. Une voix chaleureuse, pour podcasts et YouTube.", sampleAr: "مرحبا بيكم في هاد الحلقة. صوت دافئ للبودكاست ويوتيوب." },
  { id: "maryam", nameFr: "Maryam", nameAr: "مريم", tagFr: "Narration & podcast", tagAr: "سرد وبودكاست", location: "Alger, DZ", gender: "female", category: "narrative", rating: 4.8, reviews: 201, color: "#EC4899", sampleFr: "Écoutez une diction fluide et élégante, pour vos récits et documentaires.", sampleAr: "استمعوا لنطق سلس وأنيق، للروايات والوثائقيات." },
  { id: "rachid", nameFr: "Rachid", nameAr: "رشيد", tagFr: "Énergique & pub", tagAr: "حماسي وإشهاري", location: "Oran, DZ", gender: "male", category: "commercial", rating: 4.9, reviews: 176, color: "#EF4444", sampleFr: "Une voix percutante, idéale pour vos spots et lancements produits.", sampleAr: "صوت قوي، هايل للسبوتات وإطلاق المنتجات." },
  { id: "bilal", nameFr: "Bilal", nameAr: "بلال", tagFr: "Narration & récit", tagAr: "سردي وقصصي", location: "Constantine, DZ", gender: "male", category: "narrative", rating: 4.8, reviews: 142, color: "#0EA5E9", sampleFr: "Le rendu est si naturel qu'on croirait un présentateur en studio.", sampleAr: "الصوت يخرج طبيعي كأنو متحدث حقيقي في الستوديو." },
];

const LANDING_VOICE_IDS = ["amine", "yasmine", "khalid"] as const;
const LANDING_VOICES = VOICES.filter((v) => (LANDING_VOICE_IDS as readonly string[]).includes(v.id));

const COST_STEPS = [
  { sec: 60, pts: 20, labelFr: "0–60 s", labelAr: "0–60 ثا" },
  { sec: 120, pts: 30, labelFr: "2 min", labelAr: "2 دق" },
  { sec: 180, pts: 40, labelFr: "3 min", labelAr: "3 دق" },
  { sec: 240, pts: 50, labelFr: "4 min", labelAr: "4 دق" },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onLoginClick, onSigninClick, language, setLanguage,
}) => {
  const isRTL = language === "ar";
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTesti, setActiveTesti] = useState(0);
  const [featuredId, setFeaturedId] = useState("amine");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [listenVoice, setListenVoice] = useState<VoiceCard | null>(null);
  const [legal, setLegal] = useState<null | "cgu" | "privacy">(null);
  const [costIdx, setCostIdx] = useState(0);
  const [holdVoice, setHoldVoice] = useState(false);
  const { scrollYProgress } = useScroll();
  const scrolled = useScrolled();

  const introAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isIntroPlaying, setIsIntroPlaying] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0);
  const animFrameRef = useRef<number | null>(null);

  const overlayOpen = menuOpen || !!listenVoice || !!legal;

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    document.title = isRTL ? "صوتيفي — صوت طبيعي بالدارجة" : "Sawtify — Voix naturelle en darija";
  }, [language, isRTL]);

  useEffect(() => {
    document.body.style.overflow = overlayOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [overlayOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMenuOpen(false);
      setListenVoice(null);
      setLegal(null);
      setPlayingId(null);
      if (introAudioRef.current) {
        introAudioRef.current.pause();
        setIsIntroPlaying(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const audio = new Audio(INTRO_AUDIO_URL);
    audio.preload = "auto";
    introAudioRef.current = audio;

    audio.onended = () => {
      setIsIntroPlaying(false);
      setAudioVolume(0);
    };

    const updateRhythm = () => {
      if (introAudioRef.current && !introAudioRef.current.paused) {
        const time = performance.now() * 0.012;
        const v = Math.abs(Math.sin(time) * Math.cos(time * 0.7)) * 0.8 + Math.random() * 0.2;
        setAudioVolume(v);
        animFrameRef.current = requestAnimationFrame(updateRhythm);
      } else {
        setAudioVolume(0);
      }
    };

    audio.onplay = () => {
      setIsIntroPlaying(true);
      animFrameRef.current = requestAnimationFrame(updateRhythm);
    };

    audio.onpause = () => {
      setIsIntroPlaying(false);
      setAudioVolume(0);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };

    const handleFirstInteraction = () => {
      audio.play().catch((err) => {
        console.warn("La lecture automatique a été bloquée par le navigateur :", err);
      });
      cleanupListeners();
    };

    const cleanupListeners = () => {
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("scroll", handleFirstInteraction);
      window.removeEventListener("touchstart", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
    };

    window.addEventListener("click", handleFirstInteraction, { passive: true, once: true });
    window.addEventListener("scroll", handleFirstInteraction, { passive: true, once: true });
    window.addEventListener("touchstart", handleFirstInteraction, { passive: true, once: true });
    window.addEventListener("keydown", handleFirstInteraction, { passive: true, once: true });

    return () => {
      cleanupListeners();
      audio.pause();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const stopIntroAudio = () => {
    if (introAudioRef.current && !introAudioRef.current.paused) {
      introAudioRef.current.pause();
      setIsIntroPlaying(false);
      setAudioVolume(0);
    }
  };

  const t = {
    skip: isRTL ? "Aller au contenu" : "Aller au contenu",
    navVoices: isRTL ? "الأصوات" : "Voix",
    navHow: isRTL ? "كيف يعمل" : "Comment ça marche",
    navPricing: isRTL ? "الأسعار" : "Tarifs",
    navFaq: "FAQ",
    navContact: isRTL ? "تواصل" : "Contact",
    signin: isRTL ? "دخول" : "Connexion",
    start: isRTL ? "ابدأ الآن" : "Commencer",
    liveBadge: isRTL ? "v2.1 · متصل" : "v2.1 · En ligne",
    heroKicker: isRTL ? "استوديو الدارجة" : "STUDIO DARIJA",
    heroTitle1: isRTL ? "صوت" : "Une voix",
    heroTitle2: isRTL ? "لا يُفرَّق." : "indiscernable.",
    heroSub: isRTL
      ? "نصّك بالدارجة يولي صوتًا طبيعيًا في 30 ثانية. هنا تسمع البداية فقط… والباقي في الاستوديو."
      : "Votre texte en darija devient une voix naturelle en 30 secondes. Ici, vous n’entendez que le début… la suite est dans le studio.",
    bookNow: isRTL ? "أكمل الاستماع" : "Continuer l’écoute",
    listenDemo: isRTL ? "اسمع 3 أصوات فقط" : "Écouter 3 voix",
    welcomeChip: isRTL ? "50 نقطة مجاناً. بدون بطاقة." : "50 points offerts. Sans carte.",
    creators: isRTL ? "مستخدم" : "créateurs",
    popularKicker: isRTL ? "لا نكشف الكل" : "ON NE MONTRE PAS TOUT",
    popularTitle: isRTL ? "9 أصوات. هنا 3 فقط." : "9 voix. Ici, seulement 3.",
    popularSub: isRTL
      ? "أمين، ياسمين، خالد. باقي الأصوات تسمعهم في الاستوديو."
      : "Amine, Yasmine, Khalid. Les autres voix s’écoutent dans le studio.",
    nRatings: isRTL ? "تقييم" : "avis",
    tryVoice: isRTL ? "أكمل الاستماع" : "Continuer l’écoute",
    listenInStudio: isRTL ? "اسمع البداية" : "Écouter le début",
    listenBody: isRTL
      ? "هذه أول جملة فقط. الصوت كامل في الاستوديو. 50 نقطة مجاناً، بدون بطاقة."
      : "Ce n’est que la première phrase. La voix entière est dans le studio. 50 points offerts, sans carte.",
    journeyKicker: isRTL ? "بدون أن تتكلم" : "SANS MICRO",
    journeyTitle: isRTL ? "أربع خطوات. يخرج الصوت." : "Quatre gestes. La voix sort.",
    journeySub: isRTL ? "بدون كابينة. بدون ميكروفون. بدون انتظار." : "Pas de cabine. Pas de micro. Pas d’attente.",
    useKicker: isRTL ? "أين تستعمله" : "USAGES",
    useTitle: isRTL ? "حين يتكلم، لم يعد نصًا." : "Quand ça parle, ce n’est plus du texte.",
    costKicker: isRTL ? "وبكم" : "ET COMBIEN",
    costTitle: isRTL ? "أقل مما تظن." : "Moins que vous ne couyez.",
    costSub: isRTL
      ? "20 نقطة لأول 60 ثانية، ثم +10 لكل دقيقة. النقاط لا تنتهي."
      : "20 points pour les 60 premières secondes, puis +10 par minute. Les points n’expirent pas.",
    unleashTitle: isRTL ? "لن يعرفوا أنك بلا استوديو." : "Personne ne saura que vous n’avez pas de studio.",
    unleashSub: isRTL
      ? "لا كابينة. لا ممثل تُدفع له. صوت يبيع. 50 نقطة مجاناً لتسمع الفرق بنفسك."
      : "Pas de cabine. Pas de comédien à payer. Une voix qui vend. 50 points offerts pour entendre la différence.",
    unleashCTA: isRTL ? "دخول الاستوديو" : "Accéder au studio",
    metricsKicker: isRTL ? "الأرقام" : "LES CHIFFRES",
    metricsTitle: isRTL ? "الأرقام لا تكذب." : "Les chiffres ne mentent pas.",
    testKicker: isRTL ? "من جرّب" : "ILS ONT TESTÉ",
    testTitle: isRTL ? "من يسمع، يظنّه إنسانًا." : "Qui écoute croit entendre quelqu’un.",
    pricingKicker: isRTL ? "الأسعار" : "TARIFS",
    pricingTitle: isRTL ? "نقاط. بلا اشتراك." : "Des points. Sans abonnement.",
    pricingSub: isRTL ? "بالدينار. بلا تاريخ انتهاء." : "En dinars. Sans date d’expiration.",
    welcomeBanner: isRTL
      ? "هدية الدخول: 50 نقطة مجاناً عند التسجيل."
      : "Cadeau d’inscription : 50 points offerts.",
    choose: isRTL ? "اختيار" : "Choisir",
    popular: isRTL ? "الأكثر طلبًا" : "Le plus demandé",
    faqKicker: "FAQ",
    faqTitle: isRTL ? "أسئلة متكررة" : "Questions fréquentes",
    ctaTitle: isRTL ? "تريد أن تسمعه حتى النهاية؟" : "Envie d’entendre la suite ?",
    ctaSub: isRTL ? "50 نقطة مجاناً. 9 أصوات. 3 فقط هنا. بدون بطاقة." : "50 points offerts. 9 voix. 3 seulement ici. Sans carte.",
    footTag: isRTL ? "صُنع في الجزائر" : "Fait en Algérie",
    switchLang: isRTL ? "FR" : "AR",
    close: isRTL ? "إغلاق" : "Fermer",
    open: isRTL ? "القائمة" : "Menu",
    cgu: isRTL ? "شروط الخدمة" : "CGU",
    privacy: isRTL ? "الخصوصية" : "Confidentialité",
    contact: isRTL ? "تواصل" : "Contact",
    pts: isRTL ? "نقطة" : "pts",
    moreVoices: isRTL ? "دخول الاستوديو" : "Accéder au studio",
  };

  const nav = [
    { href: "#voices", label: t.navVoices },
    { href: "#process", label: t.navHow },
    { href: "#pricing", label: t.navPricing },
    { href: "#faq", label: t.navFaq },
    { href: "#contact", label: t.navContact },
  ];

  const featured = VOICES.find((v) => v.id === featuredId) || VOICES[0];
  const sampleFull = isRTL ? featured.sampleAr : featured.sampleFr;
  const [typed, setTyped] = useState("");
  const [cutDone, setCutDone] = useState(false);

  useEffect(() => {
    setTyped("");
    setCutDone(false);
    const cutAt = Math.max(32, Math.floor(sampleFull.length * 0.44));
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      if (i >= cutAt) {
        setTyped(sampleFull.slice(0, cutAt).trimEnd());
        setCutDone(true);
        window.clearInterval(id);
      } else {
        setTyped(sampleFull.slice(0, i));
      }
    }, 22);
    return () => window.clearInterval(id);
  }, [featured.id, sampleFull]);

  useEffect(() => {
    if (listenVoice || holdVoice || isIntroPlaying) return;
    const id = window.setInterval(() => {
      setFeaturedId((prev) => {
        const i = LANDING_VOICES.findIndex((v) => v.id === prev);
        return LANDING_VOICES[(i + 1) % LANDING_VOICES.length].id;
      });
    }, 5200);
    return () => window.clearInterval(id);
  }, [listenVoice, holdVoice, isIntroPlaying]);

  const journeySteps = [
    { n: "1", t: isRTL ? "اكتب" : "Écrire", d: isRTL ? "ألصق نصك بالدارجة، بالعربية أو بالفرنسية." : "Collez votre texte en darija, en arabe ou en français." },
    { n: "2", t: isRTL ? "اختر" : "Choisir", d: isRTL ? "9 أصوات. هنا نعرض 3 فقط." : "9 voix. Ici, on n’en montre que 3." },
    { n: "3", t: isRTL ? "اضبط" : "Régler", d: isRTL ? "السرعة، النبرة، التأثيرات… الباقي في الاستوديو." : "Vitesse, timbre, effets… le reste est dans le studio." },
    { n: "4", t: isRTL ? "حمّل" : "Télécharger", d: isRTL ? "MP3 أو WAV. بلا علامة مائية. استعمال تجاري." : "MP3 ou WAV. Sans filigrane. Usage commercial." },
  ];

  const uses = [
    { icon: ShoppingBag, t: isRTL ? "تجارة إلكترونية" : "E-commerce", d: isRTL ? "سبوت، عرض، توصيل 58 ولاية." : "Spots, promos, livraison 58 wilayas." },
    { icon: Clapperboard, t: isRTL ? "ريلز وتيك توك" : "Reels & TikTok", d: isRTL ? "صوت قصير وحيوي، جاهز للقصص." : "Voix courte, vive, prête pour les stories." },
    { icon: Mic2, t: isRTL ? "بودكاست ويوتيوب" : "Podcast & YouTube", d: isRTL ? "سرد طويل، نبرة ثابتة." : "Narration longue, timbre stable." },
    { icon: Phone, t: isRTL ? "موزّع هاتفي" : "Standard", d: isRTL ? "مرحبًا، اضغط 1، خدمة الزبائن." : "Bienvenue, tapez 1, service client." },
  ];

  const metrics = [
    { n: 9, s: "", l: isRTL ? "صوت" : "voix" },
    { n: 1200, s: "+", l: isRTL ? "مستخدم" : "créateurs" },
    { n: 50, s: "K+", l: isRTL ? "صوت مُولَّد" : "voix générées" },
    { n: 99, s: "%", l: isRTL ? "لا يُفرَّق" : "indiscernable" },
  ];

  const testimonials = isRTL
    ? [
        { q: "جرّبت 5 منصات قبل صوتيفي. هنا الصوت يبدو بشريًا فعلًا. الزبائن لا يلاحظون الفرق.", n: "أمين ب.", r: "صانع محتوى، الجزائر", img: "AB" },
        { q: "استخدمته لإعلانات تجارية. نتيجة احترافية دون الحاجة إلى استوديو.", n: "ياسمين ق.", r: "وكالة إشهار، وهران", img: "YK" },
        { q: "أفضل صوت جزائري سمعته. طبيعي 100٪ والدفع بالذهبية مريح.", n: "خالد م.", r: "تاجر إلكتروني، قسنطينة", img: "KM" },
      ]
    : [
        { q: "J’ai testé 5 plateformes avant Sawtify. Ici, la voix sonne vraiment humaine. Mes clients ne font pas la différence.", n: "Amine B.", r: "Créateur, Alger", img: "AB" },
        { q: "Utilisé pour mes pubs. Un rendu pro, sans studio.", n: "Yasmine K.", r: "Agence pub, Oran", img: "YK" },
        { q: "La meilleure voix algérienne que j’ai entendue. Naturelle à 100 %, et le paiement Edahabia est simple.", n: "Khaled M.", r: "E-commerçant, Constantine", img: "KM" },
      ];

  useEffect(() => {
    const id = setInterval(() => setActiveTesti((p) => (p + 1) % testimonials.length), 6500);
    return () => clearInterval(id);
  }, [testimonials.length]);

  const pricing = [
    { pts: 100, ptsLabel: "100", price: "500", desc: isRTL ? "للتجربة المرنة والحرة." : "Pour découvrir la plateforme." },
    { pts: 220, ptsLabel: "220", price: "1 000", featured: true, desc: isRTL ? "الأكثر طلبًا — الباقة المثالية." : "Le choix le plus populaire." },
    { pts: 600, ptsLabel: "600", price: "2 500", desc: isRTL ? "لمن يعمل يوميًا — وكالات وصنّاع محتوى." : "Pour un usage régulier — agences et créateurs." },
    { pts: 1350, ptsLabel: "1 350", price: "5 000", desc: isRTL ? "للمحترفين — حجم كبير." : "Pour les professionnels — grands volumes." },
  ];

  const faqs = isRTL
    ? [
        { q: "هل الصوت يبدو كإنسان؟", a: "نعم. دارجة حيّة، 24 kHz. 99٪ ممن يسمعون لا يفرّقون." },
        { q: "هل يمكن استعماله في الإعلان؟", a: "نعم. إعلان، يوتيوب، تيك توك، موزّع — استعمال تجاري كامل، بلا علامة مائية." },
        { q: "كيف تعمل النقاط؟", a: "20 نقطة لـ 0–60 ثانية، ثم +10 لكل دقيقة. لا تنتهي. 50 نقطة مجاناً عند التسجيل." },
        { q: "الذهبية و CIB؟", a: "نعم، SATIM، بالدينار. لا تحتاج بطاقة أجنبية." },
        { q: "هل أجرّب مجانًا؟", a: "نعم. 50 نقطة مجاناً، بدون بطاقة. وهنا 3 أصوات فقط — الباقي في الاستوديو." },
      ]
    : [
        { q: "La voix parle comme quelqu’un ?", a: "Oui. Darija vivante, 24 kHz. 99 % de ceux qui écoutent ne font pas la différence." },
        { q: "Puis-je l’utiliser en pub ?", a: "Oui. Pub, YouTube, TikTok, standard — usage commercial, sans filigrane." },
        { q: "Comment marchent les points ?", a: "20 points pour 0–60 s, puis +10 par minute. Ils n’expirent pas. 50 points offerts à l’inscription." },
        { q: "Edahabia et CIB ?", a: "Oui, SATIM, en dinars. Pas besoin de carte étrangère." },
        { q: "Je peux essayer sans payer ?", a: "Oui. 50 points offerts, sans carte. Ici seulement 3 voix — les autres sont dans le studio." },
      ];

  const trust = [
    { k: "Edahabia", v: isRTL ? "بريد الجزائر" : "La Poste" },
    { k: "CIB", v: isRTL ? "البنوك" : "Banques" },
    { k: "SATIM", v: isRTL ? "دفع آمن" : "Paiement sécurisé" },
    { k: "24 kHz", v: isRTL ? "جودة استوديو" : "Qualité studio" },
    { k: "MP3 · WAV", v: isRTL ? "بلا علامة مائية" : "Sans filigrane" },
  ];

  const smoothTo = useCallback((href: string) => {
    setMenuOpen(false);
    const el = document.querySelector(href);
    if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" });
  }, []);

  const openListen = (voice: VoiceCard) => {
    stopIntroAudio();
    setFeaturedId(voice.id);
    setPlayingId(voice.id);
    setListenVoice(voice);
  };

  const handleToggleIntroAudio = () => {
    if (!introAudioRef.current) return;
    if (isIntroPlaying) {
      introAudioRef.current.pause();
    } else {
      setPlayingId(null);
      introAudioRef.current.play().catch((err) => console.log(err));
    }
  };

  const display = isRTL ? "'Cairo', sans-serif" : "'Fraunces', serif";
  const sans = isRTL ? "'Cairo', sans-serif" : "'Inter', sans-serif";
  const ArrowIcon = ({ className = "w-4 h-4" }: { className?: string }) =>
    isRTL ? <ArrowLeft className={className} /> : <ArrowRight className={className} />;

  const legalCopy = {
    cgu: isRTL
      ? "شروط الاستخدام: صوتيفي منصة جزائرية لتحويل النص إلى صوت بالدارجة. الحساب شخصي. النقاط غير قابلة للتحويل نقدًا ولا تنتهي صلاحيتها. الاستعمال التجاري مسموح في حدود القانون الجزائري. يُمنع توليد محتوى غير قانوني أو مسيء. الدفع عبر SATIM (الذهبية / CIB). في حال فشل التوليد، تُعاد النقاط إلى رصيدك."
      : "Conditions d’utilisation : Sawtify est une plateforme algérienne de conversion texte → voix en darija. Le compte est personnel. Les points ne sont pas remboursables en dinars et n’expirent pas. L’usage commercial est autorisé dans le cadre de la loi algérienne. Tout contenu illicite ou injurieux est interdit. Le paiement passe par SATIM (Edahabia / CIB). En cas d’échec de génération, les points sont recrédités.",
    privacy: isRTL
      ? "الخصوصية: نحتفظ بالحد الأدنى من البيانات (البريد، الرصيد، النصوص المولَّدة) لتشغيل الحساب. لا نبيع بياناتك. يمكنك طلب حذف حسابك عبر صفحة التواصل. المدفوعات تُعالَج من طرف SATIM — صوتيفي لا يخزّن أرقام البطاقات."
      : "Confidentialité : nous conservons le minimum (e-mail, solde, textes générés) pour faire fonctionner le compte. Nous ne vendons pas vos données. Vous pouvez demander la suppression du compte via Contact. Les paiements sont traités par SATIM — Sawtify ne stocke aucun numéro de carte.",
  };

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen relative" style={{ fontFamily: sans, color: INK, background: PAPER }}>
      <GlobalStyles />

      <a href="#home" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-[80] focus:bg-white focus:px-4 focus:py-2 focus:rounded-full focus:font-bold focus:text-sm">
        {t.skip}
      </a>

      <motion.div aria-hidden className="fixed top-0 inset-x-0 h-[3px] z-[60]" style={{ scaleX: scrollYProgress, background: "linear-gradient(90deg, #6E5FE8, #9D8FFF)", transformOrigin: isRTL ? "100% 50%" : "0% 50%" }} />

      {/* HEADER */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "bg-[#FAFAF7]/90 backdrop-blur-xl border-b border-[#0F0F1A]/5" : "bg-transparent"}`}>
        <div className="mx-auto max-w-[1280px] px-5 sm:px-6 h-16 flex items-center justify-between">
          <a href="#home" onClick={(e) => { e.preventDefault(); smoothTo("#home"); }} className="focus-ring flex items-center gap-2.5" aria-label="Sawtify">
            <Logo size={40} />
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              v2.1
            </span>
          </a>
          <nav className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-7 text-[13px] font-semibold text-[#0F0F1A]/65">
            {nav.map((l) => (
              <a key={l.href} href={l.href} onClick={(e) => { e.preventDefault(); smoothTo(l.href); }} className="hover:text-[#0F0F1A] transition-colors focus-ring">
                {l.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button type="button" onClick={() => setLanguage(language === "fr" ? "ar" : "fr")} className="w-10 h-10 rounded-full text-[12px] font-bold text-[#0F0F1A]/70 hover:bg-[#0F0F1A]/5 transition focus-ring" aria-label={t.switchLang}>
              {t.switchLang}
            </button>
            <button type="button" onClick={onLoginClick} className="hidden md:block text-[13px] font-semibold text-[#0F0F1A]/70 hover:text-[#0F0F1A] px-3 focus-ring">
              {t.signin}
            </button>
            <button type="button" onClick={onSigninClick} className="h-10 px-4 sm:px-5 rounded-full text-[13px] sm:text-[14px] font-bold text-white focus-ring transition hover:opacity-90" style={{ background: INK }}>
              {t.start}
            </button>
            <button type="button" onClick={() => setMenuOpen(true)} aria-label={t.open} className="lg:hidden w-10 h-10 rounded-full hover:bg-[#0F0F1A]/5 flex items-center justify-center focus-ring">
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE DRAWER */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenuOpen(false)} className="fixed inset-0 z-[55] bg-black/50 lg:hidden" />
            <motion.div
              initial={{ x: isRTL ? "-100%" : "100%" }}
              animate={{ x: 0 }}
              exit={{ x: isRTL ? "-100%" : "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 280 }}
              className="fixed inset-y-0 end-0 z-[60] w-[85%] max-w-sm bg-[#FAFAF7] lg:hidden flex flex-col"
            >
              <div className="flex items-center justify-between px-5 h-16 border-b border-[#0F0F1A]/5">
                <Logo size={36} />
                <button type="button" onClick={() => setMenuOpen(false)} className="w-10 h-10 rounded-full hover:bg-[#0F0F1A]/5 flex items-center justify-center focus-ring" aria-label={t.close}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex-1 px-5 py-6 flex flex-col">
                {nav.map((l) => (
                  <a key={l.href} href={l.href} onClick={(e) => { e.preventDefault(); smoothTo(l.href); }} className="py-4 text-[18px] font-bold border-b border-[#0F0F1A]/5 focus-ring">
                    {l.label}
                  </a>
                ))}
                <button type="button" onClick={() => { setMenuOpen(false); onLoginClick(); }} className="mt-4 py-3 text-start text-[16px] font-semibold text-[#0F0F1A]/70">
                  {t.signin}
                </button>
              </nav>
              <div className="p-5">
                <button type="button" onClick={() => { setMenuOpen(false); onSigninClick(); }} className="w-full h-12 rounded-full font-bold text-white" style={{ background: INK }}>{t.start}</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* HERO SECTION WITH VIDEO BACKGROUND */}
      <section id="home" className="relative pt-28 pb-16 sm:pb-24 min-h-[90vh] flex items-center overflow-hidden">
        {/* VIDEO BACKGROUND */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover opacity-20 scale-105"
          >
            <source src={HERO_VIDEO_URL} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-[#FAFAF7]/70 via-[#FAFAF7]/50 to-[#FAFAF7]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#FAFAF7_80%)]" />
        </div>

        <div className="mx-auto max-w-[1280px] px-5 sm:px-6 relative z-10 w-full">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6">
              <SlideUp>
                <div className="inline-flex items-center gap-2 mb-6 px-3.5 py-1.5 rounded-full border border-[#0F0F1A]/10 bg-white/80 backdrop-blur-md">
                  <span className="relative flex w-1.5 h-1.5">
                    <span className="absolute inset-0 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="relative rounded-full w-1.5 h-1.5 bg-emerald-500" />
                  </span>
                  <span className="text-[11px] font-bold tracking-widest" style={{ fontFamily: "'Outfit', sans-serif" }}>{t.liveBadge}</span>
                </div>
              </SlideUp>
              <SlideUp delay={0.08}>
                <p className="text-[12px] font-bold tracking-[0.18em] uppercase mb-5" style={{ color: ACCENT }}>// {t.heroKicker}</p>
              </SlideUp>
              <SlideUp delay={0.14}>
                <h1 className="text-[clamp(2.6rem,6.5vw,5.2rem)] leading-[0.96] tracking-[-0.04em] font-extrabold" style={{ fontFamily: display }}>
                  {t.heroTitle1}<br />
                  <span style={{ background: "linear-gradient(135deg, #6E5FE8 0%, #9D8FFF 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    {t.heroTitle2}
                  </span>
                </h1>
              </SlideUp>
              <SlideUp delay={0.24}>
                <p className="mt-6 text-[16px] sm:text-[17px] text-[#0F0F1A]/80 max-w-lg leading-relaxed font-medium">{t.heroSub}</p>
              </SlideUp>
              <SlideUp delay={0.32}>
                <div className="mt-8 flex items-center gap-3 flex-wrap">
                  <button type="button" onClick={onSigninClick} className="h-12 px-7 rounded-full text-[14px] font-bold text-white transition focus-ring hover:opacity-90" style={{ background: ACCENT, boxShadow: "0 0 30px rgba(110, 95, 232, 0.35)" }}>
                    {t.bookNow}
                  </button>
                  <button type="button" onClick={handleToggleIntroAudio} className="group h-12 px-5 rounded-full border border-[#0F0F1A]/15 bg-white/80 backdrop-blur-md hover:border-[#6E5FE8] text-[14px] font-semibold flex items-center gap-2.5 transition focus-ring">
                    <span className="w-7 h-7 rounded-full text-white flex items-center justify-center" style={{ background: ACCENT }}>
                      {isIntroPlaying ? (
                        <Pause className="w-2.5 h-3 fill-current" />
                      ) : (
                        <Play className="w-2.5 h-3 fill-current" />
                      )}
                    </span>
                    {isIntroPlaying ? (isRTL ? "إيقاف الصوت" : "Pause de l'intro") : (isRTL ? "تشغيل التقديم" : "Play l'intro")}
                  </button>
                </div>
                <p className="mt-4 text-[12px] font-semibold text-[#6E5FE8] flex items-center gap-1.5">
                  <Gift className="w-3.5 h-3.5" /> {t.welcomeChip}
                </p>
              </SlideUp>
              <SlideUp delay={0.4}>
                <div className="mt-9 flex items-center gap-5 text-[12px] text-[#0F0F1A]/50 flex-wrap">
                  <div className="flex -space-x-1.5" dir="ltr">
                    {["#6E5FE8", "#F472B6", "#10B981"].map((c) => (
                      <div key={c} className="w-7 h-7 rounded-full border-2 border-[#FAFAF7]" style={{ background: c }} />
                    ))}
                  </div>
                  <span className="font-bold text-[#0F0F1A]/70"><Num>9</Num> {isRTL ? "أصوات" : "voix"}</span>
                  <span>·</span>
                  <span><Num>1 200+</Num> {t.creators}</span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1"><Star className="w-3 h-3 fill-[#6E5FE8] text-[#6E5FE8]" /> 4.9 / 5</span>
                </div>
              </SlideUp>
            </div>

            {/* Hero player */}
            <div className="lg:col-span-6">
              <SlideUp delay={0.2}>
                <div className="relative bg-white/90 backdrop-blur-md rounded-[28px] border border-[#0F0F1A]/8 shadow-[0_24px_80px_-40px_rgba(15,15,26,0.35)] p-5 sm:p-7">
                  <div className="flex items-center justify-between gap-3 mb-5">
                    <div>
                      <div className="text-[10px] font-bold tracking-widest uppercase text-[#0F0F1A]/40">Studio</div>
                      <div className="text-[18px] font-extrabold">{isIntroPlaying ? (isRTL ? "تقديم صوتي" : "Présentation audio") : (isRTL ? featured.nameAr : featured.nameFr)}</div>
                      <div className="text-[12px] text-[#0F0F1A]/55">
                        {isIntroPlaying ? (isRTL ? "مباشر" : "En cours de lecture") : `${isRTL ? featured.tagAr : featured.tagFr} · ${featured.location}`}
                      </div>
                    </div>
                    <div className="text-end">
                      <div className="text-[10px] font-bold tracking-widest uppercase text-[#0F0F1A]/40">24 kHz</div>
                      <div className="text-[13px] font-bold" style={{ color: ACCENT }}>20 {t.pts}</div>
                    </div>
                  </div>

                  <div className="rounded-2xl px-4 py-5 mb-5" style={{ background: `${featured.color}12` }}>
                    <Waveform color={featured.color} playing={isIntroPlaying} bars={42} />
                  </div>

                  <p className="text-[13px] leading-relaxed text-[#0F0F1A]/75 min-h-[64px]" dir="auto">
                    {isIntroPlaying ? (
                      isRTL 
                        ? "“أنت تستمع حاليًا إلى الصوت التجريبي الحصري للمنصة الذي تم إطلاقه تلقائيًا عند تفاعلك الأول مع الصفحة...”"
                        : "“Vous écoutez actuellement l'audio de démonstration exclusif de la plateforme, lancé automatiquement dès votre première interaction...”"
                    ) : (
                      <>“{typed}{cutDone ? "…" : ""}”{!cutDone && <span className="caret" aria-hidden />}</>
                    )}
                  </p>
                  {cutDone && !isIntroPlaying && (
                    <p className="mt-2 text-[11px] font-bold tracking-wide" style={{ color: featured.color }}>
                      {isRTL ? "— انقطع. أكمل في الاستوديو." : "— coupé. La suite est dans le studio."}
                    </p>
                  )}

                  <div className="mt-5 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {LANDING_VOICES.map((v) => {
                      const on = v.id === featured.id && !isIntroPlaying;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => { setFeaturedId(v.id); setPlayingId(null); setHoldVoice(true); stopIntroAudio(); }}
                          className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-bold border transition focus-ring ${on ? "text-white border-transparent" : "bg-white text-[#0F0F1A]/70 border-[#0F0F1A]/10 hover:border-[#6E5FE8]"}`}
                          style={on ? { background: v.color } : undefined}
                        >
                          {isRTL ? v.nameAr : v.nameFr}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => openListen(featured)}
                    className="mt-5 w-full h-12 rounded-full text-white font-bold text-[14px] flex items-center justify-center gap-2 focus-ring hover:opacity-90"
                    style={{ background: featured.color, boxShadow: `0 10px 30px -8px ${featured.color}` }}
                  >
                    <Play className="w-4 h-4 fill-current" />
                    {t.listenInStudio}
                    <span className="text-[11px] font-semibold opacity-80">· 3s</span>
                  </button>
                </div>
              </SlideUp>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className="py-7 border-y border-[#0F0F1A]/8 bg-white" aria-label={isRTL ? "وسائل الدفع والجودة" : "Paiement et qualité"}>
        <div className="mx-auto max-w-[1280px] px-5 sm:px-6 grid grid-cols-2 sm:grid-cols-5 gap-4">
          {trust.map((p) => (
            <div key={p.k} className="text-center">
              <div className="text-[14px] font-extrabold tracking-tight">{p.k}</div>
              <div className="text-[11px] text-[#0F0F1A]/50 mt-0.5">{p.v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* VOICES */}
      <section id="voices" className="py-16 sm:py-24">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
          <SlideUp>
            <p className="text-[12px] font-bold tracking-[0.18em] uppercase mb-3" style={{ color: ACCENT }}>// {t.popularKicker}</p>
            <h2 className="text-[clamp(2rem,4.5vw,3.4rem)] leading-[1.05] tracking-[-0.03em] font-extrabold max-w-2xl" style={{ fontFamily: display }}>{t.popularTitle}</h2>
            <p className="text-[14px] text-[#0F0F1A]/60 mt-3 max-w-xl">{t.popularSub}</p>
          </SlideUp>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-5">
              {LANDING_VOICES.map((v, idx) => {
                const active = playingId === v.id || (featuredId === v.id && !isIntroPlaying);
                const name = isRTL ? v.nameAr : v.nameFr;
                return (
                  <SlideUp key={v.id} delay={idx * 0.08}>
                    <article className={`group bg-white rounded-3xl overflow-hidden card-lift border ${active ? "border-[#6E5FE8]/40 ring-2 ring-[#6E5FE8]/15" : "border-[#0F0F1A]/5"}`}>
                      <button type="button" onClick={() => openListen(v)} className="w-full text-start focus-ring cursor-pointer">
                        <div className="relative p-6 h-40 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${v.color}18 0%, ${v.color}06 100%)` }}>
                          <Waveform color={v.color} playing={playingId === v.id || (featuredId === v.id && !isIntroPlaying)} bars={28} />
                          <div
                            className={`absolute top-4 end-4 w-11 h-11 rounded-full flex items-center justify-center text-white transition ${playingId === v.id ? "scale-110" : "opacity-90 group-hover:scale-105"}`}
                            style={{ background: playingId === v.id ? v.color : INK }}
                          >
                            <Play className="w-4 h-4 fill-current ms-0.5" />
                          </div>
                        </div>
                        <div className="p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="text-[18px] font-extrabold">{name}</h3>
                              <p className="text-[12px] text-[#0F0F1A]/55 mt-0.5">{v.location}</p>
                            </div>
                            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-bold text-white" style={{ background: v.color }}>
                              <Star className="w-3 h-3 fill-current" /><Num>{v.rating}</Num>
                            </div>
                          </div>
                          <div className="mt-4 flex items-center justify-between text-[12px]">
                            <span className="font-semibold text-[#0F0F1A]/70">{isRTL ? v.tagAr : v.tagFr}</span>
                            <span className="text-[#0F0F1A]/45"><Num>{v.reviews}</Num> {t.nRatings}</span>
                          </div>
                        </div>
                      </button>
                    </article>
                  </SlideUp>
                );
              })}
          </div>

          <button type="button" onClick={() => { stopIntroAudio(); onSigninClick(); }} className="mt-6 w-full rounded-3xl border border-dashed border-[#0F0F1A]/20 bg-white/60 hover:border-[#6E5FE8] hover:bg-[#6E5FE8]/5 transition p-6 text-center focus-ring">
            <div className="text-[22px] font-extrabold tracking-tight" style={{ fontFamily: display }}>{t.moreVoices}</div>
            <p className="mt-1 text-[13px] text-[#0F0F1A]/55">{isRTL ? "لا نعرضهم هنا. ادخل لتسمع." : "On ne les révèle pas ici. Entrez pour écouter."}</p>
          </button>
        </div>
      </section>

      {/* PROCESS */}
      <section id="process" className="py-16 sm:py-24 bg-white">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
          <div className="text-center mb-12">
            <SlideUp>
              <p className="text-[12px] font-bold tracking-[0.18em] uppercase mb-3" style={{ color: ACCENT }}>// {t.journeyKicker}</p>
            </SlideUp>
            <SlideUp delay={0.08}>
              <h2 className="text-[clamp(2rem,4.5vw,3.4rem)] leading-[1.05] tracking-[-0.03em] font-extrabold max-w-3xl mx-auto" style={{ fontFamily: display }}>{t.journeyTitle}</h2>
            </SlideUp>
            <SlideUp delay={0.14}>
              <p className="text-[14px] text-[#0F0F1A]/60 mt-4">{t.journeySub}</p>
            </SlideUp>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {journeySteps.map((s, i) => (
              <SlideUp key={s.n} delay={i * 0.08}>
                <div className="relative bg-[#FAFAF7] rounded-3xl p-7 h-full min-h-[220px] flex flex-col justify-between border border-[#0F0F1A]/5">
                  <div className="absolute top-4 end-5 text-[72px] font-black leading-none text-[#0F0F1A]/5 select-none">{s.n}</div>
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-extrabold text-[13px]" style={{ background: ACCENT }}>0{s.n}</div>
                  <div>
                    <h3 className="text-[22px] font-extrabold mb-2" style={{ fontFamily: display }}>{s.t}</h3>
                    <p className="text-[13px] text-[#0F0F1A]/60 leading-relaxed">{s.d}</p>
                  </div>
                </div>
              </SlideUp>
            ))}
          </div>
        </div>
      </section>

      {/* USES */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
          <SlideUp>
            <p className="text-[12px] font-bold tracking-[0.18em] uppercase mb-3" style={{ color: ACCENT }}>// {t.useKicker}</p>
            <h2 className="text-[clamp(2rem,4.5vw,3.4rem)] leading-[1.05] tracking-[-0.03em] font-extrabold max-w-2xl" style={{ fontFamily: display }}>{t.useTitle}</h2>
          </SlideUp>
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {uses.map((u, i) => (
              <SlideUp key={u.t} delay={i * 0.07}>
                <div className="bg-white rounded-3xl p-6 h-full border border-[#0F0F1A]/5 card-lift">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4" style={{ background: "#6E5FE814", color: ACCENT }}>
                    <u.icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-[17px] font-extrabold mb-1.5">{u.t}</h3>
                  <p className="text-[13px] text-[#0F0F1A]/60 leading-relaxed">{u.d}</p>
                </div>
              </SlideUp>
            ))}
          </div>
        </div>
      </section>

      {/* COST */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-6 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-5">
            <SlideUp>
              <p className="text-[12px] font-bold tracking-[0.18em] uppercase mb-3" style={{ color: ACCENT }}>// {t.costKicker}</p>
              <h2 className="text-[clamp(2rem,4vw,3.2rem)] leading-[1.05] tracking-[-0.03em] font-extrabold" style={{ fontFamily: display }}>{t.costTitle}</h2>
              <p className="mt-4 text-[14px] text-[#0F0F1A]/65 leading-relaxed">{t.costSub}</p>
              <ul className="mt-6 space-y-2.5 text-[13px] text-[#0F0F1A]/70">
                {[
                  isRTL ? "50 نقطة مجاناً عند التسجيل." : "50 points offerts à l'inscription.",
                  isRTL ? "النقاط بلا تاريخ انتهاء." : "Points valables à vie.",
                  isRTL ? "الدفع بالدينار عبر SATIM." : "Paiement en DZD via SATIM.",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2">
                    <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: ACCENT }} />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </SlideUp>
          </div>
          <div className="lg:col-span-7">
            <SlideUp delay={0.1}>
              <div className="rounded-[28px] bg-[#0F0F1A] text-white p-6 sm:p-8">
                <div className="text-[12px] font-bold tracking-widest uppercase text-white/40 mb-4">{isRTL ? "احسب" : "Estimateur"}</div>
                <div className="grid grid-cols-4 gap-2 mb-6">
                  {COST_STEPS.map((s, i) => (
                    <button
                      key={s.sec}
                      type="button"
                      onClick={() => setCostIdx(i)}
                      className={`py-2.5 rounded-2xl text-[12px] font-bold transition ${costIdx === i ? "bg-white text-[#0F0F1A]" : "bg-white/10 text-white/70 hover:bg-white/15"}`}
                    >
                      {isRTL ? s.labelAr : s.labelFr}
                    </button>
                  ))}
                </div>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <div className="text-[11px] text-white/50">{isRTL ? "التكلفة" : "Coût"}</div>
                    <div className="text-[48px] leading-none font-extrabold" style={{ fontFamily: "'Outfit', sans-serif" }}>
                      {COST_STEPS[costIdx].pts}
                      <span className="text-[16px] ms-2 font-bold text-white/50">{t.pts}</span>
                    </div>
                  </div>
                  <button type="button" onClick={() => { stopIntroAudio(); onSigninClick(); }} className="h-11 px-5 rounded-full bg-[#6E5FE8] text-white text-[13px] font-bold hover:opacity-90">
                    {t.bookNow}
                  </button>
                </div>
              </div>
            </SlideUp>
          </div>
        </div>
      </section>

      {/* UNLEASH */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
          <div className="bg-[#0F0F1A] rounded-[40px] overflow-hidden grid lg:grid-cols-2 text-white">
            <div className="relative h-72 lg:h-auto min-h-[320px]" style={{ background: "linear-gradient(135deg, #6E5FE8 0%, #5B4DD8 50%, #2D1B69 100%)" }}>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-56 h-56">
                  <div className="absolute inset-0 rounded-full bg-white/20 animate-pulse" />
                  <div className="absolute inset-8 rounded-full bg-white/15" />
                  <div className="absolute inset-0 m-auto w-28 h-28 rounded-full bg-white flex items-center justify-center">
                    <Headphones className="w-14 h-14 text-[#6E5FE8]" strokeWidth={1.5} />
                  </div>
                </div>
              </div>
              <div className="absolute bottom-6 start-6 bg-white rounded-2xl px-4 py-3 text-[#0F0F1A] shadow-xl">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#0F0F1A]/50">{isRTL ? "هدية الترحيب" : "Offre de bienvenue"}</div>
                <div className="text-[22px] font-extrabold">50 {t.pts}</div>
              </div>
            </div>
            <div className="p-8 sm:p-12 lg:p-16 flex flex-col justify-center">
              <p className="text-[12px] font-bold tracking-[0.18em] text-[#9D8FFF] uppercase mb-3">// STUDIO</p>
              <h2 className="text-[clamp(1.75rem,3.4vw,2.8rem)] leading-[1.08] tracking-[-0.03em] font-extrabold" style={{ fontFamily: display }}>{t.unleashTitle}</h2>
              <p className="mt-5 text-[14px] text-white/70 leading-relaxed max-w-md">{t.unleashSub}</p>
              <div className="mt-6 flex flex-wrap gap-2 text-[11px] font-bold">
                {["24 kHz", "MP3", "WAV", isRTL ? "تجاري" : "Commercial"].map((b) => (
                  <span key={b} className="px-3 py-1 rounded-full bg-white/10">{b}</span>
                ))}
              </div>
              <button type="button" onClick={() => smoothTo("#voices")} className="mt-8 inline-flex items-center gap-2 h-12 px-6 rounded-full bg-white text-[#0F0F1A] text-[14px] font-bold hover:bg-[#9D8FFF] transition focus-ring w-fit">
                {t.unleashCTA}<ArrowIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* METRICS */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-[12px] font-bold tracking-[0.18em] uppercase mb-3" style={{ color: ACCENT }}>// {t.metricsKicker}</p>
            <h2 className="text-[clamp(2rem,4.5vw,3.4rem)] leading-[1.05] tracking-[-0.03em] font-extrabold" style={{ fontFamily: display }}>{t.metricsTitle}</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {metrics.map((m, i) => (
              <SlideUp key={m.l} delay={i * 0.07}>
                <div className="rounded-3xl p-7 text-center border border-[#0F0F1A]/5 bg-[#FAFAF7]">
                  <div className="text-[clamp(2.4rem,4.5vw,3.4rem)] leading-none font-extrabold mb-2" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    <Counter target={m.n} suffix={m.s} />
                  </div>
                  <div className="text-[12px] text-[#0F0F1A]/60 font-semibold">{m.l}</div>
                </div>
              </SlideUp>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-[12px] font-bold tracking-[0.18em] uppercase mb-3" style={{ color: ACCENT }}>// {t.testKicker}</p>
            <h2 className="text-[clamp(2rem,4.5vw,3.4rem)] leading-[1.05] tracking-[-0.03em] font-extrabold" style={{ fontFamily: display }}>{t.testTitle}</h2>
          </div>
          <div className="bg-white rounded-3xl p-8 sm:p-12 relative border border-[#0F0F1A]/5 min-h-[260px]">
            <AnimatePresence mode="wait">
              <motion.div key={activeTesti} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.4 }}>
                <div className="flex gap-1 mb-5">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="w-4 h-4 fill-[#6E5FE8] text-[#6E5FE8]" />)}
                </div>
                <blockquote className="text-[clamp(1.25rem,2.8vw,1.9rem)] leading-[1.3] font-extrabold" style={{ fontFamily: display }}>
                  “{testimonials[activeTesti].q}”
                </blockquote>
                <div className="mt-6 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-extrabold" style={{ background: "linear-gradient(135deg, #6E5FE8 0%, #9D8FFF 100%)" }}>
                    {testimonials[activeTesti].img}
                  </div>
                  <div>
                    <div className="text-[14px] font-bold">{testimonials[activeTesti].n}</div>
                    <div className="text-[12px] text-[#0F0F1A]/60">{testimonials[activeTesti].r}</div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
            <div className="absolute bottom-6 end-6 flex items-center gap-2">
              <button type="button" onClick={() => setActiveTesti((p) => (p - 1 + testimonials.length) % testimonials.length)} className="w-11 h-11 rounded-full border border-[#0F0F1A]/10 hover:border-[#6E5FE8] flex items-center justify-center focus-ring" aria-label={isRTL ? "السابق" : "Précédent"}>
                {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
              </button>
              <button type="button" onClick={() => setActiveTesti((p) => (p + 1) % testimonials.length)} className="w-11 h-11 rounded-full bg-[#0F0F1A] text-white hover:bg-[#6E5FE8] flex items-center justify-center focus-ring" aria-label={isRTL ? "التالي" : "Suivant"}>
                {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-16 sm:py-24 bg-white">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
          <div className="text-center mb-8">
            <p className="text-[12px] font-bold tracking-[0.18em] uppercase mb-3" style={{ color: ACCENT }}>// {t.pricingKicker}</p>
            <h2 className="text-[clamp(2rem,4.5vw,3.4rem)] leading-[1.05] tracking-[-0.03em] font-extrabold" style={{ fontFamily: display }}>{t.pricingTitle}</h2>
            <p className="text-[14px] text-[#0F0F1A]/60 mt-3">{t.pricingSub}</p>
          </div>

          <div className="mb-10 max-w-2xl mx-auto flex items-start gap-3 rounded-2xl bg-[#6E5FE8]/8 border border-[#6E5FE8]/20 px-4 py-3.5 text-[13px] font-medium text-[#0F0F1A]/80">
            <Gift className="w-4 h-4 mt-0.5 shrink-0 text-[#6E5FE8]" />
            <span>{t.welcomeBanner}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {pricing.map((p, i) => (
              <SlideUp key={p.pts} delay={i * 0.07}>
                <div className={`rounded-3xl p-7 h-full flex flex-col border-2 ${p.featured ? "bg-[#0F0F1A] text-white border-[#0F0F1A] relative" : "border-[#0F0F1A]/5 bg-[#FAFAF7] hover:border-[#6E5FE8]/30"}`}>
                  {p.featured && (
                    <div className="absolute -top-3 start-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider text-[#0F0F1A]" style={{ background: "#9D8FFF" }}>
                      {t.popular}
                    </div>
                  )}
                  <div className="text-[44px] leading-none font-extrabold mb-1" style={{ fontFamily: "'Outfit', sans-serif" }}><Num>{p.ptsLabel}</Num></div>
                  <div className={`text-[11px] font-semibold mb-4 uppercase tracking-wider ${p.featured ? "text-white/50" : "text-[#0F0F1A]/50"}`}>{t.pts}</div>
                  <div className={`h-px mb-4 ${p.featured ? "bg-white/15" : "bg-[#0F0F1A]/10"}`} />
                  <p className={`text-[12px] mb-5 flex-1 ${p.featured ? "text-white/70" : "text-[#0F0F1A]/65"}`}>{p.desc}</p>
                  <div className="flex items-baseline gap-1.5 mb-5">
                    <span className="text-[26px] font-extrabold"><Num>{p.price}</Num></span>
                    <span className={`text-[11px] ${p.featured ? "text-white/50" : "text-[#0F0F1A]/50"}`}>DZD</span>
                  </div>
                  <button type="button" onClick={() => { stopIntroAudio(); onSigninClick(); }} className={`h-11 rounded-full text-[13px] font-bold transition focus-ring ${p.featured ? "bg-white text-[#0F0F1A] hover:bg-[#9D8FFF]" : "bg-[#0F0F1A] text-white hover:bg-[#6E5FE8]"}`}>
                    {t.choose}
                  </button>
                </div>
              </SlideUp>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16 sm:py-24">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
          <div className="grid lg:grid-cols-12 gap-10">
            <div className="lg:col-span-4">
              <p className="text-[12px] font-bold tracking-[0.18em] uppercase mb-3" style={{ color: ACCENT }}>// {t.faqKicker}</p>
              <h2 className="text-[clamp(2rem,4.5vw,3.4rem)] leading-[1.05] tracking-[-0.03em] font-extrabold" style={{ fontFamily: display }}>{t.faqTitle}</h2>
            </div>
            <div className="lg:col-span-7 lg:col-start-6">
              <div className="bg-white rounded-3xl overflow-hidden border border-[#0F0F1A]/5">
                {faqs.map((f, i) => {
                  const open = openFaq === i;
                  return (
                    <div key={f.q} className="border-b border-[#0F0F1A]/5 last:border-b-0">
                      <button type="button" onClick={() => setOpenFaq(open ? null : i)} className="w-full py-5 px-6 flex items-center gap-4 text-start focus-ring group" aria-expanded={open}>
                        <span className="flex-1 text-[15px] font-bold group-hover:text-[#6E5FE8] transition-colors">{f.q}</span>
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${open ? "bg-[#6E5FE8] text-white rotate-45" : "bg-[#0F0F1A]/5"}`}>
                          <Plus className="w-4 h-4" />
                        </span>
                      </button>
                      <AnimatePresence initial={false}>
                        {open && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28 }} className="overflow-hidden">
                            <p className="pb-5 px-6 pe-14 text-[13px] text-[#0F0F1A]/65 leading-relaxed">{f.a}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
          <div className="rounded-[40px] p-12 sm:p-16 text-center text-white relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0F0F1A 0%, #2D1B69 50%, #6E5FE8 100%)" }}>
            <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
              <div className="absolute top-0 start-1/4 w-96 h-96 rounded-full bg-[#9D8FFF]/20 blur-3xl float" />
              <div className="absolute bottom-0 end-1/4 w-80 h-80 rounded-full bg-[#6E5FE8]/30 blur-3xl float-slow" />
            </div>
            <div className="relative">
              <h2 className="text-[clamp(2.2rem,5.5vw,4.2rem)] leading-[1.02] tracking-[-0.03em] font-extrabold" style={{ fontFamily: display }}>{t.ctaTitle}</h2>
              <p className="mt-4 text-[15px] text-white/70 max-w-md mx-auto">{t.ctaSub}</p>
              <button type="button" onClick={() => { stopIntroAudio(); onSigninClick(); }} className="mt-8 inline-flex items-center gap-2 h-14 px-8 rounded-full bg-white text-[#0F0F1A] text-[15px] font-bold hover:scale-[1.02] transition focus-ring">
                {t.start}<ArrowIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT + FOOTER */}
      <footer id="contact" className="pt-12 pb-28 sm:pb-12 border-t border-[#0F0F1A]/5">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
            <div className="lg:col-span-2">
              <Logo size={40} />
              <p className="mt-4 text-[13px] text-[#0F0F1A]/55 max-w-sm leading-relaxed">
                {isRTL
                  ? "استوديو صوتي جزائري. نصّك بالدارجة يولي صوتًا طبيعيًا، جاهزًا للإعلان."
                  : "Studio vocal algérien. Votre texte en darija devient une voix naturelle, prête pour la pub."}
              </p>
              <p className="mt-3 text-[12px] font-semibold text-[#0F0F1A]/70">Alger, Algérie · {t.footTag}</p>
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#0F0F1A]/40 mb-3">{isRTL ? "المنصة" : "Produit"}</div>
              <div className="flex flex-col gap-2 text-[13px] font-medium">
                {nav.map((l) => (
                  <a key={l.href} href={l.href} onClick={(e) => { e.preventDefault(); smoothTo(l.href); }} className="hover:text-[#6E5FE8]">{l.label}</a>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#0F0F1A]/40 mb-3">{t.contact}</div>
              <a href="mailto:contact@sawtify.dz" className="text-[13px] font-semibold hover:text-[#6E5FE8]">contact@sawtify.dz</a>
              <div className="mt-4 flex flex-wrap gap-2">
                {["Edahabia", "CIB", "SATIM"].map((p) => (
                  <span key={p} className="text-[10px] font-bold px-2 py-1 rounded-full bg-[#0F0F1A]/5">{p}</span>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-[11px] text-[#0F0F1A]/50">
                <ShieldCheck className="w-3.5 h-3.5 text-[#6E5FE8]" />
                {isRTL ? "دفع آمن، لا نخزّن رقم البطاقة." : "Paiement sécurisé, aucune carte stockée."}
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-[#0F0F1A]/5 text-[12px] text-[#0F0F1A]/45">
            <span>© <Num>2026</Num> Sawtify · {t.footTag}</span>
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => setLegal("cgu")} className="hover:text-[#6E5FE8]">{t.cgu}</button>
              <button type="button" onClick={() => setLegal("privacy")} className="hover:text-[#6E5FE8]">{t.privacy}</button>
            </div>
          </div>
        </div>
      </footer>

      {/* STICKY MOBILE CTA */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 p-3 bg-[#FAFAF7]/95 backdrop-blur-xl border-t border-[#0F0F1A]/8">
        <button type="button" onClick={() => { stopIntroAudio(); onSigninClick(); }} className="w-full h-12 rounded-full text-white font-bold text-[14px] flex items-center justify-center gap-2" style={{ background: ACCENT }}>
          {t.bookNow} · 50 {t.pts}
        </button>
      </div>

      {/* LISTEN MODAL */}
      <AnimatePresence>
        {listenVoice && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-black/50" onClick={() => { setListenVoice(null); setPlayingId(null); }} />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="listen-title"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              className="fixed z-[71] inset-x-4 bottom-6 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md bg-white rounded-3xl p-6 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#0F0F1A]/40">{t.listenInStudio}</p>
                  <h3 id="listen-title" className="text-[22px] font-extrabold">{isRTL ? listenVoice.nameAr : listenVoice.nameFr}</h3>
                  <p className="text-[12px] text-[#0F0F1A]/55">{isRTL ? listenVoice.tagAr : listenVoice.tagFr} · {listenVoice.location}</p>
                </div>
                <button type="button" onClick={() => { setListenVoice(null); setPlayingId(null); }} className="w-9 h-9 rounded-full hover:bg-[#0F0F1A]/5 flex items-center justify-center" aria-label={t.close}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="rounded-2xl p-4 mb-4" style={{ background: `${listenVoice.color}14` }}>
                <Waveform color={listenVoice.color} playing bars={32} />
              </div>
              <p className="text-[13px] leading-relaxed text-[#0F0F1A]/75 mb-2" dir="auto">
                “{(isRTL ? listenVoice.sampleAr : listenVoice.sampleFr).slice(0, 52).trimEnd()}…”
              </p>
              <p className="text-[13px] text-[#0F0F1A]/70 leading-relaxed mb-5">{t.listenBody}</p>
              <button type="button" onClick={() => { stopIntroAudio(); onSigninClick(); }} className="w-full h-12 rounded-full text-white font-bold text-[14px]" style={{ background: listenVoice.color }}>
                {t.tryVoice} — {isRTL ? listenVoice.nameAr : listenVoice.nameFr}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* LEGAL */}
      <AnimatePresence>
        {legal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-black/50" onClick={() => setLegal(null)} />
            <motion.div
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed z-[71] inset-x-4 top-[12%] sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-lg bg-white rounded-3xl p-6 shadow-2xl max-h-[70vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[18px] font-extrabold">{legal === "cgu" ? t.cgu : t.privacy}</h3>
                <button type="button" onClick={() => setLegal(null)} className="w-9 h-9 rounded-full hover:bg-[#0F0F1A]/5 flex items-center justify-center" aria-label={t.close}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[13px] leading-relaxed text-[#0F0F1A]/70">{legalCopy[legal]}</p>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ROBOT WIDGET WITH AUDIO SYNCHRONIZED MOUTH */}
      <RobotWidget
        isPlaying={isIntroPlaying}
        volume={audioVolume}
        onToggle={handleToggleIntroAudio}
        isRTL={isRTL}
      />
    </div>
  );
};

export default LandingPage;
