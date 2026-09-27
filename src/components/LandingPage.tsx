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
  Sparkles,
  Zap,
  Plus,
  Minus,
  Star,
  Quote,
  Mic,
  PhoneCall,
  Megaphone,
  GraduationCap,
  Video,
  Share2,
  Headphones,
  Copy,
  MousePointerClick,
  Download,
} from "lucide-react";
import { motion, AnimatePresence, useInView } from "motion/react";

export interface LandingPageProps {
  onLoginClick: () => void;
  onSigninClick: () => void;
  language: "fr" | "ar";
  setLanguage: (lang: "fr" | "ar") => void;
}

/* ═══════════ PALETTE — VIOLET ═══════════ */
const BG_BLACK = "#000000";
const BG_ZINC_950 = "#09090B";
const BG_ZINC_900 = "#18181B";
const BG_CARD = "rgba(24, 24, 27, 0.85)";
const PURPLE = "#A855F7";
const PURPLE_SOFT = "#D8B4FE";
const PURPLE_DEEP = "#6D28D9";
const PURPLE_GLOW = "rgba(168, 85, 247, 0.18)";
const PURPLE_GLOW_STRONG = "rgba(168, 85, 247, 0.35)";
const TEXT_WHITE = "#FFFFFF";
const TEXT_ZINC_400 = "#A1A1AA";
const TEXT_ZINC_600 = "#52525B";
const BORDER_ZINC_700 = "#3F3F46";
const BORDER_ZINC_800 = "#27272A";

const HERO_IMAGE = "https://res.cloudinary.com/gz65ybug/image/upload/v1790474727/Gemini_Generated_Image_emb779emb779emb7.jpg";
const AMINE_AUDIO = "https://res.cloudinary.com/gz65ybug/video/upload/v1789139928/AMINE.mp3";
const YASMINE_AUDIO = "https://res.cloudinary.com/gz65ybug/video/upload/v1789139890/YASMINE.mp3";
const KHALID_AUDIO = "https://res.cloudinary.com/gz65ybug/video/upload/v1789139847/KHALED.wav";

const LOGO = "https://i.ibb.co/nqShkPNP/68126702-75e5-4de6-9b53-e51800b05e4a.jpg";

const AR_STACK = "'IBM Plex Sans Arabic', sans-serif";
const FR_STACK = "'Hanken Grotesk', sans-serif";
const FR_HEADING_STACK = "'Bricolage Grotesque', sans-serif";
const FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;500;600;700;800&family=Hanken+Grotesk:wght@400;500;600;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap";

/* ═══════════ GLOBAL STYLES ═══════════ */
const GlobalStyles = () => (
  <style>{`
    html { scroll-behavior: smooth; -webkit-font-smoothing: antialiased; }
    body { background: ${BG_BLACK}; color: ${TEXT_WHITE}; margin: 0; font-family: ${FR_STACK}; }
    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    ::selection { background: ${PURPLE}; color: ${BG_BLACK}; }

    @keyframes marquee {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    @keyframes pulse-glow {
      0%, 100% { box-shadow: 0 0 20px ${PURPLE_GLOW}; }
      50% { box-shadow: 0 0 40px ${PURPLE_GLOW_STRONG}; }
    }
    @keyframes float-blob {
      0%, 100% { transform: translate(0, 0) scale(1); }
      33% { transform: translate(30px, -40px) scale(1.1); }
      66% { transform: translate(-20px, 20px) scale(0.95); }
    }
    @keyframes gradient-shift {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }

    .glass-dark {
      background: rgba(24, 24, 27, 0.85);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid ${BORDER_ZINC_700};
    }
    .neon-glow { animation: pulse-glow 3s ease-in-out infinite; }
    .blob { animation: float-blob 12s ease-in-out infinite; filter: blur(80px); pointer-events: none; }

    .marquee-container {
      display: flex;
      overflow: hidden;
      user-select: none;
      -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
      mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
    }
    .marquee-content {
      display: flex;
      align-items: center;
      animation: marquee 34s linear infinite;
      will-change: transform;
    }

    .gradient-text {
      background: linear-gradient(90deg, ${TEXT_WHITE}, ${PURPLE_SOFT}, ${TEXT_WHITE});
      background-size: 200% auto;
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      animation: gradient-shift 6s ease infinite;
    }

    .nav-link { position: relative; }
    .nav-link::after {
      content: "";
      position: absolute;
      left: 0; bottom: -4px;
      width: 0%; height: 1px;
      background: ${PURPLE};
      transition: width 0.3s ease;
    }
    .nav-link:hover::after { width: 100%; }

    .grid-texture {
      background-image:
        linear-gradient(${BORDER_ZINC_800} 1px, transparent 1px),
        linear-gradient(90deg, ${BORDER_ZINC_800} 1px, transparent 1px);
      background-size: 44px 44px;
      -webkit-mask-image: radial-gradient(ellipse 80% 60% at 50% 50%, black 40%, transparent 100%);
      mask-image: radial-gradient(ellipse 80% 60% at 50% 50%, black 40%, transparent 100%);
      opacity: 0.5;
    }

    @media (prefers-reduced-motion: reduce) {
      html { scroll-behavior: auto; }
      *, *::before, *::after { animation-duration: 0.01ms !important; }
    }
  `}</style>
);

