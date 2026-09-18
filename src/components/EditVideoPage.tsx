import React, { useMemo, useState } from 'react';
import {
  CheckCircle2, Clapperboard, Coins, Download, Film, Image as ImageIcon,
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

/* Rendu réaliste du style choisi dans l'aperçu téléphone */
const captionPreviewStyle = (style: string, color: string): React.CSSProperties => {
  const base: React.CSSProperties = { color };
  switch (style) {
    case 'Boxed': return { ...base, background: 'rgba(15,23,42,.78)', borderRadius: 14, padding: '.35em .6em' };
    case 'Bubble': return { ...base, background: 'rgba(15,23,42,.78)', borderRadius: 999, padding: '.35em .9em' };
    case 'Rounded': return { ...base, background: 'rgba(15,23,42,.72)', borderRadius: 18, padding: '.35em .7em' };
    case 'Lower Third': return { ...base, background: 'linear-gradient(90deg, rgba(15,23,42,.92), rgba(15,23,42,.35))', borderRadius: 10, padding: '.3em .7em' };
    case 'News': return { ...base, background: 'rgba(15,23,42,.9)', borderLeft: `4px solid ${color}`, borderRadius: 8, padding: '.3em .6em' };
    case 'Shadow': case 'Reel': return { ...base, textShadow: '0 3px 10px rgba(0,0,0,.95)' };
    case 'Neon': return { ...base, textShadow: `0 0 6px ${color}, 0 0 20px ${color}` };
    case 'Glow': return { ...base, textShadow: `0 0 12px ${color}` };
    case 'Outline': return { ...base, WebkitTextStroke: '1px #0f172a' };
    case 'Impact': return { ...base, WebkitTextStroke: '1.2px #0f172a', textTransform: 'uppercase', letterSpacing: '-.02em' };
    case 'Cinema': return { ...base, letterSpacing: '.14em', textTransform: 'uppercase', textShadow: '0 2px 8px rgba(0,0,0,.9)' };
    default: return { ...base, textShadow: '0 2px 4px rgba(0,0,0,.85)' };
  }
};

/* Effet léger sur les pastilles de style (sélecteur) */
const stylePillEffect = (style: string): React.CSSProperties => {
  if (['Shadow','Glow','Neon','Karaoke','Reel'].includes(style)) return { textShadow: '1px 2px 2px rgba(148,163,184,.95)' };
  if (['Outline','Impact','Cinema'].includes(style)) return { WebkitTextStroke: '.4px #0f172a' };
  if (['Boxed','Bubble','Rounded','News','Lower Third'].includes(style)) return { background: 'rgba(15,23,42,.88)', borderColor: 'transparent', color: '#fff' };
  return {};
};

const StepBadge: React.FC<{ n: number }> = ({ n }) => (
  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-purple-600 text-[11px] font-black text-white shadow-sm shadow-purple-300">{n}</span>
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
    if (!script.trim() || !audioUrl || videos.length === 0) { setMessage('Ajoute une voix Sawtify, le script et au moins une vidéo.'); return; }
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

  const actionButton = (compact: boolean) => (
    <button
      type="button"
      disabled={busy || uploading}
      onClick={() => void makeVideo()}
      className={`flex items-center justify-center gap-2 rounded-2xl font-black text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-60 ${compact ? 'shrink-0 px-4 py-3 text-xs' : 'w-full px-4 py-3.5 text-sm'} ${canAccess ? 'bg-purple-600 shadow-purple-200 hover:bg-purple-500' : 'bg-amber-500 shadow-amber-200 hover:bg-amber-400'}`}
    >
      {busy ? <Loader2 className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} animate-spin`} /> : canAccess ? <Wand2 className={compact ? 'h-4 w-4' : 'h-5 w-5'} /> : <Coins className={compact ? 'h-4 w-4' : 'h-5 w-5'} />}
      <span className="truncate">{busy ? 'Montage…' : canAccess ? 'Lancer le montage' : 'Recharger les points'}</span>
      {!busy && !compact && canAccess && <span className="shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-[10px]">70 pts/min</span>}
    </button>
  );

  return (
    <div className="mx-auto w-full max-w-7xl animate-in fade-in">

      {/* ── Header compact ─────────────────────────────────────────── */}
      <header className="flex flex-col gap-3 rounded-3xl bg-gradient-to-r from-[#21114d] via-purple-700 to-fuchsia-600 p-4 text-white shadow-xl sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25"><Clapperboard className="h-5 w-5" /></div>
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[.22em] text-purple-200">Sawtify Video <Sparkles className="h-3 w-3" /></div>
            <h1 className="text-lg font-black leading-tight sm:text-xl">Montage vidéo automatique</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5">
            <Coins className="h-4 w-4 text-yellow-300" /><strong className="text-sm">{balance}</strong><span className="text-[11px] text-purple-100">points</span>
          </div>
          {!canAccess && <button type="button" onClick={onOpenRecharge} className="rounded-2xl bg-white px-4 py-2.5 text-xs font-black text-purple-700 transition hover:bg-purple-50">Recharger</button>}
        </div>
      </header>

      {!canAccess && (
        <button type="button" onClick={onOpenRecharge} className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm font-bold text-amber-900 transition hover:bg-amber-100">
          <Zap className="h-4 w-4 shrink-0" />
          <span>Il faut plus de 1000 points pour accéder au montage.</span>
          <span className="ml-auto shrink-0 underline">Recharger →</span>
        </button>
      )}

      {/* ── Espace de travail : aperçu sticky + réglages ───────────── */}
      <div className="mt-4 grid items-start gap-5 pb-28 lg:grid-cols-[320px_1fr] lg:pb-6">

        {/* Colonne gauche : aperçu live + CTA (toujours visibles) */}
        <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-black text-slate-700">Aperçu 9:16</span>
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-600">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> LIVE
            </span>
          </div>

          <div className="mx-auto w-[224px]">
            <div className="relative aspect-[9/16] overflow-hidden rounded-[28px] border-[5px] border-slate-900 bg-gradient-to-br from-[#21114d] via-purple-700 to-fuchsia-500 shadow-2xl ring-1 ring-white/10">
              <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(circle at 70% 22%, #fff 0 2%, transparent 20%), linear-gradient(145deg, transparent 40%, rgba(0,0,0,.45))' }} />
              <div className="absolute left-1/2 top-2 h-4 w-16 -translate-x-1/2 rounded-full bg-slate-900" />
              <div className="absolute inset-x-3 top-8 flex gap-1">
                {Array.from({ length: 14 }).map((_, index) => <span key={index} className="h-0.5 flex-1 rounded bg-white/25" />)}
              </div>
              <span className="absolute left-2.5 top-3 rounded-full bg-black/35 px-2 py-0.5 text-[8px] font-black tracking-widest text-white">SAWTIFY</span>

              <div className="absolute inset-0 grid place-items-center">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-black/35 ring-1 ring-white/30 backdrop-blur-sm">
                  <Play className="h-5 w-5 fill-white text-white" />
                </span>
              </div>

              <div className="absolute inset-x-3 bottom-[15%] text-center" dir="auto">
                <span
                  className="inline-block max-w-full font-black leading-snug"
                  style={{
                    fontFamily: `'${captionFont}', sans-serif`,
                    fontSize: `${Math.max(11, Math.round(captionSize / 3.1))}px`,
                    whiteSpace: 'pre-line',
                    maxHeight: '4.4em',
                    overflow: 'hidden',
                    ...captionPreviewStyle(captionStyle, previewColor),
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

          {/* Résumé du choix courant */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 text-[10px] font-bold">
            <span className="max-w-full truncate rounded-full bg-purple-50 px-2 py-1 text-purple-700">{captionFont}</span>
            <span className="rounded-full bg-fuchsia-50 px-2 py-1 text-fuchsia-700">{captionStyle}</span>
            <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-slate-600">
              <span className="h-2 w-2 rounded-full border border-black/10" style={{ backgroundColor: previewColor }} />{captionTheme}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">{captionSize}px</span>
          </div>

          {/* CTA desktop — toujours visible grâce au sticky */}
          <div className="mt-4 hidden lg:block">
            {actionButton(false)}
            {message && <div className="mt-3 rounded-2xl bg-slate-900 px-4 py-2.5 text-center text-xs font-bold leading-snug text-white">{message}</div>}
          </div>
        </aside>

        {/* Colonne droite : les 3 étapes */}
        <div className="space-y-5">

          {/* Étapes 1 & 2 côte à côte */}
          <div className="grid gap-5 md:grid-cols-2">

            {/* 1 · Voix & script */}
            <section className="flex flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <StepBadge n={1} /><Mic2 className="h-4 w-4 text-purple-600" />
                <h2 className="text-sm font-black text-slate-900">Voix & script</h2>
              </div>

              {recentGenerations.length > 0 ? (
                <>
                  <label htmlFor="voice-select" className="text-[11px] font-black text-slate-500">Voix de l'historique</label>
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
                <p className="rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">Aucune voix pour l'instant : génère une voix Sawtify, elle apparaîtra ici automatiquement.</p>
              )}

              <label htmlFor="script-input" className="mt-3 text-[11px] font-black text-slate-500">Script (pilote les captions)</label>
              <textarea
                id="script-input"
                value={script}
                onChange={(event) => setScript(event.target.value)}
                placeholder="Le script Sawtify apparaîtra ici…"
                className="mt-1.5 min-h-[130px] w-full flex-1 resize-y rounded-xl border border-slate-200 p-3 text-sm outline-none transition focus:border-purple-500"
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
                {videos.length > 0 && <span className="ml-auto rounded-full bg-purple-50 px-2 py-1 text-[10px] font-black text-purple-700">{videos.length} média{videos.length > 1 ? 's' : ''}</span>}
              </div>

              <div
                onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => { event.preventDefault(); setDragging(false); void handleFiles(event.dataTransfer.files); }}
                className={`flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-4 text-center transition ${dragging ? 'border-purple-500 bg-purple-100' : 'border-purple-200 bg-purple-50/40 hover:bg-purple-50'}`}
              >
                <label className={`inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black text-white shadow transition ${uploading ? 'bg-slate-400' : 'bg-purple-600 shadow-purple-200 hover:bg-purple-500'}`}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                  {uploading ? 'Upload en cours…' : 'Ajouter des médias'}
                  <input
                    type="file"
                    multiple
                    accept="video/*,image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(event) => { const files = event.target.files; void handleFiles(files); event.target.value = ''; }}
                  />
                </label>
                <p className="text-[10px] font-semibold text-slate-500">Glisser-déposer ou cliquer · MP4, MOV, WEBM, PNG, JPG</p>
              </div>

              <div className="mt-3 min-h-[52px] flex-1 space-y-2 overflow-y-auto lg:max-h-[176px]">
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

          {/* 3 · Style des captions — tout tient dans une carte */}
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <StepBadge n={3} />
              <h2 className="text-sm font-black text-slate-900">Style des captions</h2>
              <span className="ml-auto text-[10px] font-bold text-slate-400">Aperçu instantané à gauche</span>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {/* Style */}
              <div>
                <div className="mb-2 text-[11px] font-black text-slate-500">Style</div>
                <div className="flex flex-wrap gap-1.5">
                  {CAPTION_STYLES.map((style) => {
                    const active = captionStyle === style;
                    return (
                      <button
                        key={style}
                        type="button"
                        onClick={() => setCaptionStyle(style)}
                        style={active ? undefined : stylePillEffect(style)}
                        className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-black transition ${active ? 'border-purple-600 bg-purple-600 text-white shadow-sm shadow-purple-300' : 'border-slate-200 bg-white text-slate-600 hover:border-purple-300 hover:text-purple-700'}`}
                      >
                        {style}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Police — scroll interne, ne fait pas grandir la page */}
              <div>
                <div className="mb-2 text-[11px] font-black text-slate-500">Police</div>
                <div className="grid max-h-[196px] grid-cols-2 gap-1.5 overflow-y-auto pr-1">
                  {CAPTION_FONTS.map((font) => (
                    <button
                      key={font}
                      type="button"
                      onClick={() => setCaptionFont(font)}
                      className={`rounded-xl border px-2 py-1.5 text-left transition ${captionFont === font ? 'border-purple-600 bg-purple-50 ring-1 ring-purple-300' : 'border-slate-200 bg-white hover:border-purple-300'}`}
                    >
                      <span className="block truncate text-[9px] font-bold text-slate-400">{font}</span>
                      <span className="block truncate text-sm font-bold text-slate-800" style={{ fontFamily: `'${font}', sans-serif` }}>واش راك؟</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Thème */}
              <div>
                <div className="mb-2 text-[11px] font-black text-slate-500">Thème</div>
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
                        className={`flex flex-col items-center gap-1 rounded-xl border p-1.5 transition ${active ? 'border-purple-600 bg-purple-50' : 'border-slate-200 bg-white hover:border-purple-300'}`}
                      >
                        <span className={`h-5 w-5 rounded-full border border-black/10 ${active ? 'ring-2 ring-purple-400 ring-offset-1' : ''}`} style={{ backgroundColor: color }} />
                        <span className="w-full truncate text-center text-[8px] font-bold text-slate-500">{theme}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Taille */}
            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
              <Type className="h-4 w-4 shrink-0 text-purple-600" />
              <span className="w-24 shrink-0 text-[11px] font-black text-slate-600">Taille du texte</span>
              <input type="range" min="24" max="76" step="2" value={captionSize} onChange={(event) => setCaptionSize(Number(event.target.value))} className="w-full accent-purple-600" />
              <span className="w-12 shrink-0 rounded-full bg-purple-100 text-center text-[10px] font-black text-purple-700">{captionSize}px</span>
            </div>
          </section>

          {/* Résultat */}
          {resultUrl && (
            <section className="animate-in fade-in slide-in-from-bottom-2 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 font-black text-emerald-900"><CheckCircle2 className="h-5 w-5" /> Ton montage est prêt</div>
                <a href={resultUrl} download="sawtify-montage.mp4" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-500">
                  <Download className="h-4 w-4" /> Télécharger le MP4
                </a>
              </div>
              <video src={resultUrl} controls className="mx-auto max-h-[65vh] w-full max-w-sm rounded-2xl bg-black" />
            </section>
          )}
        </div>
      </div>

      {/* ── Barre d'action mobile (remplace le scroll jusqu'au bouton) ── */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,.08)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <div className="min-w-0 flex-1">
            {message
              ? <p className="truncate text-[11px] font-bold text-slate-600">{message}</p>
              : <p className="text-[11px] font-bold text-slate-400">Voix + script + rushs → montage auto · 70 pts/min</p>}
          </div>
          {actionButton(true)}
        </div>
      </div>
    </div>
  );
};
