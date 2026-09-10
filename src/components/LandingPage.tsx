import { useEffect, useState } from "react";
import {
  ArrowDown, ArrowRight, ArrowUpRight, CalendarDays, Check,
  ChevronDown, Clock3, Menu, Minus, Sparkles, Star, X,
} from "lucide-react";

const ACCENT = "#6E5FE8";
const INK = "#0F0F1A";
const PAPER = "#FAFAF7";
const LOGO = "https://i.ibb.co/nqShkPNP/68126702-75e5-4de6-9b53-e51800b05e4a.jpg";
const INTRO_AUDIO_URL = "https://res.cloudinary.com/gz65ybug/video/upload/v1788998622/discution.wav";

const images = {
  hero: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=85",
  detail: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=85",
  texture: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=900&q=85",
  salon: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1000&q=85",
  portrait: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=85",
  hands: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=85",
  editorial: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=900&q=85",
};

type Props = { onLoginClick: () => void; onSigninClick: () => void; language: "fr" | "ar"; setLanguage: (l:"fr"|"ar")=>void };

export default function LandingPage({ onLoginClick, onSigninClick, language, setLanguage }: Props) {
  const isRTL = language === "ar";
  const [menuOpen, setMenuOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [activeRitual, setActiveRitual] = useState(0);
  const [isIntroPlaying, setIsIntroPlaying] = useState(false);

  // --- AUDIO AUTO PLAY (Déclenchement première interaction) ---
  useEffect(() => {
    const audio = new Audio(INTRO_AUDIO_URL);
    audio.preload = "auto";
    const handleFirst = () => {
      audio.play().then(() => setIsIntroPlaying(true)).catch(()=>{});
      window.removeEventListener("click", handleFirst);
      window.removeEventListener("scroll", handleFirst);
    };
    window.addEventListener("click", handleFirst, { once: true });
    window.addEventListener("scroll", handleFirst, { once: true });
    return () => { window.removeEventListener("click", handleFirst); audio.pause(); };
  }, []);

  useEffect(() => {
    document.title = isRTL ? "صوتيفي — استوديو صوت طبيعي" : "Sawtify — Studio vocal IA";
    const onScroll = () => setScrolled(window.scrollY > 28);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isRTL]);

  useEffect(() => { document.body.style.overflow = (menuOpen || bookingOpen) ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [menuOpen, bookingOpen]);

  const scrollTo = (href: string) => { setMenuOpen(false); document.querySelector(href)?.scrollIntoView({ behavior: "smooth" }); };

  const navItems = [
    { label: isRTL ? "الأصوات" : "Voix", href: "#rituels" },
    { label: isRTL ? "كيف يعمل" : "Processus", href: "#univers" },
    { label: isRTL ? "الأسعار" : "Tarifs", href: "#adresse" },
  ];

  const rituals = [
    {
      number: "01",
      title: isRTL ? "أمين — صوت تجاري" : "Amine — Voix commerciale",
      description: isRTL ? "نصك يتنفس. صوت واضح ومباشر، جاهز لإعلاناتك وتواصلك التجاري." : "Votre texte respire. Une voix directe et claire, prête pour vos publicités et campagnes.",
      time: "30 — 60 s",
      image: images.detail,
      tag: isRTL ? "التجاري" : "Le commercial",
    },
    {
      number: "02",
      title: isRTL ? "ياسمين — صوت إعلاني" : "Yasmine — Voix publicitaire",
      description: isRTL ? "نبرة حيوية، مثالية للريلز والقصص القصيرة والأصوات التي تحتاج لفت الانتباه فورًا." : "Un ton vif, parfait pour les Reels et stories qui doivent capter l'attention immédiatement.",
      time: "30 — 90 s",
      image: images.texture,
      tag: isRTL ? "الإعلان" : "La pub",
    },
    {
      number: "03",
      title: isRTL ? "خالد — صوت وثائقي" : "Khalid — Voix documentaire",
      description: isRTL ? "دقة وهدوء. مثالي للوثائقيات، البودكاست، والمحتوى الرسمي الذي يحتاج مصداقية." : "Précision et calme. Idéal pour les documentaires, podcasts et contenus officiels qui demandent crédibilité.",
      time: "60 — 180 s",
      image: images.portrait,
      tag: isRTL ? "الوثائقي" : "Le documentaire",
    },
  ];

  const faqs = [
    { q: isRTL ? "هل الصوت يبدو كإنسان؟" : "La voix parle comme un humain ?",
      a: isRTL ? "نعم. دارجة حيّة، 24 kHz. 99٪ ممن يسمعون لا يفرّقون." : "Oui. Darija vivante, 24 kHz. 99% de ceux qui écoutent ne font pas la différence." },
    { q: isRTL ? "هل يمكن استعماله في الإعلان؟" : "Puis-je l'utiliser pour la pub ?",
      a: isRTL ? "نعم. إعلان، يوتيوب، تيك توك — استعمال تجاري كامل، بلا علامة مائية." : "Oui. Pub, YouTube, TikTok — usage commercial complet, sans filigrane." },
    { q: isRTL ? "كيف تعمل النقاط؟" : "Comment fonctionnent les points ?",
      a: isRTL ? "20 نقطة لـ 0–60 ثانية، ثم +10 لكل دقيقة. لا تنتهي. 50 نقطة عند التسجيل." : "20 points pour 0-60s, puis +10 par minute. Ils n'expirent pas. 50 points à l'inscription." },
  ];

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-[#F8F7F4]" style={{ fontFamily: isRTL ? "'Cairo', sans-serif" : "'Inter', sans-serif", color: INK }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,400&family=Inter:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; -webkit-font-smoothing: antialiased; }
        html { scroll-behavior: smooth; }
        body { margin: 0; background: #F8F7F4; color: #0F0F1A; overflow-x: hidden; }
        ::selection { background: ${ACCENT}; color: #fff; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #F8F7F4; }
        ::-webkit-scrollbar-thumb { background: #ddd; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: ${ACCENT}; }
        
        .brand { font-family: 'Cormorant Garamond', serif; font-weight: 600; letter-spacing: -0.02em; color: #0F0F1A; text-decoration: none; font-size: 22px; display: inline-flex; align-items: center; gap: 10px; }
        .brand-mark { display: inline-flex; gap: 3px; width: 24px; height: 24px; }
        .brand-mark span { display: block; width: 8px; height: 8px; border-radius: 50%; background: ${ACCENT}; }
        .brand-mark span:nth-child(2) { opacity: 0.6; }
        .brand-mark span:nth-child(3) { opacity: 0.3; }
        
        .site-header { position: fixed; top: 0; left: 0; right: 0; z-index: 50; padding: 18px 32px; display: flex; align-items: center; justify-content: space-between; transition: background .3s; }
        .site-header.is-scrolled { background: rgba(248,247,244,0.92); backdrop-filter: blur(14px); box-shadow: 0 1px 0 rgba(0,0,0,.05); }
        
        .hero-section { position: relative; min-height: 100dvh; display: flex; align-items: center; padding: 140px 32px 100px; overflow: hidden; }
        .hero-copy { max-width: 640px; z-index: 10; }
        h1 { font-family: 'Cormorant Garamond', serif; font-weight: 300; line-height: 1.05; letter-spacing: -0.035em; font-size: clamp(3.2rem, 6vw, 5.5rem); color: #0F0F1A; }
        h1 em { font-style: italic; font-weight: 400; color: ${ACCENT}; }
        .eyebrow { font-family: 'Inter', sans-serif; font-weight: 500; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #6E5FE8; margin-bottom: 16px; display: inline-flex; align-items: center; gap: 10px; }
        .eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: ${ACCENT}; display: inline-block; }
        
        .hero-visual { position: absolute; top: 0; right: 0; width: 55%; height: 100%; z-index: 0; }
        .hero-visual img { width: 100%; height: 100%; object-fit: cover; filter: contrast(0.95); }
        .hero-card { position: absolute; border-radius: 24px; overflow: hidden; box-shadow: 0 30px 60px rgba(0,0,0,.15); z-index: 5; }
        .hero-card img { width: 100%; height: 100%; object-fit: cover; }
        .hero-card-main { width: 380px; height: 520px; top: 15%; right: 10%; }
        .hero-card-back { width: 280px; height: 360px; top: 55%; right: 38%; opacity: 0.95; }
        
        .floating-pill { position: absolute; z-index: 6; background: rgba(255,255,255,0.9); backdrop-filter: blur(6px); border: 1px solid rgba(0,0,0,.06); border-radius: 100px; padding: 8px 14px; font-family: 'Inter'; font-size: 12px; font-weight: 600; color: #0F0F1A; box-shadow: 0 10px 30px rgba(0,0,0,.08); }
        .pill-scent { top: 22%; right: 42%; }
        .pill-place { bottom: 18%; right: 8%; }
        
        .glow { position: absolute; width: 500px; height: 500px; background: radial-gradient(circle, rgba(110,95,232,0.15) 0%, transparent 70%); top: 10%; left: 10%; z-index: 1; pointer-events: none; border-radius: 50%; }
        
        .button { display: inline-flex; align-items: center; gap: 8px; padding: 14px 28px; border-radius: 100px; font-family: 'Inter'; font-weight: 600; font-size: 14px; text-decoration: none; transition: all .2s; border: none; cursor: pointer; }
        .button-dark { background: #0F0F1A; color: #fff; box-shadow: 0 15px 40px rgba(15,15,26,.25); }
        .button-dark:hover { background: ${ACCENT}; transform: translateY(-2px); }
        .button-accent { background: ${ACCENT}; color: #fff; box-shadow: 0 15px 40px rgba(110,95,232,.3); }
        .button-accent:hover { background: #5B4DD8; transform: translateY(-2px); }
        
        .section-intro { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; margin-bottom: 64px; }
        .section-index { font-family: 'Cormorant Garamond'; font-size: 14px; color: #aaa; letter-spacing: 0.05em; }
        
        .manifesto-section { padding: 120px 32px; background: #fff; position: relative; }
        .manifesto-content { max-width: 900px; }
        .manifesto-content h2 { font-family: 'Cormorant Garamond'; font-weight: 300; font-size: clamp(2.5rem, 4vw, 3.8rem); line-height: 1.05; letter-spacing: -0.03em; color: #0F0F1A; }
        .manifesto-content h2 em { font-style: italic; color: ${ACCENT}; font-weight: 400; }
        
        .rituals-section { padding: 120px 32px; background: #F8F7F4; }
        .rituals-layout { display: grid; grid-template-columns: 1fr 1.2fr; gap: 60px; align-items: start; }
        .feature-image { position: relative; border-radius: 24px; overflow: hidden; box-shadow: 0 30px 60px rgba(0,0,0,.08); }
        .feature-image img { width: 100%; display: block; }
        .feature-tag, .feature-index { position: absolute; font-family: 'Inter'; font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; }
        .feature-tag { top: 16px; left: 16px; background: rgba(15,15,26,.8); color: #fff; padding: 6px 12px; border-radius: 8px; }
        .feature-index { bottom: 16px; right: 16px; background: #fff; color: #0F0F1A; padding: 6px 12px; border-radius: 8px; }
        
        .ritual-tabs button { display: flex; align-items: center; gap: 12px; padding: 12px 0; border: none; background: none; font-family: 'Inter'; font-weight: 500; font-size: 15px; color: #0F0F1A; border-bottom: 1px solid rgba(0,0,0,.06); cursor: pointer; width: 100%; text-align: left; transition: color .2s; }
        .ritual-tabs button.active { color: ${ACCENT}; border-bottom-color: ${ACCENT}; font-weight: 700; }
        
        .quote-section { padding: 140px 32px; text-align: center; position: relative; background: #fff; }
        .quote-stamp { font-family: 'Cormorant Garamond'; font-size: 80px; line-height: 0; color: ${ACCENT}; opacity: 0.15; margin-bottom: 20px; }
        .quote-section p { font-family: 'Cormorant Garamond'; font-size: clamp(2rem, 3.5vw, 3rem); font-weight: 300; line-height: 1.2; color: #0F0F1A; max-width: 800px; margin: 0 auto; }
        .quote-section p em { color: ${ACCENT}; font-style: italic; }
        
        .faq-section { padding: 120px 32px; max-width: 900px; margin: 0 auto; }
        .faq-item { border-bottom: 1px solid rgba(0,0,0,.08); }
        .faq-item button { width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 24px 0; background: none; border: none; font-family: 'Inter'; font-size: 17px; font-weight: 600; text-align: left; cursor: pointer; color: #0F0F1A; }
        .faq-answer { overflow: hidden; max-height: 0; transition: max-height .3s ease; padding: 0; }
        .faq-item.open .faq-answer { max-height: 300px; padding-bottom: 24px; }
        .faq-answer p { font-family: 'Inter'; font-size: 15px; line-height: 1.7; color: #555; }
        
        .closing-section { background: #0F0F1A; color: #fff; padding: 100px 32px; }
        .closing-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 60px; flex-wrap: wrap; gap: 20px; }
        .closing-main { text-align: center; max-width: 720px; margin: 0 auto; }
        .closing-main h2 { font-family: 'Cormorant Garamond'; font-size: clamp(2.5rem, 5vw, 4rem); font-weight: 300; line-height: 1.1; letter-spacing: -0.03em; }
        .closing-main h2 em { font-style: italic; color: ${ACCENT}; font-weight: 400; }
        .button-light { background: #fff; color: #0F0F1A; box-shadow: 0 15px 40px rgba(255,255,255,.2); }
        .button-light:hover { background: ${ACCENT}; color: #fff; }
        
        .modal-backdrop { position: fixed; inset: 0; background: rgba(15,15,26,.6); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 24px; }
        .booking-modal { background: #fff; border-radius: 24px; padding: 48px; max-width: 520px; width: 100%; box-shadow: 0 40px 80px rgba(0,0,0,.2); position: relative; animation: fadeUp .4s ease; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px);} to { opacity: 1; transform: translateY(0);} }
        .modal-close { position: absolute; top: 20px; right: 20px; background: none; border: none; cursor: pointer; }
        .eyebrow { font-family: 'Inter'; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: ${ACCENT}; font-weight: 600; margin-bottom: 12px; }
        .booking-form label { display: block; font-family: 'Inter'; font-weight: 600; font-size: 13px; margin-bottom: 16px; color: #333; }
        .booking-form input, .booking-form select { width: 100%; padding: 14px; border: 1px solid #ddd; border-radius: 12px; font-family: 'Inter'; font-size: 14px; margin-top: 6px; background: #FAFAF7; outline: none; transition: border-color .2s; }
        .booking-form input:focus, .booking-form select:focus { border-color: ${ACCENT}; }
        .button-full { width: 100%; justify-content: center; margin-top: 8px; }
        .success-state { text-align: center; padding: 20px 0; }
        .success-icon { width: 60px; height: 60px; border-radius: 50%; background: ${ACCENT}; color: #fff; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
      `}</style>

      <header className={`site-header ${scrolled ? "is-scrolled" : ""}`} role="banner">
        <button className="button" style={{ background: "transparent", color: INK, border: "none", padding: 0, fontWeight: 600, fontSize: 14, letterSpacing: ".05em", textTransform: "uppercase" }} onClick={() => setMenuOpen(true)} aria-label={isRTL ? "Menu" : "Menu"}>Menu</button>
        <a href="#top" className="brand" aria-label="Sawtify"><span className="brand-mark"><span /><span /><span /></span><span className="brand-word">Sawtify</span></a>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <a href="#adresse" style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500, color: INK, textDecoration: "none" }}>{isRTL ? "Adresse" : "Adresse"}</a>
          <button className="button button-dark button-small" style={{ fontSize: 12 }} onClick={() => setBookingOpen(true)}>{isRTL ? "Réserver" : "Réserver"} <ArrowUpRight size={15} /></button>
        </div>
      </header>

      {menuOpen && (
        <div className="modal-backdrop" onMouseDown={() => setMenuOpen(false)} role="presentation">
          <aside style={{ position: "absolute", inset: "0 0 0 auto", width: "min(420px, 85vw)", background: PAPER, padding: "32px", display: "flex", flexDirection: "column", boxShadow: "-20px 0 60px rgba(0,0,0,.08)" }} onMouseDown={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 48 }}>
              <a href="#top" className="brand">Sawtify</a>
              <button onClick={() => setMenuOpen(false)} aria-label="Fermer"><X size={20} /></button>
            </div>
            <nav style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
              {navItems.map((item, i) => <button key={item.href} onClick={() => scrollTo(item.href)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 0", borderBottom: "1px solid rgba(0,0,0,.06)", background: "none", border: "none", fontFamily: "'Inter'", fontSize: 22, fontWeight: 600, color: INK, textAlign: "left", cursor: "pointer" }}><span style={{ fontFamily: "'Cormorant Garamond'", fontSize: 14, color: ACCENT }}>{String(i+1).padStart(2,'0')}</span>{item.label}<ArrowUpRight size={18} /></button>)}
            </nav>
            <div style={{ borderTop: "1px solid rgba(0,0,0,.08)", paddingTop: 24, marginTop: 24 }}>
              <button className="button button-dark button-full" onClick={() => { setMenuOpen(false); setBookingOpen(true); }}>{isRTL ? "Réserver" : "Réserver"} <ArrowRight size={16} /></button>
              <p style={{ fontFamily: "'Inter'", fontSize: 13, color: "#777", marginTop: 16, lineHeight: 1.6 }}>{isRTL ? "Un studio de voix naturelles en Darija." : "Un studio de voix naturelles en Darija."}</p>
            </div>
          </aside>
        </div>
      )}

      <main id="top">
        {/* HERO */}
        <section className="hero-section" aria-label="Hero">
          <div className="glow" />
          <div className="hero-copy">
            <p className="eyebrow"><span className="eyebrow-dot" /> {isRTL ? "Studio du Darija · Disponible" : "Studio DARIJA · En ligne"}</p>
            <h1 id="hero-title">{isRTL ? "Une voix qui " : "Une voix qui "}<br /><em>{isRTL ? "vous ressemble." : "vous ressemble."}</em></h1>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 17, lineHeight: 1.7, color: "#555", maxWidth: 480 }}>
              {isRTL ? "Transformez vos textes en commentaires naturels. 12 voix, 30 secondes, et la suite est dans le studio." : "Transformez vos textes en commentaires naturels. 12 voix, 30 secondes, et la suite est dans le studio."}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 32, flexWrap: "wrap" }}>
              <button className="button button-dark" onClick={() => { setIntroPlaying ? stopIntroAudio() : null; onSigninClick(); }}>{t.bookNow || "Commencer"} <ArrowRight size={16} /></button>
              <button className="button" style={{ background: "transparent", border: "1px solid rgba(0,0,0,.15)" }} onClick={() => setBookingOpen(true)}>{isRTL ? "Réserver" : "Réserver"} <ArrowUpRight size={15} /></button>
            </div>
            <div style={{ marginTop: 32, fontFamily: "'Inter'", fontSize: 13, color: "#888", display: "flex", gap: 24, alignItems: "center" }}>
              <span><strong style={{ color: INK }}>12</strong> {isRTL ? "voix" : "voix"}</span>
              <span>·</span>
              <span><strong style={{ color: INK }}>4.9</strong> ★</span>
              <span>·</span>
              <span>{isRTL ? "+1 200 créateurs" : "+1 200 créateurs"}</span>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-card hero-card-back"><img src={images.editorial} alt="Studio" /></div>
            <div className="hero-card hero-card-main">
              <img src={images.hero} alt="Portrait studio" />
              <div style={{ position: "absolute", bottom: 20, left: 24, color: "#fff", zIndex: 5 }}>
                <p style={{ fontFamily: "'Cormorant Garamond'", fontSize: 28, margin: 0, lineHeight: 1.1 }}><strong>Le studio</strong><br /><em style={{ fontWeight: 400, opacity: 0.8 }}>du Darija.</em></p>
              </div>
              <span style={{ position: "absolute", top: 12, right: 16, fontFamily: "'Inter'", fontSize: 10, fontWeight: 600, color: "#fff", opacity: 0.7 }}>01 / 03</span>
            </div>
            <div className="floating-pill pill-scent"><Sparkles size={14} /> <span>{isRTL ? "Voix naturelles" : "Voix naturelles"}</span></div>
            <div className="floating-pill pill-place"><span>✳</span> <span>Alger / En ligne</span></div>
          </div>

          <button className="button" style={{ position: "absolute", bottom: 28, left: 32, background: "transparent", color: INK, border: "none", fontSize: 12, fontWeight: 500, letterSpacing: ".05em", cursor: "pointer", textTransform: "uppercase" }} onClick={() => scrollTo("#univers")} aria-label="Découvrir">{isRTL ? "Défiler" : "Défiler"} <ArrowDown size={15} /></button>
        </section>

        {/* MANIFESTO */}
        <section id="univers" className="manifesto-section">
          <div className="section-intro">
            <p className="eyebrow">01 / {isRTL ? "L'intention" : "L'intention"}</p>
            <span className="section-index">L — 2026</span>
          </div>
          <div className="manifesto-content">
            <h2>{isRTL ? "Le studio où " : "Le studio où "}<br /><em>{isRTL ? "la voix respire." : "la voix respire."}</em></h2>
            <p style={{ maxWidth: 640, fontFamily: "'Inter'", fontSize: 17, lineHeight: 1.7, color: "#555", marginTop: 24 }}>
              {isRTL ? "Sawtify est une plateforme algérienne qui transforme vos textes en commentaires vocaux naturels en Darija. Pas de robot. Juste une voix qui parle comme un humain, avec la bonne intonation, le bon rythme, et la bonne émotion." : "Sawtify est une plateforme algérienne qui transforme vos textes en voix-off naturelles en Darija. Pas un robot. Juste une voix qui parle comme un humain, avec la bonne intonation, le bon rythme, et la bonne émotion."}
            </p>
            <div className="manifesto-signature" style={{ marginTop: 48, borderTop: "1px solid rgba(0,0,0,.08)", paddingTop: 20, display: "flex", gap: 24, alignItems: "center" }}>
              <span style={{ fontFamily: "'Cormorant Garamond'", fontSize: 56, color: ACCENT, fontWeight: 300, lineHeight: 1 }}>S</span>
              <span style={{ fontFamily: "'Inter'", fontSize: 14, color: "#888", lineHeight: 1.5 }}>{isRTL ? "Le studio de voix<br /><strong>Sawtify</strong>" : "Le studio vocal<br /><strong>Sawtify</strong>"}</span>
            </div>
          </div>
          <div className="manifesto-orbit" style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 60, flexWrap: "wrap" }}>
            {["Voix", "Naturel", "Studio"].map(word => <span key={word} style={{ fontFamily: "'Cormorant Garamond'", fontSize: "clamp(2rem, 3.5vw, 3.2rem)", color: "#ddd", fontWeight: 300 }}>{word}</span>)}
          </div>
        </section>

        {/* RITUALS (Voices) */}
        <section id="rituels" className="rituals-section">
          <div className="section-intro">
            <p className="eyebrow">02 / {isRTL ? "Les voix" : "Les voix"}</p>
            <span className="section-index">{isRTL ? "Le trio" : "Le trio"}</span>
          </div>
          <div className="rituals-layout">
            <div className="rituals-copy">
              <h2>{isRTL ? "Moins de bruit." : "Moins de bruit."}<br /><em>{isRTL ? "Plus de vous." : "Plus de vous."}</em></h2>
              <p style={{ fontFamily: "'Inter'", fontSize: 16, color: "#555", lineHeight: 1.7, marginTop: 16 }}>{isRTL ? "Trois voix représentatives de notre studio. Choisissez celle qui résonne avec votre marque, votre message, votre audience." : "Trois voix représentatives de notre studio. Choisissez celle qui résonne avec votre marque, votre message, votre audience."}</p>
              <button className="button button-dark" style={{ marginTop: 24 }} onClick={() => setBookingOpen(true)}>{isRTL ? "Parler à notre équipe" : "Parler à notre équipe"} <ArrowRight size={15} /></button>
              <div className="ritual-tabs" style={{ marginTop: 48 }}>
                {rituals.map((r, i) => (
                  <button key={r.number} className={activeRitual === i ? "active" : ""} onClick={() => setActiveRitual(i)}>
                    <span style={{ color: ACCENT, fontWeight: 700 }}>{r.number}</span>
                    <span>{r.title}</span>
                    <ArrowRight size={15} />
                  </button>
                ))}
              </div>
            </div>
            <div className="ritual-feature">
              <div className="feature-image">
                <img src={rituals[activeRitual].image} alt={rituals[activeRitual].title} />
                <span className="feature-tag">{rituals[activeRitual].tag}</span>
                <span className="feature-index">{rituals[activeRitual].number} / 03</span>
              </div>
              <div className="feature-details" style={{ marginTop: 24, padding: 24, background: "#fff", borderRadius: 20, border: "1px solid rgba(0,0,0,.06)" }}>
                <p className="eyebrow" style={{ fontSize: 11 }}>{isRTL ? "Le rituel " : "Le rituel "}{rituals[activeRitual].number}</p>
                <h3 style={{ fontFamily: "'Cormorant Garamond'", fontSize: 26, fontWeight: 300, marginBottom: 12 }}>{rituals[activeRitual].title}</h3>
                <p style={{ fontFamily: "'Inter'", fontSize: 15, lineHeight: 1.7, color: "#555" }}>{rituals[activeRitual].description}</p>
                <span style={{ display: "inline-block", marginTop: 16, fontFamily: "'Inter'", fontSize: 13, fontWeight: 600, color: ACCENT }}><Clock3 size={14} /> {rituals[activeRitual].time}</span>
              </div>
            </div>
          </div>
          <div className="rituals-strip" style={{ display: "flex", gap: 12, marginTop: 40, overflowX: "auto" }}>
            {rituals.map((r, i) => <button key={r.number} onClick={() => setActiveRitual(i)} style={{ display: "flex", gap: 16, alignItems: "center", padding: 18, background: i === activeRitual ? "#0F0F1A" : "#fff", color: i === activeRitual ? "#fff" : "#0F0F1A", border: i === activeRitual ? "1px solid #0F0F1A" : "1px solid rgba(0,0,0,.1)", borderRadius: 16, fontFamily: "'Inter'", fontWeight: 600, fontSize: 15, whiteSpace: "nowrap", cursor: "pointer", minWidth: 220, flex: 1 }}><span style={{ color: ACCENT, fontWeight: 700 }}>{r.number}</span><span>{isRTL ? r.title.split(" — ")[1] || r.title : r.title.split(" — ")[1] || r.title}</span><ArrowUpRight size={14} /></button>)}
          </div>
        </section>

        {/* QUOTE */}
        <section className="quote-section">
          <div className="quote-stamp">✳</div>
          <p>"On ne change pas pour devenir quelqu'un d'autre. <em>On change pour se retrouver.</em>"</p>
          <div style={{ marginTop: 32, fontFamily: "'Inter'", fontSize: 14, color: "#777" }}>
            <span style={{ display: "block", width: 48, height: 1, background: ACCENT, marginBottom: 12 }}></span>
            Anaïs, fondatrice de <strong>Sawtify</strong>
          </div>
        </section>

        {/* EXPERIENCE (Studio) */}
        <section className="experience-section section-pad">
          <div className="section-intro">
            <p className="eyebrow">03 / L'expérience</p>
            <span className="section-index">Le studio ouvert</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 24, alignItems: "start" }}>
            <div style={{ borderRadius: 24, overflow: "hidden", boxShadow: "0 30px 60px rgba(0,0,0,.08)" }}>
              <img src={images.salon} alt="Le studio Sawtify" style={{ width: "100%", display: "block", objectFit: "cover", height: "520px" }} />
            </div>
            <div>
              <div style={{ borderRadius: 24, overflow: "hidden", marginBottom: 24, boxShadow: "0 20px 40px rgba(0,0,0,.06)" }}>
                <img src={images.hands} alt="Voix naturelle" style={{ width: "100%", display: "block", height: 280, objectFit: "cover" }} />
                <div style={{ padding: 20, background: "#fff" }}>
                  <h3 style={{ fontFamily: "'Cormorant Garamond'", fontSize: 26, fontWeight: 300, marginBottom: 8 }}>Le geste <strong style={{ color: ACCENT }}>{isRTL ? "juste" : "juste"}</strong></h3>
                  <p style={{ fontFamily: "'Inter'", fontSize: 14, color: "#555", lineHeight: 1.7 }}>Une voix qui ne force pas. Une technologie au service de l'émotion. C'est tout le sens de Sawtify.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TESTIMONIAL */}
        <section style={{ padding: "100px 32px", background: "#fff" }}>
          <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "start" }}>
            <div>
              <span style={{ fontFamily: "'Cormorant Garamond'", fontSize: 80, color: ACCENT, opacity: 0.2, lineHeight: 0 }}>“</span>
              <p style={{ fontFamily: "'Cormorant Garamond'", fontSize: 26, fontWeight: 300, lineHeight: 1.3, marginTop: -30 }}>
                {isRTL ? "Je ne savais pas qu'une voix IA pouvait sonner si réaliste. Mes clients n'ont pas remarqué la différence." : "Je ne savais pas qu'une voix IA pouvait sonner si réelle. Mes clients n'ont pas remarqué la différence."}
              </p>
              <div style={{ marginTop: 28, fontFamily: "'Inter'", fontSize: 13, color: "#777" }}>Amine B. <strong>• Créateur, Alger</strong></div>
            </div>
            <div style={{ background: "#FAFAF7", padding: 32, borderRadius: 24, border: "1px solid rgba(0,0,0,.05)" }}>
              <div style={{ fontSize: 28, letterSpacing: 4, color: ACCENT, marginBottom: 16 }}>★★★★★</div>
              <p style={{ fontFamily: "'Inter'", fontSize: 16, fontWeight: 600, lineHeight: 1.5 }}>{isRTL ? "Une communauté qui revient pour la voix, et pour le moment." : "Une communauté qui revient pour la voix, et pour le moment."}</p>
              <span style={{ display: "inline-block", marginTop: 20, fontFamily: "'Inter'", fontSize: 13, fontWeight: 600, color: ACCENT }}>1 200+ <small style={{ fontWeight: 400, color: "#777" }}>{isRTL ? "visites" : "visites"}</small></span>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="faq-section">
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <p className="eyebrow">04 / Questions</p>
            <h2 style={{ fontFamily: "'Cormorant Garamond'", fontWeight: 300, fontSize: "clamp(2rem, 4vw, 3.5rem)", lineHeight: 1.1 }}>{isRTL ? "Avant de" : "Avant de"} <em style={{ color: ACCENT }}>{isRTL ? "venir." : "venir."}</em></h2>
          </div>
          <div className="faq-list">
            {faqs.map((faq, i) => (
              <div className={`faq-item ${activeFaq === i ? "open" : ""}`} key={i}>
                <button onClick={() => setActiveFaq(i === activeFaq ? null : i)}>{faq.q}{activeFaq === i ? <Minus size={18} /> : <span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg></span>}</button>
                <div className="faq-answer"><p>{faq.a}</p></div>
              </div>
            ))}
          </div>
        </section>

        {/* CLOSING / BOOKING */}
        <section id="adresse" className="closing-section">
          <div className="closing-top">
            <a href="#top" aria-label="Top" style={{ color: "#fff", textDecoration: "none", fontFamily: "'Cormorant Garamond'", fontSize: 24, fontWeight: 600 }}>
              <span style={{ background: "linear-gradient(135deg, #6E5FE8, #9D8FFF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Sawtify</span>
            </a>
            <span style={{ fontFamily: "'Inter'", fontSize: 13, color: "#aaa" }}>{isRTL ? "Alger · En ligne" : "Alger · En ligne"}</span>
            <span style={{ fontFamily: "'Inter'", fontSize: 13, color: "#aaa" }}>+213 555 000 000</span>
          </div>
          <div className="closing-main">
            <p className="eyebrow light-eyebrow" style={{ color: "#aaa" }}>{isRTL ? "Il reste une place pour vous" : "Il reste une place pour vous"}</p>
            <h2>{isRTL ? "Votre prochain " : "Votre prochain "}<br /><em>{isRTL ? "beau moment." : "beau moment."}</em></h2>
            <button className="button button-light" style={{ marginTop: 24 }} onClick={() => setBookingOpen(true)}>{isRTL ? "Prendre rendez-vous" : "Prendre rendez-vous"} <ArrowUpRight size={16} /></button>
          </div>
          <div className="closing-bottom" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, fontFamily: "'Inter'", fontSize: 12, color: "#777" }}>
            <span>© 2026 Sawtify — {t.footTag || "Fait en Algérie"}</span>
            <span>FR / AR</span>
          </div>
        </section>
      </main>

      {/* BOOKING MODAL */}
      {bookingOpen && (
        <div className="modal-backdrop" onMouseDown={() => setBookingOpen(false)} role="presentation">
          <div className="booking-modal" onMouseDown={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="booking-title">
            <button className="modal-close" onClick={() => setBookingOpen(false)} aria-label="Fermer"><X size={18} /></button>
            <p className="eyebrow">Prendre le temps</p>
            <h2 id="booking-title">{isRTL ? "Votre moment commence ici." : "Votre moment commence ici."}<br /><em>{isRTL ? "Réservez." : "Réservez."}</em></h2>
            <p style={{ fontFamily: "'Inter'", fontSize: 15, color: "#555", marginBottom: 24 }}>{isRTL ? "Laissez-nous vos coordonnées. Nous répondons dans la journée pour imaginer votre rituel vocal." : "Laissez-nous vos coordonnées. Nous répondons dans la journée pour imaginer votre rituel vocal."}</p>
            <form onSubmit={(e) => { e.preventDefault(); setBookingOpen(false); }} className="booking-form">
              <label>{isRTL ? "Votre prénom" : "Votre prénom"}<input required name="name" placeholder={isRTL ? "Ex. Inès" : "Ex. Amine"} /></label>
              <label>{isRTL ? "Votre email" : "Votre email"}<input required type="email" name="email" placeholder="bonjour@you.com" /></label>
              <label>{isRTL ? "Rituel souhaité" : "Rituel souhaité"}<select name="ritual" defaultValue=""><option value="" disabled>{isRTL ? "Choisir" : "Choisir"}</option><option>Amine</option><option>Yasmine</option><option>Khalid</option><option>{isRTL ? "Je ne sais pas encore" : "Je ne sais pas encore"}</option></select></label>
              <button className="button button-dark button-full" type="submit" style={{ marginTop: 12 }}>{isRTL ? "Demander un rendez-vous" : "Demander un rendez-vous"} <ArrowRight size={16} /></button>
            </form>
            <p style={{ fontFamily: "'Inter'", fontSize: 12, color: "#888", marginTop: 16, display: "flex", alignItems: "center", gap: 6 }}><Clock3 size={13} /> {isRTL ? "Réponse sous 24h" : "Réponse sous 24h"} · {isRTL ? "sans engagement" : "sans engagement"}</p>
          </div>
        </div>
      )}
    </div>
  );
}
