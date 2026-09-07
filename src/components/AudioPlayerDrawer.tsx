import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, Download, FileAudio, Zap, RefreshCw, X } from 'lucide-react';
import { Voice } from '../types';

interface AudioPlayerDrawerProps {
  currentAudioUrl: string | null;
  currentVoice: Voice;
  isPlaying: boolean;
  togglePlay: () => void;
  currentTime: number;
  audioDuration: number;
  lastLatency: number | null;
  isConvertingMp3: boolean;
  conversionStatus: string;
  mp3Size: number;
  wavSize: number;
  compressionRatio: number;
  mp3Url: string | null;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  handleTimeUpdate: () => void;
  onEnded: () => void;
  onClose: () => void;
  isRTL: boolean;
  t: any;
}

export const AudioPlayerDrawer: React.FC<AudioPlayerDrawerProps> = ({
  currentAudioUrl,
  currentVoice,
  isPlaying,
  togglePlay,
  currentTime,
  audioDuration,
  lastLatency,
  isConvertingMp3,
  conversionStatus,
  mp3Size,
  wavSize,
  compressionRatio,
  mp3Url,
  audioRef,
  canvasRef,
  handleTimeUpdate,
  onEnded,
  onClose,
  isRTL,
  t,
}) => {
  return (
    <AnimatePresence>
      {currentAudioUrl && (
        <motion.div
          id="audio-player-drawer"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-[0_-8px_30px_rgba(15,23,42,0.10)]"
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 space-y-3">

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
                <span className="text-xs font-semibold text-slate-800">
                  {currentVoice.name} • {t.audioPlayerHeader}
                </span>
                {lastLatency && (
                  <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    {t.latencyLabel} : <span className="font-num font-semibold text-slate-800">{lastLatency}</span>ms
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                title={isRTL ? 'إغلاق' : 'Fermer'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              {/* Play button + waveform */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <button
                  id="btn-play-pause-audio"
                  onClick={togglePlay}
                  className="w-10 h-10 shrink-0 rounded-xl bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white flex items-center justify-center transition cursor-pointer shadow-xs"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className={`w-4 h-4 fill-current ${isRTL ? 'mr-0.5' : 'ml-0.5'}`} />}
                </button>

                <div className="h-10 flex-1 min-w-0 bg-slate-50 rounded-xl px-2 border border-slate-200/80 flex items-center justify-center">
                  <canvas ref={canvasRef} width={520} height={32} className="w-full h-full" />
                </div>

                <div className="text-xs text-slate-600 shrink-0 whitespace-nowrap">
                  <span className="font-num text-slate-900 font-bold">{currentTime.toFixed(1)}s</span> / <span className="font-num">{audioDuration.toFixed(1)}s</span>
                </div>
              </div>

              {/* Downloads */}
              <div className="flex items-center gap-2 shrink-0">
                {mp3Size > 0 ? (
                  <span className="hidden md:inline-flex items-center gap-1 font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md text-xs">
                    <FileAudio className="w-3.5 h-3.5 text-purple-600" />
                    MP3 • <span className="font-num">{formatSize(mp3Size)}</span>
                    {compressionRatio > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-purple-700 ml-1">
                        <Zap className="w-3 h-3" />
                        <span className="font-num">-{compressionRatio}%</span>
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="hidden md:inline text-slate-500 text-[11px]">
                    WAV : <span className="font-num">{formatSize(wavSize)}</span>
                  </span>
                )}

                <a
                  id="btn-download-wav"
                  href={currentAudioUrl}
                  download={`sawtify_${currentVoice.id}_${Date.now()}.wav`}
                  className="hidden sm:inline-flex px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-medium transition cursor-pointer"
                  title={t.downloadWav}
                >
                  WAV
                </a>

                {mp3Url ? (
                  <a
                    id="btn-download-mp3"
                    href={mp3Url}
                    download={`sawtify_${currentVoice.id}_${Date.now()}.mp3`}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer shadow-xs"
                    title={t.downloadMp3}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{t.downloadMp3}</span>
                  </a>
                ) : (
                  <button
                    disabled
                    className="px-4 py-2 bg-slate-200 text-slate-400 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-not-allowed"
                  >
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span className="hidden sm:inline">{t.convertingStatus}</span>
                  </button>
                )}
              </div>
            </div>

            {isConvertingMp3 && (
              <div className="flex items-center gap-2.5 text-[11px] text-purple-700">
                <RefreshCw className="w-3 h-3 animate-spin text-purple-600 shrink-0" />
                <span>{conversionStatus || t.convertingStatus}</span>
              </div>
            )}

            <audio
              ref={audioRef}
              src={currentAudioUrl}
              onTimeUpdate={handleTimeUpdate}
              onEnded={onEnded}
              className="hidden"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
