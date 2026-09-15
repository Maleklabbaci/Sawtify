import React, { useEffect, useState } from 'react';
import { Code2, Copy, Check, Plus, Trash2, ExternalLink, ShieldCheck, Terminal } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { API_BASE_URL } from '../config/apiBase';

interface DeveloperKey { id: string; name: string; key_prefix: string; active: boolean; last_used_at?: string | null; created_at: string; }

export const DeveloperPage: React.FC<{ balance: number }> = ({ balance }) => {
  const [keys, setKeys] = useState<DeveloperKey[]>([]);
  const [name, setName] = useState('Mon intégration Sawtify');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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

  if (balance <= 1000) return <div className="max-w-3xl mx-auto rounded-3xl bg-white border border-slate-200 p-8 text-center"><ShieldCheck className="mx-auto h-12 w-12 text-slate-300" /><h1 className="mt-4 text-2xl font-black text-slate-900">Developer API Beta</h1><p className="mt-2 text-slate-500">Cette fonctionnalité nécessite plus de 1 000 points.</p><p className="mt-4 font-bold text-purple-600">Solde actuel : {balance} points</p></div>;

  return <div className="max-w-5xl mx-auto space-y-6">
    <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-purple-950 to-purple-700 p-7 text-white shadow-xl">
      <div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-purple-200 text-xs font-bold uppercase tracking-widest"><Code2 className="h-4 w-4" /> Developer API <span className="rounded-full bg-white/15 px-2 py-0.5">BETA</span></div><h1 className="mt-3 text-3xl font-black">Intègre Sawtify partout.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-purple-100">Utilise la synthèse vocale Sawtify dans tes chatbots, boîtes vocales, CRM et automatisations. La sortie est un WAV mono 24 kHz compatible avec les systèmes vocaux.</p></div><Terminal className="hidden sm:block h-14 w-14 text-purple-200/60" /></div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-white/10 p-3"><div className="text-xs text-purple-200">Accès</div><div className="mt-1 font-bold">+1 000 points</div></div><div className="rounded-2xl bg-white/10 p-3"><div className="text-xs text-purple-200">Format</div><div className="mt-1 font-bold">WAV · 24 kHz</div></div><div className="rounded-2xl bg-white/10 p-3"><div className="text-xs text-purple-200">Solde actuel</div><div className="mt-1 font-bold">{balance} points</div></div></div>
    </div>
    {newKey && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><p className="font-bold text-amber-900">Copie ta clé maintenant — elle ne sera plus affichée.</p><div className="mt-3 flex gap-2"><code className="min-w-0 flex-1 overflow-x-auto rounded-xl bg-white px-3 py-3 text-xs text-slate-800">{newKey}</code><button onClick={copyKey} className="rounded-xl bg-slate-900 px-4 text-white">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</button></div></div>}
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]"><section className="rounded-3xl border border-slate-200 bg-white p-6"><h2 className="font-black text-slate-900">Créer une clé</h2><p className="mt-1 text-sm text-slate-500">Une clé par application ou client.</p><label className="mt-5 block text-xs font-bold text-slate-500">Nom de l’intégration</label><input value={name} onChange={e => setName(e.target.value)} maxLength={80} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-purple-500" /><button disabled={busy || !name.trim()} onClick={createKey} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 text-sm font-bold text-white disabled:opacity-50"><Plus className="h-4 w-4" />{busy ? 'Création…' : 'Créer une clé Beta'}</button>{message && <p className="mt-3 text-sm text-rose-600">{message}</p>}<a href="/docs/developer-api-beta.html" target="_blank" rel="noreferrer" className="mt-5 flex items-center gap-2 text-xs font-bold text-purple-600">Voir la documentation <ExternalLink className="h-3 w-3" /></a></section>
    <section className="rounded-3xl border border-slate-200 bg-white p-6"><h2 className="font-black text-slate-900">Mes clés API</h2>{loading ? <p className="mt-5 text-sm text-slate-500">Chargement…</p> : keys.length === 0 ? <p className="mt-5 text-sm text-slate-500">Aucune clé créée.</p> : <div className="mt-4 space-y-3">{keys.map(key => <div key={key.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-800">{key.name}</p><code className="text-xs text-slate-500">{key.key_prefix}••••••</code><p className="text-[10px] text-slate-400">{key.active ? 'Active' : 'Révoquée'} · créée le {new Date(key.created_at).toLocaleDateString('fr-FR')}</p></div>{key.active && <button onClick={() => revokeKey(key.id)} title="Révoquer" className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>}</div>)}</div>}</section></div>
  </div>;
};
