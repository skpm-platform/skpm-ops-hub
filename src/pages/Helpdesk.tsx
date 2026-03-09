import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logAudit } from "@/lib/audit";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Monitor, Pencil, Trash2, Eye, LayoutGrid, List, AlertTriangle, Clock, CheckCircle, Wifi, Printer, Mail, HardDrive, Smartphone, Shield, User } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInHours, formatDistanceToNow } from "date-fns";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { ComboboxSelect } from "@/components/ComboboxSelect";
import { StatusFilter } from "@/components/StatusFilter";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ExportButton } from "@/components/ExportButton";

const catOptions = [
  { value: "hardware", label: "Hardware" }, { value: "software", label: "Software" },
  { value: "network", label: "Network" }, { value: "access", label: "Access/Permissions" },
  { value: "email", label: "Email" }, { value: "printer", label: "Printer" },
  { value: "phone", label: "Phone/Telecom" }, { value: "other", label: "Other" },
];

const catIcons: Record<string, any> = { hardware: HardDrive, software: Monitor, network: Wifi, email: Mail, printer: Printer, phone: Smartphone, access: Shield, other: Monitor };
const prioColors: Record<string, string> = { critical: "bg-destructive/15 text-destructive", high: "bg-warning/15 text-warning", medium: "bg-primary/15 text-primary", low: "bg-muted text-muted-foreground" };
const stColors: Record<string, { bg: string; icon: any }> = {
  open: { bg: "bg-primary/15 text-primary", icon: Clock },
  in_progress: { bg: "bg-warning/15 text-warning", icon: AlertTriangle },
  resolved: { bg: "bg-success/15 text-success", icon: CheckCircle },
  closed: { bg: "bg-muted text-muted-foreground", icon: CheckCircle },
};

const emptyForm = { title: "", category: "other", priority: "medium", description: "", status: "open", assigned_to: "", resolution_notes: "" };

function getSLABreach(ticket: any): boolean {
  if (!ticket.created_at) return false;
  if (ticket.status === "resolved" || ticket.status === "closed") return false;
  const hoursOpen = differenceInHours(new Date(), new Date(ticket.created_at));
  if ((ticket.priority === "high" || ticket.priority === "critical") && hoursOpen > 24) return true;
  if (ticket.priority === "medium" && hoursOpen > 72) return true;
  return false;
}

