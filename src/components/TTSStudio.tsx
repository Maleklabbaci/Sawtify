import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, Pause, Download, Volume2, AlertCircle, 
  Check, Copy, RefreshCw, Sparkles, Zap, Mic, Radio, Headphones, Flame,
  AudioLines, Megaphone, Layers, X, History, Wand2, Video, ThumbsUp, ThumbsDown,
  Menu, Settings, ChevronDown, Star
} from 'lucide-react';
import { Voice, GenerationRecord } from '../types';
import { getVoices, getStyleTags } from '../data/voices';
import { tagsByCategory } from '../../tts/vocalTags';
import type { TagCategory } from '../../tts/vocalTags';
import { playNaturalAudio, stopNaturalAudio } from '../utils/audioGenerator';
import { requestTTSGeneration, requestVoicePreview, requestEnhanceText, requestGenerateScript, sendAIFeedback } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { playEnhanceChime, playScriptChime, playGenerationChime } from '../utils/sounds';
import { supabase, uploadGenerationAudio, fetchMyGenerations } from '../services/supabaseClient';
import { WaveformPlayer } from './WaveformPlayer';
import { WhatsNewV41, shouldShowWhatsNew, markWhatsNewSeen } from './WhatsNewV41';

// ==========================================================================
// BALISES VOCALES `<...>` — catalogue officiel (tts/vocalTags.ts)
// --------------------------------------------------------------------------
// Le menu « إدراج تأثير / Insérer effet » liste les 35 sons humains officiels
// de Gemini 3.8, groupés par famille (`<laugh>`, `<sigh>`, `<short pause>`…).
// AUCUNE liste recopiée ici : la source reste `tts/vocalTags.ts`.
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

