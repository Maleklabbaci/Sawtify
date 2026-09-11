import React, { useEffect, useRef, useState, useCallback, useLayoutEffect } from "react";
import {
  ArrowRight, ArrowLeft, Play, Plus, Menu, X,
  Check, Star, Headphones, ShoppingBag, Clapperboard, Mic2, Phone, ShieldCheck, Gift, Pause, Volume2, VolumeX
} from "lucide-react";
import { motion, AnimatePresence, useScroll } from "motion/react";

export interface LandingPageProps {
  onLoginClick: () => void;
  onSigninClick: () => void;
  language: "fr" | "ar";
  setLanguage: (lang: "fr" | "ar") => void;
}

/* ================= THÈME "VIOLET & BLANC" ================= */
const PAPER = "#FFFFFF";
const INK = "#17131F";
const ACCENT = "#7C3AED";      // violet-600
const MESH = { purple: "#8b5cf6", pink: "#ec4899", blue: "#3b82f6" };
const LOGO = "https://i.ibb.co/nqShkPNP/68126702-75e5-4de6-9b53-e51800b05e4a.jpg";
const INTRO_AUDIO_URL = "https://res.cloudinary.com/gz65ybug/video/upload/v1789055318/Generated_Audio_September_10_2026_-_4_29PM.wav";

const MONO_STACK = "'JetBrains Mono', 'Cairo', monospace";
const NUM_STACK = "'Space Grotesk', 'Cairo', sans-serif";

/* ============================================================
   GSAP — chargement CDN (10 plugins utiles). Fallback statique
   si le CDN échoue. Aucune API externe, aucune clé.
   ============================================================ */
const GSAP_CDN = "https://cdn.jsdelivr.net/npm/gsap@3.15/dist/";
const GSAP_MODULES = [
  "ScrollTrigger", "ScrollSmoother", "SplitText", "ScrambleTextPlugin",
  "DrawSVGPlugin", "MorphSVGPlugin", "MotionPathPlugin",
  "Draggable", "InertiaPlugin", "CustomEase",
] as const;

const scriptCache = new Map<string, Promise<void>>();
const loadScript = (src: string): Promise<void> => {
  if (!scriptCache.has(src)) {
    scriptCache.set(src, new Promise<void>((resolve, reject) => {
      const el = document.createElement("script");
      el.src = src; el.async = false;
      el.onload = () => resolve();
      el.onerror = () => reject(new Error("Chargement impossible : " + src));
      document.head.appendChild(el);
    }));
  }
  return scriptCache.get(src)!;
};

function registerGsap() {
  const w = window as any;
  w.gsap.registerPlugin(
    w.ScrollTrigger, w.ScrollSmoother, w.SplitText, w.ScrambleTextPlugin,
    w.DrawSVGPlugin, w.MorphSVGPlugin, w.MotionPathPlugin,
    w.Draggable, w.InertiaPlugin, w.CustomEase
  );
  w.gsap.config({ nullTargetWarn: false });
  w.ScrollTrigger?.config({ ignoreMobileResize: true });
  try { w.CustomEase.create("sawt", "0.22, 1, 0.36, 1"); } catch { /* déjà créé */ }
}

function useGsapReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    const w = window as any;
    if (w.gsap && w.ScrollTrigger && w.Draggable && w.SplitText && w.MorphSVGPlugin && w.ScrollSmoother) {
      registerGsap(); setReady(true); return;
    }
    (async () => {
      try {
        await loadScript(GSAP_CDN + "gsap.min.js");
        await Promise.all(GSAP_MODULES.map((m) => loadScript(GSAP_CDN + m + ".min.js")));
        registerGsap();
        if (alive) setReady(true);
      } catch (e) {
        console.warn("GSAP indisponible — page statique mais fonctionnelle.", e);
      }
    })();
    return () => { alive = false; };
  }, []);
  return ready;
}

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600&family=Space+Grotesk:wght@500;600;700&display=swap');

    html { scroll-behavior: smooth; -webkit-font-smoothing: antialiased; }
    body:has(#sawtify-landing) { background: ${PAPER}; color: ${INK}; overflow-x: hidden; }
    #sawtify-landing * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    #sawtify-landing ::selection { background: ${ACCENT}; color: #fff; }
    #sawtify-landing ::-webkit-scrollbar { width: 10px; }
    #sawtify-landing ::-webkit-scrollbar-track { background: #F3F0FA; }
    #sawtify-landing ::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.45); border-radius: 10px; }
    #sawtify-landing .scrollbar-none { scrollbar-width: none; -ms-overflow-style: none; }
    #sawtify-landing .scrollbar-none::-webkit-scrollbar { display: none; }

    @keyframes wave { 0%, 100% { transform: scaleY(0.28); } 50% { transform: scaleY(1); } }
    #sawtify-landing .wave-bar { animation: wave 1.3s ease-in-out infinite; transform-origin: bottom; }
    @keyframes blink { 50% { opacity: 0; } }
    #sawtify-landing .caret { display: inline-block; width: 2px; height: 1em; margin-inline-start: 2px; background: ${ACCENT}; animation: blink 1s step-end infinite; vertical-align: -2px; }
    #sawtify-landing .focus-ring:focus-visible { outline: 2px solid ${ACCENT}; outline-offset: 3px; border-radius: 10px; }

    /* ---------- MESH GRADIENT (fond fixe, piloté en rAF) ---------- */
    #sawtify-landing .mesh-container {
      position: fixed; inset: 0; z-index: 0;
      filter: blur(80px);
      pointer-events: none;
      transform: translateZ(0); /* layer GPU dédiée */
    }
    @media (max-width: 640px) { #sawtify-landing .mesh-container { filter: blur(56px); } }
    #sawtify-landing .mesh-ball { position: absolute; border-radius: 50%; will-change: transform; }

    #sawtify-landing .sw-char, #sawtify-landing .sw-word { display: inline-block; will-change: transform; }
    #sawtify-landing .sw-rule line { stroke: rgba(124,58,237,0.45); stroke-width: 1.5; }

    #sawtify-landing .sw-fader-handle {
      touch-action: none; cursor: grab; will-change: transform;
      box-shadow: 0 6px 18px rgba(23,19,31,0.18), 0 0 0 1px rgba(23,19,31,0.06);
    }
    #sawtify-landing .sw-fader-handle:active { cursor: grabbing; }

    #sawtify-landing .card-lift { transition: transform .4s cubic-bezier(0.16,1,0.3,1), border-color .4s, box-shadow .4s; }
    @media (hover: hover) {
      #sawtify-landing .card-lift:hover { transform: translateY(-4px); border-color: rgba(124,58,237,0.4); box-shadow: 0 18px 44px -18px rgba(124,58,237,0.25); }
    }
    #sawtify-landing .hov-accent:hover, #sawtify-landing .hov-accent:focus-visible { border-color: rgba(124,58,237,0.55); }

    @media (prefers-reduced-motion: reduce) {
      html { scroll-behavior: auto; }
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    }
  `}</style>
);

/* ============================================================
   MESH BACKGROUND — rAF autonome (SANS GSAP, fonctionne même
   si le CDN est bloqué). Une seule boucle, lerp + skip de
   frames : rien ne bouge → aucun repaint.
   ============================================================ */
const MeshBackground = () => {
  const ballRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const balls = ballRefs.current;
    if (!balls[0] || !balls[1] || !balls[2]) return;

    let raf = 0;
    let tx = 0, ty = 0;        // cible souris (-0.5..0.5)
    let cx = 0, cy = 0;        // valeur lissée
    let maxScroll = 1;
    const applied = [1e9, 1e9, 1e9, 1e9, 1e9, 1e9]; // dernier état écrit

    const measure = () => {
      maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    };
    measure();

    const onMove = (e: MouseEvent) => {
      tx = (e.clientX / window.innerWidth) - 0.5;
      ty = (e.clientY / window.innerHeight) - 0.5;
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("resize", measure);
    (window as any).ScrollTrigger?.addEventListener?.("refresh", measure);

    const loop = () => {
      // Lissage souris (buttery) — au lieu d'une transition CSS qui combat le JS
      cx += (tx - cx) * 0.07;
      cy += (ty - cy) * 0.07;

      const sm = (window as any).ScrollSmoother?.get?.();
      const scroll = sm ? sm.scrollTop() : window.scrollY;
      const p = Math.min(1, Math.max(0, scroll / maxScroll)); // progression 0→1 sur TOUTE la page

      // Facteurs : souris (px) + parallaxe scroll bornée (jamais hors écran)
      const out = [
        cx * 60,          cy * 60 + p * 300,    // violet
        cx * -100,        cy * -100 - p * 240,  // rose
        cx * 160 + p * 60, cy * 160 + p * 420,  // bleu
      ];

      // Skip de frames : si rien n'a bougé (epsilon), on n'écrit rien → zéro repaint
      let changed = false;
      for (let i = 0; i < 6; i++) {
        if (Math.abs(out[i] - applied[i]) > 0.25) { changed = true; break; }
      }
      if (changed) {
        for (let i = 0; i < 6; i++) applied[i] = out[i];
        balls[0]!.style.transform = `translate3d(${out[0].toFixed(1)}px, ${out[1].toFixed(1)}px, 0)`;
        balls[1]!.style.transform = `translate3d(${out[2].toFixed(1)}px, ${out[3].toFixed(1)}px, 0)`;
        balls[2]!.style.transform = `translate3d(${out[4].toFixed(1)}px, ${out[5].toFixed(1)}px, 0)`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", measure);
      (window as any).ScrollTrigger?.removeEventListener?.("refresh", measure);
    };
  }, []);

  return (
    <div className="mesh-container" aria-hidden>
      <div ref={(el) => { ballRefs.current[0] = el; }} className="mesh-ball"
        style={{ width: "75vw", height: "75vw", background: MESH.purple, top: "-15%", left: "-15%", opacity: 0.85 }} />
      <div ref={(el) => { ballRefs.current[1] = el; }} className="mesh-ball"
        style={{ width: "45vw", height: "45vw", background: MESH.pink, top: "15%", right: "-5%", opacity: 0.85 }} />
      <div ref={(el) => { ballRefs.current[2] = el; }} className="mesh-ball"
        style={{ width: "25vw", height: "25vw", background: MESH.blue, bottom: "10%", left: "30%", opacity: 0.9 }} />
    </div>
  );
};

const Logo = ({ size = 38 }: { size?: number }) => {
  const [imgError, setImgError] = useState(false);
  return (
    <div className="flex items-center gap-2.5 select-none">
      <div className="rounded-xl overflow-hidden shrink-0"
        style={{ width: size, height: size, boxShadow: "0 0 0 1px rgba(23,19,31,0.08), 0 4px 16px rgba(124,58,237,0.3)" }}>
        {!imgError ? (
          <img src={LOGO} alt="Sawtify" width={size} height={size} decoding="async"
            onError={() => setImgError(true)} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-bold"
            style={{ background: ACCENT, color: "#fff", fontSize: size * 0.5, fontFamily: NUM_STACK }}>S</div>
        )}
      </div>
      <span className="font-bold text-[19px] tracking-tight text-[#17131F]" style={{ fontFamily: NUM_STACK }}>Sawtify</span>
    </div>
  );
};

const Num = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <span dir="ltr" style={{ unicodeBidi: "isolate", fontFamily: NUM_STACK }} className={`inline-block tabular-nums ${className}`}>{children}</span>
);

const Mono = ({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
  <span className={className} style={{ fontFamily: MONO_STACK, ...style }}>{children}</span>
);

const Kicker = ({ no, children }: { no?: string; children: React.ReactNode }) => (
  <p className="text-[11px] font-semibold tracking-[0.26em] uppercase mb-3" style={{ color: ACCENT, fontFamily: MONO_STACK }}>
    {no ? `[${no}] ` : "// "}{children}
  </p>
);

const SectionHead = ({ no, kicker, title, sub, center = false, font }: {
  no: string; kicker: string; title: string; sub?: string; center?: boolean; font: string;
}) => (
  <div className={center ? "text-center mx-auto max-w-2xl" : "max-w-2xl"}>
    <Kicker no={no}>{kicker}</Kicker>
    <h2 className="text-[clamp(1.9rem,4.2vw,3.1rem)] leading-[1.06] tracking-[-0.02em] font-bold text-[#17131F]" style={{ fontFamily: font }}>{title}</h2>
    {sub && <p className="mt-4 text-[14px] text-[#17131F]/60 leading-relaxed">{sub}</p>}
  </div>
);

const Waveform = ({ color, playing, bars = 30 }: { color: string; playing: boolean; bars?: number }) => (
  <div className="flex items-end justify-center gap-[3px] h-24 w-full" dir="ltr" aria-hidden>
    {Array.from({ length: bars }).map((_, i) => {
      const h = 18 + Math.abs(Math.sin(i * 0.55) * Math.cos(i * 0.31)) * 82;
      const hot = i % 6 === 0;
      return (
        <span key={i} className={`flex-1 rounded-full origin-bottom ${playing ? "wave-bar" : ""}`}
          style={{
            height: `${h}%`, maxWidth: 4,
            background: hot ? color : "rgba(23,19,31,0.16)",
            opacity: playing ? 1 : 0.55,
            animationDelay: `${(i % 10) * 0.1}s`,
          }} />
      );
    })}
  </div>
);

/* Générateur de waveform SVG — structure identique par seed → morph fluide */
function makeWave(seed: number, n = 56, w = 640, h = 150): string {
  let s = (seed * 9301 + 49297) % 233280;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const env = Math.pow(Math.sin(Math.PI * t), 0.8);
    const y = h / 2 + Math.sin(t * 21 + seed * 3.7) * 0.55 * env * (h / 2) + (rnd() - 0.5) * 0.85 * env * (h / 2);
    pts.push([t * w, Math.max(4, Math.min(h - 4, y))]);
  }
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const mx = (x0 + x1) / 2;
    d += `C${mx.toFixed(1)},${y0.toFixed(1)} ${mx.toFixed(1)},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
  }
  return d;
}
const waveLine = (i: number) => makeWave(i + 2);
const waveArea = (i: number) => makeWave(i + 2) + " L640,150 L0,150 Z";

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

