import React, { useMemo, useState } from 'react';
import {
  AlertCircle, CheckCircle2, Clapperboard, Coins, Download, Film, Image as ImageIcon,
  Loader2, Mic2, Play, Sparkles, Trash2, Type, UploadCloud, Wand2, Zap,
} from 'lucide-react';
import { GenerationRecord } from '../types';
import { getMyAccessToken } from '../services/supabaseClient';
import { API_BASE_URL } from '../config/apiBase';

interface Props {
  balance: number;
  recentGenerations?: GenerationRecord[];
  onOpenRecharge: () => void;
}

type Uploaded = { id: string; name: string; url: string; kind: 'video' | 'image' };

const CAPTION_FONTS = ['Cairo','Tajawal','Changa','Almarai','Noto Sans Arabic','Noto Kufi Arabic','IBM Plex Sans Arabic','Readex Pro','Alexandria','El Messiri','Inter','Poppins','Montserrat','Oswald','Bebas Neue','Anton','Barlow Condensed','Archivo Black','Raleway','Sora'];
const CAPTION_STYLES = ['Bold','Boxed','Shadow','Outline','Karaoke','Minimal','Neon','Bubble','Lower Third','Center','Top','Impact','Clean','Marker','Glow','Split','Rounded','News','Reel','Cinema'];
const CAPTION_THEMES = ['White','Yellow','Cyan','Pink','Lime','Orange','Blue','Red','Purple','Gold','Mint','Sky','Coral','Violet','Cream','Electric','Rose','Aqua','Sun','Mono'];

const THEME_COLORS: Record<string, string> = {
  White: '#ffffff', Yellow: '#fde047', Cyan: '#22d3ee', Pink: '#f472b6', Lime: '#84cc16',
  Orange: '#fb923c', Blue: '#60a5fa', Red: '#f87171', Purple: '#c084fc', Gold: '#facc15',
  Mint: '#6ee7b7', Sky: '#7dd3fc', Coral: '#fb7185', Violet: '#a78bfa', Cream: '#fef3c7',
  Electric: '#22d3ee', Rose: '#fb7185', Aqua: '#67e8f9', Sun: '#fbbf24', Mono: '#e2e8f0',
};

/* Rendu réaliste du style dans le téléphone */
const captionCss = (style: string, color: string): React.CSSProperties => {
  switch (style) {
    case 'Boxed': return { color, background: 'rgba(15,23,42,.82)', borderRadius: 12, padding: '.3em .55em' };
    case 'Bubble': return { color, background: 'rgba(15,23,42,.82)', borderRadius: 999, padding: '.3em .85em' };
    case 'Rounded': return { color, background: 'rgba(15,23,42,.75)', borderRadius: 16, padding: '.3em .6em' };
    case 'Lower Third': return { color, background: 'linear-gradient(90deg, rgba(15,23,42,.95), rgba(15,23,42,.35))', borderRadius: 8, padding: '.3em .7em', textAlign: 'left' };
    case 'News': return { color, background: 'rgba(15,23,42,.92)', borderLeft: `4px solid ${color}`, borderRadius: 6, padding: '.3em .55em', textAlign: 'left' };
    case 'Shadow': return { color, textShadow: '0 3px 10px rgba(0,0,0,.95)' };
    case 'Neon': return { color, textShadow: `0 0 6px ${color}, 0 0 18px ${color}` };
    case 'Glow': return { color, textShadow: `0 0 14px ${color}` };
    case 'Outline': return { color, WebkitTextStroke: '1px #0f172a' };
    case 'Impact': return { color, WebkitTextStroke: '1.2px #0f172a', textTransform: 'uppercase', letterSpacing: '-.02em' };
    case 'Cinema': return { color, letterSpacing: '.15em', textTransform: 'uppercase', textShadow: '0 2px 8px rgba(0,0,0,.9)' };
    case 'Minimal': return { color, fontWeight: 700 };
    default: return { color, textShadow: '0 2px 4px rgba(0,0,0,.85)' };
  }
};

