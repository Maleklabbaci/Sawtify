/**
 * Petits sons de notification générés à la volée avec Web Audio API.
 * Pas de fichier .mp3/.wav à charger : léger, instantané, zéro dépendance.
 */

let sharedCtx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  try {
    if (!sharedCtx) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      sharedCtx = new Ctx();
    }
    if (sharedCtx.state === 'suspended') sharedCtx.resume().catch(() => {});
    return sharedCtx;
  } catch {
    return null;
  }
}

function tone(ctx: AudioContext, freq: number, startTime: number, duration: number, gain = 0.14, type: OscillatorType = 'sine') {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  g.gain.setValueAtTime(0, startTime);
  g.gain.linearRampToValueAtTime(gain, startTime + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

/** Petit "ding" doux : texte amélioré (Magique) */
export function playEnhanceChime() {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  tone(ctx, 880, t, 0.12, 0.1);
  tone(ctx, 1320, t + 0.07, 0.16, 0.09);
}

/** Double note montante : script généré */
export function playScriptChime() {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  tone(ctx, 660, t, 0.1, 0.1);
  tone(ctx, 990, t + 0.09, 0.14, 0.1);
}

/** Triade satisfaisante : audio généré et prêt */
export function playGenerationChime() {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  tone(ctx, 523.25, t, 0.14, 0.11);
  tone(ctx, 659.25, t + 0.08, 0.14, 0.11);
  tone(ctx, 783.99, t + 0.16, 0.22, 0.12);
}
