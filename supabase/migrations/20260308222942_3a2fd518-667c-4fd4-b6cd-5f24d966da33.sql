
-- HARDEN RLS: documents table
DROP POLICY IF EXISTS "documents_delete" ON public.documents;
DROP POLICY IF EXISTS "documents_insert" ON public.documents;
DROP POLICY IF EXISTS "documents_update" ON public.documents;

CREATE POLICY "documents_insert_auth" ON public.documents
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "documents_update_role" ON public.documents
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR auth.uid() = uploaded_by);

CREATE POLICY "documents_delete_role" ON public.documents
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR auth.uid() = uploaded_by);

-- HARDEN RLS: tasks table
DROP POLICY IF EXISTS "tasks_delete" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update" ON public.tasks;

CREATE POLICY "tasks_update_role" ON public.tasks
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR auth.uid() = created_by OR auth.uid() = assigned_to);

CREATE POLICY "tasks_delete_role" ON public.tasks
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR auth.uid() = created_by);

-- HARDEN RLS: requisitions table
DROP POLICY IF EXISTS "requisitions_all" ON public.requisitions;

CREATE POLICY "requisitions_select" ON public.requisitions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "requisitions_insert" ON public.requisitions
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "requisitions_update" ON public.requisitions
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "requisitions_delete" ON public.requisitions
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- HARDEN RLS: profiles (restrict updates to own or admin)
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

-- HARDEN: visitor_log
DROP POLICY IF EXISTS "visitor_log_select" ON public.visitor_log;
DROP POLICY IF EXISTS "visitor_log_insert" ON public.visitor_log;
DROP POLICY IF EXISTS "visitor_log_update" ON public.visitor_log;
DROP POLICY IF EXISTS "visitor_log_delete" ON public.visitor_log;

CREATE POLICY "visitor_select" ON public.visitor_log
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "visitor_insert" ON public.visitor_log
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "visitor_update" ON public.visitor_log
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "visitor_delete" ON public.visitor_log
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- HARDEN: training_programs
DROP POLICY IF EXISTS "training_select" ON public.training_programs;
DROP POLICY IF EXISTS "training_insert" ON public.training_programs;
DROP POLICY IF EXISTS "training_update" ON public.training_programs;
DROP POLICY IF EXISTS "training_delete" ON public.training_programs;

CREATE POLICY "training_select" ON public.training_programs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "training_insert" ON public.training_programs
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "training_update" ON public.training_programs
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "training_delete" ON public.training_programs
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- HARDEN: vehicles
DROP POLICY IF EXISTS "vehicles_select" ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_insert" ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_update" ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_delete" ON public.vehicles;

CREATE POLICY "vehicles_select" ON public.vehicles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "vehicles_insert" ON public.vehicles
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "vehicles_update" ON public.vehicles
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "vehicles_delete" ON public.vehicles
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- HARDEN: trip_logs
DROP POLICY IF EXISTS "trips_select" ON public.trip_logs;
DROP POLICY IF EXISTS "trips_insert" ON public.trip_logs;
DROP POLICY IF EXISTS "trips_update" ON public.trip_logs;
DROP POLICY IF EXISTS "trips_delete" ON public.trip_logs;

CREATE POLICY "trips_select" ON public.trip_logs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "trips_insert" ON public.trip_logs
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "trips_update" ON public.trip_logs
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "trips_delete" ON public.trip_logs
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- HARDEN: workers
DROP POLICY IF EXISTS "workers_select" ON public.workers;
DROP POLICY IF EXISTS "workers_insert" ON public.workers;
DROP POLICY IF EXISTS "workers_update" ON public.workers;
DROP POLICY IF EXISTS "workers_delete" ON public.workers;

CREATE POLICY "workers_select" ON public.workers
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "workers_insert" ON public.workers
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "workers_update" ON public.workers
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "workers_delete" ON public.workers
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- HARDEN: transactions
DROP POLICY IF EXISTS "transactions_select" ON public.transactions;
DROP POLICY IF EXISTS "transactions_insert" ON public.transactions;
DROP POLICY IF EXISTS "transactions_update" ON public.transactions;
DROP POLICY IF EXISTS "transactions_delete" ON public.transactions;

CREATE POLICY "transactions_select" ON public.transactions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "transactions_insert" ON public.transactions
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "transactions_update" ON public.transactions
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "transactions_delete" ON public.transactions
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));
