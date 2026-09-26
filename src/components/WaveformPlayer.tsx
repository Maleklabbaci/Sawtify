import React, { useRef, useEffect } from 'react';

interface WaveformPlayerProps {
  isPlaying: boolean;
  hasAudio: boolean;
  currentTime: number;
  duration: number;
  width?: number;
  height?: number;
}

/**
 * BUG CORRIGÉ (fluidité) : l'effet dépendait de `currentTime`, qui change
 * ~4 fois par seconde via l'évènement `timeupdate` du <audio>. À chaque
 * changement, l'ancienne version arrêtait la boucle requestAnimationFrame
 * ET remettait `step` à 0 en relançant `render()` depuis zéro : l'animation
 * de l'égaliseur sautait visiblement de phase toutes les ~250ms au lieu
 * d'onduler en continu.
 *
 * Fix : `currentTime` et `duration` sont lus depuis des refs mises à jour
 * à chaque rendu (sans redéclencher l'effet). La boucle rAF ne
 * démarre/s'arrête que sur un vrai changement de `isPlaying` / `hasAudio`,
 * et tourne ensuite sans interruption — `step` progresse en continu.
 */
export const WaveformPlayer: React.FC<WaveformPlayerProps> = ({
  isPlaying, hasAudio, currentTime, duration, width = 300, height = 22
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Toujours à jour, lues par la boucle sans jamais la redémarrer.
  const currentTimeRef = useRef(currentTime);
  const durationRef = useRef(duration);
  currentTimeRef.current = currentTime;
  durationRef.current = duration;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!hasAudio && !isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let step = 0;
    const bars = 32;
    const barWidth = 2;

    const render = () => {
      const time = currentTimeRef.current;
      const dur = durationRef.current;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < bars; i++) {
        let h = 4;
        if (isPlaying) {
          h = Math.max(3, (Math.sin((i + step) * 0.25) * 0.5 + 0.5) * canvas.height * 0.85);
        } else if (hasAudio) {
          h = Math.max(3, (Math.sin(i * 0.4) * 0.4 + 0.4) * canvas.height * 0.5);
        }
        ctx.fillStyle = i / bars <= (dur > 0 ? time / dur : 0) ? '#7c3aed' : '#cbd5e1';
        ctx.beginPath();

        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(i * (barWidth + 2), (canvas.height - h) / 2, barWidth, h, 0.5);
        } else {
          ctx.rect(i * (barWidth + 2), (canvas.height - h) / 2, barWidth, h);
        }
        ctx.fill();
      }
      if (isPlaying) step++;
      animationFrameRef.current = requestAnimationFrame(render);
    };
    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
    // currentTime/duration lues via refs : volontairement absentes des deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, hasAudio]);

  return <canvas ref={canvasRef} width={width} height={height} className="w-full h-[22px]" />;
};
