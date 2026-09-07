import React, { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Play,
  Pause,
  ShieldCheck,
  Sparkles,
  Mic,
  Zap,
  Download,
  ChevronDown,
  Volume2,
  Youtube,
  Instagram,
  Music2,
  Video,
  Megaphone,
  Mic2,
  Star,
  Rocket,
} from "lucide-react";
import { motion } from "motion/react";

interface LandingPageProps {
  onLoginClick: () => void;
  onSigninClick: () => void;
  language: "fr" | "ar";
  setLanguage: (lang: "fr" | "ar") => void;
}

/* ---------------------------------------------------
   Web Audio API — vraie waveform réactive
--------------------------------------------------- */
function useAudioVisualizer(audioEl: HTMLAudioElement | null, isPlaying: boolean, barCount = 28) {
  const [bars, setBars] = useState<number[]>(Array(barCount).fill(14));
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>();
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  useEffect(() => {
    if (!isPlaying || !audioEl) {
      setBars(Array(barCount).fill(14));
      return;
    }
    try {
      if (!ctxRef.current) {
        ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = ctxRef.current;
      if (!sourceRef.current) sourceRef.current = ctx.createMediaElementSource(audioEl);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      sourceRef.current.connect(analyser);
      analyser.connect(ctx.destination);
      const data = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        analyser.getByteFrequencyData(data);
        setBars(Array.from(data.slice(0, barCount)).map((v) => Math.max(12, (v / 255) * 100)));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
      return () => {
        cancelAnimationFrame(rafRef.current!);
        analyser.disconnect();
      };
    } catch {}
  }, [isPlaying, audioEl]);

  return bars;
}

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };

