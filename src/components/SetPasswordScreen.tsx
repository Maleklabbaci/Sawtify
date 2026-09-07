import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Lock, Eye, EyeOff, AlertCircle, KeyRound } from 'lucide-react';
import { setAccountPassword } from '../services/supabaseClient';

interface SetPasswordScreenProps {
  onDone: () => void;
  userEmail: string | null;
  language: 'fr' | 'ar';
}

export const SetPasswordScreen: React.FC<SetPasswordScreenProps> = ({ onDone, userEmail, language }) => {
  const isRTL = language === 'ar';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError(isRTL ? 'كلمة المرور يجب أن تحتوي على 6 أحرف على الأقل.' : 'Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (password !== confirmPassword) {
      setError(isRTL ? 'كلمتا المرور غير متطابقتين.' : 'Les deux mots de passe ne correspondent pas.');
      return;
    }

    setIsLoading(true);
    try {
      await setAccountPassword(password);
      onDone();
    } catch (err: any) {
      console.error('Erreur définition mot de passe:', err);
      setError(isRTL ? 'حدث خطأ. حاول مجدداً.' : "Une erreur est survenue. Réessaie.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-purple-950 via-purple-800 to-purple-600 px-6 py-12 relative overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-purple-400/30 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-fuchsia-400/20 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 space-y-6"
      >
        <div className="space-y-2 text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center">
            <KeyRound className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            {isRTL ? 'أنشئ كلمة مرور' : 'Crée ton mot de passe'}
          </h1>
          <p className="text-sm text-slate-500">
            {isRTL
              ? `لتتمكن من تسجيل الدخول لاحقاً عبر ${userEmail ?? 'بريدك'} وكلمة المرور، بدون المرور دائماً عبر Google.`
              : `Pour pouvoir te reconnecter plus tard avec ${userEmail ?? 'ton e-mail'} et ce mot de passe, sans repasser par Google.`}
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-3.5 py-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Lock className="absolute top-1/2 -translate-y-1/2 left-3.5 w-4 h-4 text-slate-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isRTL ? 'كلمة المرور الجديدة' : 'Nouveau mot de passe'}
              className="w-full pl-10 pr-10 py-3 rounded-2xl border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-purple-500/60 focus:ring-4 focus:ring-purple-500/5 transition"
              dir={isRTL ? 'rtl' : 'ltr'}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute top-1/2 -translate-y-1/2 right-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div className="relative">
            <Lock className="absolute top-1/2 -translate-y-1/2 left-3.5 w-4 h-4 text-slate-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={isRTL ? 'تأكيد كلمة المرور' : 'Confirme le mot de passe'}
              className="w-full pl-10 pr-3.5 py-3 rounded-2xl border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-purple-500/60 focus:ring-4 focus:ring-purple-500/5 transition"
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          </div>

          <button
            type="submit"
            id="btn-confirm-password"
            disabled={isLoading || !password || !confirmPassword}
            className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>{isRTL ? 'جاري الحفظ...' : 'Enregistrement...'}</span>
              </>
            ) : (
              <span>{isRTL ? 'تأكيد' : 'Valider'}</span>
            )}
          </button>
        </form>

        <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-mono">
          <ShieldCheck className="w-3 h-3 text-purple-600" />
          <span>{isRTL ? 'اتصال مشفر وآمن' : 'Connexion sécurisée & chiffrée'}</span>
        </div>
      </motion.div>
    </div>
  );
};
