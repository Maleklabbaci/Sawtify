-- ==============================================================================
-- SAWTIFY TTS - PRODUCTION POSTGRESQL SCHEMA (SUPABASE)
-- Multi-tenant Text-to-Speech SaaS with Pay-as-you-go Balance & CIB / Edahabia
-- ==============================================================================

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS
CREATE TYPE payment_gateway_type AS ENUM ('edahabia', 'cib', 'slickpay', 'satim');
CREATE TYPE transaction_status_type AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE generation_status_type AS ENUM ('processing', 'completed', 'failed');

-- 3. PROFILES TABLE (Linked with Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    credits_balance INTEGER NOT NULL DEFAULT 50 CHECK (credits_balance >= 0),
    total_generated_audios INTEGER NOT NULL DEFAULT 0,
    phone_number TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. CREDIT PACKS CATALOG (Pay-as-you-go Pricing in Algerian Dinars DZD)
CREATE TABLE IF NOT EXISTS public.credit_packs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    points INTEGER NOT NULL CHECK (points > 0),
    price_dzd NUMERIC(10, 2) NOT NULL CHECK (price_dzd >= 0),
    bonus_percent INTEGER DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial Algerian packs
INSERT INTO public.credit_packs (id, name, points, price_dzd, bonus_percent)
VALUES 
    ('pack_starter', 'Pack Découverte', 100, 500.00, 0),
    ('pack_pro', 'Pack Pro Créateur', 220, 1000.00, 10),
    ('pack_studio', 'Pack Studio', 600, 2500.00, 20),
    ('pack_business', 'Pack Entreprise', 1350, 5000.00, 35)
ON CONFLICT (id) DO NOTHING;

-- 5. TRANSACTIONS & RECHARGES (Ledger for CIB / Edahabia / SlickPay)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    pack_id TEXT REFERENCES public.credit_packs(id),
    gateway payment_gateway_type NOT NULL,
    gateway_reference TEXT NOT NULL UNIQUE,
    amount_dzd NUMERIC(10, 2) NOT NULL,
    points_credited INTEGER NOT NULL,
    status transaction_status_type NOT NULL DEFAULT 'pending',
    webhook_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. VOICE GENERATIONS AUDIT & HISTORY
CREATE TABLE IF NOT EXISTS public.voice_generations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    voice_id TEXT NOT NULL,
    voice_name TEXT NOT NULL,
    text_prompt TEXT NOT NULL,
    char_count INTEGER NOT NULL,
    points_deducted INTEGER NOT NULL DEFAULT 20,
    audio_storage_path TEXT,
    audio_duration_seconds NUMERIC(6, 2),
    latency_ms INTEGER,
    status generation_status_type NOT NULL DEFAULT 'completed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. INDEXES FOR HIGH-THROUGHPUT QUERIES
CREATE INDEX IF NOT EXISTS idx_transactions_user ON public.transactions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_generations_user ON public.voice_generations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_ref ON public.transactions(gateway_reference);

-- 8. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_generations ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only read their own profile
CREATE POLICY "Users can read own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

-- Credit Packs: Public read-only catalog
CREATE POLICY "Anyone can view active credit packs" 
    ON public.credit_packs FOR SELECT 
    USING (is_active = TRUE);

-- Transactions: Users can view their own transaction history
CREATE POLICY "Users can view own transactions" 
    ON public.transactions FOR SELECT 
    USING (auth.uid() = user_id);

-- Generations: Users can view their own generations
CREATE POLICY "Users can view own generations" 
    ON public.voice_generations FOR SELECT 
    USING (auth.uid() = user_id);

-- 9. ATOMIC STORED PROCEDURES (Concurrency Safe Row-Locking)

-- A. Deduct user credits atomically
-- NOTE: bound to auth.uid() (the caller's own session), NOT a client-supplied
-- user id, so one user can never deduct/read another user's balance via this RPC.
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

    -- Acquire exclusive row lock on user profile to avoid race condition
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

    -- Update balance and total stats
    UPDATE public.profiles
    SET 
        credits_balance = credits_balance - p_amount,
        total_generated_audios = total_generated_audios + 1,
        updated_at = NOW()
    WHERE id = v_user_id;

    -- Record generation
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

GRANT EXECUTE ON FUNCTION public.deduct_user_credits(
    INTEGER, TEXT, TEXT, TEXT, INTEGER, NUMERIC, INTEGER, TEXT
) TO authenticated;

-- B. Credit user balance from validated payment webhook
CREATE OR REPLACE FUNCTION public.credit_user_balance(
    p_user_id UUID,
    p_pack_id TEXT,
    p_gateway payment_gateway_type,
    p_gateway_reference TEXT,
    p_amount_dzd NUMERIC,
    p_points INTEGER,
    p_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_existing_tx UUID;
    v_new_balance INTEGER;
BEGIN
    -- Idempotency check: Ensure gateway reference is processed only once
    SELECT id INTO v_existing_tx
    FROM public.transactions
    WHERE gateway_reference = p_gateway_reference AND status = 'completed';

    IF FOUND THEN
        RETURN jsonb_build_object('success', true, 'already_processed', true);
    END IF;

    -- Lock profile and add credits
    UPDATE public.profiles
    SET 
        credits_balance = credits_balance + p_points,
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING credits_balance INTO v_new_balance;

    -- Insert completed transaction
    INSERT INTO public.transactions (
        user_id, pack_id, gateway, gateway_reference, 
        amount_dzd, points_credited, status, webhook_payload
    ) VALUES (
        p_user_id, p_pack_id, p_gateway, p_gateway_reference,
        p_amount_dzd, p_points, 'completed', p_payload
    );

    RETURN jsonb_build_object(
        'success', true, 
        'new_balance', v_new_balance,
        'points_credited', p_points
    );
END;
$$;

-- SECURITY: only the backend (service_role key) may call this — never the
-- browser. Otherwise any logged-in user could credit themselves free points
-- without paying.
REVOKE EXECUTE ON FUNCTION public.credit_user_balance(
    UUID, TEXT, payment_gateway_type, TEXT, NUMERIC, INTEGER, JSONB
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_user_balance(
    UUID, TEXT, payment_gateway_type, TEXT, NUMERIC, INTEGER, JSONB
) TO service_role;

-- 10. TRIGGER TO CREATE PROFILE ON USER SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, credits_balance)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Utilisateur Sawtify'),
        50 -- 50 points de bienvenue offerts (aligné avec le message affiché au signup)
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
