import React, { useMemo, useState } from 'react';
import { ArrowLeft, Check, Loader2, Sparkles, Volume2 } from 'lucide-react';
import { createDesignedVoice, type DesignedVoiceResponse } from '../services/api';

interface Props { balance: number; language?: 'fr' | 'ar'; onBack: () => void; onCreated: (voice: DesignedVoiceResponse) => void; onBalanceChange: (balance: number) => void; }

const EXAMPLES = [
  'Une femme algérienne adulte, timbre chaud et velouté, voix médium-grave, accent algérois léger, débit naturel, sourire audible et diction claire.',
  'Un homme algérien mûr, baryton profond et rassurant, diction nette, accent de l’Ouest, cadence posée de narrateur documentaire.',
  'Une jeune voix dynamique et lumineuse, médium-aiguë, accent maghrébin naturel, débit rapide et énergique pour des vidéos courtes.',
];

export const VoiceDesignPage: React.FC<Props> = ({ balance, language = 'fr', onBack, onCreated, onBalanceChange }) => {
  const isAr = language === 'ar';
  const [name, setName] = useState('Ma voix sur mesure');
  const [prompt, setPrompt] = useState(EXAMPLES[0]);
  const [gender, setGender] = useState<'male' | 'female' | 'unknown'>('unknown');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const canPay = balance >= 200;
  const previewText = useMemo(() => isAr ? 'مرحبا بكم في ساوتيفاي، صوتك الخاص يبدأ من هنا.' : 'Bienvenue sur Sawtify. Cette voix est créée exactement selon ta direction.', [isAr]);

  const handleCreate = async () => {
    if (!canPay || prompt.trim().length < 20 || isCreating) return;
    setIsCreating(true); setError('');
    try {
      const result = await createDesignedVoice({ display_name: name.trim() || 'Ma voix sur mesure', prompt: prompt.trim(), gender, language_code: isAr ? 'ar-DZ' : 'fr-FR' });
      onBalanceChange(result.remaining_balance);
      onCreated(result);
    } catch (e: any) { setError(e?.message || (isAr ? 'تعذر إنشاء الصوت' : 'Impossible de créer la voix.')); }
    finally { setIsCreating(false); }
  };

  return <main className="min-h-full w-full overflow-y-auto bg-gradient-to-br from-[#faf8ff] via-white to-[#f5f3ff] px-4 py-8 sm:px-8" dir={isAr ? 'rtl' : 'ltr'}>
    <div className="mx-auto max-w-4xl">
      <button onClick={onBack} className="mb-7 flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-[#6d28d9]"><ArrowLeft className="h-4 w-4" />{isAr ? 'العودة إلى الاستوديو' : 'Retour au studio'}</button>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <section className="rounded-[30px] border border-violet-100 bg-white p-6 shadow-[0_18px_60px_rgba(76,29,149,.08)] sm:p-8">
          <div className="flex items-center gap-3 text-[#6d28d9]"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ede9fe]"><Sparkles className="h-5 w-5" /></span><span className="text-[11px] font-black uppercase tracking-[.16em]">Voice Design</span></div>
          <h1 className="mt-5 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{isAr ? 'صمّم صوتك الخاص' : 'Crée une voix qui t’appartient'}</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">{isAr ? 'هذا الصوت يبقى محفوظا ويمكن استعماله في كل تسجيلاتك.' : 'Cette voix devient une identité permanente, réutilisable dans toutes tes prochaines voix-off.'}</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold text-slate-600">{isAr ? 'اسم الصوت' : 'Nom de la voix'}<input value={name} onChange={e => setName(e.target.value)} maxLength={48} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-violet-500" /></label><label className="text-xs font-bold text-slate-600">{isAr ? 'الجنس' : 'Genre facultatif'}<select value={gender} onChange={e => setGender(e.target.value as any)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none"><option value="unknown">Non précisé</option><option value="female">Femme</option><option value="male">Homme</option></select></label></div>
          <label className="mt-5 block text-xs font-bold text-slate-600">{isAr ? 'صف الصوت بالتفصيل' : 'Prompt de l’identité vocale'}<textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={7} maxLength={700} className="mt-1.5 w-full resize-y rounded-2xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none focus:border-violet-500" /></label>
          <div className="mt-3 flex flex-wrap gap-2">{EXAMPLES.map((example, i) => <button key={example} onClick={() => setPrompt(example)} className="rounded-full border border-violet-100 bg-violet-50 px-3 py-1.5 text-[10px] font-bold text-violet-700 hover:bg-violet-100">Exemple {i + 1}</button>)}</div>
          {error && <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-700">{error}</p>}
          <button onClick={handleCreate} disabled={!canPay || prompt.trim().length < 20 || isCreating} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#6d28d9] px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-violet-200 hover:bg-[#7c3aed] disabled:cursor-not-allowed disabled:opacity-45">{isCreating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}{isCreating ? 'Création de la voix…' : 'Créer ma voix — 200 points'}</button>
        </section>
        <aside className="space-y-4"><div className="rounded-[26px] border border-violet-100 bg-[#f5f3ff] p-6"><p className="text-[11px] font-black uppercase tracking-wider text-violet-700">Tarif</p><p className="mt-2 text-4xl font-black text-[#4c1d95]">200 <span className="text-base">points</span></p><p className="mt-2 text-xs leading-5 text-violet-900/60">La création inclut l’identité vocale persistante et son aperçu audio. La génération de chaque script reste facturée selon le barème TTS.</p><p className="mt-4 rounded-xl bg-white/70 px-3 py-2 text-xs font-bold text-violet-800">Solde actuel : {balance} points</p></div><div className="rounded-[26px] border border-slate-100 bg-white p-6"><div className="flex items-center gap-2 text-sm font-black text-slate-800"><Volume2 className="h-4 w-4 text-violet-600" />Aperçu préparé</div><p className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">{previewText}</p><p className="mt-3 text-[11px] leading-5 text-slate-400">{isAr ? 'الصوت النهائي يتبع الهوية التي كتبتها.' : 'Google génère l’aperçu selon l’identité décrite dans ton prompt.'}</p></div></aside>
      </div>
    </div>
  </main>;
};