export default function Helpdesk() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [resolutionNotesDraft, setResolutionNotesDraft] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["tickets"],
    queryFn: async () => { const { data } = await supabase.from("helpdesk_tickets").select("*").order("created_at", { ascending: false }); return data || []; },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-list-hd"],
    queryFn: async () => { const { data } = await (supabase as any).from("employees").select("id, name").order("name"); return data || []; },
  });

  const employeeOptions = employees.map((e: any) => ({ value: e.id, label: e.name }));
  const getAssigneeName = (id: string) => employees.find((e: any) => e.id === id)?.name || id;

  const save = useMutation({
    mutationFn: async () => {
      if (editingId) {
        const { error } = await supabase.from("helpdesk_tickets").update(form).eq("id", editingId);
        if (error) throw error;
        await logAudit("Updated ticket", form.title, "helpdesk");
      } else {
        const { error } = await supabase.from("helpdesk_tickets").insert({ ...form, ticket_no: `TKT-${Date.now().toString().slice(-6)}`, raised_by: user?.id });
        if (error) throw error;
        await logAudit("Created ticket", form.title, "helpdesk");
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tickets"] }); toast.success(editingId ? "Updated" : "Ticket created"); setOpen(false); setEditingId(null); setForm(emptyForm); },
    onError: (e: any) => toast.error(e.message),
  });

  const markResolved = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("helpdesk_tickets").update({ status: "resolved", resolved_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
      await logAudit("Resolved ticket", id, "helpdesk");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tickets"] }); toast.success("Ticket resolved"); setViewOpen(false); setViewing(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const saveResolutionNotes = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase.from("helpdesk_tickets").update({ resolution_notes: notes }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tickets"] }); toast.success("Resolution notes saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("helpdesk_tickets").delete().eq("id", id);
      if (error) throw error;
      await logAudit("Deleted ticket", id, "helpdesk");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tickets"] }); toast.success("Deleted"); setDeleteId(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const handleEdit = (r: any) => {
    setEditingId(r.id);
    setForm({ title: r.title || "", category: r.category || "other", priority: r.priority || "medium", description: r.description || "", status: r.status || "open", assigned_to: r.assigned_to || "", resolution_notes: r.resolution_notes || "" });
    setOpen(true);
  };

  const filtered = data.filter((r: any) => {
    const matchSearch = JSON.stringify(r).toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statuses = [
    { value: "all", label: "All", count: data.length },
    { value: "open", label: "Open", count: data.filter((r: any) => r.status === "open").length },
    { value: "in_progress", label: "In Progress", count: data.filter((r: any) => r.status === "in_progress").length },
    { value: "resolved", label: "Resolved", count: data.filter((r: any) => r.status === "resolved").length },
  ];

  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

  const openCount = data.filter((r: any) => r.status === "open").length;
  const criticalCount = data.filter((r: any) => r.priority === "critical" || r.priority === "high").length;
  const resolvedCount = data.filter((r: any) => r.status === "resolved" || r.status === "closed").length;
  const resolutionRate = data.length > 0 ? Math.round((resolvedCount / data.length) * 100) : 0;
  const avgResponseHours = data.filter((r: any) => r.resolved_at).reduce((s: number, r: any) => s + differenceInHours(new Date(r.resolved_at), new Date(r.created_at)), 0);
  const avgResponse = resolvedCount > 0 ? Math.round(avgResponseHours / resolvedCount) : 0;

  const criticalTickets = data.filter((r: any) => (r.priority === "critical" || r.priority === "high") && r.status === "open");

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Monitor className="h-5 w-5 text-primary" /></div>
          <div><h1 className="text-2xl font-bold">IT Helpdesk</h1><p className="text-sm text-muted-foreground">{data.length} tickets</p></div>
        </div>
        <div className="flex gap-2">
          <ExportButton data={filtered} filename="tickets" columns={[{ key: "ticket_no", label: "Ticket#" }, { key: "title", label: "Title" }, { key: "category", label: "Category" }, { key: "priority", label: "Priority" }, { key: "status", label: "Status" }]} />
          <Button size="sm" className="h-9" onClick={() => { setEditingId(null); setForm(emptyForm); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />New Ticket</Button>
        </div>
      </div>

      {/* Critical Tickets Alert */}
      {criticalTickets.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2"><AlertTriangle className="h-4 w-4 text-destructive" /><span className="text-sm font-semibold text-destructive">{criticalTickets.length} Critical/High Priority Open Tickets</span></div>
            <div className="flex flex-wrap gap-2">
              {criticalTickets.slice(0, 5).map((t: any) => (
                <div key={t.id} className="flex items-center gap-1.5 bg-background rounded-full px-3 py-1 text-xs border">
                  <span className="font-mono text-muted-foreground">{t.ticket_no}</span>
                  <span className="font-medium truncate max-w-[150px]">{t.title}</span>
                  <Badge variant="destructive" className="text-[10px] px-1.5 h-4">{t.priority}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="hover:shadow-md transition-shadow"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p><p className="text-2xl font-bold mt-1">{data.length}</p></div><Monitor className="h-5 w-5 text-muted-foreground" /></div></CardContent></Card>
        <Card className="hover:shadow-md transition-shadow"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase tracking-wider">Open</p><p className="text-2xl font-bold text-primary mt-1">{openCount}</p></div><Clock className="h-5 w-5 text-primary" /></div></CardContent></Card>
        <Card className="hover:shadow-md transition-shadow"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase tracking-wider">Critical/High</p><p className="text-2xl font-bold text-destructive mt-1">{criticalCount}</p></div><AlertTriangle className="h-5 w-5 text-destructive" /></div></CardContent></Card>
        <Card className="hover:shadow-md transition-shadow"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase tracking-wider">Resolution Rate</p><p className="text-2xl font-bold text-success mt-1">{resolutionRate}%</p></div><CheckCircle className="h-5 w-5 text-success" /></div><Progress value={resolutionRate} className="mt-2 h-1.5" /></CardContent></Card>
        <Card className="hover:shadow-md transition-shadow"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase tracking-wider">Avg Resolution</p><p className="text-2xl font-bold mt-1">{avgResponse}h</p></div><Clock className="h-5 w-5 text-muted-foreground" /></div></CardContent></Card>
      </div>

      <Card><CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search tickets..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
          <StatusFilter statuses={statuses} selected={statusFilter} onSelect={setStatusFilter} />
          <div className="flex border rounded-md">
            <Button variant={viewMode === "table" ? "secondary" : "ghost"} size="icon" className="h-9 w-9 rounded-r-none" onClick={() => setViewMode("table")}><List className="h-4 w-4" /></Button>
            <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon" className="h-9 w-9 rounded-l-none" onClick={() => setViewMode("grid")}><LayoutGrid className="h-4 w-4" /></Button>
          </div>
        </div>
        {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No tickets</p> : viewMode === "grid" ? (
          <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pageData.map((r: any) => {
              const CatIcon = catIcons[r.category] || Monitor;
              const st = stColors[r.status] || stColors.open;
              const StIcon = st.icon;
              const slaBreach = getSLABreach(r);
              return (
                <Card key={r.id} className="group hover:shadow-md transition-all hover:-translate-y-0.5">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center"><CatIcon className="h-4 w-4 text-muted-foreground" /></div>
                        <div>
                          <p className="font-mono text-[10px] text-muted-foreground">{r.ticket_no}</p>
                          <h3 className="font-semibold text-sm truncate max-w-[180px]">{r.title}</h3>
                        </div>
                      </div>
                      <Badge variant="secondary" className={`${st.bg} border-0 text-[10px] gap-1`}><StIcon className="h-3 w-3" />{r.status?.replace("_", " ")}</Badge>
                    </div>
                    {r.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{r.description}</p>}
                    {r.assigned_to && <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1"><User className="h-3 w-3" />{getAssigneeName(r.assigned_to)}</p>}
                    <div className="flex items-center justify-between text-xs">
                      <Badge variant="outline" className="capitalize text-[10px]">{r.category}</Badge>
                      <div className="flex gap-1">
                        {slaBreach && <Badge variant="destructive" className="text-[10px] px-1.5">SLA Breached</Badge>}
                        <Badge variant="secondary" className={`${prioColors[r.priority] || ""} border-0 text-[10px]`}>{r.priority}</Badge>
                      </div>
                    </div>
                    {r.created_at && (
                      <p className="text-[10px] text-muted-foreground mt-2">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</p>
                    )}
                    <div className="flex gap-1 mt-3 pt-2 border-t justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setViewing(r); setResolutionNotesDraft(r.resolution_notes || ""); setViewOpen(true); }}><Eye className="h-3 w-3 mr-1" />View</Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleEdit(r)}><Pencil className="h-3 w-3 mr-1" />Edit</Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => setDeleteId(r.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <div className="mt-4"><DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} /></div>
          </>
        ) : (
          <>
          <div className="overflow-x-auto">
          <Table><TableHeader><TableRow>
            <SortableHeader label="Ticket #" sortKey="ticket_no" direction={getSortDirection("ticket_no")} onToggle={toggleSort} />
            <SortableHeader label="Title" sortKey="title" direction={getSortDirection("title")} onToggle={toggleSort} />
            <SortableHeader label="Category" sortKey="category" direction={getSortDirection("category")} onToggle={toggleSort} />
            <SortableHeader label="Priority" sortKey="priority" direction={getSortDirection("priority")} onToggle={toggleSort} />
            <SortableHeader label="Status" sortKey="status" direction={getSortDirection("status")} onToggle={toggleSort} />
            <SortableHeader label="Assigned" sortKey="assigned_to" direction={getSortDirection("assigned_to")} onToggle={toggleSort} />
            <SortableHeader label="Age" sortKey="created_at" direction={getSortDirection("created_at")} onToggle={toggleSort} />
            <SortableHeader label="Actions" sortKey="" direction={null} onToggle={() => {}} />
          </TableRow></TableHeader>
            <TableBody>{pageData.map((r: any) => {
              const st = stColors[r.status] || stColors.open;
              const StIcon = st.icon;
              const slaBreach = getSLABreach(r);
              return (
              <TableRow key={r.id} className="group">
                <TableCell className="text-xs font-mono">{r.ticket_no}</TableCell>
                <TableCell className="font-medium max-w-[200px] truncate">{r.title}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize text-[10px]">{r.category}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    <Badge variant="secondary" className={`${prioColors[r.priority] || ""} border-0 text-[10px]`}>{r.priority}</Badge>
                    {slaBreach && <Badge variant="destructive" className="text-[10px] px-1.5">SLA</Badge>}
                  </div>
                </TableCell>
                <TableCell><Badge variant="secondary" className={`${st.bg} border-0 gap-1 text-[10px]`}><StIcon className="h-3 w-3" />{r.status?.replace("_", " ")}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.assigned_to ? getAssigneeName(r.assigned_to) : "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.created_at ? formatDistanceToNow(new Date(r.created_at), { addSuffix: true }) : "—"}</TableCell>
                <TableCell>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setViewing(r); setResolutionNotesDraft(r.resolution_notes || ""); setViewOpen(true); }}><Eye className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>);
            })}</TableBody></Table>
          </div>
          <DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
          </>
        )}
      </CardContent></Card>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditingId(null); setForm(emptyForm); } }}><DialogContent>
        <DialogHeader><DialogTitle>{editingId ? "Edit Ticket" : "New Ticket"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Category</Label><ComboboxSelect value={form.category} onValueChange={v => setForm({ ...form, category: v })} options={catOptions} placeholder="Select or type..." /></div>
            <div><Label>Priority</Label><Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select></div>
          </div>
          {editingId && <div><Label>Status</Label><Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="open">Open</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="resolved">Resolved</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent></Select></div>}
          <div><Label>Assigned To</Label><ComboboxSelect value={form.assigned_to} onValueChange={v => setForm({ ...form, assigned_to: v })} options={employeeOptions} placeholder="Select assignee..." allowCustom={false} /></div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          {editingId && <div><Label>Resolution Notes</Label><Textarea value={form.resolution_notes} onChange={e => setForm({ ...form, resolution_notes: e.target.value })} placeholder="Notes on how the issue was resolved..." /></div>}
          <Button className="w-full h-9" onClick={() => save.mutate()} disabled={!form.title || save.isPending}>{save.isPending ? "Saving..." : editingId ? "Update" : "Create Ticket"}</Button>
        </div>
      </DialogContent></Dialog>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}><DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Ticket Details</DialogTitle></DialogHeader>
        {viewing && (() => {
          const st = stColors[viewing.status] || stColors.open;
          const StIcon = st.icon;
          const slaBreach = getSLABreach(viewing);
          const canResolve = viewing.status !== "resolved" && viewing.status !== "closed";
          return (
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className={`${st.bg} border-0 gap-1`}><StIcon className="h-3.5 w-3.5" />{viewing.status?.replace("_", " ")}</Badge>
                <Badge variant="secondary" className={`${prioColors[viewing.priority] || ""} border-0`}>{viewing.priority}</Badge>
                {slaBreach && <Badge variant="destructive">SLA Breached</Badge>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[["Ticket#", viewing.ticket_no], ["Title", viewing.title], ["Category", viewing.category], ["Created", viewing.created_at ? format(new Date(viewing.created_at), "dd MMM yyyy HH:mm") : "—"]].map(([l, v]) => (
                  <div key={l as string}><p className="text-muted-foreground text-xs">{l}</p><p className="font-medium capitalize">{v || "—"}</p></div>
                ))}
                {viewing.assigned_to && <div><p className="text-muted-foreground text-xs">Assigned To</p><p className="font-medium flex items-center gap-1"><User className="h-3.5 w-3.5" />{getAssigneeName(viewing.assigned_to)}</p></div>}
                {viewing.resolved_at && <div><p className="text-muted-foreground text-xs">Resolved At</p><p className="font-medium">{format(new Date(viewing.resolved_at), "dd MMM yyyy HH:mm")}</p></div>}
              </div>
              {viewing.description && <div><p className="text-muted-foreground text-xs">Description</p><p className="bg-muted p-2 rounded text-sm">{viewing.description}</p></div>}
              {/* Resolution notes with inline edit */}
              <div>
                <p className="text-muted-foreground text-xs mb-1">Resolution Notes</p>
                <Textarea value={resolutionNotesDraft} onChange={e => setResolutionNotesDraft(e.target.value)} placeholder="Add resolution notes..." className="text-sm" />
                <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={() => saveResolutionNotes.mutate({ id: viewing.id, notes: resolutionNotesDraft })} disabled={saveResolutionNotes.isPending}>
                  {saveResolutionNotes.isPending ? "Saving..." : "Save Notes"}
                </Button>
              </div>
              {canResolve && (
                <Button className="w-full" onClick={() => markResolved.mutate(viewing.id)} disabled={markResolved.isPending}>
                  <CheckCircle className="h-4 w-4 mr-2" />{markResolved.isPending ? "Resolving..." : "Mark Resolved"}
                </Button>
              )}
            </div>
          );
        })()}
      </DialogContent></Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete Ticket?" onConfirm={() => deleteId && remove.mutate(deleteId)} />
    </div>
  );
}
