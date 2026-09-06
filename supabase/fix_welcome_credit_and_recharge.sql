-- ==============================================================================
-- SAWTIFY - MIGRATION 2 (à coller dans Supabase > SQL Editor > New query)
-- ------------------------------------------------------------------------------
-- Corrige : les nouveaux comptes recevaient 100 points au lieu des 50 annoncés
-- dans l'app (message de bienvenue / toasts). Le code applicatif (server.ts /
-- App.tsx) a été mis à jour séparément pour que les recharges de points soient
-- réellement persistées via credit_user_balance — ce fichier ne touche que le
-- bonus de bienvenue à l'inscription.
-- ==============================================================================

-- 1. Nouveaux comptes : 50 points par défaut si credits_balance n'est pas fourni explicitement.
ALTER TABLE public.profiles ALTER COLUMN credits_balance SET DEFAULT 50;

-- 2. Le trigger déclenché à la création du compte (auth.users -> profiles) doit
--    lui aussi créditer 50, pas 100.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, credits_balance)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Utilisateur Sawtify'),
        50
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Note : ceci ne change rien pour les comptes déjà créés avec 100 points.
-- Si tu veux aussi corriger rétroactivement les comptes existants qui ont encore
-- exactement 100 (donc jamais utilisés/rechargés depuis), décommente la ligne
-- suivante et ajuste la condition à ton besoin avant de l'exécuter :
-- UPDATE public.profiles SET credits_balance = 50 WHERE credits_balance = 100 AND total_generated_audios = 0;
