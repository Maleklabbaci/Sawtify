import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, Pause, Download, Volume2, AlertCircle, 
  Check, Copy, RefreshCw, Sparkles, Zap, Mic, Radio, Headphones, Flame,
  AudioLines, Megaphone, Layers, X, History, Wand2, Video, ThumbsUp, ThumbsDown,
  Menu, Settings, ChevronDown
} from 'lucide-react';
import { Voice, GenerationRecord } from '../types';
import { getVoices, getStyleTags } from '../data/voices';
import { playNaturalAudio, stopNaturalAudio } from '../utils/audioGenerator';
import { requestTTSGeneration, requestVoicePreview, requestEnhanceText, requestGenerateScript, sendAIFeedback } from '../services/api';
import { convertWavToMp3 } from '../utils/audioConverter';
import { useLanguage } from '../context/LanguageContext';
import { playEnhanceChime, playScriptChime, playGenerationChime } from '../utils/sounds';
import { WaveformPlayer } from './WaveformPlayer';

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
    ? '[excited] أسمع مليح خاوتي! مع la plateforme Sawtify جديدة ديالنا... [natural] نصوصكم تتحول لـ voix humaine طبيعية 100%.'
    : '[excited] Écoute bien ya khawti ! Avec notre nouvelle plateforme Sawtify... [natural] tes textes se transforment en voix humaine 100% naturelle.';

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
  const [isMagicActive, setIsMagicActive] = useState<boolean>(false);
  const [, setLastGeneratedCost] = useState<number>(20);

  // Menu emotions dropdown
  const [isEmotionsMenuOpen, setIsEmotionsMenuOpen] = useState<boolean>(false);
  const emotionsMenuRef = useRef<HTMLDivElement | null>(null);

  // IA
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
  const [productName, setProductName] = useState<string>('');
  const [isGeneratingScript, setIsGeneratingScript] = useState<boolean>(false);
  const [selectedRegion, setSelectedRegion] = useState<RegionId>('general');

  // Drawers mobiles (renommés par fonction, pas par position)
  const [isScriptMenuOpen, setIsScriptMenuOpen] = useState<boolean>(false);
  const [isVoiceMenuOpen, setIsVoiceMenuOpen] = useState<boolean>(false);

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

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousAudioUrlRef = useRef<string | null>(null);
  const previousMp3UrlRef = useRef<string | null>(null);

  const POINTS_COST = 20;
  const currentVoice = voices.find(v => v.id === selectedVoiceId) || voices[0];
  const filteredVoices = voices.filter(voice => (categoryFilter === 'all' || voice.category === categoryFilter) && (genderFilter === 'all' || voice.gender === genderFilter));

  // Fermer dropdown emotions au clic extérieur
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emotionsMenuRef.current && !emotionsMenuRef.current.contains(e.target as Node)) {
        setIsEmotionsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Révocation automatique des blobs
  useEffect(() => {
    return () => {
      if (previousAudioUrlRef.current?.startsWith('blob:')) URL.revokeObjectURL(previousAudioUrlRef.current);
      if (previousMp3UrlRef.current?.startsWith('blob:')) URL.revokeObjectURL(previousMp3UrlRef.current);
    };
  }, []);

  useEffect(() => {
    if (previousAudioUrlRef.current && previousAudioUrlRef.current !== currentAudioUrl && previousAudioUrlRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(previousAudioUrlRef.current);
    }
    previousAudioUrlRef.current = currentAudioUrl;
  }, [currentAudioUrl]);

  useEffect(() => {
    if (previousMp3UrlRef.current && previousMp3UrlRef.current !== mp3Url && previousMp3UrlRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(previousMp3UrlRef.current);
    }
    previousMp3UrlRef.current = mp3Url;
  }, [mp3Url]);

  const handleInsertTag = useCallback((tag: string) => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    setText(prev => prev.substring(0, start) + ' ' + tag + ' ' + prev.substring(end));
    setIsEmotionsMenuOpen(false);
  }, []);

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
    } catch (err: any) { 
      setPreviewingVoiceId(null); 
      showNotif(language === 'ar' ? 'فشل تشغيل المعاينة' : 'Erreur de preview'); 
    }
  }, [previewingVoiceId, speed, pitch, language, showNotif]);

  const handleGenerate = useCallback(async () => {
    if (!text.trim() || balance < POINTS_COST) { 
      setInsufficientAlert(true); 
      return; 
    }
    setInsufficientAlert(false); 
    setIsGenerating(true); 
    setCurrentAudioUrl(null); 
    setMp3Url(null);
    
    try {
      const extractedTags = (text.match(/\[(.*?)\]/g) || []).map(tag => tag.replace(/[\[\]]/g, ''));
      const response = await requestTTSGeneration({ 
        text, voice_id: currentVoice.id, speed, pitch, emotion_tags: extractedTags 
      }, balance);

      const audioBlob = response.blob || new Blob([], { type: 'audio/wav' });
      setLastLatency(response.latency_ms); 
      setCurrentAudioUrl(response.audio_url); 
      setCurrentBlob(audioBlob); 
      setWavSize(audioBlob.size || 120000); 
      setCurrentTime(0);
      
      const tempAudio = new Audio(response.audio_url);
      tempAudio.addEventListener('loadedmetadata', () => {
        setAudioDuration(tempAudio.duration || 0);
      });
      tempAudio.addEventListener('error', () => {
        setAudioDuration(response.duration_seconds || 0);
      });

      const realCost = response.points_deducted || POINTS_COST;
      setLastGeneratedCost(realCost);
      
      const record: GenerationRecord = { 
        id: response.generation_id || ('gen_' + Date.now()), 
        text, voiceId: currentVoice.id, voiceName: currentVoice.name, 
        audioUrl: response.audio_url, pointsDeducted: realCost, 
        durationSec: response.duration_seconds || 0, 
        latencyMs: response.latency_ms, createdAt: new Date().toISOString() 
      };

      await onDeductPoints(realCost, record);
      showNotif(response.notification || `-${realCost} Points`);
      playGenerationChime();
      window.dispatchEvent(new CustomEvent('refresh-account-balance'));
      
      setIsConvertingMp3(true); 
      setConversionStatus(t.convertingStatus || 'Conversion...');
      try { 
        const r = await convertWavToMp3(audioBlob, (s) => setConversionStatus(s)); 
        setMp3Blob(r.mp3Blob); 
        setMp3Url(r.mp3Url); 
        setMp3Size(r.mp3Size); 
        setCompressionRatio(r.compressionRatio); 
      } catch (e) {
        console.warn('MP3 conversion failed:', e);
      } finally { 
        setIsConvertingMp3(false); 
      }
    } catch (err: any) { 
      console.error('Erreur TTS:', err);
      const errMsg = err?.message || '';
      if (errMsg.includes('insuffisant') || errMsg.includes('402')) {
        setInsufficientAlert(true);
        showNotif(language === 'ar' ? 'رصيد غير كافٍ' : 'Solde insuffisant');
      } else {
        showNotif(language === 'ar' ? 'خطأ في التوليد' : 'Erreur de génération');
      }
    } finally { 
      setIsGenerating(false); 
    }
  }, [text, balance, currentVoice.id, currentVoice.name, speed, pitch, onDeductPoints, t.convertingStatus, showNotif, language]);

  const handleEnhanceText = async () => {
    if (!text.trim() || isEnhancing) return;
    if (balance < 2) { setInsufficientAlert(true); return; }
    setInsufficientAlert(false); 
    setIsEnhancing(true); 
    setFeedbackSent(false);
    try {
      const originalText = text;
      const result = await requestEnhanceText(text, selectedRegion);
      setText(result.enhanced_text);
      showNotif(result.notification || '-2 Points');
      setLastGenType('enhance');
      setLastGenInput(originalText);
      setLastGenOutput(result.enhanced_text);
      setIsMagicActive(true);
      setTimeout(() => setIsMagicActive(false), 900);
      playEnhanceChime();
      window.dispatchEvent(new CustomEvent('refresh-account-balance'));
    } catch (e: any) { 
      if (e?.message?.includes('insuffisant')) setInsufficientAlert(true);
      else showNotif(language === 'ar' ? 'خطأ في التحسين' : 'Erreur d\'amélioration');
    } finally { 
      setIsEnhancing(false); 
    }
  };

  const handleGenerateScript = async () => {
    if (!productName.trim() || isGeneratingScript) return;
    if (balance < 5) { setInsufficientAlert(true); return; }
    setInsufficientAlert(false); 
    setIsGeneratingScript(true); 
    setFeedbackSent(false);
    try {
      const result = await requestGenerateScript(productName, 'excited', selectedRegion);
      setText(result.script);
      showNotif(result.notification || '-5 Points');
      setLastGenType('script');
      setLastGenInput(productName);
      setLastGenOutput(result.script);
      setLastGenSector(result.sector_used || 'general');
      setProductName('');
      setIsScriptMenuOpen(false);
      setIsMagicActive(true);
      setTimeout(() => setIsMagicActive(false), 900);
      playScriptChime();
      window.dispatchEvent(new CustomEvent('refresh-account-balance'));
    } catch (e: any) { 
      if (e?.message?.includes('insuffisant')) setInsufficientAlert(true);
      else showNotif(language === 'ar' ? 'خطأ في إنشاء السيناريو' : 'Erreur génération script');
    } finally { 
      setIsGeneratingScript(false); 
    }
  };

  const [feedbackGiven, setFeedbackGiven] = useState<'up' | 'down' | null>(null);
  const [feedbackError, setFeedbackError] = useState<boolean>(false);

  const handleSendFeedback = async (rating: number) => {
    if (!lastGenType || !lastGenOutput || feedbackSent) return;
    setFeedbackGiven(rating >= 4 ? 'up' : 'down');
    setFeedbackError(false);
    try {
      await sendAIFeedback({
        input_text: lastGenInput, output_text: lastGenOutput, rating,
        type: lastGenType, region: selectedRegion, sector: lastGenSector
      });
      setFeedbackSent(true);
      showNotif(rating >= 4 
        ? (language === 'ar' ? '⭐ شكراً! سنتحسن' : '⭐ Merci ! L\'IA s\'améliore') 
        : (language === 'ar' ? '👍 شكراً على ملاحظتك' : '👍 Merci pour ton retour'));
    } catch (e) { 
      console.warn('Feedback failed:', e); 
      setFeedbackGiven(null);
      setFeedbackError(true);
      showNotif(language === 'ar' ? 'فشل إرسال التقييم' : "Échec de l'envoi du retour");
    }
  };

  const togglePlay = useCallback(() => {
    if (!audioRef.current || !currentAudioUrl) return;
    if (isPlaying) { 
      audioRef.current.pause(); 
      setIsPlaying(false); 
    } else { 
      audioRef.current.play().catch(err => {
        console.warn('Playback error:', err);
        setIsPlaying(false);
      }); 
      setIsPlaying(true); 
    }
  }, [isPlaying, currentAudioUrl]);

  const handleTimeUpdate = useCallback(() => { 
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime); 
  }, []);

  const regionButtons: { id: RegionId; ar: string; fr: string }[] = [
    { id: 'general', ar: 'عام', fr: 'Général' },
    { id: 'centre', ar: 'الوسط', fr: 'Centre' },
    { id: 'ouest', ar: 'الغرب', fr: 'Ouest' },
    { id: 'est', ar: 'الشرق', fr: 'Est' },
  ];

  const categoryOptions: { id: CategoryFilter; label: string }[] = [
    { id: 'all', label: t.categoryAll || 'Tous' },
    { id: 'commercial', label: t.categoryCommercial || 'Commercial' },
    { id: 'narrative', label: t.categoryNarrative || 'Narratif' },
    { id: 'social', label: t.categorySocial || 'Social' },
    { id: 'formal', label: t.categoryFormal || 'Formel' },
  ];

  const handleClosePlayer = useCallback(() => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setCurrentAudioUrl(null);
    setMp3Url(null);
    setCurrentTime(0);
    setAudioDuration(0);
  }, []);

  const handleCopyText = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      showNotif(language === 'ar' ? 'فشل النسخ' : 'Erreur de copie');
    });
  }, [text, language, showNotif]);

  return (
    <div className="h-[calc(100vh-64px)] w-full flex flex-col bg-slate-50/40 relative">
      
      {notification && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-sm shadow-2xl flex items-center gap-2 animate-[bounce_0.5s_ease-in-out]">
          <Zap className="w-4 h-4 text-yellow-300 fill-yellow-300" />
          <span className="tracking-wider">{notification}</span>
        </div>
      )}

      {/* TOP BAR MOBILE */}
      <div className="lg:hidden shrink-0 flex items-center justify-between bg-white border-b border-slate-200 px-4 py-2.5 z-30">
        <button 
          onClick={() => setIsScriptMenuOpen(true)} 
          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 text-xs font-semibold">
          <Menu className="w-4 h-4" />
          <span>{language === 'ar' ? 'السيناريو' : 'Script'}</span>
        </button>
        
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-lg">
            {currentVoice.name}
          </span>
        </div>

        <button 
          onClick={() => setIsVoiceMenuOpen(true)} 
          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 text-xs font-semibold">
          <Settings className="w-4 h-4" />
          <span>{language === 'ar' ? 'الأصوات' : 'Voix'}</span>
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        
        {/* ============ PANNEAU SCRIPT (Gauche en LTR, Droite en RTL) ============ */}
        {isScriptMenuOpen && <div onClick={() => setIsScriptMenuOpen(false)} className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 transition-opacity" />}
        <div className={`
          fixed lg:static inset-y-0 start-0 z-50 lg:z-0
          w-72 xl:w-80 shrink-0 border-e border-slate-200 bg-white flex flex-col
          transition-transform duration-300 transform
          ${isScriptMenuOpen ? 'translate-x-0' : (isRTL ? 'translate-x-full lg:translate-x-0' : '-translate-x-full lg:translate-x-0')}
        `}>
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Video className="w-4 h-4 text-purple-600" /> 
              {language === 'ar' ? 'منشئ النصوص الإعلانية' : 'Générateur de Script'}
            </h3>
            <button onClick={() => setIsScriptMenuOpen(false)} className="lg:hidden p-1 text-slate-400 hover:text-slate-700 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 border-b border-slate-100">
            {/* Lahdja - Segmented Control épuré */}
            <div className="mb-3">
              <label className="text-[10px] font-bold text-slate-500 mb-1.5 block uppercase tracking-wide">
                {language === 'ar' ? 'اللهجة' : 'Lahdja'}
              </label>
              <div className="flex bg-slate-100 p-0.5 rounded-lg text-[10px]">
                {regionButtons.map(r => (
                  <button 
                    key={r.id} 
                    type="button" 
                    onClick={() => setSelectedRegion(r.id)}
                    className={`flex-1 text-center py-1.5 rounded-md font-medium transition cursor-pointer ${selectedRegion === r.id ? 'bg-white text-purple-700 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'}`}>
                    {language === 'ar' ? r.ar : r.fr}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-[10px] text-slate-400 mb-2 leading-relaxed">
              {language === 'ar' ? 'اكتب اسم المنتج أو الخدمة.' : 'Nom du produit ou service.'}
            </p>
            <div className="space-y-2">
              <input 
                type="text" 
                value={productName} 
                onChange={(e) => setProductName(e.target.value)}
                placeholder={language === 'ar' ? 'مثال: ساعة, formation, عطر...' : 'Ex: formation, baskets...'}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10" 
              />
              <button 
                onClick={handleGenerateScript} 
                disabled={isGeneratingScript || !productName.trim() || balance < 5}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer">
                {isGeneratingScript ? (
                  <><RefreshCw className="w-3.5 h-3.5 animate-spin" /><span>{language === 'ar' ? 'جاري التوليد...' : 'Génération...'}</span></>
                ) : (
                  <><Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-pulse" /><span>{language === 'ar' ? 'إنشاء' : 'Générer'}</span><span className="text-[9px] font-bold text-slate-400 bg-slate-700 px-1.5 py-0.5 rounded">5 pts</span></>
                )}
              </button>
            </div>
          </div>

          <div className="p-3 border-b border-slate-100 bg-slate-50/10">
            <h3 className="text-[11px] font-semibold text-slate-800 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-purple-600" /> 
              {language === 'ar' ? 'الأخيرة' : 'Récentes'}
            </h3>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {recentGenerations.slice(0, 8).map((gen) => (
              <button 
                key={gen.id} 
                onClick={() => { setText(gen.text); setIsScriptMenuOpen(false); }} 
                className="w-full text-left p-2 rounded-lg text-[11px] text-slate-500 hover:bg-slate-50 transition cursor-pointer truncate">
                {gen.text.substring(0, 30)}...
              </button>
            ))}
            {recentGenerations.length === 0 && (
              <p className="text-[10px] text-slate-400 p-2">{language === 'ar' ? 'لا شيء' : 'Aucune'}</p>
            )}
          </div>
        </div>

        {/* ============ EDITEUR CENTRAL ============ */}
        <div className="flex-1 min-w-0 flex flex-col p-3 sm:p-4">
          {insufficientAlert && (
            <div className="mb-2.5 p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-700">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500" />
                <span>{language === 'ar' ? 'رصيدك غير كافٍ.' : 'Solde insuffisant.'}</span>
              </div>
              <button 
                onClick={onOpenRecharge} 
                className="px-2.5 py-1 bg-rose-600 text-white font-medium rounded-lg text-[11px] cursor-pointer">
                {language === 'ar' ? 'شحن' : 'Recharger'}
              </button>
            </div>
          )}

          <div className="bg-white border border-slate-200/80 rounded-2xl flex-1 min-h-0 flex flex-col p-4 shadow-xs focus-within:border-purple-500/50 focus-within:ring-2 focus-within:ring-purple-500/10 relative">
            
            {/* HEADER : Dropdown Emotions + Compteur caractères */}
            <div className="shrink-0 flex items-center justify-between gap-2 pb-2 border-b border-slate-100 mb-2">
              
              {/* Dropdown "Insérer une émotion" (Compact et propre) */}
              <div className="relative" ref={emotionsMenuRef}>
                <button 
                  onClick={() => setIsEmotionsMenuOpen(!isEmotionsMenuOpen)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition cursor-pointer flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                  <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                  <span>{language === 'ar' ? 'إدراج تأثير' : 'Insérer effet'}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${isEmotionsMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isEmotionsMenuOpen && (
                  <div className="absolute top-full mt-1.5 start-0 z-20 bg-white border border-slate-200 rounded-xl shadow-xl p-2 w-64 max-h-72 overflow-y-auto custom-scrollbar">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider px-1.5 pb-1.5 border-b border-slate-100 mb-1.5">
                      {language === 'ar' ? 'اختر تأثيراً لإدراجه' : 'Choisir un effet'}
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {styleTags.map((tagObj) => (
                        <button 
                          key={tagObj.tag}
                          onClick={() => handleInsertTag(tagObj.tag)} 
                          title={tagObj.desc}
                          className="text-[10px] font-mono px-2 py-1.5 rounded-lg bg-slate-50 hover:bg-purple-50 border border-transparent hover:border-purple-200 text-slate-700 hover:text-purple-800 transition cursor-pointer text-start">
                          {tagObj.tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Compteur caractères (Info discrète) */}
              <div className="text-[11px] text-slate-400 font-num">
                <span className="font-semibold text-slate-600">{text.length}</span> {t.charsCount}
              </div>
            </div>

            {/* ZONE DE TEXTE */}
            <div className="flex-1 min-h-0 relative">
              <textarea 
                ref={textareaRef} 
                value={text} 
                onChange={(e) => setText(e.target.value)} 
                placeholder={t.textPlaceholder || 'Écrivez...'} 
                className={`w-full h-full p-1 sm:p-2 text-sm text-slate-900 placeholder:text-slate-400 bg-transparent border-0 outline-none leading-relaxed resize-none overflow-y-auto custom-scrollbar transition-all duration-500 ${isMagicActive ? 'animate-[magicPulse_0.9s_ease-in-out]' : ''}`}
                style={{ unicodeBidi: 'plaintext' }}
                dir="auto" 
              />
              {isMagicActive && (
                <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-400/0 via-purple-300/25 to-pink-300/0 animate-[magicSweep_0.9s_ease-in-out]" />
                  <Sparkles className="absolute top-1 end-1 w-4 h-4 text-purple-500 animate-ping" />
                  <Sparkles className="absolute bottom-6 start-4 w-3 h-3 text-pink-500 animate-pulse" />
                </div>
              )}
              <style>{`
                @keyframes magicSweep { 0% { transform: translateX(-100%); opacity: 0; } 30% { opacity: 1; } 100% { transform: translateX(100%); opacity: 0; } }
                @keyframes magicPulse { 0%, 100% { filter: none; } 40% { filter: drop-shadow(0 0 6px rgba(168,85,247,0.35)); } }
              `}</style>
            </div>

            {/* BARRE DE STATUT (Feedback + Actions intégrées, plus de flottement) */}
            <div className="shrink-0 pt-2 mt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
              
              {/* Groupe gauche : Bouton Magique + Copie */}
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={handleEnhanceText} 
                  disabled={isEnhancing || !text.trim() || balance < 2}
                  className="px-2.5 py-1.5 rounded-lg border border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 disabled:opacity-40 transition cursor-pointer shadow-sm flex items-center gap-1.5"
                  title={language === 'ar' ? 'تحسين النص (2 نقاط)' : 'Améliorer (2 pts)'}>
                  {isEnhancing ? (
                    <><RefreshCw className="w-3 h-3 text-purple-600 animate-spin" /><span className="text-[10px] font-bold text-purple-700">{language === 'ar' ? 'جاري...' : 'Analyse...'}</span></>
                  ) : (
                    <><Wand2 className="w-3 h-3 text-purple-600" /><span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider whitespace-nowrap">{language === 'ar' ? 'المحسن' : 'Magique'}</span><span className="text-[9px] font-bold text-purple-500 bg-white px-1.5 py-0.5 rounded-full border border-purple-200">2 pts</span></>
                  )}
                </button>
                
                <button 
                  onClick={handleCopyText} 
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition cursor-pointer bg-slate-50 hover:bg-slate-100 border border-slate-200"
                  title={language === 'ar' ? 'نسخ' : 'Copier'}>
                  {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>

                {/* Feedback discret intégré dans la barre */}
                {lastGenType && lastGenOutput && (
                  <div className="flex items-center gap-1 ms-2 ps-2 border-s border-slate-200">
                    <span className="text-[9px] text-slate-400 me-1">
                      {feedbackSent
                        ? (language === 'ar' ? '✅' : '✅')
                        : (language === 'ar' ? 'نتيجة IA:' : 'IA:')}
                    </span>
                    <button 
                      onClick={() => handleSendFeedback(5)} 
                      disabled={feedbackSent}
                      className={`p-1 rounded transition cursor-pointer disabled:cursor-default ${feedbackGiven === 'up' ? 'bg-green-100' : 'hover:bg-green-50'}`}
                      title="👍">
                      <ThumbsUp className={`w-3 h-3 ${feedbackGiven === 'up' ? 'text-green-700 fill-green-600' : 'text-slate-400 hover:text-green-600'}`} />
                    </button>
                    <button 
                      onClick={() => handleSendFeedback(1)} 
                      disabled={feedbackSent}
                      className={`p-1 rounded transition cursor-pointer disabled:cursor-default ${feedbackGiven === 'down' ? 'bg-red-100' : 'hover:bg-red-50'}`}
                      title="👎">
                      <ThumbsDown className={`w-3 h-3 ${feedbackGiven === 'down' ? 'text-red-700 fill-red-500' : 'text-slate-400 hover:text-red-500'}`} />
                    </button>
                    {feedbackError && (
                      <span className="text-[9px] text-rose-500 ms-1">{language === 'ar' ? 'أعد' : 'Retry'}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Groupe droite : Coût + Générer */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 hidden sm:block" title={language === 'ar' ? '20 نقطة لـ 0-60 ثانية' : '20 pts pour 0-60s'}>
                  {t.costLabel}: <span className="font-num font-bold text-slate-900">{POINTS_COST}</span> {t.pointsLabel}
                </span>
                <button 
                  onClick={handleGenerate} 
                  disabled={isGenerating || !text.trim()} 
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl flex items-center gap-2 transition cursor-pointer disabled:opacity-40 text-xs">
                  {isGenerating ? (
                    <><RefreshCw className="w-3.5 h-3.5 animate-spin" /><span>{t.generatingBtn}</span></>
                  ) : (
                    <><Volume2 className="w-3.5 h-3.5" /><span>{t.generateBtn}</span></>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ============ PANNEAU VOIX ============ */}
        {isVoiceMenuOpen && <div onClick={() => setIsVoiceMenuOpen(false)} className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 transition-opacity" />}
        <div className={`
          fixed lg:static inset-y-0 end-0 z-50 lg:z-0
          w-72 xl:w-80 shrink-0 min-w-0 flex flex-col gap-3 bg-white border-s lg:border-s-0 lg:border-e border-slate-200 p-4 transition-transform duration-300 transform
          ${isVoiceMenuOpen ? 'translate-x-0' : (isRTL ? '-translate-x-full lg:translate-x-0' : 'translate-x-full lg:translate-x-0')}
        `}>
          <div className="shrink-0 flex items-center justify-between pb-1.5 border-b border-slate-100">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-900">
              <Layers className="w-3.5 h-3.5 text-purple-600" />
              <span>{t.catalogHeader}</span>
            </div>
            <button onClick={() => setIsVoiceMenuOpen(false)} className="lg:hidden p-1 text-slate-400 hover:text-slate-700 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 min-h-0 flex flex-col">
            
            {/* Filtre Genre : Icônes + Texte pour clarté */}
            <div className="shrink-0 flex bg-slate-100 p-0.5 rounded-lg text-[10px] mb-2">
              <button 
                onClick={() => setGenderFilter('all')} 
                className={`flex-1 text-center py-1.5 rounded-md transition ${genderFilter === 'all' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-500'}`}>
                {t.allGenders}
              </button>
              <button 
                onClick={() => setGenderFilter('male')} 
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md transition ${genderFilter === 'male' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-500'}`}>
                <span className="text-[12px]">👨</span>
                <span>{t.maleGenders}</span>
              </button>
              <button 
                onClick={() => setGenderFilter('female')} 
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md transition ${genderFilter === 'female' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-500'}`}>
                <span className="text-[12px]">👩</span>
                <span>{t.femaleGenders}</span>
              </button>
            </div>

            {/* Filtre Catégorie : Dropdown (Select) épuré */}
            <div className="shrink-0 mb-2">
              <div className="relative">
                <select 
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
                  className="w-full appearance-none px-3 py-1.5 pe-8 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:border-purple-400 cursor-pointer">
                  {categoryOptions.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute top-1/2 -translate-y-1/2 end-2 pointer-events-none" />
              </div>
            </div>

            {/* Liste des voix (scrollbar customisée) */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-1 pe-1">
              {filteredVoices.map((voice) => {
                const isSelected = voice.id === selectedVoiceId;
                const isPreviewing = previewingVoiceId === voice.id;
                return (
                  <div 
                    key={voice.id} 
                    onClick={() => { setSelectedVoiceId(voice.id); setIsVoiceMenuOpen(false); }} 
                    className={`flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition border ${isSelected ? 'bg-purple-50 border-purple-400/50' : 'hover:bg-slate-50 border-transparent'}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${isSelected ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <VoiceGlyph icon={voice.icon} gender={voice.gender} className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[11px] font-medium text-slate-800 truncate block">{voice.name}</span>
                        <span className="text-[9px] text-slate-400 truncate block">{voice.dialect}</span>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => handlePreviewVoice(e, voice)} 
                      className={`p-1 rounded shrink-0 ${isPreviewing ? 'text-purple-600' : 'text-slate-400 hover:text-slate-700'}`}>
                      {isPreviewing ? <Volume2 className="w-3.5 h-3.5 animate-pulse" /> : <Play className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Voix sélectionnée + Sliders épais (tactile-friendly) */}
          <div className="shrink-0 bg-slate-50 border border-slate-200 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${previewingVoiceId === currentVoice.id ? 'bg-purple-600 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>
                <VoiceGlyph icon={currentVoice.icon} gender={currentVoice.gender} className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-bold text-slate-900 truncate block">{currentVoice.name}</span>
                <span className="text-[10px] text-slate-400 truncate block">{currentVoice.dialect}</span>
              </div>
              <button 
                onClick={(e) => handlePreviewVoice(e, currentVoice)} 
                className={`p-1.5 rounded-lg shrink-0 ${previewingVoiceId === currentVoice.id ? 'bg-purple-600 text-white' : 'text-slate-400 hover:bg-slate-200 border border-slate-200 bg-white'}`}>
                {previewingVoiceId === currentVoice.id ? <Volume2 className="w-3.5 h-3.5 animate-pulse" /> : <Play className="w-3.5 h-3.5" />}
              </button>
            </div>
            
            {/* Sliders épais tactile-friendly */}
            <div className="space-y-2.5">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500 font-medium">{t.speedLabel}</span>
                  <span className="font-num font-bold text-slate-900">{speed.toFixed(1)}x</span>
                </div>
                <input 
                  type="range" 
                  min="0.7" 
                  max="1.5" 
                  step="0.1" 
                  value={speed} 
                  onChange={(e) => setSpeed(parseFloat(e.target.value))} 
                  className="thick-slider w-full bg-slate-200 rounded appearance-none cursor-pointer" 
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500 font-medium">{t.pitchLabel}</span>
                  <span className="font-num font-bold text-slate-900">{pitch.toFixed(1)}</span>
                </div>
                <input 
                  type="range" 
                  min="0.8" 
                  max="1.3" 
                  step="0.1" 
                  value={pitch} 
                  onChange={(e) => setPitch(parseFloat(e.target.value))} 
                  className="thick-slider w-full bg-slate-200 rounded appearance-none cursor-pointer" 
                />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ==========================================================================
         PLAYER AUDIO FLOTTANT HAUT DE GAMME (Style ElevenLabs / Spotify)
         ========================================================================== */}
      {currentAudioUrl && (
        <div className="fixed bottom-4 inset-x-4 max-w-3xl mx-auto bg-slate-900/95 text-white rounded-2xl p-3.5 shadow-2xl border border-slate-800/80 backdrop-blur-xl z-50 flex items-center justify-between gap-3 sm:gap-5 animate-in slide-in-from-bottom-5 duration-300">
          
          {/* ZONE 1 : Bouton Play & Infos Voix */}
          <div className="flex items-center gap-3 shrink-0">
            <button 
              onClick={togglePlay} 
              className="w-11 h-11 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 text-white flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition shadow-lg shadow-purple-500/25 shrink-0">
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ms-0.5 fill-white" />}
            </button>
            
            <div className="hidden sm:flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white truncate">{currentVoice.name}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold shrink-0">
                  {language === 'ar' ? 'جاهز ✓' : 'Prêt ✓'}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-num">
                {currentTime.toFixed(1)}s / {audioDuration.toFixed(1)}s
              </span>
            </div>
          </div>

          {/* ZONE 2 : Waveform dynamique au centre */}
          <div className="flex-1 min-w-0 flex items-center gap-2 bg-slate-800/50 px-3 py-2 rounded-xl border border-slate-700/40">
            <div className="flex-1 min-w-0">
              <WaveformPlayer 
                isPlaying={isPlaying}
                hasAudio={!!currentAudioUrl}
                currentTime={currentTime}
                duration={audioDuration}
              />
            </div>
            {/* Temps affiché sur mobile si les infos voix sont cachées */}
            <span className="sm:hidden text-[10px] text-purple-300 font-num font-bold shrink-0">
              {currentTime.toFixed(1)}s
            </span>
          </div>

          {/* ZONE 3 : Téléchargement et Fermeture */}
          <div className="flex items-center gap-1.5 shrink-0">
            {mp3Url ? (
              <a 
                href={mp3Url} 
                download="sawtify-audio.mp3" 
                className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-md shadow-purple-900/30"
                title="Download MP3">
                <Download className="w-4 h-4" />
                <span className="hidden md:inline">MP3</span>
              </a>
            ) : (
              <a 
                href={currentAudioUrl} 
                download="sawtify-audio.wav" 
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer border border-slate-700"
                title="Download WAV">
                <Download className="w-4 h-4" />
                <span className="hidden md:inline">WAV</span>
              </a>
            )}

            <button 
              onClick={handleClosePlayer} 
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
              title={language === 'ar' ? 'إغلاق' : 'Fermer'}>
              <X className="w-4 h-4" />
            </button>
          </div>

          <audio 
            ref={audioRef} 
            src={currentAudioUrl} 
            onTimeUpdate={handleTimeUpdate} 
            onEnded={() => setIsPlaying(false)} 
            className="hidden" 
          />
        </div>
      )}
    </div>
  );
};
