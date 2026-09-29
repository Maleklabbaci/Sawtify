-- ==============================================================================
-- SAWTIFY - MOTEUR DE CROISSANCE (à coller dans Supabase > SQL Editor > New query)
-- ------------------------------------------------------------------------------
-- Ajoute la mécanique « psychologie d'achat » :
--   1. Offre de première recharge (foot-in-the-door 500 DZD + flash 5 min)
--   2. Cashback moral : +20 % de points sur la recharge suivante (7 jours)
--   3. Parrainage viral : l'ami teste 3 voix -> 50 points chacun
--
-- Sécurité : tout est écrit UNIQUEMENT par le backend (clé service_role).
-- Aucun accès anon/authenticated : impossible de s'auto-offrir des points.
--
-- Le script est ré-exécutable (IF NOT EXISTS / CREATE OR REPLACE).
-- Tant qu'il n'est pas exécuté, l'app fonctionne comme avant : le serveur détecte
-- l'absence des tables et désactive simplement ces offres (aucun prix modifié).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ÉTAT DE CROISSANCE PAR UTILISATEUR
--    - first_offer_started_at : l'horloge de l'offre 1ère recharge est posée par
--      le SERVEUR (pas par le navigateur) => le compte à rebours est réel et ne
--      se réinitialise pas en rechargeant la page.
--    - cashback_* : cashback en attente pour la prochaine recharge.
--    - referral_code : code personnel de parrainage.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_growth (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    first_offer_started_at TIMESTAMPTZ,
    cashback_percent INTEGER NOT NULL DEFAULT 0 CHECK (cashback_percent BETWEEN 0 AND 100),
    cashback_expires_at TIMESTAMPTZ,
    referral_code TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_growth ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_growth FROM anon, authenticated;

-- ------------------------------------------------------------------------------
-- 2. PARRAINAGE
--    Un filleul ne peut avoir qu'un seul parrain (referred_id UNIQUE).
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    referred_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'rewarded')),
    required_generations INTEGER NOT NULL DEFAULT 3,
    reward_points INTEGER NOT NULL DEFAULT 50,
    referrer_reward_points INTEGER NOT NULL DEFAULT 0,
    starter_points INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rewarded_at TIMESTAMPTZ,
    CHECK (referrer_id <> referred_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id, status);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.referrals FROM anon, authenticated;

