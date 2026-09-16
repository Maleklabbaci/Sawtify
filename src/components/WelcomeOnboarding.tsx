import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Bot,
  Building2,
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

// Les trois préfixes mobiles algériens et leur opérateur.
const ALGERIA_CARRIERS: Record<string, { name: string; color: string }> = {
  '05': { name: 'Ooredoo', color: '#E4032E' },
  '06': { name: 'Mobilis', color: '#1AA64A' },
  '07': { name: 'Djezzy', color: '#F58220' },
};

const onlyDigits = (raw: string) => raw.replace(/\D/g, '').slice(0, 10);
const detectCarrier = (digits: string) => ALGERIA_CARRIERS[digits.slice(0, 2)];
const isValidAlgerianPhone = (digits: string) => /^0[567]\d{8}$/.test(digits);

type Step = 'intro' | 'info' | 'usecase' | 'source';

const STEP_LABELS: { key: Exclude<Step, 'intro'>; num: number; fr: string; ar: string }[] = [
  { key: 'info', num: 1, fr: 'Profil', ar: 'ملفك' },
  { key: 'usecase', num: 2, fr: 'Usage', ar: 'الاستعمال' },
  { key: 'source', num: 3, fr: 'Découverte', ar: 'الاكتشاف' },
];

export const WelcomeOnboarding: React.FC<WelcomeOnboardingProps> = ({ name, email, language, onComplete }) => {
  const isRTL = language === 'ar';
  const [step, setStep] = useState<Step>('intro');
  const [phone, setPhone] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [useCase, setUseCase] = useState(USE_CASES[0].label);
  const [source, setSource] = useState(SOURCES[0].label);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // L'URL reflète l'étape "profil incomplet" tant que ce flux est affiché :
  // /onboarding tant que ce n'est pas rempli, /studio une fois terminé.
  // Si l'utilisateur a déjà tout rempli, ce composant ne s'affiche jamais et
  // l'URL /onboarding ne mène donc nulle part côté app.
  useEffect(() => {
    if (step === 'intro') return;
    if (window.location.pathname !== '/onboarding') {
      window.history.replaceState({}, '', '/onboarding');
    }
  }, [step]);

  useEffect(() => {
    if (step !== 'intro') return;
    const t = setTimeout(() => setStep('info'), 2600);
    return () => clearTimeout(t);
  }, [step]);

  const stepIndex = step === 'info' ? 0 : step === 'usecase' ? 1 : step === 'source' ? 2 : -1;
  const carrier = useMemo(() => detectCarrier(phone), [phone]);
  const phoneValid = isValidAlgerianPhone(phone);
  const phoneError =
    phoneTouched && phone.length > 0 && !phoneValid
      ? phone.length < 10
        ? (isRTL ? 'الرقم يجب أن يحتوي على 10 أرقام.' : 'Le numéro doit contenir 10 chiffres.')
        : (isRTL ? 'يجب أن يبدأ الرقم بـ 05 أو 06 أو 07.' : 'Le numéro doit commencer par 05, 06 ou 07.')
      : '';

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
    <div className="min-h-screen bg-[#100a24] flex items-center justify-center px-4 py-8" dir={isRTL ? 'rtl' : 'ltr'}>
      <style>{`
        @keyframes sawtify-draw { to { stroke-dashoffset: 0; } }
        @keyframes sawtify-fade-up { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes sawtify-plaque-in { from { opacity: 0; transform: scale(0.94); } to { opacity: 1; transform: scale(1); } }
        @keyframes sawtify-bar { 0%, 100% { transform: scaleY(0.35); } 50% { transform: scaleY(1); } }
        .sawtify-hello-path {
          stroke-dasharray: 4600;
          stroke-dashoffset: 4600;
          animation: sawtify-draw 2.2s cubic-bezier(0.65, 0, 0.35, 1) forwards;
        }
        .sawtify-fade-up { animation: sawtify-fade-up 0.4s ease both; }
        .sawtify-plaque-in { animation: sawtify-plaque-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .sawtify-bar { animation: sawtify-bar 1.6s ease-in-out infinite; transform-origin: bottom; }
      `}</style>

      {step === 'intro' && (
        <button
          type="button"
          onClick={() => setStep('info')}
          className="fixed inset-0 flex items-center justify-center bg-[#100a24] cursor-pointer"
          aria-label={isRTL ? 'تخطي' : 'Passer'}
        >
          <div className="w-full max-w-xl px-8">
            <svg className="w-full h-auto" viewBox="0 0 1230.94 414.57">
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
        <div className="sawtify-plaque-in w-full max-w-2xl overflow-hidden rounded-[28px] bg-white border border-white/10 shadow-2xl shadow-black/40">
          {/* Bandeau du haut : identité + waveform, sans blob dégradé générique */}
          <div className="relative overflow-hidden bg-[#150c33] px-6 py-8 sm:px-10 sm:py-9 text-white">
            <div className="absolute inset-x-0 bottom-0 flex h-16 items-end justify-center gap-[3px] opacity-20">
              {[6, 10, 16, 22, 14, 26, 18, 10, 20, 12, 24, 8, 16, 22, 10, 6].map((h, i) => (
                <span key={i} className="sawtify-bar w-1.5 rounded-full bg-white" style={{ height: h, animationDelay: `${i * 0.08}s` }} />
              ))}
            </div>
            <div className="relative">
              <div className="flex items-center gap-2 text-sm font-bold text-purple-200">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300"><Mic2 className="h-3.5 w-3.5" /></span>
                Sawtify
              </div>
              <h1 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight">
                {isRTL ? `مرحبا ${name || 'بك'}` : `Bienvenue ${name || 'sur Sawtify'}`}
              </h1>
              <p className="mt-3 max-w-md text-sm leading-6 text-white/60">
                {isRTL
                  ? 'صوتيفي يحول النصوص إلى أصوات طبيعية للإعلانات والتجارة الإلكترونية والشركات.'
                  : 'Sawtify transforme tes textes en voix naturelles pour tes vidéos, ton e-commerce et ton entreprise.'}
              </p>
              <div className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2 text-sm font-bold text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {isRTL ? '50 نقطة مجانية' : '50 points offerts'}
              </div>
            </div>
          </div>

          {/* Étapes numérotées : la donnée EST une séquence, donc un compteur a du sens ici */}
          <div className="flex items-center gap-4 border-b border-slate-100 px-6 py-4 sm:px-10">
            {STEP_LABELS.map((s, i) => (
              <div key={s.key} className="flex items-center gap-2">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-extrabold transition-colors ${
                    i <= stepIndex ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {s.num}
                </span>
                <span className={`text-xs font-bold ${i <= stepIndex ? 'text-slate-800' : 'text-slate-400'}`}>{isRTL ? s.ar : s.fr}</span>
                {i < STEP_LABELS.length - 1 && <span className="mx-1 h-px w-6 bg-slate-200" />}
              </div>
            ))}
          </div>

          {/* ÉTAPE 1 : coordonnées */}
          {step === 'info' && (
            <div className="sawtify-fade-up space-y-5 px-6 py-7 sm:px-10 sm:py-8">
              <p className="text-sm text-slate-500">{isRTL ? 'معلومات بسيطة لتحسين تجربتك، يمكنك تعديلها لاحقا.' : 'Quelques informations pour personnaliser Sawtify. Tu pourras les modifier plus tard.'}</p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 px-4 py-3">
                  <div className="text-[13px] text-slate-400">{isRTL ? 'الاسم' : 'Nom'}</div>
                  <div className="mt-0.5 font-bold text-slate-800">{name || 'Utilisateur Sawtify'}</div>
                </div>
                <div className="rounded-xl border border-slate-200 px-4 py-3">
                  <div className="flex items-center gap-1 text-[13px] text-slate-400"><Mail className="h-3 w-3" /> Email</div>
                  <div className="mt-0.5 truncate font-bold text-slate-800">{email}</div>
                </div>
              </div>

              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-slate-700"><Phone className="h-3.5 w-3.5 text-purple-600" /> {isRTL ? 'رقم الهاتف' : 'Numéro de téléphone'}</span>
                <div className={`flex items-center rounded-xl border bg-white px-4 transition ${phoneError ? 'border-rose-400 ring-4 ring-rose-100' : 'border-slate-200 focus-within:border-purple-500 focus-within:ring-4 focus-within:ring-purple-100'}`}>
                  <input
                    required
                    value={phone}
                    onChange={(e) => setPhone(onlyDigits(e.target.value))}
                    onBlur={() => setPhoneTouched(true)}
                    type="tel"
                    inputMode="numeric"
                    placeholder="0550123456"
                    className="w-full bg-transparent py-3 text-sm outline-none"
                  />
                  {carrier && (
                    <span className="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ backgroundColor: `${carrier.color}1a`, color: carrier.color }}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: carrier.color }} />
                      {carrier.name}
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex items-center justify-between text-xs">
                  <span className={phoneError ? 'font-semibold text-rose-600' : 'text-slate-400'}>
                    {phoneError || (isRTL ? '10 أرقام تبدأ بـ 05، 06 أو 07' : '10 chiffres, commence par 05, 06 ou 07')}
                  </span>
                  <span className="text-slate-300">{phone.length}/10</span>
                </div>
              </label>

              <button
                type="button"
                disabled={!phoneValid}
                onClick={() => setStep('usecase')}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-3.5 text-sm font-extrabold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
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
              <h2 className="text-lg font-extrabold text-slate-900">{isRTL ? 'كيف ستستعمل صوتيفي؟' : 'Pour quel usage vas-tu utiliser Sawtify\u00a0?'}</h2>

              <div className="grid gap-3 sm:grid-cols-2">
                {USE_CASES.map(({ id, label, icon: Icon }) => {
                  const active = useCase === label;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setUseCase(label)}
                      className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-sm font-bold transition ${
                        active ? 'border-purple-600 bg-purple-50 text-purple-900 ring-2 ring-purple-200' : 'border-slate-200 text-slate-700 hover:border-purple-300 hover:bg-purple-50/50'
                      }`}
                    >
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${active ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <Icon className="h-4.5 w-4.5" />
                      </span>
                      {label}
                    </button>
                  );
                })}
              </div>

              <button type="button" onClick={() => setStep('source')} className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-3.5 text-sm font-extrabold text-white transition hover:bg-purple-700">
                {isRTL ? 'التالي' : 'Continuer'} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ÉTAPE 3 : source de découverte */}
          {step === 'source' && (
            <div className="sawtify-fade-up space-y-5 px-6 py-7 sm:px-10 sm:py-8">
              <button type="button" onClick={goBack} className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-600">
                <ChevronLeft className="h-3.5 w-3.5" /> {isRTL ? 'رجوع' : 'Retour'}
              </button>
              <h2 className="text-lg font-extrabold text-slate-900">{isRTL ? 'كيف عرفت صوتيفي؟' : 'Comment as-tu découvert Sawtify\u00a0?'}</h2>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {SOURCES.map(({ id, label, icon: Icon }) => {
                  const active = source === label;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSource(label)}
                      className={`flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-center text-xs font-bold transition ${
                        active ? 'border-purple-600 bg-purple-50 text-purple-900 ring-2 ring-purple-200' : 'border-slate-200 text-slate-700 hover:border-purple-300 hover:bg-purple-50/50'
                      }`}
                    >
                      <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${active ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
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
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-3.5 text-sm font-extrabold text-white transition hover:bg-purple-700 disabled:cursor-wait disabled:opacity-60"
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
