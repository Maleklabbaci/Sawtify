import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  ArrowRight, ArrowLeft, Play, Pause, Menu, X,
  Check, Star, Sparkles, Headphones, Mic2, Clapperboard, Globe
} from "lucide-react";
import { motion, AnimatePresence, useInView } from "framer-motion";

interface LandingPageProps {
  onLoginClick: () => void;
  onSigninClick: () => void;
  language: "fr" | "ar";
  setLanguage: (lang: "fr" | "ar") => void;
}

const ACCENT = "#6E5FE8";
const ACCENT_GLOW = "rgba(110, 95, 232, 0.4)";
const DARK = "#000000";
const SURFACE = "#0A0A0A";
const LOGO = "https://i.ibb.co/nqShkPNP/68126702-75e5-4de6-9b53-e51800b05e4a.jpg";
const INTRO_AUDIO_URL = "https://res.cloudinary.com/gz65ybug/video/upload/v1788998622/discution.wav";

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Cairo:wght@400;600;700;800&display=swap');
    
    * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
    html { scroll-behavior: smooth; background: ${DARK}; }
    body { overflow-x: hidden; background: ${DARK}; color: #FFFFFF; }

    /* AI Vercel Style Gradients & Text */
    .text-gradient {
      background: linear-gradient(180deg, #FFFFFF 0%, rgba(255, 255, 255, 0.5) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .text-gradient-accent {
      background: linear-gradient(90deg, #6E5FE8 0%, #00E5FF 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    /* Glows & Glass */
    .glass-pill {
      background: rgba(255, 255, 255, 0.03);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .hero-glow {
      position: absolute;
      width: 600px;
      height: 600px;
      background: radial-gradient(circle, ${ACCENT_GLOW} 0%, rgba(0,0,0,0) 70%);
      top: -200px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 0;
      pointer-events: none;
    }

    /* Waveform Animation */
    @keyframes wave { 0%, 100% { transform: scaleY(0.2); } 50% { transform: scaleY(1); } }
    .wave-bar { animation: wave 1.2s ease-in-out infinite; transform-origin: bottom; }

    ::-webkit-scrollbar { width: 8px; }
    ::-webkit-scrollbar-track { background: ${DARK}; }
    ::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: ${ACCENT}; }

    .card-ai {
      background: linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%);
      border: 1px solid rgba(255, 255, 255, 0.05);
      transition: all 0.3s ease;
    }
    .card-ai:hover {
      border-color: rgba(110, 95, 232, 0.4);
      box-shadow: 0 0 30px rgba(110, 95, 232, 0.1);
    }
  `}</style>
);

const Logo = ({ size = 32 }: { size?: number }) => (
  <div className="flex items-center gap-2 select-none z-50">
    <div className="rounded-lg overflow-hidden shrink-0 relative shadow-[0_0_15px_rgba(110,95,232,0.4)]" style={{ width: size, height: size }}>
      <img src={LOGO} alt="Sawtify" width={size} height={size} className="w-full h-full object-cover" />
    </div>
    <span className="font-bold text-lg tracking-tight text-white">Sawtify</span>
  </div>
);

const SlideUp = ({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }} transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }} className={className}>
      {children}
    </motion.div>
  );
};

const Waveform = ({ playing, bars = 40 }: { playing: boolean; bars?: number }) => (
  <div className="flex items-end justify-center gap-1 h-12 w-full" dir="ltr">
    {Array.from({ length: bars }).map((_, i) => (
      <span key={i} className={`w-1 rounded-full origin-bottom ${playing ? "wave-bar" : ""}`}
        style={{
          height: `${15 + Math.abs(Math.sin(i * 0.5) * 85)}%`,
          background: playing ? `linear-gradient(180deg, #00E5FF 0%, #6E5FE8 100%)` : "rgba(255,255,255,0.2)",
          animationDelay: `${(i % 10) * 0.1}s`,
        }}
      />
    ))}
  </div>
);

