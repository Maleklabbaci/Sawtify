import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchGrowthStatus, startFirstRechargeOffer, type GrowthStatus } from '../services/growth';
import { OUT_OF_BALANCE_THRESHOLD } from '../config/growth';

export interface CashbackNoticeData {
  percent: number;
  expiresAt: string;
}

export interface GrowthApi {
  /** null = fonctionnalité inactive (migration SQL absente, hors-ligne ou pas connecté). */
  status: GrowthStatus | null;
  /** Horloge SERVEUR estimée : les comptes à rebours ne dépendent pas de l'heure du téléphone. */
  nowMs: () => number;
  refresh: () => Promise<GrowthStatus | null>;
  /**
   * À appeler juste après un paiement : surveille l'arrivée du cashback (le crédit peut
   * arriver par webhook quelques secondes plus tard) puis déclenche la notification.
   * 'previous' = attendre un cashback DIFFÉRENT de l'actuel ; 'any' = tout cashback actif.
   */
  expectCashback: (baseline: 'previous' | 'any') => void;
  cashbackNotice: CashbackNoticeData | null;
  dismissCashbackNotice: () => void;
}

interface UseGrowthOptions {
  isLoggedIn: boolean;
  balance: number;
  /** true quand le solde affiché est fiable (déjà chargé depuis la base). */
  balanceReady: boolean;
  onReferralRewarded?: (kind: 'friend' | 'referrer', points: number) => void;
}

const WATCH_INTERVAL_MS = 3500;
const WATCH_MAX_TRIES = 6;

export function useGrowth({ isLoggedIn, balance, balanceReady, onReferralRewarded }: UseGrowthOptions): GrowthApi {
  const [status, setStatus] = useState<GrowthStatus | null>(null);
  const [cashbackNotice, setCashbackNotice] = useState<CashbackNoticeData | null>(null);

  const statusRef = useRef<GrowthStatus | null>(null);
  const offsetRef = useRef(0);
  const inflightRef = useRef<Promise<GrowthStatus | null> | null>(null);
  const watchRef = useRef<{ baseline: string | null | 'any' } | null>(null);
  const watchTimerRef = useRef<number | null>(null);
  const firstOfferRequestedRef = useRef(false);
  const rewardedCallbackRef = useRef(onReferralRewarded);
  rewardedCallbackRef.current = onReferralRewarded;

  const apply = useCallback((next: GrowthStatus | null): GrowthStatus | null => {
    if (!next) return null;
    offsetRef.current = Date.parse(next.serverNow) - Date.now();
    const prev = statusRef.current;
    statusRef.current = next;
    setStatus(next);

    // Filleul : 3e essai atteint pendant cette session.
    if (prev?.referral.asFriend?.status === 'pending' && next.referral.asFriend?.status === 'rewarded') {
      rewardedCallbackRef.current?.('friend', next.referral.asFriend.rewardPoints);
    }
    // Parrain : des points sont arrivés depuis sa dernière visite (repère mémorisé par navigateur).
    try {
      if (next.referral.code) {
        const key = `sawtify_ref_seen_earned_${next.referral.code}`;
        const seen = localStorage.getItem(key);
        if (seen === null) {
          localStorage.setItem(key, String(next.referral.earnedPoints));
        } else if (next.referral.earnedPoints > Number(seen)) {
          rewardedCallbackRef.current?.('referrer', next.referral.earnedPoints - Number(seen));
          localStorage.setItem(key, String(next.referral.earnedPoints));
        }
      }
    } catch { /* stockage indisponible : pas de notification, sans conséquence */ }

    // Cashback attendu après un paiement.
    const watch = watchRef.current;
    if (watch && next.cashback && (watch.baseline === 'any' || next.cashback.expiresAt !== watch.baseline)) {
      watchRef.current = null;
      setCashbackNotice(next.cashback);
    }
    return next;
  }, []);

  const refresh = useCallback((): Promise<GrowthStatus | null> => {
    if (inflightRef.current) return inflightRef.current;
    const request = fetchGrowthStatus()
      .then(apply)
      .finally(() => { inflightRef.current = null; });
    inflightRef.current = request;
    return request;
  }, [apply]);

  const expectCashback = useCallback((baseline: 'previous' | 'any') => {
    watchRef.current = { baseline: baseline === 'any' ? 'any' : (statusRef.current?.cashback?.expiresAt ?? null) };
    if (watchTimerRef.current) window.clearTimeout(watchTimerRef.current);
    let tries = 0;
    const tick = async () => {
      if (!watchRef.current) return;
      await refresh();
      if (watchRef.current && ++tries < WATCH_MAX_TRIES) {
        watchTimerRef.current = window.setTimeout(tick, WATCH_INTERVAL_MS);
      } else {
        watchRef.current = null;
      }
    };
    void tick();
  }, [refresh]);

  const dismissCashbackNotice = useCallback(() => setCashbackNotice(null), []);

  // Chargement à la connexion / remise à zéro à la déconnexion.
  useEffect(() => {
    if (!isLoggedIn) {
      statusRef.current = null;
      firstOfferRequestedRef.current = false;
      watchRef.current = null;
      setStatus(null);
      setCashbackNotice(null);
      return;
    }
    void refresh();
  }, [isLoggedIn, refresh]);

  useEffect(() => () => { if (watchTimerRef.current) window.clearTimeout(watchTimerRef.current); }, []);

  // Première fin de solde : on demande au serveur de démarrer l'horloge de l'offre (une seule fois).
  useEffect(() => {
    if (!isLoggedIn || !balanceReady || !status || firstOfferRequestedRef.current) return;
    if (status.firstRecharge.eligible && !status.firstRecharge.started && balance < OUT_OF_BALANCE_THRESHOLD) {
      firstOfferRequestedRef.current = true;
      void startFirstRechargeOffer().then((started) => {
        if (started) apply(started);
        else firstOfferRequestedRef.current = false; // échec réseau/409 : on retentera au prochain changement de solde
      });
    }
  }, [isLoggedIn, balanceReady, balance, status, apply]);

  const nowMs = useCallback(() => Date.now() + offsetRef.current, []);

  return { status, nowMs, refresh, expectCashback, cashbackNotice, dismissCashbackNotice };
}

/** Re-rend le composant chaque seconde tant que `active` : sert aux comptes à rebours. */
export function useTicker(active: boolean, intervalMs = 1000): void {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setTick((n) => n + 1), intervalMs);
    return () => window.clearInterval(id);
  }, [active, intervalMs]);
}
