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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, FolderKanban, Pencil, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { ComboboxSelect } from "@/components/ComboboxSelect";
import { StatusFilter } from "@/components/StatusFilter";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ExportButton } from "@/components/ExportButton";

const statusColors: Record<string, string> = { active: "bg-emerald-100 text-emerald-700", completed: "bg-blue-100 text-blue-700", on_hold: "bg-amber-100 text-amber-700", cancelled: "bg-red-100 text-red-700" };
const emptyForm = { name: "", description: "", status: "active", priority: "medium", budget: "", start_date: "", end_date: "", client_id: "" };

export default function Projects() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => { const { data } = await supabase.from("projects").select("*, clients(name)").order("created_at", { ascending: false }); return data || []; },
  });
  const { data: clients = [] } = useQuery({
    queryKey: ["clients-list"],
    queryFn: async () => { const { data } = await supabase.from("clients").select("id, name"); return data || []; },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, budget: parseFloat(form.budget) || 0, client_id: form.client_id || null };
      if (editingId) {
        const { error } = await supabase.from("projects").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("projects").insert({ ...payload, project_no: `PRJ-${Date.now().toString().slice(-6)}`, created_by: user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["projects"] }); toast.success(editingId ? "Project updated" : "Project created"); setOpen(false); setEditingId(null); setForm(emptyForm); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("projects").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["projects"] }); toast.success("Project deleted"); setDeleteId(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const handleEdit = (p: any) => {
    setEditingId(p.id);
    setForm({ name: p.name||"", description: p.description||"", status: p.status||"active", priority: p.priority||"medium", budget: String(p.budget||""), start_date: p.start_date||"", end_date: p.end_date||"", client_id: p.client_id||"" });
    setOpen(true);
  };

  const filtered = projects.filter((p: any) => {
    const matchSearch = p.name?.toLowerCase().includes(search.toLowerCase()) || p.project_no?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statuses = [
    { value: "all", label: "All", count: projects.length },
    { value: "active", label: "Active", count: projects.filter((p: any) => p.status === "active").length },
    { value: "on_hold", label: "On Hold", count: projects.filter((p: any) => p.status === "on_hold").length },
    { value: "completed", label: "Completed", count: projects.filter((p: any) => p.status === "completed").length },
  ];

  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);
  const totalBudget = projects.reduce((s: number, p: any) => s + (p.budget || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3"><FolderKanban className="h-7 w-7 text-primary" /><div><h1 className="text-2xl font-bold">Projects</h1><p className="text-sm text-muted-foreground">{projects.length} projects</p></div></div>
        <div className="flex gap-2">
          <ExportButton data={filtered} filename="projects" columns={[{key:"project_no",label:"No"},{key:"name",label:"Name"},{key:"status",label:"Status"},{key:"priority",label:"Priority"},{key:"budget",label:"Budget"}]} />
          <Button onClick={() => { setEditingId(null); setForm(emptyForm); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />New Project</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Projects</p><p className="text-2xl font-bold">{projects.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Active</p><p className="text-2xl font-bold text-success">{projects.filter((p:any)=>p.status==="active").length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Budget</p><p className="text-2xl font-bold">AED {totalBudget.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">High Priority</p><p className="text-2xl font-bold text-destructive">{projects.filter((p:any)=>p.priority==="high").length}</p></CardContent></Card>
      </div>

      <Card><CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
          <StatusFilter statuses={statuses} selected={statusFilter} onSelect={setStatusFilter} />
        </div>
        {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No projects found</p> : (
          <>
          <div className="overflow-x-auto">
          <Table><TableHeader><TableRow>
            <SortableHeader label="Project" sortKey="name" direction={getSortDirection("name")} onToggle={toggleSort} />
            <SortableHeader label="Client" sortKey="clients.name" direction={getSortDirection("clients.name")} onToggle={toggleSort} />
            <SortableHeader label="Status" sortKey="status" direction={getSortDirection("status")} onToggle={toggleSort} />
            <SortableHeader label="Priority" sortKey="priority" direction={getSortDirection("priority")} onToggle={toggleSort} />
            <SortableHeader label="Budget" sortKey="budget" direction={getSortDirection("budget")} onToggle={toggleSort} />
            <SortableHeader label="Actions" sortKey="" direction={null} onToggle={() => {}} />
          </TableRow></TableHeader>
            <TableBody>{pageData.map((p: any) => {
              const budgetPct = p.budget > 0 ? Math.min(100, Math.round(((p.spent || 0) / p.budget) * 100)) : 0;
              const budgetWarning = budgetPct >= 80;
              return (
              <TableRow key={p.id}>
                <TableCell><span className="font-medium">{p.name}</span><br/><span className="text-xs text-muted-foreground">{p.project_no}</span></TableCell>
                <TableCell>{p.clients?.name || "—"}</TableCell>
                <TableCell><Badge className={statusColors[p.status] || ""}>{p.status}</Badge></TableCell>
                <TableCell><Badge variant={p.priority === "high" ? "destructive" : "secondary"}>{p.priority}</Badge></TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <span className="text-xs">AED {p.budget?.toLocaleString()}</span>
                    {p.budget > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 bg-secondary rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${budgetWarning ? "bg-destructive" : "bg-success"}`} style={{ width: `${budgetPct}%` }} />
                        </div>
                        <span className={`text-[10px] font-medium ${budgetWarning ? "text-destructive" : "text-muted-foreground"}`}>{budgetPct}%</span>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setViewing(p); setViewOpen(true); }}><Eye className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(p.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            );})}</TableBody></Table>
          </div>
          <DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
          </>
        )}
      </CardContent></Card>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditingId(null); setForm(emptyForm); } }}><DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editingId ? "Edit Project" : "New Project"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
          <div><Label>Client</Label>
            <ComboboxSelect value={form.client_id} onValueChange={v => setForm({...form, client_id: v})} options={clients.map((c:any) => ({value:c.id, label:c.name}))} placeholder="Select client..." allowCustom={false} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Status</Label><Select value={form.status} onValueChange={v => setForm({...form, status: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="on_hold">On Hold</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select></div>
            <div><Label>Priority</Label><Select value={form.priority} onValueChange={v => setForm({...form, priority: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent></Select></div>
          </div>
          <div><Label>Budget (AED)</Label><Input type="number" value={form.budget} onChange={e => setForm({...form, budget: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Start</Label><Input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} /></div>
            <div><Label>End</Label><Input type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} /></div>
          </div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
          <Button className="w-full" onClick={() => save.mutate()} disabled={!form.name || save.isPending}>{save.isPending ? "Saving..." : editingId ? "Update Project" : "Create Project"}</Button>
        </div>
      </DialogContent></Dialog>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}><DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Project Details</DialogTitle></DialogHeader>
        {viewing && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              {[["Project No", viewing.project_no],["Name", viewing.name],["Client", viewing.clients?.name],["Status", viewing.status],["Priority", viewing.priority],["Budget", `AED ${viewing.budget?.toLocaleString()}`],["Start", viewing.start_date],["End", viewing.end_date]].map(([l,v])=>(
                <div key={l as string}><p className="text-muted-foreground text-xs">{l}</p><p className="font-medium">{v||"—"}</p></div>
              ))}
            </div>
            {viewing.description && <div><p className="text-muted-foreground text-xs">Description</p><p>{viewing.description}</p></div>}
          </div>
        )}
      </DialogContent></Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete Project?" description="This will permanently remove this project." onConfirm={() => deleteId && remove.mutate(deleteId)} />
    </div>
  );
}
