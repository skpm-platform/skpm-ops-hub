import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logAudit } from "@/lib/audit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ComboboxSelect } from "@/components/ComboboxSelect";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ExportButton } from "@/components/ExportButton";
import { Plus, Loader2, Trash2, Eye, CheckSquare, ListTodo, RotateCcw, CheckCircle2, Search } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type TaskStatus = "todo" | "in_progress" | "review" | "done";
type TaskPriority = "low" | "medium" | "high";

const columns: { key: TaskStatus; label: string; color: string; icon: any }[] = [
  { key: "todo", label: "To Do", color: "bg-muted-foreground", icon: ListTodo },
  { key: "in_progress", label: "In Progress", color: "bg-warning", icon: RotateCcw },
  { key: "review", label: "Review", color: "bg-info", icon: CheckSquare },
  { key: "done", label: "Done", color: "bg-success", icon: CheckCircle2 },
];

const priorityColor: Record<string, string> = { high: "bg-destructive/15 text-destructive", medium: "bg-warning/15 text-warning", low: "bg-info/15 text-info" };
const nextStatus: Record<TaskStatus, TaskStatus | null> = { todo: "in_progress", in_progress: "review", review: "done", done: null };
const prevStatus: Record<TaskStatus, TaskStatus | null> = { todo: null, in_progress: "todo", review: "in_progress", done: "review" };

