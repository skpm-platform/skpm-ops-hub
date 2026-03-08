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
import { Plus, Search, Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { ExportButton } from "@/components/ExportButton";
import { ComboboxSelect } from "@/components/ComboboxSelect";

export default function GatePasses() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ pass_no: "", pass_type: "entry", valid_from: "", valid_until: "", notes: "" });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["gate_passes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("gate_passes").select("*, workers(name), sites(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("gate_passes").insert({ ...form, issued_by: user?.id });
      if (error) throw error;
      await logAudit("Issued gate pass", form.pass_no);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["gate_passes"] }); setOpen(false); setForm({ pass_no: "", pass_type: "entry", valid_from: "", valid_until: "", notes: "" }); toast.success("Gate pass issued"); },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = rows.filter((r: any) => r.pass_no?.toLowerCase().includes(search.toLowerCase()) || r.workers?.name?.toLowerCase().includes(search.toLowerCase()));
  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

  const activeCount = rows.filter((r:any) => r.status === "active").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <KeyRound className="h-7 w-7 text-primary" />
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

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Total Passes</p><p className="text-2xl font-bold">{rows.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Active</p><p className="text-2xl font-bold text-success">{activeCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Expired</p><p className="text-2xl font-bold text-destructive">{rows.length - activeCount}</p></CardContent></Card>
      </div>

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
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Loading...</TableCell></TableRow> :
            filtered.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No gate passes</TableCell></TableRow> :
            pageData.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono font-medium">{r.pass_no ?? "—"}</TableCell>
                <TableCell><Badge variant="secondary" className="capitalize border-0">{r.pass_type}</Badge></TableCell>
                <TableCell>{r.workers?.name ?? "—"}</TableCell>
                <TableCell>{r.sites?.name ?? "—"}</TableCell>
                <TableCell>{r.valid_from ? format(new Date(r.valid_from), "dd MMM yyyy") : "—"}</TableCell>
                <TableCell>{r.valid_until ? format(new Date(r.valid_until), "dd MMM yyyy") : "—"}</TableCell>
                <TableCell><Badge variant={r.status === "active" ? "default" : "secondary"} className={r.status === "active" ? "bg-success/15 text-success border-0" : "border-0"}>{r.status ?? "pending"}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="p-4"><DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} /></div>
      </div>
    </div>
  );
}
