-- Journalisation des appels Gemini et base du quota quotidien.
CREATE TABLE IF NOT EXISTS public.gemini_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  operation TEXT NOT NULL CHECK (operation IN ('tts', 'enhance', 'script', 'preview')),
  model TEXT,
  characters INTEGER NOT NULL DEFAULT 0,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gemini_usage_user_day
  ON public.gemini_usage_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gemini_usage_operation_day
  ON public.gemini_usage_logs(operation, created_at DESC);

ALTER TABLE public.gemini_usage_logs ENABLE ROW LEVEL SECURITY;

-- Le serveur utilise la clé service_role pour insérer et compter les appels.
-- Aucun accès direct anon/authenticated n'est ouvert.

-- Clés privées des intégrations développeur (la valeur brute n'est jamais stockée).
CREATE TABLE IF NOT EXISTS public.developer_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Application Beta',
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_developer_api_keys_user ON public.developer_api_keys(user_id, created_at DESC);
ALTER TABLE public.developer_api_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own developer keys" ON public.developer_api_keys;
CREATE POLICY "Users manage own developer keys" ON public.developer_api_keys
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Bonus automatique: +30 points à chaque 10e génération réussie.
CREATE OR REPLACE FUNCTION public.award_generation_milestone_bonus(p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_total INTEGER; v_new_balance INTEGER;
BEGIN
  SELECT total_generated_audios INTO v_total FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF v_total IS NULL OR v_total = 0 OR MOD(v_total, 10) <> 0 THEN
    RETURN jsonb_build_object('awarded', false, 'total_generated_audios', COALESCE(v_total, 0));
  END IF;
  UPDATE public.profiles SET credits_balance = credits_balance + 30, updated_at = NOW()
    WHERE id = p_user_id RETURNING credits_balance INTO v_new_balance;
  RETURN jsonb_build_object('awarded', true, 'bonus_points', 30, 'total_generated_audios', v_total, 'new_balance', v_new_balance);
END;
$$;
REVOKE ALL ON FUNCTION public.award_generation_milestone_bonus(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_generation_milestone_bonus(UUID) TO service_role;

-- La suppression physique des fichiers est exécutée par le serveur avec service_role,
-- car Supabase Storage ne supprime pas automatiquement les objets lors d'une purge SQL.
CREATE INDEX IF NOT EXISTS idx_generations_retention ON public.voice_generations(created_at);
