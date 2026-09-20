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
  Plus,
  Menu,
  X,
  Check,
  Star,
  Headphones,
  ShoppingBag,
  Clapperboard,
  Mic2,
  Phone,
  ShieldCheck,
  Gift,
  Pause,
  Volume2,
  VolumeX,
  SkipBack,
  SkipForward,
  Lock,
  Timer,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence, useScroll, useInView } from "motion/react";

export interface LandingPageProps {
  onLoginClick: () => void;
  onSigninClick: () => void;
  language: "fr" | "ar";
  setLanguage: (lang: "fr" | "ar") => void;
}

/* ═══════════ PALETTE — VIOLET ALGÉRIEN ═══════════ */
const PAPER = "#FAF6EE";
const INK = "#1A0F2E";
const PURPLE = "#6B2DBC";
const PURPLE_DARK = "#4A1E87";
const PURPLE_DEEPER = "#2E0F5C";
const PURPLE_SOFT = "#F0E8FA";
const PURPLE_GLOW = "rgba(107, 45, 188, 0.45)";
const GREEN = "#0E7A45";
const AMBER = "#E9A13B";
const CLAY = "#C2452A";
const BORDER = "#E5DCCB";
const BG_VIDEO_URL =
  "https://res.cloudinary.com/gz65ybug/video/upload/v1788621700/Robot_looking_with_microphone_1080p_202509051613.mp4";
const INTRO_AUDIO_URL =
  "https://res.cloudinary.com/gz65ybug/video/upload/v1789055318/Generated_Audio_September_10_2026_-_4_29PM.wav";
const LOGO =
  "https://i.ibb.co/nqShkPNP/68126702-75e5-4de6-9b53-e51800b05e4a.jpg";
const MONO_STACK = "'JetBrains Mono', 'Cairo', monospace";
const NUM_STACK = "'Space Grotesk', 'Cairo', sans-serif";
const AR_STACK = "'Cairo', sans-serif";
const FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600&family=Space+Grotesk:wght@500;600;700&display=swap";
const AVATAR_COLORS = ["#6B2DBC", "#C13B5E", "#2C5E9E"];

const GlobalStyles = () => (
  <style>{`
    html { scroll-behavior: smooth; -webkit-font-smoothing: antialiased; }
    body { background: ${PAPER}; color: ${INK}; margin: 0; }
    #sawtify-landing { overflow-x: clip; }
    #sawtify-landing * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    #sawtify-landing ::selection { background: ${PURPLE}; color: #fff; }
    #sawtify-landing ::-webkit-scrollbar { width: 10px; }
    #sawtify-landing ::-webkit-scrollbar-track { background: #F1EADB; }
    #sawtify-landing ::-webkit-scrollbar-thumb { background: rgba(107,45,188,0.35); border-radius: 10px; }
    #sawtify-landing .scrollbar-none { scrollbar-width: none; -ms-overflow-style: none; }
    #sawtify-landing .scrollbar-none::-webkit-scrollbar { display: none; }
    @keyframes wave { 0%, 100% { transform: scaleY(0.28); } 50% { transform: scaleY(1); } }
    #sawtify-landing .wave-bar { animation: wave 1.3s ease-in-out infinite; transform-origin: bottom; }
    #sawtify-landing .focus-ring:focus-visible { outline: 2px solid ${PURPLE}; outline-offset: 3px; border-radius: 10px; }
    #sawtify-landing .grain { position: fixed; inset: 0; z-index: 0; pointer-events: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E"); }
    @keyframes marquee { to { transform: translateX(-50%); } }
    #sawtify-landing .marquee-track { animation: marquee 28s linear infinite; }
    #sawtify-landing .marquee:hover .marquee-track { animation-play-state: paused; }
    #sawtify-landing .card-lift { transition: transform .35s cubic-bezier(0.16,1,0.3,1), box-shadow .35s, border-color .35s; }
    @media (hover: hover) { #sawtify-landing .card-lift:hover { transform: translateY(-4px); box-shadow: 0 16px 36px -18px rgba(26,15,46,0.32); border-color: rgba(107,45,188,0.4); } }
    #sawtify-landing .hov-ink:hover, #sawtify-landing .hov-ink:focus-visible { border-color: rgba(26,15,46,0.5); }
    @keyframes pulse-glow { 0%, 100% { box-shadow: 0 0 0 0 ${PURPLE_GLOW}; } 70% { box-shadow: 0 0 0 18px rgba(107,45,188,0); } }
    #sawtify-landing .pulse-glow { animation: pulse-glow 2.4s infinite; }
    @keyframes shine { 0% { transform: translateX(-120%); } 100% { transform: translateX(220%); } }
    #sawtify-landing .shine { position: relative; overflow: hidden; }
    #sawtify-landing .shine::before { content: ''; position: absolute; inset: 0; background: linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.45) 50%, transparent 70%); animation: shine 3.5s ease-in-out infinite; pointer-events: none; }
    @media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }
  `}</style>
);

/* ═══════════ 🎬 VIDÉO D'ARRIÈRE-PLAN — simplifiée, affichage garanti ═══════════ */
const BackgroundVideo = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.setAttribute("muted", "");
    v.setAttribute("playsinline", "");
    v.setAttribute("loop", "");
    v.setAttribute("autoplay", "");
    const onReady = () => setReady(true);
    v.addEventListener("canplay", onReady, { once: true });
    v.addEventListener("loadeddata", onReady, { once: true });
    const p = v.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
    return () => {
      v.removeEventListener("canplay", onReady);
      v.removeEventListener("loadeddata", onReady);
    };
  }, []);

  // Relance si bloqué
  useEffect(() => {
    const onFirst = () => {
      const v = videoRef.current;
      if (v && v.paused) v.play().catch(() => {});
    };
    window.addEventListener("pointerdown", onFirst, { once: true, capture: true });
    return () => window.removeEventListener("pointerdown", onFirst, { capture: true } as EventListenerOptions);
  }, []);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden" aria-hidden>
      {/* Fond violet plein : visible pendant le chargement */}
      <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${PURPLE_DEEPER} 0%, ${PURPLE_DARK} 100%)` }} />
      <video
        ref={videoRef}
        src={BG_VIDEO_URL}
        muted
        loop
        playsInline
        autoPlay
        preload="auto"
        controls={false}
        disablePictureInPicture
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
        style={{
          opacity: ready ? 1 : 0,
          minWidth: "100%",
          minHeight: "100%",
        }}
      />
      {/* Overlay dégradé violet pour lisibilité */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(46,15,92,0.5) 0%, rgba(74,30,135,0.55) 35%, rgba(46,15,92,0.8) 75%, rgba(26,15,46,0.92) 100%)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 30%, rgba(26,15,46,0.5) 100%)",
        }}
      />
    </div>
  );
};

const Logo = ({ size = 38, dark = false }: { size?: number; dark?: boolean }) => {
  const [imgError, setImgError] = useState(false);
  return (
    <div className="flex items-center gap-2.5 select-none">
      <div
        className="rounded-xl overflow-hidden shrink-0"
        style={{ width: size, height: size, boxShadow: dark ? "0 3px 14px rgba(255,255,255,0.18)" : "0 3px 12px rgba(107,45,188,0.35)" }}
      >
        {!imgError ? (
          <img src={LOGO} alt="Sawtify" width={size} height={size} decoding="async"
            onError={() => setImgError(true)} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-bold text-white"
            style={{ background: PURPLE, fontSize: size * 0.5, fontFamily: NUM_STACK }}>S</div>
        )}
      </div>
      <span className="font-bold text-[19px] tracking-tight" style={{ color: dark ? "#fff" : INK, fontFamily: NUM_STACK }}>
        Sawtify
      </span>
    </div>
  );
};

const Num = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <span dir="ltr" style={{ unicodeBidi: "isolate", fontFamily: NUM_STACK }} className={`inline-block tabular-nums ${className}`}>
    {children}
  </span>
);
const Mono = ({ children, className = "", style, dir }: {
  children: React.ReactNode; className?: string; style?: React.CSSProperties;
  dir?: React.HTMLAttributes<HTMLSpanElement>["dir"];
}) => (
  <span dir={dir} className={className} style={{ fontFamily: MONO_STACK, ...style }}>{children}</span>
);

const Kicker = ({ ar, children, className = "", style }: {
  ar: boolean; children: React.ReactNode; className?: string; style?: React.CSSProperties;
}) => (
  <span
    className={`${ar ? "font-bold" : "font-semibold uppercase tracking-[0.16em]"} ${className}`}
    style={{ fontFamily: ar ? AR_STACK : MONO_STACK, ...style }}
  >
    {children}
  </span>
);

const SectionHead = ({ eyebrow, title, sub, center = false, font, ar }: {
  eyebrow?: string; title: string; sub?: string; center?: boolean; font: string; ar: boolean;
}) => (
  <div className={center ? "text-center mx-auto max-w-2xl" : "max-w-2xl"}>
    {eyebrow && (
      <Kicker ar={ar} className="block mb-3 text-[11.5px]" style={{ color: PURPLE }}>
        {eyebrow}
      </Kicker>
    )}
    <h2 className="text-[clamp(1.9rem,4.2vw,3.1rem)] leading-[1.08] tracking-[-0.015em] font-extrabold" style={{ color: INK, fontFamily: font }}>
      {title}
    </h2>
    {sub && <p className="mt-4 text-[14px] text-[#1A0F2E]/65 leading-relaxed">{sub}</p>}
  </div>
);

const Waveform = React.memo(function Waveform({ color, playing, bars = 30 }: {
  color: string; playing: boolean; bars?: number;
}) {
  return (
    <div className="flex items-end justify-center gap-[3px] h-24 w-full" dir="ltr" aria-hidden>
      {Array.from({ length: bars }).map((_, i) => {
        const h = 18 + Math.abs(Math.sin(i * 0.55) * Math.cos(i * 0.31)) * 82;
        const hot = i % 6 === 0;
        return (
          <span key={i} className={`flex-1 rounded-full origin-bottom ${playing ? "wave-bar" : ""}`}
            style={{
              height: `${h}%`, maxWidth: 4,
              background: hot ? color : "rgba(26,15,46,0.14)",
              opacity: playing ? 1 : 0.55,
              animationDelay: `${(i % 10) * 0.1}s`,
            }} />
        );
      })}
    </div>
  );
});

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

const SlideUp = ({ children, delay = 0, className = "" }: {
  children: React.ReactNode; delay?: number; className?: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 32 }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}>{children}</motion.div>
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

function useOfferCountdown() {
  const [left, setLeft] = useState<{ h: string; m: string; s: string } | null>(null);
  useEffect(() => {
    let deadline = 0;
    try {
      const KEY = "sawtify_offer_deadline";
      deadline = Number(window.localStorage.getItem(KEY) || 0);
      if (!deadline || deadline < Date.now()) {
        deadline = Date.now() + 48 * 60 * 60 * 1000;
        window.localStorage.setItem(KEY, String(deadline));
      }
    } catch { deadline = Date.now() + 48 * 60 * 60 * 1000; }
    const pad = (n: number) => String(n).padStart(2, "0");
    const tick = () => {
      const d = Math.max(0, deadline - Date.now());
      setLeft({
        h: pad(Math.floor(d / 3.6e6)),
        m: pad(Math.floor((d % 3.6e6) / 6e4)),
        s: pad(Math.floor((d % 6e4) / 1e3)),
      });
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  return left;
}

function useExitIntent(onTrigger: () => void) {
  const triggered = useRef(false);
  const cbRef = useRef(onTrigger);
  cbRef.current = onTrigger;
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    try { if (window.sessionStorage.getItem("sawtify_exit_shown")) return; } catch {}
    const onOut = (e: MouseEvent) => {
      if (triggered.current || e.clientY > 8 || e.relatedTarget) return;
      triggered.current = true;
      try { window.sessionStorage.setItem("sawtify_exit_shown", "1"); } catch {}
      window.removeEventListener("mouseout", onOut);
      cbRef.current();
    };
    const armT = window.setTimeout(() => document.addEventListener("mouseout", onOut), 9000);
    return () => { window.clearTimeout(armT); window.removeEventListener("mouseout", onOut); };
  }, []);
}

function useSampleAudio() {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [sampleProgress, setSampleProgress] = useState(0);
  const [sampleElapsed, setSampleElapsed] = useState(0);
  const [sampleTotal, setSampleTotal] = useState(0);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rateRef = useRef(1);
  const ensureAudio = useCallback(() => {
    if (audioRef.current) return audioRef.current;
    const a = new Audio();
    a.preload = "none";
    a.addEventListener("ended", () => { setPlayingId(null); setSampleProgress(0); setSampleElapsed(0); });
    a.addEventListener("timeupdate", () => {
      if (a.duration > 0) {
        setSampleProgress(a.currentTime / a.duration);
        setSampleElapsed(a.currentTime);
        setSampleTotal(a.duration);
      }
    });
    a.addEventListener("loadedmetadata", () => {
      const vid = a.dataset.vid;
      if (vid && a.duration > 0 && Number.isFinite(a.duration)) {
        setDurations((d) => (d[vid] ? d : { ...d, [vid]: a.duration }));
      }
    });
    audioRef.current = a;
    return a;
  }, []);
  const stopSample = useCallback(() => {
    audioRef.current?.pause();
    setPlayingId(null); setSampleProgress(0); setSampleElapsed(0);
  }, []);
  const playSample = useCallback((voiceId: string, audioUrl?: string) => {
    if (!audioUrl) return;
    const a = ensureAudio();
    a.pause();
    a.dataset.vid = voiceId;
    a.src = audioUrl;
    a.playbackRate = rateRef.current;
    a.play().then(() => setPlayingId(voiceId)).catch(() => setPlayingId(null));
  }, [ensureAudio]);
  const setSampleRate = useCallback((rate: number) => {
    rateRef.current = rate;
    if (audioRef.current && !audioRef.current.paused) audioRef.current.playbackRate = rate;
  }, []);
  useEffect(() => () => { audioRef.current?.pause(); }, []);
  return { playingId, sampleProgress, sampleElapsed, sampleTotal, durations, playSample, stopSample, setSampleRate };
}

const AudioDock = ({ isPlaying, volume, onToggle, isRTL, hidden = false }: {
  isPlaying: boolean; volume: number; onToggle: () => void; isRTL: boolean; hidden?: boolean;
}) => {
  const F = [0.55, 1, 0.75, 0.9, 0.6];
  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", damping: 22, stiffness: 120, delay: 0.8 }}
      className={`fixed bottom-24 sm:bottom-6 end-3 sm:end-6 z-[80] transition-all duration-300 ${hidden ? "opacity-0 pointer-events-none translate-y-3" : "opacity-100"}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={isPlaying}
        aria-label={isPlaying ? (isRTL ? "إيقاف الصوت" : "Arrêter l'audio") : (isRTL ? "تشغيل التقديم" : "Lire l'intro")}
        className="flex items-center gap-2 rounded-full border bg-white pl-3 pr-1 py-1 shadow-[0_10px_30px_rgba(107,45,188,0.25)] hover:scale-[1.02] transition pulse-glow focus-ring"
        style={{ borderColor: "rgba(107,45,188,0.25)" }}
      >
        {isPlaying
          ? <Volume2 className="w-3.5 h-3.5 shrink-0" style={{ color: PURPLE }} />
          : <VolumeX className="w-3.5 h-3.5 shrink-0 text-[#1A0F2E]/30" />}
        <div className="hidden sm:flex items-end gap-[2px] h-3.5 shrink-0" dir="ltr" aria-hidden>
          {F.map((f, i) => (
            <span key={i} className="w-[2.5px] rounded-full"
              style={{
                height: isPlaying ? Math.max(3, 3 + volume * 12 * f) : 3,
                background: isPlaying ? PURPLE : "rgba(26,15,46,0.18)",
                transition: "height 0.09s ease-out",
              }} />
          ))}
        </div>
        <Kicker
          ar={isRTL}
          className="text-[10.5px] whitespace-nowrap"
          style={{ color: isPlaying ? PURPLE : "rgba(26,15,46,0.55)" }}
        >
          {isPlaying ? (isRTL ? "بثّ مباشر" : "On air") : (isRTL ? "اسمع التقديم" : "Écouter l'intro")}
        </Kicker>
        <span
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
          style={{ background: PURPLE, color: "#fff" }}
        >
          {isPlaying
            ? <Pause className="w-3 h-3 fill-current" />
            : <Play className="w-3 h-3 fill-current translate-x-[1px]" />}
        </span>
      </button>
    </motion.div>
  );
};

