-- ==============================================================================
-- SAWTIFY - NOTE (1 À 5 ÉTOILES) SUR CHAQUE GÉNÉRATION VOCALE
-- Le téléchargement (WAV/MP3) côté client n'est débloqué qu'une fois la
-- génération notée. Cette note est enregistrée ici via une RPC dédiée pour
-- ne jamais laisser le client écrire directement une colonne arbitraire.
-- ==============================================================================

-- 1. Colonne note (1 à 5, NULL tant que l'utilisateur n'a pas noté)
ALTER TABLE public.voice_generations
    ADD COLUMN IF NOT EXISTS rating SMALLINT CHECK (rating IS NULL OR (rating BETWEEN 1 AND 5));

CREATE INDEX IF NOT EXISTS idx_generations_rating ON public.voice_generations(user_id, rating);

-- 2. RPC : l'utilisateur note sa propre génération (une seule ligne, la sienne).
--    SECURITY DEFINER + vérif explicite user_id = auth.uid() : impossible de
--    noter (ou modifier) la génération de quelqu'un d'autre.
CREATE OR REPLACE FUNCTION public.rate_generation(
    p_generation_id UUID,
    p_rating INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_owner UUID;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Rating must be between 1 and 5');
    END IF;

    SELECT user_id INTO v_owner FROM public.voice_generations WHERE id = p_generation_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Generation not found');
    END IF;

    IF v_owner <> v_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not allowed');
    END IF;

    UPDATE public.voice_generations
    SET rating = p_rating
    WHERE id = p_generation_id;

    RETURN jsonb_build_object('success', true, 'generation_id', p_generation_id, 'rating', p_rating);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rate_generation(UUID, INTEGER) TO authenticated;
