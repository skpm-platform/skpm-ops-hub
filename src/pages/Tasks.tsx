import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, GripVertical } from "lucide-react";
import { toast } from "sonner";

interface Task {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  assignedTo: string;
  dueDate: string;
}

const initialTasks: Task[] = [
  { id: "1", title: "Fix AC Unit - Floor 3", description: "Replace compressor unit", status: "todo", priority: "high", assignedTo: "Ahmad", dueDate: "2026-03-15" },
  { id: "2", title: "Monthly safety inspection", description: "Complete checklist", status: "todo", priority: "medium", assignedTo: "Budi", dueDate: "2026-03-20" },
  { id: "3", title: "Install new lighting", description: "LED replacement - lobby", status: "in_progress", priority: "medium", assignedTo: "Siti", dueDate: "2026-03-12" },
  { id: "4", title: "Generator maintenance", description: "Quarterly service", status: "in_progress", priority: "high", assignedTo: "Ahmad", dueDate: "2026-03-10" },
  { id: "5", title: "Paint exterior walls", description: "Section B completed", status: "done", priority: "low", assignedTo: "Dewi", dueDate: "2026-03-05" },
];

const columns: { key: Task["status"]; label: string; color: string }[] = [
  { key: "todo", label: "To Do", color: "bg-muted-foreground" },
  { key: "in_progress", label: "In Progress", color: "bg-warning" },
  { key: "done", label: "Done", color: "bg-success" },
];

const priorityColor: Record<string, string> = {
  high: "bg-destructive/15 text-destructive",
  medium: "bg-warning/15 text-warning",
  low: "bg-info/15 text-info",
};

export default function Tasks() {
  const [tasks, setTasks] = useState(initialTasks);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", status: "todo" as Task["status"], priority: "medium" as Task["priority"], assignedTo: "", dueDate: "" });

  const handleAdd = () => {
    if (!form.title) { toast.error("Title required"); return; }
    setTasks([...tasks, { ...form, id: Date.now().toString() }]);
    setDialogOpen(false);
    setForm({ title: "", description: "", status: "todo", priority: "medium", assignedTo: "", dueDate: "" });
    toast.success("Task added");
  };

  const moveTask = (id: string, newStatus: Task["status"]) => {
    setTasks(tasks.map((t) => (t.id === id ? { ...t, status: newStatus } : t)));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-muted-foreground">Manage work with Kanban board</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-1 h-4 w-4" /> New Task</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Task</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={(v: Task["priority"]) => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Assigned To</Label><Input value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>Due Date</Label><Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
              <Button onClick={handleAdd} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {columns.map((col) => (
          <Card key={col.key}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${col.color}`} />
                  <CardTitle className="text-sm font-medium">{col.label}</CardTitle>
                </div>
                <Badge variant="secondary" className="text-xs">{tasks.filter((t) => t.status === col.key).length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {tasks
                .filter((t) => t.status === col.key)
                .map((task) => (
                  <div key={task.id} className="rounded-lg border bg-card p-3 space-y-2 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between">
                      <h4 className="text-sm font-medium leading-tight">{task.title}</h4>
                      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                    {task.description && <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>}
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className={`border-0 text-[10px] ${priorityColor[task.priority]}`}>{task.priority}</Badge>
                      {task.assignedTo && <span className="text-[10px] text-muted-foreground">{task.assignedTo}</span>}
                    </div>
                    {col.key !== "done" && (
                      <div className="flex gap-1 pt-1">
                        {col.key === "todo" && (
                          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => moveTask(task.id, "in_progress")}>→ In Progress</Button>
                        )}
                        {col.key === "in_progress" && (
                          <>
                            <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => moveTask(task.id, "todo")}>← To Do</Button>
                            <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => moveTask(task.id, "done")}>→ Done</Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
