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
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Plus, Search, Receipt, Pencil, Trash2, Eye, Printer, TrendingUp, AlertTriangle, CheckCircle, Clock, FileText, LayoutGrid, List, Send } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { ComboboxSelect } from "@/components/ComboboxSelect";
import { StatusFilter } from "@/components/StatusFilter";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ExportButton } from "@/components/ExportButton";

const statusStyles: Record<string, { bg: string; icon: any }> = {
  draft: { bg: "bg-muted text-muted-foreground", icon: FileText },
  sent: { bg: "bg-primary/15 text-primary", icon: Clock },
  paid: { bg: "bg-success/15 text-success", icon: CheckCircle },
  overdue: { bg: "bg-destructive/15 text-destructive", icon: AlertTriangle },
};
const emptyForm = { client_id: "", due_date: "", subtotal: "", status: "draft", payment_terms: "30", notes: "" };

export default function Invoices() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewing, setViewing] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: rawData = [], isLoading , isError: dataLoadError} = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => { const { data } = await supabase.from("invoices").select("*, clients(name)").order("created_at", { ascending: false }); return data || []; },
  });
  const { data: clients = [] } = useQuery({ queryKey: ["clients-inv"], queryFn: async () => { const { data } = await supabase.from("clients").select("id,name"); return data || []; } });

  // Compute overdue status client-side
  const data = rawData.map((r: any) => {
    if (r.status !== "paid" && r.due_date && new Date(r.due_date) < new Date()) {
      return { ...r, status: "overdue" };
    }
    return r;
  });

  const save = useMutation({
    mutationFn: async () => {
      const sub = parseFloat(form.subtotal) || 0;
      const vat = sub * 0.05;
      if (editingId) {
        const { error } = await (supabase as any).from("invoices").update({ subtotal: sub, vat, total: sub + vat, due_date: form.due_date || null, client_id: form.client_id || null, status: form.status, payment_terms: form.payment_terms || null, notes: form.notes || null }).eq("id", editingId);
        if (error) throw error;
        await logAudit("Updated invoice", editingId);
      } else {
        const { error } = await (supabase as any).from("invoices").insert({ subtotal: sub, vat, total: sub + vat, invoice_no: `INV-${Date.now().toString().slice(-6)}`, created_by: user?.id, client_id: form.client_id || null, due_date: form.due_date || null, payment_terms: form.payment_terms || null, notes: form.notes || null });
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

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase as any).from("invoices").update({ status }).eq("id", id);
      if (error) throw error;
      await logAudit("Updated invoice status", `${id} → ${status}`);
    },
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success(`Marked as ${status}`);
      // Update viewing state too
      setViewing((prev: any) => prev ? { ...prev, status } : null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleEdit = (r: any) => {
    setEditingId(r.id);
    setForm({ client_id: r.client_id || "", due_date: r.due_date || "", subtotal: String(r.subtotal || ""), status: r.status || "draft", payment_terms: r.payment_terms || "30", notes: r.notes || "" });
    setOpen(true);
  };

  const printInvoice = (r: any) => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Invoice ${r.invoice_no}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 700px; margin: 40px auto; color: #333; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; border-bottom: 2px solid #333; padding-bottom: 16px; }
  .company { font-size: 24px; font-weight: bold; color: #1a1a2e; }
  .invoice-title { font-size: 32px; font-weight: bold; color: #4f46e5; }
  .invoice-no { font-size: 18px; color: #666; margin-top: 4px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
  .info-block label { font-size: 11px; text-transform: uppercase; color: #888; letter-spacing: 0.05em; }
  .info-block p { font-size: 15px; font-weight: 600; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th { background: #f5f5f5; padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #666; }
  td { padding: 12px; border-bottom: 1px solid #eee; font-size: 14px; }
  .totals { max-width: 300px; margin-left: auto; }
  .totals tr td { border: none; padding: 6px 12px; }
  .total-row td { font-size: 18px; font-weight: bold; border-top: 2px solid #333 !important; padding-top: 12px !important; }
  .status { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
  .status-paid { background: #d1fae5; color: #065f46; }
  .status-sent { background: #e0e7ff; color: #3730a3; }
  .status-draft { background: #f3f4f6; color: #374151; }
  .status-overdue { background: #fee2e2; color: #991b1b; }
  @media print { body { margin: 0; } }
</style></head><body>
<div class="header">
  <div><div class="company">SKPM Operations</div><div style="color:#666;font-size:13px;margin-top:4px;">skpm@example.com</div></div>
  <div style="text-align:right"><div class="invoice-title">INVOICE</div><div class="invoice-no">${r.invoice_no}</div></div>
</div>
<div class="info-grid">
  <div class="info-block"><label>Bill To</label><p>${r.clients?.name || "—"}</p></div>
  <div class="info-block"><label>Status</label><p><span class="status status-${r.status}">${r.status}</span></p></div>
  <div class="info-block"><label>Issue Date</label><p>${r.issue_date ? format(new Date(r.issue_date), "dd MMM yyyy") : format(new Date(), "dd MMM yyyy")}</p></div>
  <div class="info-block"><label>Due Date</label><p>${r.due_date ? format(new Date(r.due_date), "dd MMM yyyy") : "—"}</p></div>
  ${r.payment_terms ? `<div class="info-block"><label>Payment Terms</label><p>${r.payment_terms === "immediate" ? "Immediate" : `Net ${r.payment_terms} Days`}</p></div>` : ""}
</div>
<table>
  <thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
  <tbody>
    <tr><td>Professional Services</td><td style="text-align:right">AED ${Number(r.subtotal).toLocaleString()}</td></tr>
  </tbody>
</table>
<table class="totals">
  <tr><td style="color:#666">Subtotal</td><td style="text-align:right">AED ${Number(r.subtotal).toLocaleString()}</td></tr>
  <tr><td style="color:#666">VAT (5%)</td><td style="text-align:right">AED ${Number(r.vat).toLocaleString()}</td></tr>
  <tr class="total-row"><td>Total</td><td style="text-align:right">AED ${Number(r.total).toLocaleString()}</td></tr>
</table>
${r.notes ? `<div style="margin-top:24px;padding:16px;background:#f9fafb;border-radius:8px;"><strong>Notes:</strong><p style="margin-top:8px;color:#555">${r.notes}</p></div>` : ""}
<div style="margin-top:40px;text-align:center;color:#aaa;font-size:12px;border-top:1px solid #eee;padding-top:16px;">Thank you for your business</div>
</body></html>`);
    win.document.close();
    win.print();
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

  const totalAmount = data.reduce((s: number, r: any) => s + (r.total || 0), 0);
  const paidAmount = data.filter((r: any) => r.status === "paid").reduce((s: number, r: any) => s + (r.total || 0), 0);
  const outstanding = totalAmount - paidAmount;
  const overdueCount = data.filter((r: any) => r.status === "overdue").length;
  const collectionRate = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;
  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

  const getDueBadge = (r: any) => {
    if (r.status === "paid" || !r.due_date) return null;
    const days = differenceInDays(new Date(r.due_date), new Date());
    if (days < 0) return <Badge variant="destructive" className="text-[10px] px-1.5">{Math.abs(days)}d overdue</Badge>;
    if (days <= 7) return <Badge className="text-[10px] px-1.5 bg-warning/15 text-warning border-0">{days}d left</Badge>;
    return null;
  };

  return (
    <div className="space-y-6 animate-fade-in">
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
        <div className="flex items-center gap-3"><Receipt className="h-7 w-7 text-primary" /><div><h1 className="text-2xl font-bold">Invoices</h1><p className="text-sm text-muted-foreground">{data.length} invoices</p></div></div>
        <div className="flex gap-2">
          <ExportButton data={filtered} filename="invoices" columns={[{key:"invoice_no",label:"Invoice#"},{key:"clients.name",label:"Client"},{key:"total",label:"Total"},{key:"due_date",label:"Due"},{key:"status",label:"Status"}]} />
          <Button size="sm" className="h-9" onClick={() => { setEditingId(null); setForm(emptyForm); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />New Invoice</Button>
        </div>
      </div>

      {/* Enhanced KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Invoiced</p>
                <p className="text-2xl font-bold mt-1">AED {totalAmount.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">{data.length} invoices</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Collected</p>
                <p className="text-2xl font-bold text-success mt-1">AED {paidAmount.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">Rate: {collectionRate}%</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
            </div>
            <Progress value={collectionRate} className="mt-2 h-1.5" />
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Outstanding</p>
                <p className="text-2xl font-bold text-warning mt-1">AED {outstanding.toLocaleString()}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Overdue</p>
                <p className="text-2xl font-bold text-destructive mt-1">{overdueCount}</p>
                {overdueCount > 0 && <p className="text-[10px] text-destructive mt-1">Requires attention</p>}
              </div>
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card><CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search invoices..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
          <StatusFilter statuses={statuses} selected={statusFilter} onSelect={setStatusFilter} />
          <div className="flex border rounded-md">
            <Button variant={viewMode === "table" ? "secondary" : "ghost"} size="icon" className="h-9 w-9 rounded-r-none" onClick={() => setViewMode("table")}><List className="h-4 w-4" /></Button>
            <Button variant={viewMode === "cards" ? "secondary" : "ghost"} size="icon" className="h-9 w-9 rounded-l-none" onClick={() => setViewMode("cards")}><LayoutGrid className="h-4 w-4" /></Button>
          </div>
        </div>

        {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No invoices found</p> : viewMode === "cards" ? (
          <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pageData.map((r: any) => {
              const st = statusStyles[r.status] || statusStyles.draft;
              const StatusIcon = st.icon;
              return (
                <Card key={r.id} className="group hover:shadow-md transition-all hover:-translate-y-0.5">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-mono text-xs text-muted-foreground">{r.invoice_no}</p>
                        <h3 className="font-semibold text-sm mt-0.5">{r.clients?.name || "No Client"}</h3>
                      </div>
                      <Badge variant="secondary" className={`${st.bg} border-0 gap-1 text-[10px]`}>
                        <StatusIcon className="h-3 w-3" />{r.status}
                      </Badge>
                    </div>
                    <div className="text-2xl font-bold">AED {r.total?.toLocaleString()}</div>
                    <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                      <span>Due: {r.due_date ? format(new Date(r.due_date), "dd MMM yyyy") : "—"}</span>
                      {getDueBadge(r)}
                    </div>
                    <Separator className="my-3" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Subtotal: {r.subtotal?.toLocaleString()}</span>
                      <span>VAT: {r.vat?.toLocaleString()}</span>
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
            <SortableHeader label="Invoice #" sortKey="invoice_no" direction={getSortDirection("invoice_no")} onToggle={toggleSort} />
            <SortableHeader label="Client" sortKey="clients.name" direction={getSortDirection("clients.name")} onToggle={toggleSort} />
            <SortableHeader label="Subtotal" sortKey="subtotal" direction={getSortDirection("subtotal")} onToggle={toggleSort} />
            <SortableHeader label="VAT" sortKey="vat" direction={getSortDirection("vat")} onToggle={toggleSort} />
            <SortableHeader label="Total (AED)" sortKey="total" direction={getSortDirection("total")} onToggle={toggleSort} />
            <SortableHeader label="Due Date" sortKey="due_date" direction={getSortDirection("due_date")} onToggle={toggleSort} />
            <SortableHeader label="Status" sortKey="status" direction={getSortDirection("status")} onToggle={toggleSort} />
            <TableHead>Actions</TableHead>
          </TableRow></TableHeader>
            <TableBody>{pageData.map((r: any) => {
              const st = statusStyles[r.status] || statusStyles.draft;
              const StatusIcon = st.icon;
              return (
              <TableRow key={r.id} className="group">
                <TableCell className="font-mono text-xs">{r.invoice_no}</TableCell>
                <TableCell className="font-medium">{r.clients?.name || "—"}</TableCell>
                <TableCell className="text-xs">{r.subtotal?.toLocaleString()}</TableCell>
                <TableCell className="text-xs">{r.vat?.toLocaleString()}</TableCell>
                <TableCell className="font-bold">AED {r.total?.toLocaleString()}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <span>{r.due_date ? format(new Date(r.due_date), "dd MMM") : "—"}</span>
                    {getDueBadge(r)}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={`${st.bg} border-0 gap-1 text-[10px]`}>
                    <StatusIcon className="h-3 w-3" />{r.status}
                  </Badge>
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
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditingId(null); setForm(emptyForm); } }}><DialogContent>
        <DialogHeader><DialogTitle>{editingId ? "Edit Invoice" : "New Invoice"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Client</Label><ComboboxSelect value={form.client_id} onValueChange={v => setForm({ ...form, client_id: v })} options={clients.map((c: any) => ({ value: c.id, label: c.name }))} placeholder="Select client..." allowCustom={false} /></div>
          <div>
            <Label>Subtotal (AED)</Label>
            <Input type="number" value={form.subtotal} onChange={e => setForm({ ...form, subtotal: e.target.value })} />
            {form.subtotal && (
              <div className="mt-2 p-2.5 bg-muted rounded-md text-xs space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>AED {(parseFloat(form.subtotal) || 0).toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">VAT (5%)</span><span>AED {((parseFloat(form.subtotal) || 0) * 0.05).toLocaleString()}</span></div>
                <Separator />
                <div className="flex justify-between font-semibold"><span>Total</span><span>AED {((parseFloat(form.subtotal) || 0) * 1.05).toLocaleString()}</span></div>
              </div>
            )}
          </div>
          <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
          <div>
            <Label>Payment Terms</Label>
            <Select value={form.payment_terms} onValueChange={v => setForm({ ...form, payment_terms: v })}>
              <SelectTrigger><SelectValue placeholder="Select terms" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">Immediate</SelectItem>
                <SelectItem value="30">Net 30 Days</SelectItem>
                <SelectItem value="60">Net 60 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Invoice-specific notes..." /></div>
          {editingId && <div><Label>Status</Label><Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="sent">Sent</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="overdue">Overdue</SelectItem></SelectContent></Select></div>}
          <Button className="w-full h-9" onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving..." : editingId ? "Update" : "Create Invoice"}</Button>
        </div>
      </DialogContent></Dialog>

      {/* Enhanced View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}><DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Invoice Details
            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => viewing && printInvoice(viewing)}><Printer className="h-3 w-3" />Print</Button>
          </DialogTitle>
        </DialogHeader>
        {viewing && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between pb-3 border-b">
              <div>
                <p className="font-mono text-lg font-bold">{viewing.invoice_no}</p>
                <p className="text-muted-foreground">{viewing.clients?.name || "No Client"}</p>
              </div>
              {(() => { const st = statusStyles[viewing.status] || statusStyles.draft; const StatusIcon = st.icon; return (
                <Badge variant="secondary" className={`${st.bg} border-0 gap-1`}><StatusIcon className="h-3.5 w-3.5" />{viewing.status}</Badge>
              ); })()}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-muted-foreground text-xs">Issue Date</p><p className="font-medium">{viewing.issue_date ? format(new Date(viewing.issue_date), "dd MMM yyyy") : "—"}</p></div>
              <div><p className="text-muted-foreground text-xs">Due Date</p><p className="font-medium">{viewing.due_date ? format(new Date(viewing.due_date), "dd MMM yyyy") : "—"}</p></div>
              <div><p className="text-muted-foreground text-xs">Payment Method</p><p className="font-medium capitalize">{viewing.payment_method || "—"}</p></div>
              <div><p className="text-muted-foreground text-xs">Payment Terms</p><p className="font-medium">{viewing.payment_terms === "immediate" ? "Immediate" : viewing.payment_terms ? `Net ${viewing.payment_terms} Days` : "—"}</p></div>
            </div>
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">Subtotal</span><span>AED {viewing.subtotal?.toLocaleString()}</span></div>
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">VAT (5%)</span><span>AED {viewing.vat?.toLocaleString()}</span></div>
              <Separator />
              <div className="flex justify-between font-bold"><span>Total</span><span>AED {viewing.total?.toLocaleString()}</span></div>
            </div>
            {viewing.notes && <div><p className="text-muted-foreground text-xs">Notes</p><p className="text-sm">{viewing.notes}</p></div>}
            {/* Status workflow buttons */}
            <div className="flex gap-2 flex-wrap pt-2 border-t">
              {viewing.status === "draft" && (
                <Button size="sm" className="h-8 gap-1.5 text-xs" variant="outline" onClick={() => updateStatus.mutate({ id: viewing.id, status: "sent" })} disabled={updateStatus.isPending}>
                  <Send className="h-3 w-3" />Mark as Sent
                </Button>
              )}
              {(viewing.status === "draft" || viewing.status === "sent" || viewing.status === "overdue") && (
                <Button size="sm" className="h-8 gap-1.5 text-xs bg-success hover:bg-success/90 text-white" onClick={() => updateStatus.mutate({ id: viewing.id, status: "paid" })} disabled={updateStatus.isPending}>
                  <CheckCircle className="h-3 w-3" />Mark as Paid
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent></Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete Invoice?" onConfirm={() => deleteId && remove.mutate(deleteId)} />
    </div>
  );
}
