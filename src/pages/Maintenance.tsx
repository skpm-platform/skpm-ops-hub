import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { Plus, Search, Calendar, Pencil, Trash2, Eye, LayoutGrid, List, AlertTriangle, Wrench, CheckCircle, Clock, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { ComboboxSelect } from "@/components/ComboboxSelect";
import { StatusFilter } from "@/components/StatusFilter";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ExportButton } from "@/components/ExportButton";

const typeOptions = [
  { value: "preventive", label: "Preventive" }, { value: "corrective", label: "Corrective" },
  { value: "predictive", label: "Predictive" }, { value: "condition_based", label: "Condition Based" },
];
const freqOptions = [
  { value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" }, { value: "quarterly", label: "Quarterly" },
  { value: "bi_annual", label: "Bi-Annual" }, { value: "annual", label: "Annual" },
];
const typeIcons: Record<string, any> = { preventive: Calendar, corrective: Wrench, predictive: RotateCcw, condition_based: CheckCircle };
const emptyForm = { asset_name: "", type: "preventive", frequency: "monthly", next_due: "", status: "scheduled" };

export default function Maintenance() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewing, setViewing] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data = [], isLoading } = useQuery({
    queryKey: ["maintenance"],
    queryFn: async () => { const { data } = await supabase.from("maintenance_schedules").select("*").order("next_due", { ascending: true }); return data || []; },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (editingId) {
        const { error } = await supabase.from("maintenance_schedules").update(form).eq("id", editingId);
        if (error) throw error;
        await logAudit("Updated maintenance", form.asset_name, "maintenance");
      } else {
        const { error } = await supabase.from("maintenance_schedules").insert(form);
        if (error) throw error;
        await logAudit("Created maintenance schedule", form.asset_name, "maintenance");
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["maintenance"] }); toast.success(editingId ? "Updated" : "Schedule added"); setOpen(false); setEditingId(null); setForm(emptyForm); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("maintenance_schedules").delete().eq("id", id); if (error) throw error; await logAudit("Deleted maintenance schedule", id, "maintenance"); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["maintenance"] }); toast.success("Deleted"); setDeleteId(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const handleEdit = (r: any) => {
    setEditingId(r.id);
    setForm({ asset_name: r.asset_name || "", type: r.type || "preventive", frequency: r.frequency || "monthly", next_due: r.next_due || "", status: r.status || "scheduled" });
    setOpen(true);
  };

  const filtered = data.filter((r: any) => {
    const matchSearch = r.asset_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statuses = [
    { value: "all", label: "All", count: data.length },
    { value: "scheduled", label: "Scheduled", count: data.filter((r: any) => r.status === "scheduled").length },
    { value: "in_progress", label: "In Progress", count: data.filter((r: any) => r.status === "in_progress").length },
    { value: "completed", label: "Completed", count: data.filter((r: any) => r.status === "completed").length },
  ];

  const overdue = data.filter((r: any) => r.next_due && new Date(r.next_due) < new Date() && r.status !== "completed");
  const completedCount = data.filter((r: any) => r.status === "completed").length;
  const complianceRate = data.length > 0 ? Math.round((completedCount / data.length) * 100) : 0;
  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

  const getDueBadge = (r: any) => {
    if (!r.next_due || r.status === "completed") return null;
    const days = differenceInDays(new Date(r.next_due), new Date());
    if (days < 0) return <Badge variant="destructive" className="text-[10px] px-1.5 animate-pulse">{Math.abs(days)}d overdue</Badge>;
    if (days <= 7) return <Badge className="text-[10px] px-1.5 bg-warning/15 text-warning border-0">{days}d left</Badge>;
    return null;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Wrench className="h-5 w-5 text-primary" /></div>
          <div><h1 className="text-2xl font-bold">Maintenance & PPM</h1><p className="text-sm text-muted-foreground">{data.length} schedules</p></div>
        </div>
        <div className="flex gap-2">
          <ExportButton data={filtered} filename="maintenance" columns={[{ key: "asset_name", label: "Asset" }, { key: "type", label: "Type" }, { key: "frequency", label: "Frequency" }, { key: "next_due", label: "Next Due" }, { key: "status", label: "Status" }]} />
          <Button size="sm" className="h-9" onClick={() => { setEditingId(null); setForm(emptyForm); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add Schedule</Button>
        </div>
      </div>

      {/* Overdue Alert */}
      {overdue.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2"><AlertTriangle className="h-4 w-4 text-destructive" /><span className="text-sm font-semibold text-destructive">{overdue.length} Overdue Maintenance Items</span></div>
            <div className="flex flex-wrap gap-2">
              {overdue.slice(0, 6).map((r: any) => (
                <div key={r.id} className="flex items-center gap-1.5 bg-background rounded-full px-3 py-1 text-xs border">
                  <span className="font-medium">{r.asset_name}</span>
                  <Badge variant="destructive" className="text-[10px] px-1.5 h-4">{Math.abs(differenceInDays(new Date(r.next_due), new Date()))}d</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p><p className="text-2xl font-bold mt-1">{data.length}</p></div><Calendar className="h-5 w-5 text-primary" /></div></CardContent></Card>
        <Card className="hover:shadow-md transition-shadow"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase tracking-wider">Overdue</p><p className="text-2xl font-bold text-destructive mt-1">{overdue.length}</p></div><AlertTriangle className="h-5 w-5 text-destructive" /></div></CardContent></Card>
        <Card className="hover:shadow-md transition-shadow"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase tracking-wider">Completed</p><p className="text-2xl font-bold text-success mt-1">{completedCount}</p></div><CheckCircle className="h-5 w-5 text-success" /></div></CardContent></Card>
        <Card className="hover:shadow-md transition-shadow"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase tracking-wider">Compliance</p><p className="text-2xl font-bold mt-1">{complianceRate}%</p></div><Clock className="h-5 w-5 text-muted-foreground" /></div><Progress value={complianceRate} className="mt-2 h-1.5" /></CardContent></Card>
      </div>

      <Card><CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
          <StatusFilter statuses={statuses} selected={statusFilter} onSelect={setStatusFilter} />
          <div className="flex border rounded-md">
            <Button variant={viewMode === "table" ? "secondary" : "ghost"} size="icon" className="h-9 w-9 rounded-r-none" onClick={() => setViewMode("table")}><List className="h-4 w-4" /></Button>
            <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon" className="h-9 w-9 rounded-l-none" onClick={() => setViewMode("grid")}><LayoutGrid className="h-4 w-4" /></Button>
          </div>
        </div>
        {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No schedules</p> : viewMode === "grid" ? (
          <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pageData.map((r: any) => {
              const TypeIcon = typeIcons[r.type] || Wrench;
              const isOverdue = r.next_due && new Date(r.next_due) < new Date() && r.status !== "completed";
              return (
                <Card key={r.id} className={`group hover:shadow-md transition-all hover:-translate-y-0.5 ${isOverdue ? "border-destructive/30" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${isOverdue ? "bg-destructive/10" : "bg-muted"}`}><TypeIcon className={`h-4 w-4 ${isOverdue ? "text-destructive" : "text-muted-foreground"}`} /></div>
                        <div>
                          <h3 className="font-semibold text-sm">{r.asset_name}</h3>
                          <p className="text-[10px] text-muted-foreground capitalize">{r.type} · {r.frequency}</p>
                        </div>
                      </div>
                      <Badge variant={r.status === "completed" ? "default" : "secondary"} className="text-[10px]">{r.status}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs mt-3">
                      <div><span className="text-muted-foreground">Last Done:</span> <span className="font-medium">{r.last_done || "—"}</span></div>
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Next Due:</span>
                        <span className={`font-medium ${isOverdue ? "text-destructive" : ""}`}>{r.next_due || "—"}</span>
                        {getDueBadge(r)}
                      </div>
                    </div>
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
          <div className="overflow-x-auto">
          <Table><TableHeader><TableRow>
            <SortableHeader label="Asset" sortKey="asset_name" direction={getSortDirection("asset_name")} onToggle={toggleSort} />
            <SortableHeader label="Type" sortKey="type" direction={getSortDirection("type")} onToggle={toggleSort} />
            <SortableHeader label="Frequency" sortKey="frequency" direction={getSortDirection("frequency")} onToggle={toggleSort} />
            <SortableHeader label="Last Done" sortKey="last_done" direction={getSortDirection("last_done")} onToggle={toggleSort} />
            <SortableHeader label="Next Due" sortKey="next_due" direction={getSortDirection("next_due")} onToggle={toggleSort} />
            <SortableHeader label="Status" sortKey="status" direction={getSortDirection("status")} onToggle={toggleSort} />
            <SortableHeader label="Actions" sortKey="" direction={null} onToggle={() => {}} />
          </TableRow></TableHeader>
            <TableBody>{pageData.map((r: any) => {
              const isOverdue = r.next_due && new Date(r.next_due) < new Date() && r.status !== "completed";
              return (
              <TableRow key={r.id} className="group">
                <TableCell className="font-medium">{r.asset_name}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize text-[10px]">{r.type}</Badge></TableCell>
                <TableCell className="capitalize text-xs">{r.frequency}</TableCell>
                <TableCell className="text-xs">{r.last_done || "—"}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs ${isOverdue ? "text-destructive font-medium" : ""}`}>{r.next_due || "—"}</span>
                    {getDueBadge(r)}
                  </div>
                </TableCell>
                <TableCell><Badge variant={r.status === "completed" ? "default" : "secondary"} className="text-[10px]">{r.status}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setViewing(r); setViewOpen(true); }}><Eye className="h-3.5 w-3.5" /></Button>
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
        <DialogHeader><DialogTitle>{editingId ? "Edit Schedule" : "Add PPM Schedule"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Asset Name *</Label><Input value={form.asset_name} onChange={e => setForm({ ...form, asset_name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Type</Label><ComboboxSelect value={form.type} onValueChange={v => setForm({ ...form, type: v })} options={typeOptions} placeholder="Select or type..." /></div>
            <div><Label>Frequency</Label><ComboboxSelect value={form.frequency} onValueChange={v => setForm({ ...form, frequency: v })} options={freqOptions} placeholder="Select or type..." /></div>
          </div>
          <div><Label>Next Due Date</Label><Input type="date" value={form.next_due} onChange={e => setForm({ ...form, next_due: e.target.value })} /></div>
          {editingId && <div><Label>Status</Label><Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="scheduled">Scheduled</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent></Select></div>}
          <Button className="w-full h-9" onClick={() => save.mutate()} disabled={!form.asset_name || save.isPending}>{save.isPending ? "Saving..." : editingId ? "Update" : "Save"}</Button>
        </div>
      </DialogContent></Dialog>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}><DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Maintenance Details</DialogTitle></DialogHeader>
        {viewing && (
          <div className="space-y-3 text-sm"><div className="grid grid-cols-2 gap-3">
            {[["Asset", viewing.asset_name], ["Type", viewing.type], ["Frequency", viewing.frequency], ["Last Done", viewing.last_done], ["Next Due", viewing.next_due], ["Status", viewing.status]].map(([l, v]) => (
              <div key={l as string}><p className="text-muted-foreground text-xs">{l}</p><p className="font-medium capitalize">{v || "—"}</p></div>
            ))}
          </div></div>
        )}
      </DialogContent></Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete Schedule?" onConfirm={() => deleteId && remove.mutate(deleteId)} />
    </div>
  );
}
