import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logAudit } from "@/lib/audit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, Search, Loader2, KeyRound, AlertTriangle, ShieldCheck, Clock, Eye } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { ExportButton } from "@/components/ExportButton";
import { ComboboxSelect } from "@/components/ComboboxSelect";
import { StatusFilter, buildStatuses } from "@/components/StatusFilter";

export default function GatePasses() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [viewItem, setViewItem] = useState<any>(null);
  const [form, setForm] = useState({ pass_no: "", pass_type: "entry", valid_from: "", valid_until: "", notes: "", worker_id: "", site_id: "" });

  const { data: rows = [], isLoading , isError: dataLoadError} = useQuery({
    queryKey: ["gate_passes"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("gate_passes").select("*, manpower(name), sites(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: workerList = [] } = useQuery({
    queryKey: ["manpower-list"],
    queryFn: async () => { const { data } = await (supabase as any).from("manpower").select("id, name").order("name"); return data || []; },
  });
  const { data: gpSiteList = [] } = useQuery({
    queryKey: ["sites-gp-list"],
    queryFn: async () => { const { data } = await (supabase as any).from("sites").select("id, name").order("name"); return data || []; },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = { ...form, issued_by: user?.id };
      if (form.worker_id) payload.worker_id = form.worker_id;
      if (form.site_id) payload.site_id = form.site_id;
      const { error } = await (supabase as any).from("gate_passes").insert(payload);
      if (error) throw error;
      await logAudit("Issued gate pass", form.pass_no, "gate_passes");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["gate_passes"] }); setOpen(false); setForm({ pass_no: "", pass_type: "entry", valid_from: "", valid_until: "", notes: "", worker_id: "", site_id: "" }); toast.success("Gate pass issued"); },
    onError: (e: any) => toast.error(e.message),
  });

  const activeCount = rows.filter((r: any) => r.status === "active").length;
  const expiredCount = rows.filter((r: any) => r.status === "expired" || (r.valid_until && new Date(r.valid_until) < new Date())).length;
  const expiringSoon = rows.filter((r: any) => r.valid_until && r.status === "active" && differenceInDays(new Date(r.valid_until), new Date()) <= 7 && differenceInDays(new Date(r.valid_until), new Date()) >= 0).length;

  const statusCounts: Record<string, number> = {};
  rows.forEach((r: any) => { statusCounts[r.status ?? "pending"] = (statusCounts[r.status ?? "pending"] || 0) + 1; });

  const filtered = rows
    .filter((r: any) => r.pass_no?.toLowerCase().includes(search.toLowerCase()) || r.manpower?.name?.toLowerCase().includes(search.toLowerCase()))
    .filter((r: any) => statusFilter === "all" || r.status === statusFilter);
  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

  const getExpiryBadge = (r: any) => {
    if (!r.valid_until) return null;
    const days = differenceInDays(new Date(r.valid_until), new Date());
    if (days < 0) return <Badge variant="destructive" className="text-[10px]">Expired</Badge>;
    if (days <= 7) return <Badge className="text-[10px] bg-warning/15 text-warning border-0">{days}d left</Badge>;
    if (days <= 30) return <Badge variant="secondary" className="text-[10px] border-0">{days}d left</Badge>;
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><KeyRound className="h-5 w-5 text-primary" /></div>
          <div><h1 className="text-2xl font-bold">Gate Passes</h1><p className="text-muted-foreground">Manage site access passes</p></div>
        </div>
        <div className="flex gap-2">
          <ExportButton data={filtered} filename="gate-passes" columns={[{key:"pass_no",label:"Pass No"},{key:"pass_type",label:"Type"},{key:"workers.name",label:"Worker"},{key:"status",label:"Status"}]} />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" className="h-9"><Plus className="mr-2 h-4 w-4" />New Pass</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Issue Gate Pass</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label>Pass Number</Label><Input placeholder="GP-001" value={form.pass_no} onChange={e => setForm(f => ({ ...f, pass_no: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Worker</Label>
                  <ComboboxSelect value={form.worker_id} onChange={v => setForm(f => ({ ...f, worker_id: v }))} options={workerList.map((w: any) => ({ value: w.id, label: w.name }))} placeholder="Select worker" />
                </div>
                <div className="space-y-2"><Label>Site</Label>
                  <ComboboxSelect value={form.site_id} onChange={v => setForm(f => ({ ...f, site_id: v }))} options={gpSiteList.map((s: any) => ({ value: s.id, label: s.name }))} placeholder="Select site" />
                </div>
                <div className="space-y-2"><Label>Pass Type</Label>
                  <ComboboxSelect value={form.pass_type} onChange={v => setForm(f => ({ ...f, pass_type: v }))} options={["entry","exit","material","vehicle","temporary","permanent"]} placeholder="Select type" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Valid From</Label><Input type="date" value={form.valid_from} onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Valid Until</Label><Input type="date" value={form.valid_until} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} /></div>
                </div>
                <div className="space-y-2"><Label>Notes</Label><Input placeholder="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
                <Button className="w-full h-9" onClick={() => save.mutate()} disabled={save.isPending}>
                  {save.isPending && <Loader2 className="animate-spin mr-2 h-4 w-4" />} Issue Pass
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Expiry Alert */}
      {expiringSoon > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-3 flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
            <p className="text-sm"><strong>{expiringSoon}</strong> gate pass{expiringSoon > 1 ? "es" : ""} expiring within 7 days</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="group hover:shadow-md transition-all"><CardContent className="p-4">
          <div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase">Total Passes</p><p className="text-2xl font-bold">{rows.length}</p></div>
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform"><KeyRound className="h-4 w-4 text-primary" /></div></div>
        </CardContent></Card>
        <Card className="group hover:shadow-md transition-all"><CardContent className="p-4">
          <div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase">Active</p><p className="text-2xl font-bold text-success">{activeCount}</p></div>
          <div className="h-9 w-9 rounded-lg bg-success/10 flex items-center justify-center group-hover:scale-110 transition-transform"><ShieldCheck className="h-4 w-4 text-success" /></div></div>
          <Progress value={rows.length > 0 ? (activeCount / rows.length) * 100 : 0} className="h-1.5 mt-2" />
        </CardContent></Card>
        <Card className="group hover:shadow-md transition-all"><CardContent className="p-4">
          <div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase">Expiring Soon</p><p className="text-2xl font-bold text-warning">{expiringSoon}</p></div>
          <div className="h-9 w-9 rounded-lg bg-warning/10 flex items-center justify-center group-hover:scale-110 transition-transform"><Clock className="h-4 w-4 text-warning" /></div></div>
        </CardContent></Card>
        <Card className="group hover:shadow-md transition-all"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase">Expired</p>
          <p className="text-2xl font-bold text-destructive">{expiredCount}</p>
        </CardContent></Card>
      </div>

      <StatusFilter statuses={buildStatuses(statusCounts, ["active","pending","expired","revoked"])} selected={statusFilter} onSelect={setStatusFilter} />

      <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} /></div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader><TableRow>
            <SortableHeader label="Pass No" sortKey="pass_no" direction={getSortDirection("pass_no")} onToggle={toggleSort} />
            <SortableHeader label="Type" sortKey="pass_type" direction={getSortDirection("pass_type")} onToggle={toggleSort} />
            <SortableHeader label="Worker" sortKey="workers.name" direction={getSortDirection("workers.name")} onToggle={toggleSort} />
            <SortableHeader label="Site" sortKey="sites.name" direction={getSortDirection("sites.name")} onToggle={toggleSort} />
            <SortableHeader label="Valid From" sortKey="valid_from" direction={getSortDirection("valid_from")} onToggle={toggleSort} />
            <SortableHeader label="Valid Until" sortKey="valid_until" direction={getSortDirection("valid_until")} onToggle={toggleSort} />
            <SortableHeader label="Status" sortKey="status" direction={getSortDirection("status")} onToggle={toggleSort} />
            <TableHead className="w-12"></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Loading...</TableCell></TableRow> :
            filtered.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No gate passes</TableCell></TableRow> :
            pageData.map((r: any) => {
              const isExpired = r.status === "expired" || (r.valid_until && new Date(r.valid_until) < new Date());
              const isActive = r.status === "active" && !isExpired;
              return (
              <TableRow key={r.id} className={isExpired ? "bg-destructive/5" : isActive ? "bg-success/5" : ""}>
                <TableCell className="font-mono font-medium">{r.pass_no ?? "—"}</TableCell>
                <TableCell><Badge variant="secondary" className="capitalize border-0">{r.pass_type}</Badge></TableCell>
                <TableCell>{r.manpower?.name ?? r.workers?.name ?? "—"}</TableCell>
                <TableCell>{r.sites?.name ?? "—"}</TableCell>
                <TableCell>{r.valid_from ? format(new Date(r.valid_from), "dd MMM yyyy") : "—"}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {r.valid_until ? format(new Date(r.valid_until), "dd MMM yyyy") : "—"}
                    {getExpiryBadge(r)}
                  </div>
                </TableCell>
                <TableCell><Badge variant={r.status === "active" ? "default" : "secondary"} className={r.status === "active" ? "bg-success/15 text-success border-0" : "border-0"}>{r.status ?? "pending"}</Badge></TableCell>
                <TableCell><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewItem(r)}><Eye className="h-4 w-4" /></Button></TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <div className="p-4"><DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} /></div>
      </div>

      {/* View Dialog */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}><DialogContent>
        <DialogHeader><DialogTitle>Gate Pass — {viewItem?.pass_no}</DialogTitle></DialogHeader>
        {viewItem && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              {[["Pass No",viewItem.pass_no],["Type",viewItem.pass_type],["Worker",viewItem.manpower?.name ?? viewItem.workers?.name],["Site",viewItem.sites?.name],["Valid From",viewItem.valid_from],["Valid Until",viewItem.valid_until],["Status",viewItem.status],["Notes",viewItem.notes]].map(([l,v])=>(
                <div key={l as string}><p className="text-muted-foreground text-xs">{l}</p><p className="font-medium capitalize">{v||"—"}</p></div>
              ))}
            </div>
          </div>
        )}
      </DialogContent></Dialog>
    </div>
  );
}