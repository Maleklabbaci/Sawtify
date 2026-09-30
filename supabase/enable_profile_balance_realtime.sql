-- Run once on an existing Supabase project to stream profile balance updates
-- (including deductions made by the Developer API) to the signed-in app.
-- The app only subscribes to the current user's own row; existing RLS policies
-- continue to enforce that access.
DO $$
BEGIN
    IF to_regclass('public.profiles') IS NULL THEN
        RAISE EXCEPTION 'public.profiles must exist before enabling balance Realtime';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        RAISE EXCEPTION 'Supabase publication supabase_realtime was not found';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'profiles'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    END IF;
END;
$$;
