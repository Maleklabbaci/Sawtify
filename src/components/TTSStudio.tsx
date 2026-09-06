import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, Pause, Download, Volume2, AlertCircle, 
  Check, Copy, ArrowRight, RefreshCw, Sparkles,
  FileAudio, Zap, Mic, Radio, Headphones, Flame,
  AudioLines, Megaphone, RotateCcw, Sliders,
  Layers
} from 'lucide-react';
import { Voice, GenerationRecord } from '../types';
import { getVoices, getStyleTags, getSamplePrompts } from '../data/voices';
import { playNaturalAudio, stopNaturalAudio } from '../utils/audioGenerator';
import { requestTTSGeneration, requestVoicePreview } from '../services/api';
import { convertWavToMp3, formatBytes } from '../utils/audioConverter';
import { useLanguage } from '../context/LanguageContext';

interface TTSStudioProps {
  balance: number;
  onDeductPoints: (cost: number, record: GenerationRecord) => boolean;
  onOpenRecharge: () => void;
}

// Clean vector icon renderer (No emojis, No AI avatars)
const VoiceGlyph: React.FC<{ icon: string; gender: 'male' | 'female'; className?: string }> = ({ icon, gender, className = "w-4 h-4" }) => {
  switch (icon) {
    case 'mic':
      return <Mic className={className} />;
    case 'sparkles':
      return <Sparkles className={className} />;
    case 'radio':
      return <Radio className={className} />;
    case 'podcast':
      return <Headphones className={className} />;
    case 'flame':
      return <Flame className={className} />;
    case 'zap':
      return <Zap className={className} />;
    case 'audio-lines':
      return <AudioLines className={className} />;
    case 'volume-2':
      return <Volume2 className={className} />;
    case 'megaphone':
      return <Megaphone className={className} />;
    default:
      return gender === 'female' ? <Sparkles className={className} /> : <Mic className={className} />;
  }
};

type CategoryFilter = 'all' | 'commercial' | 'narrative' | 'social' | 'formal';
type GenderFilter = 'all' | 'male' | 'female';

