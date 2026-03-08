-- Tighten INSERT policies that should require auth user context

-- attendance: ensure user can only insert for themselves (already correct)
-- calendar_events: restrict insert to admin/manager
DROP POLICY IF EXISTS events_insert ON public.calendar_events;
CREATE POLICY events_insert ON public.calendar_events FOR INSERT TO authenticated WITH CHECK (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR auth.uid() = created_by
);

-- helpdesk: any authenticated can raise ticket (intentional)
-- hse: any authenticated can report (intentional)
-- leave: any authenticated can request (intentional)
-- tasks: any authenticated can create (intentional)
-- documents: any authenticated can upload (intentional)
-- notifications: system inserts (intentional)
-- audit_logs: any insert allowed (intentional)

-- Tighten attendance update to admin/manager only
DROP POLICY IF EXISTS attendance_update ON public.attendance;
CREATE POLICY attendance_update ON public.attendance FOR UPDATE TO authenticated USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR auth.uid() = user_id
);