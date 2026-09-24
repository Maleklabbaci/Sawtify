-- Suivi précis des appels Gemini : modèle, tokens et coût calculé.
-- Les anciennes lignes restent valides et conservent leurs valeurs NULL.
ALTER TABLE public.gemini_call_log
  ADD COLUMN IF NOT EXISTS model TEXT,
  ADD COLUMN IF NOT EXISTS input_tokens INTEGER,
  ADD COLUMN IF NOT EXISTS output_tokens INTEGER,
  ADD COLUMN IF NOT EXISTS total_cost_usd NUMERIC(14, 10);

CREATE INDEX IF NOT EXISTS idx_gemini_call_log_model_created
  ON public.gemini_call_log(model, created_at DESC);

-- Le journal usage existant conserve aussi les compteurs exacts dans metadata
-- pour rester compatible avec les déploiements déjà en production.
COMMENT ON COLUMN public.gemini_call_log.total_cost_usd IS
  'Coût estimé/calculé par appel en USD, basé sur les tokens Gemini retournés.';
