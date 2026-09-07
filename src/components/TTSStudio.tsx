import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, Pause, Download, Volume2, AlertCircle, 
  Check, Copy, RefreshCw, Sparkles, Zap, Mic, Radio, Headphones, Flame,
  AudioLines, Megaphone, Layers, X, History, Wand2, Video, ThumbsUp, ThumbsDown
} from 'lucide-react';
import { Voice, GenerationRecord } from '../types';
import { getVoices, getStyleTags } from '../data/voices';
import { playNaturalAudio, stopNaturalAudio } from '../utils/audioGenerator';
import { requestTTSGeneration, requestVoicePreview, requestEnhanceText, requestGenerateScript, sendAIFeedback } from '../services/api';
import { convertWavToMp3 } from '../utils/audioConverter';
import { useLanguage } from '../context/LanguageContext';

interface TTSStudioProps {
  balance: number;
  onDeductPoints: (cost: number, record: GenerationRecord) => Promise<boolean>;
  onOpenRecharge: () => void;
  recentGenerations?: GenerationRecord[];
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
type RegionId = 'general' | 'centre' | 'ouest' | 'est';

export const TTSStudio: React.FC<TTSStudioProps> = ({ balance, onDeductPoints, onOpenRecharge, recentGenerations = [] }) => {
  const { t, isRTL, language } = useLanguage();
  const voices = getVoices(language);
  const styleTags = getStyleTags(language);

  const defaultStarterText = language === 'ar'
    ? '[excited] أسمع مليح خاوتي! مع la plateforme Sawtify جديدة ديالنا... [natural] نصوصكم تتحول لـ voix humaine طبيعية...'
    : '[excited] Écoute bien ya khawti! Avec notre nouvelle application Sawtify...';

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
  const [, setWavSize] = useState<number>(0);
  const [, setMp3Size] = useState<number>(0);
  const [, setCompressionRatio] = useState<number>(0);
  const [, setIsConvertingMp3] = useState<boolean>(false);
  const [, setConversionStatus] = useState<string>('');
  const [, setLastLatency] = useState<number | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [insufficientAlert, setInsufficientAlert] = useState<boolean>(false);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);

  // IA
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
  const [productName, setProductName] = useState<string>('');
  const [isGeneratingScript, setIsGeneratingScript] = useState<boolean>(false);
  const [selectedRegion, setSelectedRegion] = useState<RegionId>('general');

  // Feedback (👍👎)
  const [lastGenType, setLastGenType] = useState<'script' | 'enhance' | null>(null);
  const [lastGenOutput, setLastGenOutput] = useState<string>('');
  const [lastGenInput, setLastGenInput] = useState<string>('');
  const [lastGenSector, setLastGenSector] = useState<string>('general');
  const [feedbackSent, setFeedbackSent] = useState<boolean>(false);

