import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, ClipboardList, CheckCircle, Clock, XCircle, Users } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { ExportButton } from "@/components/ExportButton";
import { StatusFilter, buildStatuses } from "@/components/StatusFilter";

const statusColors: Record<string, string> = {
  pending: "bg-warning/15 text-warning",
  approved: "bg-success/15 text-success",
  rejected: "bg-destructive/15 text-destructive",
  fulfilled: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

export default function Requisitions() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ trade: "", quantity: 1, duration: "", start_date: "" });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["requisitions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("requisitions").select("*, clients(name), sites(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("requisitions").insert({ ...form, quantity: Number(form.quantity), created_by: user?.id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["requisitions"] }); setOpen(false); setForm({ trade: "", quantity: 1, duration: "", start_date: "" }); toast.success("Requisition created"); },
    onError: (e: any) => toast.error(e.message),
  });

  const totalWorkers = rows.reduce((s: number, r: any) => s + (r.quantity || 0), 0);
  const statusCounts: Record<string, number> = {};
  rows.forEach((r: any) => { statusCounts[r.status ?? "pending"] = (statusCounts[r.status ?? "pending"] || 0) + 1; });
  const fulfillmentRate = rows.length > 0 ? Math.round(((statusCounts.fulfilled || 0) / rows.length) * 100) : 0;

  const filtered = rows
    .filter((r: any) => r.trade?.toLowerCase().includes(search.toLowerCase()) || r.status?.toLowerCase().includes(search.toLowerCase()))
    .filter((r: any) => statusFilter === "all" || r.status === statusFilter);

  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><ClipboardList className="h-5 w-5 text-primary" /></div>
          <div><h1 className="text-2xl font-bold">Requisitions</h1><p className="text-sm text-muted-foreground">{rows.length} requisitions • {totalWorkers} workers requested</p></div>
        </div>
        <div className="flex gap-2">
          <ExportButton data={filtered} filename="requisitions" columns={[{key:"trade",label:"Trade"},{key:"quantity",label:"Qty"},{key:"duration",label:"Duration"},{key:"start_date",label:"Start"},{key:"status",label:"Status"}]} />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New Requisition</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Requisition</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Trade / Skill</Label><Input placeholder="e.g. Electrician" value={form.trade} onChange={e => setForm(f => ({ ...f, trade: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Quantity</Label><Input type="number" min={1} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))} /></div>
                  <div><Label>Duration</Label><Input placeholder="e.g. 3 months" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} /></div>
                </div>
                <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
                <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending || !form.trade}>Create</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="group hover:shadow-md transition-all"><CardContent className="p-4">
          <div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Requisitions</p><p className="text-2xl font-bold mt-1">{rows.length}</p></div>
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform"><ClipboardList className="h-4 w-4 text-primary" /></div></div>
        </CardContent></Card>
        <Card className="group hover:shadow-md transition-all"><CardContent className="p-4">
          <div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase tracking-wider">Workers Requested</p><p className="text-2xl font-bold mt-1">{totalWorkers}</p></div>
          <div className="h-9 w-9 rounded-lg bg-info/10 flex items-center justify-center group-hover:scale-110 transition-transform"><Users className="h-4 w-4 text-info" /></div></div>
        </CardContent></Card>
        <Card className="group hover:shadow-md transition-all"><CardContent className="p-4">
          <div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase tracking-wider">Pending</p><p className="text-2xl font-bold mt-1 text-warning">{statusCounts.pending || 0}</p></div>
          <div className="h-9 w-9 rounded-lg bg-warning/10 flex items-center justify-center group-hover:scale-110 transition-transform"><Clock className="h-4 w-4 text-warning" /></div></div>
        </CardContent></Card>
        <Card className="group hover:shadow-md transition-all"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Fulfillment Rate</p>
          <p className="text-2xl font-bold mt-1 text-success">{fulfillmentRate}%</p>
          <Progress value={fulfillmentRate} className="h-1.5 mt-2" />
        </CardContent></Card>
      </div>

      <StatusFilter statuses={buildStatuses(statusCounts, ["pending","approved","rejected","fulfilled"])} selected={statusFilter} onSelect={setStatusFilter} />

      <Card><CardContent className="pt-6">
        <div className="mb-4 relative max-w-sm"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No requisitions</p> : (
          <>
          <Table><TableHeader><TableRow>
            <SortableHeader label="Trade" sortKey="trade" direction={getSortDirection("trade")} onToggle={toggleSort} />
            <SortableHeader label="Qty" sortKey="quantity" direction={getSortDirection("quantity")} onToggle={toggleSort} />
            <SortableHeader label="Duration" sortKey="duration" direction={getSortDirection("duration")} onToggle={toggleSort} />
            <SortableHeader label="Start" sortKey="start_date" direction={getSortDirection("start_date")} onToggle={toggleSort} />
            <SortableHeader label="Client" sortKey="clients.name" direction={getSortDirection("clients.name")} onToggle={toggleSort} />
            <SortableHeader label="Site" sortKey="sites.name" direction={getSortDirection("sites.name")} onToggle={toggleSort} />
            <SortableHeader label="Status" sortKey="status" direction={getSortDirection("status")} onToggle={toggleSort} />
          </TableRow></TableHeader>
            <TableBody>{pageData.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.trade ?? "—"}</TableCell>
                <TableCell><Badge variant="outline">{r.quantity}</Badge></TableCell>
                <TableCell>{r.duration ?? "—"}</TableCell>
                <TableCell>{r.start_date ? format(new Date(r.start_date), "dd MMM yyyy") : "—"}</TableCell>
                <TableCell>{r.clients?.name ?? "—"}</TableCell>
                <TableCell>{r.sites?.name ?? "—"}</TableCell>
                <TableCell><Badge variant="secondary" className={`border-0 ${statusColors[r.status] || ""}`}>{r.status}</Badge></TableCell>
              </TableRow>
            ))}</TableBody></Table>
          <DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
          </>
        )}
      </CardContent></Card>
    </div>
  );
}