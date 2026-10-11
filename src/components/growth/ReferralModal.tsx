import React from 'react';
import { X } from 'lucide-react';
import type { GrowthStatus } from '../../services/growth';
import type { LanguageCode } from '../../data/voices';
import { getGrowthCopy } from '../../data/growthCopy';
import { ReferralCard } from './ReferralCard';
import { ModalShell } from '../ui/ModalShell';

interface ReferralModalProps {
  status: GrowthStatus | null;
  language: LanguageCode;
  isRTL: boolean;
  onClose: () => void;
}

export const ReferralModal: React.FC<ReferralModalProps> = ({ status, language, isRTL, onClose }) => {
  const copy = getGrowthCopy(language);

  return (
    <ModalShell
      onClose={onClose}
      ariaLabel={language === 'ar' ? 'دعوة صديق إلى Sawtify' : 'Parrainer un ami sur Sawtify'}
      size="sm"
      panelClassName="growth-pop overflow-x-hidden p-0"
      dataModal="referral"
    >
      <div dir={isRTL ? 'rtl' : 'ltr'}>
        <button
          type="button"
          onClick={onClose}
          className={`absolute top-3 z-10 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 ${isRTL ? 'left-3' : 'right-3'}`}
          aria-label={copy.close}
        >
          <X className="h-4 w-4" />
        </button>
        <ReferralCard status={status} language={language} variant="modal" />
      </div>
    </ModalShell>
  );
};
