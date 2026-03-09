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
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Wrench, Pencil, Trash2, Eye, LayoutGrid, List, AlertTriangle, Clock, CheckCircle2, Zap, Shield, Settings } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { ComboboxSelect } from "@/components/ComboboxSelect";
import { StatusFilter } from "@/components/StatusFilter";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ExportButton } from "@/components/ExportButton";
import { BulkActions, useBulkSelect } from "@/components/BulkActions";
import { workOrderSchema } from "@/lib/validations";

const statusStyles: Record<string, { bg: string; icon: any }> = {
  open: { bg: "bg-primary/15 text-primary", icon: Clock },
  in_progress: { bg: "bg-warning/15 text-warning", icon: Settings },
  completed: { bg: "bg-success/15 text-success", icon: CheckCircle2 },
  closed: { bg: "bg-muted text-muted-foreground", icon: Shield },
};
const priorityStyles: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-primary/15 text-primary",
  high: "bg-warning/15 text-warning",
  critical: "bg-destructive/15 text-destructive",
};
const typeIcons: Record<string, any> = {
  corrective: Wrench, preventive: Shield, emergency: Zap, inspection: Search,
};
const typeOptions = [
  { value: "corrective", label: "Corrective" }, { value: "preventive", label: "Preventive" },
  { value: "emergency", label: "Emergency" }, { value: "inspection", label: "Inspection" },
];
const emptyForm = { title: "", type: "corrective", priority: "medium", description: "", due_date: "", status: "open" };

