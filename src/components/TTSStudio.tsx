import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play, Pause, Download, Volume2, AlertCircle,
  Check, Copy, RefreshCw, Sparkles, Zap, Mic, Radio, Headphones, Flame,
  AudioLines, Megaphone, Layers, X, History, Wand2, Video, ThumbsUp, ThumbsDown,
  Menu, Settings, ChevronDown, Star
} from 'lucide-react';
import { Voice, GenerationRecord } from '../types';
import { getVoices, getStyleTags } from '../data/voices';
import { playNaturalAudio, stopNaturalAudio } from '../utils/audioGenerator';
import { requestTTSGeneration, requestVoicePreview, requestEnhanceText, requestGenerateScript, sendAIFeedback } from '../services/api';
import { convertWavToMp3 } from '../utils/audioConverter';
import { useLanguage } from '../context/LanguageContext';
import { playEnhanceChime, playScriptChime, playGenerationChime } from '../utils/sounds';
import { supabase, uploadGenerationFile, fetchMyGenerations } from '../services/supabaseClient';
import { WaveformPlayer } from './WaveformPlayer';

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
}

// ==========================================================================
// VOICE GLYPH
// ==========================================================================
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

// ==========================================================================
// COMPOSANT PRINCIPAL
// ==========================================================================

export const TTSStudio: React.FC<TTSStudioProps> = ({ balance, onDeductPoints, onOpenRecharge, recentGenerations = [] }) => {
  const { t, isRTL, language } = useLanguage();
  const voices = getVoices(language);
  const styleTags = getStyleTags(language);

  const defaultStarterText = language === 'ar'
    ? '[excited] أسمع مليح خاوتي! مع la plateforme Sawtify جديدة ديالنا... [natural] نصوصكم تتحول لـ voix humaine طبيعية 100%.'
    : '[excited] Écoute bien ya khawti ! Avec notre nouvelle plateforme Sawtify... [natural] tes textes se transforment en voix humaine 100% naturelle.';

  // ------------------------------------------------------------------
  // STATE
  // ------------------------------------------------------------------
  const [text, setText] = useState<string>(() => {
    try { return localStorage.getItem('sawtify_draft_text') || defaultStarterText; } catch { return defaultStarterText; }
  });
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('voice_amin');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
  const [favoriteVoiceIds, setFavoriteVoiceIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('sawtify_favorite_voices') || '[]'); } catch { return []; }
  });
  const [speed, setSpeed] = useState<number>(1.0);
  const [pitch, setPitch] = useState<number>(1.0);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPlayerMinimized, setIsPlayerMinimized] = useState<boolean>(false);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [, setCurrentBlob] = useState<Blob | null>(null);
  const [, setMp3Blob] = useState<Blob | null>(null);
  const [mp3Url, setMp3Url] = useState<string | null>(null);
  const [, setWavSize] = useState<number>(0);

  // Stockage du nom de la voix QUI A GÉNÉRÉ l'audio
  // Cela évite que changer le sélecteur pendant la lecture change le nom affiché
  const generatedVoiceRef = useRef<string>('');

  const audioDurationRef = useRef<number>(0);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [insufficientAlert, setInsufficientAlert] = useState<boolean>(false);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const [isMagicActive, setIsMagicActive] = useState<boolean>(false);
  const [, setLastGeneratedCost] = useState<number>(20);

  // Menu emotions
  const [isEmotionsMenuOpen, setIsEmotionsMenuOpen] = useState<boolean>(false);
  const emotionsMenuRef = useRef<HTMLDivElement | null>(null);

  // IA
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
  const [productName, setProductName] = useState<string>('');
  const [isGeneratingScript, setIsGeneratingScript] = useState<boolean>(false);
  const [selectedRegion, setSelectedRegion] = useState<RegionId>('general');

  // Drawers mobiles
  const [isScriptMenuOpen, setIsScriptMenuOpen] = useState<boolean>(false);
  const [isVoiceMenuOpen, setIsVoiceMenuOpen] = useState<boolean>(false);

  // Feedback
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

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousAudioUrlRef = useRef<string | null>(null);
  const previousMp3UrlRef = useRef<string | null>(null);
  const previewRequestRef = useRef<string | null>(null);
  const generationRequestLockRef = useRef(false);
  const enhanceRequestLockRef = useRef(false);
  const scriptRequestLockRef = useRef(false);
  const isRestoringRef = useRef(false);

  // Constantes
  const POINTS_COST = 20;
  const PENDING_GEN_KEY = 'sawtify_pending_generation';
  const LAST_RESULT_KEY = 'sawtify_last_result';

  const currentVoice = voices.find(v => v.id === generatedVoiceRef.current || selectedVoiceId) || voices[0];
  const filteredVoices = voices
    .filter(voice => (categoryFilter === 'all' || voice.category === categoryFilter) && (genderFilter === 'all' || voice.gender === genderFilter))
    .sort((a, b) => Number(favoriteVoiceIds.includes(b.id)) - Number(favoriteVoiceIds.includes(a.id)));

  // ------------------------------------------------------------------
  // EFFECT : Restauration d'état (NON BLOQUANT)
  // ------------------------------------------------------------------
  useEffect(() => {
    if (isRestoringRef.current) return;
    isRestoringRef.current = true;

    let cancelled = false;
    let timeoutId: NodeJS.Timeout;

    const restorePreviousState = async () => {
      let pending: { startedAt: number; voiceId: string } | null = null;
      try {
        const raw = localStorage.getItem(PENDING_GEN_KEY);
        if (raw) pending = JSON.parse(raw);
      } catch (e) { console.warn('Erreur lecture pending:', e); }

      if (pending && Date.now() - pending.startedAt < 3 * 60 * 1000) {
        setIsGenerating(true);
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('RESTORE_TIMEOUT')), 4000);
        });

        try {
          const raceResult = await Promise.race([fetchMyGenerations(5), timeoutPromise]) as any;

          if (raceResult?.message === 'RESTORE_TIMEOUT') {
            setIsGenerating(false); try { localStorage.removeItem(PENDING_GEN_KEY); } catch {} return;
          }

          const rows = raceResult;
          const found = rows.find((r: any) => new Date(r.createdAt).getTime() >= pending!.startedAt - 3000);

          if (found && !cancelled) {
            setCurrentAudioUrl(found.audioUrl || null);
            setAudioDuration(found.durationSec || 0);
            audioDurationRef.current = found.durationSec || 0;
            generatedVoiceRef.current = found.voiceId || '';
            setLastGeneratedCost(found.pointsDeducted);
            showNotif(language === 'ar' ? '✅ تم استرجاع التسجيل' : '✅ Résultat récupéré');
            try { localStorage.removeItem(PENDING_GEN_KEY); localStorage.setItem(LAST_RESULT_KEY, JSON.stringify({ id: found.id, createdAt: found.createdAt })); } catch {}
          }
        } catch (err: any) {}
        finally { clearTimeout(timeoutId); if (!cancelled) setIsGenerating(false); }
        return;
      }

      try {
        const raw = localStorage.getItem(LAST_RESULT_KEY);
        if (raw) {
          const last = JSON.parse(raw);
          const rows = await Promise.race([fetchMyGenerations(5), new Promise((res) => setTimeout(() => res([]), 2000))]);
          const found = (rows as any[]).find(r => r.id === last.id);
          if (found && !cancelled) {
            setCurrentAudioUrl(found.audioUrl || null);
            setAudioDuration(found.durationSec || 0);
            audioDurationRef.current = found.durationSec || 0;
            generatedVoiceRef.current = found.voiceId || '';
            setLastGeneratedCost(found.pointsDeducted);
          }
        }
      } catch (e) {}
    };

    restorePreviousState();
    return () => { cancelled = true; isRestoringRef.current = false; };
  }, []);

  // Fermer dropdown emotions
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emotionsMenuRef.current && !emotionsMenuRef.current.contains(e.target as Node)) { setIsEmotionsMenuOpen(false); }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Cleanup blobs
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

  // Auto-save draft
  useEffect(() => { try { localStorage.setItem('sawtify_draft_text', text); } catch {} }, [text]);

  // ------------------------------------------------------------------
  // HANDLERS
  // ------------------------------------------------------------------

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
    setIsEmotionsMenuOpen(false);
  }, []);

  const handlePreviewVoice = useCallback(async (e: React.MouseEvent, voice: Voice) => {
    e.stopPropagation();
    if (previewingVoiceId === voice.id || previewRequestRef.current === voice.id) {
      stopNaturalAudio();
      setPreviewingVoiceId(null);
      previewRequestRef.current = null;
      return;
    }
    if (previewRequestRef.current) return;
    previewRequestRef.current = voice.id;
    setPreviewingVoiceId(voice.id);

    if (voice.sampleAudioUrl) {
      playNaturalAudio(voice.sampleAudioUrl, () => setPreviewingVoiceId(null), 1, 1);
      previewRequestRef.current = null;
      return;
    }

    try {
      const audioUrl = await requestVoicePreview(voice.id, speed, pitch);
      previewRequestRef.current = null;
      playNaturalAudio(audioUrl, () => setPreviewingVoiceId(null), speed, pitch);
    } catch (err: any) {
      setPreviewingVoiceId(null);
      previewRequestRef.current = null;
      showNotif(language === 'ar' ? 'فشل تشغيل المعاينة' : 'Erreur de preview');
    }
  }, [previewingVoiceId, speed, pitch, language, showNotif]);

  async function handleGenerate(retryCount = 0) {
    if (retryCount === 0) {
      if (generationRequestLockRef.current) return;
      generationRequestLockRef.current = true;
    }
    if (!text.trim() || balance < POINTS_COST) {
      setInsufficientAlert(true);
      generationRequestLockRef.current = false;
      return;
    }

    setInsufficientAlert(false);
    setIsGenerating(true);
    setCurrentAudioUrl(null);
    setMp3Url(null);

    // On FIGE le nom de la voix avant de lancer la génération
    // Ainsi, même si l'utilisateur change le sélecteur après, le player gardera le bon nom
    generatedVoiceRef.current = currentVoice.name;

    try {
      localStorage.setItem(PENDING_GEN_KEY, JSON.stringify({ startedAt: Date.now(), voiceId: currentVoice.id, voiceName: currentVoice.name }));
    } catch (e) {}

    let errMsg = '';
    try {
      const extractedTags = (text.match(/\[(.*?)\]/g) || []).map(tag => tag.replace(/[\[\]]/g, ''));
      if (extractedTags.length === 0) {
        showNotif(language === 'ar' ? '💡 أضف وسم عاطفة لصوت أكثر تعبيرًا' : '💡 Ajoutez une balise d\'émotion');
      }

      const response = await requestTTSGeneration({
        text, voice_id: currentVoice.id, speed, pitch, emotion_tags: extractedTags
      }, balance);

      const audioBlob = response.blob || new Blob([], { type: 'audio/wav' });

      setCurrentAudioUrl(response.audio_url);
      setCurrentBlob(audioBlob);
      setCurrentTime(0);

      const dur = response.duration_seconds || 0;
      setAudioDuration(dur);
      audioDurationRef.current = dur;

      setIsGenerating(false);
      const realCost = response.points_deducted || POINTS_COST;
      setLastGeneratedCost(realCost);

      if (response.degraded) {
        try { localStorage.removeItem(PENDING_GEN_KEY); } catch {}
        showNotif(language === 'ar' ? '⚠️ معاينة محلية (بدون خصم)' : '⚠️ Aperçu local (non facturé)');
      } else {
        (async () => {
          try {
            let storagePath: string | null = null;
            const { data: userData } = await supabase.auth.getUser();
            const generationId = response.generation_id || `gen_${Date.now()}`;
            if (userData.user && audioBlob.size > 0) {
              storagePath = await uploadGenerationFile(userData.user.id, generationId, audioBlob);
            }

            const record: GenerationRecord = {
              id: generationId,
              text, voiceId: currentVoice.id, voiceName: currentVoice.name, // On garde le vrai nom ici
              audioUrl: response.audio_url, pointsDeducted: realCost,
              durationSec: dur,
              latencyMs: response.latency_ms, createdAt: new Date().toISOString()
            };

            await onDeductPoints(realCost, record, storagePath, response.remaining_balance ?? null);

            try { localStorage.removeItem(PENDING_GEN_KEY); localStorage.setItem(LAST_RESULT_KEY, JSON.stringify({ id: generationId, createdAt: record.createdAt })); } catch (e2) {}
            window.dispatchEvent(new CustomEvent('refresh-account-balance'));
          } catch (uploadErr) { console.warn('Erreur upload:', uploadErr); }
        })();

        showNotif(response.milestone_bonus ? `-${realCost} Points · +${response.milestone_bonus} bonus` : (response.notification || `-${realCost} Points`));
        playGenerationChime();
      }

      try {
        const r = await convertWavToMp3(audioBlob, () => {});
        setMp3Blob(r.mp3Blob);
        setMp3Url(r.mp3Url);
      } catch (e) { console.warn('MP3 conversion failed:', e); }

    } catch (err: any) {
      console.error('Erreur TTS:', err);
      errMsg = err?.message || '';
      if (errMsg.includes('[QUEUE_BUSY]')) {
        const parts = errMsg.split('[QUEUE_BUSY]')[1]?.split('|') || ['4'];
        const retryAfter = Math.max(2, parseInt(parts[0], 10) || 4);
        if (retryCount < 8) {
          showNotif(language === 'ar' ? `🎙️ جاري التوليد... (${retryCount + 1}/8)` : `🎙️ Génération... (${retryCount + 1}/8)`);
          setTimeout(() => handleGenerate(retryCount + 1), retryAfter * 1000);
          return;
        } else { showNotif(language === 'ar' ? '⏱️ الخادم بطيء' : '⏱️ Serveur lent'); }
      } else if (errMsg.includes('insuffisant') || errMsg.includes('402')) {
        setInsufficientAlert(true); showNotif(language === 'ar' ? 'رصيد غير كافٍ' : 'Solde insuffisant');
      } else { showNotif(language === 'ar' ? 'خطأ في التوليد' : 'Erreur de génération'); }
      setIsGenerating(false);
    } finally {
      if (!errMsg?.includes('[QUEUE_BUSY]') || retryCount >= 2) {
        generationRequestLockRef.current = false;
        if (errMsg && !errMsg.includes('[QUEUE_BUSY]')) { try { localStorage.removeItem(PENDING_GEN_KEY); } catch {} }
      }
    }
  }

  const handleEnhanceText = async () => {
    if (!text.trim() || isEnhancing || enhanceRequestLockRef.current) return;
    if (balance < 2) { setInsufficientAlert(true); return; }
    enhanceRequestLockRef.current = true;
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
      else if (e?.message?.includes('quotidienne')) showNotif(language === 'ar' ? 'لقد بلغت حدك اليومي' : 'Limite quotidienne atteinte');
      else showNotif(language === 'ar' ? 'خطأ في التحسين' : 'Erreur amélioration');
    } finally {
      setIsEnhancing(false);
      enhanceRequestLockRef.current = false;
    }
  };

  const handleGenerateScript = async () => {
    if (!productName.trim() || isGeneratingScript || scriptRequestLockRef.current) return;
    if (balance < 5) { setInsufficientAlert(true); return; }
    scriptRequestLockRef.current = true;
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
      else if (e?.message?.includes('quotidienne')) showNotif(language === 'ar' ? 'لقد بلغت حدك اليومي' : 'Limite quotidienne');
      else showNotif(language === 'ar' ? 'خطأ في إنشاء السيناريو' : 'Erreur script');
    } finally {
      setIsGeneratingScript(false);
      scriptRequestLockRef.current = false;
    }
  };

  const [feedbackGiven, setFeedbackGiven] = useState<'up' | 'down' | null>(null);
  const [, setFeedbackError] = useState<boolean>(false);

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
      showNotif(rating >= 4 ? (language === 'ar' ? '⭐ شكراً!' : '⭐ Merci!') : (language === 'ar' ? '👍 شكراً' : '👍 Merci'));
    } catch (e) { setFeedbackGiven(null); setFeedbackError(true); }
  };

  const togglePlay = useCallback(() => {
    if (!audioRef.current || !currentAudioUrl) return;
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
    else {
      audioRef.current.play().catch(err => { console.warn('Playback error:', err); setIsPlaying(false); });
      setIsPlaying(true);
    }
  }, [isPlaying, currentAudioUrl]);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  }, []);

  const handleClosePlayer = useCallback(() => {
    setIsPlaying(false);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    setCurrentAudioUrl(null);
    setMp3Url(null);
    setCurrentTime(0);
    setAudioDuration(0);
    audioDurationRef.current = 0;
    // On ne réinitialise PAS generatedVoiceRef ici car l'UI référence encore l'audio
  }, []);

  const handleCopyText = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => { showNotif(language === 'ar' ? 'فشل النسخ' : 'Erreur copie'); });
  }, [text, language, showNotif]);

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

  // ------------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------------
  return (
    <div className={`h-[calc(100dvh-64px)] w-full overflow-y-auto bg-slate-50/40 relative transition-all duration-300 lg:h-[calc(100vh-64px)] lg:overflow-hidden ${currentAudioUrl ? 'pb-44 lg:pb-0' : 'pb-24 lg:pb-0'}`}>

      {/* Notification */}
      {notification && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-sm shadow-2xl flex items-center gap-2 animate-[bounce_0.5s_ease-in-out]">
          <Zap className="w-4 h-4 text-yellow-300 fill-yellow-300" />
          <span className="tracking-wider">{notification}</span>
        </div>
      )}

      <fieldset disabled={isGenerating} className="contents">

        {/* TOP BAR MOBILE */}
        <div className="sticky top-0 lg:hidden shrink-0 flex items-center justify-between bg-white border-b border-slate-200 px-3 py-2.5 z-[55] shadow-sm">
          <button onClick={() => setIsScriptMenuOpen(true)} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 text-xs font-semibold">
            <Menu className="w-4 h-4" />
            <span>{language === 'ar' ? 'السيناريو' : 'Script'}</span>
          </button>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-lg">{currentVoice.name}</span>
          </div>

          <button onClick={() => setIsVoiceMenuOpen(true)} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 text-xs font-semibold">
            <Settings className="w-4 h-4" />
            <span>{language === 'ar' ? 'الأصوات' : 'Voix'}</span>
          </button>
        </div>

        <div className="flex-none lg:flex lg:h-full lg:min-h-0 lg:flex-1 lg:overflow-hidden relative">

          {/* ============ OVERLAY PANNEAU SCRIPT ============ */}
          {isScriptMenuOpen && (
            <div
              onClick={() => setIsScriptMenuOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[65] md:hidden block"
            />
          )}

          {/* ============ PANNEAU SCRIPT ============ */}
          <div className={`
            fixed lg:static inset-y-0 start-0
            z-[65]
            w-[85vw] max-w-[360px]
            h-[100dvh]
            shrink-0
            border-e border-slate-200
            bg-white
            flex flex-col
            lg:h-full lg:min-h-0
            shadow-2xl shadow-black/20
            transform-gpu
            ${isRTL ? 'translate-x-[-100%]' : 'translate-x-[100%]'}
            ${isScriptMenuOpen ? 'pointer-events-auto opacity-100 scale-y-100' : 'pointer-events-none opacity-0 scale-y-95 translate-y-[100%]'}
            transition-all duration-150 ease-out
            will-change-transform
          `}>

            {/* Header (fermeture visible) */}
            <div className="shrink-0 flex items-center justify-between p-4 border-b border-slate-100 bg-white">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 truncate">
                <Video className="w-4 h-4 text-purple-600" />
                {language === 'ar' ? 'منشئ النصوص الإعلانية' : 'Générateur de Script'}
              </h3>
              <button
                onClick={() => setIsScriptMenuOpen(false)}
                className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 cursor-pointer active:bg-red-100 active:scale-95 min-h-[36px] min-w-[36px] flex items-center justify-center transition-colors"
                aria-label={language === 'ar' ? 'إغلاق' : 'Fermer'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenu avec scroll optimisé */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-3">

              {/* Lahdja selector */}
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
                      className={`flex-1 text-center py-1.5 rounded-md font-medium transition-colors cursor-pointer
                                 ${selectedRegion === r.id ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-500 hover:bg-white'}`}
                    >
                      {language === 'ar' ? r.ar : r.fr}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-[10px] text-slate-400 mb-3 leading-relaxed">
                {language === 'ar' ? 'اكتب اسم المنتج أو الخدمة.' : 'Nom du produit ou service.'}
              </p>

              {/* Input produit */}
              <div className="space-y-2">
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder={language === 'ar' ? 'مثال: ساعة, formation...' : 'Ex: formation, baskets...'}
                  disabled={isGeneratingScript}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 bg-white transition-all duration-200 min-h-[44px] disabled:opacity-60"
                />

                {/* Bouton générer script */}
                <button
                  onClick={handleGenerateScript}
                  disabled={isGeneratingScript || !productName.trim() || balance < 5}
                  className="w-full py-3 flex items-center justify-center gap-1.5 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs shadow-lg shadow-purple-600/25 transform active:scale-[0.98] transition-all duration-200 min-h-[48px] touch-manipulation select-none"
                >
                  {isGeneratingScript ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{language === 'ar' ? 'جاري التوليد...' : 'Génération...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                      <span>{language === 'ar' ? 'إنشاء' : 'Générer'}</span>
                      <span className="text-[9px] font-bold text-yellow-200 ml-1">• 5 pts</span>
                    </>
                  )}
                </button>
              </div>

              {/* Historique récente */}
              <div className="mt-4 pt-3 border-t border-dashed border-slate-200">
                <h3 className="text-[11px] font-semibold text-slate-800 flex items-center gap-1.5 pb-2">
                  <History className="w-3.5 h-3.5 text-purple-600" />
                  {language === 'ar' ? 'الأخيرة' : 'Récentes'}
                </h3>
                <div className="flex-1 min-h-0 overflow-hidden overscroll-contain pr-1 space-y-2">
                  {recentGenerations.length > 0 ? (
                    recentGenerations.slice(0, 8).map((gen) => (
                      <button
                        key={gen.id}
                        onClick={() => { setText(gen.text); setIsScriptMenuOpen(false); }}
                        className="w-full text-left p-2.5 rounded-xl text-[11px] text-slate-500 hover:bg-slate-50 hover:text-slate-700 active:bg-purple-50 transition-colors cursor-pointer truncate"
                        style={{ wordBreak: 'break-word' }}
                      >
                        • {gen.text.substring(0, 35)}...
                      </button>
                    ))
                  ) : (
                    <p className="text-[10px] text-slate-400 p-3 text-center italic">
                      {language === 'ar' ? 'لا شيء' : 'Aucun'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ============ OVERLAY PANNEAU VOIX ============ */}
          {isVoiceMenuOpen && (
            <div
              onClick={() => setIsVoiceMenuOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[66] md:hidden block"
            />
          )}

          {/* ============ PANNEAU VOIX ============ */}
          <div className={`
            fixed lg:static
            inset-y-0
            end-0
            z-[70]
            w-[85vw]
            max-w-[380px]
            h-[90dvh]
            shrink-0
            border-l
            border-slate-200
            bg-white
            flex flex-col
            shadow-2xl
            shadow-black/20
            ${isRTL ? '-translate-x-[100%]' : 'translate-x-[100%]'}
            ${isVoiceMenuOpen
              ? 'pointer-events-auto opacity-100 scale-y-100'
              : 'pointer-events-none opacity-0 scale-y-95 translate-y-[100%]'}
            transition-all duration-150 ease-out
            will-change-transform
          `}>

            {/* Header fermeture */}
            <div className="shrink-0 flex items-center justify-between p-4 border-b border-slate-100 bg-white">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-600" />
                <span className="text-[11px] font-semibold text-slate-900 truncate">{t.catalogHeader}</span>
              </div>
              <button
                onClick={() => setIsVoiceMenuOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer active:bg-slate-200 active:scale-95 min-h-[36px] min-w-[36px] flex items-center justify-center transition-colors"
                aria-label={language === 'ar' ? 'إغلق' : 'Fermer'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filtres & Liste voix */}
            <div className="flex-1 min-h-0 flex flex-col">

              {/* Filtre genre rapide */}
              <div className="flex flex-wrap gap-1.5 mb-3 px-3 pt-3">
                <button
                  type="button"
                  onClick={() => setGenderFilter('all')}
                  disabled={isGenerating}
                  className={`flex-1 py-1.5 text-[11px] font-medium rounded-full transition-colors cursor-pointer ${
                    genderFilter === 'all'
                      ? 'bg-slate-100 text-slate-900 ring-1 ring-purple-200'
                      : 'bg-white text-slate-500 hover:bg-slate-50'
                  } ${isGenerating ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <span>{t.allGenders}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGenderFilter('male')}
                  disabled={isGenerating}
                  className={`flex-1 py-1.5 text-[11px] font-medium rounded-full transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                    genderFilter === 'male'
                      ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                      : 'bg-white text-slate-500 hover:bg-blue-50'
                  } ${isGenerating ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <span>👨</span>
                  <span>{t.maleGenders}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGenderFilter('female')}
                  disabled={isGenerating}
                  className={`flex-1 py-1.5 text-[11px] font-medium rounded-full transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                    genderFilter === 'female'
                      ? 'bg-pink-50 text-pink-700 ring-1 ring-pink-200'
                      : 'bg-white text-slate-500 hover:bg-pink-50'
                  } ${isGenerating ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <span>👩</span>
                  <span>{t.femaleGenders}</span>
                </button>
              </div>

              {/* Sélecteur catégorie */}
              <div className="mb-3 px-3 relative">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
                  disabled={isGenerating}
                  className="w-full appearance-none px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 cursor-pointer min-h-[44px] touch-manipulation disabled:opacity-60"
                >
                  {categoryOptions.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute top-1/2 -translate-y-1/2 end-6 pointer-events-none" />
              </div>

              {/* Liste des voix */}
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 py-2 space-y-1.5">
                {filteredVoices.map((voice) => {
                  const isSelected = voice.id === selectedVoiceId;
                  const isPreviewing = previewingVoiceId === voice.id;

                  return (
                    <div
                      key={voice.id}
                      onClick={() => {
                        if (isVoiceMenuOpen && window.innerWidth < 1024) {
                          setIsScriptMenuOpen(false);
                        }
                        setSelectedVoiceId(voice.id);
                        setIsVoiceMenuOpen(false);

                        if (!isSelected) {
                          setIsPlayerMinimized(true);
                        }
                      }}
                      className={`group/item w-full p-2.5 rounded-xl border-2 cursor-pointer transition-all duration-150 hover:scale-[1.02] flex flex-col gap-1.5 ${
                        isSelected
                          ? 'bg-purple-50 border-purple-400/60 shadow-sm shadow-purple-500/25'
                          : 'border-slate-200/80 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {/* Icône voix */}
                        <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-gradient-to-br from-purple-600 to-violet-600 text-white shadow-inner'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}>
                          {isPreviewing ? (
                            <Volume2 className="w-4 h-4 text-purple-600 animate-pulse" />
                          ) : (
                            <Play className="w-4 h-4 text-slate-400 group-hover/item:text-purple-600 transition-colors" />
                          )}
                        </div>

                        {/* Nom + Dialecte */}
                        <div className="min-w-0 flex-1">
                          <p className={`text-[12px] font-bold ${isSelected ? 'text-purple-900' : 'text-slate-800'} leading-tight line-clamp-1 truncate`} style={{ wordBreak: 'break-word' }}>
                            {voice.name}
                          </p>
                          <p className={`text-[10px] font-normal ${isSelected ? 'text-purple-600' : 'text-slate-400'} truncate mt-0.5`} style={{ wordBreak: 'break-word' }}>
                            {voice.dialect}
                          </p>
                        </div>
                      </div>

                      {/* Badge favori + Bouton preview */}
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavoriteVoice(voice.id);
                            }}
                            className={`p-1.5 rounded-lg ${
                              favoriteVoiceIds.includes(voice.id)
                                ? 'text-amber-500 hover:bg-amber-50'
                                : 'text-slate-400 hover:text-amber-500/50 hover:bg-amber-50/30'
                            } transition-all min-h-[32px] min-w-[32px] flex items-center justify-center cursor-pointer active:scale-110 active:bg-amber-100`}
                            title={favoriteVoiceIds.includes(voice.id)
                              ? (language === 'ar' ? 'إزالة من المفضلة' : 'Retirer des favoris')
                              : (language === 'ar' ? 'إضافة للمفضلة' : 'Ajouter aux favoris')}
                          >
                            <Star
                              className={`w-4 h-4 transition-colors transition-transform group-hover/item:rotate-180 drop-shadow-md ${
                                favoriteVoiceIds.includes(voice.id) ? 'fill-amber-500' : ''
                              }`}
                            />
                          </button>

                          <button
                            onClick={(e) => handlePreviewVoice(e, voice)}
                            className={`p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-purple-50 active:scale-105 active:bg-purple-100 transition-all duration-75 min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer touch-manipulation select-none ${
                              isPreviewing ? 'text-purple-600' : ''
                            }`}
                            aria-label={language === 'ar' ? 'معاينة صوتية سريعة' : 'Aperçu rapide'}
                          >
                            {isPreviewing ? (
                              <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                            ) : (
                              <Play className="w-3.5 h-3.5 text-slate-400" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Sliders settings bas de la voix sélectionnée */}
              <div className="shrink-0 px-4 py-3 bg-slate-50 rounded-xl border-t border-slate-200/80">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-9 h-9 rounded-xl ${previewingVoiceId === selectedVoiceId ? 'bg-purple-600 text-white shadow-md scale-95' : 'bg-white text-slate-500 border border-slate-200'} flex items-center justify-center`}>
                    <VoiceGlyph icon={currentVoice.icon} gender={currentVoice.gender} className="w-4 h-4" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-slate-900 truncate">{currentVoice.name}</p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {language === 'ar' ? 'النوع الصوت:' : 'Type de voix:'} {currentVoice.tags?.join(', ') || (language === 'ar' ? 'عربي' : 'Standard')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 mb-1.5 block">
                      {language === 'ar' ? 'السرعة' : 'Vitesse'}
                    </label>
                    <div className="flex items-center justify-between text-[10px] text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2 hover:border-purple-400/50 mb-1.5">
                      <span>{speed.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.7"
                      max="1.5"
                      step="0.1"
                      value={speed}
                      onChange={(e) => setSpeed(parseFloat(e.target.value))}
                      className="thick-slider w-full bg-slate-200 rounded-xl appearance-none cursor-pointer accent-purple-600"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 mb-1.5 block">
                      {language === 'ar' ? 'الطبقة الصوت' : 'Hauteur'}
                    </label>
                    <div className="flex items-center justify-between text-[10px] text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2 hover:border-purple-400/50 mb-1.5">
                      <span>{pitch.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.8"
                      max="1.3"
                      step="0.1"
                      value={pitch}
                      onChange={(e) => setPitch(parseFloat(e.target.value))}
                      className="thick-slider w-full bg-slate-200 rounded-xl appearance-none cursor-pointer accent-fuchsia-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </fieldset>

      {/* ==================================================================
          LECTEUR AUDIO
          ================================================================== */}
      {currentAudioUrl && (
        <div
          className="fixed left-0 right-0 md:left-1/2 md:-translate-x-1/2 lg:left-1/2 lg:-translate-x-1/2 bottom-[4.5rem] md:bottom-4 z-[70] bg-slate-900/95 backdrop-blur-xl border-t border-purple-500/30 rounded-t-2xl md:rounded-2xl shadow-[0_-8px_25px_rgba(0,0,0,0.7)] max-w-7xl mx-auto animate-in slide-in-from-bottom-3 duration-200"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 12px)' }}
        >

          {/* Version Desktop (> md) */}
          <div className="hidden md:flex items-center gap-4 px-5 py-3">
            <button onClick={togglePlay} className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 text-white flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-transform shrink-0 shadow-lg shadow-purple-600/30">
              {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 ms-0.5 fill-white" />}
            </button>

            <div className="flex flex-col min-w-0 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white truncate max-w-[130px]">
                  {generatedVoiceRef.current || currentVoice.name}
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">Prêt ✓</span>
              </div>
              <span className="text-[10px] text-purple-300 font-mono mt-0.5">
                {formatTime(currentTime)} / {formatTime(audioDuration)}
              </span>
            </div>

            {/* Waveform Desktop */}
            <div className="flex-1 min-w-0 flex items-center bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-700/50 relative group">
              <WaveformPlayer isPlaying={isPlaying} hasAudio={!!currentAudioUrl} currentTime={currentTime} duration={audioDuration} />
              <input type="range" min={0} max={audioDuration || 0} step={0.1} value={currentTime}
                     onChange={(e) => { if (audioRef.current) { audioRef.current.currentTime = parseFloat(e.target.value); setCurrentTime(parseFloat(e.target.value)); } }}
                     className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
            </div>

            {/* Actions Desktop */}
            <div className="flex items-center gap-2 shrink-0">
              {mp3Url ? (
                <a href={mp3Url} download={`sawtify-${Date.now()}.mp3`} className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition shadow-md">
                  <Download className="w-4 h-4" /><span>MP3</span>
                </a>
              ) : (
                <a href={currentAudioUrl} download={`sawtify-${Date.now()}.wav`} className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700">
                  <Download className="w-4 h-4" /><span>WAV</span>
                </a>
              )}
              <button onClick={handleClosePlayer} className="p-2 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
          </div>

          {/* Version Mobile (md:hidden) */}
          <div className="md:hidden flex items-center gap-2.5 px-3 py-2.5">
            <button onClick={togglePlay} className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 text-white flex items-center justify-center cursor-pointer active:scale-95 transition-transform shrink-0 shadow-md">
              {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 ms-0.5 fill-white" />}
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-white truncate">
                  {generatedVoiceRef.current || currentVoice.name}
                </span>
                <span className="text-[10px] text-purple-300 font-mono">
                  {formatTime(currentTime)} / {formatTime(audioDuration)}
                </span>
              </div>
              {/* Progress bar tactile mobile */}
              <div
                className="h-1.5 bg-slate-700 rounded-full overflow-hidden cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const percent = (e.clientX - rect.left) / rect.width;
                  if (audioRef.current && audioDuration > 0) {
                    audioRef.current.currentTime = percent * audioDuration;
                    setCurrentTime(percent * audioDuration);
                  }
                }}
              >
                <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all" style={{ width: `${audioDuration > 0 ? Math.min(100, (currentTime / audioDuration) * 100) : 0}%` }} />
              </div>
            </div>

            {mp3Url ? (
              <a href={mp3Url} download={`sawtify-${Date.now()}.mp3`} className="shrink-0 p-2 bg-purple-600 rounded-xl text-white"><Download className="w-4 h-4" /></a>
            ) : (
              <a href={currentAudioUrl} download={`sawtify-${Date.now()}.wav`} className="shrink-0 p-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200"><Download className="w-4 h-4" /></a>
            )}

            <button onClick={handleClosePlayer} className="shrink-0 p-1.5 text-slate-400 hover:text-white rounded-lg"><X className="w-4 h-4" /></button>
          </div>

          <audio
            ref={audioRef}
            src={currentAudioUrl}
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            preload="auto"
            className="hidden"
          />
        </div>
      )}

      {/* Modal génération */}
      {isGenerating && (
        <div className="absolute inset-0 z-[90] flex items-center justify-center bg-slate-950/30 backdrop-blur-[2px]" aria-live="polite">
          <div className="mx-5 w-full max-w-sm rounded-3xl border border-purple-200 bg-white/95 p-7 text-center shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-600 shadow-lg shadow-purple-600/30">
              <RefreshCw className="h-7 w-7 animate-spin text-white" />
            </div>
            <h3 className="mt-4 text-base font-extrabold text-slate-900">{language === 'ar' ? 'جاري إنشاء الصوت...' : 'Génération en cours…'}</h3>
            <p className="mt-2 text-xs leading-5 text-slate-500">{language === 'ar' ? 'لا تغلق الصفحة' : 'Ne ferme pas la page'}</p>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-purple-100"><div className="h-full w-1/2 animate-pulse rounded-full bg-purple-600" /></div>
          </div>
        </div>
      )}
    </div>
  );
};
