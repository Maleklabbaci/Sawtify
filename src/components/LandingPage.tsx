import React, { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Play,
  Pause,
  ShieldCheck,
  Volume2,
  Sparkles,
  Mic,
  Zap,
  Download,
  ChevronDown,
  CheckCircle2,
} from "lucide-react";
import { motion } from "motion/react";

interface LandingPageProps {
  onLoginClick: () => void;
  onSigninClick: () => void;
  language: "fr" | "ar";
  setLanguage: (lang: "fr" | "ar") => void;
}

/* ---------------------------------------------------
   HOOK — Vraie waveform liée à l'audio (Web Audio API)
--------------------------------------------------- */
function useAudioVisualizer(
  audioEl: HTMLAudioElement | null,
  isPlaying: boolean,
  barCount = 28
) {
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
        ctxRef.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      }
      const ctx = ctxRef.current;

      if (!sourceRef.current) {
        sourceRef.current = ctx.createMediaElementSource(audioEl);
      }
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      sourceRef.current.connect(analyser);
      analyser.connect(ctx.destination);

      const data = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        analyser.getByteFrequencyData(data);
        const next = Array.from(data.slice(0, barCount)).map((v) =>
          Math.max(12, (v / 255) * 100)
        );
        setBars(next);
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();

      return () => {
        cancelAnimationFrame(rafRef.current!);
        analyser.disconnect();
      };
    } catch {
      // fallback silencieux si l'API échoue (autoplay policies, etc.)
    }
  }, [isPlaying, audioEl]);

  return bars;
}

/* ---------------------------------------------------
   Variants d'animation réutilisables
--------------------------------------------------- */
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