/* ═══════════ HOOKS ═══════════ */
function useScrolled(threshold = 40) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > threshold);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold]);
  return scrolled;
}

function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    let raf = 0;
    const compute = () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = window.scrollY;
      const scrollPercent = Math.min(1, Math.max(0, scrolled / docHeight));
      setProgress(scrollPercent);
    };
    
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(compute);
    };
    
    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);
  
  return progress;
}

function useVoicePlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const play = useCallback((id: string, url: string) => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.addEventListener("timeupdate", () => {
        if (audioRef.current && audioRef.current.duration > 0) {
          setProgress(audioRef.current.currentTime / audioRef.current.duration);
        }
      });
      audioRef.current.addEventListener("ended", () => {
        setPlayingId(null);
        setProgress(0);
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
  }, []);

  const toggle = useCallback(
    (id: string, url: string) => {
      if (playingId === id) stop();
      else play(id, url);
    },
    [playingId, play, stop]
  );

  return { playingId, progress, toggle, stop };
}

/* ═══════════ COMPONENTS ═══════════ */
const Logo = ({ size = 30 }: { size?: number }) => {
  const [err, setErr] = useState(false);
  return (
    <div className="flex items-center gap-2 select-none">
      <div
        className="rounded-xl overflow-hidden shrink-0"
        style={{ width: size, height: size, boxShadow: `0 0 12px ${PURPLE_GLOW}` }}
      >
        {!err ? (
          <img src={LOGO} alt="Sawtify" width={size} height={size} onError={() => setErr(true)} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-bold" style={{ background: PURPLE, color: BG_BLACK, fontSize: size * 0.5 }}>S</div>
        )}
      </div>
      <span className="font-bold text-[15px] tracking-tight text-white" style={{ fontFamily: FR_HEADING_STACK }}>Sawtify</span>
    </div>
  );
};

const AnimatedSection = ({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const SectionGlow = ({ style = {} }: { style?: React.CSSProperties }) => (
  <div
    className="absolute pointer-events-none blob rounded-full"
    style={{ background: PURPLE, opacity: 0.1, ...style }}
  />
);

const AudioWidget = ({ label, sublabel }: { label: string; sublabel: string }) => (
  <motion.div
    className="glass-dark p-6 rounded-[28px] shadow-2xl neon-glow"
    style={{ maxWidth: 300 }}
    animate={{ y: [0, -10, 0] }}
    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
  >
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: PURPLE }}>
        <Sparkles className="w-5 h-5" style={{ color: BG_BLACK }} />
      </div>
      <div>
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="text-xs" style={{ color: TEXT_ZINC_400 }}>{sublabel}</p>
      </div>
    </div>
    <div className="flex items-end justify-center gap-1 h-16">
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full"
          style={{ background: PURPLE }}
          animate={{ height: [`${10 + Math.random() * 30}%`, `${40 + Math.random() * 60}%`, `${10 + Math.random() * 30}%`] }}
          transition={{ duration: 0.8 + Math.random() * 0.6, repeat: Infinity, ease: "easeInOut", delay: i * 0.04 }}
        />
      ))}
    </div>
  </motion.div>
);

const VoiceOrbCard = ({
  name,
  role,
  audioUrl,
  player,
}: {
  name: string;
  role: string;
  audioUrl: string;
  player: any;
}) => {
  const playing = player.playingId === audioUrl;
  return (
    <motion.div
      whileHover={{ y: -8 }}
      transition={{ type: "spring", stiffness: 250, damping: 20 }}
      className="flex flex-col items-center text-center gap-4"
    >
      <div className="relative" style={{ width: 132, height: 132 }}>
        <motion.div
          className="absolute inset-0 rounded-full p-[3px]"
          style={{ background: `conic-gradient(from 0deg, ${PURPLE}, ${PURPLE_SOFT}, ${PURPLE_DEEP}, ${PURPLE})` }}
          animate={playing ? { rotate: 360 } : { rotate: 0 }}
          transition={{ duration: 5, repeat: playing ? Infinity : 0, ease: "linear" }}
        >
          <div className="w-full h-full rounded-full" style={{ background: BG_ZINC_950 }} />
        </motion.div>
        <div
          className="absolute inset-[6px] rounded-full flex items-center justify-center text-4xl font-extrabold"
          style={{ background: BG_CARD, color: PURPLE_SOFT, fontFamily: FR_HEADING_STACK }}
        >
          {name.charAt(0)}
        </div>
        <motion.button
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => player.toggle(audioUrl, audioUrl)}
          className="absolute bottom-0 right-0 w-11 h-11 rounded-full flex items-center justify-center shadow-lg"
          style={{ background: PURPLE, boxShadow: `0 0 20px ${PURPLE_GLOW_STRONG}` }}
        >
          {playing ? <Pause className="w-4 h-4" style={{ color: BG_BLACK }} /> : <Play className="w-4 h-4 ml-0.5" style={{ color: BG_BLACK }} />}
        </motion.button>
      </div>
      <div>
        <h4 className="font-bold text-white text-lg">{name}</h4>
        <p className="text-sm" style={{ color: TEXT_ZINC_400 }}>{role}</p>
      </div>
      <div className="flex items-end gap-1 h-6">
        {Array.from({ length: 9 }).map((_, i) => (
          <motion.span
            key={i}
            className="w-1 rounded-full"
            style={{ background: PURPLE }}
            animate={playing ? { height: [6, 22, 6] } : { height: 6 }}
            transition={{ duration: 0.6 + i * 0.04, repeat: playing ? Infinity : 0, ease: "easeInOut", delay: i * 0.05 }}
          />
        ))}
      </div>
    </motion.div>
  );
};

