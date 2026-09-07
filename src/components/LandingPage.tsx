import React, { useState, useEffect, useRef } from 'react';
import { Mic, ArrowRight, ArrowLeft, ShieldCheck, Zap, Volume2, Download, CheckCircle2, Sparkles, CreditCard, Play, Pause } from 'lucide-react';
import { motion } from 'motion/react';

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
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [isScrolled, setIsScrolled] = useState(false);
  const [isPlayingDemo, setIsPlayingDemo] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const audioDemoRef = useRef<HTMLAudioElement | null>(null);

  // GESTION DU SCROLL ET DE LA VIDÉO
  useEffect(() => {
    const video = videoRef.current;
    
    const handleScroll = () => {
      // 1. Gère le header
      setIsScrolled(window.scrollY > 20);

      // 2. Gère l'animation de la vidéo en fonction du scroll
      if (video && videoDuration > 0) {
        // Hauteur totale scrollable
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        // Pourcentage de scroll (de 0 à 1)
        const scrollFraction = maxScroll > 0 ? window.scrollY / maxScroll : 0;
        
        // Temps correspondant dans la vidéo
        const newTime = scrollFraction * videoDuration;
        
        // Utilisation de requestAnimationFrame pour une fluidité maximale
        requestAnimationFrame(() => {
          // On évite d'aller tout à la fin pour éviter que la vidéo ne se "termine" et disparaisse
          video.currentTime = Math.min(newTime, videoDuration - 0.05);
        });
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [videoDuration]);

  // Récupérer la durée de la vidéo quand elle est chargée
  const handleVideoLoadedMetadata = () => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
      // Forcer le premier frame pour mobile
      videoRef.current.currentTime = 0;
    }
  };

  const toggleDemo = () => {
    if (!audioDemoRef.current) {
      const audioUrl = isRTL 
        ? "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" 
        : "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"; 
      audioDemoRef.current = new Audio(audioUrl);
      audioDemoRef.current.onended = () => setIsPlayingDemo(false);
    }
    if (isPlayingDemo) {
      audioDemoRef.current.pause();
      setIsPlayingDemo(false);
    } else {
      audioDemoRef.current.play();
      setIsPlayingDemo(true);
    }
  };

  const ArrowIcon = ({ className }: { className?: string }) => 
    isRTL ? <ArrowLeft className={className} /> : <ArrowRight className={className} />;

  return (
    <div 
      className="min-h-screen text-slate-900 font-sans selection:bg-purple-500/20 selection:text-purple-900 relative overflow-x-hidden" 
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      
      {/* =========================================
          BACKGROUND VIDÉO FIXE & SCROLLABLE
          ========================================= */}
      <div className="fixed inset-0 w-full h-full pointer-events-none z-0 bg-slate-900">
        <video
          ref={videoRef}
          src="https://res.cloudinary.com/gz65ybug/video/upload/v1788621700/Robot_looking_with_microphone_1080p_202609051613.mp4"
          muted
          playsInline
          preload="auto"
          onLoadedMetadata={handleVideoLoadedMetadata}
          className="absolute inset-0 w-full h-full object-cover opacity-90"
        />
        {/* Overlay pour assurer que le texte reste lisible par dessus la vidéo */}
        <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px]" />
      </div>

      {/* HEADER */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled ? 'bg-white/80 backdrop-blur-xl shadow-sm py-2' : 'bg-transparent py-4'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md overflow-hidden">
              <img src="https://i.ibb.co/nqShkPNP/68126702-75e5-4de6-9b53-e51800b05e4a.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-extrabold text-slate-900 tracking-tight text-lg uppercase">Sawtify</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setLanguage(language === 'fr' ? 'ar' : 'fr')}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/80 hover:bg-white border border-slate-200 text-slate-700 transition cursor-pointer shadow-sm backdrop-blur-md"
            >
              {language === 'fr' ? 'العربية' : 'Français'}
            </button>
            <button
              onClick={onLoginClick}
              className="hidden sm:block px-4 py-2 rounded-xl text-sm font-bold text-slate-800 hover:text-purple-600 transition cursor-pointer"
            >
              {language === 'ar' ? 'تسجيل الدخول' : 'Connexion'}
            </button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onSigninClick}
              className="px-5 py-2.5 rounded-xl text-sm font-bold bg-purple-600 hover:bg-purple-700 text-white transition shadow-lg shadow-purple-600/20 cursor-pointer flex items-center gap-2"
            >
              <span>{language === 'ar' ? 'ابدأ الآن' : 'Commencer'}</span>
              <ArrowIcon className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* HERO SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20 sm:pt-40 sm:pb-28 relative z-10 min-h-[90vh] flex flex-col justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="max-w-3xl space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 backdrop-blur-md border border-purple-200 text-purple-800 text-xs sm:text-sm font-bold shadow-sm">
            <Zap className="w-4 h-4 text-purple-600 fill-purple-600" />
            <span>{language === 'ar' ? 'المنصة رقم 1 للتعليق الصوتي في الجزائر 🇩🇿' : 'N°1 de la voix off IA en Algérie 🇩🇿'}</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
            {language === 'ar' 
              ? 'حوّل أي نص إلى صوت بشري طبيعي بالدارجة في ثوانٍ'
              : 'Transformez vos textes en voix off professionnelles en secondes'}
          </h1>
          <p className="text-base sm:text-xl text-slate-800 max-w-2xl leading-relaxed font-semibold">
            {language === 'ar'
              ? 'أنشئ تعليقات صوتية مذهلة لمشاريعك وإعلاناتك بجودة استوديو احترافية. ادفع بكل أمان بالبطاقة الذهبية أو CIB.'
              : 'Créez des voix off percutantes pour vos publicités et reels avec une clarté studio. Facturation simple en Dinars avec Edahabia & CIB.'}
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-col sm:flex-row items-center gap-4 pt-8"
        >
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onSigninClick}
            className="w-full sm:w-auto px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-2xl text-base flex items-center justify-center gap-2.5 transition shadow-xl shadow-purple-600/30 cursor-pointer group"
          >
            <span>{language === 'ar' ? 'ابدأ الآن • 50 نقطة مجانية' : 'Essayer Gratuitement'}</span>
            <ArrowIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={toggleDemo}
            className="w-full sm:w-auto px-8 py-4 bg-white/90 hover:bg-white backdrop-blur-md text-slate-800 border-2 border-slate-200 font-bold rounded-2xl text-base flex items-center justify-center gap-2.5 transition cursor-pointer shadow-sm"
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white ${isPlayingDemo ? 'bg-rose-500 animate-pulse' : 'bg-slate-800'}`}>
              {isPlayingDemo ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
            </div>
            <span>{language === 'ar' ? 'استمع إلى عينة' : 'Écouter une démo'}</span>
          </motion.button>
        </motion.div>
      </section>

      {/* FEATURES SECTION (Ajout d'effets Glassmorphism) */}
      <section className="py-20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="max-w-2xl space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {language === 'ar' ? 'لماذا يختار المحترفون منصة صوتيفي؟' : 'Conçu pour l’exigence professionnelle'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <motion.div whileHover={{ y: -5 }} className="bg-white/70 backdrop-blur-xl p-6 rounded-3xl border border-white/50 shadow-lg space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-white text-purple-700 flex items-center justify-center shadow-sm">
                <Mic className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">{language === 'ar' ? 'دارجة جزائرية أصيلة' : 'Darja & Arabe'}</h3>
              <p className="text-xs text-slate-700 font-medium leading-relaxed">{language === 'ar' ? 'أصوات ذكاء اصطناعي مدربة على النطق الصحيح والتعبيرات المحلية بطلاقة تامة.' : 'Modèles vocaux entraînés spécifiquement pour restituer les nuances de la Darja.'}</p>
            </motion.div>

            <motion.div whileHover={{ y: -5 }} className="bg-white/70 backdrop-blur-xl p-6 rounded-3xl border border-white/50 shadow-lg space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-white text-purple-700 flex items-center justify-center shadow-sm">
                <Volume2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">{language === 'ar' ? 'تحكم كامل بالنبرة' : 'Contrôle Fin'}</h3>
              <p className="text-xs text-slate-700 font-medium leading-relaxed">{language === 'ar' ? 'تحكم في سرعة النطق، طبقة الصوت وإدراج وقفات للحصول على أفضل نتيجة.' : 'Ajustez la vitesse de diction et l’intonation pour coller à votre projet.'}</p>
            </motion.div>

            <motion.div whileHover={{ y: -5 }} className="bg-white/70 backdrop-blur-xl p-6 rounded-3xl border border-white/50 shadow-lg space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-white text-purple-700 flex items-center justify-center shadow-sm">
                <Download className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">{language === 'ar' ? 'تصدير فوري' : 'Export Instantané'}</h3>
              <p className="text-xs text-slate-700 font-medium leading-relaxed">{language === 'ar' ? 'قم بتحميل تسجيلاتك الصوتية بضغطة زر بجودة عالية بصيغة MP3 أو WAV.' : 'Téléchargez vos fichiers audio au format MP3 ou WAV en un clic.'}</p>
            </motion.div>

            <motion.div whileHover={{ y: -5 }} className="bg-purple-900/80 backdrop-blur-xl p-6 rounded-3xl border border-purple-500/50 shadow-lg space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 text-white flex items-center justify-center shadow-sm">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">{language === 'ar' ? 'ادفع حسب الاستخدام' : 'Pay-As-You-Go'}</h3>
              <p className="text-xs text-purple-100 font-medium leading-relaxed">{language === 'ar' ? 'لا توجد اشتراكات شهرية إجبارية. اشترِ رصيداً بالنقاط واستخدمه وقتما تشاء.' : 'Pas d’abonnement mensuel caché. Achetez des packs de points selon vos besoins.'}</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-slate-300/50 bg-white/50 backdrop-blur-md py-8 text-xs text-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px] font-semibold">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-purple-600" />
            <span className="text-slate-900">Sawtify Algérie</span>
            <span>• {language === 'ar' ? 'جميع الحقوق محفوظة' : 'Tous droits réservés'}</span>
          </div>
          <div>
            <span>{language === 'ar' ? 'مدعوم بـ ساتيم SATIM & Edahabia' : 'Paiement sécurisé CIB / Edahabia'}</span>
          </div>
        </div>
      </footer>

    </div>
  );
};
