-- Funnel marketing Sawtify : événements anonymisés par session, sans email ni donnée sensible.
CREATE TABLE IF NOT EXISTS public.marketing_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL,
  event_name TEXT NOT NULL CHECK (event_name IN ('landing_view','landing_90_percent','signup_open','google_signup_click','oauth_return','account_created','onboarding_completed')),
  path TEXT,
  source TEXT,
  medium TEXT,
  campaign TEXT,
  referrer TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_marketing_events_created ON public.marketing_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_events_session ON public.marketing_events(session_id, event_name);
CREATE INDEX IF NOT EXISTS idx_marketing_events_campaign ON public.marketing_events(campaign, event_name);
ALTER TABLE public.marketing_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.marketing_events FROM anon, authenticated;
GRANT INSERT ON public.marketing_events TO anon, authenticated;
CREATE POLICY "Public can record marketing events" ON public.marketing_events FOR INSERT TO anon, authenticated WITH CHECK (char_length(session_id) BETWEEN 16 AND 100);
-- Lecture réservée au backend service_role via /api/admin/overview.
NOTIFY pgrst, 'reload schema';
