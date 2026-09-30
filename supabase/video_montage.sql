-- ===================================================================
-- MONTAGE VIDÉO AUTOMATIQUE (Gemini + FFmpeg)
-- Exécuter dans le SQL Editor Supabase. Idempotent : peut être relancé.
-- ===================================================================

-- Historique des montages : une ligne par tâche de rendu, écrite par le
-- serveur avec la clé service_role (stages : queued → analyzing →
-- rendering → ready | failed). Les utilisateurs ne font que lire leurs
-- propres lignes ; l'insertion/mise à jour reste réservée au serveur.
CREATE TABLE IF NOT EXISTS public.video_render_jobs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'rendering', 'ready', 'failed')),
  stage TEXT CHECK (stage IN ('analyzing', 'rendering')),
  audio_mode TEXT NOT NULL DEFAULT 'voice' CHECK (audio_mode IN ('voice', 'original')),
  duration_seconds NUMERIC,
  cost_points INTEGER,
  caption_font TEXT,
  caption_size INTEGER,
  caption_style TEXT,
  caption_theme TEXT,
  clip_count INTEGER,
  caption_count INTEGER,
  montage_source TEXT CHECK (montage_source IN ('gemini', 'fallback')),
  gemini_model TEXT,
  gemini_cost_usd NUMERIC,
  error TEXT,
  output_ready_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_render_jobs_user
  ON public.video_render_jobs(user_id, created_at DESC);

ALTER TABLE public.video_render_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own video render jobs" ON public.video_render_jobs;
CREATE POLICY "Users read own video render jobs"
  ON public.video_render_jobs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role manages video render jobs" ON public.video_render_jobs;
CREATE POLICY "Service role manages video render jobs"
  ON public.video_render_jobs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

REVOKE ALL ON public.video_render_jobs FROM anon;
GRANT SELECT ON public.video_render_jobs TO authenticated;

-- -------------------------------------------------------------------
-- gemini_call_log : le serveur journalise désormais le plan de montage
-- (call_type = 'video_montage') et émet déjà 'ideas' — la contrainte
-- CHECK d'origine ne connaissait que 4 types et rejetait donc ces
-- lignes en silence. On élargit la liste, quel que soit le nom actuel
-- de la contrainte.
-- -------------------------------------------------------------------
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.gemini_call_log'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%call_type%'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.gemini_call_log DROP CONSTRAINT %I', constraint_name);
  END IF;

  EXECUTE 'ALTER TABLE public.gemini_call_log ADD CONSTRAINT gemini_call_log_call_type_check
    CHECK (call_type IN (''preview'', ''tts'', ''enhance'', ''script'', ''ideas'', ''video_montage''))';
END $$;
