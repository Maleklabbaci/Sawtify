import React, { useEffect, useRef, useState } from 'react';
import { Bot, ExternalLink, Mic, MicOff, Send, X } from 'lucide-react';
import { API_BASE_URL } from '../config/apiBase';
import { answerAgentQuestion } from '../services/agentReply';
import { DEMO_AGENT_STORE, makeAgentId, readAgentStore, type AgentStore } from '../services/agentSawtify';
import { BUBBLE_PALETTES, type BubblePalette } from './VoiceBubble';

type Msg = { id: string; role: 'customer' | 'assistant'; text: string };
type Recognition = {
  lang: string; interimResults: boolean; maxAlternatives: number;
  onresult: ((event: any) => void) | null; onerror: ((event: any) => void) | null; onend: (() => void) | null;
  start: () => void; stop: () => void; abort?: () => void;
};

const Orb: React.FC<{ size: number; palette: BubblePalette; active?: boolean }> = ({ size, palette, active }) => (
  <span
    className="saw-vb-bubble shrink-0"
    style={{
      '--vb-base': palette.base, '--vb-liquid-1': palette.liquid1, '--vb-liquid-2': palette.liquid2, '--vb-liquid-3': palette.liquid3,
      width: size, height: size, transform: active ? 'scale(1.1)' : 'scale(1)', transition: 'transform .35s',
    } as React.CSSProperties}
    aria-hidden="true"
  >
    <span className="saw-vb-liquid saw-vb-liquid-1" /><span className="saw-vb-liquid saw-vb-liquid-2" /><span className="saw-vb-liquid saw-vb-liquid-3" /><span className="saw-vb-shine" />
  </span>
);

