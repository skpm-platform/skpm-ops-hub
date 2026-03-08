import { supabase } from "@/integrations/supabase/client";

export async function logAudit(action: string, details?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action,
    details,
  });
}
