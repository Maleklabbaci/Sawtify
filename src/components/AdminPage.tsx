import React, { useEffect, useState } from 'react';
import { BarChart3, Users, CreditCard, Mic2, ShieldAlert, RefreshCw } from 'lucide-react';
import { API_BASE_URL } from '../config/apiBase';
import { getMyAccessToken } from '../services/supabaseClient';

type AdminData = {
  summary: { total_users: number; free_trial_users: number; paid_users: number; active_users_30d: number; generations_total: number; free_generations: number; paid_generations: number; api_generations: number; revenue_dzd: number; points_consumed: number; paid_points_issued: number; point_value_dzd: number; gemini_cost_usd: number; gemini_cost_dzd: number; free_gemini_cost_dzd: number; paid_gemini_cost_dzd: number; average_cost_per_generation_dzd: number; gross_margin_dzd: number; gross_margin_percent: number; usd_to_dzd: number };
  recent_users: Array<{ id: string; email: string; full_name: string | null; phone: string | null; credits_balance: number; total_generated_audios: number; created_at: string }>;
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
    ['Comptes', s.total_users, 'Tous les inscrits', Users], ['Free trial', s.free_trial_users, 'Aucun paiement confirmé', BarChart3], ['Clients payants', s.paid_users, 'Au moins une recharge', CreditCard], ['Générations', s.generations_total, 'Toutes origines', Mic2],
  ];
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.18em] text-purple-600">Espace propriétaire</p><h1 className="mt-1 text-3xl font-black text-slate-900">Dashboard Sawtify</h1><p className="mt-1 text-sm text-slate-500">Utilisateurs, activité, paiements et marge estimée.</p></div><button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"><RefreshCw className="h-4 w-4" />Actualiser</button></div>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, detail, Icon]: any) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5"><Icon className="h-5 w-5 text-purple-600" /><p className="mt-4 text-xs font-bold text-slate-500">{label}</p><p className="mt-1 text-3xl font-black text-slate-900">{value}</p><p className="mt-1 text-xs text-slate-400">{detail}</p></div>)}</section>
    <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-black text-slate-900">Comprendre la marge</h2><p className="mt-1 text-sm text-slate-500">La marge est l’argent encaissé moins le coût estimé des appels Gemini.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">1 $ = {s.usd_to_dzd} DZD</span></div><div className="mt-5 grid gap-4 md:grid-cols-3"><div className="rounded-2xl bg-emerald-50 p-5"><p className="text-xs font-bold text-emerald-700">1. Argent reçu</p><p className="mt-2 text-2xl font-black text-emerald-900">{money(s.revenue_dzd)}</p><p className="mt-1 text-xs text-emerald-700">{s.paid_points_issued} points vendus</p></div><div className="rounded-2xl bg-rose-50 p-5"><p className="text-xs font-bold text-rose-700">2. Coût IA estimé</p><p className="mt-2 text-2xl font-black text-rose-900">{money(s.gemini_cost_dzd)}</p><p className="mt-1 text-xs text-rose-700">Gratuit : {money(s.free_gemini_cost_dzd)} · Payant : {money(s.paid_gemini_cost_dzd)}</p></div><div className="rounded-2xl bg-purple-50 p-5"><p className="text-xs font-bold text-purple-700">3. Marge brute</p><p className="mt-2 text-2xl font-black text-purple-900">{s.revenue_dzd > 0 ? money(s.gross_margin_dzd) : 'En attente de ventes'}</p><p className="mt-1 text-xs text-purple-700">{s.revenue_dzd > 0 ? `${s.gross_margin_percent.toFixed(1)}% de marge` : 'Impossible de calculer une marge réelle sans paiement'}</p></div></div><div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600"><b>Exemple :</b> si un client paie 500 DZD et que Gemini te coûte 2 DZD pour ses générations, ta marge estimée est <b>498 DZD</b>. Le coût moyen actuel par génération est <b>{money(s.average_cost_per_generation_dzd)}</b>.</div></section>
    <section className="grid gap-6 lg:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-black text-slate-900">D’où viennent les générations ?</h2><div className="mt-4 grid grid-cols-3 gap-3 text-center"><div className="rounded-xl bg-slate-50 p-3"><p className="text-2xl font-black">{s.free_generations}</p><p className="text-xs text-slate-500">Bonus gratuit</p></div><div className="rounded-xl bg-purple-50 p-3"><p className="text-2xl font-black text-purple-700">{s.paid_generations}</p><p className="text-xs text-slate-500">Solde acheté</p></div><div className="rounded-xl bg-blue-50 p-3"><p className="text-2xl font-black text-blue-700">{s.api_generations}</p><p className="text-xs text-slate-500">API Developer</p></div></div><p className="mt-4 text-xs text-slate-500">Points consommés : <b>{s.points_consumed}</b> · Comptes actifs (30 jours) : <b>{s.active_users_30d}</b></p></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-black text-slate-900">Comment le coût est estimé ?</h2><div className="mt-4 space-y-2 text-sm text-slate-600"><p>Audio Gemini : <b>${data.cost_model.tts_audio_usd_per_1m}/1M tokens</b></p><p>Texte envoyé : <b>${data.cost_model.tts_input_usd_per_1m}/1M tokens</b></p><p>Conversion : <b>25 tokens audio par seconde</b></p><p>Le dashboard convertit ensuite les dollars en DZD avec le taux fixe.</p></div></div></section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-black text-slate-900">Derniers utilisateurs</h2><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs text-slate-500"><th className="p-2">Compte</th><th className="p-2">Numéro</th><th className="p-2">Inscription</th><th className="p-2">Solde</th><th className="p-2">Voix générées</th></tr></thead><tbody>{data.recent_users.map(u => <tr key={u.id} className="border-b last:border-0"><td className="p-2"><b>{u.full_name || 'Sans nom'}</b><br /><span className="text-xs text-slate-500">{u.email}</span></td><td className="p-2 font-bold text-slate-700">{u.phone || '—'}</td><td className="p-2 text-slate-500">{new Date(u.created_at).toLocaleDateString('fr-FR')}</td><td className="p-2 font-bold">{u.credits_balance}</td><td className="p-2">{u.total_generated_audios}</td></tr>)}</tbody></table></div></section>
  </div>;
};
