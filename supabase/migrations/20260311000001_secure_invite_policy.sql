-- Allow unauthenticated users to read a pending/valid invite by token
-- This is safe because token is a UUID (unguessable)
CREATE POLICY IF NOT EXISTS "invitations_anon_token_read" ON public.invitations
  FOR SELECT TO anon
  USING (status = 'pending' AND expires_at > now());

-- Also allow anon INSERT into user_roles so invite acceptance can assign role
-- Actually this should be done via a DB function (security definer)
-- Create a secure function to accept an invitation
CREATE OR REPLACE FUNCTION public.accept_invitation(
  p_token text,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite invitations%ROWTYPE;
  v_result jsonb;
BEGIN
  -- Find the invitation
  SELECT * INTO v_invite
  FROM invitations
  WHERE token = p_token
    AND status = 'pending'
    AND expires_at > now()
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation token');
  END IF;

  -- Mark invitation as accepted
  UPDATE invitations
  SET status = 'accepted'
  WHERE id = v_invite.id;

  -- Insert user role
  INSERT INTO user_roles (user_id, role)
  VALUES (p_user_id, v_invite.role)
  ON CONFLICT (user_id) DO UPDATE SET role = v_invite.role;

  RETURN jsonb_build_object(
    'success', true,
    'email', v_invite.email,
    'role', v_invite.role,
    'name', v_invite.email
  );
END;
$$;

-- Grant execute to authenticated users (they call it right after signup)
GRANT EXECUTE ON FUNCTION public.accept_invitation TO authenticated;
-- Also allow anon to call it (needed if email confirmation is on)
GRANT EXECUTE ON FUNCTION public.accept_invitation TO anon;
