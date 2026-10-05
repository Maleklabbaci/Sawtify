-- Origine des générations (connecteur MCP) pour le dashboard admin.
-- À exécuter une fois dans Supabase > SQL Editor.
-- Valeurs : 'web' (défaut), 'mcp_claude', 'mcp_chatgpt', 'mcp_apikey' (Claude Code / Gemini CLI avec clé API), 'mcp_other'.
ALTER TABLE public.voice_generations
  ADD COLUMN IF NOT EXISTS generation_channel TEXT NOT NULL DEFAULT 'web';

CREATE INDEX IF NOT EXISTS idx_voice_generations_channel
  ON public.voice_generations (generation_channel, created_at DESC);
