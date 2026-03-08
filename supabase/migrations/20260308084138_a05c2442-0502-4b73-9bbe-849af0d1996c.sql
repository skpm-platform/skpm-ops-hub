
-- Drop all RESTRICTIVE policies and recreate as PERMISSIVE

-- attendance policies
DROP POLICY IF EXISTS "Admins can read all attendance" ON public.attendance;
DROP POLICY IF EXISTS "Users can insert own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Users can read own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Users can update own attendance" ON public.attendance;

CREATE POLICY "Users can read own attendance" ON public.attendance FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all attendance" ON public.attendance FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert own attendance" ON public.attendance FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own attendance" ON public.attendance FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- documents policies
DROP POLICY IF EXISTS "Admins can manage all documents" ON public.documents;
DROP POLICY IF EXISTS "Admins can read all documents" ON public.documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can insert documents" ON public.documents;
DROP POLICY IF EXISTS "Users can read own documents" ON public.documents;

CREATE POLICY "Users can read own documents" ON public.documents FOR SELECT TO authenticated USING (auth.uid() = uploaded_by);
CREATE POLICY "Admins can read all documents" ON public.documents FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert documents" ON public.documents FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY "Users can delete own documents" ON public.documents FOR DELETE TO authenticated USING (auth.uid() = uploaded_by);
CREATE POLICY "Admins can manage all documents" ON public.documents FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- profiles policies
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- tasks policies
DROP POLICY IF EXISTS "Admins can manage all tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can read all tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can read assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update assigned tasks" ON public.tasks;

CREATE POLICY "Users can read assigned tasks" ON public.tasks FOR SELECT TO authenticated USING (auth.uid() = assigned_to OR auth.uid() = created_by);
CREATE POLICY "Admins can read all tasks" ON public.tasks FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update assigned tasks" ON public.tasks FOR UPDATE TO authenticated USING (auth.uid() = assigned_to OR auth.uid() = created_by);
CREATE POLICY "Admins can manage all tasks" ON public.tasks FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- transactions policies
DROP POLICY IF EXISTS "Admins can manage all transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can read all transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can insert transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can read own transactions" ON public.transactions;

CREATE POLICY "Users can read own transactions" ON public.transactions FOR SELECT TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Admins can read all transactions" ON public.transactions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert transactions" ON public.transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Admins can manage all transactions" ON public.transactions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- user_roles policies
DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;

CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Add manager to role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager';

-- Add notes column to attendance
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Add Review status to tasks check constraint
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check CHECK (status IN ('todo', 'in_progress', 'review', 'done'));

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true) ON CONFLICT DO NOTHING;

CREATE POLICY "Authenticated users can upload documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');
CREATE POLICY "Authenticated users can read documents" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'documents');
CREATE POLICY "Users can delete own documents" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'documents');
