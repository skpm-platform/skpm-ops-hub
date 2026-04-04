import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, Search, Loader2, Users, DollarSign, Eye, LayoutGrid,
  List, TrendingUp, Pencil, Trash2, Calculator, MapPin, Calendar,
  AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { ExportButton } from "@/components/ExportButton";
import { StatusFilter, buildStatuses } from "@/components/StatusFilter";
import { ConfirmDialog } from "@/components/ConfirmDialog";

const emptyForm = {
  worker_id: "",
  requisition_id: "",
  client_id: "",
  site_id: "",
  daily_rate: "",
  start_date: "",
  end_date: "",
  status: "active",
  notes: "",
};

const statusColors: Record<string, string> = {
  active: "bg-success/15 text-success",
  completed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  cancelled: "bg-destructive/15 text-destructive",
  on_hold: "bg-warning/15 text-warning",
};

function calcTotalCost(r: any) {
  if (!r.daily_rate || !r.start_date) return null;
  const end = r.end_date ? new Date(r.end_date) : new Date();
  const days = Math.max(0, differenceInDays(end, new Date(r.start_date)));
  return Number(r.daily_rate) * days;
}

export default function Deployments() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewItem, setViewItem] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: rows = [], isLoading , isError: dataLoadError} = useQuery({
    queryKey: ["deployments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deployments")
        .select("*, workers(name, trade), requisitions(trade), clients(name), sites(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: workers = [] } = useQuery({
    queryKey: ["workers-dep"],
    queryFn: async () => { const { data } = await supabase.from("workers").select("id,name,trade,daily_rate").eq("status", "available"); return data || []; },
  });
  const { data: clients = [] } = useQuery({
    queryKey: ["clients-dep"],
    queryFn: async () => { const { data } = await supabase.from("clients").select("id,name"); return data || []; },
  });
  const { data: sites = [] } = useQuery({
    queryKey: ["sites-dep"],
    queryFn: async () => { const { data } = await supabase.from("sites").select("id,name"); return data || []; },
  });
  const { data: requisitions = [] } = useQuery({
    queryKey: ["req-dep"],
    queryFn: async () => { const { data } = await supabase.from("requisitions").select("id,trade,quantity").eq("status", "approved"); return data || []; },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        worker_id: form.worker_id || null,
        requisition_id: form.requisition_id || null,
        client_id: form.client_id || null,
        site_id: form.site_id || null,
        daily_rate: parseFloat(form.daily_rate) || 0,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        status: form.status,
        notes: form.notes || null,
      };
      if (editingId) {
        const { error } = await supabase.from("deployments").update(payload).eq("id", editingId);
        if (error) throw error;
        await logAudit("Updated deployment", editingId, "deployments");
      } else {
        const { error } = await supabase.from("deployments").insert(payload);
        if (error) throw error;
        // Mark worker as deployed
        if (form.worker_id) {
          await supabase.from("workers").update({ status: "deployed" }).eq("id", form.worker_id);
        }
        await logAudit("Created deployment", `Rate: ${form.daily_rate}`, "deployments");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deployments"] });
      qc.invalidateQueries({ queryKey: ["workers"] });
      toast.success(editingId ? "Deployment updated" : "Deployment created");
      setOpen(false);
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const row = rows.find((r: any) => r.id === id);
      const { error } = await supabase.from("deployments").delete().eq("id", id);
      if (error) throw error;
      // If active, mark worker back to available
      if (row?.status === "active" && row?.worker_id) {
        await supabase.from("workers").update({ status: "available" }).eq("id", row.worker_id);
      }
      await logAudit("Deleted deployment", id, "deployments");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deployments"] });
      qc.invalidateQueries({ queryKey: ["workers"] });
      toast.success("Deployment deleted");
      setDeleteId(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatus = async (id: string, newStatus: string) => {
    const row = rows.find((r: any) => r.id === id);
    const { error } = await supabase.from("deployments").update({ status: newStatus, end_date: ["completed", "cancelled"].includes(newStatus) ? format(new Date(), "yyyy-MM-dd") : row?.end_date }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    // Update worker status accordingly
    if (row?.worker_id) {
      const workerStatus = newStatus === "active" ? "deployed" : "available";
      await supabase.from("workers").update({ status: workerStatus }).eq("id", row.worker_id);
    }
    await logAudit("Updated deployment status", newStatus, "deployments");
    qc.invalidateQueries({ queryKey: ["deployments"] });
    qc.invalidateQueries({ queryKey: ["workers"] });
    if (viewItem?.id === id) setViewItem((prev: any) => ({ ...prev, status: newStatus }));
    toast.success(`Deployment marked as ${newStatus}`);
  };

  const handleEdit = (r: any) => {
    setEditingId(r.id);
    setForm({
      worker_id: r.worker_id || "",
      requisition_id: r.requisition_id || "",
      client_id: r.client_id || "",
      site_id: r.site_id || "",
      daily_rate: r.daily_rate ? String(r.daily_rate) : "",
      start_date: r.start_date || "",
      end_date: r.end_date || "",
      status: r.status || "active",
      notes: r.notes || "",
    });
    setOpen(true);
  };

  const totalActive = rows.filter((r: any) => r.status === "active").length;
  const dailyCost = rows.filter((r: any) => r.status === "active").reduce((s: number, r: any) => s + (Number(r.daily_rate) || 0), 0);
  const totalEarned = rows.reduce((s: number, r: any) => s + (calcTotalCost(r) || 0), 0);
  const statusCounts: Record<string, number> = {};
  rows.forEach((r: any) => { statusCounts[r.status ?? "active"] = (statusCounts[r.status ?? "active"] || 0) + 1; });
  const utilizationRate = rows.length > 0 ? Math.round((totalActive / rows.length) * 100) : 0;

  const filtered = rows
    .filter((r: any) =>
      r.workers?.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.workers?.trade?.toLowerCase().includes(search.toLowerCase()) ||
      r.clients?.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.sites?.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.status?.toLowerCase().includes(search.toLowerCase())
    )
    .filter((r: any) => statusFilter === "all" || r.status === statusFilter);

  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Deployments</h1>
            <p className="text-muted-foreground text-sm">{rows.length} deployments · {totalActive} active</p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex border rounded-lg overflow-hidden">
            <Button variant={viewMode === "table" ? "default" : "ghost"} size="sm" className="h-9 rounded-none" onClick={() => setViewMode("table")}><List className="h-4 w-4" /></Button>
            <Button variant={viewMode === "grid" ? "default" : "ghost"} size="sm" className="h-9 rounded-none" onClick={() => setViewMode("grid")}><LayoutGrid className="h-4 w-4" /></Button>
          </div>
          <ExportButton
            data={filtered.map((r: any) => ({
              ...r,
              "worker_name": r.workers?.name,
              "worker_trade": r.workers?.trade,
              "client_name": r.clients?.name,
              "site_name": r.sites?.name,
              "total_cost": calcTotalCost(r) || 0,
            }))}
            filename="deployments"
            columns={[
              { key: "worker_name", label: "Worker" },
              { key: "worker_trade", label: "Trade" },
              { key: "client_name", label: "Client" },
              { key: "site_name", label: "Site" },
              { key: "daily_rate", label: "Daily Rate (AED)" },
              { key: "start_date", label: "Start Date" },
              { key: "end_date", label: "End Date" },
              { key: "total_cost", label: "Total Cost (AED)" },
              { key: "status", label: "Status" },
            ]}
          />
          <Button size="sm" className="h-9" onClick={() => { setEditingId(null); setForm(emptyForm); setOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />New Deployment
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="group hover:shadow-md transition-all">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-xs text-muted-foreground uppercase">Total</p><p className="text-2xl font-bold">{rows.length}</p></div>
              <Users className="h-8 w-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>
        <Card className="group hover:shadow-md transition-all">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-xs text-muted-foreground uppercase">Active</p><p className="text-2xl font-bold text-success">{totalActive}</p></div>
              <TrendingUp className="h-8 w-8 text-success/20" />
            </div>
            <Progress value={utilizationRate} className="h-1.5 mt-2" />
            <p className="text-[10px] text-muted-foreground mt-1">{utilizationRate}% utilization</p>
          </CardContent>
        </Card>
        <Card className="group hover:shadow-md transition-all">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-xs text-muted-foreground uppercase">Daily Cost</p><p className="text-xl font-bold">AED {dailyCost.toLocaleString()}</p></div>
              <DollarSign className="h-8 w-8 text-warning/20" />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Active deployments only</p>
          </CardContent>
        </Card>
        <Card className="group hover:shadow-md transition-all">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-xs text-muted-foreground uppercase">Total Earned</p><p className="text-xl font-bold">AED {Math.round(totalEarned).toLocaleString()}</p></div>
              <Calculator className="h-8 w-8 text-muted-foreground/20" />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">All deployments combined</p>
          </CardContent>
        </Card>
      </div>

      <StatusFilter
        statuses={buildStatuses(statusCounts, ["active", "completed", "on_hold", "cancelled"])}
        selected={statusFilter}
        onSelect={setStatusFilter}
      />

      <Card>
        <CardContent className="pt-5">
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search worker, client, site, status..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No deployments found</p>
          ) : viewMode === "table" ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableHeader label="Worker" sortKey="workers.name" direction={getSortDirection("workers.name")} onToggle={toggleSort} />
                      <SortableHeader label="Trade" sortKey="workers.trade" direction={getSortDirection("workers.trade")} onToggle={toggleSort} />
                      <SortableHeader label="Client" sortKey="clients.name" direction={getSortDirection("clients.name")} onToggle={toggleSort} />
                      <SortableHeader label="Site" sortKey="sites.name" direction={getSortDirection("sites.name")} onToggle={toggleSort} />
                      <SortableHeader label="Start" sortKey="start_date" direction={getSortDirection("start_date")} onToggle={toggleSort} />
                      <TableHead className="text-xs">Duration</TableHead>
                      <SortableHeader label="Rate/Day" sortKey="daily_rate" direction={getSortDirection("daily_rate")} onToggle={toggleSort} />
                      <TableHead className="text-xs">Total Cost</TableHead>
                      <SortableHeader label="Status" sortKey="status" direction={getSortDirection("status")} onToggle={toggleSort} />
                      <TableHead className="w-28">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageData.map((r: any) => {
                      const totalCost = calcTotalCost(r);
                      const dur = r.start_date ? differenceInDays(r.end_date ? new Date(r.end_date) : new Date(), new Date(r.start_date)) : null;
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.workers?.name ?? "—"}</TableCell>
                          <TableCell className="text-sm capitalize">{r.workers?.trade ?? "—"}</TableCell>
                          <TableCell>{r.clients?.name ?? "—"}</TableCell>
                          <TableCell>{r.sites?.name ?? "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{r.start_date ? format(new Date(r.start_date), "dd MMM yy") : "—"}</TableCell>
                          <TableCell className="text-sm">{dur !== null ? `${dur}d` : "—"}</TableCell>
                          <TableCell className="text-sm">AED {Number(r.daily_rate || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-sm font-medium">{totalCost !== null ? `AED ${Math.round(totalCost).toLocaleString()}` : "—"}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={`border-0 text-xs ${statusColors[r.status] || ""}`}>{r.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setViewItem(r); setViewOpen(true); }}>
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
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
            </>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pageData.map((r: any) => {
                const totalCost = calcTotalCost(r);
                const dur = r.start_date ? differenceInDays(r.end_date ? new Date(r.end_date) : new Date(), new Date(r.start_date)) : null;
                return (
                  <Card key={r.id} className="hover:shadow-md transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold">{r.workers?.name || "—"}</p>
                          <p className="text-xs text-muted-foreground capitalize">{r.workers?.trade || "—"}</p>
                        </div>
                        <Badge variant="secondary" className={`border-0 text-[10px] ${statusColors[r.status] || ""}`}>{r.status}</Badge>
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        {r.clients?.name && <div className="flex items-center gap-1"><Users className="h-3 w-3" />{r.clients.name}</div>}
                        {r.sites?.name && <div className="flex items-center gap-1"><MapPin className="h-3 w-3" />{r.sites.name}</div>}
                        {r.start_date && <div className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(r.start_date), "dd MMM yyyy")}{dur !== null && ` · ${dur}d`}</div>}
                      </div>
                      <div className="mt-2 pt-2 border-t flex justify-between text-xs">
                        <span>AED {Number(r.daily_rate || 0).toLocaleString()}/day</span>
                        {totalCost !== null && <span className="font-medium">Total: AED {Math.round(totalCost).toLocaleString()}</span>}
                      </div>
                      <div className="flex gap-1 mt-3">
                        <Button variant="ghost" size="sm" className="h-7 flex-1 text-xs" onClick={() => { setViewItem(r); setViewOpen(true); }}><Eye className="h-3 w-3 mr-1" />View</Button>
                        <Button variant="ghost" size="sm" className="h-7 flex-1 text-xs" onClick={() => handleEdit(r)}><Pencil className="h-3 w-3 mr-1" />Edit</Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditingId(null); setForm(emptyForm); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Edit Deployment" : "New Deployment"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Worker selection with auto-fill rate */}
            <div>
              <Label>Worker *</Label>
              <Select
                value={form.worker_id}
                onValueChange={(v) => {
                  const worker = workers.find((w: any) => w.id === v) as any;
                  setForm(f => ({
                    ...f,
                    worker_id: v,
                    daily_rate: worker?.daily_rate ? String(worker.daily_rate) : f.daily_rate,
                  }));
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select available worker..." /></SelectTrigger>
                <SelectContent>
                  {workers.map((w: any) => (
                    <SelectItem key={w.id} value={w.id}>{w.name} — {w.trade}{w.daily_rate ? ` (AED ${w.daily_rate}/day)` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {workers.length === 0 && <p className="text-xs text-muted-foreground mt-1">No available workers. Change worker status in Manpower first.</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Client</Label>
                <Select value={form.client_id} onValueChange={v => setForm(f => ({ ...f, client_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select client..." /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Site</Label>
                <Select value={form.site_id} onValueChange={v => setForm(f => ({ ...f, site_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select site..." /></SelectTrigger>
                  <SelectContent>
                    {sites.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Link to Requisition (optional)</Label>
              <Select value={form.requisition_id} onValueChange={v => setForm(f => ({ ...f, requisition_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select approved requisition..." /></SelectTrigger>
                <SelectContent>
                  {requisitions.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.trade} (x{r.quantity})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Daily Rate (AED)</Label>
                <Input type="number" value={form.daily_rate} onChange={e => setForm(f => ({ ...f, daily_rate: e.target.value }))} placeholder="0.00" />
              </div>
              <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
              <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
            </div>

            {/* Live Cost Preview */}
            {form.daily_rate && form.start_date && (
              <div className="rounded-md bg-primary/5 border border-primary/10 p-3 text-sm flex justify-between">
                <span className="text-muted-foreground">Estimated Total Cost</span>
                <span className="font-semibold">
                  AED {Math.round(Number(form.daily_rate) * Math.max(0, differenceInDays(form.end_date ? new Date(form.end_date) : new Date(), new Date(form.start_date)))).toLocaleString()}
                  <span className="text-muted-foreground font-normal ml-1">
                    ({Math.max(0, differenceInDays(form.end_date ? new Date(form.end_date) : new Date(), new Date(form.start_date)))} days)
                  </span>
                </span>
              </div>
            )}

            {editingId && (
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes about this deployment..." rows={2} /></div>

            <Button className="w-full h-9" onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
              {editingId ? "Update Deployment" : "Create Deployment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={() => { setViewOpen(false); setViewItem(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Deployment Details</DialogTitle></DialogHeader>
          {viewItem && (() => {
            const dur = viewItem.start_date ? differenceInDays(viewItem.end_date ? new Date(viewItem.end_date) : new Date(), new Date(viewItem.start_date)) : null;
            const totalCost = calcTotalCost(viewItem);
            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold">{viewItem.workers?.name || "—"}</p>
                    <p className="text-sm text-muted-foreground capitalize">{viewItem.workers?.trade || "—"}</p>
                  </div>
                  <Badge variant="secondary" className={`border-0 ${statusColors[viewItem.status] || ""}`}>{viewItem.status}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    ["Client", viewItem.clients?.name || "—"],
                    ["Site", viewItem.sites?.name || "—"],
                    ["Start Date", viewItem.start_date ? format(new Date(viewItem.start_date), "dd MMM yyyy") : "—"],
                    ["End Date", viewItem.end_date ? format(new Date(viewItem.end_date), "dd MMM yyyy") : "Ongoing"],
                    ["Duration", dur !== null ? `${dur} days` : "—"],
                    ["Daily Rate", `AED ${Number(viewItem.daily_rate || 0).toLocaleString()}`],
                  ].map(([l, v]) => (
                    <div key={l}><p className="text-xs text-muted-foreground">{l}</p><p className="font-medium">{v}</p></div>
                  ))}
                </div>

                {totalCost !== null && (
                  <div className="rounded-md bg-primary/5 p-3 text-sm flex justify-between">
                    <span className="text-muted-foreground">Total Cost ({dur} days)</span>
                    <span className="font-semibold text-base">AED {Math.round(totalCost).toLocaleString()}</span>
                  </div>
                )}

                {viewItem.notes && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm bg-muted/40 rounded-md p-2">{viewItem.notes}</p>
                  </div>
                )}

                {/* Quick status actions */}
                {viewItem.status === "active" && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => updateStatus(viewItem.id, "on_hold")}>Hold</Button>
                    <Button size="sm" className="flex-1 h-8 text-xs" onClick={() => updateStatus(viewItem.id, "completed")}>Complete</Button>
                    <Button size="sm" variant="destructive" className="flex-1 h-8 text-xs" onClick={() => updateStatus(viewItem.id, "cancelled")}>Cancel</Button>
                  </div>
                )}
                {viewItem.status === "on_hold" && (
                  <Button size="sm" className="w-full h-8" onClick={() => updateStatus(viewItem.id, "active")}>Resume Deployment</Button>
                )}

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => { setViewOpen(false); handleEdit(viewItem); }}>
                    <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                  </Button>
                  <Button size="sm" variant="destructive" className="flex-1" onClick={() => { setViewOpen(false); setDeleteId(viewItem.id); }}>
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete Deployment?" onConfirm={() => deleteId && remove.mutate(deleteId)} />
    </div>
  );
}
