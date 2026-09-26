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
  Wallet,
  Infinity as InfinityIcon,
  Crown,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface LandingPageProps {
  onLoginClick: () => void;
  onSigninClick: () => void;
  language: "fr" | "ar";
  setLanguage: (lang: "fr" | "ar") => void;
}

/* ═══════════ PALETTE ═══════════ */
const PAPER = "#FFFFFF";
const INK = "#1A0F2E";
const PURPLE = "#6B2DBC";
const PURPLE_DARK = "#4A1E87";
const PURPLE_SOFT = "#F0E8FA";
const PURPLE_LIGHT = "#B79BEA";
const CLAY = "#C2452A";
const BORDER = "#E8E6EC";
const HERO_BLACK = "#0B0713";

const HERO_PHOTO_URL = "/hero-luxe.jpg";
const INTRO_AUDIO_URL =
  "https://res.cloudinary.com/gz65ybug/video/upload/v1789055318/Generated_Audio_September_10_2026_-_4_29PM.wav";
const LOGO =
  "https://i.ibb.co/nqShkPNP/68126702-75e5-4de6-9b53-e51800b05e4a.jpg";
const AR_STACK = "'Cairo', sans-serif";
const FR_STACK = "'Inter', sans-serif";
const FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Inter:wght@400;500;600;700;800&display=swap";

/* ═══════════ STYLES GLOBAUX (réduits) ═══════════ */
const GlobalStyles = () => (
  <style>{`
    html { scroll-behavior: smooth; -webkit-font-smoothing: antialiased; }
    body { background: ${PAPER}; color: ${INK}; margin: 0; }
    #sawtify-landing { overflow-x: clip; }
    #sawtify-landing * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    #sawtify-landing ::selection { background: ${PURPLE}; color: #fff; }
    #sawtify-landing .scrollbar-none { scrollbar-width: none; -ms-overflow-style: none; }
    #sawtify-landing .scrollbar-none::-webkit-scrollbar { display: none; }
    @keyframes wave { 0%, 100% { transform: scaleY(0.3); } 50% { transform: scaleY(1); } }
    #sawtify-landing .wave-bar { animation: wave 1.3s ease-in-out infinite; transform-origin: bottom; }
    #sawtify-landing .focus-ring:focus-visible { outline: 2px solid ${PURPLE}; outline-offset: 3px; border-radius: 10px; }
    @keyframes spin-slow { to { transform: rotate(360deg); } }
    #sawtify-landing .orb-core { animation: spin-slow 14s linear infinite; }
    @media (prefers-reduced-motion: reduce) {
      html { scroll-behavior: auto; }
      *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
    }
  `}</style>
);

/* ═══════════ PRIMITIVES ═══════════ */
const Logo = ({ size = 38, dark }: { size?: number; dark?: boolean }) => {
  const [err, setErr] = useState(false);
  return (
    <div className="flex items-center gap-2.5 select-none">
      <div className="rounded-xl overflow-hidden shrink-0" style={{ width: size, height: size, boxShadow: "0 3px 12px rgba(107,45,188,0.35)" }}>
        {!err ? (
          <img src={LOGO} alt="Sawtify" width={size} height={size} decoding="async" onError={() => setErr(true)} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-bold text-white" style={{ background: PURPLE, fontSize: size * 0.5 }}>S</div>
        )}
      </div>
      <span className="font-bold text-[19px] tracking-tight" style={{ color: dark ? "#fff" : INK }}>Sawtify</span>
    </div>
  );
};

const Num = ({ children }: { children: React.ReactNode }) => (
  <span dir="ltr" style={{ unicodeBidi: "isolate" }} className="inline-block tabular-nums">{children}</span>
);

// Petit repère de section : couleur + taille, sans majuscules trackées ni police mono.
const Label = ({ children, color = "rgba(26,15,46,0.55)" }: { children: React.ReactNode; color?: string }) => (
  <span className="text-[12.5px] font-semibold" style={{ color }}>{children}</span>
);

const SectionHead = ({ eyebrow, title, sub, center = false, ar }: {
  eyebrow?: string; title: string; sub?: string; center?: boolean; ar: boolean;
}) => (
  <div className={center ? "text-center mx-auto max-w-2xl" : "max-w-2xl"}>
    {eyebrow && <Label>{eyebrow}</Label>}
    <h2 className="mt-2 text-[clamp(1.9rem,4.2vw,3rem)] leading-[1.1] tracking-[-0.02em] font-extrabold" style={{ color: INK }}>
      {title}
    </h2>
    {sub && <p className="mt-4 text-[14px] text-[#1A0F2E]/65 leading-relaxed">{sub}</p>}
  </div>
);

const Waveform = React.memo(function Waveform({ color, playing, bars = 28 }: { color: string; playing: boolean; bars?: number }) {
  return (
    <div className="flex items-end justify-center gap-[3px] h-16 w-full" dir="ltr" aria-hidden>
      {Array.from({ length: bars }).map((_, i) => {
        const h = 18 + Math.abs(Math.sin(i * 0.55) * Math.cos(i * 0.31)) * 82;
        return (
          <span key={i} className={`flex-1 rounded-full origin-bottom ${playing ? "wave-bar" : ""}`}
            style={{ height: `${h}%`, maxWidth: 4, background: i % 6 === 0 ? color : "rgba(26,15,46,0.14)", opacity: playing ? 1 : 0.5, animationDelay: `${(i % 10) * 0.1}s` }} />
        );
      })}
    </div>
  );
});

/* ═══════════ 🔊 LECTEUR AUDIO UNIFIÉ ═══════════
   Un seul <audio>, une seule analyse de fréquence — sert à la fois pour
   l'intro et pour chaque échantillon de voix. Remplace les deux systèmes
   séparés qui existaient avant (moins de code, moins de bugs de sync). */
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
      if (a.duration > 0) { setProgress(a.currentTime / a.duration); setElapsed(a.currentTime); setDuration(a.duration); }
    });
    a.addEventListener("ended", () => { setPlayingId(null); setProgress(0); setElapsed(0); setLevel(0); });
    audioRef.current = a;
    return a;
  }, []);

  const tick = useCallback(() => {
    const a = audioRef.current;
    if (!a || a.paused) { setLevel(0); return; }
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
      // Pas grave : le niveau retombe sur l'onde synthétique dans tick().
    }
  }, []);

  const play = useCallback((id: string, url?: string) => {
    if (!url) return;
    const a = ensure();
    a.pause();
    a.src = url;
    a.playbackRate = rateRef.current;
    initAnalyser(a);
    a.play().then(() => {
      setPlayingId(id);
      if (ctxRef.current?.state === "suspended") ctxRef.current.resume().catch(() => {});
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(tick);
    }).catch(() => setPlayingId(null));
  }, [ensure, initAnalyser, tick]);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    setPlayingId(null); setProgress(0); setElapsed(0); setLevel(0);
  }, []);

  const toggle = useCallback((id: string, url?: string) => {
    if (playingId === id) stop(); else play(id, url);
  }, [playingId, play, stop]);

  const setSpeed = useCallback((s: number) => {
    rateRef.current = s;
    if (audioRef.current) audioRef.current.playbackRate = s;
  }, []);

  useEffect(() => () => {
    audioRef.current?.pause();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    ctxRef.current?.close().catch(() => {});
  }, []);

  return { playingId, progress, elapsed, duration, level, play, stop, toggle, setSpeed };
}