// La conversion MP3 embarque lamejs (518 ko) + ffmpeg.wasm : ces librairies
// ne servent QU'au clic « MP3 ». Elles sont donc chargees a la demande
// (import dynamique) — plus rien de tout ca dans le bundle de demarrage.
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
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
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
  const [, setLastGeneratedCost] = useState<number>(20);
  // Popup "ton de départ" : demandé avant chaque génération pour contrôler
  // explicitement si la voix démarre calme, neutre ou excitée.
  const [showStartToneModal, setShowStartToneModal] = useState<boolean>(false);
  const startToneRef = useRef<'calm' | 'natural' | 'excited' | null>(null);

  // Pop-up « Quoi de neuf en 4.1 » : s'ouvre toute seule à la PREMIÈRE entrée
  // dans le studio, puis reste accessible via le bouton « Nouveautés ».
  const [showWhatsNew, setShowWhatsNew] = useState<boolean>(false);
  useEffect(() => {
    if (shouldShowWhatsNew()) {
      // On marque comme vue dès l'OUVERTURE : fermer la page en pleine lecture
      // ne la fera pas réapparaître en boucle à la prochaine visite.
      markWhatsNewSeen();
      // Léger différé : laisse le studio s'afficher d'abord, la pop-up arrive
      // ensuite — c'est plus élégant qu'un écran noir qui saute.
      const id = setTimeout(() => setShowWhatsNew(true), 550);
      return () => clearTimeout(id);
    }
  }, []);


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
  // FIX COST-5 : 1200 caractères par défaut, débloqué à 5000 dès que le solde
  // garde au moins 1000 points (reflète la limite appliquée côté serveur).
  const TTS_UNLOCK_BALANCE_THRESHOLD = 1000;
  const TTS_MAX_CHARS_DEFAULT = 1200;
  const TTS_MAX_CHARS_UNLOCKED = 5000;
  const maxChars = balance >= TTS_UNLOCK_BALANCE_THRESHOLD ? TTS_MAX_CHARS_UNLOCKED : TTS_MAX_CHARS_DEFAULT;
  
  const currentVoice = voices.find(v => v.id === selectedVoiceId) || voices[0];
  const filteredVoices = voices
    .filter(voice => (categoryFilter === 'all' || voice.category === categoryFilter) && (genderFilter === 'all' || voice.gender === genderFilter))
    .sort((a, b) => Number(favoriteVoiceIds.includes(b.id)) - Number(favoriteVoiceIds.includes(a.id)));

  // ------------------------------------------------------------------
  // EFFECT : Restauration d'état
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
      } catch (e) {
        console.warn('Erreur lecture pending:', e);
      }

      if (pending && Date.now() - pending.startedAt < 3 * 60 * 1000) {
        setIsGenerating(true);
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('RESTORE_TIMEOUT')), 4000);
        });

        try {
          const raceResult = await Promise.race([
            fetchMyGenerations(5),
            timeoutPromise
          ]) as any;

          if (raceResult?.message === 'RESTORE_TIMEOUT') {
            setIsGenerating(false);
            try { localStorage.removeItem(PENDING_GEN_KEY); } catch {}
            return;
          }

          const rows = raceResult;
          const found = rows.find((r: any) => new Date(r.createdAt).getTime() >= pending!.startedAt - 3000);
          
          if (found && !cancelled) {
            setCurrentAudioUrl(found.audioUrl || null);
            setAudioDuration(found.durationSec || 0);
            audioDurationRef.current = found.durationSec || 0;
            setLastGeneratedCost(found.pointsDeducted);
            showNotif(language === 'ar' ? '✅ تم استرجاع التسجيل' : '✅ Résultat récupéré');
            try {
              localStorage.removeItem(PENDING_GEN_KEY);
              localStorage.setItem(LAST_RESULT_KEY, JSON.stringify({ id: found.id, createdAt: found.createdAt }));
            } catch {}
          }
        } catch (err: any) {
          // ignore
        } finally {
          clearTimeout(timeoutId);
          if (!cancelled) setIsGenerating(false);
        }
        return;
      }

      try {
        const raw = localStorage.getItem(LAST_RESULT_KEY);
        if (raw) {
          const last = JSON.parse(raw);
          const rows = await Promise.race([
            fetchMyGenerations(5),
            new Promise((res) => setTimeout(() => res([]), 2000))
          ]);
          const found = (rows as any[]).find(r => r.id === last.id);
          if (found && !cancelled) {
            setCurrentAudioUrl(found.audioUrl || null);
            setAudioDuration(found.durationSec || 0);
            audioDurationRef.current = found.durationSec || 0;
            setLastGeneratedCost(found.pointsDeducted);
          }
        }
      } catch (e) {}
    };

    restorePreviousState();
    
    return () => { 
      cancelled = true; 
      isRestoringRef.current = false;
    };
  }, []);

  // Fermer dropdown emotions
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emotionsMenuRef.current && !emotionsMenuRef.current.contains(e.target as Node)) {
        setIsEmotionsMenuOpen(false);
      }
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

  // Auto-save draft (debounce 500ms : sans ça, chaque frappe écrivait dans
  // localStorage — perceptible sur un texte long, surtout sur téléphone d'entrée de gamme).
  useEffect(() => {
    const id = setTimeout(() => {
      try { localStorage.setItem('sawtify_draft_text', text); } catch {}
    }, 500);
    return () => clearTimeout(id);
  }, [text]);

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
    
    try { 
      localStorage.setItem(PENDING_GEN_KEY, JSON.stringify({ startedAt: Date.now(), voiceId: currentVoice.id })); 
    } catch (e) {}
    
    let errMsg = '';
    try {
      const extractedTags = (text.match(/\[(.*?)\]/g) || []).map(tag => tag.replace(/[\[\]]/g, ''));
      if (extractedTags.length === 0) {
        showNotif(language === 'ar' ? '💡 أضف وسم عاطفة لصوت أكثر تعبيرًا' : '💡 Ajoutez une balise d\'émotion');
      }

      // Le ton de départ choisi dans la popup est injecté automatiquement en
      // tête du texte envoyé (balise native [calm]/[natural]/[excited]) pour
      // devenir le tag dominant côté serveur, sans modifier le texte affiché
      // dans le champ de saisie.
      const startTone = startToneRef.current;
      const startToneTag = startTone === 'calm' ? '[calm]' : startTone === 'excited' ? '[excited]' : startTone === 'natural' ? '[natural]' : '';
      const textToSend = startToneTag ? `${startToneTag} ${text.trim()}` : text;

      const response = await requestTTSGeneration({ 
        text: textToSend, voice_id: currentVoice.id, speed, pitch, emotion_tags: extractedTags 
      }, balance);


      const audioBlob = response.blob || new Blob([], { type: 'audio/wav' });
      
      setCurrentAudioUrl(response.audio_url); 
      setCurrentBlob(audioBlob); 
      setWavSize(audioBlob.size || 120000); 
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
              storagePath = await uploadGenerationAudio(userData.user.id, generationId, audioBlob);
            }

            const record: GenerationRecord = { 
              id: generationId, 
              text, voiceId: currentVoice.id, voiceName: currentVoice.name, 
              audioUrl: response.audio_url, pointsDeducted: realCost, 
              durationSec: dur, 
              latencyMs: response.latency_ms, createdAt: new Date().toISOString() 
            };

            await onDeductPoints(realCost, record, storagePath, response.remaining_balance ?? null);
            
            try {
              localStorage.removeItem(PENDING_GEN_KEY);
              localStorage.setItem(LAST_RESULT_KEY, JSON.stringify({ id: generationId, createdAt: record.createdAt }));
            } catch (e2) {}
            
            window.dispatchEvent(new CustomEvent('refresh-account-balance'));
          } catch (uploadErr) {
            console.warn('Erreur upload:', uploadErr);
          }
        })();

        showNotif(response.milestone_bonus ? `-${realCost} Points · +${response.milestone_bonus} bonus` : (response.notification || `-${realCost} Points`));
        playGenerationChime();
      }
      
      try { 
        const { convertWavToMp3 } = await chargerConvertisseurMp3();
        const r = await convertWavToMp3(audioBlob, () => {}); 
        setMp3Blob(r.mp3Blob); 
        setMp3Url(r.mp3Url); 
      } catch (e) {
        console.warn('MP3 conversion failed:', e);
      }
      
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
        } else {
          showNotif(language === 'ar' ? '⏱️ الخادم بطيء' : '⏱️ Serveur lent');
        }
      } else if (errMsg.includes('insuffisant') || errMsg.includes('402')) {
        setInsufficientAlert(true);
        showNotif(language === 'ar' ? 'رصيد غير كافٍ' : 'Solde insuffisant');
      } else {
        showNotif(language === 'ar' ? 'خطأ في التوليد' : 'Erreur de génération');
      }
      setIsGenerating(false);
    } finally { 
      if (!errMsg?.includes('[QUEUE_BUSY]') || retryCount >= 2) {
        generationRequestLockRef.current = false;
        startToneRef.current = null;
        if (errMsg && !errMsg.includes('[QUEUE_BUSY]')) {
          try { localStorage.removeItem(PENDING_GEN_KEY); } catch {}
        }
      }
    }
  }

  const confirmStartTone = (tone: 'calm' | 'natural' | 'excited') => {
    startToneRef.current = tone;
    setShowStartToneModal(false);
    handleGenerate();
  };

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

  const handleSendFeedback = async (rating: number) => {
    if (!lastGenType || !lastGenOutput || feedbackSent) return;
    setFeedbackGiven(rating >= 4 ? 'up' : 'down');
    try {
      await sendAIFeedback({
        input_text: lastGenInput, output_text: lastGenOutput, rating,
        type: lastGenType, region: selectedRegion, sector: lastGenSector
      });
      setFeedbackSent(true);
      showNotif(rating >= 4 
        ? (language === 'ar' ? '⭐ شكراً!' : '⭐ Merci!') 
        : (language === 'ar' ? '👍 شكراً' : '👍 Merci'));
    } catch (e) { 
      setFeedbackGiven(null);
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
    audioDurationRef.current = 0;
  }, []);

  const handleCopyText = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      showNotif(language === 'ar' ? 'فشل النسخ' : 'Erreur copie');
    });
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
    <div className={`h-[calc(100dvh_-_64px_-_env(safe-area-inset-top,0px))] w-full overflow-y-auto bg-slate-50/40 relative transition-all duration-300 lg:h-[calc(100vh_-_64px_-_env(safe-area-inset-top,0px))] lg:overflow-hidden ${currentAudioUrl ? 'pb-44 lg:pb-0' : 'pb-24 lg:pb-0'}`}>
      
      {/* Notification Toast */}
      {notification && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-sm shadow-2xl flex items-center gap-2 animate-[bounce_0.5s_ease-in-out]"
          style={{ top: 'calc(1.5rem + env(safe-area-inset-top, 0px))' }}
        >
          <Zap className="w-4 h-4 text-yellow-300 fill-yellow-300" />
          <span className="tracking-wider">{notification}</span>
        </div>
      )}

      <fieldset disabled={isGenerating} className="contents">

      {/* TOP BAR MOBILE */}
      <div className="sticky top-0 lg:hidden shrink-0 flex items-center justify-between bg-white border-b border-slate-200 px-3 py-2.5 z-30 shadow-sm">
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

      <div className="flex-none lg:flex lg:h-full lg:min-h-0 lg:flex-1 lg:overflow-hidden relative">
        
        {/* ============ PANNEAU SCRIPT ============ */}
        {isScriptMenuOpen && <div onClick={() => setIsScriptMenuOpen(false)} className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 transition-opacity" />}
        <div className={`
          fixed lg:static inset-y-0 start-0 z-50 lg:z-0
          w-72 xl:w-80 shrink-0 border-e border-slate-200 bg-white flex flex-col lg:h-full lg:min-h-0
          transition-all duration-300 transform
          ${isScriptMenuOpen 
            ? 'translate-x-0 opacity-100 pointer-events-auto' 
            : (isRTL ? 'translate-x-full' : '-translate-x-full') + ' lg:translate-x-0 opacity-0 lg:opacity-100 pointer-events-none lg:pointer-events-auto'}
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
                placeholder={language === 'ar' ? 'مثال: ساعة, formation...' : 'Ex: formation, baskets...'}
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
        <div className="w-full min-w-0 flex flex-col p-3 sm:p-4 lg:h-full lg:min-h-0 lg:flex-1 lg:overflow-hidden">
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

          <div className="bg-white border border-slate-200/80 rounded-2xl min-h-[400px] lg:min-h-0 flex-none flex flex-col p-3 sm:p-4 shadow-xs focus-within:border-purple-500/50 focus-within:ring-2 focus-within:ring-purple-500/10 relative lg:h-full lg:flex-1">
            
            {/* Header */}
              <div className="shrink-0 flex items-center justify-between gap-2 pb-2 border-b border-slate-100 mb-2">
                <div className="flex min-w-0 items-center gap-2">
                <div className="relative" ref={emotionsMenuRef}>
                <button 
                  onClick={() => setIsEmotionsMenuOpen(!isEmotionsMenuOpen)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition cursor-pointer flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                  <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                  <span>{language === 'ar' ? 'إدراج تأثير' : 'Insérer effet'}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${isEmotionsMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isEmotionsMenuOpen && (
                  <div className="absolute top-full mt-1.5 start-0 z-20 bg-white border border-slate-200 rounded-xl shadow-xl p-2 w-72 max-h-96 overflow-y-auto custom-scrollbar">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider px-1.5 pb-1.5 border-b border-slate-100 mb-1.5">
                      {language === 'ar' ? 'اختر تأثيراً لإدراجه' : 'Choisir un effet'}
                    </div>

                    {/* ① النبرة : تدوم على كامل النص (ليست لحظية). */}
                    <div className="text-[9px] font-bold text-purple-500 uppercase tracking-wider px-1.5 pb-1 mb-1">
                      {language === 'ar' ? '🎚️ نبرة الأداء (كامل النص)' : '🎚️ Ton (toute la lecture)'}
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {styleTags.map((tagObj) => (
                        <button 
                          key={tagObj.tag}
                          onClick={() => handleInsertTag(tagObj.tag)} 
                          title={`${tagObj.tag} — ${tagObj.desc}`}
                          className="text-[10px] font-semibold px-2 py-1.5 rounded-lg bg-slate-50 hover:bg-purple-50 border border-transparent hover:border-purple-200 text-slate-700 hover:text-purple-800 transition cursor-pointer text-start">
                          {`[${tagObj.label}]`}
                        </button>
                      ))}
                    </div>

                    {/* ② كل الأصوات البشرية `<...>` (35) — تُدرج كما هي. */}
                    <div className="text-[9px] font-bold text-purple-500 uppercase tracking-wider px-1.5 pt-2.5 pb-1 mb-1">
                      {language === 'ar' ? `🔊 أصوات بشرية (${VOCAL_BURST_COUNT})` : `🔊 Sons humains (${VOCAL_BURST_COUNT})`}
                    </div>
                    {BURST_SECTIONS.map((section) => (
                      <div key={section.category}>
                        <div className="text-[9px] font-semibold text-slate-400 px-1.5 pt-2 pb-1">
                          {language === 'ar' ? section.ar : section.fr}
                        </div>
                        <div className="grid grid-cols-2 gap-1">
                          {(VOCAL_BURSTS[section.category] || []).map((v) => (
                            <button
                              key={v.tag}
                              onClick={() => handleInsertTag(v.tag)}
                              title={`${v.tag} — ${language === 'ar' ? v.ar : v.fr}`}
                              className="px-2 py-1.5 rounded-lg bg-slate-50 hover:bg-purple-50 border border-transparent hover:border-purple-200 transition cursor-pointer text-start">
                              <span className="block text-[10px] font-semibold text-slate-700">{language === 'ar' ? v.ar : v.fr}</span>
                              <span className="block text-[9px] text-slate-400 font-num" dir="ltr">{v.tag}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  )}
                </div>

                {/* Rappel des nouveautés : la pop-up ne s'affiche qu'une fois,
                    ce bouton permet de la revoir (et de la montrer à quelqu'un). */}
                <button
                  type="button"
                  onClick={() => setShowWhatsNew(true)}
                  title={language === 'ar' ? 'ما الجديد في 4.1' : 'Nouveautés de la version 4.1'}
                  className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 to-fuchsia-50 px-2 py-1.5 text-[10px] font-extrabold text-violet-700 transition hover:border-violet-300 hover:from-violet-100 hover:to-fuchsia-100 sm:px-2.5"
                >
                  <Sparkles className="h-3 w-3" />
                  <span className="hidden sm:inline">{language === 'ar' ? 'جديد 4.1' : 'Nouveautés 4.1'}</span>
                </button>
                </div>
                
                <div className="text-[11px] text-slate-400 font-num">
                <span className={`font-semibold ${text.length >= maxChars * 0.9 ? 'text-amber-600' : 'text-slate-600'}`}>{text.length}</span> / {maxChars}
                {balance < TTS_UNLOCK_BALANCE_THRESHOLD && (
                  <span className="ml-1 text-slate-400">(débloquez {TTS_MAX_CHARS_UNLOCKED} à {TTS_UNLOCK_BALANCE_THRESHOLD}+ points)</span>
                )}
              </div>
            </div>

            {/* Textarea */}
            <div className="flex-1 min-h-0 relative">
              <textarea 
                ref={textareaRef} 
                value={text} 
                onChange={(e) => setText(e.target.value)} 
                maxLength={maxChars}
                placeholder={t.textPlaceholder || 'Écrivez votre texte ici...'} 
                className={`w-full min-h-[200px] lg:h-full lg:min-h-0 p-1 sm:p-2 text-sm text-slate-900 placeholder:text-slate-400 bg-transparent border-0 outline-none leading-relaxed resize-none overflow-y-auto custom-scrollbar transition-all duration-500 ${isMagicActive ? 'animate-[magicPulse_0.9s_ease-in-out]' : ''}`}
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

            {/* Barre actions (Magique + Copier + Coût + Générer) */}
            <div className="shrink-0 mt-3 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                
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

                  {lastGenType && lastGenOutput && (
                    <div className="flex items-center gap-1 ms-2 ps-2 border-s border-slate-200">
                      <span className="text-[9px] text-slate-400 me-1">
                        {feedbackSent ? '✅' : (language === 'ar' ? 'نتيجة IA:' : 'IA:')}
                      </span>
                      <button onClick={() => handleSendFeedback(5)} disabled={feedbackSent} className={`p-1 rounded transition cursor-pointer disabled:cursor-default ${feedbackGiven === 'up' ? 'bg-green-100' : 'hover:bg-green-50'}`} title="👍">
                        <ThumbsUp className={`w-3 h-3 ${feedbackGiven === 'up' ? 'text-green-700 fill-green-600' : 'text-slate-400 hover:text-green-600'}`} />
                      </button>
                      <button onClick={() => handleSendFeedback(1)} disabled={feedbackSent} className={`p-1 rounded transition cursor-pointer disabled:cursor-default ${feedbackGiven === 'down' ? 'bg-red-100' : 'hover:bg-red-50'}`} title="👎">
                        <ThumbsDown className={`w-3 h-3 ${feedbackGiven === 'down' ? 'text-red-700 fill-red-500' : 'text-slate-400 hover:text-red-500'}`} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 hidden sm:inline">
                    {t.costLabel}: <span className="font-num font-bold text-slate-900">{POINTS_COST}</span> {t.pointsLabel}
                  </span>
                  <button 
                    onClick={() => {
                      if (!text.trim() || balance < POINTS_COST) { setInsufficientAlert(true); return; }
                      if (isGenerating) return;
                      setShowStartToneModal(true);
                    }} 
                    disabled={isGenerating || !text.trim()} 
                    className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-purple-600 px-6 py-2.5 text-xs font-semibold text-white shadow-lg shadow-purple-600/20 transition hover:bg-purple-500 disabled:opacity-40 cursor-pointer">
                    {isGenerating ? (
                      <><span className="sawtify-button-loader"><span className="sawtify-button-loader-ring" /><span className="sawtify-button-loader-letters"><span>S</span><span>A</span><span>W</span></span></span><span>{t.generatingBtn}</span></>
                    ) : (
                      <><Volume2 className="w-3.5 h-3.5" /><span>{t.generateBtn}</span></>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ============ PANNEAU VOIX ============ */}
        {isVoiceMenuOpen && <div onClick={() => setIsVoiceMenuOpen(false)} className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 transition-opacity" />}
        <div className={`
          fixed lg:static inset-y-0 end-0 z-50 lg:z-0
          w-72 xl:w-80 shrink-0 min-w-0 flex flex-col gap-3 bg-white border-s lg:border-s-0 lg:border-e border-slate-200 p-4 transition-all duration-300 transform lg:h-full lg:min-h-0
          ${isVoiceMenuOpen 
            ? 'translate-x-0 opacity-100 pointer-events-auto' 
            : (isRTL ? '-translate-x-full' : 'translate-x-full') + ' lg:translate-x-0 opacity-0 lg:opacity-100 pointer-events-none lg:pointer-events-auto'}
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
            <div className="shrink-0 flex bg-slate-100 p-0.5 rounded-lg text-[10px] mb-2">
              <button onClick={() => setGenderFilter('all')} className={`flex-1 text-center py-1.5 rounded-md transition ${genderFilter === 'all' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-500'}`}>{t.allGenders}</button>
              <button onClick={() => setGenderFilter('male')} className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md transition ${genderFilter === 'male' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-500'}`}><span className="text-[12px]">👨</span><span>{t.maleGenders}</span></button>
              <button onClick={() => setGenderFilter('female')} className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md transition ${genderFilter === 'female' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-500'}`}><span className="text-[12px]">👩</span><span>{t.femaleGenders}</span></button>
            </div>

            <div className="shrink-0 mb-2">
              <div className="relative">
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)} className="w-full appearance-none px-3 py-1.5 pe-8 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:border-purple-400 cursor-pointer">
                  {categoryOptions.map(opt => (<option key={opt.id} value={opt.id}>{opt.label}</option>))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute top-1/2 -translate-y-1/2 end-2 pointer-events-none" />
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-1 pe-1">
              {filteredVoices.map((voice) => {
                const isSelected = voice.id === selectedVoiceId;
                const isPreviewing = previewingVoiceId === voice.id;
                return (
                  <div key={voice.id} onClick={() => { setSelectedVoiceId(voice.id); setIsVoiceMenuOpen(false); }} className={`flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition border ${isSelected ? 'bg-purple-50 border-purple-400/50' : 'hover:bg-slate-50 border-transparent'}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${isSelected ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <VoiceGlyph icon={voice.icon} gender={voice.gender} className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[11px] font-medium text-slate-800 truncate block">{voice.name}</span>
                        <span className="text-[9px] text-slate-400 truncate block">{voice.dialect}</span>
                      </div>
                    </div>
                    <button type="button" onClick={(e) => { e.stopPropagation(); toggleFavoriteVoice(voice.id); }} className={`p-1 rounded shrink-0 ${favoriteVoiceIds.includes(voice.id) ? 'text-amber-500' : 'text-slate-300 hover:text-amber-500'}`} title="Favori">
                      <Star className="w-3.5 h-3.5" fill={favoriteVoiceIds.includes(voice.id) ? 'currentColor' : 'none'} />
                    </button>
                    <button onClick={(e) => handlePreviewVoice(e, voice)} className={`p-1 rounded shrink-0 ${isPreviewing ? 'text-purple-600' : 'text-slate-400 hover:text-slate-700'}`}>
                      {isPreviewing ? <Volume2 className="w-3.5 h-3.5 animate-pulse" /> : <Play className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="shrink-0 bg-slate-50 border border-slate-200 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${previewingVoiceId === currentVoice.id ? 'bg-purple-600 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>
                <VoiceGlyph icon={currentVoice.icon} gender={currentVoice.gender} className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-bold text-slate-900 truncate block">{currentVoice.name}</span>
                <span className="text-[10px] text-slate-400 truncate block">{currentVoice.dialect}</span>
              </div>
              <button onClick={(e) => handlePreviewVoice(e, currentVoice)} className={`p-1.5 rounded-lg shrink-0 ${previewingVoiceId === currentVoice.id ? 'bg-purple-600 text-white' : 'text-slate-400 hover:bg-slate-200 border border-slate-200 bg-white'}`}>
                {previewingVoiceId === currentVoice.id ? <Volume2 className="w-3.5 h-3.5 animate-pulse" /> : <Play className="w-3.5 h-3.5" />}
              </button>
            </div>
            
            <div className="space-y-2.5">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500 font-medium">{t.speedLabel}</span>
                  <span className="font-num font-bold text-slate-900">{speed.toFixed(1)}x</span>
                </div>
                <input type="range" min="0.7" max="1.5" step="0.1" value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))} className="thick-slider w-full bg-slate-200 rounded appearance-none cursor-pointer" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500 font-medium">{t.pitchLabel}</span>
                  <span className="font-num font-bold text-slate-900">{pitch.toFixed(1)}</span>
                </div>
                <input type="range" min="0.8" max="1.3" step="0.1" value={pitch} onChange={(e) => setPitch(parseFloat(e.target.value))} className="thick-slider w-full bg-slate-200 rounded appearance-none cursor-pointer" />
              </div>
            </div>
          </div>
        </div>

      </div>
      </fieldset>

      {/* ==================================================================
          LECTEUR AUDIO : VERSION ADAPTATIVE CORRIGÉE
          - Sur mobile : Se place à bottom-[4.5rem] (PILE AU-DESSUS DE LA BARRE DE TÂCHES)
          - Sur PC : Flotte au centre à bottom-4 sans être coupé
          ================================================================== */}
      {currentAudioUrl && (
        <div 
          className="
            fixed z-[65]
            bottom-[4.5rem] inset-x-2
            lg:bottom-4 lg:inset-x-auto lg:left-1/2 lg:-translate-x-1/2 lg:w-[calc(100%-2rem)] lg:max-w-3xl
            bg-slate-900/95 border border-purple-500/40 rounded-2xl
            shadow-[0_-8px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl
            animate-in slide-in-from-bottom-3 duration-200
          "
        >
          {/* Version Desktop (> lg) */}
          <div className="hidden lg:flex items-center gap-4 px-5 py-3">
            {/* Play/Pause */}
            <button 
              onClick={togglePlay} 
              className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 text-white flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-transform shrink-0 shadow-lg shadow-purple-600/30"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 ms-0.5 fill-white" />}
            </button>
            
            {/* Infos voix */}
            <div className="flex flex-col min-w-0 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white truncate max-w-[130px]">{currentVoice.name}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">{language === 'ar' ? 'جاهز ✓' : 'Prêt ✓'}</span>
              </div>
              <span className="text-[10px] text-purple-300 font-mono mt-0.5">
                {formatTime(currentTime)} / {formatTime(audioDuration)}
              </span>
            </div>

            {/* Waveform Desktop */}
            <div className="flex-1 min-w-0 flex items-center bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-700/50 relative group">
              <WaveformPlayer isPlaying={isPlaying} hasAudio={!!currentAudioUrl} currentTime={currentTime} duration={audioDuration} />
              <input 
                type="range" min={0} max={audioDuration || 0} step={0.1} value={currentTime}
                onChange={(e) => { if(audioRef.current) { audioRef.current.currentTime = parseFloat(e.target.value); setCurrentTime(parseFloat(e.target.value)); }}}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
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
              <button onClick={handleClosePlayer} className="p-2 text-slate-400 hover:text-white rounded-xl transition cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Version Mobile (lg:hidden) — Compacte, ne cache rien, pile au-dessus du menu */}
          <div className="lg:hidden flex items-center gap-2.5 px-3 py-2.5">
            {/* Play/Pause */}
            <button 
              onClick={togglePlay} 
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 text-white flex items-center justify-center cursor-pointer active:scale-95 transition-transform shrink-0 shadow-md"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 ms-0.5 fill-white" />}
            </button>

            {/* Nom + Progress bar tactile */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-white truncate">{currentVoice.name}</span>
                <span className="text-[10px] text-purple-300 font-mono">
                  {formatTime(currentTime)} / {formatTime(audioDuration)}
                </span>
              </div>
              <div 
                className="h-1.5 bg-slate-700 rounded-full overflow-hidden cursor-pointer relative"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const percent = (e.clientX - rect.left) / rect.width;
                  if (audioRef.current && audioDuration > 0) {
                    audioRef.current.currentTime = percent * audioDuration;
                    setCurrentTime(percent * audioDuration);
                  }
                }}
              >
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
                  style={{ width: `${audioDuration > 0 ? Math.min(100, (currentTime / audioDuration) * 100) : 0}%` }}
                />
              </div>
            </div>

            {/* Bouton Téléchargement rapide */}
            {mp3Url ? (
              <a href={mp3Url} download={`sawtify-${Date.now()}.mp3`} className="shrink-0 p-2 bg-purple-600 rounded-xl text-white">
                <Download className="w-4 h-4" />
              </a>
            ) : (
              <a href={currentAudioUrl} download={`sawtify-${Date.now()}.wav`} className="shrink-0 p-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200">
                <Download className="w-4 h-4" />
              </a>
            )}

            {/* Bouton Fermer */}
            <button onClick={handleClosePlayer} className="shrink-0 p-1.5 text-slate-400 hover:text-white rounded-lg">
              <X className="w-4 h-4" />
            </button>
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
        <div className="absolute inset-0 z-[80] flex items-center justify-center bg-slate-950/30 backdrop-blur-[2px]" aria-live="polite">
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

      {/* Popup ton de départ — s'affiche au-dessus de tout, avant chaque génération */}
      {showStartToneModal && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={language === 'ar' ? 'اختر طريقة بدء الصوت' : 'Ton de départ de la voix'}
          onMouseDown={(event) => { if (event.target === event.currentTarget) setShowStartToneModal(false); }}
        >
          <div className="w-full max-w-sm rounded-3xl border border-purple-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[.14em] text-purple-600">
                  {language === 'ar' ? 'قبل التوليد' : 'Avant de générer'}
                </p>
                <h3 className="mt-1 text-base font-extrabold text-slate-900">
                  {language === 'ar' ? 'كيف يبدأ الصوت؟' : 'Comment la voix doit-elle commencer ?'}
                </h3>
              </div>
              <button
                onClick={() => setShowStartToneModal(false)}
                className="shrink-0 rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label={language === 'ar' ? 'إغلاق' : 'Fermer'}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              {language === 'ar'
                ? 'أحيانًا يبدأ الصوت بحماس مباشرة وأحيانًا لا. اختر النبرة المطلوبة في أول كلمة.'
                : 'La voix démarre parfois direct excitée, parfois non. Choisis le ton pour le tout premier mot.'}
            </p>

            <div className="mt-4 grid gap-2">
              <button
                onClick={() => confirmStartTone('calm')}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-start transition hover:border-purple-300 hover:bg-purple-50"
              >
                <span className="text-xl">😌</span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-slate-900">{language === 'ar' ? 'هادئ' : 'Calme'}</span>
                  <span className="block text-[11px] text-slate-500">{language === 'ar' ? 'بداية هادئة ومريحة' : 'Démarrage posé et apaisé'}</span>
                </span>
              </button>
              <button
                onClick={() => confirmStartTone('natural')}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-start transition hover:border-purple-300 hover:bg-purple-50"
              >
                <span className="text-xl">🙂</span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-slate-900">{language === 'ar' ? 'عادي' : 'Simple'}</span>
                  <span className="block text-[11px] text-slate-500">{language === 'ar' ? 'نبرة طبيعية وعفوية' : 'Ton neutre et spontané'}</span>
                </span>
              </button>
              <button
                onClick={() => confirmStartTone('excited')}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-start transition hover:border-purple-300 hover:bg-purple-50"
              >
                <span className="text-xl">🤩</span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-slate-900">{language === 'ar' ? 'متحمس' : 'Excité'}</span>
                  <span className="block text-[11px] text-slate-500">{language === 'ar' ? 'طاقة عالية من أول كلمة' : 'Énergie haute dès le premier mot'}</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* « Quoi de neuf en 4.1 » — première visite, ou bouton « Nouveautés ».
          « Commencer à créer » ferme la pop-up : le studio est déjà derrière. */}
      {showWhatsNew && (
        <WhatsNewV41
          onClose={() => setShowWhatsNew(false)}
          onStart={() => setShowWhatsNew(false)}
          onSupport={() => { setShowWhatsNew(false); onOpenRecharge(); }}
        />
      )}
    </div>
  );
};
