import React, { useEffect, useState } from 'react';
import { Code2, Copy, Check, Plus, Trash2, ExternalLink, ShieldCheck, Terminal, Activity, Clock3, Link2, Zap, BookOpen, Building2, Play } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { API_BASE_URL } from '../config/apiBase';
import { useLanguage } from '../context/LanguageContext';

interface DeveloperKey { id: string; name: string; key_prefix: string; active: boolean; last_used_at?: string | null; created_at: string; }
interface UsageStats { api_calls: number; characters: number; estimated_minutes: number; active_keys: number; keys: DeveloperKey[]; }

/** Exemples prêts à copier pour tester l'API immédiatement (cURL, Python, JavaScript). */
const API_SNIPPETS: Record<'curl' | 'python' | 'js', string> = {
  curl: `curl -X POST https://sawtify.space/api/v1/developer/tts \\
  -H "Authorization: Bearer swt_beta_VOTRE_CLE" \\
  -H "Content-Type: application/json" \\
  -d '{"text": "أهلا بيك في Sawtify!", "voice_id": "voice_amin", "format": "wav"}' \\
  --output sawtify.wav`,
  python: `import requests

response = requests.post(
    "https://sawtify.space/api/v1/developer/tts",
    headers={"Authorization": "Bearer swt_beta_VOTRE_CLE"},
    json={"text": "أهلا بيك في Sawtify!", "voice_id": "voice_amin", "format": "wav"},
)
with open("sawtify.wav", "wb") as f:
    f.write(response.content)`,
  js: `const response = await fetch("https://sawtify.space/api/v1/developer/tts", {
  method: "POST",
  headers: {
    "Authorization": "Bearer swt_beta_VOTRE_CLE",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ text: "أهلا بيك في Sawtify!", voice_id: "voice_amin", format: "wav" }),
});
const blob = await response.blob();`,
};

