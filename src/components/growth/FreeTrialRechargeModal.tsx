import React from 'react';
import { ArrowRight, Gift, X, Zap } from 'lucide-react';
import { ModalDescription, ModalEyebrow, ModalShell, ModalTitle } from '../ui/ModalShell';

interface FreeTrialRechargeModalProps {
  language: 'fr' | 'ar';
  isRTL: boolean;
  onRecharge: () => void;
  onClose: () => void;
}

/** Offre de recharge affichée après la deuxième génération offerte, une seule fois. */
export const FreeTrialRechargeModal: React.FC<FreeTrialRechargeModalProps> = ({ language, isRTL, onRecharge, onClose }) => {
  const isArabic = language === 'ar';

  return (
    <ModalShell
      onClose={onClose}
      ariaLabelledBy="free-trial-recharge-title"
      size="sm"
      panelClassName="overflow-x-hidden p-0"
      dataModal="free-trial-recharge"
    >
      <button
        type="button"
        onClick={onClose}
        className={`absolute top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 ${isRTL ? 'left-3' : 'right-3'}`}
        aria-label={isArabic ? 'إغلاق' : 'Fermer'}
      >
        <X className="h-4 w-4" />
      </button>

      <div className="bg-gradient-to-br from-violet-800 via-purple-600 to-fuchsia-500 px-6 pb-6 pt-7 text-white">
        <ModalEyebrow className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-white">
          <Gift className="h-3.5 w-3.5" />
          {isArabic ? 'تجربتاك المجانيتان' : 'Tes 2 générations offertes'}
        </ModalEyebrow>
        <ModalTitle id="free-trial-recharge-title" className="mt-4 text-white">
          {isArabic ? 'واصل الإبداع مع Sawtify' : 'Envie de créer davantage ?'}
        </ModalTitle>
        <ModalDescription className="mt-2 text-white/90">
          {isArabic
            ? 'اشحن 100 نقطة لمواصلة إنشاء التعليقات الصوتية لإبداعاتك وفيديوهاتك.'
            : 'Recharge 100 points pour continuer à créer des voix-off pour tes créations et tes vidéos.'}
        </ModalDescription>
      </div>

      <div className="space-y-3 p-5">
        <button
          type="button"
          onClick={onRecharge}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-700 px-4 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-violet-700/20 transition hover:bg-violet-800 active:scale-[0.99]"
        >
          <Zap className="h-4 w-4" />
          <span>{isArabic ? 'اشحن 100 نقطة' : 'Recharger 100 points'}</span>
          <ArrowRight className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl px-3 py-2 text-xs font-semibold text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
        >
          {isArabic ? 'لاحقاً' : 'Peut-être plus tard'}
        </button>
      </div>
    </ModalShell>
  );
};
