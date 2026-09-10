import React, { useEffect, useState } from "react";
import { ArrowUpRight, Play, Star, Menu, X, Headphones } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion"; // Note: assurez-vous d'utiliser framer-motion

const NEON = "#d4ff00"; // Le vert fluo du design
const DARK = "#0a0a0a"; // Noir profond

// --- STYLES GLOBAUX ---
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');
    * { box-sizing: border-box; -webkit-font-smoothing: antialiased; }
    body { background: ${DARK}; color: white; font-family: 'Inter', sans-serif; overflow-x: hidden; }
    
    .text-outline {
      -webkit-text-fill-color: transparent;
      -webkit-text-stroke: 1px rgba(255,255,255,0.5);
    }
    
    /* Animation pour la bannière défilante */
    @keyframes marquee {
      0% { transform: translateX(0%); }
      100% { transform: translateX(-100%); }
    }
    .animate-marquee { display: flex; white-space: nowrap; animation: marquee 20s linear infinite; }
    
    .glass-card {
      background: rgba(255, 255, 255, 0.03);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.05);
    }
  `}</style>
);

export const LandingPage = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  // Exemple de données pour remplacer les "Coachs" par vos "Voix"
  const voices = [
    { id: "amine", name: "Amine", role: "Voix Commerciale", hours: "9.000h", projects: "700+", img: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=800" },
    { id: "yasmine", name: "Yasmine", role: "Voix Publicitaire", hours: "5.000h", projects: "300+", img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800" },
  ];

  return (
    <div className="min-h-screen relative selection:bg-[#d4ff00] selection:text-black">
      <GlobalStyles />

      {/* HEADER (Minimaliste, texte blanc) */}
      <header className="fixed top-0 inset-x-0 z-50 mix-blend-difference">
        <div className="mx-auto w-full px-6 h-20 flex items-center justify-between text-[11px] font-bold tracking-widest uppercase text-white">
          <nav className="hidden md:flex gap-8">
            <a href="#voix" className="hover:text-[#d4ff00] transition">Voix</a>
            <a href="#studio" className="hover:text-[#d4ff00] transition">Studio</a>
            <a href="#tarifs" className="hover:text-[#d4ff00] transition">Tarifs</a>
          </nav>
          <div className="absolute left-1/2 -translate-x-1/2 text-xl tracking-tighter flex items-center gap-2">
            <div className="w-3 h-3 grid grid-cols-2 gap-[1px]">
              <div className="bg-[#d4ff00]"></div><div className="bg-[#d4ff00]"></div>
              <div className="bg-[#d4ff00]"></div><div className="bg-transparent"></div>
            </div>
            SAWTIFY STUDIO
          </div>
          <div className="hidden md:flex gap-6 items-center">
            <a href="#login" className="hover:text-[#d4ff00] transition">+213 555 00 00 00 📞</a>
          </div>
          <button className="md:hidden" onClick={() => setMenuOpen(true)}>
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* HERO SECTION (Calqué sur l'image Padel) */}
      <section className="relative h-[100svh] w-full overflow-hidden flex flex-col justify-center pt-20">
        {/* Background Image avec dégradé sombre en bas */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&q=80&w=2000" 
            alt="Studio background" 
            className="w-full h-full object-cover opacity-50 object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-[#0a0a0a]"></div>
        </div>

        {/* Textes massifs superposés */}
        <div className="relative z-10 w-full px-4 md:px-8 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-0 items-center justify-between">
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <h1 className="text-[12vw] md:text-[8vw] font-black leading-[0.85] tracking-tighter">Naturel.</h1>
            <p className="text-[10px] md:text-xs uppercase tracking-widest mt-4 w-48 opacity-70">Générez des voix off avec l'accent parfait.</p>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }} className="text-center">
            <h1 className="text-[12vw] md:text-[8vw] font-black leading-[0.85] tracking-tighter text-[#d4ff00]">Fluide.</h1>
            <p className="text-[10px] md:text-xs uppercase tracking-widest mt-4 mx-auto w-48 opacity-70">Entrez dans le studio et réclamez votre son.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="text-right">
            <h1 className="text-[12vw] md:text-[8vw] font-black leading-[0.85] tracking-tighter">Réel.</h1>
            <p className="text-[10px] md:text-xs uppercase tracking-widest mt-4 ml-auto w-48 opacity-70">Maîtrisez chaque intonation. Repoussez les limites.</p>
          </motion.div>
        </div>

        {/* Composants flottants du bas du Hero */}
        <div className="absolute bottom-10 w-full px-4 md:px-10 flex flex-col md:flex-row justify-between items-end z-20">
          
          {/* Card façon "Your Vacation Spot" */}
          <div className="glass-card rounded-2xl p-4 w-64 mb-8 md:mb-0">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-lg font-bold leading-tight">La Voix de<br/>Votre Marque</h3>
              <div className="w-4 h-4 grid grid-cols-2 gap-[2px]">
                <div className="bg-[#d4ff00] rounded-sm"></div><div className="bg-[#d4ff00] rounded-sm"></div>
                <div className="bg-[#d4ff00] rounded-sm"></div><div className="bg-[#d4ff00] rounded-sm"></div>
              </div>
            </div>
            <div className="flex items-end justify-between border-t border-white/10 pt-4 mt-12">
              <div>
                <div className="text-xl font-black">12.5k</div>
                <div className="text-[9px] uppercase tracking-wider opacity-50">Générations</div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black text-[#d4ff00]">4.9</div>
                <div className="text-[9px] uppercase tracking-wider opacity-50">Avis positifs</div>
              </div>
            </div>
          </div>

          {/* CTA façon "RESERVE A COURT" */}
          <div className="flex flex-col items-end gap-2 group cursor-pointer">
            <div className="flex items-center gap-4 text-xl md:text-3xl font-black uppercase tracking-tighter text-[#d4ff00]">
              Écouter une voix
              <ArrowUpRight className="w-8 h-8 group-hover:rotate-45 transition-transform duration-300" strokeWidth={3} />
            </div>
            <div className="h-1 w-full bg-[#d4ff00] origin-right group-hover:scale-x-0 transition-transform duration-500"></div>
          </div>
        </div>
      </section>

      {/* MARQUEE BANNER (Bandeau défilant) */}
      <div className="w-full bg-white/5 border-y border-white/10 py-3 overflow-hidden flex items-center">
        <div className="animate-marquee items-center text-[10px] font-bold tracking-[0.2em] uppercase text-white/50">
          {Array(10).fill("SAWTIFY STUDIO    •   ").map((text, i) => (
            <span key={i} className={i % 2 === 0 ? "text-white" : ""}>{text}</span>
          ))}
        </div>
      </div>

      {/* SECTION VOIX (Calquée sur la section "TRAIN LIKE A PRO" des coachs) */}
      <section className="py-24 px-4 md:px-10">
        <div className="flex flex-col md:flex-row justify-between items-end border-b border-white/20 pb-6 mb-12">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#d4ff00] mb-2">Les Voix</p>
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">Générez comme un pro</h2>
          </div>
          <button className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider hover:text-[#d4ff00] transition">
            Voir toutes les voix <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {/* Cartes façon Coachs de Padel */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {voices.map((voice) => (
            <div key={voice.id} className="relative h-[450px] rounded-3xl overflow-hidden group bg-black">
              {/* Image de la voix (remplace le visage du coach) */}
              <img src={voice.img} alt={voice.name} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
              
              <div className="absolute inset-0 p-8 flex flex-col justify-between z-10">
                {/* Haut de la carte */}
                <div className="flex justify-between items-start">
                  <div className="w-6 h-6 grid grid-cols-3 gap-1">
                    {Array(9).fill("").map((_, i) => <div key={i} className="bg-[#d4ff00] rounded-full opacity-80"></div>)}
                  </div>
                  <button className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 text-[#d4ff00] hover:text-white transition">
                    Générer <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>

                {/* Bas de la carte (Statistiques et Nom) */}
                <div className="flex justify-between items-end">
                  <div>
                    <h3 className="text-5xl font-black tracking-tighter">{voice.name}</h3>
                    <p className="text-xs uppercase tracking-widest opacity-60 mt-2">{voice.role}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black text-[#d4ff00]">{voice.hours}</div>
                    <div className="text-[9px] uppercase tracking-widest opacity-60 mb-2">Générées</div>
                    <div className="text-2xl font-black text-white">{voice.projects}</div>
                    <div className="text-[9px] uppercase tracking-widest opacity-60">Projets</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION BANDEAU GÉANT (Calqué sur "PLAY LIKE A CHAMPION") */}
      <section className="py-20 border-y border-white/10 bg-black text-center">
        <h2 className="text-[6vw] font-black uppercase tracking-tighter text-outline">
          Générez comme un champion
        </h2>
      </section>

    </div>
  );
};

export default LandingPage;
