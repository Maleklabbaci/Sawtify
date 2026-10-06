import React, { useMemo, useState } from 'react';
import { AudioLines, Check, Loader2, Sparkles, X } from 'lucide-react';
import { createDesignedVoice, type DesignedVoiceResponse } from '../services/api';

interface VoiceDesignModalProps {
  onClose: () => void;
  onCreated: (voice: DesignedVoiceResponse) => void;
  language?: 'fr' | 'ar';
}

const examples = [
  'Une femme algérienne d’une trentaine d’années, timbre chaud et velouté, médium-grave, accent algérois léger, débit naturel et souriant.',
  'Un homme algérien dans la cinquantaine, baryton profond et rassurant, diction nette, accent de l’Ouest, cadence posée de narrateur documentaire.',
  'Une jeune voix dynamique, claire et lumineuse, aiguë sans être enfantine, accent maghrébin naturel, débit rapide et énergique pour les vidéos courtes.',
];

export const VoiceDesignModal: React.FC<VoiceDesignModalProps> = ({ onClose, onCreated, language = 'fr' }) => {
  const isAr = language === 'ar';
  const [name, setName] = useState('Ma voix sur mesure');
  const [age, setAge] = useState('adulte');
  const [timbre, setTimbre] = useState('chaud et naturel');
  const [pitch, setPitch] = useState('médium');
  const [accent, setAccent] = useState('algérien naturel');
  const [cadence, setCadence] = useState('conversationnelle et fluide');
  const [prompt, setPrompt] = useState('');
  const [sampleText, setSampleText] = useState('Bienvenue sur Sawtify. Donne vie à tes idées avec une voix qui te ressemble.');
  const [gender, setGender] = useState<'male' | 'female' | 'unknown'>('unknown');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const generatedPrompt = useMemo(() => prompt.trim() || `${age}, avec un timbre ${timbre}, une hauteur ${pitch}, un accent ${accent}, et une cadence ${cadence}.`, [age, timbre, pitch, accent, cadence, prompt]);

  const handleCreate = async () => {
    if (generatedPrompt.length < 20 || isCreating) return;
    setIsCreating(true); setError('');
    try {
      const voice = await createDesignedVoice({ display_name: name.trim() || 'Ma voix sur mesure', prompt: generatedPrompt, gender, language_code: isAr ? 'ar-DZ' : 'fr-FR', sample_text: sampleText.trim() });
      onCreated(voice);
    } catch (e: any) {
      setError(e?.message || (isAr ? 'تعذر إنشاء الصوت' : 'Impossible de créer cette voix pour le moment.'));
    } finally { setIsCreating(false); }
  };

  return (
    <div className="fixed inset-0 z-[340] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" onMouseDown={(e) => { if (e.target === e.currentTarget && !isCreating) onClose(); }}>
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-[28px] bg-white p-5 shadow-2xl sm:p-7" dir={isAr ? 'rtl' : 'ltr'}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#6d28d9]"><span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#ede9fe]"><AudioLines className="h-5 w-5" /></span><span className="text-[11px] font-black uppercase tracking-[.14em]">{isAr ? 'تصميم الصوت' : 'Voice Design'}</span></div>
            <h2 className="mt-3 text-xl font-black text-slate-900">{isAr ? 'صمّم صوتك بالضبط كما تريده' : 'Décris exactement la voix que tu veux'}</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">{isAr ? 'صف الهوية الصوتية الدائمة. النبرة المؤقتة تُضبط لاحقًا في النص.' : 'Décris l’identité vocale permanente. L’émotion de chaque texte se règle ensuite dans le studio.'}</p>
          </div>
          <button onClick={onClose} disabled={isCreating} className="rounded-full p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-bold text-slate-600">{isAr ? 'اسم الصوت' : 'Nom du voice' }<input value={name} onChange={e => setName(e.target.value)} maxLength={48} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#8b5cf6]" /></label>
          <label className="text-xs font-bold text-slate-600">{isAr ? 'الجنس (اختياري)' : 'Genre (facultatif)'}<select value={gender} onChange={e => setGender(e.target.value as any)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none"><option value="unknown">Non précisé</option><option value="female">Femme</option><option value="male">Homme</option></select></label>
        </div>

        <div className="mt-5 rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#6d28d9]"><Sparkles className="h-4 w-4" />{isAr ? 'هوية الصوت' : 'Identité vocale'}</div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[['Âge / profil', age, setAge, ['jeune adulte', 'adulte', 'personne mûre', 'senior']], ['Timbre', timbre, setTimbre, ['doux et chaleureux', 'chaud et naturel', 'grave et profond', 'clair et cristallin']], ['Hauteur', pitch, setPitch, ['grave', 'médium-grave', 'médium', 'médium-aiguë']], ['Accent', accent, setAccent, ['algérien naturel', 'algérois léger', 'constantinois', 'oranéen']], ['Cadence', cadence, setCadence, ['lente et posée', 'conversationnelle et fluide', 'rapide et énergique', 'précise et rythmée']]].map(([label, value, setter, options]) => (
              <label key={label as string} className="text-[11px] font-bold text-slate-600">{label as string}<select value={value as string} onChange={e => (setter as any)(e.target.value)} className="mt-1 block w-full rounded-xl border border-white bg-white px-3 py-2.5 text-xs shadow-sm outline-none">{(options as string[]).map(o => <option key={o}>{o}</option>)}</select></label>
            ))}
          </div>
        </div>

        <label className="mt-4 block text-xs font-bold text-slate-600">{isAr ? 'الوصف النهائي (قابل للتعديل)' : 'Prompt final (modifiable)'}<textarea value={prompt || generatedPrompt} onChange={e => setPrompt(e.target.value)} rows={3} maxLength={600} className="mt-1.5 w-full resize-y rounded-2xl border border-slate-200 px-3 py-3 text-sm leading-5 outline-none focus:border-[#8b5cf6]" /></label>
        <div className="mt-2 flex flex-wrap gap-1.5">{examples.map((example) => <button key={example} type="button" onClick={() => setPrompt(example)} className="rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1.5 text-[10px] font-semibold text-violet-700 hover:bg-violet-100">Exemple</button>)}</div>
        <label className="mt-4 block text-xs font-bold text-slate-600">{isAr ? 'جملة المعاينة' : 'Texte d’aperçu'}<textarea value={sampleText} onChange={e => setSampleText(e.target.value)} rows={2} maxLength={260} className="mt-1.5 w-full resize-y rounded-2xl border border-slate-200 px-3 py-3 text-sm leading-5 outline-none focus:border-[#8b5cf6]" /></label>
        {error && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-700">{error}</p>}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button onClick={onClose} disabled={isCreating} className="rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100">Annuler</button><button onClick={handleCreate} disabled={isCreating || generatedPrompt.length < 20} className="flex items-center justify-center gap-2 rounded-2xl bg-[#6d28d9] px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-violet-200 hover:bg-[#7c3aed] disabled:opacity-50">{isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{isCreating ? 'Création et aperçu…' : 'Créer ma voix et écouter'}</button></div>
      </div>
    </div>
  );
};
