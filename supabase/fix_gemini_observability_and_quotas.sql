-- ==============================================================================
-- FIX COST-1/2/3 : observabilité des coûts Gemini, quota LLM journalier,
-- alerte de dépassement. Rien de tout ceci n'est exposé au client : c'est
-- une couche purement serveur/admin.
-- ==============================================================================

-- Journal unique de TOUS les appels Gemini (preview gratuite, TTS, enhance, script).
-- billable=false pour les previews (gratuites), billable=true pour les générations payantes.
CREATE TABLE IF NOT EXISTS public.gemini_call_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    call_type TEXT NOT NULL CHECK (call_type IN ('preview', 'tts', 'enhance', 'script')),
    billable BOOLEAN NOT NULL DEFAULT FALSE,
    points_cost INTEGER NOT NULL DEFAULT 0,
    char_count INTEGER,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    latency_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gemini_call_log_user_day ON public.gemini_call_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gemini_call_log_type ON public.gemini_call_log(call_type, created_at DESC);
-- Requête rapide "quota LLM du jour" (enhance + script, billable uniquement).
CREATE INDEX IF NOT EXISTS idx_gemini_call_log_llm_quota ON public.gemini_call_log(user_id, call_type, billable, created_at DESC);

ALTER TABLE public.gemini_call_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages gemini call log" ON public.gemini_call_log;
CREATE POLICY "Service role manages gemini call log"
  ON public.gemini_call_log FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Une alerte au plus par utilisateur et par jour lorsqu'un seuil d'appels
-- Gemini est dépassé (contrainte UNIQUE = déduplication naturelle, pas de spam).
CREATE TABLE IF NOT EXISTS public.gemini_usage_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    alert_date DATE NOT NULL DEFAULT CURRENT_DATE,
    call_count INTEGER NOT NULL,
    threshold INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, alert_date)
);

ALTER TABLE public.gemini_usage_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages gemini usage alerts" ON public.gemini_usage_alerts;
CREATE POLICY "Service role manages gemini usage alerts"
  ON public.gemini_usage_alerts FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Lecture admin uniquement (aucun accès anon/authenticated ici : ces tables ne
-- sont jamais lues par le frontend client, seulement par le service_role côté
-- serveur et, plus tard si besoin, par un dashboard admin dédié).
