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
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Search, ClipboardList, CheckCircle, Clock, XCircle,
  Users, Pencil, Trash2, Eye, Loader2,
  AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { ExportButton } from "@/components/ExportButton";
import { StatusFilter, buildStatuses } from "@/components/StatusFilter";
import { ComboboxSelect } from "@/components/ComboboxSelect";
import { ConfirmDialog } from "@/components/ConfirmDialog";

const statusColors: Record<string, string> = {
  pending: "bg-warning/15 text-warning",
  approved: "bg-success/15 text-success",
  rejected: "bg-destructive/15 text-destructive",
  fulfilled: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

const tradeOptions = [
  { value: "Electrician", label: "Electrician" },
  { value: "Plumber", label: "Plumber" },
  { value: "Carpenter", label: "Carpenter" },
  { value: "Welder", label: "Welder" },
  { value: "Helper", label: "Helper" },
  { value: "Driver", label: "Driver" },
  { value: "Mason", label: "Mason" },
  { value: "Painter", label: "Painter" },
  { value: "HVAC Technician", label: "HVAC Technician" },
  { value: "Scaffolder", label: "Scaffolder" },
  { value: "Rigger", label: "Rigger" },
  { value: "Insulator", label: "Insulator" },
  { value: "Supervisor", label: "Supervisor" },
  { value: "Foreman", label: "Foreman" },
];

const emptyForm = {
  trade: "",
  quantity: "1",
  duration: "",
  start_date: "",
  client_id: "",
  site_id: "",
  notes: "",
  daily_rate: "",
};

export default function Requisitions() {
  const { user } = useAuth();
  const { data: role } = useUserRole();
  const isAdmin = role === "admin" || role === "manager";
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewItem, setViewItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: rows = [], isLoading , isError: dataLoadError} = useQuery({
    queryKey: ["requisitions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("requisitions")
        .select("*, clients(name), sites(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-req"],
    queryFn: async () => { const { data } = await supabase.from("clients").select("id,name"); return data || []; },
  });

  const { data: sites = [] } = useQuery({
    queryKey: ["sites-req"],
    queryFn: async () => { const { data } = await supabase.from("sites").select("id,name"); return data || []; },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        trade: form.trade,
        quantity: Number(form.quantity) || 1,
        duration: form.duration || null,
        start_date: form.start_date || null,
        client_id: form.client_id || null,
        site_id: form.site_id || null,
        notes: form.notes || null,
        daily_rate: parseFloat(form.daily_rate) || null,
      };
      if (editingId) {
        const { error } = await supabase.from("requisitions").update(payload).eq("id", editingId);
        if (error) throw error;
        await logAudit("Updated requisition", form.trade);
      } else {
        const { error } = await supabase.from("requisitions").insert({ ...payload, created_by: user?.id });
        if (error) throw error;
        await logAudit("Created requisition", `${form.quantity}x ${form.trade}`);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["requisitions"] });
      toast.success(editingId ? "Requisition updated" : "Requisition created");
      setOpen(false);
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const update: any = { status };
      if (notes) update.notes = notes;
      const { error } = await supabase.from("requisitions").update(update).eq("id", id);
      if (error) throw error;
      await logAudit(`Requisition ${status}`, id);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["requisitions"] });
      toast.success(`Requisition ${vars.status}`);
      if (viewItem?.id === vars.id) {
        setViewItem((prev: any) => ({ ...prev, status: vars.status }));
      }
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("requisitions").delete().eq("id", id);
      if (error) throw error;
      await logAudit("Deleted requisition", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["requisitions"] });
      toast.success("Deleted");
      setDeleteId(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleEdit = (r: any) => {
    setEditingId(r.id);
    setForm({
      trade: r.trade || "",
      quantity: String(r.quantity || 1),
      duration: r.duration || "",
      start_date: r.start_date || "",
      client_id: r.client_id || "",
      site_id: r.site_id || "",
      notes: r.notes || "",
      daily_rate: r.daily_rate ? String(r.daily_rate) : "",
    });
    setOpen(true);
  };

  const totalWorkers = rows.reduce((s: number, r: any) => s + (r.quantity || 0), 0);
  const statusCounts: Record<string, number> = {};
  rows.forEach((r: any) => { statusCounts[r.status ?? "pending"] = (statusCounts[r.status ?? "pending"] || 0) + 1; });
  const fulfillmentRate = rows.length > 0 ? Math.round(((statusCounts.fulfilled || 0) / rows.length) * 100) : 0;
  const totalDailyValue = rows.filter((r: any) => r.status !== "rejected").reduce((s: number, r: any) => s + ((r.daily_rate || 0) * (r.quantity || 0)), 0);

  const filtered = rows
    .filter((r: any) =>
      r.trade?.toLowerCase().includes(search.toLowerCase()) ||
      r.status?.toLowerCase().includes(search.toLowerCase()) ||
      r.clients?.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.sites?.name?.toLowerCase().includes(search.toLowerCase())
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <ClipboardList className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Requisitions</h1>
            <p className="text-sm text-muted-foreground">{rows.length} requisitions · {totalWorkers} workers requested</p>
          </div>
        </div>
        <div className="flex gap-2">
          <ExportButton
            data={filtered}
            filename="requisitions"
            columns={[
              { key: "trade", label: "Trade" },
              { key: "quantity", label: "Qty" },
              { key: "daily_rate", label: "Daily Rate" },
              { key: "duration", label: "Duration" },
              { key: "start_date", label: "Start" },
              { key: "status", label: "Status" },
            ]}
          />
          <Button size="sm" className="h-9" onClick={() => { setEditingId(null); setForm(emptyForm); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />New Requisition
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="group hover:shadow-md transition-all">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p>
                <p className="text-2xl font-bold mt-1">{rows.length}</p>
              </div>
              <ClipboardList className="h-8 w-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>
        <Card className="group hover:shadow-md transition-all">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Workers Requested</p>
                <p className="text-2xl font-bold mt-1">{totalWorkers}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>
        <Card className="group hover:shadow-md transition-all">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Pending</p>
                <p className="text-2xl font-bold mt-1 text-warning">{statusCounts.pending || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-warning/20" />
            </div>
          </CardContent>
        </Card>
        <Card className="group hover:shadow-md transition-all">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Fulfillment Rate</p>
            <p className="text-2xl font-bold mt-1 text-success">{fulfillmentRate}%</p>
            <Progress value={fulfillmentRate} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
      </div>

      <StatusFilter
        statuses={buildStatuses(statusCounts, ["pending", "approved", "rejected", "fulfilled"])}
        selected={statusFilter}
        onSelect={setStatusFilter}
      />

      <Card>
        <CardContent className="pt-5">
          <div className="mb-4 relative max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search by trade, client, status..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No requisitions</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableHeader label="Trade" sortKey="trade" direction={getSortDirection("trade")} onToggle={toggleSort} />
                      <SortableHeader label="Qty" sortKey="quantity" direction={getSortDirection("quantity")} onToggle={toggleSort} />
                      <SortableHeader label="Rate/Day" sortKey="daily_rate" direction={getSortDirection("daily_rate")} onToggle={toggleSort} />
                      <SortableHeader label="Duration" sortKey="duration" direction={getSortDirection("duration")} onToggle={toggleSort} />
                      <SortableHeader label="Start" sortKey="start_date" direction={getSortDirection("start_date")} onToggle={toggleSort} />
                      <SortableHeader label="Client" sortKey="clients.name" direction={getSortDirection("clients.name")} onToggle={toggleSort} />
                      <SortableHeader label="Site" sortKey="sites.name" direction={getSortDirection("sites.name")} onToggle={toggleSort} />
                      <SortableHeader label="Status" sortKey="status" direction={getSortDirection("status")} onToggle={toggleSort} />
                      <TableHead className="w-32">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageData.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.trade ?? "—"}</TableCell>
                        <TableCell><Badge variant="outline">{r.quantity}</Badge></TableCell>
                        <TableCell className="text-sm">{r.daily_rate ? `AED ${Number(r.daily_rate).toLocaleString()}` : "—"}</TableCell>
                        <TableCell>{r.duration ?? "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{r.start_date ? format(new Date(r.start_date), "dd MMM yyyy") : "—"}</TableCell>
                        <TableCell>{r.clients?.name ?? "—"}</TableCell>
                        <TableCell>{r.sites?.name ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={`border-0 text-xs ${statusColors[r.status] || ""}`}>{r.status || "pending"}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewItem(r)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(r)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            {isAdmin && (
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(r.id)}>
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            )}
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
          <DialogHeader><DialogTitle>{editingId ? "Edit Requisition" : "New Requisition"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Trade / Skill *</Label>
              <ComboboxSelect value={form.trade} onValueChange={v => setForm({ ...form, trade: v })} options={tradeOptions} placeholder="Select or type trade..." />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Quantity</Label><Input type="number" min={1} value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></div>
              <div><Label>Daily Rate (AED)</Label><Input type="number" value={form.daily_rate} onChange={e => setForm({ ...form, daily_rate: e.target.value })} placeholder="0.00" /></div>
              <div><Label>Duration</Label><Input placeholder="e.g. 3 months" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
              <div>
                <Label>Client</Label>
                <Select value={form.client_id} onValueChange={v => setForm({ ...form, client_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select client..." /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Site</Label>
              <Select value={form.site_id} onValueChange={v => setForm({ ...form, site_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select site..." /></SelectTrigger>
                <SelectContent>
                  {sites.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Notes / Requirements</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Special requirements, qualifications, certifications needed..." rows={3} /></div>
            <Button className="w-full h-9" onClick={() => save.mutate()} disabled={save.isPending || !form.trade}>
              {save.isPending ? "Saving..." : editingId ? "Update" : "Create Requisition"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Requisition Details</DialogTitle></DialogHeader>
          {viewItem && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold">{viewItem.trade}</p>
                  <p className="text-sm text-muted-foreground">{viewItem.quantity} worker{viewItem.quantity > 1 ? "s" : ""} requested</p>
                </div>
                <Badge variant="secondary" className={`border-0 ${statusColors[viewItem.status] || ""}`}>
                  {viewItem.status || "pending"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Client", viewItem.clients?.name || "—"],
                  ["Site", viewItem.sites?.name || "—"],
                  ["Daily Rate", viewItem.daily_rate ? `AED ${Number(viewItem.daily_rate).toLocaleString()}` : "—"],
                  ["Duration", viewItem.duration || "—"],
                  ["Start Date", viewItem.start_date ? format(new Date(viewItem.start_date), "dd MMM yyyy") : "—"],
                  ["Created", format(new Date(viewItem.created_at), "dd MMM yyyy")],
                ].map(([l, v]) => (
                  <div key={l}><p className="text-xs text-muted-foreground">{l}</p><p className="font-medium">{v}</p></div>
                ))}
              </div>

              {viewItem.daily_rate && viewItem.quantity && (
                <div className="rounded-md bg-primary/5 p-3 text-sm">
                  <p className="text-xs text-muted-foreground mb-1">Estimated Daily Cost</p>
                  <p className="font-semibold text-base">AED {(Number(viewItem.daily_rate) * Number(viewItem.quantity)).toLocaleString()}/day</p>
                </div>
              )}

              {viewItem.notes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Notes / Requirements</p>
                  <p className="text-sm bg-muted/40 rounded-md p-2">{viewItem.notes}</p>
                </div>
              )}

              {/* Approval Actions - admin only */}
              {isAdmin && viewItem.status === "pending" && (
                <div className="flex gap-2">
                  <Button
                    className="flex-1 h-9 bg-success text-white hover:bg-success/90 gap-1.5"
                    onClick={() => updateStatus.mutate({ id: viewItem.id, status: "approved" })}
                    disabled={updateStatus.isPending}
                  >
                    <CheckCircle className="h-4 w-4" /> Approve
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1 h-9 gap-1.5"
                    onClick={() => updateStatus.mutate({ id: viewItem.id, status: "rejected" })}
                    disabled={updateStatus.isPending}
                  >
                    <XCircle className="h-4 w-4" /> Reject
                  </Button>
                </div>
              )}

              {isAdmin && viewItem.status === "approved" && (
                <Button
                  className="w-full h-9 gap-1.5"
                  onClick={() => updateStatus.mutate({ id: viewItem.id, status: "fulfilled" })}
                  disabled={updateStatus.isPending}
                >
                  <CheckCircle className="h-4 w-4" /> Mark as Fulfilled
                </Button>
              )}

              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => { setViewItem(null); handleEdit(viewItem); }}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                </Button>
                {isAdmin && (
                  <Button size="sm" variant="destructive" className="flex-1" onClick={() => { setViewItem(null); setDeleteId(viewItem.id); }}>
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete Requisition?" onConfirm={() => deleteId && remove.mutate(deleteId)} />
    </div>
  );
}