export default function Tasks() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewItem, setViewItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ title: "", description: "", priority: "medium" as TaskPriority, dueDate: "", estimated_hours: "" });
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => { const { data, error } = await supabase.from("tasks").select("*").order("created_at", { ascending: false }); if (error) throw error; return data ?? []; },
  });

  const addTask = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not logged in");
      const { error } = await supabase.from("tasks").insert({ title: form.title, description: form.description, priority: form.priority, due_date: form.dueDate || null, estimated_hours: form.estimated_hours ? Number(form.estimated_hours) : null, status: "todo", created_by: user.id, assigned_to: user.id });
      if (error) throw error;
      await logAudit("Created task", form.title);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); setDialogOpen(false); setForm({ title: "", description: "", priority: "medium", dueDate: "", estimated_hours: "" }); toast.success("Task created"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const moveTask = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskStatus }) => { const { error } = await supabase.from("tasks").update({ status }).eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("tasks").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); toast.success("Deleted"); setDeleteId(null); setViewItem(null); },
  });

  const handleDrop = (targetStatus: TaskStatus) => { if (draggedId) { moveTask.mutate({ id: draggedId, status: targetStatus }); setDraggedId(null); } };

  const filteredTasks = tasks.filter(t => t.title.toLowerCase().includes(search.toLowerCase()) || (t.description || "").toLowerCase().includes(search.toLowerCase()));
  const totalEstimated = tasks.reduce((s, t) => s + Number(t.estimated_hours || 0), 0);
  const totalActual = tasks.reduce((s, t) => s + Number(t.actual_hours || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold">Tasks</h1><p className="text-muted-foreground">Kanban board with drag & drop</p></div>
        <div className="flex gap-2">
          <ExportButton data={tasks} filename="tasks" columns={[{ key: "title", label: "Title" }, { key: "status", label: "Status" }, { key: "priority", label: "Priority" }, { key: "due_date", label: "Due Date" }]} />
          <Button size="sm" className="h-9" onClick={() => setDialogOpen(true)}><Plus className="mr-1 h-4 w-4" />New Task</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {columns.map(col => (
          <Card key={col.key}><CardContent className="p-4 flex items-center justify-between">
            <div><p className="text-xs text-muted-foreground uppercase tracking-wider">{col.label}</p><p className="text-2xl font-semibold mt-1">{filteredTasks.filter(t => t.status === col.key).length}</p></div>
            <div className={`h-3 w-3 rounded-full ${col.color}`} />
          </CardContent></Card>
        ))}
      </div>

      <div className="relative max-w-sm"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>

      {isLoading ? <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {columns.map(col => (
            <Card key={col.key} onDragOver={e => e.preventDefault()} onDrop={() => handleDrop(col.key)} className="min-h-[200px]">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><div className={`h-2.5 w-2.5 rounded-full ${col.color}`} /><CardTitle className="text-sm font-medium">{col.label}</CardTitle></div>
                  <Badge variant="secondary" className="text-xs">{filteredTasks.filter(t => t.status === col.key).length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {filteredTasks.filter(t => t.status === col.key).map(task => (
                  <div key={task.id} draggable onDragStart={() => setDraggedId(task.id)} className="rounded-lg border bg-card p-3 space-y-2 hover:shadow-sm transition-shadow cursor-grab active:cursor-grabbing">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-medium leading-tight flex-1">{task.title}</h4>
                      <div className="flex gap-0.5 shrink-0">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setViewItem(task)}><Eye className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDeleteId(task.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                      </div>
                    </div>
                    {task.description && <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>}
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className={`border-0 text-[10px] ${priorityColor[task.priority ?? "medium"]}`}>{task.priority}</Badge>
                      {task.due_date && <span className="text-[10px] text-muted-foreground">{format(new Date(task.due_date), "dd MMM")}</span>}
                    </div>
                    <div className="flex gap-1 pt-1">
                      {prevStatus[col.key] && <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => moveTask.mutate({ id: task.id, status: prevStatus[col.key]! })}>← {columns.find(c => c.key === prevStatus[col.key])?.label}</Button>}
                      {nextStatus[col.key] && <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => moveTask.mutate({ id: task.id, status: nextStatus[col.key]! })}>{columns.find(c => c.key === nextStatus[col.key])?.label} →</Button>}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent>
        <DialogHeader><DialogTitle>Create Task</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Priority</Label><ComboboxSelect value={form.priority} onValueChange={v => setForm({ ...form, priority: v as TaskPriority })} options={["low", "medium", "high"]} allowCustom={false} /></div>
            <div><Label>Due Date</Label><Input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} /></div>
            <div><Label>Est. Hours</Label><Input type="number" value={form.estimated_hours} onChange={e => setForm({ ...form, estimated_hours: e.target.value })} /></div>
          </div>
          <Button onClick={() => addTask.mutate()} className="w-full h-9" disabled={!form.title || addTask.isPending}>{addTask.isPending && <Loader2 className="animate-spin mr-2 h-4 w-4" />}Create</Button>
        </div>
      </DialogContent></Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}><DialogContent>
        <DialogHeader><DialogTitle>{viewItem?.title}</DialogTitle></DialogHeader>
        {viewItem && (
          <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              <Badge variant="secondary" className={`border-0 ${priorityColor[viewItem.priority || "medium"]}`}>{viewItem.priority}</Badge>
              <Badge variant="outline">{viewItem.status?.replace(/_/g, " ")}</Badge>
            </div>
            {viewItem.description && <p className="text-sm text-muted-foreground">{viewItem.description}</p>}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {viewItem.due_date && <div><p className="text-xs text-muted-foreground">Due Date</p><p>{format(new Date(viewItem.due_date), "dd MMM yyyy")}</p></div>}
              {viewItem.estimated_hours > 0 && <div><p className="text-xs text-muted-foreground">Est. Hours</p><p>{viewItem.estimated_hours}h</p></div>}
              {viewItem.actual_hours > 0 && <div><p className="text-xs text-muted-foreground">Actual Hours</p><p>{viewItem.actual_hours}h</p></div>}
              <div><p className="text-xs text-muted-foreground">Created</p><p>{format(new Date(viewItem.created_at), "dd MMM yyyy")}</p></div>
            </div>
          </div>
        )}
      </DialogContent></Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} onConfirm={() => deleteId && remove.mutate(deleteId)} title="Delete Task?" />
    </div>
  );
}
