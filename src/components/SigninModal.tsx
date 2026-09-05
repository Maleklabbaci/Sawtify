import React, { useState } from 'react';
import { X, Mail, Lock, User, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

interface SigninModalProps {
  onClose: () => void;
  onSigninSuccess: () => void;
  onSwitchToLogin: () => void;
  language: 'fr' | 'ar';
}

export const SigninModal: React.FC<SigninModalProps> = ({
  onClose,
  onSigninSuccess,
  onSwitchToLogin,
  language,
}) => {
  const isRTL = language === 'ar';
  const [fullName, setFullName] = useState('Abdelmalek Labbaci');
  const [email, setEmail] = useState('abdelmalek@sawtify.dz');
  const [password, setPassword] = useState('••••••••');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onSigninSuccess();
    }, 700);
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
                {language === 'ar' ? 'إنشاء حساب جديد في صوتيفي' : 'Inscription sur Sawtify'}
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                {language === 'ar' ? 'احصل على 50 نقطة مجانية فور التسجيل' : 'Recevez 50 points offerts immédiatement'}
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

        {/* Promo Gift Banner */}
        <div className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-purple-900">
              {language === 'ar' ? 'هدية البداية (50 نقطة)' : 'Cadeau de bienvenue (50 pts)'}
            </h4>
            <p className="text-[11px] text-purple-700">
              {language === 'ar' ? 'جرب توليد أصوات بالدارجة فوراً بدون بطاقة بنكية' : 'Testez la synthèse Darja sans carte bancaire requis'}
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              {language === 'ar' ? 'الاسم الكامل' : 'Nom et Prénom'}
            </label>
            <div className="relative flex items-center">
              <User className={`absolute ${isRTL ? 'right-3.5' : 'left-3.5'} w-4 h-4 text-slate-400`} />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={`w-full py-2.5 ${isRTL ? 'pr-10 pl-3.5' : 'pl-10 pr-3.5'} bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-purple-500 outline-none font-sans transition`}
                placeholder="Abdelmalek Labbaci"
              />
            </div>
          </div>

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
            <label className="text-xs font-semibold text-slate-700">
              {language === 'ar' ? 'كلمة المرور' : 'Mot de passe'}
            </label>
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
            id="btn-signin-submit"
            disabled={isLoading}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition shadow-sm cursor-pointer text-xs disabled:opacity-50 mt-2"
          >
            {isLoading ? (
              <span className="animate-pulse">
                {language === 'ar' ? 'جاري إنشاء الحساب...' : 'Création du compte...'}
              </span>
            ) : (
              <>
                <span>{language === 'ar' ? 'إنشاء الحساب والبدء (50 نقطة مجانية)' : 'Créer mon compte (50 pts offerts)'}</span>
                <ArrowRight className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />
              </>
            )}
          </button>

        </form>

        {/* Switch to Login */}
        <div className="pt-2 border-t border-slate-100 text-center text-xs text-slate-500">
          <span>{language === 'ar' ? 'لديك حساب بالفعل؟' : 'Déjà un compte ?'}</span>{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-purple-600 hover:text-purple-700 font-bold underline cursor-pointer"
          >
            {language === 'ar' ? 'تسجيل الدخول' : 'Se connecter'}
          </button>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-mono">
          <ShieldCheck className="w-3 h-3 text-purple-600" />
          <span>{language === 'ar' ? 'معتمد رسمياً من SATIM • حماية عالية' : 'Sécurité SSL certifiée SATIM'}</span>
        </div>

      </div>
    </div>
  );
};