/* ═══════════ 🔮 BOULE DE VOIX (style ElevenLabs) ═══════════ */
const VoiceOrb = ({ playing, level, onTap }: { playing: boolean; level: number; onTap: () => void }) => {
  const scale = playing ? 1 + level * 0.14 : 1;
  const barCount = 20;
  return (
    <button type="button" onClick={onTap}
      aria-label={playing ? "Pause" : "Play"}
      className="relative w-[190px] h-[190px] sm:w-[240px] sm:h-[240px] mx-auto block focus-ring rounded-full">
      <motion.div className="absolute inset-0 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${PURPLE} 0%, transparent 70%)`, filter: "blur(28px)" }}
        animate={{ opacity: playing ? 0.35 + level * 0.5 : 0.25, scale: playing ? [1, 1.06, 1] : [1, 1.02, 1] }}
        transition={{ duration: playing ? 1.6 : 3.2, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className="orb-core absolute inset-[16%] rounded-full"
        style={{ background: `conic-gradient(from 0deg, ${PURPLE_LIGHT}, ${PURPLE}, ${PURPLE_DARK}, ${PURPLE_LIGHT})`, boxShadow: `0 0 50px rgba(107,45,188,0.35)` }}
        animate={{ scale }} transition={{ duration: 0.15 }} />
      <div className="absolute inset-[16%] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.35), transparent 60%)" }} />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {playing
          ? <Pause className="w-7 h-7 text-white fill-current" />
          : <Play className="w-7 h-7 text-white fill-current translate-x-[2px]" />}
      </div>
      {playing && Array.from({ length: barCount }).map((_, i) => {
        const angle = (i / barCount) * 360;
        const len = 6 + Math.sin(i * 1.7 + level * 10) * level * 10;
        return (
          <span key={i} aria-hidden className="absolute rounded-full bg-white/60"
            style={{ width: 2.5, height: 8 + Math.max(0, len), top: "50%", left: "50%",
              transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-92px)`, transition: "height 0.1s ease-out" }} />
        );
      })}
    </button>
  );
};

/* ═══════════ DONNÉES ═══════════ */
type VoiceCard = {
  id: string; nameFr: string; nameAr: string; tagFr: string; tagAr: string;
  location: string; rating?: number; reviews?: number; color: string;
  sampleFr: string; sampleAr: string; audioUrl?: string;
};

const VOICES: VoiceCard[] = [
  { id: "amine", nameFr: "Amine", nameAr: "أمين", tagFr: "Voix commerciale", tagAr: "صوت تجاري", location: "Alger", rating: 4.9, reviews: 234, color: "#6B2DBC",
    sampleFr: "Salam 3likoum khawti! M3a Sawtify, nassek yewli sawt tabi3i, wadeh, wahli l i3lanat.", sampleAr: "سلام عليكم خاوتي! مع صوتيفي، نصوصكم تولي صوت طبيعي وواضح.",
    audioUrl: "https://res.cloudinary.com/gz65ybug/video/upload/v1789139928/AMINE.mp3" },
  { id: "yasmine", nameFr: "Yasmine", nameAr: "ياسمين", tagFr: "Voix publicitaire", tagAr: "صوت إعلاني", location: "Oran", rating: 4.8, reviews: 189, color: "#C13B5E",
    sampleFr: "Marhba bikom kamlin! Tawsil 58 wilaya, payment 3and l istlam.", sampleAr: "مرحبا بيكم كاملين! التوصيل لـ 58 ولاية والدفع عند الاستلام.",
    audioUrl: "https://res.cloudinary.com/gz65ybug/video/upload/v1789139890/YASMINE.mp3" },
  { id: "khalid", nameFr: "Khalid", nameAr: "خالد", tagFr: "Voix documentaire", tagAr: "صوت وثائقي", location: "Constantine", rating: 5.0, reviews: 312, color: "#2C5E9E",
    sampleFr: "Nqeddmlkom lyom notq mawzoun w dqi9, l watha2iqiyat w contenu rassmi.", sampleAr: "نقدّم ليكم اليوم نطق موزون ودقيق للوثائقيات.",
    audioUrl: "https://res.cloudinary.com/gz65ybug/video/upload/v1789139847/KHALED.wav" },
  { id: "layla", nameFr: "Layla", nameAr: "ليلى", tagFr: "Voix social media", tagAr: "صوت سوشيال", location: "Annaba", rating: 4.9, reviews: 156, color: "#D97706",
    sampleFr: "Salut l'équipe ! Une voix vive, parfaite pour Reels et TikTok.", sampleAr: "واش راكم ليكيب؟ صوت حيوي هايل للريلز وتيك توك." },
  { id: "yacine", nameFr: "Yacine", nameAr: "ياسين", tagFr: "Voix éducative", tagAr: "صوت تعليمي", location: "Sétif", rating: 4.7, reviews: 98, color: "#0F766E",
    sampleFr: "Dans cette leçon, on avance pas à pas. Une voix claire pour l'e-learning.", sampleAr: "في هاد الدرس نمشيو خطوة بخطوة. صوت واضح للشروحات." },
  { id: "nadia", nameFr: "Nadia", nameAr: "نادية", tagFr: "Voix podcast", tagAr: "صوت بودكاست", location: "Tlemcen", rating: 4.9, reviews: 267, color: "#6B7A34",
    sampleFr: "Bienvenue dans cet épisode. Une voix chaleureuse pour vos podcasts.", sampleAr: "مرحبا بيكم في هاد الحلقة. صوت دافئ للبودكاست." },
];
const LANDING_IDS = ["amine", "yasmine", "khalid"] as const;
const LANDING_VOICES = VOICES.filter((v) => (LANDING_IDS as readonly string[]).includes(v.id));
const HIDDEN_VOICES = VOICES.filter((v) => !(LANDING_IDS as readonly string[]).includes(v.id));

const COST_STEPS = [
  { sec: 60, pts: 20, labelFr: "0–60 s", labelAr: "0–60 ث" },
  { sec: 120, pts: 30, labelFr: "2 min", labelAr: "2 دق" },
  { sec: 180, pts: 40, labelFr: "3 min", labelAr: "3 دق" },
  { sec: 240, pts: 50, labelFr: "4 min", labelAr: "4 دق" },
];
const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const SPEEDS = [0.75, 1, 1.25, 1.5] as const;

export const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick, onSigninClick, language, setLanguage }) => {
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
    try { saved = window.localStorage.getItem("sawtify_lang"); } catch {}
    const target = saved === "fr" || saved === "ar" ? saved : "ar";
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
      setMenuOpen(false); setListenVoice(null); setLegal(null);
      player.stop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [player]);

  const goSignup = useCallback(() => { player.stop(); onSigninClick(); }, [player, onSigninClick]);

  const t = useMemo(() => ({
    skip: isRTL ? "تخطَّ إلى المحتوى" : "Aller au contenu",
    navVoices: isRTL ? "الأصوات" : "Voix",
    navHow: isRTL ? "كيفاش يخدم" : "Comment ça marche",
    navPricing: isRTL ? "الأسعار" : "Tarifs",
    navFaq: isRTL ? "أسئلة" : "FAQ",
    navContact: isRTL ? "تواصل" : "Contact",
    signin: isRTL ? "دخول" : "Connexion",
    start: isRTL ? "ابدأ دوك" : "Commencer",
    tryFree: isRTL ? "جرّب دوك — بالمجان" : "Essayer gratuitement",
    pause: isRTL ? "إيقاف" : "Pause",
    heroKicker: isRTL ? "استوديو الدارجة الجزائرية" : "Studio darija algérienne",
    heroTitle1: isRTL ? "صوتْ" : "Une voix",
    heroTitle2: isRTL ? "كي بنادم." : "presque humaine.",
    heroSub: isRTL
      ? "نصّك بالدارجة يولي صوت طبيعي في 30 ثانية. 50 نقطة هدية وقت التسجيل، بلا بطاقة."
      : "Votre texte en darija devient une voix naturelle en 30 secondes. 50 points offerts à l'inscription, sans carte.",
    studioPrice: isRTL ? "في الستوديو" : "En studio",
    priceOld: isRTL ? "8 000 – 20 000 دج" : "8 000 à 20 000 DZD",
    priceNow: isRTL ? "من 500 دج" : "dès 500 DZD",
    check1: isRTL ? "الدفع بالذهبية أو CIB" : "Paiement Edahabia / CIB",
    check2: isRTL ? "بلا علامة مائية" : "Sans filigrane",
    check3: isRTL ? "النقاط ما تنتهيش" : "Points à vie",
    tapOrb: isRTL ? "دوس باش تسمع" : "Touchez pour écouter",
    compareTitle: isRTL ? "الستوديو ضد صوتيفي." : "Studio classique vs Sawtify.",
    compareSub: isRTL ? "علاش تدفع 20 000 دج وتسنّى أسبوع؟" : "Pourquoi payer 20 000 DZD et attendre une semaine ?",
    compareOld: isRTL ? "الطريقة القديمة" : "Ancienne méthode",
    saveUp: isRTL ? "توفّر حتى" : "Économisez jusqu'à",
    guaranteeTitle: isRTL ? "ضمان صوتيفي: ماكش تخسر والو." : "Garantie Sawtify : zéro risque.",
    guaranteeBody: isRTL ? "ما عجبكش الصوت؟ نرجعو لك نقاطك، بلا أسئلة." : "La voix ne vous plaît pas ? Vos points sont recrédités, sans question.",
    popularTitle: isRTL ? "30 صوتاً. هنا غي 3." : "30 voix. Ici, seulement 3.",
    popularSub: isRTL ? "الباقي تسمعو في الاستوديو." : "Les autres s'écoutent dans le studio.",
    listenInStudio: isRTL ? "اسمع البداية" : "Écouter le début",
    listenBody: isRTL ? "هذي غير أول جملة. الصوت الكامل في الاستوديو." : "Ce n'est que la première phrase. La voix entière est dans le studio.",
    journeyTitle: isRTL ? "أربع خطوات. والصوت يخرج." : "Quatre gestes. La voix sort.",
    journeySub: isRTL ? "بلا كابينة. بلا ميكرو. بلا انتظار." : "Pas de cabine. Pas de micro. Pas d'attente.",
    useTitle: isRTL ? "ملي يتكلّم، ما يعودش نص." : "Quand ça parle, ce n'est plus du texte.",
    costTitle: isRTL ? "أرخص مما تتخيّل." : "Moins que vous ne croyez.",
    costSub: isRTL ? "20 نقطة لأول 60 ثانية، وزيد 10 لكل دقيقة." : "20 points pour les 60 premières secondes, puis +10 par minute.",
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
    ctaSub: isRTL ? "50 نقطة بالمجان. بلا بطاقة." : "50 points offerts. Sans carte.",
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
    { target: "#voices", label: t.navVoices },
    { target: "#process", label: t.navHow },
    { target: "#pricing", label: t.navPricing },
    { target: "#faq", label: t.navFaq },
    { target: "#contact", label: t.navContact },
  ], [t]);

  const featured = VOICES.find((v) => v.id === featuredId) || VOICES[0];
  const heroPlaying = player.playingId === "intro" || player.playingId === featured.id;

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
    setFeaturedId(LANDING_VOICES[(i + dir + LANDING_VOICES.length) % LANDING_VOICES.length].id);
  };
  const applySpeed = (s: number) => { setSpeed(s); player.setSpeed(s); };

  const journeySteps = useMemo(() => [
    { n: "1", t: isRTL ? "اكتب" : "Écrire", d: isRTL ? "ألصق نصّك بالدارجة." : "Collez votre texte en darija." },
    { n: "2", t: isRTL ? "اختر" : "Choisir", d: isRTL ? "30 صوتاً. هنا نعرضو غي 3." : "30 voix. Ici, on n'en montre que 3." },
    { n: "3", t: isRTL ? "اضبط" : "Régler", d: isRTL ? "السرعة والنبرة." : "Vitesse et timbre." },
    { n: "4", t: isRTL ? "حمّل" : "Télécharger", d: isRTL ? "MP3 أو WAV. بلا علامة مائية." : "MP3 ou WAV. Sans filigrane." },
  ], [isRTL]);

  const uses = useMemo(() => [
    { icon: ShoppingBag, t: isRTL ? "تجارة إلكترونية" : "E-commerce", d: isRTL ? "سبوت وتوصيل 58 ولاية." : "Spots, livraison 58 wilayas." },
    { icon: Clapperboard, t: isRTL ? "ريلز وتيك توك" : "Reels & TikTok", d: isRTL ? "صوت قصير وحيوي." : "Voix courte et vive." },
    { icon: Mic2, t: isRTL ? "بودكاست ويوتيوب" : "Podcast & YouTube", d: isRTL ? "سرد طويل ونبرة ثابتة." : "Narration longue et stable." },
    { icon: Phone, t: isRTL ? "موزّع هاتفي" : "Standard", d: isRTL ? "خدمة الزبائن." : "Service client." },
  ], [isRTL]);

  const metrics = useMemo(() => [
    { n: "9", l: isRTL ? "صوت" : "voix" },
    { n: "1 200+", l: isRTL ? "مستخدم" : "créateurs" },
    { n: "50K+", l: isRTL ? "صوت مُولَّد" : "voix générées" },
    { n: "99%", l: isRTL ? "ما يفرّقوش" : "indiscernable" },
  ], [isRTL]);

  const testimonials = useMemo(() => isRTL ? [
    { q: "جرّبت 5 منصات قبل صوتيفي. هنا الصوت يبان بنادم بصح.", n: "أمين ب.", r: "صانع محتوى، الجزائر" },
    { q: "خدمت بيه للإعلانات التجارية. نتيجة احترافية بلا ما نحتاج ستوديو.", n: "ياسمين ق.", r: "وكالة إشهار، وهران" },
    { q: "أحسن صوت جزائري سمعتو. طبيعي 100٪ والدفع بالذهبية ساهل.", n: "خالد م.", r: "تاجر إلكتروني، قسنطينة" },
  ] : [
    { q: "J'ai testé 5 plateformes avant Sawtify. Ici, la voix sonne vraiment humaine.", n: "Amine B.", r: "Créateur, Alger" },
    { q: "Utilisé pour mes pubs. Un rendu pro, sans studio.", n: "Yasmine K.", r: "Agence pub, Oran" },
    { q: "La meilleure voix algérienne que j'ai entendue. Le paiement Edahabia est simple.", n: "Khaled M.", r: "E-commerçant, Constantine" },
  ], [isRTL]);

  useEffect(() => {
    const id = setInterval(() => setActiveTesti((p) => (p + 1) % testimonials.length), 6500);
    return () => clearInterval(id);
  }, [testimonials.length]);

  const compareRows = useMemo(() => isRTL ? [
    { label: "الوقت", old: "3 إلى 7 أيام", now: "30 ثانية" },
    { label: "التكلفة", old: "8 000 – 20 000 دج", now: "من 500 دج" },
    { label: "الميكرو والستوديو", old: "لازم", now: "غير متصفّحك" },
    { label: "اللغة", old: "فرنسية أو فصحى", now: "الدارجة الجزائرية" },
  ] : [
    { label: "Délai", old: "3 à 7 jours", now: "30 secondes" },
    { label: "Coût", old: "8 000 à 20 000 DZD", now: "dès 500 DZD" },
    { label: "Micro & studio", old: "Obligatoires", now: "Juste un navigateur" },
    { label: "Langue", old: "Français / littéraire", now: "Darija algérienne" },
  ], [isRTL]);

  const pricing = useMemo(() => [
    { pts: "100", price: "500", desc: isRTL ? "للتجربة الحرة." : "Pour découvrir la plateforme." },
    { pts: "220", price: "1 000", featured: true, desc: isRTL ? "الأكثر طلباً." : "Le choix le plus populaire." },
    { pts: "600", price: "2 500", desc: isRTL ? "لمن يخدم يومياً." : "Pour un usage régulier." },
    { pts: "1 350", price: "5 000", desc: isRTL ? "للمحترفين — حجم كبير." : "Pour les professionnels." },
  ], [isRTL]);

  const faqs = useMemo(() => isRTL ? [
    { q: "واش إذا ما عجبنيش الصوت؟", a: "ماكش تخسر والو. النقاط ترجع لبالاك." },
    { q: "هل الصوت يبان كي بنادم؟", a: "نعم. دارجة حيّة، 24 kHz. 99٪ ما يفرّقوش." },
    { q: "نقدر نستعملو في الإعلان؟", a: "نعم، استعمال تجاري كامل بلا علامة مائية." },
    { q: "كيفاش تخدم النقاط؟", a: "20 نقطة لـ 0–60 ثانية، وزيد 10 لكل دقيقة. ما تنتهيش." },
    { q: "الذهبية و CIB؟", a: "نعم، عبر SATIM، بالدينار." },
  ] : [
    { q: "Et si la voix ne me plaît pas ?", a: "Zéro risque : vos points sont recrédités." },
    { q: "La voix parle comme quelqu'un ?", a: "Oui, darija vivante, 24 kHz. 99 % ne font pas la différence." },
    { q: "Puis-je l'utiliser en pub ?", a: "Oui, usage commercial complet, sans filigrane." },
    { q: "Comment marchent les points ?", a: "20 points pour 0–60 s, puis +10/minute. Ils n'expirent pas." },
    { q: "Edahabia et CIB ?", a: "Oui, via SATIM, en dinars." },
  ], [isRTL]);

  const trust = useMemo(() => [
    { k: "Edahabia", v: isRTL ? "بريد الجزائر" : "La Poste" },
    { k: "CIB", v: isRTL ? "البنوك" : "Banques" },
    { k: "24 kHz", v: isRTL ? "جودة استوديو" : "Qualité studio" },
    { k: "MP3 · WAV", v: isRTL ? "بلا علامة مائية" : "Sans filigrane" },
  ], [isRTL]);

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
  const ArrowIcon = ({ className = "w-4 h-4" }: { className?: string }) => (isRTL ? <ArrowLeft className={className} /> : <ArrowRight className={className} />);
  const legalCopy = {
    cgu: isRTL
      ? "شروط الاستخدام: صوتيفي منصة جزائرية لتحويل النص إلى صوت بالدارجة. الحساب شخصي. النقاط لا تنتهي صلاحيتها. الدفع عبر SATIM."
      : "Conditions d'utilisation : Sawtify est une plateforme algérienne de conversion texte → voix en darija. Le compte est personnel. Les points n'expirent pas. Paiement via SATIM.",
    privacy: isRTL
      ? "الخصوصية: نحتفظ بالحد الأدنى من البيانات لتشغيل الحساب. لا نبيع بياناتك. صوتيفي لا يخزّن أرقام البطاقات."
      : "Confidentialité : nous conservons le minimum de données pour faire fonctionner le compte. Nous ne vendons pas vos données. Aucun numéro de carte stocké.",
  };

  return (
    <div id="sawtify-landing" dir={isRTL ? "rtl" : "ltr"} className="min-h-screen relative" style={{ fontFamily: ar, color: INK }}>
      <GlobalStyles />
      <Helmet>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONTS_URL} />
        {isRTL ? (
          <>
            <title>صوتيفي — أول مولّد أصوات بالذكاء الاصطناعي للدارجة الجزائرية</title>
            <meta name="description" content="صوتيفي: أول منصة تحويل النص إلى صوت متخصصة في الدارجة الجزائرية. دفع محلي CIB و Edahabia." />
            <html lang="ar" dir="rtl" />
          </>
        ) : (
          <>
            <title>Sawtify — Voix IA Darija Algérienne | Text-to-Speech</title>
            <meta name="description" content="Premier générateur de voix IA en darija algérienne. Paiement CIB & Edahabia." />
            <html lang="fr" dir="ltr" />
          </>
        )}
        <link rel="canonical" href="https://sawtify.space/" />
      </Helmet>

      <a href="#home" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-[90] focus:px-4 focus:py-2 focus:rounded-full focus:font-bold focus:text-sm text-white" style={{ background: PURPLE }}>{t.skip}</a>

      {/* HEADER */}
      <header className={`fixed inset-x-0 z-[60] transition-all duration-300 ${scrolled ? "py-2" : "py-1"}`}
        style={{ background: scrolled ? "linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(255,255,255,0.8) 55%, transparent 100%)" : "transparent" }}>
        <div className="mx-auto max-w-[1280px] px-5 sm:px-6 h-16 flex items-center justify-between">
          <a href="#home" onClick={(e) => { e.preventDefault(); smoothTo("#home"); }} className="focus-ring flex items-center gap-2.5">
            <Logo size={38} dark={!scrolled} />
          </a>
          <nav className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-7 text-[13px] font-semibold"
            style={{ color: scrolled ? "rgba(26,15,46,0.62)" : "rgba(255,255,255,0.82)" }}>
            {nav.map((l) => (
              <a key={l.target} href={l.target} onClick={(e) => { e.preventDefault(); smoothTo(l.target); }} className="transition-opacity hover:opacity-55 focus-ring">{l.label}</a>
            ))}
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button type="button" onClick={switchLang} className="w-10 h-10 rounded-full text-[12px] font-bold transition hover:opacity-60 focus-ring"
              style={{ color: scrolled ? "rgba(26,15,46,0.62)" : "rgba(255,255,255,0.82)" }} aria-label={isRTL ? "التبديل إلى الفرنسية" : "Switch to Arabic"}>{t.switchLang}</button>
            <button type="button" onClick={onLoginClick} className="hidden md:block text-[13px] font-semibold px-3 transition hover:opacity-60 focus-ring"
              style={{ color: scrolled ? "rgba(26,15,46,0.62)" : "rgba(255,255,255,0.82)" }}>{t.signin}</button>
            <button type="button" onClick={goSignup} className="h-10 px-4 sm:px-5 rounded-full text-[13px] sm:text-[14px] font-bold focus-ring transition active:scale-95"
              style={{ background: scrolled ? INK : "#FFFFFF", color: scrolled ? "#FFFFFF" : PURPLE, boxShadow: scrolled ? "none" : "0 10px 26px -14px rgba(0,0,0,0.65)" }}>{t.start}</button>
            <button type="button" onClick={() => setMenuOpen(true)} aria-label={t.open}
              className="lg:hidden w-10 h-10 rounded-full flex items-center justify-center transition hover:opacity-70 focus-ring" style={{ color: scrolled ? INK : "#fff" }}>
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenuOpen(false)} className="fixed inset-0 z-[55] bg-[#1A0F2E]/40 lg:hidden" />
            <motion.div initial={{ x: isRTL ? "-100%" : "100%" }} animate={{ x: 0 }} exit={{ x: isRTL ? "-100%" : "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 280 }}
              className="fixed inset-y-0 end-0 z-[60] w-[85%] max-w-sm bg-[#1A0F2E] text-white lg:hidden flex flex-col shadow-2xl">
              <div className="flex items-center justify-between px-5 h-16 border-b border-white/20">
                <Logo size={34} dark />
                <button type="button" onClick={() => setMenuOpen(false)} className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center focus-ring" aria-label={t.close}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex-1 px-5 py-6 flex flex-col">
                {nav.map((l) => (
                  <a key={l.target} href={l.target} onClick={(e) => { e.preventDefault(); smoothTo(l.target); }}
                    className="py-4 text-[18px] font-bold text-white hover:text-white/80 border-b border-white/15 focus-ring">{l.label}</a>
                ))}
                <button type="button" onClick={() => { setMenuOpen(false); onLoginClick(); }} className="mt-4 py-3 text-start text-[16px] font-semibold text-white/90 hover:text-white">{t.signin}</button>
              </nav>
              <div className="p-5" style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}>
                <button type="button" onClick={() => { setMenuOpen(false); goSignup(); }} className="w-full h-12 rounded-full font-bold bg-white text-[#6B2DBC] hover:bg-white/90 transition shadow-lg">{t.start}</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="relative z-[1]">
        {/* HERO */}
        <section id="home" className="relative pb-14 sm:pb-20 overflow-hidden"
          style={{ color: PAPER, background: HERO_BLACK, paddingTop: "calc(clamp(88px, 16vh, 124px) + env(safe-area-inset-top, 0px))" }}>
          <div className="absolute inset-0" aria-hidden>
            <img src={HERO_PHOTO_URL} alt="" decoding="async" className="absolute inset-0 w-full h-full object-cover" style={{ filter: "grayscale(1) contrast(1.06) brightness(0.85)" }} />
            <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(11,7,19,0.7) 0%, rgba(11,7,19,0.82) 50%, rgba(11,7,19,0.97) 100%)" }} />
          </div>

          <div className="relative z-[1] mx-auto max-w-[1280px] px-5 sm:px-6">
            <div className="max-w-2xl mx-auto text-center">
              <Label color="rgba(255,255,255,0.75)">{t.heroKicker}</Label>
              <h1 className="mt-3 text-[clamp(2.4rem,7vw,4.6rem)] leading-[1.05] tracking-[-0.02em] font-extrabold" style={{ color: "#fff" }}>
                {t.heroTitle1} <span style={{ color: PURPLE_LIGHT }}>{t.heroTitle2}</span>
              </h1>
              <p className="mt-6 text-[15px] sm:text-[16px] text-white/85 max-w-xl mx-auto leading-relaxed">{t.heroSub}</p>

              <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
                <button type="button" onClick={goSignup} className="h-12 px-7 rounded-full text-[14px] font-bold text-white focus-ring transition hover:brightness-110"
                  style={{ background: PURPLE, boxShadow: "0 14px 32px -14px rgba(107,45,188,0.8)" }}>{t.tryFree}</button>
              </div>

              <div className="mt-6 inline-flex items-center justify-center gap-2.5 flex-wrap rounded-full px-4 py-2"
                style={{ background: "rgba(11,7,19,0.5)", border: "1px solid rgba(183,155,234,0.4)" }}>
                <span className="text-[11.5px] font-semibold text-white/65">{t.studioPrice}</span>
                <span className="text-[12.5px] font-bold line-through text-white/45">{t.priceOld}</span>
                <ArrowIcon className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[13px] font-extrabold text-white">{t.priceNow}</span>
              </div>

              <div className="mt-4 flex items-center justify-center gap-3 sm:gap-5 flex-wrap">
                {[t.check1, t.check2, t.check3].map((c) => (
                  <span key={c} className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-white/80">
                    <Check className="w-3.5 h-3.5 shrink-0" style={{ color: PURPLE_LIGHT }} /> {c}
                  </span>
                ))}
              </div>
            </div>

            {/* BOULE DE VOIX */}
            <div className="mt-12 flex flex-col items-center">
              <VoiceOrb playing={heroPlaying} level={player.level} onTap={() => (heroPlaying ? player.stop() : player.play("intro", INTRO_AUDIO_URL))} />
              <p className="mt-5 text-[12.5px] font-semibold text-white/60">{t.tapOrb}</p>

              <div className="mt-6 w-full max-w-sm">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[13px] font-bold text-white truncate">{isRTL ? featured.nameAr : featured.nameFr}</span>
                  <span className="text-[11.5px] text-white/50 truncate">{isRTL ? featured.tagAr : featured.tagFr} · {featured.location}</span>
                </div>
                <div dir="ltr" className="flex items-center gap-2.5">
                  <span className="text-[11px] text-white/50 w-9 shrink-0 tabular-nums">{fmtTime(player.playingId === featured.id ? player.elapsed : 0)}</span>
                  <div className="relative flex-1 h-1.5 rounded-full overflow-hidden bg-white/15">
                    <div className="absolute inset-y-0 start-0 rounded-full" style={{ width: `${(player.playingId === featured.id ? player.progress : 0) * 100}%`, background: PURPLE_LIGHT, transition: "width 0.2s linear" }} />
                  </div>
                  <span className="text-[11px] text-white/50 w-9 shrink-0 text-end tabular-nums">{fmtTime(player.playingId === featured.id ? player.duration : 0)}</span>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <div dir="ltr" className="flex items-center gap-2">
                    <button type="button" onClick={() => stepVoice(-1)} aria-label={isRTL ? "الصوت السابق" : "Voix précédente"}
                      className="w-9 h-9 rounded-full border border-white/25 text-white flex items-center justify-center focus-ring hover:bg-white/10 transition"><SkipBack className="w-4 h-4" /></button>
                    <button type="button" onClick={() => player.toggle(featured.id, featured.audioUrl)}
                      className="w-9 h-9 rounded-full border border-white/25 text-white flex items-center justify-center focus-ring hover:bg-white/10 transition">
                      {player.playingId === featured.id ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current translate-x-[1px]" />}
                    </button>
                    <button type="button" onClick={() => stepVoice(1)} aria-label={isRTL ? "الصوت التالي" : "Voix suivante"}
                      className="w-9 h-9 rounded-full border border-white/25 text-white flex items-center justify-center focus-ring hover:bg-white/10 transition"><SkipForward className="w-4 h-4" /></button>
                  </div>
                  <div dir="ltr" className="flex items-center rounded-lg border border-white/25 overflow-hidden">
                    {SPEEDS.map((s) => (
                      <button key={s} type="button" onClick={() => applySpeed(s)} aria-pressed={speed === s}
                        className={`px-2 py-1 text-[11px] font-semibold transition ${speed === s ? "text-white" : "text-white/50 hover:bg-white/10"}`}
                        style={speed === s ? { background: PURPLE } : undefined}>{s}x</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 flex items-center justify-center gap-4 text-[12px] text-white/80 flex-wrap">
              <span className="font-bold"><Num>9</Num> {isRTL ? "أصوات" : "voix"}</span>
              <span>·</span>
              <span><Num>1 200+</Num> {isRTL ? "مستخدم" : "créateurs"}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1"><Star className="w-3 h-3 fill-current" /> <Num>4.9</Num> / <Num>5</Num></span>
            </div>
          </div>
        </section>

        {/* CONFIANCE */}
        <section className="py-6" aria-label={isRTL ? "وسائل الدفع والجودة" : "Paiement et qualité"}>
          <div className="mx-auto max-w-[1280px] px-5 sm:px-6 flex flex-wrap items-center justify-center gap-x-7 gap-y-3">
            {trust.map((p, i) => (
              <span key={p.k} className="flex items-center gap-7">
                <span className="flex flex-col items-center">
                  <span className="text-[14px] font-extrabold tracking-tight">{p.k}</span>
                  <span className="text-[10.5px] text-[#1A0F2E]/45 mt-0.5">{p.v}</span>
                </span>
                {i < trust.length - 1 && <span className="hidden sm:block w-px h-7" style={{ background: BORDER }} aria-hidden />}
              </span>
            ))}
          </div>
        </section>

        {/* COMPARATIF */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
            <SectionHead eyebrow={isRTL ? "الحساب" : "Le calcul"} title={t.compareTitle} sub={t.compareSub} center ar={isRTL} />
            <div className="mt-10 max-w-2xl mx-auto rounded-2xl border bg-white overflow-hidden" style={{ borderColor: BORDER }}>
              <div className="grid grid-cols-[1.1fr_1fr_1fr] text-center" style={{ background: PURPLE_SOFT, borderBottom: `1px solid ${BORDER}` }}>
                <span className="py-3.5" />
                <span className="py-3.5 px-2 text-[10.5px] font-semibold text-[#1A0F2E]/45">{t.compareOld}</span>
                <span className="py-3.5 px-2 text-[10.5px] font-semibold" style={{ color: PURPLE }}>Sawtify</span>
              </div>
              {compareRows.map((r, i) => (
                <div key={r.label} className="grid grid-cols-[1.1fr_1fr_1fr] text-center items-stretch" style={{ borderBottom: i < compareRows.length - 1 ? `1px solid ${BORDER}` : undefined }}>
                  <span className="px-3 py-4 text-[12px] font-bold text-[#1A0F2E]/70 flex items-center justify-start text-start">{r.label}</span>
                  <span className="px-2 py-4 text-[12px] text-[#1A0F2E]/45 flex items-center justify-center gap-1.5"><X className="w-3.5 h-3.5 shrink-0" style={{ color: CLAY }} />{r.old}</span>
                  <span className="px-2 py-4 text-[12px] font-bold flex items-center justify-center gap-1.5" style={{ background: `${PURPLE}0D` }}><Check className="w-3.5 h-3.5 shrink-0" style={{ color: PURPLE }} />{r.now}</span>
                </div>
              ))}
            </div>
            <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-5">
              <div className="text-center">
                <span className="block text-[11.5px] font-semibold text-[#1A0F2E]/50 mb-1">{t.saveUp}</span>
                <div className="text-[28px] leading-none font-extrabold flex items-baseline justify-center gap-1.5" style={{ color: PURPLE }}><Num>15 000</Num><span className="text-[14px]">{isRTL ? "دج" : "DZD"}</span></div>
              </div>
              <button type="button" onClick={goSignup} className="h-11 px-6 rounded-full text-[14px] font-bold text-white focus-ring transition hover:brightness-110" style={{ background: INK }}>{t.tryFree}</button>
            </div>
          </div>
        </section>

        {/* VOIX */}
        <section id="voices" className="py-16 sm:py-20 scroll-mt-[92px]">
          <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
            <SectionHead eyebrow={isRTL ? "المكتبة الصوتية" : "La voixothèque"} title={t.popularTitle} sub={t.popularSub} ar={isRTL} />
            <div className="mt-10 rounded-2xl border bg-white overflow-hidden" style={{ borderColor: BORDER }}>
              {LANDING_VOICES.map((v) => {
                const active = player.playingId === v.id;
                const name = isRTL ? v.nameAr : v.nameFr;
                return (
                  <button key={v.id} type="button" onClick={() => (active ? player.stop() : openListen(v))} aria-pressed={active}
                    className="w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4 text-start transition focus-ring hover:bg-[#6B2DBC]/[0.05]"
                    style={{ borderBottom: `1px solid ${BORDER}`, background: active ? `${v.color}0F` : undefined }}>
                    <span className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-[15px] shrink-0" style={{ background: `${v.color}1A`, color: v.color }}>{name.charAt(0)}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[15px] font-bold truncate">{name}</span>
                      <span className="block text-[12px] text-[#1A0F2E]/50 truncate">{isRTL ? v.tagAr : v.tagFr} · {v.location} · <Num>{v.rating}</Num> ({v.reviews})</span>
                    </span>
                    <span className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: active ? v.color : "rgba(26,15,46,0.8)" }}>
                      {active ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current translate-x-[1px]" />}
                    </span>
                  </button>
                );
              })}
              {HIDDEN_VOICES.map((v) => {
                const name = isRTL ? v.nameAr : v.nameFr;
                return (
                  <button key={v.id} type="button" onClick={goSignup} aria-label={t.moreVoices}
                    className="w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4 text-start transition focus-ring hover:bg-[#6B2DBC]/[0.05]"
                    style={{ borderTop: `1px dashed ${BORDER}` }}>
                    <span className="w-10 h-10 shrink-0 flex items-center justify-center"><Lock className="w-4 h-4 text-[#1A0F2E]/30" /></span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[15px] font-bold truncate select-none" style={{ filter: "blur(5px)" }}>{name}</span>
                      <span className="block text-[12px] text-[#1A0F2E]/40 truncate">{isRTL ? "مقفلة — اسمعها في الاستوديو" : "Verrouillée — dans le studio"}</span>
                    </span>
                    <span className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: PURPLE_SOFT, color: PURPLE }}><ArrowIcon className="w-4 h-4" /></span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* PROCESSUS */}
        <section id="process" className="py-16 sm:py-20 scroll-mt-[92px]">
          <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
            <SectionHead eyebrow={isRTL ? "الطريقة" : "La méthode"} title={t.journeyTitle} sub={t.journeySub} center ar={isRTL} />
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {journeySteps.map((s) => (
                <div key={s.n} className="rounded-2xl border bg-white p-6 h-full" style={{ borderColor: BORDER }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-[14px]" style={{ background: PURPLE, color: "#fff" }}>{s.n}</div>
                  <h3 className="mt-4 text-[17px] font-extrabold mb-1.5">{s.t}</h3>
                  <p className="text-[12.5px] text-[#1A0F2E]/55 leading-relaxed">{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* USAGES */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
            <SectionHead eyebrow={isRTL ? "الاستعمالات" : "Les usages"} title={t.useTitle} ar={isRTL} />
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {uses.map((u) => (
                <div key={u.t} className="rounded-2xl border bg-white p-6 h-full" style={{ borderColor: BORDER }}>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: PURPLE_SOFT, color: PURPLE }}><u.icon className="w-5 h-5" /></div>
                  <h3 className="text-[15px] font-bold mb-1">{u.t}</h3>
                  <p className="text-[12.5px] text-[#1A0F2E]/55 leading-relaxed">{u.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ESTIMATEUR */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-[1280px] px-5 sm:px-6 grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-5">
              <SectionHead eyebrow={isRTL ? "التكلفة" : "Le coût"} title={t.costTitle} sub={t.costSub} ar={isRTL} />
              <ul className="mt-6 space-y-2.5 text-[13px] text-[#1A0F2E]/70">
                {[isRTL ? "50 نقطة هدية وقت التسجيل." : "50 points offerts à l'inscription.", isRTL ? "النقاط بلا تاريخ انتهاء." : "Points valables à vie.", isRTL ? "الدفع بالدينار عبر SATIM." : "Paiement en DZD via SATIM."].map((line) => (
                  <li key={line} className="flex items-start gap-2"><Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: PURPLE }} /><span>{line}</span></li>
                ))}
              </ul>
            </div>
            <div className="lg:col-span-7">
              <div className="rounded-2xl border bg-white p-6 sm:p-8" style={{ borderColor: BORDER }}>
                <span className="block text-[11px] mb-4 text-[#1A0F2E]/45 font-semibold">{isRTL ? "احسب تكلفك" : "Estimateur"}</span>
                <div className="grid grid-cols-4 gap-2 mb-6">
                  {COST_STEPS.map((s, i) => (
                    <button key={s.sec} type="button" onClick={() => setCostIdx(i)}
                      className={`py-2.5 rounded-xl text-[12px] font-bold transition focus-ring ${costIdx === i ? "text-white" : "text-[#1A0F2E]/60 border bg-white"}`}
                      style={costIdx === i ? { background: PURPLE, borderColor: PURPLE } : { borderColor: BORDER }}>{isRTL ? s.labelAr : s.labelFr}</button>
                  ))}
                </div>
                <div className="flex items-end justify-between gap-4 flex-wrap">
                  <div>
                    <span className="block text-[11px] mb-1 text-[#1A0F2E]/45 font-semibold">{isRTL ? "التكلفة" : "Coût"}</span>
                    <div className="text-[44px] leading-none font-extrabold" style={{ color: PURPLE }}>{COST_STEPS[costIdx].pts}<span className="text-[15px] font-semibold text-[#1A0F2E]/40 ms-2">{t.pts}</span></div>
                  </div>
                  <button type="button" onClick={goSignup} className="h-11 px-5 rounded-xl font-bold text-[13px] text-white focus-ring hover:brightness-125 transition" style={{ background: INK }}>{t.tryFree}</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CHIFFRES */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
            <SectionHead eyebrow={isRTL ? "بالأرقام" : "En chiffres"} title={t.metricsTitle} center ar={isRTL} />
            <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4">
              {metrics.map((m) => (
                <div key={m.l} className="rounded-2xl border bg-white p-8 text-center" style={{ borderColor: BORDER }}>
                  <div className="text-[clamp(2.2rem,4.2vw,3rem)] leading-none font-extrabold mb-2" style={{ color: PURPLE }}><Num>{m.n}</Num></div>
                  <span className="text-[11px] text-[#1A0F2E]/45 font-semibold">{m.l}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TÉMOIGNAGES */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
            <SectionHead eyebrow={isRTL ? "شهادات" : "Témoignages"} title={t.testTitle} center ar={isRTL} />
            <div className="mt-10 max-w-2xl mx-auto rounded-2xl border bg-white p-8 sm:p-10" style={{ borderColor: BORDER }}>
              <AnimatePresence mode="wait">
                <motion.div key={activeTesti} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }} className="text-center">
                  <div className="flex justify-center gap-1 mb-4">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="w-4 h-4 fill-current" style={{ color: INK }} />)}</div>
                  <blockquote className="text-[clamp(1.1rem,2.2vw,1.5rem)] leading-[1.4] font-bold">"{testimonials[activeTesti].q}"</blockquote>
                  <div className="mt-6 flex items-center justify-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-extrabold text-white" style={{ background: PURPLE }}>{testimonials[activeTesti].n.charAt(0)}</div>
                    <div className="text-start"><div className="text-[13px] font-bold">{testimonials[activeTesti].n}</div><div className="text-[12px] text-[#1A0F2E]/50">{testimonials[activeTesti].r}</div></div>
                  </div>
                </motion.div>
              </AnimatePresence>
              <div className="mt-7 flex items-center justify-center gap-2">
                {testimonials.map((_, i) => (
                  <button key={i} type="button" onClick={() => setActiveTesti(i)} aria-label={`${i + 1}`}
                    className={`h-1.5 rounded-full transition-all ${i === activeTesti ? "w-6" : "w-1.5 bg-[#1A0F2E]/20"}`} style={i === activeTesti ? { background: PURPLE } : undefined} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* TARIFS */}
        <section id="pricing" className="py-16 sm:py-20 scroll-mt-[92px]">
          <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
            <SectionHead eyebrow={isRTL ? "الباقات" : "Les packs"} title={t.pricingTitle} sub={t.pricingSub} center ar={isRTL} />
            <div className="mb-8 mt-10 max-w-xl mx-auto rounded-2xl border-2 border-dashed p-4 sm:p-5 flex items-center gap-4" style={{ borderColor: "rgba(107,45,188,0.4)" }}>
              <span className="shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: INK, color: "#fff" }}><Gift className="w-5 h-5" /></span>
              <span className="flex-1 min-w-0"><span className="block text-[14px] font-extrabold">{t.welcomeBanner}</span><span className="block text-[12px] text-[#1A0F2E]/60 mt-0.5">{t.bannerSub}</span></span>
              <button type="button" onClick={goSignup} className="shrink-0 h-10 px-4 rounded-full text-[13px] font-bold text-white" style={{ background: PURPLE }}>{t.tryFree}</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {pricing.map((p) => (
                <div key={p.pts} className={`relative rounded-2xl border p-6 h-full flex flex-col ${p.featured ? "text-white" : "bg-white"}`}
                  style={p.featured ? { borderColor: "rgba(107,45,188,0.85)", background: `linear-gradient(160deg, #241736 0%, ${INK} 60%, #0E0718 100%)` } : { borderColor: BORDER }}>
                  {p.featured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full text-[10px] font-extrabold whitespace-nowrap flex items-center gap-1.5" style={{ background: PURPLE, color: "#fff" }}>
                      <Crown className="w-3 h-3 shrink-0" />{t.popular}
                    </div>
                  )}
                  <div className="text-[38px] leading-none font-extrabold mb-1 pt-1"><Num>{p.pts}</Num></div>
                  <span className="block text-[11px] mb-4 font-semibold" style={{ color: p.featured ? "rgba(255,255,255,0.8)" : "rgba(26,15,46,0.4)" }}>{t.pts}</span>
                  <p className={`text-[12px] flex-1 leading-relaxed ${p.featured ? "text-white/85" : "text-[#1A0F2E]/60"}`}>{p.desc}</p>
                  <div className="flex items-baseline gap-1.5 mt-5">
                    <span className="text-[24px] font-extrabold"><Num>{p.price}</Num></span>
                    <span className={`text-[11px] font-bold ${p.featured ? "text-white/70" : "text-[#1A0F2E]/40"}`}>{isRTL ? "دج" : "DZD"}</span>
                  </div>
                  <button type="button" onClick={goSignup} className="h-11 rounded-xl text-[13px] font-bold transition focus-ring mt-4 text-white hover:brightness-110"
                    style={p.featured ? { background: "#fff", color: INK } : { background: PURPLE }}>{t.choose}</button>
                </div>
              ))}
            </div>
            <div className="mt-8 max-w-2xl mx-auto rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-start" style={{ background: PURPLE_SOFT }}>
              <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: PURPLE }}><ShieldCheck className="w-5 h-5 text-white" /></div>
              <div className="flex-1"><div className="font-extrabold text-[14px]">{t.guaranteeTitle}</div><p className="text-[13px] text-[#1A0F2E]/65 mt-1 leading-relaxed">{t.guaranteeBody}</p></div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-16 sm:py-20 scroll-mt-[92px]">
          <div className="mx-auto max-w-[1280px] px-5 sm:px-6 grid lg:grid-cols-12 gap-10">
            <div className="lg:col-span-4"><SectionHead eyebrow="FAQ" title={t.faqTitle} ar={isRTL} /></div>
            <div className="lg:col-span-7 lg:col-start-6">
              <div className="rounded-2xl border bg-white overflow-hidden" style={{ borderColor: BORDER }}>
                {faqs.map((f, i) => {
                  const open = openFaq === i;
                  return (
                    <div key={f.q} style={{ borderBottom: i < faqs.length - 1 ? `1px solid ${BORDER}` : undefined }}>
                      <button type="button" onClick={() => setOpenFaq(open ? null : i)} className="w-full py-5 px-5 sm:px-6 flex items-center gap-4 text-start focus-ring" aria-expanded={open}>
                        <span className="flex-1 text-[14px] font-bold">{f.q}</span>
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all ${open ? "rotate-45 text-white" : "text-[#1A0F2E]/60"}`} style={open ? { background: PURPLE } : { background: PURPLE_SOFT }}>
                          <Plus className="w-4 h-4" />
                        </span>
                      </button>
                      <AnimatePresence initial={false}>
                        {open && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                            <p className="pb-5 px-5 sm:px-6 pe-14 text-[13px] text-[#1A0F2E]/65 leading-relaxed">{f.a}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
            <div className="relative rounded-[24px] overflow-hidden p-10 sm:p-14 text-center" style={{ background: `linear-gradient(150deg, #241736 0%, ${INK} 55%, #0B0713 100%)`, color: PAPER }}>
              <h2 className="text-[clamp(1.9rem,5vw,3.2rem)] leading-[1.08] font-extrabold">{t.ctaTitle}</h2>
              <p className="mt-4 text-[15px] text-white/80 max-w-md mx-auto">{t.ctaSub}</p>
              <button type="button" onClick={goSignup} className="mt-8 inline-flex items-center gap-2 h-14 px-8 rounded-full font-extrabold text-[15px] transition focus-ring hover:scale-[1.02]" style={{ background: "#fff", color: INK }}>
                {t.tryFree}<ArrowIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer id="contact" className="pt-12 pb-28 sm:pb-12 scroll-mt-[110px]" style={{ borderTop: `1px solid ${BORDER}` }}>
          <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
              <div className="lg:col-span-2">
                <Logo size={38} />
                <p className="mt-4 text-[13px] text-[#1A0F2E]/55 max-w-sm leading-relaxed">
                  {isRTL ? "استوديو صوتي جزائري. نصّك بالدارجة يولي صوت طبيعي." : "Studio vocal algérien. Votre texte en darija devient une voix naturelle."}
                </p>
                <p className="mt-3 text-[12px] font-bold text-[#1A0F2E]/70">Alger, Algérie · {t.footTag}</p>
              </div>
              <div>
                <span className="block text-[11px] text-[#1A0F2E]/40 mb-3 font-semibold">{isRTL ? "المنصة" : "Produit"}</span>
                <div className="flex flex-col gap-2 text-[13px] font-medium">
                  {nav.map((l) => <a key={l.target} href={l.target} onClick={(e) => { e.preventDefault(); smoothTo(l.target); }} className="text-[#1A0F2E]/60 hover:text-[#6B2DBC] transition-colors">{l.label}</a>)}
                </div>
              </div>
              <div>
                <span className="block text-[11px] text-[#1A0F2E]/40 mb-3 font-semibold">{t.contact}</span>
                <div className="flex flex-col gap-2 text-[13px] font-semibold">
                  <a href="mailto:SAWTIFYSPACE@GMAIL.COM" className="text-[#1A0F2E]/70 hover:text-[#6B2DBC] transition-colors">SAWTIFYSPACE@GMAIL.COM</a>
                  <a href="tel:+213697660969" className="text-[#1A0F2E]/70 hover:text-[#6B2DBC] transition-colors"><Num>+213 697 660 969</Num></a>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-[11px] text-[#1A0F2E]/50"><ShieldCheck className="w-3.5 h-3.5" style={{ color: PURPLE }} />{isRTL ? "دفع آمن، ما نخزّنوش رقم البطاقة." : "Paiement sécurisé, aucune carte stockée."}</div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 text-[12px] text-[#1A0F2E]/45" style={{ borderTop: `1px solid ${BORDER}` }}>
              <span>© <Num>2026</Num> Sawtify · {t.footTag}</span>
              <div className="flex items-center gap-4">
                <button type="button" onClick={() => setLegal("cgu")} className="hover:text-[#6B2DBC] transition-colors">{t.cgu}</button>
                <button type="button" onClick={() => setLegal("privacy")} className="hover:text-[#6B2DBC] transition-colors">{t.privacy}</button>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* CTA MOBILE STICKY — le seul élément flottant conservé */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 p-3 bg-white/95 backdrop-blur-xl" style={{ borderTop: `1px solid ${BORDER}` }}>
        <button type="button" onClick={goSignup} className="w-full h-12 rounded-xl font-bold text-[13.5px] flex items-center justify-center text-white" style={{ background: INK }}>{t.tryFree}</button>
      </div>

      {/* MODALE ÉCOUTE */}
      <AnimatePresence>
        {listenVoice && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-[#1A0F2E]/55" onClick={() => { setListenVoice(null); player.stop(); }} />
            <div className="fixed inset-0 z-[71] flex items-end sm:items-center justify-center overflow-y-auto scrollbar-none" onClick={(e) => { if (e.target === e.currentTarget) { setListenVoice(null); player.stop(); } }}>
              <motion.div role="dialog" aria-modal="true" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
                className="relative w-full sm:max-w-md bg-white border rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl my-auto max-h-[86vh] overflow-y-auto scrollbar-none" style={{ borderColor: BORDER }}>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <span className="block text-[11px] text-[#1A0F2E]/40 mb-1 font-semibold">{t.listenInStudio}</span>
                    <h3 className="text-[20px] font-extrabold">{isRTL ? listenVoice.nameAr : listenVoice.nameFr}</h3>
                    <p className="text-[12px] text-[#1A0F2E]/50">{isRTL ? listenVoice.tagAr : listenVoice.tagFr} · {listenVoice.location}</p>
                  </div>
                  <button type="button" onClick={() => { setListenVoice(null); player.stop(); }} className="w-9 h-9 rounded-full hover:bg-[#1A0F2E]/5 flex items-center justify-center focus-ring shrink-0" aria-label={t.close}><X className="w-4 h-4" /></button>
                </div>
                <div className="rounded-xl border p-4 mb-4" style={{ borderColor: BORDER, background: `${listenVoice.color}0D` }}>
                  <Waveform color={listenVoice.color} playing={player.playingId === listenVoice.id} />
                  <button type="button" onClick={() => player.toggle(listenVoice.id, listenVoice.audioUrl)}
                    className="mt-3 w-full h-11 rounded-xl font-bold text-[13px] text-white flex items-center justify-center gap-2 focus-ring hover:brightness-110 transition" style={{ background: listenVoice.color }}>
                    {player.playingId === listenVoice.id ? <><Pause className="w-4 h-4 fill-current" />{t.pause}</> : <><Play className="w-4 h-4 fill-current translate-x-[1px]" />{t.listenInStudio}</>}
                  </button>
                </div>
                <p className="text-[13px] text-[#1A0F2E]/60 leading-relaxed mb-5">{t.listenBody}</p>
                <button type="button" onClick={goSignup} className="w-full h-12 rounded-xl font-bold text-[14px] text-white transition hover:brightness-125" style={{ background: INK }}>
                  {t.moreVoices} — {isRTL ? listenVoice.nameAr : listenVoice.nameFr}
                </button>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* MODALE LÉGALE */}
      <AnimatePresence>
        {legal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-[#1A0F2E]/45" onClick={() => setLegal(null)} />
            <div className="fixed inset-0 z-[71] flex items-center justify-center p-4 overflow-y-auto scrollbar-none" onClick={(e) => { if (e.target === e.currentTarget) setLegal(null); }}>
              <motion.div role="dialog" aria-modal="true" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                className="relative w-full max-w-lg bg-white border rounded-2xl p-6 shadow-2xl my-auto max-h-[82vh] overflow-y-auto scrollbar-none" style={{ borderColor: BORDER }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[18px] font-extrabold">{legal === "cgu" ? t.cgu : t.privacy}</h3>
                  <button type="button" onClick={() => setLegal(null)} className="w-9 h-9 rounded-full hover:bg-[#1A0F2E]/5 flex items-center justify-center focus-ring" aria-label={t.close}><X className="w-4 h-4" /></button>
                </div>
                <p className="text-[13px] leading-relaxed text-[#1A0F2E]/65">{legalCopy[legal]}</p>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org", "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
        }).replace(/</g, "\\u003c"),
      }} />
    </div>
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

export default LandingPage;