-- ------------------------------------------------------------------------------
-- 3. CRÉDIT D'UNE RECHARGE AVEC BONUS (atomique, idempotent)
--    Remplace credit_user_balance() pour les paiements SlickPay, sans la toucher.
--    - Le bonus n'est accordé que si la promo est TOUJOURS valable au moment du
--      crédit (1ère recharge réellement jamais payée / cashback pas déjà utilisé).
--      Sinon la recharge est créditée sans bonus : impossible d'empiler des
--      factures ouvertes pour toucher plusieurs fois le même bonus.
--    - Chaque recharge payée (re)pose un cashback pour la suivante : c'est la
--      boucle de rétention.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.credit_user_balance_with_promo(
    p_user_id UUID,
    p_pack_id TEXT,
    p_gateway payment_gateway_type,
    p_gateway_reference TEXT,
    p_amount_dzd NUMERIC,
    p_base_points INTEGER,
    p_bonus_points INTEGER,
    p_promo_type TEXT,
    p_payload JSONB,
    p_cashback_percent INTEGER DEFAULT 20,
    p_cashback_days INTEGER DEFAULT 7
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_balance INTEGER;
    v_prior_paid INTEGER;
    v_bonus INTEGER := 0;
    v_applied TEXT := NULL;
    v_total INTEGER;
    v_cashback_expires TIMESTAMPTZ := NOW() + make_interval(days => GREATEST(p_cashback_days, 1));
BEGIN
    -- Verrou sur le profil : sérialise deux paiements simultanés du même compte.
    SELECT credits_balance INTO v_balance
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;

    -- Idempotence : une même référence de paiement n'est traitée qu'une fois.
    IF EXISTS (
        SELECT 1 FROM public.transactions
        WHERE gateway_reference = p_gateway_reference AND status = 'completed'
    ) THEN
        RETURN jsonb_build_object('success', true, 'already_processed', true);
    END IF;

    -- Validation du bonus demandé.
    IF COALESCE(p_bonus_points, 0) > 0 THEN
        IF p_promo_type IN ('first_recharge_flash', 'first_recharge_entry') THEN
            SELECT COUNT(*) INTO v_prior_paid
            FROM public.transactions
            WHERE user_id = p_user_id AND status = 'completed';

            IF v_prior_paid = 0 THEN
                v_bonus := LEAST(p_bonus_points, p_base_points);
                v_applied := p_promo_type;
            END IF;

        ELSIF p_promo_type = 'cashback' THEN
            -- Consommation atomique : un cashback ne sert qu'une fois.
            UPDATE public.user_growth
            SET cashback_percent = 0, cashback_expires_at = NULL, updated_at = NOW()
            WHERE user_id = p_user_id AND cashback_percent > 0;

            IF FOUND THEN
                v_bonus := LEAST(p_bonus_points, p_base_points);
                v_applied := 'cashback';
            END IF;
        END IF;
    END IF;

    v_total := p_base_points + v_bonus;

    UPDATE public.profiles
    SET credits_balance = credits_balance + v_total,
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING credits_balance INTO v_balance;

    INSERT INTO public.transactions (
        user_id, pack_id, gateway, gateway_reference,
        amount_dzd, points_credited, status, webhook_payload
    ) VALUES (
        p_user_id, p_pack_id, p_gateway, p_gateway_reference,
        p_amount_dzd, v_total, 'completed',
        COALESCE(p_payload, '{}'::jsonb) || jsonb_build_object(
            'base_points', p_base_points,
            'bonus_points', v_bonus,
            'promo', v_applied
        )
    );

    -- Boucle de rétention : chaque recharge payée offre un nouveau cashback.
    IF COALESCE(p_cashback_percent, 0) > 0 THEN
        INSERT INTO public.user_growth (user_id, cashback_percent, cashback_expires_at)
        VALUES (p_user_id, LEAST(p_cashback_percent, 100), v_cashback_expires)
        ON CONFLICT (user_id) DO UPDATE
        SET cashback_percent = EXCLUDED.cashback_percent,
            cashback_expires_at = EXCLUDED.cashback_expires_at,
            updated_at = NOW();
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'new_balance', v_balance,
        'points_credited', v_total,
        'base_points', p_base_points,
        'bonus_points', v_bonus,
        'promo_applied', v_applied,
        'cashback_percent', CASE WHEN COALESCE(p_cashback_percent, 0) > 0 THEN LEAST(p_cashback_percent, 100) ELSE 0 END,
        'cashback_expires_at', CASE WHEN COALESCE(p_cashback_percent, 0) > 0 THEN v_cashback_expires ELSE NULL END
    );
END;
$$;

