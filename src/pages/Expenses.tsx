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
import { Plus, Search, CreditCard, Pencil, Trash2, Eye, CheckCircle, XCircle , AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { ComboboxSelect } from "@/components/ComboboxSelect";
import { StatusFilter } from "@/components/StatusFilter";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ExportButton } from "@/components/ExportButton";

const categoryOptions = [
  { value: "fuel", label: "Fuel" }, { value: "materials", label: "Materials" },
  { value: "labour", label: "Labour" }, { value: "equipment", label: "Equipment" },
  { value: "travel", label: "Travel" }, { value: "food", label: "Food" },
  { value: "utilities", label: "Utilities" }, { value: "rent", label: "Rent" },
  { value: "maintenance", label: "Maintenance" }, { value: "other", label: "Other" },
];
const stC: Record<string,string> = { pending: "bg-warning/15 text-warning", approved: "bg-success/15 text-success", rejected: "bg-destructive/15 text-destructive" };
const emptyForm = { description: "", category: "materials", amount: "", date: "" };

export default function Expenses() {
  const { user } = useAuth();
  const { data: role } = useUserRole();
  const isManagerUp = role === "admin" || role === "manager";
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewing, setViewing] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: string; status: string } | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data = [], isLoading , isError: dataLoadError} = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => { const { data } = await supabase.from("expenses").select("*").order("created_at", { ascending: false }); return data || []; },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, amount: parseFloat(form.amount) || 0 };
      if (editingId) {
        const { error } = await supabase.from("expenses").update(payload).eq("id", editingId);
        if (error) throw error;
        await logAudit("Updated expense", `${payload.category} — AED ${payload.amount}`, "expenses");
      } else {
        const { error } = await supabase.from("expenses").insert({ ...payload, submitted_by: user?.id });
        if (error) throw error;
        await logAudit("Submitted expense", `${payload.category} — AED ${payload.amount}`, "expenses");
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); toast.success(editingId ? "Updated" : "Expense submitted"); setOpen(false); setEditingId(null); setForm(emptyForm); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const exp = data.find((r: any) => r.id === id);
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
      await logAudit("Deleted expense", `${exp?.category} — AED ${exp?.amount}`, "expenses");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); toast.success("Deleted"); setDeleteId(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("expenses").update({ status, approved_by: user?.id }).eq("id", id);
      if (error) throw error;
      const exp = data.find((r: any) => r.id === id);
      await logAudit(`Expense ${status}`, `${exp?.category} — AED ${exp?.amount}`, "expenses");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); toast.success("Status updated"); setConfirmAction(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const handleEdit = (r: any) => {
    setEditingId(r.id);
    setForm({ description: r.description||"", category: r.category||"materials", amount: String(r.amount||""), date: r.date||"" });
    setOpen(true);
  };

  const filtered = data.filter((r: any) => {
    const matchSearch = JSON.stringify(r).toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statuses = [
    { value: "all", label: "All", count: data.length },
    { value: "pending", label: "Pending", count: data.filter((r: any) => r.status === "pending").length },
    { value: "approved", label: "Approved", count: data.filter((r: any) => r.status === "approved").length },
    { value: "rejected", label: "Rejected", count: data.filter((r: any) => r.status === "rejected").length },
  ];

  const totalAmount = data.reduce((s:number,r:any)=>s+(r.amount||0),0);
  const approvedAmount = data.filter((r:any)=>r.status==="approved").reduce((s:number,r:any)=>s+(r.amount||0),0);
  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

  return (
    <div className="space-y-6">
      {dataLoadError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 flex items-center gap-3 mb-4">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">Failed to load some data</p>
            <p className="text-xs text-muted-foreground">Please refresh or contact your administrator.</p>
          </div>
          <button onClick={() => window.location.reload()} className="text-xs underline text-muted-foreground hover:text-foreground">Retry</button>
        </div>
      )}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3"><CreditCard className="h-7 w-7 text-primary" /><div><h1 className="text-2xl font-bold">Expenses</h1><p className="text-sm text-muted-foreground">{data.length} records</p></div></div>
        <div className="flex gap-2">
          <ExportButton data={filtered} filename="expenses" columns={[{key:"date",label:"Date"},{key:"category",label:"Category"},{key:"description",label:"Description"},{key:"amount",label:"Amount"},{key:"status",label:"Status"}]} />
          <Button size="sm" className="h-9" onClick={() => { setEditingId(null); setForm(emptyForm); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />Submit Expense</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Submitted</p><p className="text-2xl font-bold">AED {totalAmount.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Approved</p><p className="text-2xl font-bold text-success">AED {approvedAmount.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Pending</p><p className="text-2xl font-bold text-warning">{data.filter((r:any)=>r.status==="pending").length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Rejected</p><p className="text-2xl font-bold text-destructive">{data.filter((r:any)=>r.status==="rejected").length}</p></CardContent></Card>
      </div>

      <Card><CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
          <StatusFilter statuses={statuses} selected={statusFilter} onSelect={setStatusFilter} />
        </div>
        {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No expenses</p> : (
          <>
          <div className="overflow-x-auto">
          <Table><TableHeader><TableRow>
            <SortableHeader label="Date" sortKey="date" direction={getSortDirection("date")} onToggle={toggleSort} />
            <SortableHeader label="Category" sortKey="category" direction={getSortDirection("category")} onToggle={toggleSort} />
            <SortableHeader label="Description" sortKey="description" direction={getSortDirection("description")} onToggle={toggleSort} />
            <SortableHeader label="Amount (AED)" sortKey="amount" direction={getSortDirection("amount")} onToggle={toggleSort} />
            <SortableHeader label="Status" sortKey="status" direction={getSortDirection("status")} onToggle={toggleSort} />
            <SortableHeader label="Actions" sortKey="" direction={null} onToggle={() => {}} />
          </TableRow></TableHeader>
            <TableBody>{pageData.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell>{r.date || "—"}</TableCell>
                <TableCell><Badge variant="outline">{r.category}</Badge></TableCell>
                <TableCell className="max-w-xs truncate">{r.description || "—"}</TableCell>
                <TableCell className="font-medium">{r.amount?.toLocaleString()}</TableCell>
                <TableCell><Badge className={`border-0 ${stC[r.status] || ""}`}>{r.status}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {r.status === "pending" && isManagerUp && <>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setConfirmAction({ id: r.id, status: "approved" })}><CheckCircle className="h-3 w-3" />Approve</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive gap-1" onClick={() => setConfirmAction({ id: r.id, status: "rejected" })}><XCircle className="h-3 w-3" />Reject</Button>
                    </>}
                    {r.status === "pending" && !isManagerUp && <span className="text-xs text-muted-foreground">Awaiting</span>}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setViewing(r); setViewOpen(true); }}><Eye className="h-3.5 w-3.5" /></Button>
                    {isManagerUp && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>}
                    {isManagerUp && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>}
                  </div>
                </TableCell>
              </TableRow>))}</TableBody></Table>
          </div>
          <DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
          </>
        )}
      </CardContent></Card>

      <Dialog open={open} onOpenChange={(o)=>{setOpen(o);if(!o){setEditingId(null);setForm(emptyForm);}}}><DialogContent>
        <DialogHeader><DialogTitle>{editingId ? "Edit Expense" : "Submit Expense"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
          <div><Label>Category</Label><ComboboxSelect value={form.category} onValueChange={v => setForm({...form, category: v})} options={categoryOptions} placeholder="Select or type..." /></div>
          <div><Label>Description</Label><Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
          <div><Label>Amount (AED)</Label><Input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} /></div>
          <Button className="w-full h-9" onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving..." : editingId ? "Update" : "Submit"}</Button>
        </div>
      </DialogContent></Dialog>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}><DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Expense Details</DialogTitle></DialogHeader>
        {viewing && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              {[["Date",viewing.date],["Category",viewing.category],["Description",viewing.description],["Amount",`AED ${viewing.amount?.toLocaleString()}`],["Status",viewing.status],["Submitted",viewing.created_at?.slice(0,10)]].map(([l,v])=>(
                <div key={l as string}><p className="text-muted-foreground text-xs">{l}</p><p className="font-medium capitalize">{v||"—"}</p></div>
              ))}
            </div>
          </div>
        )}
      </DialogContent></Dialog>

      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={() => setConfirmAction(null)}
        title={confirmAction?.status === "approved" ? "Approve Expense?" : "Reject Expense?"}
        description={confirmAction?.status === "approved" ? "This expense will be marked as approved." : "This expense will be marked as rejected."}
        onConfirm={() => confirmAction && updateStatus.mutate(confirmAction)}
      />
      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete Expense?" onConfirm={() => deleteId && remove.mutate(deleteId)} />
    </div>
  );
}
