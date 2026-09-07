import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, ArrowRight, ArrowLeft, Zap, Volume2, Download, 
  Sparkles, CreditCard, Play, Pause, Code2, Layers, 
  Globe2, AudioLines, Flame, Fingerprint
} from 'lucide-react';
import { motion, useScroll, useTransform } from 'motion/react';

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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const [isScrolled, setIsScrolled] = useState(false);
  const [playingVoice, setPlayingVoice] = useState<number | null>(null);

  const { scrollY } = useScroll();
  const videoOpacity = useTransform(scrollY, [0, 800], [0.5, 0]);
  const videoY = useTransform(scrollY, [0, 1000], [0, 200]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.8; // Ralenti pour un effet plus cinématique
      videoRef.current.play().catch(() => {});
    }
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const ArrowIcon = ({ className }: { className?: string }) => 
    isRTL ? <ArrowLeft className={className} /> : <ArrowRight className={className} />;

  const toggleAudio = (id: number, url: string) => {
    if (playingVoice === id) {
      audioRef.current?.pause();
      setPlayingVoice(null);
    } else {
      audioRef.current?.pause();
      audioRef.current = new Audio(url);
      audioRef.current.play();
      setPlayingVoice(id);
      audioRef.current.onended = () => setPlayingVoice(null);
    }
  };

  return (
    <div 
      className="min-h-screen bg-[#030014] text-white font-sans selection:bg-purple-500/30 selection:text-purple-200 relative overflow-x-hidden" 
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* 🌌 BACKGROUNDS & ORBS (Effet 2026) */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px]" />
      </div>

      {/* 🎬 VIDEO CINÉMATIQUE (Parallax) */}
      <motion.div 
        style={{ opacity: videoOpacity, y: videoY }}
        className="absolute top-0 left-0 right-0 h-[100vh] z-0 pointer-events-none overflow-hidden mix-blend-screen"
      >
        <video
          ref={videoRef}
          src="https://res.cloudinary.com/gz65ybug/video/upload/v1788621700/Robot_looking_with_microphone_1080p_202609051613.mp4"
          autoPlay muted loop playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#030014]/40 via-[#030014]/80 to-[#030014]" />
      </motion.div>

      {/* 🛸 HEADER GLASSMORPHISM */}
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled ? 'bg-[#030014]/70 backdrop-blur-xl border-b border-white/5 py-3' : 'bg-transparent py-6'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.3)]">
              <AudioLines className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold tracking-tight text-xl bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
              Sawtify
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => setLanguage(language === 'fr' ? 'ar' : 'fr')}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 transition backdrop-blur-md"
            >
              {language === 'fr' ? 'العربية' : 'FR'}
            </button>
            <button
              onClick={onLoginClick}
              className="hidden sm:block px-4 py-2 text-sm font-bold text-white/70 hover:text-white transition"
            >
              {language === 'ar' ? 'تسجيل الدخول' : 'Connexion'}
            </button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onSigninClick}
              className="relative px-5 py-2.5 rounded-xl text-sm font-bold text-white overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 transition-transform group-hover:scale-105" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/20 transition-opacity" />
              <div className="relative flex items-center gap-2">
                <span>{language === 'ar' ? 'ابدأ مجاناً' : 'Commencer'}</span>
                <ArrowIcon className="w-4 h-4" />
              </div>
            </motion.button>
          </div>
        </div>
      </header>

      {/* 🚀 HERO SECTION (Ultra Performant) */}
      <section className="relative z-10 pt-40 pb-20 sm:pt-56 sm:pb-32 min-h-screen flex flex-col justify-center">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-4xl">
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, type: 'spring' }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-purple-300 text-xs sm:text-sm font-bold mb-8 backdrop-blur-md"
            >
              <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
              <span>{language === 'ar' ? 'نموذج الذكاء الاصطناعي V2.0 متوفر الآن' : 'Modèle IA V2.0 maintenant disponible'}</span>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-5xl sm:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[1.05] mb-8"
            >
              {language === 'ar' ? 'صوت بشري ' : 'La voix humaine '}
              <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-indigo-500 animate-gradient-x">
                {language === 'ar' ? 'بالدارجة الجزائرية.' : 'en Darija Algérienne.'}
              </span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-lg sm:text-2xl text-white/60 max-w-2xl leading-relaxed font-medium mb-10"
            >
              {language === 'ar'
                ? 'حوّل نصوصك إلى تعليقات صوتية فائقة الواقعية. مصممة لصنّاع المحتوى، الإعلانات، والمشاريع الاحترافية في الجزائر.'
                : 'Transformez vos textes en voix off hyper-réalistes. Conçu pour les créateurs de contenu, les pubs et les pros en Algérie.'}
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center gap-4"
            >
              <button
                onClick={onSigninClick}
                className="w-full sm:w-auto px-8 py-4 bg-white text-black hover:bg-gray-200 font-extrabold rounded-2xl text-base flex items-center justify-center gap-2.5 transition shadow-[0_0_30px_rgba(255,255,255,0.2)] group"
              >
                <Zap className="w-5 h-5 text-purple-600" />
                <span>{language === 'ar' ? 'توليد الصوت الآن' : 'Générer une voix'}</span>
              </button>
              
              <button
                onClick={onLoginClick}
                className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold rounded-2xl text-base flex items-center justify-center gap-2.5 transition backdrop-blur-md"
              >
                <span>{language === 'ar' ? 'اكتشف المنصة' : 'Découvrir la plateforme'}</span>
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 🧩 BENTO GRID FEATURES (Le design 2026 par excellence) */}
      <section className="relative z-10 py-24 bg-[#030014]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="mb-16">
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
              {language === 'ar' ? 'قوة الاستوديو ' : 'La puissance du studio '}
              <span className="text-white/40">{language === 'ar' ? 'في متصفحك.' : 'dans votre navigateur.'}</span>
            </h2>
          </div>

          {/* Grille Bento CSS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[250px]">
            
            {/* Bento 1: Grand (Darja) */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="md:col-span-2 bg-white/5 border border-white/10 rounded-3xl p-8 relative overflow-hidden group hover:border-purple-500/50 transition-colors"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all" />
              <Globe2 className="w-10 h-10 text-purple-400 mb-6" />
              <h3 className="text-2xl font-bold mb-2">{language === 'ar' ? 'دارجة جزائرية أصيلة 100%' : '100% Darija Algérienne'}</h3>
              <p className="text-white/60 text-sm max-w-sm">{language === 'ar' ? 'أصواتنا تفهم السياق، النبرة، وحتى الكلمات الفرنسية المدمجة في كلامنا اليومي.' : 'Nos voix comprennent le contexte, le ton, et même le code-switching Français-Darja.'}</p>
            </motion.div>

            {/* Bento 2: Petit (Vitesse) */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} delay={0.1}
              className="bg-white/5 border border-white/10 rounded-3xl p-8 relative overflow-hidden group hover:border-blue-500/50 transition-colors flex flex-col justify-end"
            >
              <Flame className="w-10 h-10 text-blue-400 mb-4" />
              <h3 className="text-xl font-bold mb-2">{language === 'ar' ? 'توليد فائق السرعة' : 'Génération ultra-rapide'}</h3>
              <p className="text-white/60 text-sm">{language === 'ar' ? 'أقل من 3 ثوانٍ لتحويل نصك.' : 'Moins de 3 secondes d\'attente.'}</p>
            </motion.div>

            {/* Bento 3: Petit (Export) */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} delay={0.2}
              className="bg-white/5 border border-white/10 rounded-3xl p-8 relative overflow-hidden group hover:border-pink-500/50 transition-colors"
            >
              <Download className="w-10 h-10 text-pink-400 mb-4" />
              <h3 className="text-xl font-bold mb-2">{language === 'ar' ? 'جودة WAV 24kHz' : 'Export WAV 24kHz'}</h3>
              <p className="text-white/60 text-sm">{language === 'ar' ? 'نقاء استوديو جاهز للمونتاج مباشرة.' : 'Clarté studio prête pour le montage.'}</p>
            </motion.div>

            {/* Bento 4: Grand (Pay as you go) */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} delay={0.3}
              className="md:col-span-2 bg-gradient-to-br from-purple-900/40 to-indigo-900/20 border border-purple-500/30 rounded-3xl p-8 relative overflow-hidden group"
            >
              <CreditCard className="w-10 h-10 text-purple-300 mb-6" />
              <h3 className="text-2xl font-bold mb-2">{language === 'ar' ? 'ادفع حسب استخدامك فقط' : 'Pay-As-You-Go'}</h3>
              <p className="text-white/70 text-sm max-w-md">{language === 'ar' ? 'لا اشتراكات شهرية. اشترِ رصيداً بالبطاقة الذهبية، واستخدمه متى شئت. نقاطك لا تنتهي صلاحيتها أبداً.' : 'Pas d\'abonnements mensuels. Achetez un pack avec Edahabia, vos points n\'expirent jamais.'}</p>
              <div className="absolute bottom-[-20%] right-[10%] opacity-20 group-hover:opacity-40 transition-opacity">
                <Fingerprint className="w-64 h-64 text-purple-400" />
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* 🎵 INTERACTIVE DEMO (Neon Player) */}
      <section className="relative z-10 py-32 bg-[#030014]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
              {language === 'ar' ? 'استمع إلى الفرق.' : 'Écoutez la différence.'}
            </h2>
            <p className="text-white/50">{language === 'ar' ? 'أصوات مصممة لجميع أنواع المحتوى.' : 'Des voix taillées pour chaque type de contenu.'}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { id: 1, name: 'Amin', style: 'Commercial', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
              { id: 2, name: 'Yasmine', style: 'Publicité', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
              { id: 3, name: 'Khalid', style: 'Documentaire', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
              { id: 4, name: 'Layla', style: 'Social Media', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
            ].map((voice) => (
              <motion.div 
                key={voice.id}
                whileHover={{ y: -5 }}
                className={`p-6 rounded-3xl border transition-all cursor-pointer ${
                  playingVoice === voice.id 
                    ? 'bg-purple-900/20 border-purple-500 shadow-[0_0_30px_rgba(139,92,246,0.2)]' 
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
                onClick={() => toggleAudio(voice.id, voice.url)}
              >
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h3 className="font-bold text-lg">{voice.name}</h3>
                    <span className="text-xs text-white/40">{voice.style}</span>
                  </div>
                  <button className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${playingVoice === voice.id ? 'bg-purple-500 text-white' : 'bg-white/10 text-white'}`}>
                    {playingVoice === voice.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-1" />}
                  </button>
                </div>
                {/* Neon Waveform simulée */}
                <div className="flex items-center gap-1 h-12">
                  {[...Array(20)].map((_, i) => (
                    <div 
                      key={i}
                      className={`flex-1 rounded-full transition-all duration-300 ${playingVoice === voice.id ? 'bg-purple-400' : 'bg-white/20'}`}
                      style={{ 
                        height: playingVoice === voice.id ? `${20 + Math.random() * 80}%` : '20%',
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 🚀 CALL TO ACTION FINALE (Dark & Glowing) */}
      <section className="relative z-10 py-32 bg-[#030014] overflow-hidden border-t border-white/5">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-600/20 rounded-full blur-[150px] pointer-events-none" />
        
        <div className="relative max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-5xl sm:text-7xl font-extrabold tracking-tight mb-8">
            {language === 'ar' ? 'جاهز للمستوى التالي؟' : 'Prêt pour le niveau supérieur ?'}
          </h2>
          <p className="text-xl text-white/50 mb-10">
            {language === 'ar' ? 'احصل على 50 نقطة مجانية بمجرد التسجيل.' : 'Obtenez 50 points offerts à l\'inscription.'}
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onSigninClick}
            className="px-10 py-5 bg-white text-black font-extrabold rounded-2xl text-lg inline-flex items-center gap-3 transition shadow-[0_0_40px_rgba(255,255,255,0.3)]"
          >
            <Sparkles className="w-5 h-5" />
            <span>{language === 'ar' ? 'ابدأ الاستخدام مجاناً' : 'Démarrer gratuitement'}</span>
          </motion.button>
        </div>
      </section>

      {/* FOOTER MINIMALISTE */}
      <footer className="relative z-10 bg-[#030014] border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-white/40">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center">
              <AudioLines className="w-3 h-3 text-white" />
            </div>
            <span className="font-bold text-white/80">Sawtify</span>
            <span>© 2026</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition">Twitter (X)</a>
            <a href="#" className="hover:text-white transition">Instagram</a>
            <span className="text-purple-400/50">• Paiement SATIM Algérie</span>
          </div>
        </div>
      </footer>

    </div>
  );
};