export const DeveloperPage: React.FC<{ balance: number }> = ({ balance }) => {
  const { language } = useLanguage();
  const isAR = language === 'ar';
  const [keys, setKeys] = useState<DeveloperKey[]>([]);
  const [name, setName] = useState('Mon intégration Sawtify');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  // Playground de code : onglet actif + confirmation de copie.
  const [snippetTab, setSnippetTab] = useState<'curl' | 'python' | 'js'>('curl');
  const [snippetCopied, setSnippetCopied] = useState(false);

  const authHeaders = async (): Promise<HeadersInit> => {
    const { data } = await supabase.auth.getSession();
    return { Authorization: `Bearer ${data.session?.access_token || ''}`, 'Content-Type': 'application/json' };
  };
  const loadKeys = async () => {
    setLoading(true);
    try { const response = await fetch(`${API_BASE_URL}/api/v1/developer/keys`, { headers: await authHeaders() }); const data = await response.json(); if (response.ok) setKeys(data.keys || []); else setMessage(data.error || 'Erreur de chargement'); }
    catch { setMessage('Serveur temporairement indisponible.'); } finally { setLoading(false); }
  };
  useEffect(() => { void loadKeys(); }, []);
  const loadUsage = async () => { try { const response = await fetch(`${API_BASE_URL}/api/v1/developer/usage`, { headers: await authHeaders() }); if (response.ok) setUsage(await response.json()); } catch { /* dashboard non bloquant */ } };
  useEffect(() => { void loadUsage(); }, []);

  const createKey = async () => {
    setBusy(true); setMessage(null);
    try { const response = await fetch(`${API_BASE_URL}/api/v1/developer/keys`, { method: 'POST', headers: await authHeaders(), body: JSON.stringify({ name }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setNewKey(data.api_key); await loadKeys(); }
    catch (error: any) { setMessage(error.message || 'Impossible de créer la clé.'); } finally { setBusy(false); }
  };
  const revokeKey = async (id: string) => {
    if (!window.confirm('Révoquer cette clé API ? Elle ne pourra plus être utilisée.')) return;
    await fetch(`${API_BASE_URL}/api/v1/developer/keys/${id}`, { method: 'DELETE', headers: await authHeaders() }); await loadKeys();
  };
  const copyKey = async () => { if (!newKey) return; await navigator.clipboard.writeText(newKey); setCopied(true); setTimeout(() => setCopied(false), 1800); };
  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(API_SNIPPETS[snippetTab]);
      setSnippetCopied(true);
      setTimeout(() => setSnippetCopied(false), 1800);
    } catch { /* copie impossible : sélection manuelle */ }
  };

  if (balance <= 1000) return <div className="saw-glass max-w-3xl mx-auto rounded-[28px] p-8 text-center"><ShieldCheck className="mx-auto h-12 w-12 text-slate-300" /><h1 className="mt-4 text-2xl font-black text-slate-900">Developer API Beta</h1><p className="mt-2 text-slate-500">Cette fonctionnalité nécessite plus de 1 000 points.</p><p className="mt-4 font-bold text-purple-600">Solde actuel : {balance} points</p></div>;

  return <div className="saw-secondary-page saw-developer-page max-w-5xl mx-auto space-y-6">
    <div className="saw-glass relative overflow-hidden rounded-[30px] p-5 sm:p-7">
      <div className="pointer-events-none absolute -end-16 -top-20 h-56 w-56 rounded-full bg-violet-200/35 blur-3xl" />
      <div className="relative flex items-start justify-between gap-4"><div className="min-w-0"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-violet-700"><Code2 className="h-4 w-4" /> Developer API <span className="rounded-full border border-violet-100 bg-white/80 px-2 py-0.5">BETA</span></div><h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl break-words">Intègre Sawtify partout.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Utilise la synthèse vocale Sawtify dans tes chatbots, boîtes vocales, CRM et automatisations. La sortie est un WAV mono 24 kHz compatible avec les systèmes vocaux.</p></div><Terminal className="hidden sm:block h-14 w-14 shrink-0 text-violet-300" /></div>
      <div className="relative mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-white/80 bg-white/65 p-3"><div className="text-xs text-slate-500">Accès</div><div className="mt-1 font-bold text-slate-900">+1 000 points</div></div><div className="rounded-2xl border border-white/80 bg-white/65 p-3"><div className="text-xs text-slate-500">Format</div><div className="mt-1 font-bold text-slate-900">WAV · 24 kHz</div></div><div className="rounded-2xl border border-white/80 bg-white/65 p-3"><div className="text-xs text-slate-500">Solde actuel</div><div className="mt-1 font-bold text-slate-900">{balance} points</div></div></div>
      {/* Documentation & Playground : bouton visible en haut de l'interface. */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <a
          href="#api-playground"
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-violet-700"
        >
          <BookOpen className="h-4 w-4" />
          {isAR ? 'عرض التوثيق (Documentation)' : 'Voir la documentation'}
        </a>
        <a
          href="#api-playground"
          className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white/65 px-5 py-3 text-sm font-bold text-violet-800 transition hover:bg-violet-50"
        >
          <Play className="h-4 w-4" />
          {isAR ? 'جرّب الكود (cURL, Python, JS)' : 'Tester le code (cURL, Python, JS)'}
        </a>
      </div>
    </div>
    <section className="grid gap-3 sm:grid-cols-4">
      <div className="saw-glass rounded-2xl p-4"><Activity className="h-4 w-4 text-purple-600" /><p className="mt-3 text-xs text-slate-500">Appels API · 30 jours</p><p className="text-2xl font-black text-slate-900">{usage?.api_calls ?? '—'}</p></div>
      <div className="saw-glass rounded-2xl p-4"><Clock3 className="h-4 w-4 text-purple-600" /><p className="mt-3 text-xs text-slate-500">Minutes générées</p><p className="text-2xl font-black text-slate-900">{usage ? usage.estimated_minutes.toFixed(1) : '—'}</p></div>
      <div className="saw-glass rounded-2xl p-4"><Zap className="h-4 w-4 text-purple-600" /><p className="mt-3 text-xs text-slate-500">Points restants</p><p className="text-2xl font-black text-slate-900">{balance}</p></div>
      <div className="saw-glass rounded-2xl p-4"><Link2 className="h-4 w-4 text-purple-600" /><p className="mt-3 text-xs text-slate-500">Clés actives</p><p className="text-2xl font-black text-slate-900">{usage?.active_keys ?? keys.filter(k => k.active).length}</p></div>
    </section>
    {/* Documentation & Playground : essayer le code (cURL, Python, JS) immédiatement. */}
    <section id="api-playground" className="saw-glass rounded-[26px] p-6 scroll-mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-black text-slate-900">{isAR ? 'جرّب الكود مباشرة' : 'Essaie le code immédiatement'}</h2>
          <p className="mt-1 text-sm text-slate-500">{isAR ? 'انسخ المثال وشغّله: cURL, Python أو JavaScript.' : 'Copie l’exemple et lance-le : cURL, Python ou JavaScript.'}</p>
        </div>
        <a href="/docs/developer-api-beta.html" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-purple-200 px-4 py-2.5 text-xs font-bold text-purple-700 transition hover:bg-purple-50">
          {isAR ? 'التوثيق الكامل' : 'Documentation complète'} <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {([['curl', 'cURL'], ['python', 'Python'], ['js', 'JavaScript']] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => { setSnippetTab(id); setSnippetCopied(false); }}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${snippetTab === id ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mt-3 rounded-2xl bg-slate-950 p-4">
        <pre dir="ltr" className="overflow-x-auto text-xs leading-relaxed text-purple-200"><code>{API_SNIPPETS[snippetTab]}</code></pre>
      </div>
      <button
        type="button"
        onClick={copySnippet}
        className="mt-3 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-purple-600"
      >
        {snippetCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {snippetCopied ? (isAR ? 'تم النسخ' : 'Copié') : (isAR ? 'نسخ الكود' : 'Copier le code')}
      </button>
    </section>
    {/* B2B : volumes importants et solutions sur mesure. */}
    <section className="rounded-[26px] border border-violet-100 bg-gradient-to-r from-violet-50 via-white to-fuchsia-50 p-6 text-slate-900 shadow-[0_12px_38px_rgba(76,29,149,.06)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><Building2 className="h-5 w-5" /></div>
          <div>
            <h2 className="text-base sm:text-lg font-black">{isAR ? 'تحتاج حجماً كبيراً أو حلولاً مخصصة لشركتك؟' : 'Besoin d’un gros volume ou d’une solution sur mesure ?'}</h2>
            <p className="mt-1 text-sm text-slate-600">{isAR ? 'تواصل مع فريق B2B لعرض مؤسسي مخصص.' : 'Contacte l’équipe B2B pour une offre entreprise dédiée.'}</p>
          </div>
        </div>
        <a
          href="mailto:support@sawtify.space?subject=Sawtify%20B2B"
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-violet-700"
        >
          <Building2 className="h-4 w-4" />
          {isAR ? 'تواصل مع فريق B2B' : 'Contacter l’équipe B2B'}
        </a>
      </div>
    </section>
    <section className="saw-glass rounded-[26px] p-6"><h2 className="font-black text-slate-900">Connexions et consommation</h2><p className="mt-1 text-sm text-slate-500">Chaque appel Developer API est associé à sa clé et journalisé pour suivre ton usage.</p><div className="mt-4 space-y-3">{keys.length === 0 ? <p className="text-sm text-slate-500">Crée une clé pour commencer.</p> : keys.map(key => <div key={key.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3"><div><p className="text-sm font-bold text-slate-800">{key.name}</p><code className="text-xs text-slate-500">{key.key_prefix}••••••</code></div><div className="text-right text-xs text-slate-500"><p className={key.active ? 'font-bold text-emerald-600' : 'text-slate-400'}>{key.active ? 'Connectée · active' : 'Révoquée'}</p><p>{key.last_used_at ? `Dernier appel : ${new Date(key.last_used_at).toLocaleString('fr-FR')}` : 'Jamais utilisée'}</p></div></div>)}</div></section>
    <section className="saw-glass rounded-[26px] p-6"><h2 className="font-black text-slate-900">URL Media pour les automatisations</h2><p className="mt-1 text-sm text-slate-500">Pour Viasocket, n8n ou un chatbot qui attend un fichier média, utilise une URL publique directement accessible.</p><div className="mt-4 rounded-2xl bg-slate-950 p-4 text-sm text-purple-200"><code>https://sawtify.space/api/v1/developer/tts</code></div><p className="mt-3 text-xs text-slate-500">Types acceptés par les outils d’automatisation : photo, vidéo, audio, document ou GIF. Sawtify retourne un audio WAV ; si ton outil demande un champ <code>media_url</code>, envoie l’URL publique du fichier après avoir reçu la réponse audio.</p></section>
    {newKey && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><p className="font-bold text-amber-900">Copie ta clé maintenant — elle ne sera plus affichée.</p><div className="mt-3 flex gap-2"><code className="min-w-0 flex-1 overflow-x-auto rounded-xl bg-white px-3 py-3 text-xs text-slate-800">{newKey}</code><button onClick={copyKey} className="rounded-xl bg-slate-900 px-4 text-white">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</button></div></div>}
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]"><section className="saw-glass rounded-[26px] p-6"><h2 className="font-black text-slate-900">Créer une clé</h2><p className="mt-1 text-sm text-slate-500">Une clé par application ou client.</p><label className="mt-5 block text-xs font-bold text-slate-500">Nom de l’intégration</label><input value={name} onChange={e => setName(e.target.value)} maxLength={80} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-purple-500" /><button disabled={busy || !name.trim()} onClick={createKey} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 text-sm font-bold text-white disabled:opacity-50"><Plus className="h-4 w-4" />{busy ? 'Création…' : 'Créer une clé Beta'}</button>{message && <p className="mt-3 text-sm text-rose-600">{message}</p>}<a href="/docs/developer-api-beta.html" target="_blank" rel="noreferrer" className="mt-5 flex items-center gap-2 text-xs font-bold text-purple-600">Voir la documentation <ExternalLink className="h-3 w-3" /></a></section>
    <section className="saw-glass rounded-[26px] p-6"><h2 className="font-black text-slate-900">Mes clés API</h2>{loading ? <p className="mt-5 text-sm text-slate-500">Chargement…</p> : keys.length === 0 ? <p className="mt-5 text-sm text-slate-500">Aucune clé créée.</p> : <div className="mt-4 space-y-3">{keys.map(key => <div key={key.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-800">{key.name}</p><code className="text-xs text-slate-500">{key.key_prefix}••••••</code><p className="text-[10px] text-slate-400">{key.active ? 'Active' : 'Révoquée'} · créée le {new Date(key.created_at).toLocaleDateString('fr-FR')}</p></div>{key.active && <button onClick={() => revokeKey(key.id)} title="Révoquer" className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>}</div>)}</div>}</section></div>
  </div>;
};
