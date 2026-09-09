import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  ArrowRight, ArrowLeft, Play, Plus, Menu, X,
  Check, Star, Headphones, ShoppingBag, Clapperboard, Mic2, Phone, ShieldCheck, Gift,
} from "lucide-react";
import { motion, AnimatePresence, useScroll, useInView } from "motion/react";

interface LandingPageProps {
  onLoginClick: () => void;
  onSigninClick: () => void;
  language: "fr" | "ar";
  setLanguage: (lang: "fr" | "ar") => void;
}

const ACCENT = "#6E5FE8";
const INK = "#0F0F1A";
const PAPER = "#FAFAF7";
const LOGO = "https://i.ibb.co/nqShkPNP/68126702-75e5-4de6-9b53-e51800b05e4a.jpg";

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
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || started.current) return;
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
  { id: "amine", nameFr: "Amine", nameAr: "أمين", tagFr: "Sawt commercial", tagAr: "صوت تجاري", location: "Alger, DZ", gender: "male", category: "commercial", rating: 4.9, reviews: 234, color: "#6E5FE8", sampleFr: "Salam 3likoum khawti! M3a Sawtify, nassek yewli sawt tabi3i, wadeh, wahli l i3lanat.", sampleAr: "سلام عليكم خاوتي! مع صوتيفي، نصوصكم تولي صوت طبيعي، واضح، جاهز للإعلانات." },
  { id: "yasmine", nameFr: "Yasmine", nameAr: "ياسمين", tagFr: "Sawt i3lani", tagAr: "صوت إعلاني", location: "Oran, DZ", gender: "female", category: "commercial", rating: 4.8, reviews: 189, color: "#F472B6", sampleFr: "Marhba bikom kamlin! Tawsil 58 wilaya, payment 3and l istlam. Tleb dorka.", sampleAr: "مرحبا بيكم كاملين! التوصيل لـ 58 ولاية والدفع عند الاستلام. اطلب درك." },
  { id: "khalid", nameFr: "Khalid", nameAr: "خالد", tagFr: "Sawt watha2iqi", tagAr: "صوت وثائقي", location: "Constantine, DZ", gender: "male", category: "formal", rating: 5.0, reviews: 312, color: "#10B981", sampleFr: "Nqeddmlkom lyom notq mawzoun w dqi9, l watha2iqiyat w contenu rassmi.", sampleAr: "نقدّم ليكم اليوم نطق موزون ودقيق، للوثائقيات والمحتوى الرسمي." },
  { id: "layla", nameFr: "Layla", nameAr: "ليلى", tagFr: "Voix social media", tagAr: "صوت سوشيال", location: "Annaba, DZ", gender: "female", category: "social", rating: 4.9, reviews: 156, color: "#F59E0B", sampleFr: "Salut l'équipe ! Une voix vive, parfaite pour Reels, TikTok et stories.", sampleAr: "واش راكم ليكيب؟ صوت حيوي، هايل للريلز وتيك توك والستوريز." },
  { id: "yacine", nameFr: "Yacine", nameAr: "ياسين", tagFr: "Voix éducative", tagAr: "صوت تعليمي", location: "Sétif, DZ", gender: "male", category: "narrative", rating: 4.7, reviews: 98, color: "#3B82F6", sampleFr: "Dans cette leçon, on avance pas à pas. Une voix claire, pour e-learning et tutos.", sampleAr: "في هاد الدرس، نمشيو خطوة بخطوة. صوت واضح للشروحات والدروس." },
  { id: "nadia", nameFr: "Nadia", nameAr: "نادية", tagFr: "Voix podcast", tagAr: "صوت بودكاست", location: "Tlemcen, DZ", gender: "female", category: "narrative", rating: 4.9, reviews: 267, color: "#8B5CF6", sampleFr: "Bienvenue dans cet épisode. Une voix chaleureuse, pour podcasts et YouTube.", sampleAr: "مرحبا بيكم في هاد الحلقة. صوت دافئ للبودكاست ويوتيوب." },
  { id: "maryam", nameFr: "Maryam", nameAr: "مريم", tagFr: "Narration & podcast", tagAr: "سرد وبودكاست", location: "Alger, DZ", gender: "female", category: "narrative", rating: 4.8, reviews: 201, color: "#EC4899", sampleFr: "Écoutez une diction fluide et élégante, pour vos récits et documentaires.", sampleAr: "استمعوا لنطق سلس وأنيق، للروايات والوثائقيات." },
  { id: "rachid", nameFr: "Rachid", nameAr: "رشيد", tagFr: "Énergique & pub", tagAr: "حماسي وإشهاري", location: "Oran, DZ", gender: "male", category: "commercial", rating: 4.9, reviews: 176, color: "#EF4444", sampleFr: "Une voix percutante, idéale pour vos spots et lancements produits.", sampleAr: "صوت قوي، هايل للسبوتات وإطلاق المنتجات." },
  { id: "bilal", nameFr: "Bilal", nameAr: "بلال", tagFr: "Narration & récit", tagAr: "سردي وقصصي", location: "Constantine, DZ", gender: "male", category: "narrative", rating: 4.8, reviews: 142, color: "#0EA5E9", sampleFr: "Le rendu est si naturel qu'on croirait un présentateur en studio.", sampleAr: "الصوت يخرج طبيعي كأنو متحدث حقيقي في الستوديو." },
  { id: "nour", nameFr: "Nour", nameAr: "نور", tagFr: "Doux & fluide", tagAr: "لطيف ومرن", location: "Annaba, DZ", gender: "female", category: "social", rating: 4.7, reviews: 119, color: "#14B8A6", sampleFr: "Une intonation douce, confortable à écouter, pour stories et tutos.", sampleAr: "نبرة ناعمة ومريحة للسماع، للستوريز والشروحات." },
  { id: "faycal", nameFr: "Fayçal", nameAr: "فيصل", tagFr: "Commerce & vente", tagAr: "تجارة وتسويق", location: "Alger, DZ", gender: "male", category: "commercial", rating: 4.8, reviews: 163, color: "#A855F7", sampleFr: "Vous cherchez une voix-off pro pour votre marque ? Vous êtes au bon endroit.", sampleAr: "تحوس على فويس أوفر احترافي للمشروع تاعك؟ راك في المكان الصحيح." },
  { id: "sofiane", nameFr: "Sofiane", nameAr: "سفيان", tagFr: "Officiel & IVR", tagAr: "رسمي وموزع", location: "Blida, DZ", gender: "male", category: "formal", rating: 4.9, reviews: 88, color: "#64748B", sampleFr: "Bienvenue sur notre standard. Pour le commercial, tapez 1. Pour l'assistance, tapez 2.", sampleAr: "مرحباً بكم في خدمة الزبائن. للتجارة اضغط 1. للمساعدة اضغط 2." },
];

