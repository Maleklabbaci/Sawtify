import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ShieldCheck, Sparkles, Volume2, Zap, Mic } from 'lucide-react';

interface LoginModalProps {
  onClose: () => void;
  onLoginSuccess: () => void;
  onSwitchToSignin: () => void;
  language: 'fr' | 'ar';
}

// Logomark Google officiel (4 couleurs), utilisé uniquement comme icône de bouton "Continuer avec Google"
const GoogleGlyph: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4c-7.5 0-14 4.2-17.7 10.7z" />
    <path fill="#4CAF50" d="M24 44c5.5 0 10.4-2.1 14.2-5.5l-6.5-5.5C29.6 34.7 26.9 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.9 39.7 16.4 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.5 5.5C40.5 36.7 44 30.9 44 24c0-1.3-.1-2.7-.4-3.5z" />
  </svg>
);

const FEATURES_FR = [
  { icon: Mic, text: 'Voix naturelles en Darja et Arabe classique' },
  { icon: Zap, text: 'Génération audio en quelques secondes' },
  { icon: Volume2, text: 'Export MP3 / WAV en qualité studio' },
];
const FEATURES_AR = [
  { icon: Mic, text: 'أصوات طبيعية بالدارجة الجزائرية والعربية الفصحى' },
  { icon: Zap, text: 'توليد صوتي في ثوانٍ معدودة' },
  { icon: Volume2, text: 'تصدير بجودة استوديو MP3 / WAV' },
];

export const LoginModal: React.FC<LoginModalProps> = ({
  onClose,
  onLoginSuccess,
  onSwitchToSignin,
  language,
}) => {
  const isRTL = language === 'ar';
  const [isLoading, setIsLoading] = useState(false);
  const features = isRTL ? FEATURES_AR : FEATURES_FR;

  const handleGoogleAuth = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess();
    }, 700);
  };

  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2 bg-white" dir={isRTL ? 'rtl' : 'ltr'}>

      {/* LEFT/BRAND PANEL — masqué sur mobile */}
      <div className="hidden lg:flex relative flex-col justify-between p-12 overflow-hidden bg-gradient-to-br from-purple-950 via-purple-800 to-purple-600">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-purple-400/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-fuchsia-400/20 rounded-full blur-3xl" />

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white font-extrabold">
            S
          </div>
          <span className="font-extrabold text-white tracking-tight text-lg">SAWTIFY</span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative z-10 space-y-8 max-w-md">
          <h2 className="text-3xl font-extrabold text-white leading-tight tracking-tight">
            {isRTL ? 'أهلاً بك مجدداً في استوديو الصوت الخاص بك' : 'Bon retour dans votre studio vocal'}
          </h2>
          <div className="space-y-4">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-purple-100">
                <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                  <f.icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium">{f.text}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="relative z-10 flex items-center gap-2 text-purple-200 text-xs font-mono">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{isRTL ? 'اتصال مشفر وآمن' : 'Connexion sécurisée & chiffrée'}</span>
        </motion.div>
      </div>

      {/* RIGHT/FORM PANEL */}
      <div className="flex flex-col justify-center px-6 sm:px-12 lg:px-20 py-12 relative">
        <button
          onClick={onClose}
          className={`absolute top-6 ${isRTL ? 'right-6' : 'left-6'} inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition cursor-pointer`}
        >
          <ArrowLeft className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />
          <span>{isRTL ? 'العودة للرئيسية' : "Retour à l'accueil"}</span>
        </button>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm mx-auto space-y-8"
        >
          <div className="space-y-2 text-center lg:text-left" style={isRTL ? { textAlign: 'right' } : undefined}>
            <div className="lg:hidden w-12 h-12 mx-auto lg:mx-0 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-extrabold shadow-md mb-4">
              S
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {isRTL ? 'تسجيل الدخول إلى صوتيفي' : 'Connexion à Sawtify'}
            </h1>
            <p className="text-sm text-slate-500">
              {isRTL ? 'استمر عبر حسابك في Google للمتابعة' : 'Continuez avec votre compte Google pour accéder à votre studio'}
            </p>
          </div>

          {/* Google-only Auth Button */}
          <button
            type="button"
            id="btn-google-login"
            onClick={handleGoogleAuth}
            disabled={isLoading}
            className="w-full py-3.5 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 font-bold rounded-2xl flex items-center justify-center gap-3 transition-all duration-150 cursor-pointer border border-slate-200 shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed text-sm"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-slate-300 border-t-purple-600 rounded-full animate-spin" />
                <span>{isRTL ? 'جاري الاتصال...' : 'Connexion en cours...'}</span>
              </>
            ) : (
              <>
                <GoogleGlyph className="w-5 h-5" />
                <span>{isRTL ? 'المتابعة عبر Google' : 'Continuer avec Google'}</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2 px-1 text-purple-700 bg-purple-50/70 border border-purple-200/70 rounded-xl py-2.5 text-[11px] font-medium">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>{isRTL ? 'الدخول السريع بدون كلمة مرور ولا نموذج للتعبئة' : "Connexion instantanée, sans mot de passe ni formulaire à remplir"}</span>
          </div>

          <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
            <span>{isRTL ? 'ليس لديك حساب؟' : 'Pas encore de compte ?'}</span>{' '}
            <button
              type="button"
              onClick={onSwitchToSignin}
              className="text-purple-600 hover:text-purple-700 font-bold underline cursor-pointer"
            >
              {isRTL ? 'إنشاء حساب جديد' : 'Créer un compte'}
            </button>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-mono">
            <ShieldCheck className="w-3 h-3 text-purple-600" />
            <span>{isRTL ? 'اتصال مشفر وآمن 256-bit' : 'Connexion sécurisée SSL 256-bit'}</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
