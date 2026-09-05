import React, { useState } from 'react';
import { X, Mail, Lock, User, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

interface LoginModalProps {
  onClose: () => void;
  onLoginSuccess: () => void;
  onSwitchToSignin: () => void;
  language: 'fr' | 'ar';
}

export const LoginModal: React.FC<LoginModalProps> = ({
  onClose,
  onLoginSuccess,
  onSwitchToSignin,
  language,
}) => {
  const isRTL = language === 'ar';
  const [email, setEmail] = useState('abdelmalek@sawtify.dz');
  const [password, setPassword] = useState('••••••••');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess();
    }, 600);
  };

  const handleQuickDemo = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
      <div 
        className={`w-full max-w-md bg-white rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              S
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {language === 'ar' ? 'تسجيل الدخول إلى صوتيفي' : 'Connexion à Sawtify'}
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                {language === 'ar' ? 'أهلاً بك مجدداً في استوديو الصوت' : 'Bon retour dans votre studio'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Demo */}
        <div className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-3.5 flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>{language === 'ar' ? 'دخول سريع للتجربة' : 'Accès Rapide Démo'}</span>
            </div>
            <p className="text-[11px] text-purple-700">
              {language === 'ar' ? '50 نقطة مجانية فورية' : '50 points offerts instantanément'}
            </p>
          </div>
          <button
            type="button"
            id="btn-quick-login"
            onClick={handleQuickDemo}
            className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer shrink-0"
          >
            {language === 'ar' ? 'دخول مباشر' : '1-Clic'}
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              {language === 'ar' ? 'البريد الإلكتروني' : 'Adresse e-mail'}
            </label>
            <div className="relative flex items-center">
              <Mail className={`absolute ${isRTL ? 'right-3.5' : 'left-3.5'} w-4 h-4 text-slate-400`} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full py-2.5 ${isRTL ? 'pr-10 pl-3.5' : 'pl-10 pr-3.5'} bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-purple-500 outline-none font-mono transition`}
                placeholder="nom@domaine.dz"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">
                {language === 'ar' ? 'كلمة المرور' : 'Mot de passe'}
              </label>
              <a href="#forgot" onClick={(e) => e.preventDefault()} className="text-[11px] text-purple-600 hover:underline">
                {language === 'ar' ? 'نسيت كلمة المرور؟' : 'Mot de passe oublié ?'}
              </a>
            </div>
            <div className="relative flex items-center">
              <Lock className={`absolute ${isRTL ? 'right-3.5' : 'left-3.5'} w-4 h-4 text-slate-400`} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full py-2.5 ${isRTL ? 'pr-10 pl-3.5' : 'pl-10 pr-3.5'} bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-purple-500 outline-none font-mono transition`}
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            id="btn-login-submit"
            disabled={isLoading}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition shadow-sm cursor-pointer text-xs disabled:opacity-50 mt-2"
          >
            {isLoading ? (
              <span className="animate-pulse">
                {language === 'ar' ? 'جاري التحقق...' : 'Connexion...'}
              </span>
            ) : (
              <>
                <span>{language === 'ar' ? 'تسجيل الدخول' : 'Se connecter'}</span>
                <ArrowRight className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />
              </>
            )}
          </button>

        </form>

        {/* Switch to Signin */}
        <div className="pt-2 border-t border-slate-100 text-center text-xs text-slate-500">
          <span>{language === 'ar' ? 'ليس لديك حساب؟' : 'Pas encore de compte ?'}</span>{' '}
          <button
            type="button"
            onClick={onSwitchToSignin}
            className="text-purple-600 hover:text-purple-700 font-bold underline cursor-pointer"
          >
            {language === 'ar' ? 'إنشاء حساب جديد' : 'Créer un compte'}
          </button>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-mono">
          <ShieldCheck className="w-3 h-3 text-purple-600" />
          <span>{language === 'ar' ? 'اتصال مشفر وآمن 256-bit' : 'Connexion sécurisée SSL'}</span>
        </div>

      </div>
    </div>
  );
};
