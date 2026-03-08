
-- Tighten remaining permissive tables

-- accommodations
DROP POLICY IF EXISTS "accommodations_all" ON public.accommodations;
CREATE POLICY "accommodations_select" ON public.accommodations FOR SELECT USING (true);
CREATE POLICY "accommodations_modify" ON public.accommodations FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "accommodations_update" ON public.accommodations FOR UPDATE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "accommodations_delete" ON public.accommodations FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- announcements
DROP POLICY IF EXISTS "announcements_all" ON public.announcements;
CREATE POLICY "announcements_select" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "announcements_modify" ON public.announcements FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "announcements_update" ON public.announcements FOR UPDATE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "announcements_delete" ON public.announcements FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- departments
DROP POLICY IF EXISTS "departments_all" ON public.departments;
CREATE POLICY "departments_select" ON public.departments FOR SELECT USING (true);
CREATE POLICY "departments_modify" ON public.departments FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "departments_update" ON public.departments FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "departments_delete" ON public.departments FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- deployments
DROP POLICY IF EXISTS "deployments_all" ON public.deployments;
CREATE POLICY "deployments_select" ON public.deployments FOR SELECT USING (true);
CREATE POLICY "deployments_modify" ON public.deployments FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "deployments_update" ON public.deployments FOR UPDATE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "deployments_delete" ON public.deployments FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- duty_roster
DROP POLICY IF EXISTS "duty_roster_all" ON public.duty_roster;
CREATE POLICY "duty_roster_select" ON public.duty_roster FOR SELECT USING (true);
CREATE POLICY "duty_roster_modify" ON public.duty_roster FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "duty_roster_update" ON public.duty_roster FOR UPDATE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "duty_roster_delete" ON public.duty_roster FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- facilities
DROP POLICY IF EXISTS "facilities_all" ON public.facilities;
CREATE POLICY "facilities_select" ON public.facilities FOR SELECT USING (true);
CREATE POLICY "facilities_modify" ON public.facilities FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "facilities_update" ON public.facilities FOR UPDATE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "facilities_delete" ON public.facilities FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- gate_passes
DROP POLICY IF EXISTS "gate_passes_all" ON public.gate_passes;
CREATE POLICY "gate_passes_select" ON public.gate_passes FOR SELECT USING (true);
CREATE POLICY "gate_passes_modify" ON public.gate_passes FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "gate_passes_update" ON public.gate_passes FOR UPDATE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "gate_passes_delete" ON public.gate_passes FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- helpdesk_tickets
DROP POLICY IF EXISTS "tickets_all" ON public.helpdesk_tickets;
CREATE POLICY "tickets_select" ON public.helpdesk_tickets FOR SELECT USING (true);
CREATE POLICY "tickets_insert" ON public.helpdesk_tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "tickets_update" ON public.helpdesk_tickets FOR UPDATE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "tickets_delete" ON public.helpdesk_tickets FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- hse_incidents
DROP POLICY IF EXISTS "hse_all" ON public.hse_incidents;
CREATE POLICY "hse_select" ON public.hse_incidents FOR SELECT USING (true);
CREATE POLICY "hse_insert" ON public.hse_incidents FOR INSERT WITH CHECK (true);
CREATE POLICY "hse_update" ON public.hse_incidents FOR UPDATE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "hse_delete" ON public.hse_incidents FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- inventory
DROP POLICY IF EXISTS "inventory_all" ON public.inventory;
CREATE POLICY "inventory_select" ON public.inventory FOR SELECT USING (true);
CREATE POLICY "inventory_modify" ON public.inventory FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "inventory_update" ON public.inventory FOR UPDATE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "inventory_delete" ON public.inventory FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- invitations
DROP POLICY IF EXISTS "invitations_all" ON public.invitations;
CREATE POLICY "invitations_select" ON public.invitations FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "invitations_modify" ON public.invitations FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "invitations_update" ON public.invitations FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "invitations_delete" ON public.invitations FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- maintenance_schedules
DROP POLICY IF EXISTS "maintenance_all" ON public.maintenance_schedules;
CREATE POLICY "maintenance_select" ON public.maintenance_schedules FOR SELECT USING (true);
CREATE POLICY "maintenance_modify" ON public.maintenance_schedules FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "maintenance_update" ON public.maintenance_schedules FOR UPDATE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "maintenance_delete" ON public.maintenance_schedules FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- calendar_events
DROP POLICY IF EXISTS "events_all" ON public.calendar_events;
CREATE POLICY "events_select" ON public.calendar_events FOR SELECT USING (true);
CREATE POLICY "events_insert" ON public.calendar_events FOR INSERT WITH CHECK (true);
CREATE POLICY "events_update" ON public.calendar_events FOR UPDATE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR auth.uid() = created_by);
CREATE POLICY "events_delete" ON public.calendar_events FOR DELETE USING (has_role(auth.uid(), 'admin') OR auth.uid() = created_by);

-- training_programs
DROP POLICY IF EXISTS "training_all" ON public.training_programs;
CREATE POLICY "training_select" ON public.training_programs FOR SELECT USING (true);
CREATE POLICY "training_modify" ON public.training_programs FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "training_update" ON public.training_programs FOR UPDATE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "training_delete" ON public.training_programs FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- vehicles
DROP POLICY IF EXISTS "vehicles_all" ON public.vehicles;
CREATE POLICY "vehicles_select" ON public.vehicles FOR SELECT USING (true);
CREATE POLICY "vehicles_modify" ON public.vehicles FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "vehicles_update" ON public.vehicles FOR UPDATE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "vehicles_delete" ON public.vehicles FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- visitor_log
DROP POLICY IF EXISTS "visitors_all" ON public.visitor_log;
CREATE POLICY "visitors_select" ON public.visitor_log FOR SELECT USING (true);
CREATE POLICY "visitors_insert" ON public.visitor_log FOR INSERT WITH CHECK (true);
CREATE POLICY "visitors_update" ON public.visitor_log FOR UPDATE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "visitors_delete" ON public.visitor_log FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- workers
DROP POLICY IF EXISTS "workers_all" ON public.workers;
CREATE POLICY "workers_select" ON public.workers FOR SELECT USING (true);
CREATE POLICY "workers_modify" ON public.workers FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "workers_update" ON public.workers FOR UPDATE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "workers_delete" ON public.workers FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- trips
DROP POLICY IF EXISTS "trips_all" ON public.trip_logs;
CREATE POLICY "trips_select" ON public.trip_logs FOR SELECT USING (true);
CREATE POLICY "trips_insert" ON public.trip_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "trips_update" ON public.trip_logs FOR UPDATE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "trips_delete" ON public.trip_logs FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- mp_billing (already done but let's also handle the remaining)
-- Fix upsert for system_settings to support insert
CREATE OR REPLACE FUNCTION public.upsert_system_setting(_key text, _value text, _updated_by uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.system_settings WHERE key = _key) THEN
    UPDATE public.system_settings SET value = _value, updated_by = _updated_by, updated_at = now() WHERE key = _key;
  ELSE
    INSERT INTO public.system_settings (key, value, updated_by) VALUES (_key, _value, _updated_by);
  END IF;
END;
$$;
