import React, { useEffect, useState } from 'react';
import { BarChart3, Users, CreditCard, Mic2, ShieldAlert, RefreshCw, X, Mail, Phone, CalendarDays, Clock3, Coins, AudioLines, Loader2, MessageCircle, Send } from 'lucide-react';
import { API_BASE_URL } from '../config/apiBase';
import { getMyAccessToken } from '../services/supabaseClient';

type AdminData = {
  summary: { total_users: number; free_trial_users: number; paid_users: number; active_users_30d: number; generations_total: number; free_generations: number; paid_generations: number; api_generations: number; revenue_dzd: number; points_consumed: number; paid_points_issued: number; point_value_dzd: number; gemini_cost_usd: number; gemini_cost_dzd: number; free_gemini_cost_dzd: number; paid_gemini_cost_dzd: number; average_cost_per_generation_dzd: number; gross_margin_dzd: number; gross_margin_percent: number; usd_to_dzd: number };
  recent_users: Array<{ id: string; email: string; full_name: string | null; phone: string | null; credits_balance: number; total_generated_audios: number; created_at: string }>;
  recent_payments: Array<{ amount_dzd: number; points_credited: number; status: string; gateway: string; created_at: string }>;
  cost_model: Record<string, number>;
};
type FunnelData = { counts: Record<string, number>; campaigns: Array<{ name: string; visitors: number; signup_open: number; accounts: number; onboarding: number }> };
type UserDetail = {
  profile: { id: string; email: string; full_name: string | null; phone: string | null; credits_balance: number; total_generated_audios: number; created_at: string; updated_at: string; onboarding_completed_at: string | null; acquisition_source: string | null; last_sign_in_at: string | null };
  generations: Array<{ id: string; voice_id: string; voice_name: string; text_prompt: string; char_count: number; points_deducted: number; audio_storage_path: string | null; audio_duration_seconds: number | null; latency_ms: number | null; status: string; generation_source: string | null; created_at: string; audio_url: string | null }>;
  transactions: Array<{ id: string; amount_dzd: number; points_credited: number; status: string; gateway: string; created_at: string }>;
  usage_logs: Array<{ operation: string; characters: number; success: boolean; created_at: string }>;
};

const money = (n: number) => `${new Intl.NumberFormat('fr-DZ', { maximumFractionDigits: 2 }).format(n)} DZD`;
const dateTime = (value?: string | null) => value ? new Date(value).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

function buildWaZero(name: string) {
  return 'Bienvenue ' + name + ' sur Sawtify. Nous avons remarque que vous n\'avez pas encore teste la generation vocale, n\'hesitez pas a l\'essayer et a nous dire ce que vous en pensez.';
}
function buildWaZero2(name: string) {
  return 'Bonjour ' + name + ', bienvenue parmi nous. Nous vous invitons a essayer votre premiere generation vocale, votre avis nous interesse beaucoup.';
}
function buildWaZero3(name: string) {
  return 'Bonjour ' + name + ', merci de votre inscription sur Sawtify. Vous n\'avez pas encore effectue de generation, n\'hesitez pas a tester, notre equipe reste disponible en cas de besoin.';
}
function buildWaZero4(name: string) {
  return 'Bonjour ' + name + ', bienvenue chez nous. Vous pouvez tester la generation vocale des maintenant, nous restons a votre disposition pour toute question.';
}
function buildWaOne(name: string) {
  return 'Bonjour ' + name + ', merci pour votre premier essai de generation. Nous serions ravis de connaitre votre avis sur la qualite du resultat.';
}
function buildWaOne2(name: string) {
  return 'Bonjour ' + name + ', nous avons vu que vous avez realise votre premiere generation. Comment s\'est passee votre experience ? Vos retours nous aident a ameliorer le service.';
}
function buildWaOne3(name: string) {
  return 'Bonjour ' + name + ', merci d\'avoir utilise la plateforme. Quel est votre avis sur le resultat de votre premiere generation ?';
}
function buildWaMany(name: string, n: number) {
  return 'Bonjour ' + name + ', nous avons remarque ' + n + ' generations realisees. Merci pour votre confiance, votre avis sur la qualite du service nous interesse.';
}
function buildWaMany2(name: string, n: number) {
  return 'Bonjour ' + name + ', vous avez atteint ' + n + ' generations vocales. Nous serions heureux d\'avoir votre retour sur votre experience.';
}
function buildWaMany3(name: string, n: number) {
  return 'Bonjour ' + name + ', merci pour votre activite reguliere (' + n + ' generations). Avez-vous des suggestions d\'amelioration ?';
}