const FAQItem = ({ q, a }: { q: string; a: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b pb-6" style={{ borderColor: BORDER_ZINC_800 }}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-4 text-left">
        <span className="text-lg font-bold" style={{ color: PURPLE, fontFamily: FR_HEADING_STACK }}>{q}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.3 }}>
          {open ? <Minus className="w-6 h-6" style={{ color: PURPLE }} /> : <Plus className="w-6 h-6" style={{ color: PURPLE }} />}
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p className="text-base leading-relaxed" style={{ color: TEXT_ZINC_400 }}>{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const PricingCard = ({
  tier,
  chooseLabel,
  audiosLabel,
  featuresLabels,
  popularLabel,
}: {
  tier: { points: number; price: string; audios: string; badge?: string; popular?: boolean };
  chooseLabel: string;
  audiosLabel: string;
  featuresLabels: string[];
  popularLabel: string;
}) => {
  const popular = !!tier.popular;
  return (
    <motion.div
      whileHover={{ y: -8, boxShadow: popular ? `0 0 40px ${PURPLE_GLOW_STRONG}` : `0 0 25px ${PURPLE_GLOW}` }}
      transition={{ type: "spring", stiffness: 240, damping: 20 }}
      className="relative flex flex-col p-8 rounded-[28px] border"
      style={{
        background: popular ? `linear-gradient(160deg, ${PURPLE_DEEP}, ${PURPLE})` : BG_CARD,
        borderColor: popular ? PURPLE : BORDER_ZINC_800,
      }}
    >
      {popular && (
        <span
          className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"
          style={{ background: TEXT_WHITE, color: PURPLE_DEEP }}
        >
          <Sparkles className="w-3.5 h-3.5" /> {popularLabel}
        </span>
      )}
      <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: popular ? "rgba(255,255,255,0.8)" : TEXT_ZINC_400 }}>
        {tier.points.toLocaleString()} points {tier.badge && <span className="ml-1 px-1.5 py-0.5 rounded-md text-[10px]" style={{ background: popular ? "rgba(0,0,0,0.25)" : PURPLE_GLOW, color: popular ? TEXT_WHITE : PURPLE_SOFT }}>{tier.badge}</span>}
      </p>
      <p className="text-4xl font-extrabold mb-1" style={{ color: TEXT_WHITE, fontFamily: FR_HEADING_STACK }}>
        {tier.price} <span className="text-base font-semibold" style={{ color: popular ? "rgba(255,255,255,0.75)" : TEXT_ZINC_400 }}>DZD</span>
      </p>
      <p className="text-sm mb-6" style={{ color: popular ? "rgba(255,255,255,0.75)" : TEXT_ZINC_400 }}>{tier.audios} {audiosLabel}</p>
      <ul className="space-y-2 mb-8 flex-1">
        {featuresLabels.map((f, i) => (
          <li key={i} className="flex items-center gap-2 text-sm font-medium" style={{ color: popular ? TEXT_WHITE : TEXT_ZINC_400 }}>
            <Check className="w-4 h-4 shrink-0" style={{ color: popular ? TEXT_WHITE : PURPLE }} />
            {f}
          </li>
        ))}
      </ul>
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="w-full py-3.5 rounded-full font-bold flex items-center justify-center gap-2"
        style={{ background: popular ? TEXT_WHITE : BG_ZINC_900, color: popular ? PURPLE_DEEP : TEXT_WHITE, border: popular ? "none" : `1px solid ${BORDER_ZINC_700}` }}
      >
        {chooseLabel} <ArrowRight className="w-4 h-4" />
      </motion.button>
    </motion.div>
  );
};

const Testimonial = ({
  quote,
  name,
  role,
}: {
  quote: string;
  name: string;
  role: string;
}) => (
  <div
    className="relative overflow-hidden rounded-[40px] p-10 md:p-16 text-center border"
    style={{ background: BG_CARD, borderColor: BORDER_ZINC_800 }}
  >
    <SectionGlow style={{ top: -80, left: "50%", transform: "translateX(-50%)", width: 500, height: 300 }} />
    <Quote className="w-12 h-12 mx-auto mb-6" style={{ color: PURPLE }} />
    <p
      className="relative z-10 text-2xl md:text-4xl font-semibold leading-snug max-w-3xl mx-auto mb-8"
      style={{ color: TEXT_WHITE, fontFamily: FR_HEADING_STACK }}
    >
      « {quote} »
    </p>
    <div className="relative z-10 flex items-center justify-center gap-1 mb-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className="w-5 h-5" style={{ color: PURPLE, fill: PURPLE }} />
      ))}
    </div>
    <div className="relative z-10 flex items-center justify-center gap-3">
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center font-bold"
        style={{ background: PURPLE, color: BG_BLACK }}
      >
        {name.charAt(0)}
      </div>
      <div className="text-left">
        <p className="font-bold text-white">{name}</p>
        <p className="text-sm" style={{ color: TEXT_ZINC_400 }}>{role}</p>
      </div>
    </div>
  </div>
);

