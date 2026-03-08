import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Clock, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-info/15 text-info",
  approved: "bg-success/15 text-success",
  rejected: "bg-destructive/15 text-destructive",
};

export default function Timesheets() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ date: "", hours_worked: 8, overtime_hours: 0, notes: "" });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["timesheets"],
    queryFn: async () => {
      const { data, error } = await supabase.from("timesheets").select("*, employees(name), projects(name), sites(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("timesheets").insert({ ...form, hours_worked: Number(form.hours_worked), overtime_hours: Number(form.overtime_hours) });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["timesheets"] }); setOpen(false); setForm({ date: "", hours_worked: 8, overtime_hours: 0, notes: "" }); toast({ title: "Timesheet added" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const totalHours = rows.reduce((s: number, r: any) => s + (r.hours_worked || 0), 0);
  const totalOT = rows.reduce((s: number, r: any) => s + (r.overtime_hours || 0), 0);

  const filtered = rows
    .filter((r: any) => r.employees?.name?.toLowerCase().includes(search.toLowerCase()) || r.status?.toLowerCase().includes(search.toLowerCase()))
    .filter((r: any) => statusFilter === "all" || r.status === statusFilter);

  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><Clock className="h-7 w-7 text-primary" /><h1 className="text-2xl font-bold">Timesheets</h1></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Add Entry</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Timesheet Entry</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Hours Worked</Label><Input type="number" min={0} max={24} value={form.hours_worked} onChange={e => setForm(f => ({ ...f, hours_worked: Number(e.target.value) }))} /></div>
                <div><Label>Overtime Hours</Label><Input type="number" min={0} value={form.overtime_hours} onChange={e => setForm(f => ({ ...f, overtime_hours: Number(e.target.value) }))} /></div>
              </div>
              <div><Label>Notes</Label><Input placeholder="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
              <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending}>Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Entries</p><p className="text-2xl font-semibold mt-1">{rows.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Hours</p><p className="text-2xl font-semibold mt-1">{totalHours.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Overtime Hours</p><p className="text-2xl font-semibold mt-1 text-warning">{totalOT.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Approved</p><p className="text-2xl font-semibold mt-1 text-success">{rows.filter((r: any) => r.status === "approved").length}</p></CardContent></Card>
      </div>

      <Card><CardContent className="pt-6">
        <div className="mb-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} /></div>
          <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="draft">Draft</SelectItem><SelectItem value="submitted">Submitted</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="rejected">Rejected</SelectItem></SelectContent></Select>
        </div>
        {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No timesheets</p> : (
          <>
          <Table><TableHeader><TableRow>
            <SortableHeader label="Employee" sortKey="employees.name" direction={getSortDirection("employees.name")} onToggle={toggleSort} />
            <SortableHeader label="Date" sortKey="date" direction={getSortDirection("date")} onToggle={toggleSort} />
            <SortableHeader label="Hours" sortKey="hours_worked" direction={getSortDirection("hours_worked")} onToggle={toggleSort} />
            <SortableHeader label="OT" sortKey="overtime_hours" direction={getSortDirection("overtime_hours")} onToggle={toggleSort} />
            <SortableHeader label="Project" sortKey="projects.name" direction={getSortDirection("projects.name")} onToggle={toggleSort} />
            <SortableHeader label="Site" sortKey="sites.name" direction={getSortDirection("sites.name")} onToggle={toggleSort} />
            <SortableHeader label="Status" sortKey="status" direction={getSortDirection("status")} onToggle={toggleSort} />
          </TableRow></TableHeader>
            <TableBody>{pageData.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.employees?.name ?? "—"}</TableCell>
                <TableCell>{r.date ? format(new Date(r.date), "dd MMM yyyy") : "—"}</TableCell>
                <TableCell>{r.hours_worked}</TableCell>
                <TableCell>{r.overtime_hours > 0 ? <span className="text-warning font-medium">{r.overtime_hours}</span> : "0"}</TableCell>
                <TableCell>{r.projects?.name ?? "—"}</TableCell>
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
