import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, Pause, Download, Volume2, AlertCircle, 
  Check, Copy, ArrowRight, RefreshCw, Sparkles,
  FileAudio, Zap, Mic, Radio, Headphones, Flame,
  AudioLines, Megaphone, RotateCcw, Sliders,
  Layers, X
} from 'lucide-react';
import { Voice, GenerationRecord } from '../types';
import { getVoices, getStyleTags, getSamplePrompts } from '../data/voices';
import { playNaturalAudio, stopNaturalAudio } from '../utils/audioGenerator';
import { requestTTSGeneration, requestVoicePreview } from '../services/api';
import { convertWavToMp3, formatBytes } from '../utils/audioConverter';
import { useLanguage } from '../context/LanguageContext';

interface TTSStudioProps {
  balance: number;
  onDeductPoints: (cost: number, record: GenerationRecord) => Promise<boolean>;
  onOpenRecharge: () => void;
}

const VoiceGlyph: React.FC<{ icon: string; gender: 'male' | 'female'; className?: string }> = ({ icon, gender, className = "w-4 h-4" }) => {
  switch (icon) {
    case 'mic': return <Mic className={className} />;
    case 'sparkles': return <Sparkles className={className} />;
    case 'radio': return <Radio className={className} />;
    case 'podcast': return <Headphones className={className} />;
    case 'flame': return <Flame className={className} />;
    case 'zap': return <Zap className={className} />;
    case 'audio-lines': return <AudioLines className={className} />;
    case 'volume-2': return <Volume2 className={className} />;
    case 'megaphone': return <Megaphone className={className} />;
    default: return gender === 'female' ? <Sparkles className={className} /> : <Mic className={className} />;
  }
};

type CategoryFilter = 'all' | 'commercial' | 'narrative' | 'social' | 'formal';
type GenderFilter = 'all' | 'male' | 'female';

