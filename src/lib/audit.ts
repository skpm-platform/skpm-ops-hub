import { supabase } from "@/integrations/supabase/client";

export async function logAudit(action: string, details?: string, module?: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    // Sanitize inputs to prevent log injection
    const safeAction = action.replace(/<[^>]*>/g, "").slice(0, 200);
    const safeDetails = details ? details.replace(/<[^>]*>/g, "").slice(0, 1000) : undefined;
    const safeModule = module ? module.replace(/<[^>]*>/g, "").slice(0, 100) : undefined;
    
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: safeAction,
      details: safeDetails,
      module: safeModule || undefined,
    });
  } catch {
    // Silently fail - audit logging should not break the app
  }
}
