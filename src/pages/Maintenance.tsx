import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Calendar, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
const emptyForm = { asset_name: "", type: "preventive", frequency: "monthly", next_due: "", status: "scheduled" };

export default function Maintenance() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
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
      } else {
        const { error } = await supabase.from("maintenance_schedules").insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["maintenance"] }); toast.success(editingId ? "Updated" : "Schedule added"); setOpen(false); setEditingId(null); setForm(emptyForm); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("maintenance_schedules").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["maintenance"] }); toast.success("Deleted"); setDeleteId(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const handleEdit = (r: any) => {
    setEditingId(r.id);
    setForm({ asset_name: r.asset_name||"", type: r.type||"preventive", frequency: r.frequency||"monthly", next_due: r.next_due||"", status: r.status||"scheduled" });
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

  const overdue = data.filter((r:any)=>r.next_due && new Date(r.next_due) < new Date() && r.status !== "completed").length;
  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3"><Calendar className="h-7 w-7 text-primary" /><div><h1 className="text-2xl font-bold">Maintenance & PPM</h1><p className="text-sm text-muted-foreground">{data.length} schedules</p></div></div>
        <div className="flex gap-2">
          <ExportButton data={filtered} filename="maintenance" columns={[{key:"asset_name",label:"Asset"},{key:"type",label:"Type"},{key:"frequency",label:"Frequency"},{key:"next_due",label:"Next Due"},{key:"status",label:"Status"}]} />
          <Button onClick={() => { setEditingId(null); setForm(emptyForm); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add Schedule</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p><p className="text-2xl font-bold">{data.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Scheduled</p><p className="text-2xl font-bold text-blue-600">{data.filter((r:any)=>r.status==="scheduled").length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Overdue</p><p className="text-2xl font-bold text-destructive">{overdue}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Completed</p><p className="text-2xl font-bold text-success">{data.filter((r:any)=>r.status==="completed").length}</p></CardContent></Card>
      </div>

      <Card><CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
          <StatusFilter statuses={statuses} selected={statusFilter} onSelect={setStatusFilter} />
        </div>
        {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No schedules</p> : (
          <>
          <div className="overflow-x-auto">
          <Table><TableHeader><TableRow>
            <SortableHeader label="Asset" sortKey="asset_name" direction={getSortDirection("asset_name")} onToggle={toggleSort} />
            <SortableHeader label="Type" sortKey="type" direction={getSortDirection("type")} onToggle={toggleSort} />
            <SortableHeader label="Frequency" sortKey="frequency" direction={getSortDirection("frequency")} onToggle={toggleSort} />
            <SortableHeader label="Next Due" sortKey="next_due" direction={getSortDirection("next_due")} onToggle={toggleSort} />
            <SortableHeader label="Status" sortKey="status" direction={getSortDirection("status")} onToggle={toggleSort} />
            <SortableHeader label="Actions" sortKey="" direction={null} onToggle={() => {}} />
          </TableRow></TableHeader>
            <TableBody>{pageData.map((r: any) => {
              const isOverdue = r.next_due && new Date(r.next_due) < new Date() && r.status !== "completed";
              return (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.asset_name}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{r.type}</Badge></TableCell>
                <TableCell className="capitalize">{r.frequency}</TableCell>
                <TableCell><span className={isOverdue ? "text-destructive font-medium" : ""}>{r.next_due || "—"}</span></TableCell>
                <TableCell><Badge variant={r.status === "completed" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
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

      <Dialog open={open} onOpenChange={(o)=>{setOpen(o);if(!o){setEditingId(null);setForm(emptyForm);}}}><DialogContent>
        <DialogHeader><DialogTitle>{editingId ? "Edit Schedule" : "Add PPM Schedule"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Asset Name *</Label><Input value={form.asset_name} onChange={e => setForm({...form, asset_name: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Type</Label><ComboboxSelect value={form.type} onValueChange={v => setForm({...form, type: v})} options={typeOptions} placeholder="Select or type..." /></div>
            <div><Label>Frequency</Label><ComboboxSelect value={form.frequency} onValueChange={v => setForm({...form, frequency: v})} options={freqOptions} placeholder="Select or type..." /></div>
          </div>
          <div><Label>Next Due Date</Label><Input type="date" value={form.next_due} onChange={e => setForm({...form, next_due: e.target.value})} /></div>
          {editingId && <div><Label>Status</Label><Select value={form.status} onValueChange={v => setForm({...form, status: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="scheduled">Scheduled</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent></Select></div>}
          <Button className="w-full" onClick={() => save.mutate()} disabled={!form.asset_name || save.isPending}>{save.isPending ? "Saving..." : editingId ? "Update" : "Save"}</Button>
        </div>
      </DialogContent></Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete Schedule?" onConfirm={() => deleteId && remove.mutate(deleteId)} />
    </div>
  );
}
