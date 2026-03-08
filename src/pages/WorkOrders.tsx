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
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Wrench, Pencil, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { ComboboxSelect } from "@/components/ComboboxSelect";
import { StatusFilter } from "@/components/StatusFilter";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ExportButton } from "@/components/ExportButton";
import { workOrderSchema } from "@/lib/validations";

const stColor: Record<string,string> = { open: "bg-blue-100 text-blue-700", in_progress: "bg-amber-100 text-amber-700", completed: "bg-emerald-100 text-emerald-700", closed: "bg-gray-100 text-gray-700" };
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
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

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
      if (editingId) {
        const { error } = await supabase.from("work_orders").update(result.data).eq("id", editingId);
        if (error) throw error;
      } else {
        const insertData = { title: result.data.title, type: result.data.type, priority: result.data.priority, description: result.data.description, due_date: result.data.due_date || null, status: result.data.status, wo_no: `WO-${Date.now().toString().slice(-6)}`, created_by: user?.id };
        const { error } = await supabase.from("work_orders").insert(insertData);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["work_orders"] }); toast.success(editingId ? "Updated" : "Work order created"); setOpen(false); setEditingId(null); setForm(emptyForm); },
    onError: (e: any) => { if (e.message !== "Validation failed") toast.error(e.message); },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("work_orders").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["work_orders"] }); toast.success("Deleted"); setDeleteId(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const bulkDelete = useMutation({
    mutationFn: async () => {
      const ids = Array.from(selected);
      const { error } = await supabase.from("work_orders").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["work_orders"] }); toast.success(`${selected.size} items deleted`); setSelected(new Set()); setBulkDeleteOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const handleEdit = (r: any) => {
    setEditingId(r.id);
    setForm({ title: r.title||"", type: r.type||"corrective", priority: r.priority||"medium", description: r.description||"", due_date: r.due_date||"", status: r.status||"open" });
    setFormErrors({});
    setOpen(true);
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };
  const toggleAll = () => {
    if (selected.size === pageData.length) setSelected(new Set());
    else setSelected(new Set(pageData.map((r: any) => r.id)));
  };

  const filtered = data.filter((r: any) => {
    const matchSearch = r.title?.toLowerCase().includes(search.toLowerCase()) || r.wo_no?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statuses = [
    { value: "all", label: "All", count: data.length },
    { value: "open", label: "Open", count: data.filter((r: any) => r.status === "open").length },
    { value: "in_progress", label: "In Progress", count: data.filter((r: any) => r.status === "in_progress").length },
    { value: "completed", label: "Completed", count: data.filter((r: any) => r.status === "completed").length },
  ];

  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3"><Wrench className="h-7 w-7 text-primary" /><div><h1 className="text-2xl font-bold">Work Orders</h1><p className="text-sm text-muted-foreground">{data.length} total</p></div></div>
        <div className="flex gap-2">
          {selected.size > 0 && <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}><Trash2 className="h-4 w-4 mr-1" />Delete {selected.size}</Button>}
          <ExportButton data={filtered} filename="work-orders" columns={[{key:"wo_no",label:"WO#"},{key:"title",label:"Title"},{key:"type",label:"Type"},{key:"priority",label:"Priority"},{key:"status",label:"Status"},{key:"due_date",label:"Due"}]} />
          <Button onClick={() => { setEditingId(null); setForm(emptyForm); setFormErrors({}); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />New Work Order</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p><p className="text-2xl font-bold">{data.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Open</p><p className="text-2xl font-bold text-blue-600">{data.filter((r:any)=>r.status==="open").length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">In Progress</p><p className="text-2xl font-bold text-amber-600">{data.filter((r:any)=>r.status==="in_progress").length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Completed</p><p className="text-2xl font-bold text-success">{data.filter((r:any)=>r.status==="completed").length}</p></CardContent></Card>
      </div>

      <Card><CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
          <StatusFilter statuses={statuses} selected={statusFilter} onSelect={setStatusFilter} />
        </div>
        {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No work orders</p> : (
          <>
          <div className="overflow-x-auto">
          <Table><TableHeader><TableRow>
            <TableCell className="w-10"><Checkbox checked={selected.size === pageData.length && pageData.length > 0} onCheckedChange={toggleAll} /></TableCell>
            <SortableHeader label="WO #" sortKey="wo_no" direction={getSortDirection("wo_no")} onToggle={toggleSort} />
            <SortableHeader label="Title" sortKey="title" direction={getSortDirection("title")} onToggle={toggleSort} />
            <SortableHeader label="Type" sortKey="type" direction={getSortDirection("type")} onToggle={toggleSort} />
            <SortableHeader label="Priority" sortKey="priority" direction={getSortDirection("priority")} onToggle={toggleSort} />
            <SortableHeader label="Status" sortKey="status" direction={getSortDirection("status")} onToggle={toggleSort} />
            <SortableHeader label="Due" sortKey="due_date" direction={getSortDirection("due_date")} onToggle={toggleSort} />
            <SortableHeader label="Actions" sortKey="" direction={null} onToggle={() => {}} />
          </TableRow></TableHeader>
            <TableBody>{pageData.map((r: any) => (
              <TableRow key={r.id} className={selected.has(r.id) ? "bg-muted/50" : ""}>
                <TableCell><Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleSelect(r.id)} /></TableCell>
                <TableCell className="text-xs font-mono">{r.wo_no}</TableCell>
                <TableCell className="font-medium">{r.title}</TableCell>
                <TableCell><Badge variant="outline">{r.type}</Badge></TableCell>
                <TableCell><Badge variant={r.priority === "high" || r.priority === "critical" ? "destructive" : "secondary"}>{r.priority}</Badge></TableCell>
                <TableCell><Badge className={stColor[r.status] || ""}>{r.status}</Badge></TableCell>
                <TableCell>{r.due_date || "—"}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setViewing(r); setViewOpen(true); }}><Eye className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>))}</TableBody></Table>
          </div>
          <DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
          </>
        )}
      </CardContent></Card>

      <Dialog open={open} onOpenChange={(o)=>{setOpen(o);if(!o){setEditingId(null);setForm(emptyForm);setFormErrors({});}}}><DialogContent>
        <DialogHeader><DialogTitle>{editingId ? "Edit Work Order" : "New Work Order"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} />{formErrors.title && <p className="text-xs text-destructive mt-1">{formErrors.title}</p>}</div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Type</Label><ComboboxSelect value={form.type} onValueChange={v => setForm({...form, type: v})} options={typeOptions} placeholder="Select or type..." /></div>
            <div><Label>Priority</Label><Select value={form.priority} onValueChange={v => setForm({...form, priority: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select></div>
          </div>
          {editingId && <div><Label>Status</Label><Select value={form.status} onValueChange={v => setForm({...form, status: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="open">Open</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent></Select></div>}
          <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} /></div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} />{formErrors.description && <p className="text-xs text-destructive mt-1">{formErrors.description}</p>}</div>
          <Button className="w-full" onClick={() => save.mutate()} disabled={!form.title || save.isPending}>{save.isPending ? "Saving..." : editingId ? "Update" : "Create"}</Button>
        </div>
      </DialogContent></Dialog>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}><DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Work Order Details</DialogTitle></DialogHeader>
        {viewing && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              {[["WO#",viewing.wo_no],["Title",viewing.title],["Type",viewing.type],["Priority",viewing.priority],["Status",viewing.status],["Due",viewing.due_date]].map(([l,v])=>(
                <div key={l as string}><p className="text-muted-foreground text-xs">{l}</p><p className="font-medium">{v||"—"}</p></div>
              ))}
            </div>
            {viewing.description && <div><p className="text-muted-foreground text-xs">Description</p><p>{viewing.description}</p></div>}
          </div>
        )}
      </DialogContent></Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete Work Order?" onConfirm={() => deleteId && remove.mutate(deleteId)} />
      <ConfirmDialog open={bulkDeleteOpen} onOpenChange={() => setBulkDeleteOpen(false)} title={`Delete ${selected.size} work orders?`} onConfirm={() => bulkDelete.mutate()} />
    </div>
  );
}
