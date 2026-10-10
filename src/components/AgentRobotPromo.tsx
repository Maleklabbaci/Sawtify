import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const DISMISS_KEY = 'sawtify_agent_robot_dismissed';

export const AgentRobotPromo: React.FC<{ onOpen: () => void; language: string }> = ({ onOpen, language }) => {
  const ar = language === 'ar';
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try { if (sessionStorage.getItem(DISMISS_KEY) === '1') return; } catch { /* ignore */ }
    const timer = window.setTimeout(() => setVisible(true), 900);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  const dismiss = (event: React.MouseEvent) => {
    event.stopPropagation();
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
    setVisible(false);
  };

  return (
    <div className="saw-robot-card">
      <button
        type="button"
        onClick={onOpen}
        aria-label={ar ? 'افتح مساحة Agent Sawtify' : 'Ouvrir l\u2019espace Agent Sawtify'}
        className="group relative flex h-full w-full flex-col items-center justify-between overflow-hidden rounded-s-[28px] border border-e-0 border-violet-200 bg-gradient-to-br from-white via-violet-50 to-fuchsia-50 px-3 pb-3 pt-2 shadow-[0_18px_44px_rgba(76,29,149,.28)] transition hover:shadow-[0_22px_52px_rgba(76,29,149,.38)]"
      >
        <svg viewBox="0 0 160 150" className="saw-robot-body h-[62%] w-auto" aria-hidden="true">
          <line x1="80" y1="8" x2="80" y2="24" stroke="#6d28d9" strokeWidth="4" strokeLinecap="round" />
          <circle cx="80" cy="8" r="6" fill="#e879f9" />
          <rect x="34" y="24" width="92" height="66" rx="22" fill="#6d28d9" />
          <rect x="42" y="32" width="76" height="50" rx="16" fill="#f5f3ff" />
          <ellipse className="saw-robot-eye" cx="64" cy="54" rx="7" ry="9" fill="#2e1065" />
          <ellipse className="saw-robot-eye" cx="96" cy="54" rx="7" ry="9" fill="#2e1065" />
          <path d="M68 70 Q80 79 92 70" stroke="#a21caf" strokeWidth="4" fill="none" strokeLinecap="round" />
          <rect x="44" y="96" width="72" height="44" rx="16" fill="#7c3aed" />
          <circle cx="80" cy="118" r="7" fill="#f0abfc" />
          <rect x="22" y="104" width="16" height="30" rx="8" fill="#6d28d9" />
          <g className="saw-robot-arm"><rect x="122" y="104" width="16" height="30" rx="8" fill="#6d28d9" /></g>
        </svg>
        <span className="block text-center">
          <span className="block text-[13px] font-black leading-tight text-[#2e1065]">Agent Sawtify</span>
          <span className="mt-1 inline-block rounded-full bg-violet-700 px-3 py-1 text-[10px] font-extrabold text-white transition group-hover:bg-violet-600">{ar ? 'جرّب المساعد الصوتي' : 'Essayer l\u2019assistant vocal'}</span>
        </span>
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label={ar ? 'إغلاق' : 'Fermer'}
        className="absolute end-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm transition hover:bg-white hover:text-slate-800"
      ><X className="h-3.5 w-3.5" /></button>
    </div>
  );
};
