-- ============================================================================
-- Idées de sujets IA (bouton « Idées IA · 2 pts » du studio)
-- ----------------------------------------------------------------------------
-- Deux journaux refusent le type d'appel 'ideas' tant que leur contrainte CHECK
-- n'est pas élargie :
--   • gemini_usage_logs.operation  (sert au quota journalier Gemini)
--   • gemini_call_log.call_type    (observabilité des coûts)
--
-- Le serveur fonctionne SANS ce script (il enregistre ces appels sous 'enhance'
-- pour que le quota continue de compter), mais l'exécuter rend les statistiques
-- exactes : on distingue enfin les idées de sujets du bouton « Magique ».
--
-- À exécuter dans Supabase → SQL Editor. Idempotent : peut être relancé sans risque.
-- ============================================================================

ALTER TABLE public.gemini_usage_logs DROP CONSTRAINT IF EXISTS gemini_usage_logs_operation_check;
ALTER TABLE public.gemini_usage_logs
  ADD CONSTRAINT gemini_usage_logs_operation_check
  CHECK (operation IN ('tts', 'enhance', 'script', 'preview', 'ideas'));

ALTER TABLE public.gemini_call_log DROP CONSTRAINT IF EXISTS gemini_call_log_call_type_check;
ALTER TABLE public.gemini_call_log
  ADD CONSTRAINT gemini_call_log_call_type_check
  CHECK (call_type IN ('preview', 'tts', 'enhance', 'script', 'ideas'));

-- Vérification : les deux requêtes doivent renvoyer zéro ligne d'erreur.
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid IN ('public.gemini_usage_logs'::regclass, 'public.gemini_call_log'::regclass)
  AND conname LIKE '%operation_check%' OR conname LIKE '%call_type_check%';
