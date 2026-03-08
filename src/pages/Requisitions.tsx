import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, ClipboardList } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";

const statusColors: Record<string, string> = {
  pending: "bg-warning/15 text-warning",
  approved: "bg-success/15 text-success",
  rejected: "bg-destructive/15 text-destructive",
  fulfilled: "bg-info/15 text-info",
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["requisitions"] }); setOpen(false); setForm({ trade: "", quantity: 1, duration: "", start_date: "" }); toast({ title: "Requisition created" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const totalWorkers = rows.reduce((s: number, r: any) => s + (r.quantity || 0), 0);

  const filtered = rows
    .filter((r: any) => r.trade?.toLowerCase().includes(search.toLowerCase()) || r.status?.toLowerCase().includes(search.toLowerCase()))
    .filter((r: any) => statusFilter === "all" || r.status === statusFilter);

  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><ClipboardList className="h-7 w-7 text-primary" /><h1 className="text-2xl font-bold">Requisitions</h1></div>
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

      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Requisitions</p><p className="text-2xl font-semibold mt-1">{rows.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Workers Requested</p><p className="text-2xl font-semibold mt-1">{totalWorkers}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Pending</p><p className="text-2xl font-semibold mt-1 text-warning">{rows.filter((r: any) => r.status === "pending").length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Approved</p><p className="text-2xl font-semibold mt-1 text-success">{rows.filter((r: any) => r.status === "approved").length}</p></CardContent></Card>
      </div>

      <Card><CardContent className="pt-6">
        <div className="mb-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} /></div>
          <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="rejected">Rejected</SelectItem><SelectItem value="fulfilled">Fulfilled</SelectItem></SelectContent></Select>
        </div>
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
                <TableCell>{r.quantity}</TableCell>
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
