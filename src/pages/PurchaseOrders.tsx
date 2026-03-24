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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ComboboxSelect } from "@/components/ComboboxSelect";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ExportButton } from "@/components/ExportButton";
import { StatusFilter, buildStatuses } from "@/components/StatusFilter";
import { SortableHeader } from "@/components/SortableHeader";
import { DataTablePagination } from "@/components/DataTablePagination";
import { useDataTable } from "@/hooks/use-data-table";
import {
  Plus, Search, ShoppingCart, Eye, Trash2, Loader2, Pencil,
  CheckCircle2, Clock, Package, DollarSign, FileText, TrendingUp,
  ArrowRight,
  AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-warning/15 text-warning",
  approved: "bg-success/15 text-success",
  received: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  cancelled: "bg-destructive/15 text-destructive",
};

const statusFlow = ["draft", "pending", "approved", "received"];

const emptyForm = {
  vendor: "",
  total: "",
  status: "draft",
  date: format(new Date(), "yyyy-MM-dd"),
  description: "",
  category: "",
  delivery_date: "",
};

export default function PurchaseOrders() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewItem, setViewItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data = [], isLoading , isError: dataLoadError} = useQuery({
    queryKey: ["purchase_orders"],
    queryFn: async () => {
      const { data } = await supabase.from("purchase_orders").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        vendor: form.vendor,
        total: parseFloat(form.total) || 0,
        status: form.status,
        date: form.date,
        description: form.description || null,
        category: form.category || null,
        delivery_date: form.delivery_date || null,
      };
      if (editingId) {
        const { error } = await supabase.from("purchase_orders").update(payload).eq("id", editingId);
        if (error) throw error;
        await logAudit("Updated PO", form.vendor);
      } else {
        const { error } = await supabase.from("purchase_orders").insert({
          ...payload,
          po_no: `PO-${Date.now().toString().slice(-6)}`,
          created_by: user?.id,
        });
        if (error) throw error;
        await logAudit("Created PO", form.vendor);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase_orders"] });
      toast.success(editingId ? "PO updated" : "PO created");
      setOpen(false);
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const po = data.find((r: any) => r.id === id);
      const { error } = await supabase.from("purchase_orders").delete().eq("id", id);
      if (error) throw error;
      await logAudit("Deleted PO", po?.po_no || id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase_orders"] });
      toast.success("PO deleted");
      setDeleteId(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const advanceStatus = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: string }) => {
      const { error } = await supabase.from("purchase_orders").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
      await logAudit("Advanced PO status", newStatus);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["purchase_orders"] });
      toast.success(`PO marked as ${vars.newStatus}`);
      if (viewItem) setViewItem((prev: any) => ({ ...prev, status: vars.newStatus }));
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleEdit = (r: any) => {
    setEditingId(r.id);
    setForm({
      vendor: r.vendor || "",
      total: String(r.total || ""),
      status: r.status || "draft",
      date: r.date || format(new Date(), "yyyy-MM-dd"),
      description: r.description || "",
      category: r.category || "",
      delivery_date: r.delivery_date || "",
    });
    setOpen(true);
  };

  const totalValue = data.reduce((s: number, r: any) => s + Number(r.total || 0), 0);
  const statusCounts = data.reduce((acc: Record<string, number>, r: any) => {
    acc[r.status || "draft"] = (acc[r.status || "draft"] || 0) + 1;
    return acc;
  }, {});
  const approvedValue = data.filter((r: any) => r.status === "approved" || r.status === "received")
    .reduce((s: number, r: any) => s + Number(r.total || 0), 0);

  const filtered = data.filter((r: any) => {
    const matchSearch = JSON.stringify(r).toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShoppingCart className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Purchase Orders</h1>
            <p className="text-sm text-muted-foreground">{data.length} purchase orders</p>
          </div>
        </div>
        <div className="flex gap-2">
          <ExportButton
            data={data}
            filename="purchase-orders"
            columns={[
              { key: "po_no", label: "PO #" },
              { key: "vendor", label: "Vendor" },
              { key: "category", label: "Category" },
              { key: "total", label: "Total (AED)" },
              { key: "status", label: "Status" },
              { key: "date", label: "Date" },
              { key: "delivery_date", label: "Delivery Date" },
            ]}
          />
          <Button size="sm" className="h-9" onClick={() => { setEditingId(null); setForm(emptyForm); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />New PO
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total POs</p>
              <p className="text-2xl font-semibold mt-1">{data.length}</p>
            </div>
            <FileText className="h-7 w-7 text-muted-foreground/20" />
          </div>
        </CardContent></Card>

        <Card><CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Value</p>
              <p className="text-2xl font-semibold mt-1">AED {totalValue.toLocaleString()}</p>
            </div>
            <DollarSign className="h-7 w-7 text-muted-foreground/20" />
          </div>
        </CardContent></Card>

        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Pending Approval</p>
          <p className="text-2xl font-semibold mt-1 text-warning">{statusCounts["pending"] || 0}</p>
          <Progress value={data.length > 0 ? ((statusCounts["pending"] || 0) / data.length) * 100 : 0} className="h-1 mt-2" />
        </CardContent></Card>

        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Received</p>
          <p className="text-2xl font-semibold mt-1 text-success">{statusCounts["received"] || 0}</p>
          <p className="text-xs text-muted-foreground mt-0.5">AED {approvedValue.toLocaleString()}</p>
        </CardContent></Card>
      </div>

      <StatusFilter
        statuses={buildStatuses(statusCounts, ["draft", "pending", "approved", "received", "cancelled"])}
        selected={statusFilter}
        onSelect={setStatusFilter}
      />

      <Card>
        <CardContent className="pt-5">
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by vendor, PO number, category..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : pageData.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No purchase orders</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableHeader label="PO #" sortKey="po_no" direction={getSortDirection("po_no")} onToggle={toggleSort} />
                      <SortableHeader label="Vendor" sortKey="vendor" direction={getSortDirection("vendor")} onToggle={toggleSort} />
                      <SortableHeader label="Category" sortKey="category" direction={getSortDirection("category")} onToggle={toggleSort} />
                      <SortableHeader label="Date" sortKey="date" direction={getSortDirection("date")} onToggle={toggleSort} />
                      <SortableHeader label="Total (AED)" sortKey="total" direction={getSortDirection("total")} onToggle={toggleSort} />
                      <SortableHeader label="Status" sortKey="status" direction={getSortDirection("status")} onToggle={toggleSort} />
                      <TableHead className="w-28">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageData.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs font-medium">{r.po_no}</TableCell>
                        <TableCell className="font-medium">{r.vendor}</TableCell>
                        <TableCell>
                          {r.category ? (
                            <Badge variant="outline" className="text-xs">{r.category}</Badge>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {r.date ? format(new Date(r.date), "dd MMM yyyy") : "—"}
                        </TableCell>
                        <TableCell className="font-medium">AED {Number(r.total).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={`border-0 text-xs ${statusColors[r.status] || ""}`}>{r.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewItem(r)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(r)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(r.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
            </>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditingId(null); setForm(emptyForm); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Edit Purchase Order" : "New Purchase Order"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Vendor *</Label><Input value={form.vendor} onChange={e => setForm({ ...form, vendor: e.target.value })} placeholder="Vendor / supplier name" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Total (AED)</Label><Input type="number" value={form.total} onChange={e => setForm({ ...form, total: e.target.value })} placeholder="0.00" /></div>
              <div>
                <Label>Category</Label>
                <ComboboxSelect
                  value={form.category}
                  onValueChange={v => setForm({ ...form, category: v })}
                  options={[
                    { value: "Equipment", label: "Equipment" },
                    { value: "Materials", label: "Materials" },
                    { value: "Consumables", label: "Consumables" },
                    { value: "Services", label: "Services" },
                    { value: "IT", label: "IT" },
                    { value: "Office", label: "Office" },
                  ]}
                  placeholder="Select or type..."
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>PO Date</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
              <div><Label>Expected Delivery</Label><Input type="date" value={form.delivery_date} onChange={e => setForm({ ...form, delivery_date: e.target.value })} /></div>
            </div>
            {editingId && (
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending">Pending Approval</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="received">Received</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div><Label>Description / Notes</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Items, specifications, notes..." rows={3} /></div>
            <Button className="w-full h-9" onClick={() => save.mutate()} disabled={!form.vendor || save.isPending}>
              {save.isPending ? "Saving..." : editingId ? "Update PO" : "Create PO"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>PO Details — {viewItem?.po_no}</DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold">{viewItem.vendor}</p>
                  {viewItem.category && <Badge variant="outline" className="text-xs mt-0.5">{viewItem.category}</Badge>}
                </div>
                <Badge variant="secondary" className={`border-0 ${statusColors[viewItem.status] || ""}`}>{viewItem.status}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-muted-foreground">Total Value</p><p className="font-semibold text-base">AED {Number(viewItem.total).toLocaleString()}</p></div>
                <div><p className="text-xs text-muted-foreground">PO Date</p><p>{viewItem.date ? format(new Date(viewItem.date), "dd MMM yyyy") : "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Delivery Date</p><p>{viewItem.delivery_date ? format(new Date(viewItem.delivery_date), "dd MMM yyyy") : "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Created</p><p>{format(new Date(viewItem.created_at), "dd MMM yyyy")}</p></div>
              </div>

              {viewItem.description && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Description / Notes</p>
                  <p className="text-sm bg-muted/40 rounded-md p-2">{viewItem.description}</p>
                </div>
              )}

              {/* Status Workflow */}
              {viewItem.status !== "cancelled" && viewItem.status !== "received" && (() => {
                const currentIdx = statusFlow.indexOf(viewItem.status);
                const nextStatus = statusFlow[currentIdx + 1];
                return nextStatus ? (
                  <Button
                    className="w-full h-9 gap-2"
                    onClick={() => advanceStatus.mutate({ id: viewItem.id, newStatus: nextStatus })}
                    disabled={advanceStatus.isPending}
                  >
                    <ArrowRight className="h-4 w-4" />
                    Mark as {nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}
                  </Button>
                ) : null;
              })()}

              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => { setViewItem(null); handleEdit(viewItem); }}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                </Button>
                <Button size="sm" variant="destructive" className="flex-1" onClick={() => { setViewItem(null); setDeleteId(viewItem.id); }}>
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} onConfirm={() => deleteId && remove.mutate(deleteId)} />
    </div>
  );
}
