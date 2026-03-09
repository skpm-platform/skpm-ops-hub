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
import { Separator } from "@/components/ui/separator";
import { Plus, Search, Receipt, Pencil, Trash2, Eye, Printer, TrendingUp, AlertTriangle, CheckCircle, Clock, FileText, LayoutGrid, List } from "lucide-react";
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
const emptyForm = { client_id: "", due_date: "", subtotal: "", status: "draft" };

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
    setForm({ client_id: r.client_id || "", due_date: r.due_date || "", subtotal: String(r.subtotal || ""), status: r.status || "draft" });
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
          {editingId && <div><Label>Status</Label><Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="sent">Sent</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="overdue">Overdue</SelectItem></SelectContent></Select></div>}
          <Button className="w-full h-9" onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving..." : editingId ? "Update" : "Create Invoice"}</Button>
        </div>
      </DialogContent></Dialog>

      {/* Enhanced View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}><DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Invoice Details
            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => window.print()}><Printer className="h-3 w-3" />Print</Button>
          </DialogTitle>
        </DialogHeader>
        {viewing && (
          <div className="space-y-4 text-sm" id="invoice-print">
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
              <div><p className="text-muted-foreground text-xs">Paid Date</p><p className="font-medium">{viewing.paid_date ? format(new Date(viewing.paid_date), "dd MMM yyyy") : "—"}</p></div>
            </div>
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">Subtotal</span><span>AED {viewing.subtotal?.toLocaleString()}</span></div>
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">VAT (5%)</span><span>AED {viewing.vat?.toLocaleString()}</span></div>
              <Separator />
              <div className="flex justify-between font-bold"><span>Total</span><span>AED {viewing.total?.toLocaleString()}</span></div>
            </div>
          </div>
        )}
      </DialogContent></Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete Invoice?" onConfirm={() => deleteId && remove.mutate(deleteId)} />
    </div>
  );
}
