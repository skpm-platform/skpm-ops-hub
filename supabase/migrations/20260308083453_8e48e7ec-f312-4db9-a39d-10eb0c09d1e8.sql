
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'staff');

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'staff',
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT,
  avatar_url TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Attendance table
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'present',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC NOT NULL,
  category TEXT,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date DATE,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Documents table
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  file_url TEXT,
  category TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Updated at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'staff');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies

-- User roles: users can read their own, admins can read all
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Profiles: users see own, admins see all
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Attendance: staff see own, admin sees all
CREATE POLICY "Users can read own attendance" ON public.attendance FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all attendance" ON public.attendance FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert own attendance" ON public.attendance FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own attendance" ON public.attendance FOR UPDATE USING (auth.uid() = user_id);

-- Transactions: staff see own, admin sees all
CREATE POLICY "Users can read own transactions" ON public.transactions FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Admins can read all transactions" ON public.transactions FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Admins can manage all transactions" ON public.transactions FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Tasks: staff see assigned, admin sees all
CREATE POLICY "Users can read assigned tasks" ON public.tasks FOR SELECT USING (auth.uid() = assigned_to OR auth.uid() = created_by);
CREATE POLICY "Admins can read all tasks" ON public.tasks FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert tasks" ON public.tasks FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update assigned tasks" ON public.tasks FOR UPDATE USING (auth.uid() = assigned_to OR auth.uid() = created_by);
CREATE POLICY "Admins can manage all tasks" ON public.tasks FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Documents: staff see own, admin sees all
CREATE POLICY "Users can read own documents" ON public.documents FOR SELECT USING (auth.uid() = uploaded_by);
CREATE POLICY "Admins can read all documents" ON public.documents FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert documents" ON public.documents FOR INSERT WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY "Users can delete own documents" ON public.documents FOR DELETE USING (auth.uid() = uploaded_by);
CREATE POLICY "Admins can manage all documents" ON public.documents FOR ALL USING (public.has_role(auth.uid(), 'admin'));