const waTemplates: Record<'zero' | 'one' | 'many', Array<(name: string, n: number) => string>> = {
  zero: [buildWaZero, buildWaZero2, buildWaZero3, buildWaZero4],
  one: [buildWaOne, buildWaOne2, buildWaOne3],
  many: [buildWaMany, buildWaMany2, buildWaMany3],
};

const waCategory = (n: number): 'zero' | 'one' | 'many' => n === 0 ? 'zero' : n === 1 ? 'one' : 'many';

const waPhrases = (u: { full_name: string | null; total_generated_audios: number }) => {
  const n = u.total_generated_audios;
  const name = u.full_name || '';
  return waTemplates[waCategory(n)].map((tpl) => tpl(name, n));
};

const waAppLink = (phone: string, text: string) => 'https://wa.me/213' + phone.replace(/^0/, '') + '?text=' + encodeURIComponent(text);
const waWebLink = (phone: string, text: string) => 'https://web.whatsapp.com/send?phone=213' + phone.replace(/^0/, '') + '&text=' + encodeURIComponent(text);

export const AdminPage: React.FC = () => {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [waUser, setWaUser] = useState<AdminData['recent_users'][number] | null>(null);
  const [waSelectedIndex, setWaSelectedIndex] = useState(0);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const token = await getMyAccessToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${API_BASE_URL}/api/admin/overview`, { headers });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Accès Admin refusé.');
      setData(body); setLastUpdated(new Date());
      const funnelRes = await fetch(`${API_BASE_URL}/api/admin/marketing-funnel`, { headers });
      if (funnelRes.ok) setFunnel(await funnelRes.json());
    } catch (e: any) { setError(e?.message || 'Impossible de charger le dashboard.'); }
    finally { setLoading(false); }
  };

  const openUserDetail = async (userId: string) => {
    setDetailLoading(true); setDetailError(''); setSelectedUser(null);
    try {
      const token = await getMyAccessToken();
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Impossible de charger cet utilisateur.');
      setSelectedUser(body);
    } catch (e: any) { setDetailError(e?.message || 'Impossible de charger le détail utilisateur.'); }
    finally { setDetailLoading(false); }
  };

  const openWaPicker = (u: AdminData['recent_users'][number]) => {
    setWaUser(u);
    setWaSelectedIndex(0);
  };

  const openWhatsappApp = () => {
    if (!waUser || !waUser.phone) return;
    const url = waAppLink(waUser.phone, waSelectedText);
    window.open(url, '_blank', 'noopener,noreferrer');
    setWaUser(null);
  };

  const openWhatsappWeb = () => {
    if (!waUser || !waUser.phone) return;
    const url = waWebLink(waUser.phone, waSelectedText);
    window.open(url, '_blank', 'noopener,noreferrer');
    setWaUser(null);
  };

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setSelectedUser(null);
      setWaUser(null);
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, []);

  if (loading) return <div className="rounded-3xl bg-white p-10 text-center text-slate-500">Chargement du dashboard sécurisé…</div>;
  if (error) return <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-700"><ShieldAlert className="mx-auto mb-3 h-8 w-8" /><p className="font-bold">{error}</p><button onClick={load} className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">Réessayer</button></div>;
  if (!data) return null;
  const s = data.summary;
  const funnelLabels: Record<string, string> = { landing_view: 'Visiteurs landing', landing_90_percent: 'Landing 90%', signup_open: 'Inscription ouverte', google_signup_click: 'Clic Google', oauth_return: 'Retour Google', account_created: 'Compte créé', onboarding_completed: 'Onboarding terminé' };
  const cards = [['Comptes', s.total_users, 'Tous les inscrits', Users], ['Free trial', s.free_trial_users, 'Aucun paiement confirmé', BarChart3], ['Clients payants', s.paid_users, 'Au moins une recharge', CreditCard], ['Générations', s.generations_total, 'Toutes origines', Mic2]];
  const waPhraseList = waUser ? waPhrases(waUser) : [];
  const waSelectedText = waPhraseList[waSelectedIndex] || '';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[.18em] text-purple-600">Espace propriétaire · Live</p>
          <h1 className="mt-1 text-3xl font-black text-slate-900">Dashboard Sawtify</h1>
          <p className="mt-1 text-sm text-slate-500">
            Utilisateurs, activité, paiements et marge estimée.
            {lastUpdated && <span className="ml-2 text-emerald-600">Actualisé à {lastUpdated.toLocaleTimeString('fr-FR')}</span>}
          </p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700">
          <RefreshCw className="h-4 w-4" />
          Actualiser
        </button>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, detail, Icon]: any) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5">
            <Icon className="h-5 w-5 text-purple-600" />
            <p className="mt-4 text-xs font-bold text-slate-500">{label}</p>
            <p className="mt-1 text-3xl font-black text-slate-900">{value}</p>
            <p className="mt-1 text-xs text-slate-400">{detail}</p>
          </div>
        ))}
      </section>

      {funnel && (
        <section className="rounded-3xl border border-purple-200 bg-purple-50 p-5 sm:p-6">
          <h2 className="text-xl font-black text-slate-900">Funnel publicitaire live</h2>
          <p className="mt-1 text-sm text-slate-500">Visiteurs uniques, abandons et conversions sur 30 jours.</p>
          <div className="mt-4 grid gap-2 md:grid-cols-7">
            {Object.entries(funnel.counts).map(([key, value]) => (
              <div key={key} className="rounded-xl bg-white p-3">
                <p className="text-[11px] font-bold text-slate-500">{funnelLabels[key]}</p>
                <p className="mt-2 text-2xl font-black text-purple-700">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs text-slate-500">
                  <th className="p-2">Campagne</th>
                  <th className="p-2">Visiteurs</th>
                  <th className="p-2">Inscription</th>
                  <th className="p-2">Comptes</th>
                  <th className="p-2">Onboarding</th>
                </tr>
              </thead>
              <tbody>
                {funnel.campaigns.map((campaign) => (
                  <tr key={campaign.name} className="border-b last:border-0">
                    <td className="p-2 font-bold">{campaign.name}</td>
                    <td className="p-2">{campaign.visitors}</td>
                    <td className="p-2">{campaign.signup_open}</td>
                    <td className="p-2 font-bold text-purple-700">{campaign.accounts}</td>
                    <td className="p-2">{campaign.onboarding}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-black text-slate-900">Sessions utilisateurs</h2>
            <p className="mt-1 text-xs text-slate-500">Clique sur une session pour voir ses informations, ses générations et écouter les audios.</p>
          </div>
          <Users className="h-5 w-5 text-purple-600" />
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs text-slate-500">
                <th className="p-2">Compte</th>
                <th className="p-2">Numéro</th>
                <th className="p-2">Inscription</th>
                <th className="p-2">Solde</th>
                <th className="p-2">Voix générées</th>
                <th className="p-2"></th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {data.recent_users.map(u => (
                <tr
                  key={u.id}
                  tabIndex={0}
                  onClick={() => void openUserDetail(u.id)}
                  onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') void openUserDetail(u.id); }}
                  className="cursor-pointer border-b transition hover:bg-purple-50 focus:bg-purple-50 last:border-0"
                >
                  <td className="p-2">
                    <b>{u.full_name || 'Sans nom'}</b>
                    <br />
                    <span className="text-xs text-slate-500">{u.email}</span>
                  </td>
                  <td className="p-2 font-bold text-slate-700">{u.phone || '—'}</td>
                  <td className="p-2 text-slate-500">{new Date(u.created_at).toLocaleDateString('fr-FR')}</td>
                  <td className="p-2 font-bold">{u.credits_balance}</td>
                  <td className="p-2">{u.total_generated_audios}</td>
                  <td className="p-2">
                    {u.phone && (
                      <button
                        onClick={(e) => { e.stopPropagation(); openWaPicker(u); }}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-2 py-1 text-xs font-bold text-white hover:bg-emerald-600"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        WhatsApp
                      </button>
                    )}
                  </td>
                  <td className="p-2 text-right text-xs font-bold text-purple-700">Voir détail →</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {detailLoading && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/30">
          <div className="rounded-2xl bg-white px-6 py-5 text-sm font-bold text-slate-700 shadow-xl">
            <Loader2 className="mr-2 inline h-5 w-5 animate-spin text-purple-600" />
            Chargement de la session…
          </div>
        </div>
      )}

      {detailError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{detailError}</div>
      )}

      {waUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setWaUser(null); }}
        >
          <div className="flex w-full max-w-lg max-h-[85vh] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 p-5">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[.18em] text-emerald-600">Message WhatsApp</p>
                <h2 className="mt-1 truncate text-lg font-black text-slate-900">{waUser.full_name || 'Sans nom'}</h2>
                <p className="text-sm text-slate-500">{waUser.phone}</p>
              </div>
              <button onClick={() => setWaUser(null)} className="shrink-0 rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="Fermer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto p-5">
              {waPhraseList.map((phrase, i) => (
                <button
                  key={i}
                  onClick={() => setWaSelectedIndex(i)}
                  className={
                    i === waSelectedIndex
                      ? 'w-full rounded-xl border border-emerald-500 bg-emerald-50 p-3 text-left text-sm leading-relaxed text-slate-900 transition'
                      : 'w-full rounded-xl border border-slate-200 bg-white p-3 text-left text-sm leading-relaxed text-slate-600 transition hover:border-slate-300'
                  }
                >
                  {phrase}
                </button>
              ))}
            </div>

            <div className="flex shrink-0 flex-col gap-2 border-t border-slate-200 p-5 sm:flex-row">
              <button
                onClick={openWhatsappApp}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-600"
              >
                <Send className="h-4 w-4" />
                WhatsApp
              </button>
              <button
                onClick={openWhatsappWeb}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-500 px-4 py-2 text-sm font-bold text-emerald-600 hover:bg-emerald-50"
              >
                <Send className="h-4 w-4" />
                WhatsApp Web
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedUser && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm sm:p-8"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedUser(null); }}
        >
          <div className="flex w-full max-w-5xl max-h-[90vh] flex-col overflow-hidden rounded-3xl bg-slate-50 shadow-2xl">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-white p-5 sm:p-6">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[.18em] text-purple-600">Détail session utilisateur</p>
                <h2 className="mt-1 truncate text-2xl font-black text-slate-900">{selectedUser.profile.full_name || 'Sans nom'}</h2>
                <p className="truncate text-sm text-slate-500">{selectedUser.profile.email}</p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="shrink-0 rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="Fermer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[[Mail, 'Email', selectedUser.profile.email], [Phone, 'Téléphone', selectedUser.profile.phone || '—'], [Coins, 'Points', selectedUser.profile.credits_balance], [AudioLines, 'Générations', selectedUser.generations.length]].map(([Icon, label, value]: any) => (
                  <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <Icon className="h-4 w-4 text-purple-600" />
                    <p className="mt-3 text-xs font-bold text-slate-500">{label}</p>
                    <p className="mt-1 truncate font-black text-slate-900">{value}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 sm:grid-cols-3">
                <p><CalendarDays className="mr-2 inline h-4 w-4 text-purple-600" />Créé : <b>{dateTime(selectedUser.profile.created_at)}</b></p>
                <p><Clock3 className="mr-2 inline h-4 w-4 text-purple-600" />Dernière connexion