export const TTSStudio: React.FC<TTSStudioProps> = ({
  balance,
  onDeductPoints,
  onOpenRecharge,
}) => {
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

  // Update default text when switching languages if the text matches standard template
  useEffect(() => {
    setText((prev) => {
      if (prev.includes('Bonjour à tous') && language === 'ar') {
        return '[natural] [articulated] سلام عليكم خاوتي! مع منصة صوتيفي بالذكاء الاصطناعي، نصوصكم تتحول لصوت بشري طبيعي بالدارجة الجزائرية، بنطق صافي وبلا أي نبرة روبوتية.';
      }
      if (prev.includes('سلام عليكم خاوتي') && language === 'fr') {
        return '[natural] [articulated] Bonjour à tous ! Avec la plateforme Sawtify, transformez vos textes en une voix humaine fluide, vivante et d\'une clarté studio absolue, sans aucune sonorité robotique.';
      }
      return prev;
    });
  }, [language]);

  // Filter voices based on selected category & gender
  const filteredVoices = voices.filter(voice => {
    const matchCategory = categoryFilter === 'all' || voice.category === categoryFilter;
    const matchGender = genderFilter === 'all' || voice.gender === genderFilter;
    return matchCategory && matchGender;
  });

  // Insert style tags directly into textarea at cursor
  const handleInsertTag = (tag: string) => {
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
  };

  // Preview individual voice sample audio with natural fluid speech (no robotic browser voice)
  const handlePreviewVoice = async (e: React.MouseEvent, voice: Voice) => {
    e.stopPropagation();
    if (previewingVoiceId === voice.id) {
      stopNaturalAudio();
      setPreviewingVoiceId(null);
      return;
    }

    setPreviewingVoiceId(voice.id);
    try {
      const audioUrl = await requestVoicePreview(voice.id, speed, pitch);
      playNaturalAudio(audioUrl, () => {
        setPreviewingVoiceId(null);
      }, speed, pitch);
    } catch (err) {
      console.warn('Erreur lors de la lecture de l\'extrait vocal:', err);
      setPreviewingVoiceId(null);
    }
  };

  // Real TTS Generation via FastAPI Backend (/api/v1/tts/generate)
  const handleGenerate = async () => {
    if (!text.trim()) return;

    if (balance < POINTS_COST) {
      setInsufficientAlert(true);
      return;
    }
    setInsufficientAlert(false);

    setIsGenerating(true);
    setCurrentAudioUrl(null);
    setMp3Url(null);
    setMp3Size(0);
    setCompressionRatio(0);

    try {
      const extractedTags = (text.match(/\[(.*?)\]/g) || []).map(t => t.replace(/[\[\]]/g, ''));

      const response = await requestTTSGeneration({
        text,
        voice_id: currentVoice.id,
        speed,
        pitch,
        emotion_tags: extractedTags
      }, balance);

      const audioBlob = response.blob || new Blob([], { type: 'audio/wav' });
      const audioUrl = response.audio_url;
      const latency = response.latency_ms;

      setLastLatency(latency);
      setCurrentAudioUrl(audioUrl);
      setCurrentBlob(audioBlob);
      setWavSize(audioBlob.size || 120000);
      setCurrentTime(0);

      // Create a temporary audio element to read exact duration
      const tempAudio = new Audio(audioUrl);
      tempAudio.onloadedmetadata = () => {
        setAudioDuration(tempAudio.duration);
      };

      const record: GenerationRecord = {
        id: response.generation_id || ('gen_' + Date.now()),
        text,
        voiceId: currentVoice.id,
        voiceName: currentVoice.name,
        audioUrl,
        pointsDeducted: POINTS_COST,
        durationSec: response.duration_seconds || parseFloat((text.length * 0.05).toFixed(1)),
        latencyMs: latency,
        createdAt: new Date().toISOString()
      };

      onDeductPoints(POINTS_COST, record);

      // Trigger high-performance MP3 conversion
      setIsConvertingMp3(true);
      setConversionStatus(t.convertingStatus);

      try {
        const mp3Result = await convertWavToMp3(audioBlob, (status) => {
          setConversionStatus(status);
        });

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
  };

  const togglePlay = () => {
    if (!audioRef.current || !currentAudioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  // Waveform canvas visualizer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let step = 0;
    const bars = 48;
    const barWidth = 3;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < bars; i++) {
        let height = 6;
        if (isPlaying) {
          const wave = Math.sin((i + step) * 0.25) * 0.5 + 0.5;
          height = Math.max(4, wave * (canvas.height * 0.85));
        } else if (currentAudioUrl) {
          const wave = Math.sin(i * 0.4) * 0.4 + 0.4;
          height = Math.max(4, wave * (canvas.height * 0.6));
        }

        const x = i * (barWidth + 2);
        const y = (canvas.height - height) / 2;

        const progressPercent = audioDuration > 0 ? currentTime / audioDuration : 0;
        const isPlayed = i / bars <= progressPercent;

        ctx.fillStyle = isPlayed ? '#7c3aed' : isPlaying ? '#9333ea' : '#cbd5e1';
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, height, 1.5);
        ctx.fill();
      }

      if (isPlaying) {
        step++;
      }
      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, currentAudioUrl, currentTime, audioDuration]);

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Insufficient Balance Alert Banner */}
      {insufficientAlert && (
        <div 
          id="alert-insufficient-points"
          className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-100 rounded-xl text-rose-600 shrink-0">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-rose-900 text-xs sm:text-sm">
                {t.insufficientTitle} ({balance} {t.pointsLabel})
              </h3>
              <p className="text-xs text-rose-700 mt-0.5">
                {t.insufficientDesc.replace('{balance}', balance.toString())}
              </p>
            </div>
          </div>
          <button
            id="btn-recharge-from-alert"
            onClick={onOpenRecharge}
            className="w-full sm:w-auto px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <span>{t.rechargeNowBtn}</span>
            <ArrowRight className={`w-3 h-3 ${isRTL ? 'rotate-180' : ''}`} />
          </button>
        </div>
      )}


      {/* SCRIPT EDITOR — désormais en pleine largeur, priorité au texte */}
      <div>
          {/* Main White Studio Canvas */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs relative transition-all duration-200 focus-within:border-purple-500/60 focus-within:ring-4 focus-within:ring-purple-500/5 space-y-4">
            
            {/* Top Toolbar: Emotion Tags & Presets */}
            <div className="flex items-center justify-between gap-2 flex-wrap pb-3 border-b border-slate-100">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-slate-400 font-mono mr-1">{t.emotionLabel}</span>
                {styleTags.map((tagObj) => (
                  <button
                    key={tagObj.tag}
                    type="button"
                    id={`tag-btn-${tagObj.tag.replace(/[\[\]]/g, '')}`}
                    onClick={() => handleInsertTag(tagObj.tag)}
                    title={tagObj.desc}
                    className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-slate-100 hover:bg-purple-50 border border-slate-200 hover:border-purple-300 text-slate-700 hover:text-purple-800 transition-all duration-150 cursor-pointer"
                  >
                    {tagObj.tag}
                  </button>
                ))}
              </div>

              {/* Presets dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowPresets(!showPresets)}
                  className="text-[11px] text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded-lg hover:bg-slate-100 border border-slate-200 transition cursor-pointer flex items-center gap-1 font-medium"
                >
                  <Sparkles className="w-3 h-3 text-purple-600" />
                  <span>{t.scriptTemplatesBtn}</span>
                </button>

                {showPresets && (
                  <div className={`absolute ${isRTL ? 'left-0' : 'right-0'} top-full mt-2 w-72 bg-white border border-slate-200 rounded-2xl p-2 shadow-lg z-20 space-y-1 animate-in fade-in`}>
                    {samplePrompts.map((sample, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setText(sample.text);
                          setShowPresets(false);
                        }}
                        className={`w-full ${isRTL ? 'text-right' : 'text-left'} p-2 rounded-xl text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer`}
                      >
                        {sample.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Immersive Textarea */}
            <div className="relative">
              <textarea
                ref={textareaRef}
                id="script-input-textarea"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={7}
                placeholder={t.scriptPlaceholder}
                className="w-full p-2 text-slate-900 placeholder:text-slate-400 bg-transparent border-0 outline-none text-base sm:text-lg leading-relaxed resize-y font-normal"
              />

              <div className={`absolute ${isRTL ? 'left-0' : 'right-0'} bottom-0 flex items-center gap-1.5`}>
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                  title={t.copyScriptTooltip}
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-purple-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Telemetry & Main Action */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span><span className="font-num font-semibold text-slate-700">{text.length}</span> {t.charsCount}</span>
                <span>•</span>
                <span className="text-slate-700 font-medium">{t.costLabel} : <span className="font-num font-bold text-slate-900">{POINTS_COST}</span> {t.pointsLabel}</span>
              </div>

              {/* Primary Generation CTA */}
              <button
                id="btn-generate-voice"
                onClick={handleGenerate}
                disabled={isGenerating || !text.trim()}
                className="w-full sm:w-auto px-7 py-3 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2.5 transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-purple-600/20 hover:shadow-md hover:shadow-purple-600/30 text-sm"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>{t.generatingBtn}</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4" />
                    <span>{t.generateBtn}</span>
                  </>
                )}
              </button>
            </div>

          </div>
      </div>

      {/* Catalogue de voix + réglages/lecteur, sous l'éditeur */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* LEFT COLUMN: Catalogue de voix (plus large, liste plus lisible) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Organized Voice Catalog / Selector */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                <Layers className="w-4 h-4 text-purple-600" />
                <span>{t.catalogHeader}</span>
                <span className="text-[11px] font-num font-bold text-slate-500">({filteredVoices.length})</span>
              </div>

              {/* Gender toggle */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-[11px] font-medium border border-slate-200/60">
                <button
                  type="button"
                  onClick={() => setGenderFilter('all')}
                  className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${genderFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  {t.allGenders}
                </button>
                <button
                  type="button"
                  onClick={() => setGenderFilter('male')}
                  className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${genderFilter === 'male' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  {t.maleGenders}
                </button>
                <button
                  type="button"
                  onClick={() => setGenderFilter('female')}
                  className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${genderFilter === 'female' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  {t.femaleGenders}
                </button>
              </div>
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className={`px-2.5 py-1 rounded-xl whitespace-nowrap transition cursor-pointer border ${
                  categoryFilter === 'all'
                    ? 'bg-slate-900 text-white border-slate-900 font-semibold shadow-2xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200/80'
                }`}
              >
                {t.categoryAll}
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('commercial')}
                className={`px-2.5 py-1 rounded-xl whitespace-nowrap transition cursor-pointer border ${
                  categoryFilter === 'commercial'
                    ? 'bg-slate-900 text-white border-slate-900 font-semibold shadow-2xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200/80'
                }`}
              >
                {t.categoryCommercial}
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('narrative')}
                className={`px-2.5 py-1 rounded-xl whitespace-nowrap transition cursor-pointer border ${
                  categoryFilter === 'narrative'
                    ? 'bg-slate-900 text-white border-slate-900 font-semibold shadow-2xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200/80'
                }`}
              >
                {t.categoryNarrative}
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('social')}
                className={`px-2.5 py-1 rounded-xl whitespace-nowrap transition cursor-pointer border ${
                  categoryFilter === 'social'
                    ? 'bg-slate-900 text-white border-slate-900 font-semibold shadow-2xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200/80'
                }`}
              >
                {t.categorySocial}
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('formal')}
                className={`px-2.5 py-1 rounded-xl whitespace-nowrap transition cursor-pointer border ${
                  categoryFilter === 'formal'
                    ? 'bg-slate-900 text-white border-slate-900 font-semibold shadow-2xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200/80'
                }`}
              >
                {t.categoryFormal}
              </button>
            </div>

            {/* Voice List Strip */}
            <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
              {filteredVoices.map((voice) => {
                const isSelected = voice.id === selectedVoiceId;
                const isPreviewing = previewingVoiceId === voice.id;

                return (
                  <div
                    key={voice.id}
                    id={`voice-card-${voice.id}`}
                    onClick={() => setSelectedVoiceId(voice.id)}
                    className={`flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all duration-150 border ${
                      isSelected
                        ? 'bg-purple-50/60 border-purple-500/60 text-slate-900 shadow-2xs ring-1 ring-purple-500/20'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/70 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Structured Icon Container */}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition ${
                        isSelected 
                          ? 'bg-purple-600 text-white border-purple-600 shadow-xs' 
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        <VoiceGlyph icon={voice.icon} gender={voice.gender} className="w-4 h-4" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold truncate text-slate-900">
                            {voice.name}
                          </span>
                          {voice.badge && (
                            <span className="text-[10px] font-medium px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 border border-slate-200/60 shrink-0">
                              {voice.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {voice.dialect.split(/[•\-]/)[1]?.trim() || voice.dialect}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Audition Button */}
                      <button
                        type="button"
                        onClick={(e) => handlePreviewVoice(e, voice)}
                        className={`p-1.5 rounded-xl border transition cursor-pointer ${
                          isPreviewing
                            ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 border-slate-200/80'
                        }`}
                        title={t.listenPreviewTooltip}
                      >
                        {isPreviewing ? <Volume2 className="w-3.5 h-3.5 animate-pulse" /> : <Play className={`w-3.5 h-3.5 ${isRTL ? 'mr-0.5' : 'ml-0.5'}`} />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: Réglages de la voix active + lecteur audio */}
        <div className="lg:col-span-5 space-y-4">
          {/* Active Voice Summary & Modulator Card */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                <Sliders className="w-4 h-4 text-purple-600" />
                <span>{t.activeVoiceHeader}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200/70 font-semibold">
                  {currentVoice.gender === 'female' ? t.voiceGenderFemale : t.voiceGenderMale}
                </span>
              </div>
            </div>

            {/* Active Voice Spotlight Header */}
            <div className="flex items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-800 shadow-xs relative shrink-0">
                  <VoiceGlyph icon={currentVoice.icon} gender={currentVoice.gender} className="w-5 h-5 text-purple-600" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-purple-500 border-2 border-white rounded-full" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-sm text-slate-900 truncate">
                      {currentVoice.name}
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {currentVoice.dialect}
                  </p>
                </div>
              </div>

              {/* Sample Audition button */}
              <button
                type="button"
                onClick={(e) => handlePreviewVoice(e, currentVoice)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-150 cursor-pointer shrink-0 ${
                  previewingVoiceId === currentVoice.id
                    ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-xs'
                }`}
                title={t.listenPreviewTooltip}
              >
                {previewingVoiceId === currentVoice.id ? (
                  <Volume2 className="w-4 h-4 animate-pulse" />
                ) : (
                  <Play className={`w-4 h-4 ${isRTL ? 'mr-0.5' : 'ml-0.5'}`} />
                )}
              </button>
            </div>

            {/* Structured Sliders for Speed and Pitch */}
            <div className="space-y-3 pt-1">
              {/* Diction Speed */}
              <div className="p-3 bg-white border border-slate-200/70 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-medium">{t.speedLabel}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-num font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md text-xs">
                      {speed.toFixed(1)}x
                    </span>
                    {speed !== 1.0 && (
                      <button
                        type="button"
                        onClick={() => setSpeed(1.0)}
                        className="text-slate-400 hover:text-slate-700 transition cursor-pointer"
                        title={t.resetTooltip}
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
                <input
                  id="slider-speed"
                  type="range"
                  min="0.7"
                  max="1.5"
                  step="0.1"
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
                <div className="flex justify-between text-[11px] text-slate-400 font-medium">
                  <span>{t.speedSlow}</span>
                  <span>{t.speedNormal}</span>
                  <span>{t.speedFast}</span>
                </div>
              </div>

              {/* Vocal Pitch */}
              <div className="p-3 bg-white border border-slate-200/70 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-medium">{t.pitchLabel}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-num font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md text-xs">
                      {pitch.toFixed(1)}
                    </span>
                    {pitch !== 1.0 && (
                      <button
                        type="button"
                        onClick={() => setPitch(1.0)}
                        className="text-slate-400 hover:text-slate-700 transition cursor-pointer"
                        title={t.resetTooltip}
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
                <input
                  id="slider-pitch"
                  type="range"
                  min="0.8"
                  max="1.3"
                  step="0.1"
                  value={pitch}
                  onChange={(e) => setPitch(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
                <div className="flex justify-between text-[11px] text-slate-400 font-medium">
                  <span>{t.pitchDeep}</span>
                  <span>{t.pitchNatural}</span>
                  <span>{t.pitchHigh}</span>
                </div>
              </div>
            </div>

          </div>
          {/* Dynamic Audio Player & Waveform Studio */}
          {currentAudioUrl && (
            <div 
              id="audio-player-container"
              className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-3 animate-in fade-in"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
                  <span className="text-xs font-semibold text-slate-800">
                    {currentVoice.name} • {t.audioPlayerHeader}
                  </span>
                </div>
                {lastLatency && (
                  <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    {t.latencyLabel} : <span className="font-num font-semibold text-slate-800">{lastLatency}</span>ms
                  </span>
                )}
              </div>

              {/* Waveform Canvas */}
              <div className="h-12 bg-slate-50 rounded-xl p-2 border border-slate-200/80 flex items-center justify-center">
                <canvas
                  ref={canvasRef}
                  width={520}
                  height={40}
                  className="w-full h-full"
                />
              </div>

              <audio
                ref={audioRef}
                src={currentAudioUrl}
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />

              {/* Playback Controls & Conversion Status */}
              <div className="flex flex-col gap-3 pt-2 border-t border-slate-100">
                
                {/* Transport bar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      id="btn-play-pause-audio"
                      onClick={togglePlay}
                      className="w-10 h-10 rounded-xl bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white flex items-center justify-center transition cursor-pointer shadow-xs"
                      title={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className={`w-4 h-4 fill-current ${isRTL ? 'mr-0.5' : 'ml-0.5'}`} />}
                    </button>
                    <div className="text-xs text-slate-600">
                      <span className="font-num text-slate-900 font-bold">{currentTime.toFixed(1)}s</span> / <span className="font-num">{audioDuration.toFixed(1)}s</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="hidden sm:inline">{t.audioQuality}</span>
                  </div>
                </div>

                {/* MP3 Conversion State */}
                {isConvertingMp3 && (
                  <div 
                    id="ffmpeg-converting-indicator"
                    className="flex items-center justify-between px-3.5 py-2.5 bg-purple-50/70 border border-purple-200/80 rounded-2xl text-xs text-purple-900"
                  >
                    <div className="flex items-center gap-2.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-600 shrink-0" />
                      <span>{conversionStatus || t.convertingStatus}</span>
                    </div>
                    <span className="text-[11px] text-purple-700 font-medium">{t.compressionLabel}</span>
                  </div>
                )}

                {/* Download Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2 text-xs">
                    {mp3Size > 0 ? (
                      <>
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                          <FileAudio className="w-3.5 h-3.5 text-purple-600" />
                          MP3 • <span className="font-num">{formatBytes(mp3Size)}</span>
                        </span>
                        {compressionRatio > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md font-semibold text-[11px] border border-purple-200/60">
                            <Zap className="w-3 h-3" />
                            <span className="font-num">-{compressionRatio}%</span>
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-slate-500 text-[11px]">
                        WAV : <span className="font-num">{formatBytes(wavSize)}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Lossless WAV */}
                    {currentAudioUrl && (
                      <a
                        id="btn-download-wav"
                        href={currentAudioUrl}
                        download={`sawtify_${currentVoice.id}_${Date.now()}.wav`}
                        className="px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-medium transition cursor-pointer"
                        title={t.downloadWav}
                      >
                        Format .WAV ({formatBytes(wavSize)})
                      </a>
                    )}

                    {/* Compressed MP3 */}
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
                        disabled={isConvertingMp3}
                        className="px-4 py-2 bg-slate-200 text-slate-400 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-not-allowed"
                      >
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>{t.convertingStatus}</span>
                      </button>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
