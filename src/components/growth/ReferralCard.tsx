import React, { useState } from 'react';
import { Copy, Check, Share2, MessageCircle, Users } from 'lucide-react';
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
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(copy.referralWhatsappMessage(link))}`;
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
    try { await navigator.share({ text: copy.referralWhatsappMessage(link), url: link }); } catch { /* annulé par l'utilisateur */ }
  };

  const friend = referral.asFriend;

  return (
    <section
      className={`overflow-hidden bg-white ${variant === 'card' ? 'rounded-3xl border border-slate-200/80 shadow-sm' : ''}`}
      aria-label={copy.referralTitle}
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            <Users className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold leading-snug text-slate-900">{copy.referralTitle}</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              {copy.referralBody(referral.rewardPoints, referral.requiredGenerations)}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <label className="text-[11px] font-medium text-slate-500">{copy.referralLinkLabel}</label>
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
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition active:scale-95 ${copied ? 'bg-slate-100 text-slate-600' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
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
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 active:scale-95"
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
          <p className="mt-4 text-xs font-medium text-slate-500">
            {copy.referralStats(referral.rewardedCount, referral.pendingCount, referral.earnedPoints)}
          </p>
        )}

        {friend && (
          <p className={`mt-3 rounded-xl px-3 py-2 text-xs font-semibold ${friend.status === 'rewarded' ? 'bg-slate-100 text-slate-700' : 'bg-purple-50 text-purple-800'}`}>
            {friend.status === 'rewarded'
              ? copy.referralFriendDone
              : copy.referralFriendProgress(friend.done, friend.required)}
          </p>
        )}
      </div>
    </section>
  );
};
