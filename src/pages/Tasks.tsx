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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

type TaskStatus = "todo" | "in_progress" | "review" | "done";
type TaskPriority = "low" | "medium" | "high";

const columns: { key: TaskStatus; label: string; color: string }[] = [
  { key: "todo", label: "To Do", color: "bg-muted-foreground" },
  { key: "in_progress", label: "In Progress", color: "bg-warning" },
  { key: "review", label: "Review", color: "bg-info" },
  { key: "done", label: "Done", color: "bg-success" },
];

const priorityColor: Record<string, string> = {
  high: "bg-destructive/15 text-destructive",
  medium: "bg-warning/15 text-warning",
  low: "bg-info/15 text-info",
};

const nextStatus: Record<TaskStatus, TaskStatus | null> = {
  todo: "in_progress",
  in_progress: "review",
  review: "done",
  done: null,
};
const prevStatus: Record<TaskStatus, TaskStatus | null> = {
  todo: null,
  in_progress: "todo",
  review: "in_progress",
  done: "review",
};

export default function Tasks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", priority: "medium" as TaskPriority, dueDate: "" });
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addTask = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not logged in");
      const { error } = await supabase.from("tasks").insert({
        title: form.title,
        description: form.description,
        priority: form.priority,
        due_date: form.dueDate || null,
        status: "todo",
        created_by: user.id,
        assigned_to: user.id,
      });
      if (error) throw error;
      await logAudit("Created task", form.title);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setDialogOpen(false);
      setForm({ title: "", description: "", priority: "medium", dueDate: "" });
      toast.success("Task created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const moveTask = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskStatus }) => {
      const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const handleDrop = (targetStatus: TaskStatus) => {
    if (draggedId) {
      moveTask.mutate({ id: draggedId, status: targetStatus });
      setDraggedId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-muted-foreground">Manage work with Kanban board</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" /> New Task</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Task</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={(v: TaskPriority) => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Due Date</Label><Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
              </div>
              <Button onClick={() => addTask.mutate()} className="w-full" disabled={!form.title || addTask.isPending}>
                {addTask.isPending && <Loader2 className="animate-spin mr-2 h-4 w-4" />} Create
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {columns.map((col) => (
            <Card
              key={col.key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(col.key)}
              className="min-h-[200px]"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${col.color}`} />
                    <CardTitle className="text-sm font-medium">{col.label}</CardTitle>
                  </div>
                  <Badge variant="secondary" className="text-xs">{(tasks ?? []).filter((t) => t.status === col.key).length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {(tasks ?? [])
                  .filter((t) => t.status === col.key)
                  .map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => setDraggedId(task.id)}
                      className="rounded-lg border bg-card p-3 space-y-2 hover:shadow-sm transition-shadow cursor-grab active:cursor-grabbing"
                    >
                      <h4 className="text-sm font-medium leading-tight">{task.title}</h4>
                      {task.description && <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>}
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className={`border-0 text-[10px] ${priorityColor[task.priority ?? "medium"]}`}>{task.priority}</Badge>
                        {task.due_date && <span className="text-[10px] text-muted-foreground">{task.due_date}</span>}
                      </div>
                      <div className="flex gap-1 pt-1">
                        {prevStatus[col.key] && (
                          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => moveTask.mutate({ id: task.id, status: prevStatus[col.key]! })}>
                            ← {columns.find(c => c.key === prevStatus[col.key])?.label}
                          </Button>
                        )}
                        {nextStatus[col.key] && (
                          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => moveTask.mutate({ id: task.id, status: nextStatus[col.key]! })}>
                            {columns.find(c => c.key === nextStatus[col.key])?.label} →
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
