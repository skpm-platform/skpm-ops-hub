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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, GraduationCap, Download } from "lucide-react";
import { toast } from "sonner";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";

const statusColors: Record<string, string> = {
  scheduled: "bg-info/15 text-info",
  in_progress: "bg-warning/15 text-warning",
  completed: "bg-success/15 text-success",
  cancelled: "bg-destructive/15 text-destructive",
};

export default function Training() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", type: "safety", date: "", duration: "", trainer: "", venue: "" });

  const { data = [], isLoading } = useQuery({
    queryKey: ["training"],
    queryFn: async () => { const { data } = await (supabase as any).from("training_programs").select("*").order("date", { ascending: false }); return data || []; },
  });

  const save = useMutation({
    mutationFn: async () => { const { error } = await (supabase as any).from("training_programs").insert(form); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["training"] }); toast.success("Training added"); setOpen(false); setForm({ title: "", type: "safety", date: "", duration: "", trainer: "", venue: "" }); },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = data
    .filter((r: any) => r.title?.toLowerCase().includes(search.toLowerCase()))
    .filter((r: any) => statusFilter === "all" || r.status === statusFilter);

  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

  const exportCSV = () => {
    if (!data.length) return;
    const header = "Title,Type,Date,Trainer,Venue,Status\n";
    const rows = data.map((r: any) => `"${r.title}","${r.type}","${r.date ?? ""}","${r.trainer ?? ""}","${r.venue ?? ""}","${r.status}"`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "training.csv"; a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><GraduationCap className="h-7 w-7 text-primary" /><h1 className="text-2xl font-bold">Training</h1></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-4 w-4 mr-1" />Export</Button>
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Training</Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Total Programs", value: data.length },
          { label: "Scheduled", value: data.filter((r: any) => r.status === "scheduled").length },
          { label: "In Progress", value: data.filter((r: any) => r.status === "in_progress").length },
          { label: "Completed", value: data.filter((r: any) => r.status === "completed").length },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p><p className="text-2xl font-semibold mt-1">{s.value}</p></CardContent></Card>
        ))}
      </div>

      <Card><CardContent className="pt-6">
        <div className="mb-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search training..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
          <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="scheduled">Scheduled</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select>
        </div>
        {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No training programs</p> : (
          <>
          <Table><TableHeader><TableRow>
            <SortableHeader label="Title" sortKey="title" direction={getSortDirection("title")} onToggle={toggleSort} />
            <SortableHeader label="Type" sortKey="type" direction={getSortDirection("type")} onToggle={toggleSort} />
            <SortableHeader label="Date" sortKey="date" direction={getSortDirection("date")} onToggle={toggleSort} />
            <SortableHeader label="Trainer" sortKey="trainer" direction={getSortDirection("trainer")} onToggle={toggleSort} />
            <SortableHeader label="Venue" sortKey="venue" direction={getSortDirection("venue")} onToggle={toggleSort} />
            <SortableHeader label="Status" sortKey="status" direction={getSortDirection("status")} onToggle={toggleSort} />
          </TableRow></TableHeader>
            <TableBody>{pageData.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.title}</TableCell>
                <TableCell><Badge variant="outline">{r.type}</Badge></TableCell>
                <TableCell>{r.date}</TableCell>
                <TableCell>{r.trainer || "—"}</TableCell>
                <TableCell>{r.venue || "—"}</TableCell>
                <TableCell><Badge variant="secondary" className={`border-0 ${statusColors[r.status] || ""}`}>{r.status}</Badge></TableCell>
              </TableRow>
            ))}</TableBody></Table>
          <DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
          </>
        )}
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}><DialogContent>
        <DialogHeader><DialogTitle>Add Training Program</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
          <div><Label>Type</Label><Select value={form.type} onValueChange={v => setForm({...form, type: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="safety">Safety</SelectItem><SelectItem value="technical">Technical</SelectItem><SelectItem value="soft_skills">Soft Skills</SelectItem><SelectItem value="compliance">Compliance</SelectItem></SelectContent></Select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
            <div><Label>Duration</Label><Input value={form.duration} onChange={e => setForm({...form, duration: e.target.value})} placeholder="e.g. 4 hours" /></div>
          </div>
          <div><Label>Trainer</Label><Input value={form.trainer} onChange={e => setForm({...form, trainer: e.target.value})} /></div>
          <div><Label>Venue</Label><Input value={form.venue} onChange={e => setForm({...form, venue: e.target.value})} /></div>
          <Button className="w-full" onClick={() => save.mutate()} disabled={!form.title || save.isPending}>{save.isPending ? "Saving..." : "Add Training"}</Button>
        </div>
      </DialogContent></Dialog>
    </div>
  );
}
