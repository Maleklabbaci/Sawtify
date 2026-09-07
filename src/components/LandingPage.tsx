import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, ArrowRight, ArrowLeft, ShieldCheck, Zap, Volume2, Download, 
  CheckCircle2, Sparkles, CreditCard, Play, Pause, Waves, Globe, 
  Wand2, Radio, Headphones, Users, TrendingUp, Star, Quote,
  ChevronDown, Layers, Clock, MessageSquare
} from 'lucide-react';
import { motion } from 'motion/react';
import { getVoices } from '../data/voices';

interface LandingPageProps {
  onLoginClick: () => void;
  onSigninClick: () => void;
  language: 'fr' | 'ar';
  setLanguage: (lang: 'fr' | 'ar') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onLoginClick,
  onSigninClick,
  language,
  setLanguage,
}) => {
  const isRTL = language === 'ar';
  const voices = getVoices(language);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [openFAQ, setOpenFAQ] = useState<number | null>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.playbackRate = 1.0;
      video.play().catch(() => {});
    }

    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleVoicePreview = (voiceId: string, audioUrl: string) => {
    if (playingVoiceId === voiceId) {
      audioRef.current?.pause();
      setPlayingVoiceId(null);
    } else {
      audioRef.current?.pause();
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setPlayingVoiceId(null);
      audioRef.current.play();
      setPlayingVoiceId(voiceId);
    }
  };

  const ArrowIcon = ({ className }: { className?: string }) => 
    isRTL ? <ArrowLeft className={className} /> : <ArrowRight className={className} />;

  // Data pour les voix showcase
  const showcaseVoices = [
    { id: 'v1', name: language === 'ar' ? 'أمين' : 'Amin', style: language === 'ar' ? 'تجاري • دارجة' : 'Commercial • Darija', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', gender: 'male' },
    { id: 'v2', name: language === 'ar' ? 'ياسمين' : 'Yasmine', style: language === 'ar' ? 'إعلاني • ناعم' : 'Publicitaire • Doux', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', gender: 'female' },
    { id: 'v3', name: language === 'ar' ? 'خالد' : 'Khalid', style: language === 'ar' ? 'وثائقي • رزين' : 'Documentaire • Grave', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', gender: 'male' },
    { id: 'v4', name: language === 'ar' ? 'ليلى' : 'Layla', style: language === 'ar' ? 'سوشيال ميديا' : 'Social Media', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', gender: 'female' },
  ];

  const faqs = language === 'ar' ? [
    { q: 'ما الذي يميز صوتيفي عن المنصات الأخرى؟', a: 'صوتيفي هي المنصة الوحيدة المتخصصة في الدارجة الجزائرية الأصيلة بلهجاتها المختلفة (وسط، غرب، شرق). أصواتنا مدربة على آلاف الساعات من التسجيلات المحلية.' },
    { q: 'كيف يعمل نظام النقاط؟', a: 'تشتري رصيداً من النقاط دفعة واحدة ولا ينتهي أبداً. كل توليد صوتي يكلف 20 نقطة، وتحسين النص يكلف 2 نقطة فقط.' },
    { q: 'هل يمكنني استخدام الأصوات تجارياً؟', a: 'نعم، جميع الأصوات المولدة قابلة للاستخدام التجاري بلا قيود: إعلانات، ريلز، بودكاست، فيديوهات يوتيوب.' },
    { q: 'ما هي وسائل الدفع المتوفرة؟', a: 'ندعم البطاقة الذهبية Edahabia و CIB عبر بوابة الدفع المعتمدة SATIM. الدفع آمن 100% ومحلي بالدينار الجزائري.' },
    { q: 'هل هناك اشتراك شهري؟', a: 'لا، صوتيفي يعمل بنموذج Pay-As-You-Go. ادفع فقط مقابل ما تستخدمه، بدون التزامات شهرية.' },
    { q: 'ما جودة الملفات المصدّرة؟', a: 'نصدّر بجودة استوديو (24kHz، MP3 أو WAV) جاهزة للمونتاج والبث المباشر على جميع المنصات.' },
  ] : [
    { q: 'Qu\'est-ce qui différencie Sawtify des autres plateformes ?', a: 'Sawtify est la seule plateforme spécialisée dans la Darija algérienne authentique avec ses variantes régionales (Centre, Ouest, Est). Nos voix sont entraînées sur des milliers d\'heures d\'enregistrements locaux.' },
    { q: 'Comment fonctionne le système de points ?', a: 'Vous achetez un pack de points une seule fois, et ils n\'expirent jamais. Chaque génération vocale coûte 20 points, l\'amélioration de texte seulement 2 points.' },
    { q: 'Puis-je utiliser les voix commercialement ?', a: 'Oui, toutes les voix générées sont libres de droits pour usage commercial : publicités, reels, podcasts, vidéos YouTube.' },
    { q: 'Quels sont les moyens de paiement ?', a: 'Nous acceptons la carte Edahabia et CIB via SATIM (passerelle certifiée). Paiement 100% sécurisé et local en Dinars algériens.' },
    { q: 'Y a-t-il un abonnement mensuel ?', a: 'Non, Sawtify fonctionne en Pay-As-You-Go. Vous payez uniquement ce que vous utilisez, sans engagement mensuel.' },
    { q: 'Quelle qualité pour les fichiers exportés ?', a: 'Nous exportons en qualité studio (24kHz, MP3 ou WAV) prêts pour le montage et la diffusion sur toutes les plateformes.' },
  ];

  const testimonials = [
    { name: language === 'ar' ? 'كريم بن علي' : 'Karim Benali', role: language === 'ar' ? 'صانع محتوى • الجزائر' : 'Créateur de contenu • Alger', text: language === 'ar' ? 'أخيراً منصة تفهم الدارجة الجزائرية كما هي. صوتيفي وفّر لي ساعات من التسجيل.' : 'Enfin une plateforme qui comprend la Darija comme elle se parle vraiment. Sawtify m\'a fait gagner des heures d\'enregistrement.', rating: 5 },
    { name: language === 'ar' ? 'أمينة زعتر' : 'Amina Zaatar', role: language === 'ar' ? 'مسوّقة رقمية • وهران' : 'Marketeuse Digital • Oran', text: language === 'ar' ? 'الجودة مذهلة والأصوات طبيعية جداً. عملاؤنا لا يميّزون بينها وبين الصوت البشري.' : 'La qualité est bluffante, les voix sont si naturelles que nos clients ne font pas la différence.', rating: 5 },
    { name: language === 'ar' ? 'محمد شرفاوي' : 'Mohamed Cherfaoui', role: language === 'ar' ? 'مالك متجر إلكتروني • قسنطينة' : 'E-commerçant • Constantine', text: language === 'ar' ? 'الدفع بالبطاقة الذهبية جعل كل شيء سهلاً. المنصة الجزائرية التي كنّا ننتظرها.' : 'Le paiement Edahabia rend tout simple. C\'est LA plateforme algérienne qu\'on attendait.', rating: 5 },
  ];

  return (
    <div 
      className="min-h-screen bg-[#FBFAF7] text-slate-900 font-sans selection:bg-purple-200 selection:text-purple-900 relative overflow-x-hidden" 
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}
    >
      
      {/* Video Background confinée au Hero */}
      <div className="absolute top-0 left-0 right-0 h-[900px] max-h-[110vh] pointer-events-none z-0 overflow-hidden">
        <video
          ref={videoRef}
          src="https://res.cloudinary.com/gz65ybug/video/upload/v1788621700/Robot_looking_with_microphone_1080p_202609051613.mp4"
          autoPlay muted loop playsInline preload="metadata"
          poster="https://i.ibb.co/nqShkPNP/68126702-75e5-4de6-9b53-e51800b05e4a.jpg"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#FBFAF7]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#FBFAF7]/60 via-transparent to-transparent" dir="ltr" />
      </div>

      {/* Header */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled ? 'bg-[#FBFAF7]/90 backdrop-blur-xl border-b border-slate-200/60 py-3' : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-700 text-white flex items-center justify-center shadow-sm overflow-hidden">
              <img src="https://i.ibb.co/nqShkPNP/68126702-75e5-4de6-9b53-e51800b05e4a.jpg" alt="Sawtify" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-slate-900 tracking-tight text-base">Sawtify</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-700">
            <a href="#voices" className="hover:text-purple-700 transition">{language === 'ar' ? 'الأصوات' : 'Voix'}</a>
            <a href="#features" className="hover:text-purple-700 transition">{language === 'ar' ? 'المميزات' : 'Fonctionnalités'}</a>
            <a href="#pricing" className="hover:text-purple-700 transition">{language === 'ar' ? 'الأسعار' : 'Tarifs'}</a>
            <a href="#faq" className="hover:text-purple-700 transition">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setLanguage(language === 'fr' ? 'ar' : 'fr')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 transition cursor-pointer"
            >
              {language === 'fr' ? 'العربية' : 'FR'}
            </button>
            <button
              onClick={onLoginClick}
              className="hidden sm:block px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-slate-900 transition cursor-pointer"
            >
              {language === 'ar' ? 'دخول' : 'Connexion'}
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onSigninClick}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-slate-900 hover:bg-purple-700 text-white transition cursor-pointer flex items-center gap-1.5"
            >
              <span>{language === 'ar' ? 'ابدأ مجاناً' : 'Commencer'}</span>
              <ArrowIcon className="w-3.5 h-3.5" />
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* HERO SECTION */}
      <section className="relative z-10 pt-40 pb-32 sm:pt-48 sm:pb-40">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-4xl">
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-50 border border-purple-200 text-purple-800 text-xs font-semibold mb-8"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-600"></span>
              </span>
              <span>{language === 'ar' ? 'الجيل الجديد من الأصوات الذكية بالدارجة' : 'Nouvelle génération de voix IA en Darija'}</span>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="text-5xl sm:text-6xl lg:text-7xl font-bold text-slate-900 tracking-tight leading-[1.05] mb-8"
              style={{ fontFamily: "'Fraunces', 'Georgia', serif", letterSpacing: '-0.03em' }}
            >
              {language === 'ar' ? (
                <>
                  الصوت الجزائري
                  <br />
                  <span className="italic text-purple-700">الأصيل</span>
                  <span className="text-slate-400">.</span>
                </>
              ) : (
                <>
                  La voix algérienne
                  <br />
                  <span className="italic text-purple-700">authentique</span>
                  <span className="text-slate-400">.</span>
                </>
              )}
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="text-lg sm:text-xl text-slate-600 max-w-2xl leading-relaxed font-normal mb-10"
            >
              {language === 'ar'
                ? 'أنشئ تعليقات صوتية بجودة استوديو، بالدارجة الجزائرية أو العربية الفصحى، في ثوانٍ معدودة. مصممة للمحترفين وصنّاع المحتوى.'
                : 'Générez des voix off en qualité studio, en Darija ou en Arabe classique, en quelques secondes. Conçu pour les professionnels et les créateurs.'}
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-3"
            >
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onSigninClick}
                className="w-full sm:w-auto px-7 py-3.5 bg-slate-900 hover:bg-purple-700 text-white font-semibold rounded-xl text-base flex items-center justify-center gap-2 transition cursor-pointer group"
              >
                <span>{language === 'ar' ? 'ابدأ مجاناً • 50 نقطة' : 'Commencer gratuitement'}</span>
                <ArrowIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => document.getElementById('voices')?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full sm:w-auto px-7 py-3.5 text-slate-900 border border-slate-300 hover:border-slate-900 font-semibold rounded-xl text-base flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Volume2 className="w-4 h-4" />
                <span>{language === 'ar' ? 'استمع للأصوات' : 'Écouter les voix'}</span>
              </motion.button>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-16 flex flex-wrap items-center gap-x-8 gap-y-3 text-xs text-slate-500 font-medium"
            >
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                <span>{language === 'ar' ? 'معتمد من ساتيم' : 'Certifié SATIM'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-purple-600" />
                <span>Edahabia & CIB</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-purple-600" />
                <span>{language === 'ar' ? '+1000 مستخدم نشط' : '+1000 utilisateurs actifs'}</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* LOGOS / TRUST BAR */}
      <section className="relative z-10 py-12 border-y border-slate-200/60 bg-white/40">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <p className="text-center text-xs uppercase tracking-widest text-slate-500 font-semibold mb-8">
            {language === 'ar' ? 'يثق بنا صنّاع المحتوى والشركات في' : 'Utilisé par des créateurs et entreprises à travers'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-16 text-slate-400 font-bold text-lg tracking-wide">
            <span>ALGER</span>
            <span className="hidden sm:inline">•</span>
            <span>ORAN</span>
            <span className="hidden sm:inline">•</span>
            <span>CONSTANTINE</span>
            <span className="hidden sm:inline">•</span>
            <span>ANNABA</span>
            <span className="hidden sm:inline">•</span>
            <span>SÉTIF</span>
            <span className="hidden sm:inline">•</span>
            <span>TLEMCEN</span>
          </div>
        </div>
      </section>

      {/* VOICES SHOWCASE — INSPIRÉ ELEVENLABS */}
      <section id="voices" className="relative z-10 py-24 sm:py-32 bg-[#FBFAF7]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-3xl mb-16">
            <p className="text-xs uppercase tracking-widest text-purple-700 font-bold mb-4">
              {language === 'ar' ? 'الأصوات' : 'Les voix'}
            </p>
            <h2 
              className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight leading-tight mb-6"
              style={{ fontFamily: "'Fraunces', 'Georgia', serif", letterSpacing: '-0.02em' }}
            >
              {language === 'ar' ? 'أصوات حقيقية. عاطفة حقيقية.' : 'Des voix réelles. Une émotion réelle.'}
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              {language === 'ar' 
                ? 'كل صوت في مكتبتنا مدرّب بعناية على النطق والتعبيرات الجزائرية الأصيلة. اختر الصوت الذي يعكس علامتك التجارية.'
                : 'Chaque voix de notre bibliothèque est entraînée avec soin sur les intonations et expressions algériennes authentiques. Choisissez celle qui incarne votre marque.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {showcaseVoices.map((voice, idx) => (
              <motion.div
                key={voice.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                whileHover={{ y: -4 }}
                className="group relative bg-white border border-slate-200 rounded-2xl p-6 hover:border-purple-300 hover:shadow-lg transition-all cursor-pointer"
                onClick={() => toggleVoicePreview(voice.id, voice.audioUrl)}
              >
                <div className="flex items-start justify-between mb-6">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${voice.gender === 'female' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>
                    {voice.gender === 'female' ? <Sparkles className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </div>
                  <button className={`w-10 h-10 rounded-full flex items-center justify-center transition ${playingVoiceId === voice.id ? 'bg-purple-700 text-white' : 'bg-slate-100 text-slate-700 group-hover:bg-slate-900 group-hover:text-white'}`}>
                    {playingVoiceId === voice.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>
                </div>

                <h3 className="text-lg font-bold text-slate-900 mb-1">{voice.name}</h3>
                <p className="text-xs text-slate-500 font-medium mb-4">{voice.style}</p>

                {/* Waveform statique */}
                <div className="flex items-center gap-0.5 h-8">
                  {[...Array(28)].map((_, i) => (
                    <div 
                      key={i}
                      className={`flex-1 rounded-full transition-all ${playingVoiceId === voice.id ? 'bg-purple-600 animate-pulse' : 'bg-slate-200 group-hover:bg-slate-300'}`}
                      style={{ 
                        height: `${20 + Math.sin(i * 0.5) * 30 + Math.random() * 20}%`,
                        animationDelay: `${i * 30}ms`
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <button 
              onClick={onSigninClick}
              className="inline-flex items-center gap-2 text-sm font-semibold text-purple-700 hover:text-purple-900 transition cursor-pointer"
            >
              <span>{language === 'ar' ? 'اكتشف كل الأصوات' : 'Explorer toutes les voix'}</span>
              <ArrowIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* FEATURES — GRID ÉDITORIALE */}
      <section id="features" className="relative z-10 py-24 sm:py-32 bg-white border-y border-slate-200/60">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-3xl mb-16">
            <p className="text-xs uppercase tracking-widest text-purple-700 font-bold mb-4">
              {language === 'ar' ? 'المميزات' : 'Fonctionnalités'}
            </p>
            <h2 
              className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight leading-tight mb-6"
              style={{ fontFamily: "'Fraunces', 'Georgia', serif", letterSpacing: '-0.02em' }}
            >
              {language === 'ar' ? 'كل ما تحتاجه لصناعة صوت مثالي.' : 'Tout ce qu\'il faut pour créer un son parfait.'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Globe, title: language === 'ar' ? 'لهجات متعددة' : 'Lahdjas multiples', desc: language === 'ar' ? 'لهجات الوسط، الغرب والشرق. اختر النبرة التي تناسب جمهورك المحلي.' : 'Accents du Centre, de l\'Ouest et de l\'Est. Choisissez le ton qui parle à votre audience.' },
              { icon: Wand2, title: language === 'ar' ? 'محسّن ذكي للنصوص' : 'Améliorateur intelligent', desc: language === 'ar' ? 'ذكاء اصطناعي يحسّن نصوصك تلقائياً ليصبح النطق طبيعياً وعاطفياً.' : 'Une IA qui reformule vos textes pour un rendu vocal naturel et émotionnel.' },
              { icon: Radio, title: language === 'ar' ? 'وسوم عاطفية' : 'Balises d\'émotion', desc: language === 'ar' ? 'أضف [حماس]، [هدوء]، [همس] لتحكم كامل بالأداء الصوتي.' : 'Ajoutez [excited], [calm], [whisper] pour un contrôle total de la performance.' },
              { icon: Volume2, title: language === 'ar' ? 'تحكم دقيق' : 'Contrôle précis', desc: language === 'ar' ? 'اضبط السرعة والنبرة والوقفات لتصبح النتيجة كأنها تسجيل حي.' : 'Ajustez vitesse, tonalité, pauses pour un rendu digne d\'un enregistrement live.' },
              { icon: Download, title: language === 'ar' ? 'تصدير احترافي' : 'Export professionnel', desc: language === 'ar' ? 'MP3 و WAV بجودة 24kHz، جاهزة للاستوديو والبث المباشر.' : 'MP3 et WAV en qualité 24kHz, prêts pour le studio et le direct.' },
              { icon: MessageSquare, title: language === 'ar' ? 'مولّد سيناريو تيك توك' : 'Générateur de scripts TikTok', desc: language === 'ar' ? 'أدخل اسم منتجك، احصل على سيناريو ريلز كامل في ثوانٍ.' : 'Entrez le nom de votre produit, obtenez un script Reel complet en secondes.' },
            ].map((feat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.05 }}
                className="group"
              >
                <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mb-5 group-hover:bg-purple-700 group-hover:text-white transition">
                  <feat.icon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2 tracking-tight">{feat.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* USE CASES — STORYTELLING SECTION */}
      <section className="relative z-10 py-24 sm:py-32 bg-[#FBFAF7]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-20">
            <p className="text-xs uppercase tracking-widest text-purple-700 font-bold mb-4">
              {language === 'ar' ? 'الاستخدامات' : 'Cas d\'usage'}
            </p>
            <h2 
              className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight leading-tight"
              style={{ fontFamily: "'Fraunces', 'Georgia', serif", letterSpacing: '-0.02em' }}
            >
              {language === 'ar' ? 'صمّم لكل صنّاع الصوت في الجزائر.' : 'Pensé pour tous les créateurs de son en Algérie.'}
            </h2>
          </div>

          <div className="space-y-24">
            {[
              { 
                title: language === 'ar' ? 'صنّاع محتوى تيك توك وريلز' : 'Créateurs TikTok & Reels',
                desc: language === 'ar' ? 'أنشئ ريلز فيروسية بأصوات جزائرية أصيلة. مولّد السيناريوهات المدمج يوفّر لك ساعات من الكتابة، والوسوم العاطفية تضيف لمسة درامية لكل جملة.' : 'Créez des reels viraux avec des voix algériennes authentiques. Le générateur de scripts intégré vous fait gagner des heures, et les balises d\'émotion ajoutent une dimension dramatique à chaque phrase.',
                stat: language === 'ar' ? '3× أسرع' : '3× plus rapide',
                statLabel: language === 'ar' ? 'من التسجيل التقليدي' : 'que l\'enregistrement classique',
                icon: TrendingUp
              },
              { 
                title: language === 'ar' ? 'وكالات التسويق والإعلانات' : 'Agences marketing & publicité',
                desc: language === 'ar' ? 'صوت متسق للعلامات التجارية عبر جميع الحملات. عدّل النصوص وأعد التوليد فوراً بدون العودة لاستوديو التسجيل أو ممثّل الصوت.' : 'Une voix cohérente pour vos marques à travers toutes les campagnes. Modifiez les textes et regénérez instantanément, sans repasser par le studio ou le comédien.',
                stat: language === 'ar' ? '90%' : '90%',
                statLabel: language === 'ar' ? 'توفير في التكاليف' : 'd\'économie sur les coûts',
                icon: Layers
              },
              { 
                title: language === 'ar' ? 'التجارة الإلكترونية' : 'E-commerce & boutiques en ligne',
                desc: language === 'ar' ? 'أنشئ فيديوهات إعلانية للمنتجات باللهجة المحلية التي يفهمها عملاؤك. أفضل من الترجمة، أقرب للثقافة الجزائرية.' : 'Créez des vidéos de produits dans la langue que vos clients parlent vraiment. Mieux qu\'une traduction, plus proche de la culture algérienne.',
                stat: language === 'ar' ? '+40%' : '+40%',
                statLabel: language === 'ar' ? 'زيادة في التفاعل' : 'd\'engagement en plus',
                icon: Clock
              },
            ].map((useCase, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
                className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${idx % 2 === 1 ? 'lg:direction-rtl' : ''}`}
              >
                <div className={idx % 2 === 1 ? 'lg:order-2' : ''}>
                  <div className="w-12 h-12 rounded-2xl bg-purple-700 text-white flex items-center justify-center mb-6">
                    <useCase.icon className="w-6 h-6" />
                  </div>
                  <h3 
                    className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight leading-tight mb-5"
                    style={{ fontFamily: "'Fraunces', 'Georgia', serif" }}
                  >
                    {useCase.title}
                  </h3>
                  <p className="text-base text-slate-600 leading-relaxed mb-8">
                    {useCase.desc}
                  </p>
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-bold text-purple-700" style={{ fontFamily: "'Fraunces', serif" }}>{useCase.stat}</span>
                    <span className="text-sm text-slate-600 font-medium">{useCase.statLabel}</span>
                  </div>
                </div>

                <div className={`aspect-square bg-gradient-to-br from-purple-100 via-purple-50 to-white rounded-3xl border border-purple-200/40 flex items-center justify-center ${idx % 2 === 1 ? 'lg:order-1' : ''}`}>
                  <div className="text-purple-700/30">
                    <useCase.icon className="w-32 h-32" strokeWidth={1} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section id="pricing" className="relative z-10 py-24 sm:py-32 bg-white border-y border-slate-200/60">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <p className="text-xs uppercase tracking-widest text-purple-700 font-bold mb-4">
              {language === 'ar' ? 'الأسعار' : 'Tarifs'}
            </p>
            <h2 
              className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight leading-tight mb-6"
              style={{ fontFamily: "'Fraunces', 'Georgia', serif", letterSpacing: '-0.02em' }}
            >
              {language === 'ar' ? 'ادفع فقط لما تستخدمه.' : 'Payez uniquement ce que vous utilisez.'}
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              {language === 'ar' ? 'لا اشتراكات مخفية. النقاط لا تنتهي أبداً.' : 'Pas d\'abonnements cachés. Vos points n\'expirent jamais.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { name: language === 'ar' ? 'المبتدئ' : 'Starter', price: '990', points: '500', desc: language === 'ar' ? 'مثالي للتجربة' : 'Parfait pour tester', popular: false },
              { name: language === 'ar' ? 'المحترف' : 'Pro', price: '2 490', points: '1 500', desc: language === 'ar' ? 'للمبدعين النشطين' : 'Pour les créateurs actifs', popular: true },
              { name: language === 'ar' ? 'الوكالة' : 'Agency', price: '4 990', points: '3 500', desc: language === 'ar' ? 'للفرق والوكالات' : 'Pour les équipes et agences', popular: false },
            ].map((plan, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className={`relative rounded-2xl p-8 border transition-all hover:shadow-xl ${plan.popular ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200'}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-purple-600 text-white text-xs font-bold rounded-full">
                    {language === 'ar' ? 'الأكثر شعبية' : 'Plus populaire'}
                  </div>
                )}
                <h3 className={`text-sm font-semibold uppercase tracking-widest mb-2 ${plan.popular ? 'text-purple-300' : 'text-purple-700'}`}>{plan.name}</h3>
                <p className={`text-sm mb-6 ${plan.popular ? 'text-slate-400' : 'text-slate-600'}`}>{plan.desc}</p>
                <div className="mb-6">
                  <span className="text-5xl font-bold" style={{ fontFamily: "'Fraunces', serif" }}>{plan.price}</span>
                  <span className={`text-sm ml-2 ${plan.popular ? 'text-slate-400' : 'text-slate-500'}`}>DZD</span>
                </div>
                <div className={`text-3xl font-bold mb-8 ${plan.popular ? 'text-purple-300' : 'text-purple-700'}`}>
                  {plan.points} <span className="text-sm font-normal">{language === 'ar' ? 'نقطة' : 'points'}</span>
                </div>
                <button
                  onClick={onSigninClick}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition cursor-pointer ${plan.popular ? 'bg-white text-slate-900 hover:bg-purple-100' : 'bg-slate-900 text-white hover:bg-purple-700'}`}
                >
                  {language === 'ar' ? 'اختر هذه الباقة' : 'Choisir cette offre'}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="relative z-10 py-24 sm:py-32 bg-[#FBFAF7]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-3xl mb-16">
            <p className="text-xs uppercase tracking-widest text-purple-700 font-bold mb-4">
              {language === 'ar' ? 'شهادات المستخدمين' : 'Témoignages'}
            </p>
            <h2 
              className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight leading-tight"
              style={{ fontFamily: "'Fraunces', 'Georgia', serif", letterSpacing: '-0.02em' }}
            >
              {language === 'ar' ? 'صنّاع محتوى يحبّون صوتيفي.' : 'Des créateurs qui adorent Sawtify.'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="bg-white border border-slate-200 rounded-2xl p-8 hover:shadow-lg transition"
              >
                <Quote className="w-8 h-8 text-purple-200 mb-4" />
                <p className="text-base text-slate-700 leading-relaxed mb-8 italic" style={{ fontFamily: "'Fraunces', serif" }}>
                  "{t.text}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center text-white font-bold">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{t.name}</p>
                    <p className="text-xs text-slate-500">{t.role}</p>
                  </div>
                  <div className="ml-auto flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-purple-600 text-purple-600" />
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative z-10 py-24 sm:py-32 bg-white border-y border-slate-200/60">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="mb-16 text-center">
            <p className="text-xs uppercase tracking-widest text-purple-700 font-bold mb-4">FAQ</p>
            <h2 
              className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight leading-tight"
              style={{ fontFamily: "'Fraunces', 'Georgia', serif", letterSpacing: '-0.02em' }}
            >
              {language === 'ar' ? 'أسئلة يطرحها الجميع.' : 'Les questions qu\'on nous pose.'}
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className="border border-slate-200 rounded-2xl overflow-hidden bg-white"
              >
                <button
                  onClick={() => setOpenFAQ(openFAQ === idx ? null : idx)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left cursor-pointer hover:bg-slate-50 transition"
                >
                  <span className="text-base font-bold text-slate-900 pr-4">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${openFAQ === idx ? 'rotate-180 text-purple-700' : ''}`} />
                </button>
                {openFAQ === idx && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.3 }}
                    className="px-6 pb-5 text-sm text-slate-600 leading-relaxed"
                  >
                    {faq.a}
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINALE */}
      <section className="relative z-10 py-24 sm:py-32 bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 
            className="text-4xl sm:text-6xl font-bold tracking-tight leading-tight mb-8"
            style={{ fontFamily: "'Fraunces', 'Georgia', serif", letterSpacing: '-0.02em' }}
          >
            {language === 'ar' ? (
              <>
                ابدأ في إنشاء
                <br />
                <span className="italic text-purple-400">أصواتك</span>
                {' '}اليوم<span className="text-purple-400">.</span>
              </>
            ) : (
              <>
                Commencez à créer
                <br />
                vos <span className="italic text-purple-400">voix</span> dès aujourd'hui<span className="text-purple-400">.</span>
              </>
            )}
          </h2>
          <p className="text-lg text-slate-400 mb-10 max-w-xl mx-auto">
            {language === 'ar' ? '50 نقطة مجانية عند التسجيل. بدون بطاقة ائتمان.' : '50 points gratuits à l\'inscription. Sans carte bancaire.'}
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onSigninClick}
            className="px-8 py-4 bg-white text-slate-900 hover:bg-purple-100 font-bold rounded-xl text-base inline-flex items-center gap-2 transition cursor-pointer group"
          >
            <span>{language === 'ar' ? 'ابدأ الآن مجاناً' : 'Commencer gratuitement'}</span>
            <ArrowIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </motion.button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 bg-[#FBFAF7] border-t border-slate-200/60 py-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-700 overflow-hidden">
                <img src="https://i.ibb.co/nqShkPNP/68126702-75e5-4de6-9b53-e51800b05e4a.jpg" alt="Sawtify" className="w-full h-full object-cover" />
              </div>
              <span className="font-bold text-slate-900">Sawtify</span>
              <span className="text-slate-400 text-sm">© 2025</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-6 text-xs text-slate-500 font-medium">
              <a href="#" className="hover:text-purple-700 transition">{language === 'ar' ? 'الشروط' : 'CGU'}</a>
              <a href="#" className="hover:text-purple-700 transition">{language === 'ar' ? 'الخصوصية' : 'Confidentialité'}</a>
              <a href="#" className="hover:text-purple-700 transition">{language === 'ar' ? 'اتصل بنا' : 'Contact'}</a>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                {language === 'ar' ? 'مدعوم بـ ساتيم' : 'Paiement SATIM'}
              </span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};