export const LandingPage: React.FC<LandingPageProps> = ({
  onLoginClick,
  onSigninClick,
  language,
  setLanguage,
}) => {
  const isRTL = language === "ar";
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [scrolled, setScrolled] = useState(false);

  const bars = useAudioVisualizer(audioRef.current, playingId !== null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (v) {
      v.playbackRate = 1;
      v.play().catch(() => {});
    }
  }, []);

  const ArrowIcon = ({ className = "w-4 h-4" }: { className?: string }) =>
    isRTL ? <ArrowLeft className={className} /> : <ArrowRight className={className} />;

  const t = {
    navAbout: isRTL ? "من نحن" : "À propos",
    navVoices: isRTL ? "الأصوات" : "Voix",
    navFeatures: isRTL ? "الميزات" : "Fonctionnalités",
    navPricing: isRTL ? "الأسعار" : "Tarifs",
    login: isRTL ? "دخول" : "Connexion",
    start: isRTL ? "ابدأ الآن" : "Commencer",
    kicker: isRTL ? "منصة الصوت الجزائرية" : "La plateforme vocale algérienne",
    heroTitleA: isRTL ? "حوّل أي نص إلى" : "Vos textes deviennent",
    heroTitleB: isRTL ? "صوت بشري أصيل" : "une voix humaine",
    heroDesc: isRTL
      ? "أنشئ تعليقات صوتية بالدارجة الجزائرية بجودة استوديو. سريعة، طبيعية، وجاهزة للإعلانات والريلز."
      : "Voice-over en darija algérienne, qualité studio. Naturelles, rapides, prêtes pour vos pubs et reels — sans studio, sans comédien à réserver.",
    ctaPrimary: isRTL ? "ابدأ مجاناً" : "Essayer gratuitement",
    ctaSecondary: isRTL ? "استمع للأصوات" : "Écouter un exemple",
    trustNote: isRTL
      ? "50 نقطة مجانية. لا حاجة لبطاقة بنكية."
      : "50 points offerts. Aucune carte bancaire requise.",
    statsUsers: isRTL ? "مبدع نشط" : "Créateurs actifs",
    statsVoices: isRTL ? "أصوات متاحة" : "Voix disponibles",
    statsLatency: isRTL ? "زمن التوليد" : "Temps de génération",
    statsLocal: isRTL ? "دفع محلي" : "Paiement local",
    sectionVoicesKicker: isRTL ? "٠١ — الأصوات" : "01 — Les voix",
    sectionVoices: isRTL ? "أصوات بعاطفة" : "Des voix avec",
    sectionVoicesEm: isRTL ? "حقيقية." : "du caractère.",
    sectionVoicesSub: isRTL
      ? "كل صوت مسجّل ومدرّب على نبرات جزائرية أصيلة، وليس ترجمة آلية لصوت أجنبي."
      : "Chaque voix est entraînée sur de vraies intonations algériennes — pas une traduction robotique d'un accent étranger.",
    sectionFeaturesKicker: isRTL ? "٠٢ — الإمكانيات" : "02 — Capacités",
    sectionFeatures: isRTL ? "مصمم للمبدعين" : "Conçu pour les",
    sectionFeaturesEm: isRTL ? "الجزائريين." : "créateurs d'ici.",
    pricingKicker: isRTL ? "٠٣ — الأسعار" : "03 — Tarifs",
    pricingTitle: isRTL ? "ادفع فقط لما تستخدمه" : "Vous payez ce que vous utilisez",
    pricingSub: isRTL
      ? "بدون اشتراك شهري. النقاط لا تنتهي صلاحيتها أبداً."
      : "Aucun abonnement mensuel. Les points achetés n'expirent jamais.",
    faqKicker: isRTL ? "٠٤ — الأسئلة" : "04 — Questions",
    faqTitle: isRTL ? "الأسئلة الشائعة" : "Ce qu'on nous demande souvent",
    finalTitleA: isRTL ? "جاهز تسمع" : "Prêt à entendre",
    finalTitleB: isRTL ? "صوتك؟" : "votre texte prendre vie ?",
    finalSub: isRTL ? "50 نقطة مجانية عند التسجيل — بدون بطاقة." : "50 points offerts à l'inscription — sans carte bancaire.",
  };

  const voices = [
    {
      id: "amin",
      name: isRTL ? "أمين" : "Amin",
      tag: isRTL ? "تجاري • دارجة" : "Commercial · Darija",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    },
    {
      id: "yasmine",
      name: isRTL ? "ياسمين" : "Yasmine",
      tag: isRTL ? "إعلان • ناعم" : "Publicité · Douce",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    },
    {
      id: "khalid",
      name: isRTL ? "خالد" : "Khalid",
      tag: isRTL ? "وثائقي • عميق" : "Documentaire · Grave",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    },
    {
      id: "layla",
      name: isRTL ? "ليلى" : "Layla",
      tag: isRTL ? "سوشيال • حيوي" : "Social · Énergique",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    },
  ];

  const features = [
    {
      icon: Mic,
      title: isRTL ? "دارجة أصيلة" : "Darija authentique",
      desc: isRTL
        ? "نبرات جزائرية حقيقية، مع تبديل طبيعي بين الفرنسية والعربية."
        : "Vraies intonations algériennes, avec un code-switching FR/AR naturel, pas robotique.",
    },
    {
      icon: Sparkles,
      title: isRTL ? "محسّن السيناريو" : "Script enhancer",
      desc: isRTL
        ? "حسّن نصك تلقائياً للنطق الشفهي مع دلالات المشاعر."
        : "Optimise automatiquement ton texte pour l'oral, avec des balises d'émotion.",
    },
    {
      icon: Volume2,
      title: isRTL ? "تحكم دقيق" : "Contrôle précis",
      desc: isRTL
        ? "السرعة، النبرة، الوقفات — تحكم كامل في كل تفصيل."
        : "Vitesse, pitch, pauses : un contrôle total sur chaque détail du rendu.",
    },
    {
      icon: Download,
      title: isRTL ? "تصدير فوري" : "Export instantané",
      desc: isRTL
        ? "ملفات MP3 أو WAV جاهزة مباشرة للمونتاج."
        : "Fichiers MP3 ou WAV, prêts à être glissés dans ton montage.",
    },
    {
      icon: Zap,
      title: isRTL ? "توليد سريع" : "Génération rapide",
      desc: isRTL
        ? "من النص إلى الصوت الجاهز في أقل من ثلاث ثوانٍ."
        : "Du texte à la voix finalisée en moins de trois secondes.",
    },
    {
      icon: ShieldCheck,
      title: isRTL ? "دفع جزائري" : "Paiement 100% local",
      desc: isRTL
        ? "الذهبية وCIB عبر SATIM، بدون أي وسيط أجنبي."
        : "Edahabia et CIB via SATIM — sans intermédiaire étranger.",
    },
  ];

  const plans = [
    {
      name: "Starter",
      price: "990",
      points: "500",
      desc: isRTL ? "للتجربة والبداية" : "Pour tester et démarrer",
      popular: false,
    },
    {
      name: "Pro",
      price: "2 490",
      points: "1 500",
      desc: isRTL ? "للمبدعين النشطين" : "Pour les créateurs actifs",
      popular: true,
    },
    {
      name: "Agency",
      price: "4 990",
      points: "3 500",
      desc: isRTL ? "للفرق والوكالات" : "Pour équipes et agences",
      popular: false,
    },
  ];

  const faqs = isRTL
    ? [
        { q: "هل الأصوات صالحة للاستخدام التجاري؟", a: "نعم. كل الملفات قابلة للاستخدام في الإعلانات، الريلز، اليوتيوب والمشاريع التجارية." },
        { q: "كيف يعمل نظام النقاط؟", a: "تشتري رصيداً مرة واحدة. التوليد الصوتي = 20 نقطة. النقاط لا تنتهي صلاحيتها." },
        { q: "هل تدعمون الذهبية و CIB؟", a: "نعم عبر SATIM. الدفع محلي بالدينار الجزائري." },
        { q: "هل هناك اشتراك شهري؟", a: "لا. Sawtify نظام دفع مقابل الاستخدام فقط." },
      ]
    : [
        { q: "Les voix sont-elles libres de droits ?", a: "Oui. Usage commercial autorisé : pubs, reels, YouTube, projets clients." },
        { q: "Comment fonctionne le système de points ?", a: "Tu achètes un pack une fois. Une génération vocale coûte 20 points. Les points n'expirent jamais." },
        { q: "Edahabia et CIB sont-ils acceptés ?", a: "Oui, via SATIM. Paiement 100% local, en dinars algériens." },
        { q: "Y a-t-il un abonnement mensuel ?", a: "Non. Sawtify fonctionne uniquement en Pay-As-You-Go." },
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
          NAV — barre simple, pas de pilule flottante
      ========================================================= */}
      <header
        className={`sticky top-0 z-50 border-b transition-colors duration-300 ${
          scrolled ? "bg-white/95 backdrop-blur border-[#141118]/10" : "bg-white border-transparent"
        }`}
      >
        <div className="mx-auto max-w-6xl px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-[#141118] overflow-hidden">
              <img
                src="https://i.ibb.co/nqShkPNP/68126702-75e5-4de6-9b53-e51800b05e4a.jpg"
                alt="Sawtify"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="font-semibold tracking-tight text-[15px]">Sawtify</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-[13.5px] text-[#141118]/60">
            <a href="#voices" className="hover:text-[#141118] transition-colors">{t.navVoices}</a>
            <a href="#features" className="hover:text-[#141118] transition-colors">{t.navFeatures}</a>
            <a href="#pricing" className="hover:text-[#141118] transition-colors">{t.navPricing}</a>
          </nav>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setLanguage(language === "fr" ? "ar" : "fr")}
              className="w-8 h-8 rounded-md text-[11px] font-bold text-[#141118]/50 hover:text-[#141118] hover:bg-[#141118]/5 transition-colors"
            >
              {language === "fr" ? "AR" : "FR"}
            </button>
            <button
              onClick={onLoginClick}
              className="hidden sm:inline-flex px-3.5 py-2 text-[13.5px] font-medium text-[#141118]/70 hover:text-[#141118] transition-colors"
            >
              {t.login}
            </button>
            <button
              onClick={onSigninClick}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#141118] text-white px-4 py-2 text-[13.5px] font-medium hover:bg-purple-700 transition-colors"
            >
              {t.start}
            </button>
          </div>
        </div>
      </header>

      {/* =========================================================
          HERO — asymétrique, typographie dominante
      ========================================================= */}
      <section className="relative border-b border-[#141118]/10">
        <div className="mx-auto max-w-6xl px-5 pt-16 sm:pt-24 pb-14">
          <motion.div
            initial="hidden"
            animate="show"
            variants={stagger}
            className="max-w-3xl"
          >
            <motion.div variants={fadeUp} className="flex items-center gap-2 mb-6 text-[13px] text-[#141118]/50">
              <span className="w-4 h-px bg-purple-600" />
              {t.kicker}
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-[2.6rem] sm:text-6xl lg:text-[4.2rem] leading-[1.02] font-medium tracking-tight text-[#141118]"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              {t.heroTitleA}
              <br />
              {t.heroTitleB.split(" ")[0]}{" "}
              <span className="text-purple-700">
                {t.heroTitleB.split(" ").slice(1).join(" ")}
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-6 text-[#141118]/60 text-base sm:text-lg leading-relaxed max-w-xl"
            >
              {t.heroDesc}
            </motion.p>

            <motion.div variants={fadeUp} className="mt-8 flex flex-col sm:flex-row gap-3">
              <button
                onClick={onSigninClick}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#141118] text-white px-6 py-3.5 text-sm font-medium hover:bg-purple-700 transition-colors"
              >
                {t.ctaPrimary}
                <ArrowIcon />
              </button>
              <a
                href="#voices"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-[#141118]/15 px-6 py-3.5 text-sm font-medium text-[#141118] hover:border-[#141118]/40 transition-colors"
              >
                <Play className="w-3.5 h-3.5" />
                {t.ctaSecondary}
              </a>
            </motion.div>

            <motion.p variants={fadeUp} className="mt-5 text-xs text-[#141118]/40">
              {t.trustNote}
            </motion.p>
          </motion.div>
        </div>

        {/* Media — pleine largeur, sobre, pas de carte flottante */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto max-w-6xl px-5 pb-16"
        >
          <div className="relative rounded-2xl overflow-hidden bg-[#141118] aspect-[16/8] sm:aspect-[16/6.5]">
            <video
              ref={videoRef}
              src="https://res.cloudinary.com/gz65ybug/video/upload/v1788621700/Robot_looking_with_microphone_1080p_202609051613.mp4"
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#141118]/70 via-transparent to-transparent" />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-[#141118]/40">
            <span>{isRTL ? "دارجة • عربية • مزيج فرنسي" : "Darija · Arabe · Mix français"}</span>
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> SATIM · Edahabia · CIB
            </span>
          </div>
        </motion.div>
      </section>

      {/* =========================================================
          STATS — ligne fine, pas de bloc noir plaqué
      ========================================================= */}
      <section className="border-b border-[#141118]/10">
        <div className="mx-auto max-w-6xl px-5 py-8 grid grid-cols-2 md:grid-cols-4">
          {[
            { n: "1,200+", l: t.statsUsers },
            { n: "12", l: t.statsVoices },
            { n: "< 3s", l: t.statsLatency },
            { n: "100%", l: t.statsLocal },
          ].map((s, i) => (
            <motion.div
              key={s.l}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className={`px-4 py-3 ${i !== 0 ? "border-s border-[#141118]/10" : ""}`}
            >
              <div
                className="text-2xl sm:text-3xl font-medium tracking-tight text-[#141118]"
                style={{ fontFamily: "'Fraunces', Georgia, serif" }}
              >
                {s.n}
              </div>
              <div className="text-xs text-[#141118]/45 mt-1">{s.l}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* =========================================================
          VOICES — liste horizontale (pas de grille de cartes)
      ========================================================= */}
      <section id="voices" className="border-b border-[#141118]/10">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10"
          >
            <div>
              <div className="text-xs text-purple-700 font-medium mb-3">{t.sectionVoicesKicker}</div>
              <h2
                className="text-3xl sm:text-4xl font-medium tracking-tight text-[#141118]"
                style={{ fontFamily: "'Fraunces', Georgia, serif" }}
              >
                {t.sectionVoices} <span className="text-purple-700">{t.sectionVoicesEm}</span>
              </h2>
            </div>
            <p className="text-[#141118]/50 text-sm max-w-sm">{t.sectionVoicesSub}</p>
          </motion.div>

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
          FEATURES — liste numérotée, sticky title, pas de bento
      ========================================================= */}
      <section id="features" className="border-b border-[#141118]/10 bg-[#FAF9F7]">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <div className="grid lg:grid-cols-12 gap-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-4 lg:sticky lg:top-24 self-start"
            >
              <div className="text-xs text-purple-700 font-medium mb-3">{t.sectionFeaturesKicker}</div>
              <h2
                className="text-3xl sm:text-4xl font-medium tracking-tight text-[#141118]"
                style={{ fontFamily: "'Fraunces', Georgia, serif" }}
              >
                {t.sectionFeatures} <span className="text-purple-700">{t.sectionFeaturesEm}</span>
              </h2>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={stagger}
              className="lg:col-span-8 divide-y divide-[#141118]/10 border-t border-[#141118]/10"
            >
              {features.map((f, i) => (
                <motion.div
                  key={f.title}
                  variants={fadeUp}
                  className="flex items-start gap-5 py-6"
                >
                  <span className="text-xs font-mono text-[#141118]/30 pt-1 w-6 shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                    <f.icon className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <div className="font-medium text-[#141118] mb-1">{f.title}</div>
                    <p className="text-sm text-[#141118]/55 leading-relaxed">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* =========================================================
          PRICING — comparaison en lignes, pas de 3 cartes flottantes
      ========================================================= */}
      <section id="pricing" className="border-b border-[#141118]/10">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-xl mb-12"
          >
            <div className="text-xs text-purple-700 font-medium mb-3">{t.pricingKicker}</div>
            <h2
              className="text-3xl sm:text-4xl font-medium tracking-tight text-[#141118] mb-3"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              {t.pricingTitle}
            </h2>
            <p className="text-[#141118]/55">{t.pricingSub}</p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={stagger}
            className="grid md:grid-cols-3 border-t border-[#141118]/10"
          >
            {plans.map((p, i) => (
              <motion.div
                key={p.name}
                variants={fadeUp}
                className={`relative p-8 border-b md:border-b-0 border-[#141118]/10 ${
                  i !== 0 ? "md:border-s" : ""
                } ${p.popular ? "bg-[#141118] text-white" : "bg-white"}`}
              >
                {p.popular && (
                  <div className="text-[11px] font-medium text-purple-300 mb-4 uppercase tracking-wide">
                    {isRTL ? "الأكثر طلباً" : "Le plus choisi"}
                  </div>
                )}
                <div className={`text-sm font-medium mb-1 ${p.popular ? "text-white" : "text-[#141118]"}`}>
                  {p.name}
                </div>
                <div className={`text-sm mb-6 ${p.popular ? "text-white/50" : "text-[#141118]/45"}`}>
                  {p.desc}
                </div>
                <div className="flex items-baseline gap-1.5 mb-1">
                  <span
                    className="text-4xl font-medium tracking-tight"
                    style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                  >
                    {p.price}
                  </span>
                  <span className={`text-sm ${p.popular ? "text-white/40" : "text-[#141118]/40"}`}>DZD</span>
                </div>
                <div className={`text-sm font-medium mb-8 ${p.popular ? "text-purple-300" : "text-purple-700"}`}>
                  {p.points} {isRTL ? "نقطة" : "points"}
                </div>
                <button
                  onClick={onSigninClick}
                  className={`w-full rounded-md py-3 text-sm font-medium transition-colors ${
                    p.popular
                      ? "bg-white text-[#141118] hover:bg-purple-100"
                      : "bg-[#141118] text-white hover:bg-purple-700"
                  }`}
                >
                  {isRTL ? "اختيار الباقة" : "Choisir ce pack"}
                </button>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* =========================================================
          FAQ — numérotée, minimaliste
      ========================================================= */}
      <section className="border-b border-[#141118]/10">
        <div className="mx-auto max-w-3xl px-5 py-16 sm:py-20">
          <div className="text-xs text-purple-700 font-medium mb-3">{t.faqKicker}</div>
          <h2
            className="text-3xl font-medium tracking-tight text-[#141118] mb-8"
            style={{ fontFamily: "'Fraunces', Georgia, serif" }}
          >
            {t.faqTitle}
          </h2>

          <div className="border-t border-[#141118]/10">
            {faqs.map((f, i) => {
              const open = openFaq === i;
              return (
                <div key={f.q} className="border-b border-[#141118]/10">
                  <button
                    onClick={() => setOpenFaq(open ? null : i)}
                    className="w-full py-5 flex items-start gap-4 text-start"
                  >
                    <span className="text-xs font-mono text-[#141118]/30 pt-0.5 w-6 shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="flex-1 font-medium text-[15px] text-[#141118]">{f.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-[#141118]/35 mt-0.5 shrink-0 transition-transform duration-300 ${
                        open ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  <motion.div
                    initial={false}
                    animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <p className="ps-10 pb-5 text-sm text-[#141118]/55 leading-relaxed max-w-xl">
                      {f.a}
                    </p>
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================
          FINAL CTA — typographie forte, pas de blur décoratif
      ========================================================= */}
      <section className="bg-[#141118] text-white">
        <div className="mx-auto max-w-4xl px-5 py-20 sm:py-28 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-4xl sm:text-6xl font-medium tracking-tight leading-[1.05] mb-5"
            style={{ fontFamily: "'Fraunces', Georgia, serif" }}
          >
            {t.finalTitleA} <span className="text-purple-400">{t.finalTitleB}</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="text-white/55 mb-9"
          >
            {t.finalSub}
          </motion.p>
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.25 }}
            onClick={onSigninClick}
            className="inline-flex items-center gap-2 rounded-md bg-white text-[#141118] px-7 py-3.5 text-sm font-medium hover:bg-purple-100 transition-colors"
          >
            {t.ctaPrimary}
            <ArrowIcon />
          </motion.button>
        </div>
      </section>

      {/* =========================================================
          FOOTER — sobre, informatif
      ========================================================= */}
      <footer className="bg-white">
        <div className="mx-auto max-w-6xl px-5 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md overflow-hidden bg-[#141118]">
              <img
                src="https://i.ibb.co/nqShkPNP/68126702-75e5-4de6-9b53-e51800b05e4a.jpg"
                alt="Sawtify"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="font-semibold text-sm">Sawtify</span>
            <span className="text-[#141118]/35 text-sm">© 2026</span>
          </div>
          <div className="text-xs text-[#141118]/40">SATIM · Edahabia · CIB</div>
        </div>
      </footer>
    </div>
  );
};