const LANDING_VOICE_IDS = ["amine", "yasmine", "khalid"] as const;
const LANDING_VOICES = VOICES.filter((v) => (LANDING_VOICE_IDS as readonly string[]).includes(v.id));

const COST_STEPS = [
  { sec: 60, pts: 20, labelFr: "0–60 s", labelAr: "0–60 ثا" },
  { sec: 120, pts: 30, labelFr: "2 min", labelAr: "2 دق" },
  { sec: 180, pts: 40, labelFr: "3 min", labelAr: "3 دق" },
  { sec: 240, pts: 50, labelFr: "4 min", labelAr: "4 دق" },
];

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

  const overlayOpen = menuOpen || !!listenVoice || !!legal;

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    document.title = isRTL ? "صوتيفي — صوت طبيعي بالدارجة" : "Sawtify — Sawt tabi3i b darija";
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
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const t = {
    skip: isRTL ? "روح للمحتوى" : "Rouh l contenu",
    navVoices: isRTL ? "الأصوات" : "Swat",
    navHow: isRTL ? "كيفاش" : "Kifach",
    navPricing: isRTL ? "السوم" : "Soum",
    navFaq: "FAQ",
    navContact: isRTL ? "تواصل" : "Twasel",
    signin: isRTL ? "دخول" : "Dkhoul",
    start: isRTL ? "ابدا درك" : "Bda dorka",
    liveBadge: isRTL ? "v2.1 · متصل" : "v2.1 · online",
    heroKicker: isRTL ? "غمّض عينيك" : "GHAMMED 3INIK",
    heroTitle1: isRTL ? "صوت" : "Sawt",
    heroTitle2: isRTL ? "ما يتفرّقش." : "ma yetfarra9ch.",
    heroSub: isRTL
      ? "دارجة. 30 ثانية. الزبون يظنّها إنسان. تسمع غير البداية هنا… و يتقطّع."
      : "Darija. 30 seconde. L'client ydhenn insan. Tesma3 ghir lbdya hna… w yqatta3.",
    bookNow: isRTL ? "كمّل تسمع" : "Kmmel tesma3",
    listenDemo: isRTL ? "شوف 3 أصوات برك" : "Chouf 3 swat bark",
    welcomeChip: isRTL ? "50 نقطة. بلا كارتة." : "50 noqta. Bla carta.",
    creators: isRTL ? "خدّام" : "kheddama",
    popularKicker: isRTL ? "ما نوريوكش الكل" : "MA NWERRIWECH EL KOLL",
    popularTitle: isRTL ? "12 صوت. هنا 3 برك." : "12 swat. Hna 3 bark.",
    popularSub: isRTL
      ? "أمين، ياسمين، خالد. التسعة الباقيين… تشوفهم كي تدخل للستوديو."
      : "Amine, Yasmine, Khalid. L tes3a lbaqi… tchoufhom ki tdkhol l studio.",
    nRatings: isRTL ? "تقييم" : "avis",
    tryVoice: isRTL ? "كمّل تسمع" : "Kmmel tesma3",
    listenInStudio: isRTL ? "اسمع البداية" : "Sma3 lbdya",
    listenBody: isRTL
      ? "هاد غير أول جملة. الصوت كامل في الستوديو. 50 نقطة، بلا كارتة."
      : "Hadi ghir awwel joumla. Sawt kaml f studio. 50 noqta, bla carta.",
    journeyKicker: isRTL ? "من غير ما تهدر" : "BLA MA TEHDER",
    journeyTitle: isRTL ? "ربع حركات. الصوت يخرج." : "Reb3a harakat. Sawt ykhrej.",
    journeySub: isRTL ? "بلا كابينة. بلا ميكرو. بلا تسنا." : "Bla cabine. Bla micro. Bla tesna.",
    useKicker: isRTL ? "وين تستعملو" : "WINE TSTA3MLO",
    useTitle: isRTL ? "كي يهدر، ما عادش نص." : "Ki yehder, ma 3adech nass.",
    costKicker: isRTL ? "و بكداش" : "W BCHHAL",
    costTitle: isRTL ? "أقل مما تظن." : "Qall melli tdhenn.",
    costSub: isRTL
      ? "20 نقطة لأول 60 ثانية، من بعد +10 لكل دقيقة. النقاط ما يموتوش."
      : "20 noqta l awwel 60 seconde, men ba3d +10 l kol dqiqa. Nouqat ma ymoutouch.",
    unleashTitle: isRTL ? "ما يعرفوش بلي ما عندكش ستوديو." : "Ma ya3rfouch belli ma 3andekch studio.",
    unleashSub: isRTL
      ? "لا كابينة. لا واحد تخلّصو. صوت يبيع. 50 نقطة باش تسمع الفرق بروحك."
      : "Bla cabine. Bla wahed tkhalles. Sawt ybi3. 50 noqta bach tesma3 l farq b rohek.",
    unleashCTA: isRTL ? "الـ 9 الباقيين وين هم؟" : "W l 9 lbaqi wine hom?",
    metricsKicker: "L ARQAM",
    metricsTitle: isRTL ? "الأرقام ما تكذبش." : "L arqam ma ykedbouch.",
    testKicker: isRTL ? "شكون جرب" : "CHKoun JARRAB",
    testTitle: isRTL ? "اللي يسمع، يظنّها إنسان." : "Li yesma3, ydhenn-ha insan.",
    pricingKicker: "SOUM",
    pricingTitle: isRTL ? "نقاط. بلا اشتراك." : "Nouqat. Bla chtirak.",
    pricingSub: isRTL ? "بالدينار. ما تفوتش الصلاحية." : "B dinar. Ma tfootch l salahia.",
    welcomeBanner: isRTL
      ? "هدية الدخول: 50 نقطة = توليدين + 10 نقاط بقات."
      : "Hadiya l dkhoul: 50 noqta = 2 toulidat + 10 nouqat bqaw.",
    gens: isRTL ? "تسجيل" : "tsjilat",
    choose: isRTL ? "اختار" : "Khtar",
    popular: isRTL ? "الأكثر طلباً" : "L akthar",
    faqKicker: "FAQ",
    faqTitle: isRTL ? "أسئلة الناس" : "As2ila n nass",
    ctaTitle: isRTL ? "باغي تسمعو حتى يكمّل؟" : "Bghit tesma3o hta ykmmel?",
    ctaSub: isRTL ? "50 نقطة. 12 صوت. 3 برك هنا. بلا كارتة." : "50 noqta. 12 swat. 3 bark hna. Bla carta.",
    footTag: isRTL ? "تصنع في الجزائر" : "Tsenna3 f Dzayer",
    switchLang: isRTL ? "FR" : "AR",
    close: isRTL ? "سكّر" : "Sekker",
    open: isRTL ? "المنيو" : "Menu",
    cgu: isRTL ? "شروط الخدمة" : "Chorout",
    privacy: isRTL ? "الخصوصية" : "Privacy",
    contact: isRTL ? "تواصل" : "Twasel",
    pts: isRTL ? "نقطة" : "noqta",
    moreVoices: isRTL ? "+9 في الستوديو" : "+9 f studio",
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
    if (listenVoice || holdVoice) return;
    const id = window.setInterval(() => {
      setFeaturedId((prev) => {
        const i = LANDING_VOICES.findIndex((v) => v.id === prev);
        return LANDING_VOICES[(i + 1) % LANDING_VOICES.length].id;
      });
    }, 5200);
    return () => window.clearInterval(id);
  }, [listenVoice, holdVoice]);

  const journeySteps = [
    { n: "1", t: isRTL ? "اكتب" : "Kteb", d: isRTL ? "الصق النص بالدارجة، بالعربية ولا بالفرنسية." : "Lsaq nassek b darija, b 3arbi wela b français." },
    { n: "2", t: isRTL ? "اختار" : "Khtar", d: isRTL ? "12 صوت. هنا نوريوك 3 برك." : "12 swat. Hna nwerriwek 3 bark." },
    { n: "3", t: isRTL ? "ضبط" : "Regli", d: isRTL ? "السرعة، النبرة، التأثيرات… الباقي في الستوديو." : "L vitesse, nabra, l effet… lbaqi f studio." },
    { n: "4", t: isRTL ? "حمّل" : "Telecharge", d: isRTL ? "MP3 ولا WAV. بلا علامة. استعملو تجاري." : "MP3 wela WAV. Bla marque. St3amlo commercial." },
  ];

  const uses = [
    { icon: ShoppingBag, t: isRTL ? "إيكوميرس" : "E-commerce", d: isRTL ? "سبوت، برومو، توصيل 58 ولاية." : "Spot, promo, tawsil 58 wilaya." },
    { icon: Clapperboard, t: isRTL ? "ريلز وتيك توك" : "Reels & TikTok", d: isRTL ? "صوت قصير، حيوي، جاهز للستوري." : "Sawt qsir, hayawi, wahli l story." },
    { icon: Mic2, t: isRTL ? "بودكاست ويوتيوب" : "Podcast & YouTube", d: isRTL ? "سرد طويل، نبرة ثابتة." : "Sard twil, nabra thabta." },
    { icon: Phone, t: isRTL ? "موزع هاتفي" : "Standard", d: isRTL ? "مرحبا، اضغط 1، خدمة الزبائن." : "Marhba, presse 1, service client." },
  ];

  const metrics = [
    { n: 12, s: "", l: isRTL ? "صوت" : "swat" },
    { n: 1200, s: "+", l: isRTL ? "خدّام" : "kheddama" },
    { n: 50, s: "K+", l: isRTL ? "صوت تولّد" : "sawt twaled" },
    { n: 99, s: "%", l: isRTL ? "ما يتفرّقش" : "ma yetfarra9ch" },
  ];

  const testimonials = isRTL
    ? [
        { q: "جربت 5 منصات قبل Sawtify. هنا الصوت فعلاً يبدو بشرياً. الزبائن لا يحسون الفرق.", n: "أمين ب.", r: "صانع محتوى، الجزائر", img: "AB" },
        { q: "استخدمته لإعلانات تجارية. نتيجة احترافية دون الحاجة لاستوديو.", n: "ياسمين ق.", r: "وكالة إشهار، وهران", img: "YK" },
        { q: "أحسن صوت جزائري سمعته. طبيعي 100% والدفع بالذهبية مريح.", n: "خالد م.", r: "صاحب متجر إلكتروني، قسنطينة", img: "KM" },
      ]
    : [
        { q: "Jarrabt 5 plateformes qbel Sawtify. Hna sawt yehder kima insan. L clients ma yfarra9ouch.", n: "Amine B.", r: "Créateur, Alger", img: "AB" },
        { q: "St3amalto f i3lanat. Résultat pro, bla ma n7taj studio.", n: "Yasmine K.", r: "Agence pub, Oran", img: "YK" },
        { q: "A7sen sawt dziri sme3to. Tabi3i 100% w payment Edahabia mri7.", n: "Khaled M.", r: "E-commerçant, Constantine", img: "KM" },
      ];

  useEffect(() => {
    const id = setInterval(() => setActiveTesti((p) => (p + 1) % testimonials.length), 6500);
    return () => clearInterval(id);
  }, [testimonials.length]);

  const pricing = [
    { pts: 100, ptsLabel: "100", price: "500", gens: 5, desc: isRTL ? "باش تجرب — 5 تسجيلات." : "Bach tjarrab — 5 tsjilat." },
    { pts: 220, ptsLabel: "220", price: "1 000", gens: 11, featured: true, desc: isRTL ? "الأكثر طلباً — 11 تسجيل + 20 نقطة مهداة." : "L akthar — 11 tsjil + 20 noqta mehdiya." },
    { pts: 600, ptsLabel: "600", price: "2 500", gens: 30, desc: isRTL ? "للي يخدم دايمن — وكالات وصنّاع محتوى." : "Li yekhdem daymen — agences w créateurs." },
    { pts: 1350, ptsLabel: "1 350", price: "5 000", gens: 67, desc: isRTL ? "للبروفسيونال — حجم كبير." : "L professional — hajm kbir." },
  ];

  const faqs = isRTL
    ? [
        { q: "الصوت يهدر كيما إنسان؟", a: "اه. دارجة حيّة، 24 kHz. 99% اللي يسمعو ما يفرّقوش." },
        { q: "نقدر نستعملو في الإعلان؟", a: "اه. إعلان، يوتيوب، تيك توك، موزع — تجاري كامل، بلا علامة." },
        { q: "النقاط كيفاه؟", a: "20 نقطة لـ 0–60 ثانية، من بعد +10 لكل دقيقة. ما يموتوش. 50 نقطة كي تسجّل." },
        { q: "الذهبية و CIB؟", a: "اه، SATIM، بالدينار. ما تحتاجش كارتة برّانية." },
        { q: "نجرب بلا فلس؟", a: "اه. 50 نقطة، بلا كارتة. وهنا غير 3 أصوات — الـ 9 في الستوديو." },
      ]
    : [
        { q: "Sawt yehder kima insan?", a: "Ih. Darija hayya, 24 kHz. 99% li yesma3 ma yfarra9ch." },
        { q: "Nqder nsta3mlo f i3lan?", a: "Ih. I3lan, YouTube, TikTok, standard — commercial kaml, bla marque." },
        { q: "Nouqat kifach?", a: "20 noqta l 0–60 seconde, men ba3d +10 l kol dqiqa. Ma ymoutouch. 50 noqta ki tsajjal." },
        { q: "Edahabia w CIB?", a: "Ih, SATIM, b dinar. Ma tehtejch carta berraniya." },
        { q: "Njarrab bla flous?", a: "Ih. 50 noqta, bla carta. W hna ghir 3 swat — l 9 f studio." },
      ];

  const trust = [
    { k: "Edahabia", v: isRTL ? "بريد الجزائر" : "La Poste" },
    { k: "CIB", v: isRTL ? "البنوك" : "L bankat" },
    { k: "SATIM", v: isRTL ? "دفع مأمون" : "Payment m2ammen" },
    { k: "24 kHz", v: isRTL ? "جودة ستوديو" : "Jawda studio" },
    { k: "MP3 · WAV", v: isRTL ? "بلا علامة" : "Bla marque" },
  ];

  const smoothTo = useCallback((href: string) => {
    setMenuOpen(false);
    const el = document.querySelector(href);
    if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" });
  }, []);

  const openListen = (voice: VoiceCard) => {
    setFeaturedId(voice.id);
    setPlayingId(voice.id);
    setListenVoice(voice);
  };

  const display = isRTL ? "'Cairo', sans-serif" : "'Fraunces', serif";
  const sans = isRTL ? "'Cairo', sans-serif" : "'Inter', sans-serif";
  const ArrowIcon = ({ className = "w-4 h-4" }: { className?: string }) =>
    isRTL ? <ArrowLeft className={className} /> : <ArrowRight className={className} />;

  const legalCopy = {
    cgu: isRTL
      ? "الشروط: صوتيفي منصة جزائرية، النص يولي صوت. الحساب شخصي. النقاط ما تترجّعش دراهم وما تموتوش. الاستعمال التجاري مسموح. ممنوع المحتوى الحرام. الدفع SATIM (ذهبية / CIB). إذا فشل التوليد، النقاط ترجع."
      : "Chorout: Sawtify plateforme dziriya, nass yewli sawt. L compte chakhsi. Nouqat ma yetraddech drahem w ma ymoutouch. Commercial mesmouh. Mamnou3 contenu haram. Payment SATIM (Edahabia / CIB). Ila fchel toulid, nouqat ywelou.",
    privacy: isRTL
      ? "الخصوصية: نخزّنو غير اللازم (الإيميل، الرصيد، النصوص). ما نبيعوش بياناتك. تقدر تطلب مسح الحساب. الدفع SATIM — ما نخزّنوش رقم الكارتة."
      : "Privacy: nkhazznou ghir l lazem (email, solde, nass). Ma nbi3ouch bayanetek. Tqder tleb mse7 l compte. Payment SATIM — ma nkhazznouch nimero l carta.",
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

      {/* HERO */}
      <section id="home" className="pt-24 pb-12 sm:pb-16">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6">
              <SlideUp>
                <div className="inline-flex items-center gap-2 mb-6 px-3.5 py-1.5 rounded-full border border-[#0F0F1A]/10 bg-white">
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
                <p className="mt-6 text-[16px] sm:text-[17px] text-[#0F0F1A]/70 max-w-lg leading-relaxed font-medium">{t.heroSub}</p>
              </SlideUp>
              <SlideUp delay={0.32}>
                <div className="mt-8 flex items-center gap-3 flex-wrap">
                  <button type="button" onClick={onSigninClick} className="h-12 px-7 rounded-full text-[14px] font-bold text-white transition focus-ring hover:opacity-90" style={{ background: ACCENT, boxShadow: "0 0 30px rgba(110, 95, 232, 0.35)" }}>
                    {t.bookNow}
                  </button>
                  <button type="button" onClick={() => { setFeaturedId("amine"); smoothTo("#voices"); }} className="group h-12 px-5 rounded-full border border-[#0F0F1A]/15 hover:border-[#6E5FE8] text-[14px] font-semibold flex items-center gap-2.5 transition focus-ring">
                    <span className="w-7 h-7 rounded-full text-white flex items-center justify-center" style={{ background: ACCENT }}>
                      <Play className="w-2.5 h-3 fill-current" />
                    </span>
                    {t.listenDemo}
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
                  <span className="font-bold text-[#0F0F1A]/70"><Num>12</Num> {isRTL ? "صوت" : "swat"}</span>
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
                <div className="relative bg-white rounded-[28px] border border-[#0F0F1A]/8 shadow-[0_24px_80px_-40px_rgba(15,15,26,0.35)] p-5 sm:p-7">
                  <div className="flex items-center justify-between gap-3 mb-5">
                    <div>
                      <div className="text-[10px] font-bold tracking-widest uppercase text-[#0F0F1A]/40">Studio</div>
                      <div className="text-[18px] font-extrabold">{isRTL ? featured.nameAr : featured.nameFr}</div>
                      <div className="text-[12px] text-[#0F0F1A]/55">{isRTL ? featured.tagAr : featured.tagFr} · {featured.location}</div>
                    </div>
                    <div className="text-end">
                      <div className="text-[10px] font-bold tracking-widest uppercase text-[#0F0F1A]/40">24 kHz</div>
                      <div className="text-[13px] font-bold" style={{ color: ACCENT }}>20 {t.pts}</div>
                    </div>
                  </div>

                  <div className="rounded-2xl px-4 py-5 mb-5" style={{ background: `${featured.color}12` }}>
                    <Waveform color={featured.color} playing bars={42} />
                  </div>

                  <p className="text-[13px] leading-relaxed text-[#0F0F1A]/75 min-h-[64px]" dir="auto">
                    “{typed}{cutDone ? "…" : ""}”{!cutDone && <span className="caret" aria-hidden />}
                  </p>
                  {cutDone && (
                    <p className="mt-2 text-[11px] font-bold tracking-wide" style={{ color: featured.color }}>
                      {isRTL ? "— تقطّع. كمّل في الستوديو." : "— tqatta3. Kmmel f studio."}
                    </p>
                  )}

                  <div className="mt-5 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {LANDING_VOICES.map((v) => {
                      const on = v.id === featured.id;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => { setFeaturedId(v.id); setPlayingId(null); setHoldVoice(true); }}
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
      <section className="py-7 border-y border-[#0F0F1A]/8 bg-white" aria-label={isRTL ? "وسائل الدفع والجودة" : "Payment w jawda"}>
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
                const active = playingId === v.id || featuredId === v.id;
                const name = isRTL ? v.nameAr : v.nameFr;
                return (
                  <SlideUp key={v.id} delay={idx * 0.08}>
                    <article className={`group bg-white rounded-3xl overflow-hidden card-lift border ${active ? "border-[#6E5FE8]/40 ring-2 ring-[#6E5FE8]/15" : "border-[#0F0F1A]/5"}`}>
                      <button type="button" onClick={() => openListen(v)} className="w-full text-start focus-ring cursor-pointer">
                        <div className="relative p-6 h-40 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${v.color}18 0%, ${v.color}06 100%)` }}>
                          <Waveform color={v.color} playing={playingId === v.id || featuredId === v.id} bars={28} />
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

          <button type="button" onClick={onSigninClick} className="mt-6 w-full rounded-3xl border border-dashed border-[#0F0F1A]/20 bg-white/60 hover:border-[#6E5FE8] hover:bg-[#6E5FE8]/5 transition p-6 text-center focus-ring">
            <div className="text-[22px] font-extrabold tracking-tight" style={{ fontFamily: display }}>{t.moreVoices}</div>
            <p className="mt-1 text-[13px] text-[#0F0F1A]/55">{isRTL ? "ما نوريوهمش هنا. دخل تشوف." : "Ma nwerriwhomch hna. Dkhoul tchouf."}</p>
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
                  isRTL ? "50 نقطة ترحيب = توليدان + 10 نقاط." : "50 noqta ter7ib = 2 toulidat + 10 nouqat.",
                  isRTL ? "النقاط بلا انتهاء صلاحية." : "Nouqat ma ymoutouch.",
                  isRTL ? "الدفع بالدينار عبر SATIM." : "Payment b dinar, SATIM.",
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
                <div className="text-[12px] font-bold tracking-widest uppercase text-white/40 mb-4">{isRTL ? "حْسَب" : "Hseb"}</div>
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
                    <div className="text-[11px] text-white/50">{isRTL ? "التكلفة" : "Soum"}</div>
                    <div className="text-[48px] leading-none font-extrabold" style={{ fontFamily: "'Outfit', sans-serif" }}>
                      {COST_STEPS[costIdx].pts}
                      <span className="text-[16px] ms-2 font-bold text-white/50">{t.pts}</span>
                    </div>
                  </div>
                  <button type="button" onClick={onSigninClick} className="h-11 px-5 rounded-full bg-[#6E5FE8] text-white text-[13px] font-bold hover:opacity-90">
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
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#0F0F1A]/50">{isRTL ? "هدية الترحيب" : "Hadiya l dkhoul"}</div>
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
                  <div className={`text-[11px] font-semibold mb-2 uppercase tracking-wider ${p.featured ? "text-white/50" : "text-[#0F0F1A]/50"}`}>{t.pts}</div>
                  <div className={`text-[12px] font-bold mb-4 ${p.featured ? "text-[#9D8FFF]" : "text-[#6E5FE8]"}`}>
                    ~<Num>{p.gens}</Num> {t.gens}
                  </div>
                  <div className={`h-px mb-4 ${p.featured ? "bg-white/15" : "bg-[#0F0F1A]/10"}`} />
                  <p className={`text-[12px] mb-5 flex-1 ${p.featured ? "text-white/70" : "text-[#0F0F1A]/65"}`}>{p.desc}</p>
                  <div className="flex items-baseline gap-1.5 mb-5">
                    <span className="text-[26px] font-extrabold"><Num>{p.price}</Num></span>
                    <span className={`text-[11px] ${p.featured ? "text-white/50" : "text-[#0F0F1A]/50"}`}>DZD</span>
                  </div>
                  <button type="button" onClick={onSigninClick} className={`h-11 rounded-full text-[13px] font-bold transition focus-ring ${p.featured ? "bg-white text-[#0F0F1A] hover:bg-[#9D8FFF]" : "bg-[#0F0F1A] text-white hover:bg-[#6E5FE8]"}`}>
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
              <button type="button" onClick={onSigninClick} className="mt-8 inline-flex items-center gap-2 h-14 px-8 rounded-full bg-white text-[#0F0F1A] text-[15px] font-bold hover:scale-[1.02] transition focus-ring">
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
                  ? "ستوديو صوتي جزائري. النص بالدارجة يولي صوت، جاهز للإعلان."
                  : "Studio sawti dziri. Nass b darija yewli sawt, wahli l i3lan."}
              </p>
              <p className="mt-3 text-[12px] font-semibold text-[#0F0F1A]/70">Alger, Algérie · {t.footTag}</p>
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#0F0F1A]/40 mb-3">{isRTL ? "المنصة" : "L plateforme"}</div>
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
                {isRTL ? "دفع مأمون، ما نخزّنوش الكارتة." : "Payment m2ammen, ma nkhazznouch l carta."}
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
        <button type="button" onClick={onSigninClick} className="w-full h-12 rounded-full text-white font-bold text-[14px] flex items-center justify-center gap-2" style={{ background: ACCENT }}>
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
              <button type="button" onClick={onSigninClick} className="w-full h-12 rounded-full text-white font-bold text-[14px]" style={{ background: listenVoice.color }}>
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
    </div>
  );
};

export default LandingPage;
e;
