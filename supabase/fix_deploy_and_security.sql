-- ==============================================================================
-- SAWTIFY - CORRECTIONS DÉPLOIEMENT + SÉCURITÉ (Render / Cloudflare Pages)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABLE DES FACTURES (persiste les paiements en attente au lieu de la RAM)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    pack_id TEXT NOT NULL REFERENCES public.credit_packs(id),
    pack_name TEXT NOT NULL,
    amount_dzd NUMERIC(10, 2) NOT NULL,
    points_credited INTEGER NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'slickpay',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'paid', 'failed')),
    payment_url TEXT,
    payload JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_user ON public.invoices(user_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status, created_at DESC);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Le backend (service_role) peut tout faire ; le client ne lit que ses propres factures.
CREATE POLICY "Users can view own invoices"
    ON public.invoices FOR SELECT
    USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 2. POLITIQUE DE MISE À JOUR DU STORAGE PATH (pour l'historique audio)
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can update own generation storage path"
    ON public.voice_generations FOR UPDATE
    USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 3. RPC SERVEUR : DÉBIT + ENREGISTREMENT DE LA GÉNÉRATION (TTS)
--    Réservée au service_role. Évite que le client ne se débite lui-même.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.deduct_and_record_generation_service(
    p_user_id UUID,
    p_amount INTEGER,
    p_voice_id TEXT,
    p_voice_name TEXT,
    p_prompt TEXT,
    p_char_count INTEGER,
    p_duration NUMERIC,
    p_latency INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_current_balance INTEGER;
    v_generation_id UUID;
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
    SET credits_balance = credits_balance - p_amount,
        total_generated_audios = total_generated_audios + 1,
        updated_at = NOW()
    WHERE id = p_user_id;

    INSERT INTO public.voice_generations (
        user_id, voice_id, voice_name, text_prompt, char_count,
        points_deducted, audio_duration_seconds, latency_ms
    ) VALUES (
        p_user_id, p_voice_id, p_voice_name, p_prompt, p_char_count,
        p_amount, p_duration, p_latency
    ) RETURNING id INTO v_generation_id;

    RETURN jsonb_build_object(
        'success', true,
        'generation_id', v_generation_id,
        'remaining_balance', v_current_balance - p_amount
    );
END;
$$;

REVOKE ALL ON FUNCTION public.deduct_and_record_generation_service(UUID, INTEGER, TEXT, TEXT, TEXT, INTEGER, NUMERIC, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_and_record_generation_service(UUID, INTEGER, TEXT, TEXT, TEXT, INTEGER, NUMERIC, INTEGER) TO service_role;

-- ------------------------------------------------------------------------------
-- 4. RPC POUR METTRE À JOUR LE CHEMIN DE STOCKAGE AUDIO (appelé par le front)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_generation_storage_path(
    p_generation_id UUID,
    p_storage_path TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    UPDATE public.voice_generations
    SET audio_storage_path = p_storage_path,
        updated_at = NOW()
    WHERE id = p_generation_id AND user_id = v_user_id;

    IF FOUND THEN
        RETURN jsonb_build_object('success', true);
    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'Generation not found or not owned');
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_generation_storage_path(UUID, TEXT) TO authenticated;
