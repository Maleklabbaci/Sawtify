import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  ChevronLeft,
  GraduationCap,
  Instagram,
  Mail,
  Megaphone,
  Mic2,
  Music4,
  Phone,
  Search,
  ShoppingBag,
  Sparkles,
  Users,
} from 'lucide-react';
import { saveOnboardingData } from '../services/supabaseClient';

interface WelcomeOnboardingProps {
  name: string;
  email: string;
  language: 'fr' | 'ar';
  onComplete: () => Promise<void> | void;
}

const USE_CASES = [
  { id: 'ecommerce', label: 'Vidéos e-commerce / publicité', icon: ShoppingBag },
  { id: 'entreprise', label: 'Présentation d\u2019entreprise ou de produit', icon: Building2 },
  { id: 'agence', label: 'Agence marketing / communication', icon: Megaphone },
  { id: 'podcast', label: 'Podcast / boîte vocale / narration', icon: Mic2 },
  { id: 'ia', label: 'Automatisation et contenu IA', icon: Bot },
  { id: 'formation', label: 'Formation / réseaux sociaux', icon: GraduationCap },
  { id: 'autre', label: 'Autre', icon: Sparkles },
];

const SOURCES = [
  { id: 'instagram', label: 'Instagram', icon: Instagram },
  { id: 'tiktok', label: 'TikTok', icon: Music4 },
  { id: 'google', label: 'Google', icon: Search },
  { id: 'ami', label: 'Ami / collègue', icon: Users },
  { id: 'autre', label: 'Autre', icon: Sparkles },
];

type Step = 'intro' | 'info' | 'usecase' | 'source';

