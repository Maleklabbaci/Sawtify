import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  Play,
  Pause,
  ShieldCheck,
  Sparkles,
  Mic,
  Zap,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Volume2,
  Youtube,
  Instagram,
  Music2,
  Video,
  Megaphone,
  Mic2,
  Star,
  Rocket,
  Camera,
  Headphones,
  Waves,
  Check,
  Layers,
  Building2,
  FileText,
  SpellCheck2,
  Languages,
  Menu,
  X,
  Quote,
  Type,
  Download,
  Mail,
  Facebook,
  Linkedin,
  Send,
  Heart,
  Globe,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface LandingPageProps {
  onLoginClick: () => void;
  onSigninClick: () => void;
  language: "fr" | "ar";
  setLanguage: (lang: "fr" | "ar") => void;
}

/* =========================================================
   STYLES GLOBAUX INJECTÉS (shimmer, smooth scroll, a11y)
========================================================= */
const GlobalStyles = () => (
  <style>{`
    html { scroll-behavior: smooth; }

    @keyframes sawtify-shimmer {
      0%   { transform: translateX(-120%); }
      100% { transform: translateX(220%); }
    }
    .sawtify-shimmer {
      animation: sawtify-shimmer 2.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    }

    .sawtify-focus:focus-visible {
      outline: 2px solid #8b5cf6;
      outline-offset: 3px;
      border-radius: 9999px;
    }

    @media (prefers-reduced-motion: reduce) {
      html { scroll-behavior: auto; }
      .sawtify-shimmer { animation: none; }
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }
  `}</style>
);

/* =========================================================
   Fix bug RTL : isole les chiffres (bidi)
========================================================= */
const Num = ({
  children,
  className = "",
  style = {},
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) => (
  <span
    dir="ltr"
    style={{ unicodeBidi: "isolate", ...style }}
    className={`inline-block ${className}`}
  >
    {children}
  </span>
);

/* =========================================================
   #5 — Compteur animé (IntersectionObserver + easeOutCubic)
========================================================= */
const AnimatedCounter = ({
  target,
  suffix = "",
  duration = 1600,
  className = "",
  style = {},
}: {
  target: number;
  suffix?: string;
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
}) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started.current) return;
        started.current = true;

        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          setCount(Math.round(eased * target));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [target, duration]);

  return (
    <Num className={className} style={style}>
      <span ref={ref}>
        {count.toLocaleString("en-US")}
        {suffix}
      </span>
    </Num>
  );
};

/* =========================================================
   Web Audio API — waveform réactive (WeakMap = 1 source/élément)
========================================================= */
function useAudioVisualizer(
  audioEl: HTMLAudioElement | null,
  isPlaying: boolean,
  barCount = 28
) {
  const [bars, setBars] = useState<number[]>(Array(barCount).fill(14));
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>();
  const sourceMapRef = useRef<WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>>(
    new WeakMap()
  );

  useEffect(() => {
    if (!isPlaying || !audioEl) {
      setBars(Array(barCount).fill(14));
      return;
    }

    let analyser: AnalyserNode | null = null;

    try {
      if (!ctxRef.current) {
        ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = ctxRef.current;
      if (ctx.state === "suspended") ctx.resume();

      let source = sourceMapRef.current.get(audioEl);
      if (!source) {
        source = ctx.createMediaElementSource(audioEl);
        sourceMapRef.current.set(audioEl, source);
      }

      analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.75;
      source.connect(analyser);
      analyser.connect(ctx.destination);

      const data = new Uint8Array(analyser.frequencyBinCount);
      const localAnalyser = analyser;

      const tick = () => {
        localAnalyser.getByteFrequencyData(data);
        setBars(
          Array.from(data.slice(0, barCount)).map((v) => Math.max(12, (v / 255) * 100))
        );
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      /* fallback silencieux */
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      analyser?.disconnect();
    };
  }, [isPlaying, audioEl, barCount]);

  return bars;
}

/* =========================================================
   #4 + #11 — Scroll state + progression
========================================================= */
function useScrollInfo() {
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 60);
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(h > 0 ? Math.min(y / h, 1) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return { scrolled, progress };
}

/* =========================================================
   #9 — Carte avec tilt 3D
========================================================= */
const TiltCard = ({
  children,
  className = "",
  max = 7,
}: {
  children: React.ReactNode;
  className?: string;
  max?: number;
}) => {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width - 0.5) * (max * 2);
    const y = ((e.clientY - r.top) / r.height - 0.5) * -(max * 2);
    setTilt({ x, y });
  };

  return (
    <div
      onMouseMove={onMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      style={{
        transform: `perspective(900px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg) translateZ(0)`,
        transition: "transform 0.18s ease-out",
        transformStyle: "preserve-3d",
      }}
      className={className}
    >
      {children}
    </div>
  );
};

/* =========================================================
   Transition courbe entre sections
========================================================= */
const SectionWave = ({
  fromColor = "#0f0818",
  toColor = "#F7F5F1",
  flip = false,
}: {
  fromColor?: string;
  toColor?: string;
  flip?: boolean;
}) => (
  <div className="relative" style={{ backgroundColor: fromColor }} aria-hidden="true">
    <svg
      viewBox="0 0 1440 120"
      className={`w-full h-[60px] sm:h-[100px] block ${flip ? "rotate-180" : ""}`}
      preserveAspectRatio="none"
    >
      <path
        d="M0,64 C240,120 480,0 720,32 C960,64 1200,120 1440,64 L1440,120 L0,120 Z"
        fill={toColor}
      />
    </svg>
  </div>
);

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };

const LOGO_URL = "https://i.ibb.co/nqShkPNP/68126702-75e5-4de6-9b53-e51800b05e4a.jpg";
const HERO_BG_URL = "https://i.ibb.co/zTwPD6gj/HEROBACKGROUND.jpg";

