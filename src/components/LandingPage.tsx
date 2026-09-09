import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  ArrowRight, ArrowLeft, Play, Pause, Plus, Menu, X,
  Check, Star, ChevronLeft, ChevronRight, Headphones, AudioLines, ArrowUpRight,
} from "lucide-react";
import { motion, AnimatePresence, useScroll, useInView } from "motion/react";

interface LandingPageProps {
  onLoginClick: () => void;
  onSigninClick: () => void;
  language: "fr" | "ar";
  setLanguage: (lang: "fr" | "ar") => void;
}

/* =========================================================
   GLOBAL STYLES — Bold & Rapide
========================================================= */
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&family=Noto+Naskh+Arabic:wght@400;500;600;700&display=swap');

    * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
    html { scroll-behavior: smooth; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
    body {
      overflow-x: hidden;
      background: #FAFAF7;
      color: #0F0F1A;
      font-family: 'Plus Jakarta Sans', sans-serif;
    }

    @keyframes wave { 0%, 100% { transform: scaleY(0.3); } 50% { transform: scaleY(1); } }
    .wave-bar { animation: wave 1.3s ease-in-out infinite; transform-origin: bottom; }

    @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
    .float { animation: float 5s ease-in-out infinite; }
    .float-slow { animation: float 7s ease-in-out infinite; }

    .focus-ring:focus-visible { outline: 2px solid #6E5FE8; outline-offset: 3px; border-radius: 12px; }
    ::selection { background: #6E5FE8; color: #FAFAF7; }
    ::-webkit-scrollbar { width: 10px; }
    ::-webkit-scrollbar-track { background: #FAFAF7; }
    ::-webkit-scrollbar-thumb { background: #6E5FE8; border-radius: 10px; }

    .card-lift { transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s; }
    .card-lift:hover { transform: translateY(-6px); box-shadow: 0 20px 50px -20px rgba(110, 95, 232, 0.3); }

    .step-badge { box-shadow: 0 0 0 4px rgba(255,255,255,0.8), 0 4px 12px rgba(110, 95, 232, 0.3); }

    /* GPU acceleration pour rapidité */
    * { transform: translateZ(0); backface-visibility: hidden; }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
    }
  `}</style>
);

/* =========================================================
   LOGO — Vraie image Sawtify depuis ImgBB
========================================================= */
const SAWTIYF_LOGO = "https://i.ibb.co/nqShkPNP/68126702-75e5-4de6-9b53-e51800b05e4a.jpg";

const Logo = ({ size = 40, showText = true, dark = false }: { size?: number; showText?: boolean; dark?: boolean }) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  return (
    <div className="flex items-center gap-2.5 select-none">
      <div
        className="rounded-2xl overflow-hidden shrink-0 relative"
        style={{
          width: size, height: size,
          background: "linear-gradient(135deg, #6E5FE8 0%, #5B4DD8 100%)",
          boxShadow: "0 4px 14px rgba(110, 95, 232, 0.3)"
        }}
      >
        {!imgError && (
          <img
            src={SAWTIYF_LOGO}
            alt="Sawtify"
            width={size}
            height={size}
            loading="eager"
            decoding="async"
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            className={`w-full h-full object-cover transition-opacity duration-200 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
          />
        )}
        {imgError && (
          <div className="w-full h-full flex items-center justify-center text-white font-extrabold" style={{ fontSize: size * 0.5 }}>
            S
          </div>
        )}
      </div>
      {showText && (
        <span className="font-extrabold text-[20px] tracking-tight" style={{ color: dark ? "#FAFAF7" : "#0F0F1A" }}>
          Sawtify
        </span>
      )}
    </div>
  );
};

/* =========================================================
   UTILS
========================================================= */
const Num = ({ children, className = "" }: any) => (
  <span dir="ltr" style={{ unicodeBidi: "isolate", fontFamily: "'JetBrains Mono', monospace" }} className={`inline-block tabular-nums ${className}`}>
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

const SlideUp = ({ children, delay = 0, className = "" }: any) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const SlideLeft = ({ children, delay = 0, className = "" }: any) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -40 }}
      animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -40 }}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const SlideRight = ({ children, delay = 0, className = "" }: any) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: 40 }}
      animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: 40 }}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const ScaleIn = ({ children, delay = 0, className = "" }: any) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

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

