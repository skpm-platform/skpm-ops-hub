
-- Fix existing restrictive policies to permissive
DROP POLICY IF EXISTS "Users can read own attendance" ON attendance;
DROP POLICY IF EXISTS "Admins can read all attendance" ON attendance;
DROP POLICY IF EXISTS "Users can insert own attendance" ON attendance;
DROP POLICY IF EXISTS "Users can update own attendance" ON attendance;
CREATE POLICY "attendance_select" ON attendance FOR SELECT TO authenticated USING (true);
CREATE POLICY "attendance_insert" ON attendance FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "attendance_update" ON attendance FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can read own audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Admins can read all audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Authenticated can insert audit logs" ON audit_logs;
CREATE POLICY "audit_select" ON audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "audit_insert" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Users can read own documents" ON documents;
DROP POLICY IF EXISTS "Admins can read all documents" ON documents;
DROP POLICY IF EXISTS "Users can insert documents" ON documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON documents;
DROP POLICY IF EXISTS "Admins can manage all documents" ON documents;
CREATE POLICY "documents_select" ON documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "documents_insert" ON documents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "documents_update" ON documents FOR UPDATE TO authenticated USING (true);
CREATE POLICY "documents_delete" ON documents FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can read assigned tasks" ON tasks;
DROP POLICY IF EXISTS "Admins can read all tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update assigned tasks" ON tasks;
DROP POLICY IF EXISTS "Admins can manage all tasks" ON tasks;
CREATE POLICY "tasks_select" ON tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "tasks_insert" ON tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "tasks_update" ON tasks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "tasks_delete" ON tasks FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can read own transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can read all transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can manage all transactions" ON transactions;
CREATE POLICY "transactions_select" ON transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "transactions_insert" ON transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "transactions_update" ON transactions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "transactions_delete" ON transactions FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can read own roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can read all roles" ON user_roles;
CREATE POLICY "roles_select" ON user_roles FOR SELECT TO authenticated USING (true);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project_id uuid;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_hours numeric DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS actual_hours numeric DEFAULT 0;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS module text;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS record_id text;

