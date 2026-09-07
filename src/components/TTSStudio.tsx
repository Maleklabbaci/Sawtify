import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, Pause, Download, Volume2, AlertCircle, 
  Check, Copy, RefreshCw, Sparkles, Zap, Mic, Radio, Headphones, Flame,
  AudioLines, Megaphone, Layers, X, FileText, History, Wand2, Video
} from 'lucide-react';
import { Voice, GenerationRecord } from '../types';
import { getVoices, getStyleTags, getSamplePrompts } from '../data/voices';
import { playNaturalAudio, stopNaturalAudio } from '../utils/audioGenerator';
import { requestTTSGeneration, requestVoicePreview, requestEnhanceText, requestGenerateScript } from '../services/api';
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

export const TTSStudio: React.FC<TTSStudioProps> = ({ balance, onDeductPoints, onOpenRecharge, recentGenerations = [] }) => {
  const { t, isRTL, language } = useLanguage();
  const voices = getVoices(language);
  const styleTags = getStyleTags(language);

  const defaultStarterText = language === 'ar'
    ? '[excited] أسمع مليح خاوتي! مع la plateforme Sawtify جديدة ديالنا... [natural] نصوصكم تتحول لـ voix humaine طبيعية وبزاف fluide... [whisper] بروفيتي من la promotion وسجل ديلوك!'
    : '[excited] Écoute bien ya khawti! Avec notre nouvelle application Sawtify... [natural] Vos textes se transforment en une voix humaine naturelle et très fluide... [whisper] Profite de la promotion et inscris-toi dès maintenant!';

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

  // Nouveaux états IA Gemini (Bouton Magique & Générateur de Script)
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
  const [productName, setProductName] = useState<string>('');
  const [isGeneratingScript, setIsGeneratingScript] = useState<boolean>(false);

  // Synchronisation du solde de points local pour réactivité instantanée
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
    } catch (err) { console.warn('Erreur preview:', err); setPreviewingVoiceId(null); }
  }, [previewingVoiceId, speed, pitch]);

  const handleGenerate = useCallback(async () => {
    if (!text.trim() || localBalance < POINTS_COST) { setInsufficientAlert(true); return; }
    setInsufficientAlert(false); setIsGenerating(true); setCurrentAudioUrl(null); setMp3Url(null);
    try {
      const extractedTags = (text.match(/\[(.*?)\]/g) || []).map(t => t.replace(/[\[\]]/g, ''));
      const response = await requestTTSGeneration({ text, voice_id: currentVoice.id, speed, pitch, emotion_tags: extractedTags }, localBalance);
      const audioBlob = response.blob || new Blob([], { type: 'audio/wav' });
      setLastLatency(response.latency_ms); setCurrentAudioUrl(response.audio_url); setCurrentBlob(audioBlob); setWavSize(audioBlob.size || 120000); setCurrentTime(0);
      new Audio(response.audio_url).onloadedmetadata = function(this: HTMLAudioElement) { setAudioDuration(this.duration); };
      
      const record: GenerationRecord = { id: response.generation_id || ('gen_' + Date.now()), text, voiceId: currentVoice.id, voiceName: currentVoice.name, audioUrl: response.audio_url, pointsDeducted: POINTS_COST, durationSec: response.duration_seconds || 0, latencyMs: response.latency_ms, createdAt: new Date().toISOString() };
      const deducted = await onDeductPoints(POINTS_COST, record);
      if (!deducted) setInsufficientAlert(true);
      
      setIsConvertingMp3(true); setConversionStatus(t.convertingStatus || 'Conversion...');
      try { const r = await convertWavToMp3(audioBlob, (s) => setConversionStatus(s)); setMp3Blob(r.mp3Blob); setMp3Url(r.mp3Url); setMp3Size(r.mp3Size); setCompressionRatio(r.compressionRatio); } catch (e) {} finally { setIsConvertingMp3(false); }
    } catch (err) { console.error('Erreur TTS:', err); } finally { setIsGenerating(false); }
  }, [text, localBalance, currentVoice.id, currentVoice.name, speed, pitch, onDeductPoints, t.convertingStatus]);

  // Bouton Magique LLM — Coût : 2 points
  const handleEnhanceText = async () => {
    if (!text.trim() || isEnhancing) return;
    if (localBalance < 2) { setInsufficientAlert(true); return; }
    setInsufficientAlert(false);
    setIsEnhancing(true);
    try {
      const result = await requestEnhanceText(text);
      setText(result.enhanced_text);
      setLocalBalance(result.remaining_balance);
      window.dispatchEvent(new CustomEvent('refresh-account-balance'));
    } catch (e: any) {
      console.error("Erreur d'amélioration:", e);
      if (e.message && e.message.includes('insuffisant')) setInsufficientAlert(true);
    } finally {
      setIsEnhancing(false);
    }
  };

  // Générateur de script TikTok LLM — Coût : 5 points
  const handleGenerateScript = async () => {
    if (!productName.trim() || isGeneratingScript) return;
    if (localBalance < 5) { setInsufficientAlert(true); return; }
    setInsufficientAlert(false);
    setIsGeneratingScript(true);
    try {
      const result = await requestGenerateScript(productName, 'excited');
      setText(result.script);
      setProductName('');
      setLocalBalance(result.remaining_balance);
      window.dispatchEvent(new CustomEvent('refresh-account-balance'));
    } catch (e: any) {
      console.error("Erreur génération de script:", e);
      if (e.message && e.message.includes('insuffisant')) setInsufficientAlert(true);
    } finally {
      setIsGeneratingScript(false);
    }
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
        if (isPlaying) { h = Math.max(3, (Math.sin((i + step) * 0.25) * 0.5 + 0.5) * canvas.height * 0.85); }
        else if (currentAudioUrl) { h = Math.max(3, (Math.sin(i * 0.4) * 0.4 + 0.4) * canvas.height * 0.5); }
        ctx.fillStyle = i / bars <= (audioDuration > 0 ? currentTime / audioDuration : 0) ? '#7c3aed' : '#cbd5e1';
        ctx.beginPath(); ctx.roundRect(i * (barWidth + 2), (canvas.height - h) / 2, barWidth, h, 0.5); ctx.fill();
      }
      if (isPlaying) step++;
      animationFrameRef.current = requestAnimationFrame(render);
    };
    render();
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
  }, [isPlaying, currentAudioUrl, currentTime, audioDuration]);

  return (
    <div className="h-[calc(100vh-64px)] w-full flex overflow-hidden bg-slate-50/40 relative">
      
      {/* ===== LEFT COLUMN (Fixed Proportions) : Générateur IA & Historique ===== */}
      <div className="w-64 xl:w-72 shrink-0 border-e border-slate-200 bg-white flex flex-col">
        
        {/* Module Générateur de Script publicitaire TikTok */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-2">
            <Video className="w-4 h-4 text-purple-600" /> 
            {language === 'ar' ? 'منشئ سيناريو تيك توك' : 'Générateur de Script'}
          </h3>
          <p className="text-[10px] text-slate-400 mb-3 leading-relaxed">
            {language === 'ar' ? 'اكتب اسم المنتج أو الخدمة وسنقوم بكتابة سيناريو بيع احترافي.' : 'Saisissez votre produit, service ou formation pour générer un script percutant.'}
          </p>
          <div className="space-y-2">
            <input 
              type="text" 
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder={language === 'ar' ? 'مثال: ساعة ذكية, formation, عطر...' : 'Ex: formation marketing, baskets...'}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10"
            />
            <button 
              onClick={handleGenerateScript}
              disabled={isGeneratingScript || !productName.trim() || localBalance < 5}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              {isGeneratingScript ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{language === 'ar' ? 'جاري التوليد...' : 'Génération...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
                  <span>{language === 'ar' ? 'إنشاء السيناريو' : 'Générer le Script'}</span>
                  <span className="text-[9px] font-bold text-slate-400 bg-slate-700 px-1.5 py-0.5 rounded">5 pts</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Historique Récent */}
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
          {recentGenerations.length === 0 && <p className="text-[10px] text-slate-400 p-2">{language === 'ar' ? 'لا شيء بعد' : 'Aucune'}</p>}
        </div>
      </div>

      {/* ===== CENTER COLUMN (Flexible Space) : Éditeur ===== */}
      <div className="flex-1 min-w-0 flex flex-col p-4">
        {insufficientAlert && (
          <div className="mb-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-700">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{language === 'ar' ? 'رصيدك غير كافٍ. يرجى شحن حسابك للمتابعة.' : 'Solde insuffisant. Veuillez recharger votre compte.'}</span>
            </div>
            <button onClick={onOpenRecharge} className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg text-[11px] cursor-pointer">
              {language === 'ar' ? 'شحن النقاط' : 'Recharger'}
            </button>
          </div>
        )}

        <div className="bg-white border border-slate-200/80 rounded-2xl flex-1 min-h-0 flex flex-col p-4 shadow-xs focus-within:border-purple-500/50 focus-within:ring-2 focus-within:ring-purple-500/10 relative">
          
          {/* Tags */}
          <div className="shrink-0 flex items-center gap-2 gap-y-1.5 flex-wrap pb-2 border-b border-slate-100 mb-2">
            {styleTags.map((tagObj) => (
              <button key={tagObj.tag} onClick={() => handleInsertTag(tagObj.tag)} title={tagObj.desc} className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-slate-100 hover:bg-purple-50 border border-slate-200 text-slate-600 hover:text-purple-800 transition cursor-pointer">{tagObj.tag}</button>
            ))}
          </div>

          {/* Textarea */}
          <div className="flex-1 min-h-0 relative">
            <textarea ref={textareaRef} value={text} onChange={(e) => setText(e.target.value)} placeholder={t.textPlaceholder || 'Écrivez votre texte ici...'} className="w-full h-full p-2 text-sm text-slate-900 placeholder:text-slate-400 bg-transparent border-0 outline-none leading-relaxed resize-none overflow-y-auto" />
            
            {/* BOUTON MAGIQUE LLM (2 points) */}
            <button 
              onClick={handleEnhanceText}
              disabled={isEnhancing || !text.trim() || localBalance < 2}
              className={`absolute top-2 ${isRTL ? 'left-2' : 'right-2'} p-2 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 disabled:opacity-40 transition cursor-pointer shadow-sm flex items-center gap-1.5`}
              title={language === 'ar' ? 'تحسين النص بالدارجة (2 نقاط)' : 'Améliorer le script en Darija (2 pts)'}
            >
              {isEnhancing ? (
                <RefreshCw className="w-4 h-4 text-purple-600 animate-spin" />
              ) : (
                <>
                  <Wand2 className="w-4 h-4 text-purple-600" />
                  <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">{language === 'ar' ? 'المحسن السحري' : 'Magique'}</span>
                  <span className="text-[9px] font-bold text-purple-400 bg-purple-100 px-1 rounded">2 pts</span>
                </>
              )}
            </button>

            <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="absolute bottom-1.5 end-2 p-1 text-slate-400 hover:text-slate-700 rounded-md transition cursor-pointer">
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
            <button onClick={handleGenerate} disabled={isGenerating || !text.trim()} className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl flex items-center gap-2 transition cursor-pointer disabled:opacity-40 text-xs">
              {isGenerating ? (<><RefreshCw className="w-3.5 h-3.5 animate-spin" /><span>{t.generatingBtn}</span></>) : (<><Volume2 className="w-3.5 h-3.5" /><span>{t.generateBtn}</span></>)}
            </button>
          </div>
        </div>
      </div>

      {/* ===== RIGHT COLUMN (Fixed Proportions) : Voix & Paramètres ===== */}
      <div className="w-72 xl:w-80 shrink-0 min-w-0 flex flex-col gap-3 p-4 ps-2">
        
        {/* Voix */}
        <div className="flex-1 min-h-0 flex flex-col bg-white border border-slate-200/80 rounded-2xl p-3 shadow-xs">
          <div className="shrink-0 flex items-center justify-between pb-1.5 border-b border-slate-100 mb-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-900"><Layers className="w-3.5 h-3.5 text-purple-600" /><span>{t.catalogHeader}</span></div>
            <div className="flex bg-slate-100 p-0.5 rounded-lg text-[10px] shrink-0">
              <button onClick={() => setGenderFilter('all')} className={`px-1.5 py-0.5 rounded-md transition cursor-pointer ${genderFilter === 'all' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-500'}`}>{t.allGenders}</button>
              <button onClick={() => setGenderFilter('male')} className={`px-1.5 py-0.5 rounded-md transition cursor-pointer ${genderFilter === 'male' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-500'}`}>{t.maleGenders}</button>
              <button onClick={() => setGenderFilter('female')} className={`px-1.5 py-0.5 rounded-md transition cursor-pointer ${genderFilter === 'female' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-500'}`}>{t.femaleGenders}</button>
            </div>
          </div>
          {/* Filtres de Catégories */}
          <div className="shrink-0 flex flex-wrap gap-1.5 pb-2 overflow-hidden text-[10px]">
            {(['all', 'commercial', 'narrative', 'social', 'formal'] as CategoryFilter[]).map((cat) => (
              <button key={cat} onClick={() => setCategoryFilter(cat)} className={`px-2 py-0.5 rounded-lg whitespace-nowrap transition cursor-pointer border ${categoryFilter === cat ? 'bg-slate-900 text-white border-slate-900 font-semibold' : 'bg-slate-50 text-slate-500 border-slate-200/80 hover:bg-slate-100'}`}>
                {t[`category${cat.charAt(0).toUpperCase() + cat.slice(1)}` as keyof typeof t] || cat}
              </button>
            ))}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pe-0.5">
            {filteredVoices.map((voice) => {
              const isSelected = voice.id === selectedVoiceId;
              const isPreviewing = previewingVoiceId === voice.id;
              return (
                <div key={voice.id} onClick={() => setSelectedVoiceId(voice.id)} className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition border ${isSelected ? 'bg-purple-50 border-purple-400/50 ring-1 ring-purple-400/20' : 'hover:bg-slate-50 border-transparent'}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${isSelected ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500'}`}><VoiceGlyph icon={voice.icon} gender={voice.gender} className="w-3 h-3" /></div>
                    <span className="text-[11px] font-medium text-slate-800 truncate">{voice.name}</span>
                  </div>
                  <button onClick={(e) => handlePreviewVoice(e, voice)} className={`p-0.5 rounded transition cursor-pointer shrink-0 ${isPreviewing ? 'text-purple-600' : 'text-slate-400 hover:text-slate-700'}`}>
                    {isPreviewing ? <Volume2 className="w-3 h-3 animate-pulse" /> : <Play className="w-3 h-3" />}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Paramètres */}
        <div className="shrink-0 bg-white border border-slate-200/80 rounded-2xl p-3 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${previewingVoiceId === currentVoice.id ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500'}`}><VoiceGlyph icon={currentVoice.icon} gender={currentVoice.gender} className="w-3.5 h-3.5" /></div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-slate-900 truncate block">{currentVoice.name}</span>
              <span className="text-[10px] text-slate-400 truncate block">{currentVoice.dialect}</span>
            </div>
            <button onClick={(e) => handlePreviewVoice(e, currentVoice)} className={`p-1 rounded-lg transition cursor-pointer shrink-0 ms-auto ${previewingVoiceId === currentVoice.id ? 'bg-purple-600 text-white' : 'text-slate-400 hover:bg-slate-100'}`}>
              {previewingVoiceId === currentVoice.id ? <Volume2 className="w-3 h-3 animate-pulse" /> : <Play className="w-3 h-3" />}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <div className="flex justify-between text-[10px]"><span className="text-slate-500">{t.speedLabel}</span><span className="font-num font-bold text-slate-900 text-[10px]">{speed.toFixed(1)}x</span></div>
              <input type="range" min="0.7" max="1.5" step="0.1" value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))} className="w-full h-1 bg-slate-200 rounded appearance-none cursor-pointer accent-purple-600" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px]"><span className="text-slate-500">{t.pitchLabel}</span><span className="font-num font-bold text-slate-900 text-[10px]">{pitch.toFixed(1)}</span></div>
              <input type="range" min="0.8" max="1.3" step="0.1" value={pitch} onChange={(e) => setPitch(parseFloat(e.target.value))} className="w-full h-1 bg-slate-200 rounded appearance-none cursor-pointer accent-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Inline Audio Player */}
      {currentAudioUrl && (
        <div className="absolute bottom-0 start-0 end-0 bg-white border-t border-slate-200 px-4 sm:px-6 py-2 flex items-center gap-3 z-40 shadow-lg">
          <button onClick={togglePlay} className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 transition cursor-pointer hover:bg-purple-500">
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ms-0.5" />}
          </button>
          <div className="flex-1 min-w-0"><canvas ref={canvasRef} width={300} height={20} className="w-full h-5" /></div>
          <span className="text-[10px] text-slate-500 font-num shrink-0">{currentTime.toFixed(1)}s / {audioDuration.toFixed(1)}s</span>
          {mp3Url ? (<a href={mp3Url} download className="p-1 text-slate-500 hover:text-purple-600 transition cursor-pointer shrink-0"><Download className="w-3 h-3" /></a>) : (<a href={currentAudioUrl} download className="p-1 text-slate-400 hover:text-slate-700 transition cursor-pointer shrink-0"><Download className="w-3 h-3" /></a>)}
          <button onClick={() => { setIsPlaying(false); setCurrentAudioUrl(null); }} className="p-1 text-slate-400 hover:text-slate-700 transition cursor-pointer shrink-0"><X className="w-3 h-3" /></button>
          <audio ref={audioRef} src={currentAudioUrl} onTimeUpdate={handleTimeUpdate} onEnded={() => setIsPlaying(false)} className="hidden" />
        </div>
      )}
    </div>
  );
};