  // Notifications
  const [notification, setNotification] = useState<string | null>(null);
  const showNotif = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 2800);
  }, []);

  const [localBalance, setLocalBalance] = useState<number>(balance);
  useEffect(() => { setLocalBalance(balance); }, [balance]);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const POINTS_COST = 20;
  const currentVoice = voices.find(v => v.id === selectedVoiceId) || voices[0];
  const filteredVoices = voices.filter(voice => (categoryFilter === 'all' || voice.category === categoryFilter) && (genderFilter === 'all' || voice.gender === genderFilter));

  const handleInsertTag = useCallback((tag: string) => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    setText(prev => prev.substring(0, start) + ' ' + tag + ' ' + prev.substring(end));
  }, []);

  const handlePreviewVoice = useCallback(async (e: React.MouseEvent, voice: Voice) => {
    e.stopPropagation();
    if (previewingVoiceId === voice.id) { stopNaturalAudio(); setPreviewingVoiceId(null); return; }
    setPreviewingVoiceId(voice.id);
    try {
      const audioUrl = await requestVoicePreview(voice.id, speed, pitch);
      playNaturalAudio(audioUrl, () => setPreviewingVoiceId(null), speed, pitch);
    } catch (err) { setPreviewingVoiceId(null); }
  }, [previewingVoiceId, speed, pitch]);

  const handleGenerate = useCallback(async () => {
    if (!text.trim() || localBalance < POINTS_COST) { setInsufficientAlert(true); return; }
    setInsufficientAlert(false); setIsGenerating(true); setCurrentAudioUrl(null); setMp3Url(null);
    try {
      const extractedTags = (text.match(/\[(.*?)\]/g) || []).map(tag => tag.replace(/[\[\]]/g, ''));
      const response = await requestTTSGeneration({ text, voice_id: currentVoice.id, speed, pitch, emotion_tags: extractedTags }, localBalance);
      const audioBlob = response.blob || new Blob([], { type: 'audio/wav' });
      setLastLatency(response.latency_ms); setCurrentAudioUrl(response.audio_url); setCurrentBlob(audioBlob); setWavSize(audioBlob.size || 120000); setCurrentTime(0);
      new Audio(response.audio_url).onloadedmetadata = function(this: HTMLAudioElement) { setAudioDuration(this.duration); };
      
      const record: GenerationRecord = { id: response.generation_id || ('gen_' + Date.now()), text, voiceId: currentVoice.id, voiceName: currentVoice.name, audioUrl: response.audio_url, pointsDeducted: POINTS_COST, durationSec: response.duration_seconds || 0, latencyMs: response.latency_ms, createdAt: new Date().toISOString() };
      const deducted = await onDeductPoints(POINTS_COST, record);
      if (!deducted) setInsufficientAlert(true);
      if (deducted) { setLocalBalance(prev => prev - POINTS_COST); showNotif(response.notification || `-${POINTS_COST} Points`); }
      
      setIsConvertingMp3(true); setConversionStatus(t.convertingStatus || 'Conversion...');
      try { const r = await convertWavToMp3(audioBlob, (s) => setConversionStatus(s)); setMp3Blob(r.mp3Blob); setMp3Url(r.mp3Url); setMp3Size(r.mp3Size); setCompressionRatio(r.compressionRatio); } catch (e) {} finally { setIsConvertingMp3(false); }
    } catch (err) { console.error('Erreur TTS:', err); } finally { setIsGenerating(false); }
  }, [text, localBalance, currentVoice.id, currentVoice.name, speed, pitch, onDeductPoints, t.convertingStatus, showNotif]);

  const handleEnhanceText = async () => {
    if (!text.trim() || isEnhancing) return;
    if (localBalance < 2) { setInsufficientAlert(true); return; }
    setInsufficientAlert(false); setIsEnhancing(true); setFeedbackSent(false);
    try {
      const originalText = text;
      const result = await requestEnhanceText(text, selectedRegion);
      setText(result.enhanced_text);
      if (typeof result.remaining_balance === 'number') setLocalBalance(result.remaining_balance);
      showNotif(result.notification || '-2 Points');
      setLastGenType('enhance');
      setLastGenInput(originalText);
      setLastGenOutput(result.enhanced_text);
      window.dispatchEvent(new CustomEvent('refresh-account-balance'));
    } catch (e: any) { if (e.message?.includes('insuffisant')) setInsufficientAlert(true); }
    finally { setIsEnhancing(false); }
  };

  const handleGenerateScript = async () => {
    if (!productName.trim() || isGeneratingScript) return;
    if (localBalance < 5) { setInsufficientAlert(true); return; }
    setInsufficientAlert(false); setIsGeneratingScript(true); setFeedbackSent(false);
    try {
      const result = await requestGenerateScript(productName, 'excited', selectedRegion);
      setText(result.script);
      if (typeof result.remaining_balance === 'number') setLocalBalance(result.remaining_balance);
      showNotif(result.notification || '-5 Points');
      setLastGenType('script');
      setLastGenInput(productName);
      setLastGenOutput(result.script);
      setLastGenSector(result.sector_used || 'general');
      setProductName('');
      window.dispatchEvent(new CustomEvent('refresh-account-balance'));
    } catch (e: any) { if (e.message?.includes('insuffisant')) setInsufficientAlert(true); }
    finally { setIsGeneratingScript(false); }
  };

  const handleSendFeedback = async (rating: number) => {
    if (!lastGenType || !lastGenOutput || feedbackSent) return;
    try {
      await sendAIFeedback({
        input_text: lastGenInput,
        output_text: lastGenOutput,
        rating,
        type: lastGenType,
        region: selectedRegion,
        sector: lastGenSector
      });
      setFeedbackSent(true);
      showNotif(rating >= 4 ? '⭐ Merci ! L\'IA va s\'améliorer' : '👍 Merci pour ton retour');
    } catch (e) { console.warn('Feedback failed'); }
  };

  const togglePlay = useCallback(() => {
    if (!audioRef.current || !currentAudioUrl) return;
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); } else { audioRef.current.play(); setIsPlaying(true); }
  }, [isPlaying, currentAudioUrl]);

  const handleTimeUpdate = useCallback(() => { if (audioRef.current) setCurrentTime(audioRef.current.currentTime); }, []);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    let step = 0; const bars = 32; const barWidth = 2;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < bars; i++) {
        let h = 4;
        if (isPlaying) h = Math.max(3, (Math.sin((i + step) * 0.25) * 0.5 + 0.5) * canvas.height * 0.85);
        else if (currentAudioUrl) h = Math.max(3, (Math.sin(i * 0.4) * 0.4 + 0.4) * canvas.height * 0.5);
        ctx.fillStyle = i / bars <= (audioDuration > 0 ? currentTime / audioDuration : 0) ? '#7c3aed' : '#cbd5e1';
        ctx.beginPath(); ctx.roundRect(i * (barWidth + 2), (canvas.height - h) / 2, barWidth, h, 0.5); ctx.fill();
      }
      if (isPlaying) step++;
      animationFrameRef.current = requestAnimationFrame(render);
    };
    render();
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
  }, [isPlaying, currentAudioUrl, currentTime, audioDuration]);

  const regionButtons: { id: RegionId; ar: string; fr: string }[] = [
    { id: 'general', ar: 'عام', fr: 'Général' },
    { id: 'centre', ar: 'الوسط', fr: 'Centre' },
    { id: 'ouest', ar: 'الغرب', fr: 'Ouest' },
    { id: 'est', ar: 'الشرق', fr: 'Est' },
  ];

  return (
    <div className="h-[calc(100vh-64px)] w-full flex overflow-hidden bg-slate-50/40 relative">
      
      {notification && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-sm shadow-2xl flex items-center gap-2 animate-[bounce_0.5s_ease-in-out]">
          <Zap className="w-4 h-4 text-yellow-300 fill-yellow-300" />
          <span className="tracking-wider">{notification}</span>
        </div>
      )}

      {/* LEFT */}
      <div className="w-64 xl:w-72 shrink-0 border-e border-slate-200 bg-white flex flex-col">
        
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-2">
            <Video className="w-4 h-4 text-purple-600" /> 
            {language === 'ar' ? 'منشئ سيناريو تيك توك' : 'Générateur de Script'}
          </h3>

          {/* Lahdja selector */}
          <div className="mb-2">
            <label className="text-[10px] font-bold text-slate-500 mb-1 block">
              {language === 'ar' ? 'اللهجة :' : 'Lahdja :'}
            </label>
            <div className="grid grid-cols-4 gap-1 text-[10px]">
              {regionButtons.map(r => (
                <button key={r.id} type="button" onClick={() => setSelectedRegion(r.id)}
                  className={`py-1 rounded-lg border font-medium transition cursor-pointer ${selectedRegion === r.id ? 'bg-purple-600 text-white border-purple-600 shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                  {language === 'ar' ? r.ar : r.fr}
                </button>
              ))}
            </div>
          </div>

          <p className="text-[10px] text-slate-400 mb-2 leading-relaxed">
            {language === 'ar' ? 'اكتب اسم المنتج أو الخدمة.' : 'Nom du produit ou service.'}
          </p>
          <div className="space-y-2">
            <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)}
              placeholder={language === 'ar' ? 'مثال: ساعة, formation, عطر...' : 'Ex: formation, baskets...'}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10" />
            <button onClick={handleGenerateScript} disabled={isGeneratingScript || !productName.trim() || localBalance < 5}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer">
              {isGeneratingScript ? (<><RefreshCw className="w-3.5 h-3.5 animate-spin" /><span>{language === 'ar' ? 'جاري التوليد...' : 'Génération...'}</span></>) : (<><Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-pulse" /><span>{language === 'ar' ? 'إنشاء' : 'Générer'}</span><span className="text-[9px] font-bold text-slate-400 bg-slate-700 px-1.5 py-0.5 rounded">5 pts</span></>)}
            </button>
          </div>
        </div>

        <div className="p-3 border-b border-slate-100">
          <h3 className="text-[11px] font-semibold text-slate-800 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-purple-600" /> 
            {language === 'ar' ? 'الأخيرة' : 'Récentes'}
          </h3>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
          {recentGenerations.slice(0, 8).map((gen) => (
            <button key={gen.id} onClick={() => setText(gen.text)} className="w-full text-left p-2 rounded-lg text-[11px] text-slate-500 hover:bg-slate-50 transition cursor-pointer truncate">
              {gen.text.substring(0, 30)}...
            </button>
          ))}
          {recentGenerations.length === 0 && <p className="text-[10px] text-slate-400 p-2">{language === 'ar' ? 'لا شيء' : 'Aucune'}</p>}
        </div>
      </div>

      {/* CENTER */}
      <div className="flex-1 min-w-0 flex flex-col p-4">
        {insufficientAlert && (
          <div className="mb-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-700">
            <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4 text-rose-500" /><span>{language === 'ar' ? 'رصيدك غير كافٍ.' : 'Solde insuffisant.'}</span></div>
            <button onClick={onOpenRecharge} className="px-2.5 py-1 bg-rose-600 text-white font-medium rounded-lg text-[11px] cursor-pointer">{language === 'ar' ? 'شحن' : 'Recharger'}</button>
          </div>
        )}

        <div className="bg-white border border-slate-200/80 rounded-2xl flex-1 min-h-0 flex flex-col p-4 shadow-xs focus-within:border-purple-500/50 focus-within:ring-2 focus-within:ring-purple-500/10 relative">
          
          <div className="shrink-0 flex items-center justify-between gap-2 pb-2 border-b border-slate-100 mb-2">
            <div className="flex items-center gap-2 gap-y-1.5 flex-wrap">
              {styleTags.map((tagObj) => (
                <button key={tagObj.tag} onClick={() => handleInsertTag(tagObj.tag)} title={tagObj.desc} className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-slate-100 hover:bg-purple-50 border border-slate-200 text-slate-600 hover:text-purple-800 transition cursor-pointer">{tagObj.tag}</button>
              ))}
            </div>
            
            <button onClick={handleEnhanceText} disabled={isEnhancing || !text.trim() || localBalance < 2}
              className="shrink-0 px-3 py-1.5 rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 disabled:opacity-40 transition cursor-pointer shadow-sm flex items-center gap-1.5"
              title={language === 'ar' ? 'تحسين النص (2 نقاط)' : 'Améliorer (2 pts)'}>
              {isEnhancing ? (<><RefreshCw className="w-3.5 h-3.5 text-purple-600 animate-spin" /><span className="text-[10px] font-bold text-purple-700">{language === 'ar' ? 'جاري...' : 'Analyse...'}</span></>) : (<><Wand2 className="w-3.5 h-3.5 text-purple-600" /><span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider whitespace-nowrap">{language === 'ar' ? 'المحسن' : 'Magique'}</span><span className="text-[9px] font-bold text-purple-500 bg-white px-1.5 py-0.5 rounded-full border border-purple-200">2 pts</span></>)}
            </button>
          </div>

          <div className="flex-1 min-h-0 relative">
            <textarea ref={textareaRef} value={text} onChange={(e) => setText(e.target.value)} placeholder={t.textPlaceholder || 'Écrivez...'} 
              className="w-full h-full p-2 text-sm text-slate-900 placeholder:text-slate-400 bg-transparent border-0 outline-none leading-relaxed resize-none overflow-y-auto" dir="auto" />
            <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="absolute bottom-1.5 end-2 p-1 text-slate-400 hover:text-slate-700 rounded-md transition cursor-pointer">
              {copied ? <Check className="w-3 h-3 text-purple-600" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>

          {/* Feedback IA */}
          {lastGenType && lastGenOutput && !feedbackSent && (
            <div className="shrink-0 mt-2 pt-2 border-t border-slate-100 flex items-center justify-center gap-3">
              <span className="text-[10px] text-slate-500">{language === 'ar' ? 'كيفاش لقيت النتيجة؟' : 'Qualité du résultat ?'}</span>
              <button onClick={() => handleSendFeedback(5)} className="p-1.5 rounded-lg hover:bg-green-50 border border-green-200 transition cursor-pointer" title="👍">
                <ThumbsUp className="w-3.5 h-3.5 text-green-600" />
              </button>
              <button onClick={() => handleSendFeedback(1)} className="p-1.5 rounded-lg hover:bg-red-50 border border-red-200 transition cursor-pointer" title="👎">
                <ThumbsDown className="w-3.5 h-3.5 text-red-500" />
              </button>
            </div>
          )}

          <div className="shrink-0 pt-2 border-t border-slate-100 flex items-center justify-between gap-2 mt-2">
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span><span className="font-num font-semibold text-slate-700">{text.length}</span> {t.charsCount}</span>
              <span className="text-slate-300">•</span>
              <span>{t.costLabel}: <span className="font-num font-bold text-slate-900">{POINTS_COST}</span> {t.pointsLabel}</span>
            </div>
            <button onClick={handleGenerate} disabled={isGenerating || !text.trim()} className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl flex items-center gap-2 transition cursor-pointer disabled:opacity-40 text-xs">
              {isGenerating ? (<><RefreshCw className="w-3.5 h-3.5 animate-spin" /><span>{t.generatingBtn}</span></>) : (<><Volume2 className="w-3.5 h-3.5" /><span>{t.generateBtn}</span></>)}
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="w-72 xl:w-80 shrink-0 min-w-0 flex flex-col gap-3 p-4 ps-2">
        <div className="flex-1 min-h-0 flex flex-col bg-white border border-slate-200/80 rounded-2xl p-3 shadow-xs">
          <div className="shrink-0 flex items-center justify-between pb-1.5 border-b border-slate-100 mb-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-900"><Layers className="w-3.5 h-3.5 text-purple-600" /><span>{t.catalogHeader}</span></div>
            <div className="flex bg-slate-100 p-0.5 rounded-lg text-[10px]">
              <button onClick={() => setGenderFilter('all')} className={`px-1.5 py-0.5 rounded-md ${genderFilter === 'all' ? 'bg-white text-slate-900 font-semibold' : 'text-slate-500'}`}>{t.allGenders}</button>
              <button onClick={() => setGenderFilter('male')} className={`px-1.5 py-0.5 rounded-md ${genderFilter === 'male' ? 'bg-white text-slate-900 font-semibold' : 'text-slate-500'}`}>{t.maleGenders}</button>
              <button onClick={() => setGenderFilter('female')} className={`px-1.5 py-0.5 rounded-md ${genderFilter === 'female' ? 'bg-white text-slate-900 font-semibold' : 'text-slate-500'}`}>{t.femaleGenders}</button>
            </div>
          </div>
          <div className="shrink-0 flex flex-wrap gap-1.5 pb-2 text-[10px]">
            {(['all', 'commercial', 'narrative', 'social', 'formal'] as CategoryFilter[]).map((cat) => (
              <button key={cat} onClick={() => setCategoryFilter(cat)} className={`px-2 py-0.5 rounded-lg border ${categoryFilter === cat ? 'bg-slate-900 text-white border-slate-900 font-semibold' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}>
                {t[`category${cat.charAt(0).toUpperCase() + cat.slice(1)}` as keyof typeof t] || cat}
              </button>
            ))}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-1">
            {filteredVoices.map((voice) => {
              const isSelected = voice.id === selectedVoiceId;
              const isPreviewing = previewingVoiceId === voice.id;
              return (
                <div key={voice.id} onClick={() => setSelectedVoiceId(voice.id)} className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition border ${isSelected ? 'bg-purple-50 border-purple-400/50' : 'hover:bg-slate-50 border-transparent'}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center ${isSelected ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500'}`}><VoiceGlyph icon={voice.icon} gender={voice.gender} className="w-3 h-3" /></div>
                    <span className="text-[11px] font-medium text-slate-800 truncate">{voice.name}</span>
                  </div>
                  <button onClick={(e) => handlePreviewVoice(e, voice)} className={`p-0.5 rounded ${isPreviewing ? 'text-purple-600' : 'text-slate-400 hover:text-slate-700'}`}>
                    {isPreviewing ? <Volume2 className="w-3 h-3 animate-pulse" /> : <Play className="w-3 h-3" />}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="shrink-0 bg-white border border-slate-200/80 rounded-2xl p-3 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${previewingVoiceId === currentVoice.id ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500'}`}><VoiceGlyph icon={currentVoice.icon} gender={currentVoice.gender} className="w-3.5 h-3.5" /></div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-slate-900 truncate block">{currentVoice.name}</span>
              <span className="text-[10px] text-slate-400 truncate block">{currentVoice.dialect}</span>
            </div>
            <button onClick={(e) => handlePreviewVoice(e, currentVoice)} className={`p-1 rounded-lg ms-auto ${previewingVoiceId === currentVoice.id ? 'bg-purple-600 text-white' : 'text-slate-400 hover:bg-slate-100'}`}>
              {previewingVoiceId === currentVoice.id ? <Volume2 className="w-3 h-3 animate-pulse" /> : <Play className="w-3 h-3" />}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <div className="flex justify-between text-[10px]"><span className="text-slate-500">{t.speedLabel}</span><span className="font-num font-bold text-slate-900">{speed.toFixed(1)}x</span></div>
              <input type="range" min="0.7" max="1.5" step="0.1" value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))} className="w-full h-1 bg-slate-200 rounded appearance-none cursor-pointer accent-purple-600" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px]"><span className="text-slate-500">{t.pitchLabel}</span><span className="font-num font-bold text-slate-900">{pitch.toFixed(1)}</span></div>
              <input type="range" min="0.8" max="1.3" step="0.1" value={pitch} onChange={(e) => setPitch(parseFloat(e.target.value))} className="w-full h-1 bg-slate-200 rounded appearance-none cursor-pointer accent-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {currentAudioUrl && (
        <div className="absolute bottom-0 start-0 end-0 bg-white border-t border-slate-200 px-4 sm:px-6 py-2 flex items-center gap-3 z-40 shadow-lg">
          <button onClick={togglePlay} className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center cursor-pointer hover:bg-purple-500">
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ms-0.5" />}
          </button>
          <div className="flex-1 min-w-0"><canvas ref={canvasRef} width={300} height={20} className="w-full h-5" /></div>
          <span className="text-[10px] text-slate-500 font-num shrink-0">{currentTime.toFixed(1)}s / {audioDuration.toFixed(1)}s</span>
          {mp3Url ? (<a href={mp3Url} download className="p-1 text-slate-500 hover:text-purple-600 shrink-0"><Download className="w-3 h-3" /></a>) : (<a href={currentAudioUrl} download className="p-1 text-slate-400 hover:text-slate-700 shrink-0"><Download className="w-3 h-3" /></a>)}
          <button onClick={() => { setIsPlaying(false); setCurrentAudioUrl(null); }} className="p-1 text-slate-400 hover:text-slate-700 shrink-0"><X className="w-3 h-3" /></button>
          <audio ref={audioRef} src={currentAudioUrl} onTimeUpdate={handleTimeUpdate} onEnded={() => setIsPlaying(false)} className="hidden" />
        </div>
      )}
    </div>
  );
};
