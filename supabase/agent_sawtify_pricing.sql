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
    'plan_seconds_used', v_plan_used,
    'topup_seconds_used', v_topup_used,
    'low_balance', v_purchased > 0 AND (v_remaining <= 600 OR v_remaining::NUMERIC / v_purchased <= 0.15)
  );
END;
$$;

-- Les boutiques sont privées à leur propriétaire; seule leur page de partage est publique via le serveur.
CREATE TABLE IF NOT EXISTS public.agent_sawtify_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) <= 60),
  store_data JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(store_data) = 'object'),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.agent_sawtify_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL UNIQUE,
  store_id UUID NOT NULL REFERENCES public.agent_sawtify_stores(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  wilaya TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  size TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  amount_dzd NUMERIC(12, 2) NOT NULL CHECK (amount_dzd >= 0),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'confirmed', 'delivered')),
  request_type TEXT NOT NULL DEFAULT 'order',
  details TEXT NOT NULL DEFAULT '',
  preferred_at TIMESTAMPTZ,
  preferred_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ajout rétrocompatible pour les installations ayant déjà la table de commandes.
ALTER TABLE public.agent_sawtify_orders ADD COLUMN IF NOT EXISTS request_type TEXT NOT NULL DEFAULT 'order';
ALTER TABLE public.agent_sawtify_orders ADD COLUMN IF NOT EXISTS details TEXT NOT NULL DEFAULT '';
ALTER TABLE public.agent_sawtify_orders ADD COLUMN IF NOT EXISTS preferred_at TIMESTAMPTZ;
ALTER TABLE public.agent_sawtify_orders ADD COLUMN IF NOT EXISTS preferred_until TIMESTAMPTZ;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'agent_sawtify_orders_request_type_check'
      AND conrelid = 'public.agent_sawtify_orders'::regclass
  ) THEN
    ALTER TABLE public.agent_sawtify_orders
      ADD CONSTRAINT agent_sawtify_orders_request_type_check
      CHECK (request_type IN ('order', 'appointment', 'quote', 'reservation', 'room_service'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_agent_sawtify_orders_owner_created
  ON public.agent_sawtify_orders(owner_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_sawtify_orders_store_created
  ON public.agent_sawtify_orders(store_id, created_at DESC);

-- Pas de transcription ni de données personnelles de conversation : seuls les volumes et secondes estimées sont conservés.
CREATE TABLE IF NOT EXISTS public.agent_sawtify_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL UNIQUE,
  owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.agent_sawtify_stores(id) ON DELETE CASCADE,
  store_slug TEXT NOT NULL,
  input_characters INTEGER NOT NULL CHECK (input_characters >= 0),
  output_characters INTEGER NOT NULL CHECK (output_characters >= 0),
  billable_seconds INTEGER NOT NULL CHECK (billable_seconds > 0),
  plan_seconds_used INTEGER NOT NULL DEFAULT 0 CHECK (plan_seconds_used >= 0),
  topup_seconds_used INTEGER NOT NULL DEFAULT 0 CHECK (topup_seconds_used >= 0),
  remaining_seconds_after BIGINT NOT NULL DEFAULT 0 CHECK (remaining_seconds_after >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_sawtify_usage_owner_created
  ON public.agent_sawtify_usage_events(owner_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_sawtify_usage_store_created
  ON public.agent_sawtify_usage_events(store_id, created_at DESC);

ALTER TABLE public.agent_sawtify_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_sawtify_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_sawtify_usage_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.agent_sawtify_stores, public.agent_sawtify_orders, public.agent_sawtify_usage_events FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_sawtify_stores, public.agent_sawtify_orders TO service_role;
GRANT SELECT, INSERT ON public.agent_sawtify_usage_events TO service_role;

-- Création d'une demande côté serveur et décrément du stock sous verrou : pas de survente concurrente.
CREATE OR REPLACE FUNCTION public.create_agent_sawtify_order(
  p_store_id UUID,
  p_request_id UUID,
  p_customer_name TEXT,
  p_phone TEXT,
  p_wilaya TEXT,
  p_product_id TEXT,
  p_size TEXT,
  p_quantity INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_store public.agent_sawtify_stores%ROWTYPE;
  v_order public.agent_sawtify_orders%ROWTYPE;
  v_products JSONB;
  v_updated_products JSONB;
  v_product JSONB;
  v_stock INTEGER;
  v_price NUMERIC(12, 2);
BEGIN
  IF p_store_id IS NULL OR p_request_id IS NULL OR p_quantity IS NULL OR p_quantity < 1 OR p_quantity > 100 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_order');
  END IF;

  SELECT * INTO v_order
  FROM public.agent_sawtify_orders
  WHERE request_id = p_request_id AND store_id = p_store_id;
  IF FOUND THEN
    SELECT * INTO v_store FROM public.agent_sawtify_stores WHERE id = p_store_id;
    IF v_store.id IS NOT NULL AND jsonb_typeof(v_store.store_data->'products') = 'array' THEN
      SELECT COALESCE(NULLIF(item.value->>'stock', '')::INTEGER, 0) INTO v_stock
      FROM jsonb_array_elements(v_store.store_data->'products') AS item(value)
      WHERE item.value->>'id' = v_order.product_id;
    END IF;
    RETURN jsonb_build_object('success', true, 'already_processed', true, 'order', to_jsonb(v_order), 'product_stock_remaining', v_stock);
  END IF;
  IF EXISTS (SELECT 1 FROM public.agent_sawtify_orders WHERE request_id = p_request_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_request_id');
  END IF;

  SELECT * INTO v_store
  FROM public.agent_sawtify_stores
  WHERE id = p_store_id AND is_active = TRUE
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'store_unavailable');
  END IF;

  v_products := v_store.store_data->'products';
  IF jsonb_typeof(v_products) <> 'array' THEN
    RETURN jsonb_build_object('success', false, 'error', 'catalog_unavailable');
  END IF;

  SELECT item.value INTO v_product
  FROM jsonb_array_elements(v_products) AS item(value)
  WHERE item.value->>'id' = p_product_id;
  IF NOT FOUND OR COALESCE((v_product->>'active')::BOOLEAN, FALSE) IS NOT TRUE THEN
    RETURN jsonb_build_object('success', false, 'error', 'product_unavailable');
  END IF;

  v_stock := COALESCE(NULLIF(v_product->>'stock', '')::INTEGER, 0);
  v_price := COALESCE(NULLIF(v_product->>'priceDzd', '')::NUMERIC, 0);
  IF v_stock < p_quantity THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_stock', 'available_stock', v_stock);
  END IF;
  IF COALESCE(jsonb_typeof(v_product->'sizes'), 'null') = 'array'
     AND jsonb_array_length(v_product->'sizes') > 0
     AND NOT EXISTS (
       SELECT 1 FROM jsonb_array_elements_text(v_product->'sizes') AS size(value)
       WHERE size.value = COALESCE(p_size, '')
     ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_size');
  END IF;

  SELECT COALESCE(jsonb_agg(
    CASE WHEN item.value->>'id' = p_product_id
      THEN jsonb_set(item.value, '{stock}', to_jsonb(v_stock - p_quantity), TRUE)
      ELSE item.value
    END
  ), '[]'::jsonb)
  INTO v_updated_products
  FROM jsonb_array_elements(v_products) AS item(value);

  UPDATE public.agent_sawtify_stores
  SET store_data = jsonb_set(v_store.store_data, '{products}', v_updated_products, TRUE), updated_at = NOW()
  WHERE id = v_store.id;

  INSERT INTO public.agent_sawtify_orders (
    request_id, store_id, owner_user_id, customer_name, phone, wilaya,
    product_id, product_name, size, quantity, amount_dzd, status
  ) VALUES (
    p_request_id, v_store.id, v_store.owner_user_id,
    btrim(p_customer_name), btrim(p_phone), btrim(p_wilaya),
    p_product_id, COALESCE(v_product->>'name', 'Produit'), COALESCE(p_size, ''),
    p_quantity, v_price * p_quantity, 'new'
  ) RETURNING * INTO v_order;

  RETURN jsonb_build_object(
    'success', true,
    'order', to_jsonb(v_order),
    'product_stock_remaining', v_stock - p_quantity
  );
END;
$$;

-- Enregistre des rendez-vous, devis et réservations sans les traiter comme des commandes de stock.
DROP FUNCTION IF EXISTS public.create_agent_sawtify_request(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION public.create_agent_sawtify_request(
  p_store_id UUID,
  p_request_id UUID,
  p_customer_name TEXT,
  p_phone TEXT,
  p_wilaya TEXT,
  p_request_type TEXT,
  p_request_title TEXT,
  p_details TEXT,
  p_preferred_at TIMESTAMPTZ,
  p_preferred_until TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_store public.agent_sawtify_stores%ROWTYPE;
  v_order public.agent_sawtify_orders%ROWTYPE;
  v_sector TEXT;
BEGIN
  IF p_store_id IS NULL OR p_request_id IS NULL
     OR char_length(btrim(COALESCE(p_customer_name, ''))) < 2
     OR char_length(COALESCE(p_customer_name, '')) > 80
     OR char_length(COALESCE(p_phone, '')) < 7 OR char_length(COALESCE(p_phone, '')) > 24
     OR char_length(btrim(COALESCE(p_wilaya, ''))) < 1
     OR char_length(COALESCE(p_wilaya, '')) > 50
     OR p_request_type NOT IN ('appointment', 'quote', 'reservation', 'room_service')
     OR char_length(btrim(COALESCE(p_request_title, ''))) < 1
     OR char_length(COALESCE(p_request_title, '')) > 120
     OR char_length(COALESCE(p_details, '')) > 500
     OR (p_preferred_until IS NOT NULL AND (p_preferred_at IS NULL OR p_preferred_until <= p_preferred_at)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_request');
  END IF;

  SELECT * INTO v_order
  FROM public.agent_sawtify_orders
  WHERE request_id = p_request_id AND store_id = p_store_id;
  IF FOUND THEN
    RETURN jsonb_build_object('success', true, 'already_processed', true, 'order', to_jsonb(v_order), 'product_stock_remaining', NULL);
  END IF;
  IF EXISTS (SELECT 1 FROM public.agent_sawtify_orders WHERE request_id = p_request_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_request_id');
  END IF;

  SELECT * INTO v_store
  FROM public.agent_sawtify_stores
  WHERE id = p_store_id AND is_active = TRUE
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'store_unavailable');
  END IF;

  v_sector := COALESCE(v_store.store_data->>'sector', 'commerce');
  IF NOT (
    (v_sector = 'health' AND p_request_type = 'appointment') OR
    (v_sector = 'services' AND p_request_type IN ('appointment', 'quote')) OR
    (v_sector = 'restaurant' AND p_request_type = 'reservation') OR
    (v_sector = 'hospitality' AND p_request_type IN ('reservation', 'room_service'))
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_request_type');
  END IF;
  IF v_sector = 'hospitality' AND p_request_type = 'reservation'
     AND (p_preferred_at IS NULL OR p_preferred_until IS NULL OR p_preferred_until <= p_preferred_at) THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_stay_dates');
  END IF;
  IF v_sector = 'health' AND char_length(btrim(COALESCE(p_details, ''))) > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'medical_details_not_allowed');
  END IF;

  INSERT INTO public.agent_sawtify_orders (
    request_id, store_id, owner_user_id, customer_name, phone, wilaya,
    product_id, product_name, size, quantity, amount_dzd, status,
    request_type, details, preferred_at, preferred_until
  ) VALUES (
    p_request_id, v_store.id, v_store.owner_user_id, btrim(p_customer_name),
    btrim(p_phone), btrim(p_wilaya), 'request-' || p_request_type,
    btrim(p_request_title), '', 1, 0, 'new', p_request_type,
    btrim(COALESCE(p_details, '')), p_preferred_at, p_preferred_until
  ) RETURNING * INTO v_order;

  RETURN jsonb_build_object('success', true, 'order', to_jsonb(v_order), 'product_stock_remaining', NULL);
END;
$$;

-- Suppression atomique d'une demande du propriétaire. Le stock n'est restitué
-- que pour une commande non livrée, et uniquement si le produit existe encore.
CREATE OR REPLACE FUNCTION public.delete_agent_sawtify_order(
  p_owner_user_id UUID,
  p_order_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order public.agent_sawtify_orders%ROWTYPE;
  v_store public.agent_sawtify_stores%ROWTYPE;
  v_products JSONB;
  v_product JSONB;
  v_updated_products JSONB;
  v_stock INTEGER;
  v_stock_remaining INTEGER;
  v_stock_restored BOOLEAN := FALSE;
BEGIN
  IF p_owner_user_id IS NULL OR p_order_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_order');
  END IF;

  SELECT * INTO v_order
  FROM public.agent_sawtify_orders
  WHERE id = p_order_id AND owner_user_id = p_owner_user_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'order_not_found');
  END IF;

  IF COALESCE(v_order.request_type, 'order') = 'order' AND v_order.status <> 'delivered' THEN
    SELECT * INTO v_store
    FROM public.agent_sawtify_stores
    WHERE id = v_order.store_id AND owner_user_id = p_owner_user_id
    FOR UPDATE;

    IF FOUND AND jsonb_typeof(v_store.store_data->'products') = 'array' THEN
      v_products := v_store.store_data->'products';
      SELECT item.value INTO v_product
      FROM jsonb_array_elements(v_products) AS item(value)
      WHERE item.value->>'id' = v_order.product_id;

      IF FOUND THEN
        v_stock := COALESCE(NULLIF(v_product->>'stock', '')::INTEGER, 0);
        v_stock_remaining := LEAST(1000000, v_stock + v_order.quantity);
        SELECT COALESCE(jsonb_agg(
          CASE WHEN item.value->>'id' = v_order.product_id
            THEN jsonb_set(item.value, '{stock}', to_jsonb(v_stock_remaining), TRUE)
            ELSE item.value
          END
        ), '[]'::jsonb)
        INTO v_updated_products
        FROM jsonb_array_elements(v_products) AS item(value);

        UPDATE public.agent_sawtify_stores
        SET store_data = jsonb_set(v_store.store_data, '{products}', v_updated_products, TRUE), updated_at = NOW()
        WHERE id = v_store.id
        RETURNING * INTO v_store;
        v_stock_restored := TRUE;
      END IF;
    END IF;
  END IF;

  DELETE FROM public.agent_sawtify_orders WHERE id = v_order.id;
  RETURN jsonb_build_object(
    'success', true,
    'request_type', COALESCE(v_order.request_type, 'order'),
    'product_id', v_order.product_id,
    'stock_restored', v_stock_restored,
    'product_stock_remaining', v_stock_remaining,
    'store_updated_at', v_store.updated_at
  );
END;
$$;

-- Débit et journalisation d'une réponse dans une même transaction. Une clé de requête évite le double débit en cas de retry réseau.
CREATE OR REPLACE FUNCTION public.consume_agent_sawtify_conversation(
  p_request_id UUID,
  p_user_id UUID,
  p_store_id UUID,
  p_store_slug TEXT,
  p_input_characters INTEGER,
  p_output_characters INTEGER,
  p_seconds INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_existing public.agent_sawtify_usage_events%ROWTYPE;
  v_result JSONB;
  v_event_id UUID;
BEGIN
  IF p_request_id IS NULL OR p_user_id IS NULL OR p_store_id IS NULL
     OR p_input_characters IS NULL OR p_input_characters < 0
     OR p_output_characters IS NULL OR p_output_characters < 0
     OR p_input_characters + p_output_characters < 1
     OR p_seconds IS NULL OR p_seconds < 1 OR p_seconds > 300 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_usage');
  END IF;

  SELECT * INTO v_existing
  FROM public.agent_sawtify_usage_events
  WHERE request_id = p_request_id;
  IF FOUND THEN
    IF v_existing.owner_user_id <> p_user_id OR v_existing.store_id <> p_store_id
       OR v_existing.store_slug <> p_store_slug
       OR v_existing.input_characters <> p_input_characters
       OR v_existing.output_characters <> p_output_characters
       OR v_existing.billable_seconds <> p_seconds THEN
      RETURN jsonb_build_object('success', false, 'error', 'invalid_request_id');
    END IF;
    RETURN jsonb_build_object(
      'success', true,
      'already_processed', true,
      'consumed_seconds', v_existing.billable_seconds,
      'plan_seconds_used', v_existing.plan_seconds_used,
      'topup_seconds_used', v_existing.topup_seconds_used,
      'remaining_seconds', v_existing.remaining_seconds_after
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.agent_sawtify_stores
    WHERE id = p_store_id AND owner_user_id = p_user_id AND slug = p_store_slug
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'store_unavailable');
  END IF;

  v_result := public.consume_agent_sawtify_seconds(p_user_id, p_seconds);
  IF COALESCE((v_result->>'success')::BOOLEAN, FALSE) IS NOT TRUE THEN
    RETURN v_result;
  END IF;

  INSERT INTO public.agent_sawtify_usage_events (
    request_id, owner_user_id, store_id, store_slug, input_characters, output_characters,
    billable_seconds, plan_seconds_used, topup_seconds_used, remaining_seconds_after
  ) VALUES (
    p_request_id, p_user_id, p_store_id, p_store_slug, p_input_characters, p_output_characters,
    p_seconds, COALESCE((v_result->>'plan_seconds_used')::BIGINT, 0),
    COALESCE((v_result->>'topup_seconds_used')::BIGINT, 0),
    COALESCE((v_result->>'remaining_seconds')::BIGINT, 0)
  ) RETURNING id INTO v_event_id;

  RETURN v_result || jsonb_build_object('usage_event_id', v_event_id);
END;
$$;

REVOKE ALL ON FUNCTION public.complete_agent_sawtify_payment(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_agent_sawtify_payment(TEXT) TO service_role;
REVOKE ALL ON FUNCTION public.consume_agent_sawtify_seconds(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_agent_sawtify_seconds(UUID, INTEGER) TO service_role;
REVOKE ALL ON FUNCTION public.create_agent_sawtify_order(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_agent_sawtify_order(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER) TO service_role;
REVOKE ALL ON FUNCTION public.create_agent_sawtify_request(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_agent_sawtify_request(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;
REVOKE ALL ON FUNCTION public.delete_agent_sawtify_order(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_agent_sawtify_order(UUID, UUID) TO service_role;
REVOKE ALL ON FUNCTION public.consume_agent_sawtify_conversation(UUID, UUID, UUID, TEXT, INTEGER, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_agent_sawtify_conversation(UUID, UUID, UUID, TEXT, INTEGER, INTEGER, INTEGER) TO service_role;