/* =========================================================
   MAIN
========================================================= */
export const LandingPage: React.FC<LandingPageProps> = ({
  onLoginClick, onSigninClick, language, setLanguage,
}) => {
  const isRTL = language === "ar";
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTesti, setActiveTesti] = useState(0);
  const [voiceSlide, setVoiceSlide] = useState(0);
  const { scrollYProgress } = useScroll();
  const scrolled = useScrollState();

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

  useEffect(() => () => { audioRef.current?.pause(); }, []);

  const ArrowIcon = ({ className = "w-4 h-4" }: any) =>
    isRTL ? <ArrowLeft className={className} /> : <ArrowRight className={className} />;

  /* === COPY === Centré "Voix IA 100% Humaine" */
  const t = {
    navVoices: isRTL ? "الأصوات" : "Voix",
    navHow: isRTL ? "كيف تشتغل" : "Comment",
    navPricing: isRTL ? "الأسعار" : "Tarifs",
    navFaq: "FAQ",
    signin: isRTL ? "دخول" : "Connexion",
    start: isRTL ? "ابدأ الآن" : "Commencer",
    liveBadge: isRTL ? "v2.1 · متصل" : "v2.1 · En ligne",

    // HERO - Centré voix humaine
    heroKicker: isRTL ? "صوت بشري · ذكاء اصطناعي" : "VOIX HUMAINE · IA",
    heroTitle1: isRTL ? "صوت بشري" : "Une voix",
    heroTitle2: isRTL ? "لا يمكن تمييزه" : "qu'on ne peut distinguer.",
    heroSub: isRTL ? "نصائحك بالدارجة، بنبرة إنسان حقيقي. لا روبوتات، لا أصوات آلية." : "Votre texte, en darija, avec une voix 100% humaine. Pas de robot. Pas de voix synthétique.",
    bookNow: isRTL ? "جرّب مجاناً" : "Tester gratuitement",
    knowMore: isRTL ? "اعرف المزيد" : "En savoir plus",
    awesomeDesc: isRTL ? "اكتشف أصواتنا البشرية" : "Découvrez nos voix humaines",

    follow: isRTL ? "تابعنا" : "Suivez-nous",
    popularKicker: isRTL ? "الأصوات البشرية" : "VOIX HUMAINES",
    popularTitle: isRTL ? "12 صوتاً بشرياً" : "12 voix 100% humaines.",
    popularSub: isRTL ? "كل صوت تم تسجيله من ممثلين حقيقيين. لا يوجد ذكاء اصطناعي هنا." : "Chaque voix enregistrée par de vrais comédiens. Pas de synthèse vocale.",
    nRatings: isRTL ? "تقييم" : "avis",

    journeyKicker: isRTL ? "الطريقة" : "COMMENT ÇA MARCHE",
    journeyTitle: isRTL ? "صوت بشري في 30 ثانية." : "Une voix humaine en 30 secondes.",
    journeySub: isRTL ? "أربع خطوات بسيطة للحصول على صوت طبيعي تماماً" : "Quatre étapes simples pour une voix parfaitement naturelle",

    unleashTitle: isRTL ? "صوت حقيقي. ليس روبوتاً." : "Une voix réelle. Pas un robot.",
    unleashSub: isRTL ? "جميع أصواتنا مسجلة من ممثلين voice-over حقيقيين. تسمعها، تظن أنها إنسان." : "Toutes nos voix sont enregistrées par de vrais comédiens. Vous les écoutez, vous croyez à un humain.",
    unleashCTA: isRTL ? "اكتشف الأصوات" : "Découvrir les voix",
    discount: isRTL ? "خصم 20%" : "20% DE RÉDUCTION",
    discountDate: isRTL ? "حتى 28 سبتمبر 2025" : "Jusqu'au 28 sept. 2025",

    metricsKicker: "CHIFFRES",
    metricsTitle: isRTL ? "الأرقام تثبت ذلك" : "Les chiffres le prouvent.",
    testKicker: "TÉMOIGNAGES",
    testTitle: isRTL ? "من يسمع، يظن أنه إنسان." : "Celui qui écoute croit à un humain.",

    pricingKicker: "TARIFS",
    pricingTitle: isRTL ? "ادفع مرة. استخدم دائماً." : "Payez une fois. Utilisez pour toujours.",
    pricingSub: isRTL ? "باقات بسيطة بدون انتهاء صلاحية" : "Forfaits simples, sans expiration",

    faqKicker: "FAQ",
    faqTitle: isRTL ? "الأسئلة المتكررة" : "Questions fréquentes",

    ctaTitle: isRTL ? "جرّب صوتاً بشرياً الآن" : "Testez une voix humaine maintenant.",
    ctaSub: isRTL ? "50 نقطة مجانية بدون بطاقة بنكية" : "50 points offerts, sans carte bancaire",
    footTag: isRTL ? "صنع في الجزائر" : "Fait en Algérie",
    switchLang: isRTL ? "FR" : "AR",
    close: isRTL ? "إغلاق" : "Fermer",
    open: isRTL ? "قائمة" : "Menu",
  };

  const nav = [
    { href: "#voices", label: t.navVoices },
    { href: "#process", label: t.navHow },
    { href: "#pricing", label: t.navPricing },
    { href: "#faq", label: t.navFaq },
  ];

  const popularVoices = [
    { id: "v1", name: "Amin", tag: isRTL ? "صوت تجاري" : "Voix Commerciale", location: "Alger, DZ", rating: 4.9, reviews: 234, url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", color: "#6E5FE8", pattern: "wave" },
    { id: "v2", name: "Yasmine", tag: isRTL ? "صوت إعلاني" : "Voix Publicitaire", location: "Oran, DZ", rating: 4.8, reviews: 189, url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", color: "#F472B6", pattern: "circles" },
    { id: "v3", name: "Khalid", tag: isRTL ? "صوت وثائقي" : "Voix Documentaire", location: "Constantine, DZ", rating: 5.0, reviews: 312, url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", color: "#10B981", pattern: "bars" },
    { id: "v4", name: "Layla", tag: isRTL ? "صوت سوشيال" : "Voix Social Media", location: "Annaba, DZ", rating: 4.9, reviews: 156, url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3", color: "#F59E0B", pattern: "dots" },
    { id: "v5", name: "Yacine", tag: isRTL ? "صوت تعليمي" : "Voix Éducative", location: "Sétif, DZ", rating: 4.7, reviews: 98, url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3", color: "#3B82F6", pattern: "wave" },
    { id: "v6", name: "Nadia", tag: isRTL ? "صوت بودكاست" : "Voix Podcast", location: "Tlemcen, DZ", rating: 4.9, reviews: 267, url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3", color: "#8B5CF6", pattern: "circles" },
  ];

  const journeySteps = [
    { n: "1", t: isRTL ? "اكتب نصك" : "Écrivez", d: isRTL ? "ألصق نصك بأي لهجة جزائرية" : "Collez votre texte en darija, français ou arabe" },
    { n: "2", t: isRTL ? "اختر الصوت" : "Choisissez", d: isRTL ? "12 صوتاً بشرياً مختلفاً" : "12 voix humaines différentes" },
    { n: "3", t: isRTL ? "خصص" : "Affinez", d: isRTL ? "سرعة، نبرة، وقفة — كل شيء" : "Vitesse, ton, pauses — tout est ajustable" },
    { n: "4", t: isRTL ? "حمّل" : "Téléchargez", d: isRTL ? "MP3 أو WAV بدون علامة مائية" : "MP3 ou WAV, sans watermark" },
  ];

  const metrics = [
    { n: 12, s: "", l: isRTL ? "صوت بشري" : "Voix humaines" },
    { n: 1200, s: "+", l: isRTL ? "مستخدم" : "Utilisateurs" },
    { n: 50, s: "K+", l: isRTL ? "توليد صوتي" : "Voix générées" },
    { n: 99, s: "%", l: isRTL ? "لا يمكن تمييزه عن الإنسان" : "Indistinctable d'un humain" },
  ];

  const testimonials = isRTL
    ? [
        { q: "جربت 5 منصات قبل Sawtify. هنا الصوت فعلاً يبدو بشرياً. الزبائن لا يحسون الفرق.", n: "أمين ب.", r: "صانع محتوى، الجزائر", img: "AB" },
        { q: "استخدمته لإعلانات تجارية. نتيجة احترافية دون الحاجة لاستوديو.", n: "ياسمين ق.", r: "وكالة إشهار، وهران", img: "YK" },
        { q: "أحسن صوت جزائري سمعته. طبيعي 100% والدفع بالذهبية مريح.", n: "خالد م.", r: "صاحب متجر إلكتروني، قسنطينة", img: "KM" },
      ]
    : [
        { q: "J'ai testé 5 plateformes avant Sawtify. Ici, la voix sonne vraiment humaine. Mes clients ne voient pas la différence.", n: "Amine B.", r: "Créateur, Alger", img: "AB" },
        { q: "Utilisé pour mes pubs. Résultat pro sans avoir besoin d'un studio.", n: "Yasmine K.", r: "Agence pub, Oran", img: "YK" },
        { q: "Meilleure voix algérienne que j'ai entendue. Naturelle à 100% et le paiement Edahabia est top.", n: "Khaled M.", r: "E-commerçant, Constantine", img: "KM" },
      ];

  useEffect(() => {
    const id = setInterval(() => setActiveTesti((p) => (p + 1) % testimonials.length), 6500);
    return () => clearInterval(id);
  }, [testimonials.length]);

  const pricing = [
    { pts: "100", price: "500", desc: isRTL ? "للتجربة" : "Pour tester" },
    { pts: "220", price: "1 000", featured: true, desc: isRTL ? "الأكثر مبيعاً" : "Le plus vendu" },
    { pts: "600", price: "2 500", desc: isRTL ? "للمنتظمين" : "Pour les réguliers" },
    { pts: "1 350", price: "5 000", desc: isRTL ? "للمحترفين" : "Pour les pros" },
  ];

  const faqs = isRTL
    ? [
        { q: "هل الصوت بشري فعلاً أم آلي؟", a: "100% بشري. كل صوت مسجل من ممثل voice-over حقيقي في استوديو احترافي. لا يوجد ذكاء اصطناعي للصوت هنا." },
        { q: "هل يمكنني استخدام الأصوات تجارياً؟", a: "نعم، كل الأصوات حرة الاستخدام التجاري. إعلانات، فيديوهات، مشاريع — كل شيء مسموح." },
        { q: "كيف يعمل نظام النقاط؟", a: "تشتري النقاط مرة واحدة، تبقى رصيدك. كل توليد صوتي يستهلك 20 نقطة. لا انتهاء صلاحية." },
        { q: "هل تدعمون الدفع بالذهبية و CIB؟", a: "نعم، نقبل جميع طرق الدفع الجزائرية عبر SATIM." },
        { q: "هل يمكنني تجربة الخدمة مجاناً؟", a: "بالتأكيد. 50 نقطة مجانية عند التسجيل." },
      ]
    : [
        { q: "La voix est-elle vraiment humaine ?", a: "100% humaine. Chaque voix est enregistrée par un vrai comédien voice-over en studio pro. Pas d'IA vocale." },
        { q: "Usage commercial autorisé ?", a: "Oui, toutes les voix sont libres de droits. Pubs, vidéos, projets — tout est permis." },
        { q: "Comment fonctionnent les points ?", a: "Vous achetez une fois, ils n'expirent jamais. 20 points par génération." },
        { q: "Edahabia et CIB acceptés ?", a: "Oui, via SATIM. Paiement local en dinars." },
        { q: "Essai gratuit ?", a: "Absolument. 50 points offerts à l'inscription." },
      ];

  const partners = ["Edahabia", "CIB", "SATIM", "Djezzy", "Mobilis", "Ooredoo"];

  const toggleVoice = useCallback((id: string, url: string) => {
    if (playingId === id) { audioRef.current?.pause(); setPlayingId(null); return; }
    audioRef.current?.pause();
    const audio = new Audio(); audio.src = url; audioRef.current = audio;
    audio.play().catch(() => setPlayingId(null));
    audio.onended = () => setPlayingId(null);
    setPlayingId(id);
  }, [playingId]);

  const smoothTo = useCallback((href: string) => {
    setMenuOpen(false);
    const el = document.querySelector(href);
    if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" });
  }, []);

  const sans = isRTL ? "'Noto Naskh Arabic', serif" : "'Plus Jakarta Sans', sans-serif";
  const mono = "'JetBrains Mono', monospace";

  const VoicePattern = ({ pattern, color, playing }: { pattern: string; color: string; playing: boolean }) => {
    if (pattern === "wave") {
      return (
        <div className="flex items-end justify-center gap-1 h-32" dir="ltr">
          {Array.from({ length: 32 }).map((_, i) => {
            const h = 20 + Math.abs(Math.sin(i * 0.5) * Math.cos(i * 0.3)) * 80;
            return <span key={i} className={`flex-1 rounded-full ${playing ? "wave-bar" : ""}`} style={{ height: `${h}%`, maxWidth: 4, background: color, animationDelay: `${(i % 8) * 0.1}s` }} />;
          })}
        </div>
      );
    }
    if (pattern === "circles") {
      return (
        <div className="relative w-32 h-32 mx-auto">
          {[0, 1, 2, 3].map((i) => <div key={i} className="absolute inset-0 rounded-full border-2" style={{ borderColor: color, opacity: 0.8 - i * 0.2, transform: `scale(${0.4 + i * 0.2})` }} />)}
          <div className="absolute inset-0 m-auto w-8 h-8 rounded-full" style={{ background: color }} />
        </div>
      );
    }
    if (pattern === "bars") {
      return (
        <div className="grid grid-cols-6 gap-1 h-32">
          {Array.from({ length: 36 }).map((_, i) => {
            const h = 20 + Math.abs(Math.cos(i * 0.4)) * 80;
            return <div key={i} className="rounded" style={{ background: color, height: `${h}%`, alignSelf: "end" }} />;
          })}
        </div>
      );
    }
    return (
      <div className="grid grid-cols-6 gap-2 h-32 place-items-center">
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="rounded-full" style={{ background: color, opacity: 0.4 + Math.abs(Math.sin(i * 0.7)) * 0.6, width: `${6 + Math.abs(Math.sin(i * 0.5)) * 16}px`, height: `${6 + Math.abs(Math.sin(i * 0.5)) * 16}px` }} />
        ))}
      </div>
    );
  };

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen text-[#0F0F1A] relative" style={{ fontFamily: sans }}>
      <GlobalStyles />

      <motion.div aria-hidden="true" className="fixed top-0 inset-x-0 h-[3px] z-[60]" style={{ scaleX: scrollYProgress, background: "linear-gradient(90deg, #6E5FE8, #9D8FFF)", transformOrigin: isRTL ? "100% 50%" : "0% 50%" }} />

      {/* HEADER */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "bg-[#FAFAF7]/90 backdrop-blur-xl border-b border-[#0F0F1A]/5" : "bg-transparent"}`}>
        <div className="mx-auto max-w-[1280px] px-6 h-16 flex items-center justify-between">
          <a href="#home" onClick={(e) => { e.preventDefault(); smoothTo("#home"); }} className="focus-ring">
            <Logo size={40} />
          </a>

          <nav className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-8 text-[14px] font-semibold text-[#0F0F1A]/70">
            {nav.map((l) => (
              <a key={l.href} href={l.href} onClick={(e) => { e.preventDefault(); smoothTo(l.href); }} className="hover:text-[#0F0F1A] transition-colors focus-ring">
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button onClick={() => setLanguage(language === "fr" ? "ar" : "fr")} className="w-10 h-10 rounded-full text-[12px] font-bold text-[#0F0F1A]/70 hover:text-[#0F0F1A] hover:bg-[#0F0F1A]/5 transition focus-ring">
              {t.switchLang}
            </button>
            <button onClick={onLoginClick} className="hidden md:block text-[13px] font-semibold text-[#0F0F1A]/70 hover:text-[#0F0F1A] px-3 focus-ring transition">
              {t.signin}
            </button>
            <button onClick={onSigninClick} className="h-10 px-5 rounded-full text-[14px] font-bold text-white focus-ring transition hover:opacity-90 hover:scale-105" style={{ background: "#0F0F1A" }}>
              {t.start}
            </button>
            <button onClick={() => setMenuOpen(true)} aria-label={t.open} className="md:hidden w-10 h-10 rounded-full hover:bg-[#0F0F1A]/5 flex items-center justify-center focus-ring">
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE DRAWER */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenuOpen(false)} className="fixed inset-0 z-[55] bg-black/50 md:hidden" />
            <motion.div initial={{ x: isRTL ? "-100%" : "100%" }} animate={{ x: 0 }} exit={{ x: isRTL ? "-100%" : "100%" }} transition={{ type: "spring", damping: 30, stiffness: 280 }} className="fixed inset-y-0 end-0 z-[60] w-[85%] max-w-sm bg-[#FAFAF7] md:hidden flex flex-col">
              <div className="flex items-center justify-between px-5 h-16 border-b border-[#0F0F1A]/5">
                <Logo size={36} />
                <button onClick={() => setMenuOpen(false)} className="w-10 h-10 rounded-full hover:bg-[#0F0F1A]/5 flex items-center justify-center focus-ring">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex-1 px-5 py-6 flex flex-col gap-1">
                {nav.map((l) => <a key={l.href} href={l.href} onClick={(e) => { e.preventDefault(); smoothTo(l.href); }} className="py-4 text-[18px] font-bold border-b border-[#0F0F1A]/5 focus-ring">{l.label}</a>)}
              </nav>
              <div className="p-5">
                <button onClick={() => { setMenuOpen(false); onSigninClick(); }} className="w-full h-12 rounded-full font-bold text-white" style={{ background: "#0F0F1A" }}>{t.start}</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* =====================================================
          HERO — Centré sur voix humaine, fond violet bold
      ===================================================== */}
      <section id="home" className="pt-24 pb-12 sm:pb-16 relative">
        <div className="mx-auto max-w-[1280px] px-6">
          <div className="grid lg:grid-cols-12 gap-8 items-center">
            {/* LEFT: Text content (8 cols) */}
            <div className="lg:col-span-7">
              <SlideUp>
                <div className="inline-flex items-center gap-2 mb-6 px-3.5 py-1.5 rounded-full border border-[#0F0F1A]/10 bg-white">
                  <span className="relative flex w-1.5 h-1.5">
                    <span className="absolute inset-0 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="relative rounded-full w-1.5 h-1.5 bg-emerald-500" />
                  </span>
                  <span className="text-[11px] font-mono font-bold tracking-widest text-[#0F0F1A]">{t.liveBadge}</span>
                </div>
              </SlideUp>

              <SlideUp delay={0.1}>
                <p className="text-[12px] font-bold tracking-[0.2em] text-[#6E5FE8] uppercase mb-5">// {t.heroKicker}</p>
              </SlideUp>

              <SlideUp delay={0.2}>
                <h1 className="text-[clamp(2.75rem,7vw,5.5rem)] leading-[0.95] tracking-[-0.04em] font-extrabold text-[#0F0F1A]">
                  {t.heroTitle1}<br />
                  <span style={{ background: "linear-gradient(135deg, #6E5FE8 0%, #9D8FFF 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                    {t.heroTitle2}
                  </span>
                </h1>
              </SlideUp>

              <SlideUp delay={0.35}>
                <p className="mt-6 text-[16px] sm:text-[17px] text-[#0F0F1A]/70 max-w-lg leading-relaxed font-medium">
                  {t.heroSub}
                </p>
              </SlideUp>

              <SlideUp delay={0.45}>
                <div className="mt-8 flex items-center gap-3 flex-wrap">
                  <button onClick={onSigninClick} className="h-12 px-7 rounded-full text-[14px] font-bold text-white transition focus-ring hover:scale-105" style={{ background: "#6E5FE8", boxShadow: "0 0 30px rgba(110, 95, 232, 0.4)" }}>
                    {t.bookNow}
                  </button>
                  <button onClick={() => smoothTo("#voices")} className="group h-12 px-5 rounded-full border border-[#0F0F1A]/15 hover:border-[#6E5FE8] text-[#0F0F1A] text-[14px] font-semibold flex items-center gap-2.5 transition focus-ring">
                    <span className="w-7 h-7 rounded-full bg-[#6E5FE8] text-white flex items-center justify-center">
                      <Play className="w-2.5 h-3 fill-current" />
                    </span>
                    {t.listenDemo}
                  </button>
                </div>
              </SlideUp>

              <SlideUp delay={0.55}>
                <div className="mt-10 flex items-center gap-6 text-[12px] font-mono text-[#0F0F1A]/50">
                  <div className="flex -space-x-1.5">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="w-7 h-7 rounded-full border-2 border-[#FAFAF7]" style={{ background: ["#6E5FE8", "#F472B6", "#10B981", "#F59E0B"][i] }} />
                    ))}
                  </div>
                  <span><Num>1 200+</Num> créateurs</span>
                  <span>·</span>
                  <span>★ 4.9 / 5</span>
                </div>
              </SlideUp>
            </div>

            {/* RIGHT: Audio visualizer with real voice waveform */}
            <div className="lg:col-span-5">
              <SlideRight delay={0.3}>
                <div className="relative aspect-square max-w-[480px] mx-auto">
                  {/* Outer ring */}
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#6E5FE8]/10 to-[#9D8FFF]/5 border border-[#6E5FE8]/20" />

                  {/* Visualizer SVG central */}
                  <div className="absolute inset-8 rounded-2xl bg-white shadow-2xl flex items-center justify-center overflow-hidden">
                    <div className="flex items-end gap-[3px] h-48 w-full px-6" dir="ltr">
                      {Array.from({ length: 50 }).map((_, i) => {
                        const seed = Math.sin(i * 0.5) * Math.cos(i * 0.3);
                        const h = 15 + Math.abs(seed) * 85;
                        const isAccent = i % 6 === 0;
                        return (
                          <motion.span
                            key={i}
                            initial={{ scaleY: 0 }}
                            whileInView={{ scaleY: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.4 + i * 0.01 }}
                            className="flex-1 rounded-full wave-bar origin-bottom"
                            style={{
                              height: `${h}%`,
                              maxWidth: 4,
                              background: isAccent ? "#6E5FE8" : "#0F0F1A",
                              animationDelay: `${(i % 10) * 0.12}s`,
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Floating badge "Live" */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white border border-[#0F0F1A]/10 rounded-full px-3 py-1.5 flex items-center gap-2 shadow-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-mono font-bold">VOICE LIVE</span>
                  </div>

                  {/* Floating quality badge */}
                  <div className="absolute -bottom-3 -right-3 bg-white border border-[#0F0F1A]/10 rounded-2xl px-4 py-2.5 shadow-lg float-slow">
                    <div className="text-[9px] font-mono text-[#0F0F1A]/50">QUALITY</div>
                    <div className="text-[18px] font-extrabold text-[#6E5FE8]">24 kHz</div>
                  </div>

                  {/* Floating voice name */}
                  <div className="absolute -left-3 top-1/2 -translate-y-1/2 bg-white border border-[#0F0F1A]/10 rounded-2xl px-4 py-2.5 shadow-lg float">
                    <div className="text-[9px] font-mono text-[#0F0F1A]/50">VOICE</div>
                    <div className="text-[14px] font-extrabold">Amin</div>
                  </div>
                </div>
              </SlideRight>
            </div>
          </div>
        </div>
      </section>

      {/* PARTNERS BAR */}
      <section className="py-8 border-y border-[#0F0F1A]/8 overflow-hidden bg-white">
        <div className="mx-auto max-w-[1280px] px-6 flex flex-wrap items-center justify-around gap-6 opacity-50">
          {partners.map((p) => (
            <span key={p} className="text-[14px] font-bold text-[#0F0F1A] tracking-tight">{p}</span>
          ))}
        </div>
      </section>

      {/* POPULAR VOICES */}
      <section id="voices" className="py-16 sm:py-24">
        <div className="mx-auto max-w-[1280px] px-6">
          <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
            <SlideUp>
              <div>
                <p className="text-[12px] font-bold tracking-[0.2em] text-[#6E5FE8] uppercase mb-3">// {t.popularKicker}</p>
                <h2 className="text-[clamp(2rem,4.5vw,3.5rem)] leading-[1] tracking-[-0.03em] font-extrabold text-[#0F0F1A] max-w-2xl">{t.popularTitle}</h2>
                <p className="text-[14px] text-[#0F0F1A]/60 mt-3 max-w-md">{t.popularSub}</p>
              </div>
            </SlideUp>
            <SlideUp delay={0.1}>
              <div className="flex items-center gap-2">
                <button onClick={() => setVoiceSlide((p) => Math.max(0, p - 1))} className="w-11 h-11 rounded-full bg-white border border-[#0F0F1A]/10 flex items-center justify-center hover:bg-[#0F0F1A] hover:text-white transition focus-ring">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button onClick={() => setVoiceSlide((p) => Math.min(popularVoices.length - 3, p + 1))} className="w-11 h-11 rounded-full bg-[#0F0F1A] text-white flex items-center justify-center hover:bg-[#6E5FE8] transition focus-ring">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </SlideUp>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {popularVoices.slice(voiceSlide, voiceSlide + 3).map((v, idx) => {
              const active = playingId === v.id;
              return (
                <SlideUp key={v.id} delay={idx * 0.1}>
                  <div className="group bg-white rounded-3xl overflow-hidden card-lift border border-[#0F0F1A]/5">
                    <button type="button" onClick={() => toggleVoice(v.id, v.url)} className="w-full text-start focus-ring cursor-pointer">
                      <div className="relative p-6 h-48 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${v.color}15 0%, ${v.color}05 100%)` }}>
                        <VoicePattern pattern={v.pattern} color={v.color} playing={active} />
                        <div className={`absolute top-4 end-4 w-12 h-12 rounded-full flex items-center justify-center transition-all ${active ? "scale-110" : "scale-90 opacity-0 group-hover:opacity-100 group-hover:scale-100"}`} style={{ background: active ? v.color : "#0F0F1A", color: "white" }}>
                          {active ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ms-0.5" />}
                        </div>
                      </div>
                      <div className="p-5 flex items-center justify-between">
                        <div>
                          <div className="text-[18px] font-extrabold text-[#0F0F1A] mb-1">{v.name}</div>
                          <div className="text-[12px] text-[#0F0F1A]/60 flex items-center gap-1"><span>📍</span> {v.location}</div>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold text-white" style={{ background: v.color }}>
                          <Star className="w-3 h-3 fill-current" /><Num>{v.rating}</Num>
                        </div>
                      </div>
                      <div className="px-5 pb-5 flex items-center justify-between text-[12px]">
                        <span className="text-[#0F0F1A]/70 font-semibold">{v.tag}</span>
                        <span className="text-[#0F0F1A]/50"><Num>{v.reviews}</Num> {t.nRatings}</span>
                      </div>
                    </button>
                  </div>
                </SlideUp>
              );
            })}
          </div>
        </div>
      </section>

      {/* JOURNEY */}
      <section id="process" className="py-16 sm:py-24">
        <div className="mx-auto max-w-[1280px] px-6">
          <div className="text-center mb-14">
            <SlideUp>
              <p className="text-[12px] font-bold tracking-[0.2em] text-[#6E5FE8] uppercase mb-3">// {t.journeyKicker}</p>
            </SlideUp>
            <SlideUp delay={0.1}>
              <h2 className="text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.05] tracking-[-0.03em] font-extrabold text-[#0F0F1A] max-w-3xl mx-auto">{t.journeyTitle}</h2>
            </SlideUp>
            <SlideUp delay={0.2}>
              <p className="text-[14px] text-[#0F0F1A]/60 mt-4 max-w-xl mx-auto">{t.journeySub}</p>
            </SlideUp>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {journeySteps.map((s, i) => (
              <SlideUp key={s.n} delay={i * 0.15}>
                <div className="relative bg-white rounded-3xl p-7 h-full flex flex-col justify-between min-h-[240px] card-lift border border-[#0F0F1A]/5">
                  <div className="absolute top-5 end-5 text-[80px] font-black leading-none text-[#0F0F1A]/5 select-none">{s.n}</div>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "#6E5FE8" }}>
                    <span className="text-white font-extrabold text-[14px]">0{s.n}</span>
                  </div>
                  <div className="relative">
                    <h3 className="text-[22px] font-extrabold text-[#0F0F1A] mb-2">{s.t}</h3>
                    <p className="text-[13px] text-[#0F0F1A]/60 leading-relaxed">{s.d}</p>
                  </div>
                </div>
              </SlideUp>
            ))}
          </div>
        </div>
      </section>

      {/* UNLEASH */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-[1280px] px-6">
          <ScaleIn>
            <div className="bg-[#0F0F1A] rounded-[40px] overflow-hidden grid lg:grid-cols-2 items-stretch text-white">
              <div className="relative h-80 lg:h-auto overflow-hidden" style={{ background: "linear-gradient(135deg, #6E5FE8 0%, #5B4DD8 50%, #2D1B69 100%)" }}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-64 h-64">
                    <div className="absolute inset-0 rounded-full bg-white/20 animate-pulse" />
                    <div className="absolute inset-6 rounded-full bg-white/15" />
                    <div className="absolute inset-12 rounded-full bg-white/10" />
                    <div className="absolute inset-0 m-auto w-32 h-32 rounded-full flex items-center justify-center bg-white">
                      <Headphones className="w-16 h-16 text-[#6E5FE8]" strokeWidth={1.5} />
                    </div>
                    {["♪", "♫", "♬", "♩"].map((note, i) => (
                      <div key={i} className="absolute text-white/80 text-3xl font-bold float" style={{ top: `${20 + (i * 23) % 60}%`, left: `${10 + (i * 31) % 70}%`, animationDelay: `${i * 0.5}s` }}>{note}</div>
                    ))}
                  </div>
                </div>
                <div className="absolute bottom-6 start-6 bg-white rounded-2xl p-4 shadow-xl text-[#0F0F1A]">
                  <div className="text-[24px] font-extrabold">{t.discount}</div>
                  <div className="text-[11px] text-[#0F0F1A]/60 mt-1">{t.discountDate}</div>
                </div>
              </div>

              <SlideRight delay={0.2} className="p-8 sm:p-12 lg:p-16 flex flex-col justify-center">
                <p className="text-[12px] font-bold tracking-[0.2em] text-[#9D8FFF] uppercase mb-3">// HUMAIN</p>
                <h2 className="text-[clamp(1.75rem,3.5vw,3rem)] leading-[1.05] tracking-[-0.03em] font-extrabold">{t.unleashTitle}</h2>
                <p className="mt-5 text-[14px] text-white/70 leading-relaxed max-w-md">{t.unleashSub}</p>
                <button onClick={onSigninClick} className="mt-7 inline-flex items-center gap-2 h-12 px-6 rounded-full bg-white text-[#0F0F1A] text-[14px] font-bold hover:bg-[#6E5FE8] hover:text-white transition focus-ring w-fit">
                  {t.unleashCTA}<ArrowIcon className="w-4 h-4" />
                </button>
              </SlideRight>
            </div>
          </ScaleIn>
        </div>
      </section>

      {/* METRICS */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="mx-auto max-w-[1280px] px-6">
          <div className="text-center mb-12">
            <SlideUp>
              <p className="text-[12px] font-bold tracking-[0.2em] text-[#6E5FE8] uppercase mb-3">// {t.metricsKicker}</p>
            </SlideUp>
            <SlideUp delay={0.1}>
              <h2 className="text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.05] tracking-[-0.03em] font-extrabold">{t.metricsTitle}</h2>
            </SlideUp>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {metrics.map((m, i) => (
              <SlideUp key={m.l} delay={i * 0.1}>
                <div className="rounded-3xl p-7 text-center card-lift border border-[#0F0F1A]/5">
                  <div className="text-[clamp(2.5rem,5vw,3.5rem)] leading-none font-extrabold text-[#0F0F1A] mb-2" style={{ fontFamily: mono }}>
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
        <div className="mx-auto max-w-[1280px] px-6">
          <div className="text-center mb-12">
            <SlideUp>
              <p className="text-[12px] font-bold tracking-[0.2em] text-[#6E5FE8] uppercase mb-3">// {t.testKicker}</p>
            </SlideUp>
            <SlideUp delay={0.1}>
              <h2 className="text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.05] tracking-[-0.03em] font-extrabold">{t.testTitle}</h2>
            </SlideUp>
          </div>

          <SlideUp delay={0.2}>
            <div className="bg-white rounded-3xl p-8 sm:p-12 relative border border-[#0F0F1A]/5 min-h-[260px]">
              <AnimatePresence mode="wait">
                <motion.div key={activeTesti} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5 }}>
                  <div className="flex gap-1 mb-5">
                    {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="w-4 h-4 fill-[#6E5FE8] text-[#6E5FE8]" />)}
                  </div>
                  <blockquote className="text-[clamp(1.4rem,3vw,2rem)] leading-[1.25] font-extrabold text-[#0F0F1A]">"{testimonials[activeTesti].q}"</blockquote>
                  <div className="mt-6 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-extrabold" style={{ background: "linear-gradient(135deg, #6E5FE8 0%, #9D8FFF 100%)" }}>{testimonials[activeTesti].img}</div>
                    <div>
                      <div className="text-[14px] font-bold">{testimonials[activeTesti].n}</div>
                      <div className="text-[12px] text-[#0F0F1A]/60">{testimonials[activeTesti].r}</div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
              <div className="absolute bottom-6 end-6 flex items-center gap-2">
                <button onClick={() => setActiveTesti((p) => (p - 1 + testimonials.length) % testimonials.length)} className="w-11 h-11 rounded-full border border-[#0F0F1A]/10 hover:border-[#6E5FE8] flex items-center justify-center focus-ring transition">
                  {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                </button>
                <button onClick={() => setActiveTesti((p) => (p + 1) % testimonials.length)} className="w-11 h-11 rounded-full bg-[#0F0F1A] text-white hover:bg-[#6E5FE8] flex items-center justify-center focus-ring transition">
                  {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </SlideUp>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-16 sm:py-24 bg-white">
        <div className="mx-auto max-w-[1280px] px-6">
          <div className="text-center mb-12">
            <SlideUp>
              <p className="text-[12px] font-bold tracking-[0.2em] text-[#6E5FE8] uppercase mb-3">// {t.pricingKicker}</p>
            </SlideUp>
            <SlideUp delay={0.1}>
              <h2 className="text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.05] tracking-[-0.03em] font-extrabold">{t.pricingTitle}</h2>
            </SlideUp>
            <SlideUp delay={0.2}>
              <p className="text-[14px] text-[#0F0F1A]/60 mt-3 max-w-md mx-auto">{t.pricingSub}</p>
            </SlideUp>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {pricing.map((p, i) => (
              <SlideUp key={p.pts} delay={i * 0.1}>
                <div className={`rounded-3xl p-7 h-full flex flex-col card-lift border-2 transition-all ${p.featured ? "bg-[#0F0F1A] text-white border-[#0F0F1A] relative" : "border-[#0F0F1A]/5 hover:border-[#6E5FE8]/30"}`}>
                  {p.featured && (
                    <div className="absolute -top-3 start-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider text-[#0F0F1A]" style={{ background: "#9D8FFF" }}>POPULAIRE</div>
                  )}
                  <div className="text-[44px] leading-none font-extrabold mb-1"><Num>{p.pts}</Num></div>
                  <div className={`text-[11px] font-semibold mb-5 uppercase tracking-wider ${p.featured ? "text-white/50" : "text-[#0F0F1A]/50"}`}>points</div>
                  <div className={`h-px mb-5 ${p.featured ? "bg-white/15" : "bg-[#0F0F1A]/10"}`} />
                  <p className={`text-[12px] mb-5 flex-1 ${p.featured ? "text-white/70" : "text-[#0F0F1A]/65"}`}>{p.desc}</p>
                  <div className="flex items-baseline gap-1.5 mb-5">
                    <span className="text-[26px] font-extrabold"><Num>{p.price}</Num></span>
                    <span className={`text-[11px] font-mono ${p.featured ? "text-white/50" : "text-[#0F0F1A]/50"}`}>DZD</span>
                  </div>
                  <button onClick={onSigninClick} className={`h-11 rounded-full text-[13px] font-bold transition focus-ring ${p.featured ? "bg-white text-[#0F0F1A] hover:bg-[#9D8FFF]" : "bg-[#0F0F1A] text-white hover:bg-[#6E5FE8]"}`}>
                    {isRTL ? "اختر" : "Choisir"}
                  </button>
                </div>
              </SlideUp>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16 sm:py-24">
        <div className="mx-auto max-w-[1280px] px-6">
          <div className="grid lg:grid-cols-12 gap-10">
            <SlideLeft className="lg:col-span-4">
              <p className="text-[12px] font-bold tracking-[0.2em] text-[#6E5FE8] uppercase mb-3">// {t.faqKicker}</p>
              <h2 className="text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.05] tracking-[-0.03em] font-extrabold">{t.faqTitle}</h2>
            </SlideLeft>

            <SlideRight className="lg:col-span-7 lg:col-start-6">
              <div className="bg-white rounded-3xl overflow-hidden border border-[#0F0F1A]/5">
                {faqs.map((f, i) => {
                  const open = openFaq === i;
                  return (
                    <SlideUp key={f.q} delay={i * 0.05}>
                      <div className="border-b border-[#0F0F1A]/5 last:border-b-0">
                        <button onClick={() => setOpenFaq(open ? null : i)} className="w-full py-5 px-6 flex items-center gap-4 text-start focus-ring group">
                          <span className="flex-1 text-[15px] font-bold text-[#0F0F1A] group-hover:text-[#6E5FE8] transition-colors">{f.q}</span>
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${open ? "bg-[#6E5FE8] text-white rotate-45" : "bg-[#0F0F1A]/5 text-[#0F0F1A]"}`}>
                            <Plus className="w-4 h-4" />
                          </span>
                        </button>
                        <AnimatePresence initial={false}>
                          {open && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                              <p className="pb-5 px-6 pe-14 text-[13px] text-[#0F0F1A]/65 leading-relaxed">{f.a}</p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </SlideUp>
                  );
                })}
              </div>
            </SlideRight>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="mx-auto max-w-[1280px] px-6">
          <ScaleIn>
            <div className="rounded-[40px] p-12 sm:p-16 text-center text-white relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0F0F1A 0%, #2D1B69 50%, #6E5FE8 100%)" }}>
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 start-1/4 w-96 h-96 rounded-full bg-[#9D8FFF]/20 blur-3xl float" />
                <div className="absolute bottom-0 end-1/4 w-80 h-80 rounded-full bg-[#6E5FE8]/30 blur-3xl float-slow" />
              </div>
              <div className="relative">
                <h2 className="text-[clamp(2.5rem,6vw,4.5rem)] leading-[1] tracking-[-0.03em] font-extrabold">{t.ctaTitle}</h2>
                <p className="mt-4 text-[15px] text-white/70 max-w-md mx-auto">{t.ctaSub}</p>
                <button onClick={onSigninClick} className="mt-8 inline-flex items-center gap-2 h-14 px-8 rounded-full bg-white text-[#0F0F1A] text-[15px] font-bold hover:scale-105 transition focus-ring">
                  {t.start}<ArrowIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </ScaleIn>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-10 border-t border-[#0F0F1A]/5">
        <div className="mx-auto max-w-[1280px] px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo size={36} />
          <div className="text-[12px] text-[#0F0F1A]/50 font-mono">© <Num>2026</Num> · {t.footTag} · SATIM · Edahabia · CIB</div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
