
-- Create role_permissions table
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  module_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(role, module_key)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "role_perms_select" ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "role_perms_modify" ON public.role_permissions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create user_module_permissions table
CREATE TABLE public.user_module_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, module_key)
);

ALTER TABLE public.user_module_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_mod_perms_select" ON public.user_module_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_mod_perms_modify" ON public.user_module_permissions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create accept_invitation function
CREATE OR REPLACE FUNCTION public.accept_invitation(p_token text, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM public.invitations WHERE token = p_token AND status = 'pending';
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;
  
  -- Assign role
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_user_id) THEN
    UPDATE public.user_roles SET role = v_role::app_role WHERE user_id = p_user_id;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (p_user_id, v_role::app_role);
  END IF;
  
  -- Mark invitation as accepted
  UPDATE public.invitations SET status = 'accepted' WHERE token = p_token;
END;
$$;
