-- Agent Sawtify : paiements SlickPay, portefeuille de secondes et attribution idempotente.
-- À exécuter une fois sur le projet Supabase avant d'activer les achats Agent en production.

CREATE TABLE IF NOT EXISTS public.agent_sawtify_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id TEXT UNIQUE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  offer_id TEXT NOT NULL,
  offer_kind TEXT NOT NULL CHECK (offer_kind IN ('subscription', 'topup')),
  offer_name TEXT NOT NULL,
  minutes INTEGER NOT NULL CHECK (minutes > 0),
  amount_dzd NUMERIC(10, 2) NOT NULL CHECK (amount_dzd > 0),
  payment_method TEXT NOT NULL DEFAULT 'slickpay',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  payment_url TEXT,
  gateway_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_sawtify_payments_user_created
  ON public.agent_sawtify_payments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_sawtify_payments_status_created
  ON public.agent_sawtify_payments(status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.agent_sawtify_wallets (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id TEXT,
  plan_minutes_remaining INTEGER NOT NULL DEFAULT 0 CHECK (plan_minutes_remaining >= 0),
  topup_minutes_remaining INTEGER NOT NULL DEFAULT 0 CHECK (topup_minutes_remaining >= 0),
  plan_seconds_remaining BIGINT NOT NULL DEFAULT 0 CHECK (plan_seconds_remaining >= 0),
  topup_seconds_remaining BIGINT NOT NULL DEFAULT 0 CHECK (topup_seconds_remaining >= 0),
  plan_seconds_purchased BIGINT NOT NULL DEFAULT 0 CHECK (plan_seconds_purchased >= 0),
  topup_seconds_purchased BIGINT NOT NULL DEFAULT 0 CHECK (topup_seconds_purchased >= 0),
  plan_expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Compatibilité si la première version de cette migration a déjà été appliquée.
ALTER TABLE public.agent_sawtify_wallets
  ADD COLUMN IF NOT EXISTS plan_seconds_remaining BIGINT NOT NULL DEFAULT 0 CHECK (plan_seconds_remaining >= 0),
  ADD COLUMN IF NOT EXISTS topup_seconds_remaining BIGINT NOT NULL DEFAULT 0 CHECK (topup_seconds_remaining >= 0),
  ADD COLUMN IF NOT EXISTS plan_seconds_purchased BIGINT NOT NULL DEFAULT 0 CHECK (plan_seconds_purchased >= 0),
  ADD COLUMN IF NOT EXISTS topup_seconds_purchased BIGINT NOT NULL DEFAULT 0 CHECK (topup_seconds_purchased >= 0);

-- Les soldes minute existants sont convertis en secondes une seule fois.
UPDATE public.agent_sawtify_wallets
SET plan_seconds_remaining = plan_minutes_remaining::BIGINT * 60
WHERE plan_seconds_remaining = 0 AND plan_minutes_remaining > 0;
UPDATE public.agent_sawtify_wallets
SET topup_seconds_remaining = topup_minutes_remaining::BIGINT * 60
WHERE topup_seconds_remaining = 0 AND topup_minutes_remaining > 0;
UPDATE public.agent_sawtify_wallets
SET plan_seconds_purchased = GREATEST(plan_seconds_purchased, plan_seconds_remaining)
WHERE plan_seconds_remaining > plan_seconds_purchased;
UPDATE public.agent_sawtify_wallets
SET topup_seconds_purchased = GREATEST(topup_seconds_purchased, topup_seconds_remaining)
WHERE topup_seconds_remaining > topup_seconds_purchased;

ALTER TABLE public.agent_sawtify_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_sawtify_wallets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.agent_sawtify_payments FROM anon, authenticated;
REVOKE ALL ON public.agent_sawtify_wallets FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.agent_sawtify_payments TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.agent_sawtify_wallets TO service_role;

-- Le serveur vérifie le paiement auprès de SlickPay, puis appelle cette fonction.
-- Le verrou sur la ligne du paiement protège contre les doubles webhooks / polls.
CREATE OR REPLACE FUNCTION public.complete_agent_sawtify_payment(p_invoice_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_payment public.agent_sawtify_payments%ROWTYPE;
  v_wallet public.agent_sawtify_wallets%ROWTYPE;
  v_expires_at TIMESTAMPTZ;
  v_seconds BIGINT;
BEGIN
  SELECT * INTO v_payment
  FROM public.agent_sawtify_payments
  WHERE invoice_id = p_invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'payment_not_found');
  END IF;

  IF v_payment.status = 'completed' THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_processed', true,
      'minutes', v_payment.minutes,
      'credited_seconds', v_payment.minutes::BIGINT * 60,
      'offer_id', v_payment.offer_id,
      'offer_kind', v_payment.offer_kind
    );
  END IF;

  IF v_payment.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'payment_not_pending');
  END IF;

  v_seconds := v_payment.minutes::BIGINT * 60;

  IF v_payment.offer_kind = 'subscription' THEN
    SELECT * INTO v_wallet
    FROM public.agent_sawtify_wallets
    WHERE user_id = v_payment.user_id
    FOR UPDATE;

    IF FOUND AND v_wallet.plan_expires_at > NOW() THEN
      v_expires_at := v_wallet.plan_expires_at + INTERVAL '30 days';
    ELSE
      v_expires_at := NOW() + INTERVAL '30 days';
    END IF;

    INSERT INTO public.agent_sawtify_wallets AS wallet (
      user_id, plan_id, plan_minutes_remaining, topup_minutes_remaining,
      plan_seconds_remaining, topup_seconds_remaining,
      plan_seconds_purchased, topup_seconds_purchased,
      plan_expires_at, updated_at
    ) VALUES (
      v_payment.user_id, v_payment.offer_id, v_payment.minutes, 0,
      v_seconds, 0, v_seconds, 0, v_expires_at, NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      plan_id = EXCLUDED.plan_id,
      plan_seconds_remaining = CASE
        WHEN wallet.plan_expires_at > NOW()
          THEN wallet.plan_seconds_remaining + EXCLUDED.plan_seconds_remaining
        ELSE EXCLUDED.plan_seconds_remaining
      END,
      plan_seconds_purchased = CASE
        WHEN wallet.plan_expires_at > NOW()
          THEN wallet.plan_seconds_purchased + EXCLUDED.plan_seconds_purchased
        ELSE EXCLUDED.plan_seconds_purchased
      END,
      plan_minutes_remaining = CEIL((CASE
        WHEN wallet.plan_expires_at > NOW()
          THEN wallet.plan_seconds_remaining + EXCLUDED.plan_seconds_remaining
        ELSE EXCLUDED.plan_seconds_remaining
      END)::NUMERIC / 60)::INTEGER,
      plan_expires_at = EXCLUDED.plan_expires_at,
      updated_at = NOW();
  ELSE
    INSERT INTO public.agent_sawtify_wallets AS wallet (
      user_id, topup_minutes_remaining, topup_seconds_remaining,
      topup_seconds_purchased, updated_at
    ) VALUES (
      v_payment.user_id, v_payment.minutes, v_seconds, v_seconds, NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      topup_seconds_remaining = wallet.topup_seconds_remaining + EXCLUDED.topup_seconds_remaining,
      topup_seconds_purchased = wallet.topup_seconds_purchased + EXCLUDED.topup_seconds_purchased,
      topup_minutes_remaining = CEIL((wallet.topup_seconds_remaining + EXCLUDED.topup_seconds_remaining)::NUMERIC / 60)::INTEGER,
      updated_at = NOW();
  END IF;

  UPDATE public.agent_sawtify_payments
  SET status = 'completed', paid_at = NOW(), updated_at = NOW()
  WHERE id = v_payment.id;

  RETURN jsonb_build_object(
    'success', true,
    'minutes', v_payment.minutes,
    'credited_seconds', v_seconds,
    'offer_id', v_payment.offer_id,
    'offer_kind', v_payment.offer_kind
  );
END;
$$;

-- Débit atomique, à appeler depuis le serveur de conversation pour chaque durée réellement consommée.
-- Les secondes du forfait expirent avec celui-ci ; les recharges restent disponibles après expiration.
CREATE OR REPLACE FUNCTION public.consume_agent_sawtify_seconds(p_user_id UUID, p_seconds INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_wallet public.agent_sawtify_wallets%ROWTYPE;
  v_plan_active BOOLEAN;
  v_plan_remaining BIGINT;
  v_topup_remaining BIGINT;
  v_plan_used BIGINT;
  v_topup_used BIGINT;
  v_remaining BIGINT;
  v_purchased BIGINT;
  v_progress NUMERIC;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  IF p_user_id IS NULL OR p_seconds IS NULL OR p_seconds < 1 OR p_seconds > 3600 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_seconds');
  END IF;

  SELECT * INTO v_wallet
  FROM public.agent_sawtify_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'wallet_not_found', 'remaining_seconds', 0);
  END IF;

  v_plan_active := v_wallet.plan_expires_at IS NOT NULL AND v_wallet.plan_expires_at > v_now;
  v_plan_remaining := CASE WHEN v_plan_active THEN v_wallet.plan_seconds_remaining ELSE 0 END;
  v_topup_remaining := v_wallet.topup_seconds_remaining;
  v_remaining := v_plan_remaining + v_topup_remaining;
  v_purchased := (CASE WHEN v_plan_active THEN v_wallet.plan_seconds_purchased ELSE 0 END) + v_wallet.topup_seconds_purchased;

  IF v_remaining < p_seconds THEN
    IF NOT v_plan_active AND v_wallet.plan_seconds_remaining > 0 THEN
      UPDATE public.agent_sawtify_wallets
      SET plan_seconds_remaining = 0, plan_seconds_purchased = 0,
          plan_minutes_remaining = 0, updated_at = v_now
      WHERE user_id = p_user_id;
    END IF;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'insufficient_minutes',
      'remaining_seconds', v_remaining,
      'remaining_minutes_exact', v_remaining::NUMERIC / 60,
      'purchased_seconds', v_purchased,
      'progress_percent', CASE WHEN v_purchased > 0 THEN ROUND(v_remaining::NUMERIC * 100 / v_purchased, 2) ELSE 0 END,
      'low_balance', v_purchased > 0 AND (v_remaining <= 600 OR v_remaining::NUMERIC / v_purchased <= 0.15)
    );
  END IF;

  v_plan_used := LEAST(v_plan_remaining, p_seconds::BIGINT);
  v_topup_used := p_seconds::BIGINT - v_plan_used;
  v_plan_remaining := v_plan_remaining - v_plan_used;
  v_topup_remaining := v_topup_remaining - v_topup_used;
  v_remaining := v_plan_remaining + v_topup_remaining;
  v_purchased := (CASE WHEN v_plan_active THEN v_wallet.plan_seconds_purchased ELSE 0 END) + v_wallet.topup_seconds_purchased;
  v_progress := CASE WHEN v_purchased > 0 THEN ROUND(v_remaining::NUMERIC * 100 / v_purchased, 2) ELSE 0 END;

  UPDATE public.agent_sawtify_wallets
  SET plan_seconds_remaining = v_plan_remaining,
      topup_seconds_remaining = v_topup_remaining,
      plan_seconds_purchased = CASE WHEN v_plan_active THEN plan_seconds_purchased ELSE 0 END,
      plan_minutes_remaining = CEIL(v_plan_remaining::NUMERIC / 60)::INTEGER,
      topup_minutes_remaining = CEIL(v_topup_remaining::NUMERIC / 60)::INTEGER,
      updated_at = v_now
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'consumed_seconds', p_seconds,
    'plan_seconds_remaining', v_plan_remaining,
    'topup_seconds_remaining', v_topup_remaining,
    'remaining_seconds', v_remaining,
    'remaining_minutes_exact', v_remaining::NUMERIC / 60,
    'purchased_seconds', v_purchased,
    'progress_percent', v_progress,
    'low_balance', v_purchased > 0 AND (v_remaining <= 600 OR v_remaining::NUMERIC / v_purchased <= 0.15)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_agent_sawtify_payment(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_agent_sawtify_payment(TEXT) TO service_role;
REVOKE ALL ON FUNCTION public.consume_agent_sawtify_seconds(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_agent_sawtify_seconds(UUID, INTEGER) TO service_role;
