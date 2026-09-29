import React, { useState, useEffect, useMemo } from 'react';
import { GenerationRecord, PurchaseRecord } from '../types';
import { Download, Clock, ArrowRight, Radio, FileAudio, RefreshCw, AlertCircle, Clapperboard, Lock, Link2, Copy, Check, Search, ClipboardCopy, X } from 'lucide-react';
import { convertWavToMp3, formatBytes } from '../utils/audioConverter';
import { useLanguage } from '../context/LanguageContext';

interface HistoryListProps {
  generations: GenerationRecord[];
  purchases: PurchaseRecord[];
  balance: number;
  onNavigateToStudio: () => void;
  onNavigateToEditVideo: () => void;
  /** « Réutiliser dans le studio » : renvoie le texte à pré-remplir dans l'éditeur. */
  onReuseText?: (text: string) => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({
  generations,
  purchases,
  balance,
  onNavigateToStudio,
  onNavigateToEditVideo,
  onReuseText,
}) => {
  const { t, isRTL, language } = useLanguage();
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [localMp3Urls, setLocalMp3Urls] = useState<Record<string, string>>({});
  const [conversionErrorId, setConversionErrorId] = useState<string | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  // Recherche par mots-clés + filtre par nom de voix.
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [voiceFilter, setVoiceFilter] = useState<string>('');

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

  const canAccessMontage = balance > 1000;
  const publicAudioUrl = (id: string) => `https://sawtify.space/audio/${id}`;
  const copyPublicAudioUrl = async (id: string) => {
    try {
      await navigator.clipboard.writeText(publicAudioUrl(id));
      setCopiedLinkId(id);
      window.setTimeout(() => setCopiedLinkId((current) => current === id ? null : current), 1800);
    } catch { setCopiedLinkId(null); }
  };

  // Noms de voix uniques pour le filtre (ex. : « afficher seulement Amine »).
  const voiceNames = useMemo(
    () => Array.from(new Set(generations.map((g) => g.voiceName).filter(Boolean))),
    [generations]
  );
  const query = searchQuery.trim().toLowerCase();
  const filteredGenerations = useMemo(
    () => generations.filter((g) => {
      if (voiceFilter && g.voiceName !== voiceFilter) return false;
      if (!query) return true;
      return (g.text || '').toLowerCase().includes(query) || (g.voiceName || '').toLowerCase().includes(query);
    }),
    [generations, voiceFilter, query]
  );

  return (
    <div className="max-w-4xl mx-auto space-y-4 animate-in fade-in">
      
      <div className="flex flex-col gap-3 px-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-800">
            {t.historyHeader}
          </h2>
          <span className="text-xs font-mono text-slate-400">
            ({filteredGenerations.length}{filteredGenerations.length !== generations.length ? ` / ${generations.length}` : ''})
          </span>
        </div>

        {generations.length > 0 && (
          <div className="flex items-center gap-2">
            {/* Recherche par mots-clés dans les textes / noms de voix */}
            <div className="relative min-w-0 flex-1 sm:flex-none">
              <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'ar' ? 'ابحث في النصوص أو الأصوات…' : 'Rechercher un texte ou une voix…'}
                className="w-full sm:w-56 rounded-xl border border-slate-200 bg-white py-2 ps-8 pe-8 text-xs text-slate-800 outline-none transition focus:border-purple-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label={language === 'ar' ? 'مسح البحث' : 'Effacer la recherche'}
                  className="absolute end-1.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            {/* Filtre par nom de voix (ex. : seulement « أمينة » ou « عمر ») */}
            <select
              value={voiceFilter}
              onChange={(e) => setVoiceFilter(e.target.value)}
              aria-label={language === 'ar' ? 'تصفية حسب الصوت' : 'Filtrer par voix'}
              className="max-w-[9.5rem] rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-purple-400"
            >
              <option value="">{language === 'ar' ? 'كل الأصوات' : 'Toutes les voix'}</option>
              {voiceNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 via-white to-fuchsia-50 p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white shadow-sm"><Clapperboard className="h-5 w-5" /></div>
            <div><p className="text-sm font-black text-slate-900">Montage vidéo automatique</p><p className="text-xs text-slate-500">Utilise une voix Sawtify et son script pour créer une vidéo en un clic.</p></div>
          </div>
          <button type="button" disabled className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-200 px-4 py-2.5 text-xs font-extrabold text-slate-500 opacity-70 shadow-sm blur-[0.2px]">
            <Lock className="h-3.5 w-3.5" /> Prochainement
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs">
        {purchases.length > 0 && <section className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4"><div className="flex items-center justify-between gap-2"><h3 className="text-sm font-extrabold text-emerald-900">Paiements et recharges</h3><span className="text-xs font-bold text-emerald-700">{purchases.length}</span></div><div className="mt-3 space-y-2">{purchases.map((purchase) => <div key={purchase.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/80 px-3 py-2.5 text-xs"><div><p className="font-bold text-slate-900">{purchase.packName}</p><p className="text-slate-500">{new Date(purchase.createdAt).toLocaleString(language === 'ar' ? 'ar-DZ' : 'fr-FR')} · {purchase.paymentMethod.toUpperCase()}</p></div><div className="text-right"><p className="font-black text-emerald-700">+{purchase.pointsCredited} points</p><p className="text-slate-500">{purchase.amountDZD.toLocaleString()} DZD · {purchase.status === 'paid' ? 'Confirmé' : purchase.status}</p></div></div>)}</div></section>}
        {generations.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto border border-slate-200">
              <Radio className="w-5 h-5" />
            </div>
            <p className="text-xs text-slate-500">
              {purchases.length > 0 ? 'Aucune génération vocale pour le moment.' : t.emptyHistoryTitle}
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
        ) : filteredGenerations.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto border border-slate-200">
              <Search className="w-5 h-5" />
            </div>
            <p className="text-xs text-slate-500">
              {language === 'ar' ? 'لا نتائج لهذا البحث.' : 'Aucun résultat pour cette recherche.'}
            </p>
            <button
              onClick={() => { setSearchQuery(''); setVoiceFilter(''); }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'إعادة تعيين' : 'Réinitialiser'}</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredGenerations.map((gen) => {
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
                    {/* Réutiliser dans le studio : pré-remplit l'éditeur avec ce texte. */}
                    {onReuseText && (
                      <button
                        type="button"
                        onClick={() => onReuseText(gen.text)}
                        className="flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 transition hover:bg-purple-100 cursor-pointer"
                        title={language === 'ar' ? 'إعادة الاستخدام في الاستوديو' : 'Réutiliser dans le studio'}
                      >
                        <ClipboardCopy className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{language === 'ar' ? 'إعادة الاستخدام' : 'Réutiliser'}</span>
                      </button>
                    )}
                    <button type="button" disabled className="flex cursor-not-allowed items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-400 opacity-70 shadow-xs" title="Montage vidéo — Prochainement">
                      <Lock className="h-3.5 w-3.5" />
                      <span>Prochainement</span>
                    </button>
                    {/* 🛠️ FIX 5 : Largeur adaptée du player audio (w-full sm:w-52) */}
                    {gen.audioUrl && (
                      <audio 
                        src={gen.mp3Url || localMp3Urls[gen.id] || gen.audioUrl} 
                        controls 
                        className="h-8 w-full sm:w-52 accent-purple-600 rounded-lg" 
                      />
                    )}

                    {gen.audioUrl && (
                      <div className="flex items-center gap-1">
                        <a href={publicAudioUrl(gen.id)} target="_blank" rel="noreferrer" className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-purple-700" title="Ouvrir le lien audio Sawtify">
                          <Link2 className="h-4 w-4" />
                        </a>
                        <button type="button" onClick={() => void copyPublicAudioUrl(gen.id)} className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-purple-700" title="Copier le lien audio Sawtify">
                          {copiedLinkId === gen.id ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
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
