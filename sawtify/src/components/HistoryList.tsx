import React, { useState } from 'react';
import { GenerationRecord } from '../types';
import { Download, Clock, ArrowRight, Radio, FileAudio, Zap, RefreshCw } from 'lucide-react';
import { convertWavToMp3, formatBytes } from '../utils/audioConverter';
import { useLanguage } from '../context/LanguageContext';

interface HistoryListProps {
  generations: GenerationRecord[];
  onNavigateToStudio: () => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({
  generations,
  onNavigateToStudio,
}) => {
  const { t, isRTL } = useLanguage();
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [localMp3Urls, setLocalMp3Urls] = useState<Record<string, string>>({});

  const handleDownloadMp3 = async (gen: GenerationRecord) => {
    if (gen.mp3Url || localMp3Urls[gen.id]) {
      const url = gen.mp3Url || localMp3Urls[gen.id];
      const a = document.createElement('a');
      a.href = url;
      a.download = `sawtify_${gen.voiceId}_${gen.id}.mp3`;
      a.click();
      return;
    }

    if (!gen.wavBlob && !gen.audioUrl) return;

    try {
      setConvertingId(gen.id);
      let blob = gen.wavBlob;
      if (!blob && gen.audioUrl) {
        const res = await fetch(gen.audioUrl);
        blob = await res.blob();
      }

      if (blob) {
        const conv = await convertWavToMp3(blob);
        setLocalMp3Urls(prev => ({ ...prev, [gen.id]: conv.mp3Url }));
        const a = document.createElement('a');
        a.href = conv.mp3Url;
        a.download = `sawtify_${gen.voiceId}_${gen.id}.mp3`;
        a.click();
      }
    } catch (e) {
      console.error('Erreur conversion historique MP3:', e);
    } finally {
      setConvertingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 animate-in fade-in">
      
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-800">
            {t.historyHeader}
          </h2>
          <span className="text-xs font-mono text-slate-400">
            ({generations.length})
          </span>
        </div>
      </div>

      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs">
        {generations.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto border border-slate-200">
              <Radio className="w-5 h-5" />
            </div>
            <p className="text-xs text-slate-500">
              {t.emptyHistoryTitle}
            </p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              {t.emptyHistorySubtitle}
            </p>
            <button
              onClick={onNavigateToStudio}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
            >
              <span>{t.openStudioBtn}</span>
              <ArrowRight className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {generations.map((gen) => {
              const isConverting = convertingId === gen.id;

              return (
                <div
                  key={gen.id}
                  id={`history-row-${gen.id}`}
                  className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-slate-900">
                        {gen.voiceName}
                      </span>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span className="font-num">{new Date(gen.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </span>
                      <span className="text-[10px] text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.2 rounded font-medium">
                        <span className="font-num font-bold">-{gen.pointsDeducted}</span> {t.pointsLabel}
                      </span>
                      {gen.durationSec && (
                        <span className="text-[10px] text-slate-400">
                          <span className="font-num">{gen.durationSec.toFixed(1)}s</span>
                        </span>
                      )}
                      {gen.mp3Size ? (
                        <span className="text-[10px] text-purple-800 bg-purple-50/80 border border-purple-200/60 px-1.5 py-0.5 rounded flex items-center gap-1 font-medium">
                          <FileAudio className="w-3 h-3 text-purple-600" />
                          MP3 <span className="font-num">{formatBytes(gen.mp3Size)}</span> (<span className="font-num">-{gen.compressionRatio || 80}%</span>)
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      "{gen.text}"
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    {gen.audioUrl && (
                      <audio 
                        src={gen.mp3Url || localMp3Urls[gen.id] || gen.audioUrl} 
                        controls 
                        className="h-8 max-w-[180px] accent-purple-600" 
                      />
                    )}

                    {/* Secondary WAV download */}
                    {gen.audioUrl && (
                      <a
                        id={`btn-download-wav-${gen.id}`}
                        href={gen.audioUrl}
                        download={`sawtify_${gen.id}.wav`}
                        className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                        title={t.downloadWav}
                      >
                        <span className="text-[11px] font-mono font-medium">WAV</span>
                      </a>
                    )}

                    {/* Primary MP3 download with ffmpeg.wasm */}
                    <button
                      id={`btn-download-mp3-${gen.id}`}
                      onClick={() => handleDownloadMp3(gen)}
                      disabled={isConverting}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs disabled:opacity-50"
                      title={t.downloadMp3}
                    >
                      {isConverting ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      <span>MP3</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
