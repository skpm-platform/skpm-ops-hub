import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, CalendarPlus, Users, DollarSign, Loader2, Eye } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { ExportButton } from "@/components/ExportButton";
import { ComboboxSelect } from "@/components/ComboboxSelect";

export default function Deployments() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewItem, setViewItem] = useState<any>(null);
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

  const filtered = rows.filter((r: any) => r.workers?.name?.toLowerCase().includes(search.toLowerCase()) || r.status?.toLowerCase().includes(search.toLowerCase()));
  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

  const totalActive = rows.filter((r: any) => r.status === "active").length;
  const totalCost = rows.reduce((s: number, r: any) => s + (Number(r.daily_rate) || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Deployments</h1>
          <p className="text-muted-foreground">Manage worker deployments</p>
        </div>
        <div className="flex gap-2">
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

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Total</p><p className="text-2xl font-bold">{rows.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Active</p><p className="text-2xl font-bold text-success">{totalActive}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Total Daily Cost</p><p className="text-2xl font-bold">{totalCost.toLocaleString()} AED</p></CardContent></Card>
      </div>

      <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} /></div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader><TableRow>
            <SortableHeader label="Worker" sortKey="workers.name" direction={getSortDirection("workers.name")} onToggle={toggleSort} />
            <SortableHeader label="Trade" sortKey="requisitions.trade" direction={getSortDirection("requisitions.trade")} onToggle={toggleSort} />
            <SortableHeader label="Daily Rate" sortKey="daily_rate" direction={getSortDirection("daily_rate")} onToggle={toggleSort} />
            <SortableHeader label="Start" sortKey="start_date" direction={getSortDirection("start_date")} onToggle={toggleSort} />
            <SortableHeader label="End" sortKey="end_date" direction={getSortDirection("end_date")} onToggle={toggleSort} />
            <SortableHeader label="Status" sortKey="status" direction={getSortDirection("status")} onToggle={toggleSort} />
            <TableHead className="w-12">View</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Loading...</TableCell></TableRow> :
            filtered.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No deployments</TableCell></TableRow> :
            pageData.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.workers?.name ?? "—"}</TableCell>
                <TableCell>{r.requisitions?.trade ?? "—"}</TableCell>
                <TableCell>{r.daily_rate} AED</TableCell>
                <TableCell>{r.start_date ? format(new Date(r.start_date), "dd MMM yyyy") : "—"}</TableCell>
                <TableCell>{r.end_date ? format(new Date(r.end_date), "dd MMM yyyy") : "—"}</TableCell>
                <TableCell><Badge variant={r.status === "active" ? "default" : "secondary"} className={r.status === "active" ? "bg-success/15 text-success border-0" : "border-0"}>{r.status}</Badge></TableCell>
                <TableCell><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setViewItem(r); setViewOpen(true); }}><Eye className="h-3.5 w-3.5" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="p-4"><DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} /></div>
      </div>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}><DialogContent>
        <DialogHeader><DialogTitle>Deployment Details</DialogTitle></DialogHeader>
        {viewItem && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-muted-foreground">Worker:</span> <strong>{viewItem.workers?.name ?? "—"}</strong></div>
              <div><span className="text-muted-foreground">Trade:</span> <strong>{viewItem.requisitions?.trade ?? "—"}</strong></div>
              <div><span className="text-muted-foreground">Rate:</span> <strong>{viewItem.daily_rate} AED/day</strong></div>
              <div><span className="text-muted-foreground">Status:</span> <Badge variant="secondary" className="ml-1">{viewItem.status}</Badge></div>
              <div><span className="text-muted-foreground">Start:</span> {viewItem.start_date ? format(new Date(viewItem.start_date), "dd MMM yyyy") : "—"}</div>
              <div><span className="text-muted-foreground">End:</span> {viewItem.end_date ? format(new Date(viewItem.end_date), "dd MMM yyyy") : "—"}</div>
            </div>
          </div>
        )}
      </DialogContent></Dialog>
    </div>
  );
}
