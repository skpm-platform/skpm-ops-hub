import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/use-profile";
import { logAudit } from "@/lib/audit";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  Search, Users, Pencil, Eye, ShieldCheck, UserPlus, Mail, Loader2, 
  Trash2, KeyRound, RefreshCw, XCircle, AlertTriangle, Shield, Settings2,
  UserCheck, UserX, ChevronDown, ChevronUp, Lock
} from "lucide-react";
import { PhotoUpload } from "@/components/PhotoUpload";
import { PermissionsMatrix } from "@/components/PermissionsMatrix";
import { toast } from "sonner";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { StatusFilter } from "@/components/StatusFilter";
import { ExportButton } from "@/components/ExportButton";

const ALL_MODULES = [
  { key: "dashboard", label: "Dashboard" }, { key: "my-profile", label: "My Profile" },
  { key: "approvals", label: "Approvals" }, { key: "projects", label: "Projects" },
  { key: "tasks", label: "Tasks" }, { key: "work-orders", label: "Work Orders" },
  { key: "maintenance", label: "Maintenance" }, { key: "finance", label: "Finance" },
  { key: "quotations", label: "Quotations" }, { key: "invoices", label: "Invoices" },
  { key: "expenses", label: "Expenses" }, { key: "purchase-orders", label: "Purchase Orders" },
  { key: "clients", label: "Clients" }, { key: "contracts", label: "Contracts" },
  { key: "employees", label: "Employees" }, { key: "attendance", label: "Attendance" },
  { key: "leave", label: "Leave" }, { key: "manpower", label: "Manpower" },
  { key: "requisitions", label: "Requisitions" }, { key: "deployments", label: "Deployments" },
  { key: "payroll", label: "Payroll" }, { key: "timesheets", label: "Timesheets" },
  { key: "duty-roster", label: "Duty Roster" }, { key: "gate-passes", label: "Gate Passes" },
  { key: "mp-billing", label: "MP Billing" }, { key: "assets", label: "Assets" },
  { key: "warehouse", label: "Warehouse" }, { key: "hse", label: "Health & Safety" },
  { key: "training", label: "Training" }, { key: "facilities", label: "Facilities" },
  { key: "sites", label: "Sites" }, { key: "accommodation", label: "Accommodation" },
  { key: "transport", label: "Transport" }, { key: "calendar", label: "Calendar" },
  { key: "announcements", label: "Announcements" }, { key: "documents", label: "Documents" },
  { key: "reports", label: "Reports" }, { key: "helpdesk", label: "Helpdesk" },
  { key: "visitor-log", label: "Visitor Log" }, { key: "members", label: "Members" },
  { key: "audit-logs", label: "Audit Logs" }, { key: "settings", label: "Settings" },
];