/* ============================================================
   DÉMO VOCALE — speechSynthesis (native, gratuite, opt-in).
   ============================================================ */
type NowPlaying = { kind: "intro" } | { kind: "sample"; id: string } | null;

function useVoiceDemo() {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const [nowPlaying, setNowPlaying] = useState<NowPlaying>(null);
  const token = useRef(0);

  useEffect(() => {
    if (!supported) return;
    const warm = () => window.speechSynthesis.getVoices();
    warm();
    window.speechSynthesis.addEventListener("voiceschanged", warm);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", warm);
  }, [supported]);

  const pickVoice = useCallback((lang: "fr" | "ar", gender: "male" | "female") => {
    const pool = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith(lang));
    if (!pool.length) return null;
    const fem = pool.find((v) => /female|femme|woman|zira|hoda|amelie|amélie|audrey|salma/i.test(v.name));
    return gender === "female" ? (fem ?? pool[0]) : (pool.find((v) => v !== fem) ?? pool[0]);
  }, []);

  const speak = useCallback((voice: VoiceCard, lang: "fr" | "ar", text?: string) => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    const my = ++token.current;
    const u = new SpeechSynthesisUtterance(text || (lang === "ar" ? voice.sampleAr : voice.sampleFr));
    const v = pickVoice(lang, voice.gender);
    if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = lang === "ar" ? "ar-SA" : "fr-FR"; }
    u.rate = voice.category === "social" ? 1.08 : voice.category === "formal" ? 0.94 : 1;
    u.pitch = voice.gender === "female" ? 1.08 : 0.88;
    const finish = () => { if (token.current === my) setNowPlaying(null); };
    u.onend = finish;
    u.onerror = finish;
    setNowPlaying({ kind: "sample", id: voice.id });
    window.setTimeout(() => { if (token.current === my) window.speechSynthesis.speak(u); }, 60);
  }, [supported, pickVoice]);

  const stopSpeech = useCallback(() => {
    if (!supported) return;
    token.current++;
    window.speechSynthesis.cancel();
    setNowPlaying((p) => (p?.kind === "sample" ? null : p));
  }, [supported]);

  useEffect(() => () => { if (supported) window.speechSynthesis.cancel(); }, [supported]);

  return { speechSupported: supported, nowPlaying, speak, stopSpeech };
}

/* DOCK AUDIO — verre blanc, bouton violet, barres = VRAI volume */
const AudioDock = ({ isPlaying, volume, onToggle, isRTL, hidden = false }: {
  isPlaying: boolean; volume: number; onToggle: () => void; isRTL: boolean; hidden?: boolean;
}) => {
  const F = [0.55, 1, 0.75, 0.9, 0.6];
  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", damping: 22, stiffness: 120, delay: 0.8 }}
      className={`fixed bottom-24 sm:bottom-6 end-3 sm:end-6 z-[80] transition-all duration-300 ${hidden ? "opacity-0 pointer-events-none translate-y-3" : "opacity-100"}`}
    >
      <div className="flex items-center gap-3 rounded-full border border-[#17131F]/10 bg-white/85 backdrop-blur-xl pl-4 pr-1.5 py-1.5 shadow-[0_10px_36px_rgba(23,19,31,0.14)]">
        {isPlaying ? <Volume2 className="w-4 h-4 shrink-0" style={{ color: ACCENT }} /> : <VolumeX className="w-4 h-4 shrink-0 text-[#17131F]/30" />}
        <div className="flex items-end gap-[2.5px] h-4 shrink-0" dir="ltr" aria-hidden>
          {F.map((f, i) => (
            <span key={i} className="w-[3px] rounded-full"
              style={{
                height: isPlaying ? Math.max(4, 4 + volume * 14 * f) : 4,
                background: isPlaying ? ACCENT : "rgba(23,19,31,0.2)",
                transition: "height 0.09s ease-out",
              }} />
          ))}
        </div>
        <span className="hidden sm:block text-[11px] font-semibold tracking-[0.14em] uppercase whitespace-nowrap"
          style={{ fontFamily: MONO_STACK, color: isPlaying ? ACCENT : "rgba(23,19,31,0.55)" }}>
          {isPlaying ? (isRTL ? "بثّ مباشر" : "On air") : (isRTL ? "اسمع التقديم" : "Écouter l'intro")}
        </span>
        {isPlaying && <span className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ background: ACCENT }} />}
        <button type="button" onClick={onToggle} aria-pressed={isPlaying}
          aria-label={isPlaying ? (isRTL ? "إيقاف الصوت" : "Arrêter l'audio") : (isRTL ? "تشغيل التقديم" : "Lire l'intro")}
          className="w-9 h-9 rounded-full flex items-center justify-center transition hover:scale-105 focus-ring text-white"
          style={{ background: ACCENT }}>
          {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ms-0.5" />}
        </button>
      </div>
    </motion.div>
  );
};

type VoiceCard = {
  id: string; nameFr: string; nameAr: string; tagFr: string; tagAr: string;
  location: string; gender: "male" | "female";
  category: "commercial" | "narrative" | "social" | "formal";
  rating?: number; reviews?: number; color: string; sampleFr: string; sampleAr: string;
};

/* Les 3 voix de la landing reprennent les 3 couleurs du mesh : cohérence totale */
const VOICES: VoiceCard[] = [
  { id: "amine", nameFr: "Amine", nameAr: "أمين", tagFr: "Voix commerciale", tagAr: "صوت تجاري", location: "Alger, DZ", gender: "male", category: "commercial", rating: 4.9, reviews: 234, color: "#7C3AED", sampleFr: "Salam 3likoum khawti! M3a Sawtify, nassek yewli sawt tabi3i, wadeh, wahli l i3lanat.", sampleAr: "سلام عليكم خاوتي! مع صوتيفي، نصوصكم تولي صوت طبيعي، واضح، جاهز للإعلانات." },
  { id: "yasmine", nameFr: "Yasmine", nameAr: "ياسمين", tagFr: "Voix publicitaire", tagAr: "صوت إعلاني", location: "Oran, DZ", gender: "female", category: "commercial", rating: 4.8, reviews: 189, color: "#DB2777", sampleFr: "Marhba bikom kamlin! Tawsil 58 wilaya, payment 3and l istlam. Tleb dorka.", sampleAr: "مرحبا بيكم كاملين! التوصيل لـ 58 ولاية والدفع عند الاستلام. اطلب درك." },
  { id: "khalid", nameFr: "Khalid", nameAr: "خالد", tagFr: "Voix documentaire", tagAr: "صوت وثائقي", location: "Constantine, DZ", gender: "male", category: "formal", rating: 5.0, reviews: 312, color: "#2563EB", sampleFr: "Nqeddmlkom lyom notq mawzoun w dqi9, l watha2iqiyat w contenu rassmi.", sampleAr: "نقدّم ليكم اليوم نطق موزون ودقيق، للوثائقيات والمحتوى الرسمي." },
  { id: "layla", nameFr: "Layla", nameAr: "ليلى", tagFr: "Voix social media", tagAr: "صوت سوشيال", location: "Annaba, DZ", gender: "female", category: "social", rating: 4.9, reviews: 156, color: "#D97706", sampleFr: "Salut l'équipe ! Une voix vive, parfaite pour Reels, TikTok et stories.", sampleAr: "واش راكم ليكيب؟ صوت حيوي، هايل للريلز وتيك توك والستوريز." },
  { id: "yacine", nameFr: "Yacine", nameAr: "ياسين", tagFr: "Voix éducative", tagAr: "صوت تعليمي", location: "Sétif, DZ", gender: "male", category: "narrative", rating: 4.7, reviews: 98, color: "#0891B2", sampleFr: "Dans cette leçon, on avance pas à pas. Une voix claire, pour e-learning et tutos.", sampleAr: "في هاد الدرس، نمشيو خطوة بخطوة. صوت واضح للشروحات والدروس." },
  { id: "nadia", nameFr: "Nadia", nameAr: "نادية", tagFr: "Voix podcast", tagAr: "صوت بودكاست", location: "Tlemcen, DZ", gender: "female", category: "narrative", rating: 4.9, reviews: 267, color: "#059669", sampleFr: "Bienvenue dans cet épisode. Une voix chaleureuse, pour podcasts et YouTube.", sampleAr: "مرحبا بيكم في هاد الحلقة. صوت دافئ للبودكاست ويوتيوب." },
  { id: "maryam", nameFr: "Maryam", nameAr: "مريم", tagFr: "Narration & podcast", tagAr: "سرد وبودكاست", location: "Alger, DZ", gender: "female", category: "narrative", rating: 4.8, reviews: 201, color: "#BE185D", sampleFr: "Écoutez une diction fluide et élégante, pour vos récits et documentaires.", sampleAr: "استمعوا لنطق سلس وأنيق، للروايات والوثائقيات." },
  { id: "rachid", nameFr: "Rachid", nameAr: "رشيد", tagFr: "Énergique & pub", tagAr: "حماسي وإشهاري", location: "Oran, DZ", gender: "male", category: "commercial", rating: 4.9, reviews: 176, color: "#EA580C", sampleFr: "Une voix percutante, idéale pour vos spots et lancements produits.", sampleAr: "صوت قوي، هايل للسبوتات وإطلاق المنتجات." },
  { id: "bilal", nameFr: "Bilal", nameAr: "بلال", tagFr: "Narration & récit", tagAr: "سردي وقصصي", location: "Constantine, DZ", gender: "male", category: "narrative", rating: 4.8, reviews: 142, color: "#0284C7", sampleFr: "Le rendu est si naturel qu'on croirait un présentateur en studio.", sampleAr: "الصوت يخرج طبيعي كأنو متحدث حقيقي في الستوديو." },
];

const LANDING_VOICE_IDS = ["amine", "yasmine", "khalid"] as const;
const LANDING_VOICES = VOICES.filter((v) => (LANDING_VOICE_IDS as readonly string[]).includes(v.id));

