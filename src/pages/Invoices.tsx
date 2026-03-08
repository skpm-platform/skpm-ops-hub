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
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Receipt, Pencil, Trash2, Eye, Printer } from "lucide-react";
import { toast } from "sonner";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { ComboboxSelect } from "@/components/ComboboxSelect";
import { StatusFilter } from "@/components/StatusFilter";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ExportButton } from "@/components/ExportButton";

const stC: Record<string,string> = { draft: "bg-gray-100 text-gray-700", sent: "bg-blue-100 text-blue-700", paid: "bg-emerald-100 text-emerald-700", overdue: "bg-red-100 text-red-700" };
const emptyForm = { client_id: "", due_date: "", subtotal: "", status: "draft" };

export default function Invoices() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewing, setViewing] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => { const { data } = await supabase.from("invoices").select("*, clients(name)").order("created_at", { ascending: false }); return data || []; },
  });
  const { data: clients = [] } = useQuery({ queryKey: ["clients-inv"], queryFn: async () => { const { data } = await supabase.from("clients").select("id,name"); return data || []; } });

  const save = useMutation({
    mutationFn: async () => {
      const sub = parseFloat(form.subtotal) || 0;
      const vat = sub * 0.05;
      if (editingId) {
        const { error } = await supabase.from("invoices").update({ subtotal: sub, vat, total: sub + vat, due_date: form.due_date || null, client_id: form.client_id || null, status: form.status }).eq("id", editingId);
        if (error) throw error;
        await logAudit("Updated invoice", editingId);
      } else {
        const { error } = await supabase.from("invoices").insert({ subtotal: sub, vat, total: sub + vat, invoice_no: `INV-${Date.now().toString().slice(-6)}`, created_by: user?.id, client_id: form.client_id || null, due_date: form.due_date || null });
        if (error) throw error;
        await logAudit("Created invoice", `AED ${(sub + vat).toLocaleString()}`);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["invoices"] }); toast.success(editingId ? "Updated" : "Invoice created"); setOpen(false); setEditingId(null); setForm(emptyForm); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;
      await logAudit("Deleted invoice", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["invoices"] }); toast.success("Deleted"); setDeleteId(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const handleEdit = (r: any) => {
    setEditingId(r.id);
    setForm({ client_id: r.client_id||"", due_date: r.due_date||"", subtotal: String(r.subtotal||""), status: r.status||"draft" });
    setOpen(true);
  };

  const filtered = data.filter((r: any) => {
    const matchSearch = JSON.stringify(r).toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statuses = [
    { value: "all", label: "All", count: data.length },
    { value: "draft", label: "Draft", count: data.filter((r: any) => r.status === "draft").length },
    { value: "sent", label: "Sent", count: data.filter((r: any) => r.status === "sent").length },
    { value: "paid", label: "Paid", count: data.filter((r: any) => r.status === "paid").length },
    { value: "overdue", label: "Overdue", count: data.filter((r: any) => r.status === "overdue").length },
  ];

  const totalAmount = data.reduce((s:number,r:any)=>s+(r.total||0),0);
  const paidAmount = data.filter((r:any)=>r.status==="paid").reduce((s:number,r:any)=>s+(r.total||0),0);
  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3"><Receipt className="h-7 w-7 text-primary" /><div><h1 className="text-2xl font-bold">Invoices</h1><p className="text-sm text-muted-foreground">{data.length} invoices</p></div></div>
        <div className="flex gap-2">
          <ExportButton data={filtered} filename="invoices" columns={[{key:"invoice_no",label:"Invoice#"},{key:"total",label:"Total"},{key:"due_date",label:"Due"},{key:"status",label:"Status"}]} />
          <Button size="sm" className="h-9" onClick={() => { setEditingId(null); setForm(emptyForm); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />New Invoice</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Invoiced</p><p className="text-2xl font-bold">AED {totalAmount.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Paid</p><p className="text-2xl font-bold text-success">AED {paidAmount.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Outstanding</p><p className="text-2xl font-bold text-destructive">AED {(totalAmount-paidAmount).toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Overdue</p><p className="text-2xl font-bold text-amber-600">{data.filter((r:any)=>r.status==="overdue").length}</p></CardContent></Card>
      </div>

      <Card><CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
          <StatusFilter statuses={statuses} selected={statusFilter} onSelect={setStatusFilter} />
        </div>
        {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No invoices</p> : (
          <>
          <div className="overflow-x-auto">
          <Table><TableHeader><TableRow>
            <SortableHeader label="Invoice #" sortKey="invoice_no" direction={getSortDirection("invoice_no")} onToggle={toggleSort} />
            <SortableHeader label="Client" sortKey="clients.name" direction={getSortDirection("clients.name")} onToggle={toggleSort} />
            <SortableHeader label="Subtotal" sortKey="subtotal" direction={getSortDirection("subtotal")} onToggle={toggleSort} />
            <SortableHeader label="VAT" sortKey="vat" direction={getSortDirection("vat")} onToggle={toggleSort} />
            <SortableHeader label="Total (AED)" sortKey="total" direction={getSortDirection("total")} onToggle={toggleSort} />
            <SortableHeader label="Due Date" sortKey="due_date" direction={getSortDirection("due_date")} onToggle={toggleSort} />
            <SortableHeader label="Status" sortKey="status" direction={getSortDirection("status")} onToggle={toggleSort} />
            <SortableHeader label="Actions" sortKey="" direction={null} onToggle={() => {}} />
          </TableRow></TableHeader>
            <TableBody>{pageData.map((r: any) => {
              const overdue = r.due_date && new Date(r.due_date) < new Date() && r.status !== "paid";
              return (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.invoice_no}</TableCell>
                <TableCell>{r.clients?.name || "—"}</TableCell>
                <TableCell className="text-xs">{r.subtotal?.toLocaleString()}</TableCell>
                <TableCell className="text-xs">{r.vat?.toLocaleString()}</TableCell>
                <TableCell className="font-medium">{r.total?.toLocaleString()}</TableCell>
                <TableCell><span className={overdue ? "text-destructive font-medium" : ""}>{r.due_date || "—"}</span></TableCell>
                <TableCell><Badge className={stC[r.status] || ""}>{r.status}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
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

      <Dialog open={open} onOpenChange={(o)=>{setOpen(o);if(!o){setEditingId(null);setForm(emptyForm);}}}><DialogContent>
        <DialogHeader><DialogTitle>{editingId ? "Edit Invoice" : "New Invoice"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Client</Label><ComboboxSelect value={form.client_id} onValueChange={v => setForm({...form, client_id: v})} options={clients.map((c:any)=>({value:c.id,label:c.name}))} placeholder="Select client..." allowCustom={false} /></div>
          <div><Label>Subtotal (AED)</Label><Input type="number" value={form.subtotal} onChange={e => setForm({...form, subtotal: e.target.value})} /><p className="text-xs text-muted-foreground mt-1">5% VAT auto-applied</p></div>
          <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} /></div>
          {editingId && <div><Label>Status</Label><Select value={form.status} onValueChange={v => setForm({...form, status: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="sent">Sent</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="overdue">Overdue</SelectItem></SelectContent></Select></div>}
          <Button className="w-full h-9" onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving..." : editingId ? "Update" : "Create Invoice"}</Button>
        </div>
      </DialogContent></Dialog>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}><DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Invoice Details</DialogTitle></DialogHeader>
        {viewing && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              {[["Invoice#",viewing.invoice_no],["Client",viewing.clients?.name],["Issue Date",viewing.issue_date],["Due Date",viewing.due_date],["Subtotal",`AED ${viewing.subtotal?.toLocaleString()}`],["VAT (5%)",`AED ${viewing.vat?.toLocaleString()}`],["Total",`AED ${viewing.total?.toLocaleString()}`],["Status",viewing.status],["Payment Method",viewing.payment_method],["Paid Date",viewing.paid_date]].map(([l,v])=>(
                <div key={l as string}><p className="text-muted-foreground text-xs">{l}</p><p className="font-medium capitalize">{v||"—"}</p></div>
              ))}
            </div>
          </div>
        )}
      </DialogContent></Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete Invoice?" onConfirm={() => deleteId && remove.mutate(deleteId)} />
    </div>
  );
}
