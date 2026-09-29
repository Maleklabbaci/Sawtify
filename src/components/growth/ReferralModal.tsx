import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { GrowthStatus } from '../../services/growth';
import type { LanguageCode } from '../../data/voices';
import { getGrowthCopy } from '../../data/growthCopy';
import { ReferralCard } from './ReferralCard';

interface ReferralModalProps {
  status: GrowthStatus | null;
  language: LanguageCode;
  isRTL: boolean;
  onClose: () => void;
}

export const ReferralModal: React.FC<ReferralModalProps> = ({ status, language, isRTL, onClose }) => {
  const copy = getGrowthCopy(language);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[9997] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="growth-pop relative m-auto w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          className={`absolute top-3 z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition hover:bg-slate-200 ${isRTL ? 'left-3' : 'right-3'}`}
          aria-label={copy.close}
        >
          <X className="h-4 w-4" />
        </button>
        <ReferralCard status={status} language={language} variant="modal" />
      </div>
    </div>,
    document.body
  );
};
