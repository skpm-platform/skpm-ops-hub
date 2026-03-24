import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ComboboxSelect } from "@/components/ComboboxSelect";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ExportButton } from "@/components/ExportButton";
import { StatusFilter, buildStatuses } from "@/components/StatusFilter";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { Plus, Search, Clock, Eye, Trash2, Loader2 , AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const statusColors: Record<string, string> = { draft: "bg-muted text-muted-foreground", submitted: "bg-info/15 text-info", approved: "bg-success/15 text-success", rejected: "bg-destructive/15 text-destructive" };

export default function Timesheets() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [viewItem, setViewItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ date: format(new Date(), "yyyy-MM-dd"), hours_worked: "8", overtime_hours: "0", notes: "", employee_id: "", project_id: "", site_id: "", start_time: "", end_time: "" });

  const { data: rows = [], isLoading , isError: dataLoadError} = useQuery({
    queryKey: ["timesheets"],
    queryFn: async () => { const { data, error } = await supabase.from("timesheets").select("*, employees(name), projects(name), sites(name)").order("created_at", { ascending: false }); if (error) throw error; return data; },
  });

  const { data: employeeList = [] } = useQuery({
    queryKey: ["employees-list"],
    queryFn: async () => { const { data } = await (supabase as any).from("employees").select("id, name").order("name"); return data || []; },
  });
  const { data: projectList = [] } = useQuery({
    queryKey: ["projects-list"],
    queryFn: async () => { const { data } = await (supabase as any).from("projects").select("id, name").order("name"); return data || []; },
  });
  const { data: siteList = [] } = useQuery({
    queryKey: ["sites-list"],
    queryFn: async () => { const { data } = await (supabase as any).from("sites").select("id, name").order("name"); return data || []; },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = { date: form.date, hours_worked: Number(form.hours_worked), overtime_hours: Number(form.overtime_hours), notes: form.notes };
      if (form.employee_id) payload.employee_id = form.employee_id;
      if (form.project_id) payload.project_id = form.project_id;
      if (form.site_id) payload.site_id = form.site_id;
      if (form.start_time) payload.start_time = form.start_time;
      if (form.end_time) payload.end_time = form.end_time;
      const { error } = await supabase.from("timesheets").insert(payload);
      if (error) throw error;
      await logAudit("Added timesheet entry", `${form.date}: ${form.hours_worked}h`);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["timesheets"] }); setOpen(false); setForm({ date: format(new Date(), "yyyy-MM-dd"), hours_worked: "8", overtime_hours: "0", notes: "", employee_id: "", project_id: "", site_id: "", start_time: "", end_time: "" }); toast.success("Timesheet added"); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("timesheets").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["timesheets"] }); toast.success("Deleted"); setDeleteId(null); },
  });

  const totalHours = rows.reduce((s: number, r: any) => s + (r.hours_worked || 0), 0);
  const totalOT = rows.reduce((s: number, r: any) => s + (r.overtime_hours || 0), 0);
  const statusCounts = rows.reduce((acc: Record<string, number>, r: any) => { acc[r.status || "draft"] = (acc[r.status || "draft"] || 0) + 1; return acc; }, {});

  const filtered = rows
    .filter((r: any) => (r.employees?.name || "").toLowerCase().includes(search.toLowerCase()) || (r.notes || "").toLowerCase().includes(search.toLowerCase()))
    .filter((r: any) => statusFilter === "all" || r.status === statusFilter);

  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

  return (
    <div className="space-y-6">
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
        <div className="flex items-center gap-3"><Clock className="h-7 w-7 text-primary" /><h1 className="text-2xl font-bold">Timesheets</h1></div>
        <div className="flex gap-2">
          <ExportButton data={rows} filename="timesheets" columns={[{ key: "date", label: "Date" }, { key: "hours_worked", label: "Hours" }, { key: "overtime_hours", label: "OT" }, { key: "status", label: "Status" }]} />
          <Button size="sm" className="h-9" onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Add Entry</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Entries</p><p className="text-2xl font-semibold mt-1">{rows.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Hours</p><p className="text-2xl font-semibold mt-1">{totalHours.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Overtime Hours</p><p className="text-2xl font-semibold mt-1 text-warning">{totalOT.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Approved</p><p className="text-2xl font-semibold mt-1 text-success">{statusCounts["approved"] || 0}</p></CardContent></Card>
      </div>

      <StatusFilter statuses={buildStatuses(statusCounts, ["draft", "submitted", "approved", "rejected"])} selected={statusFilter} onSelect={setStatusFilter} />

      <Card><CardContent className="pt-6">
        <div className="mb-4 relative max-w-sm"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        {isLoading ? <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
          <>
            <Table><TableHeader><TableRow>
              <SortableHeader label="Employee" sortKey="employees.name" direction={getSortDirection("employees.name")} onToggle={toggleSort} />
              <SortableHeader label="Date" sortKey="date" direction={getSortDirection("date")} onToggle={toggleSort} />
              <SortableHeader label="Hours" sortKey="hours_worked" direction={getSortDirection("hours_worked")} onToggle={toggleSort} />
              <SortableHeader label="OT" sortKey="overtime_hours" direction={getSortDirection("overtime_hours")} onToggle={toggleSort} />
              <SortableHeader label="Project" sortKey="projects.name" direction={getSortDirection("projects.name")} onToggle={toggleSort} />
              <SortableHeader label="Status" sortKey="status" direction={getSortDirection("status")} onToggle={toggleSort} />
              <SortableHeader label="" sortKey="" direction={null} onToggle={() => {}} className="w-20" />
            </TableRow></TableHeader>
              <TableBody>
                {pageData.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No timesheets</TableCell></TableRow> : pageData.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.employees?.name ?? "—"}</TableCell>
                    <TableCell>{r.date ? format(new Date(r.date), "dd MMM yyyy") : "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span>{r.hours_worked}</span>
                        {(r.hours_worked > 8 || r.overtime_hours > 0) && <Badge variant="secondary" className="border-0 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-[10px]">OT</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>{r.overtime_hours > 0 ? <span className="text-warning font-medium">{r.overtime_hours}</span> : "0"}</TableCell>
                    <TableCell>{r.projects?.name ?? "—"}</TableCell>
                    <TableCell><Badge variant="secondary" className={`border-0 ${statusColors[r.status] || ""}`}>{r.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewItem(r)}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
          </>
        )}
      </CardContent></Card>

      {/* Add Dialog */}
      <Dialog open={open} onOpenChange={setOpen}><DialogContent>
        <DialogHeader><DialogTitle>New Timesheet Entry</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Employee</Label><ComboboxSelect value={form.employee_id} onChange={v => setForm({ ...form, employee_id: v })} options={employeeList.map((e: any) => ({ value: e.id, label: e.name }))} placeholder="Select employee" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Project</Label><ComboboxSelect value={form.project_id} onChange={v => setForm({ ...form, project_id: v })} options={projectList.map((p: any) => ({ value: p.id, label: p.name }))} placeholder="Select project" /></div>
            <div><Label>Site</Label><ComboboxSelect value={form.site_id} onChange={v => setForm({ ...form, site_id: v })} options={siteList.map((s: any) => ({ value: s.id, label: s.name }))} placeholder="Select site" /></div>
          </div>
          <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Start Time</Label><Input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} /></div>
            <div><Label>End Time</Label><Input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Hours Worked</Label><Input type="number" min={0} max={24} value={form.hours_worked} onChange={e => setForm({ ...form, hours_worked: e.target.value })} /></div>
            <div><Label>Overtime Hours</Label><Input type="number" min={0} value={form.overtime_hours} onChange={e => setForm({ ...form, overtime_hours: e.target.value })} /></div>
          </div>
          <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          <Button className="w-full h-9" onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving..." : "Save"}</Button>
        </div>
      </DialogContent></Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}><DialogContent>
        <DialogHeader><DialogTitle>Timesheet Details</DialogTitle></DialogHeader>
        {viewItem && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-muted-foreground">Employee</p><p className="font-medium">{viewItem.employees?.name || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Date</p><p>{viewItem.date ? format(new Date(viewItem.date), "dd MMM yyyy") : "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Hours Worked</p><p>{viewItem.hours_worked}h</p></div>
              <div><p className="text-xs text-muted-foreground">Overtime</p><p>{viewItem.overtime_hours}h</p></div>
              <div><p className="text-xs text-muted-foreground">Project</p><p>{viewItem.projects?.name || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Site</p><p>{viewItem.sites?.name || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Status</p><Badge variant="secondary" className={`border-0 ${statusColors[viewItem.status] || ""}`}>{viewItem.status}</Badge></div>
            </div>
            {viewItem.notes && <div><p className="text-xs text-muted-foreground">Notes</p><p className="text-sm">{viewItem.notes}</p></div>}
          </div>
        )}
      </DialogContent></Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} onConfirm={() => deleteId && remove.mutate(deleteId)} />
    </div>
  );
}
