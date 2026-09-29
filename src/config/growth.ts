/**
 * MÉCANIQUES DE CROISSANCE — source de vérité unique.
 *
 * Ce fichier est importé par le serveur (server.ts) ET par le front : les deux
 * parlent donc exactement des mêmes chiffres. Pour changer une offre (pourcentage,
 * durée, pack ciblé, récompense de parrainage…), modifie UNIQUEMENT ici.
 *
 * Principe clé : le serveur décide de tout ce qui touche aux points. Le front ne
 * fait qu'AFFICHER ces offres. Un utilisateur qui bidouille son navigateur ne
 * peut donc jamais se faire créditer plus que ce que le serveur a calculé.
 */

/** Un voix-off standard (≤ 60 s) coûte 20 points (voir BASE_POINTS_COST côté serveur). */
export const POINTS_PER_VOICEOVER = 20;

export type PromoType = 'first_recharge_flash' | 'first_recharge_entry' | 'cashback';

/**
 * 1) Offre de première recharge (Foot-in-the-door + urgence).
 *    L'horloge démarre quand l'utilisateur tombe pour la première fois à court de
 *    points (posée par le serveur : le compte à rebours est réel).
 *    - entry : « le pack d'entrée » 500 DZD -> 150 points au lieu de 100 (valable la journée)
 *    - flash : pack 1 000 DZD +50 % de points, 5 minutes seulement
 */
export const FIRST_RECHARGE_OFFERS: ReadonlyArray<{
  type: Extract<PromoType, 'first_recharge_flash' | 'first_recharge_entry'>;
  packId: string;
  bonusPercent: number;
  windowMs: number;
}> = [
  { type: 'first_recharge_flash', packId: 'pack_pro', bonusPercent: 50, windowMs: 5 * 60 * 1000 },
  { type: 'first_recharge_entry', packId: 'pack_starter', bonusPercent: 50, windowMs: 24 * 60 * 60 * 1000 },
];

/** Seuil « fin de solde » : en dessous, l'utilisateur ne peut plus générer un voix-off. */
export const OUT_OF_BALANCE_THRESHOLD = POINTS_PER_VOICEOVER;

/**
 * 2) Cashback moral : chaque recharge payée offre +20 % de points sur la
 *    suivante, valable 7 jours. Utilisé => un nouveau est reposé (boucle de rétention).
 */
export const CASHBACK = { percent: 20, validityDays: 7 } as const;

/**
 * 3) Parrainage viral : l'ami teste 3 voix -> 50 points pour le PARRAIN seulement
 *    (celui qui a envoyé le lien). Le filleul n'est pas récompensé.
 *    Les 50 pts de bienvenue ne paient que 2 générations (2 × 20) : la 3e impose
 *    donc une recharge payante — c'est voulu (le parrain est payé quand l'ami paie).
 *    friendStarterPoints reste à 0 (plus de coup de pouce gratuit vers la 3e voix).
 */
export const REFERRAL = {
  requiredGenerations: 3,
  /** Points versés UNIQUEMENT au parrain (expéditeur du lien). */
  rewardPoints: 50,
  friendStarterPoints: 0,
  maxRewardedPerReferrer: 20,
  maxAccountAgeDays: 3,
} as const;

export interface PackLike {
  id: string;
  points: number;
}

export interface PackOffer {
  type: PromoType;
  packId: string;
  basePoints: number;
  bonusPoints: number;
  totalPoints: number;
  bonusPercent: number;
  /** Fin de l'offre (ISO). */
  endsAt: string;
}

export interface OfferContext {
  hasPaid: boolean;
  firstOfferStartedAt: string | null;
  cashbackPercent: number;
  cashbackExpiresAt: string | null;
  /** Horloge (ms epoch) — toujours celle du serveur côté backend. */
  now: number;
}

export function bonusFor(basePoints: number, percent: number): number {
  return Math.max(0, Math.round((basePoints * percent) / 100));
}

/**
 * Offre applicable à un pack pour cet utilisateur, à cet instant. `null` = prix normal.
 * - Jamais payé  -> offres « première recharge » (si l'horloge a démarré et n'a pas expiré)
 * - Déjà payé    -> cashback (s'il est actif)
 * Les deux sont exclusives : un cashback n'existe qu'après un premier paiement.
 */
export function resolvePackOffer(pack: PackLike, ctx: OfferContext): PackOffer | null {
  if (!ctx.hasPaid) {
    if (!ctx.firstOfferStartedAt) return null;
    const started = Date.parse(ctx.firstOfferStartedAt);
    if (!Number.isFinite(started)) return null;
    const offer = FIRST_RECHARGE_OFFERS.find((o) => o.packId === pack.id);
    if (!offer) return null;
    const endsAtMs = started + offer.windowMs;
    if (ctx.now >= endsAtMs) return null;
    const bonusPoints = bonusFor(pack.points, offer.bonusPercent);
    return {
      type: offer.type,
      packId: pack.id,
      basePoints: pack.points,
      bonusPoints,
      totalPoints: pack.points + bonusPoints,
      bonusPercent: offer.bonusPercent,
      endsAt: new Date(endsAtMs).toISOString(),
    };
  }

  if (ctx.cashbackPercent > 0 && ctx.cashbackExpiresAt) {
    const endsAtMs = Date.parse(ctx.cashbackExpiresAt);
    if (!Number.isFinite(endsAtMs) || ctx.now >= endsAtMs) return null;
    const bonusPoints = bonusFor(pack.points, ctx.cashbackPercent);
    return {
      type: 'cashback',
      packId: pack.id,
      basePoints: pack.points,
      bonusPoints,
      totalPoints: pack.points + bonusPoints,
      bonusPercent: ctx.cashbackPercent,
      endsAt: new Date(endsAtMs).toISOString(),
    };
  }

  return null;
}

/**
 * Price framing : « tarif par voix-off » au lieu du « prix du pack ».
 * On arrondit vers le bas pour parler en « ~90 DZD » (ex. 1 000 DZD / 11 voix-off = 90,9).
 */
export function pricePerVoiceover(priceDZD: number, points: number): number {
  const voiceovers = Math.floor(points / POINTS_PER_VOICEOVER);
  if (voiceovers <= 0) return priceDZD;
  return Math.floor(priceDZD / voiceovers);
}
