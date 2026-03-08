
-- 1. Add notification DELETE policy
CREATE POLICY "notifications_delete" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

-- 2. Tighten RLS on quotations
DROP POLICY IF EXISTS "quotations_all" ON public.quotations;
CREATE POLICY "quotations_select" ON public.quotations FOR SELECT USING (true);
CREATE POLICY "quotations_modify" ON public.quotations FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
);
CREATE POLICY "quotations_update" ON public.quotations FOR UPDATE USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
);
CREATE POLICY "quotations_delete" ON public.quotations FOR DELETE USING (
  has_role(auth.uid(), 'admin')
);

-- 3. Tighten RLS on purchase_orders
DROP POLICY IF EXISTS "po_all" ON public.purchase_orders;
CREATE POLICY "po_select" ON public.purchase_orders FOR SELECT USING (true);
CREATE POLICY "po_modify" ON public.purchase_orders FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
);
CREATE POLICY "po_update" ON public.purchase_orders FOR UPDATE USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
);
CREATE POLICY "po_delete" ON public.purchase_orders FOR DELETE USING (
  has_role(auth.uid(), 'admin')
);

-- 4. Tighten RLS on work_orders
DROP POLICY IF EXISTS "work_orders_all" ON public.work_orders;
CREATE POLICY "wo_select" ON public.work_orders FOR SELECT USING (true);
CREATE POLICY "wo_modify" ON public.work_orders FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
);
CREATE POLICY "wo_update" ON public.work_orders FOR UPDATE USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
);
CREATE POLICY "wo_delete" ON public.work_orders FOR DELETE USING (
  has_role(auth.uid(), 'admin')
);

-- 5. Tighten RLS on mp_billing
DROP POLICY IF EXISTS "mp_billing_all" ON public.mp_billing;
CREATE POLICY "mp_billing_select" ON public.mp_billing FOR SELECT USING (true);
CREATE POLICY "mp_billing_modify" ON public.mp_billing FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
);
CREATE POLICY "mp_billing_update" ON public.mp_billing FOR UPDATE USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
);
CREATE POLICY "mp_billing_delete" ON public.mp_billing FOR DELETE USING (
  has_role(auth.uid(), 'admin')
);

-- 6. Tighten RLS on timesheets
DROP POLICY IF EXISTS "timesheets_all" ON public.timesheets;
CREATE POLICY "timesheets_select" ON public.timesheets FOR SELECT USING (true);
CREATE POLICY "timesheets_insert" ON public.timesheets FOR INSERT WITH CHECK (true);
CREATE POLICY "timesheets_update" ON public.timesheets FOR UPDATE USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
);
CREATE POLICY "timesheets_delete" ON public.timesheets FOR DELETE USING (
  has_role(auth.uid(), 'admin')
);

-- 7. Tighten RLS on sites
DROP POLICY IF EXISTS "sites_all" ON public.sites;
CREATE POLICY "sites_select" ON public.sites FOR SELECT USING (true);
CREATE POLICY "sites_modify" ON public.sites FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
);
CREATE POLICY "sites_update" ON public.sites FOR UPDATE USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
);
CREATE POLICY "sites_delete" ON public.sites FOR DELETE USING (
  has_role(auth.uid(), 'admin')
);

-- 8. Tighten RLS on clients
DROP POLICY IF EXISTS "clients_all" ON public.clients;
CREATE POLICY "clients_select" ON public.clients FOR SELECT USING (true);
CREATE POLICY "clients_modify" ON public.clients FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
);
CREATE POLICY "clients_update" ON public.clients FOR UPDATE USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
);
CREATE POLICY "clients_delete" ON public.clients FOR DELETE USING (
  has_role(auth.uid(), 'admin')
);

-- 9. Tighten RLS on assets
DROP POLICY IF EXISTS "assets_all" ON public.assets;
CREATE POLICY "assets_select" ON public.assets FOR SELECT USING (true);
CREATE POLICY "assets_modify" ON public.assets FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
);
CREATE POLICY "assets_update" ON public.assets FOR UPDATE USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
);
CREATE POLICY "assets_delete" ON public.assets FOR DELETE USING (
  has_role(auth.uid(), 'admin')
);
