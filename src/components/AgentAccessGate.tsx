import React, { useEffect, useState } from 'react';
import { ArrowLeft, Bot, KeyRound, Loader2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { API_BASE_URL } from '../config/apiBase';
import { clearAgentAccessToken, getAgentAccessToken, saveAgentAccessToken } from '../services/agentAccess';

interface AgentAccessGateProps {
  children: React.ReactNode;
  onBack?: () => void;
}

type GateState = 'checking' | 'locked' | 'allowed' | 'unavailable' | 'misconfigured';

export const AgentAccessGate: React.FC<AgentAccessGateProps> = ({ children, onBack }) => {
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  const bi = (fr: string, ar: string) => isArabic ? ar : fr;
  const [state, setState] = useState<GateState>('checking');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const statusResponse = await fetch(`${API_BASE_URL}/api/agent/access/status`);
        if (!statusResponse.ok) throw new Error('status_unavailable');
        const status = await statusResponse.json();
        if (!active) return;
        if (!status.required) { setState('allowed'); return; }
        if (!status.configured) { setState('misconfigured'); return; }

        const savedToken = getAgentAccessToken();
        if (!savedToken) { setState('locked'); return; }
        const checkResponse = await fetch(`${API_BASE_URL}/api/agent/access/check`, {
          headers: { 'X-Agent-Access-Token': savedToken },
        });
        if (!active) return;
        if (checkResponse.ok) setState('allowed');
        else {
          clearAgentAccessToken();
          setState('locked');
        }
      } catch {
        if (active) setState('unavailable');
      }
    })();
    return () => { active = false; };
  }, []);

  const submitCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/agent/access/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const result = await response.json();
      if (!response.ok || !result.success || !result.token) {
        setError(result.error || bi('Code invalide. Réessaie.', 'الرمز غير صحيح. عاود المحاولة.'));
        return;
      }
      saveAgentAccessToken(result.token);
      setCode('');
      setState('allowed');
    } catch {
      setError(bi('Impossible de vérifier le code. Réessaie dans un instant.', 'تعذّر التحقق من الرمز. عاود بعد لحظة.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (state === 'allowed') return <>{children}</>;

  return (
    <main className="saw-app-background flex min-h-[70vh] items-center justify-center px-4 py-12" dir={isArabic ? 'rtl' : 'ltr'}>
      <section className="w-full max-w-md rounded-[28px] border border-violet-100 bg-white/90 p-6 shadow-[0_24px_80px_rgba(49,24,90,.12)] backdrop-blur-xl sm:p-8">
        {onBack && <button type="button" onClick={onBack} className="mb-6 inline-flex items-center gap-2 text-xs font-bold text-slate-500 transition hover:text-violet-700"><ArrowLeft className="h-4 w-4" />{bi('Retour à Sawtify', 'العودة إلى Sawtify')}</button>}
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-700 to-fuchsia-600 text-white shadow-lg shadow-violet-200"><Bot className="h-6 w-6" /></div>
        <span className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[.16em] text-violet-700"><ShieldCheck className="h-3.5 w-3.5" />{bi('Accès bêta privé', 'دخول تجريبي خاص')}</span>
        <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950">{bi('Agent IA', 'Agent IA')}</h1>

        {state === 'checking' && <p role="status" className="mt-3 flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin text-violet-600" />{bi('Vérification de l’accès…', 'جاري التحقق من الدخول…')}</p>}

        {state === 'locked' && <>
          <p className="mt-2 text-sm leading-6 text-slate-600">{bi('Cette zone est réservée pendant le développement. Saisis le code d’accès pour continuer.', 'هذه المساحة خاصة خلال فترة التطوير. دخل رمز الدخول باش تواصل.')}</p>
          <form onSubmit={submitCode} className="mt-6 space-y-3">
            <label htmlFor="agent-access-code" className="text-xs font-bold text-slate-700">{bi('Code d’accès', 'رمز الدخول')}</label>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-100">
              <KeyRound className="h-4 w-4 shrink-0 text-violet-600" />
              <input id="agent-access-code" type="password" value={code} onChange={(event) => setCode(event.target.value)} autoComplete="current-password" required maxLength={100} className="min-w-0 flex-1 bg-transparent py-3 text-sm font-semibold text-slate-900 outline-none" placeholder={bi('Entre le code reçu', 'دخل الرمز اللي وصلك')} />
            </div>
            {error && <p role="alert" className="text-xs font-semibold text-rose-600">{error}</p>}
            <button type="submit" disabled={isSubmitting || !code.trim()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-700 to-fuchsia-600 px-4 py-3 text-sm font-extrabold text-white transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
              {isSubmitting ? bi('Vérification…', 'جاري التحقق…') : bi('Accéder à Agent IA', 'الدخول إلى Agent IA')}
            </button>
          </form>
        </>}

        {state === 'misconfigured' && <p role="alert" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">{bi('L’accès privé est activé, mais le code n’est pas encore configuré sur le serveur.', 'الدخول الخاص مفعّل، لكن الرمز مازال ما تبرمجش في الخادم.')}</p>}
        {state === 'unavailable' && <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-800"><p>{bi('Impossible de vérifier l’accès auprès du serveur.', 'تعذّر التحقق من الدخول عبر الخادم.')}</p><button type="button" onClick={() => window.location.reload()} className="mt-2 font-black underline">{bi('Réessayer', 'عاود المحاولة')}</button></div>}
      </section>
    </main>
  );
};
