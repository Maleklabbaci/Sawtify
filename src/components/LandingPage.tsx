import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  Play,
  Pause,
  Plus,
  Menu,
  X,
  Check,
  Star,
  Sparkles,
  ArrowUpRight,
  Volume2,
  Plane,
  MapPin,
  Ticket,
  CreditCard,
  Headphones,
  Mic,
  Waves,
} from "lucide-react";
import { motion, AnimatePresence, useScroll, useMotionValue, useSpring } from "motion/react";

interface LandingPageProps {
  onLoginClick: () => void;
  onSigninClick: () => void;
  language: "fr" | "ar";
  setLanguage: (lang: "fr" | "ar") => void;
}

/* =========================================================
   GLOBAL STYLES — Bleu voyage, clean, moderne
========================================================= */
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700;800&family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap');

    * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
    html {
      scroll-behavior: smooth;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      background: #F0F9FF;
    }
    body {
      overflow-x: hidden;
      background: #F0F9FF;
      color: #0F172A;
      font-family: 'Inter', sans-serif;
    }

    /* Subtle dot pattern */
    .dots {
      background-image: radial-gradient(circle, #BAE6FD 1px, transparent 1px);
      background-size: 24px 24px;
      opacity: 0.5;
    }

    @keyframes floatUp {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }
    @keyframes pulseRing {
      0%, 100% { box-shadow: 0 0 0 0 rgba(14,165,233,0.3); }
      50% { box-shadow: 0 0 0 12px rgba(14,165,233,0); }
    }

    .float-up { animation: floatUp 5s ease-in-out infinite; }
    .pulse-ring { animation: pulseRing 3s ease-in-out infinite; }

    @keyframes shimmerSlow {
      0% { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
    .text-gradient-shine {
      background: linear-gradient(90deg, #0F172A 0%, #0EA5E9 50%, #0F172A 100%);
      background-size: 200% auto;
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      animation: shimmerSlow 4s linear infinite;
    }

    /* Glass cards */
    .glass-card {
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(16px) saturate(140%);
      -webkit-backdrop-filter: blur(16px) saturate(140%);
      border: 1px solid rgba(186, 230, 253, 0.6);
      box-shadow: 0 4px 24px rgba(14, 165, 233, 0.08);
    }

    /* Focus */
    .focus-ring:focus-visible { outline: 2px solid #0EA5E9; outline-offset: 2px; border-radius: 8px; }

    /* Scrollbar */
    ::-webkit-scrollbar { width: 8px; }
    ::-webkit-scrollbar-track { background: #F0F9FF; }
    ::-webkit-scrollbar-thumb { background: linear-gradient(180deg, #BAE6FD, #7DD3FC); border-radius: 8px; }
    ::selection { background: #BAE6FD; color: #0F172A; }

    /* Image overlay for hero */
    .hero-gradient {
      background: linear-gradient(135deg, rgba(240,249,255,0.88) 0%, rgba(186,230,253,0.92) 60%, rgba(125,211,252,0.95) 100%);
    }
  `}</style>
);

/* =========================================================
   LOGO INTEGRÉ — SVG fixe, jamais cassé
========================================================= */
const LogoSVG = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="logoGrad" x1="0" y1="0" x2="40" y2="40">
        <stop offset="0%" stopColor="#0EA5E9" />
        <stop offset="100%" stopColor="#7DD3FC" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="36" height="36" rx="10" fill="url(#logoGrad)" />
    <path d="M12 28L28 14M20 14L28 22" stroke="white" strokeWidth="3" strokeLinecap="round" />
    <circle cx="20" cy="20" r="3" fill="white" />
  </svg>
);

/* =========================================================
   UTILS
========================================================= */
const Counter = ({ target, suffix = "" }: any) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const node = ref.current; if (!node) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (!e.isIntersecting || started.current) return; started.current = true; const start = performance.now();
        const tick = (now: number) => { const p = Math.min((now - start) / 2000, 1); setCount(Math.round((1 - Math.pow(1 - p, 4)) * target)); if (p < 1) requestAnimationFrame(tick); };
        requestAnimationFrame(tick); },
      { threshold: 0.3 }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [target]);
  return <span ref={ref} className="tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{count.toLocaleString("fr-FR")}{suffix}</span>;
};

const MagneticBtn = ({ children, className = "", style = {} }: any) => {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { damping: 15, stiffness: 150 });
  const sy = useSpring(y, { damping: 15, stiffness: 150 });
  const handleMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - rect.left - rect.width / 2) * 0.15);
    y.set((e.clientY - rect.top - rect.height / 2) * 0.15);
  };
  const reset = () => { x.set(0); y.set(0); };
  return <motion.button ref={ref} onMouseMove={handleMove} onMouseLeave={reset} style={{ x: sx, y: sy, ...style }} className={className}>{children}</motion.button>;
};

const Reveal = ({ children, delay = 0, y = 24, className = "" }: any) => (
  <motion.div initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }} className={className}>{children}</motion.div>
);

/* =========================================================
   MAIN
========================================================= */
export const LandingPage: React.FC<LandingPageProps> = ({
  onLoginClick, onSigninClick, language, setLanguage,
}) => {
  const isRTL = language === "ar";
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [tabActive, setTabActive] = useState("sounds"); // sounds / journey / unleash

  const sans = isRTL ? "'IBM Plex Sans Arabic', 'Inter', sans-serif" : "'Inter', 'Space Grotesk', sans-serif";
  const display = isRTL ? "'IBM Plex Sans Arabic', 'Space Grotesk', sans-serif" : "'Space Grotesk', 'Inter', sans-serif";
  const mono = "'JetBrains Mono', monospace";

  // Demo audio
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playSound = (id: string, url: string) => {
    if (playing === id) { audioRef.current?.pause(); setPlaying(null); return; }
    audioRef.current?.pause();
    const a = new Audio(url); audioRef.current = a; a.play(); setPlaying(id); a.onended = () => setPlaying(null);
  };

  useEffect(() => {
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    document.documentElement.lang = language;
  }, [language, isRTL]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const ArrowIcon = ({ className = "w-4 h-4" }: any) => isRTL ? <ArrowLeft className={className} /> : <ArrowRight className={className} />;

  /* COPY — FR/AR UNIQUEMENT */
  const t = {
    navAbout: isRTL ? "من نحن" : "À propos",
    navTour: isRTL ? "جولة" : "Tour",
    navPackage: isRTL ? "عروض" : "Offres",
    navContact: isRTL ? "اتصل" : "Contact",
    heroLabel: isRTL ? "ارفع صوتك — بالذكاء الاصطناعي" : "Élevez votre voix — avec l'intelligence artificielle",
    heroTitle: isRTL ? "رحلة إلى السماء" : "Journey To The Skies",
    heroSub: isRTL ? "أصوات حقيقية بالدارجة الجزائرية. 30 ثانية فقط." : "Des voix réelles en darija algérienne. 30 secondes seulement.",
    heroCta: isRTL ? "احجز تذكرتك" : "Réserver un ticket",
    heroBadge: isRTL ? "أصوات شهيرة" : "Sons populaires",
    sectionPopular: isRTL ? "أصوات شهيرة" : "Sons populaires",
    popularSub: isRTL ? "أصواتنا الأكثر استخداماً" : "Nos sons les plus utilisés",
    cardAmin: isRTL ? "أمين" : "Amin",
    cardAminTag: isRTL ? "إعلان تجاري" : "Spot publicitaire",
    cardYasmine: isRTL ? "ياسمين" : "Yasmine",
    cardYasmineTag: isRTL ? "سوشيال" : "Social",
    cardKhalid: isRTL ? "خالد" : "Khalid",
    cardKhalidTag: isRTL ? "وثائقي" : "Documentaire",
    journeyTitle: isRTL ? "رحلة إلى السماء — سهلة وبسيطة" : "Journey To The Skies — Simple et facile",
    journeySub: isRTL ? "احجز تذكرتك بسهولة. اختر وجهتك، استمع، سافر." : "Réservez facilement. Choisissez votre destination, écoutez, voyagez.",
    unleashTitle: isRTL ? "أطلق العنان لحلم السفر" : "Unleash The Wanderlust",
    unleashSub: isRTL ? "مع SkyWings، السفر يصبح تجربة صوتية. خصم خاص اليوم." : "Avec SkyWings, le voyage devient une expérience sonore. Remise spéciale aujourd'hui.",
    unleashOffer: isRTL ? "خصم 20%" : "20% OFF",
    unleashCta: isRTL ? "احجز الآن" : "Réserver maintenant",
    footerCopy: isRTL ? "صنع في الجزائر — للمبدعين في كل مكان." : "Conçu en Algérie — pour les créateurs du monde entier.",
    btnBook: isRTL ? "احجز الآن" : "Réserver",
  };

  /* Sections data */
  const sounds = [
    { id: "amin", name: t.cardAmin, tag: t.cardAminTag, color: "#0EA5E9", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
    { id: "yasmine", name: t.cardYasmine, tag: t.cardYasmineTag, color: "#F472B6", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
    { id: "khalid", name: t.cardKhalid, tag: t.cardKhalidTag, color: "#34D399", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
  ];

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen text-[#0F172A]" style={{ fontFamily: sans, background: "#F0F9FF" }}>
      <GlobalStyles />

      {/* NAVIGATION FIXE */}
      <nav className="fixed top-0 inset-x-0 z-50 glass transition-all duration-300" style={{ borderBottom: isRTL ? "1px solid rgba(186,230,253,0.4)" : "1px solid rgba(186,230,253,0.4)" }}>
        <div className="mx-auto max-w-[1280px] px-6 h-16 flex items-center justify-between">
          <a href="#hero" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-md group-hover:scale-105 transition-transform">
              <LogoSVG />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-[#0F172A]">UpShuyo</span>
          </a>

          <div className="hidden md:flex items-center gap-8 text-[14px] font-medium">
            {[ { label: t.navAbout, href: "#hero" }, { label: t.navTour, href: "#journey" }, { label: t.navPackage, href: "#sounds" }, { label: t.navContact, href: "#contact" } ].map((l) => (
              <a key={l.href} href={l.href} className="text-slate-600 hover:text-[#0EA5E9] transition-colors relative group">
                {l.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#0EA5E9] transition-all group-hover:w-full rounded-full" />
              </a>
            ))}
          </div>

          <MagneticBtn className="hidden md:inline-flex h-9 px-4 rounded-full text-[13px] font-bold text-white shadow-lg hover:shadow-xl transition-shadow"
            style={{ background: "linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)" }}
            onClick={() => { document.getElementById("hero")?.scrollIntoView({ behavior: "smooth" }); onSigninClick(); }}>
            {t.btnBook}
          </MagneticBtn>

          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden w-10 h-10 rounded-full glass flex items-center justify-center" aria-label="Menu">
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* MOBILE MENU */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="md:hidden fixed top-16 left-0 right-0 z-40 glass border-t border-[#BAE6FD]" style={{ background: "rgba(240,249,255,0.95)" }}>
            <div className="p-6 flex flex-col gap-4">
              {[ { label: t.navAbout, href: "#hero" }, { label: t.navTour, href: "#journey" }, { label: t.navPackage, href: "#sounds" }, { label: t.navContact, href: "#contact" } ].map((l) => (
                <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)} className="text-[#0F172A] font-semibold text-lg py-2 border-b border-[#BAE6FD]">{l.label}</a>
              ))}
              <button onClick={() => { setMenuOpen(false); onSigninClick(); }} className="mt-2 h-10 rounded-full text-white font-bold" style={{ background: "linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)" }}>{t.btnBook}</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HERO — Style image voyage */}
      <section id="hero" className="relative pt-28 pb-16 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1920&h=1000&fit=crop&q=80" alt="" className="w-full h-full object-cover opacity-90" loading="eager" />
          <div className="absolute inset-0 hero-gradient" />
        </div>
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-[#BAE6FD]/30 blur-[120px] -z-10" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-[#7DD3FC]/20 blur-[100px] -z-10" />

        <div className="relative z-10 mx-auto max-w-[1280px] px-6 pt-12 pb-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[520px]">
            <Reveal>
              <div className="inline-block mb-6 px-4 py-1.5 rounded-full text-[11px] font-mono font-bold tracking-widest uppercase text-[#0284C7] glass" style={{ borderColor: "#BAE6FD" }}>
                {t.heroLabel}
              </div>
              <h1 className="text-[clamp(2.8rem,7vw,5rem)] leading-[0.95] tracking-tight text-[#0F172A]" style={{ fontFamily: display, fontWeight: 800 }}>
                {t.heroTitle}
                <br />
                <span className="text-gradient-shine">Made Simple</span>
              </h1>
              <p className="mt-6 text-lg text-slate-600 max-w-md leading-relaxed">
                {t.heroSub}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <MagneticBtn onClick={() => document.getElementById("journey")?.scrollIntoView({ behavior: "smooth" })} className="h-12 px-8 rounded-full text-[15px] font-bold text-white shadow-xl hover:shadow-2xl transition-all flex items-center gap-2"
                  style={{ background: "linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)", boxShadow: "0 10px 30px rgba(14,165,233,0.3)" }}>
                  {t.heroCta} <ArrowUpRight size={18} />
                </MagneticBtn>
                <MagneticBtn onClick={() => document.getElementById("sounds")?.scrollIntoView({ behavior: "smooth" })} className="h-12 px-8 rounded-full text-[15px] font-semibold text-[#0F172A] glass hover:bg-white/60 transition">
                  {t.heroBadge}
                </MagneticBtn>
              </div>

              <div className="mt-10 flex items-center gap-4 text-[11px] font-mono text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-ring" />
                <span>En ligne — Prêt à voler</span>
              </div>
            </Reveal>

            {/* Hero visual — plane style */}
            <Reveal delay={0.15} className="relative">
              <div className="relative rounded-[2.5rem] overflow-hidden glass shadow-2xl rotate-[2deg] hover:rotate-0 transition-transform duration-700">
                <img src="https://images.unsplash.com/photo-1524592714635-d77511a4834d?w=800&h=600&fit=crop&q=80" alt="Flight" className="w-full h-[420px] object-cover" />
                <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-white/90 to-transparent">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center">
                      <Plane size={24} className="text-[#0EA5E9]" />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Destination</div>
                      <div className="text-xl font-extrabold text-[#0F172A]">Paris — Alger</div>
                    </div>
                  </div>
                </div>
                {/* Small floating badges */}
                <div className="absolute top-4 right-4 glass rounded-xl px-3 py-2 text-[10px] font-mono font-bold text-[#0284C7]">
                  ✈ 30 min
                </div>
                <div className="absolute bottom-20 left-4 glass rounded-xl px-3 py-2 text-[10px] font-mono font-bold text-[#0284C7]">
                  📍 12 sons
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* POPULAR DESTINATION / SOUNDS */}
      <section id="sounds" className="py-20 relative dots">
        <div className="mx-auto max-w-[1280px] px-6">
          <Reveal>
            <div className="flex items-end justify-between mb-10">
              <div>
                <h2 className="text-[2rem] sm:text-[2.5rem] font-extrabold text-[#0F172A]" style={{ fontFamily: display, letterSpacing: "-0.03em" }}>
                  {t.sectionPopular}
                </h2>
                <p className="text-slate-500 mt-2 font-medium">{t.popularSub}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => {}} className="w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-white transition" aria-label="Précédent">
                  <ArrowLeft size={18} />
                </button>
                <button onClick={() => {}} className="w-10 h-10 rounded-full bg-[#0EA5E9] text-white flex items-center justify-center shadow-md hover:bg-[#0284C7] transition" aria-label="Suivant">
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-6">
            {sounds.map((s, i) => (
              <Reveal key={s.id} delay={i * 0.1}>
                <div className="group glass-card rounded-[2rem] overflow-hidden hover:-translate-y-2 transition-all duration-500">
                  <div className="relative h-[220px] overflow-hidden">
                    <img
                      src={[
                        "https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=600&h=400&fit=crop&q=80",
                        "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600&h=400&fit=crop&q=80",
                        "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=600&h=400&fit=crop&q=80"
                      ][i % 3]}
                      alt={s.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/60 via-transparent to-transparent" />
                    <button
                      onClick={() => playSound(s.id, s.url)}
                      className={`absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all ${playing === s.id ? "bg-[#C084FC] text-white scale-110" : "bg-white/90 text-[#0F172A] hover:bg-white"}`}
                      aria-label={playing === s.id ? "Pause" : "Play"}
                    >
                      {playing === s.id ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                    </button>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-extrabold text-[#0F172A]" style={{ fontFamily: display }}>{s.name}</h3>
                    <p className="text-sm text-slate-500 mt-1 font-medium">{s.tag}</p>
                    <div className="mt-4 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                      <span className="text-[11px] font-mono text-slate-400">0:30 — {s.id}.mp3</span>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* JOURNEY TO THE SKIES — Simple, card mockup */}
      <section id="journey" className="py-20 relative overflow-hidden">
        <div className="mx-auto max-w-[1280px] px-6">
          <div className="text-center mb-14">
            <Reveal>
              <span className="text-[11px] font-mono font-bold tracking-[0.2em] text-[#0284C7] uppercase">Journey</span>
              <h2 className="text-[2.2rem] sm:text-[3.2rem] font-extrabold text-[#0F172A] mt-3 tracking-tight" style={{ fontFamily: display }}>
                {t.journeyTitle}
              </h2>
              <p className="text-slate-500 mt-4 max-w-xl mx-auto text-base">{t.journeySub}</p>
            </Reveal>
          </div>

          <Reveal delay={0.1}>
            <div className="grid md:grid-cols-3 gap-4">
              {/* Card 1 */}
              <div className="glass-card rounded-[2rem] p-6 text-center float-up hover:-translate-y-1 transition-transform">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-[#BAE6FD] to-[#7DD3FC] flex items-center justify-center shadow-md mb-4">
                  <MapPin size={24} className="text-[#0284C7]" />
                </div>
                <h3 className="font-extrabold text-lg text-[#0F172A]">Trouvez votre destination</h3>
                <p className="text-sm text-slate-500 mt-1">Choisissez parmi des centaines de voix et de lieux.</p>
              </div>
              {/* Card 2 — Featured */}
              <div className="glass-card rounded-[2rem] p-6 text-center float-up hover:-translate-y-1 transition-transform" style={{ animationDelay: "1s", background: "linear-gradient(135deg, rgba(14,165,233,0.08) 0%, rgba(255,255,255,0.9) 100%)", borderColor: "#0EA5E9" }}>
                <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-[#0EA5E9] to-[#0284C7] flex items-center justify-center shadow-lg mb-4">
                  <Headphones size={24} className="text-white" />
                </div>
                <h3 className="font-extrabold text-lg text-[#0F172A]">Réservez votre ticket</h3>
                <p className="text-sm text-slate-500 mt-1">Un son, une destination. Écoutez et voyagez.</p>
                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-mono font-bold text-white bg-gradient-to-r from-[#0EA5E9] to-[#0284C7]">
                  <Ticket size={12} /> EN LIGNE
                </div>
              </div>
              {/* Card 3 */}
              <div className="glass-card rounded-[2rem] p-6 text-center float-up hover:-translate-y-1 transition-transform" style={{ animationDelay: "2s" }}>
                <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-[#BAE6FD] to-[#7DD3FC] flex items-center justify-center shadow-md mb-4">
                  <CreditCard size={24} className="text-[#0284C7]" />
                </div>
                <h3 className="font-extrabold text-lg text-[#0F172A]">Payez, partez</h3>
                <p className="text-sm text-slate-500 mt-1">Paiement sécurisé. Annulation gratuite.</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* UNLEASH WANDERLUST — Split photo/text */}
      <section id="contact" className="py-20 relative overflow-hidden">
        <div className="mx-auto max-w-[1280px] px-6">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            {/* Photo */}
            <Reveal>
              <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl group">
                <img src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&h=700&fit=crop&q=80" alt="Beach wanderlust" className="w-full h-[480px] object-cover group-hover:scale-[1.02] transition-transform duration-700" />
                <div className="absolute top-6 left-6 glass rounded-xl px-3 py-2">
                  <div className="text-[10px] font-mono font-bold text-[#0284C7]">PROMO</div>
                  <div className="text-xl font-extrabold text-[#0F172A]" style={{ fontFamily: display }}>20% OFF</div>
                </div>
                <div className="absolute bottom-6 right-6">
                  <MagneticBtn onClick={onSigninClick} className="h-11 px-5 rounded-full text-[13px] font-bold text-white shadow-lg hover:shadow-xl transition-shadow flex items-center gap-2" style={{ background: "linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)" }}>
                    {t.unleashCta} <ArrowUpRight size={16} />
                  </MagneticBtn>
                </div>
              </div>
            </Reveal>

            {/* Text */}
            <Reveal delay={0.1}>
              <div className="py-6">
                <h2 className="text-[2.5rem] sm:text-[3.5rem] font-extrabold text-[#0F172A] leading-[0.95] tracking-tight" style={{ fontFamily: display }}>
                  {t.unleashTitle}
                </h2>
                <div className="w-16 h-1 bg-[#0EA5E9] rounded-full mt-6 mb-6" />
                <p className="text-slate-600 text-lg leading-relaxed mb-6">
                  {t.unleashSub}
                </p>
                <p className="text-sm text-slate-400 leading-relaxed mb-8">
                  {isRTL
                    ? "تجربة صوتية فريدة تجمع بين السفر والذكاء الاصطناعي. كل رحلة تبدأ بصوت."
                    : "Une expérience sonore unique alliant voyage et intelligence artificielle. Chaque voyage commence par un son."}
                </p>
                <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400">
                  <span className="px-3 py-1 rounded-full glass text-[#0284C7] font-bold">Voyage</span>
                  <span className="px-3 py-1 rounded-full glass text-[#0284C7] font-bold">Son</span>
                  <span className="px-3 py-1 rounded-full glass text-[#0284C7] font-bold">Liberté</span>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#BAE6FD]" style={{ background: "linear-gradient(180deg, #F0F9FF 0%, #E0F2FE 100%)" }}>
        <div className="mx-auto max-w-[1280px] px-6 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg">
                <LogoSVG />
              </div>
              <div>
                <div className="font-extrabold text-xl text-[#0F172A]" style={{ fontFamily: display }}>UpShuyo</div>
                <div className="text-[10px] font-mono text-slate-400">{t.footerCopy}</div>
              </div>
            </div>
            <div className="flex gap-6 text-[13px] font-medium text-slate-500">
              <a href="#hero" className="hover:text-[#0284C7] transition">{t.navAbout}</a>
              <a href="#sounds" className="hover:text-[#0284C7] transition">{t.navTour}</a>
              <a href="#contact" className="hover:text-[#0284C7] transition">{t.navContact}</a>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-[#BAE6FD]/60 text-center text-[11px] text-slate-400 font-mono">
            © {new Date().getFullYear()} UpShuyo — {isRTL ? "صنع في الجزائر بالحب." : "Fait avec soin en Algérie."}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
