-- ==============================================================================
-- SAWTIFY - MIGRATION : limite le bonus de bienvenue (50 points) à une seule
-- fois par adresse IP, même si plusieurs comptes Gmail sont créés.
-- ------------------------------------------------------------------------------
-- La logique applicative est dans server.ts (POST /api/auth/claim-welcome-bonus),
-- appelée par le client juste après la toute première connexion (voir App.tsx).
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.ip_claims (
    ip TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ip_claims_user ON public.ip_claims(user_id);

ALTER TABLE public.ip_claims ENABLE ROW LEVEL SECURITY;
-- Aucune policy publique : seul le client Supabase "service role" côté serveur
-- (server.ts) peut lire/écrire cette table.
