import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Mail, Phone, Sparkles } from 'lucide-react';
import { saveOnboardingData } from '../services/supabaseClient';

interface WelcomeOnboardingProps {
  name: string;
  email: string;
  language: 'fr' | 'ar';
  onComplete: () => Promise<void> | void;
}

const USE_CASES = [
  'Vidéos e-commerce / publicité',
  'Présentation d’entreprise ou de produit',
  'Agence marketing / communication',
  'Podcast / boîte vocale / narration',
  'Automatisation et contenu IA',
  'Formation / réseaux sociaux',
  'Autre',
];

const SOURCES = ['Instagram', 'Facebook', 'TikTok', 'Google', 'Ami / collègue', 'Autre'];

export const WelcomeOnboarding: React.FC<WelcomeOnboardingProps> = ({ name, email, language, onComplete }) => {
  const isRTL = language === 'ar';
  const [phone, setPhone] = useState('');
  const [useCase, setUseCase] = useState(USE_CASES[0]);
  const [source, setSource] = useState(SOURCES[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSaving(true);
    try {
      await saveOnboardingData({ phone, useCase, source, fullName: name });
      await onComplete();
    } catch (err: any) {
      setError(err?.message || (isRTL ? 'تعذر حفظ المعلومات.' : 'Impossible d’enregistrer les informations.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f7ff] flex items-center justify-center px-4 py-8" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-2xl overflow-hidden rounded-[32px] bg-white border border-purple-100 shadow-2xl shadow-purple-900/10">
        <div className="relative overflow-hidden bg-gradient-to-br from-purple-950 via-purple-800 to-indigo-600 px-6 py-8 sm:px-10 sm:py-10 text-white">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-fuchsia-400/20 blur-3xl" />
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

        <form onSubmit={submit} className="space-y-5 px-6 py-7 sm:px-10 sm:py-8">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">{isRTL ? 'خلينا نتعرف عليك' : 'Aide-nous à mieux te connaître'}</h2>
            <p className="mt-1 text-sm text-slate-500">{isRTL ? 'معلومات بسيطة لتحسين تجربتك، ويمكنك تعديلها لاحقا.' : 'Deux petites questions pour personnaliser Sawtify. Tu peux les modifier plus tard.'}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Nom</div>
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

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-slate-700">{isRTL ? 'كيف ستستعمل صوتيفي؟' : 'Pour quel usage vas-tu utiliser Sawtify ?'}</span>
            <select value={useCase} onChange={(e) => setUseCase(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100">
              {USE_CASES.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-slate-700">{isRTL ? 'كيف عرفت صوتيفي؟' : 'Comment as-tu découvert Sawtify ?'}</span>
            <select value={source} onChange={(e) => setSource(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100">
              {SOURCES.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>

          {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">{error}</div>}

          <button disabled={isSaving} type="submit" className="flex w-full items-center justify-center gap-2 rounded-2xl bg-purple-600 px-5 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-purple-600/20 transition hover:bg-purple-700 disabled:cursor-wait disabled:opacity-60">
            {isSaving ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> {isRTL ? 'جاري تجهيز الاستوديو...' : 'Préparation de ton studio...'}</> : <>{isRTL ? 'ابدأ في صوتيفي' : 'Entrer dans mon studio'} <ArrowRight className="h-4 w-4" /></>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default WelcomeOnboarding;
