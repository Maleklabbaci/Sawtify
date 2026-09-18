import React, { useMemo, useState } from 'react';
import { Clapperboard, Coins, Film, Loader2, Mic2, UploadCloud, Wand2, ArrowLeft, Download, CheckCircle2 } from 'lucide-react';
import { GenerationRecord } from '../types';
import { getMyAccessToken } from '../services/supabaseClient';
import { API_BASE_URL } from '../config/apiBase';

interface Props {
  balance: number;
  recentGenerations?: GenerationRecord[];
  onOpenRecharge: () => void;
}

type Uploaded = { id: string; name: string; url: string; kind: 'video' | 'image' };
const VIDEO_MONTAGE_COMING_SOON = true;
const CAPTION_FONTS = ['Cairo','Tajawal','Changa','Almarai','Noto Sans Arabic','Noto Kufi Arabic','IBM Plex Sans Arabic','Readex Pro','Alexandria','El Messiri','Inter','Poppins','Montserrat','Oswald','Bebas Neue','Anton','Barlow Condensed','Archivo Black','Raleway','Sora'];
const CAPTION_STYLES = ['Bold','Boxed','Shadow','Outline','Karaoke','Minimal','Neon','Bubble','Lower Third','Center','Top','Impact','Clean','Marker','Glow','Split','Rounded','News','Reel','Cinema'];
const CAPTION_THEMES = ['White','Yellow','Cyan','Pink','Lime','Orange','Blue','Red','Purple','Gold','Mint','Sky','Coral','Violet','Cream','Electric','Rose','Aqua','Sun','Mono'];

