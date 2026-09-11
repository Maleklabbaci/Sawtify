import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  ArrowRight, ArrowLeft, Play, Plus, Menu, X,
  Check, Star, Headphones, ShoppingBag, Clapperboard, Mic2, Phone, ShieldCheck, Gift, Pause, Volume2, VolumeX,
  SkipBack, SkipForward, Lock
} from "lucide-react";
import { motion, AnimatePresence, useScroll, useInView } from "motion/react";

export interface LandingPageProps {
  onLoginClick: () => void;
  onSigninClick: () => void;
  language: "fr" | "ar";
  setLanguage: (lang: "fr" | "ar") => void;
}

/* ================= THÈME "LILAS & BLANC" ================= */
const PAPER = "#FFFFFF";
const INK = "#16121F";
const ACCENT = "#7C3AED";
const ACCENT_SOFT = "#F3EFFC";
const BORDER = "#E9E4F5";
const MESH = { purple: "#8b5cf6", pink: "#ec4899", blue: "#3b82f6" };
const LOGO = "https://i.ibb.co/nqShkPNP/68126702-75e5-4de6-9b53-e51800b05e4a.jpg";
const INTRO_AUDIO_URL = "https://res.cloudinary.com/gz65ybug/video/upload/v1789055318/Generated_Audio_September_10_2026_-_4_29PM.wav";