const COST_STEPS = [
  { sec: 60, pts: 20, labelFr: "0–60 s", labelAr: "0–60 ث" },
  { sec: 120, pts: 30, labelFr: "2 min", labelAr: "2 دق" },
  { sec: 180, pts: 40, labelFr: "3 min", labelAr: "3 دق" },
  { sec: 240, pts: 50, labelFr: "4 min", labelAr: "4 دق" },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onLoginClick, onSigninClick, language, setLanguage,
}) => {
  const isRTL = language === "ar";
  const gsapReady = useGsapReady();

  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTesti, setActiveTesti] = useState(0);
  const [featuredId, setFeaturedId] = useState("amine");
  const [listenVoice, setListenVoice] = useState<VoiceCard | null>(null);
  const [legal, setLegal] = useState<null | "cgu" | "privacy">(null);
  const [costIdx, setCostIdx] = useState(0);
  const [pauseRotate, setPauseRotate] = useState(false);
  const [demoText, setDemoText] = useState("");
  const { scrollYProgress } = useScroll();
  const scrolled = useScrolled();

  const { speechSupported, nowPlaying, speak, stopSpeech } = useVoiceDemo();
  const playingId = nowPlaying?.kind === "sample" ? nowPlaying.id : null;

  /* Audio d'intro (opt-in, AUCUN autoplay, analyser réel) */
  const introAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const analyserDataRef = useRef<Uint8Array | null>(null);
  const useAnalyserRef = useRef<boolean>(true);
  const smoothRef = useRef<number>(0);
  const [isIntroPlaying, setIsIntroPlaying] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0);
  const animFrameRef = useRef<number | null>(null);

  const overlayOpen = menuOpen || !!listenVoice || !!legal;

  /* Refs GSAP */
  const rootRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const kickerScrRef = useRef<HTMLSpanElement>(null);
  const consoleRef = useRef<HTMLDivElement>(null);
  const waveLineRef = useRef<SVGPathElement>(null);
  const waveAreaRef = useRef<SVGPathElement>(null);
  const waveSvgRef = useRef<SVGSVGElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const chLabelRef = useRef<HTMLSpanElement>(null);
  const voiceNameRef = useRef<HTMLSpanElement>(null);
  const faderTrackRef = useRef<HTMLDivElement>(null);
  const faderHandleRef = useRef<HTMLDivElement>(null);
  const processRef = useRef<HTMLElement>(null);
  const processTrackRef = useRef<HTMLDivElement>(null);
  const costNumRef = useRef<HTMLSpanElement>(null);
  const ctaTitleRef = useRef<HTMLHeadingElement>(null);

  const dotTweenRef = useRef<any>(null);
  const dotActiveRef = useRef(false);
  const pulseTweenRef = useRef<any>(null);
  const channelYsRef = useRef<number[]>([0, 0, 0]);
  const featuredIdRef = useRef(featuredId);
  useEffect(() => { featuredIdRef.current = featuredId; }, [featuredId]);

  const initialLineD = useCallback(() => waveLine(0), []);
  const initialAreaD = useCallback(() => waveArea(0), []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    document.title = isRTL ? "صوتيفي — صوت طبيعي بالدارجة" : "Sawtify — Voix naturelle en darija";
  }, [language, isRTL]);

  useEffect(() => {
    const sm = (window as any).ScrollSmoother?.get();
    if (overlayOpen) { sm?.paused(true); document.body.style.overflow = "hidden"; }
    else { sm?.paused(false); document.body.style.overflow = ""; }
    return () => { document.body.style.overflow = ""; };
  }, [overlayOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMenuOpen(false); setListenVoice(null); setLegal(null); stopSpeech();
      if (introAudioRef.current) { introAudioRef.current.pause(); setIsIntroPlaying(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stopSpeech]);

  const initAnalyser = useCallback(() => {
    if (audioCtxRef.current || !useAnalyserRef.current || !introAudioRef.current) return;
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AC();
      const src = ctx.createMediaElementSource(introAudioRef.current);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.7;
      src.connect(analyser);
      analyser.connect(ctx.destination);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      analyserDataRef.current = new Uint8Array(analyser.frequencyBinCount);
    } catch (e) {
      useAnalyserRef.current = false;
      console.warn("Analyser indisponible :", e);
    }
  }, []);

  const readLevel = useCallback((): number => {
    if (analyserRef.current && analyserDataRef.current) {
      analyserRef.current.getByteFrequencyData(analyserDataRef.current);
      let sum = 0; const n = 30;
      for (let i = 2; i < n; i++) sum += analyserDataRef.current[i];
      return Math.min(1, (sum / (n - 2) / 255) * 2.2);
    }
    const t = performance.now() * 0.011;
    return Math.min(1, Math.abs(Math.sin(t) * Math.cos(t * 0.7)) * 0.8 + Math.random() * 0.2);
  }, []);

  useEffect(() => {
    const audio = new Audio(INTRO_AUDIO_URL);
    audio.crossOrigin = "anonymous";
    audio.preload = "auto";
    introAudioRef.current = audio;

    audio.onended = () => { setIsIntroPlaying(false); setAudioVolume(0); };
    const tick = () => {
      if (introAudioRef.current && !introAudioRef.current.paused) {
        const raw = readLevel();
        smoothRef.current = smoothRef.current * 0.5 + raw * 0.5;
        setAudioVolume(smoothRef.current);
        animFrameRef.current = requestAnimationFrame(tick);
      } else setAudioVolume(0);
    };
    audio.onplay = () => {
      initAnalyser();
      if (audioCtxRef.current && audioCtxRef.current.state === "suspended") audioCtxRef.current.resume().catch(() => {});
      setIsIntroPlaying(true);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(tick);
    };
    audio.onpause = () => {
      setIsIntroPlaying(false); setAudioVolume(0);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
    audio.onerror = () => {
      if (!useAnalyserRef.current) return;
      useAnalyserRef.current = false;
      audioCtxRef.current = null; analyserRef.current = null;
      audio.removeAttribute("crossorigin");
      audio.src = INTRO_AUDIO_URL;
      audio.load();
    };
    return () => {
      audio.pause();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null; analyserRef.current = null;
    };
  }, [initAnalyser, readLevel]);

  useEffect(() => { stopSpeech(); }, [language, stopSpeech]);

  const stopIntroAudio = useCallback(() => {
    if (introAudioRef.current && !introAudioRef.current.paused) {
      introAudioRef.current.pause();
      setIsIntroPlaying(false);
      setAudioVolume(0);
    }
  }, []);
  const stopAllAudio = useCallback(() => { stopIntroAudio(); stopSpeech(); }, [stopIntroAudio, stopSpeech]);

  /* ================= TEXTES ================= */
  const t = {
    skip: isRTL ? "تخطَّ إلى المحتوى" : "Aller au contenu",
    navVoices: isRTL ? "الأصوات" : "Voix",
    navHow: isRTL ? "كيف يعمل" : "Comment ça marche",
    navPricing: isRTL ? "الأسعار" : "Tarifs",
    navFaq: "FAQ",
    navContact: isRTL ? "تواصل" : "Contact",
    signin: isRTL ? "دخول" : "Connexion",
    start: isRTL ? "ابدأ الآن" : "Commencer",
    tryFree: isRTL ? "تجربة مجانية" : "Essai gratuit",
    pause: isRTL ? "إيقاف" : "Pause",
    playingNow: isRTL ? "قيد التشغيل" : "Lecture",
    audioPreview: isRTL ? "معاينة صوتية" : "Aperçu audio",
    hearIt: isRTL ? "اسمع" : "Écouter",
    dragHint: isRTL ? "اسحب" : "DRAG",
    liveBadge: isRTL ? "v2.1 · متصل" : "v2.1 · En ligne",
    heroKicker: isRTL ? "استوديو الدارجة" : "STUDIO DARIJA",
    heroTitle1: isRTL ? "صوت" : "Une voix",
    heroTitle2: isRTL ? "لا يُفرَّق." : "indiscernable.",
    heroSub: isRTL
      ? "نصّك بالدارجة يولي صوتًا طبيعيًا في 30 ثانية. هنا تسمع البداية فقط… والباقي في الاستوديو."
      : "Votre texte en darija devient une voix naturelle en 30 secondes. Ici, vous n'entendez que le début… la suite est dans le studio.",
    welcomeChip: isRTL ? "50 نقطة مجاناً. بدون بطاقة." : "50 points offerts. Sans carte.",
    creators: isRTL ? "مستخدم" : "créateurs",
    popularKicker: isRTL ? "لا نكشف الكل" : "ON NE MONTRE PAS TOUT",
    popularTitle: isRTL ? "9 أصوات. هنا 3 فقط." : "9 voix. Ici, seulement 3.",
    popularSub: isRTL ? "أمين، ياسمين، خالد. باقي الأصوات تسمعهم في الاستوديو." : "Amine, Yasmine, Khalid. Les autres voix s'écoutent dans le studio.",
    nRatings: isRTL ? "تقييم" : "avis",
    listenInStudio: isRTL ? "اسمع البداية" : "Écouter le début",
    listenBody: isRTL
      ? "هذه أول جملة فقط. الصوت كامل في الاستوديو. 50 نقطة مجاناً، بدون بطاقة."
      : "Ce n'est que la première phrase. La voix entière est dans le studio. 50 points offerts, sans carte.",
    browserNote: isRTL ? "معاينة بمحرك المتصفح — الجودة استوديو 24 kHz داخل التطبيق." : "Aperçu via la voix du navigateur — le rendu studio 24 kHz est dans l'app.",
    noSpeechNote: isRTL ? "متصفحك لا يدعم المعاينة الصوتية." : "Votre navigateur ne supporte pas l'aperçu audio.",
    demoPlaceholder: isRTL ? "اكتب جملة واسمعها…" : "Écrivez une phrase, écoutez-la…",
    journeyKicker: isRTL ? "بدون أن تتكلم" : "SANS MICRO",
    journeyTitle: isRTL ? "أربع خطوات. يخرج الصوت." : "Quatre gestes. La voix sort.",
    journeySub: isRTL ? "بدون كابينة. بدون ميكروفون. بدون انتظار." : "Pas de cabine. Pas de micro. Pas d'attente.",
    useKicker: isRTL ? "أين تستعمله" : "USAGES",
    useTitle: isRTL ? "حين يتكلم، لم يعد نصًا." : "Quand ça parle, ce n'est plus du texte.",
    costKicker: isRTL ? "وبكم" : "ET COMBIEN",
    costTitle: isRTL ? "أقل مما تظن." : "Moins que vous ne croyez.",
    costSub: isRTL ? "20 نقطة لأول 60 ثانية، ثم +10 لكل دقيقة. النقاط لا تنتهي." : "20 points pour les 60 premières secondes, puis +10 par minute. Les points n'expirent pas.",
    metricsKicker: isRTL ? "الأرقام" : "LES CHIFFRES",
    metricsTitle: isRTL ? "الأرقام لا تكذب." : "Les chiffres ne mentent pas.",
    testKicker: isRTL ? "من جرّب" : "ILS ONT TESTÉ",
    testTitle: isRTL ? "من يسمع، يظنّه إنسانًا." : "Qui écoute croit entendre quelqu'un.",
    pricingKicker: isRTL ? "الأسعار" : "TARIFS",
    pricingTitle: isRTL ? "نقاط. بلا اشتراك." : "Des points. Sans abonnement.",
    pricingSub: isRTL ? "بالدينار. بلا تاريخ انتهاء." : "En dinars. Sans date d'expiration.",
    welcomeBanner: isRTL ? "هدية الدخول: 50 نقطة مجاناً عند التسجيل." : "Cadeau d'inscription : 50 points offerts.",
    choose: isRTL ? "اختيار" : "Choisir",
    popular: isRTL ? "الأكثر طلبًا" : "Le plus demandé",
    faqKicker: "FAQ",
    faqTitle: isRTL ? "أسئلة متكررة" : "Questions fréquentes",
    ctaTitle: isRTL ? "تريد أن تسمعه حتى النهاية؟" : "Envie d'entendre la suite ?",
    ctaSub: isRTL ? "50 نقطة مجاناً. 9 أصوات. 3 فقط هنا. بدون بطاقة." : "50 points offerts. 9 voix. 3 seulement ici. Sans carte.",
    footTag: isRTL ? "صُنع في الجزائر" : "Fait en Algérie",
    switchLang: isRTL ? "FR" : "AR",
    close: isRTL ? "إغلاق" : "Fermer",
    open: isRTL ? "القائمة" : "Menu",
    cgu: isRTL ? "شروط الخدمة" : "CGU",
    privacy: isRTL ? "الخصوصية" : "Confidentialité",
    contact: isRTL ? "تواصل" : "Contact",
    pts: isRTL ? "نقطة" : "pts",
    moreVoices: isRTL ? "دخول الاستوديو" : "Accéder au studio",
  };

  const nav = [
    { href: "#voices", label: t.navVoices },
    { href: "#process", label: t.navHow },
    { href: "#pricing", label: t.navPricing },
    { href: "#faq", label: t.navFaq },
    { href: "#contact", label: t.navContact },
  ];

  const featured = VOICES.find((v) => v.id === featuredId) || VOICES[0];
  const chIndex = Math.max(0, LANDING_VOICES.findIndex((v) => v.id === featured.id));
  const sampleFull = isRTL ? featured.sampleAr : featured.sampleFr;
  const [typed, setTyped] = useState("");
  const [cutDone, setCutDone] = useState(false);

  useEffect(() => {
    setTyped(""); setCutDone(false);
    const cutAt = Math.max(32, Math.floor(sampleFull.length * 0.44));
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      if (i >= cutAt) { setTyped(sampleFull.slice(0, cutAt).trimEnd()); setCutDone(true); window.clearInterval(id); }
      else setTyped(sampleFull.slice(0, i));
    }, 22);
    return () => window.clearInterval(id);
  }, [featured.id, sampleFull]);

  useEffect(() => {
    if (listenVoice || pauseRotate || isIntroPlaying || playingId) return;
    const id = window.setInterval(() => {
      setFeaturedId((prev) => {
        const i = LANDING_VOICES.findIndex((v) => v.id === prev);
        return LANDING_VOICES[(i + 1) % LANDING_VOICES.length].id;
      });
    }, 5200);
    return () => window.clearInterval(id);
  }, [listenVoice, pauseRotate, isIntroPlaying, playingId]);

  const journeySteps = [
    { n: "1", t: isRTL ? "اكتب" : "Écrire", d: isRTL ? "ألصق نصك بالدارجة، بالعربية أو بالفرنسية." : "Collez votre texte en darija, en arabe ou en français." },
    { n: "2", t: isRTL ? "اختر" : "Choisir", d: isRTL ? "9 أصوات. هنا نعرض 3 فقط." : "9 voix. Ici, on n'en montre que 3." },
    { n: "3", t: isRTL ? "اضبط" : "Régler", d: isRTL ? "السرعة، النبرة، التأثيرات… الباقي في الاستوديو." : "Vitesse, timbre, effets… le reste est dans le studio." },
    { n: "4", t: isRTL ? "حمّل" : "Télécharger", d: isRTL ? "MP3 أو WAV. بلا علامة مائية. استعمال تجاري." : "MP3 ou WAV. Sans filigrane. Usage commercial." },
  ];

  const uses = [
    { icon: ShoppingBag, t: isRTL ? "تجارة إلكترونية" : "E-commerce", d: isRTL ? "سبوت، عرض، توصيل 58 ولاية." : "Spots, promos, livraison 58 wilayas." },
    { icon: Clapperboard, t: isRTL ? "ريلز وتيك توك" : "Reels & TikTok", d: isRTL ? "صوت قصير وحيوي، جاهز للقصص." : "Voix courte, vive, prête pour les stories." },
    { icon: Mic2, t: isRTL ? "بودكاست ويوتيوب" : "Podcast & YouTube", d: isRTL ? "سرد طويل، نبرة ثابتة." : "Narration longue, timbre stable." },
    { icon: Phone, t: isRTL ? "موزّع هاتفي" : "Standard", d: isRTL ? "مرحبًا، اضغط 1، خدمة الزبائن." : "Bienvenue, tapez 1, service client." },
  ];

  const metrics = [
    { n: 9, s: "", l: isRTL ? "صوت" : "voix" },
    { n: 1200, s: "+", l: isRTL ? "مستخدم" : "créateurs" },
    { n: 50, s: "K+", l: isRTL ? "صوت مُولَّد" : "voix générées" },
    { n: 99, s: "%", l: isRTL ? "لا يُفرَّق" : "indiscernable" },
  ];

  const testimonials = isRTL
    ? [
        { q: "جرّبت 5 منصات قبل صوتيفي. هنا الصوت يبدو بشريًا فعلًا. الزبائن لا يلاحظون الفرق.", n: "أمين ب.", r: "صانع محتوى، الجزائر", img: "AB" },
        { q: "استخدمته لإعلانات تجارية. نتيجة احترافية دون الحاجة إلى استوديو.", n: "ياسمين ق.", r: "وكالة إشهار، وهران", img: "YK" },
        { q: "أفضل صوت جزائري سمعته. طبيعي 100٪ والدفع بالذهبية مريح.", n: "خالد م.", r: "تاجر إلكتروني، قسنطينة", img: "KM" },
      ]
    : [
        { q: "J'ai testé 5 plateformes avant Sawtify. Ici, la voix sonne vraiment humaine. Mes clients ne font pas la différence.", n: "Amine B.", r: "Créateur, Alger", img: "AB" },
        { q: "Utilisé pour mes pubs. Un rendu pro, sans studio.", n: "Yasmine K.", r: "Agence pub, Oran", img: "YK" },
        { q: "La meilleure voix algérienne que j'ai entendue. Naturelle à 100 %, et le paiement Edahabia est simple.", n: "Khaled M.", r: "E-commerçant, Constantine", img: "KM" },
      ];

  useEffect(() => {
    const id = setInterval(() => setActiveTesti((p) => (p + 1) % testimonials.length), 6500);
    return () => clearInterval(id);
  }, [testimonials.length]);

  const pricing = [
    { pts: 100, ptsLabel: "100", price: "500", desc: isRTL ? "للتجربة المرنة والحرة." : "Pour découvrir la plateforme." },
    { pts: 220, ptsLabel: "220", price: "1 000", featured: true, desc: isRTL ? "الأكثر طلبًا — الباقة المثالية." : "Le choix le plus populaire." },
    { pts: 600, ptsLabel: "600", price: "2 500", desc: isRTL ? "لمن يعمل يوميًا — وكالات وصنّاع محتوى." : "Pour un usage régulier — agences et créateurs." },
    { pts: 1350, ptsLabel: "1 350", price: "5 000", desc: isRTL ? "للمحترفين — حجم كبير." : "Pour les professionnels — grands volumes." },
  ];

  const faqs = isRTL
    ? [
        { q: "هل الصوت يبدو كإنسان؟", a: "نعم. دارجة حيّة، 24 kHz. 99٪ ممن يسمعون لا يفرّقون." },
        { q: "هل يمكن استعماله في الإعلان؟", a: "نعم. إعلان، يوتيوب، تيك توك، موزّع — استعمال تجاري كامل، بلا علامة مائية." },
        { q: "كيف تعمل النقاط؟", a: "20 نقطة لـ 0–60 ثانية، ثم +10 لكل دقيقة. لا تنتهي. 50 نقطة مجاناً عند التسجيل." },
        { q: "الذهبية و CIB؟", a: "نعم، SATIM، بالدينار. لا تحتاج بطاقة أجنبية." },
        { q: "هل أجرّب مجانًا؟", a: "نعم. 50 نقطة مجاناً، بدون بطاقة. وهنا 3 أصوات فقط — الباقي في الاستوديو." },
      ]
    : [
        { q: "La voix parle comme quelqu'un ?", a: "Oui. Darija vivante, 24 kHz. 99 % de ceux qui écoutent ne font pas la différence." },
        { q: "Puis-je l'utiliser en pub ?", a: "Oui. Pub, YouTube, TikTok, standard — usage commercial, sans filigrane." },
        { q: "Comment marchent les points ?", a: "20 points pour 0–60 s, puis +10 par minute. Ils n'expirent pas. 50 points offerts à l'inscription." },
        { q: "Edahabia et CIB ?", a: "Oui, SATIM, en dinars. Pas besoin de carte étrangère." },
        { q: "Je peux essayer sans payer ?", a: "Oui. 50 points offerts, sans carte. Ici seulement 3 voix — les autres sont dans le studio." },
      ];

  const trust = [
    { k: "Edahabia", v: isRTL ? "بريد الجزائر" : "La Poste" },
    { k: "CIB", v: isRTL ? "البنوك" : "Banques" },
    { k: "SATIM", v: isRTL ? "دفع آمن" : "Paiement sécurisé" },
    { k: "24 kHz", v: isRTL ? "جودة استوديو" : "Qualité studio" },
    { k: "MP3 · WAV", v: isRTL ? "بلا علامة مائية" : "Sans filigrane" },
  ];

  const smoothTo = useCallback((href: string) => {
    setMenuOpen(false);
    const el = document.querySelector(href);
    if (!el) return;
    const sm = (window as any).ScrollSmoother?.get();
    if (sm) sm.scrollTo(el, true, "top 80px");
    else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" });
  }, []);

  const openListen = (voice: VoiceCard) => {
    stopIntroAudio();
    setFeaturedId(voice.id);
    setListenVoice(voice);
    speak(voice, language);
  };

  const handleToggleIntroAudio = () => {
    if (!introAudioRef.current) return;
    if (isIntroPlaying) introAudioRef.current.pause();
    else { stopSpeech(); introAudioRef.current.play().catch((err) => console.warn("Lecture impossible :", err)); }
  };

  const display = isRTL ? "'Cairo', sans-serif" : "'Space Grotesk', 'Inter', sans-serif";
  const sans = isRTL ? "'Cairo', sans-serif" : "'Inter', sans-serif";
  const ArrowIcon = ({ className = "w-4 h-4" }: { className?: string }) =>
    isRTL ? <ArrowLeft className={className} /> : <ArrowRight className={className} />;

  const legalCopy = {
    cgu: isRTL
      ? "شروط الاستخدام: صوتيفي منصة جزائرية لتحويل النص إلى صوت بالدارجة. الحساب شخصي. النقاط غير قابلة للتحويل نقدًا ولا تنتهي صلاحيتها. الاستعمال التجاري مسموح في حدود القانون الجزائري. يُمنع توليد محتوى غير قانوني أو مسيء. الدفع عبر SATIM (الذهبية / CIB). في حال فشل التوليد، تُعاد النقاط إلى رصيدك."
      : "Conditions d'utilisation : Sawtify est une plateforme algérienne de conversion texte → voix en darija. Le compte est personnel. Les points ne sont pas remboursables en dinars et n'expirent pas. L'usage commercial est autorisé dans le cadre de la loi algérienne. Tout contenu illicite ou injurieux est interdit. Le paiement passe par SATIM (Edahabia / CIB). En cas d'échec de génération, les points sont recrédités.",
    privacy: isRTL
      ? "الخصوصية: نحتفظ بالحد الأدنى من البيانات (البريد، الرصيد، النصوص المولَّدة) لتشغيل الحساب. لا نبيع بياناتك. يمكنك طلب حذف حسابك عبر صفحة التواصل. المدفوعات تُعالَج من طرف SATIM — صوتيفي لا يخزّن أرقام البطاقات."
      : "Confidentialité : nous conservons le minimum (e-mail, solde, textes générés) pour faire fonctionner le compte. Nous ne vendons pas vos données. Vous pouvez demander la suppression du compte via Contact. Les paiements sont traités par SATIM — Sawtify ne stocke aucun numéro de carte.",
  };

  const heroSamplePlaying = playingId === featured.id;
  const heroPlaying = isIntroPlaying || heroSamplePlaying;

  /* GSAP #1 — ScrollSmoother (config légère : pas de normalizeScroll → gros gain perf) */
  useEffect(() => {
    if (!gsapReady) return;
    const w = window as any;
    if (!w.ScrollSmoother.get()) {
      w.ScrollSmoother.create({
        wrapper: "#sw-wrapper",
        content: "#sw-content",
        smooth: 1,
        effects: true,
        normalizeScroll: false,
      });
    }
    document.fonts?.ready.then(() => w.ScrollTrigger.refresh()).catch(() => {});
  }, [gsapReady]);

  useEffect(() => () => { (window as any).ScrollSmoother?.get()?.kill(); }, []);

  /* GSAP #2 — Construction (reconstruite à chaque changement de langue) */
  useEffect(() => {
    if (!gsapReady) return;
    const w = window as any;
    const gsap = w.gsap;
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {

        const computeYs = () => {
          const track = faderTrackRef.current, handle = faderHandleRef.current;
          if (!track || !handle) return;
          const range = track.clientHeight - handle.offsetHeight;
          channelYsRef.current = [0, range / 2, range];
        };
        computeYs();
        const nearestY = (v: number) =>
          channelYsRef.current.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));
        const indexFromY = (y: number) =>
          channelYsRef.current.reduce((best, yy, idx) =>
            (Math.abs(yy - y) < Math.abs(channelYsRef.current[best] - y) ? idx : best), 0);

        if (faderHandleRef.current && faderTrackRef.current) {
          const handle = faderHandleRef.current;
          const syncFromHandle = () => {
            const y = Number(gsap.getProperty(handle, "y"));
            const i = indexFromY(y);
            if (LANDING_VOICES[i] && LANDING_VOICES[i].id !== featuredIdRef.current) {
              stopAllAudio();
              setFeaturedId(LANDING_VOICES[i].id);
            }
          };
          w.Draggable.create(handle, {
            type: "y",
            bounds: faderTrackRef.current,
            inertia: true,
            edgeResistance: 0.82,
            snap: { y: (v: number) => nearestY(v) },
            onDragEnd: syncFromHandle,
            onThrowComplete: syncFromHandle,
          });
          gsap.set(handle, { y: channelYsRef.current[Math.max(0, LANDING_VOICES.findIndex((v) => v.id === featuredIdRef.current))] });
          window.addEventListener("resize", computeYs);
        }

        const splitRefs: any[] = [];
        if (titleRef.current) {
          const split = new w.SplitText(titleRef.current,
            isRTL ? { type: "words", wordsClass: "sw-word" } : { type: "chars,words", charsClass: "sw-char" });
          splitRefs.push(split);
          const tl = gsap.timeline({ defaults: { ease: "sawt" } });
          tl.from(".sw-hero-badge", { y: -14, opacity: 0, duration: 0.6 })
            .to(kickerScrRef.current, { duration: 0.9, scrambleText: { text: t.heroKicker, chars: "upperCase" } }, "-=0.25")
            .from(isRTL ? split.words : split.chars, { yPercent: 110, opacity: 0, duration: 0.9, stagger: 0.028 }, "-=0.35")
            .from(".sw-hero-sub", { y: 18, opacity: 0, duration: 0.7 }, "-=0.5")
            .from(".sw-hero-cta", { y: 16, opacity: 0, stagger: 0.08, duration: 0.6 }, "-=0.4")
            .from(consoleRef.current, { y: 46, opacity: 0, duration: 1 }, "-=0.5")
            .from(waveLineRef.current, { drawSVG: "0% 0%", duration: 1.4, ease: "power2.inOut" }, "-=0.6")
            .from(waveAreaRef.current, { opacity: 0, duration: 0.8 }, "<");
        }

        if (ctaTitleRef.current) {
          const split2 = new w.SplitText(ctaTitleRef.current,
            isRTL ? { type: "words", wordsClass: "sw-word" } : { type: "chars,words", charsClass: "sw-char" });
          splitRefs.push(split2);
          gsap.from(isRTL ? split2.words : split2.chars, {
            yPercent: 60, opacity: 0, duration: 0.8, stagger: 0.02, ease: "sawt",
            scrollTrigger: { trigger: ctaTitleRef.current, start: "top 85%", once: true },
          });
        }

        gsap.utils.toArray<SVGLineElement>(".sw-rule line").forEach((line) => {
          gsap.from(line, {
            drawSVG: "0%", duration: 1.1, ease: "power2.out",
            scrollTrigger: { trigger: line, start: "top 92%", once: true },
          });
        });

        gsap.utils.toArray<HTMLElement>(".sw-reveal").forEach((el) => {
          gsap.from(el, {
            y: 34, opacity: 0, duration: 0.9, ease: "sawt",
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          });
        });

        if (processTrackRef.current && processRef.current) {
          const track = processTrackRef.current, sec = processRef.current;
          const dist = () => Math.max(0, track.scrollWidth - sec.clientWidth + 48);
          gsap.to(track, {
            x: () => (isRTL ? dist() : -dist()),
            ease: "none",
            scrollTrigger: {
              trigger: sec, start: "top top",
              end: () => "+=" + dist(),
              scrub: 1, pin: true, anticipatePin: 1, invalidateOnRefresh: true,
            },
          });
        }

        gsap.utils.toArray<HTMLElement>(".sw-count").forEach((el) => {
          const target = Number(el.dataset.target || 0);
          const suffix = el.dataset.suffix || "";
          const obj = { v: 0 };
          gsap.to(obj, {
            v: target, duration: 1.8, ease: "power2.out",
            scrollTrigger: { trigger: el, start: "top 85%", once: true },
            onUpdate: () => { el.textContent = Math.round(obj.v).toLocaleString("fr-FR") + suffix; },
          });
        });

        gsap.utils.toArray<HTMLElement>(".sw-orb").forEach((orb, i) => {
          gsap.to(orb, { y: i % 2 ? -26 : 22, duration: 3.4 + i * 0.7, repeat: -1, yoyo: true, ease: "sine.inOut" });
        });

        w.ScrollTrigger.refresh();
      }, rootRef);

      return () => {
        try { (w.Draggable.get(faderHandleRef.current) || []).forEach?.((d: any) => d.kill()); } catch { /* noop */ }
        ctx.revert();
      };
    });

    return () => mm.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gsapReady, language]);

  /* GSAP #3 — Morph waveform + scramble au changement de canal */
  useLayoutEffect(() => {
    if (!gsapReady) return;
    const w = window as any;
    const gsap = w.gsap;
    const i = Math.max(0, LANDING_VOICES.findIndex((v) => v.id === featuredId));

    if (waveLineRef.current && waveAreaRef.current) {
      gsap.to(waveLineRef.current, { duration: 0.9, ease: "sawt", morphSVG: waveLine(i) });
      gsap.to(waveAreaRef.current, {
        duration: 0.9, ease: "sawt", morphSVG: waveArea(i),
        onComplete: () => { if (dotActiveRef.current) { dotTweenRef.current?.kill(); startDot(gsap); } },
      });
    }
    if (chLabelRef.current) {
      gsap.to(chLabelRef.current, { duration: 0.5, scrambleText: { text: `CH 0${i + 1}`, chars: "01" } });
    }
    if (voiceNameRef.current) {
      gsap.to(voiceNameRef.current, {
        duration: 0.55,
        scrambleText: { text: isRTL ? LANDING_VOICES[i].nameAr : LANDING_VOICES[i].nameFr, chars: isRTL ? "أبجدهوزحطيكلمنصع" : "upperCase" },
      });
    }
    if (faderHandleRef.current && channelYsRef.current) {
      gsap.to(faderHandleRef.current, { y: channelYsRef.current[i], duration: 0.7, ease: "sawt", overwrite: "auto" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gsapReady, featuredId, language]);

  /* GSAP #4 — Point de signal (MotionPath) + pulsation lecture */
  const startDot = useCallback((gsap: any) => {
    if (!dotRef.current || !waveLineRef.current) return;
    gsap.set(dotRef.current, { opacity: 1 });
    dotTweenRef.current = gsap.to(dotRef.current, {
      duration: 3.2, ease: "none", repeat: -1,
      motionPath: { path: waveLineRef.current, align: waveLineRef.current, alignOrigin: [0.5, 0.5] },
    });
  }, []);

  useLayoutEffect(() => {
    if (!gsapReady) return;
    const w = window as any;
    const gsap = w.gsap;
    if (heroPlaying) {
      dotActiveRef.current = true;
      dotTweenRef.current?.kill();
      startDot(gsap);
      pulseTweenRef.current?.kill();
      if (waveSvgRef.current) {
        pulseTweenRef.current = gsap.to(waveSvgRef.current, { y: -3, duration: 0.8, repeat: -1, yoyo: true, ease: "sine.inOut" });
      }
    } else {
      dotActiveRef.current = false;
      dotTweenRef.current?.kill();
      pulseTweenRef.current?.kill();
      gsap.to(dotRef.current, { opacity: 0, duration: 0.3 });
      gsap.to(waveSvgRef.current, { y: 0, duration: 0.3 });
    }
  }, [gsapReady, heroPlaying, startDot]);

  /* GSAP #5 — Estimateur : re-roll ScrambleText */
  useLayoutEffect(() => {
    if (!gsapReady || !costNumRef.current) return;
    const w = window as any;
    w.gsap.to(costNumRef.current, {
      duration: 0.55, ease: "none", overwrite: true,
      scrambleText: { text: String(COST_STEPS[costIdx].pts), chars: "0123456789", speed: 1.4 },
    });
  }, [costIdx, gsapReady]);

  /* ================= RENDU ================= */
  return (
    <div id="sawtify-landing" ref={rootRef} dir={isRTL ? "rtl" : "ltr"} className="min-h-screen relative" style={{ fontFamily: sans, color: INK }}>
      <GlobalStyles />

      <a href="#home" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-[80] focus:px-4 focus:py-2 focus:rounded-full focus:font-bold focus:text-sm text-white" style={{ background: ACCENT }}>
        {t.skip}
      </a>

      <motion.div aria-hidden className="fixed top-0 inset-x-0 h-[3px] z-[60]"
        style={{ scaleX: scrollYProgress, background: `linear-gradient(90deg, ${ACCENT}, ${MESH.pink})`, transformOrigin: isRTL ? "100% 50%" : "0% 50%" }} />

      {/* ===== MESH GRADIENT — fond fixe de TOUTE la page ===== */}
      <MeshBackground />

      {/* HEADER */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/80 backdrop-blur-xl border-b border-[#17131F]/8" : "bg-transparent"}`}>
        <div className="mx-auto max-w-[1280px] px-5 sm:px-6 h-16 flex items-center justify-between">
          <a href="#home" onClick={(e) => { e.preventDefault(); smoothTo("#home"); }} className="focus-ring flex items-center gap-2.5" aria-label="Sawtify">
            <Logo size={38} />
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.14em] uppercase px-2 py-0.5 rounded-full border"
              style={{ color: ACCENT, borderColor: "rgba(124,58,237,0.35)", background: "rgba(124,58,237,0.08)" }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: ACCENT }} />
              v2.1
            </span>
          </a>
          <nav className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-7 text-[13px] font-semibold text-[#17131F]/60">
            {nav.map((l) => (
              <a key={l.href} href={l.href} onClick={(e) => { e.preventDefault(); smoothTo(l.href); }} className="hover:text-[#17131F] transition-colors focus-ring">{l.label}</a>
            ))}
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button type="button" onClick={() => setLanguage(language === "fr" ? "ar" : "fr")} className="w-10 h-10 rounded-full text-[12px] font-bold text-[#17131F]/60 hover:bg-[#17131F]/5 transition focus-ring" aria-label={isRTL ? "التبديل إلى الفرنسية" : "التبديل إلى العربية"}>
              {t.switchLang}
            </button>
            <button type="button" onClick={onLoginClick} className="hidden md:block text-[13px] font-semibold text-[#17131F]/60 hover:text-[#17131F] px-3 focus-ring">{t.signin}</button>
            <button type="button" onClick={onSigninClick} className="h-10 px-4 sm:px-5 rounded-full text-[13px] sm:text-[14px] font-bold text-white focus-ring transition hover:brightness-110" style={{ background: ACCENT }}>
              {t.start}
            </button>
            <button type="button" onClick={() => setMenuOpen(true)} aria-label={t.open} className="lg:hidden w-10 h-10 rounded-full hover:bg-[#17131F]/5 flex items-center justify-center focus-ring">
              <Menu className="w-5 h-5 text-[#17131F]" />
            </button>
          </div>
        </div>
      </header>

      {/* DRAWER MOBILE */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenuOpen(false)} className="fixed inset-0 z-[55] bg-[#17131F]/40 lg:hidden" />
            <motion.div
              initial={{ x: isRTL ? "-100%" : "100%" }} animate={{ x: 0 }} exit={{ x: isRTL ? "-100%" : "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 280 }}
              className="fixed inset-y-0 end-0 z-[60] w-[85%] max-w-sm bg-white lg:hidden flex flex-col border-s border-[#17131F]/10 shadow-2xl"
            >
              <div className="flex items-center justify-between px-5 h-16 border-b border-[#17131F]/8">
                <Logo size={34} />
                <button type="button" onClick={() => setMenuOpen(false)} className="w-10 h-10 rounded-full hover:bg-[#17131F]/5 flex items-center justify-center focus-ring" aria-label={t.close}>
                  <X className="w-5 h-5 text-[#17131F]" />
                </button>
              </div>
              <nav className="flex-1 px-5 py-6 flex flex-col">
                {nav.map((l) => (
                  <a key={l.href} href={l.href} onClick={(e) => { e.preventDefault(); smoothTo(l.href); }} className="py-4 text-[18px] font-bold text-[#17131F] border-b border-[#17131F]/8 focus-ring">{l.label}</a>
                ))}
                <button type="button" onClick={() => { setMenuOpen(false); onLoginClick(); }} className="mt-4 py-3 text-start text-[16px] font-semibold text-[#17131F]/60">{t.signin}</button>
              </nav>
              <div className="p-5">
                <button type="button" onClick={() => { setMenuOpen(false); onSigninClick(); }} className="w-full h-12 rounded-full font-bold text-white" style={{ background: ACCENT }}>{t.start}</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ================= SMOOTH WRAPPER ================= */}
      <div id="sw-wrapper">
        <div id="sw-content" className="relative z-[1]">

          {/* HERO */}
          <section id="home" className="relative pt-32 pb-16 sm:pb-20 overflow-hidden">
            <div className="relative z-10 mx-auto max-w-[1280px] px-5 sm:px-6">
              <div className="max-w-3xl mx-auto text-center">
                <div className="sw-hero-badge inline-flex items-center gap-2 mb-6 px-3.5 py-1.5 rounded-full border border-[#17131F]/10 bg-white/70 backdrop-blur-md">
                  <span className="relative flex w-1.5 h-1.5">
                    <span className="absolute inset-0 rounded-full animate-pulse" style={{ background: ACCENT }} />
                    <span className="relative rounded-full w-1.5 h-1.5" style={{ background: ACCENT }} />
                  </span>
                  <Mono className="text-[10px] font-semibold tracking-[0.2em] uppercase text-[#17131F]/70">{t.liveBadge}</Mono>
                </div>
                <div className="text-center">
                  <p className="text-[12px] font-bold tracking-[0.18em] uppercase mb-4" style={{ color: ACCENT, fontFamily: MONO_STACK }}>
                    {"// "}<span ref={kickerScrRef}>{t.heroKicker}</span>
                  </p>
                </div>
                <h1 key={language} ref={titleRef} className="text-[clamp(2.8rem,7vw,5.4rem)] leading-[0.98] tracking-[-0.03em] font-bold text-[#17131F]" style={{ fontFamily: display }}>
                  {t.heroTitle1} <span style={{ color: ACCENT }}>{t.heroTitle2}</span>
                </h1>
                <p className="sw-hero-sub mt-6 text-[15px] sm:text-[16px] text-[#17131F]/65 max-w-xl mx-auto leading-relaxed">{t.heroSub}</p>
                <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
                  <button type="button" onClick={() => { stopAllAudio(); onSigninClick(); }}
                    className="sw-hero-cta h-12 px-7 rounded-full text-[14px] font-bold text-white focus-ring transition hover:brightness-110"
                    style={{ background: ACCENT, boxShadow: "0 0 34px rgba(124,58,237,0.35)" }}>
                    {t.tryFree}
                  </button>
                  <button type="button" onClick={handleToggleIntroAudio}
                    className="sw-hero-cta h-12 px-5 rounded-full border border-[#17131F]/15 bg-white/70 backdrop-blur-md hov-accent text-[14px] font-semibold text-[#17131F] flex items-center gap-2.5 transition focus-ring">
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-white" style={{ background: ACCENT }}>
                      {isIntroPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current ms-0.5" />}
                    </span>
                    {isIntroPlaying ? (isRTL ? "إيقاف الصوت" : "Pause de l'intro") : (isRTL ? "تشغيل التقديم" : "Play l'intro")}
                  </button>
                </div>
                <p className="sw-hero-cta mt-4 text-[12px] font-semibold flex items-center justify-center gap-1.5" style={{ color: ACCENT }}>
                  <Gift className="w-3.5 h-3.5" /> {t.welcomeChip}
                </p>
              </div>

              {/* ======== CONSOLE (verre blanc sur le mesh) ======== */}
              <div className="mt-12 max-w-3xl mx-auto"
                onMouseEnter={() => setPauseRotate(true)}
                onMouseLeave={() => setPauseRotate(false)}
                onFocusCapture={() => setPauseRotate(true)}
                onBlurCapture={() => setPauseRotate(false)}
              >
                <div ref={consoleRef}
                  className="rounded-2xl border border-[#17131F]/8 bg-white/75 backdrop-blur-md overflow-hidden shadow-[0_30px_90px_-40px rgba(23,19,31,0.35)]"
                  style={{ "--voice": featured.color } as React.CSSProperties}>

                  <div className="flex items-center gap-1.5 px-4 h-10 border-b border-[#17131F]/8 bg-[#17131F]/[0.02]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]/80" />
                    <Mono className="ms-3 text-[10px] tracking-[0.18em] uppercase text-[#17131F]/40">sawtify · studio</Mono>
                    <span className="ms-auto flex items-center gap-1.5" style={{ color: heroPlaying ? ACCENT : "rgba(23,19,31,0.35)" }}>
                      {heroPlaying && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: ACCENT }} />}
                      <Mono className="text-[10px] font-semibold tracking-[0.18em] uppercase">
                        {heroPlaying ? (isRTL ? "على الهواء" : "on air") : (isRTL ? "جاهز" : "ready")}
                      </Mono>
                    </span>
                  </div>

                  <div className="p-5 sm:p-6 grid grid-cols-[1fr_auto] gap-5">
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Mono dir="ltr" ref={chLabelRef} className="text-[10px] font-semibold tracking-[0.14em] px-1.5 py-0.5 rounded border shrink-0"
                              style={{ color: "var(--voice)", borderColor: "rgba(23,19,31,0.12)", background: "rgba(255,255,255,0.6)" }}>
                              CH 01
                            </Mono>
                            <span ref={voiceNameRef} className="text-[17px] font-bold text-[#17131F] truncate">{isRTL ? featured.nameAr : featured.nameFr}</span>
                          </div>
                          <div className="text-[12px] text-[#17131F]/50 mt-1 truncate">
                            {heroPlaying ? t.audioPreview : `${isRTL ? featured.tagAr : featured.tagFr} · ${featured.location}`}
                          </div>
                        </div>
                        <div className="text-end shrink-0">
                          <Mono className="block text-[10px] tracking-[0.2em] uppercase text-[#17131F]/40">24 kHz</Mono>
                          <div className="text-[13px] font-bold mt-0.5" style={{ color: "var(--voice)" }}>20 {t.pts}</div>
                        </div>
                      </div>

                      <svg ref={waveSvgRef} viewBox="0 0 640 150" className="w-full h-auto mb-4" aria-hidden>
                        <defs>
                          <linearGradient id="swg" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" style={{ stopColor: "var(--voice)", stopOpacity: 0.25 }} />
                            <stop offset="100%" style={{ stopColor: "var(--voice)", stopOpacity: 0 }} />
                          </linearGradient>
                          <filter id="swf" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="4" />
                          </filter>
                        </defs>
                        <path ref={waveAreaRef} d={initialAreaD()} fill="url(#swg)" />
                        <path ref={waveLineRef} d={initialLineD()} fill="none" strokeWidth="2.5" strokeLinecap="round" style={{ stroke: "var(--voice)" }} />
                        <circle ref={dotRef} r="5" style={{ fill: "var(--voice)" }} opacity="0" filter="url(#swf)" />
                      </svg>

                      <p className="text-[13px] leading-relaxed text-[#17131F]/70 min-h-[60px]" dir="auto">
                        {isIntroPlaying ? (
                          isRTL ? "«أنت تستمع حاليًا إلى التقديم الصوتي للمنصة…»" : "« Vous écoutez la présentation audio de la plateforme… »"
                        ) : (
                          <>“{typed}{cutDone ? "…" : ""}”{!cutDone && <span className="caret" aria-hidden />}</>
                        )}
                      </p>
                      {cutDone && !heroPlaying && (
                        <p className="mt-1.5 text-[11px] font-semibold" style={{ color: "var(--voice)" }}>
                          {isRTL ? "— انقطع. أكمل في الاستوديو." : "— coupé. La suite est dans le studio."}
                        </p>
                      )}

                      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                        {LANDING_VOICES.map((v) => {
                          const on = v.id === featured.id;
                          return (
                            <button key={v.id} type="button" onClick={() => { setFeaturedId(v.id); stopAllAudio(); }}
                              className={`shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition focus-ring ${on ? "border-transparent text-white" : "text-[#17131F]/60 border-[#17131F]/10 bg-white/70 hov-accent hover:text-[#17131F]"}`}
                              style={on ? { background: v.color } : undefined}>
                              {isRTL ? v.nameAr : v.nameFr}
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <input dir="auto" value={demoText} maxLength={140}
                          onChange={(e) => setDemoText(e.target.value)}
                          placeholder={t.demoPlaceholder}
                          className="flex-1 h-11 px-4 rounded-xl border border-[#17131F]/12 bg-white/80 text-[13px] text-[#17131F] outline-none transition-colors placeholder:text-[#17131F]/30" />
                        <button type="button"
                          onClick={() => { if (heroSamplePlaying) stopSpeech(); else { stopIntroAudio(); speak(featured, language, demoText.trim() || undefined); } }}
                          disabled={!speechSupported}
                          className="h-11 px-4 rounded-xl border border-[#17131F]/15 bg-white/80 hov-accent text-[13px] font-semibold text-[#17131F] focus-ring disabled:opacity-40 shrink-0">
                          {heroSamplePlaying ? t.pause : t.hearIt}
                        </button>
                      </div>
                      {!speechSupported && <p className="mt-2 text-[11px] text-[#17131F]/45">{t.noSpeechNote}</p>}

                      <button type="button"
                        onClick={() => { if (heroSamplePlaying) stopSpeech(); else { stopIntroAudio(); speak(featured, language); } }}
                        disabled={!speechSupported}
                        className="mt-4 w-full h-12 rounded-xl font-bold text-[14px] text-white flex items-center justify-center gap-2 focus-ring hover:brightness-110 disabled:opacity-40 transition"
                        style={{ background: "var(--voice)" }}>
                        {heroSamplePlaying
                          ? <><Pause className="w-4 h-4 fill-current" />{t.pause}</>
                          : <><Play className="w-4 h-4 fill-current" />{t.listenInStudio}</>}
                      </button>
                    </div>

                    {/* FADER */}
                    <div className="flex flex-col items-center justify-center gap-2 select-none" aria-hidden>
                      <Mono className="text-[9px] tracking-[0.2em] uppercase text-[#17131F]/35">{t.dragHint}</Mono>
                      <div ref={faderTrackRef} className="relative w-12 h-44 rounded-full border border-[#17131F]/10 bg-white/60">
                        <div className="absolute inset-y-2 start-1/2 w-[3px] -translate-x-1/2 rounded-full bg-[#17131F]/10" style={{ insetInlineStart: "50%", transform: "translateX(-50%)" }} />
                        {[0, 1, 2].map((i) => (
                          <span key={i} className="absolute start-1/2 -translate-x-1/2 w-4 h-px bg-[#17131F]/20"
                            style={{ insetInlineStart: "50%", top: `${8 + i * 42}%` }} />
                        ))}
                        <div ref={faderHandleRef} className="sw-fader-handle absolute top-0 start-1/2 -translate-x-1/2 w-12 h-7 rounded-lg"
                          style={{ insetInlineStart: "50%", transform: "translateX(-50%)", background: "linear-gradient(180deg, #FFFFFF, #F1EDFB)", border: "1.5px solid var(--voice)" }}>
                          <div className="absolute inset-x-2 top-1/2 h-[3px] -translate-y-1/2 rounded-full" style={{ background: "var(--voice)" }} />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 items-center">
                        {LANDING_VOICES.map((_, i) => (
                          <Mono key={i} dir="ltr" className="text-[9px] tracking-widest" style={{ color: i === chIndex ? "var(--voice)" : "rgba(23,19,31,0.3)" }}>
                            0{i + 1}
                          </Mono>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Preuve sociale */}
              <div className="mt-8 flex items-center justify-center gap-4 sm:gap-5 text-[12px] text-[#17131F]/50 flex-wrap">
                <div className="flex -space-x-1.5" dir="ltr">
                  {[MESH.purple, MESH.pink, MESH.blue].map((c) => (
                    <div key={c} className="w-7 h-7 rounded-full border-2 border-white" style={{ background: c }} />
                  ))}
                </div>
                <span className="font-bold text-[#17131F]/75"><Num>9</Num> {isRTL ? "أصوات" : "voix"}</span>
                <span>·</span>
                <span><Num>1 200+</Num> {t.creators}</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1"><Star className="w-3 h-3" style={{ color: ACCENT, fill: ACCENT }} /> 4.9 / 5</span>
              </div>
            </div>
          </section>

          {/* TRUST */}
          <section className="py-7" aria-label={isRTL ? "وسائل الدفع والجودة" : "Paiement et qualité"}>
            <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 rounded-2xl border border-[#17131F]/8 bg-white/70 px-6 py-6">
                {trust.map((p) => (
                  <div key={p.k} className="text-center">
                    <div className="text-[14px] font-bold tracking-tight text-[#17131F]">{p.k}</div>
                    <Mono className="block text-[10px] uppercase tracking-[0.14em] text-[#17131F]/45 mt-1">{p.v}</Mono>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* VOICES */}
          <section id="voices" className="py-16 sm:py-24">
            <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
              <svg className="sw-rule w-full h-3 mb-2" aria-hidden><line x1="0" y1="1.5" x2="100%" y2="1.5" /></svg>
              <div className="sw-reveal">
                <SectionHead no="01" kicker={t.popularKicker} title={t.popularTitle} sub={t.popularSub} font={display} />
              </div>
              <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {LANDING_VOICES.map((v, idx) => {
                  const active = playingId === v.id;
                  const name = isRTL ? v.nameAr : v.nameFr;
                  return (
                    <div key={v.id} className="sw-reveal">
                      <article className={`group rounded-2xl border bg-white/80 overflow-hidden card-lift ${active ? "border-[#7C3AED]/50" : "border-[#17131F]/8"}`}>
                        <button type="button" onClick={() => openListen(v)} className="w-full text-start focus-ring cursor-pointer">
                          <div className="px-5 pt-5">
                            <div className="flex items-center justify-between mb-3">
                              <Mono dir="ltr" className="text-[10px] font-semibold tracking-[0.14em] px-1.5 py-0.5 rounded border"
                                style={{ color: v.color, borderColor: `${v.color}55`, background: `${v.color}12` }}>
                                CH {String(idx + 1).padStart(2, "0")}
                              </Mono>
                              <span className="flex items-center gap-1 text-[12px] font-bold text-[#17131F]/70">
                                <Star className="w-3 h-3" style={{ color: v.color, fill: v.color }} /><Num>{v.rating}</Num>
                              </span>
                            </div>
                            <div className="rounded-xl border border-[#17131F]/5 h-24 flex items-center px-3" style={{ background: `${v.color}0A` }}>
                              <Waveform color={v.color} playing={active} bars={26} />
                            </div>
                          </div>
                          <div className="p-5 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="text-[17px] font-bold text-[#17131F] truncate">{name}</h3>
                              <p className="text-[12px] text-[#17131F]/50 mt-0.5 truncate">
                                {isRTL ? v.tagAr : v.tagFr} · {v.location} · <Num>{v.reviews}</Num> {t.nRatings}
                              </p>
                            </div>
                            <span className={`w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 transition ${active ? "scale-105" : "group-hover:scale-105"}`}
                              style={{ background: active ? v.color : "rgba(23,19,31,0.08)" }}>
                              {active ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ms-0.5" />}
                            </span>
                          </div>
                        </button>
                      </article>
                    </div>
                  );
                })}
              </div>
              <button type="button" onClick={() => { stopAllAudio(); onSigninClick(); }}
                className="sw-reveal mt-6 w-full rounded-2xl border border-dashed border-[#17131F]/20 bg-white/50 hov-accent hover:bg-[#7C3AED]/5 transition p-6 text-center focus-ring">
                <div className="text-[19px] font-bold text-[#17131F]" style={{ fontFamily: display }}>{t.moreVoices}</div>
                <p className="mt-1 text-[12px] text-[#17131F]/50">{isRTL ? "لا نعرضهم هنا. ادخل لتسمع." : "On ne les révèle pas ici. Entrez pour écouter."}</p>
              </button>
            </div>
          </section>

          {/* PROCESS — épinglée, scroll horizontal */}
          <section id="process" ref={processRef} className="relative py-16 sm:py-24 overflow-hidden">
            <div className="mx-auto max-w-[1280px] px-5 sm:px-6 mb-10">
              <div className="sw-reveal">
                <SectionHead no="02" kicker={t.journeyKicker} title={t.journeyTitle} sub={t.journeySub} font={display} />
              </div>
            </div>
            <div className={gsapReady ? "overflow-visible" : "overflow-x-auto scrollbar-none"}>
              <div ref={processTrackRef}
                className={gsapReady
                  ? "flex gap-4 w-max px-5 sm:px-8 pb-4"
                  : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-5 sm:px-6"}>
                {journeySteps.map((s) => (
                  <div key={s.n} className="bg-white/85 border border-[#17131F]/8 rounded-2xl p-6 sm:p-7 h-[240px] w-[300px] sm:w-[340px] flex flex-col justify-between shrink-0">
                    <Mono className="text-[13px] font-semibold tracking-[0.2em]" style={{ color: ACCENT }}>0{s.n}</Mono>
                    <div>
                      <h3 className="text-[19px] font-bold text-[#17131F] mb-1.5" style={{ fontFamily: display }}>{s.t}</h3>
                      <p className="text-[12.5px] text-[#17131F]/55 leading-relaxed">{s.d}</p>
                    </div>
                  </div>
                ))}
                <div className="bg-white/85 border border-dashed rounded-2xl p-6 h-[240px] w-[300px] sm:w-[340px] flex flex-col items-start justify-center shrink-0" style={{ borderColor: "rgba(124,58,237,0.45)" }}>
                  <Headphones className="w-8 h-8 mb-4" style={{ color: ACCENT }} strokeWidth={1.5} />
                  <p className="text-[16px] font-bold text-[#17131F]" style={{ fontFamily: display }}>{t.moreVoices}</p>
                  <button type="button" onClick={() => { stopAllAudio(); onSigninClick(); }}
                    className="mt-4 h-10 px-5 rounded-xl font-bold text-[13px] text-white focus-ring hover:brightness-110" style={{ background: ACCENT }}>
                    {t.tryFree}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* USES */}
          <section className="py-16 sm:py-24">
            <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
              <svg className="sw-rule w-full h-3 mb-2" aria-hidden><line x1="0" y1="1.5" x2="100%" y2="1.5" /></svg>
              <div className="sw-reveal">
                <SectionHead no="03" kicker={t.useKicker} title={t.useTitle} font={display} />
              </div>
              <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[#17131F]/10 rounded-2xl overflow-hidden border border-[#17131F]/10">
                {uses.map((u) => (
                  <div key={u.t} className="sw-reveal bg-white/85">
                    <div className="p-6 h-full">
                      <div className="w-10 h-10 rounded-xl border border-[#17131F]/8 bg-[#7C3AED]/10 flex items-center justify-center mb-4" style={{ color: ACCENT }}>
                        <u.icon className="w-[18px] h-[18px]" />
                      </div>
                      <h3 className="text-[15px] font-bold text-[#17131F] mb-1">{u.t}</h3>
                      <p className="text-[12.5px] text-[#17131F]/55 leading-relaxed">{u.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* COST */}
          <section className="py-16 sm:py-24">
            <div className="mx-auto max-w-[1280px] px-5 sm:px-6 grid lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-5">
                <div className="sw-reveal">
                  <SectionHead no="04" kicker={t.costKicker} title={t.costTitle} sub={t.costSub} font={display} />
                  <ul className="mt-6 space-y-2.5 text-[13px] text-[#17131F]/70">
                    {[
                      isRTL ? "50 نقطة مجاناً عند التسجيل." : "50 points offerts à l'inscription.",
                      isRTL ? "النقاط بلا تاريخ انتهاء." : "Points valables à vie.",
                      isRTL ? "الدفع بالدينار عبر SATIM." : "Paiement en DZD via SATIM.",
                    ].map((line) => (
                      <li key={line} className="flex items-start gap-2">
                        <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: ACCENT }} />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="lg:col-span-7">
                <div className="sw-reveal rounded-2xl border border-[#17131F]/8 bg-white/85 p-6 sm:p-8">
                  <Mono className="block text-[10px] tracking-[0.22em] uppercase text-[#17131F]/40 mb-4">{isRTL ? "احسب" : "Estimateur"}</Mono>
                  <div className="grid grid-cols-4 gap-2 mb-6">
                    {COST_STEPS.map((s, i) => (
                      <button key={s.sec} type="button" onClick={() => setCostIdx(i)}
                        className={`py-2.5 rounded-xl text-[12px] font-bold transition focus-ring ${costIdx === i ? "text-white" : "text-[#17131F]/60 border border-[#17131F]/10 bg-white/70 hover:text-[#17131F]"}`}
                        style={costIdx === i ? { background: ACCENT } : undefined}>
                        {isRTL ? s.labelAr : s.labelFr}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-end justify-between gap-4 flex-wrap">
                    <div>
                      <Mono className="block text-[10px] uppercase tracking-[0.18em] text-[#17131F]/40 mb-1">{isRTL ? "التكلفة" : "Coût"}</Mono>
                      <div className="text-[52px] leading-none font-bold text-[#17131F]" style={{ fontFamily: NUM_STACK }}>
                        <Num><span ref={costNumRef}>{COST_STEPS[costIdx].pts}</span></Num>
                        <span className="text-[15px] font-semibold text-[#17131F]/40 ms-2">{t.pts}</span>
                      </div>
                    </div>
                    <button type="button" onClick={() => { stopAllAudio(); onSigninClick(); }}
                      className="h-11 px-5 rounded-xl font-bold text-[13px] text-white focus-ring hover:brightness-110 transition" style={{ background: ACCENT }}>
                      {t.tryFree}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* METRICS */}
          <section className="py-16 sm:py-24">
            <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
              <div className="sw-reveal">
                <SectionHead no="05" kicker={t.metricsKicker} title={t.metricsTitle} center font={display} />
              </div>
              <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-px bg-[#17131F]/10 rounded-2xl overflow-hidden border border-[#17131F]/10">
                {metrics.map((m) => (
                  <div key={m.l} className="bg-white/85">
                    <div className="p-8 text-center">
                      <div className="sw-count text-[clamp(2.2rem,4.2vw,3rem)] leading-none font-bold text-[#17131F] mb-2"
                        style={{ fontFamily: NUM_STACK }} data-target={m.n} data-suffix={m.s}>
                        {m.n.toLocaleString("fr-FR")}{m.s}
                      </div>
                      <Mono className="text-[10px] uppercase tracking-[0.2em] text-[#17131F]/45">{m.l}</Mono>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* TESTIMONIALS */}
          <section className="py-16 sm:py-24">
            <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
              <div className="sw-reveal">
                <SectionHead no="06" kicker={t.testKicker} title={t.testTitle} center font={display} />
              </div>
              <div className="mt-12 max-w-3xl mx-auto">
                <AnimatePresence mode="wait">
                  <motion.div key={activeTesti} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.4 }} className="text-center">
                    <div className="flex justify-center gap-1 mb-5">
                      {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="w-4 h-4" style={{ color: ACCENT, fill: ACCENT }} />)}
                    </div>
                    <blockquote className="text-[clamp(1.25rem,2.6vw,1.8rem)] leading-[1.35] font-semibold text-[#17131F]" style={{ fontFamily: display }}>
                      “{testimonials[activeTesti].q}”
                    </blockquote>
                    <div className="mt-7 flex items-center justify-center gap-3">
                      <div className="w-11 h-11 rounded-full flex items-center justify-center text-[13px] font-bold text-white" style={{ background: `linear-gradient(135deg, ${ACCENT}, ${MESH.pink})` }}>
                        {testimonials[activeTesti].img}
                      </div>
                      <div className="text-start">
                        <div className="text-[13.5px] font-bold text-[#17131F]">{testimonials[activeTesti].n}</div>
                        <div className="text-[12px] text-[#17131F]/50">{testimonials[activeTesti].r}</div>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
                <div className="mt-8 flex items-center justify-center gap-4">
                  <button type="button" onClick={() => setActiveTesti((p) => (p - 1 + testimonials.length) % testimonials.length)}
                    className="w-10 h-10 rounded-full border border-[#17131F]/15 bg-white/70 hov-accent text-[#17131F]/60 flex items-center justify-center focus-ring" aria-label={isRTL ? "السابق" : "Précédent"}>
                    {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                  </button>
                  <div className="flex items-center gap-2">
                    {testimonials.map((_, i) => (
                      <button key={i} type="button" onClick={() => setActiveTesti(i)} aria-label={`${i + 1}`}
                        className={`h-1.5 rounded-full transition-all ${i === activeTesti ? "w-6" : "w-1.5 bg-[#17131F]/20 hover:bg-[#17131F]/40"}`}
                        style={i === activeTesti ? { background: ACCENT } : undefined} />
                    ))}
                  </div>
                  <button type="button" onClick={() => setActiveTesti((p) => (p + 1) % testimonials.length)}
                    className="w-10 h-10 rounded-full border border-[#17131F]/15 bg-white/70 hov-accent text-[#17131F]/60 flex items-center justify-center focus-ring" aria-label={isRTL ? "التالي" : "Suivant"}>
                    {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* PRICING */}
          <section id="pricing" className="py-16 sm:py-24">
            <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
              <div className="sw-reveal">
                <SectionHead no="07" kicker={t.pricingKicker} title={t.pricingTitle} sub={t.pricingSub} center font={display} />
              </div>
              <div className="sw-reveal mb-10 mt-10 max-w-2xl mx-auto flex items-start gap-3 rounded-xl border px-4 py-3.5 text-[13px] text-[#17131F]/75"
                style={{ borderColor: "rgba(124,58,237,0.3)", background: "rgba(124,58,237,0.06)" }}>
                <Gift className="w-4 h-4 mt-0.5 shrink-0" style={{ color: ACCENT }} />
                <span>{t.welcomeBanner}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {pricing.map((p) => (
                  <div key={p.pts} className="sw-reveal">
                    <div className={`relative rounded-2xl border p-6 h-full flex flex-col ${p.featured ? "border-transparent text-white" : "border-[#17131F]/8 bg-white/85 card-lift"}`}
                      style={p.featured ? { background: `linear-gradient(160deg, ${ACCENT} 0%, ${MESH.pink} 130%)`, boxShadow: "0 22px 50px -20px rgba(124,58,237,0.5)" } : undefined}>
                      {p.featured && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold tracking-[0.12em] uppercase whitespace-nowrap text-[#17131F]" style={{ background: "#fff" }}>
                          {t.popular}
                        </div>
                      )}
                      <div className="text-[42px] leading-none font-bold mb-1" style={{ fontFamily: NUM_STACK }}><Num>{p.ptsLabel}</Num></div>
                      <Mono className="block text-[10px] uppercase tracking-[0.2em] mb-4" style={{ color: p.featured ? "rgba(255,255,255,0.7)" : "rgba(23,19,31,0.4)" }}>{t.pts}</Mono>
                      <div className="h-px mb-4" style={{ background: p.featured ? "rgba(255,255,255,0.25)" : "rgba(23,19,31,0.1)" }} />
                      <p className={`text-[12px] mb-5 flex-1 leading-relaxed ${p.featured ? "text-white/85" : "text-[#17131F]/60"}`}>{p.desc}</p>
                      <div className="flex items-baseline gap-1.5 mb-5">
                        <span className="text-[24px] font-bold"><Num>{p.price}</Num></span>
                        <span className={`text-[11px] font-semibold ${p.featured ? "text-white/70" : "text-[#17131F]/40"}`}>DZD</span>
                      </div>
                      <button type="button" onClick={() => { stopAllAudio(); onSigninClick(); }}
                        className={`h-11 rounded-xl text-[13px] font-bold transition focus-ring ${p.featured ? "bg-white text-[#17131F] hover:brightness-95" : "bg-[#17131F] text-white hover:bg-[#7C3AED]"}`}>
                        {t.choose}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section id="faq" className="py-16 sm:py-24">
            <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
              <div className="grid lg:grid-cols-12 gap-10">
                <div className="lg:col-span-4">
                  <div className="sw-reveal">
                    <SectionHead no="08" kicker={t.faqKicker} title={t.faqTitle} font={display} />
                  </div>
                </div>
                <div className="lg:col-span-7 lg:col-start-6">
                  <div className="sw-reveal bg-white/85 rounded-2xl border border-[#17131F]/8 overflow-hidden">
                    {faqs.map((f, i) => {
                      const open = openFaq === i;
                      return (
                        <div key={f.q} className="border-b border-[#17131F]/8 last:border-b-0">
                          <button type="button" onClick={() => setOpenFaq(open ? null : i)}
                            className="w-full py-5 px-5 sm:px-6 flex items-center gap-4 text-start focus-ring group" aria-expanded={open}>
                            <span className="flex-1 text-[14.5px] font-semibold text-[#17131F] group-hover:text-[#7C3AED] transition-colors">{f.q}</span>
                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all ${open ? "rotate-45 text-white" : "text-[#17131F]/60 bg-[#17131F]/5"}`}
                              style={open ? { background: ACCENT } : undefined}>
                              <Plus className="w-4 h-4" />
                            </span>
                          </button>
                          <AnimatePresence initial={false}>
                            {open && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28 }} className="overflow-hidden">
                                <p className="pb-5 px-5 sm:px-6 pe-14 text-[13px] text-[#17131F]/60 leading-relaxed">{f.a}</p>
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

          {/* CTA FINAL — panneau violet/rose qui rappelle le mesh */}
          <section className="py-16 sm:py-24">
            <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
              <div className="sw-reveal relative rounded-[28px] p-12 sm:p-16 text-center text-white overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, #8b5cf6 45%, ${MESH.pink} 120%)` }}>
                <div className="sw-orb absolute top-8 start-[15%] w-40 h-40 rounded-full blur-3xl" style={{ background: "rgba(255,255,255,0.25)" }} data-speed="0.9" aria-hidden />
                <div className="sw-orb absolute bottom-8 end-[15%] w-48 h-48 rounded-full blur-3xl" style={{ background: "rgba(255,255,255,0.18)" }} data-speed="1.1" aria-hidden />
                <div className="relative">
                  <h2 key={language} ref={ctaTitleRef} className="text-[clamp(2.1rem,5vw,3.8rem)] leading-[1.04] tracking-[-0.02em] font-bold" style={{ fontFamily: display }}>
                    {t.ctaTitle}
                  </h2>
                  <p className="mt-4 text-[15px] text-white/75 max-w-md mx-auto">{t.ctaSub}</p>
                  <button type="button" onClick={() => { stopAllAudio(); onSigninClick(); }}
                    className="mt-8 inline-flex items-center gap-2 h-14 px-8 rounded-full font-bold text-[15px] text-[#17131F] transition focus-ring hover:scale-[1.02]"
                    style={{ background: "#fff", boxShadow: "0 16px 40px -12px rgba(0,0,0,0.35)" }}>
                    {t.tryFree}<ArrowIcon className="w-4 h-4" />
                  </button>
                  <Mono className="block mt-5 text-[10px] uppercase tracking-[0.2em] text-white/70">
                    {isRTL ? "بدون بطاقة · 50 نقطة مجاناً" : "Sans carte · 50 points offerts"}
                  </Mono>
                </div>
              </div>
            </div>
          </section>

          {/* FOOTER */}
          <footer id="contact" className="pt-12 pb-28 sm:pb-12">
            <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
                <div className="lg:col-span-2">
                  <Logo size={38} />
                  <p className="mt-4 text-[13px] text-[#17131F]/55 max-w-sm leading-relaxed">
                    {isRTL
                      ? "استوديو صوتي جزائري. نصّك بالدارجة يولي صوتًا طبيعيًا، جاهزًا للإعلان."
                      : "Studio vocal algérien. Votre texte en darija devient une voix naturelle, prête pour la pub."}
                  </p>
                  <p className="mt-3 text-[12px] font-semibold text-[#17131F]/70 flex items-center gap-2">
                    <Headphones className="w-3.5 h-3.5" style={{ color: ACCENT }} /> Alger, Algérie · {t.footTag}
                  </p>
                </div>
                <div>
                  <Mono className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-[#17131F]/40 mb-3">{isRTL ? "المنصة" : "Produit"}</Mono>
                  <div className="flex flex-col gap-2 text-[13px] font-medium">
                    {nav.map((l) => (
                      <a key={l.href} href={l.href} onClick={(e) => { e.preventDefault(); smoothTo(l.href); }} className="text-[#17131F]/60 hover:text-[#7C3AED] transition-colors">{l.label}</a>
                    ))}
                  </div>
                </div>
                <div>
                  <Mono className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-[#17131F]/40 mb-3">{t.contact}</Mono>
                  <a href="mailto:contact@sawtify.dz" className="text-[13px] font-semibold text-[#17131F]/70 hover:text-[#7C3AED] transition-colors">contact@sawtify.dz</a>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {["Edahabia", "CIB", "SATIM"].map((p) => (
                      <span key={p} className="text-[10px] font-bold px-2 py-1 rounded-full border border-[#17131F]/10 bg-white/60 text-[#17131F]/60">{p}</span>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center gap-1.5 text-[11px] text-[#17131F]/50">
                    <ShieldCheck className="w-3.5 h-3.5" style={{ color: ACCENT }} />
                    {isRTL ? "دفع آمن، لا نخزّن رقم البطاقة." : "Paiement sécurisé, aucune carte stockée."}
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-[#17131F]/10 text-[12px] text-[#17131F]/45">
                <span>© <Num>2026</Num> Sawtify · {t.footTag}</span>
                <div className="flex items-center gap-4">
                  <button type="button" onClick={() => setLegal("cgu")} className="hover:text-[#7C3AED] transition-colors">{t.cgu}</button>
                  <button type="button" onClick={() => setLegal("privacy")} className="hover:text-[#7C3AED] transition-colors">{t.privacy}</button>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </div>
      {/* ================= FIN SMOOTH WRAPPER ================= */}

      {/* CTA MOBILE STICKY */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 p-3 bg-white/90 backdrop-blur-xl border-t border-[#17131F]/8">
        <button type="button" onClick={() => { stopAllAudio(); onSigninClick(); }}
          className="w-full h-12 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 text-white" style={{ background: ACCENT }}>
          {t.tryFree} · 50 {t.pts}
        </button>
      </div>

      {/* MODALE ÉCOUTE */}
      <AnimatePresence>
        {listenVoice && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-[#17131F]/40" onClick={() => { setListenVoice(null); stopSpeech(); }} />
            <motion.div role="dialog" aria-modal="true" aria-labelledby="listen-title"
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
              className="fixed z-[71] inset-x-4 bottom-6 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md bg-white border border-[#17131F]/10 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <Mono className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-[#17131F]/40 mb-1">{t.listenInStudio}</Mono>
                  <h3 id="listen-title" className="text-[22px] font-bold text-[#17131F]">{isRTL ? listenVoice.nameAr : listenVoice.nameFr}</h3>
                  <p className="text-[12px] text-[#17131F]/50">{isRTL ? listenVoice.tagAr : listenVoice.tagFr} · {listenVoice.location}</p>
                </div>
                <button type="button" onClick={() => { setListenVoice(null); stopSpeech(); }} className="w-9 h-9 rounded-full hover:bg-[#17131F]/5 flex items-center justify-center focus-ring" aria-label={t.close}>
                  <X className="w-4 h-4 text-[#17131F]" />
                </button>
              </div>
              <div className="rounded-xl border border-[#17131F]/5 p-4 mb-4" style={{ background: `${listenVoice.color}0D` }}>
                <Waveform color={listenVoice.color} playing={playingId === listenVoice.id} bars={30} />
                <button type="button"
                  onClick={() => (playingId === listenVoice.id ? stopSpeech() : speak(listenVoice, language))}
                  disabled={!speechSupported}
                  className="mt-3 w-full h-11 rounded-xl font-bold text-[13px] text-white flex items-center justify-center gap-2 focus-ring hover:brightness-110 disabled:opacity-40 transition"
                  style={{ background: listenVoice.color }}>
                  {playingId === listenVoice.id
                    ? <><Pause className="w-4 h-4 fill-current" />{t.pause}</>
                    : <><Play className="w-4 h-4 fill-current" />{t.listenInStudio}</>}
                </button>
                <p className="mt-2 text-[11px] text-center text-[#17131F]/45">{speechSupported ? t.browserNote : t.noSpeechNote}</p>
              </div>
              <p className="text-[13px] leading-relaxed text-[#17131F]/70 mb-2" dir="auto">
                “{(isRTL ? listenVoice.sampleAr : listenVoice.sampleFr).slice(0, 52).trimEnd()}…”
              </p>
              <p className="text-[13px] text-[#17131F]/60 leading-relaxed mb-5">{t.listenBody}</p>
              <button type="button" onClick={() => { stopAllAudio(); onSigninClick(); }}
                className="w-full h-12 rounded-xl font-bold text-[14px] text-white transition hover:brightness-110" style={{ background: ACCENT }}>
                {t.moreVoices} — {isRTL ? listenVoice.nameAr : listenVoice.nameFr}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* LÉGAL */}
      <AnimatePresence>
        {legal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-[#17131F]/40" onClick={() => setLegal(null)} />
            <motion.div role="dialog" aria-modal="true"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="fixed z-[71] inset-x-4 top-[12%] sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-lg bg-white border border-[#17131F]/10 rounded-2xl p-6 shadow-2xl max-h-[70vh] overflow-y-auto scrollbar-none">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[18px] font-bold text-[#17131F]">{legal === "cgu" ? t.cgu : t.privacy}</h3>
                <button type="button" onClick={() => setLegal(null)} className="w-9 h-9 rounded-full hover:bg-[#17131F]/5 flex items-center justify-center focus-ring" aria-label={t.close}>
                  <X className="w-4 h-4 text-[#17131F]" />
                </button>
              </div>
              <p className="text-[13px] leading-relaxed text-[#17131F]/60">{legalCopy[legal]}</p>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* DOCK AUDIO */}
      <AudioDock isPlaying={isIntroPlaying} volume={audioVolume}
        onToggle={handleToggleIntroAudio} isRTL={isRTL} hidden={overlayOpen} />
    </div>
  );
};

export default LandingPage;
