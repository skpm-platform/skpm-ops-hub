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
import { Plus, Search, Loader2, Eye } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { ExportButton } from "@/components/ExportButton";
import { ComboboxSelect } from "@/components/ComboboxSelect";

export default function DutyRoster() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ date: "", shift: "day", start_time: "08:00", end_time: "17:00", notes: "" });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["duty_roster"],
    queryFn: async () => {
      const { data, error } = await supabase.from("duty_roster").select("*, employees(name), sites(name)").order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("duty_roster").insert(form);
      if (error) throw error;
      await logAudit("Added roster entry", form.date);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["duty_roster"] }); setOpen(false); setForm({ date: "", shift: "day", start_time: "08:00", end_time: "17:00", notes: "" }); toast.success("Roster entry added"); },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = rows.filter((r: any) => r.employees?.name?.toLowerCase().includes(search.toLowerCase()) || r.shift?.toLowerCase().includes(search.toLowerCase()));
  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Duty Roster</h1>
          <p className="text-muted-foreground">Schedule and manage employee shifts</p>
        </div>
        <div className="flex gap-2">
          <ExportButton data={filtered} filename="duty-roster" columns={[{key:"employees.name",label:"Employee"},{key:"date",label:"Date"},{key:"shift",label:"Shift"},{key:"status",label:"Status"}]} />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" className="h-9"><Plus className="mr-2 h-4 w-4" />Add Entry</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Roster Entry</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Shift</Label>
                  <ComboboxSelect value={form.shift} onChange={v => setForm(f => ({ ...f, shift: v }))} options={["day","night","split","overtime"]} placeholder="Select shift" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Start Time</Label><Input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>End Time</Label><Input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} /></div>
                </div>
                <div className="space-y-2"><Label>Notes</Label><Input placeholder="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
                <Button className="w-full h-9" onClick={() => save.mutate()} disabled={save.isPending}>
                  {save.isPending && <Loader2 className="animate-spin mr-2 h-4 w-4" />} Save
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Total Entries</p><p className="text-2xl font-bold">{rows.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Day Shifts</p><p className="text-2xl font-bold">{rows.filter((r:any) => r.shift === "day").length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Night Shifts</p><p className="text-2xl font-bold">{rows.filter((r:any) => r.shift === "night").length}</p></CardContent></Card>
      </div>

      <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} /></div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader><TableRow>
            <SortableHeader label="Employee" sortKey="employees.name" direction={getSortDirection("employees.name")} onToggle={toggleSort} />
            <SortableHeader label="Date" sortKey="date" direction={getSortDirection("date")} onToggle={toggleSort} />
            <SortableHeader label="Shift" sortKey="shift" direction={getSortDirection("shift")} onToggle={toggleSort} />
            <SortableHeader label="Start" sortKey="start_time" direction={getSortDirection("start_time")} onToggle={toggleSort} />
            <SortableHeader label="End" sortKey="end_time" direction={getSortDirection("end_time")} onToggle={toggleSort} />
            <SortableHeader label="Site" sortKey="sites.name" direction={getSortDirection("sites.name")} onToggle={toggleSort} />
            <SortableHeader label="Status" sortKey="status" direction={getSortDirection("status")} onToggle={toggleSort} />
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Loading...</TableCell></TableRow> :
            filtered.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No roster entries</TableCell></TableRow> :
            pageData.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.employees?.name ?? "—"}</TableCell>
                <TableCell>{r.date ? format(new Date(r.date), "dd MMM yyyy") : "—"}</TableCell>
                <TableCell><Badge variant="secondary" className="capitalize border-0">{r.shift}</Badge></TableCell>
                <TableCell className="font-mono text-sm">{r.start_time ?? "—"}</TableCell>
                <TableCell className="font-mono text-sm">{r.end_time ?? "—"}</TableCell>
                <TableCell>{r.sites?.name ?? "—"}</TableCell>
                <TableCell><Badge variant={r.status === "completed" ? "default" : "secondary"} className={r.status === "completed" ? "bg-success/15 text-success border-0" : "border-0"}>{r.status ?? "scheduled"}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="p-4"><DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} /></div>
      </div>
    </div>
  );
}
