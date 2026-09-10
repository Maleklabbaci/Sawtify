import React, { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock3,
  Instagram,
  Menu,
  Minus,
  Pause,
  Sparkles,
  Star,
  X,
} from "lucide-react";

type BookingModalProps = { onClose: () => void };

const LOGO_URL = "https://i.ibb.co/nqShkPNP/68126702-75e5-4de6-9b53-e51800b05e4a.jpg";
const INTRO_AUDIO_URL = "https://res.cloudinary.com/gz65ybug/video/upload/v1788998622/discution.wav";

const images = {
  hero: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=1200&q=85",
  detail: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?auto=format&fit=crop&w=900&q=85",
  texture: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=900&q=85",
  salon: "https://images.unsplash.com/photo-1598653222000-6b7b7a552625?auto=format&fit=crop&w=1000&q=85",
  portrait: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=85",
  hands: "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?auto=format&fit=crop&w=900&q=85",
  editorial: "https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?auto=format&fit=crop&w=900&q=85",
};

const navItems = [
  { label: "Le studio", href: "#univers" },
  { label: "Les voix", href: "#rituels" },
  { label: "L'accès", href: "#adresse" },
];

const rituals = [
  {
    number: "01",
    title: "Voix commerciale",
    description: "Un ton vif et confiant, dessiné pour convaincre en quelques secondes et vendre sans forcer.",
    time: "20 pts · 60 s",
    image: images.detail,
    tag: "Le ton qui vend",
  },
  {
    number: "02",
    title: "Voix narrative",
    description: "Un grain chaud et posé, taillé pour les podcasts et les récits qui prennent leur temps.",
    time: "30 pts · 2 min",
    image: images.texture,
    tag: "La matière",
  },
  {
    number: "03",
    title: "Voix sociale",
    description: "Une énergie fraîche et rythmée, calibrée pour les reels et les formats qui vont vite.",
    time: "20 pts · 60 s",
    image: images.portrait,
    tag: "La vibe",
  },
];

const faqs = [
  {
    question: "Comment tester ma première voix ?",
    answer: "Collez votre texte en darija, en arabe ou en français. Nous vous offrons 50 points à l'inscription pour entendre le résultat, sans carte bancaire.",
  },
  {
    question: "Les points expirent-ils ?",
    answer: "Jamais. 20 points pour les 60 premières secondes, puis +10 par minute. Votre solde reste valable aussi longtemps que vous en avez besoin.",
  },
  {
    question: "Puis-je l'utiliser pour une publicité ?",
    answer: "Oui, totalement. Chaque voix générée est livrée sans filigrane, avec un usage commercial complet — pub, YouTube, TikTok ou standard téléphonique.",
  },
];

function Logo({ light = false }: { light?: boolean }) {
  return (
    <a href="#top" className={`brand ${light ? "brand-light" : ""}`} aria-label="Sawtify, retour en haut">
      <span className="brand-mark">
        <img src={LOGO_URL} alt="" />
      </span>
      <span className="brand-word">Sawtify</span>
    </a>
  );
}

