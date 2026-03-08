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
import { Textarea } from "@/components/ui/textarea";
import { ComboboxSelect } from "@/components/ComboboxSelect";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ExportButton } from "@/components/ExportButton";
import { StatusFilter, buildStatuses } from "@/components/StatusFilter";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { Plus, Search, ShoppingCart, Eye, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const statusColors: Record<string, string> = { draft: "bg-muted text-muted-foreground", pending: "bg-warning/15 text-warning", approved: "bg-success/15 text-success", received: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", cancelled: "bg-destructive/15 text-destructive" };

export default function PurchaseOrders() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [viewItem, setViewItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ vendor: "", total: "", status: "draft", date: format(new Date(), "yyyy-MM-dd") });

  const { data = [], isLoading } = useQuery({
    queryKey: ["purchase_orders"],
    queryFn: async () => { const { data } = await supabase.from("purchase_orders").select("*").order("created_at", { ascending: false }); return data || []; },
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("purchase_orders").insert({ vendor: form.vendor, total: parseFloat(form.total) || 0, status: form.status, date: form.date, po_no: `PO-${Date.now().toString().slice(-6)}`, created_by: user?.id });
      if (error) throw error;
      await logAudit("Created PO", form.vendor);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["purchase_orders"] }); toast.success("PO created"); setOpen(false); setForm({ vendor: "", total: "", status: "draft", date: format(new Date(), "yyyy-MM-dd") }); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("purchase_orders").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["purchase_orders"] }); toast.success("Deleted"); setDeleteId(null); },
  });

  const totalValue = data.reduce((s: number, r: any) => s + Number(r.total || 0), 0);
  const statusCounts = data.reduce((acc: Record<string, number>, r: any) => { acc[r.status || "draft"] = (acc[r.status || "draft"] || 0) + 1; return acc; }, {});

  const filtered = data.filter((r: any) => {
    const matchSearch = JSON.stringify(r).toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3"><ShoppingCart className="h-7 w-7 text-primary" /><h1 className="text-2xl font-bold">Purchase Orders</h1></div>
        <div className="flex gap-2">
          <ExportButton data={data} filename="purchase-orders" columns={[{ key: "po_no", label: "PO #" }, { key: "vendor", label: "Vendor" }, { key: "total", label: "Total" }, { key: "status", label: "Status" }, { key: "date", label: "Date" }]} />
          <Button size="sm" className="h-9" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New PO</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Total POs</p><p className="text-2xl font-semibold mt-1">{data.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Value</p><p className="text-2xl font-semibold mt-1">AED {totalValue.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Pending</p><p className="text-2xl font-semibold mt-1 text-warning">{statusCounts["pending"] || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Received</p><p className="text-2xl font-semibold mt-1 text-success">{statusCounts["received"] || 0}</p></CardContent></Card>
      </div>

      <StatusFilter statuses={buildStatuses(statusCounts, ["draft", "pending", "approved", "received", "cancelled"])} selected={statusFilter} onSelect={setStatusFilter} />

      <Card><CardContent className="pt-6">
        <div className="mb-4 relative max-w-sm"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        {isLoading ? <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : pageData.length === 0 ? <p className="text-center text-muted-foreground py-8">No purchase orders</p> : (
          <>
            <Table><TableHeader><TableRow>
              <SortableHeader label="PO #" sortKey="po_no" direction={getSortDirection("po_no")} onToggle={toggleSort} />
              <SortableHeader label="Vendor" sortKey="vendor" direction={getSortDirection("vendor")} onToggle={toggleSort} />
              <SortableHeader label="Date" sortKey="date" direction={getSortDirection("date")} onToggle={toggleSort} />
              <SortableHeader label="Total (AED)" sortKey="total" direction={getSortDirection("total")} onToggle={toggleSort} />
              <SortableHeader label="Status" sortKey="status" direction={getSortDirection("status")} onToggle={toggleSort} />
              <SortableHeader label="" sortKey="" direction={null} onToggle={() => {}} className="w-24" />
            </TableRow></TableHeader>
              <TableBody>{pageData.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.po_no}</TableCell>
                  <TableCell>{r.vendor}</TableCell>
                  <TableCell className="text-muted-foreground">{r.date ? format(new Date(r.date), "dd MMM yyyy") : "—"}</TableCell>
                  <TableCell>AED {Number(r.total).toLocaleString()}</TableCell>
                  <TableCell><Badge variant="secondary" className={`border-0 ${statusColors[r.status] || ""}`}>{r.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewItem(r)}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
            <DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
          </>
        )}
      </CardContent></Card>

      {/* Create Dialog */}
      <Dialog open={open} onOpenChange={setOpen}><DialogContent>
        <DialogHeader><DialogTitle>New Purchase Order</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Vendor</Label><Input value={form.vendor} onChange={e => setForm({ ...form, vendor: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Total (AED)</Label><Input type="number" value={form.total} onChange={e => setForm({ ...form, total: e.target.value })} /></div>
            <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
          </div>
          <div><Label>Status</Label><ComboboxSelect value={form.status} onValueChange={v => setForm({ ...form, status: v })} options={["draft", "pending", "approved"]} allowCustom={false} /></div>
          <Button className="w-full h-9" onClick={() => save.mutate()} disabled={!form.vendor || save.isPending}>{save.isPending ? "Creating..." : "Create PO"}</Button>
        </div>
      </DialogContent></Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}><DialogContent>
        <DialogHeader><DialogTitle>PO Details — {viewItem?.po_no}</DialogTitle></DialogHeader>
        {viewItem && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-muted-foreground">Vendor</p><p className="font-medium">{viewItem.vendor}</p></div>
              <div><p className="text-xs text-muted-foreground">Total</p><p className="font-medium">AED {Number(viewItem.total).toLocaleString()}</p></div>
              <div><p className="text-xs text-muted-foreground">Date</p><p>{viewItem.date ? format(new Date(viewItem.date), "dd MMM yyyy") : "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Status</p><Badge variant="secondary" className={`border-0 ${statusColors[viewItem.status] || ""}`}>{viewItem.status}</Badge></div>
            </div>
          </div>
        )}
      </DialogContent></Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} onConfirm={() => deleteId && remove.mutate(deleteId)} />
    </div>
  );
}
