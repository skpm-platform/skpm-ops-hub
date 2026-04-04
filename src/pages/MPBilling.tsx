import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Plus, Search, Loader2, Banknote, DollarSign, Users, TrendingUp, Eye, Pencil, Trash2, CheckCircle, Receipt , AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { ExportButton } from "@/components/ExportButton";
import { StatusFilter, buildStatuses } from "@/components/StatusFilter";
import { ConfirmDialog } from "@/components/ConfirmDialog";

const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const statusBadgeClass: Record<string, string> = {
  draft: "border-0",
  submitted: "border-0 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  invoiced: "border-0 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  paid: "border-0 bg-success/15 text-success",
};

export default function MPBilling() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [viewItem, setViewItem] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), total_workers: 0, total_days: 0, rate: 0, notes: "", client_id: "", project_id: "" });

  const { data: rows = [], isLoading , isError: dataLoadError} = useQuery({
    queryKey: ["mp_billing"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mp_billing").select("*, clients(name), projects(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: clients = [] } = useQuery({ queryKey: ["clients-mpb"], queryFn: async () => { const { data } = await supabase.from("clients").select("id,name"); return data || []; } });
  const { data: projects = [] } = useQuery({ queryKey: ["projects-mpb"], queryFn: async () => { const { data } = await supabase.from("projects").select("id,name"); return data || []; } });

  const save = useMutation({
    mutationFn: async () => {
      const total_amount = Number(form.total_workers) * Number(form.total_days) * Number(form.rate);
      const payload = { ...form, total_workers: Number(form.total_workers), total_days: Number(form.total_days), rate: Number(form.rate), total_amount, client_id: form.client_id || null, project_id: form.project_id || null };
      if (editingId) {
        const { error } = await (supabase as any).from("mp_billing").update(payload).eq("id", editingId);
        if (error) throw error;
        await logAudit("Updated MP billing", `${total_amount} AED`, "mp_billing");
      } else {
        const { error } = await supabase.from("mp_billing").insert(payload);
        if (error) throw error;
        await logAudit("Created MP billing", `${total_amount} AED`, "mp_billing");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mp_billing"] });
      setOpen(false);
      setEditingId(null);
      setForm({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), total_workers: 0, total_days: 0, rate: 0, notes: "", client_id: "", project_id: "" });
      toast.success(editingId ? "Billing updated" : "Billing record created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("mp_billing").delete().eq("id", id);
      if (error) throw error;
      await logAudit("Deleted MP billing", id, "mp_billing");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mp_billing"] }); toast.success("Deleted"); setDeleteId(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase as any).from("mp_billing").update({ status }).eq("id", id);
      if (error) throw error;
      await logAudit("Updated MP billing status", `${id} → ${status}`, "mp_billing");
    },
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ["mp_billing"] });
      toast.success(`Marked as ${status}`);
      setViewItem((prev: any) => prev ? { ...prev, status } : null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleEdit = (r: any) => {
    setEditingId(r.id);
    setForm({
      month: r.month || new Date().getMonth() + 1,
      year: r.year || new Date().getFullYear(),
      total_workers: r.total_workers || 0,
      total_days: r.total_days || 0,
      rate: r.rate || 0,
      notes: r.notes || "",
      client_id: r.client_id || "",
      project_id: r.project_id || "",
    });
    setOpen(true);
  };

  const statusCounts: Record<string, number> = {};
  rows.forEach((r: any) => { statusCounts[r.status ?? "draft"] = (statusCounts[r.status ?? "draft"] || 0) + 1; });

  const filtered = rows.filter((r: any) => {
    const matchSearch = r.clients?.name?.toLowerCase().includes(search.toLowerCase()) || r.status?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });
  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

  const totalAmount = rows.reduce((s: number, r: any) => s + (Number(r.total_amount) || 0), 0);
  const totalWorkers = rows.reduce((s: number, r: any) => s + (Number(r.total_workers) || 0), 0);
  const paidAmount = rows.filter((r: any) => r.status === "paid").reduce((s: number, r: any) => s + (Number(r.total_amount) || 0), 0);
  const collectionRate = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;

  const liveTotal = Number(form.total_workers) * Number(form.total_days) * Number(form.rate);

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Banknote className="h-5 w-5 text-primary" /></div>
          <div><h1 className="text-2xl font-bold">MP Billing</h1><p className="text-muted-foreground">Manpower billing & invoicing</p></div>
        </div>
        <div className="flex gap-2">
          <ExportButton data={filtered} filename="mp-billing" columns={[{key:"clients.name",label:"Client"},{key:"total_workers",label:"Workers"},{key:"total_days",label:"Days"},{key:"rate",label:"Rate"},{key:"total_amount",label:"Total"},{key:"status",label:"Status"}]} />
          <Button size="sm" className="h-9" onClick={() => { setEditingId(null); setForm({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), total_workers: 0, total_days: 0, rate: 0, notes: "", client_id: "", project_id: "" }); setOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />New Billing
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="group hover:shadow-md transition-all"><CardContent className="p-4">
          <div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase">Total Billing</p><p className="text-2xl font-bold">{totalAmount.toLocaleString()} AED</p></div>
          <div className="h-9 w-9 rounded-lg bg-success/10 flex items-center justify-center group-hover:scale-110 transition-transform"><DollarSign className="h-4 w-4 text-success" /></div></div>
        </CardContent></Card>
        <Card className="group hover:shadow-md transition-all"><CardContent className="p-4">
          <div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase">Total Workers</p><p className="text-2xl font-bold">{totalWorkers}</p></div>
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform"><Users className="h-4 w-4 text-primary" /></div></div>
        </CardContent></Card>
        <Card className="group hover:shadow-md transition-all"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase">Collection Rate</p>
          <p className="text-2xl font-bold mt-1">{collectionRate}%</p>
          <Progress value={collectionRate} className="h-1.5 mt-2" />
          <p className="text-[11px] text-muted-foreground mt-1">{paidAmount.toLocaleString()} AED collected</p>
        </CardContent></Card>
        <Card className="group hover:shadow-md transition-all"><CardContent className="p-4">
          <div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase">Records</p><p className="text-2xl font-bold">{rows.length}</p></div>
          <div className="h-9 w-9 rounded-lg bg-info/10 flex items-center justify-center group-hover:scale-110 transition-transform"><TrendingUp className="h-4 w-4 text-info" /></div></div>
        </CardContent></Card>
      </div>

      <StatusFilter statuses={buildStatuses(statusCounts, ["draft","submitted","invoiced","paid"])} selected={statusFilter} onSelect={setStatusFilter} />

      <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} /></div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader><TableRow>
            <SortableHeader label="Period" sortKey="month" direction={getSortDirection("month")} onToggle={toggleSort} />
            <SortableHeader label="Client" sortKey="clients.name" direction={getSortDirection("clients.name")} onToggle={toggleSort} />
            <SortableHeader label="Project" sortKey="projects.name" direction={getSortDirection("projects.name")} onToggle={toggleSort} />
            <SortableHeader label="Workers" sortKey="total_workers" direction={getSortDirection("total_workers")} onToggle={toggleSort} />
            <SortableHeader label="Days" sortKey="total_days" direction={getSortDirection("total_days")} onToggle={toggleSort} />
            <SortableHeader label="Rate" sortKey="rate" direction={getSortDirection("rate")} onToggle={toggleSort} />
            <SortableHeader label="Total" sortKey="total_amount" direction={getSortDirection("total_amount")} onToggle={toggleSort} />
            <SortableHeader label="Status" sortKey="status" direction={getSortDirection("status")} onToggle={toggleSort} />
            <TableHead className="w-24"></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Loading...</TableCell></TableRow> :
            filtered.length === 0 ? <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No billing records</TableCell></TableRow> :
            pageData.map((r: any) => (
              <TableRow key={r.id} className="group">
                <TableCell className="font-medium">{months[(r.month || 1) - 1]} {r.year}</TableCell>
                <TableCell>{r.clients?.name ?? "—"}</TableCell>
                <TableCell>{r.projects?.name ?? "—"}</TableCell>
                <TableCell>{r.total_workers}</TableCell>
                <TableCell>{r.total_days}</TableCell>
                <TableCell>{r.rate} AED</TableCell>
                <TableCell className="font-bold">{Number(r.total_amount).toLocaleString()} AED</TableCell>
                <TableCell>
                  <Badge variant="secondary" className={statusBadgeClass[r.status ?? "draft"] || "border-0"}>
                    {r.status ?? "draft"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewItem(r)}><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(r)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="p-4"><DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} /></div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { setEditingId(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "Edit MP Billing" : "New MP Billing"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Client</Label>
                <Select value={form.client_id} onValueChange={v => setForm(f => ({ ...f, client_id: v }))}><SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger><SelectContent>{clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-2"><Label>Project</Label>
                <Select value={form.project_id} onValueChange={v => setForm(f => ({ ...f, project_id: v }))}><SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger><SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Month</Label><Input type="number" min={1} max={12} value={form.month} onChange={e => setForm(f => ({ ...f, month: Number(e.target.value) }))} /></div>
              <div className="space-y-2"><Label>Year</Label><Input type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2"><Label>Workers</Label><Input type="number" min={0} value={form.total_workers} onChange={e => setForm(f => ({ ...f, total_workers: Number(e.target.value) }))} /></div>
              <div className="space-y-2"><Label>Days</Label><Input type="number" min={0} value={form.total_days} onChange={e => setForm(f => ({ ...f, total_days: Number(e.target.value) }))} /></div>
              <div className="space-y-2"><Label>Rate (AED)</Label><Input type="number" min={0} value={form.rate} onChange={e => setForm(f => ({ ...f, rate: Number(e.target.value) }))} /></div>
            </div>
            {/* Live calculation preview */}
            <div className="p-3 rounded-md bg-muted text-sm space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{form.total_workers} workers × {form.total_days} days × AED {form.rate}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Calculated Total</span>
                <span>{liveTotal.toLocaleString()} AED</span>
              </div>
            </div>
            <div className="space-y-2"><Label>Notes</Label><Input placeholder="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <Button className="w-full h-9" onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending && <Loader2 className="animate-spin mr-2 h-4 w-4" />}{editingId ? "Update Billing" : "Create Billing"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}><DialogContent>
        <DialogHeader><DialogTitle>Billing Details — {viewItem ? `${months[(viewItem.month || 1) - 1]} ${viewItem.year}` : ""}</DialogTitle></DialogHeader>
        {viewItem && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-muted-foreground text-xs">Client</p><p className="font-medium">{viewItem.clients?.name || "—"}</p></div>
              <div><p className="text-muted-foreground text-xs">Project</p><p className="font-medium">{viewItem.projects?.name || "—"}</p></div>
              <div><p className="text-muted-foreground text-xs">Period</p><p className="font-medium">{months[(viewItem.month || 1) - 1]} {viewItem.year}</p></div>
              <div><p className="text-muted-foreground text-xs">Status</p><Badge variant="secondary" className={statusBadgeClass[viewItem.status ?? "draft"] || "border-0"}>{viewItem.status ?? "draft"}</Badge></div>
            </div>
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">Workers</span><span>{viewItem.total_workers}</span></div>
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">Days</span><span>{viewItem.total_days}</span></div>
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">Rate</span><span>AED {viewItem.rate}</span></div>
              <Separator />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{viewItem.total_workers} × {viewItem.total_days} × AED {viewItem.rate}</span>
              </div>
              <div className="flex justify-between font-bold"><span>Total Amount</span><span>AED {Number(viewItem.total_amount).toLocaleString()}</span></div>
            </div>
            {viewItem.notes && <div><p className="text-muted-foreground text-xs">Notes</p><p>{viewItem.notes}</p></div>}
            {/* Status workflow buttons */}
            <div className="flex gap-2 flex-wrap pt-2 border-t">
              {(!viewItem.status || viewItem.status === "draft") && (
                <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => updateStatus.mutate({ id: viewItem.id, status: "submitted" })} disabled={updateStatus.isPending}>
                  Submit
                </Button>
              )}
              {(viewItem.status === "submitted" || viewItem.status === "draft") && (
                <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400" onClick={() => updateStatus.mutate({ id: viewItem.id, status: "invoiced" })} disabled={updateStatus.isPending}>
                  <Receipt className="h-3 w-3" />Mark as Invoiced
                </Button>
              )}
              {viewItem.status !== "paid" && (
                <Button size="sm" className="h-8 gap-1.5 text-xs bg-success hover:bg-success/90 text-white" onClick={() => updateStatus.mutate({ id: viewItem.id, status: "paid" })} disabled={updateStatus.isPending}>
                  <CheckCircle className="h-3 w-3" />Mark as Paid
                </Button>
              )}
              <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs" onClick={() => { setViewItem(null); handleEdit(viewItem); }}>
                <Pencil className="h-3 w-3" />Edit
              </Button>
            </div>
          </div>
        )}
      </DialogContent></Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete Billing Record?" onConfirm={() => deleteId && remove.mutate(deleteId)} />
    </div>
  );
}
