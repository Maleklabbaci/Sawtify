/**
 * Estimation du coût en points d'un texte à générer en TTS.
 *
 * Doit rester SYNCHRONISÉ avec server.ts :
 *   - TTS_CHARS_PER_SECOND_ESTIMATE = 14 (darija parlée ≈ 14 caractères/seconde)
 *   - computePointsCost(durée) : 20 pts jusqu'à 60 s, +10 pts par minute entamée au-delà.
 *
 * Le serveur reste la seule source de vérité (il facture la durée RÉELLE de l'audio) ;
 * ce fichier ne sert qu'à afficher une estimation AVANT génération.
 */

export const TTS_CHARS_PER_SECOND_ESTIMATE = 14;
export const BASE_POINTS_COST = 20;
export const EXTRA_POINTS_PER_MINUTE = 10;

export interface PointsEstimate {
  /** Durée estimée de l'audio (secondes). */
  seconds: number;
  /** Coût estimé en points. */
  points: number;
}

export function estimatePointsFromChars(charCount: number): PointsEstimate {
  const chars = Math.max(0, Math.floor(Number(charCount) || 0));
  if (chars === 0) return { seconds: 0, points: BASE_POINTS_COST };
  const seconds = Math.ceil(chars / TTS_CHARS_PER_SECOND_ESTIMATE);
  const points =
    seconds <= 60
      ? BASE_POINTS_COST
      : BASE_POINTS_COST + Math.ceil((seconds - 60) / 60) * EXTRA_POINTS_PER_MINUTE;
  return { seconds, points };
}
