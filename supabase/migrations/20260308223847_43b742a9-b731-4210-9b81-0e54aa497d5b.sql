-- Auto-delete notifications older than 30 days
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE created_at < now() - interval '30 days';
END;
$$;

-- Allow users to delete ALL their own notifications (not just read ones)
DROP FUNCTION IF EXISTS public.delete_user_notifications(uuid);
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
  DELETE FROM public.notifications WHERE user_id = _user_id;
END;
$$;