function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,500;1,9..144,600&family=Inter:wght@400;500;600;700;800&display=swap');

      :root {
        --paper: #F8F6FC;
        --paper-soft: #FFFFFF;
        --ink: #15121F;
        --ink-soft: rgba(21,18,31,0.62);
        --ink-faint: rgba(21,18,31,0.4);
        --accent: #6E5FE8;
        --accent-soft: #EFEBFF;
        --accent-line: rgba(110,95,232,0.22);
        --accent-dark: #241B4D;
        --radius-lg: 32px;
        --radius-md: 22px;
        --serif: 'Fraunces', serif;
        --sans: 'Inter', sans-serif;
      }

      * { box-sizing: border-box; -webkit-font-smoothing: antialiased; }
      html { scroll-behavior: smooth; }
      body { margin: 0; background: var(--paper); color: var(--ink); font-family: var(--sans); overflow-x: hidden; }
      em { font-family: var(--serif); font-style: italic; font-weight: 500; color: var(--accent); }
      ::selection { background: var(--accent); color: white; }

      .site-shell { position: relative; width: 100%; }
      .section-pad { padding: 110px 8vw; }
      @media (max-width: 900px) { .section-pad { padding: 70px 6vw; } }

      .eyebrow { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent); margin: 0 0 18px; }
      .eyebrow-dot { width: 7px; height: 7px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 0 4px rgba(34,197,94,0.18); }
      .light-eyebrow { color: #C9BEFF; }
      .light-dot { background: #C9BEFF; box-shadow: 0 0 0 4px rgba(201,190,255,0.2); }

      .section-intro { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 56px; border-bottom: 1px solid var(--accent-line); padding-bottom: 22px; }
      .section-index { font-size: 13px; color: var(--ink-faint); font-weight: 600; }

      /* BUTTONS */
      .button { display: inline-flex; align-items: center; gap: 8px; font-weight: 700; font-size: 14px; border-radius: 100px; padding: 15px 26px; border: none; cursor: pointer; transition: transform 0.35s cubic-bezier(.16,1,.3,1), background 0.3s, box-shadow 0.3s; font-family: var(--sans); }
      .button:hover { transform: translateY(-2px); }
      .button-dark { background: var(--ink); color: white; }
      .button-dark:hover { background: var(--accent); }
      .button-accent { background: var(--accent); color: white; box-shadow: 0 16px 40px -14px rgba(110,95,232,0.65); }
      .button-accent:hover { background: var(--ink); }
      .button-light { background: white; color: var(--ink); }
      .button-light:hover { background: var(--accent-soft); }
      .button-small { padding: 11px 20px; font-size: 13px; }
      .button-full { width: 100%; justify-content: center; }

      .text-link { display: inline-flex; align-items: center; gap: 7px; background: none; border: none; font-weight: 700; font-size: 14px; color: var(--ink-soft); cursor: pointer; padding: 4px 0; border-bottom: 1px solid transparent; transition: color 0.25s, border-color 0.25s; }
      .text-link:hover { color: var(--accent); border-color: var(--accent); }
      .dark-link { color: var(--ink); }

      /* HEADER */
      .site-header { position: fixed; top: 0; inset-inline: 0; z-index: 50; display: flex; align-items: center; justify-content: space-between; padding: 26px 6vw; transition: all 0.4s cubic-bezier(.16,1,.3,1); }
      .site-header.is-scrolled { padding: 16px 6vw; background: rgba(248,246,252,0.82); backdrop-filter: blur(16px); box-shadow: 0 1px 0 var(--accent-line); }
      .menu-trigger { display: flex; align-items: center; gap: 8px; background: none; border: none; font-weight: 700; font-size: 13px; color: var(--ink); cursor: pointer; }
      .brand { display: flex; align-items: center; gap: 10px; text-decoration: none; color: var(--ink); }
      .brand-mark { width: 34px; height: 34px; border-radius: 11px; overflow: hidden; box-shadow: 0 6px 16px rgba(110,95,232,0.35); flex-shrink: 0; }
      .brand-mark img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .brand-word { font-family: var(--serif); font-weight: 600; font-size: 21px; letter-spacing: -0.01em; }
      .brand-light { color: white; }
      .header-actions { display: flex; align-items: center; gap: 22px; }
      .header-link { font-size: 13px; font-weight: 600; color: var(--ink-soft); text-decoration: none; }
      .header-link:hover { color: var(--accent); }
      @media (max-width: 640px) { .header-link { display: none; } }

      /* DRAWER */
      .menu-overlay { position: fixed; inset: 0; z-index: 90; background: rgba(21,18,31,0.5); backdrop-filter: blur(4px); }
      .menu-drawer { position: absolute; top: 0; bottom: 0; left: 0; width: min(420px, 88vw); background: var(--paper-soft); padding: 26px 30px; display: flex; flex-direction: column; box-shadow: 30px 0 60px rgba(0,0,0,0.15); }
      .drawer-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 50px; }
      .icon-button { width: 38px; height: 38px; border-radius: 50%; border: 1px solid var(--accent-line); background: none; display: flex; align-items: center; justify-content: center; cursor: pointer; }
      .drawer-nav { display: flex; flex-direction: column; gap: 4px; flex: 1; }
      .drawer-nav button { display: flex; align-items: center; gap: 16px; background: none; border: none; text-align: left; padding: 18px 4px; font-family: var(--serif); font-size: 26px; font-weight: 500; color: var(--ink); cursor: pointer; border-bottom: 1px solid var(--accent-line); }
      .drawer-nav button span { font-size: 12px; font-family: var(--sans); font-weight: 700; color: var(--accent); }
      .drawer-nav button svg { margin-left: auto; opacity: 0.4; }
      .drawer-bottom p { font-size: 13px; color: var(--ink-soft); margin-bottom: 18px; line-height: 1.5; }

      /* HERO */
      .hero-section { position: relative; min-height: 100vh; display: grid; grid-template-columns: 1.05fr 0.95fr; align-items: center; padding: 150px 6vw 60px; gap: 30px; }
      @media (max-width: 1000px) { .hero-section { grid-template-columns: 1fr; padding-top: 130px; } }
      .hero-copy h1 { font-family: var(--serif); font-size: clamp(2.6rem, 5.4vw, 4.4rem); line-height: 1.02; letter-spacing: -0.02em; font-weight: 500; margin: 0 0 22px; }
      .hero-description { font-size: 16px; line-height: 1.65; color: var(--ink-soft); max-width: 430px; margin-bottom: 34px; }
      .hero-actions { display: flex; align-items: center; gap: 26px; flex-wrap: wrap; margin-bottom: 40px; }
      .hero-meta { display: flex; align-items: center; gap: 12px; font-size: 13px; color: var(--ink-soft); flex-wrap: wrap; }
      .avatar-stack { display: inline-flex; margin-right: 4px; }
      .avatar-stack i { width: 26px; height: 26px; border-radius: 50%; border: 2px solid var(--paper); margin-left: -8px; background: linear-gradient(135deg, var(--accent), #9D8FFF); display: inline-block; }
      .avatar-stack i:first-child { margin-left: 0; }
      .meta-separator { opacity: 0.4; }
      .rating { display: inline-flex; align-items: center; gap: 5px; color: var(--accent); font-weight: 700; }

      .hero-visual { position: relative; height: 560px; }
      @media (max-width: 1000px) { .hero-visual { height: 420px; margin-top: 20px; } }
      .hero-orbit { position: absolute; border-radius: 50%; border: 1px dashed var(--accent-line); }
      .orbit-one { width: 340px; height: 340px; top: -30px; right: 40px; }
      .orbit-two { width: 180px; height: 180px; bottom: 40px; left: 0; }
      .hero-card { position: absolute; border-radius: var(--radius-lg); overflow: hidden; box-shadow: 0 40px 80px -30px rgba(21,18,31,0.35); }
      .hero-card img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .hero-card-back { width: 55%; height: 65%; top: 0; right: 0; opacity: 0.85; transform: rotate(4deg); }
      .hero-card-main { width: 68%; height: 82%; bottom: 0; left: 0; z-index: 2; }
      .image-note { position: absolute; bottom: 20px; left: 20px; background: rgba(255,255,255,0.92); backdrop-filter: blur(6px); padding: 12px 16px; border-radius: 16px; font-size: 12px; line-height: 1.3; color: var(--ink-soft); }
      .image-note strong { color: var(--ink); font-family: var(--serif); font-weight: 500; }
      .image-number { position: absolute; top: 18px; right: 18px; font-size: 11px; font-weight: 700; color: white; background: rgba(21,18,31,0.4); padding: 5px 10px; border-radius: 100px; }
      .floating-pill { position: absolute; background: white; border-radius: 100px; padding: 10px 16px; display: flex; align-items: center; gap: 10px; font-size: 11px; line-height: 1.25; box-shadow: 0 16px 40px -18px rgba(21,18,31,0.3); z-index: 3; cursor: pointer; border: none; font-family: var(--sans); color: var(--ink-soft); }
      .floating-pill strong { color: var(--ink); font-weight: 700; }
      .floating-pill svg { color: var(--accent); flex-shrink: 0; }
      .pill-scent { top: 30px; left: -10px; }
      .pill-place { bottom: 60px; right: -14px; }
      .mini-sun { font-size: 15px; color: var(--accent); }
      .visual-caption { position: absolute; bottom: -34px; right: 10px; font-size: 12px; color: var(--ink-faint); display: flex; align-items: center; gap: 10px; }
      .caption-line { width: 40px; height: 1px; background: var(--ink-faint); }
      @media (max-width: 1000px) { .visual-caption { display: none; } }

      .scroll-cue { position: absolute; bottom: 26px; left: 6vw; display: flex; align-items: center; gap: 12px; background: none; border: none; cursor: pointer; font-size: 12px; font-weight: 600; color: var(--ink-soft); }
      .scroll-circle { width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--accent-line); display: flex; align-items: center; justify-content: center; animation: bob 2.2s ease-in-out infinite; }
      @keyframes bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(5px); } }
      @media (max-width: 1000px) { .scroll-cue { display: none; } }

      /* MANIFESTO */
      .manifesto-section { position: relative; display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 40px; }
      @media (max-width: 900px) { .manifesto-section { grid-template-columns: 1fr; } }
      .manifesto-content h2 { font-family: var(--serif); font-size: clamp(2rem,4vw,3.2rem); font-weight: 500; line-height: 1.08; letter-spacing: -0.02em; margin: 0 0 24px; }
      .manifesto-content p { font-size: 16px; line-height: 1.7; color: var(--ink-soft); max-width: 480px; margin-bottom: 34px; }
      .manifesto-signature { display: flex; align-items: center; gap: 14px; font-size: 13px; line-height: 1.4; color: var(--ink-soft); }
      .signature-mark { width: 46px; height: 46px; border-radius: 50%; background: var(--accent); color: white; font-family: var(--serif); font-size: 20px; display: flex; align-items: center; justify-content: center; }
      .manifesto-signature strong { color: var(--ink); }
      .manifesto-orbit { position: relative; height: 320px; display: flex; align-items: center; justify-content: center; }
      .orbit-word { position: absolute; font-family: var(--serif); font-style: italic; font-size: 15px; color: var(--accent); background: var(--accent-soft); padding: 10px 18px; border-radius: 100px; }
      .word-one { top: 10px; left: 10%; }
      .word-two { bottom: 30px; right: 0; }
      .word-three { top: 46%; left: -6%; }
      .orbit-center { width: 92px; height: 92px; border-radius: 50%; background: var(--ink); color: white; display: flex; align-items: center; justify-content: center; }

      /* RITUALS */
      .rituals-layout { display: grid; grid-template-columns: 0.9fr 1.1fr; gap: 50px; margin-bottom: 50px; }
      @media (max-width: 900px) { .rituals-layout { grid-template-columns: 1fr; } }
      .rituals-copy h2 { font-family: var(--serif); font-size: clamp(2rem,4vw,3rem); font-weight: 500; line-height: 1.08; margin: 0 0 20px; }
      .rituals-copy > p { font-size: 15px; color: var(--ink-soft); line-height: 1.65; max-width: 400px; margin-bottom: 22px; }
      .ritual-tabs { margin-top: 34px; display: flex; flex-direction: column; }
      .ritual-tabs button { display: flex; align-items: center; gap: 16px; padding: 18px 4px; background: none; border: none; border-bottom: 1px solid var(--accent-line); text-align: left; font-family: var(--serif); font-size: 19px; color: var(--ink-soft); cursor: pointer; }
      .ritual-tabs button span { font-family: var(--sans); font-size: 12px; font-weight: 700; color: var(--ink-faint); }
      .ritual-tabs button svg { margin-left: auto; opacity: 0.3; }
      .ritual-tabs button.active { color: var(--accent); }
      .ritual-tabs button.active span { color: var(--accent); }
      .ritual-tabs button.active svg { opacity: 1; }

      .ritual-feature { background: white; border-radius: var(--radius-lg); overflow: hidden; box-shadow: 0 30px 70px -34px rgba(21,18,31,0.28); }
      .feature-image { position: relative; height: 280px; }
      .feature-image img { width: 100%; height: 100%; object-fit: cover; }
      .feature-tag { position: absolute; bottom: 16px; left: 16px; background: white; padding: 8px 14px; border-radius: 100px; font-size: 11px; font-weight: 700; }
      .feature-index { position: absolute; top: 16px; right: 16px; color: white; font-size: 11px; font-weight: 700; background: rgba(21,18,31,0.4); padding: 5px 10px; border-radius: 100px; }
      .feature-details { padding: 28px 30px 32px; }
      .feature-details h3 { font-family: var(--serif); font-size: 26px; font-weight: 500; margin: 4px 0 14px; }
      .feature-details p { font-size: 14px; color: var(--ink-soft); line-height: 1.6; margin-bottom: 18px; }
      .duration { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 700; color: var(--accent); background: var(--accent-soft); padding: 8px 14px; border-radius: 100px; }

      .rituals-strip { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
      @media (max-width: 700px) { .rituals-strip { grid-template-columns: 1fr; } }
      .rituals-strip button { display: flex; align-items: center; gap: 10px; padding: 16px 18px; border-radius: 16px; border: 1px solid var(--accent-line); background: white; cursor: pointer; font-size: 13px; font-weight: 700; color: var(--ink-soft); }
      .rituals-strip button span:first-child { font-size: 11px; color: var(--accent); }
      .rituals-strip button svg { margin-left: auto; opacity: 0.35; }
      .rituals-strip button.selected { background: var(--ink); color: white; border-color: var(--ink); }
      .rituals-strip button.selected span:first-child { color: #C9BEFF; }
      .rituals-strip button.selected svg { opacity: 1; }

      /* QUOTE */
      .quote-section { position: relative; padding: 100px 8vw; text-align: center; background: var(--accent-soft); }
      .quote-stamp { display: flex; flex-direction: column; align-items: center; gap: 6px; margin-bottom: 30px; color: var(--accent); }
      .quote-stamp span { font-size: 26px; }
      .quote-stamp small { font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-faint); line-height: 1.3; }
      .quote-section p { font-family: var(--serif); font-size: clamp(1.6rem, 3.4vw, 2.6rem); line-height: 1.28; font-weight: 500; max-width: 780px; margin: 0 auto 28px; }
      .quote-credit { display: flex; align-items: center; justify-content: center; gap: 14px; font-size: 13px; font-weight: 600; color: var(--ink-soft); }
      .credit-line { width: 34px; height: 1px; background: var(--ink-faint); }

      /* EXPERIENCE */
      .experience-grid { display: grid; grid-template-columns: 0.7fr 0.7fr 1fr; gap: 20px; align-items: stretch; }
      @media (max-width: 900px) { .experience-grid { grid-template-columns: 1fr; } }
      .experience-photo { border-radius: var(--radius-md); overflow: hidden; position: relative; }
      .experience-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .experience-photo.tall { min-height: 420px; }
      .experience-photo.small { min-height: 420px; }
      .photo-label { position: absolute; top: 16px; left: 16px; background: white; font-size: 11px; font-weight: 700; padding: 6px 12px; border-radius: 100px; }
      .experience-note { background: var(--ink); color: white; border-radius: var(--radius-md); padding: 40px 34px; display: flex; flex-direction: column; justify-content: center; }
      .note-number { font-family: var(--serif); font-size: 46px; color: #443A8C; margin-bottom: 8px; }
      .experience-note h3 { font-family: var(--serif); font-size: 26px; font-weight: 500; line-height: 1.25; margin: 0 0 16px; }
      .experience-note p { font-size: 14px; color: rgba(255,255,255,0.65); line-height: 1.65; margin-bottom: 20px; }
      .experience-note .text-link { color: #C9BEFF; }
      .experience-note .text-link:hover { color: white; border-color: white; }

      /* TESTIMONIAL */
      .testimonial-section { display: grid; grid-template-columns: 1.3fr 0.7fr; gap: 40px; padding: 100px 8vw; }
      @media (max-width: 900px) { .testimonial-section { grid-template-columns: 1fr; } }
      .testimonial-quote { position: relative; }
      .quote-mark { font-family: var(--serif); font-size: 90px; color: var(--accent-line); line-height: 0; position: absolute; top: 20px; left: -10px; }
      .testimonial-quote p { font-family: var(--serif); font-size: clamp(1.5rem, 2.6vw, 2.1rem); line-height: 1.32; font-weight: 500; margin: 40px 0 30px; }
      .testimonial-by { display: flex; align-items: center; gap: 12px; font-size: 14px; font-weight: 700; }
      .testimonial-avatar { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, var(--accent), #9D8FFF); color: white; display: flex; align-items: center; justify-content: center; font-family: var(--serif); }
      .testimonial-by small { color: var(--ink-faint); font-weight: 500; }
      .testimonial-aside { background: var(--ink); color: white; border-radius: var(--radius-md); padding: 34px; display: flex; flex-direction: column; justify-content: space-between; }
      .stars { color: var(--accent); letter-spacing: 3px; margin-bottom: 18px; }
      .testimonial-aside p { font-family: var(--serif); font-size: 19px; line-height: 1.4; }
      .aside-count { font-family: var(--serif); font-size: 34px; margin-top: 20px; }
      .aside-count small { font-family: var(--sans); font-size: 12px; color: rgba(255,255,255,0.5); font-weight: 600; }

      /* FAQ */
      .faq-section { display: grid; grid-template-columns: 0.8fr 1.2fr; gap: 50px; }
      @media (max-width: 900px) { .faq-section { grid-template-columns: 1fr; } }
      .faq-heading h2 { font-family: var(--serif); font-size: clamp(2rem,4vw,2.8rem); font-weight: 500; line-height: 1.1; margin: 0 0 18px; }
      .faq-heading p { font-size: 14px; color: var(--ink-soft); line-height: 1.6; margin-bottom: 20px; max-width: 340px; }
      .faq-list { display: flex; flex-direction: column; }
      .faq-item { border-bottom: 1px solid var(--accent-line); }
      .faq-item button { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 24px 4px; background: none; border: none; text-align: left; font-family: var(--serif); font-size: 19px; color: var(--ink); cursor: pointer; }
      .plus-icon { position: relative; width: 18px; height: 18px; flex-shrink: 0; }
      .plus-icon span { position: absolute; background: var(--ink); border-radius: 2px; }
      .plus-icon span:first-child { width: 100%; height: 2px; top: 8px; left: 0; }
      .plus-icon span:last-child { width: 2px; height: 100%; top: 0; left: 8px; }
      .faq-item .faq-answer { max-height: 0; overflow: hidden; transition: max-height 0.4s ease; }
      .faq-item.open .faq-answer { max-height: 200px; }
      .faq-answer p { font-size: 14px; color: var(--ink-soft); line-height: 1.65; padding: 0 4px 26px; max-width: 560px; }

      /* CLOSING */
      .closing-section { background: linear-gradient(160deg, var(--ink) 0%, var(--accent-dark) 60%, var(--accent) 140%); color: white; padding: 60px 6vw 40px; border-radius: 40px 40px 0 0; margin-top: 20px; }
      .closing-top { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; padding-bottom: 40px; border-bottom: 1px solid rgba(255,255,255,0.12); margin-bottom: 60px; font-size: 13px; color: rgba(255,255,255,0.6); }
      .closing-top span { text-align: right; line-height: 1.4; }
      .closing-main { text-align: center; padding: 40px 0 70px; }
      .closing-main h2 { font-family: var(--serif); font-size: clamp(2.4rem, 6vw, 4.6rem); font-weight: 500; line-height: 1.02; margin: 20px 0 36px; }
      .closing-bottom { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; font-size: 12px; color: rgba(255,255,255,0.5); padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.1); }
      .closing-bottom a { color: rgba(255,255,255,0.7); display: inline-flex; align-items: center; gap: 6px; text-decoration: none; }

      /* MODAL */
      .modal-backdrop { position: fixed; inset: 0; z-index: 100; background: rgba(21,18,31,0.55); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; padding: 20px; }
      .booking-modal { position: relative; width: 100%; max-width: 440px; background: white; border-radius: var(--radius-lg); padding: 42px 36px; box-shadow: 0 60px 120px -40px rgba(0,0,0,0.4); }
      .modal-close { position: absolute; top: 20px; right: 20px; width: 34px; height: 34px; border-radius: 50%; border: 1px solid var(--accent-line); background: none; display: flex; align-items: center; justify-content: center; cursor: pointer; }
      .booking-modal h2 { font-family: var(--serif); font-size: 30px; font-weight: 500; line-height: 1.15; margin: 6px 0 14px; }
      .modal-intro { font-size: 14px; color: var(--ink-soft); line-height: 1.6; margin-bottom: 26px; }
      .booking-form { display: flex; flex-direction: column; gap: 16px; }
      .booking-form label { font-size: 12px; font-weight: 700; color: var(--ink-soft); display: flex; flex-direction: column; gap: 7px; }
      .booking-form input, .booking-form select { border: 1px solid var(--accent-line); border-radius: 12px; padding: 13px 14px; font-size: 14px; font-family: var(--sans); background: var(--paper); color: var(--ink); }
      .booking-form input:focus, .booking-form select:focus { outline: none; border-color: var(--accent); }
      .form-note { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--ink-faint); margin-top: 16px; justify-content: center; }
      .success-state { text-align: center; }
      .success-icon { width: 56px; height: 56px; border-radius: 50%; background: var(--accent-soft); color: var(--accent); display: flex; align-items: center; justify-content: center; margin: 0 auto 18px; }
    `}</style>
  );
}

function BookingModal({ onClose }: BookingModalProps) {
  const [sent, setSent] = useState(false);
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSent(true);
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose} role="presentation">
      <div className="booking-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="booking-title">
        <button className="modal-close" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        {!sent ? (
          <>
            <p className="eyebrow">Prendre le temps</p>
            <h2 id="booking-title">Votre voix<br /><em>commence ici.</em></h2>
            <p className="modal-intro">Laissez-nous votre email. Vous recevez 50 points gratuits pour générer vos deux premières voix, sans carte bancaire.</p>
            <form onSubmit={submit} className="booking-form">
              <label>Votre prénom<input required name="name" placeholder="Ex. Amine" /></label>
              <label>Votre email<input required type="email" name="email" placeholder="bonjour@vous.com" /></label>
              <label>Ce qui vous ferait plaisir<select name="voice" defaultValue=""><option value="" disabled>Choisir un type de voix</option><option>Voix commerciale</option><option>Voix narrative</option><option>Voix sociale</option><option>Je ne sais pas encore</option></select></label>
              <button className="button button-dark button-full" type="submit">Créer mon compte <ArrowRight size={16} /></button>
            </form>
            <p className="form-note"><Clock3 size={13} /> Accès immédiat · sans engagement</p>
          </>
        ) : (
          <div className="success-state">
            <div className="success-icon"><Check size={24} /></div>
            <p className="eyebrow">C'est noté</p>
            <h2>Merci, votre<br /><em>studio est prêt.</em></h2>
            <p className="modal-intro">Vérifiez votre email : vos 50 points vous attendent pour générer votre toute première voix.</p>
            <button className="button button-dark button-full" onClick={onClose}>Fermer</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [activeRitual, setActiveRitual] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [introPlaying, setIntroPlaying] = useState(false);

  useEffect(() => {
    document.title = "Sawtify — Le studio vocal qui vous ressemble";
    const onScroll = () => setScrolled(window.scrollY > 28);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen || bookingOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen, bookingOpen]);

  // Déclenchement audio dès la première interaction (clic ou défilement)
  useEffect(() => {
    const audio = new Audio(INTRO_AUDIO_URL);
    audio.preload = "auto";
    audio.onended = () => setIntroPlaying(false);
    (window as any).__sawtifyIntroAudio = audio;

    const trigger = () => {
      audio.play().then(() => setIntroPlaying(true)).catch(() => {});
      cleanup();
    };
    const cleanup = () => {
      window.removeEventListener("click", trigger);
      window.removeEventListener("scroll", trigger);
      window.removeEventListener("touchstart", trigger);
    };
    window.addEventListener("click", trigger, { once: true, passive: true });
    window.addEventListener("scroll", trigger, { once: true, passive: true });
    window.addEventListener("touchstart", trigger, { once: true, passive: true });

    return () => { cleanup(); audio.pause(); };
  }, []);

  const toggleIntro = (event: React.MouseEvent) => {
    event.stopPropagation();
    const audio = (window as any).__sawtifyIntroAudio as HTMLAudioElement | undefined;
    if (!audio) return;
    if (introPlaying) { audio.pause(); setIntroPlaying(false); }
    else { audio.play().then(() => setIntroPlaying(true)).catch(() => {}); }
  };

  const scrollTo = (href: string) => {
    setMenuOpen(false);
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div id="top" className="site-shell">
      <GlobalStyles />

      <header className={`site-header ${scrolled ? "is-scrolled" : ""}`}>
        <button className="menu-trigger" onClick={() => setMenuOpen(true)} aria-label="Ouvrir le menu"><Menu size={18} /><span>Menu</span></button>
        <Logo />
        <div className="header-actions">
          <a className="header-link" href="#adresse">Studio en ligne</a>
          <button className="button button-dark button-small" onClick={() => setBookingOpen(true)}>Créer un compte <ArrowUpRight size={15} /></button>
        </div>
      </header>

      {menuOpen && (
        <div className="menu-overlay" onClick={() => setMenuOpen(false)}>
          <aside className="menu-drawer" onClick={(event) => event.stopPropagation()}>
            <div className="drawer-top"><Logo /><button className="icon-button" onClick={() => setMenuOpen(false)} aria-label="Fermer"><X size={19} /></button></div>
            <nav className="drawer-nav">
              {navItems.map((item, index) => <button key={item.href} onClick={() => scrollTo(item.href)}><span>0{index + 1}</span>{item.label}<ArrowUpRight size={18} /></button>)}
            </nav>
            <div className="drawer-bottom"><p>Un studio simple pour les voix<br />qui changent votre marque.</p><button className="button button-dark button-full" onClick={() => { setMenuOpen(false); setBookingOpen(true); }}>Créer mon compte <ArrowRight size={16} /></button></div>
          </aside>
        </div>
      )}

      <main>
        <section className="hero-section" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow hero-eyebrow"><span className="eyebrow-dot" /> Studio ouvert aujourd'hui · Alger, DZ</p>
            <h1 id="hero-title">Une voix qui<br /><em>vous ressemble.</em></h1>
            <p className="hero-description">Sawtify est un studio vocal propulsé par l'IA, où l'on prend le temps de faire sonner vrai chaque texte en darija. Pour des marques vivantes, et une présence qui ne ressemble qu'à vous.</p>
            <div className="hero-actions"><button className="button button-accent" onClick={() => setBookingOpen(true)}>Découvrir Sawtify <ArrowRight size={16} /></button><button className="text-link" onClick={() => scrollTo("#rituels")}>Voir les voix <ArrowDown size={15} /></button></div>
            <div className="hero-meta"><span><span className="avatar-stack"><i /><i /><i /></span> +1 200 créateurs accompagnés</span><span className="meta-separator">·</span><span className="rating"><Star size={13} fill="currentColor" /> 4.9 / 5</span></div>
          </div>

          <div className="hero-visual" aria-label="Un aperçu du studio Sawtify">
            <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
            <div className="hero-card hero-card-back"><img src={images.editorial} alt="Onde sonore abstraite" /></div>
            <div className="hero-card hero-card-main"><img src={images.hero} alt="Micro de studio Sawtify" /><span className="image-note">le naturel<br /><strong>avant tout</strong></span><span className="image-number">01 / 03</span></div>
            <button className="floating-pill pill-scent" onClick={toggleIntro} aria-label="Écouter l'intro">
              {introPlaying ? <Pause size={14} /> : <Sparkles size={14} />}
              <span>Voix<br /><strong>{introPlaying ? "en écoute" : "naturelles"}</strong></span>
            </button>
            <div className="floating-pill pill-place"><span className="mini-sun">✳</span><span>100%<br /><strong>Darija</strong></span></div>
            <div className="visual-caption"><span>Un autre regard sur la voix.</span><span className="caption-line" /></div>
          </div>
          <button className="scroll-cue" onClick={() => scrollTo("#univers")} aria-label="Découvrir la suite"><span>Défiler pour découvrir</span><span className="scroll-circle"><ArrowDown size={16} /></span></button>
        </section>

        <section id="univers" className="manifesto-section section-pad">
          <div className="section-intro"><p className="eyebrow">01 / L'intention</p><span className="section-index">S — 2024</span></div>
          <div className="manifesto-content"><h2>Le son n'a pas<br />besoin de <em>forcer.</em></h2><p>Chez Sawtify, chaque texte commence par une écoute. On analyse le ton, le rythme, l'intention. Puis on façonne la voix avec précision, sans jamais oublier la marque qui la porte.</p><div className="manifesto-signature"><span className="signature-mark">S</span><span>Le studio<br /><strong>qui vous écoute</strong></span></div></div>
          <div className="manifesto-orbit"><div className="orbit-word word-one">Voix</div><div className="orbit-word word-two">Rythme</div><div className="orbit-word word-three">Émotion</div><div className="orbit-center"><Sparkles size={17} /></div></div>
        </section>

        <section id="rituels" className="rituals-section section-pad">
          <div className="section-intro"><p className="eyebrow">02 / Les voix</p><span className="section-index">Des tons choisis</span></div>
          <div className="rituals-layout">
            <div className="rituals-copy"><h2>Moins de bruit.<br /><em>Plus de vous.</em></h2><p>Douze voix essentielles, pensées pour durer au-delà de l'écran. Chaque timbre a une intention, chaque nuance une raison d'être.</p><button className="text-link dark-link" onClick={() => setBookingOpen(true)}>Parler à notre équipe <ArrowRight size={15} /></button><div className="ritual-tabs">{rituals.map((ritual, index) => <button className={activeRitual === index ? "active" : ""} key={ritual.number} onClick={() => setActiveRitual(index)}><span>{ritual.number}</span>{ritual.title}<ArrowRight size={15} /></button>)}</div></div>
            <div className="ritual-feature"><div className="feature-image"><img src={rituals[activeRitual].image} alt={rituals[activeRitual].title} /><span className="feature-tag">{rituals[activeRitual].tag}</span><span className="feature-index">{rituals[activeRitual].number} / 03</span></div><div className="feature-details"><div><p className="eyebrow">Voix {rituals[activeRitual].number}</p><h3>{rituals[activeRitual].title}</h3></div><p>{rituals[activeRitual].description}</p><span className="duration"><Clock3 size={14} /> {rituals[activeRitual].time}</span></div></div>
          </div>
          <div className="rituals-strip">{rituals.map((ritual, index) => <button key={ritual.number} onClick={() => setActiveRitual(index)} className={activeRitual === index ? "selected" : ""}><span>{ritual.number}</span><span>{ritual.title}</span><ArrowUpRight size={14} /></button>)}</div>
        </section>

        <section className="quote-section"><div className="quote-stamp"><span>✳</span><small>Le ton<br />Sawtify</small></div><p>"On ne cherche pas à<br />remplacer une voix humaine.<br /><em>On cherche à la révéler.</em>"</p><div className="quote-credit"><span className="credit-line" /> L'équipe Sawtify, studio vocal darija</div></section>

        <section className="experience-section section-pad"><div className="section-intro"><p className="eyebrow">03 / L'expérience</p><span className="section-index">Du premier mot au dernier écho</span></div><div className="experience-grid"><div className="experience-photo tall"><img src={images.salon} alt="Console du studio Sawtify" /><span className="photo-label">Le studio</span></div><div className="experience-photo small"><img src={images.hands} alt="Mains sur une table de mixage" /><span className="photo-label">Le geste</span></div><div className="experience-note"><span className="note-number">03</span><h3>Tout est fait pour que votre voix puisse <em>exister.</em></h3><p>Un texte, une intention, un rendu en 30 secondes. Et surtout, assez de justesse pour qu'on ne fasse plus la différence.</p><button className="text-link" onClick={() => scrollTo("#adresse")}>Entrer dans le studio <ArrowRight size={15} /></button></div></div></section>

        <section className="testimonial-section"><div className="testimonial-quote"><span className="quote-mark">“</span><p>Je ne pensais pas qu'une IA pouvait sonner aussi humaine. Mes clients ne voient pas la différence.</p><div className="testimonial-by"><span className="testimonial-avatar">A</span><span>Amine K. <small>· e-commerce, Alger</small></span></div></div><div className="testimonial-aside"><div className="stars">★★★★★</div><p>Une communauté qui revient<br /><strong>pour le naturel,</strong><br />et pour la rapidité.</p><span className="aside-count">50K+ <small>voix générées</small></span></div></section>

        <section className="faq-section section-pad"><div className="faq-heading"><p className="eyebrow">04 / Questions essentielles</p><h2>Avant de<br /><em>lancer votre voix.</em></h2><p>Si la réponse n'est pas ici, écrivez-nous. Chaque question fait partie du studio.</p><button className="text-link dark-link" onClick={() => setBookingOpen(true)}>Nous écrire <ArrowRight size={15} /></button></div><div className="faq-list">{faqs.map((faq, index) => <div className={`faq-item ${activeFaq === index ? "open" : ""}`} key={faq.question}><button onClick={() => setActiveFaq(activeFaq === index ? null : index)}><span>{faq.question}</span>{activeFaq === index ? <Minus size={18} /> : <PlusIcon />}</button><div className="faq-answer"><p>{faq.answer}</p></div></div>)}</div></section>

        <section id="adresse" className="closing-section"><div className="closing-top"><Logo light /><span>Ouvert 24h/24, 7j/7</span><span>Studio 100% en ligne<br />Alger, Algérie</span></div><div className="closing-main"><p className="eyebrow light-eyebrow"><span className="eyebrow-dot light-dot" /> Il reste une voix pour vous</p><h2>Votre prochaine<br /><em>voix commence ici.</em></h2><button className="button button-light" onClick={() => setBookingOpen(true)}>Créer mon compte <ArrowUpRight size={16} /></button></div><div className="closing-bottom"><span>© Sawtify studio 2024</span><span>Fait en Algérie, avec intention</span><a href="https://instagram.com" target="_blank" rel="noreferrer"><Instagram size={16} /> Instagram</a></div></section>
      </main>
      {bookingOpen && <BookingModal onClose={() => setBookingOpen(false)} />}
    </div>
  );
}

function PlusIcon() { return <span className="plus-icon"><span /><span /></span>; }