export const AgentWidgetPage: React.FC<{ slug: string }> = ({ slug }) => {
  const params = new URLSearchParams(window.location.search);
  const isDemo = params.get('demo') === '1';
  const isPreview = params.get('preview') === '1';
  const side = params.get('side') === 'left' ? 'left' : 'right';
  const langParam = params.get('lang');
  const palette = BUBBLE_PALETTES[5];

  const [store, setStore] = useState<AgentStore | null>(null);
  const [failed, setFailed] = useState(false);
  const [language, setLanguage] = useState<'fr' | 'ar'>(langParam === 'ar' ? 'ar' : 'fr');
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isResponding, setIsResponding] = useState(false);
  const [hint, setHint] = useState('');
  const [text, setText] = useState('');
  const recognitionRef = useRef<Recognition | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const respondingRef = useRef(false);
  const startedRef = useRef(false);
  const isArabic = language === 'ar';
  const bi = (fr: string, ar: string) => isArabic ? ar : fr;

  // Transparent canvas: the widget floats over the host website.
  useEffect(() => {
    const html = document.documentElement; const body = document.body;
    const previous = [html.style.background, body.style.background];
    html.style.setProperty('background', 'transparent', 'important');
    body.style.setProperty('background', 'transparent', 'important');
    return () => { html.style.background = previous[0]; body.style.background = previous[1]; };
  }, []);

  useEffect(() => {
    let active = true;
    if (isDemo) {
      const demo = readAgentStore();
      setStore(demo);
      if (!langParam) setLanguage(demo.language === 'ar' ? 'ar' : 'fr');
      return;
    }
    fetch(`${API_BASE_URL}/api/agent/sawtify/public/${encodeURIComponent(slug)}`)
      .then((response) => response.json())
      .then((body) => {
        if (!active) return;
        if (!body?.success || !body.store) { setFailed(true); return; }
        setStore({ ...body.store, orders: [] });
        if (!langParam) setLanguage(body.store.language === 'ar' ? 'ar' : 'fr');
      })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [isDemo, slug, langParam]);

  useEffect(() => { window.parent?.postMessage({ type: 'sawtify-agent', open }, '*'); }, [open]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, hint]);
  useEffect(() => { document.documentElement.lang = isArabic ? 'ar' : 'fr'; }, [isArabic]);
  useEffect(() => () => { recognitionRef.current?.abort?.(); if ('speechSynthesis' in window) window.speechSynthesis.cancel(); }, []);

  if (!store || failed) {
    return isPreview && failed
      ? <p className="m-2 rounded-xl bg-white p-3 text-[11px] font-semibold text-rose-600 shadow">Boutique introuvable : enregistrez d’abord votre lien.</p>
      : null;
  }

  const greeting = store.greeting && store.greeting !== DEMO_AGENT_STORE.greeting
    ? store.greeting
    : bi(`Bonjour, bienvenue chez ${store.name}. Comment puis-je vous aider ?`, `سلام، مرحبا بيك عند ${store.name}. كيفاش نقدر نعاونك؟`);
  const suggestions = store.faqs.filter((faq) => faq.active).slice(0, 3).map((faq) => faq.question);

  const speak = (value: string) => new Promise<boolean>((resolve) => {
    if (!('speechSynthesis' in window)) { resolve(false); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(value);
    utterance.lang = isArabic ? 'ar-SA' : 'fr-FR';
    utterance.rate = 0.96;
    let started = false; let done = false;
    const finish = () => { if (done) return; done = true; window.clearTimeout(timer); setIsSpeaking(false); resolve(started); };
    const timer = window.setTimeout(finish, Math.min(120_000, Math.max(10_000, Math.ceil(value.length / 10) * 1000 + 5_000)));
    utterance.onstart = () => { started = true; setIsSpeaking(true); };
    utterance.onend = finish; utterance.onerror = finish;
    try { window.speechSynthesis.speak(utterance); } catch { finish(); }
  });

  const startListening = () => {
    if (respondingRef.current) return;
    const w = window as Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) { setHint(bi('Micro non pris en charge : écrivez votre question.', 'الميكرو غير مدعوم: اكتب سؤالك.')); return; }
    try {
      recognitionRef.current?.abort?.();
      const recognition = new Ctor();
      recognition.lang = isArabic ? 'ar-DZ' : 'fr-DZ';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript?.trim();
        setIsListening(false);
        if (transcript) void ask(transcript); else setHint(bi('Je n’ai pas bien entendu. Réessayez.', 'ما سمعتكش مليح. عاود.'));
      };
      recognition.onerror = () => { setIsListening(false); setHint(bi('Micro indisponible. Écrivez votre question.', 'الميكرو غير متاح. اكتب سؤالك.')); };
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
      setHint(bi('Je vous écoute…', 'راني نسمع فيك…'));
      setIsListening(true);
      recognition.start();
    } catch { setIsListening(false); setHint(bi('Micro indisponible. Écrivez votre question.', 'الميكرو غير متاح. اكتب سؤالك.')); }
  };

  const ask = async (question: string) => {
    if (!store.isActive) { setHint(bi('Cet assistant est en pause.', 'المساعد متوقف مؤقتاً.')); return; }
    if (respondingRef.current || !question.trim()) return;
    respondingRef.current = true;
    setIsResponding(true);
    setHint(bi('Préparation de la réponse…', 'جاري تحضير الإجابة…'));
    try {
      let answer: string;
      if (isDemo) {
        answer = answerAgentQuestion(store, question, language);
      } else {
        const response = await fetch(`${API_BASE_URL}/api/agent/sawtify/respond`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug, question, language }),
        });
        const body = await response.json().catch(() => ({}));
        if (response.status === 402) throw new Error(bi('Cet assistant est momentanément indisponible.', 'هذا المساعد غير متاح مؤقتاً.'));
        if (!response.ok || !body.success || typeof body.answer !== 'string') throw new Error(body?.error || bi('Impossible de répondre pour le moment.', 'ما قدرناش نجاوبو حالياً.'));
        answer = body.answer;
      }
      setMessages((current) => [...current, { id: makeAgentId('msg'), role: 'customer', text: question }, { id: makeAgentId('msg'), role: 'assistant', text: answer }]);
      setHint('');
      await speak(answer);
    } catch (error: any) {
      setHint(error?.message || bi('Impossible de répondre pour le moment.', 'ما قدرناش نجاوبو حالياً.'));
    } finally { respondingRef.current = false; setIsResponding(false); }
  };

  // The click on the launcher happens inside this frame, so the browser allows speech right away.
  const openWidget = async () => {
    setOpen(true);
    if (startedRef.current) return;
    startedRef.current = true;
    await speak(greeting);
    startListening();
  };

  const closeWidget = () => {
    recognitionRef.current?.abort?.();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setIsListening(false); setIsSpeaking(false); setHint('');
    setOpen(false);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const question = text.trim();
    if (!question || isResponding) return;
    setText('');
    void ask(question);
  };

  const busy = isListening || isSpeaking || isResponding;

  if (!open) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <button type="button" onClick={() => void openWidget()} aria-label={bi(`Parler avec ${store.name}`, `اهدر مع ${store.name}`)} className="relative flex h-[72px] w-[72px] items-center justify-center rounded-full bg-white shadow-[0_10px_30px_rgba(76,29,149,.35)] transition hover:scale-105 active:scale-95">
          <span className="absolute inset-0 animate-ping rounded-full bg-violet-400/30" aria-hidden="true" />
          <Orb size={58} palette={palette} />
          <span className="absolute -end-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-white" aria-hidden="true"><Mic className="h-2.5 w-2.5" /></span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 p-1.5" dir={isArabic ? 'rtl' : 'ltr'} style={{ fontFamily: isArabic ? 'var(--font-sans-arabic)' : "'Sora', var(--font-sans-latin)" }}>
      <section className="flex h-full w-full flex-col overflow-hidden rounded-[24px] border border-violet-100 bg-white shadow-[0_18px_50px_rgba(76,29,149,.35)]">
        <header className="flex items-center gap-3 bg-gradient-to-r from-violet-700 to-fuchsia-600 px-4 py-3 text-white">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20"><Bot className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{store.name}</p><p className="text-[10px] font-semibold text-violet-100">{store.isActive ? bi('● Assistant en ligne', '● المساعد متصل') : bi('En pause', 'متوقف')}</p></div>
          <div className="flex items-center gap-0.5 rounded-lg bg-white/15 p-0.5 text-[10px] font-bold">
            <button type="button" onClick={() => setLanguage('fr')} className={`rounded-md px-2 py-1 ${language === 'fr' ? 'bg-white text-violet-700' : 'text-white'}`}>FR</button>
            <button type="button" onClick={() => setLanguage('ar')} className={`rounded-md px-2 py-1 ${language === 'ar' ? 'bg-white text-violet-700' : 'text-white'}`}>دارجة</button>
          </div>
          <button type="button" onClick={closeWidget} aria-label={bi('Fermer', 'إغلاق')} className="rounded-lg p-1.5 text-white/90 transition hover:bg-white/20"><X className="h-4 w-4" /></button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto bg-[#faf9ff] px-3.5 py-4 text-[13px] leading-6">
          <p className="max-w-[88%] rounded-2xl rounded-es-sm border border-violet-100 bg-white px-3.5 py-2.5 text-slate-700 shadow-sm">{greeting}</p>
          {messages.map((message) => message.role === 'customer'
            ? <p key={message.id} className="ms-auto max-w-[85%] rounded-2xl rounded-ee-sm bg-violet-700 px-3.5 py-2.5 text-white shadow-sm">{message.text}</p>
            : <p key={message.id} className="max-w-[88%] rounded-2xl rounded-es-sm border border-violet-100 bg-white px-3.5 py-2.5 text-slate-700 shadow-sm">{message.text}</p>)}
          {!messages.length && suggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">{suggestions.map((question) => <button key={question} type="button" disabled={isResponding} onClick={() => void ask(question)} className="rounded-full border border-violet-200 bg-white px-3 py-1.5 text-[11px] font-bold text-violet-800 transition hover:bg-violet-50 disabled:opacity-50">{question}</button>)}</div>
          )}
          <div ref={endRef} />
        </div>

        <div className="border-t border-violet-100 bg-white px-3 pb-2.5 pt-2.5">
          <div className="mb-2 flex items-center gap-3">
            <Orb size={40} palette={palette} active={busy} />
            <p role="status" className={`min-w-0 flex-1 truncate text-[11px] font-semibold ${isListening ? 'text-violet-700' : 'text-slate-500'}`}>
              {hint || (isSpeaking ? bi('Je vous réponds…', 'راني نجاوبك…') : bi('Parlez ou écrivez votre question.', 'اهدر ولا اكتب سؤالك.'))}
            </p>
          </div>
          <form onSubmit={submit} className="flex items-center gap-2">
            <input value={text} onChange={(event) => setText(event.target.value)} disabled={isResponding} maxLength={1200} placeholder={bi('Écrivez votre question…', 'اكتب سؤالك…')} aria-label={bi('Votre question', 'سؤالك')} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" />
            <button type="submit" disabled={isResponding || !text.trim()} aria-label={bi('Envoyer', 'أرسل')} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-700 text-white transition hover:bg-violet-600 disabled:opacity-50"><Send className="h-4 w-4" /></button>
            <button type="button" disabled={isResponding} onClick={() => { if (isListening) { recognitionRef.current?.stop(); setIsListening(false); setHint(''); } else { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); setIsSpeaking(false); startListening(); } }} aria-label={isListening ? bi('Arrêter le micro', 'أوقف الميكرو') : bi('Parler', 'اهدر')} className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition disabled:opacity-50 ${isListening ? 'animate-pulse bg-rose-600' : 'bg-fuchsia-600 hover:bg-fuchsia-500'}`}>{isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}</button>
          </form>
          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
            {!isDemo && <a href={`/call/${encodeURIComponent(slug)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold text-violet-700 hover:text-violet-900"><ExternalLink className="h-3 w-3" />{bi('Passer une commande / demande', 'طلب / حجز موعد')}</a>}
            <a href="/agent-ai" target="_blank" rel="noopener noreferrer" className="ms-auto font-semibold hover:text-violet-700">{bi('Propulsé par Sawtify', 'بدعم من Sawtify')}</a>
          </div>
        </div>
      </section>
    </div>
  );
};
