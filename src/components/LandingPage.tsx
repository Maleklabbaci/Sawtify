import React, { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Play, Star, Menu, X, Pause } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const NEON = "#D4FF00";
const INTRO_AUDIO_URL = "https://res.cloudinary.com/gz65ybug/video/upload/v1788998622/discution.wav";

// --- GLOBAL STYLES ---
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    
    * { box-sizing: border-box; -webkit-font-smoothing: antialiased; }
    html { scroll-behavior: smooth; }
    body { background: #000000; color: #FFFFFF; font-family: 'Inter', sans-serif; overflow-x: hidden; }

    /* Effets de texte façon Padel Social Club */
    .text-outline {
      color: transparent;
      -webkit-text-stroke: 1px rgba(255, 255, 255, 0.8);
    }
    
    .glass {
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: #000; }
    ::-webkit-scrollbar-thumb { background: #333; }
    ::-webkit-scrollbar-thumb:hover { background: ${NEON}; }
  `}</style>
);

interface SawtifyCloneProps {
  onLoginClick: () => void;
  onSigninClick: () => void;
  language: "fr" | "ar";
  setLanguage: (lang: "fr" | "ar") => void;
}

export const LandingPage: React.FC<SawtifyCloneProps> = ({ onLoginClick, onSigninClick, language, setLanguage }) => {
  const isRTL = language === "ar";
  const [menuOpen, setMenuOpen] = useState(false);
  const [isIntroPlaying, setIsIntroPlaying] = useState(false);
  const introAudioRef = useRef<HTMLAudioElement | null>(null);

  // DÉCLENCHEMENT AUDIO AUTO
  useEffect(() => {
    const audio = new Audio(INTRO_AUDIO_URL);
    introAudioRef.current = audio;
    audio.onended = () => setIsIntroPlaying(false);

    const handleFirstInteraction = () => {
      audio.play().then(() => setIsIntroPlaying(true)).catch(() => {});
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("scroll", handleFirstInteraction);
    };

    window.addEventListener("click", handleFirstInteraction, { once: true });
    window.addEventListener("scroll", handleFirstInteraction, { once: true });

    return () => {
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("scroll", handleFirstInteraction);
      audio.pause();
    };
  }, []);

  const toggleAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!introAudioRef.current) return;
    if (isIntroPlaying) {
      introAudioRef.current.pause();
      setIsIntroPlaying(false);
    } else {
      introAudioRef.current.play().then(() => setIsIntroPlaying(true));
    }
  };

  const t = {
    hero1: isRTL ? "صوت." : "Motion.",
    hero2: isRTL ? "طبيعي." : "Discipline.",
    hero3: isRTL ? "تأثير." : "Result.",
    heroSub1: isRTL ? "درّب نصوصك مع خبراء المجال" : "Train with experts\nin their field",
    heroSub2: isRTL ? "ادخل استوديو الدارجة واصنع صوتك" : "Enter the darija studio\nclaim your victory",
    heroSub3: isRTL ? "أتقن كل نبرة\nوتجاوز الحدود" : "Master every single strike\npush your limits",
    vacation: isRTL ? "استوديو الدارجة" : "Darija Studio",
    reserve: isRTL ? "احجز الاستوديو" : "ENTER THE STUDIO",
    expTitle: isRTL ? "عِش الطاقة الحقيقية للصوت الطبيعي" : "EXPERIENCE THE\nTRUE ENERGY\nOF SAWTIFY",
    expSub: isRTL ? "سريع، دقيق، وحيوي. سواء كنت تريد إعلانًا تجاريًا أو بودكاست، أصواتنا جاهزة لنصك القادم." : "Fast-paced, tactical, and incredibly real. Whether you want a commercial ad, or just a podcast narration, our state-of-the-art voices are ready for your next text.",
    coach: isRTL ? "تدرّب كالمحترفين" : "TRAIN LIKE A PRO",
    swipe: isRTL ? "اسحب لترى الكل" : "Swipe To See All",
    bookSession: isRTL ? "اسمع الصوت" : "LISTEN VOICE",
    elevate1: isRTL ? "ارفع" : "Elevate",
    elevate2: isRTL ? "مستوى" : "Your",
    elevate3: isRTL ? "صوتك" : "Sawtify",
    elevate4: isRTL ? "الآن" : "Game",
  };

  // Voix façon "Coachs" avec des portraits
  const VOICES = [
    { id: "amine", name: "Amine", role: "Voix Commerciale", hrs: "9.000h", students: "700+", img: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800" },
    { id: "yasmine", name: "Yasmine", role: "Voix Publicitaire", hrs: "5.000h", students: "300+", img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800" },
  ];

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-black relative">
      <GlobalStyles />

      {/* NAVBAR (Calquée sur le header) */}
      <nav className="fixed top-0 inset-x-0 z-50 px-8 py-6 flex items-center justify-between text-[11px] font-bold uppercase tracking-widest mix-blend-difference text-white">
        <div className="flex gap-8 hidden md:flex">
          <a href="#voices" className="hover:text-[#D4FF00]">Voices</a>
          <a href="#pricing" className="hover:text-[#D4FF00]">Pricing</a>
          <a href="#contact" className="hover:text-[#D4FF00]">Contact</a>
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 text-sm tracking-tight font-black">
          <div className="w-3 h-3 grid grid-cols-2 gap-[1px]">
            <div className="bg-[#D4FF00]"></div><div className="bg-[#D4FF00]"></div><div className="bg-[#D4FF00]"></div><div className="bg-transparent"></div>
          </div>
          SAWTIFY STUDIO
        </div>
        <div className="flex items-center gap-6">
          <button onClick={() => setLanguage(language === "fr" ? "ar" : "fr")} className="hover:text-[#D4FF00]">{isRTL ? "FR" : "AR"}</button>
          <button onClick={onSigninClick} className="hover:text-[#D4FF00] hidden md:block">+213 555 000 000</button>
        </div>
      </nav>

      {/* SECTION 1: HERO (Le joueur de tennis) */}
      <section className="relative h-screen w-full flex flex-col justify-between overflow-hidden pt-32 pb-8 px-8">
        {/* Background Image: Un gars avec un micro/casque à la place du tennisman */}
        <div className="absolute inset-0 z-0">
          <img src="https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&q=80&w=2000" alt="Background" className="w-full h-full object-cover object-top opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black"></div>
        </div>

        {/* Les 3 mots géants */}
        <div className="relative z-10 w-full flex flex-col md:flex-row justify-between items-start md:items-center -mt-10 md:mt-0 gap-8 md:gap-0">
          <div className="md:w-1/3">
            <h1 className="text-[12vw] md:text-[7vw] font-black leading-[0.8] tracking-tighter">{t.hero1}</h1>
            <p className="text-[10px] uppercase tracking-widest text-white/60 mt-4 whitespace-pre-line">{t.heroSub1}</p>
          </div>
          <div className="md:w-1/3 text-left md:text-center">
            <h1 className="text-[12vw] md:text-[7vw] font-black leading-[0.8] tracking-tighter text-[#D4FF00]">{t.hero2}</h1>
            <p className="text-[10px] uppercase tracking-widest text-white/60 mt-4 whitespace-pre-line">{t.heroSub2}</p>
          </div>
          <div className="md:w-1/3 text-left md:text-right">
            <h1 className="text-[12vw] md:text-[7vw] font-black leading-[0.8] tracking-tighter text-white">{t.hero3}</h1>
            <p className="text-[10px] uppercase tracking-widest text-white/60 mt-4 whitespace-pre-line ml-auto">{t.heroSub3}</p>
          </div>
        </div>

        {/* Le bas du Hero: Carte flottante à gauche, Bouton à droite */}
        <div className="relative z-10 w-full flex flex-col md:flex-row justify-between items-end">
          {/* Carte type "Your Vacation Spot" avec le visualiseur audio */}
          <div className="glass rounded-xl p-4 w-64">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold leading-tight">{t.vacation}</h3>
              <div className="w-4 h-4 grid grid-cols-2 gap-[2px]">
                <div className="bg-[#D4FF00] rounded-[2px]"></div><div className="bg-[#D4FF00] rounded-[2px]"></div><div className="bg-[#D4FF00] rounded-[2px]"></div><div className="bg-transparent"></div>
              </div>
            </div>
            
            {/* Visualiseur audio pour l'intro */}
            <div className="h-10 flex items-center justify-between gap-1 mb-4" onClick={toggleAudio} style={{cursor: 'pointer'}}>
              {Array.from({ length: 15 }).map((_, i) => (
                <div key={i} className="w-full bg-[#D4FF00] rounded-full transition-all duration-75" style={{ height: isIntroPlaying ? `${20 + Math.random() * 80}%` : '20%', opacity: isIntroPlaying ? 1 : 0.3 }} />
              ))}
              <div className="ml-2 bg-white/20 p-1 rounded-full">
                {isIntroPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </div>
            </div>

            <div className="flex justify-between items-end border-t border-white/20 pt-2">
              <div>
                <div className="text-xl font-black">50k</div>
                <div className="text-[9px] text-white/60">Générations</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-[#D4FF00]">4.9</div>
                <div className="text-[9px] text-white/60">Positive reviews</div>
              </div>
            </div>
          </div>

          {/* Bouton RESERVE A COURT */}
          <button onClick={onSigninClick} className="mt-8 md:mt-0 flex items-center gap-2 group cursor-pointer">
            <span className="text-2xl font-black text-[#D4FF00] tracking-tighter uppercase">{t.reserve}</span>
            <ArrowUpRight className="w-8 h-8 text-[#D4FF00] group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" strokeWidth={3} />
          </button>
        </div>
      </section>

      {/* SECTION 2: EXPERIENCE (Les balles de tennis) */}
      <section className="relative h-[80vh] w-full flex items-center justify-center text-center px-8 border-y border-white/10">
        {/* Background Image: Studio de son ou texture abstraite */}
        <div className="absolute inset-0 z-0">
          <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=2000" alt="Experience" className="w-full h-full object-cover opacity-30 mix-blend-luminosity" />
          <div className="absolute inset-0 bg-black/40"></div>
        </div>

        <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">
          <div className="w-12 h-12 grid grid-cols-3 gap-1 mb-8 opacity-80">
            {Array(9).fill("").map((_, i) => <div key={i} className="bg-white rounded-full"></div>)}
          </div>
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter leading-[0.9] whitespace-pre-line mb-6">
            {t.expTitle}
          </h2>
          <p className="text-xs md:text-sm text-white/70 max-w-md mx-auto leading-relaxed mb-10">
            {t.expSub}
          </p>
          <button onClick={onSigninClick} className="flex items-center gap-2 group border-b border-[#D4FF00] pb-1">
            <span className="text-sm font-bold text-white tracking-widest uppercase">{t.reserve}</span>
            <ArrowUpRight className="w-4 h-4 text-white group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </button>
        </div>
      </section>

      {/* SECTION 3: TRAIN LIKE A PRO (Les Coachs / Voix) */}
      <section id="voices" className="py-20 px-4 md:px-8 w-full max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between border-b border-white/20 pb-4 mb-8">
          <div>
            <span className="text-[10px] text-white/50 block mb-1">Voices</span>
            <h2 className="text-xl md:text-3xl font-black uppercase tracking-tighter">{t.coach}</h2>
          </div>
          <div className="flex items-center gap-2 text-sm font-bold text-[#D4FF00]">
            {t.swipe} <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        {/* Grille des Coachs / Voix */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {VOICES.map((v) => (
            <div key={v.id} className="relative h-[500px] bg-black rounded-2xl overflow-hidden group">
              <img src={v.img} alt={v.name} className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
              
              <div className="absolute inset-0 p-6 flex flex-col justify-between">
                {/* Header Carte (Bouton et Grille points) */}
                <div className="flex justify-between items-start">
                  <div className="w-8 h-8 grid grid-cols-3 gap-[2px]">
                    {Array(9).fill("").map((_, i) => <div key={i} className="bg-[#D4FF00] rounded-full"></div>)}
                  </div>
                  <button className="flex items-center gap-1 text-[10px] font-bold text-[#D4FF00] uppercase tracking-widest hover:text-white">
                    {t.bookSession} <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>

                {/* Footer Carte (Stats et Nom) */}
                <div className="flex justify-between items-end">
                  <div className="pb-2">
                    <h3 className="text-5xl font-black tracking-tighter text-outline group-hover:text-white transition-colors">{v.name}</h3>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-black text-[#D4FF00] leading-none mb-1">{v.hrs}</div>
                    <div className="text-[9px] text-white/50 uppercase tracking-widest mb-4">on the mic</div>
                    <div className="text-2xl font-black text-white leading-none mb-1">{v.students}</div>
                    <div className="text-[9px] text-white/50 uppercase tracking-widest">projects</div>
                  </div>
                </div>
              </div>
              
              {/* Le petit texte centré en bas "SAWTIFY STUDIO" */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[8px] tracking-[0.2em] text-white/30 uppercase">
                SAWTIFY STUDIO
              </div>
            </div>
          ))}
        </div>
        
        {/* Bandeau PLAY LIKE A CHAMPION */}
        <div className="mt-20 text-right">
          <h2 className="text-[6vw] font-black tracking-tighter uppercase text-white">
            CREATE LIKE A CHAMPION
          </h2>
        </div>
      </section>

      {/* SECTION 4: COURTS (Elevate your game / Pricing) */}
      <section id="pricing" className="relative h-screen w-full flex flex-col justify-between border-t border-white/10 pt-8 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src="https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&q=80&w=2000" alt="Courts" className="w-full h-full object-cover opacity-20 filter grayscale" />
        </div>

        <div className="relative z-10 px-8 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
          <div className="border border-white/20 rounded-full px-3 py-1 flex items-center gap-2">
            CHOOSE YOUR PLAN <span className="w-2 h-2 bg-[#D4FF00] rounded-full"></span>
          </div>
          <div>PRICING PLANS</div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 grid grid-cols-2 gap-[1px]">
              <div className="bg-[#D4FF00]"></div><div className="bg-[#D4FF00]"></div><div className="bg-[#D4FF00]"></div><div className="bg-transparent"></div>
            </div>
            SAWTIFY STUDIO
          </div>
        </div>

        {/* Elevate Your Game (Textes superposés géants) */}
        <div className="relative z-10 flex-1 flex items-center justify-center w-full px-8">
          <div className="grid grid-cols-4 w-full gap-4 text-center">
            <h1 className="text-[8vw] font-black tracking-tighter text-[#D4FF00]">{t.elevate1}</h1>
            <h1 className="text-[8vw] font-black tracking-tighter text-[#D4FF00]">{t.elevate2}</h1>
            <h1 className="text-[8vw] font-black tracking-tighter text-[#D4FF00]">{t.elevate3}</h1>
            <h1 className="text-[8vw] font-black tracking-tighter text-[#D4FF00]">{t.elevate4}</h1>
          </div>
        </div>

        {/* Le footer des courts (Mini cartes de prix en bas) */}
        <div className="relative z-10 px-8 pb-8 flex justify-between items-end">
          <button onClick={onSigninClick} className="flex items-center gap-2 group">
            <span className="text-xl font-black text-[#D4FF00] tracking-tighter uppercase">START NOW</span>
            <ArrowUpRight className="w-6 h-6 text-[#D4FF00] group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" strokeWidth={3} />
          </button>
          
          {/* Petites cartes de prix façon "Images des courts" */}
          <div className="flex gap-4">
            <div className="w-48 h-24 bg-black border border-white/20 p-4 flex flex-col justify-between hover:border-[#D4FF00] transition cursor-pointer">
              <div className="text-[10px] text-white/50 uppercase tracking-widest">Starter</div>
              <div className="text-2xl font-black text-[#D4FF00]">500 DZD</div>
            </div>
            <div className="w-48 h-24 bg-black border border-white/20 p-4 flex flex-col justify-between hover:border-[#D4FF00] transition cursor-pointer">
              <div className="text-[10px] text-white/50 uppercase tracking-widest">Pro</div>
              <div className="text-2xl font-black text-[#D4FF00]">1000 DZD</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