export const LandingPage: React.FC<LandingPageProps> = ({
  onLoginClick,
  onSigninClick,
  language,
  setLanguage,
}) => {
  const isRTL = language === "ar";
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const bars = useAudioVisualizer(audioRef.current, playingId !== null);

  const ArrowIcon = ({ className = "w-4 h-4" }: { className?: string }) =>
    isRTL ? <ArrowLeft className={className} /> : <ArrowRight className={className} />;

  const t = {
    navHome: isRTL ? "الرئيسية" : "Accueil",
    navServices: isRTL ? "الخدمات" : "Services",
    navAbout: isRTL ? "من نحن" : "À propos",
    navMore: isRTL ? "المزيد" : "Plus",
    cta: isRTL ? "ابدأ الآن" : "Commencer",

    heroLine1: isRTL ? "صوت واضح." : "Voix claire.",
    heroLine2: isRTL ? "عاطفة حقيقية." : "Émotion réelle.",
    heroLine3: isRTL ? "أثر دائم." : "Impact durable.",
    heroSub: isRTL
      ? "نساعد المبدعين والعلامات التجارية على تحويل نصوصهم إلى أصوات ذكاء اصطناعي بالدارجة الجزائرية، طبيعية وجاهزة للاستخدام فوراً."
      : "Nous aidons créateurs et marques à donner vie à leurs textes grâce à des voix IA en darija algérienne, naturelles et prêtes à l'emploi.",
    viewDemo: isRTL ? "شاهد العرض" : "Voir la démo",
    bookCall: isRTL ? "ابدأ مجاناً" : "Essayer gratuitement",

    partnershipsLabel: isRTL ? "• شراكات" : "• Technologie",
    partnershipsTitle: isRTL
      ? "تقنية صوتية مصممة للمبدعين الجزائريين."
      : "Une technologie vocale pensée pour les créateurs algériens.",
    partnershipsDesc: isRTL
      ? "من توليد السيناريو إلى التصدير النهائي، نجمع بين الذكاء الاصطناعي المتقدم والأصالة الثقافية لمساعدة المبدعين على الإنتاج أسرع دون التضحية بالجودة."
      : "De la génération de script à l'export final, nous combinons IA de pointe et authenticité culturelle pour produire plus vite, sans sacrifier la qualité.",
    stat1: isRTL ? "رضا المبدعين" : "Satisfaction créateurs",
    stat2: isRTL ? "أصوات متاحة" : "Voix disponibles",
    stat3: isRTL ? "مبدع نشط" : "Créateurs actifs",

    aboutLabel: isRTL ? "• من نحن" : "• À propos",
    aboutTitle: isRTL
      ? "نساعد المبدعين على منح صوت بشري لأفكارهم."
      : "Nous aidons les créateurs à donner une voix humaine à leurs idées.",
    aboutDesc: isRTL
      ? "Sawtify يجمع بين الذكاء الاصطناعي والأصالة الصوتية حتى يتمكن كل مبدع أو علامة تجارية من إنتاج تعليقات صوتية بالدارجة، دون استوديو أو حجز ممثل صوتي."
      : "Sawtify combine intelligence artificielle et authenticité vocale pour que chaque créateur puisse produire des voix off en darija, sans studio ni comédien à réserver.",
    learnMore: isRTL ? "اعرف أكثر" : "En savoir plus",

    perfLabel: isRTL ? "الأداء" : "Performance",
    perfSubLabel: isRTL ? "وقت الإنتاج" : "Temps de production",
    perfStat: "-68%",
    perfNote: isRTL ? "مقارنة بالتسجيل الاستوديو التقليدي" : "vs enregistrement studio classique",
  };

  const badges = [
    { icon: Sparkles, label: isRTL ? "ذكاء اصطناعي" : "IA native", color: "bg-violet-500", pos: "top-[20%] left-[10%] md:left-[18%]" },
    { icon: Zap, label: isRTL ? "سريع" : "Ultra rapide", color: "bg-fuchsia-500", pos: "top-[18%] right-[8%] md:right-[16%]" },
    { icon: Star, label: isRTL ? "احترافي" : "Qualité pro", color: "bg-indigo-500", pos: "top-[42%] right-[4%] md:right-[10%]" },
    { icon: Rocket, label: isRTL ? "نمو أسرع" : "Grow faster", color: "bg-violet-400", pos: "top-[46%] left-[4%] md:left-[8%]" },
    { icon: Mic, label: isRTL ? "دارجة أصيلة" : "Feel Darija", color: "bg-purple-500", pos: "top-[54%] right-[20%] md:right-[26%]" },
  ];

  const logos = [
    { icon: Youtube, name: "YouTube" },
    { icon: Music2, name: "TikTok" },
    { icon: Instagram, name: "Instagram" },
    { icon: Video, name: "Reels" },
    { icon: Megaphone, name: "Ads" },
    { icon: Mic2, name: "Podcasts" },
  ];

  const perfTags = isRTL
    ? ["سريع", "ذكاء اصطناعي", "دارجة", "جودة استوديو"]
    : ["Rapide", "IA native", "Darija", "Studio quality"];

  const voices = [
    { id: "amin", name: isRTL ? "أمين" : "Amin", tag: isRTL ? "تجاري • دارجة" : "Commercial · Darija", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
    { id: "yasmine", name: isRTL ? "ياسمين" : "Yasmine", tag: isRTL ? "إعلان • ناعم" : "Publicité · Douce", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
    { id: "khalid", name: isRTL ? "خالد" : "Khalid", tag: isRTL ? "وثائقي • عميق" : "Documentaire · Grave", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
    { id: "layla", name: isRTL ? "ليلى" : "Layla", tag: isRTL ? "سوشيال • حيوي" : "Social · Énergique", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
  ];

  const toggleVoice = (id: string, url: string) => {
    if (playingId === id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    audioRef.current?.pause();
    const audio = new Audio(url);
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;
    audio.play();
    audio.onended = () => setPlayingId(null);
    setPlayingId(id);
  };

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="min-h-screen bg-white text-[#141118] selection:bg-purple-200 selection:text-purple-900"
      style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}
    >
      {/* =========================================================
          HEADER — transparent, superposé sur l'image
      ========================================================= */}
      <header className="absolute top-0 inset-x-0 z-50">
        <div className="mx-auto max-w-6xl px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-white/90 overflow-hidden flex items-center justify-center">
              <span className="text-purple-700 font-bold text-sm">S</span>
            </div>
            <span className="font-semibold text-white text-[15px] tracking-tight">Sawtify</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-[13px] font-medium text-white/80">
            <a href="#home" className="hover:text-white transition-colors">{t.navHome}</a>
            <a href="#voices" className="hover:text-white transition-colors">{t.navServices}</a>
            <a href="#about" className="hover:text-white transition-colors">{t.navAbout}</a>
            <a href="#pricing" className="hover:text-white transition-colors">{t.navMore}</a>
          </nav>

          <button
            onClick={onSigninClick}
            className="rounded-full bg-white text-[#141118] px-5 py-2.5 text-[13px] font-semibold hover:bg-purple-100 transition-colors"
          >
            {t.cta}
          </button>
        </div>
      </header>

      {/* =========================================================
          HERO — image + badges flottants + texte overlay
      ========================================================= */}
      <section id="home" className="relative h-[780px] sm:h-[860px] overflow-hidden bg-[#0f0818]">
        {/* IMAGE ICI — remplace par ta photo/vidéo (voir recommandations) */}
        <img
          src="https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=80&w=1600&auto=format&fit=crop"
          alt="Sawtify hero"
          className="absolute inset-0 w-full h-full object-cover object-top"
        />

        {/* Streak lumineux diagonal (remplace le vert par violet) */}
        <div className="absolute -left-1/3 top-0 w-[160%] h-full bg-gradient-to-tr from-violet-200/25 via-transparent to-transparent blur-3xl rotate-12 pointer-events-none" />

        {/* Overlay dégradé sombre violet */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#1a0f2e]/60 to-[#0f0818]" />

        {/* Badges flottants */}
        {badges.map((b, i) => (
          <motion.div
            key={b.label}
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
            className={`hidden sm:flex absolute ${b.pos} items-center gap-1.5 bg-black/40 backdrop-blur-md border border-white/10 rounded-full pe-3 ps-1 py-1 text-[11px] font-medium text-white shadow-lg`}
          >
            <span className={`w-5 h-5 rounded-full ${b.color} flex items-center justify-center`}>
              <b.icon className="w-3 h-3 text-white" />
            </span>
            {b.label}
          </motion.div>
        ))}

        {/* Contenu texte */}
        <div className="absolute inset-x-0 bottom-[64px] sm:bottom-[90px] px-6 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-4xl sm:text-6xl lg:text-[4rem] leading-[1.06] font-medium tracking-tight text-white mb-5"
            style={{ fontFamily: "'Fraunces', Georgia, serif" }}
          >
            {t.heroLine1}
            <br />
            {t.heroLine2}
            <br />
            {t.heroLine3}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="text-white/60 text-sm sm:text-base max-w-lg mx-auto mb-8"
          >
            {t.heroSub}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="flex items-center justify-center gap-3"
          >
            <button
              onClick={onLoginClick}
              className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white px-5 py-3 text-sm font-medium hover:bg-white/20 transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              {t.viewDemo}
            </button>
            <button
              onClick={onSigninClick}
              className="inline-flex items-center gap-2 rounded-full bg-violet-400 text-[#140a24] px-6 py-3 text-sm font-semibold hover:bg-violet-300 transition-colors"
            >
              {t.bookCall}
              <ArrowIcon />
            </button>
          </motion.div>
        </div>
      </section>

      {/* =========================================================
          PARTNERSHIPS / STATS — fond sombre violet
      ========================================================= */}
      <section className="relative bg-[#0f0818] pt-16 pb-28 sm:pb-36">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="text-[11px] font-medium text-white/40 tracking-wide mb-4">
              {t.partnershipsLabel}
            </div>
            <h2
              className="text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-violet-400 max-w-2xl leading-[1.15] mb-5"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              {t.partnershipsTitle}
            </h2>
            <p className="text-white/45 text-sm sm:text-base max-w-xl leading-relaxed mb-12">
              {t.partnershipsDesc}
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={stagger}
            className="grid grid-cols-3 gap-6 sm:gap-12"
          >
            {[
              { n: "98%", l: t.stat1 },
              { n: "12+", l: t.stat2 },
              { n: "1,200+", l: t.stat3 },
            ].map((s) => (
              <motion.div key={s.l} variants={fadeUp}>
                <div
                  className="text-3xl sm:text-5xl font-medium tracking-tight text-violet-400"
                  style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                >
                  {s.n}
                </div>
                <div className="text-[11px] sm:text-sm text-white/40 mt-1.5">{s.l}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* =========================================================
          LOGO CLOUD — à cheval entre les deux sections
      ========================================================= */}
      <div className="relative z-10 -mt-10 sm:-mt-12 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-6xl flex flex-wrap justify-center gap-3"
        >
          {logos.map((l) => (
            <div
              key={l.name}
              className="flex items-center gap-2 bg-white rounded-full pe-4 ps-2 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.08)] border border-black/5"
            >
              <span className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center">
                <l.icon className="w-3.5 h-3.5" />
              </span>
              <span className="text-[13px] font-medium text-[#141118]">{l.name}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* =========================================================
          ABOUT — fond crème, texte + carte flottante
      ========================================================= */}
      <section id="about" className="relative bg-[#F7F5F1] pt-16 sm:pt-20 pb-24">
        <div className="mx-auto max-w-6xl px-6 grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="text-[11px] font-medium text-[#141118]/40 tracking-wide mb-4">
              {t.aboutLabel}
            </div>
            <h2
              className="text-3xl sm:text-4xl font-medium tracking-tight text-[#141118] leading-[1.15] mb-5"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              {t.aboutTitle}
            </h2>
            <p className="text-[#141118]/55 text-sm sm:text-base leading-relaxed mb-8 max-w-md">
              {t.aboutDesc}
            </p>
            <button
              onClick={onLoginClick}
              className="inline-flex items-center gap-2 rounded-full bg-[#141118] text-white px-6 py-3 text-sm font-medium hover:bg-purple-700 transition-colors"
            >
              {t.learnMore}
            </button>
          </motion.div>

          {/* Carte flottante Performance */}
          <motion.div
            initial={{ opacity: 0, y: 30, rotate: -2 }}
            whileInView={{ opacity: 1, y: 0, rotate: -2 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative mx-auto w-full max-w-[280px]"
          >
            <div className="rounded-3xl bg-[#141118] text-white p-6 shadow-[0_30px_60px_rgba(20,17,24,0.25)]">
              <div className="flex items-center gap-2 mb-6">
                <span className="w-6 h-6 rounded-full bg-violet-400/20 text-violet-400 flex items-center justify-center">
                  <Volume2 className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-medium text-white/70">{t.perfLabel}</span>
              </div>

              <div className="text-xs text-white/40 mb-1">{t.perfSubLabel}</div>
              <div className="flex items-end gap-3 mb-2">
                <span
                  className="text-4xl font-medium tracking-tight text-violet-400"
                  style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                >
                  {t.perfStat}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/10 mb-2 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: "68%" }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: 0.3 }}
                  className="h-full rounded-full bg-violet-400"
                />
              </div>
              <div className="text-[11px] text-white/35 mb-6">{t.perfNote}</div>

              <div className="grid grid-cols-2 gap-2">
                {perfTags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] font-medium text-white/70 bg-white/5 border border-white/10 rounded-full px-2.5 py-1.5 text-center"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* =========================================================
          VOICES — bonus, garde la cohérence du reste du site
      ========================================================= */}
      <section id="voices" className="bg-white border-t border-[#141118]/10">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-3xl sm:text-4xl font-medium tracking-tight text-[#141118] mb-10"
            style={{ fontFamily: "'Fraunces', Georgia, serif" }}
          >
            {isRTL ? "أصوات " : "Des voix "}
            <span className="text-purple-700">{isRTL ? "بعاطفة حقيقية." : "avec du caractère."}</span>
          </motion.h2>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={stagger}
            className="divide-y divide-[#141118]/10 border-t border-b border-[#141118]/10"
          >
            {voices.map((v) => {
              const active = playingId === v.id;
              return (
                <motion.button
                  key={v.id}
                  variants={fadeUp}
                  onClick={() => toggleVoice(v.id, v.url)}
                  className="w-full flex items-center gap-5 py-5 text-start group"
                >
                  <div
                    className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center border transition-colors ${
                      active
                        ? "bg-purple-700 border-purple-700 text-white"
                        : "border-[#141118]/15 text-[#141118] group-hover:border-purple-400"
                    }`}
                  >
                    {active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ms-0.5" />}
                  </div>
                  <div className="w-32 sm:w-40 shrink-0">
                    <div className="font-medium text-[#141118]">{v.name}</div>
                    <div className="text-xs text-[#141118]/45">{v.tag}</div>
                  </div>
                  <div className="flex-1 flex items-end gap-[3px] h-8">
                    {bars.map((h, i) => (
                      <span
                        key={i}
                        className={`flex-1 rounded-full transition-all duration-150 ${
                          active ? "bg-purple-600" : "bg-[#141118]/10"
                        }`}
                        style={{ height: active ? `${h}%` : "20%" }}
                      />
                    ))}
                  </div>
                  <ArrowIcon className="w-4 h-4 text-[#141118]/20 group-hover:text-purple-600 transition-colors shrink-0" />
                </motion.button>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* =========================================================
          FOOTER
      ========================================================= */}
      <footer className="bg-[#0f0818] text-white/50">
        <div className="mx-auto max-w-6xl px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-violet-400 flex items-center justify-center">
              <span className="text-[#0f0818] font-bold text-sm">S</span>
            </div>
            <span className="font-semibold text-white text-sm">Sawtify</span>
            <span className="text-white/30 text-sm">© 2026</span>
          </div>
          <div className="text-xs">SATIM · Edahabia · CIB</div>
        </div>
      </footer>
    </div>
  );
};