CREATE TABLE IF NOT EXISTS departments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, description text, created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "departments_all" ON departments FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS clients (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, contact_person text, phone text, email text, location text, industry text, status text DEFAULT 'active', created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clients_all" ON clients FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS sites (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, client_id uuid REFERENCES clients(id) ON DELETE SET NULL, location text, emirate text, type text DEFAULT 'office', status text DEFAULT 'active', manager_id uuid, gps_coordinates text, created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sites_all" ON sites FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS projects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_no text, name text NOT NULL, client_id uuid REFERENCES clients(id) ON DELETE SET NULL, site_id uuid REFERENCES sites(id) ON DELETE SET NULL, manager_id uuid, start_date date, end_date date, budget numeric DEFAULT 0, spent numeric DEFAULT 0, status text DEFAULT 'active', priority text DEFAULT 'medium', description text, created_by uuid, created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects_all" ON projects FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS employees (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), employee_id text, user_id uuid, name text NOT NULL, email text, phone text, nationality text, passport_no text, visa_no text, visa_expiry date, position text, department_id uuid REFERENCES departments(id) ON DELETE SET NULL, site_id uuid REFERENCES sites(id) ON DELETE SET NULL, join_date date, salary numeric DEFAULT 0, status text DEFAULT 'active', photo_url text, created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employees_all" ON employees FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS work_orders (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), wo_no text, title text NOT NULL, type text DEFAULT 'corrective', site_id uuid REFERENCES sites(id) ON DELETE SET NULL, assigned_to uuid, priority text DEFAULT 'medium', status text DEFAULT 'open', description text, due_date date, completed_date date, created_by uuid, created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "work_orders_all" ON work_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS maintenance_schedules (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), asset_name text, type text DEFAULT 'preventive', frequency text DEFAULT 'monthly', next_due date, last_done date, assigned_to uuid, status text DEFAULT 'scheduled', created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE maintenance_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "maintenance_all" ON maintenance_schedules FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS quotations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), quote_no text, client_id uuid REFERENCES clients(id) ON DELETE SET NULL, date date DEFAULT CURRENT_DATE, valid_until date, items jsonb DEFAULT '[]', subtotal numeric DEFAULT 0, vat numeric DEFAULT 0, total numeric DEFAULT 0, status text DEFAULT 'draft', created_by uuid, created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quotations_all" ON quotations FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS invoices (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), invoice_no text, client_id uuid REFERENCES clients(id) ON DELETE SET NULL, project_id uuid REFERENCES projects(id) ON DELETE SET NULL, issue_date date DEFAULT CURRENT_DATE, due_date date, items jsonb DEFAULT '[]', subtotal numeric DEFAULT 0, vat numeric DEFAULT 0, total numeric DEFAULT 0, status text DEFAULT 'draft', paid_date date, payment_method text, created_by uuid, created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoices_all" ON invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS expenses (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), date date DEFAULT CURRENT_DATE, category text, description text, amount numeric NOT NULL DEFAULT 0, project_id uuid REFERENCES projects(id) ON DELETE SET NULL, submitted_by uuid, status text DEFAULT 'pending', approved_by uuid, receipt_url text, created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expenses_all" ON expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS purchase_orders (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), po_no text, vendor text, date date DEFAULT CURRENT_DATE, items jsonb DEFAULT '[]', total numeric DEFAULT 0, status text DEFAULT 'draft', created_by uuid, created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "po_all" ON purchase_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS contracts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), contract_no text, client_id uuid REFERENCES clients(id) ON DELETE SET NULL, type text DEFAULT 'project', start_date date, end_date date, value numeric DEFAULT 0, status text DEFAULT 'active', auto_renew boolean DEFAULT false, description text, created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contracts_all" ON contracts FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS assets (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), asset_tag text, name text NOT NULL, category text DEFAULT 'equipment', location text, assigned_to uuid, purchase_date date, purchase_price numeric DEFAULT 0, current_value numeric DEFAULT 0, status text DEFAULT 'active', created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assets_all" ON assets FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS workers (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), worker_id text, name text NOT NULL, trade text, nationality text, status text DEFAULT 'available', visa_expiry date, medical_expiry date, safety_card_expiry date, created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workers_all" ON workers FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS requisitions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_id uuid REFERENCES clients(id) ON DELETE SET NULL, site_id uuid REFERENCES sites(id) ON DELETE SET NULL, trade text, quantity integer DEFAULT 1, start_date date, duration text, status text DEFAULT 'pending', created_by uuid, created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE requisitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "requisitions_all" ON requisitions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS deployments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), worker_id uuid REFERENCES workers(id) ON DELETE SET NULL, requisition_id uuid REFERENCES requisitions(id) ON DELETE SET NULL, start_date date, end_date date, daily_rate numeric DEFAULT 0, status text DEFAULT 'active', created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deployments_all" ON deployments FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS inventory (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sku text, name text NOT NULL, category text, quantity integer DEFAULT 0, min_stock integer DEFAULT 0, unit text DEFAULT 'pcs', unit_cost numeric DEFAULT 0, location text, created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inventory_all" ON inventory FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS hse_incidents (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), date date DEFAULT CURRENT_DATE, type text DEFAULT 'near_miss', site_id uuid REFERENCES sites(id) ON DELETE SET NULL, description text, injured_person text, action_taken text, status text DEFAULT 'open', reported_by uuid, created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE hse_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hse_all" ON hse_incidents FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS training_programs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, type text DEFAULT 'safety', date date, duration text, trainer text, venue text, status text DEFAULT 'scheduled', attendees jsonb DEFAULT '[]', created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE training_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "training_all" ON training_programs FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS visitor_log (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, company text, host_id uuid, purpose text, check_in timestamptz DEFAULT now(), check_out timestamptz, badge_no text, vehicle_plate text, created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE visitor_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "visitors_all" ON visitor_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS announcements (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, message text, priority text DEFAULT 'normal', target_audience text DEFAULT 'all', publish_date date DEFAULT CURRENT_DATE, expiry_date date, created_by uuid, pinned boolean DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "announcements_all" ON announcements FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS notifications (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, type text, title text NOT NULL, message text, link text, read boolean DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_select" ON notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notifications_insert" ON notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "notifications_update" ON notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS calendar_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, type text DEFAULT 'meeting', start_datetime timestamptz NOT NULL DEFAULT now(), end_datetime timestamptz, description text, attendees jsonb DEFAULT '[]', location text, created_by uuid, created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events_all" ON calendar_events FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS leave_requests (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), employee_id uuid REFERENCES employees(id) ON DELETE CASCADE, type text DEFAULT 'annual', start_date date NOT NULL DEFAULT CURRENT_DATE, end_date date NOT NULL DEFAULT CURRENT_DATE, days integer DEFAULT 1, reason text, status text DEFAULT 'pending', approved_by uuid, created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leave_all" ON leave_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS payroll (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), employee_id uuid REFERENCES employees(id) ON DELETE CASCADE, month integer NOT NULL DEFAULT 1, year integer NOT NULL DEFAULT 2026, basic_salary numeric DEFAULT 0, housing_allowance numeric DEFAULT 0, transport_allowance numeric DEFAULT 0, food_allowance numeric DEFAULT 0, overtime_pay numeric DEFAULT 0, deductions numeric DEFAULT 0, net_pay numeric DEFAULT 0, status text DEFAULT 'draft', created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payroll_all" ON payroll FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS helpdesk_tickets (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ticket_no text, title text NOT NULL, category text DEFAULT 'other', raised_by uuid, assigned_to uuid, priority text DEFAULT 'medium', status text DEFAULT 'open', description text, resolution_notes text, created_at timestamptz NOT NULL DEFAULT now(), resolved_at timestamptz);
ALTER TABLE helpdesk_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tickets_all" ON helpdesk_tickets FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS accommodations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), camp_name text NOT NULL, location text, total_beds integer DEFAULT 0, occupied_beds integer DEFAULT 0, cost_per_bed numeric DEFAULT 0, status text DEFAULT 'active', created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE accommodations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accommodations_all" ON accommodations FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS vehicles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), vehicle_no text, make_model text, plate_number text, type text DEFAULT 'car', assigned_driver uuid, capacity integer, status text DEFAULT 'active', registration_expiry date, created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vehicles_all" ON vehicles FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS trip_logs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL, driver_id uuid, date date DEFAULT CURRENT_DATE, from_location text, to_location text, purpose text, km numeric DEFAULT 0, fuel_cost numeric DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE trip_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trips_all" ON trip_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS facilities (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, client_id uuid REFERENCES clients(id) ON DELETE SET NULL, location text, emirate text, type text DEFAULT 'office', area_sqm numeric, contract_type text, status text DEFAULT 'active', created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "facilities_all" ON facilities FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS invitations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL, role text DEFAULT 'staff', invited_by uuid, token text DEFAULT gen_random_uuid()::text, status text DEFAULT 'pending', expires_at timestamptz DEFAULT (now() + interval '7 days'), created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invitations_all" ON invitations FOR ALL TO authenticated USING (true) WITH CHECK (true);