const MONO_STACK = "'JetBrains Mono', 'Cairo', monospace";
const NUM_STACK = "'Space Grotesk', 'Cairo', sans-serif";

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600&family=Space+Grotesk:wght@500;600;700&display=swap');

    html { scroll-behavior: smooth; -webkit-font-smoothing: antialiased; }
    body { background: ${PAPER}; color: ${INK}; margin: 0; }
    #sawtify-landing { overflow-x: clip; }
    #sawtify-landing * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    #sawtify-landing ::selection { background: ${ACCENT}; color: #fff; }
    #sawtify-landing ::-webkit-scrollbar { width: 10px; }
    #sawtify-landing ::-webkit-scrollbar-track { background: #F6F4FC; }
    #sawtify-landing ::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.35); border-radius: 10px; }
    #sawtify-landing .scrollbar-none { scrollbar-width: none; -ms-overflow-style: none; }
    #sawtify-landing .scrollbar-none::-webkit-scrollbar { display: none; }

    @keyframes wave { 0%, 100% { transform: scaleY(0.28); } 50% { transform: scaleY(1); } }
    #sawtify-landing .wave-bar { animation: wave 1.3s ease-in-out infinite; transform-origin: bottom; }
    #sawtify-landing .focus-ring:focus-visible { outline: 2px solid ${ACCENT}; outline-offset: 3px; border-radius: 10px; }

    /* ---------- MESH (assagi, garanti lisible partout) ---------- */
    #sawtify-landing .mesh-container {
      position: fixed; inset: 0; z-index: 0;
      filter: blur(90px);
      pointer-events: none;
      transform: translateZ(0);
    }
    @media (max-width: 640px) { #sawtify-landing .mesh-container { filter: blur(60px); } }
    #sawtify-landing .mesh-ball { position: absolute; border-radius: 50%; will-change: transform; }
    #sawtify-landing .mesh-veil {
      position: fixed; inset: 0; z-index: 0;
      background: rgba(255,255,255,0.5);
      pointer-events: none;
    }

    #sawtify-landing .card-lift { transition: transform .35s cubic-bezier(0.16,1,0.3,1), box-shadow .35s, border-color .35s; }
    @media (hover: hover) {
      #sawtify-landing .card-lift:hover { transform: translateY(-4px); box-shadow: 0 18px 44px -18px rgba(124,58,237,0.22); border-color: rgba(124,58,237,0.35); }
    }
    #sawtify-landing .hov-accent:hover, #sawtify-landing .hov-accent:focus-visible { border-color: rgba(124,58,237,0.5); }

    @media (prefers-reduced-motion: reduce) {
      html { scroll-behavior: auto; }
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    }
  `}</style>
);

/* ============================================================
   MESH BACKGROUND — une seule boucle rAF, lerp + skip de frames.
   ============================================================ */
const MeshBackground = () => {
  const ballRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const balls = ballRefs.current;
    if (!balls[0] || !balls[1] || !balls[2]) return;

    let raf = 0;
    let tx = 0, ty = 0, cx = 0, cy = 0;
    let maxScroll = 1;
    const applied = [1e9, 1e9, 1e9, 1e9, 1e9, 1e9];

    const measure = () => {
      maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    };
    measure();

    const onMove = (e: MouseEvent) => {
      tx = (e.clientX / window.innerWidth) - 0.5;
      ty = (e.clientY / window.innerHeight) - 0.5;
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("resize", measure);

    const loop = () => {
      cx += (tx - cx) * 0.07;
      cy += (ty - cy) * 0.07;
      const p = Math.min(1, Math.max(0, window.scrollY / maxScroll));

      const out = [
        cx * 60,           cy * 60 + p * 300,
        cx * -90,          cy * -90 - p * 220,
        cx * 140 + p * 60, cy * 140 + p * 380,
      ];

      let changed = false;
      for (let i = 0; i < 6; i++) if (Math.abs(out[i] - applied[i]) > 0.25) { changed = true; break; }
      if (changed) {
        for (let i = 0; i < 6; i++) applied[i] = out[i];
        balls[0]!.style.transform = `translate3d(${out[0].toFixed(1)}px, ${out[1].toFixed(1)}px, 0)`;
        balls[1]!.style.transform = `translate3d(${out[2].toFixed(1)}px, ${out[3].toFixed(1)}px, 0)`;
        balls[2]!.style.transform = `translate3d(${out[4].toFixed(1)}px, ${out[5].toFixed(1)}px, 0)`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <>
      <div className="mesh-container" aria-hidden>
        <div ref={(el) => { ballRefs.current[0] = el; }} className="mesh-ball"
          style={{ width: "75vw", height: "75vw", background: MESH.purple, top: "-15%", left: "-15%", opacity: 0.55 }} />
        <div ref={(el) => { ballRefs.current[1] = el; }} className="mesh-ball"
          style={{ width: "45vw", height: "45vw", background: MESH.pink, top: "15%", right: "-5%", opacity: 0.5 }} />
        <div ref={(el) => { ballRefs.current[2] = el; }} className="mesh-ball"
          style={{ width: "25vw", height: "25vw", background: MESH.blue, bottom: "10%", left: "30%", opacity: 0.55 }} />
      </div>
      <div className="mesh-veil" aria-hidden />
    </>
  );
};

const Logo = ({ size = 38 }: { size?: number }) => {
  const [imgError, setImgError] = useState(false);
  return (
    <div className="flex items-center gap-2.5 select-none">
      <div className="rounded-xl overflow-hidden shrink-0"
        style={{ width: size, height: size, boxShadow: "0 4px 16px rgba(124,58,237,0.28)" }}>
        {!imgError ? (
          <img src={LOGO} alt="Sawtify" width={size} height={size} decoding="async"
            onError={() => setImgError(true)} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-bold text-white"
            style={{ background: ACCENT, fontSize: size * 0.5, fontFamily: NUM_STACK }}>S</div>
        )}
      </div>
      <span className="font-bold text-[19px] tracking-tight" style={{ color: INK, fontFamily: NUM_STACK }}>Sawtify</span>
    </div>
  );
};

const Num = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <span dir="ltr" style={{ unicodeBidi: "isolate", fontFamily: NUM_STACK }} className={`inline-block tabular-nums ${className}`}>{children}</span>
);

const Mono = ({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
  <span className={className} style={{ fontFamily: MONO_STACK, ...style }}>{children}</span>
);

const SectionHead = ({ title, sub, center = false, font }: {
  title: string; sub?: string; center?: boolean; font: string;
}) => (
  <div className={center ? "text-center mx-auto max-w-2xl" : "max-w-2xl"}>
    <h2 className="text-[clamp(1.9rem,4.2vw,3.1rem)] leading-[1.06] tracking-[-0.02em] font-bold" style={{ color: INK, fontFamily: font }}>{title}</h2>
    {sub && <p className="mt-4 text-[14px] text-[#16121F]/60 leading-relaxed">{sub}</p>}
  </div>
);

const Waveform = ({ color, playing, bars = 30 }: { color: string; playing: boolean; bars?: number }) => (
  <div className="flex items-end justify-center gap-[3px] h-24 w-full" dir="ltr" aria-hidden>
    {Array.from({ length: bars }).map((_, i) => {
      const h = 18 + Math.abs(Math.sin(i * 0.55) * Math.cos(i * 0.31)) * 82;
      const hot = i % 6 === 0;
      return (
        <span key={i} className={`flex-1 rounded-full origin-bottom ${playing ? "wave-bar" : ""}`}
          style={{
            height: `${h}%`, maxWidth: 4,
            background: hot ? color : "rgba(22,18,31,0.14)",
            opacity: playing ? 1 : 0.55,
            animationDelay: `${(i % 10) * 0.1}s`,
          }} />
      );
    })}
  </div>
);

const Counter = ({ target, suffix = "", duration = 1800 }: { target: number; suffix?: string; duration?: number }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const obs = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting || started.current) return;
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

/* ============================================================
   DÉMO VOCALE — speechSynthesis (native, gratuite, opt-in).
   ============================================================ */
type NowPlaying = { kind: "intro" } | { kind: "sample"; id: string } | null;

function useVoiceDemo() {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const [nowPlaying, setNowPlaying] = useState<NowPlaying>(null);
  const token = useRef(0);

  useEffect(() => {
    if (!supported) return;
    const warm = () => window.speechSynthesis.getVoices();
    warm();
    window.speechSynthesis.addEventListener("voiceschanged", warm);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", warm);
  }, [supported]);

  const pickVoice = useCallback((lang: "fr" | "ar", gender: "male" | "female") => {
    const pool = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith(lang));
    if (!pool.length) return null;
    const fem = pool.find((v) => /female|femme|woman|zira|hoda|amelie|amélie|audrey|salma/i.test(v.name));
    return gender === "female" ? (fem ?? pool[0]) : (pool.find((v) => v !== fem) ?? pool[0]);
  }, []);

  const speak = useCallback((voice: VoiceCard, lang: "fr" | "ar", rateMul = 1) => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    const my = ++token.current;
    const u = new SpeechSynthesisUtterance(lang === "ar" ? voice.sampleAr : voice.sampleFr);
    const v = pickVoice(lang, voice.gender);
    if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = lang === "ar" ? "ar-SA" : "fr-FR"; }
    const baseRate = voice.category === "social" ? 1.08 : voice.category === "formal" ? 0.94 : 1;
    u.rate = baseRate * rateMul;
    u.pitch = voice.gender === "female" ? 1.08 : 0.88;
    const finish = () => { if (token.current === my) setNowPlaying(null); };
    u.onend = finish;
    u.onerror = finish;
    setNowPlaying({ kind: "sample", id: voice.id });
    window.setTimeout(() => { if (token.current === my) window.speechSynthesis.speak(u); }, 60);
  }, [supported, pickVoice]);

  const stopSpeech = useCallback(() => {
    if (!supported) return;
    token.current++;
    window.speechSynthesis.cancel();
    setNowPlaying((p) => (p?.kind === "sample" ? null : p));
  }, [supported]);

  useEffect(() => () => { if (supported) window.speechSynthesis.cancel(); }, [supported]);

  return { speechSupported: supported, nowPlaying, speak, stopSpeech };
}

/* DOCK AUDIO — barres = VRAI volume de l'analyser */
const AudioDock = ({ isPlaying, volume, onToggle, isRTL, hidden = false }: {
  isPlaying: boolean; volume: number; onToggle: () => void; isRTL: boolean; hidden?: boolean;
}) => {
  const F = [0.55, 1, 0.75, 0.9, 0.6];
  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", damping: 22, stiffness: 120, delay: 0.8 }}
      className={`fixed bottom-24 sm:bottom-6 end-3 sm:end-6 z-[80] transition-all duration-300 ${hidden ? "opacity-0 pointer-events-none translate-y-3" : "opacity-100"}`}
    >
      <div className="flex items-center gap-3 rounded-full border bg-white pl-4 pr-1.5 py-1.5 shadow-[0_10px_36px_rgba(22,18,31,0.16)]" style={{ borderColor: BORDER }}>
        {isPlaying ? <Volume2 className="w-4 h-4 shrink-0" style={{ color: ACCENT }} /> : <VolumeX className="w-4 h-4 shrink-0 text-[#16121F]/30" />}
        <div className="flex items-end gap-[2.5px] h-4 shrink-0" dir="ltr" aria-hidden>
          {F.map((f, i) => (
            <span key={i} className="w-[3px] rounded-full"
              style={{
                height: isPlaying ? Math.max(4, 4 + volume * 14 * f) : 4,
                background: isPlaying ? ACCENT : "rgba(22,18,31,0.18)",
                transition: "height 0.09s ease-out",
              }} />
          ))}
        </div>
        <span className="hidden sm:block text-[11px] font-semibold tracking-[0.14em] uppercase whitespace-nowrap"
          style={{ fontFamily: MONO_STACK, color: isPlaying ? ACCENT : "rgba(22,18,31,0.55)" }}>
          {isPlaying ? (isRTL ? "بثّ مباشر" : "On air") : (isRTL ? "اسمع التقديم" : "Écouter l'intro")}
        </span>
        <button type="button" onClick={onToggle} aria-pressed={isPlaying}
          aria-label={isPlaying ? (isRTL ? "إيقاف الصوت" : "Arrêter l'audio") : (isRTL ? "تشغيل التقديم" : "Lire l'intro")}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white transition hover:scale-105 focus-ring"
          style={{ background: ACCENT }}>
          {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ms-0.5" />}
        </button>
      </div>
    </motion.div>
  );
};

type VoiceCard = {
  id: string; nameFr: string; nameAr: string; tagFr: string; tagAr: string;
  location: string; gender: "male" | "female";
  category: "commercial" | "narrative" | "social" | "formal";
  rating?: number; reviews?: number; color: string; sampleFr: string; sampleAr: string;
};

const VOICES: VoiceCard[] = [
  { id: "amine", nameFr: "Amine", nameAr: "أمين", tagFr: "Voix commerciale", tagAr: "صوت تجاري", location: "Alger, DZ", gender: "male", category: "commercial", rating: 4.9, reviews: 234, color: "#7C3AED", sampleFr: "Salam 3likoum khawti! M3a Sawtify, nassek yewli sawt tabi3i, wadeh, wahli l i3lanat.", sampleAr: "سلام عليكم خاوتي! مع صوتيفي، نصوصكم تولي صوت طبيعي، واضح، جاهز للإعلانات." },
  { id: "yasmine", nameFr: "Yasmine", nameAr: "ياسمين", tagFr: "Voix publicitaire", tagAr: "صوت إعلاني", location: "Oran, DZ", gender: "female", category: "commercial", rating: 4.8, reviews: 189, color: "#DB2777", sampleFr: "Marhba bikom kamlin! Tawsil 58 wilaya, payment 3and l istlam. Tleb dorka.", sampleAr: "مرحبا بيكم كاملين! التوصيل لـ 58 ولاية والدفع عند الاستلام. اطلب درك." },
  { id: "khalid", nameFr: "Khalid", nameAr: "خالد", tagFr: "Voix documentaire", tagAr: "صوت وثائقي", location: "Constantine, DZ", gender: "male", category: "formal", rating: 5.0, reviews: 312, color: "#2563EB", sampleFr: "Nqeddmlkom lyom notq mawzoun w dqi9, l watha2iqiyat w contenu rassmi.", sampleAr: "نقدّم ليكم اليوم نطق موزون ودقيق، للوثائقيات والمحتوى الرسمي." },
  { id: "layla", nameFr: "Layla", nameAr: "ليلى", tagFr: "Voix social media", tagAr: "صوت سوشيال", location: "Annaba, DZ", gender: "female", category: "social", rating: 4.9, reviews: 156, color: "#D97706", sampleFr: "Salut l'équipe ! Une voix vive, parfaite pour Reels, TikTok et stories.", sampleAr: "واش راكم ليكيب؟ صوت حيوي، هايل للريلز وتيك توك والستوريز." },
  { id: "yacine", nameFr: "Yacine", nameAr: "ياسين", tagFr: "Voix éducative", tagAr: "صوت تعليمي", location: "Sétif, DZ", gender: "male", category: "narrative", rating: 4.7, reviews: 98, color: "#0891B2", sampleFr: "Dans cette leçon, on avance pas à pas. Une voix claire, pour e-learning et tutos.", sampleAr: "في هاد الدرس، نمشيو خطوة بخطوة. صوت واضح للشروحات والدروس." },
  { id: "nadia", nameFr: "Nadia", nameAr: "نادية", tagFr: "Voix podcast", tagAr: "صوت بودكاست", location: "Tlemcen, DZ", gender: "female", category: "narrative", rating: 4.9, reviews: 267, color: "#059669", sampleFr: "Bienvenue dans cet épisode. Une voix chaleureuse, pour podcasts et YouTube.", sampleAr: "مرحبا بيكم في هاد الحلقة. صوت دافئ للبودكاست ويوتيوب." },
  { id: "maryam", nameFr: "Maryam", nameAr: "مريم", tagFr: "Narration & podcast", tagAr: "سرد وبودكاست", location: "Alger, DZ", gender: "female", category: "narrative", rating: 4.8, reviews: 201, color: "#BE185D", sampleFr: "Écoutez une diction fluide et élégante, pour vos récits et documentaires.", sampleAr: "استمعوا لنطق سلس وأنيق، للروايات والوثائقيات." },
  { id: "rachid", nameFr: "Rachid", nameAr: "رشيد", tagFr: "Énergique & pub", tagAr: "حماسي وإشهاري", location: "Oran, DZ", gender: "male", category: "commercial", rating: 4.9, reviews: 176, color: "#EA580C", sampleFr: "Une voix percutante, idéale pour vos spots et lancements produits.", sampleAr: "صوت قوي، هايل للسبوتات وإطلاق المنتجات." },
  { id: "bilal", nameFr: "Bilal", nameAr: "بلال", tagFr: "Narration & récit", tagAr: "سردي وقصصي", location: "Constantine, DZ", gender: "male", category: "narrative", rating: 4.8, reviews: 142, color: "#0284C7", sampleFr: "Le rendu est si naturel qu'on croirait un présentateur en studio.", sampleAr: "الصوت يخرج طبيعي كأنو متحدث حقيقي في الستوديو." },
];

const LANDING_VOICE_IDS = ["amine", "yasmine", "khalid"] as const;
const LANDING_VOICES = VOICES.filter((v) => (LANDING_VOICE_IDS as readonly string[]).includes(v.id));
const HIDDEN_VOICES = VOICES.filter((v) => !(LANDING_VOICE_IDS as readonly string[]).includes(v.id));

const COST_STEPS = [
  { sec: 60, pts: 20, labelFr: "0–60 s", labelAr: "0–60 ث" },
  { sec: 120, pts: 30, labelFr: "2 min", labelAr: "2 دق" },
  { sec: 180, pts: 40, labelFr: "3 min", labelAr: "3 دق" },
  { sec: 240, pts: 50, labelFr: "4 min", labelAr: "4 دق" },
];

const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const fmtDur = (voice: VoiceCard, lang: "fr" | "ar") => {
  const txt = lang === "ar" ? voice.sampleAr : voice.sampleFr;
  const s = Math.max(3, Math.ceil(txt.length / 15));
  return `0:${String(s).padStart(2, "0")}`;
};
const SPEEDS = [0.75, 1, 1.25, 1.5] as const;

export const LandingPage: React.FC<LandingPageProps> = ({
  onLoginClick, onSigninClick, language, setLanguage,
}) => {
  const isRTL = language === "ar";
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTesti, setActiveTesti] = useState(0);
  const [featuredId, setFeaturedId] = useState("amine");
  const [listenVoice, setListenVoice] = useState<VoiceCard | null>(null);
  const [legal, setLegal] = useState<null | "cgu" | "privacy">(null);
  const [costIdx, setCostIdx] = useState(0);
  const [pauseRotate, setPauseRotate] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  const [playProgress, setPlayProgress] = useState(0);
  const [playElapsed, setPlayElapsed] = useState(0);
  const [playTotal, setPlayTotal] = useState(0);
  const { scrollYProgress } = useScroll();
  const scrolled = useScrolled();

  const { speechSupported, nowPlaying, speak, stopSpeech } = useVoiceDemo();
  const playingId = nowPlaying?.kind === "sample" ? nowPlaying.id : null;

  /* Audio d'intro (opt-in, AUCUN autoplay, analyser réel) */
  const introAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const analyserDataRef = useRef<Uint8Array | null>(null);
  const useAnalyserRef = useRef<boolean>(true);
  const smoothRef = useRef<number>(0);
  const [isIntroPlaying, setIsIntroPlaying] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0);
  const animFrameRef = useRef<number | null>(null);

  const overlayOpen = menuOpen || !!listenVoice || !!legal;

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    document.title = isRTL ? "صوتيفي — صوت طبيعي بالدارجة" : "Sawtify — Voix naturelle en darija";
    document.body.style.background = PAPER;
  }, [language, isRTL]);

  useEffect(() => {
    document.body.style.overflow = overlayOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [overlayOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMenuOpen(false); setListenVoice(null); setLegal(null); stopSpeech();
      if (introAudioRef.current) { introAudioRef.current.pause(); setIsIntroPlaying(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stopSpeech]);

  const initAnalyser = useCallback(() => {
    if (audioCtxRef.current || !useAnalyserRef.current || !introAudioRef.current) return;
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AC();
      const src = ctx.createMediaElementSource(introAudioRef.current);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.7;
      src.connect(analyser);
      analyser.connect(ctx.destination);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      analyserDataRef.current = new Uint8Array(analyser.frequencyBinCount);
    } catch (e) {
      useAnalyserRef.current = false;
      console.warn("Analyser indisponible :", e);
    }
  }, []);

  const readLevel = useCallback((): number => {
    if (analyserRef.current && analyserDataRef.current) {
      analyserRef.current.getByteFrequencyData(analyserDataRef.current);
      let sum = 0; const n = 30;
      for (let i = 2; i < n; i++) sum += analyserDataRef.current[i];
      return Math.min(1, (sum / (n - 2) / 255) * 2.2);
    }
    const t = performance.now() * 0.011;
    return Math.min(1, Math.abs(Math.sin(t) * Math.cos(t * 0.7)) * 0.8 + Math.random() * 0.2);
  }, []);

  useEffect(() => {
    const audio = new Audio(INTRO_AUDIO_URL);
    audio.crossOrigin = "anonymous";
    audio.preload = "auto";
    introAudioRef.current = audio;

    audio.onended = () => { setIsIntroPlaying(false); setAudioVolume(0); };
    const tick = () => {
      if (introAudioRef.current && !introAudioRef.current.paused) {
        const raw = readLevel();
        smoothRef.current = smoothRef.current * 0.5 + raw * 0.5;
        setAudioVolume(smoothRef.current);
        animFrameRef.current = requestAnimationFrame(tick);
      } else setAudioVolume(0);
    };
    audio.onplay = () => {
      initAnalyser();
      if (audioCtxRef.current && audioCtxRef.current.state === "suspended") audioCtxRef.current.resume().catch(() => {});
      setIsIntroPlaying(true);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(tick);
    };
    audio.onpause = () => {
      setIsIntroPlaying(false); setAudioVolume(0);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
    audio.onerror = () => {
      if (!useAnalyserRef.current) return;
      useAnalyserRef.current = false;
      audioCtxRef.current = null; analyserRef.current = null;
      audio.removeAttribute("crossorigin");
      audio.src = INTRO_AUDIO_URL;
      audio.load();
    };
    return () => {
      audio.pause();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null; analyserRef.current = null;
    };
  }, [initAnalyser, readLevel]);

  useEffect(() => { stopSpeech(); }, [language, stopSpeech]);

  const stopIntroAudio = useCallback(() => {
    if (introAudioRef.current && !introAudioRef.current.paused) {
      introAudioRef.current.pause();
      setIsIntroPlaying(false);
      setAudioVolume(0);
    }
  }, []);
  const stopAllAudio = useCallback(() => { stopIntroAudio(); stopSpeech(); }, [stopIntroAudio, stopSpeech]);

  /* ================= TEXTES ================= */
  const t = {
    skip: isRTL ? "تخطَّ إلى المحتوى" : "Aller au contenu",
    navVoices: isRTL ? "الأصوات" : "Voix",
    navHow: isRTL ? "كيف يعمل" : "Comment ça marche",
    navPricing: isRTL ? "الأسعار" : "Tarifs",
    navFaq: "FAQ",
    navContact: isRTL ? "تواصل" : "Contact",
    signin: isRTL ? "دخول" : "Connexion",
    start: isRTL ? "ابدأ الآن" : "Commencer",
    tryFree: isRTL ? "تجربة مجانية" : "Essai gratuit",
    pause: isRTL ? "إيقاف" : "Pause",
    audioPreview: isRTL ? "معاينة صوتية" : "Aperçu audio",
    heroKicker: isRTL ? "استوديو الدارجة" : "STUDIO DARIJA",
    heroTitle1: isRTL ? "صوت" : "Une voix",
    heroTitle2: isRTL ? "لا يُفرَّق." : "indiscernable.",
    heroSub: isRTL
      ? "نصّك بالدارجة يولي صوتًا طبيعيًا في 30 ثانية. هنا تسمع البداية فقط… والباقي في الاستوديو."
      : "Votre texte en darija devient une voix naturelle en 30 secondes. Ici, vous n'entendez que le début… la suite est dans le studio.",
    welcomeChip: isRTL ? "50 نقطة مجاناً. بدون بطاقة." : "50 points offerts. Sans carte.",
    creators: isRTL ? "مستخدم" : "créateurs",
    popularTitle: isRTL ? "9 أصوات. هنا 3 فقط." : "9 voix. Ici, seulement 3.",
    popularSub: isRTL
      ? "أمين، ياسمين، خالد. باقي الأصوات تسمعهم في الاستوديو."
      : "Amine, Yasmine, Khalid. Les autres voix s'écoutent dans le studio.",
    nRatings: isRTL ? "تقييم" : "avis",
    listenInStudio: isRTL ? "اسمع البداية" : "Écouter le début",
    listenBody: isRTL
      ? "هذه أول جملة فقط. الصوت كامل في الاستوديو. 50 نقطة مجاناً، بدون بطاقة."
      : "Ce n'est que la première phrase. La voix entière est dans le studio. 50 points offerts, sans carte.",
    browserNote: isRTL ? "معاينة بمحرك المتصفح — الجودة استوديو 24 kHz داخل التطبيق." : "Aperçu via la voix du navigateur — le rendu studio 24 kHz est dans l'app.",
    noSpeechNote: isRTL ? "متصفحك لا يدعم المعاينة الصوتية." : "Votre navigateur ne supporte pas l'aperçu audio.",
    journeyTitle: isRTL ? "أربع خطوات. يخرج الصوت." : "Quatre gestes. La voix sort.",
    journeySub: isRTL ? "بدون كابينة. بدون ميكروفون. بدون انتظار." : "Pas de cabine. Pas de micro. Pas d'attente.",
    useTitle: isRTL ? "حين يتكلم، لم يعد نصًا." : "Quand ça parle, ce n'est plus du texte.",
    costTitle: isRTL ? "أقل مما تظن." : "Moins que vous ne croyez.",
    costSub: isRTL ? "20 نقطة لأول 60 ثانية، ثم +10 لكل دقيقة. النقاط لا تنتهي." : "20 points pour les 60 premières secondes, puis +10 par minute. Les points n'expirent pas.",
    metricsTitle: isRTL ? "الأرقام لا تكذب." : "Les chiffres ne mentent pas.",
    testTitle: isRTL ? "من يسمع، يظنّه إنسانًا." : "Qui écoute croit entendre quelqu'un.",
    pricingTitle: isRTL ? "نقاط. بلا اشتراك." : "Des points. Sans abonnement.",
    pricingSub: isRTL ? "بالدينار. بلا تاريخ انتهاء." : "En dinars. Sans date d'expiration.",
    welcomeBanner: isRTL ? "هدية الدخول: 50 نقطة مجاناً عند التسجيل." : "Cadeau d'inscription : 50 points offerts.",
    bannerSub: isRTL ? "بدون بطاقة · النقاط لا تنتهي أبدًا" : "Sans carte · les points n'expirent jamais",
    choose: isRTL ? "اختيار" : "Choisir",
    popular: isRTL ? "الأكثر طلبًا" : "Le plus demandé",
    faqTitle: isRTL ? "أسئلة متكررة" : "Questions fréquentes",
    ctaTitle: isRTL ? "تريد أن تسمعه حتى النهاية؟" : "Envie d'entendre la suite ?",
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
  const heroSamplePlaying = playingId === featured.id;
  const heroPlaying = isIntroPlaying || heroSamplePlaying;
  const sampleEst = Math.max(2, sampleFull.length / 15) / speed;

  useEffect(() => {
    if (listenVoice || pauseRotate || isIntroPlaying || playingId) return;
    const id = window.setInterval(() => {
      setFeaturedId((prev) => {
        const i = LANDING_VOICES.findIndex((v) => v.id === prev);
        return LANDING_VOICES[(i + 1) % LANDING_VOICES.length].id;
      });
    }, 5200);
    return () => window.clearInterval(id);
  }, [listenVoice, pauseRotate, isIntroPlaying, playingId]);

  /* Progression : réelle pour l'intro (audio), estimée pour la démo vocale */
  useEffect(() => {
    if (isIntroPlaying) {
      const id = window.setInterval(() => {
        const a = introAudioRef.current;
        if (a && a.duration > 0) {
          setPlayProgress(Math.min(1, a.currentTime / a.duration));
          setPlayElapsed(a.currentTime);
          setPlayTotal(a.duration);
        }
      }, 200);
      return () => window.clearInterval(id);
    }
    if (heroSamplePlaying) {
      const est = Math.max(2, sampleFull.length / 15) / speed;
      const start = performance.now();
      setPlayProgress(0); setPlayElapsed(0); setPlayTotal(est);
      const id = window.setInterval(() => {
        const el = (performance.now() - start) / 1000;
        setPlayElapsed(el);
        setPlayProgress(Math.min(1, el / est));
      }, 100);
      return () => window.clearInterval(id);
    }
    setPlayProgress(0); setPlayElapsed(0); setPlayTotal(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isIntroPlaying, heroSamplePlaying, speed, featured.id]);

  const stepVoice = (dir: 1 | -1) => {
    stopAllAudio();
    const i = LANDING_VOICES.findIndex((v) => v.id === featuredId);
    setFeaturedId(LANDING_VOICES[(i + dir + LANDING_VOICES.length) % LANDING_VOICES.length].id);
  };

  const applySpeed = (s: number) => {
    setSpeed(s);
    if (isIntroPlaying && introAudioRef.current) {
      introAudioRef.current.playbackRate = s;
    } else if (heroSamplePlaying) {
      speak(featured, language, s);
    }
  };

  const journeySteps = [
    { n: "1", t: isRTL ? "اكتب" : "Écrire", d: isRTL ? "ألصق نصك بالدارجة، بالعربية أو بالفرنسية." : "Collez votre texte en darija, en arabe ou en français." },
    { n: "2", t: isRTL ? "اختر" : "Choisir", d: isRTL ? "9 أصوات. هنا نعرض 3 فقط." : "9 voix. Ici, on n'en montre que 3." },
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
    { n: 50, s: "K+", l: isRTL ? "صوت مُولَّد" : "voix générées" },
    { n: 99, s: "%", l: isRTL ? "لا يُفرَّق" : "indiscernable" },
  ];

  const testimonials = isRTL
    ? [
        { q: "جرّبت 5 منصات قبل صوتيفي. هنا الصوت يبدو بشريًا فعلًا. الزبائن لا يلاحظون الفرق.", n: "أمين ب.", r: "صانع محتوى، الجزائر", img: "AB" },
        { q: "استخدمته لإعلانات تجارية. نتيجة احترافية دون الحاجة إلى استوديو.", n: "ياسمين ق.", r: "وكالة إشهار، وهران", img: "YK" },
        { q: "أفضل صوت جزائري سمعته. طبيعي 100٪ والدفع بالذهبية مريح.", n: "خالد م.", r: "تاجر إلكتروني، قسنطينة", img: "KM" },
      ]
    : [
        { q: "J'ai testé 5 plateformes avant Sawtify. Ici, la voix sonne vraiment humaine. Mes clients ne font pas la différence.", n: "Amine B.", r: "Créateur, Alger", img: "AB" },
        { q: "Utilisé pour mes pubs. Un rendu pro, sans studio.", n: "Yasmine K.", r: "Agence pub, Oran", img: "YK" },
        { q: "La meilleure voix algérienne que j'ai entendue. Naturelle à 100 %, et le paiement Edahabia est simple.", n: "Khaled M.", r: "E-commerçant, Constantine", img: "KM" },
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
        { q: "La voix parle comme quelqu'un ?", a: "Oui. Darija vivante, 24 kHz. 99 % de ceux qui écoutent ne font pas la différence." },
        { q: "Puis-je l'utiliser en pub ?", a: "Oui. Pub, YouTube, TikTok, standard — usage commercial, sans filigrane." },
        { q: "Comment marchent les points ?", a: "20 points pour 0–60 s, puis +10 par minute. Ils n'expirent pas. 50 points offerts à l'inscription." },
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
    setListenVoice(voice);
    speak(voice, language);
  };

  const handleToggleIntroAudio = () => {
    if (!introAudioRef.current) return;
    if (isIntroPlaying) introAudioRef.current.pause();
    else { stopSpeech(); introAudioRef.current.play().catch((err) => console.warn("Lecture impossible :", err)); }
  };

  const display = isRTL ? "'Cairo', sans-serif" : "'Space Grotesk', 'Inter', sans-serif";
  const sans = isRTL ? "'Cairo', sans-serif" : "'Inter', sans-serif";
  const ArrowIcon = ({ className = "w-4 h-4" }: { className?: string }) =>
    isRTL ? <ArrowLeft className={className} /> : <ArrowRight className={className} />;

  const legalCopy = {
    cgu: isRTL
      ? "شروط الاستخدام: صوتيفي منصة جزائرية لتحويل النص إلى صوت بالدارجة. الحساب شخصي. النقاط غير قابلة للتحويل نقدًا ولا تنتهي صلاحيتها. الاستعمال التجاري مسموح في حدود القانون الجزائري. يُمنع توليد محتوى غير قانوني أو مسيء. الدفع عبر SATIM (الذهبية / CIB). في حال فشل التوليد، تُعاد النقاط إلى رصيدك."
      : "Conditions d'utilisation : Sawtify est une plateforme algérienne de conversion texte → voix en darija. Le compte est personnel. Les points ne sont pas remboursables en dinars et n'expirent pas. L'usage commercial est autorisé dans le cadre de la loi algérienne. Tout contenu illicite ou injurieux est interdit. Le paiement passe par SATIM (Edahabia / CIB). En cas d'échec de génération, les points sont recrédités.",
    privacy: isRTL
      ? "الخصوصية: نحتفظ بالحد الأدنى من البيانات (البريد، الرصيد، النصوص المولَّدة) لتشغيل الحساب. لا نبيع بياناتك. يمكنك طلب حذف حسابك عبر صفحة التواصل. المدفوعات تُعالَج من طرف SATIM — صوتيفي لا يخزّن أرقام البطاقات."
      : "Confidentialité : nous conservons le minimum (e-mail, solde, textes générés) pour faire fonctionner le compte. Nous ne vendons pas vos données. Vous pouvez demander la suppression du compte via Contact. Les paiements sont traités par SATIM — Sawtify ne stocke aucun numéro de carte.",
  };

  return (
    <div id="sawtify-landing" dir={isRTL ? "rtl" : "ltr"} className="min-h-screen relative" style={{ fontFamily: sans, color: INK }}>
      <GlobalStyles />

      <a href="#home" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-[80] focus:px-4 focus:py-2 focus:rounded-full focus:font-bold focus:text-sm text-white" style={{ background: ACCENT }}>
        {t.skip}
      </a>

      <motion.div aria-hidden className="fixed top-0 inset-x-0 h-[3px] z-[60]"
        style={{ scaleX: scrollYProgress, background: `linear-gradient(90deg, ${ACCENT}, ${MESH.pink})`, transformOrigin: isRTL ? "100% 50%" : "0% 50%" }} />

      {/* ===== MESH ASSAGI + VOILE BLANC ===== */}
      <MeshBackground />

      {/* HEADER */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/85 backdrop-blur-xl border-b" : "bg-transparent"}`}
        style={scrolled ? { borderColor: BORDER } : undefined}>
        <div className="mx-auto max-w-[1280px] px-5 sm:px-6 h-16 flex items-center justify-between">
          <a href="#home" onClick={(e) => { e.preventDefault(); smoothTo("#home"); }} className="focus-ring flex items-center gap-2.5" aria-label="Sawtify">
            <Logo size={38} />
          </a>
          <nav className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-7 text-[13px] font-semibold text-[#16121F]/60">
            {nav.map((l) => (
              <a key={l.href} href={l.href} onClick={(e) => { e.preventDefault(); smoothTo(l.href); }} className="hover:text-[#16121F] transition-colors focus-ring">{l.label}</a>
            ))}
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button type="button" onClick={() => setLanguage(language === "fr" ? "ar" : "fr")} className="w-10 h-10 rounded-full text-[12px] font-bold text-[#16121F]/60 hover:bg-[#16121F]/5 transition focus-ring" aria-label={isRTL ? "التبديل إلى الفرنسية" : "التبديل إلى العربية"}>
              {t.switchLang}
            </button>
            <button type="button" onClick={onLoginClick} className="hidden md:block text-[13px] font-semibold text-[#16121F]/60 hover:text-[#16121F] px-3 focus-ring">{t.signin}</button>
            <button type="button" onClick={onSigninClick} className="h-10 px-4 sm:px-5 rounded-full text-[13px] sm:text-[14px] font-bold text-white focus-ring transition hover:brightness-110" style={{ background: ACCENT }}>
              {t.start}
            </button>
            <button type="button" onClick={() => setMenuOpen(true)} aria-label={t.open} className="lg:hidden w-10 h-10 rounded-full hover:bg-[#16121F]/5 flex items-center justify-center focus-ring">
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* DRAWER MOBILE */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenuOpen(false)} className="fixed inset-0 z-[55] bg-[#16121F]/40 lg:hidden" />
            <motion.div
              initial={{ x: isRTL ? "-100%" : "100%" }} animate={{ x: 0 }} exit={{ x: isRTL ? "-100%" : "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 280 }}
              className="fixed inset-y-0 end-0 z-[60] w-[85%] max-w-sm bg-white lg:hidden flex flex-col shadow-2xl"
              style={{ borderInlineStart: `1px solid ${BORDER}` }}
            >
              <div className="flex items-center justify-between px-5 h-16" style={{ borderBottom: `1px solid ${BORDER}` }}>
                <Logo size={34} />
                <button type="button" onClick={() => setMenuOpen(false)} className="w-10 h-10 rounded-full hover:bg-[#16121F]/5 flex items-center justify-center focus-ring" aria-label={t.close}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex-1 px-5 py-6 flex flex-col">
                {nav.map((l) => (
                  <a key={l.href} href={l.href} onClick={(e) => { e.preventDefault(); smoothTo(l.href); }} className="py-4 text-[18px] font-bold focus-ring" style={{ borderBottom: `1px solid ${BORDER}` }}>{l.label}</a>
                ))}
                <button type="button" onClick={() => { setMenuOpen(false); onLoginClick(); }} className="mt-4 py-3 text-start text-[16px] font-semibold text-[#16121F]/60">{t.signin}</button>
              </nav>
              <div className="p-5">
                <button type="button" onClick={() => { setMenuOpen(false); onSigninClick(); }} className="w-full h-12 rounded-full font-bold text-white" style={{ background: ACCENT }}>{t.start}</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Contenu au-dessus du mesh */}
      <div className="relative z-[1]">

        {/* HERO */}
        <section id="home" className="relative pt-32 pb-16 sm:pb-20">
          <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
            <div className="max-w-3xl mx-auto text-center">
              <SlideUp>
                <p className="text-[12px] font-bold tracking-[0.18em] uppercase mb-4" style={{ color: ACCENT, fontFamily: MONO_STACK }}>{"// "}{t.heroKicker}</p>
              </SlideUp>
              <SlideUp delay={0.06}>
                <h1 className="text-[clamp(2.8rem,7vw,5.4rem)] leading-[0.98] tracking-[-0.03em] font-bold" style={{ color: INK, fontFamily: display }}>
                  {t.heroTitle1}{" "}
                  <span style={{ background: "linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    {t.heroTitle2}
                  </span>
                </h1>
              </SlideUp>
              <SlideUp delay={0.14}>
                <p className="mt-6 text-[15px] sm:text-[16px] text-[#16121F]/65 max-w-xl mx-auto leading-relaxed">{t.heroSub}</p>
              </SlideUp>
              <SlideUp delay={0.22}>
                <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
                  <button type="button" onClick={() => { stopAllAudio(); onSigninClick(); }}
                    className="h-12 px-7 rounded-full text-[14px] font-bold text-white focus-ring transition hover:brightness-110"
                    style={{ background: ACCENT, boxShadow: "0 12px 32px -10px rgba(124,58,237,0.5)" }}>
                    {t.tryFree}
                  </button>
                  <button type="button" onClick={handleToggleIntroAudio}
                    className="h-12 px-5 rounded-full border-2 bg-white hov-accent text-[14px] font-semibold transition focus-ring flex items-center gap-2.5"
                    style={{ borderColor: BORDER }}>
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-white" style={{ background: ACCENT }}>
                      {isIntroPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current ms-0.5" />}
                    </span>
                    {isIntroPlaying ? (isRTL ? "إيقاف الصوت" : "Pause de l'intro") : (isRTL ? "تشغيل التقديم" : "Play l'intro")}
                  </button>
                </div>
                <p className="mt-4 text-[12px] font-semibold flex items-center justify-center gap-1.5" style={{ color: ACCENT }}>
                  <Gift className="w-3.5 h-3.5" /> {t.welcomeChip}
                </p>
              </SlideUp>
            </div>

            {/* ======== CONSOLE — ÉPURÉE ======== */}
            <SlideUp delay={0.34} className="mt-12 max-w-3xl mx-auto">
              <div
                className="rounded-2xl border bg-white overflow-hidden shadow-[0_30px_80px_-40px_rgba(124,58,237,0.35)]"
                style={{ borderColor: BORDER }}
                onMouseEnter={() => setPauseRotate(true)}
                onMouseLeave={() => setPauseRotate(false)}
                onFocusCapture={() => setPauseRotate(true)}
                onBlurCapture={() => setPauseRotate(false)}
              >
                {/* Barre de fenêtre */}
                <div className="flex items-center gap-1.5 px-4 h-10" style={{ borderBottom: `1px solid ${BORDER}`, background: "#FBFAFE" }}>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]/80" />
                  <Mono className="ms-3 text-[10px] tracking-[0.18em] uppercase text-[#16121F]/40">sawtify · studio</Mono>
                  <span className="ms-auto flex items-center gap-1.5" style={{ color: heroPlaying ? ACCENT : "rgba(22,18,31,0.35)" }}>
                    {heroPlaying && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: ACCENT }} />}
                    <Mono className="text-[10px] font-semibold tracking-[0.18em] uppercase">
                      {heroPlaying ? (isRTL ? "على الهواء" : "on air") : (isRTL ? "جاهز" : "ready")}
                    </Mono>
                  </span>
                </div>

                <div className="p-5 sm:p-6">
                  {/* En-tête canal */}
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Mono dir="ltr" className="text-[10px] font-semibold tracking-[0.14em] px-1.5 py-0.5 rounded border shrink-0"
                          style={{ color: featured.color, borderColor: `${featured.color}55`, background: `${featured.color}12` }}>
                          CH {String(LANDING_VOICES.findIndex((v) => v.id === featured.id) + 1).padStart(2, "0")}
                        </Mono>
                        <AnimatePresence mode="wait">
                          <motion.span key={featured.id + language}
                            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.22 }}
                            className="text-[17px] font-bold truncate">
                            {isRTL ? featured.nameAr : featured.nameFr}
                          </motion.span>
                        </AnimatePresence>
                      </div>
                      <div className="text-[12px] text-[#16121F]/50 mt-1 truncate">
                        {heroPlaying ? t.audioPreview : `${isRTL ? featured.tagAr : featured.tagFr} · ${featured.location}`}
                      </div>
                    </div>
                    <div className="text-end shrink-0">
                      <Mono className="block text-[10px] tracking-[0.2em] uppercase text-[#16121F]/40">24 kHz</Mono>
                      <div className="text-[13px] font-bold mt-0.5" style={{ color: ACCENT }}>20 {t.pts}</div>
                    </div>
                  </div>

                  {/* Waveform */}
                  <div className="rounded-xl border px-4 py-4" style={{ borderColor: BORDER, background: `${featured.color}0A` }}>
                    <Waveform color={featured.color} playing={heroPlaying} bars={40} />
                  </div>

                  {/* PROGRESSION + TEMPS */}
                  <div dir="ltr" className="mt-4 flex items-center gap-3">
                    <Mono className="text-[11px] text-[#16121F]/50 w-10 shrink-0 tabular-nums">{fmtTime(playElapsed)}</Mono>
                    <div className="relative flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#EDE9F7" }}>
                      <div className="absolute inset-y-0 start-0 rounded-full"
                        style={{ width: `${playProgress * 100}%`, background: featured.color, transition: "width 0.2s linear" }} />
                    </div>
                    <Mono className="text-[11px] text-[#16121F]/50 w-10 shrink-0 text-end tabular-nums">
                      {fmtTime(playTotal || sampleEst)}
                    </Mono>
                  </div>

                  {/* TRANSPORT + VITESSE */}
                  <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                    <div dir="ltr" className="flex items-center gap-2.5">
                      <button type="button" onClick={() => stepVoice(-1)}
                        aria-label={isRTL ? "الصوت السابق" : "Voix précédente"}
                        className="w-10 h-10 rounded-full border bg-white hov-accent flex items-center justify-center transition focus-ring"
                        style={{ borderColor: BORDER }}>
                        <SkipBack className="w-4 h-4" />
                      </button>
                      <button type="button"
                        onClick={() => { if (heroSamplePlaying) stopSpeech(); else { stopIntroAudio(); speak(featured, language); } }}
                        disabled={!speechSupported}
                        aria-label={heroSamplePlaying ? t.pause : t.listenInStudio}
                        aria-pressed={heroSamplePlaying}
                        className="w-14 h-14 rounded-full flex items-center justify-center text-white transition hover:scale-105 focus-ring disabled:opacity-40"
                        style={{ background: featured.color, boxShadow: `0 12px 30px -8px ${featured.color}` }}>
                        {heroSamplePlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ms-0.5" />}
                      </button>
                      <button type="button" onClick={() => stepVoice(1)}
                        aria-label={isRTL ? "الصوت التالي" : "Voix suivante"}
                        className="w-10 h-10 rounded-full border bg-white hov-accent flex items-center justify-center transition focus-ring"
                        style={{ borderColor: BORDER }}>
                        <SkipForward className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Vitesse — branchée sur le VRAI son */}
                    <div dir="ltr" className="flex items-center rounded-xl border overflow-hidden" style={{ borderColor: BORDER }}>
                      {SPEEDS.map((s) => (
                        <button key={s} type="button" onClick={() => applySpeed(s)}
                          aria-pressed={speed === s}
                          className={`px-2.5 py-1.5 text-[11px] font-semibold transition focus-ring ${speed === s ? "text-white" : "text-[#16121F]/55 hover:bg-[#7C3AED]/[0.06]"}`}
                          style={speed === s ? { background: ACCENT } : undefined}>
                          {s}x
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </SlideUp>

            {/* Preuve sociale */}
            <SlideUp delay={0.44} className="mt-8">
              <div className="flex items-center justify-center gap-4 sm:gap-5 text-[12px] text-[#16121F]/50 flex-wrap">
                <div className="flex -space-x-1.5" dir="ltr">
                  {[MESH.purple, MESH.pink, MESH.blue].map((c) => (
                    <div key={c} className="w-7 h-7 rounded-full border-2 border-white" style={{ background: c }} />
                  ))}
                </div>
                <span className="font-bold text-[#16121F]/75"><Num>9</Num> {isRTL ? "أصوات" : "voix"}</span>
                <span>·</span>
                <span><Num>1 200+</Num> {t.creators}</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1"><Star className="w-3 h-3" style={{ color: ACCENT, fill: ACCENT }} /> 4.9 / 5</span>
              </div>
            </SlideUp>
          </div>
        </section>

        {/* TRUST */}
        <section className="py-7" aria-label={isRTL ? "وسائل الدفع والجودة" : "Paiement et qualité"}>
          <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 rounded-2xl border bg-white px-6 py-6" style={{ borderColor: BORDER }}>
              {trust.map((p) => (
                <div key={p.k} className="text-center">
                  <div className="text-[14px] font-bold tracking-tight">{p.k}</div>
                  <Mono className="block text-[10px] uppercase tracking-[0.14em] text-[#16121F]/45 mt-1">{p.v}</Mono>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* VOICES — TRACKLIST */}
        <section id="voices" className="py-16 sm:py-24">
          <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
            <SlideUp>
              <SectionHead title={t.popularTitle} sub={t.popularSub} font={display} />
            </SlideUp>

            <SlideUp delay={0.1}>
              <div className="mt-10 rounded-2xl border bg-white overflow-hidden shadow-[0_18px_50px_-30px_rgba(124,58,237,0.3)]" style={{ borderColor: BORDER }}>

                <div className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3" style={{ borderBottom: `1px solid ${BORDER}`, background: "#FBFAFE" }}>
                  <span className="w-8 shrink-0" />
                  <Mono className="flex-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#16121F]/40">
                    {isRTL ? "القائمة · 9 أصوات" : "Piste · 9 voix"}
                  </Mono>
                  <Mono className="hidden sm:block w-16 text-end text-[10px] font-semibold uppercase tracking-[0.2em] text-[#16121F]/40">
                    {isRTL ? "المدة" : "Durée"}
                  </Mono>
                  <span className="w-10 shrink-0" />
                </div>

                {/* 3 pistes écoutables */}
                {LANDING_VOICES.map((v) => {
                  const active = playingId === v.id;
                  const name = isRTL ? v.nameAr : v.nameFr;
                  const no = String(LANDING_VOICES.findIndex((x) => x.id === v.id) + 1).padStart(2, "0");
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => (active ? stopSpeech() : openListen(v))}
                      aria-pressed={active}
                      className={`group w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4 text-start transition focus-ring ${active ? "" : "hover:bg-[#7C3AED]/[0.04]"}`}
                      style={{ borderBottom: `1px solid ${BORDER}`, background: active ? `${v.color}0F` : undefined }}
                    >
                      <span className="relative w-8 h-8 shrink-0 flex items-center justify-center">
                        <Mono className={`absolute text-[13px] transition-opacity ${active ? "opacity-0" : "group-hover:opacity-0"}`} style={{ color: "rgba(22,18,31,0.4)" }}>
                          {no}
                        </Mono>
                        <span className="absolute inset-0 flex items-center justify-center transition-opacity" style={{ opacity: active ? 1 : 0 }}>
                          {active
                            ? <Pause className="w-4 h-4 fill-current" style={{ color: v.color }} />
                            : <Play className="w-4 h-4 fill-current ms-0.5" style={{ color: v.color }} />}
                        </span>
                      </span>

                      <span className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-[15px] shrink-0"
                        style={{ background: `${v.color}1A`, color: v.color, fontFamily: display }}>
                        {name.charAt(0)}
                      </span>

                      <span className="flex-1 min-w-0">
                        <span className={`block text-[15px] font-bold truncate transition-colors ${active ? "" : "group-hover:text-[#7C3AED]"}`}>{name}</span>
                        <span className="block text-[12px] text-[#16121F]/50 truncate">
                          {isRTL ? v.tagAr : v.tagFr} · {v.location}
                        </span>
                      </span>

                      <span className="hidden md:flex items-center gap-1 text-[12px] font-bold text-[#16121F]/60 shrink-0">
                        <Star className="w-3 h-3" style={{ color: v.color, fill: v.color }} /><Num>{v.rating}</Num>
                        <span className="text-[#16121F]/35 font-medium ms-1">(<Num>{v.reviews}</Num>)</span>
                      </span>

                      <Mono dir="ltr" className="hidden sm:block w-16 text-end text-[12px] text-[#16121F]/45 shrink-0">
                        {fmtDur(v, language)}
                      </Mono>

                      <span className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 transition"
                        style={{ background: active ? v.color : "rgba(22,18,31,0.78)", boxShadow: active ? `0 8px 20px -8px ${v.color}` : undefined }}>
                        {active ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ms-0.5" />}
                      </span>
                    </button>
                  );
                })}

                {/* 6 pistes verrouillées */}
                <div style={{ borderTop: `1px dashed ${BORDER}` }}>
                  {HIDDEN_VOICES.map((v) => {
                    const name = isRTL ? v.nameAr : v.nameFr;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => { stopAllAudio(); onSigninClick(); }}
                        aria-label={t.moreVoices}
                        className="group w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4 text-start transition focus-ring hover:bg-[#7C3AED]/[0.04]"
                      >
                        <span className="w-8 h-8 shrink-0 flex items-center justify-center">
                          <Lock className="w-3.5 h-3.5 text-[#16121F]/30 transition-colors group-hover:text-[#7C3AED]" />
                        </span>

                        <span className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-[15px] shrink-0 select-none"
                          style={{ background: `${v.color}12`, color: v.color, filter: "blur(3px)", fontFamily: display }}>
                          {name.charAt(0)}
                        </span>

                        <span className="flex-1 min-w-0">
                          <span className="block text-[15px] font-bold truncate select-none" style={{ filter: "blur(6px)" }}>{name}</span>
                          <span className="block text-[12px] text-[#16121F]/40 truncate">
                            {isRTL ? "مقفلة — اسمعها في الاستوديو" : "Verrouillée — dans le studio"}
                          </span>
                        </span>

                        <Mono dir="ltr" className="hidden sm:block w-16 text-end text-[12px] text-[#16121F]/30 shrink-0">--:--</Mono>

                        <span className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition group-hover:scale-105"
                          style={{ background: ACCENT_SOFT, color: ACCENT }}>
                          <ArrowIcon className="w-4 h-4" />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </SlideUp>
          </div>
        </section>

        {/* PROCESS */}
        <section id="process" className="py-16 sm:py-24">
          <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
            <SlideUp>
              <SectionHead title={t.journeyTitle} sub={t.journeySub} center font={display} />
            </SlideUp>
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {journeySteps.map((s, i) => (
                <SlideUp key={s.n} delay={i * 0.07}>
                  <div className="rounded-2xl border bg-white p-6 sm:p-7 h-full min-h-[190px] flex flex-col justify-between card-lift" style={{ borderColor: BORDER }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-[14px]" style={{ background: ACCENT_SOFT, color: ACCENT, fontFamily: MONO_STACK }}>
                      {s.n}
                    </div>
                    <div>
                      <h3 className="text-[19px] font-bold mb-1.5" style={{ fontFamily: display }}>{s.t}</h3>
                      <p className="text-[12.5px] text-[#16121F]/55 leading-relaxed">{s.d}</p>
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
              <SectionHead title={t.useTitle} font={display} />
            </SlideUp>
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {uses.map((u, i) => (
                <SlideUp key={u.t} delay={i * 0.06}>
                  <div className="rounded-2xl border bg-white p-6 h-full card-lift" style={{ borderColor: BORDER }}>
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: ACCENT_SOFT, color: ACCENT }}>
                      <u.icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-[15px] font-bold mb-1">{u.t}</h3>
                    <p className="text-[12.5px] text-[#16121F]/55 leading-relaxed">{u.d}</p>
                  </div>
                </SlideUp>
              ))}
            </div>
          </div>
        </section>

        {/* COST */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-[1280px] px-5 sm:px-6 grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-5">
              <SlideUp>
                <SectionHead title={t.costTitle} sub={t.costSub} font={display} />
                <ul className="mt-6 space-y-2.5 text-[13px] text-[#16121F]/70">
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
                <div className="rounded-2xl border bg-white p-6 sm:p-8" style={{ borderColor: BORDER }}>
                  <Mono className="block text-[10px] tracking-[0.22em] uppercase text-[#16121F]/40 mb-4">{isRTL ? "احسب" : "Estimateur"}</Mono>
                  <div className="grid grid-cols-4 gap-2 mb-6">
                    {COST_STEPS.map((s, i) => (
                      <button key={s.sec} type="button" onClick={() => setCostIdx(i)}
                        className={`py-2.5 rounded-xl text-[12px] font-bold transition focus-ring ${costIdx === i ? "text-white" : "text-[#16121F]/60 border bg-white hov-accent"}`}
                        style={costIdx === i ? { background: ACCENT, borderColor: ACCENT } : { borderColor: BORDER }}>
                        {isRTL ? s.labelAr : s.labelFr}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-end justify-between gap-4 flex-wrap">
                    <div>
                      <Mono className="block text-[10px] uppercase tracking-[0.18em] text-[#16121F]/40 mb-1">{isRTL ? "التكلفة" : "Coût"}</Mono>
                      <div className="text-[52px] leading-none font-bold" style={{ fontFamily: NUM_STACK }}>
                        <AnimatePresence mode="wait">
                          <motion.span key={costIdx} className="inline-block"
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.22 }}>
                            {COST_STEPS[costIdx].pts}
                          </motion.span>
                        </AnimatePresence>
                        <span className="text-[15px] font-semibold text-[#16121F]/40 ms-2">{t.pts}</span>
                      </div>
                    </div>
                    <button type="button" onClick={() => { stopAllAudio(); onSigninClick(); }}
                      className="h-11 px-5 rounded-xl font-bold text-[13px] text-white focus-ring hover:brightness-110 transition" style={{ background: ACCENT }}>
                      {t.tryFree}
                    </button>
                  </div>
                </div>
              </SlideUp>
            </div>
          </div>
        </section>

        {/* METRICS */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
            <SlideUp>
              <SectionHead title={t.metricsTitle} center font={display} />
            </SlideUp>
            <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4">
              {metrics.map((m, i) => (
                <SlideUp key={m.l} delay={i * 0.06}>
                  <div className="rounded-2xl border bg-white p-8 text-center card-lift" style={{ borderColor: BORDER }}>
                    <div className="text-[clamp(2.2rem,4.2vw,3rem)] leading-none font-bold mb-2" style={{ color: ACCENT, fontFamily: NUM_STACK }}>
                      <Counter target={m.n} suffix={m.s} />
                    </div>
                    <Mono className="text-[10px] uppercase tracking-[0.2em] text-[#16121F]/45">{m.l}</Mono>
                  </div>
                </SlideUp>
              ))}
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
            <SlideUp>
              <SectionHead title={t.testTitle} center font={display} />
            </SlideUp>
            <SlideUp delay={0.1}>
              <div className="mt-12 max-w-3xl mx-auto rounded-2xl border bg-white p-8 sm:p-12" style={{ borderColor: BORDER }}>
                <AnimatePresence mode="wait">
                  <motion.div key={activeTesti} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.4 }} className="text-center">
                    <div className="flex justify-center gap-1 mb-5">
                      {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="w-4 h-4" style={{ color: ACCENT, fill: ACCENT }} />)}
                    </div>
                    <blockquote className="text-[clamp(1.25rem,2.6vw,1.8rem)] leading-[1.35] font-semibold" style={{ fontFamily: display }}>
                      “{testimonials[activeTesti].q}”
                    </blockquote>
                    <div className="mt-7 flex items-center justify-center gap-3">
                      <div className="w-11 h-11 rounded-full flex items-center justify-center text-[13px] font-bold text-white" style={{ background: `linear-gradient(135deg, ${ACCENT}, ${MESH.pink})` }}>
                        {testimonials[activeTesti].img}
                      </div>
                      <div className="text-start">
                        <div className="text-[13.5px] font-bold">{testimonials[activeTesti].n}</div>
                        <div className="text-[12px] text-[#16121F]/50">{testimonials[activeTesti].r}</div>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
                <div className="mt-8 flex items-center justify-center gap-4">
                  <button type="button" onClick={() => setActiveTesti((p) => (p - 1 + testimonials.length) % testimonials.length)}
                    className="w-10 h-10 rounded-full border bg-white hov-accent text-[#16121F]/60 flex items-center justify-center focus-ring"
                    style={{ borderColor: BORDER }} aria-label={isRTL ? "السابق" : "Précédent"}>
                    {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                  </button>
                  <div className="flex items-center gap-2">
                    {testimonials.map((_, i) => (
                      <button key={i} type="button" onClick={() => setActiveTesti(i)} aria-label={`${i + 1}`}
                        className={`h-1.5 rounded-full transition-all ${i === activeTesti ? "w-6" : "w-1.5 bg-[#16121F]/20 hover:bg-[#16121F]/40"}`}
                        style={i === activeTesti ? { background: ACCENT } : undefined} />
                    ))}
                  </div>
                  <button type="button" onClick={() => setActiveTesti((p) => (p + 1) % testimonials.length)}
                    className="w-10 h-10 rounded-full border bg-white hov-accent text-[#16121F]/60 flex items-center justify-center focus-ring"
                    style={{ borderColor: BORDER }} aria-label={isRTL ? "التالي" : "Suivant"}>
                    {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </SlideUp>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="py-16 sm:py-24">
          <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
            <SlideUp>
              <SectionHead title={t.pricingTitle} sub={t.pricingSub} center font={display} />
            </SlideUp>

            {/* BANNIÈRE CADEAU ANIMÉE */}
            <SlideUp delay={0.08}>
              <div className="mb-10 mt-10 max-w-2xl mx-auto">
                <motion.button
                  type="button"
                  onClick={() => { stopAllAudio(); onSigninClick(); }}
                  className="relative w-full overflow-hidden rounded-2xl border text-start focus-ring"
                  style={{ borderColor: "rgba(124,58,237,0.45)", background: "linear-gradient(115deg, #F6F1FF 0%, #EFE6FF 45%, #FDEFF7 100%)" }}
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <motion.div aria-hidden className="absolute inset-0 pointer-events-none"
                    style={{ background: "linear-gradient(105deg, transparent 32%, rgba(255,255,255,0.65) 50%, transparent 68%)" }}
                    animate={{ x: ["-130%", "230%"] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.4 }}
                  />
                  <motion.div aria-hidden className="absolute -top-12 end-8 w-36 h-36 rounded-full pointer-events-none"
                    style={{ background: "rgba(236,72,153,0.16)", filter: "blur(34px)" }}
                    animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0.95, 0.5] }}
                    transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <motion.div aria-hidden className="absolute -bottom-14 start-10 w-32 h-32 rounded-full pointer-events-none"
                    style={{ background: "rgba(124,58,237,0.16)", filter: "blur(30px)" }}
                    animate={{ scale: [1.2, 1, 1.2], opacity: [0.4, 0.8, 0.4] }}
                    transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
                  />

                  <span className="relative flex items-center gap-3.5 px-4 sm:px-5 py-4">
                    <span className="relative shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: ACCENT, boxShadow: "0 10px 24px -8px rgba(124,58,237,0.55)" }}>
                      <motion.span aria-hidden className="absolute inset-0 rounded-2xl"
                        style={{ background: ACCENT }}
                        animate={{ scale: [1, 1.4], opacity: [0.55, 0] }}
                        transition={{ duration: 1.7, repeat: Infinity, ease: "easeOut" }}
                      />
                      <motion.span
                        animate={{ rotate: [0, -9, 9, -6, 0], scale: [1, 1.14, 1.06, 1.12, 1] }}
                        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}>
                        <Gift className="w-5 h-5 text-white" />
                      </motion.span>
                    </span>

                    <span className="flex-1 min-w-0">
                      <span className="block text-[14.5px] font-extrabold leading-snug" style={{ color: INK }}>{t.welcomeBanner}</span>
                      <span className="block text-[12px] text-[#16121F]/60 mt-0.5">{t.bannerSub}</span>
                    </span>

                    <motion.span aria-hidden className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white"
                      style={{ background: ACCENT }}
                      animate={{ x: isRTL ? [0, -4, 0] : [0, 4, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}>
                      <ArrowIcon className="w-4 h-4" />
                    </motion.span>
                  </span>
                </motion.button>
              </div>
            </SlideUp>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {pricing.map((p, i) => (
                <SlideUp key={p.pts} delay={i * 0.06}>
                  <div className={`relative rounded-2xl border p-6 h-full flex flex-col card-lift ${p.featured ? "text-white" : "bg-white"}`}
                    style={p.featured
                      ? { borderColor: "transparent", background: `linear-gradient(160deg, ${ACCENT} 0%, #8B5CF6 55%, ${MESH.pink} 140%)`, boxShadow: "0 24px 52px -20px rgba(124,58,237,0.55)" }
                      : { borderColor: BORDER }}>
                    {p.featured && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold tracking-[0.12em] uppercase whitespace-nowrap" style={{ background: "#fff", color: INK }}>
                        {t.popular}
                      </div>
                    )}
                    <div className="text-[42px] leading-none font-bold mb-1" style={{ fontFamily: NUM_STACK }}><Num>{p.ptsLabel}</Num></div>
                    <Mono className="block text-[10px] uppercase tracking-[0.2em] mb-4" style={{ color: p.featured ? "rgba(255,255,255,0.75)" : "rgba(22,18,31,0.4)" }}>{t.pts}</Mono>
                    <div className="h-px mb-4" style={{ background: p.featured ? "rgba(255,255,255,0.25)" : BORDER }} />
                    <p className={`text-[12px] mb-5 flex-1 leading-relaxed ${p.featured ? "text-white/85" : "text-[#16121F]/60"}`}>{p.desc}</p>
                    <div className="flex items-baseline gap-1.5 mb-5">
                      <span className="text-[24px] font-bold"><Num>{p.price}</Num></span>
                      <span className={`text-[11px] font-semibold ${p.featured ? "text-white/70" : "text-[#16121F]/40"}`}>DZD</span>
                    </div>
                    <button type="button" onClick={() => { stopAllAudio(); onSigninClick(); }}
                      className={`h-11 rounded-xl text-[13px] font-bold transition focus-ring ${p.featured ? "bg-white hover:brightness-95" : "text-white hover:brightness-110"}`}
                      style={p.featured ? { color: INK } : { background: ACCENT }}>
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
                <SlideUp>
                  <SectionHead title={t.faqTitle} font={display} />
                </SlideUp>
              </div>
              <div className="lg:col-span-7 lg:col-start-6">
                <SlideUp delay={0.08}>
                  <div className="rounded-2xl border bg-white overflow-hidden" style={{ borderColor: BORDER }}>
                    {faqs.map((f, i) => {
                      const open = openFaq === i;
                      return (
                        <div key={f.q} style={{ borderBottom: i < faqs.length - 1 ? `1px solid ${BORDER}` : undefined }}>
                          <button type="button" onClick={() => setOpenFaq(open ? null : i)}
                            className="w-full py-5 px-5 sm:px-6 flex items-center gap-4 text-start focus-ring group" aria-expanded={open}>
                            <span className="flex-1 text-[14.5px] font-semibold group-hover:text-[#7C3AED] transition-colors">{f.q}</span>
                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all ${open ? "rotate-45 text-white" : "text-[#16121F]/60"}`}
                              style={open ? { background: ACCENT } : { background: ACCENT_SOFT }}>
                              <Plus className="w-4 h-4" />
                            </span>
                          </button>
                          <AnimatePresence initial={false}>
                            {open && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28 }} className="overflow-hidden">
                                <p className="pb-5 px-5 sm:px-6 pe-14 text-[13px] text-[#16121F]/60 leading-relaxed">{f.a}</p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </SlideUp>
              </div>
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
            <SlideUp>
              <div className="relative rounded-[28px] p-12 sm:p-16 text-center text-white overflow-hidden"
                style={{ background: `linear-gradient(135deg, #6D28D9 0%, ${ACCENT} 45%, #9D5CE8 100%)`, boxShadow: "0 30px 70px -30px rgba(124,58,237,0.6)" }}>
                <div className="absolute top-8 start-[12%] w-44 h-44 rounded-full blur-3xl" style={{ background: "rgba(255,255,255,0.18)" }} aria-hidden />
                <div className="absolute bottom-8 end-[12%] w-52 h-52 rounded-full blur-3xl" style={{ background: "rgba(236,72,153,0.25)" }} aria-hidden />
                <div className="relative">
                  <h2 className="text-[clamp(2.1rem,5vw,3.8rem)] leading-[1.04] tracking-[-0.02em] font-bold" style={{ fontFamily: display }}>{t.ctaTitle}</h2>
                  <p className="mt-4 text-[15px] text-white/75 max-w-md mx-auto">{t.ctaSub}</p>
                  <button type="button" onClick={() => { stopAllAudio(); onSigninClick(); }}
                    className="mt-8 inline-flex items-center gap-2 h-14 px-8 rounded-full font-bold text-[15px] transition focus-ring hover:scale-[1.02]"
                    style={{ background: "#fff", color: INK }}>
                    {t.tryFree}<ArrowIcon className="w-4 h-4" />
                  </button>
                  <Mono className="block mt-5 text-[10px] uppercase tracking-[0.2em] text-white/70">
                    {isRTL ? "بدون بطاقة · 50 نقطة مجاناً" : "Sans carte · 50 points offerts"}
                  </Mono>
                </div>
              </div>
            </SlideUp>
          </div>
        </section>

        {/* FOOTER */}
        <footer id="contact" className="pt-12 pb-28 sm:pb-12" style={{ borderTop: `1px solid ${BORDER}` }}>
          <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
              <div className="lg:col-span-2">
                <Logo size={38} />
                <p className="mt-4 text-[13px] text-[#16121F]/55 max-w-sm leading-relaxed">
                  {isRTL
                    ? "استوديو صوتي جزائري. نصّك بالدارجة يولي صوتًا طبيعيًا، جاهزًا للإعلان."
                    : "Studio vocal algérien. Votre texte en darija devient une voix naturelle, prête pour la pub."}
                </p>
                <p className="mt-3 text-[12px] font-semibold text-[#16121F]/70 flex items-center gap-2">
                  <Headphones className="w-3.5 h-3.5" style={{ color: ACCENT }} /> Alger, Algérie · {t.footTag}
                </p>
              </div>
              <div>
                <Mono className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-[#16121F]/40 mb-3">{isRTL ? "المنصة" : "Produit"}</Mono>
                <div className="flex flex-col gap-2 text-[13px] font-medium">
                  {nav.map((l) => (
                    <a key={l.href} href={l.href} onClick={(e) => { e.preventDefault(); smoothTo(l.href); }} className="text-[#16121F]/60 hover:text-[#7C3AED] transition-colors">{l.label}</a>
                  ))}
                </div>
              </div>
              <div>
                <Mono className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-[#16121F]/40 mb-3">{t.contact}</Mono>
                <a href="mailto:contact@sawtify.dz" className="text-[13px] font-semibold text-[#16121F]/70 hover:text-[#7C3AED] transition-colors">contact@sawtify.dz</a>
                <div className="mt-4 flex flex-wrap gap-2">
                  {["Edahabia", "CIB", "SATIM"].map((p) => (
                    <span key={p} className="text-[10px] font-bold px-2 py-1 rounded-full border bg-white text-[#16121F]/60" style={{ borderColor: BORDER }}>{p}</span>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-[11px] text-[#16121F]/50">
                  <ShieldCheck className="w-3.5 h-3.5" style={{ color: ACCENT }} />
                  {isRTL ? "دفع آمن، لا نخزّن رقم البطاقة." : "Paiement sécurisé, aucune carte stockée."}
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 text-[12px] text-[#16121F]/45" style={{ borderTop: `1px solid ${BORDER}` }}>
              <span>© <Num>2026</Num> Sawtify · {t.footTag}</span>
              <div className="flex items-center gap-4">
                <button type="button" onClick={() => setLegal("cgu")} className="hover:text-[#7C3AED] transition-colors">{t.cgu}</button>
                <button type="button" onClick={() => setLegal("privacy")} className="hover:text-[#7C3AED] transition-colors">{t.privacy}</button>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* CTA MOBILE STICKY */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 p-3 bg-white/95 backdrop-blur-xl" style={{ borderTop: `1px solid ${BORDER}` }}>
        <button type="button" onClick={() => { stopAllAudio(); onSigninClick(); }}
          className="w-full h-12 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 text-white" style={{ background: ACCENT }}>
          {t.tryFree} · 50 {t.pts}
        </button>
      </div>

      {/* MODALE ÉCOUTE */}
      <AnimatePresence>
        {listenVoice && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-[#16121F]/40" onClick={() => { setListenVoice(null); stopSpeech(); }} />
            <motion.div role="dialog" aria-modal="true" aria-labelledby="listen-title"
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
              className="fixed z-[71] inset-x-4 bottom-6 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md bg-white border rounded-2xl p-6 shadow-2xl"
              style={{ borderColor: BORDER }}>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <Mono className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-[#16121F]/40 mb-1">{t.listenInStudio}</Mono>
                  <h3 id="listen-title" className="text-[22px] font-bold">{isRTL ? listenVoice.nameAr : listenVoice.nameFr}</h3>
                  <p className="text-[12px] text-[#16121F]/50">{isRTL ? listenVoice.tagAr : listenVoice.tagFr} · {listenVoice.location}</p>
                </div>
                <button type="button" onClick={() => { setListenVoice(null); stopSpeech(); }} className="w-9 h-9 rounded-full hover:bg-[#16121F]/5 flex items-center justify-center focus-ring" aria-label={t.close}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="rounded-xl border p-4 mb-4" style={{ borderColor: BORDER, background: `${listenVoice.color}0D` }}>
                <Waveform color={listenVoice.color} playing={playingId === listenVoice.id} bars={30} />
                <button type="button"
                  onClick={() => (playingId === listenVoice.id ? stopSpeech() : speak(listenVoice, language))}
                  disabled={!speechSupported}
                  className="mt-3 w-full h-11 rounded-xl font-bold text-[13px] text-white flex items-center justify-center gap-2 focus-ring hover:brightness-110 disabled:opacity-40 transition"
                  style={{ background: listenVoice.color }}>
                  {playingId === listenVoice.id
                    ? <><Pause className="w-4 h-4 fill-current" />{t.pause}</>
                    : <><Play className="w-4 h-4 fill-current" />{t.listenInStudio}</>}
                </button>
                <p className="mt-2 text-[11px] text-center text-[#16121F]/45">{speechSupported ? t.browserNote : t.noSpeechNote}</p>
              </div>
              <p className="text-[13px] leading-relaxed text-[#16121F]/70 mb-2" dir="auto">
                “{(isRTL ? listenVoice.sampleAr : listenVoice.sampleFr).slice(0, 52).trimEnd()}…”
              </p>
              <p className="text-[13px] text-[#16121F]/60 leading-relaxed mb-5">{t.listenBody}</p>
              <button type="button" onClick={() => { stopAllAudio(); onSigninClick(); }}
                className="w-full h-12 rounded-xl font-bold text-[14px] text-white transition hover:brightness-110" style={{ background: ACCENT }}>
                {t.moreVoices} — {isRTL ? listenVoice.nameAr : listenVoice.nameFr}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* LÉGAL */}
      <AnimatePresence>
        {legal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-[#16121F]/40" onClick={() => setLegal(null)} />
            <motion.div role="dialog" aria-modal="true"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="fixed z-[71] inset-x-4 top-[12%] sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-lg bg-white border rounded-2xl p-6 shadow-2xl max-h-[70vh] overflow-y-auto scrollbar-none"
              style={{ borderColor: BORDER }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[18px] font-bold">{legal === "cgu" ? t.cgu : t.privacy}</h3>
                <button type="button" onClick={() => setLegal(null)} className="w-9 h-9 rounded-full hover:bg-[#16121F]/5 flex items-center justify-center focus-ring" aria-label={t.close}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[13px] leading-relaxed text-[#16121F]/60">{legalCopy[legal]}</p>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* DOCK AUDIO */}
      <AudioDock isPlaying={isIntroPlaying} volume={audioVolume}
        onToggle={handleToggleIntroAudio} isRTL={isRTL} hidden={overlayOpen} />
    </div>
  );
};

export default LandingPage;
