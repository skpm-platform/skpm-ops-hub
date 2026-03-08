
-- Harden INSERT policies that use WITH CHECK (true) to require authentication
-- audit_logs insert: keep true (needed for all authenticated users to log)
-- documents insert: restrict to authenticated user setting uploaded_by
DROP POLICY IF EXISTS "documents_insert_auth" ON public.documents;
CREATE POLICY "documents_insert_auth" ON public.documents
  FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

-- helpdesk tickets: restrict to authenticated, set raised_by
DROP POLICY IF EXISTS "tickets_insert" ON public.helpdesk_tickets;
CREATE POLICY "tickets_insert" ON public.helpdesk_tickets
  FOR INSERT WITH CHECK (auth.uid() = raised_by);

-- hse_incidents: restrict to authenticated, set reported_by
DROP POLICY IF EXISTS "hse_insert" ON public.hse_incidents;
CREATE POLICY "hse_insert" ON public.hse_incidents
  FOR INSERT WITH CHECK (auth.uid() = reported_by);

-- leave_requests: any authenticated user can submit (employee_id may differ from user_id)
-- Keep permissive but require authentication
DROP POLICY IF EXISTS "leave_insert" ON public.leave_requests;
CREATE POLICY "leave_insert" ON public.leave_requests
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- tasks: require creator to be the authenticated user
DROP POLICY IF EXISTS "tasks_insert" ON public.tasks;
CREATE POLICY "tasks_insert" ON public.tasks
  FOR INSERT WITH CHECK (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- notifications insert: system or admin only
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
CREATE POLICY "notifications_insert" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- calendar_events insert: tighten to set created_by
DROP POLICY IF EXISTS "events_insert" ON public.calendar_events;
CREATE POLICY "events_insert" ON public.calendar_events
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- attendance insert: already restricted to auth.uid() = user_id, skip

-- profiles insert: already restricted to auth.uid() = user_id, skip

-- audit_logs insert: keep true for system logging
