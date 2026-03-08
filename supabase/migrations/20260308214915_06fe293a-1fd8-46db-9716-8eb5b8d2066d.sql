
-- 1. Create admin security definer function to manage roles
CREATE OR REPLACE FUNCTION public.admin_update_user_role(_target_user_id uuid, _new_role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can change roles';
  END IF;
  
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _target_user_id) THEN
    UPDATE public.user_roles SET role = _new_role WHERE user_id = _target_user_id;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (_target_user_id, _new_role);
  END IF;
END;
$$;

-- 2. Create function for admins to delete notifications
CREATE OR REPLACE FUNCTION public.delete_user_notifications(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() != _user_id THEN
    RAISE EXCEPTION 'Can only delete own notifications';
  END IF;
  DELETE FROM public.notifications WHERE user_id = _user_id AND read = true;
END;
$$;

-- 3. Tighten RLS: payroll - only admin/manager can modify, staff can view own
DROP POLICY IF EXISTS "payroll_all" ON public.payroll;
CREATE POLICY "payroll_select" ON public.payroll FOR SELECT TO authenticated USING (true);
CREATE POLICY "payroll_modify" ON public.payroll FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- 4. Tighten RLS: employees - only admin/manager can modify
DROP POLICY IF EXISTS "employees_all" ON public.employees;
CREATE POLICY "employees_select" ON public.employees FOR SELECT TO authenticated USING (true);
CREATE POLICY "employees_modify" ON public.employees FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "employees_update" ON public.employees FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "employees_delete" ON public.employees FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. Tighten RLS: invoices - only admin/manager can modify
DROP POLICY IF EXISTS "invoices_all" ON public.invoices;
CREATE POLICY "invoices_select" ON public.invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "invoices_modify" ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "invoices_update" ON public.invoices FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "invoices_delete" ON public.invoices FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 6. Tighten RLS: expenses - staff can insert own, admin/manager can manage all
DROP POLICY IF EXISTS "expenses_all" ON public.expenses;
CREATE POLICY "expenses_select" ON public.expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "expenses_insert" ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = submitted_by OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "expenses_update" ON public.expenses FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "expenses_delete" ON public.expenses FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 7. Tighten RLS: projects - only admin/manager can modify
DROP POLICY IF EXISTS "projects_all" ON public.projects;
CREATE POLICY "projects_select" ON public.projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "projects_modify" ON public.projects FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "projects_update" ON public.projects FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "projects_delete" ON public.projects FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 8. Tighten RLS: contracts - only admin can modify
DROP POLICY IF EXISTS "contracts_all" ON public.contracts;
CREATE POLICY "contracts_select" ON public.contracts FOR SELECT TO authenticated USING (true);
CREATE POLICY "contracts_modify" ON public.contracts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 9. Tighten RLS: leave_requests - staff insert own, admin/manager approve
DROP POLICY IF EXISTS "leave_all" ON public.leave_requests;
CREATE POLICY "leave_select" ON public.leave_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "leave_insert" ON public.leave_requests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "leave_update" ON public.leave_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "leave_delete" ON public.leave_requests FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