export const TTSStudio: React.FC<TTSStudioProps> = ({ balance, onDeductPoints, onOpenRecharge }) => {
  const { t, isRTL, language } = useLanguage();

  const voices = getVoices(language);
  const styleTags = getStyleTags(language);
  const samplePrompts = getSamplePrompts(language);

  const defaultStarterText = language === 'ar'
    ? '[natural] [articulated] سلام عليكم خاوتي! مع منصة صوتيفي بالذكاء الاصطناعي، نصوصكم تتحول لصوت بشري طبيعي بالدارجة الجزائرية، بنطق صافي وبلا أي نبرة روبوتية.'
    : '[natural] [articulated] Bonjour à tous ! Avec la plateforme Sawtify, transformez vos textes en une voix humaine fluide, vivante et d\'une clarté studio absolue, sans aucune sonorité robotique.';

  const [text, setText] = useState<string>(defaultStarterText);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('voice_amin');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
  const [speed, setSpeed] = useState<number>(1.0);
  const [pitch, setPitch] = useState<number>(1.0);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [, setCurrentBlob] = useState<Blob | null>(null);
  const [, setMp3Blob] = useState<Blob | null>(null);
  const [mp3Url, setMp3Url] = useState<string | null>(null);
  const [wavSize, setWavSize] = useState<number>(0);
  const [mp3Size, setMp3Size] = useState<number>(0);
  const [compressionRatio, setCompressionRatio] = useState<number>(0);
  const [isConvertingMp3, setIsConvertingMp3] = useState<boolean>(false);
  const [conversionStatus, setConversionStatus] = useState<string>('');
  const [, setConversionEngine] = useState<string>('ffmpeg.wasm');
  const [lastLatency, setLastLatency] = useState<number | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [insufficientAlert, setInsufficientAlert] = useState<boolean>(false);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState<boolean>(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const POINTS_COST = 20;
  const currentVoice = voices.find(v => v.id === selectedVoiceId) || voices[0];

  useEffect(() => {
    setText((prev) => {
      if (prev.includes('Bonjour à tous') && language === 'ar') return defaultStarterText;
      if (prev.includes('سلام عليكم خاوتي') && language === 'fr') return defaultStarterText;
      return prev;
    });
  }, [language, defaultStarterText]);

  const filteredVoices = voices.filter(voice => {
    const matchCategory = categoryFilter === 'all' || voice.category === categoryFilter;
    const matchGender = genderFilter === 'all' || voice.gender === genderFilter;
    return matchCategory && matchGender;
  });

  const handleInsertTag = useCallback((tag: string) => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const newText = text.substring(0, start) + ' ' + tag + ' ' + text.substring(end);
    setText(newText);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start + tag.length + 2, start + tag.length + 2);
      }
    }, 10);
  }, [text]);

  const handlePreviewVoice = useCallback(async (e: React.MouseEvent, voice: Voice) => {
    e.stopPropagation();
    if (previewingVoiceId === voice.id) {
      stopNaturalAudio();
      setPreviewingVoiceId(null);
      return;
    }
    setPreviewingVoiceId(voice.id);
    try {
      const audioUrl = await requestVoicePreview(voice.id, speed, pitch);
      playNaturalAudio(audioUrl, () => setPreviewingVoiceId(null), speed, pitch);
    } catch (err) {
      console.warn('Erreur preview:', err);
      setPreviewingVoiceId(null);
    }
  }, [previewingVoiceId, speed, pitch]);

  const handleGenerate = useCallback(async () => {
    if (!text.trim()) return;
    if (balance < POINTS_COST) { setInsufficientAlert(true); return; }
    setInsufficientAlert(false);
    setIsGenerating(true);
    setCurrentAudioUrl(null);
    setMp3Url(null);
    setMp3Size(0);
    setCompressionRatio(0);

    try {
      const extractedTags = (text.match(/\[(.*?)\]/g) || []).map(t => t.replace(/[\[\]]/g, ''));
      const response = await requestTTSGeneration({ text, voice_id: currentVoice.id, speed, pitch, emotion_tags: extractedTags }, balance);
      
      const audioBlob = response.blob || new Blob([], { type: 'audio/wav' });
      const audioUrl = response.audio_url;
      const latency = response.latency_ms;

      setLastLatency(latency);
      setCurrentAudioUrl(audioUrl);
      setCurrentBlob(audioBlob);
      setWavSize(audioBlob.size || 120000);
      setCurrentTime(0);

      const tempAudio = new Audio(audioUrl);
      tempAudio.onloadedmetadata = () => setAudioDuration(tempAudio.duration);

      const record: GenerationRecord = {
        id: response.generation_id || ('gen_' + Date.now()),
        text, voiceId: currentVoice.id, voiceName: currentVoice.name, audioUrl,
        pointsDeducted: POINTS_COST,
        durationSec: response.duration_seconds || parseFloat((text.length * 0.05).toFixed(1)),
        latencyMs: latency, createdAt: new Date().toISOString()
      };

      const deducted = await onDeductPoints(POINTS_COST, record);
      if (!deducted) setInsufficientAlert(true);

      setIsConvertingMp3(true);
      setConversionStatus(t.convertingStatus);
      try {
        const mp3Result = await convertWavToMp3(audioBlob, (status) => setConversionStatus(status));
        setMp3Blob(mp3Result.mp3Blob);
        setMp3Url(mp3Result.mp3Url);
        setMp3Size(mp3Result.mp3Size);
        setCompressionRatio(mp3Result.compressionRatio);
        setConversionEngine(mp3Result.engineUsed);
      } catch (convErr) {
        console.warn('MP3 conversion fallback:', convErr);
      } finally {
        setIsConvertingMp3(false);
      }
    } catch (err: any) {
      console.error('Erreur synthèse TTS:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [text, balance, currentVoice.id, speed, pitch, onDeductPoints, t.convertingStatus]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current || !currentAudioUrl) return;
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); } 
    else { audioRef.current.play(); setIsPlaying(true); }
  }, [isPlaying, currentAudioUrl]);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let step = 0;
    const bars = 32;
    const barWidth = 2;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < bars; i++) {
        let height = 4;
        if (isPlaying) { const wave = Math.sin((i + step) * 0.25) * 0.5 + 0.5; height = Math.max(3, wave * (canvas.height * 0.85)); } 
        else if (currentAudioUrl) { const wave = Math.sin(i * 0.4) * 0.4 + 0.4; height = Math.max(3, wave * (canvas.height * 0.5)); }
        const x = i * (barWidth + 2);
        const y = (canvas.height - height) / 2;
        const progressPercent = audioDuration > 0 ? currentTime / audioDuration : 0;
        ctx.fillStyle = i / bars <= progressPercent ? '#7c3aed' : '#cbd5e1';
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, height, 1);
        ctx.fill();
      }
      if (isPlaying) step++;
      animationFrameRef.current = requestAnimationFrame(render);
    };
    render();
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
  }, [isPlaying, currentAudioUrl, currentTime, audioDuration]);

  const handleCopyPrompt = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-slate-50/50">
      
      {/* Alert */}
      {insufficientAlert && (
        <div className="shrink-0 bg-rose-50 border-b border-rose-200 px-4 py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span className="text-[11px] font-semibold text-rose-900">{t.insufficientTitle} ({balance} {t.pointsLabel})</span>
          </div>
          <button onClick={onOpenRecharge} className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[11px] font-semibold transition cursor-pointer">{t.rechargeNowBtn}</button>
        </div>
      )}

      {/* MAIN */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3 p-3">

        {/* LEFT: SCRIPT */}
        <div className="flex-1 min-h-0 flex flex-col lg:w-[55%]">
          <div className="bg-white border border-slate-200/90 rounded-2xl flex-1 min-h-0 flex flex-col p-4 shadow-xs focus-within:border-purple-500/60 focus-within:ring-2 focus-within:ring-purple-500/5">
            
            {/* Tags bar */}
            <div className="shrink-0 flex items-center gap-1.5 flex-wrap pb-2 border-b border-slate-100 mb-2">
              {styleTags.map((tagObj) => (
                <button key={tagObj.tag} type="button" onClick={() => handleInsertTag(tagObj.tag)} title={tagObj.desc} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 hover:bg-purple-50 border border-slate-200 hover:border-purple-300 text-slate-600 hover:text-purple-800 transition cursor-pointer">{tagObj.tag}</button>
              ))}
              <div className="relative ml-auto">
                <button type="button" onClick={() => setShowPresets(!showPresets)} className="text-[10px] text-slate-500 hover:text-slate-900 px-2 py-0.5 rounded-lg hover:bg-slate-100 border border-slate-200 transition cursor-pointer flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-600" />{t.scriptTemplatesBtn}
                </button>
                {showPresets && (
                  <div className={`absolute ${isRTL ? 'left-0' : 'right-0'} top-full mt-1 w-64 bg-white border border-slate-200 rounded-xl p-1.5 shadow-lg z-20 space-y-0.5`}>
                    {samplePrompts.map((sample, idx) => (
                      <button key={idx} type="button" onClick={() => { setText(sample.text); setShowPresets(false); }} className={`w-full ${isRTL ? 'text-right' : 'text-left'} p-1.5 rounded-lg text-[11px] text-slate-700 hover:bg-slate-50 transition cursor-pointer`}>{sample.title}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Textarea */}
            <div className="flex-1 min-h-0 relative">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t.scriptPlaceholder}
                className="w-full h-full p-2 text-sm text-slate-900 placeholder:text-slate-400 bg-transparent border-0 outline-none leading-relaxed resize-none overflow-y-auto"
              />
              <button type="button" onClick={handleCopyPrompt} className={`absolute ${isRTL ? 'left-1' : 'right-1'} bottom-1 p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition cursor-pointer`} title={t.copyScriptTooltip}>
                {copied ? <Check className="w-3 h-3 text-purple-600" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>

            {/* Footer */}
            <div className="shrink-0 pt-2 border-t border-slate-100 flex items-center justify-between gap-2 mt-2">
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span><span className="font-num font-semibold text-slate-700">{text.length}</span> {t.charsCount}</span>
                <span className="text-slate-300">•</span>
                <span>{t.costLabel}: <span className="font-num font-bold text-slate-900">{POINTS_COST}</span> {t.pointsLabel}</span>
              </div>
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !text.trim()}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl flex items-center gap-2 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-xs"
              >
                {isGenerating ? (<><RefreshCw className="w-3.5 h-3.5 animate-spin" /><span>{t.generatingBtn}</span></>) : (<><Volume2 className="w-3.5 h-3.5" /><span>{t.generateBtn}</span></>)}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: VOICES + CONTROLS */}
        <div className="flex-1 min-h-0 flex flex-col lg:w-[45%] gap-3">
          
          {/* Voice list */}
          <div className="flex-1 min-h-0 flex flex-col bg-white border border-slate-200/90 rounded-2xl p-3 shadow-xs">
            <div className="shrink-0 flex items-center justify-between pb-1.5 border-b border-slate-100 mb-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-900">
                <Layers className="w-3.5 h-3.5 text-purple-600" />
                <span>{t.catalogHeader}</span>
                <span className="font-num text-slate-400">({filteredVoices.length})</span>
              </div>
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[10px] font-medium border border-slate-200/60">
                <button type="button" onClick={() => setGenderFilter('all')} className={`px-1.5 py-0.5 rounded-md transition cursor-pointer ${genderFilter === 'all' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-500'}`}>{t.allGenders}</button>
                <button type="button" onClick={() => setGenderFilter('male')} className={`px-1.5 py-0.5 rounded-md transition cursor-pointer ${genderFilter === 'male' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-500'}`}>{t.maleGenders}</button>
                <button type="button" onClick={() => setGenderFilter('female')} className={`px-1.5 py-0.5 rounded-md transition cursor-pointer ${genderFilter === 'female' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-500'}`}>{t.femaleGenders}</button>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-1 overflow-x-auto pb-1.5 scrollbar-none text-[10px]">
              {(['all', 'commercial', 'narrative', 'social', 'formal'] as CategoryFilter[]).map((cat) => (
                <button key={cat} type="button" onClick={() => setCategoryFilter(cat)} className={`px-2 py-0.5 rounded-lg whitespace-nowrap transition cursor-pointer border ${categoryFilter === cat ? 'bg-slate-900 text-white border-slate-900 font-semibold' : 'bg-slate-50 text-slate-500 border-slate-200/80'}`}>
                  {t[`category${cat.charAt(0).toUpperCase() + cat.slice(1)}` as keyof typeof t] || cat}
                </button>
              ))}
            </div>

            {/* COMPACT Voice List */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-0.5">
              {filteredVoices.map((voice) => {
                const isSelected = voice.id === selectedVoiceId;
                const isPreviewing = previewingVoiceId === voice.id;
                return (
                  <div key={voice.id} onClick={() => setSelectedVoiceId(voice.id)} className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl cursor-pointer transition border ${isSelected ? 'bg-purple-50/80 border-purple-400/50 ring-1 ring-purple-400/20' : 'hover:bg-slate-50 border-transparent hover:border-slate-200/60'}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition ${isSelected ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <VoiceGlyph icon={voice.icon} gender={voice.gender} className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[11px] font-semibold text-slate-900 truncate block">{voice.name}</span>
                        <span className="text-[10px] text-slate-400 truncate block">{voice.dialect.split(/[•\-]/)[1]?.trim() || voice.dialect}</span>
                      </div>
                      {voice.badge && <span className="text-[9px] px-1 py-0 rounded bg-slate-100 text-slate-500 border border-slate-200/60 shrink-0 ml-1">{voice.badge}</span>}
                    </div>
                    <button type="button" onClick={(e) => handlePreviewVoice(e, voice)} className={`p-1 rounded-lg transition cursor-pointer shrink-0 ${isPreviewing ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`} title={t.listenPreviewTooltip}>
                      {isPreviewing ? <Volume2 className="w-3 h-3 animate-pulse" /> : <Play className={`w-3 h-3 ${isRTL ? '' : 'ml-0.5'}`} />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Controls */}
          <div className="shrink-0 bg-white border border-slate-200/90 rounded-2xl p-3 shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${previewingVoiceId === currentVoice.id ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <VoiceGlyph icon={currentVoice.icon} gender={currentVoice.gender} className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-900 truncate">{currentVoice.name}</span>
                    <span className="text-[9px] px-1 py-0 rounded-full bg-purple-50 text-purple-700 border border-purple-200/60 font-medium">{currentVoice.gender === 'female' ? t.voiceGenderFemale : t.voiceGenderMale}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 truncate block">{currentVoice.dialect}</span>
                </div>
              </div>
              <button type="button" onClick={(e) => handlePreviewVoice(e, currentVoice)} className={`p-1.5 rounded-lg transition cursor-pointer shrink-0 ${previewingVoiceId === currentVoice.id ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`} title={t.listenPreviewTooltip}>
                {previewingVoiceId === currentVoice.id ? <Volume2 className="w-3.5 h-3.5 animate-pulse" /> : <Play className={`w-3.5 h-3.5 ${isRTL ? '' : 'ml-0.5'}`} />}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px]"><span className="text-slate-500">{t.speedLabel}</span><span className="font-num font-bold text-slate-900 bg-slate-100 px-1.5 py-0 rounded text-[10px]">{speed.toFixed(1)}x</span></div>
                <input type="range" min="0.7" max="1.5" step="0.1" value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))} className="w-full h-1 bg-slate-200 rounded appearance-none cursor-pointer accent-purple-600" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px]"><span className="text-slate-500">{t.pitchLabel}</span><span className="font-num font-bold text-slate-900 bg-slate-100 px-1.5 py-0 rounded text-[10px]">{pitch.toFixed(1)}</span></div>
                <input type="range" min="0.8" max="1.3" step="0.1" value={pitch} onChange={(e) => setPitch(parseFloat(e.target.value))} className="w-full h-1 bg-slate-200 rounded appearance-none cursor-pointer accent-purple-600" />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* INLINE AUDIO PLAYER — Full width, compact, fixed at bottom */}
      {currentAudioUrl && (
        <div className="shrink-0 bg-white border-t border-slate-200 px-4 py-2 flex items-center gap-3 w-full">
          <button onClick={togglePlay} className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 transition cursor-pointer hover:bg-purple-500">
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
          </button>
          <div className="flex-1 min-w-0">
            <canvas ref={canvasRef} width={400} height={24} className="w-full h-6" />
          </div>
          <span className="text-[10px] text-slate-500 font-num shrink-0">{currentTime.toFixed(1)}s / {audioDuration.toFixed(1)}s</span>
          {lastLatency && <span className="text-[10px] text-slate-400 shrink-0 hidden sm:block">{lastLatency}ms</span>}
          {mp3Url ? (
            <a href={mp3Url} download={`sawtify_${currentVoice.id}_${Date.now()}.mp3`} className="p-1.5 text-slate-500 hover:text-purple-600 transition cursor-pointer shrink-0"><Download className="w-3.5 h-3.5" /></a>
          ) : isConvertingMp3 ? (
            <RefreshCw className="w-3.5 h-3.5 text-slate-400 animate-spin shrink-0" />
          ) : (
            <a href={currentAudioUrl} download={`sawtify_${currentVoice.id}_${Date.now()}.wav`} className="p-1.5 text-slate-400 hover:text-slate-700 transition cursor-pointer shrink-0"><Download className="w-3.5 h-3.5" /></a>
          )}
          <button onClick={() => { setIsPlaying(false); setCurrentAudioUrl(null); }} className="p-1 text-slate-400 hover:text-slate-700 transition cursor-pointer shrink-0"><X className="w-3.5 h-3.5" /></button>
          <audio ref={audioRef} src={currentAudioUrl} onTimeUpdate={handleTimeUpdate} onEnded={() => setIsPlaying(false)} className="hidden" />
        </div>
      )}

    </div>
  );
};
