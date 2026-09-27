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
  Menu,
  X,
  Check,
  Star,
  ShoppingBag,
  Clapperboard,
  Mic2,
  Phone,
  ShieldCheck,
  SkipBack,
  SkipForward,
  Mic,
  Sparkles,
  Users,
  Zap,
  Globe,
  ChevronRight,
  Volume2,
  MessageSquare,
  FileAudio,
  Download,
  CreditCard,
  Clock,
  Award,
  Plus,
  Minus,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence, useInView } from "motion/react";

export interface LandingPageProps {
  onLoginClick: () => void;
  onSigninClick: () => void;
  language: "fr" | "ar";
  setLanguage: (lang: "fr" | "ar") => void;
}

/* ═══════════ PALETTE MODERNE SAAS ═══════════ */
const BG_OFF_WHITE = "#FAFAF9";
const BG_DARK_OLIVE = "#1A2F1A";
const NEON_GREEN = "#00FF66";
const NEON_GREEN_DARK = "#00CC52";
const SOFT_GREEN = "#E8F5E9";
const TEXT_DARK = "#0F1419";
const TEXT_LIGHT = "#8B9299";
const GLASS_BG = "rgba(255, 255, 255, 0.7)";
const GLASS_BORDER = "rgba(255, 255, 255, 0.3)";

const HERO_IMAGE = "https://images.unsplash.com/photo-1598653222000-6b7b7a552625?w=1600&q=80";
const INTRO_AUDIO_URL = "https://res.cloudinary.com/gz65ybug/video/upload/v1789055318/Generated_Audio_September_10_2026_-_4_29PM.wav";
const LOGO = "https://i.ibb.co/nqShkPNP/68126702-75e5-4de6-9b53-e51800b05e4a.jpg";

const AR_STACK = "'Cairo', sans-serif";
const FR_STACK = "'Inter', sans-serif";
const FONTS_URL = "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Inter:wght@400;500;600;700;800;900&display=swap";

/* ═══════════ STYLES GLOBAUX ══════════ */
const GlobalStyles = () => (
  <style>{`
    html { scroll-behavior: smooth; -webkit-font-smoothing: antialiased; }
    body { background: ${BG_OFF_WHITE}; color: ${TEXT_DARK}; margin: 0; font-family: ${FR_STACK}; }
    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    ::selection { background: ${NEON_GREEN}; color: ${TEXT_DARK}; }
    
    @keyframes marquee {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    
    @keyframes wave {
      0%, 100% { transform: scaleY(0.3); }
      50% { transform: scaleY(1); }
    }
    
    .wave-bar {
      animation: wave 1.2s ease-in-out infinite;
      transform-origin: bottom;
    }
    
    .glass {
      background: ${GLASS_BG};
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid ${GLASS_BORDER};
    }
    
    .marquee-container {
      display: flex;
      overflow: hidden;
      user-select: none;
    }
    
    .marquee-content {
      display: flex;
      animation: marquee 30s linear infinite;
      will-change: transform;
    }
    
    @media (prefers-reduced-motion: reduce) {
      html { scroll-behavior: auto; }
      *, *::before, *::after { animation-duration: 0.01ms !important; }
    }
  `}</style>
);

/* ═══════════ HOOKS ═══════════ */
function useScrolled(threshold = 50) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > threshold);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold]);

  return scrolled;
}

