import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, FileSignature, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { ExportButton } from "@/components/ExportButton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusFilter } from "@/components/StatusFilter";

const statusColors: Record<string, string> = { draft: "bg-muted text-muted-foreground", sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" };

export default function Quotations() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ client_id: "", valid_until: "", subtotal: "", status: "draft" });

  const { data = [], isLoading } = useQuery({
    queryKey: ["quotations"],
    queryFn: async () => { const { data } = await (supabase as any).from("quotations").select("*, clients(name)").order("created_at", { ascending: false }); return data || []; },
  });
  const { data: clients = [] } = useQuery({ queryKey: ["clients-q"], queryFn: async () => { const { data } = await (supabase as any).from("clients").select("id,name"); return data || []; } });

  const resetForm = () => setForm({ client_id: "", valid_until: "", subtotal: "", status: "draft" });

  const save = useMutation({
    mutationFn: async () => {
      const subtotal = parseFloat(form.subtotal) || 0;
      const vat = subtotal * 0.05;
      if (editingId) {
        const { error } = await (supabase as any).from("quotations").update({ client_id: form.client_id || null, subtotal, vat, total: subtotal + vat, valid_until: form.valid_until || null, status: form.status }).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("quotations").insert({ client_id: form.client_id || null, subtotal, vat, total: subtotal + vat, quote_no: `QT-${Date.now().toString().slice(-6)}`, created_by: user?.id, valid_until: form.valid_until || null, status: form.status });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quotations"] }); toast.success(editingId ? "Updated" : "Created"); setOpen(false); setEditingId(null); resetForm(); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase as any).from("quotations").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quotations"] }); toast.success("Deleted"); setDeleteId(null); },
  });

  const handleEdit = (r: any) => {
    setEditingId(r.id);
    setForm({ client_id: r.client_id || "", valid_until: r.valid_until || "", subtotal: String(r.subtotal || ""), status: r.status || "draft" });
    setOpen(true);
  };

  const totalValue = data.reduce((s: number, r: any) => s + (r.total || 0), 0);
  const statusCounts = data.reduce((a: Record<string, number>, r: any) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {});

  const filtered = data
    .filter((r: any) => (r.quote_no || "").toLowerCase().includes(search.toLowerCase()) || (r.clients?.name || "").toLowerCase().includes(search.toLowerCase()))
    .filter((r: any) => statusFilter === "all" || r.status === statusFilter);
  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><FileSignature className="h-7 w-7 text-primary" /><h1 className="text-2xl font-bold">Quotations</h1></div>
        <div className="flex gap-2">
          <ExportButton data={data} filename="quotations" />
          <Button onClick={() => { resetForm(); setEditingId(null); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />New Quotation</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Quotations</p><p className="text-2xl font-semibold mt-1">{data.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Value</p><p className="text-2xl font-semibold mt-1">AED {totalValue.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Approved</p><p className="text-2xl font-semibold mt-1 text-success">{statusCounts.approved || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Pending</p><p className="text-2xl font-semibold mt-1 text-warning">{(statusCounts.draft || 0) + (statusCounts.sent || 0)}</p></CardContent></Card>
      </div>

      <StatusFilter value={statusFilter} onChange={setStatusFilter} counts={statusCounts} options={["draft", "sent", "approved", "rejected"]} />

      <Card><CardContent className="pt-6">
        <div className="mb-4 relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No quotations</p> : (
          <>
          <Table><TableHeader><TableRow>
            <SortableHeader label="Quote #" sortKey="quote_no" direction={getSortDirection("quote_no")} onToggle={toggleSort} />
            <SortableHeader label="Client" sortKey="clients.name" direction={getSortDirection("clients.name")} onToggle={toggleSort} />
            <SortableHeader label="Subtotal" sortKey="subtotal" direction={getSortDirection("subtotal")} onToggle={toggleSort} />
            <SortableHeader label="VAT" sortKey="vat" direction={getSortDirection("vat")} onToggle={toggleSort} />
            <SortableHeader label="Total" sortKey="total" direction={getSortDirection("total")} onToggle={toggleSort} />
            <SortableHeader label="Valid Until" sortKey="valid_until" direction={getSortDirection("valid_until")} onToggle={toggleSort} />
            <SortableHeader label="Status" sortKey="status" direction={getSortDirection("status")} onToggle={toggleSort} />
            <SortableHeader label="Actions" sortKey="" direction={null} onToggle={() => {}} />
          </TableRow></TableHeader>
            <TableBody>{pageData.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium font-mono text-xs">{r.quote_no}</TableCell>
                <TableCell>{r.clients?.name || "—"}</TableCell>
                <TableCell>{r.subtotal?.toLocaleString()}</TableCell>
                <TableCell className="text-muted-foreground">{r.vat?.toLocaleString()}</TableCell>
                <TableCell className="font-medium">AED {r.total?.toLocaleString()}</TableCell>
                <TableCell>{r.valid_until || "—"}</TableCell>
                <TableCell><Badge variant="secondary" className={`border-0 ${statusColors[r.status] || ""}`}>{r.status}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(r)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}</TableBody></Table>
          <DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
          </>
        )}
      </CardContent></Card>

      <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { setEditingId(null); resetForm(); } }}><DialogContent>
        <DialogHeader><DialogTitle>{editingId ? "Edit" : "New"} Quotation</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Client</Label><Select value={form.client_id} onValueChange={v => setForm({...form, client_id: v})}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Subtotal (AED)</Label><Input type="number" value={form.subtotal} onChange={e => setForm({...form, subtotal: e.target.value})} /><p className="text-xs text-muted-foreground mt-1">VAT (5%) added automatically</p></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Valid Until</Label><Input type="date" value={form.valid_until} onChange={e => setForm({...form, valid_until: e.target.value})} /></div>
            <div><Label>Status</Label><Select value={form.status} onValueChange={v => setForm({...form, status: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="sent">Sent</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="rejected">Rejected</SelectItem></SelectContent></Select></div>
          </div>
          <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving..." : editingId ? "Update" : "Create"}</Button>
        </div>
      </DialogContent></Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} onConfirm={() => deleteId && del.mutate(deleteId)} />
    </div>
  );
}
