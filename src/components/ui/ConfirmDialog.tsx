import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { ModalDescription, ModalShell, ModalTitle } from './ModalShell';

interface ConfirmDialogProps {
  title: string;
  description: string;
  cancelLabel: string;
  confirmLabel: string;
  dir?: 'ltr' | 'rtl' | 'auto';
  onClose: () => void;
  onConfirm: () => void;
  dataModal?: string;
}

/** Shared confirmation dialog for destructive actions across the platform. */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title,
  description,
  cancelLabel,
  confirmLabel,
  dir,
  onClose,
  onConfirm,
  dataModal = 'confirm',
}) => (
  <ModalShell
    onClose={onClose}
    ariaLabelledBy="confirm-dialog-title"
    ariaDescribedBy="confirm-dialog-description"
    dialogRole="alertdialog"
    dir={dir}
    size="sm"
    panelClassName="p-5 sm:p-6"
    dataModal={dataModal}
  >
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-700 ring-1 ring-rose-100">
        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <ModalTitle id="confirm-dialog-title" className="text-base sm:text-lg">{title}</ModalTitle>
        <ModalDescription id="confirm-dialog-description" className="mt-2">{description}</ModalDescription>
      </div>
    </div>
    <div className="mt-6 grid grid-cols-2 gap-2">
      <button
        type="button"
        autoFocus
        onClick={onClose}
        className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
      >
        {cancelLabel}
      </button>
      <button
        type="button"
        onClick={onConfirm}
        className="min-h-11 rounded-xl bg-rose-700 px-3 py-2.5 text-sm font-extrabold text-white transition hover:bg-rose-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-200"
      >
        {confirmLabel}
      </button>
    </div>
  </ModalShell>
);