REVOKE ALL ON FUNCTION public.credit_user_balance_with_promo(
    UUID, TEXT, payment_gateway_type, TEXT, NUMERIC, INTEGER, INTEGER, TEXT, JSONB, INTEGER, INTEGER
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_user_balance_with_promo(
    UUID, TEXT, payment_gateway_type, TEXT, NUMERIC, INTEGER, INTEGER, TEXT, JSONB, INTEGER, INTEGER
) TO service_role;

-- ------------------------------------------------------------------------------
-- 4. PARRAINAGE : ENREGISTREMENT DU FILLEUL (atomique)
--    Garde-fous : pas d'auto-parrainage, compte récent et vierge, un seul
--    parrain par filleul, pas de parrainage croisé A<->B.
--    p_starter_points : petit complément offert au filleul pour que les 3 essais
--    soient possibles (50 points de bienvenue = 2 générations de 20 points).
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_referral(
    p_referred_id UUID,
    p_code TEXT,
    p_required_generations INTEGER,
    p_reward_points INTEGER,
    p_starter_points INTEGER DEFAULT 0,
    p_max_account_age_days INTEGER DEFAULT 3
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_referrer UUID;
    v_created TIMESTAMPTZ;
    v_generated INTEGER;
    v_starter INTEGER := GREATEST(COALESCE(p_starter_points, 0), 0);
BEGIN
    SELECT user_id INTO v_referrer
    FROM public.user_growth
    WHERE referral_code = upper(trim(p_code));

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'reason', 'unknown_code');
    END IF;

    IF v_referrer = p_referred_id THEN
        RETURN jsonb_build_object('success', false, 'reason', 'self_referral');
    END IF;

    SELECT created_at, total_generated_audios INTO v_created, v_generated
    FROM public.profiles
    WHERE id = p_referred_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'reason', 'no_profile');
    END IF;

    IF v_created < NOW() - make_interval(days => GREATEST(p_max_account_age_days, 1)) THEN
        RETURN jsonb_build_object('success', false, 'reason', 'account_too_old');
    END IF;

    IF COALESCE(v_generated, 0) > 0 OR EXISTS (
        SELECT 1 FROM public.transactions WHERE user_id = p_referred_id AND status = 'completed'
    ) THEN
        RETURN jsonb_build_object('success', false, 'reason', 'not_a_new_user');
    END IF;

    IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_id = p_referred_id) THEN
        RETURN jsonb_build_object('success', false, 'reason', 'already_referred');
    END IF;

    -- Anti-cycle : si mon futur parrain a été parrainé par moi, on refuse.
    IF EXISTS (
        SELECT 1 FROM public.referrals
        WHERE referrer_id = p_referred_id AND referred_id = v_referrer
    ) THEN
        RETURN jsonb_build_object('success', false, 'reason', 'cyclic_referral');
    END IF;

    INSERT INTO public.referrals (
        referrer_id, referred_id, code, required_generations, reward_points, starter_points
    ) VALUES (
        v_referrer, p_referred_id, upper(trim(p_code)),
        GREATEST(p_required_generations, 1), GREATEST(p_reward_points, 0), v_starter
    );

    IF v_starter > 0 THEN
        UPDATE public.profiles
        SET credits_balance = credits_balance + v_starter, updated_at = NOW()
        WHERE id = p_referred_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'referrer_id', v_referrer,
        'starter_points', v_starter,
        'required_generations', GREATEST(p_required_generations, 1),
        'reward_points', GREATEST(p_reward_points, 0)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_referral(UUID, TEXT, INTEGER, INTEGER, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_referral(UUID, TEXT, INTEGER, INTEGER, INTEGER, INTEGER) TO service_role;

-- ------------------------------------------------------------------------------
-- 5. PARRAINAGE : RÉCOMPENSE (appelée après chaque génération réussie du filleul)
--    Quand le filleul atteint le nombre d'essais requis, le parrain ET le
--    filleul reçoivent les points, une seule fois. Plafond par parrain pour
--    éviter la ferme à comptes (au-delà, seul le filleul est récompensé).
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.award_referral_if_ready(
    p_referred_id UUID,
    p_max_rewarded_per_referrer INTEGER DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    r public.referrals%ROWTYPE;
    v_done INTEGER;
    v_rewarded INTEGER;
    v_referrer_reward INTEGER;
    v_referred_balance INTEGER;
BEGIN
    SELECT * INTO r
    FROM public.referrals
    WHERE referred_id = p_referred_id AND status = 'pending'
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('awarded', false, 'reason', 'no_pending_referral');
    END IF;

    SELECT COUNT(*) INTO v_done
    FROM public.voice_generations
    WHERE user_id = p_referred_id AND status = 'completed' AND created_at >= r.created_at;

    IF v_done < r.required_generations THEN
        RETURN jsonb_build_object(
            'awarded', false, 'reason', 'not_ready',
            'done', v_done, 'required', r.required_generations
        );
    END IF;

    SELECT COUNT(*) INTO v_rewarded
    FROM public.referrals
    WHERE referrer_id = r.referrer_id AND status = 'rewarded';

    v_referrer_reward := CASE
        WHEN v_rewarded >= GREATEST(p_max_rewarded_per_referrer, 0) THEN 0
        ELSE r.reward_points
    END;

    -- Filleul : +points.
    UPDATE public.profiles
    SET credits_balance = credits_balance + r.reward_points, updated_at = NOW()
    WHERE id = r.referred_id
    RETURNING credits_balance INTO v_referred_balance;

    -- Parrain : +points (si plafond non atteint).
    IF v_referrer_reward > 0 THEN
        UPDATE public.profiles
        SET credits_balance = credits_balance + v_referrer_reward, updated_at = NOW()
        WHERE id = r.referrer_id;
    END IF;

    UPDATE public.referrals
    SET status = 'rewarded',
        rewarded_at = NOW(),
        referrer_reward_points = v_referrer_reward
    WHERE id = r.id;

    RETURN jsonb_build_object(
        'awarded', true,
        'referrer_id', r.referrer_id,
        'referred_id', r.referred_id,
        'reward_points', r.reward_points,
        'referrer_reward_points', v_referrer_reward,
        'referred_new_balance', v_referred_balance
    );
END;
$$;

REVOKE ALL ON FUNCTION public.award_referral_if_ready(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_referral_if_ready(UUID, INTEGER) TO service_role;

-- Recharge le cache du schéma PostgREST pour que l'API voie les nouvelles tables/fonctions.
NOTIFY pgrst, 'reload schema';
