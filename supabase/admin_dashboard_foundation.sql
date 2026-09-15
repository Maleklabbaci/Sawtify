-- Sawtify Admin foundation
-- Apply this file to the Supabase project used by Sawtify (jjpcvevdztletxgmmzqr).
ALTER TABLE public.voice_generations
  ADD COLUMN IF NOT EXISTS generation_source TEXT NOT NULL DEFAULT 'legacy'
  CHECK (generation_source IN ('free_trial', 'paid_balance', 'developer_api', 'milestone_bonus', 'legacy'));
CREATE INDEX IF NOT EXISTS idx_voice_generations_source_created
  ON public.voice_generations(generation_source, created_at DESC);

CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'support' CHECK (role IN ('owner', 'admin', 'support', 'analyst')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_users FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_audit_log FROM anon, authenticated;
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON public.admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_target ON public.admin_audit_log(target_user_id, created_at DESC);

-- After applying, insert only the owner account UUID:
-- INSERT INTO public.admin_users (user_id, role) VALUES ('OWNER_USER_UUID', 'owner');
