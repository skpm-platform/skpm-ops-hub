import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, GraduationCap, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { ExportButton } from "@/components/ExportButton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusFilter } from "@/components/StatusFilter";
import { ComboboxSelect } from "@/components/ComboboxSelect";

const statusColors: Record<string, string> = { scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" };

export default function Training() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", type: "safety", date: "", duration: "", trainer: "", venue: "", status: "scheduled" });

  const { data = [], isLoading } = useQuery({
    queryKey: ["training"],
    queryFn: async () => { const { data } = await (supabase as any).from("training_programs").select("*").order("date", { ascending: false }); return data || []; },
  });

  const resetForm = () => setForm({ title: "", type: "safety", date: "", duration: "", trainer: "", venue: "", status: "scheduled" });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { title: form.title, type: form.type, date: form.date || null, duration: form.duration, trainer: form.trainer, venue: form.venue, status: form.status };
      if (editingId) { const { error } = await (supabase as any).from("training_programs").update(payload).eq("id", editingId); if (error) throw error; }
      else { const { error } = await (supabase as any).from("training_programs").insert(payload); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["training"] }); toast.success(editingId ? "Updated" : "Added"); setOpen(false); setEditingId(null); resetForm(); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase as any).from("training_programs").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["training"] }); toast.success("Deleted"); setDeleteId(null); },
  });

  const handleEdit = (r: any) => {
    setEditingId(r.id);
    setForm({ title: r.title, type: r.type || "safety", date: r.date || "", duration: r.duration || "", trainer: r.trainer || "", venue: r.venue || "", status: r.status || "scheduled" });
    setOpen(true);
  };

  const statusCounts = data.reduce((a: Record<string, number>, r: any) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {});

  const filtered = data
    .filter((r: any) => r.title?.toLowerCase().includes(search.toLowerCase()) || r.trainer?.toLowerCase().includes(search.toLowerCase()))
    .filter((r: any) => statusFilter === "all" || r.status === statusFilter);
  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><GraduationCap className="h-7 w-7 text-primary" /><h1 className="text-2xl font-bold">Training</h1></div>
        <div className="flex gap-2">
          <ExportButton data={data} filename="training" />
          <Button onClick={() => { resetForm(); setEditingId(null); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add Training</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Programs</p><p className="text-2xl font-semibold mt-1">{data.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Scheduled</p><p className="text-2xl font-semibold mt-1">{statusCounts.scheduled || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">In Progress</p><p className="text-2xl font-semibold mt-1 text-warning">{statusCounts.in_progress || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Completed</p><p className="text-2xl font-semibold mt-1 text-success">{statusCounts.completed || 0}</p></CardContent></Card>
      </div>

      <StatusFilter statuses={[{value:"all",label:"All",count:data.length},{value:"scheduled",label:"Scheduled",count:statusCounts.scheduled||0},{value:"in_progress",label:"In Progress",count:statusCounts.in_progress||0},{value:"completed",label:"Completed",count:statusCounts.completed||0},{value:"cancelled",label:"Cancelled",count:statusCounts.cancelled||0}]} selected={statusFilter} onSelect={setStatusFilter} />

      <Card><CardContent className="pt-6">
        <div className="mb-4 relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search training..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No training programs</p> : (
          <>
          <Table><TableHeader><TableRow>
            <SortableHeader label="Title" sortKey="title" direction={getSortDirection("title")} onToggle={toggleSort} />
            <SortableHeader label="Type" sortKey="type" direction={getSortDirection("type")} onToggle={toggleSort} />
            <SortableHeader label="Date" sortKey="date" direction={getSortDirection("date")} onToggle={toggleSort} />
            <SortableHeader label="Trainer" sortKey="trainer" direction={getSortDirection("trainer")} onToggle={toggleSort} />
            <SortableHeader label="Venue" sortKey="venue" direction={getSortDirection("venue")} onToggle={toggleSort} />
            <SortableHeader label="Status" sortKey="status" direction={getSortDirection("status")} onToggle={toggleSort} />
            <SortableHeader label="Actions" sortKey="" direction={null} onToggle={() => {}} />
          </TableRow></TableHeader>
            <TableBody>{pageData.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.title}</TableCell>
                <TableCell><Badge variant="outline">{r.type}</Badge></TableCell>
                <TableCell>{r.date || "—"}</TableCell>
                <TableCell>{r.trainer || "—"}</TableCell>
                <TableCell>{r.venue || "—"}</TableCell>
                <TableCell><Badge variant="secondary" className={`border-0 ${statusColors[r.status] || ""}`}>{r.status}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(r)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}</TableBody></Table>
          <DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
          </>
        )}
      </CardContent></Card>

      <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { setEditingId(null); resetForm(); } }}><DialogContent>
        <DialogHeader><DialogTitle>{editingId ? "Edit" : "Add"} Training Program</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
          <div><Label>Type</Label><ComboboxSelect value={form.type} onChange={v => setForm({...form, type: v})} options={["safety","technical","soft_skills","compliance","induction","first_aid"]} placeholder="Select type" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
            <div><Label>Duration</Label><Input value={form.duration} onChange={e => setForm({...form, duration: e.target.value})} placeholder="e.g. 4 hours" /></div>
          </div>
          <div><Label>Trainer</Label><Input value={form.trainer} onChange={e => setForm({...form, trainer: e.target.value})} /></div>
          <div><Label>Venue</Label><Input value={form.venue} onChange={e => setForm({...form, venue: e.target.value})} /></div>
          <Button className="w-full" onClick={() => save.mutate()} disabled={!form.title || save.isPending}>{save.isPending ? "Saving..." : editingId ? "Update" : "Add Training"}</Button>
        </div>
      </DialogContent></Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} onConfirm={() => deleteId && del.mutate(deleteId)} />
    </div>
  );
}
