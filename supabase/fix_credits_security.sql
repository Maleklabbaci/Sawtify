-- ==============================================================================
-- SAWTIFY - MIGRATION DE CORRECTION (à coller dans Supabase > SQL Editor > New query)
-- ------------------------------------------------------------------------------
-- Ce que ça corrige :
-- 1) deduct_user_credits() faisait confiance à un p_user_id envoyé par le client.
--    N'importe quel utilisateur connecté aurait pu appeler cette fonction avec
--    l'UUID de quelqu'un d'autre et vider son solde. On la fait maintenant
--    dépendre uniquement de auth.uid() (l'utilisateur réellement authentifié).
-- 2) credit_user_balance() (crédite des points après paiement) était appelable
--    par n'importe quel utilisateur connecté depuis le navigateur -> un attaquant
--    aurait pu s'auto-créditer des points gratuits sans payer. Elle ne doit être
--    exécutée QUE par ton backend (clé service_role), jamais depuis le client.
-- ==============================================================================

-- 1. Supprime l'ancienne fonction (signature avec p_user_id fourni par le client)
DROP FUNCTION IF EXISTS public.deduct_user_credits(
    UUID, INTEGER, TEXT, TEXT, TEXT, INTEGER, NUMERIC, INTEGER, TEXT
);

-- Recrée la fonction : l'utilisateur est déduit de sa propre session (auth.uid()),
-- plus aucun paramètre p_user_id n'est accepté depuis le client.
CREATE OR REPLACE FUNCTION public.deduct_user_credits(
    p_amount INTEGER,
    p_voice_id TEXT,
    p_voice_name TEXT,
    p_prompt TEXT,
    p_char_count INTEGER,
    p_duration NUMERIC,
    p_latency INTEGER,
    p_storage_path TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_current_balance INTEGER;
    v_generation_id UUID;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    -- Verrou exclusif sur la ligne du profil pour éviter les doubles dépenses
    -- en cas de générations simultanées.
    SELECT credits_balance INTO v_current_balance
    FROM public.profiles
    WHERE id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;

    IF v_current_balance < p_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient credits balance', 'balance', v_current_balance);
    END IF;

    UPDATE public.profiles
    SET
        credits_balance = credits_balance - p_amount,
        total_generated_audios = total_generated_audios + 1,
        updated_at = NOW()
    WHERE id = v_user_id;

    INSERT INTO public.voice_generations (
        user_id, voice_id, voice_name, text_prompt, char_count,
        points_deducted, audio_storage_path, audio_duration_seconds, latency_ms
    ) VALUES (
        v_user_id, p_voice_id, p_voice_name, p_prompt, p_char_count,
        p_amount, p_storage_path, p_duration, p_latency
    ) RETURNING id INTO v_generation_id;

    RETURN jsonb_build_object(
        'success', true,
        'generation_id', v_generation_id,
        'remaining_balance', v_current_balance - p_amount
    );
END;
$$;

-- Seuls les utilisateurs connectés peuvent l'appeler (elle s'auto-restreint via auth.uid()).
GRANT EXECUTE ON FUNCTION public.deduct_user_credits(
    INTEGER, TEXT, TEXT, TEXT, INTEGER, NUMERIC, INTEGER, TEXT
) TO authenticated;


-- 2. Verrouille credit_user_balance() : uniquement ton backend (service_role) doit
--    pouvoir l'exécuter, jamais le navigateur d'un utilisateur.
REVOKE EXECUTE ON FUNCTION public.credit_user_balance(
    UUID, TEXT, payment_gateway_type, TEXT, NUMERIC, INTEGER, JSONB
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.credit_user_balance(
    UUID, TEXT, payment_gateway_type, TEXT, NUMERIC, INTEGER, JSONB
) TO service_role;

-- Durcissement du search_path (bonne pratique pour toute fonction SECURITY DEFINER)
ALTER FUNCTION public.credit_user_balance(
    UUID, TEXT, payment_gateway_type, TEXT, NUMERIC, INTEGER, JSONB
) SET search_path = public, pg_temp;

-- ==============================================================================
-- Après avoir exécuté ce script :
--  - Le studio (génération vocale) peut appeler supabase.rpc('deduct_user_credits', {...})
--    directement depuis le front (voir supabaseClient.ts / App.tsx mis à jour).
--  - credit_user_balance ne doit être appelée QUE depuis ton serveur (server.ts) avec
--    la clé SUPABASE_SERVICE_ROLE_KEY, après confirmation réelle du paiement SlickPay.
--    (Ce flux de paiement n'est pas encore branché sur cette table — voir la note
--    séparée à ce sujet.)
-- ==============================================================================
