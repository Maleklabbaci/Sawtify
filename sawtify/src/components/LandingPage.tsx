import React, { useState, useEffect, useRef } from 'react';
import { Mic, ArrowRight, ShieldCheck, Zap, Volume2, Download, CheckCircle2, Sparkles, CreditCard } from 'lucide-react';
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

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.playbackRate = 1.0;
      video.play().catch(() => {});
    }
  }, []);

  return (
    <div className="min-h-screen text-slate-900 font-sans selection:bg-purple-500/20 selection:text-purple-900 text-left relative overflow-x-hidden bg-transparent" dir="ltr">
      
      {/* Video confinée au Hero (absolute, pas fixed) : évite le bug de scroll sur mobile
          où "position: fixed" + barre d'adresse dynamique fait clignoter/sauter la vidéo */}
      <div className="absolute top-0 left-0 right-0 h-[820px] max-h-[100vh] pointer-events-none z-0 overflow-hidden">
        <video
          ref={videoRef}
          src="https://res.cloudinary.com/gz65ybug/video/upload/v1788621700/Robot_looking_with_microphone_1080p_202609051613.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="https://i.ibb.co/nqShkPNP/68126702-75e5-4de6-9b53-e51800b05e4a.jpg"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Fondu vers le fond de page pour une transition propre en bas du hero */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/95" />
      </div>

      {/* Top Header */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-50 bg-transparent transition-all"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md overflow-hidden">
              <img src="https://i.ibb.co/nqShkPNP/68126702-75e5-4de6-9b53-e51800b05e4a.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-extrabold text-slate-900 tracking-tight text-lg">SAWTIFY</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setLanguage(language === 'fr' ? 'ar' : 'fr')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/60 hover:bg-white text-slate-700 transition cursor-pointer shadow-2xs backdrop-blur-sm"
            >
              {language === 'fr' ? 'العربية' : 'Français'}
            </button>

            <button
              onClick={onLoginClick}
              id="btn-landing-login"
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 transition cursor-pointer"
            >
              {language === 'ar' ? 'تسجيل الدخول' : 'Connexion'}
            </button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onSigninClick}
              id="btn-landing-signin"
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white transition shadow-sm hover:shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <span>{language === 'ar' ? 'ابدأ الآن مجاناً' : 'Commencer'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 sm:pt-24 sm:pb-28 text-left space-y-8 relative z-10">
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="max-w-4xl space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/70 backdrop-blur-md border border-purple-200 text-purple-800 text-xs font-semibold shadow-2xs">
            <Zap className="w-3.5 h-3.5 text-purple-600" />
            <span>{language === 'ar' ? 'المنصة الأولى للتعليق الصوتي بالذكاء الاصطناعي في الجزائر' : 'N°1 de la voix off IA en Algérie & MENA'}</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-slate-900 tracking-tight leading-[1.1]">
            {language === 'ar' 
              ? 'حوّل أي نص إلى صوت بشري طبيعي بالدارجة الجزائرية في ثوانٍ'
              : 'Transformez vos textes en voix off professionnelles en quelques secondes'}
          </h1>
          <p className="text-base sm:text-lg text-slate-700 max-w-2xl leading-relaxed font-medium">
            {language === 'ar'
              ? 'أنشئ تعليقات صوتية مذهلة لمشاريعك، إعلاناتك، وريلز بتسجيلات نقية بجودة احترافية. ادفع بكل أمان بالبطاقة الذهبية أو CIB.'
              : 'Créez des voix off percutantes pour vos publicités, reels et podcasts avec une clarté studio professionnelle. Facturation simple en Dinars avec Edahabia & CIB.'}
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2"
        >
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onSigninClick}
            id="btn-hero-signin-main"
            className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-2xl text-sm sm:text-base flex items-center justify-center gap-2.5 transition shadow-lg shadow-purple-600/30 hover:shadow-purple-600/45 cursor-pointer group"
          >
            <span>{language === 'ar' ? 'تجربة مجانية • ابدأ الآن' : 'Essayer Gratuitement'}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onLoginClick}
            id="btn-hero-login-main"
            className="px-7 py-4 bg-white/70 hover:bg-white text-slate-800 border border-slate-300 font-semibold rounded-2xl text-sm sm:text-base flex items-center justify-center gap-2 transition cursor-pointer shadow-sm backdrop-blur-md"
          >
            <span>{language === 'ar' ? 'تسجيل الدخول' : 'Connexion directe'}</span>
          </motion.button>
        </motion.div>

        {/* Trust Badges */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="pt-6 flex flex-wrap items-center justify-start gap-6 text-xs text-slate-600 font-mono font-medium"
        >
          <div className="flex items-center gap-1.5 bg-white/70 px-3 py-1.5 rounded-xl backdrop-blur-xs border border-slate-200 shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            <span>{language === 'ar' ? 'معتمد من ساتيم SATIM' : 'Certifié SATIM Algérie'}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/70 px-3 py-1.5 rounded-xl backdrop-blur-xs border border-slate-200 shadow-2xs">
            <CheckCircle2 className="w-4 h-4 text-purple-600" />
            <span>{language === 'ar' ? 'بطاقة الذهبية و CIB' : 'Edahabia & CIB'}</span>
          </div>
        </motion.div>

      </section>

      {/* Features Grid with Framer Motion hover/entrance */}
      <section className="bg-transparent py-20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 text-left">
          
          <div className="max-w-2xl space-y-3">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {language === 'ar' ? 'لماذا يختار المحترفون منصة صوتيفي؟' : 'Conçu pour l’exigence professionnelle'}
            </h2>
            <p className="text-sm text-slate-700 font-medium">
              {language === 'ar' 
                ? 'أدوات متكاملة مصممة خصيصاً لتلبية احتياجات صناع المحتوى والشركات في الجزائر.'
                : 'Une plateforme robuste, rapide et parfaitement adaptée aux créateurs et aux entreprises.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            
            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-white/85 backdrop-blur-md p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4 text-left"
            >
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold border border-purple-100">
                <Mic className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {language === 'ar' ? 'دارجة جزائرية أصيلة' : 'Darja & Arabe'}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {language === 'ar'
                  ? 'أصوات ذكاء اصطناعي مدربة على النطق الصحيح والتعبيرات المحلية بطلاقة تامة.'
                  : 'Modèles vocaux entraînés spécifiquement pour restituer les nuances de la Darja.'}
              </p>
            </motion.div>

            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-white/85 backdrop-blur-md p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4 text-left"
            >
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold border border-purple-100">
                <Volume2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {language === 'ar' ? 'تحكم كامل بالنبرة' : 'Contrôle Fin'}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {language === 'ar'
                  ? 'تحكم في سرعة النطق، طبقة الصوت وإدراج وقفات للحصول على أفضل نتيجة.'
                  : 'Ajustez la vitesse de diction et l’intonation pour coller à votre projet.'}
              </p>
            </motion.div>

            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-white/85 backdrop-blur-md p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4 text-left"
            >
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold border border-purple-100">
                <Download className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {language === 'ar' ? 'تصدير فوري' : 'Export Instantané'}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {language === 'ar'
                  ? 'قم بتحميل تسجيلاتك الصوتية بضغطة زر بجودة عالية بصيغة MP3 أو WAV.'
                  : 'Téléchargez vos fichiers audio au format MP3 ou WAV en un clic.'}
              </p>
            </motion.div>

            {/* Pay As You Go Card */}
            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-purple-900/90 text-white backdrop-blur-md p-6 rounded-3xl border border-purple-700 shadow-xl space-y-4 text-left relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />
              <div className="w-12 h-12 rounded-2xl bg-white/10 text-white flex items-center justify-center font-bold border border-white/20">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">
                {language === 'ar' ? 'ادفع حسب الاستخدام (Pay As You Go)' : 'Pay-As-You-Go (Sans abonnement)'}
              </h3>
              <p className="text-xs text-purple-200 leading-relaxed">
                {language === 'ar'
                  ? 'لا توجد اشتراكات شهرية إجبارية. اشترِ رصيداً بالنقاط واستخدمه وقتما تشاء دون انتهاء الصلاحية.'
                  : 'Pas d’abonnement mensuel caché. Achetez des packs de points selon vos besoins réels, valables sans limite de temps.'}
              </p>
            </motion.div>

          </div>

        </div>
      </section>

      {/* Sawtify Studio Value Proposition Section */}
      <section className="bg-transparent py-20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white/90 backdrop-blur-xl border border-purple-200 rounded-3xl p-8 sm:p-12 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-10">
            
            <div className="space-y-4 max-w-2xl text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? 'تكنولوجيا الاستوديو المتقدمة' : 'Technologie Studio Avancée'}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {language === 'ar' ? 'أنشئ تعليقات صوتية احترافية بضغطة زر واحدة' : 'Générez des voix off professionnelles en un seul clic'}
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                {language === 'ar'
                  ? 'منصة صوتيفي توفر لك نخبة من الأصوات الطبيعية بالدارجة الجزائرية والعربية الفصحى مع تحكم كامل في السرعة والنبرة وتصدير فوري بصيغتي MP3 و WAV.'
                  : 'Sawtify vous offre une sélection de voix naturelles en Darja et en Arabe classique avec un contrôle total sur le rythme et l’intonation, et un export immédiat.'}
              </p>
              <div className="pt-2">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onSigninClick}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition shadow-sm cursor-pointer"
                >
                  <span>{language === 'ar' ? 'ابدأ الآن مع 50 نقطة مجانية' : 'Commencer avec 50 points offerts'}</span>
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </div>
            </div>

            <div className="w-full lg:w-80 bg-slate-50/90 border border-slate-200 p-6 rounded-3xl flex flex-col items-center justify-center text-center space-y-4 shadow-inner">
              <div className="w-16 h-16 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-lg">
                <Zap className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-900">
                  {language === 'ar' ? 'سرعة فائقة وجودة استوديو' : 'Rapidité & Qualité Studio'}
                </p>
                <p className="text-xs text-slate-500">
                  {language === 'ar' ? 'جاهز للاستخدام التجاري والمونتاج' : 'Prêt pour le montage et la diffusion'}
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-transparent py-20 relative z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 text-left">
          <div className="text-center space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {language === 'ar' ? 'الأسئلة الشائعة (FAQ)' : 'Questions Fréquentes'}
            </h2>
            <p className="text-sm text-slate-600 font-medium">
              {language === 'ar' ? 'كل ما تحتاج معرفته حول منصة صوتيفي ونظام الدفع.' : 'Tout ce que vous devez savoir sur Sawtify et notre modèle Pay-As-You-Go.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div whileHover={{ y: -3 }} className="bg-white/85 backdrop-blur-md p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-2">
              <h3 className="text-sm font-bold text-slate-900">
                {language === 'ar' ? 'كيف يعمل نظام الدفع حسب الاستخدام (Pay-As-You-Go)؟' : 'Comment fonctionne le modèle Pay-As-You-Go ?'}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {language === 'ar'
                  ? 'لا توجد أي رسوم اشتراك شهرية إجبارية. تقوم بشراء رصيد من النقاط بحسب احتياجاتك، والنقاط لا تنتهي صلاحيتها أبداً.'
                  : 'Il n’y a aucun abonnement mensuel caché. Vous achetez des packs de points selon vos besoins, et vos points n’expirent jamais.'}
              </p>
            </motion.div>

            <motion.div whileHover={{ y: -3 }} className="bg-white/85 backdrop-blur-md p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-2">
              <h3 className="text-sm font-bold text-slate-900">
                {language === 'ar' ? 'هل يدعم الموقع الدفع بالبطاقة الذهبية أو CIB؟' : 'Acceptez-vous la Dahabia et la CIB ?'}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {language === 'ar'
                  ? 'نعم، نحن ندعم الدفع بكل أمان عبر بطاقة الذهبية وبطاقة CIB المحلية في الجزائر عبر نظام ساتيم SATIM.'
                  : 'Oui, nous acceptons les paiements sécurisés par carte Edahabia et CIB en Algérie via SATIM.'}
              </p>
            </motion.div>

            <motion.div whileHover={{ y: -3 }} className="bg-white/85 backdrop-blur-md p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-2">
              <h3 className="text-sm font-bold text-slate-900">
                {language === 'ar' ? 'هل التسجيلات الصوتية صالحة للاستخدام التجاري؟' : 'Les voix générées sont-elles libres de droits ?'}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {language === 'ar'
                  ? 'تأكيداً، جميع التسجيلات الصوتية التي تقوم بتصديرها مخصصة للاستخدام التجاري في الإعلانات، السوشيال ميديا ومشاريعك.'
                  : 'Absolument. Tous les fichiers audio exportés peuvent être utilisés librement pour vos publicités, reels et projets professionnels.'}
              </p>
            </motion.div>

            <motion.div whileHover={{ y: -3 }} className="bg-white/85 backdrop-blur-md p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-2">
              <h3 className="text-sm font-bold text-slate-900">
                {language === 'ar' ? 'كيف يمكنني البدء مجاناً؟' : 'Comment puis-je commencer gratuitement ?'}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {language === 'ar'
                  ? 'بمجرد تسجيل حسابك الجديد، ستحصل مباشرة على نقاط مجانية لتجربة الأصوات واستخراج أول تعليق صوتي لك فوراً.'
                  : 'Dès votre inscription, vous recevez des points gratuits pour tester nos voix et générer votre premier audio immédiatement.'}
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer - Completely Transparent */}
      <footer className="bg-transparent relative z-10 border-t border-slate-200/40 py-8 text-xs text-slate-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px]">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-purple-600" />
            <span className="text-slate-900 font-bold">Sawtify Algérie</span>
            <span>• {language === 'ar' ? 'جميع الحقوق محفوظة' : 'Tous droits réservés'}</span>
          </div>
          <div className="text-slate-500">
            <span>{language === 'ar' ? 'مدعوم بـ ساتيم SATIM & Edahabia' : 'Paiement sécurisé CIB / Edahabia'}</span>
          </div>
        </div>
      </footer>

    </div>
  );
};