/* ═══════════ COMPOSANTS ═══════════ */
const Logo = ({ size = 36, dark = false }: { size?: number; dark?: boolean }) => {
  const [err, setErr] = useState(false);
  return (
    <div className="flex items-center gap-2.5 select-none">
      <div
        className="rounded-2xl overflow-hidden shrink-0"
        style={{
          width: size,
          height: size,
          boxShadow: dark ? "0 4px 12px rgba(0,0,0,0.1)" : "0 4px 12px rgba(255,255,255,0.2)",
        }}
      >
        {!err ? (
          <img
            src={LOGO}
            alt="Sawtify"
            width={size}
            height={size}
            onError={() => setErr(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center font-bold"
            style={{
              background: NEON_GREEN,
              color: TEXT_DARK,
              fontSize: size * 0.5,
            }}
          >
            S
          </div>
        )}
      </div>
      <span
        className="font-extrabold text-[18px] tracking-tight"
        style={{ color: dark ? TEXT_DARK : "#fff" }}
      >
        Sawtify
      </span>
    </div>
  );
};

const AnimatedSection = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const WaveBar = ({ height, delay }: { height: number; delay: number }) => (
  <div
    className="wave-bar w-1 rounded-full"
    style={{
      height: `${height}%`,
      background: `linear-gradient(to top, ${NEON_GREEN}, ${NEON_GREEN_DARK})`,
      animationDelay: `${delay}s`,
    }}
  />
);

const AudioWidget = ({ playing }: { playing: boolean }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    className="glass p-6 rounded-[32px] shadow-2xl"
    style={{ maxWidth: 320 }}
  >
    <div className="flex items-center gap-3 mb-4">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center"
        style={{ background: NEON_GREEN }}
      >
        <Mic className="w-5 h-5" style={{ color: TEXT_DARK }} />
      </div>
      <div>
        <p className="text-sm font-bold" style={{ color: TEXT_DARK }}>
          Génération en cours...
        </p>
        <p className="text-xs" style={{ color: TEXT_LIGHT }}>
          Daridja Algérienne
        </p>
      </div>
    </div>
    <div className="flex items-end justify-center gap-1 h-16">
      {Array.from({ length: 20 }).map((_, i) => (
        <WaveBar
          key={i}
          height={20 + Math.random() * 80}
          delay={i * 0.05}
        />
      ))}
    </div>
  </motion.div>
);

const PricingSlider = () => {
  const [words, setWords] = useState(5000);
  const price = Math.round((words / 1000) * 2.5);

  return (
    <div
      className="p-8 rounded-[32px] shadow-xl"
      style={{ background: NEON_GREEN }}
    >
      <h3 className="text-2xl font-bold mb-6" style={{ color: TEXT_DARK }}>
        <span className="text-5xl">{price} DZD</span> / mois
      </h3>
      <div className="mb-6">
        <label className="block text-sm font-semibold mb-3" style={{ color: TEXT_DARK }}>
          Nombre de mots : {words.toLocaleString()}
        </label>
        <input
          type="range"
          min="1000"
          max="50000"
          step="1000"
          value={words}
          onChange={(e) => setWords(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${BG_DARK_OLIVE} 0%, ${BG_DARK_OLIVE} ${(words / 50000) * 100}%, rgba(0,0,0,0.2) ${(words / 50000) * 100}%, rgba(0,0,0,0.2) 100%)`,
          }}
        />
      </div>
      <ul className="space-y-3 mb-6">
        {["30 voix algériennes", "Génération instantanée", "Support prioritaire"].map((item, i) => (
          <li key={i} className="flex items-center gap-2 text-sm font-medium" style={{ color: TEXT_DARK }}>
            <Check className="w-5 h-5" />
            {item}
          </li>
        ))}
      </ul>
      <button
        className="w-full py-4 rounded-full font-bold text-white transition hover:opacity-90"
        style={{ background: BG_DARK_OLIVE }}
      >
        Commencer maintenant
      </button>
    </div>
  );
};

const FAQItem = ({ q, a }: { q: string; a: string }) => {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="border-b pb-4"
      style={{ borderColor: "rgba(255,255,255,0.1)" }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 text-left"
      >
        <span className="text-lg font-bold" style={{ color: NEON_GREEN }}>
          {q}
        </span>
        {open ? (
          <Minus className="w-6 h-6" style={{ color: NEON_GREEN }} />
        ) : (
          <Plus className="w-6 h-6" style={{ color: NEON_GREEN }} />
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <p className="text-base leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ═══════════ COMPOSANT PRINCIPAL ═══════════ */
export const LandingPage: React.FC<LandingPageProps> = ({
  onLoginClick,
  onSigninClick,
  language,
  setLanguage,
}) => {
  const isRTL = language === "ar";
  const [menuOpen, setMenuOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const scrolled = useScrolled();

  const bootRef = useRef(false);
  useLayoutEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem("sawtify_lang");
    } catch {}
    const target = saved === "fr" || saved === "ar" ? saved : "fr";
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
      heroTitle: isRTL ? "صوت الجزائر لمحتواك" : "La voix de l'Algérie pour vos contenus",
      heroSub: isRTL
        ? "قم بإنشاء محتوى صوتي احترافي بالدارجة الجزائرية في ثوانٍ"
        : "Créez du contenu audio professionnel en darija algérienne en quelques secondes",
      signup: isRTL ? "إنشاء حساب" : "Sign up",
      signin: isRTL ? "تسجيل الدخول" : "Se connecter",
      features: isRTL ? "المميزات" : "Fonctionnalités",
      pricing: isRTL ? "الأسعار" : "Tarifs",
      faq: isRTL ? "أسئلة شائعة" : "FAQ",
      contact: isRTL ? "اتصل بنا" : "Contact",
      nextGen: isRTL ? "قم بإنشاء الجيل القادم من الأصوات" : "Générez la prochaine génération de voix",
      accessVoices: isRTL ? "احصل على الأصوات التي تحتاجها، بسرعة" : "Accédez aux voix dont vous avez besoin, rapidement",
      transparentPrice: isRTL ? "سعر شفاف. بدون رسوم خفية." : "Un prix transparent. Pas de frais cachés.",
      faqTitle: isRTL ? "الأسئلة الشائعة" : "Questions Fréquentes",
      talkExperts: isRTL ? "تحدث مع خبرائنا" : "Parlez à nos experts",
    }),
    [isRTL]
  );

  const nav = [
    { label: t.features, href: "#features" },
    { label: t.pricing, href: "#pricing" },
    { label: t.faq, href: "#faq" },
    { label: t.contact, href: "#contact" },
  ];

  const logos = ["Google Gemini", "TikTok", "YouTube", "Instagram", "Facebook"];

  const faqs = isRTL
    ? [
        { q: "ما هو Sawtify؟", a: "منصة لتحويل النص إلى صوت بالدارجة الجزائرية باستخدام الذكاء الاصطناعي." },
        { q: "كم من الوقت يستغرق؟", a: "أقل من دقيقة لتوليد صوت احترافي." },
        { q: "هل يمكنني استخدامه تجاريًا؟", a: "نعم، جميع الأصوات مرخصة للاستخدام التجاري." },
      ]
    : [
        { q: "Qu'est-ce que Sawtify ?", a: "Une plateforme de conversion texte-voix en darija algérienne avec IA." },
        { q: "Combien de temps ça prend ?", a: "Moins d'une minute pour générer une voix professionnelle." },
        { q: "Puis-je l'utiliser commercialement ?", a: "Oui, toutes les voix sont sous licence commerciale." },
      ];

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

      {/* ═══════════ NAVBAR ═══════════ */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled ? "glass shadow-lg" : ""
        }`}
        style={{ padding: "1rem 2rem" }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <nav className="hidden lg:flex items-center gap-8">
            {nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm font-semibold hover:opacity-70 transition"
                style={{ color: scrolled ? TEXT_DARK : "#fff" }}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <Logo size={36} dark={scrolled} />

          <div className="flex items-center gap-4">
            <button
              onClick={switchLang}
              className="text-sm font-semibold px-4 py-2 rounded-full hover:opacity-70 transition"
              style={{
                color: scrolled ? TEXT_DARK : "#fff",
                border: `1px solid ${scrolled ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.3)"}`,
              }}
            >
              {isRTL ? "FR" : "ع"}
            </button>
            <button
              onClick={onLoginClick}
              className="hidden md:block text-sm font-semibold hover:opacity-70 transition"
              style={{ color: scrolled ? TEXT_DARK : "#fff" }}
            >
              {t.signin}
            </button>
            <button
              onClick={onSigninClick}
              className="px-6 py-2.5 rounded-full text-sm font-bold text-white transition hover:opacity-90"
              style={{ background: TEXT_DARK }}
            >
              {t.signup}
            </button>
            <button
              onClick={() => setMenuOpen(true)}
              className="lg:hidden"
              style={{ color: scrolled ? TEXT_DARK : "#fff" }}
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* ═══════════ MOBILE MENU ═══════════ */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: isRTL ? "-100%" : "100%" }}
              animate={{ x: 0 }}
              exit={{ x: isRTL ? "-100%" : "100%" }}
              className="fixed inset-y-0 end-0 z-[70] w-80 bg-white shadow-2xl p-6"
            >
              <button onClick={() => setMenuOpen(false)} className="mb-8">
                <X className="w-6 h-6" />
              </button>
              <nav className="flex flex-col gap-6">
                {nav.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="text-lg font-bold"
                    style={{ color: TEXT_DARK }}
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${HERO_IMAGE})`,
            filter: "brightness(0.7)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to top, ${BG_OFF_WHITE} 0%, transparent 50%)`,
          }}
        />
        <div className="relative z-10 text-center px-6 max-w-4xl">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-5xl md:text-7xl font-black leading-tight mb-6"
            style={{ color: "#fff" }}
          >
            {t.heroTitle}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl md:text-2xl mb-8"
            style={{ color: "rgba(255,255,255,0.9)" }}
          >
            {t.heroSub}
          </motion.p>
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            onClick={onSigninClick}
            className="px-10 py-4 rounded-full text-lg font-bold transition hover:scale-105"
            style={{ background: NEON_GREEN, color: TEXT_DARK }}
          >
            {t.signup} →
          </motion.button>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="absolute bottom-10 right-10 hidden lg:block"
        >
          <AudioWidget playing={playing} />
        </motion.div>
      </section>

      {/* ═══════════ MARQUEE LOGOS ═══════════ */}
      <AnimatedSection>
        <div className="py-12" style={{ background: BG_OFF_WHITE }}>
          <div className="marquee-container">
            <div className="marquee-content">
              {[...logos, ...logos].map((logo, i) => (
                <div
                  key={i}
                  className="flex items-center justify-center px-12"
                  style={{ color: TEXT_LIGHT, fontSize: "1.5rem", fontWeight: 700 }}
                >
                  {logo}
                </div>
              ))}
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* ═══════════ FEATURES ═══════════ */}
      <AnimatedSection>
        <section id="features" className="py-24 px-6" style={{ background: BG_OFF_WHITE }}>
          <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl md:text-6xl font-black text-center mb-16" style={{ color: TEXT_DARK }}>
              {t.nextGen}
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { title: "Instantané", desc: "Générez en moins de 60 secondes", bg: SOFT_GREEN },
                { title: "30 Voix", desc: "Hommes, femmes, différents styles", bg: "#FFF3E0" },
                { title: "Commercial", desc: "Licence complète incluse", bg: "#E3F2FD" },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  whileHover={{ y: -8 }}
                  className="p-8 rounded-[32px] shadow-lg"
                  style={{ background: item.bg }}
                >
                  <h3 className="text-2xl font-bold mb-3" style={{ color: TEXT_DARK }}>
                    {item.title}
                  </h3>
                  <p className="text-lg" style={{ color: TEXT_LIGHT }}>
                    {item.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </AnimatedSection>

      {/* ═══════════ AVANTAGES ═══════════ */}
      <AnimatedSection>
        <section className="py-24 px-6" style={{ background: BG_OFF_WHITE }}>
          <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-black text-center mb-16" style={{ color: TEXT_DARK }}>
              {t.accessVoices}
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="p-8 rounded-[32px]" style={{ background: SOFT_GREEN }}>
                <img
                  src="https://images.unsplash.com/photo-1589903308904-1010c2294adc?w=600&q=80"
                  alt="Interface"
                  className="w-full h-48 object-cover rounded-2xl mb-4"
                />
                <h3 className="text-xl font-bold" style={{ color: TEXT_DARK }}>
                  Interface intuitive
                </h3>
              </div>
              <div className="p-8 rounded-[32px]" style={{ background: "#FFF3E0" }}>
                <div className="text-5xl font-black mb-4" style={{ color: NEON_GREEN }}>
                  1.2s
                </div>
                <p className="text-lg" style={{ color: TEXT_DARK }}>
                  Temps de génération moyen
                </p>
              </div>
              <div className="p-8 rounded-[32px]" style={{ background: "#E3F2FD" }}>
                <img
                  src="https://images.unsplash.com/photo-1556761175-b413da4baf72?w=600&q=80"
                  alt="Mobile"
                  className="w-full h-48 object-cover rounded-2xl mb-4"
                />
                <h3 className="text-xl font-bold" style={{ color: TEXT_DARK }}>
                  Sans prise de tête
                </h3>
              </div>
            </div>
          </div>
        </section>
      </AnimatedSection>

      {/* ═══════════ PRICING ═══════════ */}
      <AnimatedSection>
        <section id="pricing" className="py-24 px-6" style={{ background: BG_OFF_WHITE }}>
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-black mb-6" style={{ color: TEXT_DARK }}>
                {t.transparentPrice}
              </h2>
              <p className="text-xl" style={{ color: TEXT_LIGHT }}>
                Payez uniquement pour ce que vous utilisez. Pas d'abonnement caché.
              </p>
            </div>
            <PricingSlider />
          </div>
        </section>
      </AnimatedSection>

      {/* ═══════════ FAQ ═══════════ */}
      <AnimatedSection>
        <section
          id="faq"
          className="py-24 px-6"
          style={{ background: BG_DARK_OLIVE }}
        >
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-5xl md:text-6xl font-black mb-6" style={{ color: NEON_GREEN }}>
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

      {/* ═══════════ TESTIMONIAL ═══════════ */}
      <AnimatedSection>
        <section
          className="relative py-32 px-6 flex items-center justify-center"
          style={{
            backgroundImage: "url(https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1600&q=80)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.6)" }}
          />
          <div className="relative z-10 text-center max-w-3xl">
            <p className="text-3xl md:text-5xl font-bold mb-6" style={{ color: NEON_GREEN }}>
              "Sawtify a changé la façon dont on fait nos vidéos. Incroyable!"
            </p>
            <p className="text-xl" style={{ color: "#fff" }}>
              — Amine K., Créateur de contenu
            </p>
          </div>
        </section>
      </AnimatedSection>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer style={{ background: BG_DARK_OLIVE }} className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.05 }}
                className="rounded-[32px] overflow-hidden shadow-xl"
              >
                <img
                  src={`https://images.unsplash.com/photo-${1550000000000 + i * 1000000}?w=600&q=80`}
                  alt={`Blog ${i}`}
                  className="w-full h-48 object-cover"
                />
                <div className="p-6" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <h3 className="text-lg font-bold mb-2" style={{ color: "#fff" }}>
                    Article de blog {i}
                  </h3>
                  <p className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
                    Découvrez comment Sawtify révolutionne...
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold mb-4" style={{ color: NEON_GREEN }}>
              {t.talkExperts}
            </h3>
            <div className="flex items-center justify-center gap-2 mb-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-full bg-gray-300"
                  style={{
                    backgroundImage: `url(https://i.pravatar.cc/150?img=${i})`,
                    backgroundSize: "cover",
                  }}
                />
              ))}
            </div>
            <button
              onClick={onSigninClick}
              className="px-8 py-4 rounded-full font-bold text-lg transition hover:opacity-90"
              style={{ background: NEON_GREEN, color: TEXT_DARK }}
            >
              Commencer gratuitement
            </button>
          </div>

          <div className="text-center pt-8 border-t" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
            <Logo size={40} />
            <div className="flex items-center justify-center gap-6 mt-6 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
              <a href="#" className="hover:opacity-70">
                Conditions
              </a>
              <a href="#" className="hover:opacity-70">
                Confidentialité
              </a>
              <a href="#" className="hover:opacity-70">
                Contact
              </a>
            </div>
            <p className="mt-4 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
              © 2026 Sawtify. Made in Algeria 🇩🇿
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