/* Effet léger sur les pastilles du sélecteur (fond clair) */
const chipEffect = (style: string): React.CSSProperties => {
  if (['Boxed','Bubble','Rounded','News','Lower Third'].includes(style)) return { background: 'rgba(15,23,42,.9)', color: '#fff', borderColor: 'transparent' };
  if (['Shadow','Glow','Neon','Karaoke','Reel'].includes(style)) return { textShadow: '1px 2px 2px rgba(100,116,139,.9)' };
  if (['Outline','Impact','Cinema'].includes(style)) return { WebkitTextStroke: '.4px #0f172a' };
  return {};
};

const StepBadge: React.FC<{ n: number }> = ({ n }) => (
  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-fuchsia-600 text-[11px] font-black text-white shadow-sm shadow-purple-300">{n}</span>
);

export const EditVideoPage: React.FC<Props> = ({ balance, recentGenerations = [], onOpenRecharge }) => {
  const [script, setScript] = useState(recentGenerations[0]?.text || '');
  const [audioUrl, setAudioUrl] = useState(recentGenerations[0]?.audioUrl || '');
  const [videos, setVideos] = useState<Uploaded[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState('');
  const [resultUrl, setResultUrl] = useState('');
  const [captionFont, setCaptionFont] = useState('Cairo');
  const [captionStyle, setCaptionStyle] = useState('Bold');
  const [captionTheme, setCaptionTheme] = useState('White');
  const [captionSize, setCaptionSize] = useState(48);

  const canAccess = balance > 1000;
  const selectedVoice = useMemo(
    () => recentGenerations.find((generation) => generation.audioUrl === audioUrl) || recentGenerations[0],
    [audioUrl, recentGenerations],
  );

  const voiceReady = Boolean(audioUrl) && script.trim().length > 0;
  const mediaReady = videos.length > 0;
  const previewText = script.replace(/\[[^\]]+\]/g, '').trim() || 'واش راك؟\nMontage vidéo';
  const previewColor = THEME_COLORS[captionTheme] || '#ffffff';
  const wordCount = script.trim() ? script.trim().split(/\s+/).length : 0;

  const uploadVideo = async (file: File) => {
    if (!file.type.startsWith('video/') && !file.type.startsWith('image/')) return;
    const token = await getMyAccessToken();
    const uploadUrl = `${API_BASE_URL}/api/video/upload?filename=${encodeURIComponent(file.name)}&filetype=${encodeURIComponent(file.type)}`;
    const response = await fetch(uploadUrl, { method: 'POST', headers: { Authorization: `Bearer ${token || ''}`, 'Content-Type': 'application/octet-stream' }, body: file });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Upload impossible.');
    setVideos((current) => [...current, data]);
  };

  const handleFiles = async (fileList: FileList | File[] | null) => {
    const files = Array.from(fileList || []).filter((file) => file.type.startsWith('video/') || file.type.startsWith('image/'));
    if (files.length === 0) { setMessage('Formats acceptés : MP4, MOV, WEBM, PNG, JPG.'); return; }
    setUploading(true);
    try {
      await Promise.all(files.map((file) => uploadVideo(file)));
      setMessage(`${files.length} média${files.length > 1 ? 's' : ''} ajouté${files.length > 1 ? 's' : ''} au montage.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Upload impossible.');
    } finally {
      setUploading(false);
    }
  };

  const removeVideo = (id: string) => setVideos((current) => current.filter((video) => video.id !== id));

  const makeVideo = async () => {
    if (!canAccess) { onOpenRecharge(); return; }
    if (!voiceReady || !mediaReady) { setMessage('Ajoute une voix Sawtify, le script et au moins une vidéo.'); return; }
    setBusy(true); setMessage('Montage vidéo en cours…'); setResultUrl('');
    try {
      const token = await getMyAccessToken();
      const response = await fetch(`${API_BASE_URL}/api/video/render`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token || ''}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ script, audioUrl, videos, captionFont, captionStyle: captionStyle.toLowerCase().replace(/\s+/g, '-'), captionTheme: captionTheme.toLowerCase(), captionSize }),
        signal: AbortSignal.timeout(110000),
      });
      if (!response.ok) {
        const raw = await response.text().catch(() => '');
        let errorMessage = raw;
        try { errorMessage = JSON.parse(raw)?.error || raw; } catch { /* réponse proxy non JSON */ }
        throw new Error(errorMessage || `Rendu vidéo impossible (HTTP ${response.status}).`);
      }
      const job = await response.json();
      if (!job.jobId) throw new Error('Le serveur n’a pas créé la tâche de montage.');
      let transientFailures = 0;
      for (let attempt = 0; attempt < 180; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        let statusResponse: Response;
        try {
          statusResponse = await fetch(`${API_BASE_URL}/api/video/render/${encodeURIComponent(job.jobId)}`, { headers: { Authorization: `Bearer ${token || ''}` }, signal: AbortSignal.timeout(15000) });
        } catch {
          transientFailures += 1;
          if (transientFailures >= 8) throw new Error('Render redémarre pendant le rendu. Réessaie avec une vidéo plus courte ou plus légère.');
          setMessage('Render redémarre… reprise automatique du suivi.');
          continue;
        }
        if ([502, 503, 504].includes(statusResponse.status)) {
          transientFailures += 1;
          if (transientFailures >= 8) throw new Error('Render redémarre pendant le rendu. Réessaie avec une vidéo plus courte ou plus légère.');
          setMessage('Render redémarre… reprise automatique du suivi.');
          continue;
        }
        transientFailures = 0;
        const status = await statusResponse.json().catch(() => ({}));
        if (!statusResponse.ok) throw new Error(status.error || `Statut du montage indisponible (HTTP ${statusResponse.status}).`);
        if (status.status === 'failed') throw new Error(status.error || 'Rendu vidéo impossible.');
        if (status.status === 'ready') {
          const downloadResponse = await fetch(`${API_BASE_URL}${status.downloadUrl}`, { headers: { Authorization: `Bearer ${token || ''}` }, signal: AbortSignal.timeout(60000) });
          if (!downloadResponse.ok) throw new Error('La vidéo est prête mais son téléchargement a échoué.');
          setResultUrl(URL.createObjectURL(await downloadResponse.blob()));
          setMessage(`Montage terminé. ${status.cost || job.cost} points ont été débités.`);
          break;
        }
        setMessage(`Montage en cours… ${status.status === 'queued' ? 'dans la file' : 'rendu FFmpeg'}`);
        if (attempt === 179) throw new Error('Le rendu prend trop de temps. Réessaie dans quelques instants.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Montage impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl animate-in fade-in">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-[#21114d] via-purple-700 to-fuchsia-600 p-5 text-white shadow-xl">
        <span className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-fuchsia-400/25 blur-3xl" aria-hidden />
        <span className="absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-purple-300/20 blur-3xl" aria-hidden />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25"><Clapperboard className="h-6 w-6" /></div>
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[.25em] text-purple-200">Sawtify Video <Sparkles className="h-3 w-3" /></div>
              <h1 className="text-xl font-black leading-tight sm:text-2xl">Montage vidéo automatique</h1>
              <p className="mt-0.5 hidden text-xs text-purple-100 sm:block">Ta voix, ton script, tes rushs — tout se monte ici, en un clic.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5">
              <Coins className="h-4 w-4 text-yellow-300" /><strong className="text-sm">{balance}</strong><span className="text-[11px] text-purple-100">points</span>
            </div>
            {!canAccess && (
              <button type="button" onClick={onOpenRecharge} className="rounded-2xl bg-white px-4 py-2.5 text-xs font-black text-purple-700 shadow transition hover:bg-purple-50">Recharger</button>
            )}
          </div>
        </div>
      </header>

      {!canAccess && (
        <button type="button" onClick={onOpenRecharge} className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm font-bold text-amber-900 transition hover:bg-amber-100">
          <Zap className="h-4 w-4 shrink-0" />
          <span>Il faut plus de 1000 points pour accéder au montage.</span>
          <span className="ml-auto shrink-0 underline">Recharger →</span>
        </button>
      )}

      {/* ── Espace de travail ────────────────────────────────────────── */}
      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">

        {/* Aperçu live (en haut sur mobile, colonne droite sticky sur desktop) */}
        <aside className="self-start lg:order-2 lg:sticky lg:top-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wide text-slate-700">Aperçu 9:16</span>
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-600">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> LIVE
              </span>
            </div>

            <div className="relative mx-auto w-[216px]">
              <div className="relative aspect-[9/16] overflow-hidden rounded-[30px] border-[5px] border-slate-900 bg-gradient-to-br from-[#21114d] via-purple-700 to-fuchsia-500 shadow-2xl ring-1 ring-white/10">
                <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(circle at 72% 20%, #fff 0 2%, transparent 22%), linear-gradient(145deg, transparent 42%, rgba(0,0,0,.5))' }} />
                <div className="absolute left-1/2 top-2 h-4 w-14 -translate-x-1/2 rounded-full bg-slate-900" />
                <span className="absolute left-2.5 top-3.5 rounded-full bg-black/40 px-2 py-0.5 text-[8px] font-black tracking-widest text-white">SAWTIFY</span>
                <div className="absolute inset-x-3 top-8 flex gap-1">
                  {Array.from({ length: 12 }).map((_, index) => <span key={index} className="h-0.5 flex-1 rounded bg-white/25" />)}
                </div>

                <div className="absolute inset-0 grid place-items-center">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-black/35 ring-1 ring-white/30 backdrop-blur-sm"><Play className="h-5 w-5 fill-white text-white" /></span>
                </div>

                <div className={`absolute inset-x-3 text-center ${captionStyle === 'Top' ? 'top-[12%]' : captionStyle === 'Center' ? 'top-1/2 -translate-y-1/2' : 'bottom-[14%]'}`} dir="auto">
                  <span
                    className="inline-block max-w-full font-black leading-snug"
                    style={{
                      fontFamily: `'${captionFont}', sans-serif`,
                      fontSize: `${Math.max(11, Math.round(captionSize / 3))}px`,
                      whiteSpace: 'pre-line',
                      maxHeight: '4.2em',
                      overflow: 'hidden',
                      ...captionCss(captionStyle, previewColor),
                    }}
                  >
                    {previewText}
                  </span>
                </div>

                <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-end gap-1">
                  {[10, 16, 8, 14, 6].map((height, index) => (
                    <span key={index} className="w-1 animate-pulse rounded-full bg-white/70" style={{ height, animationDelay: `${index * 160}ms` }} />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 text-[10px] font-bold">
              <span className="max-w-full truncate rounded-full bg-purple-50 px-2 py-1 text-purple-700">{captionFont}</span>
              <span className="rounded-full bg-fuchsia-50 px-2 py-1 text-fuchsia-700">{captionStyle}</span>
              <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-slate-600"><span className="h-2 w-2 rounded-full border border-black/10" style={{ backgroundColor: previewColor }} />{captionTheme}</span>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">{captionSize}px</span>
            </div>
          </div>
        </aside>

        {/* Étapes 1 → 2 → 3 */}
        <div className="min-w-0 space-y-5 lg:order-1">

          <div className="grid gap-5 md:grid-cols-2">

            {/* 1 · Voix & script */}
            <section className="flex flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <StepBadge n={1} /><Mic2 className="h-4 w-4 text-purple-600" />
                <h2 className="text-sm font-black text-slate-900">Voix & script</h2>
                {voiceReady && <CheckCircle2 className="ml-auto h-4 w-4 text-emerald-500" />}
              </div>

              {recentGenerations.length > 0 ? (
                <>
                  <label htmlFor="voice-select" className="text-[11px] font-black uppercase tracking-wide text-slate-400">Voix de l'historique</label>
                  <select
                    id="voice-select"
                    value={audioUrl}
                    onChange={(event) => {
                      setAudioUrl(event.target.value);
                      const voice = recentGenerations.find((item) => item.audioUrl === event.target.value);
                      if (voice) setScript(voice.text);
                    }}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-purple-500 focus:bg-white"
                  >
                    <option value="">Choisir une voix…</option>
                    {recentGenerations.filter((item) => item.audioUrl).map((item) => (
                      <option key={item.id} value={item.audioUrl}>{item.voiceName} · {new Date(item.createdAt).toLocaleTimeString()}</option>
                    ))}
                  </select>
                  {selectedVoice?.audioUrl && <audio src={selectedVoice.audioUrl} controls className="mt-2.5 h-9 w-full" />}
                </>
              ) : (
                <div className="flex items-start gap-2.5 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
                  <Mic2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  Aucune voix pour l'instant : génère une voix Sawtify, elle apparaîtra ici automatiquement.
                </div>
              )}

              <label htmlFor="script-input" className="mt-3 text-[11px] font-black uppercase tracking-wide text-slate-400">Script (pilote les captions)</label>
              <textarea
                id="script-input"
                value={script}
                onChange={(event) => setScript(event.target.value)}
                placeholder="Le script Sawtify apparaîtra ici…"
                className="mt-1.5 min-h-[120px] w-full flex-1 resize-y rounded-xl border border-slate-200 p-3 text-sm outline-none transition focus:border-purple-500"
                dir="auto"
              />
              <div className="mt-1.5 flex items-center justify-between text-[10px] font-bold text-slate-400">
                <span>{wordCount} mot{wordCount > 1 ? 's' : ''}</span>
                <span>Les [crochets] sont ignorés</span>
              </div>
            </section>

            {/* 2 · Rushs vidéo */}
            <section className="flex flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <StepBadge n={2} /><Film className="h-4 w-4 text-purple-600" />
                <h2 className="text-sm font-black text-slate-900">Rushs vidéo</h2>
                {mediaReady
                  ? <span className="ml-auto rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-600">{videos.length} média{videos.length > 1 ? 's' : ''}</span>
                  : <span className="ml-auto h-4 w-4 rounded-full border-2 border-slate-200" />}
              </div>

              <div
                onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => { event.preventDefault(); setDragging(false); void handleFiles(event.dataTransfer.files); }}
                className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-5 text-center transition ${dragging ? 'scale-[.99] border-purple-500 bg-purple-100' : 'border-purple-200 bg-purple-50/40 hover:border-purple-400 hover:bg-purple-50'}`}
              >
                <label className={`inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black text-white shadow transition ${uploading ? 'cursor-wait bg-slate-400' : 'bg-purple-600 shadow-purple-200 hover:bg-purple-500'}`}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                  {uploading ? 'Upload en cours…' : 'Ajouter des médias'}
                  <input
                    type="file"
                    multiple
                    accept="video/*,image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(event) => { const files = Array.from(event.target.files || []); void handleFiles(files); event.target.value = ''; }}
                  />
                </label>
                <p className="text-[10px] font-semibold text-slate-500">Glisser-déposer ou cliquer · MP4, MOV, WEBM, PNG, JPG</p>
              </div>

              <div className="mt-3 min-h-[52px] flex-1 space-y-1.5 overflow-y-auto lg:max-h-[148px]">
                {videos.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-[11px] font-semibold text-slate-400">Aucun média ajouté pour l'instant</p>
                ) : videos.map((video, index) => (
                  <div key={video.id} className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 transition hover:border-purple-200 hover:bg-purple-50/50">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-[10px] font-black text-purple-700">{index + 1}</span>
                    {video.kind === 'image' ? <ImageIcon className="h-4 w-4 shrink-0 text-slate-400" /> : <Film className="h-4 w-4 shrink-0 text-slate-400" />}
                    <span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-700">{video.name}</span>
                    <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-black text-emerald-600">PRÊT</span>
                    <button type="button" aria-label={`Retirer ${video.name}`} onClick={() => removeVideo(video.id)} className="shrink-0 rounded-lg p-1.5 text-slate-300 transition hover:bg-red-50 hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* 3 · Style des captions */}
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <StepBadge n={3} /><Type className="h-4 w-4 text-purple-600" />
              <h2 className="text-sm font-black text-slate-900">Style des captions</h2>
              <span className="ml-auto text-[10px] font-bold text-slate-400">Aperçu instantané dans le téléphone</span>
            </div>

            <div className="mb-2 text-[11px] font-black uppercase tracking-wide text-slate-400">Style</div>
            <div className="mb-5 flex flex-wrap gap-1.5">
              {CAPTION_STYLES.map((style) => {
                const active = captionStyle === style;
                return (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setCaptionStyle(style)}
                    style={active ? undefined : chipEffect(style)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 transition ${active ? 'border-purple-600 bg-purple-600 text-white shadow-sm shadow-purple-300' : 'border-slate-200 bg-white text-slate-700 hover:border-purple-400 hover:text-purple-700'}`}
                  >
                    <span dir="auto" className="text-xs font-black">واش راك؟</span>
                    <span className={`text-[9px] font-bold ${active ? 'text-purple-100' : 'opacity-50'}`}>{style}</span>
                  </button>
                );
              })}
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <div className="mb-2 text-[11px] font-black uppercase tracking-wide text-slate-400">Police</div>
                <div className="grid max-h-44 grid-cols-2 gap-1.5 overflow-y-auto pr-1">
                  {CAPTION_FONTS.map((font) => (
                    <button
                      key={font}
                      type="button"
                      onClick={() => setCaptionFont(font)}
                      className={`rounded-xl border px-2.5 py-1.5 text-left transition ${captionFont === font ? 'border-purple-600 bg-purple-50 ring-1 ring-purple-300' : 'border-slate-200 hover:border-purple-300'}`}
                    >
                      <span className="block truncate text-[9px] font-bold text-slate-400">{font}</span>
                      <span className="block truncate text-sm font-bold text-slate-800" style={{ fontFamily: `'${font}', sans-serif` }}>واش راك؟</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 text-[11px] font-black uppercase tracking-wide text-slate-400">Thème</div>
                <div className="grid grid-cols-5 gap-1.5">
                  {CAPTION_THEMES.map((theme) => {
                    const color = THEME_COLORS[theme] || '#ffffff';
                    const active = captionTheme === theme;
                    return (
                      <button
                        key={theme}
                        type="button"
                        title={theme}
                        onClick={() => setCaptionTheme(theme)}
                        className={`flex flex-col items-center gap-1 rounded-xl border p-1.5 transition ${active ? 'border-purple-600 bg-purple-50' : 'border-slate-200 hover:border-purple-300'}`}
                      >
                        <span className={`h-6 w-6 rounded-full border border-black/10 ${active ? 'ring-2 ring-purple-500 ring-offset-1' : ''}`} style={{ backgroundColor: color }} />
                        <span className="w-full truncate text-center text-[8px] font-bold text-slate-500">{theme}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
              <Type className="h-4 w-4 shrink-0 text-purple-600" />
              <span className="hidden w-24 shrink-0 text-[11px] font-black uppercase tracking-wide text-slate-500 sm:block">Taille</span>
              <input type="range" min="24" max="76" step="2" value={captionSize} onChange={(event) => setCaptionSize(Number(event.target.value))} className="w-full accent-purple-600" />
              <span className="w-14 shrink-0 rounded-full bg-purple-100 text-center text-[10px] font-black text-purple-700">{captionSize}px</span>
            </div>
          </section>

          {/* Résultat */}
          {resultUrl && (
            <section className="animate-in fade-in slide-in-from-bottom-2 rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-black text-emerald-900"><CheckCircle2 className="h-5 w-5" /> Ton montage est prêt 🎉</div>
                <a href={resultUrl} download="sawtify-montage.mp4" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white shadow transition hover:bg-emerald-500">
                  <Download className="h-4 w-4" /> Télécharger le MP4
                </a>
              </div>
              <video src={resultUrl} controls className="mx-auto mt-4 max-h-[60vh] w-full max-w-xs rounded-2xl bg-black" />
            </section>
          )}
        </div>
      </div>

      {/* ── Barre d'action flottante — toujours visible ──────────────── */}
      <div className="sticky bottom-0 z-40 mt-6">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 p-3 shadow-2xl shadow-slate-900/15 backdrop-blur-xl">
          {busy && <span className="absolute inset-x-0 top-0 h-1 animate-pulse bg-gradient-to-r from-purple-500 via-fuchsia-500 to-purple-500" aria-hidden />}

          <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center">
            {/* État / checklist */}
            <div className="min-w-0 flex-1">
              {busy ? (
                <p className="flex items-center gap-2 text-xs font-bold text-purple-700">
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" /><span className="truncate">{message || 'Montage en cours…'}</span>
                </p>
              ) : message ? (
                <p className={`flex items-center gap-2 text-xs font-bold ${resultUrl ? 'text-emerald-700' : 'text-slate-600'}`}>
                  {resultUrl ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />}
                  <span className="truncate">{message}</span>
                </p>
              ) : (
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { label: 'Voix + script', ok: voiceReady },
                    { label: `Rushs${videos.length ? ` · ${videos.length}` : ''}`, ok: mediaReady },
                    { label: 'Style captions', ok: true },
                  ].map((item) => (
                    <span key={item.label} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black ${item.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                      {item.ok ? <CheckCircle2 className="h-3 w-3" /> : <span className="h-3 w-3 rounded-full border-2 border-current opacity-40" />}
                      {item.label}
                    </span>
                  ))}
                  <span className="ml-1 hidden text-[11px] font-bold text-slate-400 sm:inline">70 points / minute</span>
                </div>
              )}
            </div>

            {/* Gros bouton CTA */}
            <div className="relative shrink-0 sm:w-72 lg:w-80">
              {!busy && !uploading && (
                <span className="absolute -inset-1 animate-pulse rounded-3xl bg-gradient-to-r from-purple-600 to-fuchsia-500 opacity-40 blur-md" aria-hidden />
              )}
              <button
                type="button"
                disabled={busy || uploading}
                onClick={() => void makeVideo()}
                className="group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-500 to-purple-600 px-6 py-4 text-base font-black text-white shadow-lg shadow-purple-500/40 transition hover:shadow-xl hover:shadow-purple-500/50 active:scale-[.98] disabled:cursor-wait disabled:opacity-70"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" aria-hidden />
                {busy || uploading
                  ? <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
                  : canAccess ? <Wand2 className="h-5 w-5 shrink-0" /> : <Coins className="h-5 w-5 shrink-0" />}
                <span className="truncate">{busy ? 'Montage en cours…' : uploading ? 'Upload…' : canAccess ? 'Lancer le montage' : 'Recharger les points'}</span>
                {!busy && !uploading && canAccess && <span className="shrink-0 rounded-full bg-black/20 px-2 py-0.5 text-[10px] font-bold">70 pts/min</span>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
