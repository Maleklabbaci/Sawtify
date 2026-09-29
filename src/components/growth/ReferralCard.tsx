import React, { useState } from 'react';
import { Copy, Check, Share2, MessageCircle, Gift } from 'lucide-react';
import type { GrowthStatus } from '../../services/growth';
import { referralLink } from '../../services/growth';
import { getGrowthCopy } from '../../data/growthCopy';
import type { LanguageCode } from '../../data/voices';

interface ReferralCardProps {
  status: GrowthStatus | null;
  language: LanguageCode;
  /** 'modal' = sans ombre ni bordure (le conteneur s'en charge). */
  variant?: 'card' | 'modal';
}

  /**
 * Boucle virale « avec friction » : 50 points UNIQUEMENT pour le parrain (expéditeur du lien),
 * versés quand l'ami a réellement testé 3 voix (souvent après une recharge pour la 3e).
 * Le message parle de ce qu'on NE paie PLUS — ça déclenche bien plus.
 */
export const ReferralCard: React.FC<ReferralCardProps> = ({ status, language, variant = 'card' }) => {
  const copy = getGrowthCopy(language);
  const [copied, setCopied] = useState(false);
  const referral = status?.referral;
  if (!status || !referral?.code) return null;

  const link = referralLink(referral.code);
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(copy.referralWhatsappMessage(link, referral.rewardPoints))}`;
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // Navigateurs intégrés (Instagram/Facebook) : repli via un champ temporaire.
      const input = document.createElement('input');
      input.value = link;
      document.body.appendChild(input);
      input.select();
      try { document.execCommand('copy'); } catch { /* rien de plus à tenter */ }
      document.body.removeChild(input);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  };

  const share = async () => {
    try { await navigator.share({ text: copy.referralWhatsappMessage(link, referral.rewardPoints), url: link }); } catch { /* annulé par l'utilisateur */ }
  };

  const friend = referral.asFriend;

  return (
    <section
      className={`overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-50 via-white to-purple-50 ${variant === 'card' ? 'border border-emerald-200/70 shadow-sm' : ''}`}
      aria-label={copy.referralTitle}
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-500/30">
            <Gift className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-extrabold leading-snug text-slate-900 sm:text-lg">{copy.referralTitle}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              {copy.referralBody(referral.rewardPoints, referral.requiredGenerations)}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{copy.referralLinkLabel}</label>
          <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5">
            <input
              readOnly
              value={link}
              dir="ltr"
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 bg-transparent px-2 text-xs text-slate-700 outline-none"
            />
            <button
              type="button"
              onClick={copyLink}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition active:scale-95 ${copied ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? copy.referralCopied : copy.referralCopy}
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-xl bg-[#25D366] px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:brightness-95 active:scale-95"
          >
            <MessageCircle className="h-4 w-4" />
            {copy.referralWhatsapp}
          </a>
          {canShare && (
            <button
              type="button"
              onClick={share}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 active:scale-95"
            >
              <Share2 className="h-4 w-4" />
              {copy.referralShare}
            </button>
          )}
        </div>

        {(referral.invitedCount > 0 || referral.earnedPoints > 0) && (
          <p className="mt-4 text-xs font-semibold text-emerald-700">
            {copy.referralStats(referral.rewardedCount, referral.pendingCount, referral.earnedPoints)}
          </p>
        )}

        {friend && (
          <p className={`mt-3 rounded-xl px-3 py-2 text-xs font-bold ${friend.status === 'rewarded' ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'}`}>
            {friend.status === 'rewarded'
              ? copy.referralFriendDone
              : copy.referralFriendProgress(friend.done, friend.required)}
          </p>
        )}
      </div>
    </section>
  );
};