export default function WorkOrders() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { data = [], isLoading } = useQuery({
    queryKey: ["work_orders"],
    queryFn: async () => { const { data } = await supabase.from("work_orders").select("*").order("created_at", { ascending: false }); return data || []; },
  });

  const save = useMutation({
    mutationFn: async () => {
      const result = workOrderSchema.safeParse(form);
      if (!result.success) {
        const errs: Record<string, string> = {};
        result.error.errors.forEach(e => { if (e.path[0]) errs[e.path[0] as string] = e.message; });
        setFormErrors(errs);
        throw new Error("Validation failed");
      }
      setFormErrors({});
      const d = result.data as Record<string, any>;
      if (editingId) {
        const { error } = await supabase.from("work_orders").update({ title: d.title, type: d.type, priority: d.priority, description: d.description, due_date: d.due_date || null, status: d.status }).eq("id", editingId);
        if (error) throw error;
        await logAudit("Updated work order", d.title as string, "work_orders");
      } else {
        const insertData = { title: d.title as string, type: d.type as string, priority: d.priority as string, description: d.description as string, due_date: (d.due_date as string) || null, status: d.status as string, wo_no: `WO-${Date.now().toString().slice(-6)}`, created_by: user?.id };
        const { error } = await supabase.from("work_orders").insert(insertData);
        if (error) throw error;
        await logAudit("Created work order", d.title as string, "work_orders");
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["work_orders"] }); toast.success(editingId ? "Updated" : "Work order created"); setOpen(false); setEditingId(null); setForm(emptyForm); },
    onError: (e: any) => { if (e.message !== "Validation failed") toast.error(e.message); },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const wo = data.find((w: any) => w.id === id);
      const { error } = await supabase.from("work_orders").delete().eq("id", id);
      if (error) throw error;
      await logAudit("Deleted work order", wo?.title, "work_orders");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["work_orders"] }); toast.success("Deleted"); setDeleteId(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const handleEdit = (r: any) => {
    setEditingId(r.id);
    setForm({ title: r.title || "", type: r.type || "corrective", priority: r.priority || "medium", description: r.description || "", due_date: r.due_date || "", status: r.status || "open" });
    setFormErrors({});
    setOpen(true);
  };

  const filtered = data.filter((r: any) => {
    const matchSearch = r.title?.toLowerCase().includes(search.toLowerCase()) || r.wo_no?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openCount = data.filter((r: any) => r.status === "open").length;
  const inProgressCount = data.filter((r: any) => r.status === "in_progress").length;
  const completedCount = data.filter((r: any) => r.status === "completed").length;
  const criticalCount = data.filter((r: any) => (r.priority === "high" || r.priority === "critical") && r.status !== "completed" && r.status !== "closed").length;
  const completionRate = data.length > 0 ? Math.round((completedCount / data.length) * 100) : 0;

  const statuses = [
    { value: "all", label: "All", count: data.length },
    { value: "open", label: "Open", count: openCount },
    { value: "in_progress", label: "In Progress", count: inProgressCount },
    { value: "completed", label: "Completed", count: completedCount },
  ];

  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);
  const bulk = useBulkSelect(pageData);

  const bulkDelete = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("work_orders").delete().in("id", bulk.selectedIds);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["work_orders"] }); toast.success(`${bulk.selectedIds.length} items deleted`); bulk.clearSelection(); },
    onError: (e: any) => toast.error(e.message),
  });

  const getDueBadge = (r: any) => {
    if (!r.due_date || r.status === "completed" || r.status === "closed") return null;
    const days = differenceInDays(new Date(r.due_date), new Date());
    if (days < 0) return <Badge variant="destructive" className="text-[10px] px-1.5">{Math.abs(days)}d overdue</Badge>;
    if (days <= 3) return <Badge className="text-[10px] px-1.5 bg-warning/15 text-warning border-0">{days}d left</Badge>;
    return null;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3"><Wrench className="h-7 w-7 text-primary" /><div><h1 className="text-2xl font-bold">Work Orders</h1><p className="text-sm text-muted-foreground">{data.length} total</p></div></div>
        <div className="flex gap-2">
          <ExportButton data={filtered} filename="work-orders" columns={[{ key: "wo_no", label: "WO#" }, { key: "title", label: "Title" }, { key: "type", label: "Type" }, { key: "priority", label: "Priority" }, { key: "status", label: "Status" }, { key: "due_date", label: "Due" }]} />
          <Button size="sm" className="h-9" onClick={() => { setEditingId(null); setForm(emptyForm); setFormErrors({}); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />New Work Order</Button>
        </div>
      </div>

      {/* Enhanced KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Open</p>
                <p className="text-2xl font-bold text-primary mt-1">{openCount}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center"><Clock className="h-5 w-5 text-primary" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">In Progress</p>
                <p className="text-2xl font-bold text-warning mt-1">{inProgressCount}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center"><Settings className="h-5 w-5 text-warning" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Completed</p>
                <p className="text-2xl font-bold text-success mt-1">{completedCount}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center"><CheckCircle2 className="h-5 w-5 text-success" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Critical/High</p>
                <p className="text-2xl font-bold text-destructive mt-1">{criticalCount}</p>
                {criticalCount > 0 && <p className="text-[10px] text-destructive mt-0.5">Active high priority</p>}
              </div>
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center"><AlertTriangle className="h-5 w-5 text-destructive" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Completion Rate</p>
            <p className="text-2xl font-bold mt-1">{completionRate}%</p>
            <Progress value={completionRate} className="mt-2 h-1.5" />
          </CardContent>
        </Card>
      </div>

      <Card><CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search work orders..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
          <StatusFilter statuses={statuses} selected={statusFilter} onSelect={setStatusFilter} />
          <div className="flex border rounded-md">
            <Button variant={viewMode === "table" ? "secondary" : "ghost"} size="icon" className="h-9 w-9 rounded-r-none" onClick={() => setViewMode("table")}><List className="h-4 w-4" /></Button>
            <Button variant={viewMode === "cards" ? "secondary" : "ghost"} size="icon" className="h-9 w-9 rounded-l-none" onClick={() => setViewMode("cards")}><LayoutGrid className="h-4 w-4" /></Button>
          </div>
        </div>

        {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No work orders</p> : viewMode === "cards" ? (
          <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pageData.map((r: any) => {
              const st = statusStyles[r.status] || statusStyles.open;
              const StatusIcon = st.icon;
              const TypeIcon = typeIcons[r.type] || Wrench;
              return (
                <Card key={r.id} className="group hover:shadow-md transition-all hover:-translate-y-0.5">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center"><TypeIcon className="h-4 w-4 text-muted-foreground" /></div>
                        <div>
                          <p className="font-mono text-[10px] text-muted-foreground">{r.wo_no}</p>
                          <h3 className="font-semibold text-sm">{r.title}</h3>
                        </div>
                      </div>
                      <Badge variant="secondary" className={`${st.bg} border-0 gap-1 text-[10px]`}><StatusIcon className="h-3 w-3" />{r.status?.replace("_", " ")}</Badge>
                    </div>
                    {r.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{r.description}</p>}
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="secondary" className={`${priorityStyles[r.priority] || ""} border-0 text-[10px]`}>{r.priority}</Badge>
                      <Badge variant="outline" className="text-[10px] capitalize">{r.type}</Badge>
                      {getDueBadge(r)}
                    </div>
                    {r.due_date && (
                      <p className="text-xs text-muted-foreground mt-2">Due: {format(new Date(r.due_date), "dd MMM yyyy")}</p>
                    )}
                    <div className="flex gap-1 mt-3 pt-2 border-t justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setViewing(r); setViewOpen(true); }}><Eye className="h-3 w-3 mr-1" />View</Button>
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
          <BulkActions selectedIds={bulk.selectedIds} totalItems={pageData.length} onSelectAll={bulk.selectAll} onClearSelection={bulk.clearSelection} onBulkDelete={() => bulkDelete.mutate()} allSelected={bulk.allSelected} />
          <div className="overflow-x-auto">
          <Table><TableHeader><TableRow>
            <TableHead className="w-10"><Checkbox checked={bulk.allSelected} onCheckedChange={(c) => bulk.selectAll(!!c)} /></TableHead>
            <SortableHeader label="WO #" sortKey="wo_no" direction={getSortDirection("wo_no")} onToggle={toggleSort} />
            <SortableHeader label="Title" sortKey="title" direction={getSortDirection("title")} onToggle={toggleSort} />
            <SortableHeader label="Type" sortKey="type" direction={getSortDirection("type")} onToggle={toggleSort} />
            <SortableHeader label="Priority" sortKey="priority" direction={getSortDirection("priority")} onToggle={toggleSort} />
            <SortableHeader label="Status" sortKey="status" direction={getSortDirection("status")} onToggle={toggleSort} />
            <SortableHeader label="Due" sortKey="due_date" direction={getSortDirection("due_date")} onToggle={toggleSort} />
            <TableHead>Actions</TableHead>
          </TableRow></TableHeader>
            <TableBody>{pageData.map((r: any) => {
              const st = statusStyles[r.status] || statusStyles.open;
              const StatusIcon = st.icon;
              return (
              <TableRow key={r.id} className={`group ${bulk.isSelected(r.id) ? "bg-primary/5" : ""}`}>
                <TableCell><Checkbox checked={bulk.isSelected(r.id)} onCheckedChange={() => bulk.toggle(r.id)} /></TableCell>
                <TableCell className="text-xs font-mono">{r.wo_no}</TableCell>
                <TableCell className="font-medium">{r.title}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize text-[10px]">{r.type}</Badge></TableCell>
                <TableCell><Badge variant="secondary" className={`${priorityStyles[r.priority] || ""} border-0 text-[10px]`}>{r.priority}</Badge></TableCell>
                <TableCell><Badge variant="secondary" className={`${st.bg} border-0 gap-1 text-[10px]`}><StatusIcon className="h-3 w-3" />{r.status?.replace("_", " ")}</Badge></TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{r.due_date ? format(new Date(r.due_date), "dd MMM") : "—"}</span>
                    {getDueBadge(r)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setViewing(r); setViewOpen(true); }}><Eye className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            );})}</TableBody></Table>
          </div>
          <DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
          </>
        )}
      </CardContent></Card>

      {/* Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditingId(null); setForm(emptyForm); setFormErrors({}); } }}><DialogContent>
        <DialogHeader><DialogTitle>{editingId ? "Edit Work Order" : "New Work Order"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />{formErrors.title && <p className="text-xs text-destructive mt-1">{formErrors.title}</p>}</div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Type</Label><ComboboxSelect value={form.type} onValueChange={v => setForm({ ...form, type: v })} options={typeOptions} placeholder="Select..." /></div>
            <div><Label>Priority</Label><Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select></div>
          </div>
          {editingId && <div><Label>Status</Label><Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="open">Open</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent></Select></div>}
          <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />{formErrors.description && <p className="text-xs text-destructive mt-1">{formErrors.description}</p>}</div>
          <Button className="w-full h-9" onClick={() => save.mutate()} disabled={!form.title || save.isPending}>{save.isPending ? "Saving..." : editingId ? "Update" : "Create"}</Button>
        </div>
      </DialogContent></Dialog>

      {/* Enhanced View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}><DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Work Order Details</DialogTitle></DialogHeader>
        {viewing && (() => {
          const st = statusStyles[viewing.status] || statusStyles.open;
          const StatusIcon = st.icon;
          const TypeIcon = typeIcons[viewing.type] || Wrench;
          return (
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b">
                <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center"><TypeIcon className="h-6 w-6 text-muted-foreground" /></div>
                <div className="flex-1">
                  <p className="font-mono text-xs text-muted-foreground">{viewing.wo_no}</p>
                  <h3 className="font-semibold">{viewing.title}</h3>
                </div>
                <Badge variant="secondary" className={`${st.bg} border-0 gap-1`}><StatusIcon className="h-3.5 w-3.5" />{viewing.status?.replace("_", " ")}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-muted-foreground text-xs">Type</p><Badge variant="outline" className="capitalize mt-0.5">{viewing.type}</Badge></div>
                <div><p className="text-muted-foreground text-xs">Priority</p><Badge variant="secondary" className={`${priorityStyles[viewing.priority] || ""} border-0 mt-0.5`}>{viewing.priority}</Badge></div>
                <div><p className="text-muted-foreground text-xs">Due Date</p><p className="font-medium flex items-center gap-1.5">{viewing.due_date ? format(new Date(viewing.due_date), "dd MMM yyyy") : "—"}{getDueBadge(viewing)}</p></div>
                <div><p className="text-muted-foreground text-xs">Completed</p><p className="font-medium">{viewing.completed_date ? format(new Date(viewing.completed_date), "dd MMM yyyy") : "—"}</p></div>
              </div>
              {viewing.description && (
                <div><p className="text-muted-foreground text-xs mb-1">Description</p><p className="text-sm bg-muted p-3 rounded-md">{viewing.description}</p></div>
              )}
            </div>
          );
        })()}
      </DialogContent></Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete Work Order?" onConfirm={() => deleteId && remove.mutate(deleteId)} />
    </div>
  );
}
