import React, { useEffect, useState } from 'react';
import { BarChart3, Users, CreditCard, Mic2, ShieldAlert, RefreshCw } from 'lucide-react';
import { API_BASE_URL } from '../config/apiBase';
import { getMyAccessToken } from '../services/supabaseClient';

type AdminData = {
  summary: { total_users: number; free_trial_users: number; paid_users: number; active_users_30d: number; generations_total: number; free_generations: number; paid_generations: number; api_generations: number; revenue_dzd: number; points_consumed: number; paid_points_issued: number; point_value_dzd: number; gemini_cost_usd: number; gemini_cost_dzd: number; gross_margin_dzd: number; gross_margin_percent: number; usd_to_dzd: number };
  recent_users: Array<{ id: string; email: string; full_name: string | null; credits_balance: number; total_generated_audios: number; created_at: string }>;
  recent_payments: Array<{ amount_dzd: number; points_credited: number; status: string; gateway: string; created_at: string }>;
  cost_model: Record<string, number>;
};

const money = (n: number) => `${new Intl.NumberFormat('fr-DZ', { maximumFractionDigits: 2 }).format(n)} DZD`;

export const AdminPage: React.FC = () => {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = async () => {
    setLoading(true); setError('');
    try {
      const token = await getMyAccessToken();
      const res = await fetch(`${API_BASE_URL}/api/admin/overview`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Accès Admin refusé.');
      setData(body);
    } catch (e: any) { setError(e?.message || 'Impossible de charger le dashboard.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  if (loading) return <div className="rounded-3xl bg-white p-10 text-center text-slate-500">Chargement du dashboard sécurisé…</div>;
  if (error) return <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-700"><ShieldAlert className="mx-auto mb-3 h-8 w-8" /><p className="font-bold">{error}</p><button onClick={load} className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">Réessayer</button></div>;
  if (!data) return null;
  const s = data.summary;
  const cards = [
    ['Utilisateurs', s.total_users, Users], ['Free trial', s.free_trial_users, BarChart3], ['Clients payants', s.paid_users, CreditCard], ['Générations', s.generations_total, Mic2],
  ];
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.18em] text-purple-600">Espace propriétaire</p><h1 className="mt-1 text-3xl font-black text-slate-900">Dashboard Sawtify</h1><p className="mt-1 text-sm text-slate-500">Utilisateurs, activité, paiements et marge estimée.</p></div><button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"><RefreshCw className="h-4 w-4" />Actualiser</button></div>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, Icon]: any) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5"><Icon className="h-5 w-5 text-purple-600" /><p className="mt-4 text-xs font-bold text-slate-500">{label}</p><p className="mt-1 text-3xl font-black text-slate-900">{value}</p></div>)}</section>
    <section className="grid gap-4 lg:grid-cols-3"><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><p className="text-xs font-bold text-emerald-700">Chiffre d’affaires encaissé</p><p className="mt-2 text-2xl font-black text-emerald-900">{money(s.revenue_dzd)}</p><p className="mt-1 text-xs text-emerald-700">Points vendus : {s.paid_points_issued}</p></div><div className="rounded-2xl border border-rose-200 bg-rose-50 p-5"><p className="text-xs font-bold text-rose-700">Coût Gemini estimé</p><p className="mt-2 text-2xl font-black text-rose-900">{money(s.gemini_cost_dzd)}</p><p className="mt-1 text-xs text-rose-700">${s.gemini_cost_usd.toFixed(4)} · taux 1$ = {s.usd_to_dzd} DZD</p></div><div className="rounded-2xl border border-purple-200 bg-purple-50 p-5"><p className="text-xs font-bold text-purple-700">Marge brute estimée</p><p className="mt-2 text-2xl font-black text-purple-900">{money(s.gross_margin_dzd)}</p><p className="mt-1 text-xs text-purple-700">{s.gross_margin_percent.toFixed(1)}% · valeur moyenne du point : {s.point_value_dzd.toFixed(2)} DZD</p></div></section>
    <section className="grid gap-6 lg:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-black text-slate-900">Générations</h2><div className="mt-4 grid grid-cols-3 gap-3 text-center"><div className="rounded-xl bg-slate-50 p-3"><p className="text-2xl font-black">{s.free_generations}</p><p className="text-xs text-slate-500">Gratuites</p></div><div className="rounded-xl bg-purple-50 p-3"><p className="text-2xl font-black text-purple-700">{s.paid_generations}</p><p className="text-xs text-slate-500">Payantes</p></div><div className="rounded-xl bg-blue-50 p-3"><p className="text-2xl font-black text-blue-700">{s.api_generations}</p><p className="text-xs text-slate-500">Developer API</p></div></div><p className="mt-4 text-xs text-slate-500">Points consommés : <b>{s.points_consumed}</b> · Actifs 30 jours : <b>{s.active_users_30d}</b></p></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-black text-slate-900">Modèle de coût</h2><div className="mt-4 space-y-2 text-sm text-slate-600"><p>Audio TTS : <b>${data.cost_model.tts_audio_usd_per_1m}/1M tokens</b></p><p>Texte TTS : <b>${data.cost_model.tts_input_usd_per_1m}/1M tokens</b></p><p>Coût audio estimé : <b>25 tokens/seconde</b></p><p>Valeur moyenne d’un point : <b>{s.point_value_dzd.toFixed(2)} DZD</b></p></div></div></section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-black text-slate-900">Derniers utilisateurs</h2><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs text-slate-500"><th className="p-2">Compte</th><th className="p-2">Inscription</th><th className="p-2">Solde</th><th className="p-2">Voix générées</th></tr></thead><tbody>{data.recent_users.map(u => <tr key={u.id} className="border-b last:border-0"><td className="p-2"><b>{u.full_name || 'Sans nom'}</b><br /><span className="text-xs text-slate-500">{u.email}</span></td><td className="p-2 text-slate-500">{new Date(u.created_at).toLocaleDateString('fr-FR')}</td><td className="p-2 font-bold">{u.credits_balance}</td><td className="p-2">{u.total_generated_audios}</td></tr>)}</tbody></table></div></section>
  </div>;
};