/* ═══════════ MAIN COMPONENT ═══════════ */
export const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick, onSigninClick, language, setLanguage }) => {
  const isRTL = language === "ar";
  const [menuOpen, setMenuOpen] = useState(false);
  const scrolled = useScrolled();
  const player = useVoicePlayer();
  const scrollProgress = useScrollProgress();

  const bootRef = useRef(false);
  useLayoutEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem("sawtify_lang");
    } catch {}
    // ARABE PAR DÉFAUT
    const target = saved === "fr" || saved === "ar" ? saved : "ar";
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
      kicker: isRTL ? "الجيل الجديد من الصوت الاصطناعي" : "L'IA vocale nouvelle génération",
      heroTitle: isRTL ? "خلي المحتوى تاعك يهدر بالدارجة الحقيقية" : "Faites parler votre contenu, en vraie darija",
      heroSub: isRTL
        ? "أول محرك ذكاء اصطناعي يهدر بالدارجة الجزائرية الأصيلة. صوت استوديو، بلا ميكروفون، بلا مونتاج، في 30 ثانية."
        : "Le premier moteur IA qui parle une darija algérienne 100% naturelle. Qualité studio, zéro micro, zéro montage, en 30 secondes.",
      ctaMain: isRTL ? "جرب مجانا الآن" : "Générer ma voix — gratuit",
      signup: isRTL ? "إنشاء حساب" : "Créer un compte",
      signin: isRTL ? "تسجيل الدخول" : "Connexion",
      features: isRTL ? "المميزات" : "Fonctionnalités",
      pricing: isRTL ? "الأسعار" : "Tarifs",
      faq: isRTL ? "الأسئلة" : "FAQ",
      joined: isRTL ? "أكثر من 500 صانع محتوى وثقوا فينا" : "+500 créateurs nous font déjà confiance",
      usesTitle: isRTL ? "منصة وحدة، بزاف الاستعمالات" : "Une seule IA, une multitude d'usages",
      transparent: isRTL ? "سعر واضح، بلا مفاجآت." : "Rechargez des points. Payez ce que vous utilisez.",
      transparentSub: isRTL
        ? "اختار الباك المناسب لك وادفع بالإدهابية أو CIB عبر SATIM، بالدينار."
        : "Choisissez votre pack et payez en toute sécurité via Edahabia ou CIB. Vos points n'expirent jamais.",
      faqTitle: isRTL ? "الأسئلة الشائعة" : "Vos questions, nos réponses",
      experts: isRTL ? "جاهز تبدا؟" : "Prêt à faire parler votre marque ?",
      testVoices: isRTL ? "استمع بروحك" : "Écoutez par vous-même",
      testVoicesSub: isRTL ? "3 أصوات من بين 30، مسجلة مباشرة من المنصة" : "3 voix parmi 30, générées directement sur la plateforme",
      audiosLabel: isRTL ? "أوديو" : "audios",
      choose: isRTL ? "اختار" : "Choisir",
      popularLabel: isRTL ? "الأكثر شعبية" : "Populaire",
      testimonialQuote: isRTL
        ? "بدلت الفويس أوفر تاعي بـ Sawtify ووفرت وقت ومصاري بزاف. جودة استوديو حقيقية، بالدارجة تاعنا."
        : "On a remplacé notre voix-off traditionnelle par Sawtify. Résultat : la même qualité studio, en darija authentique, pour une fraction du budget et du temps.",
      testimonialName: isRTL ? "سارة ب." : "Sarah B.",
      testimonialRole: isRTL ? "مسؤولة محتوى، وكالة رقمية" : "Responsable contenu, agence digitale",
      
      /* Bento Grid */
      bentoTitle: isRTL ? "توليد فوري، بلا تعقيد" : "Une génération instantanée, sans friction",
      bentoStep1: isRTL ? "انسخ. اختار صوت. نزل." : "Copiez. Choisissez une voix. Téléchargez.",
      bentoStep1Desc: isRTL ? "بلا برامج، بلا تعقيدات تقنية — الأوديو تاعك جاهز بضغطة زر." : "Pas de logiciel à installer, pas de compétence technique requise — votre audio est prêt en un clic.",
      bentoStep1Copy: isRTL ? "انسخ النص" : "Copier le texte",
      bentoStep1Voice: isRTL ? "اختار الصوت" : "Choisir la voix",
      bentoStep1Download: isRTL ? "نزل الملف" : "Télécharger",
      bentoSpeed: isRTL ? "30 ثانية بالضبط" : "30 secondes chrono",
      bentoSpeedDesc: isRTL ? "الوقت اللي تحتاجه باش تحضر المحتوى تاعك." : "Le temps de préparer votre publication.",
      bentoVoices: isRTL ? "30 صوت، نبرة لكل مشروع" : "30 voix, un ton pour chaque projet",
      bentoVoicesDesc: isRTL ? "رجال، نساء، تجاري، وثائقي، سوشيال ميديا." : "Hommes, femmes, commercial, documentaire, réseaux sociaux.",
      bentoRights: isRTL ? "حقوق تجارية كاملة" : "Droits commerciaux inclus",
      bentoRightsDesc: isRTL ? "استعمل الأوديو تاعك في يوتيوب، تيكتوك، إشهار أو بودكاست — بلا قيود، بلا مصاري مخفية." : "Utilisez vos audios pour YouTube, TikTok, publicités ou podcasts — sans restriction, sans frais cachés.",
      
      /* Audio widget */
      generating: isRTL ? "جاري التوليد…" : "Génération en cours…",
      darija: isRTL ? "الدارجة الجزائرية" : "Darija algérienne",
      
      /* Footer */
      footerTerms: isRTL ? "الشروط" : "Conditions",
      footerPrivacy: isRTL ? "الخصوصية" : "Confidentialité",
      footerContact: isRTL ? "اتصل بنا" : "Contact",
      footerMade: isRTL ? "© 2026 Sawtify. صُنع في الجزائر 🇩🇿" : "© 2026 Sawtify. Made in Algeria 🇩🇿",
    }),
    [isRTL]
  );

  const nav = [
    { label: t.features, href: "#features" },
    { label: t.pricing, href: "#pricing" },
    { label: t.faq, href: "#faq" },
  ];

  const useCases = isRTL
    ? [
        { icon: Mic, label: "تعليق صوتي" },
        { icon: PhoneCall, label: "مركز الاتصال" },
        { icon: Megaphone, label: "إشهار" },
        { icon: GraduationCap, label: "تعليم إلكتروني" },
        { icon: Video, label: "دبلجة فيديو" },
        { icon: Share2, label: "سوشيال ميديا" },
        { icon: Headphones, label: "بودكاست" },
      ]
    : [
        { icon: Mic, label: "Voix off" },
        { icon: PhoneCall, label: "Centre d'appel" },
        { icon: Megaphone, label: "Publicité" },
        { icon: GraduationCap, label: "E-learning" },
        { icon: Video, label: "Doublage vidéo" },
        { icon: Share2, label: "Réseaux sociaux" },
        { icon: Headphones, label: "Podcasts" },
      ];

  const faqs = isRTL
    ? [
        { q: "ما هو Sawtify؟", a: "منصة تحول النص إلى صوت بدارجة جزائرية طبيعية باستخدام الذكاء الاصطناعي، بجودة استوديو حقيقي." },
        { q: "كم من الوقت يستغرق التوليد؟", a: "أقل من دقيقة لصوت احترافي جاهز للنشر مباشرة." },
        { q: "نقدر نستعملها تجاريا؟", a: "أكيد، كل الأصوات مرخصة للاستخدام التجاري الكامل بلا قيود." },
        { q: "كيفاش ندفع؟", a: "نقبلوا Edahabia و CIB عبر SATIM، بالدينار الجزائري." },
      ]
    : [
        { q: "Qu'est-ce que Sawtify exactement ?", a: "Une plateforme IA qui transforme votre texte en voix darija algérienne naturelle, avec un rendu qualité studio." },
        { q: "Combien de temps pour générer une voix ?", a: "Moins d'une minute pour un audio prêt à publier, sans montage supplémentaire." },
        { q: "Puis-je l'utiliser pour mes clients ?", a: "Oui, toutes les voix sont couvertes par une licence commerciale complète, sans restriction." },
        { q: "Quels moyens de paiement ?", a: "Edahabia et CIB via SATIM, directement en dinars algériens." },
      ];

  const voices = isRTL
    ? [
        { name: "أمين", role: "صوت تجاري", audioUrl: AMINE_AUDIO },
        { name: "ياسمين", role: "صوت إشهاري", audioUrl: YASMINE_AUDIO },
        { name: "خالد", role: "صوت وثائقي", audioUrl: KHALID_AUDIO },
      ]
    : [
        { name: "Amine", role: "Voix commerciale", audioUrl: AMINE_AUDIO },
        { name: "Yasmine", role: "Voix publicitaire", audioUrl: YASMINE_AUDIO },
        { name: "Khalid", role: "Voix documentaire", audioUrl: KHALID_AUDIO },
      ];

  const pricingTiers = [
    { points: 100, price: "500", audios: "~5" },
    { points: 220, price: "1 000", audios: "~11", badge: "+10%", popular: true },
    { points: 600, price: "2 500", audios: "~30", badge: "+20%" },
    { points: 1350, price: "5 000", audios: "~67", badge: "+35%" },
  ];

  const featuresLabels = isRTL
    ? ["كل الأصوات HQ", "استخدام تجاري"]
    : ["Toutes les voix HQ", "Usage commercial"];

  const gradientHeight = `${scrollProgress * 100}%`;

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

      {/* ═══════════ FOND FIXE avec gradient qui monte ═══════════ */}
      <div className="fixed inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: `url(${HERO_IMAGE})`, 
            filter: "brightness(0.4) contrast(1.2) saturate(0.85)" 
          }}
        />
        
        <div 
          className="absolute inset-0" 
          style={{ 
            background: `linear-gradient(to top, ${BG_BLACK} 0%, rgba(0,0,0,0.75) 40%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0.2) 100%)` 
          }} 
        />
        
        <div 
          className="absolute inset-x-0 bottom-0 transition-all duration-75"
          style={{ 
            height: gradientHeight,
            background: `linear-gradient(to top, ${BG_BLACK} 0%, ${BG_BLACK} 60%, rgba(0,0,0,0.9) 80%, transparent 100%)`,
            pointerEvents: 'none'
          }} 
        />
      </div>

      {/* ═══════════ NAVBAR ═══════════ */}
      <header className="fixed top-4 inset-x-0 z-50 flex justify-center px-4">
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-3xl flex items-center justify-between gap-4 rounded-full px-3 py-2 transition-all duration-300"
          style={{
            background: scrolled ? "rgba(9, 9, 11, 0.85)" : "rgba(9, 9, 11, 0.5)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: `1px solid ${scrolled ? BORDER_ZINC_700 : "rgba(63,63,70,0.4)"}`,
            boxShadow: scrolled ? `0 8px 30px rgba(0,0,0,0.4)` : "none",
          }}
        >
          <Logo size={28} />

          <nav className="hidden lg:flex items-center gap-6 mx-2">
            {nav.map((item) => (
              <a key={item.href} href={item.href} className="nav-link text-xs font-medium hover:text-white transition-colors" style={{ color: TEXT_ZINC_400 }}>
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={switchLang}
              className="text-xs font-medium px-3 py-1.5 rounded-full hover:bg-zinc-800 transition"
              style={{ color: TEXT_ZINC_400, border: `1px solid ${BORDER_ZINC_800}` }}
            >
              {isRTL ? "FR" : "ع"}
            </button>
            <button onClick={onLoginClick} className="hidden md:block text-xs font-medium hover:text-white transition" style={{ color: TEXT_ZINC_400 }}>
              {t.signin}
            </button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onSigninClick}
              className="px-4 py-1.5 rounded-full text-xs font-bold"
              style={{ background: TEXT_WHITE, color: BG_BLACK }}
            >
              {t.signup}
            </motion.button>
            <button onClick={() => setMenuOpen(true)} className="lg:hidden text-white">
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
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
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              className="fixed inset-y-0 end-0 z-[70] w-80 p-6"
              style={{ background: BG_ZINC_900 }}
            >
              <button onClick={() => setMenuOpen(false)} className="mb-8 text-white">
                <X className="w-6 h-6" />
              </button>
              <nav className="flex flex-col gap-6">
                {nav.map((item) => (
                  <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className="text-lg font-bold text-white transition-colors" style={{ fontFamily: FR_HEADING_STACK }}>
                    {item.label}
                  </a>
                ))}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ═══════════ CONTENU ═══════════ */}
      <div className="relative z-10">
        {/* ═══════════ HERO ═══════════ */}
        <section className="relative h-screen flex items-center justify-center overflow-hidden">
          <div className="blob absolute -top-20 -left-20 w-96 h-96 rounded-full" style={{ background: PURPLE, opacity: 0.15 }} />
          <div className="blob absolute bottom-0 right-0 w-[28rem] h-[28rem] rounded-full" style={{ background: PURPLE_SOFT, opacity: 0.1, animationDelay: "4s" }} />

          <div className="relative z-10 text-center px-6 max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 text-xs font-semibold"
              style={{ background: PURPLE_GLOW, color: PURPLE_SOFT, border: `1px solid ${PURPLE_GLOW_STRONG}` }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              {t.kicker}
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
              className="gradient-text text-5xl md:text-7xl font-extrabold leading-tight mb-6 tracking-tight"
              style={{ fontFamily: isRTL ? AR_STACK : FR_HEADING_STACK }}
            >
              {t.heroTitle}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="text-lg md:text-2xl mb-8"
              style={{ color: TEXT_ZINC_400 }}
            >
              {t.heroSub}
            </motion.p>
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              whileHover={{ scale: 1.06, boxShadow: `0 0 45px ${PURPLE_GLOW_STRONG}` }}
              whileTap={{ scale: 0.97 }}
              onClick={onSigninClick}
              className="px-10 py-4 rounded-full text-lg font-bold inline-flex items-center gap-2"
              style={{ background: PURPLE, color: BG_BLACK }}
            >
              {t.ctaMain} <ArrowRight className="w-5 h-5" />
            </motion.button>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="absolute bottom-10 right-10 hidden lg:block"
          >
            <AudioWidget label={t.generating} sublabel={t.darija} />
          </motion.div>
        </section>

        {/* ═══════════ USAGES ═══════════ */}
        <AnimatedSection>
          <div className="py-12 relative">
            <p className="text-center mb-2 text-sm font-semibold" style={{ color: TEXT_ZINC_600 }}>{t.joined}</p>
            <p className="text-center mb-8 text-2xl md:text-3xl font-bold tracking-tight" style={{ color: TEXT_WHITE, fontFamily: isRTL ? AR_STACK : FR_HEADING_STACK }}>
              {t.usesTitle}
            </p>
            <div className="marquee-container">
              <div className="marquee-content">
                {[...useCases, ...useCases].map((u, i) => {
                  const Icon = u.icon;
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-6 py-2.5 mx-2 rounded-full border shrink-0"
                      style={{ borderColor: BORDER_ZINC_800, background: BG_CARD }}
                    >
                      <Icon className="w-4 h-4" style={{ color: PURPLE }} />
                      <span className="text-sm font-semibold whitespace-nowrap" style={{ color: TEXT_ZINC_400 }}>{u.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* ═══════════ VOICE TESTS ═══════════ */}
        <AnimatedSection>
          <section className="py-24 px-6 relative overflow-hidden">
            <SectionGlow style={{ top: "20%", left: "-10%", width: 400, height: 400 }} />
            <div className="max-w-6xl mx-auto relative z-10">
              <h2 className="text-4xl md:text-6xl font-extrabold text-center mb-4 tracking-tight text-white" style={{ fontFamily: isRTL ? AR_STACK : FR_HEADING_STACK }}>
                {t.testVoices}
              </h2>
              <p className="text-center mb-14 text-xl" style={{ color: TEXT_ZINC_400 }}>{t.testVoicesSub}</p>
              <div className="grid sm:grid-cols-3 gap-10 justify-items-center">
                {voices.map((voice, i) => (
                  <AnimatedSection key={i} delay={i * 0.15}>
                    <VoiceOrbCard {...voice} player={player} />
                  </AnimatedSection>
                ))}
              </div>
            </div>
          </section>
        </AnimatedSection>

        {/* ═══════════ BENTO GRID ═══════════ */}
        <AnimatedSection>
          <section id="features" className="py-24 px-6 relative overflow-hidden">
            <div className="absolute inset-0 grid-texture" />
            <div className="max-w-7xl mx-auto relative z-10">
              <h2 className="text-4xl md:text-6xl font-extrabold text-center mb-16 tracking-tight text-white" style={{ fontFamily: isRTL ? AR_STACK : FR_HEADING_STACK }}>
                {t.bentoTitle}
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                
                {/* Carte workflow avec mockup */}
                <motion.div
                  whileHover={{ y: -6, boxShadow: `0 0 25px ${PURPLE_GLOW}`, borderColor: PURPLE }}
                  transition={{ type: "spring", stiffness: 250, damping: 20 }}
                  className="md:col-span-2 p-10 rounded-[32px] border"
                  style={{ background: BG_CARD, borderColor: BORDER_ZINC_800 }}
                >
                  <h3 className="text-3xl font-bold mb-4 text-white">{t.bentoStep1}</h3>
                  <p className="text-lg mb-8" style={{ color: TEXT_ZINC_400 }}>{t.bentoStep1Desc}</p>
                  
                  {/* Mockup éditeur */}
                  <div className="rounded-2xl border p-6" style={{ background: BG_ZINC_900, borderColor: BORDER_ZINC_800 }}>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-3 h-3 rounded-full" style={{ background: "#EF4444" }} />
                      <div className="w-3 h-3 rounded-full" style={{ background: "#F59E0B" }} />
                      <div className="w-3 h-3 rounded-full" style={{ background: "#10B981" }} />
                    </div>
                    
                    <div className="space-y-3">
                      {/* Ligne texte */}
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: PURPLE_GLOW }}>
                          <Copy className="w-4 h-4" style={{ color: PURPLE }} />
                        </div>
                        <div className="flex-1 h-10 rounded-lg flex items-center px-4" style={{ background: BG_ZINC_950, border: `1px solid ${BORDER_ZINC_800}` }}>
                          <span className="text-sm" style={{ color: TEXT_ZINC_600 }}>{t.bentoStep1Copy}</span>
                        </div>
                      </div>
                      
                      {/* Ligne voix */}
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: PURPLE_GLOW }}>
                          <MousePointerClick className="w-4 h-4" style={{ color: PURPLE }} />
                        </div>
                        <div className="flex-1 h-10 rounded-lg flex items-center px-4 gap-2" style={{ background: BG_ZINC_950, border: `1px solid ${BORDER_ZINC_800}` }}>
                          <div className="w-5 h-5 rounded-full" style={{ background: PURPLE }} />
                          <span className="text-sm" style={{ color: TEXT_ZINC_400 }}>{t.bentoStep1Voice}</span>
                        </div>
                      </div>
                      
                      {/* Ligne download */}
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: PURPLE_GLOW }}>
                          <Download className="w-4 h-4" style={{ color: PURPLE }} />
                        </div>
                        <div className="flex-1 h-10 rounded-lg flex items-center justify-center gap-2" style={{ background: PURPLE }}>
                          <span className="text-sm font-bold" style={{ color: BG_BLACK }}>{t.bentoStep1Download}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Carte vitesse */}
                <motion.div
                  whileHover={{ y: -6, boxShadow: `0 0 25px ${PURPLE_GLOW}`, borderColor: PURPLE }}
                  transition={{ type: "spring", stiffness: 250, damping: 20 }}
                  className="p-10 rounded-[32px] border flex flex-col items-center justify-center text-center"
                  style={{ background: BG_CARD, borderColor: BORDER_ZINC_800 }}
                >
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 neon-glow" style={{ background: PURPLE }}>
                    <Zap className="w-8 h-8" style={{ color: BG_BLACK }} />
                  </div>
                  <h3 className="text-2xl font-bold text-white">{t.bentoSpeed}</h3>
                  <p className="text-sm mt-2" style={{ color: TEXT_ZINC_400 }}>{t.bentoSpeedDesc}</p>
                </motion.div>

                {/* Carte voix */}
                <motion.div
                  whileHover={{ y: -6, boxShadow: `0 0 25px ${PURPLE_GLOW}`, borderColor: PURPLE }}
                  transition={{ type: "spring", stiffness: 250, damping: 20 }}
                  className="p-10 rounded-[32px] border"
                  style={{ background: BG_CARD, borderColor: BORDER_ZINC_800 }}
                >
                  <h3 className="text-2xl font-bold mb-4 text-white">{t.bentoVoices}</h3>
                  <p className="text-lg" style={{ color: TEXT_ZINC_400 }}>{t.bentoVoicesDesc}</p>
                </motion.div>

                {/* Carte droits */}
                <motion.div
                  whileHover={{ y: -6, boxShadow: `0 0 25px ${PURPLE_GLOW}`, borderColor: PURPLE }}
                  transition={{ type: "spring", stiffness: 250, damping: 20 }}
                  className="md:col-span-2 p-10 rounded-[32px] border"
                  style={{ background: BG_CARD, borderColor: BORDER_ZINC_800 }}
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: PURPLE }}>
                      <Check className="w-6 h-6" style={{ color: BG_BLACK }} />
                    </div>
                    <h3 className="text-2xl font-bold text-white">{t.bentoRights}</h3>
                  </div>
                  <p className="text-lg" style={{ color: TEXT_ZINC_400 }}>{t.bentoRightsDesc}</p>
                </motion.div>
              </div>
            </div>
          </section>
        </AnimatedSection>

        {/* ═══════════ PRICING ═══════════ */}
        <AnimatedSection>
          <section id="pricing" className="py-24 px-6 relative overflow-hidden">
            <SectionGlow style={{ top: "10%", right: "5%", width: 420, height: 420 }} />
            <div className="max-w-7xl mx-auto relative z-10">
              <div className="text-center mb-14">
                <h2 className="text-4xl md:text-6xl font-extrabold mb-4 tracking-tight text-white" style={{ fontFamily: isRTL ? AR_STACK : FR_HEADING_STACK }}>
                  {t.transparent}
                </h2>
                <p className="text-lg max-w-2xl mx-auto" style={{ color: TEXT_ZINC_400 }}>{t.transparentSub}</p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {pricingTiers.map((tier, i) => (
                  <AnimatedSection key={i} delay={i * 0.1}>
                    <PricingCard 
                      tier={tier} 
                      chooseLabel={t.choose} 
                      audiosLabel={t.audiosLabel} 
                      featuresLabels={featuresLabels} 
                      popularLabel={t.popularLabel}
                    />
                  </AnimatedSection>
                ))}
              </div>
            </div>
          </section>
        </AnimatedSection>

        {/* ═══════════ TÉMOIGNAGE ═══════════ */}
        <AnimatedSection>
          <section className="py-24 px-6 relative">
            <div className="max-w-5xl mx-auto">
              <Testimonial quote={t.testimonialQuote} name={t.testimonialName} role={t.testimonialRole} />
            </div>
          </section>
        </AnimatedSection>

        {/* ═══════════ FAQ ═══════════ */}
        <AnimatedSection>
          <section id="faq" className="py-24 px-6">
            <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12">
              <div>
                <h2 className="text-5xl md:text-6xl font-extrabold mb-6 tracking-tight" style={{ color: PURPLE, fontFamily: isRTL ? AR_STACK : FR_HEADING_STACK }}>
                  {t.faqTitle}
                </h2>
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
          <section className="py-32 px-6 relative overflow-hidden">
            <div className="blob absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[36rem] h-[36rem] rounded-full" style={{ background: PURPLE, opacity: 0.1 }} />
            <div className="max-w-4xl mx-auto text-center relative z-10">
              <h2 className="text-5xl md:text-7xl font-extrabold mb-8 tracking-tight text-white" style={{ fontFamily: isRTL ? AR_STACK : FR_HEADING_STACK }}>
                {t.experts}
              </h2>
              <motion.button
                whileHover={{ scale: 1.06, background: PURPLE, color: BG_BLACK }}
                whileTap={{ scale: 0.97 }}
                onClick={onSigninClick}
                className="px-10 py-5 rounded-full text-lg font-bold inline-flex items-center gap-3"
                style={{ background: "transparent", border: `2px solid ${PURPLE}`, color: PURPLE }}
              >
                {t.ctaMain}
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </div>
          </section>
        </AnimatedSection>

        {/* ═══════════ FOOTER ═══════════ */}
        <footer className="py-16 px-6 border-t" style={{ borderColor: BORDER_ZINC_800 }}>
          <div className="max-w-7xl mx-auto text-center">
            <div className="flex justify-center"><Logo size={36} /></div>
            <div className="flex items-center justify-center gap-6 mt-6 text-sm" style={{ color: TEXT_ZINC_600 }}>
              <a href="#" className="hover:text-white transition">{t.footerTerms}</a>
              <a href="#" className="hover:text-white transition">{t.footerPrivacy}</a>
              <a href="#" className="hover:text-white transition">{t.footerContact}</a>
            </div>
            <p className="mt-4 text-sm" style={{ color: TEXT_ZINC_600 }}>{t.footerMade}</p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;
