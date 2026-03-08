
-- System settings key-value store
CREATE TABLE public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings
CREATE POLICY "settings_select" ON public.system_settings FOR SELECT TO authenticated USING (true);

-- Only admins can modify
CREATE POLICY "settings_modify" ON public.system_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed default company logo key
INSERT INTO public.system_settings (key, value) VALUES ('company_logo_url', NULL);
INSERT INTO public.system_settings (key, value) VALUES ('company_name', 'SKPM Technical Services LLC');