type VoiceCard = {
  id: string; nameFr: string; nameAr: string; tagFr: string; tagAr: string;
  location: string; gender: "male" | "female";
  category: "commercial" | "narrative" | "social" | "formal";
  rating?: number; reviews?: number; color: string;
  sampleFr: string; sampleAr: string; audioUrl?: string;
};

const VOICES: VoiceCard[] = [
  {
    id: "amine", nameFr: "Amine", nameAr: "أمين", tagFr: "Voix commerciale", tagAr: "صوت تجاري",
    location: "Alger, DZ", gender: "male", category: "commercial", rating: 4.9, reviews: 234, color: "#6B2DBC",
    sampleFr: "Salam 3likoum khawti! M3a Sawtify, nassek yewli sawt tabi3i, wadeh, wahli l i3lanat.",
    sampleAr: "سلام عليكم خاوتي! مع صوتيفي، نصوصكم تولي صوت طبيعي، واضح، جاهز للإعلانات.",
    audioUrl: "https://res.cloudinary.com/gz65ybug/video/upload/v1789139928/AMINE.mp3",
  },
  {
    id: "yasmine", nameFr: "Yasmine", nameAr: "ياسمين", tagFr: "Voix publicitaire", tagAr: "صوت إعلاني",
    location: "Oran, DZ", gender: "female", category: "commercial", rating: 4.8, reviews: 189, color: "#C13B5E",
    sampleFr: "Marhba bikom kamlin! Tawsil 58 wilaya, payment 3and l istlam. Tleb dorka.",
    sampleAr: "مرحبا بيكم كاملين! التوصيل لـ 58 ولاية والدفع عند الاستلام. اطلب درك.",
    audioUrl: "https://res.cloudinary.com/gz65ybug/video/upload/v1789139890/YASMINE.mp3",
  },
  {
    id: "khalid", nameFr: "Khalid", nameAr: "خالد", tagFr: "Voix documentaire", tagAr: "صوت وثائقي",
    location: "Constantine, DZ", gender: "male", category: "formal", rating: 5.0, reviews: 312, color: "#2C5E9E",
    sampleFr: "Nqeddmlkom lyom notq mawzoun w dqi9, l watha2iqiyat w contenu rassmi.",
    sampleAr: "نقدّم ليكم اليوم نطق موزون ودقيق، للوثائقيات والمحتوى الرسمي.",
    audioUrl: "https://res.cloudinary.com/gz65ybug/video/upload/v1789139847/KHALED.wav",
  },
  {
    id: "layla", nameFr: "Layla", nameAr: "ليلى", tagFr: "Voix social media", tagAr: "صوت سوشيال",
    location: "Annaba, DZ", gender: "female", category: "social", rating: 4.9, reviews: 156, color: "#D97706",
    sampleFr: "Salut l'équipe ! Une voix vive, parfaite pour Reels, TikTok et stories.",
    sampleAr: "واش راكم ليكيب؟ صوت حيوي، هايل للريلز وتيك توك والستوريز.",
  },
  {
    id: "yacine", nameFr: "Yacine", nameAr: "ياسين", tagFr: "Voix éducative", tagAr: "صوت تعليمي",
    location: "Sétif, DZ", gender: "male", category: "narrative", rating: 4.7, reviews: 98, color: "#0F766E",
    sampleFr: "Dans cette leçon, on avance pas à pas. Une voix claire, pour e-learning et tutos.",
    sampleAr: "في هاد الدرس، نمشيو خطوة بخطوة. صوت واضح للشروحات والدروس.",
  },
  {
    id: "nadia", nameFr: "Nadia", nameAr: "نادية", tagFr: "Voix podcast", tagAr: "صوت بودكاست",
    location: "Tlemcen, DZ", gender: "female", category: "narrative", rating: 4.9, reviews: 267, color: "#6B7A34",
    sampleFr: "Bienvenue dans cet épisode. Une voix chaleureuse, pour podcasts et YouTube.",
    sampleAr: "مرحبا بيكم في هاد الحلقة. صوت دافئ للبودكاست ويوتيوب.",
  },
  {
    id: "maryam", nameFr: "Maryam", nameAr: "مريم", tagFr: "Narration & podcast", tagAr: "سرد وبودكاست",
    location: "Alger, DZ", gender: "female", category: "narrative", rating: 4.8, reviews: 201, color: "#A4123F",
    sampleFr: "Écoutez une diction fluide et élégante, pour vos récits et documentaires.",
    sampleAr: "استمعوا لنطق سلس وأنيق، للروايات والوثائقيات.",
  },
  {
    id: "rachid", nameFr: "Rachid", nameAr: "رشيد", tagFr: "Énergique & pub", tagAr: "حماسي وإشهاري",
    location: "Oran, DZ", gender: "male", category: "commercial", rating: 4.9, reviews: 176, color: "#E15A0B",
    sampleFr: "Une voix percutante, idéale pour vos spots et lancements produits.",
    sampleAr: "صوت قوي، هايل للسبوتات وإطلاق المنتجات.",
  },
  {
    id: "bilal", nameFr: "Bilal", nameAr: "بلال", tagFr: "Narration & récit", tagAr: "سردي وقصصي",
    location: "Constantine, DZ", gender: "male", category: "narrative", rating: 4.8, reviews: 142, color: "#44617E",
    sampleFr: "Le rendu est si naturel qu'on croirait un présentateur en studio.",
    sampleAr: "الصوت يخرج طبيعي كأنو متحدث حقيقي في الستوديو.",
  },
];

const LANDING_VOICE_IDS = ["amine", "yasmine", "khalid"] as const;
const LANDING_VOICES = VOICES.filter((v) => (LANDING_VOICE_IDS as readonly string[]).includes(v.id));
const HIDDEN_VOICES = VOICES.filter((v) => !(LANDING_VOICE_IDS as readonly string[]).includes(v.id));

