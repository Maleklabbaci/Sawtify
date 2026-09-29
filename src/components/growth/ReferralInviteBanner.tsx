import React from 'react';
import { Gift } from 'lucide-react';
import { getGrowthCopy } from '../../data/growthCopy';
import type { LanguageCode } from '../../data/voices';

interface ReferralInviteBannerProps {
  language: LanguageCode;
  isRTL: boolean;
  onSignup: () => void;
}

/** Visiteur arrivé par le lien d'un ami (?ref=CODE) : on rappelle l'invitation avant l'inscription. */
export const ReferralInviteBanner: React.FC<ReferralInviteBannerProps> = ({ language, isRTL, onSignup }) => {
  const copy = getGrowthCopy(language);
  return (
    <div
      className="growth-pop fixed inset-x-3 bottom-4 z-[80] mx-auto flex max-w-lg items-center gap-3 rounded-2xl border border-emerald-200 bg-white p-3 shadow-2xl shadow-emerald-900/15"
      dir={isRTL ? 'rtl' : 'ltr'}
      role="status"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white"><Gift className="h-4 w-4" /></div>
      <p className="min-w-0 flex-1 text-xs font-bold leading-snug text-slate-800">{copy.referralBanner}</p>
      <button type="button" onClick={onSignup} className="shrink-0 rounded-lg bg-slate-900 px-3 py-2 text-[11px] font-extrabold text-white transition hover:bg-purple-600 active:scale-95">
        {copy.referralBannerCta}
      </button>
    </div>
  );
};
