
-- Add trigger to set updated_at on profiles
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'profiles_updated_at') THEN
    CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tasks_updated_at') THEN
    CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Unique constraint on system_settings key
CREATE UNIQUE INDEX IF NOT EXISTS system_settings_key_unique ON public.system_settings (key);

-- Add missing delete policies (skip if exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='training_programs' AND policyname='training_delete_admin') THEN
    CREATE POLICY "training_delete_admin" ON public.training_programs FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='vehicles' AND policyname='vehicles_delete_admin') THEN
    CREATE POLICY "vehicles_delete_admin" ON public.vehicles FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='trip_logs' AND policyname='trip_logs_delete') THEN
    CREATE POLICY "trip_logs_delete" ON public.trip_logs FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='workers' AND policyname='workers_delete_admin') THEN
    CREATE POLICY "workers_delete_admin" ON public.workers FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON public.system_settings (key);
