import React, { useEffect, useRef, useState } from 'react';
import { BarChart3, Users, CreditCard, Mic2, ShieldAlert, RefreshCw, X, Mail, Phone, CalendarDays, Clock3, Coins, AudioLines, Loader2, MessageCircle, Send, ChevronLeft, ChevronRight, Star, Bot } from 'lucide-react';
import { API_BASE_URL } from '../config/apiBase';
import { getMyAccessToken } from '../services/supabaseClient';
import { AGENT_ESTIMATED_COST_PER_MINUTE_DZD, AGENT_PRICING_OFFERS, calculateAgentOfferEconomics } from '../config/agentPricing';

// Origine d'une génération : plateforme web ou connecteur MCP (Claude, ChatGPT, clé API).
const CHANNEL_LABELS: Record<string, { label: string; className: string }> = {
  mcp_claude: { label: 'MCP · Claude', className: 'bg-orange-50 text-orange-700 border-orange-200' },
  mcp_chatgpt: { label: 'MCP · ChatGPT', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  mcp_apikey: { label: 'MCP · clé API', className: 'bg-sky-50 text-sky-700 border-sky-200' },
  mcp_other: { label: 'MCP · autre', className: 'bg-slate-50 text-slate-700 border-slate-200' },
};

type AdminData = {
  summary: {
    total_users: number; free_trial_users: number; paid_users: number; active_users_30d: number;
    generations_total: number; free_generations: number; paid_generations: number; api_generations: number;
    mcp_generations?: number; mcp_claude_generations?: number; mcp_chatgpt_generations?: number; mcp_other_generations?: number;
    revenue_dzd: number; points_consumed: number; paid_points_issued: number; point_value_dzd: number;
    voice_calls: number; voice_characters: number; voice_cost_usd: number; voice_cost_dzd: number;
    average_voice_cost_per_call_dzd: number; voice_gross_margin_dzd: number; voice_gross_margin_percent: number; usd_to_dzd: number;
  };
  recent_users: Array<{ id: string; email: string; full_name: string | null; phone: string | null; credits_balance: number; total_generated_audios: number; created_at: string; voice_calls: number; voice_characters: number; voice_cost_usd: number; voice_cost_dzd: number; avg_rating: number | null; ratings_count: number }>;
  recent_payments: Array<{ amount_dzd: number; points_credited: number; status: string; gateway: string; created_at: string }>;
  agent_sawtify?: {
    data_available?: boolean;
    paid_transactions: number;
    pending_transactions?: number;
    failed_transactions?: number;
    pending_amount_dzd?: number;
    failed_amount_dzd?: number;
    active_subscribers: number;
    wallets_total?: number;
    wallets_with_balance?: number;
    revenue_dzd: number;
    subscription_revenue_dzd?: number;
    topup_revenue_dzd?: number;
    minutes_sold: number;
    subscription_minutes_sold?: number;
    topup_minutes_sold?: number;
    remaining_plan_seconds?: number;
    remaining_topup_seconds?: number;
    remaining_seconds?: number;
    stores_total?: number;
    active_stores?: number;
    orders_total?: number;
    open_orders?: number;
    usage_events?: number;
    consumed_seconds?: number;
    estimated_usage_cost_dzd?: number;
    estimated_margin_after_usage_dzd?: number;
    estimated_cost_per_minute_dzd: number;
    estimated_cost_dzd: number;
    gross_margin_dzd: number;
    gross_margin_percent: number;
    payments?: Array<{ invoice_id: string | null; user_id: string; user_email: string | null; offer_id: string; offer_kind: 'subscription' | 'topup'; offer_name: string; minutes: number; amount_dzd: number; status: string; created_at: string; paid_at: string | null }>;
    wallets?: Array<{ user_id: string; user_email: string | null; plan_id: string | null; plan_active: boolean; plan_expires_at: string | null; plan_seconds_remaining: number; topup_seconds_remaining: number; remaining_seconds: number; updated_at: string }>;
    usage_history?: Array<{ id: string; owner_user_id: string; user_email: string | null; store_slug: string; input_characters: number; output_characters: number; billable_seconds: number; plan_seconds_used: number; topup_seconds_used: number; remaining_seconds_after: number; created_at: string }>;
    stores?: Array<{ id: string; owner_user_id: string; user_email: string | null; slug: string; is_active: boolean; updated_at: string }>;
    orders?: Array<{ id: string; owner_user_id: string; user_email: string | null; store_id: string; store_slug: string | null; customer_name: string; phone: string; wilaya: string; product_name: string; size: string; quantity: number; amount_dzd: number | string; status: 'new' | 'confirmed' | 'delivered'; request_type?: 'order' | 'appointment' | 'quote' | 'reservation' | 'room_service'; details?: string; preferred_at?: string | null; preferred_until?: string | null; created_at: string }>;
  };
};
type FunnelData = { counts: Record<string, number>; campaigns: Array<{ name: string; visitors: number; signup_open: number; accounts: number; onboarding: number }> };
type UserDetail = {
  profile: { id: string; email: string; full_name: string | null; phone: string | null; credits_balance: number; total_generated_audios: number; created_at: string; updated_at: string; onboarding_completed_at: string | null; acquisition_source: string | null; last_sign_in_at: string | null };
  generations: Array<{ id: string; voice_id: string; voice_name: string; text_prompt: string; char_count: number; points_deducted: number; audio_storage_path: string | null; audio_duration_seconds: number | null; latency_ms: number | null; status: string; generation_source: string | null; generation_channel?: string | null; rating: number | null; created_at: string; audio_url: string | null }>;
  transactions: Array<{ id: string; amount_dzd: number; points_credited: number; status: string; gateway: string; created_at: string }>;
  usage_logs: Array<{ operation: string; characters: number; success: boolean; metadata?: { cost_usd?: number }; created_at: string }>;
  usage_summary?: { calls: number; characters: number; cost_usd: number; cost_dzd: number };
};

const money = (n: number) => `${new Intl.NumberFormat('fr-DZ', { maximumFractionDigits: 2 }).format(n)} DZD`;
const dateTime = (value?: string | null, dateOnly = false) => value ? new Date(value).toLocaleString('fr-FR', dateOnly ? { dateStyle: 'medium' } : { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const usd = (n: number) => `$${Number(n || 0).toFixed(6)}`;
const integer = (n: number) => Number(n || 0).toLocaleString('fr-FR');
const agentMinutesFromSeconds = (seconds: number) => `${new Intl.NumberFormat('fr-DZ', { maximumFractionDigits: 1 }).format(Math.max(0, Number(seconds) || 0) / 60)} min`;

const StarsDisplay: React.FC<{ rating: number | null; size?: string }> = ({ rating, size = 'h-3.5 w-3.5' }) => {
  if (!rating) return <span className="text-xs text-slate-400">—</span>;
  const rounded = Math.round(rating);
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={size} style={{ color: n <= rounded ? '#f59e0b' : '#e2e8f0' }} fill={n <= rounded ? '#f59e0b' : 'none'} />
      ))}
    </span>
  );
};

