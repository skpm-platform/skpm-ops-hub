
-- Gate Passes
CREATE TABLE public.gate_passes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pass_no TEXT,
  worker_id UUID REFERENCES public.workers(id),
  site_id UUID REFERENCES public.sites(id),
  pass_type TEXT DEFAULT 'entry',
  valid_from DATE DEFAULT CURRENT_DATE,
  valid_until DATE,
  status TEXT DEFAULT 'active',
  issued_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gate_passes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gate_passes_all" ON public.gate_passes FOR ALL USING (true) WITH CHECK (true);

-- Timesheets
CREATE TABLE public.timesheets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES public.employees(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  hours_worked NUMERIC DEFAULT 0,
  overtime_hours NUMERIC DEFAULT 0,
  project_id UUID REFERENCES public.projects(id),
  site_id UUID REFERENCES public.sites(id),
  status TEXT DEFAULT 'draft',
  approved_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "timesheets_all" ON public.timesheets FOR ALL USING (true) WITH CHECK (true);

-- Duty Roster
CREATE TABLE public.duty_roster (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES public.employees(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  shift TEXT DEFAULT 'day',
  site_id UUID REFERENCES public.sites(id),
  start_time TIME,
  end_time TIME,
  status TEXT DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.duty_roster ENABLE ROW LEVEL SECURITY;
CREATE POLICY "duty_roster_all" ON public.duty_roster FOR ALL USING (true) WITH CHECK (true);

-- MP Billing
CREATE TABLE public.mp_billing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id),
  project_id UUID REFERENCES public.projects(id),
  month INTEGER NOT NULL DEFAULT 1,
  year INTEGER NOT NULL DEFAULT 2026,
  total_workers INTEGER DEFAULT 0,
  total_days INTEGER DEFAULT 0,
  rate NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mp_billing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mp_billing_all" ON public.mp_billing FOR ALL USING (true) WITH CHECK (true);
