import React, { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'wide' | 'full';
export type ModalPlacement = 'center' | 'sheet';

interface ModalShellProps {
  children: ReactNode;
  onClose?: () => void;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  dialogRole?: 'dialog' | 'alertdialog';
  dir?: 'ltr' | 'rtl' | 'auto';
  size?: ModalSize;
  placement?: ModalPlacement;
  panelClassName?: string;
  overlayClassName?: string;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  dataModal?: string;
}

let bodyLockCount = 0;
let bodyOverflowBeforeModal = '';

function lockBodyScroll(): () => void {
  if (typeof document === 'undefined') return () => {};
  if (bodyLockCount === 0) {
    bodyOverflowBeforeModal = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  bodyLockCount += 1;
  return () => {
    bodyLockCount = Math.max(0, bodyLockCount - 1);
    if (bodyLockCount === 0) document.body.style.overflow = bodyOverflowBeforeModal;
  };
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  wide: 'max-w-5xl',
  full: 'max-w-none',
};

/** Shared, portal-based modal layer so dialogs always cover app navigation and page stacking contexts. */
export const ModalShell: React.FC<ModalShellProps> = ({
  children,
  onClose,
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
  dialogRole = 'dialog',
  dir,
  size = 'md',
  placement = 'center',
  panelClassName = '',
  overlayClassName = '',
  closeOnBackdrop = true,
  closeOnEscape = true,
  dataModal,
}) => {
  const panelRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const unlockBody = lockBodyScroll();
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    const focusFirst = () => {
      const first = panel?.querySelector<HTMLElement>(
        '[autofocus], button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      (first || panel)?.focus({ preventScroll: true });
    };
    const focusableElements = () => Array.from(panel?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ) || []).filter((element) => element.offsetParent !== null);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && closeOnEscape && onClose) {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = focusableElements();
      if (!focusable.length) {
        event.preventDefault();
        panel?.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    const focusTimer = window.requestAnimationFrame(focusFirst);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.cancelAnimationFrame(focusTimer);
      unlockBody();
      if (previouslyFocused?.isConnected) previouslyFocused.focus({ preventScroll: true });
    };
  }, [closeOnEscape, onClose]);

  if (typeof document === 'undefined') return null;

  const alignment = placement === 'sheet' ? 'items-end sm:items-center' : 'items-center';
  const sheetPanel = placement === 'sheet' ? 'rounded-t-[28px] sm:rounded-[28px]' : '';
  const safeAreaPadding: React.CSSProperties = placement === 'sheet'
    ? {
        paddingTop: 'max(16px, env(safe-area-inset-top, 0px))',
        paddingRight: 'max(0px, env(safe-area-inset-right, 0px))',
        paddingBottom: 'max(0px, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(0px, env(safe-area-inset-left, 0px))',
      }
    : {
        paddingTop: 'max(16px, env(safe-area-inset-top, 0px))',
        paddingRight: 'max(16px, env(safe-area-inset-right, 0px))',
        paddingBottom: 'max(16px, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(16px, env(safe-area-inset-left, 0px))',
      };
  const panelMargin = placement === 'sheet' ? 'my-0 mx-auto sm:m-auto' : 'm-auto';

  return createPortal(
    <div
      className={`saw-modal-overlay fixed inset-0 flex ${alignment} overflow-y-auto bg-slate-950/60 backdrop-blur-md ${overlayClassName}`}
      style={{ ...safeAreaPadding, zIndex: 2147483647 }}
      onMouseDown={(event) => {
        if (closeOnBackdrop && onClose && event.target === event.currentTarget) onClose();
      }}
      data-modal-overlay={dataModal}
    >
      <section
        ref={panelRef}
        role={dialogRole}
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        dir={dir}
        tabIndex={-1}
        className={`saw-modal-panel relative ${panelMargin} max-h-[92dvh] w-full ${sizeClasses[size]} overflow-y-auto rounded-[28px] border border-white/80 bg-white text-slate-900 shadow-[0_28px_90px_rgba(15,23,42,.28)] ring-1 ring-slate-950/5 outline-none ${sheetPanel} ${panelClassName}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {children}
      </section>
    </div>,
    document.body,
  );
};

export const ModalEyebrow: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({ className = '', ...props }) => (
  <p className={`text-[11px] font-extrabold uppercase tracking-[.14em] text-violet-700 ${className}`} {...props} />
);

export const ModalTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className = '', ...props }) => (
  <h2 className={`text-xl font-black leading-tight tracking-tight text-slate-950 sm:text-2xl ${className}`} {...props} />
);

export const ModalDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({ className = '', ...props }) => (
  <p className={`text-sm leading-6 text-slate-600 ${className}`} {...props} />
);