const waZero1 = (name: string) => 'مرحبا بك ' + name + ' في Sawtify. لاحظنا أنك لم تجرب بعد ميزة توليد الصوت، لا تتردد في تجربتها الآن وأخبرنا برأيك في النتيجة.';
const waZero2 = (name: string) => 'أهلا وسهلا ' + name + '، معك فريق Sawtify. مرحبا بك من جديد في المنصة، ندعوك لتجربة أول توليد صوتي، وسنكون سعداء بمعرفة انطباعك بعد ذلك.';
const waZero3 = (name: string) => 'مرحبا ' + name + '، معك فريق Sawtify. شكرا على تسجيلك، لم تقم بعد بأي عملية توليد، فلا تتردد في التجربة، ونحن هنا لأي مساعدة تحتاجها.';
const waZero4 = (name: string) => 'سلام ' + name + '، هذه رسالة من فريق Sawtify. ندعوك لتجربة خدمة توليد الصوت متى شئت، وإذا واجهتك أي صعوبة فريقنا مستعد لمساعدتك.';

const waOne1 = (name: string) => 'سلام ' + name + '، معك فريق Sawtify. شكرا لتجربتك الأولى لخدمة التوليد، يسعدنا معرفة رأيك في جودة النتيجة.';
const waOne2 = (name: string) => 'مرحبا ' + name + '، هذه رسالة من فريق Sawtify. لاحظنا أنك أنجزت أول عملية توليد، كيف كانت تجربتك؟ ملاحظاتك تهمنا لتحسين الخدمة.';
const waOne3 = (name: string) => 'أهلا ' + name + '، معك فريق Sawtify. شكرا على استعمالك للمنصة، نحب نعرفو رأيك في نتيجة أول توليد قمت به.';

const waMany1 = (name: string, n: number) => 'سلام ' + name + '، معك فريق Sawtify. لاحظنا أنك أنجزت ' + n + ' عملية توليد، نشكرك على ثقتك، ونود معرفة رأيك في جودة الخدمة لحد الآن.';
const waMany2 = (name: string, n: number) => 'مرحبا ' + name + '، هذه رسالة من فريق Sawtify. وصلت إلى ' + n + ' عملية توليد صوت، يسعدنا الاستماع لملاحظاتك حول تجربتك معنا.';
const waMany3 = (name: string, n: number) => 'أهلا ' + name + '، معك فريق Sawtify. نشكرك على نشاطك المستمر (' + n + ' عملية توليد)، هل هناك أي تحسينات تودون اقتراحها؟';