export const EditVideoPage: React.FC<Props> = ({ balance, recentGenerations = [], onOpenRecharge }) => {
  const [script, setScript] = useState(recentGenerations[0]?.text || '');
  const [audioUrl, setAudioUrl] = useState(recentGenerations[0]?.audioUrl || '');
  const [videos, setVideos] = useState<Uploaded[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [resultUrl, setResultUrl] = useState('');
  const [captionFont, setCaptionFont] = useState('Cairo');
  const [captionStyle, setCaptionStyle] = useState('Bold');
  const [captionTheme, setCaptionTheme] = useState('White');
  const [captionSize, setCaptionSize] = useState(48);
  const canAccess = balance > 1000;
  const selectedVoice = useMemo(() => recentGenerations.find((generation) => generation.audioUrl === audioUrl) || recentGenerations[0], [audioUrl, recentGenerations]);

  const uploadVideo = async (file: File) => {
    if (!file.type.startsWith('video/') && !file.type.startsWith('image/')) return;
    const token = await getMyAccessToken();
    const uploadUrl = `${API_BASE_URL}/api/video/upload?filename=${encodeURIComponent(file.name)}&filetype=${encodeURIComponent(file.type)}`;
    const response = await fetch(uploadUrl, { method: 'POST', headers: { Authorization: `Bearer ${token || ''}`, 'Content-Type': 'application/octet-stream' }, body: file });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Upload impossible.');
    setVideos((current) => [...current, data]);
  };

  const makeVideo = async () => {
    if (VIDEO_MONTAGE_COMING_SOON) { setMessage('Le montage vidéo arrive prochainement.'); return; }
    if (!canAccess) { onOpenRecharge(); return; }
    if (!script.trim() || !audioUrl || videos.length === 0) { setMessage('Erreur : ajoute une voix Sawtify, le script et au moins une vidéo.'); return; }
    if (script.length > 30000) { setMessage(`Erreur : script trop long (${script.length.toLocaleString()} caractères). Limite : 30 000 caractères.`); return; }
    setBusy(true); setMessage('Montage vidéo en cours…'); setResultUrl('');
    try {
      const token = await getMyAccessToken();
      const response = await fetch(`${API_BASE_URL}/api/video/render`, { method: 'POST', headers: { Authorization: `Bearer ${token || ''}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ script, audioUrl, videos, captionFont, captionStyle: captionStyle.toLowerCase().replace(/\s+/g, '-'), captionTheme: captionTheme.toLowerCase(), captionSize }), signal: AbortSignal.timeout(110000) });
      if (!response.ok) {
        const raw = await response.text().catch(() => '');
        let errorMessage = raw;
        try { errorMessage = JSON.parse(raw)?.error || raw; } catch { /* réponse proxy non JSON */ }
        throw new Error(errorMessage || `Rendu vidéo impossible (HTTP ${response.status}).`);
      }
      const job = await response.json();
      if (!job.jobId) throw new Error('Le serveur n’a pas créé la tâche de montage.');
      let transientFailures = 0;
      for (let attempt = 0; attempt < 600; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        let statusResponse: Response;
        try {
          statusResponse = await fetch(`${API_BASE_URL}/api/video/render/${encodeURIComponent(job.jobId)}`, { headers: { Authorization: `Bearer ${token || ''}` }, signal: AbortSignal.timeout(15000) });
        } catch (error) {
          transientFailures += 1;
          if (transientFailures >= 8) throw new Error('Render redémarre pendant le rendu. Réessaie avec une vidéo plus courte ou plus légère.');
          setMessage('Render redémarre… reprise automatique du suivi.');
          continue;
        }
        if (statusResponse.status === 502 || statusResponse.status === 503 || statusResponse.status === 504) {
          transientFailures += 1;
          if (transientFailures >= 8) throw new Error('Render redémarre pendant le rendu. Réessaie avec une vidéo plus courte ou plus légère.');
          setMessage('Render redémarre… reprise automatique du suivi.');
          continue;
        }
        transientFailures = 0;
        const status = await statusResponse.json().catch(() => ({}));
        if (!statusResponse.ok) throw new Error(status.error || `Erreur serveur HTTP ${statusResponse.status} pendant le rendu.`);
        if (status.status === 'failed') throw new Error(status.error || 'Rendu vidéo impossible.');
        if (status.status === 'ready') {
          const downloadResponse = await fetch(`${API_BASE_URL}${status.downloadUrl}`, { headers: { Authorization: `Bearer ${token || ''}` }, signal: AbortSignal.timeout(60000) });
          if (!downloadResponse.ok) throw new Error('La vidéo est prête mais son téléchargement a échoué.');
          setResultUrl(URL.createObjectURL(await downloadResponse.blob()));
          setMessage(`Montage terminé. ${status.cost || job.cost} points ont été débités.`);
          break;
        }
        setMessage(`Montage en cours… ${status.status === 'queued' ? 'dans la file' : 'rendu FFmpeg'}`);
        if (attempt === 599) throw new Error('Erreur : le rendu dépasse 20 minutes. Vérifie la taille des vidéos et réessaie avec des rushs plus courts.');
      }
    } catch (error) { const detail = error instanceof Error ? error.message : String(error); setMessage(detail.startsWith('Erreur') ? detail : `Erreur de correction : ${detail || 'montage impossible.'}`); }
    finally { setBusy(false); }
  };

  const themeColors: Record<string, string> = { White: '#ffffff', Yellow: '#fde047', Cyan: '#22d3ee', Pink: '#f472b6', Lime: '#84cc16', Orange: '#fb923c', Blue: '#60a5fa', Red: '#f87171', Purple: '#c084fc', Gold: '#facc15', Mint: '#6ee7b7', Sky: '#7dd3fc', Coral: '#fb7185', Violet: '#a78bfa', Cream: '#fef3c7', Electric: '#22d3ee', Rose: '#fb7185', Aqua: '#67e8f9', Sun: '#fbbf24', Mono: '#e2e8f0' };
  const previewText = script.replace(/\[[^\]]+\]/g, '').trim() || 'واش راك؟\nMontage vidéo';
  const previewColor = themeColors[captionTheme] || '#ffffff';
  return <div className="mx-auto w-full max-w-7xl space-y-6 animate-in fade-in">
    <div className="flex flex-col gap-4 rounded-3xl bg-gradient-to-br from-[#21114d] via-purple-700 to-fuchsia-600 p-6 text-white shadow-xl sm:flex-row sm:items-center sm:justify-between">
      <div><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-purple-200"><Clapperboard className="h-4 w-4" /> Sawtify Video</div><h1 className="text-2xl font-black">Montage vidéo automatique</h1><p className="mt-1 max-w-xl text-sm text-purple-100">Ta voix Sawtify, ton script et tes rushs dans le même espace. Aucun autre site.</p></div>
      <div className="flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3"><Coins className="h-4 w-4 text-yellow-300" /><strong>{balance}</strong><span className="text-xs text-purple-100">points</span></div>
    </div>
    {VIDEO_MONTAGE_COMING_SOON && <div className="flex items-center justify-between rounded-2xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm font-bold text-purple-900"><span>Le montage vidéo est temporairement fermé.</span><span className="rounded-full bg-purple-600 px-3 py-1 text-xs text-white">Prochainement</span></div>}
    {!VIDEO_MONTAGE_COMING_SOON && !canAccess && <button type="button" onClick={onOpenRecharge} className="w-full rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm font-bold text-amber-900">Il faut plus de 1000 points pour accéder au montage. Recharger les points →</button>}
    <section className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[280px_1fr]">
      <div className="mx-auto w-full max-w-[240px]">
        <div className="mb-2 flex items-center justify-between text-xs font-black text-slate-700"><span>Aperçu 9:16</span><span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">Live</span></div>
        <div className="relative aspect-[9/16] overflow-hidden rounded-[22px] border-[6px] border-slate-900 bg-gradient-to-br from-[#21114d] via-purple-700 to-fuchsia-500 shadow-2xl">
          <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(circle at 70% 25%, #fff 0 2%, transparent 18%), linear-gradient(145deg, transparent 35%, rgba(0,0,0,.5))' }} />
          <div className="absolute inset-x-3 bottom-[18%] text-center" dir="auto"><span className="inline-block max-w-full rounded-xl px-3 py-2 font-black leading-tight" style={{ color: previewColor, fontFamily: `'${captionFont}', sans-serif`, fontSize: `${Math.max(12, captionSize / 3)}px`, textShadow: ['Shadow','Glow','Neon'].includes(captionStyle) ? '0 3px 8px #000' : '0 2px 3px #000', WebkitTextStroke: ['Outline','Impact','Boxed'].includes(captionStyle) ? '0.5px #111827' : undefined, background: ['Boxed','Bubble','Rounded'].includes(captionStyle) ? 'rgba(15,23,42,.72)' : undefined }}>{previewText}</span></div>
          <span className="absolute left-3 top-3 rounded-full bg-black/30 px-2 py-1 text-[9px] font-bold text-white">SAWTIFY</span>
        </div>
      </div>
      <div className="flex flex-col justify-center rounded-2xl bg-slate-50 p-5"><div className="mb-5"><h2 className="text-lg font-black text-slate-900">Aperçu en direct</h2><p className="mt-1 text-sm text-slate-500">Chaque clic met à jour l’écran 9:16 immédiatement.</p></div><label className="text-sm font-black text-slate-700">Taille du caption <span className="float-right rounded-full bg-purple-100 px-2 py-1 text-purple-700">{captionSize}px</span><input type="range" min="24" max="76" step="2" value={captionSize} onChange={(event) => setCaptionSize(Number(event.target.value))} className="mt-4 w-full accent-purple-600" /></label><div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-xl bg-white p-3"><b className="block text-slate-900">{captionFont}</b><span className="text-slate-500">Police</span></div><div className="rounded-xl bg-white p-3"><b className="block text-slate-900">{captionStyle}</b><span className="text-slate-500">Style</span></div><div className="rounded-xl bg-white p-3"><b className="block text-slate-900">{captionTheme}</b><span className="text-slate-500">Thème</span></div></div></div>
    </section>
    <div className="grid gap-5 lg:grid-cols-[.85fr_1.15fr]">
      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2"><Mic2 className="h-4 w-4 text-purple-600" /><h2 className="font-black">Voix et script Sawtify</h2></div>
        {recentGenerations.length > 0 && <select value={audioUrl} onChange={(event) => { setAudioUrl(event.target.value); const voice = recentGenerations.find((item) => item.audioUrl === event.target.value); if (voice) setScript(voice.text); }} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="">Choisir une voix de l’historique</option>{recentGenerations.filter((item) => item.audioUrl).map((item) => <option key={item.id} value={item.audioUrl}>{item.voiceName} · {new Date(item.createdAt).toLocaleTimeString()}</option>)}</select>}
        {selectedVoice?.audioUrl && <audio src={selectedVoice.audioUrl} controls className="h-9 w-full" />}
        <textarea value={script} onChange={(event) => setScript(event.target.value)} placeholder="Le script Sawtify apparaîtra ici…" className="min-h-40 w-full resize-y rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-purple-500" dir="auto" />
      </section>
      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2"><Film className="h-4 w-4 text-purple-600" /><h2 className="font-black">Rushs vidéo</h2></div>
        <label className={`flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-center ${VIDEO_MONTAGE_COMING_SOON ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-60' : 'cursor-pointer border-purple-200 bg-purple-50/50 hover:bg-purple-50'}`}><UploadCloud className="h-7 w-7 text-purple-500" /><strong className="text-sm">{VIDEO_MONTAGE_COMING_SOON ? 'Upload fermé — prochainement' : 'Ajouter vidéos ou images'}</strong><span className="text-xs text-slate-500">MP4, MOV, WEBM, PNG, JPG</span>{!VIDEO_MONTAGE_COMING_SOON && <input type="file" multiple accept="video/*,image/*" className="hidden" onChange={async (event: React.ChangeEvent<HTMLInputElement>) => { setBusy(true); try { const files = Array.from(event.target.files || []) as File[]; await Promise.all(files.map((file) => uploadVideo(file))); setMessage(`${files.length} média${files.length > 1 ? 's' : ''} ajouté${files.length > 1 ? 's' : ''}.`); } catch (error) { setMessage(error instanceof Error ? error.message : 'Upload impossible.'); } finally { setBusy(false); event.target.value = ''; } }} />}</label>
        {videos.map((video) => <div key={video.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs"><span className="truncate font-bold">{video.name}</span><span className="text-slate-400">Prêt</span></div>)}
      </section>
    </div>
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-black text-slate-900">Style des captions</h2><span className="text-[11px] font-bold text-slate-400">Clique pour prévisualiser</span></div>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {CAPTION_STYLES.map((style, index) => {
          const active = captionStyle === style;
          const colors = ['#7c3aed','#db2777','#0891b2','#ea580c','#16a34a','#2563eb','#9333ea','#111827'];
          return <button key={style} type="button" onClick={() => setCaptionStyle(style)} className={`group relative min-w-[132px] rounded-xl border-2 px-2 py-2 text-left transition ${active ? 'border-purple-600 bg-purple-50' : 'border-slate-200 hover:border-purple-300'}`} style={{ background: active ? undefined : `linear-gradient(135deg, ${colors[index % colors.length]}12, #ffffff)` }}>
            <span className="block truncate text-center text-xs font-black" style={{ color: colors[index % colors.length], textShadow: ['Shadow','Glow','Neon'].includes(style) ? '1px 2px 3px #94a3b8' : undefined, WebkitTextStroke: ['Outline','Boxed','Impact'].includes(style) ? '0.4px #0f172a' : undefined }}>{style}</span>
            <span className="mt-1 block truncate text-center text-[9px] font-bold text-slate-600">واش راك؟</span>
          </button>;
        })}
      </div>
      <div className="mb-4"><div className="mb-2 text-[11px] font-black text-slate-600">Police</div><div className="flex gap-2 overflow-x-auto pb-1">{CAPTION_FONTS.map((font) => <button key={font} type="button" onClick={() => setCaptionFont(font)} className={`min-w-[124px] rounded-xl border-2 px-2 py-2 text-left transition ${captionFont === font ? 'border-purple-600 bg-purple-50' : 'border-slate-200 hover:border-purple-300'}`}><span className="block truncate text-[10px] font-bold text-slate-500">{font}</span><span className="block truncate text-sm font-bold text-slate-900" style={{ fontFamily: `'${font}', sans-serif` }}>واش راك؟</span></button>)}</div></div>
      <div><div className="mb-2 text-[11px] font-black text-slate-600">Thème</div><div className="flex gap-2 overflow-x-auto pb-1">{CAPTION_THEMES.map((theme, index) => { const colors = ['#ffffff','#fde047','#22d3ee','#f472b6','#84cc16','#fb923c','#60a5fa','#f87171','#c084fc','#facc15','#6ee7b7','#7dd3fc','#fb7185','#a78bfa','#fef3c7','#22d3ee','#fb7185','#67e8f9','#fbbf24','#334155']; return <button key={theme} type="button" onClick={() => setCaptionTheme(theme)} className={`min-w-[108px] rounded-xl border-2 p-2 text-left transition ${captionTheme === theme ? 'border-purple-600 bg-purple-50' : 'border-slate-200 hover:border-purple-300'}`}><span className="mb-1 block h-4 rounded-md" style={{ backgroundColor: colors[index] }} /><span className="text-[10px] font-bold text-slate-600">{theme}</span></button>; })}</div></div>
    </section>
    {message && <div className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">{message}</div>}
    <button type="button" disabled={busy || VIDEO_MONTAGE_COMING_SOON} onClick={() => void makeVideo()} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-purple-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-purple-200 transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50">{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5" />} {VIDEO_MONTAGE_COMING_SOON ? 'Montage vidéo — Prochainement' : 'Faire le montage en un clic · 70 points / minute'}</button>
    {resultUrl && <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5"><div className="mb-3 flex items-center gap-2 font-black text-emerald-900"><CheckCircle2 className="h-5 w-5" /> Ton montage est prêt</div><video src={resultUrl} controls className="mx-auto max-h-[70vh] w-full max-w-sm rounded-2xl bg-black" /><a href={resultUrl} download="sawtify-montage.mp4" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white"><Download className="h-4 w-4" /> Télécharger le MP4</a></div>}
  </div>;
};
