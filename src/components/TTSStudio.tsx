import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play, Pause, Download, Volume2, Volume1, Volume, AlertCircle,
  Check, Copy, RefreshCw, Sparkles, Zap, Mic, Radio, Headphones, Flame,
  AudioLines, Megaphone, X, Wand2, ThumbsUp, ThumbsDown,
  ChevronDown, Star, Plus, ArrowUp, Cloud, Smile,
  MessageCircle, BookOpen, Languages, ShoppingBag, UtensilsCrossed, House,
  CalendarDays, SlidersHorizontal, History
} from 'lucide-react';
import { Voice, GenerationRecord } from '../types';
import { getVoices, getStyleTags } from '../data/voices';
import { tagsByCategory } from '../../tts/vocalTags';
import type { TagCategory } from '../../tts/vocalTags';
import { playNaturalAudio, stopNaturalAudio } from '../utils/audioGenerator';
import { requestTTSGeneration, requestVoicePreview, requestEnhanceText, requestGenerateScript, sendAIFeedback } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { playEnhanceChime, playScriptChime, playGenerationChime } from '../utils/sounds';
import { estimatePointsFromChars } from '../utils/pointsCost';
import { supabase, uploadGenerationAudio, fetchMyGenerations } from '../services/supabaseClient';
import { WaveformPlayer } from './WaveformPlayer';
import { WhatsNewV41, shouldShowWhatsNew, markWhatsNewSeen } from './WhatsNewV41';

// ==========================================================================
// BALISES VOCALES `<...>` — catalogue officiel (tts/vocalTags.ts)
// ==========================================================================
const VOCAL_BURSTS = tagsByCategory();
const VOCAL_BURST_COUNT = Object.values(VOCAL_BURSTS).reduce((n, l) => n + l.length, 0);

const BURST_SECTIONS: { category: TagCategory; ar: string; fr: string }[] = [
  { category: 'rire', ar: 'ضحك وفرح', fr: 'Rire et joie' },
  { category: 'emotion_forte', ar: 'انفعالات قوية', fr: 'Émotions fortes' },
  { category: 'tristesse', ar: 'حزن وبكاء', fr: 'Tristesse et pleurs' },
  { category: 'respiration', ar: 'نفس وجسد', fr: 'Respiration et corps' },
  { category: 'voix', ar: 'نبرات الصوت', fr: 'Voix' },
  { category: 'silence', ar: 'وقفات صمت', fr: 'Silences (pause)' },
];

const chargerConvertisseurMp3 = () => import('../utils/audioConverter');

// ==========================================================================
// UTILITAIRES
// ==========================================================================
const formatTime = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

interface TTSStudioProps {
  balance: number;
  onDeductPoints: (cost: number, record: GenerationRecord, storagePath?: string | null, remainingBalance?: number | null) => Promise<boolean>;
  onOpenRecharge: () => void;
  recentGenerations?: GenerationRecord[];
  prefillText?: string | null;
  onPrefillConsumed?: () => void;
}

const VoiceGlyph: React.FC<{ icon: string; gender: 'male' | 'female' | 'unknown'; className?: string }> = ({ icon, gender, className = "w-4 h-4" }) => {
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

const StarRating: React.FC<{ rating: number; onRate: (n: number) => void; size?: 'sm' | 'md' | 'lg' }> = ({ rating, onRate, size = 'md' }) => {
  const [hover, setHover] = useState(0);
  const starClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-9 h-9' : 'w-6 h-6';
  return (
    <div className="flex items-center gap-0.5" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = (hover || rating) >= n;
        return (
          <button key={n} type="button" onClick={() => onRate(n)} onMouseEnter={() => setHover(n)} aria-label={`${n} / 5`} className="p-1 cursor-pointer transition-colors hover:opacity-80">
            <Star className={starClass} style={{ color: filled ? '#f59e0b' : '#cbd5e1' }} fill={filled ? '#f59e0b' : 'none'} />
          </button>
        );
      })}
    </div>
  );
};

const RATED_KEY = 'sawtify_rated_generations';
function loadRatedMap(): Record<string, number> { try { return JSON.parse(localStorage.getItem(RATED_KEY) || '{}'); } catch { return {}; } }
function saveRatedMap(map: Record<string, number>) { try { localStorage.setItem(RATED_KEY, JSON.stringify(map)); } catch {} }

type CategoryFilter = 'all' | 'commercial' | 'narrative' | 'social' | 'formal';
type GenderFilter = 'all' | 'male' | 'female';
type RegionId = 'general' | 'centre' | 'ouest' | 'est';
type PopoverId = 'tags' | 'voices' | 'region' | null;