const waTemplates: Record<'zero' | 'one' | 'many', Array<(name: string, n: number) => string>> = {
  zero: [waZero1, waZero2, waZero3, waZero4],
  one: [waOne1, waOne2, waOne3],
  many: [waMany1, waMany2, waMany3],
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
  const [adminView, setAdminView] = useState<'voices' | 'agent'>('voices');
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
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [agentPaymentsPage, setAgentPaymentsPage] = useState(1);
  const [agentWalletsPage, setAgentWalletsPage] = useState(1);
  const [agentUsagePage, setAgentUsagePage] = useState(1);
  const [agentStoresPage, setAgentStoresPage] = useState(1);
  const [agentOrdersPage, setAgentOrdersPage] = useState(1);
  const PAGE_SIZE = 20;
  const detailPanelRef = useRef<HTMLDivElement | null>(null);

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
    setDetailLoading(true); setDetailError(''); setSelectedUser(null); setSelectedUserId(userId);
    window.requestAnimationFrame(() => detailPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    try {
      const token = await getMyAccessToken();
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Impossible de charger cet utilisateur.');
      setSelectedUser(body);
    } catch (e: any) { setDetailError(e?.message || 'Impossible de charger le détail utilisateur.'); }
    finally { setDetailLoading(false); }
  };

  const closeUserDetail = () => { setSelectedUser(null); setSelectedUserId(null); setDetailError(''); };


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
    // Rechargement automatique toutes les 2h — le bouton "Actualiser" reste
    // toujours immédiat, indépendamment de cet intervalle.
    const timer = window.setInterval(() => void load(), 2 * 60 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setWaUser(null);
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, []);

  if (loading) return <div className="rounded-3xl bg-white p-10 text-center text-slate-500">Chargement du dashboard sécurisé…</div>;
  if (error) return <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-700"><ShieldAlert className="mx-auto mb-3 h-8 w-8" /><p className="font-bold">{error}</p><button onClick={load} className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">Réessayer</button></div>;
  if (!data) return null;
  const s = data.summary;
  const agent = data.agent_sawtify || {
    data_available: false,
    paid_transactions: 0,
    pending_transactions: 0,
    failed_transactions: 0,
    active_subscribers: 0,
    wallets_total: 0,
    wallets_with_balance: 0,
    revenue_dzd: 0,
    subscription_revenue_dzd: 0,
    topup_revenue_dzd: 0,
    minutes_sold: 0,
    subscription_minutes_sold: 0,
    topup_minutes_sold: 0,
    remaining_plan_seconds: 0,
    remaining_topup_seconds: 0,
    remaining_seconds: 0,
    estimated_cost_per_minute_dzd: AGENT_ESTIMATED_COST_PER_MINUTE_DZD,
    estimated_cost_dzd: 0,
    gross_margin_dzd: 0,
    gross_margin_percent: 0,
    payments: [],
    wallets: [],
  };
  const agentPayments = agent.payments || [];
  const agentWallets = agent.wallets || [];
  const agentUsageHistory = agent.usage_history || [];
  const agentStores = agent.stores || [];
  const agentOrders = agent.orders || [];
  const AGENT_PAGE_SIZE = 20;
  const agentPaymentsTotalPages = Math.max(1, Math.ceil(agentPayments.length / AGENT_PAGE_SIZE));
  const agentWalletsTotalPages = Math.max(1, Math.ceil(agentWallets.length / AGENT_PAGE_SIZE));
  const agentUsageTotalPages = Math.max(1, Math.ceil(agentUsageHistory.length / AGENT_PAGE_SIZE));
  const agentStoresTotalPages = Math.max(1, Math.ceil(agentStores.length / AGENT_PAGE_SIZE));
  const agentOrdersTotalPages = Math.max(1, Math.ceil(agentOrders.length / AGENT_PAGE_SIZE));
  const safeAgentPaymentsPage = Math.min(agentPaymentsPage, agentPaymentsTotalPages);
  const safeAgentWalletsPage = Math.min(agentWalletsPage, agentWalletsTotalPages);
  const safeAgentUsagePage = Math.min(agentUsagePage, agentUsageTotalPages);
  const safeAgentStoresPage = Math.min(agentStoresPage, agentStoresTotalPages);
  const safeAgentOrdersPage = Math.min(agentOrdersPage, agentOrdersTotalPages);
  const pagedAgentPayments = agentPayments.slice((safeAgentPaymentsPage - 1) * AGENT_PAGE_SIZE, safeAgentPaymentsPage * AGENT_PAGE_SIZE);
  const pagedAgentWallets = agentWallets.slice((safeAgentWalletsPage - 1) * AGENT_PAGE_SIZE, safeAgentWalletsPage * AGENT_PAGE_SIZE);
  const pagedAgentUsage = agentUsageHistory.slice((safeAgentUsagePage - 1) * AGENT_PAGE_SIZE, safeAgentUsagePage * AGENT_PAGE_SIZE);
  const pagedAgentStores = agentStores.slice((safeAgentStoresPage - 1) * AGENT_PAGE_SIZE, safeAgentStoresPage * AGENT_PAGE_SIZE);
  const pagedAgentOrders = agentOrders.slice((safeAgentOrdersPage - 1) * AGENT_PAGE_SIZE, safeAgentOrdersPage * AGENT_PAGE_SIZE);
  const flagshipOffer = AGENT_PRICING_OFFERS.find((offer) => offer.id === 'agent_plan_300')!;
  const tenCustomerRevenue = flagshipOffer.priceDzd * 10;
  const tenCustomerMaxCost = flagshipOffer.minutes * AGENT_ESTIMATED_COST_PER_MINUTE_DZD * 10;
  const totalPages = Math.max(1, Math.ceil(data.recent_users.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedUsers = data.recent_users.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const funnelLabels: Record<string, string> = { landing_view: 'Visiteurs landing', landing_90_percent: 'Landing 90%', signup_open: 'Inscription ouverte', google_signup_click: 'Clic Google', oauth_return: 'Retour Google', account_created: 'Compte créé', onboarding_completed: 'Onboarding terminé' };
  const cards = [['Voix générées', s.generations_total, 'Toutes origines', Mic2], ['Essais gratuits', s.free_generations, 'Générations de découverte', AudioLines], ['Générations payées', s.paid_generations, 'Solde de points', CreditCard], ['Générations API', s.api_generations, 'Accès développeur', BarChart3]];
  const waPhraseList = waUser ? waPhrases(waUser) : [];
  const waSelectedText = waPhraseList[waSelectedIndex] || '';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[.18em] text-purple-600">Espace propriétaire · Suivi séparé</p>
          <h1 className="mt-1 text-3xl font-black text-slate-900">{adminView === 'voices' ? 'Suivi des voix' : 'Suivi Agent IA'}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {adminView === 'voices' ? 'Activité, coûts et marges de la génération vocale.' : 'Ventes, paiements, soldes de minutes, forfaits et marges Agent.'}
            {lastUpdated && <span className="ml-2 text-emerald-600">Actualisé à {lastUpdated.toLocaleTimeString('fr-FR')}</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1" role="group" aria-label="Choisir le suivi Admin">
            <button type="button" onClick={() => setAdminView('voices')} aria-pressed={adminView === 'voices'} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition ${adminView === 'voices' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
              <AudioLines className="h-4 w-4" /> Voix
            </button>
            <button type="button" onClick={() => setAdminView('agent')} aria-pressed={adminView === 'agent'} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition ${adminView === 'agent' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
              <Bot className="h-4 w-4" /> Agent
            </button>
          </div>
          <button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700">
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </button>
        </div>
      </div>

      {adminView === 'voices' && (
        <>
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

      <section className="rounded-3xl border border-violet-200 bg-violet-50/60 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-900">Connecteur MCP — générations par assistant IA</h2>
            <p className="mt-1 text-sm text-slate-600">Voix générées depuis Claude, ChatGPT ou un client MCP (clé API). Nécessite supabase/mcp_generation_channel.sql.</p>
          </div>
          <div className="rounded-2xl border border-violet-200 bg-white px-4 py-2 text-right">
            <p className="text-[11px] font-bold uppercase text-violet-600">Total MCP</p>
            <p className="text-2xl font-black text-slate-900">{s.mcp_generations ?? 0}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {([['mcp_claude', s.mcp_claude_generations], ['mcp_chatgpt', s.mcp_chatgpt_generations], ['mcp_other', s.mcp_other_generations]] as Array<[string, number | undefined]>).map(([key, count]) => (
            <div key={key} className="rounded-2xl border border-slate-200 bg-white p-4">
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold ${CHANNEL_LABELS[key].className}`}>{key === 'mcp_other' ? 'MCP · clé API / autre' : CHANNEL_LABELS[key].label}</span>
              <p className="mt-3 text-3xl font-black text-slate-900">{count ?? 0}</p>
              <p className="mt-1 text-xs text-slate-400">générations</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-900">Coûts de génération — suivi estimé</h2>
            <p className="mt-1 text-sm text-slate-600">Estimation basée sur l’activité enregistrée · taux de conversion : 1 USD = {s.usd_to_dzd} DZD.</p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-amber-800">{s.voice_calls} opérations vocales suivies</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Coût total des voix estimé', usd(s.voice_cost_usd), money(s.voice_cost_dzd)],
            ['Générations vocales', integer(s.generations_total), `${integer(s.voice_calls)} opérations vocales suivies`],
            ['Coût moyen / opération vocale', money(s.average_voice_cost_per_call_dzd), 'moyenne estimée'],
            ['Marge brute voix estimée', money(s.voice_gross_margin_dzd), `${s.voice_gross_margin_percent.toFixed(1)} % des revenus`],
          ].map(([label, value, detail]) => (
            <div key={label} className="rounded-2xl border border-amber-100 bg-white p-4">
              <p className="text-[11px] font-bold text-slate-500">{label}</p>
              <p className="mt-2 truncate text-lg font-black text-slate-900">{value}</p>
              <p className="mt-1 text-xs text-slate-500">{detail}</p>
            </div>
          ))}
        </div>
      </section>
        </>
      )}

      {adminView === 'agent' && (
      <section className="rounded-3xl border border-violet-200 bg-violet-50/50 p-5 sm:p-6">
        {agent.data_available === false && <div role="status" className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Les tables de suivi Agent ne sont pas disponibles. Vérifie que la migration <code>supabase/agent_sawtify_pricing.sql</code> a été appliquée dans Supabase.</div>}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-900">Dashboard Agent · suivi complet</h2>
            <p className="mt-1 text-sm text-slate-600">Paiements, boutiques persistantes, demandes, secondes estimées débitées, portefeuilles et marges.</p>
            <p className="mt-1 text-xs text-slate-500">Coût prudent estimé : {money(agent.estimated_cost_per_minute_dzd || AGENT_ESTIMATED_COST_PER_MINUTE_DZD)} par minute vendue.</p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-violet-800">{integer(agent.active_subscribers)} forfaits actifs</span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['Revenus encaissés', money(agent.revenue_dzd), `${integer(agent.paid_transactions)} payés · ${integer(agent.pending_transactions || 0)} en attente · ${integer(agent.failed_transactions || 0)} échoués`],
            ['Revenus des forfaits', money(agent.subscription_revenue_dzd || 0), `${money(agent.topup_revenue_dzd || 0)} de recharges vendues`],
            ['Minutes vendues', integer(agent.minutes_sold), `${integer(agent.subscription_minutes_sold || 0)} forfaits · ${integer(agent.topup_minutes_sold || 0)} recharges`],
            ['Minutes restantes en soldes', agentMinutesFromSeconds(agent.remaining_seconds || 0), `${integer(agent.wallets_with_balance || 0)} portefeuilles avec solde`],
            ['Portefeuilles Agent', integer(agent.wallets_total || 0), `${integer(agent.active_subscribers)} forfaits encore actifs`],
            ['Boutiques persistantes', integer(agent.stores_total || 0), `${integer(agent.active_stores || 0)} actives · ${integer(agent.orders_total || 0)} demandes enregistrées`],
            ['Paiements en attente', money(agent.pending_amount_dzd || 0), `${integer(agent.pending_transactions || 0)} à vérifier · ${money(agent.failed_amount_dzd || 0)} échoués (${integer(agent.failed_transactions || 0)})`],
            ['Secondes estimées débitées', agentMinutesFromSeconds(agent.consumed_seconds || 0), `${integer(agent.usage_events || 0)} échanges suivis`],
            ['Coût estimé des usages suivis', money(agent.estimated_usage_cost_dzd || 0), `coût estimé au tarif ${money(agent.estimated_cost_per_minute_dzd || AGENT_ESTIMATED_COST_PER_MINUTE_DZD)}/min`],
            ['Coût maximum estimé', money(agent.estimated_cost_dzd), 'hypothèse : toutes les minutes vendues sont consommées'],
            ['Marge brute estimée', money(agent.gross_margin_dzd), `${Number(agent.gross_margin_percent || 0).toFixed(2)} % des revenus encaissés`],
            ['Marge après usages suivis', money(agent.estimated_margin_after_usage_dzd || 0), 'revenus encaissés moins coût estimé des usages enregistrés'],
          ].map(([label, value, detail]) => (
            <div key={label} className="rounded-2xl border border-violet-100 bg-white p-4">
              <p className="text-[11px] font-bold text-slate-500">{label}</p>
              <p className="mt-2 truncate text-lg font-black text-slate-900">{value}</p>
              <p className="mt-1 text-xs leading-4 text-slate-500">{detail}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 overflow-x-auto rounded-2xl border border-violet-100 bg-white">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead><tr className="border-b border-violet-100 text-[11px] text-slate-500"><th className="p-3">Offre</th><th className="p-3">Minutes</th><th className="p-3">Prix</th><th className="p-3">Coût estimé</th><th className="p-3">Marge brute</th><th className="p-3">Marge %</th><th className="p-3">Prix / min</th></tr></thead>
            <tbody>
              {AGENT_PRICING_OFFERS.map((offer) => {
                const economics = calculateAgentOfferEconomics(offer);
                const offerTitle = `${offer.nameFr}${offer.kind === 'subscription' ? ' / mois' : ''}`;
                return <tr key={offer.id} className="border-b border-slate-100 last:border-0"><td className="p-3 font-bold text-slate-800">{offerTitle}</td><td className="p-3">{integer(offer.minutes)}</td><td className="p-3 font-bold">{money(offer.priceDzd)}</td><td className="p-3">{money(economics.estimatedCostDzd)}</td><td className="p-3 font-black text-emerald-700">{money(economics.grossMarginDzd)}</td><td className="p-3 font-bold text-emerald-700">{economics.grossMarginPercent.toFixed(2)} %</td><td className="p-3">{money(economics.resalePricePerMinuteDzd)}</td></tr>;
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-5 overflow-x-auto rounded-2xl border border-violet-100 bg-white">
          <div className="border-b border-violet-100 px-4 py-3"><h3 className="text-sm font-black text-slate-900">Historique des achats Agent</h3><p className="mt-1 text-[10px] text-slate-500">Toutes les factures enregistrées · {integer(agentPayments.length)} au total.</p></div>
          {agentPayments.length ? (
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead><tr className="border-b border-slate-100 text-[10px] text-slate-500"><th className="p-3">Client</th><th className="p-3">Offre</th><th className="p-3">Minutes</th><th className="p-3">Montant</th><th className="p-3">Statut</th><th className="p-3">Date</th></tr></thead>
              <tbody>{pagedAgentPayments.map((payment) => <tr key={`${payment.invoice_id || payment.offer_id}-${payment.created_at}`} className="border-b border-slate-100 last:border-0"><td className="p-3 font-semibold text-slate-700">{payment.user_email || payment.user_id.slice(0, 8)}</td><td className="p-3 font-bold text-slate-800">{payment.offer_name}</td><td className="p-3">{integer(payment.minutes)}</td><td className="p-3 font-bold">{money(Number(payment.amount_dzd))}</td><td className="p-3"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${payment.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : payment.status === 'failed' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>{payment.status === 'completed' ? 'Payé' : payment.status === 'failed' ? 'Échoué' : 'En attente'}</span></td><td className="p-3 text-slate-500">{dateTime(payment.created_at)}</td></tr>)}</tbody>
            </table>
          ) : <p className="px-4 py-6 text-center text-xs text-slate-500">Aucun achat Agent enregistré pour le moment.</p>}
        </div>
        {agentPayments.length > AGENT_PAGE_SIZE && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">{(safeAgentPaymentsPage - 1) * AGENT_PAGE_SIZE + 1}–{Math.min(safeAgentPaymentsPage * AGENT_PAGE_SIZE, agentPayments.length)} sur {integer(agentPayments.length)} factures</p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setAgentPaymentsPage((value) => Math.max(1, value - 1))} disabled={safeAgentPaymentsPage <= 1} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-40"><ChevronLeft className="h-3.5 w-3.5" /> Précédent</button>
              <span className="text-xs font-bold text-slate-500">{safeAgentPaymentsPage}/{agentPaymentsTotalPages}</span>
              <button type="button" onClick={() => setAgentPaymentsPage((value) => Math.min(agentPaymentsTotalPages, value + 1))} disabled={safeAgentPaymentsPage >= agentPaymentsTotalPages} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-40">Suivant <ChevronRight className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        )}

        <div className="mt-5 overflow-x-auto rounded-2xl border border-violet-100 bg-white">
          <div className="border-b border-violet-100 px-4 py-3"><h3 className="text-sm font-black text-slate-900">Portefeuilles de minutes</h3><p className="mt-1 text-[10px] text-slate-500">Tous les portefeuilles enregistrés · {integer(agentWallets.length)} au total.</p></div>
          {agentWallets.length ? (
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead><tr className="border-b border-slate-100 text-[10px] text-slate-500"><th className="p-3">Client</th><th className="p-3">Forfait</th><th className="p-3">État</th><th className="p-3">Minutes du forfait</th><th className="p-3">Minutes rechargées</th><th className="p-3">Total restant</th><th className="p-3">Expiration forfait</th><th className="p-3">Mis à jour</th></tr></thead>
              <tbody>{pagedAgentWallets.map((wallet) => {
                const plan = AGENT_PRICING_OFFERS.find((offer) => offer.id === wallet.plan_id);
                return <tr key={wallet.user_id} className="border-b border-slate-100 last:border-0"><td className="p-3 font-semibold text-slate-700">{wallet.user_email || wallet.user_id.slice(0, 8)}</td><td className="p-3 font-bold text-slate-800">{plan?.nameFr || wallet.plan_id || '—'}</td><td className="p-3"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${wallet.plan_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{wallet.plan_active ? 'Actif' : 'Inactif'}</span></td><td className="p-3">{agentMinutesFromSeconds(wallet.plan_seconds_remaining)}</td><td className="p-3">{agentMinutesFromSeconds(wallet.topup_seconds_remaining)}</td><td className="p-3 font-black text-violet-800">{agentMinutesFromSeconds(wallet.remaining_seconds)}</td><td className="p-3 text-slate-500">{dateTime(wallet.plan_expires_at)}</td><td className="p-3 text-slate-500">{dateTime(wallet.updated_at)}</td></tr>;
              })}</tbody>
            </table>
          ) : <p className="px-4 py-6 text-center text-xs text-slate-500">Aucun portefeuille Agent enregistré pour le moment.</p>}
        </div>
        {agentWallets.length > AGENT_PAGE_SIZE && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">{(safeAgentWalletsPage - 1) * AGENT_PAGE_SIZE + 1}–{Math.min(safeAgentWalletsPage * AGENT_PAGE_SIZE, agentWallets.length)} sur {integer(agentWallets.length)} portefeuilles</p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setAgentWalletsPage((value) => Math.max(1, value - 1))} disabled={safeAgentWalletsPage <= 1} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-40"><ChevronLeft className="h-3.5 w-3.5" /> Précédent</button>
              <span className="text-xs font-bold text-slate-500">{safeAgentWalletsPage}/{agentWalletsTotalPages}</span>
              <button type="button" onClick={() => setAgentWalletsPage((value) => Math.min(agentWalletsTotalPages, value + 1))} disabled={safeAgentWalletsPage >= agentWalletsTotalPages} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-40">Suivant <ChevronRight className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        )}

        <div className="mt-5 overflow-x-auto rounded-2xl border border-violet-100 bg-white">
          <div className="border-b border-violet-100 px-4 py-3"><h3 className="text-sm font-black text-slate-900">Boutiques persistantes</h3><p className="mt-1 text-[10px] text-slate-500">{integer(agentStores.length)} boutiques associées à un compte propriétaire.</p></div>
          {agentStores.length ? (
            <table className="w-full min-w-[620px] text-left text-xs">
              <thead><tr className="border-b border-slate-100 text-[10px] text-slate-500"><th className="p-3">Propriétaire</th><th className="p-3">Lien public</th><th className="p-3">État</th><th className="p-3">Mise à jour</th></tr></thead>
              <tbody>{pagedAgentStores.map((store) => <tr key={store.id} className="border-b border-slate-100 last:border-0"><td className="p-3 font-semibold text-slate-700">{store.user_email || store.owner_user_id.slice(0, 8)}</td><td className="p-3 font-bold text-violet-800">/call/{store.slug}</td><td className="p-3"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${store.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{store.is_active ? 'Active' : 'En pause'}</span></td><td className="p-3 text-slate-500">{dateTime(store.updated_at)}</td></tr>)}</tbody>
            </table>
          ) : <p className="px-4 py-6 text-center text-xs text-slate-500">Aucune boutique enregistrée pour le moment.</p>}
        </div>
        {agentStores.length > AGENT_PAGE_SIZE && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">{(safeAgentStoresPage - 1) * AGENT_PAGE_SIZE + 1}–{Math.min(safeAgentStoresPage * AGENT_PAGE_SIZE, agentStores.length)} sur {integer(agentStores.length)} boutiques</p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setAgentStoresPage((value) => Math.max(1, value - 1))} disabled={safeAgentStoresPage <= 1} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-40"><ChevronLeft className="h-3.5 w-3.5" /> Précédent</button>
              <span className="text-xs font-bold text-slate-500">{safeAgentStoresPage}/{agentStoresTotalPages}</span>
              <button type="button" onClick={() => setAgentStoresPage((value) => Math.min(agentStoresTotalPages, value + 1))} disabled={safeAgentStoresPage >= agentStoresTotalPages} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-40">Suivant <ChevronRight className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        )}

        <div className="mt-5 overflow-x-auto rounded-2xl border border-violet-100 bg-white">
          <div className="border-b border-violet-100 px-4 py-3"><h3 className="text-sm font-black text-slate-900">Demandes Agent</h3><p className="mt-1 text-[10px] text-slate-500">{integer(agentOrders.length)} demandes · {integer(agent.open_orders || 0)} nouvelles. Les coordonnées sont visibles dans cet espace Admin sécurisé.</p></div>
          {agentOrders.length ? (
            <table className="w-full min-w-[1180px] text-left text-xs">
              <thead><tr className="border-b border-slate-100 text-[10px] text-slate-500"><th className="p-3">Date</th><th className="p-3">Propriétaire</th><th className="p-3">Boutique</th><th className="p-3">Client</th><th className="p-3">Téléphone / wilaya</th><th className="p-3">Type</th><th className="p-3">Article / prestation</th><th className="p-3">Détails / créneau</th><th className="p-3">Qté</th><th className="p-3">Montant</th><th className="p-3">Statut</th></tr></thead>
              <tbody>{pagedAgentOrders.map((order) => <tr key={order.id} className="border-b border-slate-100 last:border-0"><td className="whitespace-nowrap p-3 text-slate-500">{dateTime(order.created_at)}</td><td className="p-3 font-semibold text-slate-700">{order.user_email || order.owner_user_id.slice(0, 8)}</td><td className="p-3 font-bold text-violet-800">{order.store_slug ? `/call/${order.store_slug}` : order.store_id.slice(0, 8)}</td><td className="p-3 font-semibold text-slate-800">{order.customer_name}</td><td className="p-3"><div className="font-semibold text-slate-700">{order.phone}</div><div className="mt-0.5 text-[10px] text-slate-500">{order.wilaya}</div></td><td className="p-3 text-slate-700">{order.request_type === 'appointment' ? 'Rendez-vous' : order.request_type === 'quote' ? 'Devis' : order.request_type === 'reservation' ? 'Réservation' : order.request_type === 'room_service' ? 'Room service' : 'Commande'}</td><td className="p-3"><div className="font-semibold text-slate-800">{order.product_name}</div><div className="mt-0.5 text-[10px] text-slate-500">{order.size || '—'}</div></td><td className="p-3"><div className="max-w-48 whitespace-pre-wrap text-slate-600">{order.details || '—'}</div><div className="mt-0.5 text-[10px] text-slate-500">{order.preferred_at ? dateTime(order.preferred_at, Boolean(order.preferred_until)) : '—'}</div>{order.preferred_until && <div className="mt-0.5 text-[10px] text-slate-500">Départ : {dateTime(order.preferred_until, true)}</div>}</td><td className="p-3">{integer(order.quantity)}</td><td className="whitespace-nowrap p-3 font-bold">{money(Number(order.amount_dzd) || 0)}</td><td className="p-3"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${order.status === 'new' ? 'bg-amber-50 text-amber-700' : order.status === 'confirmed' ? 'bg-sky-50 text-sky-700' : 'bg-emerald-50 text-emerald-700'}`}>{order.status === 'new' ? 'Nouvelle' : order.status === 'confirmed' ? 'Confirmée' : order.request_type && order.request_type !== 'order' ? 'Terminée' : 'Livrée'}</span></td></tr>)}</tbody>
            </table>
          ) : <p className="px-4 py-6 text-center text-xs text-slate-500">Aucune demande enregistrée pour le moment.</p>}
        </div>
        {agentOrders.length > AGENT_PAGE_SIZE && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">{(safeAgentOrdersPage - 1) * AGENT_PAGE_SIZE + 1}–{Math.min(safeAgentOrdersPage * AGENT_PAGE_SIZE, agentOrders.length)} sur {integer(agentOrders.length)} demandes</p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setAgentOrdersPage((value) => Math.max(1, value - 1))} disabled={safeAgentOrdersPage <= 1} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-40"><ChevronLeft className="h-3.5 w-3.5" /> Précédent</button>
              <span className="text-xs font-bold text-slate-500">{safeAgentOrdersPage}/{agentOrdersTotalPages}</span>
              <button type="button" onClick={() => setAgentOrdersPage((value) => Math.min(agentOrdersTotalPages, value + 1))} disabled={safeAgentOrdersPage >= agentOrdersTotalPages} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-40">Suivant <ChevronRight className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        )}

        <div className="mt-5 overflow-x-auto rounded-2xl border border-violet-100 bg-white">
          <div className="border-b border-violet-100 px-4 py-3"><h3 className="text-sm font-black text-slate-900">Historique des usages estimés</h3><p className="mt-1 text-[10px] text-slate-500">{integer(agentUsageHistory.length)} réponses débitées · aucun texte de conversation n’est conservé.</p></div>
          {agentUsageHistory.length ? (
            <table className="w-full min-w-[840px] text-left text-xs">
              <thead><tr className="border-b border-slate-100 text-[10px] text-slate-500"><th className="p-3">Propriétaire</th><th className="p-3">Boutique</th><th className="p-3">Caractères entrée / sortie</th><th className="p-3">Secondes estimées</th><th className="p-3">Forfait / recharge</th><th className="p-3">Date</th></tr></thead>
              <tbody>{pagedAgentUsage.map((event) => <tr key={event.id} className="border-b border-slate-100 last:border-0"><td className="p-3 font-semibold text-slate-700">{event.user_email || event.owner_user_id.slice(0, 8)}</td><td className="p-3 font-bold text-violet-800">{event.store_slug}</td><td className="p-3">{integer(event.input_characters)} / {integer(event.output_characters)}</td><td className="p-3 font-black">{integer(event.billable_seconds)} s</td><td className="p-3">{integer(event.plan_seconds_used)} s / {integer(event.topup_seconds_used)} s</td><td className="p-3 text-slate-500">{dateTime(event.created_at)}</td></tr>)}</tbody>
            </table>
          ) : <p className="px-4 py-6 text-center text-xs text-slate-500">Aucune consommation enregistrée pour le moment.</p>}
        </div>
        {agentUsageHistory.length > AGENT_PAGE_SIZE && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">{(safeAgentUsagePage - 1) * AGENT_PAGE_SIZE + 1}–{Math.min(safeAgentUsagePage * AGENT_PAGE_SIZE, agentUsageHistory.length)} sur {integer(agentUsageHistory.length)} usages</p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setAgentUsagePage((value) => Math.max(1, value - 1))} disabled={safeAgentUsagePage <= 1} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-40"><ChevronLeft className="h-3.5 w-3.5" /> Précédent</button>
              <span className="text-xs font-bold text-slate-500">{safeAgentUsagePage}/{agentUsageTotalPages}</span>
              <button type="button" onClick={() => setAgentUsagePage((value) => Math.min(agentUsageTotalPages, value + 1))} disabled={safeAgentUsagePage >= agentUsageTotalPages} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-40">Suivant <ChevronRight className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="text-sm font-black text-amber-950">Limite du suivi de consommation</h3>
          <p className="mt-1 text-xs leading-5 text-amber-900">Les secondes débitées sont estimées côté serveur à partir du nombre de caractères échangés. La synthèse vocale de cette démonstration reste dans le navigateur : sa durée réelle n’est pas mesurée. Ces chiffres ne doivent donc pas être interprétés comme la durée réelle d’un appel. Les messages eux-mêmes ne sont pas conservés.</p>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-100 bg-white/80 p-4">
          <div><p className="text-xs font-black uppercase tracking-wide text-violet-700">Scénario · 10 forfaits Business</p><p className="mt-1 text-xs text-slate-600">10 × {money(flagshipOffer.priceDzd)} · {integer(flagshipOffer.minutes * 10)} minutes vendues · coût au maximum consommé : {money(tenCustomerMaxCost)}</p></div>
          <div className="text-end"><p className="text-[10px] font-bold text-slate-500">Marge brute estimée</p><p className="text-xl font-black text-emerald-700">{money(tenCustomerRevenue - tenCustomerMaxCost)}</p></div>
        </div>
        <p className="mt-3 text-[10px] leading-4 text-slate-500">Cette marge est une estimation avant frais SlickPay, fiscalité, support et coûts fixes. Les minutes sont considérées entièrement consommées pour calculer le coût maximum.</p>
      </section>
      )}

      {adminView === 'voices' && funnel && (
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

      {adminView === 'voices' && (
        <>
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
                <th className="p-2">Note moyenne</th>
                <th className="p-2">Coût de génération</th>
                <th className="p-2"></th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {pagedUsers.map(u => (
                <tr
                  key={u.id}
                  tabIndex={0}
                  onClick={() => void openUserDetail(u.id)}
                  onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') void openUserDetail(u.id); }}
                  className={`cursor-pointer border-b transition hover:bg-purple-50 focus:bg-purple-50 last:border-0 ${selectedUserId === u.id ? 'bg-purple-50' : ''}`}
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
                    <StarsDisplay rating={u.avg_rating} />
                    {u.ratings_count > 0 && <div className="mt-0.5 text-[10px] text-slate-400">{u.avg_rating?.toFixed(1)} · {u.ratings_count} avis</div>}
                  </td>
                  <td className="p-2"><b>{money(u.voice_cost_dzd)}</b><br /><span className="text-xs text-slate-500">{u.voice_calls} opérations · {integer(u.voice_characters)} car.</span></td>
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
        {data.recent_users.length > PAGE_SIZE && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, data.recent_users.length)} sur {data.recent_users.length} comptes
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Précédent
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(n => n === 1 || n === totalPages || Math.abs(n - safePage) <= 1)
                .reduce<number[]>((acc, n) => {
                  if (acc.length && n - acc[acc.length - 1] > 1) acc.push(-1);
                  acc.push(n);
                  return acc;
                }, [])
                .map((n, i) => n === -1 ? (
                  <span key={`gap-${i}`} className="px-1 text-xs text-slate-400">…</span>
                ) : (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`min-w-[2rem] rounded-xl px-2.5 py-1.5 text-xs font-bold ${n === safePage ? 'bg-purple-600 text-white' : 'border border-slate-200 text-slate-700 hover:bg-purple-50'}`}
                  >
                    {n}
                  </button>
                ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Suivant
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </section>

      {selectedUserId && (
        <section ref={detailPanelRef} className="scroll-mt-4 rounded-2xl border border-purple-200 bg-white p-5 sm:p-6">
          {detailLoading && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm font-bold text-slate-700">
              <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
              Chargement de la session…
            </div>
          )}

          {!detailLoading && detailError && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{detailError}</div>
          )}

      {selectedUser && !detailLoading && (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[.18em] text-purple-600">Détail session utilisateur</p>
              <h2 className="mt-1 truncate text-2xl font-black text-slate-900">{selectedUser.profile.full_name || 'Sans nom'}</h2>
              <p className="truncate text-sm text-slate-500">{selectedUser.profile.email}</p>
            </div>
            <button onClick={closeUserDetail} className="shrink-0 rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="Fermer">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-5 space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[[Mail, 'Email', selectedUser.profile.email], [Phone, 'Téléphone', selectedUser.profile.phone || '—'], [Coins, 'Points', selectedUser.profile.credits_balance], [AudioLines, 'Générations', selectedUser.generations.length]].map(([Icon, label, value]: any) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <Icon className="h-4 w-4 text-purple-600" />
                  <p className="mt-3 text-xs font-bold text-slate-500">{label}</p>
                  <p className="mt-1 truncate font-black text-slate-900">{value}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 sm:grid-cols-3">
              <p><CalendarDays className="mr-2 inline h-4 w-4 text-purple-600" />Créé : <b>{dateTime(selectedUser.profile.created_at)}</b></p>
              <p><Clock3 className="mr-2 inline h-4 w-4 text-purple-600" />Dernière connexion : <b>{dateTime(selectedUser.profile.last_sign_in_at)}</b></p>
              <p>Onboarding : <b>{dateTime(selectedUser.profile.onboarding_completed_at)}</b></p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="font-black text-slate-900">Générations vocales ({selectedUser.generations.length})</h3>
              <div className="mt-3 space-y-3">
                {selectedUser.generations.length === 0 && <p className="text-sm text-slate-500">Aucune génération enregistrée.</p>}
                {selectedUser.generations.map((generation) => (
                  <div key={generation.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-black text-slate-900">{generation.voice_name || generation.voice_id}</p>
                        <p className="mt-1 text-xs text-slate-500">{dateTime(generation.created_at)} · {generation.status} · {generation.generation_source || 'legacy'}{generation.generation_channel && CHANNEL_LABELS[generation.generation_channel] && <span className={`ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${CHANNEL_LABELS[generation.generation_channel].className}`}>{CHANNEL_LABELS[generation.generation_channel].label}</span>}</p>
                      </div>
                      <div className="shrink-0 text-right text-xs text-slate-500">
                        <p>{Number(generation.audio_duration_seconds || 0).toFixed(2)} s</p>
                        <p>{generation.points_deducted || 0} points</p>
                        <div className="mt-1 flex justify-end"><StarsDisplay rating={generation.rating} /></div>
                      </div>
                    </div>
                    <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm text-slate-600">{generation.text_prompt}</p>
                    {generation.audio_url ? (
                      <audio className="mt-3 h-10 w-full" controls preload="none" src={generation.audio_url}>Ton navigateur ne supporte pas la lecture audio.</audio>
                    ) : (
                      <p className="mt-3 text-xs font-bold text-amber-700">Audio non disponible dans Storage pour cette génération.</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="font-black text-slate-900">Transactions</h3>
                <div className="mt-3 space-y-2 text-sm">
                  {selectedUser.transactions.length === 0 && <p className="text-slate-500">Aucune transaction.</p>}
                  {selectedUser.transactions.map((tx) => (
                    <div key={tx.id} className="flex justify-between gap-3 border-b py-2 last:border-0">
                      <span>{dateTime(tx.created_at)} · {tx.status}</span>
                      <b>{money(Number(tx.amount_dzd || 0))} · +{tx.points_credited || 0} pts</b>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="font-black text-slate-900">Activité enregistrée</h3>
                <p className="mt-2 text-sm text-slate-500">{selectedUser.usage_logs.length} appels enregistrés</p>
                <p className="mt-1 text-sm text-slate-500">{selectedUser.usage_logs.reduce((sum, log) => sum + Number(log.characters || 0), 0).toLocaleString('fr-FR')} caractères traités</p>
                {selectedUser.usage_summary && <>
                  <p className="mt-1 text-sm font-black text-amber-700">{money(selectedUser.usage_summary.cost_dzd)} · {usd(selectedUser.usage_summary.cost_usd)}</p>
                  <p className="mt-1 text-xs text-slate-500">Coût calculé à partir des appels enregistrés.</p>
                </>}
              </div>
            </div>
          </div>
        </>
      )}
        </section>
      )}
        </>
      )}

      {adminView === 'voices' && waUser && (
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

            <div className="flex-1 space-y-2 overflow-y-auto p-5" dir="rtl">
              {waPhraseList.map((phrase, i) => (
                <button
                  key={i}
                  onClick={() => setWaSelectedIndex(i)}
                  className={
                    i === waSelectedIndex
                      ? 'w-full rounded-xl border border-emerald-500 bg-emerald-50 p-3 text-right text-sm leading-relaxed text-slate-900 transition'
                      : 'w-full rounded-xl border border-slate-200 bg-white p-3 text-right text-sm leading-relaxed text-slate-600 transition hover:border-slate-300'
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
    </div>
  );
};
