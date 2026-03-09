-- Fix trip_logs: only authenticated users can insert
DROP POLICY IF EXISTS "trips_insert" ON public.trip_logs;
CREATE POLICY "trips_insert" ON public.trip_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Fix visitor_log: only authenticated users can insert
DROP POLICY IF EXISTS "visitor_insert" ON public.visitor_log;
CREATE POLICY "visitor_insert" ON public.visitor_log
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);