// ==========================================================================
// COMPOSANT PRINCIPAL
// ==========================================================================
export const TTSStudio: React.FC<TTSStudioProps> = ({ balance, onDeductPoints, onOpenRecharge, recentGenerations = [], prefillText = null, onPrefillConsumed }) => {
  const { t, isRTL, language } = useLanguage();
  const voices = getVoices(language);
  const styleTags = getStyleTags(language);

  const defaultStarterText = language === 'ar'
    ? '[excited] أسمع مليح خاوتي! مع la plateforme Sawtify جديدة ديالنا... [natural] نصوصكم تتحول لـ voix humaine طبيعية 100%.'
    : '[excited] Écoute bien ya khawti ! Avec notre nouvelle plateforme Sawtify... [natural] tes textes se transforment en voix humaine 100% naturelle.';

  // STATE
  const [text, setText] = useState<string>(() => { try { return localStorage.getItem('sawtify_draft_text') || defaultStarterText; } catch { return defaultStarterText; } });
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('voice_amin');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
  const [favoriteVoiceIds, setFavoriteVoiceIds] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('sawtify_favorite_voices') || '[]'); } catch { return []; } });
  const [speed, setSpeed] = useState<number>(1.0);
  const [pitch, setPitch] = useState<number>(1.0);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [currentGenerationId, setCurrentGenerationId] = useState<string | null>(null);
  const [generationRating, setGenerationRating] = useState<number>(0);
  const [ratingSubmitting, setRatingSubmitting] = useState<boolean>(false);
  const [pendingDownload, setPendingDownload] = useState<{ format: 'mp3' | 'wav' } | null>(null);
  const [generatedVoice, setGeneratedVoice] = useState<{ id: string; name: string } | null>(null);
  const [, setCurrentBlob] = useState<Blob | null>(null);
  const [, setMp3Blob] = useState<Blob | null>(null);
  const [mp3Url, setMp3Url] = useState<string | null>(null);
  const [, setWavSize] = useState<number>(0);
  const audioDurationRef = useRef<number>(0);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [insufficientAlert, setInsufficientAlert] = useState<boolean>(false);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const [isMagicActive, setIsMagicActive] = useState<boolean>(false);
  const [lastGeneratedCost, setLastGeneratedCost] = useState<number>(20);
  
  const [showStartToneModal, setShowStartToneModal] = useState<boolean>(false);
  const startToneRef = useRef<'calm' | 'natural' | 'excited' | null>(null);
  const [ttsStep, setTtsStep] = useState<'tone' | 'register'>('tone');
  const [pendingRegister, setPendingRegister] = useState<'darija' | 'fusha' | 'francais'>('darija');
  const [pendingIntensity, setPendingIntensity] = useState<'low' | 'normal' | 'high'>('normal');
  const registerRef = useRef<'darija' | 'fusha' | 'francais'>('darija');
  const intensityRef = useRef<'low' | 'normal' | 'high'>('normal');

  const [showWhatsNew, setShowWhatsNew] = useState<boolean>(false);
  useEffect(() => {
    if (shouldShowWhatsNew()) {
      markWhatsNewSeen();
      const id = setTimeout(() => setShowWhatsNew(true), 550);
      return () => clearTimeout(id);
    }
  }, []);

  const [composerMode, setComposerMode] = useState<'voice' | 'script'>('voice');
  const [openPop, setOpenPop] = useState<PopoverId>(null);
  const popAnchorRef = useRef<HTMLDivElement | null>(null);

  const onPrefillConsumedRef = useRef(onPrefillConsumed);
  onPrefillConsumedRef.current = onPrefillConsumed;
  useEffect(() => {
    if (!prefillText) return;
    setText(prefillText);
    onPrefillConsumedRef.current?.();
  }, [prefillText]);

  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState<boolean>(false);
  const [selectedRegion, setSelectedRegion] = useState<RegionId>('general');
  const [scriptResult, setScriptResult] = useState<string | null>(null);

  const [lastGenType, setLastGenType] = useState<'script' | 'enhance' | null>(null);
  const [lastGenOutput, setLastGenOutput] = useState<string>('');
  const [lastGenInput, setLastGenInput] = useState<string>('');
  const [lastGenSector, setLastGenSector] = useState<string>('general');
  const [feedbackSent, setFeedbackSent] = useState<boolean>(false);
  const [feedbackGiven, setFeedbackGiven] = useState<'up' | 'down' | null>(null);

  const [notification, setNotification] = useState<string | null>(null);
  const showNotif = useCallback((msg: string) => { setNotification(msg); setTimeout(() => setNotification(null), 2800); }, []);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const autoCloseTimerRef = useRef<number | null>(null);
  const mobileSeekRef = useRef<HTMLDivElement | null>(null);
  const mobileSeekingRef = useRef(false);
  const previousAudioUrlRef = useRef<string | null>(null);
  const previousMp3UrlRef = useRef<string | null>(null);
  const previewRequestRef = useRef<string | null>(null);
  const generationRequestLockRef = useRef(false);
  const enhanceRequestLockRef = useRef(false);
  const scriptRequestLockRef = useRef(false);
  const isRestoringRef = useRef(false);

  const POINTS_COST = 20;
  const PENDING_GEN_KEY = 'sawtify_pending_generation';
  const LAST_RESULT_KEY = 'sawtify_last_result';
  const TTS_UNLOCK_BALANCE_THRESHOLD = 1000;
  const TTS_MAX_CHARS_DEFAULT = 1200;
  const TTS_MAX_CHARS_UNLOCKED = 5000;
  const maxChars = balance >= TTS_UNLOCK_BALANCE_THRESHOLD ? TTS_MAX_CHARS_UNLOCKED : TTS_MAX_CHARS_DEFAULT;

  const estimate = estimatePointsFromChars(text.trim().length);
  const estimatedCost = estimate.points;
  const estimatedSeconds = estimate.seconds;
  const needsTopUp = text.trim().length > 0 && balance < estimatedCost;

  const currentVoice = voices.find(v => v.id === selectedVoiceId) || voices[0];
  const playerVoiceName = generatedVoice?.name || currentVoice.name;
  const filteredVoices = voices
    .filter(voice => (categoryFilter === 'all' || voice.category === categoryFilter) && (genderFilter === 'all' || voice.gender === genderFilter))
    .sort((a, b) => Number(favoriteVoiceIds.includes(b.id)) - Number(favoriteVoiceIds.includes(a.id)));

  const growTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const max = 320;
    el.style.height = `${Math.min(max, el.scrollHeight)}px`;
    el.style.overflowY = el.scrollHeight > max ? 'auto' : 'hidden';
  }, []);
  useEffect(() => { growTextarea(); }, [text, composerMode, growTextarea]);

  useEffect(() => {
    if (isRestoringRef.current) return;
    isRestoringRef.current = true;
    let cancelled = false;
    let timeoutId: NodeJS.Timeout;

    const restorePreviousState = async () => {
      let pending: { startedAt: number; voiceId: string } | null = null;
      try { const raw = localStorage.getItem(PENDING_GEN_KEY); if (raw) pending = JSON.parse(raw); } catch (e) {}

      if (pending && Date.now() - pending.startedAt < 3 * 60 * 1000) {
        setIsGenerating(true);
        const timeoutPromise = new Promise((_, reject) => { timeoutId = setTimeout(() => reject(new Error('RESTORE_TIMEOUT')), 4000); });
        try {
          const raceResult = await Promise.race([ fetchMyGenerations(5), timeoutPromise ]) as any;
          if (raceResult?.message === 'RESTORE_TIMEOUT') { setIsGenerating(false); try { localStorage.removeItem(PENDING_GEN_KEY); } catch {} return; }
          const rows = raceResult;
          const found = rows.find((r: any) => new Date(r.createdAt).getTime() >= pending!.startedAt - 3000);
          if (found && !cancelled) {
            setCurrentAudioUrl(found.audioUrl || null); setCurrentGenerationId(found.id || null);
            setGeneratedVoice({ id: found.voiceId, name: voices.find(v => v.id === found.voiceId)?.name || found.voiceName });
            setGenerationRating(loadRatedMap()[found.id] || 0); setAudioDuration(found.durationSec || 0);
            audioDurationRef.current = found.durationSec || 0; setLastGeneratedCost(found.pointsDeducted);
            showNotif(language === 'ar' ? 'تم استرجاع التسجيل' : 'Résultat récupéré');
            try { localStorage.removeItem(PENDING_GEN_KEY); localStorage.setItem(LAST_RESULT_KEY, JSON.stringify({ id: found.id, createdAt: found.createdAt })); } catch {}
          }
        } catch (err: any) {} finally { clearTimeout(timeoutId); if (!cancelled) setIsGenerating(false); }
        return;
      }
      try {
        const raw = localStorage.getItem(LAST_RESULT_KEY);
        if (raw) {
          const last = JSON.parse(raw);
          const rows = await Promise.race([ fetchMyGenerations(5), new Promise((res) => setTimeout(() => res([]), 2000)) ]);
          const found = (rows as any[]).find(r => r.id === last.id);
          if (found && !cancelled) {
            setCurrentAudioUrl(found.audioUrl || null); setCurrentGenerationId(found.id || null);
            setGeneratedVoice({ id: found.voiceId, name: voices.find(v => v.id === found.voiceId)?.name || found.voiceName });
            setGenerationRating(loadRatedMap()[found.id] || 0); setAudioDuration(found.durationSec || 0);
            audioDurationRef.current = found.durationSec || 0; setLastGeneratedCost(found.pointsDeducted);
          }
        }
      } catch (e) {}
    };
    restorePreviousState();
    return () => { cancelled = true; isRestoringRef.current = false; };
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (popAnchorRef.current && !popAnchorRef.current.contains(e.target as Node)) { setOpenPop(null); } };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { return () => { if (previousAudioUrlRef.current?.startsWith('blob:')) URL.revokeObjectURL(previousAudioUrlRef.current); if (previousMp3UrlRef.current?.startsWith('blob:')) URL.revokeObjectURL(previousMp3UrlRef.current); }; }, []);
  useEffect(() => { if (previousAudioUrlRef.current && previousAudioUrlRef.current !== currentAudioUrl && previousAudioUrlRef.current.startsWith('blob:')) { URL.revokeObjectURL(previousAudioUrlRef.current); } previousAudioUrlRef.current = currentAudioUrl; }, [currentAudioUrl]);
  useEffect(() => { if (previousMp3UrlRef.current && previousMp3UrlRef.current !== mp3Url && previousMp3UrlRef.current.startsWith('blob:')) { URL.revokeObjectURL(previousMp3UrlRef.current); } previousMp3UrlRef.current = mp3Url; }, [mp3Url]);
  useEffect(() => { const id = setTimeout(() => { try { localStorage.setItem('sawtify_draft_text', text); } catch {} }, 500); return () => clearTimeout(id); }, [text]);

  const toggleFavoriteVoice = (voiceId: string) => {
    setFavoriteVoiceIds((prev) => {
      const next = prev.includes(voiceId) ? prev.filter((id) => id !== voiceId) : [...prev, voiceId];
      try { localStorage.setItem('sawtify_favorite_voices', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const handleInsertTag = useCallback((tag: string) => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    setText(prev => prev.substring(0, start) + ' ' + tag + ' ' + prev.substring(end));
    setOpenPop(null);
  }, []);

  const handlePreviewVoice = useCallback(async (e: React.MouseEvent, voice: Voice) => {
    e.stopPropagation();
    if (previewingVoiceId === voice.id || previewRequestRef.current === voice.id) { stopNaturalAudio(); setPreviewingVoiceId(null); previewRequestRef.current = null; return; }
    if (previewRequestRef.current) return;
    previewRequestRef.current = voice.id; setPreviewingVoiceId(voice.id);
    if (voice.sampleAudioUrl) { playNaturalAudio(voice.sampleAudioUrl, () => setPreviewingVoiceId(null), 1, 1); previewRequestRef.current = null; return; }
    try {
      const audioUrl = await requestVoicePreview(voice.id, speed, pitch);
      previewRequestRef.current = null; playNaturalAudio(audioUrl, () => setPreviewingVoiceId(null), speed, pitch);
    } catch (err: any) { setPreviewingVoiceId(null); previewRequestRef.current = null; showNotif(language === 'ar' ? 'فشل تشغيل المعاينة' : 'Erreur de preview'); }
  }, [previewingVoiceId, speed, pitch, language, showNotif]);

  async function handleGenerate(retryCount = 0) {
    if (retryCount === 0) { if (generationRequestLockRef.current) return; generationRequestLockRef.current = true; }
    if (!text.trim() || balance < POINTS_COST) { setInsufficientAlert(true); generationRequestLockRef.current = false; return; }

    setInsufficientAlert(false);
    const generatingVoice = { id: currentVoice.id, name: currentVoice.name };
    if (autoCloseTimerRef.current) { window.clearTimeout(autoCloseTimerRef.current); autoCloseTimerRef.current = null; }
    setIsGenerating(true); setCurrentAudioUrl(null); setGeneratedVoice(null); setMp3Url(null); setPendingDownload(null);

    try { localStorage.setItem(PENDING_GEN_KEY, JSON.stringify({ startedAt: Date.now(), voiceId: currentVoice.id })); } catch (e) {}
    let errMsg = '';
    try {
      const extractedTags = (text.match(/\[(.*?)\]/g) || []).map(tag => tag.replace(/[\[\]]/g, ''));
      if (extractedTags.length === 0) { showNotif(language === 'ar' ? 'أضف وسم عاطفة لصوت أكثر تعبيرًا' : "Ajoutez une balise d'émotion pour plus d'expression"); }

      const startTone = startToneRef.current;
      const startToneTag = startTone === 'calm' ? '[calm]' : startTone === 'excited' ? '[excited]' : startTone === 'natural' ? '[natural]' : '';
      const textToSend = startToneTag ? `${startToneTag} ${text.trim()}` : text;

      const response = await requestTTSGeneration({ text: textToSend, voice_id: currentVoice.id, speed, pitch, emotion_tags: extractedTags, register: registerRef.current, intensity: intensityRef.current }, balance);
      const audioBlob = response.blob || new Blob([], { type: 'audio/wav' });

      setCurrentAudioUrl(response.audio_url); setCurrentGenerationId(response.generation_id || null);
      setGeneratedVoice(generatingVoice); setGenerationRating(0); setCurrentBlob(audioBlob);
      setWavSize(audioBlob.size || 120000); setCurrentTime(0);
      const dur = response.duration_seconds || 0; setAudioDuration(dur); audioDurationRef.current = dur;
      setIsGenerating(false); const realCost = response.points_deducted || POINTS_COST; setLastGeneratedCost(realCost);

      if (response.degraded) {
        try { localStorage.removeItem(PENDING_GEN_KEY); } catch {}
        showNotif(language === 'ar' ? 'معاينة محلية (بدون خصم)' : 'Aperçu local (non facturé)');
      } else {
        (async () => {
          try {
            let storagePath: string | null = null;
            const { data: userData } = await supabase.auth.getUser();
            const generationId = response.generation_id || `gen_${Date.now()}`;
            if (userData.user && audioBlob.size > 0) { storagePath = await uploadGenerationAudio(userData.user.id, generationId, audioBlob); }
            const record: GenerationRecord = { id: generationId, text, voiceId: currentVoice.id, voiceName: currentVoice.name, audioUrl: response.audio_url, pointsDeducted: realCost, durationSec: dur, latencyMs: response.latency_ms, createdAt: new Date().toISOString() };
            await onDeductPoints(realCost, record, storagePath, response.remaining_balance ?? null);
            try { localStorage.removeItem(PENDING_GEN_KEY); localStorage.setItem(LAST_RESULT_KEY, JSON.stringify({ id: generationId, createdAt: record.createdAt })); } catch (e2) {}
            window.dispatchEvent(new CustomEvent('refresh-account-balance'));
          } catch (uploadErr) { console.warn('Erreur upload:', uploadErr); }
        })();
        showNotif(response.milestone_bonus ? `-${realCost} Points · +${response.milestone_bonus} bonus` : (response.notification || `-${realCost} Points`));
        playGenerationChime();
      }

      try {
        const { convertWavToMp3 } = await chargerConvertisseurMp3();
        const r = await convertWavToMp3(audioBlob, () => {});
        setMp3Blob(r.mp3Blob); setMp3Url(r.mp3Url);
      } catch (e) { console.warn('MP3 conversion failed:', e); }

    } catch (err: any) {
      console.error('Erreur TTS:', err); errMsg = err?.message || '';
      if (errMsg.includes('[QUEUE_BUSY]')) {
        const parts = errMsg.split('[QUEUE_BUSY]')[1]?.split('|') || ['4'];
        const retryAfter = Math.max(2, parseInt(parts[0], 10) || 4);
        if (retryCount < 8) { showNotif(language === 'ar' ? `جاري التوليد... (${retryCount + 1}/8)` : `Génération en attente (${retryCount + 1}/8)`); setTimeout(() => handleGenerate(retryCount + 1), retryAfter * 1000); return; } 
        else { showNotif(language === 'ar' ? 'الخادم بطيء' : 'Serveur lent'); }
      } else if (errMsg.includes('insuffisant') || errMsg.includes('402')) { setInsufficientAlert(true); showNotif(language === 'ar' ? 'رصيد غير كافٍ' : 'Solde insuffisant'); } 
      else { showNotif(language === 'ar' ? 'خطأ في التوليد' : 'Erreur de génération'); }
      setIsGenerating(false);
    } finally {
      if (!errMsg?.includes('[QUEUE_BUSY]') || retryCount >= 2) {
        generationRequestLockRef.current = false; startToneRef.current = null; registerRef.current = 'darija'; intensityRef.current = 'normal';
        if (errMsg && !errMsg.includes('[QUEUE_BUSY]')) { try { localStorage.removeItem(PENDING_GEN_KEY); } catch {} }
      }
    }
  }

  const confirmStartTone = (tone: 'calm' | 'natural' | 'excited') => { startToneRef.current = tone; setTtsStep('register'); };
  const confirmRegisterAndIntensity = () => { registerRef.current = pendingRegister; intensityRef.current = pendingIntensity; setShowStartToneModal(false); handleGenerate(); };

  const handleEnhanceText = async () => {
    if (!text.trim() || isEnhancing || enhanceRequestLockRef.current) return;
    if (balance < 2) { setInsufficientAlert(true); return; }
    enhanceRequestLockRef.current = true; setInsufficientAlert(false); setIsEnhancing(true); setFeedbackSent(false); setFeedbackGiven(null);
    try {
      const originalText = text;
      const result = await requestEnhanceText(text, selectedRegion);
      setText(result.enhanced_text); showNotif(result.notification || '-2 Points');
      setLastGenType('enhance'); setLastGenInput(originalText); setLastGenOutput(result.enhanced_text);
      setIsMagicActive(true); setTimeout(() => setIsMagicActive(false), 900); playEnhanceChime();
      window.dispatchEvent(new CustomEvent('refresh-account-balance'));
    } catch (e: any) {
      if (e?.message?.includes('insuffisant')) setInsufficientAlert(true);
      else if (e?.message?.includes('quotidienne')) showNotif(language === 'ar' ? 'لقد بلغت حدك اليومي' : 'Limite quotidienne atteinte');
      else showNotif(language === 'ar' ? 'خطأ في التحسين' : 'Erreur amélioration');
    } finally { setIsEnhancing(false); enhanceRequestLockRef.current = false; }
  };

  const handleGenerateScript = async () => {
    const description = text.trim();
    if (!description || isGeneratingScript || scriptRequestLockRef.current) return;
    if (balance < 5) { setInsufficientAlert(true); return; }
    scriptRequestLockRef.current = true; setInsufficientAlert(false); setIsGeneratingScript(true); setFeedbackSent(false); setFeedbackGiven(null); setOpenPop(null);
    try {
      const result = await requestGenerateScript(description, 'excited', selectedRegion);
      setScriptResult(result.script); showNotif(result.notification || '-5 Points');
      setLastGenType('script'); setLastGenInput(description); setLastGenOutput(result.script); setLastGenSector(result.sector_used || 'general');
      setIsMagicActive(true); setTimeout(() => setIsMagicActive(false), 900); playScriptChime();
      window.dispatchEvent(new CustomEvent('refresh-account-balance'));
    } catch (e: any) {
      if (e?.message?.includes('insuffisant')) setInsufficientAlert(true);
      else if (e?.message?.includes('quotidienne')) showNotif(language === 'ar' ? 'لقد بلغت حدك اليومي' : 'Limite quotidienne');
      else showNotif(language === 'ar' ? 'خطأ في إنشاء السيناريو' : 'Erreur script');
    } finally { setIsGeneratingScript(false); scriptRequestLockRef.current = false; }
  };

  const handleUseScript = useCallback(() => {
    if (!scriptResult) return; setText(scriptResult); setComposerMode('voice');
    showNotif(language === 'ar' ? 'تم وضع النص في المربع — جاهز للتوليد' : 'Script placé dans la barre — prêt pour la voix');
    requestAnimationFrame(() => { growTextarea(); textareaRef.current?.focus(); });
  }, [scriptResult, language, showNotif, growTextarea]);

  const handleCopyScript = useCallback(() => {
    if (!scriptResult) return;
    navigator.clipboard.writeText(scriptResult).then(() => { showNotif(language === 'ar' ? 'تم نسخ النص' : 'Script copié'); }).catch(() => { showNotif(language === 'ar' ? 'فشل النسخ' : 'Erreur copie'); });
  }, [scriptResult, language, showNotif]);

  const handleSendFeedback = async (rating: number) => {
    if (!lastGenType || !lastGenOutput || feedbackSent) return;
    setFeedbackGiven(rating >= 4 ? 'up' : 'down');
    try {
      await sendAIFeedback({ input_text: lastGenInput, output_text: lastGenOutput, rating, type: lastGenType, region: selectedRegion, sector: lastGenSector });
      setFeedbackSent(true); showNotif(rating >= 4 ? (language === 'ar' ? 'شكراً!' : 'Merci !') : (language === 'ar' ? 'شكراً' : 'Merci'));
    } catch (e) { setFeedbackGiven(null); }
  };

  const togglePlay = useCallback(() => {
    if (!audioRef.current || !currentAudioUrl) return;
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); } 
    else { audioRef.current.play().catch(err => { console.warn('Playback error:', err); setIsPlaying(false); }); setIsPlaying(true); }
  }, [isPlaying, currentAudioUrl]);

  const handleTimeUpdate = useCallback(() => { if (audioRef.current) setCurrentTime(audioRef.current.currentTime); }, []);

  const seekFromClientX = useCallback((clientX: number) => {
    const el = mobileSeekRef.current; if (!el || !audioRef.current || audioDuration <= 0) return;
    const rect = el.getBoundingClientRect(); const percent = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    audioRef.current.currentTime = percent * audioDuration; setCurrentTime(percent * audioDuration);
  }, [audioDuration]);

  const handleClosePlayer = useCallback(() => {
    setIsPlaying(false);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    setCurrentAudioUrl(null); setMp3Url(null); setCurrentTime(0); setAudioDuration(0); audioDurationRef.current = 0;
    setCurrentGenerationId(null); setGeneratedVoice(null); setGenerationRating(0); setPendingDownload(null);
    if (autoCloseTimerRef.current) { window.clearTimeout(autoCloseTimerRef.current); autoCloseTimerRef.current = null; }
  }, []);

  const canRateCurrent = Boolean(currentGenerationId && /^[0-9a-f-]{36}$/i.test(currentGenerationId));

  const saveGenerationRating = useCallback(async (stars: number): Promise<boolean> => {
    if (!currentGenerationId || ratingSubmitting) return false;
    if (!/^[0-9a-f-]{36}$/i.test(currentGenerationId)) return false;
    setRatingSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('rate_generation', { p_generation_id: currentGenerationId, p_rating: stars });
      if (error || !(data as any)?.success) { return false; }
      return true;
    } catch (e) { return false; } finally { setRatingSubmitting(false); }
  }, [currentGenerationId, ratingSubmitting]);

  const startDownload = useCallback((format: 'mp3' | 'wav') => {
    const useMp3 = format === 'mp3' && mp3Url;
    const url = useMp3 ? mp3Url : currentAudioUrl;
    if (!url) return;
    const a = document.createElement('a'); a.href = url; a.download = `sawtify-${Date.now()}.${useMp3 ? 'mp3' : 'wav'}`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }, [mp3Url, currentAudioUrl]);

  const handleDownloadClick = useCallback((format: 'mp3' | 'wav') => {
    if (generationRating === 0 && canRateCurrent) { setPendingDownload({ format }); return; }
    startDownload(format);
  }, [generationRating, canRateCurrent, startDownload]);

  const handleModalRate = useCallback((stars: number) => {
    const format = pendingDownload?.format || 'wav'; setGenerationRating(stars); setPendingDownload(null);
    if (currentGenerationId) { const rated = loadRatedMap(); rated[currentGenerationId] = stars; saveRatedMap(rated); }
    startDownload(format);
    void saveGenerationRating(stars).then((ok) => { if (ok) showNotif(language === 'ar' ? 'شكراً على تقييمك!' : 'Merci pour ta note !'); });
    if (autoCloseTimerRef.current) window.clearTimeout(autoCloseTimerRef.current);
    autoCloseTimerRef.current = window.setTimeout(() => handleClosePlayer(), 1000);
  }, [pendingDownload, currentGenerationId, startDownload, saveGenerationRating, showNotif, language, handleClosePlayer]);

  const handleModalSkip = useCallback(() => { const format = pendingDownload?.format || 'wav'; setPendingDownload(null); startDownload(format); }, [pendingDownload, startDownload]);

  const handleCopyText = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => { showNotif(language === 'ar' ? 'فشل النسخ' : 'Erreur copie'); });
  }, [text, language, showNotif]);

  const regionButtons: { id: RegionId; ar: string; fr: string }[] = [
    { id: 'general', ar: 'عام', fr: 'Général' }, { id: 'centre', ar: 'الوسط', fr: 'Centre' },
    { id: 'ouest', ar: 'الغرب', fr: 'Ouest' }, { id: 'est', ar: 'الشرق', fr: 'Est' },
  ];
  const currentRegion = regionButtons.find(r => r.id === selectedRegion) || regionButtons[0];

  const categoryOptions: { id: CategoryFilter; label: string }[] = [
    { id: 'all', label: t.categoryAll || 'Tous' }, { id: 'commercial', label: t.categoryCommercial || 'Commercial' },
    { id: 'narrative', label: t.categoryNarrative || 'Narratif' }, { id: 'social', label: t.categorySocial || 'Social' },
    { id: 'formal', label: t.categoryFormal || 'Formel' },
  ];

  const suggestions = composerMode === 'voice'
    ? (language === 'ar'
      ? [ { icon: <Megaphone className="w-3.5 h-3.5" />, label: 'إذاعة راديو 15 ثانية', starter: 'جديد! هذ السيمانة غير، استفد من -30% على كامل المتجر... [excited] زربوا!' }, { icon: <MessageCircle className="w-3.5 h-3.5" />, label: 'رسالة واتساب احترافية', starter: 'سلام، شكرا على رسالتك. [calm] فريقنا غادي يرد عليك في أقرب وقت.' }, { icon: <ShoppingBag className="w-3.5 h-3.5" />, label: 'تعليق صوتي للمتجر', starter: 'اكتشف مجموعتنا الجديدة... [natural] توصيل مجاني لكامل الجزائر!' }, { icon: <Headphones className="w-3.5 h-3.5" />, label: 'مقدمة بودكاست بالدارجة', starter: 'أهلا بكم في البودكاست تاعنا... [natural] اليوم نحكيلكم على قصة تعلم منها.' } ]
      : [ { icon: <Megaphone className="w-3.5 h-3.5" />, label: 'Pub radio de 15 secondes', starter: 'Nouveauté ! Cette semaine seulement, profitez de -30% sur toute la boutique... [excited] Foncez !' }, { icon: <MessageCircle className="w-3.5 h-3.5" />, label: 'Message WhatsApp pro', starter: 'Bonjour, merci pour votre message. [calm] Notre équipe vous répondra dans les plus brefs délais.' }, { icon: <ShoppingBag className="w-3.5 h-3.5" />, label: 'Voix off e-commerce', starter: 'Découvrez notre nouvelle collection... [natural] Livraison gratuite partout en Algérie !' }, { icon: <Headphones className="w-3.5 h-3.5" />, label: 'Intro podcast en darija', starter: 'أهلا بكم في البودكاست تاعنا... [natural] اليوم نحكيلكم على قصة تعلم منها.' } ])
    : (language === 'ar'
      ? [ { icon: <ShoppingBag className="w-3.5 h-3.5" />, label: 'متجر إلكتروني — تخفيضات -30%', starter: 'متجر ملابس إلكتروني، تخفيضات -30% هذ السيمانة، توصيل لكامل الجزائر' }, { icon: <UtensilsCrossed className="w-3.5 h-3.5" />, label: 'مطعم — افتتاح جديد', starter: 'مطعم جديد في الجزائر العاصمة، مطبخ تقليدي، أجواء عائلية' }, { icon: <House className="w-3.5 h-3.5" />, label: 'عقار — شقة للبيع', starter: 'شقة F3 للبيع في وهران، حي هادئ قريب من كل الخدمات' }, { icon: <CalendarDays className="w-3.5 h-3.5" />, label: 'حدث — سهرة نهاية الأسبوع', starter: 'سهرة فنية هذا السبت في قسنطينة، موسيقى مباشرة وأنشطة' } ]
      : [ { icon: <ShoppingBag className="w-3.5 h-3.5" />, label: 'Boutique en ligne — promo -30%', starter: 'Boutique de vêtements en ligne, promo -30% cette semaine, livraison partout en Algérie' }, { icon: <UtensilsCrossed className="w-3.5 h-3.5" />, label: 'Restaurant — nouvelle ouverture', starter: "Nouveau restaurant à Alger qui vient d'ouvrir, cuisine traditionnelle, ambiance familiale" }, { icon: <House className="w-3.5 h-3.5" />, label: 'Immobilier — appartement à vendre', starter: 'Appartement F3 à vendre à Oran, quartier calme, proche de tous les services' }, { icon: <CalendarDays className="w-3.5 h-3.5" />, label: 'Événement — soirée du week-end', starter: 'Soirée événementielle ce samedi à Constantine, musique live et animations' } ]);

  const handleComposerSubmit = () => {
    if (composerMode === 'script') { handleGenerateScript(); return; }
    if (needsTopUp) { onOpenRecharge(); return; }
    if (!text.trim() || balance < POINTS_COST) { setInsufficientAlert(true); return; }
    if (isGenerating) return;
    setTtsStep('tone'); setPendingRegister('darija'); setPendingIntensity('normal'); setShowStartToneModal(true);
  };

  // ------------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------------
  return (
    <div className="saw-bg h-[calc(100dvh_-_64px_-_env(safe-area-inset-top,0px))] w-full overflow-y-auto relative transition-all duration-300 lg:h-[calc(100vh_-_64px_-_env(safe-area-inset-top,0px))] pb-28 lg:pb-12">

      <div className="saw-aurora" aria-hidden="true">
        <div className="saw-blob" style={{ width: 620, height: 620, top: -180, left: -120, background: 'radial-gradient(circle, rgba(139,92,246,0.30), transparent 65%)' }} />
        <div className="saw-blob" style={{ width: 560, height: 560, top: -120, right: -140, background: 'radial-gradient(circle, rgba(232,121,249,0.22), transparent 65%)' }} />
        <div className="saw-blob" style={{ width: 720, height: 720, bottom: -320, left: '50%', transform: 'translateX(-50%)', background: 'radial-gradient(circle, rgba(129,140,248,0.24), transparent 65%)' }} />
      </div>

      {notification && (
        <div className="fixed left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 rounded-full bg-[#6d28d9] text-white font-semibold text-sm shadow-lg flex items-center gap-2" style={{ top: 'calc(1.5rem + env(safe-area-inset-top, 0px))' }} role="status">
          <Check className="w-4 h-4" /><span>{notification}</span>
        </div>
      )}

      <fieldset disabled={isGenerating} className="contents">

        {insufficientAlert && (
          <div className="relative z-10 mx-auto mt-3 w-[min(800px,calc(100%-2rem))] rounded-2xl border border-rose-200 bg-rose-50/90 px-4 py-2.5 flex items-center justify-between text-xs text-rose-700">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500" />
              <span>{language === 'ar' ? 'رصيدك غير كافٍ.' : 'Solde insuffisant.'}</span>
            </div>
            <button onClick={onOpenRecharge} className="saw-flat px-3 py-1.5 rounded-full text-[11px] font-semibold text-rose-700 border-rose-200 hover:bg-rose-100 cursor-pointer">
              {language === 'ar' ? 'شحن' : 'Recharger'}
            </button>
          </div>
        )}

        {/* ========================================================================================= */}
        {/* = ESPACEMENT GÉANT AJOUTÉ ICI : pt-12 lg:pt-24 (en haut) pour descendre tout le bloc = */}
        {/* ========================================================================================= */}
        <main className="relative z-[1] mx-auto w-[min(800px,calc(100%-2rem))] flex flex-col items-center pt-12 lg:pt-24">

          {/* ========================================================================================= */}
          {/* = ESPACEMENT GÉANT AJOUTÉ ICI : gap-8 (entre solde et "Ahla") et mb-20 lg:mb-28 (en bas) = */}
          {/* ========================================================================================= */}
          <div className="w-full flex flex-col items-center gap-8 mb-20 lg:mb-28">
            <button onClick={onOpenRecharge} className="saw-flat rounded-full px-3.5 py-1.5 text-[11px] font-semibold text-[#3b2d63] cursor-pointer flex items-center gap-1.5" title={language === 'ar' ? 'شحن الرصيد' : 'Recharger le solde'}>
              <span className="font-num">{language === 'ar' ? `الرصيد ${balance} نقطة` : `Solde ${balance} pts`}</span>
              <span className="text-slate-400">·</span>
              <span className="text-[#6d28d9] font-bold">{language === 'ar' ? 'شحن' : 'Recharger'}</span>
            </button>
            <h1 className="flex items-center gap-3" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
              <Sparkles className="w-5 h-5 text-[#6d28d9]" fill="currentColor" />
              <span className="text-4xl sm:text-5xl font-medium tracking-tight text-[#2e1065]">
                {language === 'ar' ? 'أهلا، Labbaci' : 'Hé, Labbaci'}
              </span>
            </h1>
          </div>

          {/* ════════ LA BARRE ════════ */}
          <div ref={popAnchorRef} className="w-full relative">
            <div className="saw-glass relative rounded-[28px] p-3 sm:p-4 transition-shadow duration-200">

              <textarea
                ref={textareaRef} value={text} onChange={(e) => setText(e.target.value)} maxLength={maxChars} rows={1}
                placeholder={composerMode === 'script' ? (language === 'ar' ? 'صف منتجك أو فكرتك… (مثال: متجر أحذية في وهران، تخفيضات -30%)' : 'Décris ton produit ou ton idée… (ex : boutique de sneakers à Oran, promo -30%)') : (t.textPlaceholder || 'Écrivez votre texte ici...')}
                className={`w-full min-h-[52px] bg-transparent border-0 outline-none resize-none text-[15px] leading-relaxed text-slate-900 placeholder:text-slate-400/80 custom-scrollbar ${isMagicActive && lastGenType === 'enhance' ? 'saw-magic-pulse' : ''}`}
                style={{ unicodeBidi: 'plaintext' }} dir="auto"
              />

              <div className="flex items-center gap-1.5 sm:gap-2 mt-2">
                {composerMode === 'voice' && (
                  <button onClick={() => setOpenPop(openPop === 'tags' ? null : 'tags')} className={`saw-flat w-9 h-9 rounded-full flex items-center justify-center cursor-pointer ${openPop === 'tags' ? 'saw-chip-active' : 'text-slate-600'}`} title={language === 'ar' ? 'إدراج تأثير' : 'Insérer une balise'}>
                    <Plus className="w-4 h-4" />
                  </button>
                )}

                <button onClick={() => setComposerMode('voice')} className={`px-3.5 py-2 rounded-full text-xs font-semibold cursor-pointer transition-colors ${composerMode === 'voice' ? 'saw-chip-active' : 'saw-flat text-slate-600'}`}>{language === 'ar' ? 'تعليق صوتي' : 'Voix-off'}</button>
                <button onClick={() => setComposerMode('script')} className={`px-3.5 py-2 rounded-full text-xs font-semibold cursor-pointer transition-colors ${composerMode === 'script' ? 'saw-chip-active' : 'saw-flat text-slate-600'}`}>{language === 'ar' ? 'نص ذكي' : 'Script IA'}</button>
                <div className="flex-1" />

                {composerMode === 'voice' && (
                  <button onClick={handleEnhanceText} disabled={isEnhancing || !text.trim() || balance < 2} className="saw-flat h-9 rounded-full px-3 flex items-center gap-1.5 cursor-pointer disabled:opacity-40 text-slate-600" title={language === 'ar' ? 'تحسين النص (2 نقاط)' : 'Améliorer le texte (2 pts)'}>
                    {isEnhancing ? <RefreshCw className="w-4 h-4 animate-spin text-[#6d28d9]" /> : <Wand2 className="w-4 h-4 text-[#6d28d9]" />}
                    <span className="text-[11px] font-bold text-[#6d28d9]">{language === 'ar' ? 'المحسن' : 'Magique'}</span>
                  </button>
                )}

                <button onClick={handleCopyText} className="saw-flat w-9 h-9 rounded-full flex items-center justify-center cursor-pointer text-slate-600" title={language === 'ar' ? 'نسخ' : 'Copier'}>
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>

                {composerMode === 'voice' ? (
                  <button onClick={() => setOpenPop(openPop === 'voices' ? null : 'voices')} className={`flex items-center gap-2 rounded-full ps-1.5 pe-2.5 py-1.5 cursor-pointer transition-colors ${openPop === 'voices' ? 'saw-chip-active' : 'saw-flat text-slate-700'}`} title={t.catalogHeader}>
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${openPop === 'voices' ? 'bg-white/20 text-white' : 'bg-[#ede9fe] text-[#6d28d9]'}`}><VoiceGlyph icon={currentVoice.icon} gender={currentVoice.gender} className="w-3.5 h-3.5" /></span>
                    <span className="text-xs font-bold max-w-[80px] truncate">{currentVoice.name}</span>
                    <ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform ${openPop === 'voices' ? 'rotate-180' : ''}`} />
                  </button>
                ) : (
                  <button onClick={() => setOpenPop(openPop === 'region' ? null : 'region')} className={`flex items-center gap-2 rounded-full px-3 py-2 cursor-pointer transition-colors ${openPop === 'region' ? 'saw-chip-active' : 'saw-flat text-slate-700'}`} title={language === 'ar' ? 'إعدادات النص' : 'Réglages du script'}>
                    <Sparkles className="w-3.5 h-3.5" /><span className="text-xs font-bold">{language === 'ar' ? currentRegion.ar : currentRegion.fr}</span><ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform ${openPop === 'region' ? 'rotate-180' : ''}`} />
                  </button>
                )}

                <button onClick={handleComposerSubmit} disabled={isGenerating || (composerMode === 'script' ? isGeneratingScript : !text.trim())} className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-colors disabled:opacity-40 ${needsTopUp && composerMode === 'voice' ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'saw-flat-violet'}`} title={composerMode === 'script' ? (language === 'ar' ? 'إنشاء النص' : 'Générer le script') : (needsTopUp ? (language === 'ar' ? 'اشحن رصيدك للتوليد' : 'Rechargez pour générer') : t.generateBtn)}>
                  {composerMode === 'script' ? (isGeneratingScript ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />) : (needsTopUp ? <Zap className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />)}
                </button>
              </div>

              {/* ==================================================================================================== */}
              {/* = FENÊTRE FLOTTANTE "BALISES" (À DROITE dans l'espace vide sur PC, liste déroulante sur Mobile)    = */}
              {/* ==================================================================================================== */}
              {openPop === 'tags' && (
                <div className="saw-pop absolute top-full mt-2 start-0 w-[min(352px,calc(100vw-3rem))] max-h-[min(450px,60vh)] overflow-y-auto custom-scrollbar p-3 z-[100] lg:fixed lg:top-24 lg:start-8 xl:start-16 lg:w-[352px] lg:max-h-[calc(100vh-160px)] lg:shadow-2xl lg:mt-0 lg:border lg:border-white/50 lg:rounded-3xl">
                  <div className="flex items-center justify-between px-1 pb-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{language === 'ar' ? 'اختر تأثيراً لإدراجه' : 'Choisir un effet'}</span>
                    <span className="text-[10px] text-slate-400">{language === 'ar' ? 'الصوت يتبع النبرة' : 'la voix suit la tonalité'}</span>
                  </div>

                  <div className="flex items-center gap-1.5 px-1 pt-1 pb-1.5"><SlidersHorizontal className="w-3 h-3 text-[#6d28d9]" /><span className="text-[10px] font-bold text-[#6d28d9] uppercase tracking-wider">{language === 'ar' ? 'نبرة الأداء (كامل النص)' : 'Ton (toute la lecture)'}</span></div>
                  <div className="grid grid-cols-2 gap-1">
                    {styleTags.map((tagObj) => (
                      <button key={tagObj.tag} onClick={() => handleInsertTag(tagObj.tag)} title={`${tagObj.tag} — ${tagObj.desc}`} className="saw-flat rounded-xl px-2 py-1.5 text-start cursor-pointer text-slate-700">
                        <span className="block text-[11px] font-semibold">{`[${tagObj.label}]`}</span>
                        <span className="block text-[9px] text-slate-400 font-num" dir="ltr">{tagObj.tag}</span>
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5 px-1 pt-3 pb-1.5"><AudioLines className="w-3 h-3 text-[#6d28d9]" /><span className="text-[10px] font-bold text-[#6d28d9] uppercase tracking-wider">{language === 'ar' ? `أصوات بشرية (${VOCAL_BURST_COUNT})` : `Sons humains (${VOCAL_BURST_COUNT})`}</span></div>
                  {BURST_SECTIONS.map((section) => (
                    <div key={section.category}>
                      <div className="text-[10px] font-semibold text-slate-400 px-1 pt-2 pb-1">{language === 'ar' ? section.ar : section.fr}</div>
                      <div className="grid grid-cols-2 gap-1">
                        {(VOCAL_BURSTS[section.category] || []).map((v) => (
                          <button key={v.tag} onClick={() => handleInsertTag(v.tag)} title={`${v.tag} — ${language === 'ar' ? v.ar : v.fr}`} className="saw-flat rounded-xl px-2 py-1.5 text-start cursor-pointer">
                            <span className="block text-[10px] font-semibold text-slate-700">{language === 'ar' ? v.ar : v.fr}</span>
                            <span className="block text-[9px] text-slate-400 font-num" dir="ltr">{v.tag}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ==================================================================================================== */}
              {/* = FENÊTRE FLOTTANTE "VOIX" (À GAUCHE dans l'espace vide sur PC, liste déroulante sur Mobile)       = */}
              {/* ==================================================================================================== */}
              {openPop === 'voices' && (
                <div className="saw-pop absolute top-full mt-2 end-0 w-[min(320px,calc(100vw-3rem))] max-h-[min(450px,60vh)] flex flex-col p-3 z-[100] lg:fixed lg:top-24 lg:end-8 xl:end-16 lg:w-[340px] lg:max-h-[calc(100vh-160px)] lg:shadow-2xl lg:mt-0 lg:border lg:border-white/50 lg:rounded-3xl">
                  <div className="flex items-center justify-between px-1 pb-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{t.catalogHeader}</span>
                    <span className="text-[10px] text-slate-400 font-num">{voices.length}</span>
                  </div>

                  <div className="flex gap-1 mb-2">
                    {([ { id: 'all' as GenderFilter, label: t.allGenders }, { id: 'male' as GenderFilter, label: t.maleGenders }, { id: 'female' as GenderFilter, label: t.femaleGenders } ]).map((g) => (
                      <button key={g.id} onClick={() => setGenderFilter(g.id)} className={`flex-1 py-1.5 rounded-full text-[11px] font-semibold cursor-pointer transition-colors ${genderFilter === g.id ? 'saw-chip-active' : 'saw-flat text-slate-600'}`}>{g.label}</button>
                    ))}
                  </div>

                  <div className="relative mb-2">
                    <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)} className="w-full appearance-none px-3 py-2 pe-8 rounded-full text-[11px] font-medium text-slate-700 bg-white/70 border border-[rgba(76,29,149,0.12)] hover:bg-white focus:outline-none cursor-pointer">
                      {categoryOptions.map(opt => (<option key={opt.id} value={opt.id}>{opt.label}</option>))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute top-1/2 -translate-y-1/2 end-2.5 pointer-events-none" />
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-0.5">
                    {filteredVoices.map((voice) => {
                      const isSelected = voice.id === selectedVoiceId;
                      const isPreviewing = previewingVoiceId === voice.id;
                      return (
                        <div key={voice.id} onClick={() => { setSelectedVoiceId(voice.id); setOpenPop(null); }} className={`flex items-center gap-2 px-2.5 py-2 rounded-2xl cursor-pointer transition-colors ${isSelected ? 'bg-[#ede9fe]' : 'hover:bg-white/80'}`}>
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isSelected ? 'bg-[#6d28d9] text-white' : 'bg-white text-slate-500 border border-[rgba(76,29,149,0.12)]'}`}>
                            <VoiceGlyph icon={voice.icon} gender={voice.gender} className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[11px] font-semibold text-slate-800 truncate block">{voice.name}</span>
                            <span className="text-[9px] text-slate-400 truncate block">{voice.dialect}</span>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button type="button" onClick={(e) => { e.stopPropagation(); toggleFavoriteVoice(voice.id); }} className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${favoriteVoiceIds.includes(voice.id) ? 'text-amber-500 bg-amber-50' : 'text-slate-300 hover:text-amber-500 hover:bg-white'}`} title="Favori" aria-pressed={favoriteVoiceIds.includes(voice.id)}><Star className="w-3.5 h-3.5" fill={favoriteVoiceIds.includes(voice.id) ? 'currentColor' : 'none'} /></button>
                            <button onClick={(e) => handlePreviewVoice(e, voice)} className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${isPreviewing ? 'text-[#6d28d9] bg-white' : 'text-slate-400 hover:text-slate-700 hover:bg-white'}`}>{isPreviewing ? <Volume2 className="w-3.5 h-3.5 animate-pulse" /> : <Play className="w-3.5 h-3.5" />}</button>
                          </div>
                        </div>
                      );
                    })}
                    {filteredVoices.length === 0 && <p className="text-[11px] text-slate-400 text-center py-4">{language === 'ar' ? 'لا توجد نتائج' : 'Aucun résultat'}</p>}
                  </div>

                  <div className="mt-2 pt-2 border-t border-[rgba(76,29,149,0.10)] space-y-2">
                    <div className="space-y-1"><div className="flex justify-between text-[10px]"><span className="text-slate-500 font-medium">{t.speedLabel}</span><span className="font-num font-bold text-slate-900">{speed.toFixed(1)}x</span></div><input type="range" min="0.7" max="1.5" step="0.1" value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))} className="thick-slider w-full bg-slate-200 rounded appearance-none cursor-pointer" /></div>
                    <div className="space-y-1"><div className="flex justify-between text-[10px]"><span className="text-slate-500 font-medium">{t.pitchLabel}</span><span className="font-num font-bold text-slate-900">{pitch.toFixed(1)}</span></div><input type="range" min="0.8" max="1.3" step="0.1" value={pitch} onChange={(e) => setPitch(parseFloat(e.target.value))} className="thick-slider w-full bg-slate-200 rounded appearance-none cursor-pointer" /></div>
                  </div>
                </div>
              )}

              {/* ==================================================================================================== */}
              {/* = FENÊTRE FLOTTANTE "RÉGION/SCRIPT" (À GAUCHE dans l'espace vide sur PC, liste sur Mobile)         = */}
              {/* ==================================================================================================== */}
              {openPop === 'region' && (
                <div className="saw-pop absolute top-full mt-2 end-0 w-[min(300px,calc(100vw-3rem))] max-h-[min(300px,50vh)] overflow-y-auto p-3 z-[100] lg:fixed lg:top-24 lg:end-8 xl:end-16 lg:w-[320px] lg:shadow-2xl lg:mt-0 lg:border lg:border-white/50 lg:rounded-3xl">
                  <div className="px-1 pb-2 text-[11px] font-bold text-slate-500 uppercase tracking-wide">{language === 'ar' ? 'اللهجة / المنطقة' : 'Lahdja / Région'}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {regionButtons.map(r => (
                      <button key={r.id} onClick={() => { setSelectedRegion(r.id); setOpenPop(null); }} className={`px-3.5 py-2 rounded-full text-xs font-semibold cursor-pointer transition-colors ${selectedRegion === r.id ? 'saw-chip-active' : 'saw-flat text-slate-700'}`}>{language === 'ar' ? r.ar : r.fr}</button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 px-1 pt-2.5 leading-relaxed">{language === 'ar' ? 'النص يتبع اللهجة المختارة.' : 'Le script suit la région choisie.'}</p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap justify-center gap-2 mt-5">
              {suggestions.map((s) => (
                <button key={s.label} onClick={() => { setText(s.starter); requestAnimationFrame(() => { growTextarea(); textareaRef.current?.focus(); }); }} className="saw-flat rounded-full px-3.5 py-2 text-[11px] font-semibold text-slate-600 cursor-pointer flex items-center gap-1.5 hover:text-[#6d28d9]"><span className="text-[#6d28d9]">{s.icon}</span>{s.label}</button>
              ))}
            </div>

            {recentGenerations.length > 0 && (
              <div className="flex flex-wrap justify-center items-center gap-2 mt-3">
                <History className="w-3 h-3 text-slate-400" />
                {recentGenerations.slice(0, 3).map((gen) => (
                  <button key={gen.id} onClick={() => { setText(gen.text); setComposerMode('voice'); requestAnimationFrame(() => { growTextarea(); textareaRef.current?.focus(); }); }} className="text-[10px] text-slate-500 hover:text-[#6d28d9] cursor-pointer transition-colors max-w-[220px] truncate" title={gen.text}>{gen.text.substring(0, 28)}…</button>
                ))}
              </div>
            )}

            <div className="w-full flex flex-wrap items-center justify-between gap-2 mt-3 px-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`text-[11px] ${needsTopUp ? 'font-semibold text-rose-600' : 'text-slate-500'}`} title={language === 'ar' ? 'تقدير مبني على طول النص — التكلفة النهائية حسب المدة الفعلية للتسجيل.' : 'Estimation basée sur la longueur du texte — coût final selon la durée réelle de l’audio.'}>
                  {language === 'ar' ? (<>هذا النص يستهلك <span className="font-num font-bold">~{estimatedCost}</span> نقطة{estimatedSeconds > 0 ? <> · ≈ <span className="font-num">{estimatedSeconds}s</span></> : null}</>) : (<>Ce texte consomme <span className="font-num font-bold">~{estimatedCost}</span> points{estimatedSeconds > 0 ? <> · ≈ <span className="font-num">{estimatedSeconds}s</span></> : null}</>)}
                </span>
                <span className="text-[10px] text-slate-400 font-num"><span className={`font-semibold ${text.length >= maxChars * 0.9 ? 'text-amber-600' : 'text-slate-500'}`}>{text.length}</span> / {maxChars}</span>
              </div>
              {needsTopUp && ( <button onClick={onOpenRecharge} className="rounded-full bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold px-4 py-2 cursor-pointer transition-colors">{language === 'ar' ? 'اشحن رصيدك للتوليد' : 'Rechargez pour générer'}</button> )}
            </div>

            {balance < TTS_UNLOCK_BALANCE_THRESHOLD && (
              <p className="w-full text-[10px] text-slate-400 px-1 mt-1">{language === 'ar' ? `(افتح ${TTS_MAX_CHARS_UNLOCKED} حرف عند ${TTS_UNLOCK_BALANCE_THRESHOLD}+ نقطة)` : `(débloquez ${TTS_MAX_CHARS_UNLOCKED} caractères à ${TTS_UNLOCK_BALANCE_THRESHOLD}+ points)`}</p>
            )}

            {lastGenType && lastGenOutput && (
              <div className="flex items-center gap-2 mt-2 px-1">
                <span className="text-[10px] text-slate-400">{feedbackSent ? (language === 'ar' ? 'تم استلام رأيك' : 'Avis envoyé') : (language === 'ar' ? 'نتيجة الذكاء الاصطناعي:' : 'Résultat IA :')}</span>
                <button onClick={() => handleSendFeedback(5)} disabled={feedbackSent} className="saw-flat w-7 h-7 rounded-full flex items-center justify-center cursor-pointer disabled:cursor-default text-slate-500"><ThumbsUp className={`w-3.5 h-3.5 ${feedbackGiven === 'up' ? 'text-emerald-600' : ''}`} /></button>
                <button onClick={() => handleSendFeedback(1)} disabled={feedbackSent} className="saw-flat w-7 h-7 rounded-full flex items-center justify-center cursor-pointer disabled:cursor-default text-slate-500"><ThumbsDown className={`w-3.5 h-3.5 ${feedbackGiven === 'down' ? 'text-rose-600' : ''}`} /></button>
              </div>
            )}
          </div>

          {/* Cartes résultats et autres... inchangées ci-dessous */}
          {(scriptResult || isGeneratingScript) && (
            <section className="w-full mt-7">
              <div className={`saw-glass rounded-[22px] p-5 ${isMagicActive && lastGenType === 'script' ? 'saw-magic-pulse' : ''}`}>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5"><span className="w-7 h-7 rounded-xl bg-[#6d28d9] text-white flex items-center justify-center"><Sparkles className="w-3.5 h-3.5" /></span><span className="text-sm font-bold text-[#2e1065]">{isGeneratingScript ? (language === 'ar' ? 'جارٍ كتابة النص…' : "Le script s'écrit…") : (language === 'ar' ? 'السيناريو المولّد' : 'Script généré')}</span></div>
                  <div className="flex items-center gap-1.5"><span className="rounded-full bg-[#ede9fe] text-[#6d28d9] text-[11px] font-bold px-2.5 py-1">{language === 'ar' ? '5 نقاط' : '5 points'}</span><button onClick={() => setScriptResult(null)} className="saw-flat w-7 h-7 rounded-full flex items-center justify-center cursor-pointer text-slate-500"><X className="w-3.5 h-3.5" /></button></div>
                </div>
                <div className={`rounded-2xl bg-white/60 border border-white/80 px-4 py-3.5 text-[14px] leading-relaxed text-slate-700 whitespace-pre-wrap ${isGeneratingScript ? 'saw-shimmer text-transparent select-none' : ''}`} dir="auto">{isGeneratingScript ? '........' : scriptResult}</div>
                {!isGeneratingScript && scriptResult && (
                  <div className="flex flex-wrap items-center gap-2 mt-4">
                    <button onClick={handleUseScript} className="saw-flat-violet rounded-full px-4 py-2.5 text-xs font-bold cursor-pointer flex items-center gap-2">{language === 'ar' ? 'استخدم للتعليق الصوتي' : 'Utiliser pour la voix'}<ArrowUp className="w-3.5 h-3.5" /></button>
                    <button onClick={handleGenerateScript} disabled={isGeneratingScript} className="saw-flat rounded-full px-4 py-2.5 text-xs font-semibold text-slate-700 cursor-pointer flex items-center gap-1.5 disabled:opacity-40"><RefreshCw className="w-3.5 h-3.5" />{language === 'ar' ? 'إعادة التوليد' : 'Régénérer'}</button>
                    <button onClick={handleCopyScript} className="saw-flat rounded-full px-4 py-2.5 text-xs font-semibold text-slate-700 cursor-pointer flex items-center gap-1.5"><Copy className="w-3.5 h-3.5" />{language === 'ar' ? 'نسخ' : 'Copier'}</button>
                  </div>
                )}
              </div>
            </section>
          )}

          {currentAudioUrl && (
            <section className="w-full mt-7">
              <div className="flex items-center gap-2 mb-2.5 px-1"><Sparkles className="w-3 h-3 text-[#6d28d9]" /><span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'بعد التوليد' : 'Après génération'}</span></div>
              <div className="saw-glass rounded-[22px] p-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <button onClick={togglePlay} className="w-11 h-11 rounded-full bg-[#6d28d9] hover:bg-[#8b5cf6] text-white flex items-center justify-center cursor-pointer transition-colors shrink-0">{isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 ms-0.5 fill-white" />}</button>
                  <div className="flex flex-col min-w-0 shrink-0">
                    <div className="flex items-center gap-1.5"><span className="text-xs font-bold text-slate-800 truncate max-w-[130px]">{playerVoiceName}</span><span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold"><Check className="w-2.5 h-2.5" />{language === 'ar' ? 'جاهز' : 'Prêt'}</span></div>
                    <span className="text-[10px] text-slate-500 font-num">{formatTime(currentTime)} / {formatTime(audioDuration)}</span>
                  </div>
                  <div ref={mobileSeekRef} className="flex-1 min-w-[160px] flex items-center bg-white/60 px-3 py-2.5 rounded-2xl border border-white/80 relative min-h-[3.25rem] cursor-ew-resize touch-none select-none" onPointerDown={(e) => { try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch {} mobileSeekingRef.current = true; seekFromClientX(e.clientX); }} onPointerMove={(e) => { if (mobileSeekingRef.current) seekFromClientX(e.clientX); }} onPointerUp={() => { mobileSeekingRef.current = false; }} onPointerCancel={() => { mobileSeekingRef.current = false; }}><WaveformPlayer isPlaying={isPlaying} hasAudio={!!currentAudioUrl} currentTime={currentTime} duration={audioDuration} height={30} /></div>
                  <span className="rounded-full bg-[#ede9fe] text-[#6d28d9] text-[11px] font-bold px-2.5 py-1 whitespace-nowrap font-num">{language === 'ar' ? `≈ ${lastGeneratedCost} نقطة` : `≈ ${lastGeneratedCost} points`}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => handleDownloadClick('wav')} className="saw-flat rounded-full px-3 py-2 text-[11px] font-bold text-slate-700 cursor-pointer flex items-center gap-1.5"><Download className="w-3.5 h-3.5" />WAV</button>
                    {mp3Url ? (<button onClick={() => handleDownloadClick('mp3')} className="saw-flat-violet rounded-full px-3 py-2 text-[11px] font-bold cursor-pointer flex items-center gap-1.5"><Download className="w-3.5 h-3.5" />MP3</button>) : (<span className="flex items-center gap-1.5 px-2 py-2 text-slate-400 text-[11px]"><RefreshCw className="w-3 h-3 animate-spin" />MP3</span>)}
                    <button onClick={handleClosePlayer} className="saw-flat w-8 h-8 rounded-full flex items-center justify-center cursor-pointer text-slate-500"><X className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
              <audio ref={audioRef} src={currentAudioUrl} onTimeUpdate={handleTimeUpdate} onEnded={() => setIsPlaying(false)} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} preload="auto" className="hidden" />
            </section>
          )}
        </main>
      </fieldset>

      {/* POPUPS ET MODALES CI-DESSOUS */}
      {pendingDownload && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" role="dialog" onMouseDown={(e) => { if (e.target === e.currentTarget) setPendingDownload(null); }}>
          <div className="w-full max-w-xs rounded-3xl bg-white p-6 text-center shadow-xl">
            <button onClick={() => setPendingDownload(null)} className="float-end -me-2 -mt-2 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X className="h-4 w-4" /></button>
            <p className="text-sm font-extrabold text-slate-900">{language === 'ar' ? 'استمعت؟ قولنا كيفاش كانت' : 'Tu as écouté ? Dis-nous c’était comment'}</p>
            <div className="mt-3 flex justify-center"><StarRating rating={0} onRate={handleModalRate} size="lg" /></div>
            <button onClick={handleModalSkip} className="mt-5 w-full rounded-2xl bg-[#6d28d9] px-3 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#8b5cf6] cursor-pointer">{language === 'ar' ? 'تحميل بدون تقييم' : 'Télécharger sans noter'}</button>
            <button onClick={() => setPendingDownload(null)} className="mt-1 w-full rounded-2xl px-3 py-2 text-[11px] font-semibold text-slate-400 transition-colors hover:text-slate-600 cursor-pointer">{language === 'ar' ? 'إلغاء' : 'Annuler'}</button>
          </div>
        </div>
      )}

      {isGenerating && (
        <div className="absolute inset-0 z-[80] flex items-center justify-center bg-slate-950/25 backdrop-blur-[2px]" aria-live="polite">
          <div className="mx-5 w-full max-w-sm rounded-3xl bg-white/95 p-7 text-center shadow-xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#6d28d9]"><RefreshCw className="h-7 w-7 animate-spin text-white" /></div>
            <h3 className="mt-4 text-base font-extrabold text-slate-900">{language === 'ar' ? 'جاري إنشاء الصوت...' : 'Génération en cours…'}</h3>
            <p className="mt-2 text-xs leading-5 text-slate-500">{language === 'ar' ? 'لا تغلق الصفحة' : 'Ne ferme pas la page'}</p>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#ede9fe]"><div className="h-full w-1/2 animate-pulse rounded-full bg-[#6d28d9]" /></div>
          </div>
        </div>
      )}

      {showStartToneModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" role="dialog" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowStartToneModal(false); }}>
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[.14em] text-[#6d28d9]">{language === 'ar' ? 'قبل التوليد' : 'Avant de générer'}</p>
                <h3 className="mt-1 text-base font-extrabold text-slate-900">{ttsStep === 'tone' ? (language === 'ar' ? 'كيف يبدأ الصوت؟' : 'Comment la voix doit-elle commencer ?') : (language === 'ar' ? 'اللغة والشدة' : 'Langue et intensité')}</h3>
              </div>
              <button onClick={() => setShowStartToneModal(false)} className="shrink-0 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            {ttsStep === 'tone' ? (
              <>
                <p className="mt-2 text-xs leading-5 text-slate-500">{language === 'ar' ? 'أحيانًا يبدأ الصوت بحماس مباشرة وأحيانًا لا. اختر النبرة المطلوبة في أول كلمة.' : 'La voix démarre parfois direct excitée, parfois non. Choisis le ton pour le tout premier mot.'}</p>
                <div className="mt-4 grid gap-2">
                  <button onClick={() => confirmStartTone('calm')} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-start transition-colors hover:border-purple-300 hover:bg-purple-50"><span className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[#6d28d9]"><Cloud className="w-4.5 h-4.5" /></span><span className="min-w-0"><span className="block text-sm font-bold text-slate-900">{language === 'ar' ? 'هادئ' : 'Calme'}</span><span className="block text-[11px] text-slate-500">{language === 'ar' ? 'بداية هادئة ومريحة' : 'Démarrage posé et apaisé'}</span></span></button>
                  <button onClick={() => confirmStartTone('natural')} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-start transition-colors hover:border-purple-300 hover:bg-purple-50"><span className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[#6d28d9]"><Smile className="w-4.5 h-4.5" /></span><span className="min-w-0"><span className="block text-sm font-bold text-slate-900">{language === 'ar' ? 'عادي' : 'Simple'}</span><span className="block text-[11px] text-slate-500">{language === 'ar' ? 'نبرة طبيعية وعفوية' : 'Ton neutre et spontané'}</span></span></button>
                  <button onClick={() => confirmStartTone('excited')} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-start transition-colors hover:border-purple-300 hover:bg-purple-50"><span className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[#6d28d9]"><Zap className="w-4.5 h-4.5" /></span><span className="min-w-0"><span className="block text-sm font-bold text-slate-900">{language === 'ar' ? 'متحمس' : 'Excité'}</span><span className="block text-[11px] text-slate-500">{language === 'ar' ? 'طاقة عالية من أول كلمة' : 'Énergie haute dès le premier mot'}</span></span></button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-2 text-xs leading-5 text-slate-500">{language === 'ar' ? 'اختر لغة النطق ثم شدة المشاعر.' : "Choisis la langue de prononciation puis l'intensité émotionnelle."}</p>
                <p className="mt-4 text-[11px] font-black uppercase tracking-[.1em] text-slate-400">{language === 'ar' ? 'اللغة' : 'Registre de langue'}</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {([ { id: 'darija' as const, icon: <MessageCircle className="w-4.5 h-4.5" />, fr: 'Darija', ar: 'دارجة' }, { id: 'fusha' as const, icon: <BookOpen className="w-4.5 h-4.5" />, fr: 'Fusha', ar: 'فصحى' }, { id: 'francais' as const, icon: <Languages className="w-4.5 h-4.5" />, fr: 'Français', ar: 'فرنسية' } ]).map((r) => (
                    <button key={r.id} onClick={() => setPendingRegister(r.id)} className={`flex flex-col items-center gap-1.5 rounded-2xl border p-2.5 text-center transition-colors ${pendingRegister === r.id ? 'border-purple-500 bg-purple-50' : 'border-slate-200 bg-slate-50 hover:border-purple-300'}`}><span className={`w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center ${pendingRegister === r.id ? 'text-[#6d28d9]' : 'text-slate-500'}`}>{r.icon}</span><span className="text-[11px] font-bold text-slate-900">{language === 'ar' ? r.ar : r.fr}</span></button>
                  ))}
                </div>
                <p className="mt-4 text-[11px] font-black uppercase tracking-[.1em] text-slate-400">{language === 'ar' ? 'شدة المشاعر' : 'Intensité émotionnelle'}</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {([ { id: 'low' as const, icon: <Volume className="w-4.5 h-4.5" />, fr: 'Faible', ar: 'خفيفة' }, { id: 'normal' as const, icon: <Volume1 className="w-4.5 h-4.5" />, fr: 'Normale', ar: 'عادية' }, { id: 'high' as const, icon: <Volume2 className="w-4.5 h-4.5" />, fr: 'Forte', ar: 'قوية' } ]).map((i) => (
                    <button key={i.id} onClick={() => setPendingIntensity(i.id)} className={`flex flex-col items-center gap-1.5 rounded-2xl border p-2.5 text-center transition-colors ${pendingIntensity === i.id ? 'border-purple-500 bg-purple-50' : 'border-slate-200 bg-slate-50 hover:border-purple-300'}`}><span className={`w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center ${pendingIntensity === i.id ? 'text-[#6d28d9]' : 'text-slate-500'}`}>{i.icon}</span><span className="text-[11px] font-bold text-slate-900">{language === 'ar' ? i.ar : i.fr}</span></button>
                  ))}
                </div>
                <div className="mt-5 flex gap-2">
                  <button onClick={() => setTtsStep('tone')} className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100">{language === 'ar' ? 'رجوع' : 'Retour'}</button>
                  <button onClick={confirmRegisterAndIntensity} className="flex-1 rounded-2xl bg-[#6d28d9] px-3 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#8b5cf6]">{language === 'ar' ? 'توليد' : 'Générer'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showWhatsNew && ( <WhatsNewV41 onClose={() => setShowWhatsNew(false)} onStart={() => setShowWhatsNew(false)} onSupport={() => { setShowWhatsNew(false); onOpenRecharge(); }} /> )}
    </div>
  );
};
