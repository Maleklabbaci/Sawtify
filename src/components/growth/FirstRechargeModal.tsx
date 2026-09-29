import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import type { GrowthStatus } from '../../services/growth';
import type { PackOffer } from '../../config/growth';
import { pricePerVoiceover } from '../../config/growth';
import { getCreditPacks, type LanguageCode } from '../../data/voices';
import { getGrowthCopy } from '../../data/growthCopy';
import { formatRemaining, remainingMs } from './time';
import { useTicker, type GrowthApi } from '../../hooks/useGrowth';

interface FirstRechargeModalProps {
  language: LanguageCode;
  isRTL: boolean;
  /** Offres + horloge serveur (le compte à rebours ne dépend pas de l'heure du téléphone). */
  growth: GrowthApi;
  onChoosePack: (packId: string) => void;
  onClose: () => void;
}

/** Offres « première recharge » encore vivantes à cet instant (jamais plus que ce que dit le serveur). */
export function liveFirstRechargeOffers(status: GrowthStatus, nowMs: number): { flash: PackOffer | null; entry: PackOffer | null } {
  // Dès le premier paiement validé (hasPaid), les offres 1re recharge disparaissent définitivement.
  if (status.hasPaid) return { flash: null, entry: null };
  const alive = (o?: PackOffer) => (o && remainingMs(o.endsAt, nowMs) > 0 ? o : null);
  const all = Object.values(status.packOffers);
  return {
    flash: alive(all.find((o) => o.type === 'first_recharge_flash')),
    entry: alive(all.find((o) => o.type === 'first_recharge_entry')),
  };
}

/**
 * Pop-up de première fin de solde.
 *  - Foot-in-the-door : on vise d'abord le petit pack d'entrée (le premier paiement est LA barrière).
 *  - Urgence / perte / FOMO : pack 1 000 DZD à +50 % avec un compte à rebours RÉEL de 5 minutes
 *    (horloge serveur : recharger la page ne le remet pas à zéro).
 */
export const FirstRechargeModal: React.FC<FirstRechargeModalProps> = ({ language, isRTL, growth, onChoosePack, onClose }) => {
  const copy = getGrowthCopy(language);
  const packs = getCreditPacks(language);
  useTicker(true);
  const nowMs = growth.nowMs();
  const { flash, entry } = growth.status ? liveFirstRechargeOffers(growth.status, nowMs) : { flash: null, entry: null };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!flash && !entry) return null;

  const packOf = (offer: PackOffer) => packs.find((p) => p.id === offer.packId);
  const flashPack = flash ? packOf(flash) : undefined;
  const entryPack = entry ? packOf(entry) : undefined;
  const headline = flash ? copy.flashTitle : copy.entryTitle;
  const body = flash && flashPack
    ? copy.flashBody(flash.bonusPercent, flashPack.priceDZD)
    : entry && entryPack ? copy.entryBody(entry.totalPoints, entry.basePoints, entryPack.priceDZD) : '';

  const renderOffer = (offer: PackOffer, pack: NonNullable<ReturnType<typeof packOf>>, highlighted: boolean) => (
    <div
      key={offer.type}
      className={`relative rounded-2xl p-4 border-2 transition ${highlighted ? 'border-purple-500 bg-purple-50/60 shadow-lg shadow-purple-500/10' : 'border-slate-200 bg-white'}`}
    >
      <span className={`absolute -top-2.5 ${isRTL ? 'right-4' : 'left-4'} inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${offer.type === 'first_recharge_flash' ? 'bg-orange-500 text-white' : 'bg-purple-600 text-white'}`}>
        <Sparkles className="h-3 w-3" />
        {offer.type === 'first_recharge_flash' ? copy.flashBadge : copy.firstOfferBadge}
      </span>

      <div className="flex items-end justify-between gap-3 pt-1">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-slate-900 font-num">{offer.totalPoints.toLocaleString()}</span>
            <span className="text-sm font-bold text-slate-600">{copy.pointsUnit}</span>
            <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-700">+{offer.bonusPercent}%</span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {copy.instead} <span className="line-through decoration-rose-400 font-num">{offer.basePoints.toLocaleString()}</span> {copy.pointsUnit}
          </p>
        </div>
        <div className="text-end">
          <div className="text-xl font-extrabold text-slate-900 font-num">{pack.priceDZD.toLocaleString()} <span className="text-xs font-bold text-slate-500">DZD</span></div>
          <p className="text-[10px] text-slate-500">{copy.perVoicePlain(pricePerVoiceover(pack.priceDZD, offer.totalPoints))}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onChoosePack(offer.packId)}
        className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-extrabold transition active:scale-[0.98] ${highlighted ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-md shadow-purple-600/30' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
      >
        <span>{offer.type === 'first_recharge_flash' ? copy.ctaFlash(offer.bonusPercent) : copy.ctaEntry(pack.priceDZD)}</span>
        <ArrowRight className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
      </button>
    </div>
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={headline}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="relative m-auto w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl growth-pop" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          className={`absolute top-3 z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-white transition hover:bg-white/30 ${isRTL ? 'left-3' : 'right-3'}`}
          aria-label={copy.close}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="bg-gradient-to-br from-purple-700 via-fuchsia-600 to-orange-400 px-6 pb-6 pt-7 text-white">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold">
            <Zap className="h-3 w-3" /> {copy.outOfPoints}
          </span>
          <h2 className="mt-3 text-xl font-black leading-snug sm:text-2xl">{headline}</h2>
          <p className="mt-2 text-sm leading-relaxed text-white/90">{body}</p>

          {flash ? (
            <div className="mt-4 rounded-2xl bg-black/25 px-4 py-3 text-center">
              <p className="text-[11px] font-semibold text-white/80">{copy.flashCountdownLabel}</p>
              <p dir="ltr" className="mt-1 text-4xl font-black tabular-nums tracking-wider font-num" aria-live="off">
                {formatRemaining(remainingMs(flash.endsAt, nowMs), language)}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-xs font-semibold text-white/85">{copy.entryValidToday}</p>
          )}
        </div>

        <div className="space-y-4 p-5 pt-6">
          {flash && flashPack && renderOffer(flash, flashPack, true)}
          {entry && entryPack && renderOffer(entry, entryPack, !flash)}

          <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
            {copy.trust}
          </p>
          <button type="button" onClick={onClose} className="w-full py-1 text-xs text-slate-400 transition hover:text-slate-600">
            {copy.noThanks}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
