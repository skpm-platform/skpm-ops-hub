import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, FileSignature, Pencil, Trash2, Eye, Printer, Send , AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { ExportButton } from "@/components/ExportButton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusFilter } from "@/components/StatusFilter";
import { quotationSchema } from "@/lib/validations";

const statusColors: Record<string, string> = { draft: "bg-muted text-muted-foreground", sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" };

function getValidityBadge(valid_until: string | null, status: string) {
  if (!valid_until) return null;
  const days = differenceInDays(new Date(valid_until), new Date());
  if (days < 0) return <Badge variant="secondary" className="border-0 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[10px]">Expired</Badge>;
  if (days <= 7) return <Badge variant="secondary" className="border-0 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-[10px]">Expiring {days}d</Badge>;
  return <Badge variant="secondary" className="border-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px]">Valid</Badge>;
}

export default function Quotations() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewItem, setViewItem] = useState<any>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [form, setForm] = useState({ client_id: "", valid_until: "", subtotal: "", status: "draft" });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const { data = [], isLoading , isError: dataLoadError} = useQuery({
    queryKey: ["quotations"],
    queryFn: async () => { const { data } = await supabase.from("quotations").select("*, clients(name)").order("created_at", { ascending: false }); return data || []; },
  });
  const { data: clients = [] } = useQuery({ queryKey: ["clients-q"], queryFn: async () => { const { data } = await supabase.from("clients").select("id,name"); return data || []; } });

  const resetForm = () => { setForm({ client_id: "", valid_until: "", subtotal: "", status: "draft" }); setFormErrors({}); };

  const save = useMutation({
    mutationFn: async () => {
      const result = quotationSchema.safeParse(form);
      if (!result.success) {
        const errs: Record<string, string> = {};
        result.error.errors.forEach(e => { if (e.path[0]) errs[e.path[0] as string] = e.message; });
        setFormErrors(errs);
        throw new Error("Validation failed");
      }
      setFormErrors({});
      const subtotal = parseFloat(result.data.subtotal) || 0;
      const vat = subtotal * 0.05;
      if (editingId) {
        const { error } = await supabase.from("quotations").update({ client_id: result.data.client_id || null, subtotal, vat, total: subtotal + vat, valid_until: result.data.valid_until || null, status: result.data.status }).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("quotations").insert({ client_id: result.data.client_id || null, subtotal, vat, total: subtotal + vat, quote_no: `QT-${Date.now().toString().slice(-6)}`, created_by: user?.id, valid_until: result.data.valid_until || null, status: result.data.status });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quotations"] }); toast.success(editingId ? "Updated" : "Created"); setOpen(false); setEditingId(null); resetForm(); },
    onError: (e: any) => { if (e.message !== "Validation failed") toast.error(e.message); },
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("quotations").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quotations"] }); toast.success("Deleted"); setDeleteId(null); },
  });

  const bulkDelete = useMutation({
    mutationFn: async () => {
      const ids = Array.from(selected);
      const { error } = await supabase.from("quotations").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quotations"] }); toast.success(`${selected.size} items deleted`); setSelected(new Set()); setBulkDeleteOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const markSent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quotations").update({ status: "sent" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotations"] });
      toast.success("Marked as sent");
      setViewItem((prev: any) => prev ? { ...prev, status: "sent" } : null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const convertToInvoice = useMutation({
    mutationFn: async (q: any) => {
      const { error } = await supabase.from("invoices").insert({
        client_id: q.client_id || null,
        subtotal: q.subtotal,
        vat: q.vat,
        total: q.total,
        status: "draft",
        invoice_no: `INV-${Date.now().toString().slice(-6)}`,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Invoice created from quotation");
      setViewOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleEdit = (r: any) => {
    setEditingId(r.id);
    setForm({ client_id: r.client_id || "", valid_until: r.valid_until || "", subtotal: String(r.subtotal || ""), status: r.status || "draft" });
    setFormErrors({});
    setOpen(true);
  };

  const printQuotation = (r: any) => {
    const win = window.open("", "_blank");
    if (!win) return;
    const validityDays = r.valid_until ? differenceInDays(new Date(r.valid_until), new Date()) : null;
    win.document.write(`<!DOCTYPE html><html><head><title>Quotation ${r.quote_no}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 700px; margin: 40px auto; color: #333; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; border-bottom: 2px solid #333; padding-bottom: 16px; }
  .company { font-size: 24px; font-weight: bold; color: #1a1a2e; }
  .quote-title { font-size: 32px; font-weight: bold; color: #4f46e5; }
  .quote-no { font-size: 18px; color: #666; margin-top: 4px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
  .info-block label { font-size: 11px; text-transform: uppercase; color: #888; letter-spacing: 0.05em; }
  .info-block p { font-size: 15px; font-weight: 600; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th { background: #f5f5f5; padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #666; }
  td { padding: 12px; border-bottom: 1px solid #eee; font-size: 14px; }
  .totals { max-width: 300px; margin-left: auto; }
  .totals tr td { border: none; padding: 6px 12px; }
  .total-row td { font-size: 18px; font-weight: bold; border-top: 2px solid #333 !important; padding-top: 12px !important; }
  @media print { body { margin: 0; } }
</style></head><body>
<div class="header">
  <div><div class="company">SKPM Operations</div><div style="color:#666;font-size:13px;margin-top:4px;">skpm@example.com</div></div>
  <div style="text-align:right"><div class="quote-title">QUOTATION</div><div class="quote-no">${r.quote_no}</div></div>
</div>
<div class="info-grid">
  <div class="info-block"><label>Prepared For</label><p>${r.clients?.name || "—"}</p></div>
  <div class="info-block"><label>Status</label><p style="text-transform:capitalize">${r.status}</p></div>
  <div class="info-block"><label>Date</label><p>${format(new Date(), "dd MMM yyyy")}</p></div>
  <div class="info-block"><label>Valid Until</label><p>${r.valid_until ? format(new Date(r.valid_until), "dd MMM yyyy") : "—"}${validityDays !== null ? ` (${validityDays >= 0 ? validityDays + " days left" : "Expired"})` : ""}</p></div>
</div>
<table>
  <thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
  <tbody><tr><td>Professional Services</td><td style="text-align:right">AED ${Number(r.subtotal).toLocaleString()}</td></tr></tbody>
</table>
<table class="totals">
  <tr><td style="color:#666">Subtotal</td><td style="text-align:right">AED ${Number(r.subtotal).toLocaleString()}</td></tr>
  <tr><td style="color:#666">VAT (5%)</td><td style="text-align:right">AED ${Number(r.vat).toLocaleString()}</td></tr>
  <tr class="total-row"><td>Total</td><td style="text-align:right">AED ${Number(r.total).toLocaleString()}</td></tr>
</table>
<div style="margin-top:40px;text-align:center;color:#aaa;font-size:12px;border-top:1px solid #eee;padding-top:16px;">This quotation is valid until ${r.valid_until ? format(new Date(r.valid_until), "dd MMM yyyy") : "further notice"}</div>
</body></html>`);
    win.document.close();
    win.print();
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

  const totalValue = data.reduce((s: number, r: any) => s + (r.total || 0), 0);
  const statusCounts = data.reduce((a: Record<string, number>, r: any) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {});

  const filtered = data
    .filter((r: any) => (r.quote_no || "").toLowerCase().includes(search.toLowerCase()) || (r.clients?.name || "").toLowerCase().includes(search.toLowerCase()))
    .filter((r: any) => statusFilter === "all" || r.status === statusFilter);
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><FileSignature className="h-7 w-7 text-primary" /><h1 className="text-2xl font-bold">Quotations</h1></div>
        <div className="flex gap-2">
          {selected.size > 0 && <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}><Trash2 className="h-4 w-4 mr-1" />Delete {selected.size}</Button>}
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

      <StatusFilter statuses={[{value:"all",label:"All",count:data.length},{value:"draft",label:"Draft",count:statusCounts.draft||0},{value:"sent",label:"Sent",count:statusCounts.sent||0},{value:"approved",label:"Approved",count:statusCounts.approved||0},{value:"rejected",label:"Rejected",count:statusCounts.rejected||0}]} selected={statusFilter} onSelect={setStatusFilter} />

      <Card><CardContent className="pt-6">
        <div className="mb-4 relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No quotations</p> : (
          <>
          <Table><TableHeader><TableRow>
            <TableCell className="w-10"><Checkbox checked={selected.size === pageData.length && pageData.length > 0} onCheckedChange={toggleAll} /></TableCell>
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
              <TableRow key={r.id} className={selected.has(r.id) ? "bg-muted/50" : ""}>
                <TableCell><Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleSelect(r.id)} /></TableCell>
                <TableCell className="font-medium font-mono text-xs">{r.quote_no}</TableCell>
                <TableCell>{r.clients?.name || "—"}</TableCell>
                <TableCell>{r.subtotal?.toLocaleString()}</TableCell>
                <TableCell className="text-muted-foreground">{r.vat?.toLocaleString()}</TableCell>
                <TableCell className="font-medium">AED {r.total?.toLocaleString()}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs">{r.valid_until || "—"}</span>
                    {r.valid_until && getValidityBadge(r.valid_until, r.status)}
                  </div>
                </TableCell>
                <TableCell><Badge variant="secondary" className={`border-0 ${statusColors[r.status] || ""}`}>{r.status}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => { setViewItem(r); setViewOpen(true); }}><Eye className="h-4 w-4" /></Button>
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

      {/* Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { setEditingId(null); resetForm(); } }}><DialogContent>
        <DialogHeader><DialogTitle>{editingId ? "Edit" : "New"} Quotation</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Client</Label><Select value={form.client_id} onValueChange={v => setForm({...form, client_id: v})}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Subtotal (AED)</Label><Input type="number" value={form.subtotal} onChange={e => setForm({...form, subtotal: e.target.value})} /><p className="text-xs text-muted-foreground mt-1">VAT (5%) added automatically</p>{formErrors.subtotal && <p className="text-xs text-destructive mt-1">{formErrors.subtotal}</p>}</div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Valid Until</Label><Input type="date" value={form.valid_until} onChange={e => setForm({...form, valid_until: e.target.value})} /></div>
            <div><Label>Status</Label><Select value={form.status} onValueChange={v => setForm({...form, status: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="sent">Sent</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="rejected">Rejected</SelectItem></SelectContent></Select></div>
          </div>
          <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving..." : editingId ? "Update" : "Create"}</Button>
        </div>
      </DialogContent></Dialog>

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={o => { setViewOpen(o); if (!o) setViewItem(null); }}><DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Quotation Details
            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => viewItem && printQuotation(viewItem)}><Printer className="h-3 w-3" />Print</Button>
          </DialogTitle>
        </DialogHeader>
        {viewItem && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between pb-3 border-b">
              <div>
                <p className="font-mono text-lg font-bold">{viewItem.quote_no}</p>
                <p className="text-muted-foreground">{viewItem.clients?.name || "No Client"}</p>
              </div>
              <Badge variant="secondary" className={`border-0 ${statusColors[viewItem.status] || ""}`}>{viewItem.status}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-muted-foreground text-xs">Valid Until</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className="font-medium">{viewItem.valid_until ? format(new Date(viewItem.valid_until), "dd MMM yyyy") : "—"}</p>
                  {viewItem.valid_until && getValidityBadge(viewItem.valid_until, viewItem.status)}
                </div>
              </div>
              <div><p className="text-muted-foreground text-xs">Status</p><p className="font-medium capitalize">{viewItem.status}</p></div>
            </div>
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">Subtotal</span><span>AED {Number(viewItem.subtotal).toLocaleString()}</span></div>
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">VAT (5%)</span><span>AED {Number(viewItem.vat).toLocaleString()}</span></div>
              <Separator />
              <div className="flex justify-between font-bold"><span>Total</span><span>AED {Number(viewItem.total).toLocaleString()}</span></div>
            </div>
            {/* Action buttons */}
            <div className="flex gap-2 flex-wrap pt-2 border-t">
              {viewItem.status === "draft" && (
                <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => markSent.mutate(viewItem.id)} disabled={markSent.isPending}>
                  <Send className="h-3 w-3" />Mark as Sent
                </Button>
              )}
              <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => convertToInvoice.mutate(viewItem)} disabled={convertToInvoice.isPending}>
                Convert to Invoice
              </Button>
              <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs" onClick={() => { setViewOpen(false); handleEdit(viewItem); }}>
                <Pencil className="h-3 w-3" />Edit
              </Button>
            </div>
          </div>
        )}
      </DialogContent></Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} onConfirm={() => deleteId && del.mutate(deleteId)} />
      <ConfirmDialog open={bulkDeleteOpen} onOpenChange={() => setBulkDeleteOpen(false)} title={`Delete ${selected.size} quotations?`} onConfirm={() => bulkDelete.mutate()} />
    </div>
  );
}
