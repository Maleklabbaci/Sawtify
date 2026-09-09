import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  ArrowRight, ArrowLeft, Play, Pause, Plus, Menu, X,
  Check, Star, ChevronLeft, ChevronRight, Headphones, AudioLines, ArrowUpRight,
} from "lucide-react";
import { motion, AnimatePresence, useScroll, useTransform, useInView } from "motion/react";

interface LandingPageProps {
  onLoginClick: () => void;
  onSigninClick: () => void;
  language: "fr" | "ar";
  setLanguage: (lang: "fr" | "ar") => void;
}

/* =========================================================
   GLOBAL STYLES
========================================================= */
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&family=Noto+Naskh+Arabic:wght@400;500;600;700&display=swap');

    * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
    html { scroll-behavior: smooth; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
    body {
      overflow-x: hidden;
      background: #F4F1EA;
      color: #1A1A2E;
      font-family: 'Plus Jakarta Sans', sans-serif;
    }

    @keyframes wave { 0%, 100% { transform: scaleY(0.3); } 50% { transform: scaleY(1); } }
    .wave-bar { animation: wave 1.3s ease-in-out infinite; transform-origin: bottom; }

    @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
    .float { animation: float 5s ease-in-out infinite; }
    .float-slow { animation: float 7s ease-in-out infinite; }

    .focus-ring:focus-visible { outline: 2px solid #6E5FE8; outline-offset: 3px; border-radius: 12px; }
    ::selection { background: #6E5FE8; color: #F4F1EA; }
    ::-webkit-scrollbar { width: 10px; }
    ::-webkit-scrollbar-track { background: #F4F1EA; }
    ::-webkit-scrollbar-thumb { background: #6E5FE8; border-radius: 10px; }

    .card-lift { transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.5s; }
    .card-lift:hover { transform: translateY(-8px); box-shadow: 0 20px 50px -20px rgba(110, 95, 232, 0.3); }

    .step-badge { box-shadow: 0 0 0 4px rgba(255,255,255,0.6), 0 4px 12px rgba(110, 95, 232, 0.3); }

    /* Hero video parallax - bouge pas mais zoom léger */
    .hero-video { transition: transform 8s ease-out; }
    .hero-video:hover { transform: scale(1.05); }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
    }
  `}</style>
);

/* =========================================================
   LOGO — Texte seul + Emoji micro pour fiabilité 100%
========================================================= */
const Logo = ({ size = 36, showText = true }: { size?: number; showText?: boolean }) => (
  <div className="flex items-center gap-2.5 select-none">
    <div
      className="rounded-2xl flex items-center justify-center shrink-0 relative"
      style={{
        width: size, height: size,
        background: "linear-gradient(135deg, #6E5FE8 0%, #5B4DD8 100%)",
        boxShadow: "0 4px 14px rgba(110, 95, 232, 0.4)"
      }}
    >
      {/* ✅ Emoji micro toujours visible (zéro risque d'erreur) */}
      <span style={{ fontSize: size * 0.55, lineHeight: 1 }}>🎙️</span>
      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border-2 border-white" />
    </div>
    {showText && (
      <span className="font-extrabold text-[20px] tracking-tight text-[#1A1A2E]">Sawtify</span>
    )}
  </div>
);

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

/* ✅ ANIMATION SLIDE-UP au scroll — text slide du bas vers le haut */
const SlideUp = ({ children, delay = 0, className = "" }: any) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }}
      transition={{ duration: 1, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/* Slide depuis la gauche */
const SlideLeft = ({ children, delay = 0, className = "" }: any) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -60 }}
      animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -60 }}
      transition={{ duration: 1, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/* Slide depuis la droite */
const SlideRight = ({ children, delay = 0, className = "" }: any) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: 60 }}
      animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: 60 }}
      transition={{ duration: 1, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/* Scale up au scroll */
const ScaleIn = ({ children, delay = 0, className = "" }: any) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
      transition={{ duration: 1, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const Reveal = SlideUp; // alias

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

  /* === COPY === Texte 100% North African (Algerian) */
  const t = {
    navVoices: isRTL ? "الأصوات" : "Voix",
    navHow: isRTL ? "الطريقة" : "Process",
    navPricing: isRTL ? "الأسعار" : "Tarifs",
    navFaq: "FAQ",
    signin: isRTL ? "دخول" : "Connexion",
    start: isRTL ? "ابدأ الآن" : "Commencer",
    liveBadge: isRTL ? "v2.1 · مباشر" : "v2.1 · En ligne",
    heroKicker: isRTL ? "ارفع صوتك" : "ÉLEVEZ VOTRE SON",
    heroTitle1: isRTL ? "اكتشف" : "Découvrez",
    heroTitle2: isRTL ? "سحر الصوت الجزائري!" : "La Magie Du Son Algérien!",
    heroSub: isRTL ? "نصائح صوتية طبيعية بالدارجة من شمال إفريقيا في 30 ثانية." : "Voix naturelles en darija nord-africaine, générées en 30 secondes.",
    bookNow: isRTL ? "جرّب مجاناً" : "Essayer Gratuitement",
    knowMore: isRTL ? "اعرف المزيد" : "En savoir plus",
    awesomeDesc: isRTL ? "اكتشف نماذجنا الصوتية المتطورة" : "Découvrez nos modèles vocaux nord-africains",
    follow: isRTL ? "تابعنا" : "Suivez-nous",
    popularKicker: isRTL ? "الأصوات الشائعة" : "VOIX POPULAIRES",
    popularTitle: isRTL ? "الأصوات المفضلة" : "Sons Phares",
    popularSub: isRTL ? "أصوات جزائرية مختارة بدارجة أصيلة" : "Voix algériennes triées sur le volet, darija authentique",
    nRatings: isRTL ? "تقييم" : "avis",
    journeyKicker: isRTL ? "العملية" : "NOTRE PROCESSUS",
    journeyTitle: isRTL ? "من النص إلى الصوت، في غاية البساطة!" : "Du Texte Au Son, Tout Simplement!",
    journeySub: isRTL ? "أربع خطوات تفصلك عن صوت جزائري احترافي" : "Quatre étapes vous séparent d'une voix nord-africaine pro",
    unleashTitle: isRTL ? "أطلق العنان لإبداعك الصوتي" : "Libérez Votre Voix Nord-Africaine",
    unleashSub: isRTL ? "أدواتنا تجعل إنشاء المحتوى الصوتي سهلاً ومتاحاً." : "Nos outils rendent la création audio simple. Une voix authentique, à chaque fois.",
    unleashCTA: isRTL ? "ابدأ المغامرة" : "Commencer l'Aventure",
    discount: isRTL ? "خصم 20%" : "20% DE RÉDUCTION",
    discountDate: isRTL ? "حتى 28 سبتمبر 2025" : "Jusqu'au 28 sept. 2025",
    metricsKicker: "CHIFFRES",
    metricsTitle: isRTL ? "أرقام تتكلم" : "Des Chiffres Qui Parlent",
    testKicker: "AVIS",
    testTitle: isRTL ? "المبدعون المغاربة يشهدون" : "Ce Que Disent Les Créateurs Nord-Africains",
    pricingKicker: "TARIFS",
    pricingTitle: isRTL ? "ادفع مرة، استخدم للأبد" : "Payez Une Fois, Utilisez Pour Toujours",
    pricingSub: isRTL ? "باقات بسيطة بدون انتهاء صلاحية" : "Forfaits simples, sans expiration",
    faqKicker: "FAQ",
    faqTitle: isRTL ? "الأسئلة الشائعة" : "Questions Fréquentes",
    ctaTitle: isRTL ? "جاهز للبدء؟" : "Prêt À Commencer?",
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
    { n: "1", t: isRTL ? "اكتب نصك" : "Écrivez Votre Texte", d: isRTL ? "ألصق أو أنشئ نصك بالذكاء الاصطناعي" : "Collez ou générez votre texte via notre IA" },
    { n: "2", t: isRTL ? "اختر الصوت" : "Choisissez La Voix", d: isRTL ? "12 صوتاً جزائرياً بمختلف اللهجات والنبرات" : "12 voix nord-africaines, dialectes et tons variés" },
    { n: "3", t: isRTL ? "خصّص النبرة" : "Affinez Le Ton", d: isRTL ? "سرعة، نبرة، وقفة — كل شيء قابل للتعديل" : "Vitesse, ton, pauses — tout est ajustable" },
    { n: "4", t: isRTL ? "صدّر الملف" : "Exportez Le Fichier", d: isRTL ? "MP3 أو WAV بدون علامة مائية" : "MP3 ou WAV, sans watermark" },
  ];

  const metrics = [
    { n: 12, s: "+", l: isRTL ? "صوت متاح" : "Voix Disponibles" },
    { n: 1200, s: "+", l: isRTL ? "مستخدم نشط" : "Utilisateurs Actifs" },
    { n: 50, s: "K+", l: isRTL ? "توليد صوتي" : "Générations Audio" },
    { n: 98, s: "%", l: isRTL ? "رضا المستخدمين" : "Satisfaction Client" },
  ];

  const testimonials = isRTL
    ? [
        { q: "Sawtify غيّرت طريقة عملي. جودة استوديو في 30 ثانية.", n: "أمين ب.", r: "صانع محتوى، الجزائر", img: "AB" },
        { q: "الزبائن لا يحسون أن الصوت اصطناعي. هذا ما يهمني.", n: "ياسمين ق.", r: "وكالة إشهار، وهران", img: "YK" },
        { q: "الدفع بالذهبية سهّل كل شيء. أحسن استثمار قمت به.", n: "خالد م.", r: "متجر إلكتروني، قسنطينة", img: "KM" },
      ]
    : [
        { q: "Sawtify a changé mon workflow. Qualité studio en 30 secondes.", n: "Amine B.", r: "Créateur de contenu, Alger", img: "AB" },
        { q: "Les clients ne remarquent pas que c'est synthétique. C'est ce qui compte.", n: "Yasmine K.", r: "Agence pub, Oran", img: "YK" },
        { q: "Le paiement Edahabia simplifie tout. Meilleur investissement.", n: "Khaled M.", r: "E-commerce, Constantine", img: "KM" },
      ];

  useEffect(() => {
    const id = setInterval(() => setActiveTesti((p) => (p + 1) % testimonials.length), 6500);
    return () => clearInterval(id);
  }, [testimonials.length]);

  const pricing = [
    { pts: "100", price: "500", desc: isRTL ? "للتجربة السريعة" : "Pour tester rapidement" },
    { pts: "220", price: "1 000", featured: true, desc: isRTL ? "الخيار الأكثر شعبية" : "Le plus populaire" },
    { pts: "600", price: "2 500", desc: isRTL ? "للمستخدمين المنتظمين" : "Pour les réguliers" },
    { pts: "1 350", price: "5 000", desc: isRTL ? "للوكالات والفرق" : "Pour agences et équipes" },
  ];

  const faqs = isRTL
    ? [
        { q: "هل الأصوات صالحة للاستخدام التجاري؟", a: "نعم، جميع الأصوات الجزائرية قابلة للاستخدام التجاري دون قيود." },
        { q: "كيف يعمل نظام النقاط؟", a: "تشتري النقاط مرة واحدة وتبقى رصيدك. كل توليد صوتي يستهلك 20 نقطة." },
        { q: "هل تدعمون الدفع بالذهبية و CIB؟", a: "نعم، نقبل جميع طرق الدفع الجزائرية عبر SATIM." },
        { q: "كم من الوقت يستغرق كل توليد؟", a: "أقل من 30 ثانية للنصوص القياسية." },
        { q: "هل يمكنني تجربة الخدمة مجاناً؟", a: "بالتأكيد! تحصل على 50 نقطة مجانية عند التسجيل." },
      ]
    : [
        { q: "Les voix sont-elles libres de droits ?", a: "Oui, toutes les voix nord-africaines sont libres pour un usage commercial." },
        { q: "Comment fonctionne le système de points ?", a: "Vous achetez des points une seule fois, ils n'expirent jamais. 20 points par génération." },
        { q: "Edahabia et CIB sont-ils acceptés ?", a: "Oui, nous acceptons tous les moyens de paiement algériens via SATIM." },
        { q: "Combien de temps prend une génération ?", a: "Moins de 30 secondes pour un texte standard." },
        { q: "Puis-je essayer gratuitement ?", a: "Absolument ! 50 points offerts à l'inscription." },
      ];

  const partners = ["Edahabia", "CIB", "SATIM", "Djezzy", "Mobilis", "Ooredoo", "Algérie Poste"];

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
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen text-[#1A1A2E] relative" style={{ fontFamily: sans }}>
      <GlobalStyles />

      <motion.div aria-hidden="true" className="fixed top-0 inset-x-0 h-[3px] z-[60]" style={{ scaleX: scrollYProgress, background: "linear-gradient(90deg, #6E5FE8, #9D8FFF)", transformOrigin: isRTL ? "100% 50%" : "0% 50%" }} />

      {/* HEADER */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${scrolled ? "bg-[#F4F1EA]/90 backdrop-blur-xl border-b border-[#1A1A2E]/5" : ""}`}>
        <div className="mx-auto max-w-[1280px] px-6 h-16 flex items-center justify-between">
          <a href="#home" onClick={(e) => { e.preventDefault(); smoothTo("#home"); }} className="focus-ring">
            <Logo size={36} />
          </a>

          <nav className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-8 text-[14px] font-semibold text-[#1A1A2E]/70">
            {nav.map((l) => (
              <a key={l.href} href={l.href} onClick={(e) => { e.preventDefault(); smoothTo(l.href); }} className="hover:text-[#1A1A2E] transition-colors focus-ring">
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button onClick={() => setLanguage(language === "fr" ? "ar" : "fr")} className="w-10 h-10 rounded-full text-[12px] font-bold text-[#1A1A2E]/70 hover:text-[#1A1A2E] hover:bg-[#1A1A2E]/5 transition focus-ring">
              {t.switchLang}
            </button>
            <button onClick={onSigninClick} className="h-10 px-5 rounded-full text-[14px] font-bold text-white focus-ring transition hover:opacity-90" style={{ background: "#1A1A2E" }}>
              {t.start}
            </button>
            <button onClick={() => setMenuOpen(true)} aria-label={t.open} className="md:hidden w-10 h-10 rounded-full hover:bg-[#1A1A2E]/5 flex items-center justify-center focus-ring">
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
            <motion.div initial={{ x: isRTL ? "-100%" : "100%" }} animate={{ x: 0 }} exit={{ x: isRTL ? "-100%" : "100%" }} transition={{ type: "spring", damping: 30, stiffness: 280 }} className="fixed inset-y-0 end-0 z-[60] w-[85%] max-w-sm bg-[#F4F1EA] md:hidden flex flex-col">
              <div className="flex items-center justify-between px-5 h-16 border-b border-[#1A1A2E]/5">
                <Logo size={32} />
                <button onClick={() => setMenuOpen(false)} className="w-10 h-10 rounded-full hover:bg-[#1A1A2E]/5 flex items-center justify-center focus-ring">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex-1 px-5 py-6 flex flex-col gap-1">
                {nav.map((l) => <a key={l.href} href={l.href} onClick={(e) => { e.preventDefault(); smoothTo(l.href); }} className="py-4 text-[18px] font-bold border-b border-[#1A1A2E]/5 focus-ring">{l.label}</a>)}
              </nav>
              <div className="p-5">
                <button onClick={() => { setMenuOpen(false); onSigninClick(); }} className="w-full h-12 rounded-full font-bold text-white" style={{ background: "#1A1A2E" }}>{t.start}</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* =====================================================
          HERO — AVEC VIDÉO EN BACKGROUND
      ===================================================== */}
      <section id="home" className="pt-24 pb-16 sm:pb-24">
        <div className="mx-auto max-w-[1280px] px-6">
          <SlideUp>
            <div className="relative rounded-[40px] overflow-hidden p-8 sm:p-12 lg:p-16 min-h-[600px] sm:min-h-[680px] flex items-center bg-[#1A1A2E]">

              {/* ✅ VIDÉO en background — autoplay, muted, loop */}
              <video
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                className="absolute inset-0 w-full h-full object-cover hero-video"
                poster=""
                src="https://res.cloudinary.com/gz65ybug/video/upload/v1788621700/Robot_looking_with_microphone_1080p_202609051613.mp4"
              >
                <source src="https://res.cloudinary.com/gz65ybug/video/upload/v1788621700/Robot_looking_with_microphone_1080p_202609051613.mp4" type="video/mp4" />
              </video>

              {/* Overlay gradient pour lisibilité */}
              <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(26, 26, 46, 0.92) 0%, rgba(45, 27, 105, 0.85) 50%, rgba(110, 95, 232, 0.75) 100%)" }} />

              {/* Stepper vertical à gauche */}
              <div className="absolute start-4 sm:start-6 top-1/2 -translate-y-1/2 hidden md:flex flex-col items-center gap-3 z-10">
                {["1", "2", "3"].map((n, i) => (
                  <React.Fragment key={n}>
                    <div className={`step-badge w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-[13px] sm:text-[14px] font-bold transition-all ${i === 0 ? "bg-[#6E5FE8] text-white scale-110" : "bg-white/90 backdrop-blur text-[#1A1A2E]"}`}>
                      {n}
                    </div>
                    {i < 2 && <div className="w-px h-10 sm:h-12 bg-white/30" />}
                  </React.Fragment>
                ))}
              </div>

              {/* Contenu décalé pour ne pas chevaucher le stepper */}
              <div className="relative z-10 w-full md:ms-20 lg:ms-24 max-w-2xl text-white">
                <SlideUp delay={0.1}>
                  <p className="text-[12px] font-bold tracking-[0.2em] text-white/80 uppercase mb-4">
                    {t.heroKicker}
                  </p>
                </SlideUp>
                <SlideUp delay={0.2}>
                  <h1 className="text-[clamp(2.5rem,6vw,5rem)] leading-[0.95] tracking-[-0.03em] font-extrabold text-white">
                    {t.heroTitle1}<br />{t.heroTitle2}
                  </h1>
                </SlideUp>
                <SlideUp delay={0.35}>
                  <p className="mt-6 text-[15px] text-white/85 max-w-md leading-relaxed font-medium">
                    {t.heroSub}
                  </p>
                </SlideUp>
                <SlideUp delay={0.45}>
                  <div className="mt-8 flex items-center gap-3 flex-wrap">
                    <button onClick={onSigninClick} className="h-12 px-7 rounded-full text-[14px] font-bold text-white transition focus-ring hover:scale-105" style={{ background: "#6E5FE8", boxShadow: "0 0 30px rgba(110, 95, 232, 0.5)" }}>
                      {t.bookNow}
                    </button>
                    <button onClick={() => smoothTo("#voices")} className="w-12 h-12 rounded-full bg-white flex items-center justify-center focus-ring hover:scale-110 transition shadow-lg">
                      <Play className="w-4 h-4 fill-[#6E5FE8] text-[#6E5FE8] ms-0.5" />
                    </button>
                  </div>
                </SlideUp>
              </div>

              {/* Carte "Know More" en bas à droite */}
              <div className="absolute bottom-6 end-6 z-10 hidden md:block">
                <div className="bg-white rounded-2xl p-4 shadow-2xl max-w-[220px] card-lift cursor-pointer" onClick={() => smoothTo("#voices")}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[13px] font-bold text-[#1A1A2E]">{t.knowMore}</span>
                    <ArrowUpRight className="w-4 h-4 text-[#6E5FE8]" />
                  </div>
                  <div className="text-[11px] text-[#1A1A2E]/60 leading-relaxed mb-3">{t.awesomeDesc}</div>
                  <div className="flex items-center gap-1">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6E5FE8] to-[#9D8FFF]" />
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#F472B6] to-[#EC4899] -ms-3 border-2 border-white" />
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#10B981] to-[#059669] -ms-3 border-2 border-white" />
                  </div>
                </div>
              </div>
            </div>
          </SlideUp>

          <SlideUp delay={0.2}>
            <div className="mt-8 flex flex-wrap items-center gap-6">
              <span className="text-[12px] font-semibold text-[#1A1A2E]/60">{t.follow} ↓</span>
              <div className="flex items-center gap-2">
                {["X", "f", "◎", "♪"].map((s, i) => (
                  <div key={i} className="w-9 h-9 rounded-full bg-white border border-[#1A1A2E]/10 flex items-center justify-center text-[12px] font-bold text-[#1A1A2E]/70 hover:bg-[#1A1A2E] hover:text-white transition cursor-pointer focus-ring">{s}</div>
                ))}
              </div>
              <div className="hidden lg:flex flex-1 items-center justify-around opacity-40">
                {partners.map((p) => <span key={p} className="text-[14px] font-bold text-[#1A1A2E]">{p}</span>)}
              </div>
            </div>
          </SlideUp>
        </div>
      </section>

      {/* POPULAR VOICES */}
      <section id="voices" className="py-16 sm:py-24">
        <div className="mx-auto max-w-[1280px] px-6">
          <SlideUp>
            <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
              <div>
                <p className="text-[12px] font-bold tracking-[0.2em] text-[#6E5FE8] uppercase mb-3">// {t.popularKicker}</p>
                <h2 className="text-[clamp(2rem,4.5vw,3.5rem)] leading-[1] tracking-[-0.03em] font-extrabold text-[#1A1A2E]">{t.popularTitle}</h2>
                <p className="text-[14px] text-[#1A1A2E]/60 mt-3 max-w-md">{t.popularSub}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setVoiceSlide((p) => Math.max(0, p - 1))} className="w-12 h-12 rounded-full bg-white border border-[#1A1A2E]/10 flex items-center justify-center hover:bg-[#1A1A2E] hover:text-white transition focus-ring">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button onClick={() => setVoiceSlide((p) => Math.min(popularVoices.length - 3, p + 1))} className="w-12 h-12 rounded-full bg-[#1A1A2E] text-white flex items-center justify-center hover:bg-[#6E5FE8] transition focus-ring">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </SlideUp>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {popularVoices.slice(voiceSlide, voiceSlide + 3).map((v, idx) => {
              const active = playingId === v.id;
              return (
                <SlideUp key={v.id} delay={idx * 0.1}>
                  <div className="group bg-white rounded-3xl overflow-hidden card-lift border border-[#1A1A2E]/5">
                    <button type="button" onClick={() => toggleVoice(v.id, v.url)} className="w-full text-start focus-ring cursor-pointer">
                      <div className="relative p-6 h-48 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${v.color}15 0%, ${v.color}05 100%)` }}>
                        <VoicePattern pattern={v.pattern} color={v.color} playing={active} />
                        <div className={`absolute top-4 end-4 w-12 h-12 rounded-full flex items-center justify-center transition-all ${active ? "scale-110" : "scale-90 opacity-0 group-hover:opacity-100 group-hover:scale-100"}`} style={{ background: active ? v.color : "#1A1A2E", color: "white" }}>
                          {active ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ms-0.5" />}
                        </div>
                      </div>
                      <div className="p-5 flex items-center justify-between">
                        <div>
                          <div className="text-[18px] font-extrabold text-[#1A1A2E] mb-1">{v.name}</div>
                          <div className="text-[12px] text-[#1A1A2E]/60 flex items-center gap-1"><span>📍</span> {v.location}</div>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold text-white" style={{ background: v.color }}>
                          <Star className="w-3 h-3 fill-current" /><Num>{v.rating}</Num>
                        </div>
                      </div>
                      <div className="px-5 pb-5 flex items-center justify-between text-[12px]">
                        <span className="text-[#1A1A2E]/70 font-semibold">{v.tag}</span>
                        <span className="text-[#1A1A2E]/50"><Num>{v.reviews}</Num> {t.nRatings}</span>
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
              <h2 className="text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.05] tracking-[-0.03em] font-extrabold text-[#1A1A2E] max-w-3xl mx-auto">{t.journeyTitle}</h2>
            </SlideUp>
            <SlideUp delay={0.2}>
              <p className="text-[14px] text-[#1A1A2E]/60 mt-4 max-w-xl mx-auto">{t.journeySub}</p>
            </SlideUp>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {journeySteps.map((s, i) => (
              <SlideUp key={s.n} delay={i * 0.15}>
                <div className="bg-white rounded-3xl p-8 h-full flex flex-col justify-between min-h-[260px] card-lift border border-[#1A1A2E]/5">
                  <div className="w-12 h-12 rounded-2xl bg-[#6E5FE8]/10 flex items-center justify-center">
                    <span className="text-[#6E5FE8] font-extrabold text-[18px]">0{s.n}</span>
                  </div>
                  <div>
                    <h3 className="text-[22px] font-extrabold text-[#1A1A2E] mb-2">{s.t}</h3>
                    <p className="text-[13px] text-[#1A1A2E]/60 leading-relaxed">{s.d}</p>
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
            <div className="bg-white rounded-[40px] overflow-hidden grid lg:grid-cols-2 items-stretch">
              <div className="relative h-80 lg:h-auto overflow-hidden" style={{ background: "linear-gradient(135deg, #FFE4B5 0%, #FFB6C1 50%, #9D8FFF 100%)" }}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-64 h-64">
                    <div className="absolute inset-0 rounded-full bg-white/30 animate-pulse" />
                    <div className="absolute inset-6 rounded-full bg-white/40" />
                    <div className="absolute inset-12 rounded-full bg-white/50" />
                    <div className="absolute inset-0 m-auto w-32 h-32 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #6E5FE8 0%, #9D8FFF 100%)" }}>
                      <AudioLines className="w-16 h-16 text-white" strokeWidth={1.5} />
                    </div>
                    {["♪", "♫", "♬", "♩"].map((note, i) => (
                      <div key={i} className="absolute text-white/80 text-3xl font-bold float" style={{ top: `${20 + (i * 23) % 60}%`, left: `${10 + (i * 31) % 70}%`, animationDelay: `${i * 0.5}s` }}>{note}</div>
                    ))}
                  </div>
                </div>
                <div className="absolute bottom-6 start-6 bg-white rounded-2xl p-4 shadow-xl">
                  <div className="text-[24px] font-extrabold text-[#1A1A2E]">{t.discount}</div>
                  <div className="text-[11px] text-[#1A1A2E]/60 mt-1">{t.discountDate}</div>
                </div>
              </div>

              <SlideRight delay={0.2} className="p-8 sm:p-12 lg:p-16 flex flex-col justify-center">
                <p className="text-[12px] font-bold tracking-[0.2em] text-[#6E5FE8] uppercase mb-3">// {isRTL ? "إبداع" : "Créativité"}</p>
                <h2 className="text-[clamp(1.75rem,3.5vw,3rem)] leading-[1.05] tracking-[-0.03em] font-extrabold text-[#1A1A2E]">{t.unleashTitle}</h2>
                <p className="mt-5 text-[14px] text-[#1A1A2E]/65 leading-relaxed max-w-md">{t.unleashSub}</p>
                <button onClick={onSigninClick} className="mt-7 inline-flex items-center gap-2 h-12 px-6 rounded-full bg-[#1A1A2E] text-white text-[14px] font-bold hover:bg-[#6E5FE8] transition focus-ring w-fit">
                  {t.unleashCTA}<ArrowIcon className="w-4 h-4" />
                </button>
              </SlideRight>
            </div>
          </ScaleIn>
        </div>
      </section>

      {/* METRICS */}
      <section className="py-16 sm:py-24">
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
                <div className="bg-white rounded-3xl p-7 text-center card-lift border border-[#1A1A2E]/5">
                  <div className="text-[clamp(2.5rem,5vw,3.5rem)] leading-none font-extrabold text-[#1A1A2E] mb-2" style={{ fontFamily: mono }}>
                    <Counter target={m.n} suffix={m.s} />
                  </div>
                  <div className="text-[12px] text-[#1A1A2E]/60 font-semibold">{m.l}</div>
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
            <div className="bg-white rounded-3xl p-8 sm:p-12 relative border border-[#1A1A2E]/5 min-h-[260px]">
              <AnimatePresence mode="wait">
                <motion.div key={activeTesti} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5 }}>
                  <div className="flex gap-1 mb-5">
                    {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="w-4 h-4 fill-[#6E5FE8] text-[#6E5FE8]" />)}
                  </div>
                  <blockquote className="text-[clamp(1.4rem,3vw,2rem)] leading-[1.25] font-extrabold text-[#1A1A2E]">"{testimonials[activeTesti].q}"</blockquote>
                  <div className="mt-6 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-extrabold" style={{ background: "linear-gradient(135deg, #6E5FE8 0%, #9D8FFF 100%)" }}>{testimonials[activeTesti].img}</div>
                    <div>
                      <div className="text-[14px] font-bold">{testimonials[activeTesti].n}</div>
                      <div className="text-[12px] text-[#1A1A2E]/60">{testimonials[activeTesti].r}</div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
              <div className="absolute bottom-6 end-6 flex items-center gap-2">
                <button onClick={() => setActiveTesti((p) => (p - 1 + testimonials.length) % testimonials.length)} className="w-11 h-11 rounded-full border border-[#1A1A2E]/10 hover:border-[#6E5FE8] flex items-center justify-center focus-ring transition">
                  {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                </button>
                <button onClick={() => setActiveTesti((p) => (p + 1) % testimonials.length)} className="w-11 h-11 rounded-full bg-[#1A1A2E] text-white hover:bg-[#6E5FE8] flex items-center justify-center focus-ring transition">
                  {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </SlideUp>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-16 sm:py-24">
        <div className="mx-auto max-w-[1280px] px-6">
          <div className="text-center mb-12">
            <SlideUp>
              <p className="text-[12px] font-bold tracking-[0.2em] text-[#6E5FE8] uppercase mb-3">// {t.pricingKicker}</p>
            </SlideUp>
            <SlideUp delay={0.1}>
              <h2 className="text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.05] tracking-[-0.03em] font-extrabold">{t.pricingTitle}</h2>
            </SlideUp>
            <SlideUp delay={0.2}>
              <p className="text-[14px] text-[#1A1A2E]/60 mt-3 max-w-md mx-auto">{t.pricingSub}</p>
            </SlideUp>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {pricing.map((p, i) => (
              <SlideUp key={p.pts} delay={i * 0.1}>
                <div className={`bg-white rounded-3xl p-7 h-full flex flex-col card-lift border-2 transition-all ${p.featured ? "border-[#6E5FE8] relative" : "border-[#1A1A2E]/5 hover:border-[#6E5FE8]/30"}`}>
                  {p.featured && (
                    <div className="absolute -top-3 start-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider text-white" style={{ background: "#6E5FE8" }}>POPULAR</div>
                  )}
                  <div className="text-[44px] leading-none font-extrabold text-[#1A1A2E] mb-1"><Num>{p.pts}</Num></div>
                  <div className="text-[11px] text-[#1A1A2E]/50 font-semibold mb-5 uppercase tracking-wider">points</div>
                  <div className="h-px bg-[#1A1A2E]/10 mb-5" />
                  <p className="text-[12px] text-[#1A1A2E]/65 mb-5 flex-1">{p.desc}</p>
                  <div className="flex items-baseline gap-1.5 mb-5">
                    <span className="text-[26px] font-extrabold text-[#1A1A2E]"><Num>{p.price}</Num></span>
                    <span className="text-[11px] text-[#1A1A2E]/50 font-mono">DZD</span>
                  </div>
                  <button onClick={onSigninClick} className={`h-11 rounded-full text-[13px] font-bold transition focus-ring ${p.featured ? "bg-[#6E5FE8] text-white hover:bg-[#1A1A2E]" : "bg-[#1A1A2E] text-white hover:bg-[#6E5FE8]"}`}>
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
              <div className="bg-white rounded-3xl overflow-hidden border border-[#1A1A2E]/5">
                {faqs.map((f, i) => {
                  const open = openFaq === i;
                  return (
                    <SlideUp key={f.q} delay={i * 0.05}>
                      <div className="border-b border-[#1A1A2E]/5 last:border-b-0">
                        <button onClick={() => setOpenFaq(open ? null : i)} className="w-full py-5 px-6 flex items-center gap-4 text-start focus-ring group">
                          <span className="flex-1 text-[15px] font-bold text-[#1A1A2E] group-hover:text-[#6E5FE8] transition-colors">{f.q}</span>
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${open ? "bg-[#6E5FE8] text-white rotate-45" : "bg-[#1A1A2E]/5 text-[#1A1A2E]"}`}>
                            <Plus className="w-4 h-4" />
                          </span>
                        </button>
                        <AnimatePresence initial={false}>
                          {open && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                              <p className="pb-5 px-6 pe-14 text-[13px] text-[#1A1A2E]/65 leading-relaxed">{f.a}</p>
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
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-[1280px] px-6">
          <ScaleIn>
            <div className="rounded-[40px] p-12 sm:p-16 text-center text-white relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1A1A2E 0%, #2D1B69 50%, #6E5FE8 100%)" }}>
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 start-1/4 w-96 h-96 rounded-full bg-[#9D8FFF]/20 blur-3xl float" />
                <div className="absolute bottom-0 end-1/4 w-80 h-80 rounded-full bg-[#6E5FE8]/30 blur-3xl float-slow" />
              </div>
              <div className="relative">
                <h2 className="text-[clamp(2.5rem,6vw,4.5rem)] leading-[1] tracking-[-0.03em] font-extrabold">{t.ctaTitle}</h2>
                <p className="mt-4 text-[15px] text-white/70 max-w-md mx-auto">{t.ctaSub}</p>
                <button onClick={onSigninClick} className="mt-8 inline-flex items-center gap-2 h-14 px-8 rounded-full bg-white text-[#1A1A2E] text-[15px] font-bold hover:scale-105 transition focus-ring">
                  {t.start}<ArrowIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </ScaleIn>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-10 border-t border-[#1A1A2E]/5">
        <div className="mx-auto max-w-[1280px] px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo size={32} />
          <div className="text-[12px] text-[#1A1A2E]/50 font-mono">© <Num>2026</Num> · {t.footTag} · SATIM · Edahabia · CIB</div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
