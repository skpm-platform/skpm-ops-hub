import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Shield, Info } from "lucide-react";

// All modules in the system with their keys and labels
const ALL_MODULES = [
  { key: "dashboard", label: "Dashboard", group: "Overview" },
  { key: "my-profile", label: "My Profile", group: "Overview" },
  { key: "approvals", label: "Approvals", group: "Overview" },
  { key: "projects", label: "Projects", group: "Operations" },
  { key: "tasks", label: "Tasks", group: "Operations" },
  { key: "work-orders", label: "Work Orders", group: "Operations" },
  { key: "maintenance", label: "Maintenance", group: "Operations" },
  { key: "finance", label: "Finance", group: "Finance" },
  { key: "quotations", label: "Quotations", group: "Finance" },
  { key: "invoices", label: "Invoices", group: "Finance" },
  { key: "expenses", label: "Expenses", group: "Finance" },
  { key: "purchase-orders", label: "Purchase Orders", group: "Finance" },
  { key: "financial-reports", label: "Financial Reports", group: "Finance" },
  { key: "clients", label: "Clients", group: "Clients & Contracts" },
  { key: "contracts", label: "Contracts", group: "Clients & Contracts" },
  { key: "employees", label: "Employees", group: "People" },
  { key: "attendance", label: "Attendance", group: "People" },
  { key: "leave", label: "Leave", group: "People" },
  { key: "manpower", label: "Manpower", group: "People" },
  { key: "requisitions", label: "Requisitions", group: "People" },
  { key: "deployments", label: "Deployments", group: "People" },
  { key: "payroll", label: "Payroll", group: "People" },
  { key: "timesheets", label: "Timesheets", group: "People" },
  { key: "duty-roster", label: "Duty Roster", group: "People" },
  { key: "gate-passes", label: "Gate Passes", group: "Site Access" },
  { key: "mp-billing", label: "MP Billing", group: "Site Access" },
  { key: "assets", label: "Assets", group: "Assets & Inventory" },
  { key: "warehouse", label: "Warehouse", group: "Assets & Inventory" },
  { key: "hse", label: "Health & Safety", group: "HSE" },
  { key: "training", label: "Training", group: "HSE" },
  { key: "facilities", label: "Facilities", group: "Facilities" },
  { key: "sites", label: "Sites", group: "Facilities" },
  { key: "accommodation", label: "Accommodation", group: "Facilities" },
  { key: "transport", label: "Transport", group: "Facilities" },
  { key: "calendar", label: "Calendar", group: "Communication" },
  { key: "announcements", label: "Announcements", group: "Communication" },
  { key: "documents", label: "Documents", group: "Communication" },
  { key: "reports", label: "Reports", group: "Communication" },
  { key: "helpdesk", label: "Helpdesk", group: "IT & Admin" },
  { key: "visitor-log", label: "Visitor Log", group: "IT & Admin" },
  { key: "members", label: "Members", group: "Admin" },
  { key: "audit-logs", label: "Audit Logs", group: "Admin" },
  { key: "settings", label: "Settings", group: "Admin" },
];

const ROLES = ["manager", "staff"] as const;
const ROLE_LABELS = { manager: "Manager", staff: "Staff" };
const ROLE_COLORS = { manager: "bg-blue-100 text-blue-700", staff: "bg-gray-100 text-gray-700" };

// Default: what is enabled by default for each role
const ROLE_DEFAULTS: Record<string, Record<string, boolean>> = {
  manager: {
    members: false, "audit-logs": false, settings: false,
  },
  staff: {
    members: false, "audit-logs": false, settings: false,
    finance: false, "purchase-orders": false, payroll: false,
    "mp-billing": false, approvals: false, "financial-reports": false,
  },
};

export function PermissionsMatrix() {
  const qc = useQueryClient();

  const { data: allPerms = [], isLoading } = useQuery({
    queryKey: ["all-role-permissions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("role_permissions").select("*");
      if (error) return [];
      return data ?? [];
    },
  });

  const savePerm = useMutation({
    mutationFn: async ({ role, module_key, enabled }: { role: string; module_key: string; enabled: boolean }) => {
      const { error } = await supabase.from("role_permissions").upsert(
        { role, module_key, enabled, updated_at: new Date().toISOString() },
        { onConflict: "role,module_key" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-role-permissions"] });
      qc.invalidateQueries({ queryKey: ["role-permissions"] });
      toast.success("Permission updated");
    },
    onError: (e: Error) => toast.error(`Failed: ${e.message}`),
  });

  const getEnabled = (role: string, moduleKey: string): boolean => {
    const perm = allPerms.find((p: any) => p.role === role && p.module_key === moduleKey);
    if (perm) return perm.enabled;
    const defaults = ROLE_DEFAULTS[role] ?? {};
    return !(moduleKey in defaults) || defaults[moduleKey];
  };

  const handleToggle = (role: string, moduleKey: string, current: boolean) => {
    savePerm.mutate({ role, module_key: moduleKey, enabled: !current });
  };

  // Group modules
  const groups = [...new Set(ALL_MODULES.map(m => m.group))];

  if (isLoading) return <p className="text-muted-foreground text-sm py-4">Loading permissions...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
        <Info className="h-4 w-4 text-blue-600 shrink-0" />
        <p className="text-sm text-blue-700 dark:text-blue-300">
          <strong>Admin</strong> always has full access to everything. Configure access for <strong>Manager</strong> and <strong>Staff</strong> roles below.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground w-48">Module</th>
              {ROLES.map(role => (
                <th key={role} className="py-3 px-6 text-center">
                  <Badge className={`${ROLE_COLORS[role]} border-0 text-xs`}>{ROLE_LABELS[role]}</Badge>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map(group => (
              <>
                <tr key={`group-${group}`} className="bg-muted/30">
                  <td colSpan={3} className="py-2 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {group}
                  </td>
                </tr>
                {ALL_MODULES.filter(m => m.group === group).map(module => (
                  <tr key={module.key} className="border-b border-muted/50 hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 px-4 font-medium">{module.label}</td>
                    {ROLES.map(role => {
                      const enabled = getEnabled(role, module.key);
                      return (
                        <td key={role} className="py-2.5 px-6 text-center">
                          <Switch
                            checked={enabled}
                            onCheckedChange={() => handleToggle(role, module.key, enabled)}
                            disabled={savePerm.isPending}
                            className="data-[state=checked]:bg-green-500"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
