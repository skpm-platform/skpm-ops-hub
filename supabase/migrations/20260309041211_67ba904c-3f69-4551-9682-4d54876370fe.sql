
-- Fix 1: Tighten audit_logs insert - require authenticated user and set user_id
DROP POLICY IF EXISTS "audit_insert" ON public.audit_logs;
CREATE POLICY "audit_insert" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Fix 2: Tighten leave_requests insert - require authenticated user  
DROP POLICY IF EXISTS "leave_insert" ON public.leave_requests;
CREATE POLICY "leave_insert" ON public.leave_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
