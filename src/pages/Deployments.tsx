import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, Search, Loader2, Users, DollarSign, Eye, LayoutGrid, List, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { ExportButton } from "@/components/ExportButton";
import { ComboboxSelect } from "@/components/ComboboxSelect";
import { StatusFilter, buildStatuses } from "@/components/StatusFilter";

export default function Deployments() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewItem, setViewItem] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [form, setForm] = useState({ daily_rate: 0, start_date: "", end_date: "", status: "active" });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["deployments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("deployments").select("*, workers(name), requisitions(trade)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("deployments").insert({ ...form, daily_rate: Number(form.daily_rate) });
      if (error) throw error;
      await logAudit("Created deployment", `Rate: ${form.daily_rate}`);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["deployments"] }); setOpen(false); setForm({ daily_rate: 0, start_date: "", end_date: "", status: "active" }); toast.success("Deployment created"); },
    onError: (e: any) => toast.error(e.message),
  });

  const totalActive = rows.filter((r: any) => r.status === "active").length;
  const totalCost = rows.filter((r: any) => r.status === "active").reduce((s: number, r: any) => s + (Number(r.daily_rate) || 0), 0);
  const avgRate = totalActive > 0 ? Math.round(totalCost / totalActive) : 0;
  const statusCounts: Record<string, number> = {};
  rows.forEach((r: any) => { statusCounts[r.status ?? "active"] = (statusCounts[r.status ?? "active"] || 0) + 1; });
  const utilizationRate = rows.length > 0 ? Math.round((totalActive / rows.length) * 100) : 0;

  const filtered = rows
    .filter((r: any) => r.workers?.name?.toLowerCase().includes(search.toLowerCase()) || r.status?.toLowerCase().includes(search.toLowerCase()))
    .filter((r: any) => statusFilter === "all" || r.status === statusFilter);
  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

  const getDuration = (r: any) => {
    if (!r.start_date) return "—";
    const end = r.end_date ? new Date(r.end_date) : new Date();
    const days = differenceInDays(end, new Date(r.start_date));
    return `${days}d`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Users className="h-5 w-5 text-primary" /></div>
          <div><h1 className="text-2xl font-bold">Deployments</h1><p className="text-muted-foreground">Manage worker deployments</p></div>
        </div>
        <div className="flex gap-2">
          <div className="flex border rounded-lg overflow-hidden">
            <Button variant={viewMode === "table" ? "default" : "ghost"} size="sm" className="h-9 rounded-none" onClick={() => setViewMode("table")}><List className="h-4 w-4" /></Button>
            <Button variant={viewMode === "grid" ? "default" : "ghost"} size="sm" className="h-9 rounded-none" onClick={() => setViewMode("grid")}><LayoutGrid className="h-4 w-4" /></Button>
          </div>
          <ExportButton data={filtered} filename="deployments" columns={[{key:"workers.name",label:"Worker"},{key:"daily_rate",label:"Rate"},{key:"status",label:"Status"}]} />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" className="h-9"><Plus className="mr-2 h-4 w-4" />New Deployment</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Deployment</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label>Daily Rate (AED)</Label><Input type="number" placeholder="0" value={form.daily_rate} onChange={e => setForm(f => ({ ...f, daily_rate: Number(e.target.value) }))} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>End Date</Label><Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
                </div>
                <div className="space-y-2"><Label>Status</Label>
                  <ComboboxSelect value={form.status} onChange={v => setForm(f => ({ ...f, status: v }))} options={["active","completed","cancelled"]} placeholder="Select status" />
                </div>
                <Button className="w-full h-9" onClick={() => save.mutate()} disabled={save.isPending}>
                  {save.isPending && <Loader2 className="animate-spin mr-2 h-4 w-4" />} Create Deployment
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="group hover:shadow-md transition-all"><CardContent className="p-4">
          <div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase">Total</p><p className="text-2xl font-bold">{rows.length}</p></div>
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform"><Users className="h-4 w-4 text-primary" /></div></div>
        </CardContent></Card>
        <Card className="group hover:shadow-md transition-all"><CardContent className="p-4">
          <div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase">Active</p><p className="text-2xl font-bold text-success">{totalActive}</p></div>
          <div className="h-9 w-9 rounded-lg bg-success/10 flex items-center justify-center group-hover:scale-110 transition-transform"><TrendingUp className="h-4 w-4 text-success" /></div></div>
          <p className="text-[11px] text-muted-foreground mt-2">Utilization: {utilizationRate}%</p>
          <Progress value={utilizationRate} className="h-1.5 mt-1" />
        </CardContent></Card>
        <Card className="group hover:shadow-md transition-all"><CardContent className="p-4">
          <div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase">Daily Cost</p><p className="text-2xl font-bold">{totalCost.toLocaleString()} AED</p></div>
          <div className="h-9 w-9 rounded-lg bg-warning/10 flex items-center justify-center group-hover:scale-110 transition-transform"><DollarSign className="h-4 w-4 text-warning" /></div></div>
        </CardContent></Card>
        <Card className="group hover:shadow-md transition-all"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase">Avg Rate</p>
          <p className="text-2xl font-bold">{avgRate} AED/day</p>
          <p className="text-[11px] text-muted-foreground mt-2">Monthly est: {(totalCost * 30).toLocaleString()} AED</p>
        </CardContent></Card>
      </div>

      <StatusFilter statuses={buildStatuses(statusCounts, ["active","completed","cancelled"])} selected={statusFilter} onSelect={setStatusFilter} />

      <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} /></div>

      {isLoading ? <p className="text-muted-foreground text-center py-8">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No deployments</p> : viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r: any) => (
            <Card key={r.id} className="group hover:shadow-lg transition-all border hover:border-primary/20 overflow-hidden">
              <CardContent className="p-0">
                <div className={`h-1 ${r.status === "active" ? "bg-success" : r.status === "completed" ? "bg-primary" : "bg-destructive"}`} />
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div><h3 className="font-semibold text-sm">{r.workers?.name ?? "Unassigned"}</h3><p className="text-[11px] text-muted-foreground">{r.requisitions?.trade ?? "—"}</p></div>
                    <Badge variant={r.status === "active" ? "default" : "secondary"} className={r.status === "active" ? "bg-success/15 text-success border-0" : "border-0"}>{r.status}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Rate</span>
                    <span className="font-bold">{r.daily_rate} AED/day</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Duration</span>
                    <span className="font-medium">{getDuration(r)}</span>
                  </div>
                  {r.start_date && <p className="text-[10px] text-muted-foreground">{format(new Date(r.start_date), "dd MMM")} — {r.end_date ? format(new Date(r.end_date), "dd MMM yyyy") : "Ongoing"}</p>}
                  <Button variant="ghost" size="sm" className="w-full h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => { setViewItem(r); setViewOpen(true); }}><Eye className="h-3 w-3 mr-1" />View Details</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader><TableRow>
              <SortableHeader label="Worker" sortKey="workers.name" direction={getSortDirection("workers.name")} onToggle={toggleSort} />
              <SortableHeader label="Trade" sortKey="requisitions.trade" direction={getSortDirection("requisitions.trade")} onToggle={toggleSort} />
              <SortableHeader label="Daily Rate" sortKey="daily_rate" direction={getSortDirection("daily_rate")} onToggle={toggleSort} />
              <SortableHeader label="Start" sortKey="start_date" direction={getSortDirection("start_date")} onToggle={toggleSort} />
              <SortableHeader label="End" sortKey="end_date" direction={getSortDirection("end_date")} onToggle={toggleSort} />
              <SortableHeader label="Duration" sortKey="start_date" direction={null} onToggle={() => {}} />
              <SortableHeader label="Status" sortKey="status" direction={getSortDirection("status")} onToggle={toggleSort} />
              <TableHead className="w-12">View</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {pageData.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.workers?.name ?? "—"}</TableCell>
                  <TableCell><Badge variant="outline">{r.requisitions?.trade ?? "—"}</Badge></TableCell>
                  <TableCell className="font-bold">{r.daily_rate} AED</TableCell>
                  <TableCell>{r.start_date ? format(new Date(r.start_date), "dd MMM yyyy") : "—"}</TableCell>
                  <TableCell>{r.end_date ? format(new Date(r.end_date), "dd MMM yyyy") : "—"}</TableCell>
                  <TableCell><Badge variant="secondary" className="border-0">{getDuration(r)}</Badge></TableCell>
                  <TableCell><Badge variant={r.status === "active" ? "default" : "secondary"} className={r.status === "active" ? "bg-success/15 text-success border-0" : "border-0"}>{r.status}</Badge></TableCell>
                  <TableCell><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setViewItem(r); setViewOpen(true); }}><Eye className="h-3.5 w-3.5" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="p-4"><DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} /></div>
        </div>
      )}

      <Dialog open={viewOpen} onOpenChange={setViewOpen}><DialogContent>
        <DialogHeader><DialogTitle>Deployment Details</DialogTitle></DialogHeader>
        {viewItem && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-muted-foreground text-xs">Worker</span><p className="font-medium">{viewItem.workers?.name ?? "—"}</p></div>
              <div><span className="text-muted-foreground text-xs">Trade</span><p className="font-medium">{viewItem.requisitions?.trade ?? "—"}</p></div>
              <div><span className="text-muted-foreground text-xs">Rate</span><p className="font-bold">{viewItem.daily_rate} AED/day</p></div>
              <div><span className="text-muted-foreground text-xs">Duration</span><p className="font-medium">{getDuration(viewItem)}</p></div>
              <div><span className="text-muted-foreground text-xs">Start</span><p>{viewItem.start_date ? format(new Date(viewItem.start_date), "dd MMM yyyy") : "—"}</p></div>
              <div><span className="text-muted-foreground text-xs">End</span><p>{viewItem.end_date ? format(new Date(viewItem.end_date), "dd MMM yyyy") : "Ongoing"}</p></div>
              <div><span className="text-muted-foreground text-xs">Status</span><Badge variant="secondary" className="ml-1">{viewItem.status}</Badge></div>
            </div>
          </div>
        )}
      </DialogContent></Dialog>
    </div>
  );
}