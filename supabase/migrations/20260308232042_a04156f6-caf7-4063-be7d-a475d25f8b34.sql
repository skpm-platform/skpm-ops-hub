
-- 1. Fix clients SELECT: restrict to authenticated only
DROP POLICY IF EXISTS "clients_select" ON public.clients;
CREATE POLICY "clients_select" ON public.clients FOR SELECT TO authenticated USING (true);

-- 2. Fix employees SELECT: own record or admin/manager
DROP POLICY IF EXISTS "employees_select" ON public.employees;
CREATE POLICY "employees_select" ON public.employees FOR SELECT TO authenticated
USING (
  (auth.uid() = user_id) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role)
);

-- 3. Fix payroll SELECT: admin/manager only
DROP POLICY IF EXISTS "payroll_select" ON public.payroll;
CREATE POLICY "payroll_select" ON public.payroll FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role)
);

-- 4. Fix visitor_log: restrict to authenticated
DROP POLICY IF EXISTS "visitors_select" ON public.visitor_log;
CREATE POLICY "visitors_select" ON public.visitor_log FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "visitors_insert" ON public.visitor_log;
CREATE POLICY "visitors_insert" ON public.visitor_log FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- 5. Fix hse_incidents SELECT: authenticated only
DROP POLICY IF EXISTS "hse_select" ON public.hse_incidents;
CREATE POLICY "hse_select" ON public.hse_incidents FOR SELECT TO authenticated USING (true);

-- 6. Fix timesheets: authenticated only
DROP POLICY IF EXISTS "timesheets_select" ON public.timesheets;
CREATE POLICY "timesheets_select" ON public.timesheets FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "timesheets_insert" ON public.timesheets;
CREATE POLICY "timesheets_insert" ON public.timesheets FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- 7. Fix purchase_orders SELECT: authenticated only
DROP POLICY IF EXISTS "po_select" ON public.purchase_orders;
CREATE POLICY "po_select" ON public.purchase_orders FOR SELECT TO authenticated USING (true);

-- 8. Fix quotations SELECT: authenticated only
DROP POLICY IF EXISTS "quotations_select" ON public.quotations;
CREATE POLICY "quotations_select" ON public.quotations FOR SELECT TO authenticated USING (true);

-- 9. Fix mp_billing SELECT: authenticated only
DROP POLICY IF EXISTS "mp_billing_select" ON public.mp_billing;
CREATE POLICY "mp_billing_select" ON public.mp_billing FOR SELECT TO authenticated USING (true);

-- 10. Fix transactions SELECT: admin/manager only
DROP POLICY IF EXISTS "transactions_select" ON public.transactions;
CREATE POLICY "transactions_select" ON public.transactions FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role)
);

-- 11. Fix audit_logs SELECT: admin only
DROP POLICY IF EXISTS "audit_select" ON public.audit_logs;
CREATE POLICY "audit_select" ON public.audit_logs FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 12. Fix notifications INSERT: must match own user_id
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 13. Fix user_roles SELECT: own role or admin
DROP POLICY IF EXISTS "roles_select" ON public.user_roles;
CREATE POLICY "roles_select" ON public.user_roles FOR SELECT TO authenticated
USING (
  (auth.uid() = user_id) OR
  has_role(auth.uid(), 'admin'::app_role)
)
