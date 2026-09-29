import React from 'react';
import { createPortal } from 'react-dom';

export interface BubblePalette { c1: string; c2: string; c3: string; accent: string }

// Palettes de la bulle : une est tirée au hasard à chaque écoute de voix.
export const BUBBLE_PALETTES: BubblePalette[] = [
  { c1: '#ff4e50', c2: '#f9d423', c3: '#ff8e53', accent: '#ff0044' }, // orange / rouge
  { c1: '#4158d0', c2: '#1e3a8a', c3: '#c850c0', accent: '#00d2ff' }, // bleu roi
  { c1: '#00f2fe', c2: '#4facfe', c3: '#1e40af', accent: '#7f00ff' }, // aurore / cyan
  { c1: '#ff6ec4', c2: '#ffc3e1', c3: '#f472b6', accent: '#e11d74' }, // rose
  { c1: '#10b981', c2: '#a7f3d0', c3: '#34d399', accent: '#059669' }, // vert
  { c1: '#7c3aed', c2: '#c4b5fd', c3: '#a855f7', accent: '#4c1d95' }, // violet Sawtify
];

export function pickPalette(previous?: BubblePalette | null): BubblePalette {
  const pool = BUBBLE_PALETTES.filter((p) => p !== previous);
  return pool[Math.floor(Math.random() * pool.length)];
}

interface Props {
  palette: BubblePalette;
  label: string;
  onStop: () => void;
}

export const VoiceBubble: React.FC<Props> = ({ palette, label, onStop }) =>
  createPortal(
    <div
      className="saw-vb-overlay"
      style={{
        '--vb-1': palette.c1, '--vb-2': palette.c2, '--vb-3': palette.c3, '--vb-accent': palette.accent,
      } as React.CSSProperties}
      role="status"
      aria-live="polite"
    >
      <button type="button" className="saw-vb-wrapper" onClick={onStop} aria-label={label}>
        <span className="saw-vb-bubble" />
        <span className="saw-vb-wave" />
        <span className="saw-vb-wave saw-vb-wave-2" />
      </button>
      <span className="saw-vb-label">{label}</span>
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <filter id="saw-vb-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" result="goo" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>
    </div>,
    document.body,
  );
