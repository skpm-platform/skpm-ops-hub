import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/use-profile";

// Default permissions per role (fallback if DB table doesn't exist)
const DEFAULT_PERMISSIONS: Record<string, Record<string, boolean>> = {
  admin: {}, // admins can access everything by default
  manager: {
    // managers can't access admin-only sections by default
    members: false,
    "audit-logs": false,
    settings: false,
  },
  staff: {
    // staff can't access management sections by default
    members: false,
    "audit-logs": false,
    settings: false,
    finance: false,
    "purchase-orders": false,
    payroll: false,
    "mp-billing": false,
    approvals: false,
    "financial-reports": false,
  },
};

export function usePermissions() {
  const { user } = useAuth();
  const { data: role } = useUserRole();

  const { data: rolePerms = [] } = useQuery({
    queryKey: ["role-permissions", role],
    queryFn: async () => {
      if (!role) return [];
      const { data, error } = await supabase
        .from("role_permissions")
        .select("*")
        .eq("role", role);
      if (error) return []; // graceful fallback
      return data ?? [];
    },
    enabled: !!role,
    staleTime: 5 * 60 * 1000,
  });

  const { data: userPerms = [] } = useQuery({
    queryKey: ["user-module-permissions", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_module_permissions")
        .select("*")
        .eq("user_id", user.id);
      if (error) return [];
      return data ?? [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const canAccess = (moduleKey: string): boolean => {
    if (!role) return false;
    // Admin always has access to everything
    if (role === "admin") return true;

    // Check user-specific override first
    const userOverride = userPerms.find((p: any) => p.module_key === moduleKey);
    if (userOverride !== undefined) return userOverride.enabled;

    // Check DB role permissions
    const rolePerm = rolePerms.find((p: any) => p.module_key === moduleKey);
    if (rolePerm !== undefined) return rolePerm.enabled;

    // Fall back to defaults
    const defaults = DEFAULT_PERMISSIONS[role] ?? {};
    if (moduleKey in defaults) return defaults[moduleKey];

    return true; // default allow
  };

  return { canAccess, role, rolePerms, userPerms };
}
