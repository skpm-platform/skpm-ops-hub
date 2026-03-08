
-- Tighten RLS: Replace permissive USING(true)/WITH CHECK(true) policies with authenticated-only
-- This ensures only logged-in users can access data

-- Drop overly permissive ALL policies and replace with authenticated-only
DO $$
DECLARE
  tbl text;
  pol_name text;
BEGIN
  FOR tbl, pol_name IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public'
    AND (qual = 'true' OR with_check = 'true')
    AND cmd = 'ALL'
    AND policyname NOT IN ('settings_modify', 'settings_select')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol_name, tbl);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', pol_name, tbl);
  END LOOP;
END $$;
