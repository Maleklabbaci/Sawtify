-- 10. AI FEEDBACK (👍/👎 sur le Magique / Générateur de script) — table manquante,
-- c'est pourquoi les boutons like/dislike ne persistaient rien.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.ai_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    input_text TEXT,
    output_text TEXT NOT NULL,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    type TEXT NOT NULL DEFAULT 'enhance',
    region TEXT DEFAULT 'general',
    sector TEXT DEFAULT 'general',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_feedback_user ON public.ai_feedback(user_id, created_at DESC);

ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own feedback"
    ON public.ai_feedback FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view own feedback"
    ON public.ai_feedback FOR SELECT
    USING (auth.uid() = user_id);

-- ==============================================================================
-- 11. STOCKAGE AUDIO (Supabase Storage) — corrige l'historique cassé après reload
-- Bucket privé : chaque fichier est accédé via URL signée temporaire, jamais
-- exposé publiquement. Convention de chemin : {user_id}/{fichier}.wav
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-generations', 'audio-generations', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own audio"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'audio-generations' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can read own audio"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'audio-generations' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own audio"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'audio-generations' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ==============================================================================
-- 12. DÉBIT ATOMIQUE CÔTÉ SERVEUR (Enhance -2pts / Script -5pts)
-- Réservée au service_role (server.ts) : élimine la race condition du
-- select+update séparé utilisé auparavant dans server.ts (deductCredits).
-- Non exécutable par anon/authenticated -> ne contourne pas la logique métier.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.deduct_user_credits_service(
    p_user_id UUID,
    p_amount INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_current_balance INTEGER;
BEGIN
    SELECT credits_balance INTO v_current_balance
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;

    IF v_current_balance < p_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient credits balance', 'balance', v_current_balance);
    END IF;

    UPDATE public.profiles
    SET credits_balance = credits_balance - p_amount, updated_at = NOW()
    WHERE id = p_user_id;

    RETURN jsonb_build_object('success', true, 'remaining_balance', v_current_balance - p_amount);
END;
$$;

REVOKE ALL ON FUNCTION public.deduct_user_credits_service(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_user_credits_service(UUID, INTEGER) TO service_role;
