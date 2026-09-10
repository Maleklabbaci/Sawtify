import React, { useState, useEffect } from 'react';
import { GenerationRecord } from '../types';
import { Download, Clock, ArrowRight, Radio, FileAudio, RefreshCw, AlertCircle } from 'lucide-react';
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
  const { t, isRTL, language } = useLanguage();
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [localMp3Urls, setLocalMp3Urls] = useState<Record<string, string>>({});
  const [conversionErrorId, setConversionErrorId] = useState<string | null>(null);

  // 🛠️ FIX 1 : Nettoyage de la mémoire RAM (revokeObjectURL) au démontage
  useEffect(() => {
    return () => {
      (Object.values(localMp3Urls) as string[]).forEach((url) => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [localMp3Urls]);

  // 🛠️ FIX 2 : Fonction de téléchargement sécurisée compatible tous navigateurs
  const triggerDownload = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a); // Requis pour Firefox & Safari
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadMp3 = async (gen: GenerationRecord) => {
    setConversionErrorId(null);

    // Si le MP3 existe déjà (serveur ou conversion précédente)
    const existingUrl = gen.mp3Url || localMp3Urls[gen.id];
    if (existingUrl) {
      triggerDownload(existingUrl, `sawtify_${gen.voiceId}_${gen.id}.mp3`);
      return;
    }

    if (!gen.wavBlob && !gen.audioUrl) return;

    try {
      setConvertingId(gen.id);
      let blob = gen.wavBlob;

      // Récupération du Blob si seule l'URL est disponible
      if (!blob && gen.audioUrl) {
        const res = await fetch(gen.audioUrl);
        if (!res.ok) throw new Error('Impossible de charger le fichier audio');
        blob = await res.blob();
      }

      if (blob) {
        const conv = await convertWavToMp3(blob);
        setLocalMp3Urls((prev) => ({ ...prev, [gen.id]: conv.mp3Url }));
        triggerDownload(conv.mp3Url, `sawtify_${gen.voiceId}_${gen.id}.mp3`);
      }
    } catch (e) {
      console.error('Erreur conversion historique MP3:', e);
      // 🛠️ FIX 4 : Signalement visuel de l'erreur
      setConversionErrorId(gen.id);
      setTimeout(() => setConversionErrorId(null), 3000);
    } finally {
      setConvertingId(null);
    }
  };

  // 🛠️ FIX 3 : Formatage sécurisé de l'heure
  const formatTimeSafely = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '--:--';
      return date.toLocaleTimeString(language === 'ar' ? 'ar-DZ' : 'fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '--:--';
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
              const hasError = conversionErrorId === gen.id;

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
                        <span className="font-num">{formatTimeSafely(gen.createdAt)}</span>
                      </span>
                      <span className="text-[10px] text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded font-medium">
                        <span className="font-num font-bold">-{gen.pointsDeducted}</span> {t.pointsLabel}
                      </span>
                      {gen.durationSec !== undefined && gen.durationSec > 0 && (
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
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed" dir="auto">
                      "{gen.text}"
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
                    {/* 🛠️ FIX 5 : Largeur adaptée du player audio (w-full sm:w-52) */}
                    {gen.audioUrl && (
                      <audio 
                        src={gen.mp3Url || localMp3Urls[gen.id] || gen.audioUrl} 
                        controls 
                        className="h-8 w-full sm:w-52 accent-purple-600 rounded-lg" 
                      />
                    )}

                    {/* Téléchargement WAV */}
                    {gen.audioUrl && (
                      <button
                        onClick={() => triggerDownload(gen.audioUrl!, `sawtify_${gen.id}.wav`)}
                        className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                        title={t.downloadWav}
                      >
                        <span className="text-[11px] font-mono font-medium">WAV</span>
                      </button>
                    )}

                    {/* Téléchargement MP3 */}
                    <button
                      id={`btn-download-mp3-${gen.id}`}
                      onClick={() => handleDownloadMp3(gen)}
                      disabled={isConverting}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs disabled:opacity-50 ${
                        hasError ? 'bg-red-600' : 'bg-purple-600 hover:bg-purple-500'
                      }`}
                      title={hasError ? 'Échec de conversion' : t.downloadMp3}
                    >
                      {isConverting ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : hasError ? (
                        <AlertCircle className="w-3.5 h-3.5" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      <span>{hasError ? 'Erreur' : 'MP3'}</span>
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
