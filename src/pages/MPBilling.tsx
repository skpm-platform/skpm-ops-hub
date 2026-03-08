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
import { Plus, Search, Loader2, Banknote, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { ExportButton } from "@/components/ExportButton";
import { StatusFilter, buildStatuses } from "@/components/StatusFilter";

export default function MPBilling() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), total_workers: 0, total_days: 0, rate: 0, notes: "" });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["mp_billing"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mp_billing").select("*, clients(name), projects(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const total_amount = Number(form.total_workers) * Number(form.total_days) * Number(form.rate);
      const { error } = await supabase.from("mp_billing").insert({ ...form, total_workers: Number(form.total_workers), total_days: Number(form.total_days), rate: Number(form.rate), total_amount });
      if (error) throw error;
      await logAudit("Created MP billing", `${total_amount} AED`);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mp_billing"] }); setOpen(false); setForm({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), total_workers: 0, total_days: 0, rate: 0, notes: "" }); toast.success("Billing record created"); },
    onError: (e: any) => toast.error(e.message),
  });

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const statusCounts: Record<string, number> = {};
  rows.forEach((r: any) => { statusCounts[r.status ?? "draft"] = (statusCounts[r.status ?? "draft"] || 0) + 1; });
  const statuses = buildStatuses(statusCounts, ["draft","submitted","invoiced","paid"]);

  const filtered = rows.filter((r: any) => {
    const matchSearch = r.clients?.name?.toLowerCase().includes(search.toLowerCase()) || r.status?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });
  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

  const totalAmount = rows.reduce((s: number, r: any) => s + (Number(r.total_amount) || 0), 0);
  const totalWorkers = rows.reduce((s: number, r: any) => s + (Number(r.total_workers) || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Banknote className="h-7 w-7 text-primary" />
          <div><h1 className="text-2xl font-bold">MP Billing</h1><p className="text-muted-foreground">Manpower billing & invoicing</p></div>
        </div>
        <div className="flex gap-2">
          <ExportButton data={filtered} filename="mp-billing" columns={[{key:"clients.name",label:"Client"},{key:"total_workers",label:"Workers"},{key:"total_days",label:"Days"},{key:"rate",label:"Rate"},{key:"total_amount",label:"Total"},{key:"status",label:"Status"}]} />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" className="h-9"><Plus className="mr-2 h-4 w-4" />New Billing</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New MP Billing</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Month</Label><Input type="number" min={1} max={12} value={form.month} onChange={e => setForm(f => ({ ...f, month: Number(e.target.value) }))} /></div>
                  <div className="space-y-2"><Label>Year</Label><Input type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) }))} /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2"><Label>Workers</Label><Input type="number" min={0} value={form.total_workers} onChange={e => setForm(f => ({ ...f, total_workers: Number(e.target.value) }))} /></div>
                  <div className="space-y-2"><Label>Days</Label><Input type="number" min={0} value={form.total_days} onChange={e => setForm(f => ({ ...f, total_days: Number(e.target.value) }))} /></div>
                  <div className="space-y-2"><Label>Rate (AED)</Label><Input type="number" min={0} value={form.rate} onChange={e => setForm(f => ({ ...f, rate: Number(e.target.value) }))} /></div>
                </div>
                <div className="p-3 rounded-md bg-muted text-sm">
                  <span className="text-muted-foreground">Calculated Total: </span>
                  <strong>{(Number(form.total_workers) * Number(form.total_days) * Number(form.rate)).toLocaleString()} AED</strong>
                </div>
                <div className="space-y-2"><Label>Notes</Label><Input placeholder="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
                <Button className="w-full h-9" onClick={() => save.mutate()} disabled={save.isPending}>
                  {save.isPending && <Loader2 className="animate-spin mr-2 h-4 w-4" />} Create Billing
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Total Billing</p><p className="text-2xl font-bold">{totalAmount.toLocaleString()} AED</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Total Workers</p><p className="text-2xl font-bold">{totalWorkers}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Records</p><p className="text-2xl font-bold">{rows.length}</p></CardContent></Card>
      </div>

      <StatusFilter statuses={statuses} current={statusFilter} onChange={setStatusFilter} />

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
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Loading...</TableCell></TableRow> :
            filtered.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No billing records</TableCell></TableRow> :
            pageData.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{months[r.month - 1]} {r.year}</TableCell>
                <TableCell>{r.clients?.name ?? "—"}</TableCell>
                <TableCell>{r.projects?.name ?? "—"}</TableCell>
                <TableCell>{r.total_workers}</TableCell>
                <TableCell>{r.total_days}</TableCell>
                <TableCell>{r.rate} AED</TableCell>
                <TableCell className="font-bold">{Number(r.total_amount).toLocaleString()} AED</TableCell>
                <TableCell><Badge variant={r.status === "paid" ? "default" : "secondary"} className={r.status === "paid" ? "bg-success/15 text-success border-0" : "border-0"}>{r.status ?? "draft"}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="p-4"><DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} /></div>
      </div>
    </div>
  );
}