export const WelcomeOnboarding: React.FC<WelcomeOnboardingProps> = ({ name, email, language, onComplete }) => {
  const isRTL = language === 'ar';
  const [step, setStep] = useState<Step>('intro');
  const [phone, setPhone] = useState('');
  const [useCase, setUseCase] = useState(USE_CASES[0].label);
  const [source, setSource] = useState(SOURCES[0].label);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // L'intro (signature animée) reste affichée ~2.6s avant de laisser place au
  // formulaire. L'utilisateur peut aussi cliquer pour passer directement.
  useEffect(() => {
    if (step !== 'intro') return;
    const t = setTimeout(() => setStep('info'), 2600);
    return () => clearTimeout(t);
  }, [step]);

  const stepIndex = step === 'info' ? 0 : step === 'usecase' ? 1 : step === 'source' ? 2 : -1;

  const goBack = () => {
    if (step === 'usecase') setStep('info');
    else if (step === 'source') setStep('usecase');
  };

  const submit = async () => {
    setError('');
    setIsSaving(true);
    try {
      await saveOnboardingData({ phone, useCase, source, fullName: name });
      await onComplete();
    } catch (err: any) {
      setError(err?.message || (isRTL ? 'تعذر حفظ المعلومات.' : 'Impossible d\u2019enregistrer les informations.'));
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0620] flex items-center justify-center px-4 py-8" dir={isRTL ? 'rtl' : 'ltr'}>
      <style>{`
        @keyframes sawtify-draw { to { stroke-dashoffset: 0; } }
        @keyframes sawtify-fade-up { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes sawtify-plaque-in { from { opacity: 0; transform: scale(0.94); } to { opacity: 1; transform: scale(1); } }
        .sawtify-hello-path {
          stroke-dasharray: 4600;
          stroke-dashoffset: 4600;
          animation: sawtify-draw 2.2s cubic-bezier(0.65, 0, 0.35, 1) forwards;
        }
        .sawtify-fade-up { animation: sawtify-fade-up 0.45s ease both; }
        .sawtify-plaque-in { animation: sawtify-plaque-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
      `}</style>

      {step === 'intro' && (
        <button
          type="button"
          onClick={() => setStep('info')}
          className="new__bg fixed inset-0 flex items-center justify-center bg-[#0b0620] cursor-pointer"
          aria-label={isRTL ? 'تخطي' : 'Passer'}
        >
          <div className="hello__div w-full max-w-xl px-8">
            <svg className="hello__svg w-full h-auto" viewBox="0 0 1230.94 414.57">
              <path
                className="sawtify-hello-path"
                d="M-293.58-104.62S-103.61-205.49-60-366.25c9.13-32.45,9-58.31,0-74-10.72-18.82-49.69-33.21-75.55,31.94-27.82,70.11-52.22,377.24-44.11,322.48s34-176.24,99.89-183.19c37.66-4,49.55,23.58,52.83,47.92a117.06,117.06,0,0,1-3,45.32c-7.17,27.28-20.47,97.67,33.51,96.86,66.93-1,131.91-53.89,159.55-84.49,31.1-36.17,31.1-70.64,19.27-90.25-16.74-29.92-69.47-33-92.79,16.73C62.78-179.86,98.7-93.8,159-81.63S302.7-99.55,393.3-269.92c29.86-58.16,52.85-114.71,46.14-150.08-7.44-39.21-59.74-54.5-92.87-8.7-47,65-61.78,266.62-34.74,308.53S416.62-58,481.52-130.31s133.2-188.56,146.54-256.23c14-71.15-56.94-94.64-88.4-47.32C500.53-375,467.58-229.49,503.3-127a73.73,73.73,0,0,0,23.43,33.67c25.49,20.23,55.1,16,77.46,6.32a111.25,111.25,0,0,0,30.44-19.87c37.73-34.23,29-36.71,64.58-127.53C724-284.3,785-298.63,821-259.13a71,71,0,0,1,13.69,22.56c17.68,46,6.81,80-6.81,107.89-12,24.62-34.56,42.72-61.45,47.91-23.06,4.45-48.37-.35-66.48-24.27a78.88,78.88,0,0,1-12.66-25.8c-14.75-51,4.14-88.76,11-101.41,6.18-11.39,37.26-69.61,103.42-42.24,55.71,23.05,100.66-23.31,100.66-23.31"
                transform="translate(311.08 476.02)"
                style={{ fill: 'none', stroke: '#fff', strokeLinecap: 'round', strokeMiterlimit: 10, strokeWidth: 35 }}
              />
            </svg>
          </div>
        </button>
      )}

      {step !== 'intro' && (
        <div className="sawtify-plaque-in w-full max-w-2xl overflow-hidden rounded-[32px] bg-white border border-purple-100 shadow-2xl shadow-purple-900/10">
          {/* Bandeau du haut : le fond signature reste visible derrière le dégradé */}
          <div className="relative overflow-hidden bg-gradient-to-br from-purple-950 via-purple-800 to-indigo-600 px-6 py-8 sm:px-10 sm:py-10 text-white">
            <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.08]" viewBox="0 0 1230.94 414.57" preserveAspectRatio="xMidYMid slice">
              <path
                d="M-293.58-104.62S-103.61-205.49-60-366.25c9.13-32.45,9-58.31,0-74-10.72-18.82-49.69-33.21-75.55,31.94-27.82,70.11-52.22,377.24-44.11,322.48s34-176.24,99.89-183.19c37.66-4,49.55,23.58,52.83,47.92a117.06,117.06,0,0,1-3,45.32c-7.17,27.28-20.47,97.67,33.51,96.86,66.93-1,131.91-53.89,159.55-84.49,31.1-36.17,31.1-70.64,19.27-90.25-16.74-29.92-69.47-33-92.79,16.73C62.78-179.86,98.7-93.8,159-81.63S302.7-99.55,393.3-269.92c29.86-58.16,52.85-114.71,46.14-150.08-7.44-39.21-59.74-54.5-92.87-8.7-47,65-61.78,266.62-34.74,308.53S416.62-58,481.52-130.31s133.2-188.56,146.54-256.23c14-71.15-56.94-94.64-88.4-47.32C500.53-375,467.58-229.49,503.3-127a73.73,73.73,0,0,0,23.43,33.67c25.49,20.23,55.1,16,77.46,6.32a111.25,111.25,0,0,0,30.44-19.87c37.73-34.23,29-36.71,64.58-127.53C724-284.3,785-298.63,821-259.13a71,71,0,0,1,13.69,22.56c17.68,46,6.81,80-6.81,107.89-12,24.62-34.56,42.72-61.45,47.91-23.06,4.45-48.37-.35-66.48-24.27a78.88,78.88,0,0,1-12.66-25.8c-14.75-51,4.14-88.76,11-101.41,6.18-11.39,37.26-69.61,103.42-42.24,55.71,23.05,100.66-23.31,100.66-23.31"
                transform="translate(311.08 476.02)"
                style={{ fill: 'none', stroke: '#fff', strokeLinecap: 'round', strokeMiterlimit: 10, strokeWidth: 35 }}
              />
            </svg>
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold">
                <Sparkles className="h-3.5 w-3.5" /> Sawtify · Première Voice AI algérienne
              </div>
              <h1 className="mt-5 text-3xl sm:text-4xl font-black tracking-tight">
                {isRTL ? `مرحبا ${name || 'بك'} في صوتيفي` : `Bienvenue ${name || 'chez Sawtify'} !`}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-purple-100">
                {isRTL
                  ? 'صوتيفي يحول النصوص إلى أصوات طبيعية واحترافية للإعلانات، التجارة الإلكترونية، الشركات والأتمتة.'
                  : 'Sawtify transforme tes textes en voix naturelles et performantes pour tes vidéos, ton e-commerce, ton entreprise et tes automatisations.'}
              </p>
              <div className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-white/15 px-4 py-2.5 text-sm font-bold">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                {isRTL ? '50 نقطة مجانية عند البداية' : '50 points gratuits pour commencer'}
              </div>
            </div>
          </div>

          {/* Barre de progression des 3 étapes du formulaire */}
          <div className="flex items-center gap-2 px-6 pt-6 sm:px-10">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= stepIndex ? 'bg-purple-600' : 'bg-slate-200'}`} />
            ))}
          </div>

          {/* ÉTAPE 1 : coordonnées */}
          {step === 'info' && (
            <div className="sawtify-fade-up space-y-5 px-6 py-7 sm:px-10 sm:py-8">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">{isRTL ? 'خلينا نتعرف عليك' : 'Aide-nous à mieux te connaître'}</h2>
                <p className="mt-1 text-sm text-slate-500">{isRTL ? 'معلومات بسيطة لتحسين تجربتك، ويمكنك تعديلها لاحقا.' : 'Quelques informations pour personnaliser Sawtify. Tu peux les modifier plus tard.'}</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{isRTL ? 'الاسم' : 'Nom'}</div>
                  <div className="mt-1 font-bold text-slate-800">{name || 'Utilisateur Sawtify'}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400"><Mail className="h-3 w-3" /> Email</div>
                  <div className="mt-1 truncate font-bold text-slate-800">{email}</div>
                </div>
              </div>

              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-700"><Phone className="h-3.5 w-3.5 text-purple-600" /> {isRTL ? 'رقم الهاتف' : 'Numéro de téléphone'}</span>
                <input required value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" placeholder="05 50 12 34 56" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100" />
              </label>

              <button
                type="button"
                disabled={!phone.trim()}
                onClick={() => setStep('usecase')}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-purple-600 px-5 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-purple-600/20 transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isRTL ? 'التالي' : 'Continuer'} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ÉTAPE 2 : cas d'usage, sous forme de cartes */}
          {step === 'usecase' && (
            <div className="sawtify-fade-up space-y-5 px-6 py-7 sm:px-10 sm:py-8">
              <button type="button" onClick={goBack} className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-600">
                <ChevronLeft className="h-3.5 w-3.5" /> {isRTL ? 'رجوع' : 'Retour'}
              </button>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">{isRTL ? 'كيف ستستعمل صوتيفي؟' : 'Pour quel usage vas-tu utiliser Sawtify ?'}</h2>
                <p className="mt-1 text-sm text-slate-500">{isRTL ? 'اختر ما يناسبك أكثر.' : 'Choisis ce qui te correspond le mieux.'}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {USE_CASES.map(({ id, label, icon: Icon }) => {
                  const active = useCase === label;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setUseCase(label)}
                      className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-left text-sm font-bold transition ${
                        active ? 'border-purple-600 bg-purple-50 text-purple-900 ring-2 ring-purple-200' : 'border-slate-200 text-slate-700 hover:border-purple-300 hover:bg-purple-50/50'
                      }`}
                    >
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${active ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <Icon className="h-4.5 w-4.5" />
                      </span>
                      {label}
                    </button>
                  );
                })}
              </div>

              <button type="button" onClick={() => setStep('source')} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-purple-600 px-5 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-purple-600/20 transition hover:bg-purple-700">
                {isRTL ? 'التالي' : 'Continuer'} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ÉTAPE 3 : source de découverte, sous forme de cartes avec icônes */}
          {step === 'source' && (
            <div className="sawtify-fade-up space-y-5 px-6 py-7 sm:px-10 sm:py-8">
              <button type="button" onClick={goBack} className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-600">
                <ChevronLeft className="h-3.5 w-3.5" /> {isRTL ? 'رجوع' : 'Retour'}
              </button>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">{isRTL ? 'كيف عرفت صوتيفي؟' : 'Comment as-tu découvert Sawtify ?'}</h2>
                <p className="mt-1 text-sm text-slate-500">{isRTL ? 'آخر سؤال.' : 'Dernière question, promis.'}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {SOURCES.map(({ id, label, icon: Icon }) => {
                  const active = source === label;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSource(label)}
                      className={`flex flex-col items-center gap-2 rounded-2xl border px-3 py-4 text-center text-xs font-bold transition ${
                        active ? 'border-purple-600 bg-purple-50 text-purple-900 ring-2 ring-purple-200' : 'border-slate-200 text-slate-700 hover:border-purple-300 hover:bg-purple-50/50'
                      }`}
                    >
                      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${active ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      {label}
                    </button>
                  );
                })}
              </div>

              {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">{error}</div>}

              <button
                type="button"
                disabled={isSaving}
                onClick={submit}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-purple-600 px-5 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-purple-600/20 transition hover:bg-purple-700 disabled:cursor-wait disabled:opacity-60"
              >
                {isSaving ? (
                  <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> {isRTL ? 'جاري تجهيز الاستوديو...' : 'Préparation de ton studio...'}</>
                ) : (
                  <>{isRTL ? 'ابدأ في صوتيفي' : 'Entrer dans mon studio'} <ArrowRight className="h-4 w-4" /></>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WelcomeOnboarding;
