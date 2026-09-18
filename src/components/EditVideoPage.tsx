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

export const EditVideoPage: React.FC<Props> = ({ balance, recentGenerations = [], onOpenRecharge }) => {
  const [script, setScript] = useState(recentGenerations[0]?.text || '');
  const [audioUrl, setAudioUrl] = useState(recentGenerations[0]?.audioUrl || '');
  const [videos, setVideos] = useState<Uploaded[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [resultUrl, setResultUrl] = useState('');
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
    if (!canAccess) { onOpenRecharge(); return; }
    if (!script.trim() || !audioUrl || videos.length === 0) { setMessage('Ajoute une voix Sawtify, le script et au moins une vidéo.'); return; }
    setBusy(true); setMessage('Montage vidéo en cours…'); setResultUrl('');
    try {
      const token = await getMyAccessToken();
      const response = await fetch(`${API_BASE_URL}/api/video/render`, { method: 'POST', headers: { Authorization: `Bearer ${token || ''}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ script, audioUrl, videos }) });
      if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || 'Rendu vidéo impossible.'); }
      const blob = await response.blob();
      setResultUrl(URL.createObjectURL(blob));
      setMessage('Montage terminé. Le coût est calculé à 70 points par minute commencée.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Montage impossible.'); }
    finally { setBusy(false); }
  };

  return <div className="mx-auto w-full max-w-6xl space-y-6 animate-in fade-in">
    <div className="flex flex-col gap-4 rounded-3xl bg-gradient-to-br from-[#21114d] via-purple-700 to-fuchsia-600 p-6 text-white shadow-xl sm:flex-row sm:items-center sm:justify-between">
      <div><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-purple-200"><Clapperboard className="h-4 w-4" /> Sawtify Video</div><h1 className="text-2xl font-black">Montage vidéo automatique</h1><p className="mt-1 max-w-xl text-sm text-purple-100">Ta voix Sawtify, ton script et tes rushs dans le même espace. Aucun autre site.</p></div>
      <div className="flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3"><Coins className="h-4 w-4 text-yellow-300" /><strong>{balance}</strong><span className="text-xs text-purple-100">points</span></div>
    </div>
    {!canAccess && <button type="button" onClick={onOpenRecharge} className="w-full rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm font-bold text-amber-900">Il faut plus de 1000 points pour accéder au montage. Recharger les points →</button>}
    <div className="grid gap-5 lg:grid-cols-[.85fr_1.15fr]">
      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2"><Mic2 className="h-4 w-4 text-purple-600" /><h2 className="font-black">Voix et script Sawtify</h2></div>
        {recentGenerations.length > 0 && <select value={audioUrl} onChange={(event) => { setAudioUrl(event.target.value); const voice = recentGenerations.find((item) => item.audioUrl === event.target.value); if (voice) setScript(voice.text); }} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="">Choisir une voix de l’historique</option>{recentGenerations.filter((item) => item.audioUrl).map((item) => <option key={item.id} value={item.audioUrl}>{item.voiceName} · {new Date(item.createdAt).toLocaleTimeString()}</option>)}</select>}
        {selectedVoice?.audioUrl && <audio src={selectedVoice.audioUrl} controls className="h-9 w-full" />}
        <textarea value={script} onChange={(event) => setScript(event.target.value)} placeholder="Le script Sawtify apparaîtra ici…" className="min-h-40 w-full resize-y rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-purple-500" dir="auto" />
      </section>
      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2"><Film className="h-4 w-4 text-purple-600" /><h2 className="font-black">Rushs vidéo</h2></div>
        <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-purple-200 bg-purple-50/50 text-center hover:bg-purple-50"><UploadCloud className="h-7 w-7 text-purple-500" /><strong className="text-sm">Ajouter vidéos ou images</strong><span className="text-xs text-slate-500">MP4, MOV, WEBM, PNG, JPG</span><input type="file" multiple accept="video/*,image/*" className="hidden" onChange={async (event: React.ChangeEvent<HTMLInputElement>) => { setBusy(true); try { for (const file of Array.from(event.target.files || []) as File[]) await uploadVideo(file); setMessage('Médias ajoutés.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Upload impossible.'); } finally { setBusy(false); } }} /></label>
        {videos.map((video) => <div key={video.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs"><span className="truncate font-bold">{video.name}</span><span className="text-slate-400">Prêt</span></div>)}
      </section>
    </div>
    {message && <div className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">{message}</div>}
    <button type="button" disabled={busy} onClick={() => void makeVideo()} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-purple-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-purple-200 transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50">{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5" />} Faire le montage en un clic · 70 points / minute</button>
    {resultUrl && <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5"><div className="mb-3 flex items-center gap-2 font-black text-emerald-900"><CheckCircle2 className="h-5 w-5" /> Ton montage est prêt</div><video src={resultUrl} controls className="mx-auto max-h-[70vh] w-full max-w-sm rounded-2xl bg-black" /><a href={resultUrl} download="sawtify-montage.mp4" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white"><Download className="h-4 w-4" /> Télécharger le MP4</a></div>}
  </div>;
};
