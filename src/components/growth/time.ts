import type { LanguageCode } from '../../data/voices';

const pad = (n: number) => String(n).padStart(2, '0');

/** Durée restante lisible : 04:59 (< 1 h), 3 h 05 (< 24 h), 6 j 23 h (au-delà). */
export function formatRemaining(ms: number, lang: LanguageCode = 'fr'): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (days >= 1) return lang === 'ar' ? `${days} أيام ${hours} س` : `${days} j ${hours} h`;
  if (hours >= 1) return lang === 'ar' ? `${hours} س ${pad(minutes)} د` : `${hours} h ${pad(minutes)}`;
  return `${pad(minutes)}:${pad(seconds)}`;
}

export function remainingMs(endsAtIso: string, nowMs: number): number {
  return Date.parse(endsAtIso) - nowMs;
}