// DATA
const VOICES = [
  { id: "amine", nameFr: "Amine", nameAr: "أمين", tagFr: "Commercial", tagAr: "تجاري", gender: "male", rating: 4.9, color: "#6E5FE8" },
  { id: "yasmine", nameFr: "Yasmine", nameAr: "ياسمين", tagFr: "Publicitaire", tagAr: "إعلاني", gender: "female", rating: 4.8, color: "#00E5FF" },
  { id: "khalid", nameFr: "Khalid", nameAr: "خالد", tagFr: "Documentaire", tagAr: "وثائقي", gender: "male", rating: 5.0, color: "#6E5FE8" },
  { id: "layla", nameFr: "Layla", nameAr: "ليلى", tagFr: "Social Media", tagAr: "سوشيال", gender: "female", rating: 4.9, color: "#00E5FF" },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick, onSigninClick, language, setLanguage }) => {
  const isRTL = language === "ar";
  const [menuOpen, setMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  
  // Audio State
  const introAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isIntroPlaying, setIsIntroPlaying] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    document.title = isRTL ? "Sawtify — استوديو الدارجة بالذكاء الاصطناعي" : "Sawtify — Studio IA en Darija";
    
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [language, isRTL]);

  // AUDIO AUTO-PLAY TRIGGER
  useEffect(() => {
    const audio = new Audio(INTRO_AUDIO_URL);
    audio.preload = "auto";
    introAudioRef.current = audio;
    audio.onended = () => setIsIntroPlaying(false);

    const handleInteraction = () => {
      audio.play().then(() => setIsIntroPlaying(true)).catch(() => {});
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("scroll", handleInteraction);
      window.removeEventListener("touchstart", handleInteraction);
    };

    window.addEventListener("click", handleInteraction, { once: true });
    window.addEventListener("scroll", handleInteraction, { once: true });
    window.addEventListener("touchstart", handleInteraction, { once: true });

    return () => {
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("scroll", handleInteraction);
      audio.pause();
    };
  }, []);

  const toggleIntroAudio = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!introAudioRef.current) return;
    if (isIntroPlaying) {
      introAudioRef.current.pause();
      setIsIntroPlaying(false);
    } else {
      setPlayingId(null);
      introAudioRef.current.play().then(() => setIsIntroPlaying(true));
    }
  };

  const t = {
    heroBadge: isRTL ? "صوتيفي ستوديو 2.1 متاح الآن" : "Sawtify Studio 2.1 est en ligne",
    heroTitle1: isRTL ? "أعطِ لنصوصك" : "Donnez à vos textes",
    heroTitle2: isRTL ? "صوتًا لا يُنسى." : "une voix humaine.",
    heroSub: isRTL 
      ? "قم بتحويل نصوصك إلى تعليق صوتي بالدارجة الجزائرية بجودة استوديو احترافية باستخدام الذكاء الاصطناعي."
      : "Générez des voix off en Darija avec un naturel bluffant. La puissance de l'IA pour vos publicités et contenus.",
    btnStart: isRTL ? "ابدأ مجانًا" : "Commencer gratuitement",
    btnListen: isRTL ? "استمع للمقدمة" : "Écouter l'intro",
    feature1: isRTL ? "جودة 24kHz" : "Qualité 24kHz",
    feature2: isRTL ? "12 صوت مختلف" : "12 Voix Uniques",
    feature3: isRTL ? "دفع بالدينار" : "Paiement en DZD",
    voicesTitle: isRTL ? "مكتبة الأصوات" : "Le catalogue vocal",
    voicesSub: isRTL ? "اختر الصوت الذي يناسب علامتك التجارية." : "Trouvez le timbre parfait pour votre marque.",
    priceTitle: isRTL ? "تسعير بسيط وشفاف" : "Une tarification simple",
    priceSub: isRTL ? "نقاط صالحة مدى الحياة. تدفع فقط ما تستخدمه." : "Des points valables à vie. Payez uniquement ce que vous générez.",
  };

  const font = isRTL ? "'Cairo', sans-serif" : "'Inter', sans-serif";

  return (
    <div style={{ fontFamily: font }} className="relative bg-black min-h-screen selection:bg-[#6E5FE8] selection:text-white">
      <GlobalStyles />

      {/* HEADER (Floating Glass Pill) */}
      <header className="fixed top-6 inset-x-0 z-50 flex justify-center px-4">
        <div className={`transition-all duration-500 rounded-full flex items-center justify-between px-4 sm:px-6 py-3 w-full max-w-4xl ${isScrolled ? 'glass-pill shadow-2xl shadow-black/50' : 'bg-transparent'}`}>
          <Logo size={28} />
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-white/60">
            <a href="#voices" className="hover:text-white transition-colors">Studio</a>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </nav>

          <div className="flex items-center gap-3">
            <button onClick={() => setLanguage(isRTL ? "fr" : "ar")} className="text-xs font-bold text-white/50 hover:text-white w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition">
              {isRTL ? "FR" : "AR"}
            </button>
            <button onClick={onSigninClick} className="hidden sm:flex text-sm font-semibold bg-white text-black px-5 py-2 rounded-full hover:bg-gray-200 transition">
              {t.btnStart}
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-40 pb-20 md:pt-52 md:pb-32 px-4 overflow-hidden flex flex-col items-center text-center">
        <div className="hero-glow" />
        
        {/* Badge */}
        <SlideUp delay={0.1}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-8">
            <Sparkles className="w-4 h-4 text-[#6E5FE8]" />
            <span className="text-xs font-medium text-white/80">{t.heroBadge}</span>
          </div>
        </SlideUp>

        {/* Huge Titles */}
        <SlideUp delay={0.2} className="max-w-4xl mx-auto z-10">
          <h1 className="text-5xl md:text-7xl lg:text-[5.5rem] font-bold tracking-tight leading-[1.1] mb-2 text-gradient">
            {t.heroTitle1}
          </h1>
          <h1 className="text-5xl md:text-7xl lg:text-[5.5rem] font-bold tracking-tight leading-[1.1] text-gradient-accent pb-2">
            {t.heroTitle2}
          </h1>
        </SlideUp>

        <SlideUp delay={0.3} className="max-w-2xl mx-auto z-10 mt-6">
          <p className="text-lg md:text-xl text-white/50 leading-relaxed font-medium">
            {t.heroSub}
          </p>
        </SlideUp>

        {/* Central Audio Player (The Magic Capsule) */}
        <SlideUp delay={0.4} className="mt-12 w-full max-w-lg z-20">
          <div onClick={toggleIntroAudio} className="glass-pill p-4 rounded-3xl cursor-pointer group hover:bg-white/5 transition-all border border-white/10 hover:border-[#6E5FE8]/50 shadow-2xl relative overflow-hidden">
            {/* Soft gradient background inside the capsule */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#6E5FE8]/10 to-[#00E5FF]/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="relative flex flex-col gap-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg transition-transform ${isIntroPlaying ? "bg-[#6E5FE8] scale-110" : "bg-white/10 group-hover:bg-[#6E5FE8]"}`}>
                    {isIntroPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold">{t.btnListen}</p>
                    <p className="text-xs text-white/50">{isIntroPlaying ? (isRTL ? "جارٍ التشغيل..." : "Lecture en cours...") : (isRTL ? "انقر للتشغيل" : "Cliquez pour écouter")}</p>
                  </div>
                </div>
                <div className="text-xs font-mono text-[#00E5FF]">24 KHz</div>
              </div>
              
              <div className="bg-black/40 rounded-2xl p-2 px-4 border border-white/5">
                <Waveform playing={isIntroPlaying} bars={50} />
              </div>
            </div>
          </div>
        </SlideUp>

        {/* Action Buttons */}
        <SlideUp delay={0.5} className="mt-10 flex flex-col sm:flex-row items-center gap-4 z-10">
          <button onClick={onSigninClick} className="w-full sm:w-auto px-8 py-4 rounded-full bg-white text-black font-semibold text-sm hover:scale-105 transition-transform flex items-center justify-center gap-2">
            {t.btnStart} <ArrowRight className="w-4 h-4" />
          </button>
        </SlideUp>
        
        {/* Features Row */}
        <SlideUp delay={0.6} className="mt-16 flex items-center gap-8 text-sm font-medium text-white/40 flex-wrap justify-center z-10">
          <div className="flex items-center gap-2"><Check className="w-4 h-4 text-[#6E5FE8]" /> {t.feature1}</div>
          <div className="flex items-center gap-2"><Check className="w-4 h-4 text-[#6E5FE8]" /> {t.feature2}</div>
          <div className="flex items-center gap-2"><Check className="w-4 h-4 text-[#6E5FE8]" /> {t.feature3}</div>
        </SlideUp>
      </section>

      {/* BENTO GRID (Voices) */}
      <section id="voices" className="py-24 px-4 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-gradient">{t.voicesTitle}</h2>
            <p className="text-white/50 text-lg">{t.voicesSub}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {VOICES.map((v, i) => (
              <SlideUp key={v.id} delay={i * 0.1}>
                <div className="card-ai rounded-3xl p-6 h-full flex flex-col justify-between group">
                  <div className="flex items-start justify-between mb-8">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-[#6E5FE8]/50 transition-colors">
                      <Mic2 className="w-5 h-5 text-white/70 group-hover:text-[#6E5FE8]" />
                    </div>
                    <div className="flex items-center gap-1 text-xs font-medium bg-white/5 px-2 py-1 rounded-full border border-white/5">
                      <Star className="w-3 h-3 text-[#00E5FF] fill-[#00E5FF]" /> {v.rating}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-1">{isRTL ? v.nameAr : v.nameFr}</h3>
                    <p className="text-sm text-white/40 mb-6">{isRTL ? v.tagAr : v.tagFr}</p>
                    <button onClick={() => {
                      if(introAudioRef.current) introAudioRef.current.pause();
                      setIsIntroPlaying(false);
                      setPlayingId(playingId === v.id ? null : v.id);
                    }} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors text-sm font-medium">
                      {playingId === v.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      {isRTL ? "تجربة الصوت" : "Tester la voix"}
                    </button>
                  </div>
                </div>
              </SlideUp>
            ))}
          </div>

          <SlideUp delay={0.4} className="mt-8 text-center">
            <button onClick={onSigninClick} className="inline-flex items-center gap-2 text-sm font-medium text-white/50 hover:text-white transition-colors">
              {isRTL ? "استكشف 8 أصوات إضافية في الاستوديو" : "Découvrir 8 voix supplémentaires dans le studio"} <ArrowRight className="w-4 h-4" />
            </button>
          </SlideUp>
        </div>
      </section>

      {/* PRICING (Sleek Minimal) */}
      <section id="pricing" className="py-24 px-4 border-t border-white/5 relative">
        {/* Glow */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#6E5FE8]/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-gradient">{t.priceTitle}</h2>
            <p className="text-white/50 text-lg">{t.priceSub}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Starter Plan */}
            <SlideUp>
              <div className="card-ai rounded-3xl p-8 border border-white/10">
                <h3 className="text-xl font-medium text-white/70 mb-2">Starter</h3>
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-5xl font-bold">500</span>
                  <span className="text-white/40">DZD</span>
                </div>
                <div className="h-px w-full bg-white/5 mb-6" />
                <ul className="space-y-4 mb-8 text-sm text-white/60">
                  <li className="flex items-center gap-3"><Check className="w-4 h-4 text-white/30" /> 100 Points</li>
                  <li className="flex items-center gap-3"><Check className="w-4 h-4 text-white/30" /> Qualité Standard</li>
                  <li className="flex items-center gap-3"><Check className="w-4 h-4 text-white/30" /> Validité à vie</li>
                </ul>
                <button onClick={onSigninClick} className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition">
                  {isRTL ? "اختر الباقة" : "Choisir"}
                </button>
              </div>
            </SlideUp>

            {/* Pro Plan (Highlighted) */}
            <SlideUp delay={0.2}>
              <div className="card-ai rounded-3xl p-8 border border-[#6E5FE8]/40 relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#6E5FE8] to-[#00E5FF]" />
                <h3 className="text-xl font-medium text-[#00E5FF] mb-2">Pro</h3>
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-5xl font-bold">1 000</span>
                  <span className="text-white/40">DZD</span>
                </div>
                <div className="h-px w-full bg-white/5 mb-6" />
                <ul className="space-y-4 mb-8 text-sm text-white/80">
                  <li className="flex items-center gap-3"><Check className="w-4 h-4 text-[#6E5FE8]" /> 220 Points <span className="text-xs bg-[#6E5FE8]/20 text-[#6E5FE8] px-2 py-0.5 rounded-full">+20 Bonus</span></li>
                  <li className="flex items-center gap-3"><Check className="w-4 h-4 text-[#6E5FE8]" /> Studio 24kHz</li>
                  <li className="flex items-center gap-3"><Check className="w-4 h-4 text-[#6E5FE8]" /> Droits Commerciaux</li>
                </ul>
                <button onClick={onSigninClick} className="w-full py-3 rounded-xl bg-white text-black hover:bg-gray-200 font-bold transition">
                  {isRTL ? "احصل على برو" : "Obtenir Pro"}
                </button>
              </div>
            </SlideUp>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <Logo size={24} />
          <div className="text-sm text-white/40 flex gap-6">
            <a href="#" className="hover:text-white">Privacy</a>
            <a href="#" className="hover:text-white">Terms</a>
            <a href="#" className="hover:text-white">Contact</a>
          </div>
          <p className="text-xs text-white/30">© 2026 Sawtify. {isRTL ? "صُنع في الجزائر" : "Fait en Algérie"}.</p>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
