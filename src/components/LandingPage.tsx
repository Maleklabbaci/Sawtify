import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  ArrowUpRight, Play, Plus, Menu, X,
  Check, Star, Headphones, ShoppingBag, Clapperboard, Mic2, Phone, ShieldCheck, Gift, Pause
} from "lucide-react";
import { motion, AnimatePresence, useScroll, useInView } from "framer-motion";

interface LandingPageProps {
  onLoginClick: () => void;
  onSigninClick: () => void;
  language: "fr" | "ar";
  setLanguage: (lang: "fr" | "ar") => void;
}

const NEON = "#d4ff00";
const DARK = "#050505";
const PAPER = "#FFFFFF";
const LOGO = "https://i.ibb.co/nqShkPNP/68126702-75e5-4de6-9b53-e51800b05e4a.jpg";
const INTRO_AUDIO_URL = "https://res.cloudinary.com/gz65ybug/video/upload/v1788998622/discution.wav";

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&family=Cairo:wght@400;700;900&display=swap');
    
    * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
    html { scroll-behavior: smooth; -webkit-font-smoothing: antialiased; }
    body { overflow-x: hidden; background: ${DARK}; color: ${PAPER}; }

    /* PADEL THEME STYLES */
    .text-outline {
      color: transparent;
      -webkit-text-stroke: 1px rgba(255, 255, 255, 0.4);
    }
    .text-outline-neon {
      color: transparent;
      -webkit-text-stroke: 1px ${NEON};
    }
    
    .glass-card {
      background: rgba(25, 25, 25, 0.4);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.05);
    }
    .glass-card:hover {
      border-color: rgba(212, 255, 0, 0.3);
    }

    .bg-grid {
      background-size: 40px 40px;
      background-image: linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
    }

    @keyframes wave { 0%, 100% { transform: scaleY(0.28); } 50% { transform: scaleY(1); } }
    .wave-bar { animation: wave 1.3s ease-in-out infinite; transform-origin: bottom; }

    ::selection { background: ${NEON}; color: ${DARK}; }
    ::-webkit-scrollbar { width: 8px; }
    ::-webkit-scrollbar-track { background: ${DARK}; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }
    ::-webkit-scrollbar-thumb:hover { background: ${NEON}; }

    .caret { display: inline-block; width: 2px; height: 1em; margin-inline-start: 2px; background: ${NEON}; animation: blink 1s step-end infinite; vertical-align: -2px; }
    @keyframes blink { 50% { opacity: 0; } }
  `}</style>
);

const Logo = ({ size = 40, showText = true }: { size?: number; showText?: boolean }) => {
  const [imgError, setImgError] = useState(false);
  return (
    <div className="flex items-center gap-3 select-none">
      <div className="rounded-xl overflow-hidden shrink-0 relative border border-white/10" style={{ width: size, height: size }}>
        {!imgError ? (
          <img src={LOGO} alt="Sawtify" width={size} height={size} decoding="async" onError={() => setImgError(true)} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-white/10 flex items-center justify-center font-black" style={{ fontSize: size * 0.5 }}>S</div>
        )}
      </div>
      {showText && <span className="font-black text-[22px] tracking-tighter uppercase text-white">Sawtify</span>}
    </div>
  );
};

const SlideUp = ({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 40 }} animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }} transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }} className={className}>
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

// --- DATA ---
type VoiceCard = {
  id: string; nameFr: string; nameAr: string; tagFr: string; tagAr: string; location: string;
  gender: "male" | "female"; category: "commercial" | "narrative" | "social" | "formal";
  rating?: number; reviews?: number; color: string; sampleFr: string; sampleAr: string;
};

const VOICES: VoiceCard[] = [
  { id: "amine", nameFr: "Amine", nameAr: "أمين", tagFr: "Commercial", tagAr: "تجاري", location: "Alger, DZ", gender: "male", category: "commercial", rating: 4.9, reviews: 234, color: NEON, sampleFr: "Salam 3likoum khawti! M3a Sawtify, nassek yewli sawt tabi3i, wadeh, wahli l i3lanat.", sampleAr: "سلام عليكم خاوتي! مع صوتيفي، نصوصكم تولي صوت طبيعي، واضح، جاهز للإعلانات." },
  { id: "yasmine", nameFr: "Yasmine", nameAr: "ياسمين", tagFr: "Publicitaire", tagAr: "إعلاني", location: "Oran, DZ", gender: "female", category: "commercial", rating: 4.8, reviews: 189, color: "#00E5FF", sampleFr: "Marhba bikom kamlin! Tawsil 58 wilaya, payment 3and l istlam. Tleb dorka.", sampleAr: "مرحبا بيكم كاملين! التوصيل لـ 58 ولاية والدفع عند الاستلام. اطلب درك." },
  { id: "khalid", nameFr: "Khalid", nameAr: "خالد", tagFr: "Documentaire", tagAr: "وثائقي", location: "Constantine, DZ", gender: "male", category: "formal", rating: 5.0, reviews: 312, color: "#FF0055", sampleFr: "Nqeddmlkom lyom notq mawzoun w dqi9, l watha2iqiyat w contenu rassmi.", sampleAr: "نقدّم ليكم اليوم نطق موزون ودقيق، للوثائقيات والمحتوى الرسمي." },
  { id: "layla", nameFr: "Layla", nameAr: "ليلى", tagFr: "Social Media", tagAr: "سوشيال", location: "Annaba, DZ", gender: "female", category: "social", rating: 4.9, reviews: 156, color: "#B000FF", sampleFr: "Salut l'équipe ! Une voix vive, parfaite pour Reels, TikTok et stories.", sampleAr: "واش راكم ليكيب؟ صوت حيوي، هايل للريلز وتيك توك والستوريز." },
  { id: "yacine", nameFr: "Yacine", nameAr: "ياسين", tagFr: "Éducatif", tagAr: "تعليمي", location: "Sétif, DZ", gender: "male", category: "narrative", rating: 4.7, reviews: 98, color: "#FFAA00", sampleFr: "Dans cette leçon, on avance pas à pas. Une voix claire, pour e-learning et tutos.", sampleAr: "في هاد الدرس، نمشيو خطوة بخطوة. صوت واضح للشروحات والدروس." },
  { id: "nadia", nameFr: "Nadia", nameAr: "نادية", tagFr: "Podcast", tagAr: "بودكاست", location: "Tlemcen, DZ", gender: "female", category: "narrative", rating: 4.9, reviews: 267, color: NEON, sampleFr: "Bienvenue dans cet épisode. Une voix chaleureuse, pour podcasts et YouTube.", sampleAr: "مرحبا بيكم في هاد الحلقة. صوت دافئ للبودكاست ويوتيوب." },
];

const LANDING_VOICES = VOICES.slice(0, 3);

const COST_STEPS = [
  { sec: 60, pts: 20, labelFr: "0–60 s", labelAr: "0–60 ثا" },
  { sec: 120, pts: 30, labelFr: "2 min", labelAr: "2 دق" },
  { sec: 180, pts: 40, labelFr: "3 min", labelAr: "3 دق" },
  { sec: 240, pts: 50, labelFr: "4 min", labelAr: "4 دق" },
];

const Waveform = ({ color, playing, bars = 36 }: { color: string; playing: boolean; bars?: number }) => (
  <div className="flex items-end justify-center gap-[3px] h-20 w-full" dir="ltr" aria-hidden>
    {Array.from({ length: bars }).map((_, i) => {
      const h = 18 + Math.abs(Math.sin(i * 0.55) * Math.cos(i * 0.31)) * 82;
      return (
        <span key={i} className={`flex-1 origin-bottom ${playing ? "wave-bar" : ""}`}
          style={{ height: `${h}%`, maxWidth: 3, background: color, opacity: playing ? 1 : 0.3, animationDelay: `${(i % 10) * 0.1}s` }}
        />
      );
    })}
  </div>
);

export const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick, onSigninClick, language, setLanguage }) => {
  const isRTL = language === "ar";
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [featuredId, setFeaturedId] = useState("amine");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [listenVoice, setListenVoice] = useState<VoiceCard | null>(null);
  const [costIdx, setCostIdx] = useState(0);
  const [holdVoice, setHoldVoice] = useState(false);
  const scrolled = useScrolled();

  const introAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isIntroPlaying, setIsIntroPlaying] = useState(false);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    document.title = isRTL ? "صوتيفي — صوت طبيعي بالدارجة" : "Sawtify — Voix naturelle en darija";
  }, [language, isRTL]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false); setListenVoice(null); setPlayingId(null);
        if (introAudioRef.current) { introAudioRef.current.pause(); setIsIntroPlaying(false); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // AUDIO AUTO-PLAY LOGIC
  useEffect(() => {
    const audio = new Audio(INTRO_AUDIO_URL);
    audio.preload = "auto";
    introAudioRef.current = audio;
    audio.onended = () => setIsIntroPlaying(false);

    const handleFirstInteraction = () => {
      audio.play().then(() => setIsIntroPlaying(true)).catch(() => {});
      cleanupListeners();
    };

    const cleanupListeners = () => {
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("scroll", handleFirstInteraction);
      window.removeEventListener("touchstart", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
    };

    window.addEventListener("click", handleFirstInteraction, { passive: true, once: true });
    window.addEventListener("scroll", handleFirstInteraction, { passive: true, once: true });
    window.addEventListener("touchstart", handleFirstInteraction, { passive: true, once: true });
    window.addEventListener("keydown", handleFirstInteraction, { passive: true, once: true });

    return () => { cleanupListeners(); audio.pause(); };
  }, []);

  const stopIntroAudio = () => {
    if (introAudioRef.current && !introAudioRef.current.paused) {
      introAudioRef.current.pause(); setIsIntroPlaying(false);
    }
  };

  const openListen = (voice: VoiceCard) => {
    stopIntroAudio(); setFeaturedId(voice.id); setPlayingId(voice.id); setListenVoice(voice);
  };

  const handleToggleIntroAudio = () => {
    if (!introAudioRef.current) return;
    if (isIntroPlaying) {
      introAudioRef.current.pause(); setIsIntroPlaying(false);
    } else {
      setPlayingId(null);
      introAudioRef.current.play().then(() => setIsIntroPlaying(true)).catch(console.log);
    }
  };

  const smoothTo = useCallback((href: string) => {
    setMenuOpen(false);
    const el = document.querySelector(href);
    if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" });
  }, []);

  const t = {
    navVoices: isRTL ? "الأصوات" : "Voix",
    navHow: isRTL ? "كيف يعمل" : "Process",
    navPricing: isRTL ? "الأسعار" : "Tarifs",
    signin: isRTL ? "دخول" : "Connexion",
    start: isRTL ? "ابدأ الآن" : "Réserver",
    hero1: isRTL ? "صوت." : "Motion.",
    hero2: isRTL ? "طبيعي." : "Discipline.",
    hero3: isRTL ? "تأثير." : "Result.",
    heroSub1: isRTL ? "الدارجة بلهجة مثالية." : "Générez avec l'accent parfait.",
    heroSub2: isRTL ? "ادخل الاستوديو واصنع صوتك." : "Entrez dans le studio. Réclamez votre son.",
    heroSub3: isRTL ? "تحكم في كل نبرة. تغلب على الحدود." : "Maîtrisez chaque intonation. Repoussez les limites.",
    bookNow: isRTL ? "ادخل الاستوديو" : "Entrer en Studio",
    listenDemo: isRTL ? "اسمع" : "Écouter",
    voicesTitle: isRTL ? "تكلم كالمحترفين" : "Générez comme un pro",
    metricsTitle: isRTL ? "أرقام لا تكذب" : "La force des chiffres",
    costTitle: isRTL ? "احسب استثمارك" : "Calculez l'impact",
    faqTitle: isRTL ? "الأسئلة الشائعة" : "Questions Fréquentes",
    ctaHuge: isRTL ? "العب كالبطل" : "Générez comme un champion",
    pts: isRTL ? "نقطة" : "pts",
  };

  const display = isRTL ? "'Cairo', sans-serif" : "'Inter', sans-serif";
  const featured = VOICES.find((v) => v.id === featuredId) || VOICES[0];
  const sampleFull = isRTL ? featured.sampleAr : featured.sampleFr;
  const [typed, setTyped] = useState("");

  useEffect(() => {
    setTyped("");
    const cutAt = Math.max(32, Math.floor(sampleFull.length * 0.44));
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      if (i >= cutAt) { setTyped(sampleFull.slice(0, cutAt).trimEnd() + "…"); window.clearInterval(id); } 
      else { setTyped(sampleFull.slice(0, i)); }
    }, 22);
    return () => window.clearInterval(id);
  }, [featured.id, sampleFull]);

  useEffect(() => {
    if (listenVoice || holdVoice || isIntroPlaying) return;
    const id = window.setInterval(() => {
      setFeaturedId((prev) => {
        const i = LANDING_VOICES.findIndex((v) => v.id === prev);
        return LANDING_VOICES[(i + 1) % LANDING_VOICES.length].id;
      });
    }, 5200);
    return () => window.clearInterval(id);
  }, [listenVoice, holdVoice, isIntroPlaying]);

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen relative font-sans">
      <GlobalStyles />

      {/* HEADER */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "bg-black/80 backdrop-blur-xl border-b border-white/10" : "bg-transparent"}`}>
        <div className="mx-auto max-w-[1400px] px-6 h-20 flex items-center justify-between">
          <a href="#home" onClick={(e) => { e.preventDefault(); smoothTo("#home"); }} className="flex items-center gap-4">
            <Logo size={42} showText={false} />
            <div className="hidden md:flex gap-1.5">
              <span className="w-1.5 h-1.5 bg-[#d4ff00] rounded-full animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/50">STUDIO V2.1</span>
            </div>
          </a>
          
          <nav className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-10 text-[11px] font-black uppercase tracking-[0.2em] text-white/70">
            {[
              { href: "#voices", label: t.navVoices },
              { href: "#process", label: t.navHow },
              { href: "#pricing", label: t.navPricing },
            ].map((l) => (
              <a key={l.href} href={l.href} onClick={(e) => { e.preventDefault(); smoothTo(l.href); }} className="hover:text-[#d4ff00] transition-colors">{l.label}</a>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <button onClick={() => setLanguage(language === "fr" ? "ar" : "fr")} className="text-[10px] font-black tracking-widest uppercase text-white/50 hover:text-[#d4ff00] transition">
              {isRTL ? "FR" : "AR"}
            </button>
            <button onClick={onLoginClick} className="hidden md:block text-[11px] font-black tracking-widest uppercase hover:text-[#d4ff00] transition">
              {t.signin}
            </button>
            <button onClick={onSigninClick} className="h-10 px-5 bg-[#d4ff00] text-black text-[11px] font-black tracking-widest uppercase hover:bg-white transition flex items-center gap-2">
              {t.start} <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section id="home" className="relative min-h-[100svh] w-full flex flex-col justify-center pt-24 pb-12 overflow-hidden bg-grid">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,255,0,0.08)_0%,transparent_60%)]" />
        
        <div className="relative z-10 mx-auto w-full max-w-[1400px] px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-0 items-center justify-between mb-16">
            <SlideUp>
              <h1 className="text-[12vw] lg:text-[7vw] font-black leading-[0.85] tracking-tighter uppercase">{t.hero1}</h1>
              <p className="text-[10px] uppercase tracking-widest mt-4 w-48 text-white/50">{t.heroSub1}</p>
            </SlideUp>
            
            <SlideUp delay={0.1} className="lg:text-center">
              <h1 className="text-[12vw] lg:text-[7vw] font-black leading-[0.85] tracking-tighter uppercase text-[#d4ff00]">{t.hero2}</h1>
              <p className="text-[10px] uppercase tracking-widest mt-4 lg:mx-auto w-48 text-white/50">{t.heroSub2}</p>
            </SlideUp>

            <SlideUp delay={0.2} className="lg:text-end">
              <h1 className="text-[12vw] lg:text-[7vw] font-black leading-[0.85] tracking-tighter uppercase text-outline">{t.hero3}</h1>
              <p className="text-[10px] uppercase tracking-widest mt-4 lg:ms-auto w-48 text-white/50">{t.heroSub3}</p>
            </SlideUp>
          </div>

          <div className="flex flex-col lg:flex-row justify-between items-end gap-10">
            {/* AUDIO PLAYER (Glassmorphism) */}
            <SlideUp delay={0.3} className="w-full lg:w-96">
              <div className="glass-card p-6 rounded-none border-l-4" style={{ borderLeftColor: featured.color }}>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-[#d4ff00] mb-1">
                      {isIntroPlaying ? "Live Intro" : "Studio"}
                    </div>
                    <h3 className="text-2xl font-black uppercase tracking-tighter">
                      {isIntroPlaying ? "Sawtify V2" : (isRTL ? featured.nameAr : featured.nameFr)}
                    </h3>
                  </div>
                  <button onClick={handleToggleIntroAudio} className="w-12 h-12 bg-white/5 hover:bg-[#d4ff00] hover:text-black flex items-center justify-center transition border border-white/10">
                    {isIntroPlaying ? <Pause className="fill-current w-5 h-5" /> : <Play className="fill-current w-5 h-5" />}
                  </button>
                </div>
                
                <Waveform color={isIntroPlaying ? NEON : featured.color} playing={isIntroPlaying} bars={30} />
                
                <p className="mt-6 text-sm text-white/70 min-h-[3rem]">
                  {isIntroPlaying 
                    ? (isRTL ? "أنت تستمع إلى التقديم الصوتي للمنصة..." : "Vous écoutez l'audio de présentation...")
                    : `“${typed}”`
                  }
                </p>

                <div className="mt-6 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {LANDING_VOICES.map((v) => {
                    const isActive = v.id === featured.id && !isIntroPlaying;
                    return (
                      <button key={v.id} onClick={() => { setFeaturedId(v.id); setPlayingId(null); setHoldVoice(true); stopIntroAudio(); }}
                        className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest border transition ${isActive ? "bg-white text-black border-white" : "bg-transparent text-white/50 border-white/10 hover:border-[#d4ff00]"}`}>
                        {isRTL ? v.nameAr : v.nameFr}
                      </button>
                    );
                  })}
                </div>
              </div>
            </SlideUp>

            {/* BIG CTA */}
            <SlideUp delay={0.4}>
              <div onClick={() => { stopIntroAudio(); onSigninClick(); }} className="flex flex-col items-start lg:items-end gap-2 group cursor-pointer">
                <div className="flex items-center gap-4 text-3xl lg:text-5xl font-black uppercase tracking-tighter text-[#d4ff00]">
                  {t.bookNow}
                  <ArrowUpRight className="w-10 h-10 group-hover:rotate-45 transition-transform duration-300" strokeWidth={3} />
                </div>
                <div className="h-1 w-full bg-[#d4ff00] origin-left lg:origin-right group-hover:scale-x-0 transition-transform duration-500" />
                <p className="text-[10px] font-black tracking-[0.2em] uppercase text-white/40 mt-2">
                  {isRTL ? "50 نقطة ترحيبية مجانية" : "50 points offerts à l'inscription"}
                </p>
              </div>
            </SlideUp>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <div className="w-full bg-[#d4ff00] text-black py-3 overflow-hidden flex items-center">
        <div className="flex whitespace-nowrap animate-[marquee_20s_linear_infinite]">
          {Array(10).fill(isRTL ? "صوتيفي ستوديو • " : "SAWTIFY STUDIO • ").map((text, i) => (
            <span key={i} className="text-[11px] font-black tracking-[0.2em] uppercase mx-4">{text}</span>
          ))}
        </div>
      </div>

      {/* VOICES LOUPE (TRAIN LIKE A PRO) */}
      <section id="voices" className="py-24 px-6 max-w-[1400px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end border-b border-white/10 pb-8 mb-16">
          <div>
            <p className="text-[10px] font-black tracking-[0.2em] uppercase text-[#d4ff00] mb-3">// STUDIO</p>
            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">{t.voicesTitle}</h2>
          </div>
          <button onClick={onSigninClick} className="mt-6 md:mt-0 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] hover:text-[#d4ff00] transition">
            {isRTL ? "اسمع كل الأصوات" : "Voir tout le roster"} <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {LANDING_VOICES.map((v, i) => (
            <SlideUp key={v.id} delay={i * 0.1}>
              <div className="relative h-[480px] bg-[#111] overflow-hidden group border border-white/5 hover:border-[#d4ff00]/50 transition-colors">
                {/* Abstract Tech Background for Voice */}
                <div className="absolute inset-0 bg-grid opacity-20 group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent z-10" />
                
                <div className="absolute inset-0 p-8 flex flex-col justify-between z-20">
                  <div className="flex justify-between items-start">
                    <div className="w-8 h-8 grid grid-cols-3 gap-1">
                      {Array(9).fill("").map((_, i) => <div key={i} className="rounded-full opacity-50" style={{ background: v.color }}></div>)}
                    </div>
                    <button onClick={() => openListen(v)} className="w-12 h-12 bg-white text-black hover:bg-[#d4ff00] flex items-center justify-center transition">
                      {playingId === v.id ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                    </button>
                  </div>

                  {/* Player Visual */}
                  <div className="my-auto opacity-50 group-hover:opacity-100 transition-opacity">
                    <Waveform color={v.color} playing={playingId === v.id || featuredId === v.id} bars={24} />
                  </div>

                  <div className="flex justify-between items-end">
                    <div>
                      <h3 className="text-5xl lg:text-7xl font-black uppercase tracking-tighter" style={{ color: v.color }}>{isRTL ? v.nameAr : v.nameFr}</h3>
                      <p className="text-[11px] font-black tracking-[0.2em] uppercase mt-2 text-white/50">{isRTL ? v.tagAr : v.tagFr}</p>
                    </div>
                    <div className="text-end hidden sm:block">
                      <div className="text-3xl font-black">{v.rating}</div>
                      <div className="text-[9px] uppercase tracking-widest text-[#d4ff00]">Rating</div>
                      <div className="text-xl font-black mt-2">{v.reviews}+</div>
                      <div className="text-[9px] uppercase tracking-widest text-white/50">Projets</div>
                    </div>
                  </div>
                </div>
              </div>
            </SlideUp>
          ))}
        </div>
      </section>

      {/* HUGE TEXT BANNER */}
      <section className="py-24 border-y border-white/5 bg-grid text-center overflow-hidden">
        <h2 className="text-[9vw] font-black uppercase tracking-tighter text-outline whitespace-nowrap">
          {t.ctaHuge}
        </h2>
      </section>

      {/* PRICING CALCULATOR */}
      <section id="pricing" className="py-24 px-6 max-w-[1400px] mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <SlideUp>
              <p className="text-[10px] font-black tracking-[0.2em] uppercase text-[#d4ff00] mb-3">// {t.navPricing}</p>
              <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-6">{t.costTitle}</h2>
              <p className="text-sm text-white/60 mb-8 max-w-md">
                {isRTL 
                  ? "20 نقطة لأول 60 ثانية، ثم +10 لكل دقيقة إضافية. النقاط صالحة مدى الحياة." 
                  : "20 points pour les 60 premières secondes, puis +10 par minute. Points valables à vie."}
              </p>
              <ul className="space-y-4 text-[11px] font-black tracking-[0.1em] uppercase text-white/70">
                <li className="flex items-center gap-3"><Check className="text-[#d4ff00] w-4 h-4" /> 24 kHz Quality</li>
                <li className="flex items-center gap-3"><Check className="text-[#d4ff00] w-4 h-4" /> Usage Commercial Inclus</li>
                <li className="flex items-center gap-3"><Check className="text-[#d4ff00] w-4 h-4" /> Paiement Edahabia / CIB</li>
              </ul>
            </SlideUp>
          </div>
          
          <SlideUp delay={0.2}>
            <div className="glass-card p-10 border-t-4 border-t-[#d4ff00]">
              <div className="text-[10px] font-black tracking-widest uppercase text-white/40 mb-8">{isRTL ? "اختر المدة" : "Sélectionnez la durée"}</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
                {COST_STEPS.map((s, i) => (
                  <button key={s.sec} onClick={() => setCostIdx(i)}
                    className={`py-4 text-[11px] font-black uppercase tracking-widest border transition ${costIdx === i ? "bg-[#d4ff00] text-black border-[#d4ff00]" : "bg-transparent text-white/50 border-white/10 hover:border-white"}`}>
                    {isRTL ? s.labelAr : s.labelFr}
                  </button>
                ))}
              </div>
              <div className="flex items-end justify-between gap-4 border-t border-white/10 pt-8">
                <div>
                  <div className="text-[10px] font-black tracking-widest uppercase text-white/40 mb-2">Total</div>
                  <div className="text-6xl font-black text-[#d4ff00] leading-none">
                    {COST_STEPS[costIdx].pts} <span className="text-xl text-white/50">{t.pts}</span>
                  </div>
                </div>
                <button onClick={onSigninClick} className="w-16 h-16 bg-white hover:bg-[#d4ff00] text-black flex items-center justify-center transition">
                  <ArrowUpRight className="w-8 h-8" />
                </button>
              </div>
            </div>
          </SlideUp>
        </div>
      </section>

      {/* FOOTER / BOTTOM */}
      <footer className="border-t border-white/10 bg-[#020202] pt-20 pb-10 px-6 text-center lg:text-left">
        <div className="max-w-[1400px] mx-auto grid lg:grid-cols-4 gap-12 mb-16">
          <div className="lg:col-span-2 flex flex-col items-center lg:items-start">
            <Logo size={50} />
            <p className="mt-6 text-sm text-white/40 max-w-sm">
              {isRTL ? "استوديو صوتي متطور. الدارجة كما لم تسمعها من قبل." : "Studio vocal avancé. La Darija comme vous ne l'avez jamais entendue."}
            </p>
          </div>
          <div>
            <div className="text-[10px] font-black tracking-widest uppercase text-white/30 mb-6">{isRTL ? "الروابط" : "Navigation"}</div>
            <div className="flex flex-col gap-4 text-[11px] font-black tracking-widest uppercase text-white/60">
              <a href="#voices" className="hover:text-[#d4ff00]">{t.navVoices}</a>
              <a href="#pricing" className="hover:text-[#d4ff00]">{t.navPricing}</a>
            </div>
          </div>
          <div>
            <div className="text-[10px] font-black tracking-widest uppercase text-white/30 mb-6">Contact</div>
            <a href="mailto:contact@sawtify.dz" className="text-lg font-black hover:text-[#d4ff00]">hello@sawtify.dz</a>
            <div className="mt-6 flex flex-wrap gap-2 justify-center lg:justify-start">
              {["Edahabia", "CIB", "SATIM"].map(p => (
                <span key={p} className="px-3 py-1 bg-white/5 text-[9px] font-black tracking-widest uppercase">{p}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="max-w-[1400px] mx-auto pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] font-black tracking-widest uppercase text-white/30">
          <span>© 2026 SAWTIFY STUDIO</span>
          <div className="flex gap-6">
            <button className="hover:text-white">CGU</button>
            <button className="hover:text-white">PRIVACY</button>
          </div>
        </div>
      </footer>

      {/* LISTEN MODAL (Glass Dark) */}
      <AnimatePresence>
        {listenVoice && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm" onClick={() => { setListenVoice(null); setPlayingId(null); }} />
            <motion.div initial={{ opacity: 0, y: 24, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.95 }}
              className="fixed z-[71] inset-x-4 top-[15%] sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-xl glass-card p-1 border-t-4" style={{ borderTopColor: listenVoice.color }}>
              <div className="bg-[#0a0a0a] p-8">
                <div className="flex items-start justify-between gap-3 mb-8">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#d4ff00] mb-2">Session Audio</p>
                    <h3 className="text-4xl font-black uppercase tracking-tighter" style={{ color: listenVoice.color }}>{isRTL ? listenVoice.nameAr : listenVoice.nameFr}</h3>
                  </div>
                  <button onClick={() => { setListenVoice(null); setPlayingId(null); }} className="w-10 h-10 bg-white/10 hover:bg-white hover:text-black flex items-center justify-center transition">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="bg-white/5 p-6 mb-6">
                  <Waveform color={listenVoice.color} playing bars={40} />
                </div>
                
                <p className="text-sm leading-relaxed text-white/70 mb-8 italic">
                  “{(isRTL ? listenVoice.sampleAr : listenVoice.sampleFr)}”
                </p>
                
                <button onClick={() => { stopIntroAudio(); onSigninClick(); }} className="w-full py-5 text-[11px] font-black uppercase tracking-[0.2em] text-black hover:bg-white transition" style={{ background: listenVoice.color }}>
                  {isRTL ? "اختر هذا الصوت" : "Sélectionner cette voix"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LandingPage;
