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
import { Plus, Search, Loader2, CalendarDays, Sun, Moon, Scissors, Clock, Users , AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { ExportButton } from "@/components/ExportButton";
import { ComboboxSelect } from "@/components/ComboboxSelect";
import { StatusFilter, buildStatuses } from "@/components/StatusFilter";

const shiftIcons: Record<string, any> = { day: Sun, night: Moon, split: Scissors, overtime: Clock };
const shiftColors: Record<string, string> = { day: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", night: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400", split: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", overtime: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" };

export default function DutyRoster() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ date: "", shift: "day", start_time: "08:00", end_time: "17:00", notes: "", employee_id: "" });

  const { data: rows = [], isLoading , isError: dataLoadError} = useQuery({
    queryKey: ["duty_roster"],
    queryFn: async () => {
      const { data, error } = await supabase.from("duty_roster").select("*, employees(name), sites(name)").order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: drEmployeeList = [] } = useQuery({
    queryKey: ["dr-employees-list"],
    queryFn: async () => { const { data } = await (supabase as any).from("employees").select("id, name").order("name"); return data || []; },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = { date: form.date, shift: form.shift, start_time: form.start_time, end_time: form.end_time, notes: form.notes };
      if (form.employee_id) payload.employee_id = form.employee_id;
      const { error } = await supabase.from("duty_roster").insert(payload);
      if (error) throw error;
      await logAudit("Added roster entry", form.date);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["duty_roster"] }); setOpen(false); setForm({ date: "", shift: "day", start_time: "08:00", end_time: "17:00", notes: "", employee_id: "" }); toast.success("Roster entry added"); },
    onError: (e: any) => toast.error(e.message),
  });

  const shiftCounts: Record<string, number> = {};
  rows.forEach((r: any) => { shiftCounts[r.shift ?? "day"] = (shiftCounts[r.shift ?? "day"] || 0) + 1; });

  const statusCounts: Record<string, number> = {};
  rows.forEach((r: any) => { statusCounts[r.status ?? "scheduled"] = (statusCounts[r.status ?? "scheduled"] || 0) + 1; });

  const uniqueEmployees = new Set(rows.map((r: any) => r.employee_id).filter(Boolean)).size;

  const filtered = rows
    .filter((r: any) => r.employees?.name?.toLowerCase().includes(search.toLowerCase()) || r.shift?.toLowerCase().includes(search.toLowerCase()))
    .filter((r: any) => statusFilter === "all" || (r.status ?? "scheduled") === statusFilter);
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><CalendarDays className="h-5 w-5 text-primary" /></div>
          <div><h1 className="text-2xl font-bold">Duty Roster</h1><p className="text-muted-foreground">Schedule and manage employee shifts</p></div>
        </div>
        <div className="flex gap-2">
          <ExportButton data={filtered} filename="duty-roster" columns={[{key:"employees.name",label:"Employee"},{key:"date",label:"Date"},{key:"shift",label:"Shift"},{key:"status",label:"Status"}]} />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" className="h-9"><Plus className="mr-2 h-4 w-4" />Add Entry</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Roster Entry</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label>Employee</Label>
                  <ComboboxSelect value={form.employee_id} onChange={v => setForm(f => ({ ...f, employee_id: v }))} options={drEmployeeList.map((e: any) => ({ value: e.id, label: e.name }))} placeholder="Select employee" />
                </div>
                <div className="space-y-2"><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Shift Type</Label>
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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="group hover:shadow-md transition-all"><CardContent className="p-4">
          <div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase">Total Entries</p><p className="text-2xl font-bold">{rows.length}</p></div>
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform"><CalendarDays className="h-4 w-4 text-primary" /></div></div>
        </CardContent></Card>
        <Card className="group hover:shadow-md transition-all"><CardContent className="p-4">
          <div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase">Day Shifts</p><p className="text-2xl font-bold text-amber-600">{shiftCounts.day || 0}</p></div>
          <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center group-hover:scale-110 transition-transform"><Sun className="h-4 w-4 text-amber-600" /></div></div>
        </CardContent></Card>
        <Card className="group hover:shadow-md transition-all"><CardContent className="p-4">
          <div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase">Night Shifts</p><p className="text-2xl font-bold text-indigo-600">{shiftCounts.night || 0}</p></div>
          <div className="h-9 w-9 rounded-lg bg-indigo-500/10 flex items-center justify-center group-hover:scale-110 transition-transform"><Moon className="h-4 w-4 text-indigo-600" /></div></div>
        </CardContent></Card>
        <Card className="group hover:shadow-md transition-all"><CardContent className="p-4">
          <div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase">Employees</p><p className="text-2xl font-bold">{uniqueEmployees}</p></div>
          <div className="h-9 w-9 rounded-lg bg-success/10 flex items-center justify-center group-hover:scale-110 transition-transform"><Users className="h-4 w-4 text-success" /></div></div>
        </CardContent></Card>
      </div>

      <StatusFilter statuses={buildStatuses(statusCounts, ["scheduled","completed","cancelled"])} selected={statusFilter} onSelect={setStatusFilter} />

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
            pageData.map((r: any) => {
              const ShiftIcon = shiftIcons[r.shift] || Clock;
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.employees?.name ?? "—"}</TableCell>
                  <TableCell>{r.date ? format(new Date(r.date), "dd MMM yyyy") : "—"}</TableCell>
                  <TableCell><Badge variant="secondary" className={`capitalize border-0 gap-1 ${shiftColors[r.shift] || ""}`}><ShiftIcon className="h-3 w-3" />{r.shift}</Badge></TableCell>
                  <TableCell className="font-mono text-sm">{r.start_time ?? "—"}</TableCell>
                  <TableCell className="font-mono text-sm">{r.end_time ?? "—"}</TableCell>
                  <TableCell>{r.sites?.name ?? "—"}</TableCell>
                  <TableCell><Badge variant={r.status === "completed" ? "default" : "secondary"} className={r.status === "completed" ? "bg-success/15 text-success border-0" : "border-0"}>{r.status ?? "scheduled"}</Badge></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <div className="p-4"><DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} /></div>
      </div>
    </div>
  );
}