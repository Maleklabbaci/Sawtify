/**
 * Client des mécaniques de croissance (offre 1ère recharge, cashback, parrainage).
 * Le serveur est la seule source de vérité : ce fichier ne fait que lire/afficher.
 */
import { API_BASE_URL } from '../config/apiBase';
import type { PackOffer } from '../config/growth';

export interface ReferralStatus {
  code: string | null;
  rewardPoints: number;
  requiredGenerations: number;
  friendStarterPoints: number;
  invitedCount: number;
  rewardedCount: number;
  pendingCount: number;
  earnedPoints: number;
  asFriend: null | { status: 'pending' | 'rewarded'; done: number; required: number; rewardPoints: number };
}

export interface GrowthStatus {
  enabled: true;
  serverNow: string;
  balance: number | null;
  hasPaid: boolean;
  firstRecharge: { eligible: boolean; started: boolean; flashEndsAt: string | null; entryEndsAt: string | null };
  packOffers: Record<string, PackOffer>;
  cashback: { percent: number; expiresAt: string } | null;
  referral: ReferralStatus;
}

async function authedRequest(path: string, init: RequestInit = {}): Promise<Response | null> {
  try {
    const { getMyAccessToken } = await import('./supabaseClient');
    const token = await getMyAccessToken();
    if (!token) return null;
    return await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { ...(init.headers || {}), Authorization: `Bearer ${token}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
    });
  } catch (e) {
    console.warn('[Sawtify][growth] requête impossible:', e);
    return null;
  }
}

function asStatus(data: any): GrowthStatus | null {
  return data && data.success && data.enabled === true ? (data as GrowthStatus) : null;
}

/** null = fonctionnalité désactivée côté serveur (migration SQL absente) ou hors-ligne. */
export async function fetchGrowthStatus(): Promise<GrowthStatus | null> {
  const res = await authedRequest('/api/growth/status');
  if (!res || !res.ok) return null;
  return asStatus(await res.json().catch(() => null));
}

/** Pose l'horloge de l'offre « première recharge » (idempotent, décidé par le serveur). */
export async function startFirstRechargeOffer(): Promise<GrowthStatus | null> {
  const res = await authedRequest('/api/growth/first-offer/start', { method: 'POST' });
  if (!res || !res.ok) return null;
  return asStatus(await res.json().catch(() => null));
}

export interface ReferralClaimResult {
  /** true = le serveur a rendu un verdict définitif (on peut oublier le code). false = réseau/serveur : on réessaiera. */
  definitive: boolean;
  success: boolean;
  reason?: string | null;
  starterPoints?: number;
  requiredGenerations?: number;
  rewardPoints?: number;
}

export async function claimReferral(code: string): Promise<ReferralClaimResult> {
  const res = await authedRequest('/api/referral/claim', { method: 'POST', body: JSON.stringify({ code }) });
  if (!res) return { definitive: false, success: false };
  if (res.status >= 500 || res.status === 401) return { definitive: false, success: false };
  const data = await res.json().catch(() => null);
  if (!data) return { definitive: false, success: false };
  return {
    definitive: true,
    success: data.success === true,
    reason: data.reason ?? null,
    starterPoints: data.starterPoints,
    requiredGenerations: data.requiredGenerations,
    rewardPoints: data.rewardPoints,
  };
}

/* ---------- Lien de parrainage (?ref=CODE) ---------- */
const REF_STORAGE_KEY = 'sawtify_ref_code';
const REF_CODE_PATTERN = /^[A-Z0-9]{4,16}$/;

export function referralLink(code: string): string {
  return `${window.location.origin}/?ref=${encodeURIComponent(code)}`;
}

/** Lit ?ref=CODE dans l'URL, le mémorise (il survit à la redirection Google), nettoie l'URL. */
export function captureReferralFromUrl(): string | null {
  try {
    const url = new URL(window.location.href);
    const raw = (url.searchParams.get('ref') || '').trim().toUpperCase();
    if (!raw) return getPendingReferralCode();
    url.searchParams.delete('ref');
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
    if (!REF_CODE_PATTERN.test(raw)) return getPendingReferralCode();
    localStorage.setItem(REF_STORAGE_KEY, raw);
    return raw;
  } catch {
    return null;
  }
}

export function getPendingReferralCode(): string | null {
  try {
    const code = localStorage.getItem(REF_STORAGE_KEY);
    return code && REF_CODE_PATTERN.test(code) ? code : null;
  } catch {
    return null;
  }
}

export function clearPendingReferralCode(): void {
  try { localStorage.removeItem(REF_STORAGE_KEY); } catch { /* stockage indisponible */ }
}