export default function Members() {
  const { user } = useAuth();
  const { data: currentRole } = useUserRole();
  const isAdmin = currentRole === "admin";
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [viewing, setViewing] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [showModuleOverrides, setShowModuleOverrides] = useState(false);
  const [form, setForm] = useState({ name: "", status: "active", avatar_url: "", role: "staff" });
  const [inviteForm, setInviteForm] = useState({ email: "", role: "staff" });
  const [deletingMember, setDeletingMember] = useState<any>(null);

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["all-roles"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("*");
      return data ?? [];
    },
  });

  const { data: invitations = [] } = useQuery({
    queryKey: ["invitations"],
    queryFn: async () => {
      const { data } = await supabase.from("invitations").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: isAdmin,
  });

  const { data: userModulePerms = [] } = useQuery({
    queryKey: ["all-user-module-perms"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_module_permissions").select("*");
      if (error) return [];
      return data ?? [];
    },
    enabled: isAdmin,
  });

  const updateMember = useMutation({
    mutationFn: async () => {
      if (!editingId || !editingUserId) return;
      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ name: form.name, status: form.status, avatar_url: form.avatar_url || null })
        .eq("id", editingId);
      if (profileError) throw profileError;
      // Update role
      const { error: roleError } = await supabase
        .from("user_roles")
        .upsert({ user_id: editingUserId, role: form.role }, { onConflict: "user_id" });
      if (roleError) throw roleError;
      await logAudit("Updated member", `Updated ${form.name}: role=${form.role}, status=${form.status}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["all-roles"] });
      toast.success("Member updated successfully");
      setEditOpen(false);
      setEditingId(null);
      setEditingUserId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deactivateMember = useMutation({
    mutationFn: async (profileId: string) => {
      const { error } = await supabase.from("profiles").update({ status: "inactive" }).eq("id", profileId);
      if (error) throw error;
      await logAudit("Deactivated member", `Deactivated profile ${profileId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members"] });
      toast.success("Member deactivated");
      setDeleteConfirmOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reactivateMember = useMutation({
    mutationFn: async (profileId: string) => {
      const { error } = await supabase.from("profiles").update({ status: "active" }).eq("id", profileId);
      if (error) throw error;
      await logAudit("Reactivated member", `Reactivated profile ${profileId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members"] });
      toast.success("Member reactivated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetPassword = useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      await logAudit("Password reset", `Sent password reset to ${email}`);
    },
    onSuccess: () => toast.success("Password reset email sent"),
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelInvitation = useMutation({
    mutationFn: async (invId: string) => {
      const { error } = await supabase.from("invitations").update({ status: "cancelled" }).eq("id", invId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invitations"] });
      toast.success("Invitation cancelled");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resendInvitation = useMutation({
    mutationFn: async (inv: any) => {
      // Update timestamp to mark as resent
      const { error } = await supabase.from("invitations").update({ created_at: new Date().toISOString() }).eq("id", inv.id);
      if (error) throw error;
      await logAudit("Resent invitation", `Resent invitation to ${inv.email}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invitations"] });
      toast.success("Invitation resent (timestamp updated)");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sendInvite = useMutation({
    mutationFn: async () => {
      if (!inviteForm.email) throw new Error("Email is required");
      const existing = invitations.find((i: any) => i.email === inviteForm.email && i.status === "pending");
      if (existing) throw new Error("Invitation already pending for this email");
      const { error } = await supabase.from("invitations").insert({
        email: inviteForm.email,
        role: inviteForm.role,
        invited_by: user?.id,
      });
      if (error) throw error;
      await logAudit("Sent invitation", `Invited ${inviteForm.email} as ${inviteForm.role}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invitations"] });
      toast.success("Invitation created");
      setInviteOpen(false);
      setInviteForm({ email: "", role: "staff" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveModuleOverride = useMutation({
    mutationFn: async ({ userId, moduleKey, enabled }: { userId: string; moduleKey: string; enabled: boolean }) => {
      const { error } = await supabase.from("user_module_permissions").upsert(
        { user_id: userId, module_key: moduleKey, enabled },
        { onConflict: "user_id,module_key" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-user-module-perms"] });
      qc.invalidateQueries({ queryKey: ["user-module-permissions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const getRoleForUser = (userId: string) => {
    const role = roles.find((r: any) => r.user_id === userId);
    return (role as any)?.role ?? "staff";
  };

  const getUserModuleOverride = (userId: string, moduleKey: string): boolean | null => {
    const perm = userModulePerms.find((p: any) => p.user_id === userId && p.module_key === moduleKey);
    return perm ? perm.enabled : null;
  };

  const getInitials = (name: string) => (name || "U").split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();

  const getRoleBadgeClass = (role: string) => {
    if (role === "admin") return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
    if (role === "manager") return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
    return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  };

  const filtered = profiles.filter((m: any) => {
    if (m.name === "System Super Admin") return false;
    const matchSearch = (m.name?.toLowerCase() ?? "").includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || (m.status ?? "active") === statusFilter;
    return matchSearch && matchStatus;
  });

  const statuses = [
    { value: "all", label: "All", count: profiles.length },
    { value: "active", label: "Active", count: profiles.filter((m: any) => (m.status ?? "active") === "active").length },
    { value: "inactive", label: "Inactive", count: profiles.filter((m: any) => m.status === "inactive").length },
  ];

  const adminCount = roles.filter((r: any) => r.role === "admin").length;
  const managerCount = roles.filter((r: any) => r.role === "manager").length;
  const staffCount = roles.filter((r: any) => r.role === "staff").length;
  const pendingInvites = invitations.filter((i: any) => i.status === "pending").length;

  const handleEdit = (m: any) => {
    setEditingId(m.id);
    setEditingUserId(m.user_id);
    const role = getRoleForUser(m.user_id);
    setForm({ name: m.name ?? "", status: m.status ?? "active", avatar_url: m.avatar_url ?? "", role });
    setShowModuleOverrides(false);
    setEditOpen(true);
  };

  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Users className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Members</h1>
            <p className="text-sm text-muted-foreground">{profiles.length} registered users</p>
          </div>
        </div>
        <div className="flex gap-2">
          <ExportButton
            data={filtered.map((m: any) => ({ name: m.name, status: m.status, role: getRoleForUser(m.user_id), joined: m.created_at?.slice(0, 10) }))}
            filename="members"
            columns={[{ key: "name", label: "Name" }, { key: "role", label: "Role" }, { key: "status", label: "Status" }, { key: "joined", label: "Joined" }]}
          />
          {isAdmin && (
            <Button size="sm" className="h-9" onClick={() => setInviteOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" /> Invite User
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-5">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p><p className="text-2xl font-bold">{profiles.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Active</p><p className="text-2xl font-bold text-green-600">{profiles.filter((m: any) => (m.status ?? "active") === "active").length}</p></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-2"><div><p className="text-xs text-muted-foreground uppercase tracking-wider">Admins</p><p className="text-2xl font-bold text-red-600">{adminCount}</p></div><ShieldCheck className="h-5 w-5 text-red-400 opacity-50" /></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Managers</p><p className="text-2xl font-bold text-blue-600">{managerCount}</p></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-2"><div><p className="text-xs text-muted-foreground uppercase tracking-wider">Pending Invites</p><p className="text-2xl font-bold text-yellow-600">{pendingInvites}</p></div><Mail className="h-5 w-5 text-yellow-400 opacity-50" /></CardContent></Card>
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members" className="flex items-center gap-2"><Users className="h-4 w-4" /> Members</TabsTrigger>
          {isAdmin && <TabsTrigger value="permissions" className="flex items-center gap-2"><Shield className="h-4 w-4" /> Role Permissions</TabsTrigger>}
          {isAdmin && <TabsTrigger value="invitations" className="flex items-center gap-2"><Mail className="h-4 w-4" /> Invitations {pendingInvites > 0 && <Badge className="ml-1 h-4 px-1 text-xs bg-yellow-500">{pendingInvites}</Badge>}</TabsTrigger>}
        </TabsList>

        {/* Members Tab */}
        <TabsContent value="members">
          <Card><CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search members..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
              <StatusFilter statuses={statuses} selected={statusFilter} onSelect={setStatusFilter} />
            </div>
            {isLoading ? <p className="text-muted-foreground text-sm">Loading...</p> : filtered.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No members found</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table><TableHeader><TableRow>
                    <SortableHeader label="Member" sortKey="name" direction={getSortDirection("name")} onToggle={toggleSort} />
                    <SortableHeader label="Role" sortKey="role" direction={getSortDirection("role")} onToggle={toggleSort} />
                    <SortableHeader label="Status" sortKey="status" direction={getSortDirection("status")} onToggle={toggleSort} />
                    <SortableHeader label="Joined" sortKey="created_at" direction={getSortDirection("created_at")} onToggle={toggleSort} />
                    <SortableHeader label="Actions" sortKey="" direction={null} onToggle={() => {}} />
                  </TableRow></TableHeader>
                    <TableBody>{pageData.map((m: any) => {
                      const role = getRoleForUser(m.user_id);
                      const isInactive = (m.status ?? "active") === "inactive";
                      return (
                        <TableRow key={m.id} className={isInactive ? "opacity-60" : ""}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                {m.avatar_url && <AvatarImage src={m.avatar_url} />}
                                <AvatarFallback className="bg-primary/10 text-primary text-xs">{getInitials(m.name)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <span className="font-medium">{m.name ?? "Unnamed"}</span>
                                {m.user_id === user?.id && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getRoleBadgeClass(role)} border-0 capitalize text-xs`}>{role}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={(m.status ?? "active") === "active" ? "default" : "secondary"} className="capitalize">
                              {m.status ?? "active"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{m.created_at?.slice(0, 10)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" title="View" onClick={() => { setViewing({ ...m, role }); setViewOpen(true); }}><Eye className="h-3.5 w-3.5" /></Button>
                              {isAdmin && <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit" onClick={() => handleEdit(m)}><Pencil className="h-3.5 w-3.5" /></Button>}
                              {isAdmin && isInactive && m.user_id !== user?.id && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" title="Reactivate" onClick={() => reactivateMember.mutate(m.id)}><UserCheck className="h-3.5 w-3.5" /></Button>
                              )}
                              {isAdmin && !isInactive && m.user_id !== user?.id && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Deactivate" onClick={() => { setDeletingMember(m); setDeleteConfirmOpen(true); }}><UserX className="h-3.5 w-3.5" /></Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}</TableBody></Table>
                </div>
                <DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
              </>
            )}
          </CardContent></Card>
        </TabsContent>

        {/* Role Permissions Tab */}
        {isAdmin && (
          <TabsContent value="permissions">
            <Card><CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Role Permissions Matrix</h2>
              </div>
              <PermissionsMatrix />
            </CardContent></Card>
          </TabsContent>
        )}

        {/* Invitations Tab */}
        {isAdmin && (
          <TabsContent value="invitations">
            <Card><CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Invitations</h2>
                <Button size="sm" onClick={() => setInviteOpen(true)}><UserPlus className="h-4 w-4 mr-2" /> Invite User</Button>
              </div>
              {invitations.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4">No invitations yet</p>
              ) : (
                <div className="space-y-2">
                  {invitations.map((inv: any) => (
                    <div key={inv.id} className="flex items-center justify-between py-3 px-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                      <div>
                        <p className="font-medium text-sm">{inv.email}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Role: <span className="capitalize font-medium">{inv.role}</span> • Sent: {inv.created_at?.slice(0, 10)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={
                            inv.status === "pending" ? "bg-yellow-100 text-yellow-700 border-0" :
                            inv.status === "accepted" ? "bg-green-100 text-green-700 border-0" :
                            "bg-gray-100 text-gray-600 border-0"
                          }
                        >
                          {inv.status}
                        </Badge>
                        {inv.status === "pending" && (
                          <>
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => resendInvitation.mutate(inv)}
                              disabled={resendInvitation.isPending}>
                              <RefreshCw className="h-3 w-3 mr-1" /> Resend
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive"
                              onClick={() => cancelInvitation.mutate(inv.id)} disabled={cancelInvitation.isPending}>
                              <XCircle className="h-3 w-3 mr-1" /> Cancel
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent></Card>
          </TabsContent>
        )}
      </Tabs>

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}><DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Member Details</DialogTitle></DialogHeader>
        {viewing && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                {viewing.avatar_url && <AvatarImage src={viewing.avatar_url} />}
                <AvatarFallback className="bg-primary text-primary-foreground text-xl">{getInitials(viewing.name)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-lg">{viewing.name ?? "Unnamed"}</p>
                <Badge className={`${getRoleBadgeClass(viewing.role)} border-0 capitalize`}>{viewing.role}</Badge>
                {viewing.user_id === user?.id && <p className="text-xs text-muted-foreground mt-1">This is you</p>}
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ["Status", viewing.status ?? "active"],
                ["Joined", viewing.created_at?.slice(0, 10)],
                ["Last Updated", viewing.updated_at?.slice(0, 10)],
                ["User ID", viewing.user_id?.slice(0, 8) + "..."],
              ].map(([l, v]) => (
                <div key={l as string}><p className="text-muted-foreground text-xs mb-0.5">{l}</p><p className="font-medium">{v || "—"}</p></div>
              ))}
            </div>
            {isAdmin && (
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => { setViewOpen(false); handleEdit(viewing); }}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                </Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => resetPassword.mutate(viewing.email ?? "")}
                  disabled={resetPassword.isPending}>
                  <KeyRound className="h-3.5 w-3.5 mr-1.5" /> Reset Password
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent></Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) { setEditingId(null); setEditingUserId(null); } }}><DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit Member</DialogTitle><DialogDescription>Update member details, role, and module access</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <PhotoUpload value={form.avatar_url} onChange={(url) => setForm({ ...form, avatar_url: url || "" })} label="Profile Photo" size="md" folder="avatars" />
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Full Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Enter full name" /></div>
            <div>
              <Label>Role</Label>
              <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-red-500" /> Admin — Full access</div>
                  </SelectItem>
                  <SelectItem value="manager">
                    <div className="flex items-center gap-2"><Shield className="h-3.5 w-3.5 text-blue-500" /> Manager — Manage & approve</div>
                  </SelectItem>
                  <SelectItem value="staff">
                    <div className="flex items-center gap-2"><Lock className="h-3.5 w-3.5 text-gray-500" /> Staff — Standard access</div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Module Access Overrides */}
          {editingUserId && (
            <div className="border rounded-lg overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-3 text-sm font-medium hover:bg-muted/50 transition-colors"
                onClick={() => setShowModuleOverrides(!showModuleOverrides)}
              >
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-muted-foreground" />
                  <span>Module Access Overrides</span>
                  <span className="text-xs text-muted-foreground font-normal">(optional, per-user)</span>
                </div>
                {showModuleOverrides ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {showModuleOverrides && (
                <div className="border-t p-3 max-h-64 overflow-y-auto">
                  <p className="text-xs text-muted-foreground mb-3">Override role defaults for this specific user. Leave unset to use role defaults.</p>
                  <div className="space-y-2">
                    {ALL_MODULES.map(mod => {
                      const override = getUserModuleOverride(editingUserId, mod.key);
                      return (
                        <div key={mod.key} className="flex items-center justify-between py-1">
                          <span className="text-sm">{mod.label}</span>
                          <div className="flex items-center gap-2">
                            {override !== null ? (
                              <>
                                <Switch
                                  checked={override}
                                  onCheckedChange={(v) => saveModuleOverride.mutate({ userId: editingUserId, moduleKey: mod.key, enabled: v })}
                                  className="data-[state=checked]:bg-green-500"
                                />
                                <Button
                                  variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground hover:text-destructive"
                                  onClick={async () => {
                                    await supabase.from("user_module_permissions").delete()
                                      .eq("user_id", editingUserId).eq("module_key", mod.key);
                                    qc.invalidateQueries({ queryKey: ["all-user-module-perms"] });
                                    toast.success("Override cleared");
                                  }}
                                >Clear</Button>
                              </>
                            ) : (
                              <Button
                                variant="ghost" size="sm" className="h-6 text-xs"
                                onClick={() => saveModuleOverride.mutate({ userId: editingUserId, moduleKey: mod.key, enabled: true })}
                              >
                                + Override
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Save Button */}
          <div className="flex gap-2 pt-1">
            <Button className="flex-1 h-9" onClick={() => updateMember.mutate()} disabled={!form.name || updateMember.isPending}>
              {updateMember.isPending ? <><Loader2 className="animate-spin mr-2 h-4 w-4" /> Saving...</> : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent></Dialog>

      {/* Deactivate Confirm Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}><DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-yellow-500" /> Deactivate Member</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">
          Are you sure you want to deactivate <strong>{deletingMember?.name}</strong>? They will lose access to the system but their data will be preserved.
        </p>
        <div className="flex gap-2 mt-2">
          <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button variant="destructive" className="flex-1" onClick={() => deactivateMember.mutate(deletingMember?.id)} disabled={deactivateMember.isPending}>
            {deactivateMember.isPending ? "Deactivating..." : "Deactivate"}
          </Button>
        </div>
      </DialogContent></Dialog>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}><DialogContent>
        <DialogHeader><DialogTitle>Invite New User</DialogTitle><DialogDescription>Send an invitation to a new team member.</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div><Label>Email Address</Label><Input type="email" placeholder="user@company.com" value={inviteForm.email} onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })} /></div>
          <div><Label>Role</Label>
            <Select value={inviteForm.role} onValueChange={v => setInviteForm({ ...inviteForm, role: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin — Full system access</SelectItem>
                <SelectItem value="manager">Manager — Manage teams & approve</SelectItem>
                <SelectItem value="staff">Staff — Standard access</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Role Permissions:</p>
            <p>• <strong>Admin</strong>: Full access to all modules including settings, audit logs, and member management</p>
            <p>• <strong>Manager</strong>: Access to operations, approvals, payroll, and finance (no admin settings)</p>
            <p>• <strong>Staff</strong>: Access to daily operations — tasks, timesheets, requests, and attendance</p>
          </div>
          <Button className="w-full h-9" onClick={() => sendInvite.mutate()} disabled={!inviteForm.email || sendInvite.isPending}>
            {sendInvite.isPending && <Loader2 className="animate-spin mr-2 h-4 w-4" />} Send Invitation
          </Button>
        </div>
      </DialogContent></Dialog>
    </div>
  );
}
