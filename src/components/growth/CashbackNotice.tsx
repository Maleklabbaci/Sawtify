import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowRight } from 'lucide-react';
import { CASHBACK } from '../../config/growth';
import { getGrowthCopy } from '../../data/growthCopy';
import type { LanguageCode } from '../../data/voices';
import type { CashbackNoticeData } from '../../hooks/useGrowth';

interface CashbackNoticeProps {
  notice: CashbackNoticeData;
  language: LanguageCode;
  isRTL: boolean;
  onSeePacks: () => void;
  onClose: () => void;
}

/**
 * Notification immédiate après une recharge payée : « cashback moral ».
 * Le client a l'impression de récupérer de l'argent, et pense déjà à sa prochaine recharge
 * (boucle de rétention). Le cashback est réel : posé par le serveur au moment du crédit.
 */
export const CashbackNotice: React.FC<CashbackNoticeProps> = ({ notice, language, isRTL, onSeePacks, onClose }) => {
  const copy = getGrowthCopy(language);

  useEffect(() => {
    const id = window.setTimeout(onClose, 20000);
    return () => window.clearTimeout(id);
  }, [onClose]);

  return createPortal(
    <div
      className="growth-pop fixed inset-x-3 bottom-[5.5rem] z-[10000] mx-auto max-w-md overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-2xl shadow-emerald-900/15 sm:bottom-6"
      role="status"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="flex items-start gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-emerald-700">{copy.cashbackTitle}</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">{copy.cashbackBody(notice.percent || CASHBACK.percent, CASHBACK.validityDays)}</p>
          <button
            type="button"
            onClick={() => { onSeePacks(); onClose(); }}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-extrabold text-white transition hover:bg-emerald-700 active:scale-95"
          >
            {copy.cashbackCta}
            <ArrowRight className={`h-3.5 w-3.5 ${isRTL ? 'rotate-180' : ''}`} />
          </button>
        </div>
        <button type="button" onClick={onClose} className="shrink-0 text-slate-400 transition hover:text-slate-700" aria-label={copy.close}>
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>,
    document.body
  );
};
