import React from 'react';
import { createPortal } from 'react-dom';

export interface BubblePalette { base: string; liquid1: string; liquid2: string; liquid3: string; accent: string }

// Palettes de la bulle : une est tirée au hasard à chaque écoute de voix.
export const BUBBLE_PALETTES: BubblePalette[] = [
  { base: '#fff0e8', liquid1: '#ff7267', liquid2: '#ffd36e', liquid3: '#ff9a80', accent: '#ff5e3a' },
  { base: '#e9f1ff', liquid1: '#587ff5', liquid2: '#48d4ec', liquid3: '#a97afa', accent: '#4263eb' },
  { base: '#e8faff', liquid1: '#12c8dd', liquid2: '#7a8cff', liquid3: '#5be0c0', accent: '#129fcb' },
  { base: '#fff0f7', liquid1: '#f26ba8', liquid2: '#ffc1d9', liquid3: '#a777f3', accent: '#d94687' },
  { base: '#edfff6', liquid1: '#33bd82', liquid2: '#b9e96e', liquid3: '#32c8bd', accent: '#138e64' },
  { base: '#f3edff', liquid1: '#9565ec', liquid2: '#ec81d4', liquid3: '#5889f4', accent: '#7040ca' },
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
        '--vb-base': palette.base, '--vb-liquid-1': palette.liquid1, '--vb-liquid-2': palette.liquid2, '--vb-liquid-3': palette.liquid3, '--vb-accent': palette.accent,
      } as React.CSSProperties}
      role="status"
      aria-live="polite"
    >
      <button type="button" className="saw-vb-wrapper" onClick={onStop} aria-label={label}>
        <span className="saw-vb-bubble">
          <span className="saw-vb-liquid saw-vb-liquid-1" />
          <span className="saw-vb-liquid saw-vb-liquid-2" />
          <span className="saw-vb-liquid saw-vb-liquid-3" />
          <span className="saw-vb-shine" />
        </span>
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