const PROOF_POOL = [
  { ar: { n: "سفيان", c: "وهران", a: "سجّل توّا في صوتيفي" }, fr: { n: "Sofiane", c: "Oran", a: "vient de s'inscrire" } },
  { ar: { n: "أمينة", c: "الجزائر", a: "ولّدت صوتها درك" }, fr: { n: "Amina", c: "Alger", a: "vient de générer une voix" } },
  { ar: { n: "ياسين", c: "سطيف", a: "سجّل توّا في صوتيفي" }, fr: { n: "Yacine", c: "Sétif", a: "vient de s'inscrire" } },
  { ar: { n: "مريم", c: "قسنطينة", a: "ولّدت صوتها درك" }, fr: { n: "Meriem", c: "Constantine", a: "vient de générer une voix" } },
  { ar: { n: "بلال", c: "عنابة", a: "سجّل توّا في صوتيفي" }, fr: { n: "Bilal", c: "Annaba", a: "vient de s'inscrire" } },
  { ar: { n: "ليندة", c: "تلمسان", a: "ولّدت صوتها درك" }, fr: { n: "Lynda", c: "Tlemcen", a: "vient de générer une voix" } },
  { ar: { n: "رضا", c: "البليدة", a: "سجّل توّا في صوتيفي" }, fr: { n: "Reda", c: "Blida", a: "vient de s'inscrire" } },
  { ar: { n: "نور", c: "بجاية", a: "ولّدت صوتها درك" }, fr: { n: "Nour", c: "Béjaïa", a: "vient de générer une voix" } },
];

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
  const [exitOpen, setExitOpen] = useState(false);
  const [toastIdx, setToastIdx] = useState(0);
  const [toastVisible, setToastVisible] = useState(false);
  const countdown = useOfferCountdown();

  const { scrollYProgress } = useScroll();
  const scrolled = useScrolled();
  const {
    playingId, sampleProgress, sampleElapsed, sampleTotal, durations,
    playSample, stopSample, setSampleRate,
  } = useSampleAudio();
  const introAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const analyserDataRef = useRef<Uint8Array | null>(null);
  const useAnalyserRef = useRef<boolean>(true);
  const smoothRef = useRef<number>(0);
  const [isIntroPlaying, setIsIntroPlaying] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0);
  const animFrameRef = useRef<number | null>(null);
  const overlayOpen = menuOpen || !!listenVoice || !!legal || exitOpen;
  const overlayRef = useRef(false);
  overlayRef.current = overlayOpen;

  /* ✅ DÉFAUT ARABE — sauvegardé, sinon arabe */
  const bootRef = useRef(false);
  useLayoutEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;
    let saved: string | null = null;
    try { saved = window.localStorage.getItem("sawtify_lang"); } catch {}
    const target = saved === "fr" || saved === "ar" ? saved : "ar"; // ✅ ARABE par défaut
    if (target !== language) setLanguage(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchLang = useCallback(() => {
    const next = language === "fr" ? "ar" : "fr";
    try { window.localStorage.setItem("sawtify_lang", next); } catch {}
    setLanguage(next);
  }, [language, setLanguage]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    document.body.style.background = PAPER;
  }, [language, isRTL]);

  useEffect(() => {
    document.body.style.overflow = overlayOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [overlayOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMenuOpen(false); setListenVoice(null); setLegal(null); setExitOpen(false);
      stopSample();
      if (introAudioRef.current) { introAudioRef.current.pause(); setIsIntroPlaying(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stopSample]);

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
      let sum = 0;
      const n = 30;
      for (let i = 2; i < n; i++) sum += analyserDataRef.current[i];
      return Math.min(1, (sum / (n - 2) / 255) * 2.2);
    }
    const t = performance.now() * 0.011;
    return Math.min(1, Math.abs(Math.sin(t) * Math.cos(t * 0.7)) * 0.8 + Math.random() * 0.2);
  }, []);

  useEffect(() => {
    const audio = new Audio(INTRO_AUDIO_URL);
    audio.crossOrigin = "anonymous";
    audio.preload = "metadata";
    introAudioRef.current = audio;
    audio.onended = () => { setIsIntroPlaying(false); setAudioVolume(0); };
    const tick = () => {
      if (introAudioRef.current && !introAudioRef.current.paused) {
        const raw = readLevel();
        smoothRef.current = smoothRef.current * 0.5 + raw * 0.5;
        const next = smoothRef.current;
        setAudioVolume((prev) => (Math.abs(next - prev) > 0.045 ? next : prev));
        animFrameRef.current = requestAnimationFrame(tick);
      } else setAudioVolume(0);
    };
    audio.onplay = () => {
      initAnalyser();
      if (audioCtxRef.current && audioCtxRef.current.state === "suspended")
        audioCtxRef.current.resume().catch(() => {});
      setIsIntroPlaying(true);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(tick);
    };
    audio.onpause = () => {
      setIsIntroPlaying(false);
      setAudioVolume(0);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
    audio.onerror = () => {
      if (!useAnalyserRef.current) return;
      useAnalyserRef.current = false;
      audioCtxRef.current = null;
      analyserRef.current = null;
      audio.removeAttribute("crossorigin");
      audio.src = INTRO_AUDIO_URL;
      audio.load();
    };
    const prime = () => {
      const a = introAudioRef.current;
      if (!a || !a.paused) return;
      a.preload = "auto";
      a.load();
    };
    const primeT = window.setTimeout(prime, 3000);
    const onFirstInteract = () => { prime(); };
    window.addEventListener("pointerdown", onFirstInteract, { once: true, capture: true });
    return () => {
      window.clearTimeout(primeT);
      window.removeEventListener("pointerdown", onFirstInteract, { capture: true } as EventListenerOptions);
      audio.pause();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
      analyserRef.current = null;
    };
  }, [initAnalyser, readLevel]);

  const stopIntroAudio = useCallback(() => {
    if (introAudioRef.current && !introAudioRef.current.paused) {
      introAudioRef.current.pause();
      setIsIntroPlaying(false);
      setAudioVolume(0);
    }
  }, []);
  const stopAllAudio = useCallback(() => { stopIntroAudio(); stopSample(); }, [stopIntroAudio, stopSample]);
  const goSignup = useCallback(() => { stopAllAudio(); onSigninClick(); }, [stopAllAudio, onSigninClick]);

  useExitIntent(useCallback(() => { if (!overlayRef.current) setExitOpen(true); }, []));

  useEffect(() => {
    if (overlayOpen || isIntroPlaying) { setToastVisible(false); return; }
    let i = 0;
    const cycle = () => {
      setToastIdx(i);
      setToastVisible(true);
      window.setTimeout(() => setToastVisible(false), 5000);
      i += 1;
    };
    const startT = window.setTimeout(cycle, 9000);
    const iv = window.setInterval(cycle, 17000);
    return () => { window.clearTimeout(startT); window.clearInterval(iv); };
  }, [overlayOpen, isIntroPlaying]);

  const t = useMemo(() => ({
    skip: isRTL ? "تخطَّ إلى المحتوى" : "Aller au contenu",
    navVoices: isRTL ? "الأصوات" : "Voix",
    navHow: isRTL ? "كيفاش يخدم" : "Comment ça marche",
    navPricing: isRTL ? "الأسعار" : "Tarifs",
    navFaq: isRTL ? "أسئلة" : "FAQ",
    navContact: isRTL ? "تواصل" : "Contact",
    signin: isRTL ? "دخول" : "Connexion",
    start: isRTL ? "ابدأ درك" : "Commencer",
    tryFree: isRTL ? "جرّب درك — بالمجان" : "Essayer gratuitement",
    pause: isRTL ? "إيقاف" : "Pause",
    audioPreview: isRTL ? "معاينة صوتية" : "Aperçu audio",
    heroKicker: isRTL ? "استوديو الدارجة الجزائرية" : "Studio darija algérienne",
    heroTitle1: isRTL ? "صوتْ" : "Une voix",
    heroTitle2: isRTL ? "كي بنادم." : "presque humaine.",
    heroSub: isRTL
      ? "نصّك بالدارجة يولي صوت طبيعي في 30 ثانية — بلا ستوديو، بلا ميكرو، بلا انتظار. 50 نقطة هدية وقت التسجيل، بلا بطاقة وبلا التزام."
      : "Votre texte en darija devient une voix naturelle en 30 secondes — sans studio, sans micro, sans attente. 50 points offerts à l'inscription, sans carte, sans engagement.",
    welcomeChip: isRTL ? "50 نقطة هدية — بلا بطاقة، بلا التزام" : "50 points offerts — sans carte, sans engagement",
    creators: isRTL ? "مستخدم" : "créateurs",
    check1: isRTL ? "الدفع بالذهبية أو CIB" : "Paiement Edahabia / CIB",
    check2: isRTL ? "بلا علامة مائية" : "Sans filigrane",
    check3: isRTL ? "النقاط ما تنتهيش" : "Points à vie",
    urgency: isRTL ? "عرض التدشين — 50 نقطة هدية لكل حساب جديد" : "Offre de lancement — 50 points offerts à l'inscription",
    urgencyCta: isRTL ? "استافد درك" : "En profiter",
    expiresIn: isRTL ? "ينتهي بعد" : "Expire dans",
    compareTitle: isRTL ? "الستوديو ضد صوتيفي. شوف الفرق بعينيك." : "Studio classique vs Sawtify. Le match.",
    compareSub: isRTL
      ? "علاش تدفع 20 000 دج وتسنّى أسبوع، والصوت يخرجلك درك بـ 500 دج؟"
      : "Pourquoi payer 20 000 DZD et attendre une semaine, quand la voix sort maintenant pour 500 DZD ?",
    compareOld: isRTL ? "الطريقة القديمة" : "Ancienne méthode",
    compareNew: "Sawtify",
    saveUp: isRTL ? "توفّر حتى" : "Économisez jusqu'à",
    savedUnit: isRTL ? "دج" : "DZD",
    guaranteeTitle: isRTL ? "ضمان صوتيفي: ماكش تخسر والو." : "Garantie Sawtify : zéro risque.",
    guaranteeBody: isRTL
      ? "ما عجبكش الصوت؟ نرجعو لك نقاطك — بلا أسئلة وبلا تعقيد. جرّب، اسمع، وقرّر براحتك."
      : "La voix ne vous plaît pas ? Vos points sont recrédités — sans question, sans complication. Essayez, écoutez, décidez sereinement.",
    exitTitle: isRTL ? "وقف شويّة! قبل ما تمشي…" : "Attendez ! Avant de partir…",
    exitBody: isRTL
      ? "50 نقطة هدية في انتظارك — بلا بطاقة، بلا التزام. نصّك يولي صوت في 30 ثانية."
      : "50 points offerts vous attendent — sans carte, sans engagement. Votre texte devient une voix en 30 secondes.",
    exitCta: isRTL ? "ياي، نستافد من الهدية" : "OK, je prends les 50 points",
    exitNo: isRTL ? "لا شكراً" : "Non merci",
    popularTitle: isRTL ? "9 أصوات. هنا غي 3." : "9 voix. Ici, seulement 3.",
    popularSub: isRTL
      ? "أمين، ياسمين، خالد. الباقي تسمعو في الاستوديو."
      : "Amine, Yasmine, Khalid. Les autres s'écoutent dans le studio.",
    listenInStudio: isRTL ? "اسمع البداية" : "Écouter le début",
    listenBody: isRTL
      ? "هذي غير أول جملة. الصوت الكامل في الاستوديو. 50 نقطة هدية، بلا بطاقة."
      : "Ce n'est que la première phrase. La voix entière est dans le studio. 50 points offerts, sans carte.",
    studioNote: isRTL
      ? "عيّنة حقيقية من الاستوديو · 24 kHz — نفس الجودة داخل التطبيق."
      : "Vrai échantillon studio · 24 kHz — même rendu dans l'app.",
    journeyTitle: isRTL ? "أربع خطوات. والصوت يخرج." : "Quatre gestes. La voix sort.",
    journeySub: isRTL ? "بلا كابينة. بلا ميكرو. بلا انتظار." : "Pas de cabine. Pas de micro. Pas d'attente.",
    useTitle: isRTL ? "ملي يتكلّم، ما يعودش نص." : "Quand ça parle, ce n'est plus du texte.",
    costTitle: isRTL ? "أرخص مما تتخيّل." : "Moins que vous ne croyez.",
    costSub: isRTL
      ? "20 نقطة لأول 60 ثانية، وزيد 10 لكل دقيقة. النقاط ما تنتهيش."
      : "20 points pour les 60 premières secondes, puis +10 par minute. Les points n'expirent pas.",
    metricsTitle: isRTL ? "الأرقام ما تكذبش." : "Les chiffres ne mentent pas.",
    testTitle: isRTL ? "اللي يسمعو يظنّو بنادم." : "Qui écoute croit entendre quelqu'un.",
    pricingTitle: isRTL ? "نقاط. بلا اشتراك." : "Des points. Sans abonnement.",
    pricingSub: isRTL ? "بالدينار. بلا تاريخ انتهاء." : "En dinars. Sans date d'expiration.",
    welcomeBanner: isRTL ? "هدية التسجيل: 50 نقطة بالمجان." : "Cadeau d'inscription : 50 points offerts.",
    bannerSub: isRTL ? "بلا بطاقة · النقاط ما تنتهيش أبداً" : "Sans carte · les points n'expirent jamais",
    choose: isRTL ? "اختيار" : "Choisir",
    popular: isRTL ? "الأكثر طلباً" : "Le plus demandé",
    faqTitle: isRTL ? "أسئلة شائعة" : "Questions fréquentes",
    ctaTitle: isRTL ? "واش راك تنتضر؟" : "Alors, on commence ?",
    ctaSub: isRTL
      ? "50 نقطة بالمجان. 9 أصوات. غي 3 هنا. بلا بطاقة — والصوت يخرجلك درك."
      : "50 points offerts. 9 voix. 3 seulement ici. Sans carte — la voix sort maintenant.",
    footTag: isRTL ? "صُنع في الجزائر" : "Fait en Algérie",
    switchLang: isRTL ? "FR" : "ع",
    close: isRTL ? "إغلاق" : "Fermer",
    open: isRTL ? "القائمة" : "Menu",
    cgu: isRTL ? "شروط الاستخدام" : "CGU",
    privacy: isRTL ? "الخصوصية" : "Confidentialité",
    contact: isRTL ? "تواصل" : "Contact",
    pts: isRTL ? "نقطة" : "pts",
    moreVoices: isRTL ? "دخول للاستوديو" : "Accéder au studio",
  }), [isRTL]);

  const nav = useMemo(() => [
    { href: "/services", target: "#voices", label: t.navVoices },
    { href: "/services", target: "#process", label: t.navHow },
    { href: "/pricing", target: "#pricing", label: t.navPricing },
    { href: "/faq", target: "#faq", label: t.navFaq },
    { href: "/contact", target: "#contact", label: t.navContact },
  ], [t]);

  const marqueeItems = useMemo(() => isRTL
    ? ["إعلانات تجارية", "ريلز وتيك توك", "بودكاست", "تعليم أونلاين", "موزّع هاتفي", "يوتيوب", "كتب صوتية", "ألعاب فيديو"]
    : ["Spots pub", "Reels & TikTok", "Podcasts", "E-learning", "Standards téléphoniques", "YouTube", "Livres audio", "Jeux vidéo"], [isRTL]);

  const featured = VOICES.find((v) => v.id === featuredId) || VOICES[0];
  const heroSamplePlaying = playingId === featured.id;
  const heroPlaying = isIntroPlaying || heroSamplePlaying;
  const dispElapsed = isIntroPlaying ? playElapsed : heroSamplePlaying ? sampleElapsed : 0;
  const dispTotal = isIntroPlaying ? playTotal : heroSamplePlaying ? sampleTotal : durations[featured.id] || 0;
  const dispProgress = isIntroPlaying ? playProgress : heroSamplePlaying ? sampleProgress : 0;

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

  useEffect(() => {
    if (!isIntroPlaying) { setPlayProgress(0); setPlayElapsed(0); setPlayTotal(0); return; }
    const id = window.setInterval(() => {
      const a = introAudioRef.current;
      if (a && a.duration > 0) {
        setPlayProgress(Math.min(1, a.currentTime / a.duration));
        setPlayElapsed(a.currentTime);
        setPlayTotal(a.duration);
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [isIntroPlaying]);

  const stepVoice = (dir: 1 | -1) => {
    stopAllAudio();
    const i = LANDING_VOICES.findIndex((v) => v.id === featuredId);
    setFeaturedId(LANDING_VOICES[(i + dir + LANDING_VOICES.length) % LANDING_VOICES.length].id);
  };
  const applySpeed = (s: number) => {
    setSpeed(s);
    if (isIntroPlaying && introAudioRef.current) introAudioRef.current.playbackRate = s;
    else setSampleRate(s);
  };

  const journeySteps = useMemo(() => [
    { n: "1", t: isRTL ? "اكتب" : "Écrire", d: isRTL ? "ألصق نصّك بالدارجة، بالعربية أو بالحروف اللاتينية." : "Collez votre texte en darija, en arabe ou en alphabet latin." },
    { n: "2", t: isRTL ? "اختر" : "Choisir", d: isRTL ? "9 أصوات. هنا نعرضو غي 3." : "9 voix. Ici, on n'en montre que 3." },
    { n: "3", t: isRTL ? "اضبط" : "Régler", d: isRTL ? "السرعة، النبرة، التأثيرات… الباقي في الاستوديو." : "Vitesse, timbre, effets… le reste est dans le studio." },
    { n: "4", t: isRTL ? "حمّل" : "Télécharger", d: isRTL ? "MP3 أو WAV. بلا علامة مائية. استعمال تجاري." : "MP3 ou WAV. Sans filigrane. Usage commercial." },
  ], [isRTL]);

  const uses = useMemo(() => [
    { icon: ShoppingBag, t: isRTL ? "تجارة إلكترونية" : "E-commerce", d: isRTL ? "سبوت، عرض، توصيل 58 ولاية." : "Spots, promos, livraison 58 wilayas." },
    { icon: Clapperboard, t: isRTL ? "ريلز وتيك توك" : "Reels & TikTok", d: isRTL ? "صوت قصير وحيوي، جاهز للقصص." : "Voix courte, vive, prête pour les stories." },
    { icon: Mic2, t: isRTL ? "بودكاست ويوتيوب" : "Podcast & YouTube", d: isRTL ? "سرد طويل، نبرة ثابتة." : "Narration longue, timbre stable." },
    { icon: Phone, t: isRTL ? "موزّع هاتفي" : "Standard", d: isRTL ? "مرحباً، اضغط 1، خدمة الزبائن." : "Bienvenue, tapez 1, service client." },
  ], [isRTL]);

  const metrics = useMemo(() => [
    { n: 9, s: "", l: isRTL ? "صوت" : "voix" },
    { n: 1200, s: "+", l: isRTL ? "مستخدم" : "créateurs" },
    { n: 50, s: "K+", l: isRTL ? "صوت مُولَّد" : "voix générées" },
    { n: 99, s: "%", l: isRTL ? "ما يفرّقوش" : "indiscernable" },
  ], [isRTL]);

  const testimonials = useMemo(() => isRTL ? [
    { q: "جرّبت 5 منصات قبل صوتيفي. هنا الصوت يبان راها بنادم بصح. الزبائن ما يلاحظوش الفرق.", n: "أمين ب.", r: "صانع محتوى، الجزائر", img: "AB" },
    { q: "خدمت بيه للإعلانات التجارية. نتيجة احترافية بلا ما نحتاج ستوديو.", n: "ياسمين ق.", r: "وكالة إشهار، وهران", img: "YK" },
    { q: "أحسن صوت جزائري سمعتو. طبيعي 100٪ والدفع بالذهبية ساهل.", n: "خالد م.", r: "تاجر إلكتروني، قسنطينة", img: "KM" },
  ] : [
    { q: "J'ai testé 5 plateformes avant Sawtify. Ici, la voix sonne vraiment humaine. Mes clients ne font pas la différence.", n: "Amine B.", r: "Créateur, Alger", img: "AB" },
    { q: "Utilisé pour mes pubs. Un rendu pro, sans studio.", n: "Yasmine K.", r: "Agence pub, Oran", img: "YK" },
    { q: "La meilleure voix algérienne que j'ai entendue. Naturelle à 100 %, et le paiement Edahabia est simple.", n: "Khaled M.", r: "E-commerçant, Constantine", img: "KM" },
  ], [isRTL]);

  useEffect(() => {
    const id = setInterval(() => setActiveTesti((p) => (p + 1) % testimonials.length), 6500);
    return () => clearInterval(id);
  }, [testimonials.length]);

  const compareRows = useMemo(() => isRTL ? [
    { label: "الوقت", old: "من 3 إلى 7 أيام", now: "30 ثانية" },
    { label: "التكلفة", old: "من 8 000 إلى 20 000 دج", now: "تبدأ من 500 دج" },
    { label: "التعديلات", old: "ترجع للستوديو وتدفع من جديد", now: "تعاود براحتك" },
    { label: "الميكرو والستوديو", old: "لازم", now: "غير متصفّحك" },
    { label: "الاستعمال التجاري", old: "مفاوضات وأوراق", now: "مسموح 100%" },
    { label: "اللغة", old: "فرنسية أو فصحى", now: "الدارجة الجزائرية" },
  ] : [
    { label: "Délai", old: "3 à 7 jours", now: "30 secondes" },
    { label: "Coût", old: "8 000 à 20 000 DZD", now: "dès 500 DZD" },
    { label: "Modifications", old: "Retour studio, refacturé", now: "À volonté" },
    { label: "Micro & studio", old: "Obligatoires", now: "Juste un navigateur" },
    { label: "Usage commercial", old: "Droits à négocier", now: "Inclus, 100 %" },
    { label: "Langue", old: "Français / littéraire", now: "Darija algérienne" },
  ], [isRTL]);

  const pricing = useMemo(() => [
    { pts: 100, ptsLabel: "100", price: "500", desc: isRTL ? "للتجربة الحرة." : "Pour découvrir la plateforme." },
    { pts: 220, ptsLabel: "220", price: "1 000", featured: true, desc: isRTL ? "الأكثر طلباً — الباقة المثالية." : "Le choix le plus populaire." },
    { pts: 600, ptsLabel: "600", price: "2 500", desc: isRTL ? "لمن يخدم يومياً — وكالات وصنّاع محتوى." : "Pour un usage régulier — agences et créateurs." },
    { pts: 1350, ptsLabel: "1 350", price: "5 000", desc: isRTL ? "للمحترفين — حجم كبير." : "Pour les professionnels — grands volumes." },
  ], [isRTL]);

  const faqs = useMemo(() => isRTL ? [
    { q: "واش إذا ما عجبنيش الصوت؟", a: "ماكش تخسر والو. إذا ما عجبكش النتيجة، النقاط ترجع لبالاك — تجرّب، تسمع، وتقرّر براحتك." },
    { q: "هل الصوت يبان كي بنادم؟", a: "نعم. دارجة حيّة، 24 kHz. 99٪ من اللي يسمعو ما يفرّقوش." },
    { q: "نقدر نستعملو في الإعلان؟", a: "نعم. إعلان، يوتيوب، تيك توك، موزّع — استعمال تجاري كامل، بلا علامة مائية." },
    { q: "كيفاش تخدم النقاط؟", a: "20 نقطة لـ 0–60 ثانية، وزيد 10 لكل دقيقة. ما تنتهيش. و50 نقطة هدية وقت التسجيل." },
    { q: "الذهبية و CIB؟", a: "نعم، SATIM، بالدينار. ما تحتاجش بطاقة أجنبية." },
    { q: "نجرّب بلا ما نخلص؟", a: "نعم. 50 نقطة بالمجان، بلا بطاقة. وهنا غي 3 أصوات — الباقي في الاستوديو." },
  ] : [
    { q: "Et si la voix ne me plaît pas ?", a: "Zéro risque : si le rendu ne vous plaît pas, vos points sont recrédités. Essayez, écoutez, décidez sereinement." },
    { q: "La voix parle comme quelqu'un ?", a: "Oui. Darija vivante, 24 kHz. 99 % de ceux qui écoutent ne font pas la différence." },
    { q: "Puis-je l'utiliser en pub ?", a: "Oui. Pub, YouTube, TikTok, standard — usage commercial, sans filigrane." },
    { q: "Comment marchent les points ?", a: "20 points pour 0–60 s, puis +10 par minute. Ils n'expirent pas. 50 points offerts à l'inscription." },
    { q: "Edahabia et CIB ?", a: "Oui, SATIM, en dinars. Pas besoin de carte étrangère." },
    { q: "Je peux essayer sans payer ?", a: "Oui. 50 points offerts, sans carte. Ici seulement 3 voix — les autres sont dans le studio." },
  ], [isRTL]);

  const trust = useMemo(() => [
    { k: "Edahabia", v: isRTL ? "بريد الجزائر" : "La Poste" },
    { k: "CIB", v: isRTL ? "البنوك" : "Banques" },
    { k: "SATIM", v: isRTL ? "دفع آمن" : "Paiement sécurisé" },
    { k: "24 kHz", v: isRTL ? "جودة استوديو" : " Qualité studio" },
    { k: "MP3 · WAV", v: isRTL ? "بلا علامة مائية" : "Sans filigrane" },
  ], [isRTL]);

  const heroChecks = useMemo(() => [t.check1, t.check2, t.check3], [t]);

  const smoothTo = useCallback((href: string) => {
    setMenuOpen(false);
    const el = document.querySelector(href);
    if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 120, behavior: "smooth" });
  }, []);
  const navigatePublicSection = useCallback((path: string, target: string) => {
    window.history.pushState({}, "", path);
    smoothTo(target);
  }, [smoothTo]);

  useEffect(() => {
    const initialTarget: Record<string, string> = {
      "/home": "#home", "/pricing": "#pricing", "/services": "#voices",
      "/faq": "#faq", "/contact": "#contact",
    };
    const target = initialTarget[window.location.pathname];
    if (!target) return;
    const timer = window.setTimeout(() => smoothTo(target), 0);
    return () => window.clearTimeout(timer);
  }, [smoothTo]);

  const openListen = (voice: VoiceCard) => {
    stopIntroAudio();
    setFeaturedId(voice.id);
    setListenVoice(voice);
    playSample(voice.id, voice.audioUrl);
  };
  const handleToggleIntroAudio = () => {
    if (!introAudioRef.current) return;
    if (isIntroPlaying) introAudioRef.current.pause();
    else {
      stopSample();
      introAudioRef.current.play().catch((err) => console.warn("Lecture impossible :", err));
    }
  };

  const display = isRTL ? "'Cairo', sans-serif" : "'Space Grotesk', 'Inter', sans-serif";
  const sans = isRTL ? "'Cairo', sans-serif" : "'Inter', sans-serif";
  const ArrowIcon = ({ className = "w-4 h-4" }: { className?: string }) =>
    isRTL ? <ArrowLeft className={className} /> : <ArrowRight className={className} />;
  const legalCopy = {
    cgu: isRTL
      ? "شروط الاستخدام: صوتيفي منصة جزائرية لتحويل النص إلى صوت بالدارجة. الحساب شخصي. النقاط غير قابلة للتحويل نقداً ولا تنتهي صلاحيتها. الاستعمال التجاري مسموح في حدود القانون الجزائري. يُمنع توليد محتوى غير قانوني أو مسيء. الدفع عبر SATIM (الذهبية / CIB). في حال فشل التوليد، تُعاد النقاط إلى رصيدك."
      : "Conditions d'utilisation : Sawtify est une plateforme algérienne de conversion texte → voix en darija. Le compte est personnel. Les points ne sont pas remboursables en dinars et n'expirent pas. L'usage commercial est autorisé dans le cadre de la loi algérienne. Tout contenu illicite ou injurieux est interdit. Le paiement passe par SATIM (Edahabia / CIB). En cas d'échec de génération, les points sont recrédités.",
    privacy: isRTL
      ? "الخصوصية: نحتفظ بالحد الأدنى من البيانات (البريد، الرصيد، النصوص المولَّدة) لتشغيل الحساب. لا نبيع بياناتك. يمكنك طلب حذف حسابك عبر صفحة التواصل. المدفوعات تُعالَج من طرف SATIM — صوتيفي لا يخزّن أرقام البطاقات."
      : "Confidentialité : nous conservons le minimum (e-mail, solde, textes générés) pour faire fonctionner le compte. Nous ne vendons pas vos données. Vous pouvez demander la suppression du compte via Contact. Les paiements sont traités par SATIM — Sawtify ne stocke aucun numéro de carte.",
  };

  const toast = toastVisible
    ? (isRTL ? PROOF_POOL[toastIdx % PROOF_POOL.length].ar : PROOF_POOL[toastIdx % PROOF_POOL.length].fr)
    : null;

  return (
    <div id="sawtify-landing" dir={isRTL ? "rtl" : "ltr"} className="min-h-screen relative" style={{ fontFamily: sans, color: INK }}>
      <GlobalStyles />
      <div className="grain" aria-hidden />

      <Helmet>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONTS_URL} />
        {isRTL ? (
          <>
            <title>صوتيفي — أول مولّد أصوات بالذكاء الاصطناعي للدارجة الجزائرية</title>
            <meta name="description" content="صوتيفي: أول منصة تحويل النص إلى صوت متخصصة في الدارجة الجزائرية. دفع محلي CIB و Edahabia. 9 أصوات." />
            <html lang="ar" dir="rtl" />
            <meta property="og:title" content="صوتيفي — صوت بالدارجة الجزائرية" />
            <meta property="og:description" content="حوّل نصّك بالدارجة إلى صوت طبيعي في 30 ثانية. دفع محلي CIB و Edahabia." />
            <meta property="og:locale" content="ar_DZ" />
          </>
        ) : (
          <>
            <title>Sawtify — Voix IA Darija Algérienne | Text-to-Speech</title>
            <meta name="description" content="Premier générateur de voix IA en darija algérienne. Convertissez texte en voix naturelle, paiement CIB & Edahabia. 9 voix." />
            <html lang="fr" dir="ltr" />
            <meta property="og:title" content="Sawtify — Voix Off Darija Algérienne" />
            <meta property="og:description" content="Premier générateur de voix IA en darija algérienne. Texte en voix naturelle, paiement CIB & Edahabia." />
            <meta property="og:locale" content="fr_FR" />
          </>
        )}
        <link rel="canonical" href="https://sawtify.space/" />
        <link rel="alternate" hreflang="fr" href="https://sawtify.space/" />
        <link rel="alternate" hreflang="ar" href="https://sawtify.space/?lang=ar" />
        <link rel="alternate" hreflang="x-default" href="https://sawtify.space/" />
      </Helmet>

      <a href="#home"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-[90] focus:px-4 focus:py-2 focus:rounded-full focus:font-bold focus:text-sm text-white"
        style={{ background: PURPLE }}>{t.skip}</a>

      {/* ═══════════ 📌 BARRE D'URGENCE — alignée à DROITE (corrigé) ═══════════ */}
      <div className="fixed top-0 inset-x-0 z-[70] h-11 flex items-center justify-end gap-2.5 px-4 sm:px-6"
        style={{ background: INK, color: PAPER }}>
        <span className="hidden md:inline text-[11.5px] sm:text-[12.5px] font-bold truncate ms-auto">
          {t.urgency}
        </span>
        <span className="md:hidden text-[11.5px] font-bold truncate ms-auto">
          {isRTL ? "50 نقطة هدية" : "50 pts"}
        </span>
        {countdown && (
          <Mono dir="ltr" className="shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-md tabular-nums"
            style={{ background: "rgba(255,255,255,0.12)", color: AMBER }}>
            {countdown.h}:{countdown.m}:{countdown.s}
          </Mono>
        )}
        <button type="button" onClick={goSignup}
          className="shrink-0 text-[11.5px] font-bold underline underline-offset-4 hover:opacity-80 transition focus-ring whitespace-nowrap"
          style={{ textDecorationColor: AMBER }}>
          {t.urgencyCta} ↖
        </button>
      </div>

      {/* ═══════════ HEADER — fond VIOLET + texte BLANC quand scrollé (corrigé) ═══════════ */}
      <header className={`fixed top-11 inset-x-0 z-[60] transition-all duration-300 ${scrolled ? "shadow-lg" : ""}`}
        style={{
          background: scrolled ? PURPLE : "transparent",
          borderBottom: scrolled ? `1px solid rgba(255,255,255,0.12)` : "1px solid transparent",
          color: scrolled ? "#fff" : INK,
        }}>
        <div className={`mx-auto max-w-[1280px] px-5 sm:px-6 h-16 flex items-center justify-between`}>
          <a href="#home" onClick={(e) => { e.preventDefault(); smoothTo("#home"); }}
            className="focus-ring flex items-center gap-2.5" aria-label="Sawtify">
            <Logo size={38} dark={scrolled} />
          </a>
          <nav className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-7 text-[13px] font-semibold"
            style={{ color: scrolled ? "rgba(255,255,255,0.85)" : "rgba(26,15,46,0.6)" }}>
            {nav.map((l) => (
              <a key={`${l.href}-${l.target}`} href={l.href}
                onClick={(e) => { e.preventDefault(); navigatePublicSection(l.href, l.target); }}
                className="hover:opacity-100 transition-colors focus-ring"
                style={scrolled ? { color: "#fff" } : undefined}
                onMouseEnter={(e) => { if (scrolled) e.currentTarget.style.color = AMBER; }}
                onMouseLeave={(e) => { if (scrolled) e.currentTarget.style.color = "#fff"; }}>
                {l.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button type="button" onClick={switchLang}
              className="w-10 h-10 rounded-full text-[12px] font-bold transition focus-ring"
              style={{
                color: scrolled ? "rgba(255,255,255,0.9)" : "rgba(26,15,46,0.6)",
                background: scrolled ? "rgba(255,255,255,0.1)" : "transparent",
              }}
              aria-label={isRTL ? "التبديل إلى الفرنسية" : "Switch to Arabic"}>
              {t.switchLang}
            </button>
            <button type="button" onClick={onLoginClick}
              className="hidden md:block text-[13px] font-semibold px-3 focus-ring transition-colors"
              style={{ color: scrolled ? "rgba(255,255,255,0.85)" : "rgba(26,15,46,0.6)" }}>
              {t.signin}
            </button>
            <button type="button" onClick={goSignup}
              className="h-10 px-4 sm:px-5 rounded-full text-[13px] sm:text-[14px] font-bold text-white focus-ring transition hover:brightness-110"
              style={{ background: scrolled ? AMBER : PURPLE, color: scrolled ? INK : "#fff" }}>
              {t.start}
            </button>
            <button type="button" onClick={() => setMenuOpen(true)} aria-label={t.open}
              className="lg:hidden w-10 h-10 rounded-full flex items-center justify-center focus-ring transition-colors"
              style={{
                color: scrolled ? "#fff" : INK,
                background: scrolled ? "rgba(255,255,255,0.1)" : "transparent",
              }}>
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
        <motion.div aria-hidden className="absolute bottom-0 inset-x-0 h-[2.5px]"
          style={{ scaleX: scrollYProgress, background: AMBER, transformOrigin: isRTL ? "100% 50%" : "0% 50%" }} />
      </header>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-[55] bg-[#1A0F2E]/40 lg:hidden" />
            <motion.div
              initial={{ x: isRTL ? "-100%" : "100%" }} animate={{ x: 0 }} exit={{ x: isRTL ? "-100%" : "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 280 }}
              className="fixed top-11 bottom-0 end-0 z-[60] w-[85%] max-w-sm bg-white lg:hidden flex flex-col shadow-2xl"
              style={{ borderInlineStart: `1px solid ${BORDER}` }}>
              <div className="flex items-center justify-between px-5 h-16" style={{ borderBottom: `1px solid ${BORDER}` }}>
                <Logo size={34} />
                <button type="button" onClick={() => setMenuOpen(false)}
                  className="w-10 h-10 rounded-full hover:bg-[#1A0F2E]/5 flex items-center justify-center focus-ring" aria-label={t.close}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex-1 px-5 py-6 flex flex-col">
                {nav.map((l) => (
                  <a key={`${l.href}-${l.target}`} href={l.href}
                    onClick={(e) => { e.preventDefault(); navigatePublicSection(l.href, l.target); }}
                    className="py-4 text-[18px] font-bold focus-ring" style={{ borderBottom: `1px solid ${BORDER}`, color: INK }}>
                    {l.label}
                  </a>
                ))}
                <button type="button" onClick={() => { setMenuOpen(false); onLoginClick(); }}
                  className="mt-4 py-3 text-start text-[16px] font-semibold text-[#1A0F2E]/60">{t.signin}</button>
              </nav>
              <div className="p-5">
                <button type="button" onClick={() => { setMenuOpen(false); goSignup(); }}
                  className="w-full h-12 rounded-full font-bold text-white" style={{ background: PURPLE }}>
                  {t.start}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="relative z-[1]">
        {/* ═══════════ HERO avec VIDÉO D'ARRIÈRE-PLAN ═══════════ */}
        <section id="home" className="relative pt-[172px] pb-14 sm:pb-20 isolate overflow-hidden"
          style={{ color: PAPER }}>
          <BackgroundVideo />

          <div className="relative z-[1] mx-auto max-w-[1280px] px-5 sm:px-6">
            <div className="max-w-3xl mx-auto text-center">
              <SlideUp>
                <Kicker ar={isRTL} className="inline-flex items-center gap-1.5 text-[12px] mb-4 px-3 py-1 rounded-full"
                  style={{ color: "#fff", background: "rgba(107,45,188,0.65)", backdropFilter: "blur(6px)" }}>
                  <Sparkles className="w-3.5 h-3.5" /> {t.heroKicker}
                </Kicker>
              </SlideUp>
              <SlideUp delay={0.06}>
                <h1
                  className="text-[clamp(2.5rem,7vw,5rem)] leading-[1.02] tracking-[-0.02em] font-extrabold"
                  style={{ color: "#fff", fontFamily: display, textShadow: "0 2px 30px rgba(0,0,0,0.5)" }}
                >
                  {t.heroTitle1}{" "}
                  <span className="relative inline-block whitespace-nowrap">
                    {t.heroTitle2}
                    <svg
                      className="absolute -bottom-2 start-0 end-0 w-full h-3 pointer-events-none"
                      viewBox="0 0 200 12"
                      preserveAspectRatio="none"
                      aria-hidden
                    >
                      <path d="M2 8 C 40 2, 80 11, 120 6 S 180 3, 198 7" fill="none" stroke={AMBER} strokeWidth="4.5" strokeLinecap="round" />
                    </svg>
                  </span>
                </h1>
              </SlideUp>
              <SlideUp delay={0.14}>
                <p className="mt-7 text-[15px] sm:text-[16px] text-white/90 max-w-xl mx-auto leading-relaxed"
                  style={{ textShadow: "0 1px 12px rgba(0,0,0,0.4)" }}>
                  {t.heroSub}
                </p>
              </SlideUp>
              <SlideUp delay={0.22}>
                <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
                  <button type="button" onClick={goSignup}
                    className="h-12 px-7 rounded-full text-[14px] font-bold text-white focus-ring transition hover:brightness-110 shine"
                    style={{ background: AMBER, color: INK, boxShadow: "0 10px 26px -10px rgba(233,161,59,0.7)" }}>
                    {t.tryFree}
                  </button>
                  <button type="button" onClick={handleToggleIntroAudio}
                    className="h-12 px-5 rounded-full border-2 bg-white/10 backdrop-blur-md hover:bg-white/20 text-[14px] font-semibold transition focus-ring flex items-center gap-2.5"
                    style={{ borderColor: "rgba(255,255,255,0.4)", color: "#fff" }}>
                    <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: PAPER, color: PURPLE }}>
                      {isIntroPlaying
                        ? <Pause className="w-3 h-3 fill-current" />
                        : <Play className="w-3 h-3 fill-current translate-x-[1px]" />}
                    </span>
                    {isIntroPlaying ? (isRTL ? "إيقاف الصوت" : "Pause de l'intro") : (isRTL ? "تشغيل التقديم" : "Play l'intro")}
                  </button>
                </div>
                <p className="mt-4 text-[12.5px] font-bold flex items-center justify-center gap-1.5" style={{ color: AMBER }}>
                  <Gift className="w-4 h-4" /> {t.welcomeChip}
                </p>
                <div className="mt-4 flex items-center justify-center gap-3 sm:gap-5 flex-wrap">
                  {heroChecks.map((c) => (
                    <span key={c} className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-white/85">
                      <Check className="w-3.5 h-3.5 shrink-0" style={{ color: AMBER }} /> {c}
                    </span>
                  ))}
                </div>
              </SlideUp>
            </div>

            {/* ═══ LECTEUR STUDIO + TAMSON "50 نقطة" ═══ */}
            <SlideUp delay={0.34} className="mt-14 max-w-3xl mx-auto">
              <div className="relative">
                <div className="absolute -top-6 end-5 sm:-end-7 z-10 rotate-[8deg]" aria-hidden>
                  <div className="w-[88px] h-[88px] rounded-full flex items-center justify-center text-center"
                    style={{ background: AMBER, color: INK, boxShadow: "0 10px 24px rgba(233,161,59,0.5)" }}>
                    <div className="w-[76px] h-[76px] rounded-full border-2 border-dashed flex flex-col items-center justify-center px-1"
                      style={{ borderColor: "rgba(26,15,46,0.45)" }}>
                      <Gift className="w-4 h-4 mb-0.5" />
                      <span className="text-[10px] font-extrabold leading-[1.2]">
                        {isRTL ? "50 نقطة هدية" : "50 pts offerts"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border bg-white overflow-hidden shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)]"
                  style={{ borderColor: "rgba(107,45,188,0.25)" }}
                  onMouseEnter={() => setPauseRotate(true)} onMouseLeave={() => setPauseRotate(false)}
                  onFocusCapture={() => setPauseRotate(true)} onBlurCapture={() => setPauseRotate(false)}>
                  <div className="flex items-center gap-1.5 px-4 h-10" style={{ background: INK }}>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]/90" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]/90" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]/90" />
                    <Mono className="ms-3 text-[10px] tracking-[0.18em] uppercase text-white/40">sawtify · studio</Mono>
                    <span className="ms-auto flex items-center gap-1.5" style={{ color: heroPlaying ? AMBER : "rgba(255,255,255,0.35)" }}>
                      {heroPlaying && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: AMBER }} />}
                      <Kicker ar={isRTL} className="text-[10px]">
                        {heroPlaying ? (isRTL ? "على الهواء" : "On air") : (isRTL ? "جاهز" : "Ready")}
                      </Kicker>
                    </span>
                  </div>
                  <div className="p-5 sm:p-6">
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
                              transition={{ duration: 0.22 }} className="text-[17px] font-bold truncate" style={{ color: INK }}>
                              {isRTL ? featured.nameAr : featured.nameFr}
                            </motion.span>
                          </AnimatePresence>
                        </div>
                        <div className="text-[12px] text-[#1A0F2E]/50 mt-1 truncate">
                          {heroPlaying ? t.audioPreview : `${isRTL ? featured.tagAr : featured.tagFr} · ${featured.location}`}
                        </div>
                      </div>
                      <div className="text-end shrink-0">
                        <Mono className="block text-[10px] tracking-[0.2em] uppercase text-[#1A0F2E]/40">24 kHz</Mono>
                        <div className="text-[13px] font-bold mt-0.5" style={{ color: PURPLE }}>
                          <Num>20</Num> {t.pts}
                        </div>
                      </div>
                    </div>
                    <div className="rounded-xl border px-4 py-4" style={{ borderColor: BORDER, background: `${featured.color}0A` }}>
                      <Waveform color={featured.color} playing={heroPlaying} bars={40} />
                    </div>
                    <div dir="ltr" className="mt-4 flex items-center gap-3">
                      <Mono className="text-[11px] text-[#1A0F2E]/50 w-10 shrink-0 tabular-nums">{fmtTime(dispElapsed)}</Mono>
                      <div className="relative flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#EFE8D8" }}>
                        <div className="absolute inset-y-0 start-0 rounded-full"
                          style={{ width: `${dispProgress * 100}%`, background: featured.color, transition: "width 0.2s linear" }} />
                      </div>
                      <Mono className="text-[11px] text-[#1A0F2E]/50 w-10 shrink-0 text-end tabular-nums">{fmtTime(dispTotal)}</Mono>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                      <div dir="ltr" className="flex items-center gap-2.5">
                        <button type="button" onClick={() => stepVoice(-1)} aria-label={isRTL ? "الصوت السابق" : "Voix précédente"}
                          className="w-10 h-10 rounded-full border bg-white hov-ink flex items-center justify-center transition focus-ring" style={{ borderColor: BORDER }}>
                          <SkipBack className="w-4 h-4" />
                        </button>
                        <button type="button"
                          onClick={() => {
                            if (heroSamplePlaying) stopSample();
                            else { stopIntroAudio(); playSample(featured.id, featured.audioUrl); }
                          }}
                          aria-label={heroSamplePlaying ? t.pause : t.listenInStudio} aria-pressed={heroSamplePlaying}
                          className="w-14 h-14 rounded-full flex items-center justify-center text-white transition hover:scale-105 focus-ring shadow-lg"
                          style={{ background: featured.color, boxShadow: `0 10px 26px -10px ${featured.color}` }}>
                          {heroSamplePlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current translate-x-[1px]" />}
                        </button>
                        <button type="button" onClick={() => stepVoice(1)} aria-label={isRTL ? "الصوت التالي" : "Voix suivante"}
                          className="w-10 h-10 rounded-full border bg-white hov-ink flex items-center justify-center transition focus-ring" style={{ borderColor: BORDER }}>
                          <SkipForward className="w-4 h-4" />
                        </button>
                      </div>
                      <div dir="ltr" className="flex items-center rounded-xl border overflow-hidden" style={{ borderColor: BORDER }}>
                        {SPEEDS.map((s) => (
                          <button key={s} type="button" onClick={() => applySpeed(s)} aria-pressed={speed === s}
                            className={`px-2.5 py-1.5 text-[11px] font-semibold transition focus-ring ${speed === s ? "text-white" : "text-[#1A0F2E]/55 hover:bg-[#1A0F2E]/5"}`}
                            style={speed === s ? { background: PURPLE } : undefined}>
                            {s}x
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </SlideUp>

            <SlideUp delay={0.44} className="mt-9">
              <div className="flex items-center justify-center gap-4 sm:gap-5 text-[12px] text-white/90 flex-wrap"
                style={{ textShadow: "0 1px 8px rgba(0,0,0,0.4)" }}>
                <div className="flex -space-x-1.5" dir="ltr">
                  {AVATAR_COLORS.map((c) => (
                    <div key={c} className="w-7 h-7 rounded-full border-2 border-white" style={{ background: c }} />
                  ))}
                </div>
                <span className="font-bold"><Num>9</Num> {isRTL ? "أصوات" : "voix"}</span>
                <span>·</span>
                <span><Num>1 200+</Num> {t.creators}</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <Star className="w-3 h-3" style={{ color: AMBER, fill: AMBER }} />
                  <Num>4.9</Num> / <Num>5</Num>
                </span>
              </div>
            </SlideUp>
          </div>
        </section>

        {/* ═══ BANDE MARQUEE (encre) ═══ */}
        <section className="marquee overflow-hidden py-3.5 border-y" style={{ background: INK, borderColor: PURPLE_DARK }} aria-hidden>
          <div dir="ltr" className="marquee-track flex w-max items-center">
            {[0, 1].map((copy) => (
              <div key={copy} className="flex items-center shrink-0">
                {marqueeItems.map((m, i) => (
                  <span key={i} className="flex items-center mx-7">
                    <span className="text-[13px] font-bold whitespace-nowrap" style={{ color: PAPER }}>{m}</span>
                    <span className="ms-7 w-1.5 h-1.5 rotate-45 shrink-0" style={{ background: AMBER }} />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* ═══ BANDE CONFIANCE ═══ */}
        <section className="py-6" aria-label={isRTL ? "وسائل الدفع والجودة" : "Paiement et qualité"}>
          <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
            <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3">
              {trust.map((p, i) => (
                <span key={p.k} className="flex items-center gap-7">
                  <span className="flex flex-col items-center">
                    <span className="text-[14px] font-extrabold tracking-tight" style={{ color: INK }}>{p.k}</span>
                    <Kicker ar={isRTL} className="text-[10.5px] text-[#1A0F2E]/45 mt-0.5">{p.v}</Kicker>
                  </span>
                  {i < trust.length - 1 && (
                    <span className="hidden sm:block w-px h-7" style={{ background: BORDER }} aria-hidden />
                  )}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ COMPARATIF ═══ */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
            <SlideUp>
              <SectionHead eyebrow={isRTL ? "الحساب" : "Le calcul"}
                title={t.compareTitle} sub={t.compareSub} center font={display} ar={isRTL} />
            </SlideUp>
            <SlideUp delay={0.1}>
              <div className="mt-10 max-w-3xl mx-auto rounded-2xl border bg-white overflow-hidden shadow-[0_18px_44px_-30px_rgba(107,45,188,0.4)]"
                style={{ borderColor: BORDER }}>
                <div className="grid grid-cols-[1.1fr_1fr_1fr] text-center" style={{ background: PURPLE_SOFT, borderBottom: `1px solid ${BORDER}` }}>
                  <span className="py-3.5" />
                  <span className="py-3.5 px-2">
                    <Kicker ar={isRTL} className="text-[10.5px] text-[#1A0F2E]/45">{t.compareOld}</Kicker>
                  </span>
                  <span className="py-3.5 px-2" style={{ background: PURPLE_SOFT }}>
                    <Kicker ar={isRTL} className="text-[10.5px]" style={{ color: PURPLE }}>{t.compareNew}</Kicker>
                  </span>
                </div>
                {compareRows.map((r, i) => (
                  <div key={r.label} className="grid grid-cols-[1.1fr_1fr_1fr] text-center items-stretch"
                    style={{ borderBottom: i < compareRows.length - 1 ? `1px solid ${BORDER}` : undefined }}>
                    <span className="px-3 py-4 text-[12px] font-bold text-[#1A0F2E]/70 flex items-center justify-start text-start">{r.label}</span>
                    <span className="px-2 py-4 text-[12px] text-[#1A0F2E]/45 flex items-center justify-center gap-1.5">
                      <X className="w-3.5 h-3.5 shrink-0" style={{ color: CLAY }} />
                      <span>{r.old}</span>
                    </span>
                    <span className="px-2 py-4 text-[12px] font-bold flex items-center justify-center gap-1.5" style={{ background: `${PURPLE}0D` }}>
                      <Check className="w-3.5 h-3.5 shrink-0" style={{ color: PURPLE }} />
                      <span>{r.now}</span>
                    </span>
                  </div>
                ))}
              </div>
            </SlideUp>
            <SlideUp delay={0.16}>
              <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-5">
                <div className="text-center">
                  <Kicker ar={isRTL} className="block text-[11.5px] mb-1" style={{ color: "rgba(26,15,46,0.5)" }}>{t.saveUp}</Kicker>
                  <div className="text-[30px] leading-none font-extrabold flex items-baseline justify-center gap-1.5"
                    style={{ color: PURPLE, fontFamily: NUM_STACK }}>
                    <Num>15 000</Num>
                    <span className="text-[15px]">{t.savedUnit}</span>
                  </div>
                </div>
                <button type="button" onClick={goSignup}
                  className="h-12 px-7 rounded-full text-[14px] font-bold text-white focus-ring transition hover:brightness-110 shine"
                  style={{ background: PURPLE, boxShadow: "0 10px 26px -10px rgba(107,45,188,0.7)" }}>
                  {t.tryFree}
                </button>
              </div>
            </SlideUp>
          </div>
        </section>

        {/* ═══ VOIX ═══ */}
        <section id="voices" className="py-16 sm:py-24">
          <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
            <SlideUp>
              <SectionHead eyebrow={isRTL ? "المكتبة الصوتية" : "La voixothèque"}
                title={t.popularTitle} sub={t.popularSub} font={display} ar={isRTL} />
            </SlideUp>
            <SlideUp delay={0.1}>
              <div className="mt-10 rounded-2xl border bg-white overflow-hidden shadow-[0_18px_44px_-30px_rgba(107,45,188,0.35)]" style={{ borderColor: BORDER }}>
                <div className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3" style={{ background: PURPLE_SOFT, borderBottom: `1px solid ${BORDER}` }}>
                  <span className="w-8 shrink-0" />
                  <Kicker ar={isRTL} className="flex-1 text-[10.5px] text-[#1A0F2E]/45">
                    {isRTL ? "القائمة · 9 أصوات" : "Piste · 9 voix"}
                  </Kicker>
                  <Kicker ar={isRTL} className="hidden sm:block w-16 text-end text-[10.5px] text-[#1A0F2E]/45">
                    {isRTL ? "المدة" : "Durée"}
                  </Kicker>
                  <span className="w-10 shrink-0" />
                </div>
                {LANDING_VOICES.map((v) => {
                  const active = playingId === v.id;
                  const name = isRTL ? v.nameAr : v.nameFr;
                  const no = String(LANDING_VOICES.findIndex((x) => x.id === v.id) + 1).padStart(2, "0");
                  return (
                    <button key={v.id} type="button"
                      onClick={() => (active ? stopSample() : openListen(v))}
                      aria-pressed={active}
                      className={`group w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4 text-start transition focus-ring ${active ? "" : "hover:bg-[#6B2DBC]/[0.05]"}`}
                      style={{ borderBottom: `1px solid ${BORDER}`, background: active ? `${v.color}0F` : undefined }}>
                      <span className="relative w-8 h-8 shrink-0 flex items-center justify-center">
                        <Mono className={`absolute text-[13px] transition-opacity ${active ? "opacity-0" : "group-hover:opacity-0"}`}
                          style={{ color: "rgba(26,15,46,0.4)" }}>{no}</Mono>
                        <span className="absolute inset-0 flex items-center justify-center transition-opacity" style={{ opacity: active ? 1 : 0 }}>
                          {active
                            ? <Pause className="w-4 h-4 fill-current" style={{ color: v.color }} />
                            : <Play className="w-4 h-4 fill-current translate-x-[1px]" style={{ color: v.color }} />}
                        </span>
                      </span>
                      <span className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-[15px] shrink-0"
                        style={{ background: `${v.color}1A`, color: v.color, fontFamily: display }}>
                        {name.charAt(0)}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className={`block text-[15px] font-bold truncate transition-colors ${active ? "" : "group-hover:text-[#6B2DBC]"}`}>{name}</span>
                        <span className="block text-[12px] text-[#1A0F2E]/50 truncate">
                          {isRTL ? v.tagAr : v.tagFr} · {v.location}
                        </span>
                      </span>
                      <span className="hidden md:flex items-center gap-1 text-[12px] font-bold text-[#1A0F2E]/60 shrink-0">
                        <Star className="w-3 h-3" style={{ color: AMBER, fill: AMBER }} />
                        <Num>{v.rating}</Num>
                        <span className="text-[#1A0F2E]/35 font-medium ms-1">(<Num>{v.reviews}</Num>)</span>
                      </span>
                      <Mono dir="ltr" className="hidden sm:block w-16 text-end text-[12px] text-[#1A0F2E]/45 shrink-0">
                        {durations[v.id] ? fmtTime(durations[v.id]) : fmtDur(v, language)}
                      </Mono>
                      <span className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 transition"
                        style={{ background: active ? v.color : "rgba(26,15,46,0.8)" }}>
                        {active ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current translate-x-[1px]" />}
                      </span>
                    </button>
                  );
                })}
                <div style={{ borderTop: `1px dashed ${BORDER}` }}>
                  {HIDDEN_VOICES.map((v) => {
                    const name = isRTL ? v.nameAr : v.nameFr;
                    return (
                      <button key={v.id} type="button" onClick={goSignup} aria-label={t.moreVoices}
                        className="group w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4 text-start transition focus-ring hover:bg-[#6B2DBC]/[0.05]">
                        <span className="w-8 h-8 shrink-0 flex items-center justify-center">
                          <Lock className="w-3.5 h-3.5 text-[#1A0F2E]/30 transition-colors group-hover:text-[#6B2DBC]" />
                        </span>
                        <span className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-[15px] shrink-0 select-none"
                          style={{ background: `${v.color}12`, color: v.color, filter: "blur(3px)", fontFamily: display }}>
                          {name.charAt(0)}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-[15px] font-bold truncate select-none" style={{ filter: "blur(6px)" }}>{name}</span>
                          <span className="block text-[12px] text-[#1A0F2E]/40 truncate">
                            {isRTL ? "مقفلة — اسمعها في الاستوديو" : "Verrouillée — dans le studio"}
                          </span>
                        </span>
                        <Mono dir="ltr" className="hidden sm:block w-16 text-end text-[12px] text-[#1A0F2E]/30 shrink-0">--:--</Mono>
                        <span className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition group-hover:scale-105"
                          style={{ background: PURPLE_SOFT, color: PURPLE }}>
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

        {/* ═══ PROCESSUS ═══ */}
        <section id="process" className="py-16 sm:py-24">
          <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
            <SlideUp>
              <SectionHead eyebrow={isRTL ? "الطريقة" : "La méthode"}
                title={t.journeyTitle} sub={t.journeySub} center font={display} ar={isRTL} />
            </SlideUp>
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {journeySteps.map((s, i) => (
                <SlideUp key={s.n} delay={i * 0.07}>
                  <div className="relative rounded-2xl border bg-white p-6 sm:p-7 h-full min-h-[190px] flex flex-col justify-between card-lift overflow-hidden" style={{ borderColor: BORDER }}>
                    <div className="absolute -top-12 -end-12 w-28 h-28 rounded-full opacity-10" style={{ background: PURPLE }} aria-hidden />
                    <div className="relative w-10 h-10 rounded-xl flex items-center justify-center font-bold text-[15px]"
                      style={{ background: PURPLE, color: AMBER, fontFamily: MONO_STACK }}>{s.n}</div>
                    <div className="relative">
                      <h3 className="text-[19px] font-extrabold mb-1.5" style={{ fontFamily: display, color: INK }}>{s.t}</h3>
                      <p className="text-[12.5px] text-[#1A0F2E]/55 leading-relaxed">{s.d}</p>
                    </div>
                  </div>
                </SlideUp>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ USAGES ═══ */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
            <SlideUp>
              <SectionHead eyebrow={isRTL ? "الاستعمالات" : "Les usages"} title={t.useTitle} font={display} ar={isRTL} />
            </SlideUp>
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {uses.map((u, i) => (
                <SlideUp key={u.t} delay={i * 0.06}>
                  <div className="rounded-2xl border bg-white p-6 h-full card-lift" style={{ borderColor: BORDER }}>
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: PURPLE_SOFT, color: PURPLE }}>
                      <u.icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-[15px] font-bold mb-1">{u.t}</h3>
                    <p className="text-[12.5px] text-[#1A0F2E]/55 leading-relaxed">{u.d}</p>
                  </div>
                </SlideUp>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ ESTIMATEUR ═══ */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-[1280px] px-5 sm:px-6 grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-5">
              <SlideUp>
                <SectionHead eyebrow={isRTL ? "التكلفة" : "Le coût"} title={t.costTitle} sub={t.costSub} font={display} ar={isRTL} />
                <ul className="mt-6 space-y-2.5 text-[13px] text-[#1A0F2E]/70">
                  {[
                    isRTL ? "50 نقطة هدية وقت التسجيل." : "50 points offerts à l'inscription.",
                    isRTL ? "النقاط بلا تاريخ انتهاء." : "Points valables à vie.",
                    isRTL ? "الدفع بالدينار عبر SATIM." : "Paiement en DZD via SATIM.",
                  ].map((line) => (
                    <li key={line} className="flex items-start gap-2">
                      <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: PURPLE }} />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </SlideUp>
            </div>
            <div className="lg:col-span-7">
              <SlideUp delay={0.1}>
                <div className="rounded-2xl border bg-white p-6 sm:p-8" style={{ borderColor: BORDER }}>
                  <Kicker ar={isRTL} className="block text-[11px] mb-4 text-[#1A0F2E]/45">
                    {isRTL ? "احسب تكلفك" : "Estimateur"}
                  </Kicker>
                  <div className="grid grid-cols-4 gap-2 mb-6">
                    {COST_STEPS.map((s, i) => (
                      <button key={s.sec} type="button" onClick={() => setCostIdx(i)}
                        className={`py-2.5 rounded-xl text-[12px] font-bold transition focus-ring ${costIdx === i ? "text-white" : "text-[#1A0F2E]/60 border bg-white hov-ink"}`}
                        style={costIdx === i ? { background: PURPLE, borderColor: PURPLE } : { borderColor: BORDER }}>
                        {isRTL ? s.labelAr : s.labelFr}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-end justify-between gap-4 flex-wrap">
                    <div>
                      <Kicker ar={isRTL} className="block text-[11px] mb-1 text-[#1A0F2E]/45">
                        {isRTL ? "التكلفة" : "Coût"}
                      </Kicker>
                      <div className="text-[52px] leading-none font-extrabold" style={{ fontFamily: NUM_STACK, color: PURPLE }}>
                        <AnimatePresence mode="wait">
                          <motion.span key={costIdx} className="inline-block"
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.22 }}>
                            {COST_STEPS[costIdx].pts}
                          </motion.span>
                        </AnimatePresence>
                        <span className="text-[15px] font-semibold text-[#1A0F2E]/40 ms-2">{t.pts}</span>
                      </div>
                    </div>
                    <button type="button" onClick={goSignup}
                      className="h-11 px-5 rounded-xl font-bold text-[13px] text-white focus-ring hover:brightness-110 transition"
                      style={{ background: PURPLE }}>
                      {t.tryFree}
                    </button>
                  </div>
                </div>
              </SlideUp>
            </div>
          </div>
        </section>

        {/* ═══ CHIFFRES ═══ */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
            <SlideUp>
              <SectionHead eyebrow={isRTL ? "بالأرقام" : "En chiffres"} title={t.metricsTitle} center font={display} ar={isRTL} />
            </SlideUp>
            <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4">
              {metrics.map((m, i) => (
                <SlideUp key={m.l} delay={i * 0.06}>
                  <div className="rounded-2xl border bg-white p-8 text-center card-lift" style={{ borderColor: BORDER }}>
                    <div className="text-[clamp(2.2rem,4.2vw,3rem)] leading-none font-extrabold mb-2" style={{ color: PURPLE, fontFamily: NUM_STACK }}>
                      <Counter target={m.n} suffix={m.s} />
                    </div>
                    <Kicker ar={isRTL} className="text-[11px] text-[#1A0F2E]/45">{m.l}</Kicker>
                  </div>
                </SlideUp>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ TÉMOIGNAGES ═══ */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
            <SlideUp>
              <SectionHead eyebrow={isRTL ? "شهادات" : "Témoignages"} title={t.testTitle} center font={display} ar={isRTL} />
            </SlideUp>
            <SlideUp delay={0.1}>
              <div className="mt-12 max-w-3xl mx-auto rounded-2xl border bg-white p-8 sm:p-12" style={{ borderColor: BORDER }}>
                <AnimatePresence mode="wait">
                  <motion.div key={activeTesti}
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.4 }} className="text-center">
                    <div className="flex justify-center gap-1 mb-5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="w-4 h-4" style={{ color: AMBER, fill: AMBER }} />
                      ))}
                    </div>
                    <blockquote className="text-[clamp(1.25rem,2.6vw,1.8rem)] leading-[1.4] font-bold" style={{ fontFamily: display }}>
                      "{testimonials[activeTesti].q}"
                    </blockquote>
                    <div className="mt-7 flex items-center justify-center gap-3">
                      <div className="w-11 h-11 rounded-full flex items-center justify-center text-[13px] font-extrabold text-white" style={{ background: PURPLE }}>
                        {testimonials[activeTesti].img}
                      </div>
                      <div className="text-start">
                        <div className="text-[13.5px] font-bold">{testimonials[activeTesti].n}</div>
                        <div className="text-[12px] text-[#1A0F2E]/50">{testimonials[activeTesti].r}</div>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
                <div className="mt-8 flex items-center justify-center gap-4">
                  <button type="button"
                    onClick={() => setActiveTesti((p) => (p - 1 + testimonials.length) % testimonials.length)}
                    className="w-10 h-10 rounded-full border bg-white hov-ink text-[#1A0F2E]/60 flex items-center justify-center focus-ring"
                    style={{ borderColor: BORDER }} aria-label={isRTL ? "السابق" : "Précédent"}>
                    {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                  </button>
                  <div className="flex items-center gap-2">
                    {testimonials.map((_, i) => (
                      <button key={i} type="button" onClick={() => setActiveTesti(i)} aria-label={`${i + 1}`}
                        className={`h-1.5 rounded-full transition-all ${i === activeTesti ? "w-6" : "w-1.5 bg-[#1A0F2E]/20 hover:bg-[#1A0F2E]/40"}`}
                        style={i === activeTesti ? { background: PURPLE } : undefined} />
                    ))}
                  </div>
                  <button type="button" onClick={() => setActiveTesti((p) => (p + 1) % testimonials.length)}
                    className="w-10 h-10 rounded-full border bg-white hov-ink text-[#1A0F2E]/60 flex items-center justify-center focus-ring"
                    style={{ borderColor: BORDER }} aria-label={isRTL ? "التالي" : "Suivant"}>
                    {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </SlideUp>
          </div>
        </section>

        {/* ═══ TARIFS ═══ */}
        <section id="pricing" className="py-16 sm:py-24">
          <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
            <SlideUp>
              <SectionHead eyebrow={isRTL ? "الباقات" : "Les packs"}
                title={t.pricingTitle} sub={t.pricingSub} center font={display} ar={isRTL} />
            </SlideUp>

            <SlideUp delay={0.08}>
              <div className="mb-10 mt-10 max-w-2xl mx-auto">
                <button type="button" onClick={goSignup}
                  className="relative w-full rounded-2xl border-2 border-dashed text-start focus-ring transition hover:bg-[#FDF6E3]"
                  style={{ borderColor: AMBER, background: "#FCF4E0" }}>
                  <span className="flex items-center gap-4 px-4 sm:px-5 py-4">
                    <span className="shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: AMBER, color: INK }}>
                      <Gift className="w-5 h-5" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[14.5px] font-extrabold leading-snug" style={{ color: INK }}>{t.welcomeBanner}</span>
                      <span className="block text-[12px] text-[#1A0F2E]/60 mt-0.5">{t.bannerSub}</span>
                    </span>
                    <span className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white" style={{ background: PURPLE }}>
                      <ArrowIcon className="w-4 h-4" />
                    </span>
                  </span>
                </button>
              </div>
            </SlideUp>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {pricing.map((p, i) => (
                <SlideUp key={p.pts} delay={i * 0.06}>
                  <div className={`relative rounded-2xl border p-6 h-full flex flex-col card-lift ${p.featured ? "text-white" : "bg-white"}`}
                    style={p.featured ? {
                      borderColor: PURPLE,
                      background: `linear-gradient(160deg, ${PURPLE} 0%, ${PURPLE_DARK} 100%)`,
                      boxShadow: "0 22px 46px -20px rgba(107,45,188,0.6)",
                    } : { borderColor: BORDER }}>
                    {p.featured && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-extrabold whitespace-nowrap"
                        style={{ background: AMBER, color: INK }}>
                        <Kicker ar={isRTL} className="text-[10px]">{t.popular}</Kicker>
                      </div>
                    )}
                    <div className="text-[42px] leading-none font-extrabold mb-1 pt-1" style={{ fontFamily: NUM_STACK }}>
                      <Num>{p.ptsLabel}</Num>
                    </div>
                    <Kicker ar={isRTL} className="block text-[11px] mb-4"
                      style={{ color: p.featured ? "rgba(255,255,255,0.8)" : "rgba(26,15,46,0.4)" }}>
                      {t.pts}
                    </Kicker>
                    <div className="relative my-4 border-t-2 border-dashed"
                      style={{ borderColor: p.featured ? "rgba(255,255,255,0.35)" : BORDER }}>
                      <span className="absolute -top-[10px] -start-[33px] w-[18px] h-[18px] rounded-full" style={{ background: PAPER }} aria-hidden />
                      <span className="absolute -top-[10px] -end-[33px] w-[18px] h-[18px] rounded-full" style={{ background: PAPER }} aria-hidden />
                    </div>
                    <p className={`text-[12px] flex-1 leading-relaxed ${p.featured ? "text-white/85" : "text-[#1A0F2E]/60"}`}>{p.desc}</p>
                    <div className="flex items-baseline gap-1.5 mt-5">
                      <span className="text-[26px] font-extrabold"><Num>{p.price}</Num></span>
                      <span className={`text-[11px] font-bold ${p.featured ? "text-white/70" : "text-[#1A0F2E]/40"}`}>
                        {isRTL ? "دج" : "DZD"}
                      </span>
                    </div>
                    <button type="button" onClick={goSignup}
                      className="h-11 rounded-xl text-[13px] font-bold transition focus-ring mt-4 text-white hover:brightness-110"
                      style={p.featured ? { background: INK } : { background: PURPLE }}>
                      {t.choose}
                    </button>
                  </div>
                </SlideUp>
              ))}
            </div>

            <SlideUp delay={0.15}>
              <div className="mt-8 max-w-3xl mx-auto rounded-2xl border-2 border-dashed p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-start"
                style={{ borderColor: "rgba(107,45,188,0.4)", background: PURPLE_SOFT }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: PURPLE }}>
                  <ShieldCheck className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-extrabold text-[15px]">{t.guaranteeTitle}</div>
                  <p className="text-[13px] text-[#1A0F2E]/65 mt-1 leading-relaxed">{t.guaranteeBody}</p>
                </div>
              </div>
            </SlideUp>
          </div>
        </section>

        {/* ═══ FAQ ═══ */}
        <section id="faq" className="py-16 sm:py-24">
          <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
            <div className="grid lg:grid-cols-12 gap-10">
              <div className="lg:col-span-4">
                <SlideUp>
                  <SectionHead eyebrow="FAQ" title={t.faqTitle} font={display} ar={isRTL} />
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
                            <span className="flex-1 text-[14.5px] font-bold group-hover:text-[#6B2DBC] transition-colors">{f.q}</span>
                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all ${open ? "rotate-45 text-white" : "text-[#1A0F2E]/60"}`}
                              style={open ? { background: PURPLE } : { background: PURPLE_SOFT }}>
                              <Plus className="w-4 h-4" />
                            </span>
                          </button>
                          <AnimatePresence initial={false}>
                            {open && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28 }} className="overflow-hidden">
                                <p className="pb-5 px-5 sm:px-6 pe-14 text-[13px] text-[#1A0F2E]/65 leading-relaxed">{f.a}</p>
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

        {/* ═══ CTA FINAL ═══ */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
            <SlideUp>
              <div className="relative rounded-[24px] overflow-hidden p-10 sm:p-16 text-center"
                style={{
                  background: `linear-gradient(135deg, ${PURPLE_DARK} 0%, ${PURPLE} 50%, ${PURPLE_DARK} 100%)`,
                  color: PAPER,
                  boxShadow: "0 26px 60px -28px rgba(74,30,135,0.7)",
                }}>
                <div className="absolute bottom-0 start-0 flex items-end gap-1.5 p-7 opacity-25" dir="ltr" aria-hidden>
                  {[12, 26, 16, 34, 20, 30, 14, 38, 22, 32, 18, 28, 12, 24].map((h, i) => (
                    <span key={i} className="w-1.5 rounded-full bg-white" style={{ height: h }} />
                  ))}
                </div>
                <div className="absolute top-7 end-7 w-2.5 h-2.5 rotate-45" style={{ background: AMBER }} aria-hidden />
                <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full opacity-30 blur-3xl" style={{ background: "radial-gradient(circle, #E9A13B 0%, transparent 70%)" }} aria-hidden />
                <div className="relative">
                  <h2 className="text-[clamp(2rem,5vw,3.6rem)] leading-[1.06] font-extrabold" style={{ fontFamily: display }}>
                    {t.ctaTitle}
                  </h2>
                  <p className="mt-4 text-[15px] text-white/80 max-w-md mx-auto">{t.ctaSub}</p>
                  {countdown && (
                    <div className="mt-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-extrabold"
                      style={{ background: AMBER, color: INK }}>
                      <Timer className="w-4 h-4" />
                      <span>{t.expiresIn}</span>
                      <Mono dir="ltr" className="tabular-nums">{countdown.h}:{countdown.m}:{countdown.s}</Mono>
                    </div>
                  )}
                  <button type="button" onClick={goSignup}
                    className="mt-8 inline-flex items-center gap-2 h-14 px-8 rounded-full font-extrabold text-[15px] transition focus-ring hover:scale-[1.02]"
                    style={{ background: PAPER, color: PURPLE }}>
                    {t.tryFree}
                    <ArrowIcon className="w-4 h-4" />
                  </button>
                  <Kicker ar={isRTL} className="block mt-5 text-[11px] text-white/70">
                    {isRTL ? "بلا بطاقة · 50 نقطة بالمجان" : "Sans carte · 50 points offerts"}
                  </Kicker>
                </div>
              </div>
            </SlideUp>
          </div>
        </section>

        {/* ═══ FOOTER ═══ */}
        <footer id="contact" className="pt-12 pb-28 sm:pb-12" style={{ borderTop: `1px solid ${BORDER}` }}>
          <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
              <div className="lg:col-span-2">
                <Logo size={38} />
                <p className="mt-4 text-[13px] text-[#1A0F2E]/55 max-w-sm leading-relaxed">
                  {isRTL
                    ? "استوديو صوتي جزائري. نصّك بالدارجة يولي صوت طبيعي، جاهز للإعلان."
                    : "Studio vocal algérien. Votre texte en darija devient une voix naturelle, prête pour la pub."}
                </p>
                <p className="mt-3 text-[12px] font-bold text-[#1A0F2E]/70 flex items-center gap-2">
                  <Headphones className="w-3.5 h-3.5" style={{ color: PURPLE }} /> Alger, Algérie · {t.footTag}
                </p>
              </div>
              <div>
                <Kicker ar={isRTL} className="block text-[11px] text-[#1A0F2E]/40 mb-3">
                  {isRTL ? "المنصة" : "Produit"}
                </Kicker>
                <div className="flex flex-col gap-2 text-[13px] font-medium">
                  {nav.map((l) => (
                    <a key={`f-${l.href}-${l.target}`} href={l.href}
                      onClick={(e) => { e.preventDefault(); navigatePublicSection(l.href, l.target); }}
                      className="text-[#1A0F2E]/60 hover:text-[#6B2DBC] transition-colors">{l.label}</a>
                  ))}
                </div>
              </div>
              <div>
                <Kicker ar={isRTL} className="block text-[11px] text-[#1A0F2E]/40 mb-3">{t.contact}</Kicker>
                <div className="flex flex-col gap-2 text-[13px] font-semibold">
                  <a href="mailto:SAWTIFYSPACE@GMAIL.COM" className="text-[#1A0F2E]/70 hover:text-[#6B2DBC] transition-colors">SAWTIFYSPACE@GMAIL.COM</a>
                  <a href="tel:+213697660969" className="text-[#1A0F2E]/70 hover:text-[#6B2DBC] transition-colors"><Num>+213 697 660 969</Num></a>
                  <a href="https://www.instagram.com/sawtify.ai" target="_blank" rel="noreferrer"
                    className="text-[#1A0F2E]/70 hover:text-[#6B2DBC] transition-colors">Instagram · @sawtify.ai</a>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {["Edahabia", "CIB", "SATIM"].map((p) => (
                    <span key={p} className="text-[10px] font-bold px-2 py-1 rounded-full border bg-white text-[#1A0F2E]/60" style={{ borderColor: BORDER }}>{p}</span>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-[11px] text-[#1A0F2E]/50">
                  <ShieldCheck className="w-3.5 h-3.5" style={{ color: PURPLE }} />
                  {isRTL ? "دفع آمن، ما نخزّنوش رقم البطاقة." : "Paiement sécurisé, aucune carte stockée."}
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 text-[12px] text-[#1A0F2E]/45"
              style={{ borderTop: `1px solid ${BORDER}` }}>
              <span>© <Num>2026</Num> Sawtify · {t.footTag}</span>
              <div className="flex items-center gap-4">
                <button type="button" onClick={() => setLegal("cgu")} className="hover:text-[#6B2DBC] transition-colors">{t.cgu}</button>
                <button type="button" onClick={() => setLegal("privacy")} className="hover:text-[#6B2DBC] transition-colors">{t.privacy}</button>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* ═══ CTA MOBILE STICKY ═══ */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 p-3 bg-white/95 backdrop-blur-xl"
        style={{ borderTop: `1px solid ${BORDER}` }}>
        <button type="button" onClick={goSignup}
          className="w-full h-12 rounded-xl font-bold text-[13.5px] flex items-center justify-center gap-2.5 text-white"
          style={{ background: PURPLE }}>
          <span className="truncate">{t.tryFree}</span>
          {countdown && (
            <Mono dir="ltr" className="shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-md bg-black/20 tabular-nums">
              {countdown.h}:{countdown.m}:{countdown.s}
            </Mono>
          )}
        </button>
      </div>

      {/* ═══ PREUVES SOCIALES ═══ */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-[150px] sm:bottom-6 start-3 sm:start-6 z-[45] max-w-[300px]"
            role="status" aria-live="polite">
            <div className="flex items-center gap-3 rounded-2xl border bg-white px-3.5 py-3 shadow-[0_14px_36px_rgba(107,45,188,0.18)]"
              style={{ borderColor: BORDER }}>
              <span className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-extrabold shrink-0" style={{ background: PURPLE }}>
                {toast.n.charAt(0)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-bold truncate">{toast.n} · {toast.c}</span>
                <span className="block text-[11.5px] text-[#1A0F2E]/55 truncate">{toast.a}</span>
              </span>
              <span className="w-2 h-2 rounded-full shrink-0 animate-pulse" style={{ background: PURPLE }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ MODALE ÉCOUTE ═══ */}
      <AnimatePresence>
        {listenVoice && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] bg-[#1A0F2E]/55"
              onClick={() => { setListenVoice(null); stopSample(); }} />
            <div className="fixed inset-0 z-[71] flex items-end sm:items-center justify-center overflow-y-auto scrollbar-none"
              onClick={(e) => { if (e.target === e.currentTarget) { setListenVoice(null); stopSample(); } }}>
              <motion.div role="dialog" aria-modal="true" aria-labelledby="listen-title"
                initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 28 }}
                transition={{ type: "spring", damping: 28, stiffness: 320 }}
                className="relative w-full sm:max-w-md bg-white border rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl my-auto max-h-[86vh] overflow-y-auto scrollbar-none"
                style={{ borderColor: BORDER }}>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <Kicker ar={isRTL} className="block text-[11px] text-[#1A0F2E]/40 mb-1">{t.listenInStudio}</Kicker>
                    <h3 id="listen-title" className="text-[22px] font-extrabold" style={{ fontFamily: display }}>
                      {isRTL ? listenVoice.nameAr : listenVoice.nameFr}
                    </h3>
                    <p className="text-[12px] text-[#1A0F2E]/50">
                      {isRTL ? listenVoice.tagAr : listenVoice.tagFr} · {listenVoice.location}
                    </p>
                  </div>
                  <button type="button" onClick={() => { setListenVoice(null); stopSample(); }}
                    className="w-9 h-9 rounded-full hover:bg-[#1A0F2E]/5 flex items-center justify-center focus-ring shrink-0" aria-label={t.close}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="rounded-xl border p-4 mb-4" style={{ borderColor: BORDER, background: `${listenVoice.color}0D` }}>
                  <Waveform color={listenVoice.color} playing={playingId === listenVoice.id} bars={30} />
                  <button type="button"
                    onClick={() => (playingId === listenVoice.id ? stopSample() : playSample(listenVoice.id, listenVoice.audioUrl))}
                    className="mt-3 w-full h-11 rounded-xl font-bold text-[13px] text-white flex items-center justify-center gap-2 focus-ring hover:brightness-110 transition"
                    style={{ background: listenVoice.color }}>
                    {playingId === listenVoice.id ? (
                      <><Pause className="w-4 h-4 fill-current" />{t.pause}</>
                    ) : (
                      <><Play className="w-4 h-4 fill-current translate-x-[1px]" />{t.listenInStudio}</>
                    )}
                  </button>
                  <p className="mt-2 text-[11px] text-center text-[#1A0F2E]/45">{t.studioNote}</p>
                </div>
                <p className="text-[13px] leading-relaxed text-[#1A0F2E]/70 mb-2" dir="auto">
                  "{(isRTL ? listenVoice.sampleAr : listenVoice.sampleFr).slice(0, 52).trimEnd()}…"
                </p>
                <p className="text-[13px] text-[#1A0F2E]/60 leading-relaxed mb-5">{t.listenBody}</p>
                <button type="button" onClick={goSignup}
                  className="w-full h-12 rounded-xl font-bold text-[14px] text-white transition hover:brightness-110"
                  style={{ background: PURPLE }}>
                  {t.moreVoices} — {isRTL ? listenVoice.nameAr : listenVoice.nameFr}
                </button>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* ═══ POP-UP EXIT ═══ */}
      <AnimatePresence>
        {exitOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[75] bg-[#1A0F2E]/65" onClick={() => setExitOpen(false)} />
            <div className="fixed inset-0 z-[76] flex items-center justify-center p-4 overflow-y-auto scrollbar-none"
              onClick={(e) => { if (e.target === e.currentTarget) setExitOpen(false); }}>
              <motion.div role="dialog" aria-modal="true"
                initial={{ opacity: 0, scale: 0.94, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 16 }} transition={{ type: "spring", damping: 26, stiffness: 300 }}
                className="relative w-full max-w-md bg-white border rounded-2xl p-7 text-center shadow-2xl my-auto max-h-[88vh] overflow-y-auto scrollbar-none"
                style={{ borderColor: BORDER }}>
                <button type="button" onClick={() => setExitOpen(false)}
                  className="absolute top-3 end-3 w-9 h-9 rounded-full hover:bg-[#1A0F2E]/5 flex items-center justify-center focus-ring" aria-label={t.close}>
                  <X className="w-4 h-4" />
                </button>
                <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 rotate-[-4deg]"
                  style={{ background: AMBER, color: INK, boxShadow: "0 12px 28px -10px rgba(233,161,59,0.6)" }}>
                  <Gift className="w-7 h-7" />
                </div>
                <h3 className="text-[24px] font-extrabold" style={{ fontFamily: display }}>{t.exitTitle}</h3>
                <p className="mt-3 text-[13.5px] text-[#1A0F2E]/65 leading-relaxed">{t.exitBody}</p>
                {countdown && (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-extrabold"
                    style={{ background: PURPLE_SOFT, color: PURPLE }}>
                    <Timer className="w-4 h-4" />
                    <span>{t.expiresIn}</span>
                    <Mono dir="ltr" className="tabular-nums">{countdown.h}:{countdown.m}:{countdown.s}</Mono>
                  </div>
                )}
                <button type="button" onClick={() => { setExitOpen(false); goSignup(); }}
                  className="mt-5 w-full h-12 rounded-xl font-bold text-[14px] text-white transition hover:brightness-110 focus-ring shine"
                  style={{ background: PURPLE, boxShadow: "0 10px 26px -10px rgba(107,45,188,0.7)" }}>
                  {t.exitCta}
                </button>
                <button type="button" onClick={() => setExitOpen(false)}
                  className="mt-3 text-[12px] font-bold text-[#1A0F2E]/45 hover:text-[#1A0F2E]/70 transition-colors">
                  {t.exitNo}
                </button>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* ═══ MODALE LÉGALE ═══ */}
      <AnimatePresence>
        {legal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] bg-[#1A0F2E]/45" onClick={() => setLegal(null)} />
            <div className="fixed inset-0 z-[71] flex items-center justify-center p-4 overflow-y-auto scrollbar-none"
              onClick={(e) => { if (e.target === e.currentTarget) setLegal(null); }}>
              <motion.div role="dialog" aria-modal="true"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                className="relative w-full max-w-lg bg-white border rounded-2xl p-6 shadow-2xl my-auto max-h-[82vh] overflow-y-auto scrollbar-none"
                style={{ borderColor: BORDER }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[18px] font-extrabold">{legal === "cgu" ? t.cgu : t.privacy}</h3>
                  <button type="button" onClick={() => setLegal(null)}
                    className="w-9 h-9 rounded-full hover:bg-[#1A0F2E]/5 flex items-center justify-center focus-ring" aria-label={t.close}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[13px] leading-relaxed text-[#1A0F2E]/65">{legalCopy[legal]}</p>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      <AudioDock isPlaying={isIntroPlaying} volume={audioVolume} onToggle={handleToggleIntroAudio}
        isRTL={isRTL} hidden={overlayOpen} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org", "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question", name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }).replace(/</g, "\\u003c"),
      }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org", "@type": "HowTo",
          name: isRTL ? "كيف تحوّل النص إلى صوت بالدارجة" : "Comment convertir un texte en voix darija",
          description: isRTL ? "دليل خطوة بخطوة" : "Guide étape par étape pour générer une voix off en darija",
          totalTime: "PT1M",
          step: journeySteps.map((s, i) => ({
            "@type": "HowToStep", position: i + 1, name: s.t, text: s.d,
          })),
        }).replace(/</g, "\\u003c"),
      }} />
    </div>
  );
};

export default LandingPage;