const PARTICLES = [
  { x: "15%", size: 4, delay: 0, duration: 4.2 },
  { x: "35%", size: 3, delay: 1, duration: 5.1 },
  { x: "55%", size: 5, delay: 2, duration: 4.6 },
  { x: "75%", size: 3, delay: 0.5, duration: 5.4 },
  { x: "90%", size: 4, delay: 1.5, duration: 4.8 },
];

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
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [currentAudioEl, setCurrentAudioEl] = useState<HTMLAudioElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTesti, setActiveTesti] = useState(0);
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const bars = useAudioVisualizer(currentAudioEl, playingId !== null);
  const { scrolled, progress } = useScrollInfo();

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
  }, [language, isRTL]);

  /* Lock scroll quand le menu mobile est ouvert */
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  /* Fermeture au clavier (Échap) */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* Nettoyage audio au démontage */
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const ArrowIcon = ({ className = "w-4 h-4" }: { className?: string }) =>
    isRTL ? <ArrowLeft className={className} /> : <ArrowRight className={className} />;

  /* ---------------------- TRADUCTIONS ---------------------- */
  const t = {
    skip: isRTL ? "تخطي إلى المحتوى" : "Aller au contenu",
    navHome: isRTL ? "الرئيسية" : "Accueil",
    navHow: isRTL ? "كيف يعمل" : "Comment ça marche",
    navServices: isRTL ? "الأصوات" : "Voix",
    navAbout: isRTL ? "من نحن" : "À propos",
    navPricing: isRTL ? "الأسعار" : "Tarifs",
    cta: isRTL ? "ابدأ الآن" : "Commencer",

    heroLine1: isRTL ? "صوت واضح." : "Voix claire.",
    heroLine2: isRTL ? "عاطفة حقيقية." : "Émotion réelle.",
    heroLine3: isRTL ? "أثر دائم." : "Impact durable.",
    heroSub: isRTL
      ? "نساعد المبدعين والعلامات التجارية على تحويل نصوصهم إلى أصوات ذكاء اصطناعي بالدارجة الجزائرية، طبيعية وجاهزة للاستخدام فوراً."
      : "Nous aidons créateurs et marques à donner vie à leurs textes grâce à des voix IA en darija algérienne, naturelles et prêtes à l'emploi.",
    viewDemo: isRTL ? "شاهد العرض" : "Voir la démo",
    bookCall: isRTL ? "ابدأ مجاناً" : "Essayer gratuitement",
    trustLine: isRTL ? "دفع محلي عبر SATIM" : "Paiement local via SATIM",

    /* Comment ça marche */
    howLabel: isRTL ? "• الطريقة" : "• Le process",
    howTitle: isRTL ? "ثلاث خطوات. ثلاثون ثانية." : "Trois étapes. Trente secondes.",
    howSub: isRTL
      ? "بدون استوديو، بدون ممثل صوتي، بدون انتظار. فقط نصك وصوتك النهائي."
      : "Pas de studio, pas de comédien à réserver, pas d'attente. Juste ton texte et ton audio final.",
    step1Title: isRTL ? "اكتب نصك" : "Écris ton texte",
    step1Desc: isRTL
      ? "الصق نصك أو دع الذكاء الاصطناعي يولّد لك سكريبت بالدارجة."
      : "Colle ton texte ou laisse l'IA générer un script en darija pour toi.",
    step2Title: isRTL ? "اختر صوتك" : "Choisis ta voix",
    step2Desc: isRTL
      ? "أكثر من 12 صوتاً وعدة لهجات جزائرية. اضبط السرعة والنبرة."
      : "Plus de 12 voix et plusieurs lahjat algériennes. Règle vitesse et ton.",
    step3Title: isRTL ? "حمّل صوتك" : "Télécharge ton audio",
    step3Desc: isRTL
      ? "MP3 أو WAV بجودة استوديو 24 kHz، جاهز للاستخدام التجاري."
      : "MP3 ou WAV en qualité studio 24 kHz, prêt pour un usage commercial.",

    partnershipsLabel: isRTL ? "• التقنية" : "• Technologie",
    partnershipsTitle: isRTL
      ? "تقنية صوتية مصممة للمبدعين الجزائريين."
      : "Une technologie vocale pensée pour les créateurs algériens.",
    partnershipsDesc: isRTL
      ? "من توليد السيناريو إلى التصدير النهائي، نجمع بين الذكاء الاصطناعي المتقدم والأصالة الثقافية لمساعدة المبدعين على الإنتاج أسرع دون التضحية بالجودة."
      : "De la génération de script à l'export final, nous combinons IA de pointe et authenticité culturelle pour produire plus vite, sans sacrifier la qualité.",
    stat1: isRTL ? "رضا المبدعين" : "Satisfaction créateurs",
    stat2: isRTL ? "أصوات متاحة" : "Voix disponibles",
    stat3: isRTL ? "مبدع نشط" : "Créateurs actifs",
    usedOn: isRTL ? "يُستعمل يومياً على" : "Utilisé chaque jour sur",

    aboutLabel: isRTL ? "• من نحن" : "• À propos",
    aboutTitle: isRTL
      ? "نساعد المبدعين على منح صوت بشري لأفكارهم."
      : "Nous aidons les créateurs à donner une voix humaine à leurs idées.",
    aboutDesc: isRTL
      ? "Sawtify يجمع بين الذكاء الاصطناعي والأصالة الصوتية حتى يتمكن كل مبدع أو علامة تجارية من إنتاج تعليقات صوتية بالدارجة، دون استوديو أو حجز ممثل صوتي."
      : "Sawtify combine intelligence artificielle et authenticité vocale pour que chaque créateur puisse produire des voix off en darija, sans studio ni comédien à réserver.",
    learnMore: isRTL ? "اعرف أكثر" : "En savoir plus",

    perfLabel: isRTL ? "الأداء" : "Performance",
    perfSubLabel: isRTL ? "وقت الإنتاج" : "Temps de production",
    perfStat: "-68%",
    perfNote: isRTL ? "مقارنة بالتسجيل الاستوديو التقليدي" : "vs enregistrement studio classique",

    showcaseLabel: isRTL ? "• جودة احترافية" : "• Qualité professionnelle",
    showcaseTitle: isRTL ? "من الفكرة إلى الصوت النهائي." : "De l'idée au son final.",
    showcaseSub: isRTL
      ? "خط إنتاج احترافي مصمم للمبدعين الذين لا يملكون وقتاً للانتظار."
      : "Un pipeline de production pensé pour les créateurs qui n'ont pas de temps à perdre.",

    testiLabel: isRTL ? "• آراء المستخدمين" : "• Témoignages",
    testiTitle: isRTL ? "ما يقوله المبدعون عنا" : "Ce que disent les créateurs",

    ctaBadge: isRTL ? "عرض محدود" : "Offre de lancement",
    ctaTitle: isRTL
      ? "50 نقطة مجانية عند التسجيل الآن."
      : "50 points offerts pour votre première voix.",
    ctaSub: isRTL
      ? "بدون بطاقة بنكية. جرّب الجودة بنفسك في أقل من دقيقة."
      : "Sans carte bancaire. Testez la qualité vous-même en moins d'une minute.",
    ctaButton: isRTL ? "ابدأ مجاناً" : "Commencer gratuitement",

    pricingLabel: isRTL ? "• الأسعار" : "• Tarifs",
    pricingTitle: isRTL ? "ادفع فقط لما تستخدمه" : "Payez seulement ce que vous utilisez",
    pricingSub: isRTL
      ? "بدون اشتراك شهري. النقاط لا تنتهي صلاحيتها أبداً."
      : "Sans abonnement mensuel. Les points achetés n'expirent jamais.",

    faqKicker: isRTL ? "الأسئلة" : "FAQ",
    faqTitle: isRTL ? "الأسئلة الشائعة" : "Ce qu'on nous demande souvent",

    /* Footer */
    footTagline: isRTL
      ? "أصوات ذكاء اصطناعي بالدارجة الجزائرية، جاهزة في ثوانٍ."
      : "Des voix IA en darija algérienne, prêtes en quelques secondes.",
    footProduct: isRTL ? "المنتج" : "Produit",
    footSupport: isRTL ? "الدعم" : "Support",
    footLegal: isRTL ? "قانوني" : "Légal",
    footNewsletter: isRTL ? "النشرة البريدية" : "Newsletter",
    footNewsletterSub: isRTL
      ? "أصوات جديدة وميزات كل شهر. بدون سبام."
      : "Nouvelles voix et fonctionnalités chaque mois. Zéro spam.",
    emailPlaceholder: isRTL ? "بريدك الإلكتروني" : "Votre email",
    subscribe: isRTL ? "اشترك" : "S'inscrire",
    subscribed: isRTL ? "تم الاشتراك ✓" : "Inscrit ✓",
    madeIn: isRTL ? "صُنع بـ 💜 في الجزائر" : "Fait avec 💜 en Algérie",
    backTop: isRTL ? "العودة للأعلى" : "Retour en haut",
    openMenu: isRTL ? "فتح القائمة" : "Ouvrir le menu",
    closeMenu: isRTL ? "إغلاق القائمة" : "Fermer le menu",
    switchLang: isRTL ? "Passer en français" : "التبديل إلى العربية",
  };

  /* ---------------------- DONNÉES ---------------------- */
  const navLinks = [
    { href: "#home", label: t.navHome },
    { href: "#how", label: t.navHow },
    { href: "#voices", label: t.navServices },
    { href: "#about", label: t.navAbout },
    { href: "#pricing", label: t.navPricing },
  ];

  const badges = [
    { icon: Sparkles, label: isRTL ? "ذكاء اصطناعي" : "IA native", color: "bg-violet-500", pos: "top-[20%] left-[10%] md:left-[18%]" },
    { icon: Zap, label: isRTL ? "سريع" : "Ultra rapide", color: "bg-fuchsia-500", pos: "top-[18%] right-[8%] md:right-[16%]" },
    { icon: Star, label: isRTL ? "احترافي" : "Qualité pro", color: "bg-indigo-500", pos: "top-[42%] right-[4%] md:right-[10%]" },
    { icon: Rocket, label: isRTL ? "نمو أسرع" : "Grow faster", color: "bg-violet-400", pos: "top-[46%] left-[4%] md:left-[8%]" },
    { icon: Mic, label: isRTL ? "دارجة أصيلة" : "Feel Darija", color: "bg-purple-500", pos: "top-[54%] right-[20%] md:right-[26%]" },
  ];

  const logos = [
    { icon: Youtube, name: "YouTube" },
    { icon: Music2, name: "TikTok" },
    { icon: Instagram, name: "Instagram" },
    { icon: Video, name: "Reels" },
    { icon: Megaphone, name: "Ads" },
    { icon: Mic2, name: "Podcasts" },
  ];

  const perfTags = isRTL
    ? ["سريع", "ذكاء اصطناعي", "دارجة", "جودة استوديو"]
    : ["Rapide", "IA native", "Darija", "Studio quality"];

  const quickFeatures = [
    {
      icon: FileText,
      title: isRTL ? "توليد سكريبت مستهدف" : "Générateur de script ciblé",
      desc: isRTL
        ? "سكريبتات مصممة خصيصاً للسوق الجزائري، جاهزة للتوليد الصوتي مباشرة."
        : "Scripts pensés pour le marché algérien, prêts à être transformés en voix.",
    },
    {
      icon: SpellCheck2,
      title: isRTL ? "مصحّح ذكي" : "Correcteur intelligent",
      desc: isRTL
        ? "يصحح نصك تلقائياً قبل التوليد لضمان نطق مثالي."
        : "Corrige automatiquement ton texte avant génération pour un rendu parfait.",
    },
    {
      icon: Languages,
      title: isRTL ? "دعم اللهجات" : "Support des lahjat",
      desc: isRTL
        ? "عدة لهجات جزائرية متاحة، وليس دارجة عامة موحدة."
        : "Plusieurs lahjat algériennes disponibles, pas une darija générique.",
    },
  ];

  /* #1 — Étapes */
  const steps = [
    {
      n: "01",
      icon: Type,
      title: t.step1Title,
      desc: t.step1Desc,
      accent: "from-violet-500 to-purple-600",
    },
    {
      n: "02",
      icon: Mic,
      title: t.step2Title,
      desc: t.step2Desc,
      accent: "from-fuchsia-500 to-violet-600",
    },
    {
      n: "03",
      icon: Download,
      title: t.step3Title,
      desc: t.step3Desc,
      accent: "from-indigo-500 to-violet-500",
    },
  ];

  /* #2 — Témoignages */
  const testimonials = isRTL
    ? [
        {
          quote:
            "Sawtify عوّضلي استوديو التسجيل. ولّيت نخرّج 10 ريلز في النهار بجودة ما كنتش نتصوّرها.",
          name: "أمين بلعيد",
          role: "منشئ محتوى يوتيوب",
          meta: "120 ألف مشترك",
          initials: "أب",
          color: "bg-violet-600",
        },
        {
          quote:
            "الدارجة طبيعية بزاف. الزبائن تاعنا ما عرفوش بلي الصوت مولّد بالذكاء الاصطناعي.",
          name: "ياسمين قادري",
          role: "مديرة وكالة إشهار",
          meta: "الجزائر العاصمة",
          initials: "يق",
          color: "bg-fuchsia-600",
        },
        {
          quote:
            "الدفع بالذهبية سهّلها عليا بزاف. 5 دقايق ومعايا التعليق الصوتي تاع الإعلان.",
          name: "خالد مرزوق",
          role: "صاحب متجر إلكتروني",
          meta: "وهران",
          initials: "خم",
          color: "bg-indigo-600",
        },
      ]
    : [
        {
          quote:
            "Sawtify a remplacé mon studio d'enregistrement. Je produis 10 reels par jour avec une qualité que je n'imaginais pas atteignable.",
          name: "Amine Belaid",
          role: "Créateur YouTube",
          meta: "120K abonnés",
          initials: "AB",
          color: "bg-violet-600",
        },
        {
          quote:
            "La darija sonne vraiment naturelle. Nos clients n'ont pas deviné que la voix était générée par IA.",
          name: "Yasmine Kadri",
          role: "Directrice d'agence pub",
          meta: "Alger",
          initials: "YK",
          color: "bg-fuchsia-600",
        },
        {
          quote:
            "Le paiement Edahabia a tout changé pour moi. 5 minutes et j'ai la voix off de ma pub prête à publier.",
          name: "Khaled Merzoug",
          role: "E-commerçant",
          meta: "Oran",
          initials: "KM",
          color: "bg-indigo-600",
        },
      ];

  /* Auto-rotation du carousel */
  useEffect(() => {
    const id = setInterval(
      () => setActiveTesti((p) => (p + 1) % testimonials.length),
      6000
    );
    return () => clearInterval(id);
  }, [testimonials.length]);

  const voices = [
    { id: "amin", name: isRTL ? "أمين" : "Amin", tag: isRTL ? "تجاري • دارجة" : "Commercial · Darija", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
    { id: "yasmine", name: isRTL ? "ياسمين" : "Yasmine", tag: isRTL ? "إعلان • ناعم" : "Publicité · Douce", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
    { id: "khalid", name: isRTL ? "خالد" : "Khalid", tag: isRTL ? "وثائقي • عميق" : "Documentaire · Grave", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
    { id: "layla", name: isRTL ? "ليلى" : "Layla", tag: isRTL ? "سوشيال • حيوي" : "Social · Énergique", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
  ];

  const pricingPlans = [
    {
      icon: Zap,
      points: "100",
      bonus: null as string | null,
      price: "500",
      desc: isRTL ? "مثالي للتجربة وإنشاء 5 أصوات." : "Idéal pour tester et créer 5 voix-off haute définition.",
      popular: false,
    },
    {
      icon: Zap,
      points: "220",
      bonus: "10%+",
      price: "1 000",
      desc: isRTL ? "الأكثر طلباً في الجزائر. +20 نقطة مجانية." : "Le plus populaire en Algérie. +20 points offerts.",
      popular: true,
    },
    {
      icon: Layers,
      points: "600",
      bonus: "20%+",
      price: "2 500",
      desc: isRTL ? "للمبدعين المنتظمين والوكالات." : "Pour les créateurs réguliers et agences. +100 points offerts.",
      popular: false,
    },
    {
      icon: Building2,
      points: "1 350",
      bonus: "35%+",
      price: "5 000",
      desc: isRTL ? "حجم موسّع ودعم مخصص وأولوية." : "Volume étendu, support dédié et accès prioritaire aux modèles.",
      popular: false,
    },
  ];

  const pricingFeatures = [
    isRTL ? "جودة استوديو 24 kHz" : "Qualité studio 24 kHz",
    isRTL ? "تحميل MP3 & WAV" : "Téléchargement MP3 & WAV",
    isRTL ? "استخدام تجاري كامل" : "Usage commercial complet",
    isRTL ? "نقاط صالحة مدى الحياة" : "Crédits valables à vie",
  ];

  const showcaseItems = [
    {
      img: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?q=80&w=1200&auto=format&fit=crop",
      icon: Waves,
      label: isRTL ? "استوديو رقمي" : "Studio numérique",
      title: isRTL ? "بيئة إنتاج متكاملة" : "Environnement de production complet",
    },
    {
      img: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?q=80&w=1200&auto=format&fit=crop",
      icon: Camera,
      label: isRTL ? "إنتاج المحتوى" : "Production de contenu",
    },
    {
      img: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=1200&auto=format&fit=crop",
      icon: Headphones,
      label: isRTL ? "مونتاج احترافي" : "Montage professionnel",
    },
  ];

  const faqs = isRTL
    ? [
        { q: "هل الأصوات صالحة للاستخدام التجاري؟", a: "نعم. كل الملفات قابلة للاستخدام في الإعلانات، الريلز، اليوتيوب والمشاريع التجارية." },
        { q: "كيف يعمل نظام النقاط؟", a: "تشتري رصيداً مرة واحدة. التوليد الصوتي = 20 نقطة. النقاط لا تنتهي صلاحيتها." },
        { q: "هل تدعمون الذهبية و CIB؟", a: "نعم عبر SATIM. الدفع محلي بالدينار الجزائري." },
        { q: "هل هناك اشتراك شهري؟", a: "لا. Sawtify نظام دفع مقابل الاستخدام فقط." },
        { q: "كم من الوقت يستغرق التوليد؟", a: "أقل من 30 ثانية لنص عادي. الملفات الطويلة تأخذ دقيقة على الأكثر." },
      ]
    : [
        { q: "Les voix sont-elles libres de droits ?", a: "Oui. Usage commercial autorisé : pubs, reels, YouTube, projets clients." },
        { q: "Comment fonctionne le système de points ?", a: "Tu achètes un pack une fois. Une génération vocale coûte 20 points. Les points n'expirent jamais." },
        { q: "Edahabia et CIB sont-ils acceptés ?", a: "Oui, via SATIM. Paiement 100% local, en dinars algériens." },
        { q: "Y a-t-il un abonnement mensuel ?", a: "Non. Sawtify fonctionne uniquement en Pay-As-You-Go." },
        { q: "Combien de temps prend une génération ?", a: "Moins de 30 secondes pour un texte standard. Une minute maximum pour les longs formats." },
      ];

  const footerCols = [
    {
      title: t.footProduct,
      links: [
        { label: isRTL ? "الأصوات" : "Les voix", href: "#voices" },
        { label: isRTL ? "الأسعار" : "Tarifs", href: "#pricing" },
        { label: isRTL ? "كيف يعمل" : "Comment ça marche", href: "#how" },
        { label: "API", href: "#" },
      ],
    },
    {
      title: t.footSupport,
      links: [
        { label: "FAQ", href: "#faq" },
        { label: isRTL ? "اتصل بنا" : "Contact", href: "#" },
        { label: isRTL ? "مركز المساعدة" : "Centre d'aide", href: "#" },
        { label: isRTL ? "الحالة" : "Statut", href: "#" },
      ],
    },
    {
      title: t.footLegal,
      links: [
        { label: isRTL ? "شروط الاستخدام" : "CGU / CGV", href: "#" },
        { label: isRTL ? "الخصوصية" : "Confidentialité", href: "#" },
        { label: "Cookies", href: "#" },
        { label: isRTL ? "بيانات قانونية" : "Mentions légales", href: "#" },
      ],
    },
  ];

  const socials = [
    { icon: Instagram, label: "Instagram" },
    { icon: Facebook, label: "Facebook" },
    { icon: Music2, label: "TikTok" },
    { icon: Youtube, label: "YouTube" },
    { icon: Linkedin, label: "LinkedIn" },
  ];

  /* ---------------------- HANDLERS ---------------------- */
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

  const handleNavClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      e.preventDefault();
      setMenuOpen(false);
      const el = document.querySelector(href);
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - 72;
        window.scrollTo({ top, behavior: "smooth" });
      }
    },
    []
  );

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
    setEmail("");
    setTimeout(() => setSubscribed(false), 3500);
  };

  const serifFont = isRTL ? "'Cairo', serif" : "'Fraunces', Georgia, serif";

  /* =======================================================
     RENDER
  ======================================================= */
  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="min-h-screen bg-white text-[#141118] selection:bg-purple-200 selection:text-purple-900"
      style={{
        fontFamily: isRTL
          ? "'Cairo', 'Inter', ui-sans-serif, system-ui, sans-serif"
          : "'Inter', ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <GlobalStyles />

      {/* #15 — Skip to content */}
      <a
        href="#home"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:start-4 focus:z-[100] focus:bg-white focus:text-[#141118] focus:px-4 focus:py-2 focus:rounded-full focus:shadow-lg text-sm font-semibold"
      >
        {t.skip}
      </a>

      {/* #11 — Barre de progression de scroll */}
      <div
        aria-hidden="true"
        className="fixed top-0 inset-x-0 h-[3px] z-[70] bg-transparent pointer-events-none"
      >
        <div
          className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-violet-400 transition-[width] duration-100 ease-out"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* =====================================================
          #4 — HEADER SCROLL-AWARE
      ===================================================== */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-[#0f0818]/85 backdrop-blur-xl border-b border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.25)]"
            : "bg-transparent border-b border-transparent"
        }`}
      >
        <div
          className={`mx-auto max-w-6xl px-6 flex items-center justify-between transition-all duration-300 ${
            scrolled ? "h-16" : "h-20"
          }`}
        >
          <a
            href="#home"
            onClick={(e) => handleNavClick(e, "#home")}
            className="flex items-center gap-2.5 sawtify-focus"
            aria-label="Sawtify"
          >
            <div className="w-8 h-8 rounded-full overflow-hidden bg-white shadow-sm shrink-0">
              <img
                src={LOGO_URL}
                alt="Sawtify"
                width={32}
                height={32}
                decoding="async"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="font-semibold text-white text-[15px] tracking-tight">Sawtify</span>
          </a>

          <nav
            className="hidden md:flex items-center gap-7 text-[13px] font-medium text-white/75"
            aria-label="Navigation principale"
          >
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={(e) => handleNavClick(e, l.href)}
                className="relative hover:text-white transition-colors sawtify-focus group py-1"
              >
                {l.label}
                <span className="absolute -bottom-0.5 inset-x-0 h-[1.5px] bg-violet-400 scale-x-0 group-hover:scale-x-100 transition-transform origin-center" />
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLanguage(language === "fr" ? "ar" : "fr")}
              aria-label={t.switchLang}
              className="w-9 h-9 rounded-full text-[11px] font-bold text-white/70 hover:text-white hover:bg-white/10 transition-colors sawtify-focus"
            >
              {language === "fr" ? "AR" : "FR"}
            </button>

            <button
              type="button"
              onClick={onSigninClick}
              className="hidden sm:inline-flex rounded-full bg-white text-[#141118] px-5 py-2.5 text-[13px] font-semibold hover:bg-purple-100 transition-colors sawtify-focus"
            >
              {t.cta}
            </button>

            {/* #3 — Bouton hamburger */}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label={t.openMenu}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              className="md:hidden w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-colors sawtify-focus"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* =====================================================
          #3 — DRAWER MOBILE
      ===================================================== */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm md:hidden"
              aria-hidden="true"
            />
            <motion.div
              id="mobile-menu"
              role="dialog"
              aria-modal="true"
              aria-label={t.openMenu}
              initial={{ x: isRTL ? "-100%" : "100%" }}
              animate={{ x: 0 }}
              exit={{ x: isRTL ? "-100%" : "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 280 }}
              className="fixed inset-y-0 end-0 z-[60] w-[84%] max-w-sm bg-[#0f0818] border-s border-white/10 md:hidden flex flex-col"
            >
              <div className="flex items-center justify-between px-6 h-20 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-white">
                    <img src={LOGO_URL} alt="" className="w-full h-full object-cover" />
                  </div>
                  <span className="font-semibold text-white text-[15px]">Sawtify</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  aria-label={t.closeMenu}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors sawtify-focus"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 px-6 py-8 flex flex-col gap-1" aria-label="Navigation mobile">
                {navLinks.map((l, i) => (
                  <motion.a
                    key={l.href}
                    href={l.href}
                    onClick={(e) => handleNavClick(e, l.href)}
                    initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.06 * i + 0.1 }}
                    className="flex items-center justify-between py-4 text-lg font-medium text-white/85 hover:text-violet-300 border-b border-white/5 transition-colors sawtify-focus"
                  >
                    {l.label}
                    <ArrowIcon className="w-4 h-4 opacity-40" />
                  </motion.a>
                ))}
              </nav>

              <div className="px-6 pb-8 space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onSigninClick();
                  }}
                  className="w-full rounded-full bg-violet-500 text-white py-3.5 text-sm font-semibold hover:bg-violet-400 transition-colors sawtify-focus"
                >
                  {t.cta}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onLoginClick();
                  }}
                  className="w-full rounded-full bg-white/10 border border-white/15 text-white py-3.5 text-sm font-medium hover:bg-white/15 transition-colors sawtify-focus"
                >
                  {t.viewDemo}
                </button>
                <p className="flex items-center justify-center gap-1.5 text-[11px] text-white/35 pt-2">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {t.trustLine}
                </p>
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
        className="relative h-[780px] sm:h-[860px] overflow-hidden bg-[#0f0818]"
        aria-label="Sawtify"
      >
        <img
          src={HERO_BG_URL}
          alt=""
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover object-top"
        />
        <div className="absolute -left-1/3 top-0 w-[160%] h-full bg-gradient-to-tr from-violet-200/25 via-transparent to-transparent blur-3xl rotate-12 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#1a0f2e]/60 to-[#0f0818]" />

        {badges.map((b, i) => (
          <motion.div
            key={b.label}
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
            className={`hidden sm:flex absolute ${b.pos} items-center gap-1.5 bg-black/40 backdrop-blur-md border border-white/10 rounded-full pe-3 ps-1 py-1 text-[11px] font-medium text-white shadow-lg`}
          >
            <span className={`w-5 h-5 rounded-full ${b.color} flex items-center justify-center`}>
              <b.icon className="w-3 h-3 text-white" />
            </span>
            {b.label}
          </motion.div>
        ))}

        <div className="absolute inset-x-0 bottom-[64px] sm:bottom-[90px] px-6 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-4xl sm:text-6xl lg:text-[4rem] leading-[1.06] font-medium tracking-tight text-white mb-5"
            style={{ fontFamily: serifFont }}
          >
            {t.heroLine1}
            <br />
            {t.heroLine2}
            <br />
            {t.heroLine3}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="text-white/60 text-sm sm:text-base max-w-lg mx-auto mb-8"
          >
            {t.heroSub}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-5"
          >
            <button
              type="button"
              onClick={onLoginClick}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white px-5 py-3 text-sm font-medium hover:bg-white/20 transition-colors sawtify-focus"
            >
              <Play className="w-3.5 h-3.5" />
              {t.viewDemo}
            </button>

            {/* #8 — CTA avec shimmer */}
            <button
              type="button"
              onClick={onSigninClick}
              className="group relative w-full sm:w-auto overflow-hidden inline-flex items-center justify-center gap-2 rounded-full bg-violet-400 text-[#140a24] px-6 py-3 text-sm font-semibold hover:bg-violet-300 transition-colors shadow-[0_10px_30px_rgba(167,139,250,0.35)] sawtify-focus"
            >
              <span
                aria-hidden="true"
                className="sawtify-shimmer absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/50 to-transparent skew-x-12"
              />
              <span className="relative">{t.bookCall}</span>
              <ArrowIcon className="relative w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.65 }}
            className="inline-flex items-center gap-1.5 text-[11px] text-white/40"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            {t.trustLine}
          </motion.p>
        </div>
      </section>

      {/* =====================================================
          QUICK FEATURES
      ===================================================== */}
      <section
        className="relative bg-white border-b border-[#141118]/10 overflow-hidden"
        aria-label="Fonctionnalités"
      >
        <div className="mx-auto max-w-6xl px-6 py-14 sm:py-16">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            variants={stagger}
            className="grid sm:grid-cols-3 gap-5 sm:gap-6"
          >
            {quickFeatures.map((f, i) => (
              <motion.div
                key={f.title}
                variants={{
                  hidden: { opacity: 0, y: 40, scale: 0.95 },
                  show: {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
                  },
                }}
                whileHover={{ y: -6 }}
                className="group relative rounded-2xl border border-[#141118]/8 bg-white p-6 cursor-default transition-shadow hover:shadow-[0_20px_40px_rgba(124,58,237,0.12)]"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative mb-4">
                  <motion.div
                    animate={{ scale: [1, 1.06, 1] }}
                    transition={{
                      duration: 2.5,
                      repeat: Infinity,
                      repeatType: "loop",
                      delay: i * 0.3,
                      ease: "easeInOut",
                    }}
                    className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center relative z-10 group-hover:bg-purple-600 group-hover:text-white transition-colors duration-300"
                  >
                    <f.icon className="w-6 h-6" />
                  </motion.div>
                  <motion.div
                    aria-hidden="true"
                    animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
                    transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.3, ease: "easeInOut" }}
                    className="absolute inset-0 w-12 h-12 rounded-xl bg-purple-400/30"
                  />
                </div>

                <h3 className="relative font-semibold text-[15px] text-[#141118] mb-2">{f.title}</h3>
                <p className="relative text-[13px] text-[#141118]/55 leading-relaxed">{f.desc}</p>

                <motion.div
                  initial={{ width: "0%" }}
                  whileInView={{ width: "40%" }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
                  className="h-[2px] bg-purple-500 mt-4 rounded-full"
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* =====================================================
          #1 — COMMENT ÇA MARCHE
      ===================================================== */}
      <section id="how" className="relative bg-[#FAFAFC] py-20 sm:py-28 overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute top-1/3 start-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-violet-200/25 blur-[130px] rounded-full pointer-events-none"
        />

        <div className="relative mx-auto max-w-6xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-xl mx-auto mb-14 sm:mb-20"
          >
            <div className="text-[11px] font-medium text-purple-700 tracking-wide mb-3">
              {t.howLabel}
            </div>
            <h2
              className="text-3xl sm:text-4xl lg:text-[2.75rem] font-medium tracking-tight text-[#141118] leading-[1.15] mb-3"
              style={{ fontFamily: serifFont }}
            >
              {t.howTitle}
            </h2>
            <p className="text-[#141118]/50 text-sm sm:text-base">{t.howSub}</p>
          </motion.div>

          <div className="relative">
            {/* Ligne de liaison */}
            <div
              aria-hidden="true"
              className="hidden lg:block absolute top-[52px] left-[16%] right-[16%] h-[2px]"
            >
              <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, delay: 0.3, ease: "easeInOut" }}
                style={{ transformOrigin: isRTL ? "right" : "left" }}
                className="h-full w-full bg-gradient-to-r from-violet-300 via-fuchsia-300 to-violet-300 rounded-full"
              />
            </div>

            <motion.ol
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-80px" }}
              variants={stagger}
              className="relative grid md:grid-cols-3 gap-8 lg:gap-6 list-none"
            >
              {steps.map((s, i) => (
                <motion.li key={s.n} variants={fadeUp} className="relative text-center px-2">
                  {/* Cercle icône */}
                  <div className="relative inline-flex items-center justify-center mb-6">
                    <motion.span
                      aria-hidden="true"
                      animate={{ scale: [1, 1.35, 1], opacity: [0.35, 0, 0.35] }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        delay: i * 0.5,
                        ease: "easeInOut",
                      }}
                      className="absolute inset-0 rounded-full bg-violet-400/40"
                    />
                    <div
                      className={`relative w-[104px] h-[104px] rounded-full bg-gradient-to-br ${s.accent} flex items-center justify-center shadow-[0_18px_40px_rgba(124,58,237,0.28)] ring-8 ring-[#FAFAFC]`}
                    >
                      <s.icon className="w-9 h-9 text-white" strokeWidth={1.6} />
                    </div>
                    <span className="absolute -top-1 -end-1 w-9 h-9 rounded-full bg-white border border-violet-200 shadow-md flex items-center justify-center">
                      <Num className="text-[12px] font-bold text-violet-700">{s.n}</Num>
                    </span>
                  </div>

                  <h3
                    className="text-xl font-medium text-[#141118] mb-2.5"
                    style={{ fontFamily: serifFont }}
                  >
                    {s.title}
                  </h3>
                  <p className="text-[13.5px] text-[#141118]/55 leading-relaxed max-w-[280px] mx-auto">
                    {s.desc}
                  </p>
                </motion.li>
              ))}
            </motion.ol>
          </div>

          {/* Mini-mockup illustratif */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-16 sm:mt-20 max-w-3xl mx-auto rounded-[1.75rem] border border-[#141118]/8 bg-white shadow-[0_30px_70px_rgba(20,17,24,0.10)] overflow-hidden"
          >
            <div className="flex items-center gap-1.5 px-5 py-3 border-b border-[#141118]/8 bg-[#141118]/[0.02]">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
              <span className="ms-3 text-[11px] font-medium text-[#141118]/35">
                studio.sawtify.dz
              </span>
            </div>

            <div className="p-6 sm:p-8 grid sm:grid-cols-[1fr_auto] gap-6 items-center">
              <div>
                <div className="rounded-xl bg-[#141118]/[0.03] border border-[#141118]/8 p-4 text-[13.5px] text-[#141118]/70 leading-relaxed mb-4 min-h-[80px]">
                  {isRTL
                    ? "«مرحبا بيكم، اكتشفوا العرض الجديد تاعنا... خصم 30% على كامل المجموعة!»"
                    : "« Ahlan bikoum, découvrez notre nouvelle offre… 30% de réduction sur toute la collection ! »"}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 text-violet-700 px-3 py-1.5 text-[11px] font-semibold">
                    <Mic className="w-3 h-3" /> Amin · Darija
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#141118]/5 text-[#141118]/60 px-3 py-1.5 text-[11px] font-medium">
                    <Zap className="w-3 h-3" /> <Num>20</Num> pts
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 text-green-700 px-3 py-1.5 text-[11px] font-medium">
                    <Check className="w-3 h-3" /> <Num>24</Num> kHz
                  </span>
                </div>
              </div>

              <div className="flex sm:flex-col items-center justify-center gap-3">
                <div className="flex items-end gap-[3px] h-12 w-32">
                  {Array.from({ length: 22 }).map((_, i) => (
                    <motion.span
                      key={i}
                      animate={{ height: ["24%", `${30 + ((i * 37) % 65)}%`, "24%"] }}
                      transition={{
                        duration: 1.2 + (i % 5) * 0.15,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: i * 0.05,
                      }}
                      className="flex-1 rounded-full bg-violet-500/70"
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={onSigninClick}
                  className="inline-flex items-center gap-2 rounded-full bg-[#141118] text-white px-5 py-2.5 text-[13px] font-semibold hover:bg-violet-700 transition-colors sawtify-focus whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  MP3 / WAV
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* =====================================================
          PARTNERSHIPS / STATS (#5 compteurs + #7 marquee)
      ===================================================== */}
      <section className="relative bg-[#0f0818] pt-16 pb-20" aria-label="Chiffres clés">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="text-[11px] font-medium text-white/40 tracking-wide mb-4">
              {t.partnershipsLabel}
            </div>
            <h2
              className="text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-violet-400 max-w-2xl leading-[1.15] mb-5"
              style={{ fontFamily: serifFont }}
            >
              {t.partnershipsTitle}
            </h2>
            <p className="text-white/45 text-sm sm:text-base max-w-xl leading-relaxed mb-12">
              {t.partnershipsDesc}
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={stagger}
            className="grid grid-cols-3 gap-6 sm:gap-12 mb-16"
          >
            {[
              { target: 98, suffix: "%", l: t.stat1 },
              { target: 12, suffix: "+", l: t.stat2 },
              { target: 1200, suffix: "+", l: t.stat3 },
            ].map((s) => (
              <motion.div key={s.l} variants={fadeUp}>
                <AnimatedCounter
                  target={s.target}
                  suffix={s.suffix}
                  className="text-3xl sm:text-5xl font-medium tracking-tight text-violet-400"
                  style={{ fontFamily: serifFont }}
                />
                <div className="text-[11px] sm:text-sm text-white/40 mt-1.5">{s.l}</div>
              </motion.div>
            ))}
          </motion.div>

          {/* #7 — Marquee infini */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-center text-[11px] uppercase tracking-[0.18em] text-white/25 mb-6">
              {t.usedOn}
            </p>

            <div
              dir="ltr"
              className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]"
            >
              <motion.div
                animate={{ x: ["0%", "-50%"] }}
                transition={{ duration: 26, repeat: Infinity, ease: "linear" }}
                className="flex gap-4 w-max"
              >
                {[...logos, ...logos, ...logos].map((l, i) => (
                  <div
                    key={`${l.name}-${i}`}
                    className="flex items-center gap-2 bg-white rounded-full pr-4 pl-2 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.25)] border border-black/5 shrink-0"
                  >
                    <span className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center">
                      <l.icon className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-[13px] font-medium text-[#141118] whitespace-nowrap">
                      {l.name}
                    </span>
                  </div>
                ))}
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      <SectionWave fromColor="#0f0818" toColor="#F7F5F1" />

      {/* =====================================================
          SHOWCASE
      ===================================================== */}
      <section className="bg-[#F7F5F1] pt-4 pb-24 sm:pb-28" aria-label="Showcase">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-xl mx-auto mb-12"
          >
            <div className="text-[11px] font-medium text-purple-700 tracking-wide mb-3">
              {t.showcaseLabel}
            </div>
            <h2
              className="text-3xl sm:text-4xl font-medium tracking-tight text-[#141118]"
              style={{ fontFamily: serifFont }}
            >
              {t.showcaseTitle}
            </h2>
            <p className="text-[#141118]/50 text-sm sm:text-base mt-3">{t.showcaseSub}</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-4 sm:gap-5">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative rounded-3xl overflow-hidden aspect-[4/5] md:row-span-2 group"
            >
              <img
                src={showcaseItems[0].img}
                alt={showcaseItems[0].label}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f0818]/85 via-[#0f0818]/10 to-transparent" />
              <div className="absolute bottom-0 inset-x-0 p-6">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1.5 text-xs font-medium text-white mb-3">
                  <Waves className="w-3.5 h-3.5" />
                  {showcaseItems[0].label}
                </span>
                <h3 className="text-white text-xl font-medium" style={{ fontFamily: serifFont }}>
                  {showcaseItems[0].title}
                </h3>
              </div>
            </motion.div>

            {showcaseItems.slice(1).map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 + i * 0.1 }}
                className="relative rounded-3xl overflow-hidden aspect-[16/9] group"
              >
                <img
                  src={item.img}
                  alt={item.label}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f0818]/80 via-transparent to-transparent" />
                <div className="absolute bottom-0 inset-x-0 p-5">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1.5 text-xs font-medium text-white">
                    <item.icon className="w-3.5 h-3.5" />
                    {item.label}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================
          ABOUT
      ===================================================== */}
      <section id="about" className="relative bg-[#F7F5F1] pb-24 sm:pb-28">
        <div className="mx-auto max-w-6xl px-6 grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="text-[11px] font-medium text-[#141118]/40 tracking-wide mb-4">
              {t.aboutLabel}
            </div>
            <h2
              className="text-3xl sm:text-4xl font-medium tracking-tight text-[#141118] leading-[1.15] mb-5"
              style={{ fontFamily: serifFont }}
            >
              {t.aboutTitle}
            </h2>
            <p className="text-[#141118]/55 text-sm sm:text-base leading-relaxed mb-8 max-w-md">
              {t.aboutDesc}
            </p>
            <button
              type="button"
              onClick={onLoginClick}
              className="inline-flex items-center gap-2 rounded-full bg-[#141118] text-white px-6 py-3 text-sm font-medium hover:bg-purple-700 transition-colors sawtify-focus"
            >
              {t.learnMore}
              <ArrowIcon />
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30, rotate: -2 }}
            whileInView={{ opacity: 1, y: 0, rotate: -2 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative mx-auto w-full max-w-[280px]"
          >
            <div className="rounded-3xl bg-[#141118] text-white p-6 shadow-[0_30px_60px_rgba(20,17,24,0.25)]">
              <div className="flex items-center gap-2 mb-6">
                <span className="w-6 h-6 rounded-full bg-violet-400/20 text-violet-400 flex items-center justify-center">
                  <Volume2 className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-medium text-white/70">{t.perfLabel}</span>
              </div>

              <div className="text-xs text-white/40 mb-1">{t.perfSubLabel}</div>
              <div className="flex items-end gap-3 mb-2">
                <Num
                  className="text-4xl font-medium tracking-tight text-violet-400"
                  style={{ fontFamily: serifFont }}
                >
                  {t.perfStat}
                </Num>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/10 mb-2 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: "68%" }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: 0.3 }}
                  className="h-full rounded-full bg-violet-400"
                />
              </div>
              <div className="text-[11px] text-white/35 mb-6">{t.perfNote}</div>

              <div className="grid grid-cols-2 gap-2">
                {perfTags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] font-medium text-white/70 bg-white/5 border border-white/10 rounded-full px-2.5 py-1.5 text-center"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* =====================================================
          VOICES
      ===================================================== */}
      <section id="voices" className="bg-white border-t border-[#141118]/10">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-3xl sm:text-4xl font-medium tracking-tight text-[#141118] mb-10"
            style={{ fontFamily: serifFont }}
          >
            {isRTL ? "أصوات " : "Des voix "}
            <span className="text-purple-700">
              {isRTL ? "بعاطفة حقيقية." : "avec du caractère."}
            </span>
          </motion.h2>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={stagger}
            className="divide-y divide-[#141118]/10 border-t border-b border-[#141118]/10"
          >
            {voices.map((v) => {
              const active = playingId === v.id;
              return (
                <motion.button
                  key={v.id}
                  type="button"
                  variants={fadeUp}
                  onClick={() => toggleVoice(v.id, v.url)}
                  aria-label={`${active ? "Pause" : "Play"} ${v.name}`}
                  aria-pressed={active}
                  className="w-full flex items-center gap-4 sm:gap-5 py-5 text-start group sawtify-focus"
                >
                  <div
                    className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center border transition-colors ${
                      active
                        ? "bg-purple-700 border-purple-700 text-white"
                        : "border-[#141118]/15 text-[#141118] group-hover:border-purple-400"
                    }`}
                  >
                    {active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ms-0.5" />}
                  </div>

                  <div className="w-28 sm:w-40 shrink-0">
                    <div className="font-medium text-[#141118]">{v.name}</div>
                    <div className="text-xs text-[#141118]/45">{v.tag}</div>
                  </div>

                  <div className="flex-1 flex items-end gap-[3px] h-8" aria-hidden="true">
                    {bars.map((h, i) => (
                      <span
                        key={i}
                        className={`flex-1 rounded-full transition-all duration-150 ${
                          active ? "bg-purple-600" : "bg-[#141118]/10"
                        }`}
                        style={{ height: active ? `${h}%` : "20%" }}
                      />
                    ))}
                  </div>

                  <ArrowIcon className="w-4 h-4 text-[#141118]/20 group-hover:text-purple-600 transition-colors shrink-0" />
                </motion.button>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* =====================================================
          #2 — TÉMOIGNAGES
      ===================================================== */}
      <section
        className="relative bg-[#0f0818] py-20 sm:py-28 overflow-hidden"
        aria-label="Témoignages"
      >
        <div
          aria-hidden="true"
          className="absolute -top-20 start-1/4 w-[420px] h-[420px] bg-violet-600/20 blur-[130px] rounded-full pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-20 end-1/4 w-[420px] h-[420px] bg-fuchsia-600/15 blur-[130px] rounded-full pointer-events-none"
        />

        <div className="relative mx-auto max-w-4xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <div className="text-[11px] font-medium text-violet-400/80 tracking-wide mb-3">
              {t.testiLabel}
            </div>
            <h2
              className="text-3xl sm:text-4xl font-medium tracking-tight text-white"
              style={{ fontFamily: serifFont }}
            >
              {t.testiTitle}
            </h2>
          </motion.div>

          {/* Carte */}
          <div className="relative min-h-[300px] sm:min-h-[260px]">
            <AnimatePresence mode="wait">
              <motion.figure
                key={activeTesti}
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -18, scale: 0.98 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-[1.75rem] bg-white/[0.04] backdrop-blur-sm border border-white/10 p-8 sm:p-10 text-center"
              >
                <Quote
                  className="w-8 h-8 text-violet-400/50 mx-auto mb-5"
                  aria-hidden="true"
                  style={{ transform: isRTL ? "scaleX(-1)" : undefined }}
                />

                <blockquote
                  className="text-white/90 text-lg sm:text-[22px] leading-relaxed font-light mb-7 max-w-2xl mx-auto"
                  style={{ fontFamily: serifFont }}
                >
                  {testimonials[activeTesti].quote}
                </blockquote>

                <div className="flex items-center justify-center gap-1 mb-5" aria-label="5 / 5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>

                <figcaption className="flex items-center justify-center gap-3">
                  <span
                    className={`w-11 h-11 rounded-full ${testimonials[activeTesti].color} text-white flex items-center justify-center text-[13px] font-bold shrink-0`}
                    aria-hidden="true"
                  >
                    {testimonials[activeTesti].initials}
                  </span>
                  <span className="text-start">
                    <span className="block text-sm font-semibold text-white">
                      {testimonials[activeTesti].name}
                    </span>
                    <span className="block text-[12px] text-white/45">
                      {testimonials[activeTesti].role} · {testimonials[activeTesti].meta}
                    </span>
                  </span>
                </figcaption>
              </motion.figure>
            </AnimatePresence>
          </div>

          {/* Contrôles */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              type="button"
              onClick={() =>
                setActiveTesti((p) => (p - 1 + testimonials.length) % testimonials.length)
              }
              aria-label="Précédent"
              className="w-9 h-9 rounded-full border border-white/15 text-white/60 hover:text-white hover:border-white/40 flex items-center justify-center transition-colors sawtify-focus"
            >
              {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            <div className="flex items-center gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveTesti(i)}
                  aria-label={`Témoignage ${i + 1}`}
                  aria-current={activeTesti === i}
                  className={`h-2 rounded-full transition-all duration-300 sawtify-focus ${
                    activeTesti === i ? "w-7 bg-violet-400" : "w-2 bg-white/20 hover:bg-white/40"
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => setActiveTesti((p) => (p + 1) % testimonials.length)}
              aria-label="Suivant"
              className="w-9 h-9 rounded-full border border-white/15 text-white/60 hover:text-white hover:border-white/40 flex items-center justify-center transition-colors sawtify-focus"
            >
              {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </section>

      {/* =====================================================
          CTA FLOTTANT
      ===================================================== */}
      <section className="bg-[#141118] py-8">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            animate={{ y: [0, -8, 0], rotate: [-1, 0.5, -1] }}
            transition={{
              opacity: { duration: 0.7 },
              y: { duration: 5, repeat: Infinity, ease: "easeInOut" },
              rotate: { duration: 6, repeat: Infinity, ease: "easeInOut" },
            }}
            className="relative rounded-[2rem] overflow-hidden border border-[#141118]/10 bg-white shadow-[0_30px_80px_rgba(0,0,0,0.35)]"
          >
            <motion.div
              aria-hidden="true"
              className="absolute w-72 h-72 bg-violet-300/30 blur-[100px] rounded-full pointer-events-none"
              animate={{ x: ["-10%", "10%", "-10%"], y: ["-20%", "10%", "-20%"] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
              style={{ top: "-30%", right: "-10%" }}
            />
            <motion.div
              aria-hidden="true"
              className="absolute w-72 h-72 bg-fuchsia-200/25 blur-[100px] rounded-full pointer-events-none"
              animate={{ x: ["10%", "-10%", "10%"], y: ["10%", "-10%", "10%"] }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
              style={{ bottom: "-30%", left: "-10%" }}
            />

            {PARTICLES.map((p, i) => (
              <motion.div
                key={i}
                aria-hidden="true"
                className="absolute rounded-full bg-violet-400/40 pointer-events-none"
                style={{ left: p.x, width: p.size, height: p.size, bottom: "10%" }}
                animate={{ y: [0, -80, 0], opacity: [0, 0.8, 0] }}
                transition={{
                  duration: p.duration,
                  repeat: Infinity,
                  delay: p.delay,
                  ease: "easeInOut",
                }}
              />
            ))}

            <div className="relative flex flex-col md:flex-row items-center justify-between gap-8 px-8 sm:px-12 py-12 sm:py-14">
              <div className="text-center md:text-start flex-1">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="inline-flex items-center gap-2 rounded-full bg-purple-100 border border-purple-200 px-3 py-1.5 text-xs font-medium text-purple-700 mb-5"
                >
                  <motion.span
                    animate={{ rotate: [0, 15, -15, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
                  >
                    <Zap className="w-3.5 h-3.5" />
                  </motion.span>
                  {t.ctaBadge}
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="text-2xl sm:text-4xl font-medium tracking-tight text-[#141118] leading-[1.2] mb-3"
                  style={{ fontFamily: serifFont }}
                >
                  {t.ctaTitle}
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="text-[#141118]/50 text-sm sm:text-base max-w-md mx-auto md:mx-0"
                >
                  {t.ctaSub}
                </motion.p>
              </div>

              <motion.button
                type="button"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onSigninClick}
                className="group relative inline-flex items-center gap-3 rounded-full bg-violet-600 text-white pe-2 ps-7 py-2.5 text-sm font-semibold shrink-0 shadow-[0_10px_30px_rgba(124,58,237,0.35)] sawtify-focus"
              >
                <motion.span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full bg-violet-600"
                  animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
                <span className="relative">{t.ctaButton}</span>
                <span className="relative w-10 h-10 rounded-full bg-white text-violet-600 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                  <ArrowIcon className="w-4 h-4" />
                </span>
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* =====================================================
          PRICING (#9 tilt 3D)
      ===================================================== */}
      <section id="pricing" className="bg-[#FAFAFC] py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-xl mx-auto mb-14"
          >
            <div className="text-[11px] font-medium text-purple-700 tracking-wide mb-3">
              {t.pricingLabel}
            </div>
            <h2
              className="text-3xl sm:text-4xl font-medium tracking-tight text-[#141118] mb-3"
              style={{ fontFamily: serifFont }}
            >
              {t.pricingTitle}
            </h2>
            <p className="text-[#141118]/50 text-sm sm:text-base">{t.pricingSub}</p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={stagger}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-4"
          >
            {pricingPlans.map((p) => (
              <motion.div key={p.points} variants={fadeUp}>
                <TiltCard
                  className={`relative rounded-3xl p-6 pt-8 bg-white h-full transition-shadow ${
                    p.popular
                      ? "border-2 border-violet-500 shadow-[0_20px_50px_rgba(139,92,246,0.15)]"
                      : "border border-[#141118]/10 hover:shadow-[0_14px_40px_rgba(0,0,0,0.08)]"
                  }`}
                >
                  {p.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full bg-violet-600 text-white text-[11px] font-bold px-4 py-1.5 shadow-lg whitespace-nowrap">
                      <Zap className="w-3 h-3 fill-white" />
                      {isRTL ? "الأكثر طلباً" : "PLUS POPULAIRE"}
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        p.popular
                          ? "bg-violet-100 text-violet-700"
                          : "bg-[#141118]/5 text-[#141118]/60"
                      }`}
                    >
                      <p.icon className="w-5 h-5" />
                    </div>
                    {p.bonus && (
                      <span className="text-[11px] font-semibold text-violet-700 bg-violet-50 rounded-full px-2.5 py-1">
                        <Num>{p.bonus}</Num> Bonus
                      </span>
                    )}
                  </div>

                  <div className="text-2xl font-semibold text-[#141118] mb-1.5">
                    <Num>{p.points}</Num> {isRTL ? "نقطة" : "Points"}
                  </div>
                  <p className="text-[13px] text-[#141118]/50 leading-relaxed mb-5 min-h-[42px]">
                    {p.desc}
                  </p>

                  <div className="flex items-baseline gap-1.5 mb-6">
                    <Num
                      className="text-3xl font-bold tracking-tight text-[#141118]"
                      style={{ fontFamily: serifFont }}
                    >
                      {p.price}
                    </Num>
                    <span className="text-sm text-[#141118]/40 font-medium">DZD</span>
                  </div>

                  <div className="h-px bg-[#141118]/10 mb-5" />

                  <ul className="space-y-2.5 mb-6 list-none">
                    {pricingFeatures.map((f) => (
                      <li
                        key={f}
                        className="flex items-center gap-2.5 text-[13px] text-[#141118]/70"
                      >
                        <Check className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    onClick={onSigninClick}
                    className={`w-full rounded-xl py-3 text-sm font-semibold transition-colors sawtify-focus ${
                      p.popular
                        ? "bg-violet-600 text-white hover:bg-violet-700"
                        : "bg-[#141118]/5 text-[#141118] hover:bg-[#141118]/10"
                    }`}
                  >
                    {p.popular ? (
                      <>
                        ✓ {isRTL ? "الأكثر اختياراً" : "Choix recommandé"}
                      </>
                    ) : (
                      <>
                        {isRTL ? "اختيار" : "Choisir"} <Num>{p.points}</Num>{" "}
                        {isRTL ? "نقطة" : "points"}
                      </>
                    )}
                  </button>
                </TiltCard>
              </motion.div>
            ))}
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-center text-[12px] text-[#141118]/40 mt-10 flex flex-wrap items-center justify-center gap-x-4 gap-y-2"
          >
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-violet-600" /> SATIM · Edahabia · CIB
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-violet-600" />
              {isRTL ? "بدون التزام" : "Sans engagement"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-violet-600" />
              {isRTL ? "أسعار بالدينار" : "Prix en dinars"}
            </span>
          </motion.p>
        </div>
      </section>

      {/* =====================================================
          FAQ (#10 AnimatePresence)
      ===================================================== */}
      <section id="faq" className="bg-white border-t border-[#141118]/10">
        <div className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
          <div className="text-xs text-purple-700 font-medium mb-3">{t.faqKicker}</div>
          <h2
            className="text-3xl font-medium tracking-tight text-[#141118] mb-8"
            style={{ fontFamily: serifFont }}
          >
            {t.faqTitle}
          </h2>

          <div className="border-t border-[#141118]/10">
            {faqs.map((f, i) => {
              const open = openFaq === i;
              return (
                <div key={f.q} className="border-b border-[#141118]/10">
                  <h3>
                    <button
                      type="button"
                      onClick={() => setOpenFaq(open ? null : i)}
                      aria-expanded={open}
                      aria-controls={`faq-panel-${i}`}
                      id={`faq-btn-${i}`}
                      className="w-full py-5 flex items-start gap-4 text-start sawtify-focus"
                    >
                      <span className="text-xs font-mono text-[#141118]/30 pt-0.5 w-6 shrink-0">
                        <Num>{String(i + 1).padStart(2, "0")}</Num>
                      </span>
                      <span className="flex-1 font-medium text-[15px] text-[#141118]">{f.q}</span>
                      <ChevronDown
                        aria-hidden="true"
                        className={`w-4 h-4 text-[#141118]/35 mt-0.5 shrink-0 transition-transform duration-300 ${
                          open ? "rotate-180 text-purple-600" : ""
                        }`}
                      />
                    </button>
                  </h3>

                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        id={`faq-panel-${i}`}
                        role="region"
                        aria-labelledby={`faq-btn-${i}`}
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="ps-10 pb-5 text-sm text-[#141118]/55 leading-relaxed max-w-xl">
                          {f.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================
          #13 — FOOTER ENRICHI
      ===================================================== */}
      <footer className="bg-[#0f0818] text-white/50">
        <div className="mx-auto max-w-6xl px-6 pt-16 pb-10">
          <div className="grid gap-12 lg:grid-cols-[1.4fr_repeat(3,1fr)] mb-14">
            {/* Marque */}
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-full overflow-hidden bg-white shrink-0">
                  <img
                    src={LOGO_URL}
                    alt="Sawtify"
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="font-semibold text-white text-base">Sawtify</span>
              </div>
              <p className="text-[13px] leading-relaxed text-white/40 max-w-xs mb-6">
                {t.footTagline}
              </p>

              <div className="flex items-center gap-2">
                {socials.map((s) => (
                  <a
                    key={s.label}
                    href="#"
                    aria-label={s.label}
                    className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-violet-600 hover:border-violet-600 transition-colors sawtify-focus"
                  >
                    <s.icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>

            {/* Colonnes de liens */}
            {footerCols.map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <h4 className="text-white text-[13px] font-semibold mb-4">{col.title}</h4>
                <ul className="space-y-2.5 list-none">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <a
                        href={l.href}
                        onClick={
                          l.href.startsWith("#") && l.href.length > 1
                            ? (e) => handleNavClick(e, l.href)
                            : undefined
                        }
                        className="text-[13px] text-white/40 hover:text-violet-300 transition-colors sawtify-focus"
                      >
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>

          {/* Newsletter */}
          <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-6 sm:p-8 flex flex-col md:flex-row md:items-center gap-6 justify-between mb-10">
            <div>
              <h4 className="text-white text-[15px] font-semibold flex items-center gap-2 mb-1.5">
                <Mail className="w-4 h-4 text-violet-400" />
                {t.footNewsletter}
              </h4>
              <p className="text-[13px] text-white/40 max-w-sm">{t.footNewsletterSub}</p>
            </div>

            <form
              onSubmit={handleSubscribe}
              className="flex items-center gap-2 w-full md:w-auto md:min-w-[340px]"
            >
              <label htmlFor="newsletter-email" className="sr-only">
                {t.emailPlaceholder}
              </label>
              <input
                id="newsletter-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.emailPlaceholder}
                className="flex-1 rounded-full bg-white/5 border border-white/15 px-4 py-3 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-violet-400 focus:bg-white/10 transition-colors"
              />
              <button
                type="submit"
                className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-5 py-3 text-[13px] font-semibold transition-colors sawtify-focus ${
                  subscribed
                    ? "bg-green-500 text-white"
                    : "bg-violet-500 text-white hover:bg-violet-400"
                }`}
              >
                {subscribed ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> {t.subscribed}
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" /> {t.subscribe}
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Bas de page */}
          <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-start">
            <p className="text-[12px] text-white/35">
              © <Num>2026</Num> Sawtify —{" "}
              <span className="inline-flex items-center gap-1">
                {t.madeIn.replace("💜", "")}
                <Heart className="w-3 h-3 text-violet-400 fill-violet-400 inline" />
              </span>
            </p>

            <div className="flex items-center gap-3">
              {["SATIM", "Edahabia", "CIB"].map((p) => (
                <span
                  key={p}
                  className="text-[11px] font-medium text-white/45 bg-white/5 border border-white/10 rounded-md px-2.5 py-1"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* =====================================================
          #12 — BACK TO TOP
      ===================================================== */}
      <AnimatePresence>
        {scrolled && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.7, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7, y: 12 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label={t.backTop}
            className="fixed bottom-6 end-6 z-40 w-11 h-11 rounded-full bg-violet-600 text-white shadow-[0_10px_30px_rgba(124,58,237,0.45)] flex items-center justify-center hover:bg-violet-500 transition-colors sawtify-focus"
          >
            <ArrowUp className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LandingPage;
