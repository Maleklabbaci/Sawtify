-- Passerelle GSM Sawtify — secrets hachés, association propriétaire/boutique et journalisation.
-- À appliquer explicitement dans Supabase avant d'activer les routes correspondantes.

CREATE TABLE IF NOT EXISTS public.agent_sawtify_gateways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.agent_sawtify_stores(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL CHECK (char_length(device_id) BETWEEN 8 AND 128),
  device_name TEXT NOT NULL DEFAULT 'Passerelle Sawtify' CHECK (char_length(device_name) BETWEEN 1 AND 80),
  api_key_prefix TEXT NOT NULL UNIQUE,
  api_key_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'revoked')),
  battery_percent SMALLINT CHECK (battery_percent BETWEEN 0 AND 100),
  network_state TEXT CHECK (network_state IS NULL OR network_state IN ('connected', 'no_service', 'airplane_mode', 'unknown')),
  signal_percent SMALLINT CHECK (signal_percent BETWEEN 0 AND 100),
  active_sim_slot TEXT,
  sim_slots JSONB NOT NULL DEFAULT '[]'::JSONB CHECK (jsonb_typeof(sim_slots) = 'array'),
  capabilities JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(capabilities) = 'object'),
  last_seen_at TIMESTAMPTZ,
  paired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, device_id)
);

CREATE TABLE IF NOT EXISTS public.agent_sawtify_gateway_pairing_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.agent_sawtify_stores(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.agent_sawtify_gateway_ws_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.agent_sawtify_stores(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ticket_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.agent_sawtify_gateway_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.agent_sawtify_stores(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  gateway_id UUID NOT NULL REFERENCES public.agent_sawtify_gateways(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.agent_sawtify_orders(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('outbound_call', 'send_sms')),
  destination TEXT NOT NULL CHECK (char_length(destination) BETWEEN 8 AND 20),
  message_text TEXT CHECK (message_text IS NULL OR char_length(message_text) BETWEEN 1 AND 320),
  sim_slot TEXT,
  consent_method TEXT NOT NULL CHECK (consent_method IN ('explicit_customer_request', 'recorded_opt_in')),
  consent_reference_hash TEXT NOT NULL,
  consent_confirmed_at TIMESTAMPTZ NOT NULL,
  authorized_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL CHECK (char_length(idempotency_key) BETWEEN 16 AND 100),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'dispatched', 'accepted', 'running', 'completed', 'failed', 'cancelled')),
  error_code TEXT,
  result JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(result) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dispatched_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  UNIQUE (owner_user_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS public.agent_sawtify_gateway_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.agent_sawtify_stores(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  gateway_id UUID REFERENCES public.agent_sawtify_gateways(id) ON DELETE SET NULL,
  job_id UUID REFERENCES public.agent_sawtify_gateway_jobs(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'gateway_connected', 'gateway_disconnected', 'telemetry',
    'inbound_call', 'call_state', 'inbound_sms', 'sms_state', 'job_dispatched',
    'job_started', 'job_completed', 'job_failed', 'gateway_revoked'
  )),
  details JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(details) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_gateway_owner_created
  ON public.agent_sawtify_gateways(owner_user_id, created_at DESC)
  WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_agent_gateway_pairing_expiry
  ON public.agent_sawtify_gateway_pairing_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_agent_gateway_ws_ticket_expiry
  ON public.agent_sawtify_gateway_ws_tickets(expires_at);
CREATE INDEX IF NOT EXISTS idx_agent_gateway_jobs_owner_created
  ON public.agent_sawtify_gateway_jobs(owner_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_gateway_jobs_owner_action_created
  ON public.agent_sawtify_gateway_jobs(owner_user_id, action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_gateway_jobs_device_status
  ON public.agent_sawtify_gateway_jobs(gateway_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_agent_gateway_events_owner_created
  ON public.agent_sawtify_gateway_events(owner_user_id, created_at DESC);

ALTER TABLE public.agent_sawtify_gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_sawtify_gateway_pairing_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_sawtify_gateway_ws_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_sawtify_gateway_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_sawtify_gateway_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.agent_sawtify_gateways,
  public.agent_sawtify_gateway_pairing_tokens,
  public.agent_sawtify_gateway_ws_tickets,
  public.agent_sawtify_gateway_jobs,
  public.agent_sawtify_gateway_events
FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_sawtify_gateways,
  public.agent_sawtify_gateway_pairing_tokens,
  public.agent_sawtify_gateway_ws_tickets,
  public.agent_sawtify_gateway_jobs,
  public.agent_sawtify_gateway_events
TO service_role;

COMMENT ON TABLE public.agent_sawtify_gateways IS 'Relais Android Sawtify; clé d’appareil stockée uniquement sous forme de hash.';
COMMENT ON TABLE public.agent_sawtify_gateway_pairing_tokens IS 'Jetons d’appairage à usage unique et durée courte; seul leur hash est stocké.';
COMMENT ON TABLE public.agent_sawtify_gateway_ws_tickets IS 'Tickets WebSocket propriétaires à usage unique et durée courte.';
COMMENT ON TABLE public.agent_sawtify_gateway_jobs IS 'Actions GSM autorisées, liées à une demande confirmée et à un consentement explicite journalisé.';
COMMENT ON TABLE public.agent_sawtify_gateway_events IS 'Événements techniques minimisés; ne pas y stocker le contenu d’appels/SMS ni des identifiants SIM.';
