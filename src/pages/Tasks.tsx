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
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ComboboxSelect } from "@/components/ComboboxSelect";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ExportButton } from "@/components/ExportButton";
import {
  Plus, Loader2, Trash2, Eye, CheckSquare, ListTodo, RotateCcw,
  CheckCircle2, Search, Clock, AlertTriangle, Calendar, Pencil,
  Timer, ArrowRight, ArrowLeft, GripVertical, User,
} from "lucide-react";
import { toast } from "sonner";
import { format, isPast, differenceInDays, isToday, isTomorrow } from "date-fns";

type TaskStatus = "todo" | "in_progress" | "review" | "done";
type TaskPriority = "low" | "medium" | "high";

const columns: { key: TaskStatus; label: string; color: string; bgColor: string; icon: any }[] = [
  { key: "todo", label: "To Do", color: "bg-muted-foreground", bgColor: "bg-muted-foreground/5", icon: ListTodo },
  { key: "in_progress", label: "In Progress", color: "bg-warning", bgColor: "bg-warning/5", icon: RotateCcw },
  { key: "review", label: "Review", color: "bg-info", bgColor: "bg-info/5", icon: CheckSquare },
  { key: "done", label: "Done", color: "bg-success", bgColor: "bg-success/5", icon: CheckCircle2 },
];

const priorityConfig: Record<string, { color: string; dot: string; label: string }> = {
  high: { color: "bg-destructive/15 text-destructive", dot: "bg-destructive", label: "High" },
  medium: { color: "bg-warning/15 text-warning", dot: "bg-warning", label: "Medium" },
  low: { color: "bg-info/15 text-info", dot: "bg-info", label: "Low" },
};

const nextStatus: Record<TaskStatus, TaskStatus | null> = { todo: "in_progress", in_progress: "review", review: "done", done: null };
const prevStatus: Record<TaskStatus, TaskStatus | null> = { todo: null, in_progress: "todo", review: "in_progress", done: "review" };

function getDueDateInfo(dueDate: string | null) {
  if (!dueDate) return null;
  const date = new Date(dueDate);
  if (isToday(date)) return { label: "Due today", className: "text-warning font-medium", icon: Clock };
  if (isTomorrow(date)) return { label: "Due tomorrow", className: "text-info", icon: Calendar };
  if (isPast(date)) {
    const days = differenceInDays(new Date(), date);
    return { label: `${days}d overdue`, className: "text-destructive font-medium", icon: AlertTriangle };
  }
  const days = differenceInDays(date, new Date());
  if (days <= 3) return { label: `${days}d left`, className: "text-warning", icon: Clock };
  return { label: format(date, "dd MMM"), className: "text-muted-foreground", icon: Calendar };
}

export default function Tasks() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [viewItem, setViewItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"all" | TaskPriority>("all");
  const [myTasksOnly, setMyTasksOnly] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", priority: "medium" as TaskPriority, dueDate: "", estimated_hours: "", assigned_to: "", progress: "" });
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => { const { data, error } = await supabase.from("tasks").select("*").order("created_at", { ascending: false }); if (error) throw error; return data ?? []; },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-list-tasks"],
    queryFn: async () => { const { data } = await (supabase as any).from("employees").select("id, name").order("name"); return data || []; },
  });

  const employeeOptions = employees.map((e: any) => ({ value: e.id, label: e.name }));

  const addTask = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not logged in");
      const payload: any = {
        title: form.title, description: form.description, priority: form.priority,
        due_date: form.dueDate || null, estimated_hours: form.estimated_hours ? Number(form.estimated_hours) : null,
        assigned_to: form.assigned_to || user.id,
        progress: form.progress ? Number(form.progress) : 0,
        status: editingTask ? editingTask.status : "todo", created_by: user.id,
      };
      if (editingTask) {
        const { error } = await supabase.from("tasks").update(payload).eq("id", editingTask.id);
        if (error) throw error;
        await logAudit("Updated task", form.title, "tasks");
      } else {
        const { error } = await supabase.from("tasks").insert(payload);
        if (error) throw error;
        await logAudit("Created task", form.title, "tasks");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      setDialogOpen(false);
      setEditingTask(null);
      setForm({ title: "", description: "", priority: "medium", dueDate: "", estimated_hours: "", assigned_to: "", progress: "" });
      toast.success(editingTask ? "Task updated" : "Task created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const moveTask = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskStatus }) => {
      const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
      if (error) throw error;
      const task = tasks.find(t => t.id === id);
      await logAudit("Moved task", `${task?.title} → ${status}`, "tasks");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const task = tasks.find(t => t.id === id);
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
      await logAudit("Deleted task", task?.title, "tasks");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); toast.success("Deleted"); setDeleteId(null); setViewItem(null); },
  });

  const handleDrop = (targetStatus: TaskStatus) => {
    if (draggedId) { moveTask.mutate({ id: draggedId, status: targetStatus }); setDraggedId(null); }
    setDragOverCol(null);
  };

  const handleEditTask = (task: any) => {
    setEditingTask(task);
    setForm({ title: task.title, description: task.description || "", priority: task.priority || "medium", dueDate: task.due_date || "", estimated_hours: task.estimated_hours ? String(task.estimated_hours) : "", assigned_to: task.assigned_to || "", progress: task.progress != null ? String(task.progress) : "" });
    setDialogOpen(true);
  };

  const filteredTasks = tasks.filter(t => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase()) || (t.description || "").toLowerCase().includes(search.toLowerCase());
    const matchPriority = priorityFilter === "all" || t.priority === priorityFilter;
    const matchMyTasks = !myTasksOnly || t.assigned_to === user?.id;
    return matchSearch && matchPriority && matchMyTasks;
  });

  const totalEstimated = tasks.reduce((s, t) => s + Number(t.estimated_hours || 0), 0);
  const totalActual = tasks.reduce((s, t) => s + Number(t.actual_hours || 0), 0);
  const completedTasks = tasks.filter(t => t.status === "done").length;
  const completionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const overdueTasks = tasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && t.status !== "done").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <CheckSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Tasks</h1>
            <p className="text-sm text-muted-foreground">Drag & drop kanban board • {tasks.length} tasks</p>
          </div>
        </div>
        <div className="flex gap-2">
          <ExportButton data={tasks} filename="tasks" columns={[{ key: "title", label: "Title" }, { key: "status", label: "Status" }, { key: "priority", label: "Priority" }, { key: "due_date", label: "Due Date" }]} />
          <Button size="sm" className="h-9 gap-2" onClick={() => { setEditingTask(null); setForm({ title: "", description: "", priority: "medium", dueDate: "", estimated_hours: "", assigned_to: "", progress: "" }); setDialogOpen(true); }}>
            <Plus className="h-4 w-4" />New Task
          </Button>
        </div>
      </div>

      {/* Enhanced KPI Row */}
      <div className="grid gap-3 sm:grid-cols-5">
        {columns.map(col => {
          const count = filteredTasks.filter(t => t.status === col.key).length;
          return (
            <Card key={col.key} className="group hover:shadow-md transition-all border hover:border-primary/20">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{col.label}</p>
                  <p className="text-2xl font-bold mt-1">{count}</p>
                </div>
                <div className={`h-9 w-9 rounded-lg ${col.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <col.icon className="h-4 w-4" style={{ color: `hsl(var(--${col.key === "todo" ? "muted-foreground" : col.key === "in_progress" ? "warning" : col.key === "review" ? "info" : "success"}))` }} />
                </div>
              </CardContent>
            </Card>
          );
        })}
        <Card className="group hover:shadow-md transition-all border hover:border-primary/20">
          <CardContent className="p-4">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Completion</p>
            <p className="text-2xl font-bold mt-1">{completionRate}%</p>
            <Progress value={completionRate} className="h-1.5 mt-2" />
            {overdueTasks > 0 && (
              <p className="text-[10px] text-destructive mt-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />{overdueTasks} overdue
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        {/* Priority filter */}
        <div className="flex gap-1.5 flex-wrap">
          {(["all", "high", "medium", "low"] as const).map(p => (
            <Button
              key={p}
              size="sm"
              variant={priorityFilter === p ? "default" : "outline"}
              className="h-9 capitalize"
              onClick={() => setPriorityFilter(p)}
            >
              {p === "all" ? "All Priority" : p}
            </Button>
          ))}
          {user && (
            <Button
              size="sm"
              variant={myTasksOnly ? "default" : "outline"}
              className="h-9 gap-1.5"
              onClick={() => setMyTasksOnly(!myTasksOnly)}
            >
              <User className="h-3.5 w-3.5" />My Tasks
            </Button>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {columns.map(col => {
            const colTasks = filteredTasks.filter(t => t.status === col.key);
            const isDragOver = dragOverCol === col.key;
            return (
              <div
                key={col.key}
                onDragOver={e => { e.preventDefault(); setDragOverCol(col.key); }}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={() => handleDrop(col.key)}
                className={`rounded-xl border-2 border-dashed transition-all min-h-[250px] ${isDragOver ? "border-primary/50 bg-primary/5 scale-[1.01]" : "border-transparent"}`}
              >
                <Card className="h-full border shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`h-3 w-3 rounded-full ${col.color}`} />
                        <CardTitle className="text-sm font-semibold">{col.label}</CardTitle>
                      </div>
                      <Badge variant="secondary" className="text-xs font-semibold">{colTasks.length}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 pb-4">
                    {colTasks.length === 0 && (
                      <div className="flex flex-col items-center py-8 gap-2 text-muted-foreground/40">
                        <col.icon className="h-8 w-8" />
                        <p className="text-xs">No tasks</p>
                      </div>
                    )}
                    {colTasks.map(task => {
                      const dueDateInfo = getDueDateInfo(task.due_date);
                      const pConfig = priorityConfig[task.priority ?? "medium"];
                      const hoursProgress = task.estimated_hours && task.actual_hours ? Math.min(100, Math.round((task.actual_hours / task.estimated_hours) * 100)) : null;
                      const taskProgress = (task as any).progress != null ? Number((task as any).progress) : null;
                      const assigneeName = employees.find((e: any) => e.id === task.assigned_to)?.name;
                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={() => setDraggedId(task.id)}
                          onDragEnd={() => { setDraggedId(null); setDragOverCol(null); }}
                          className={`group rounded-lg border bg-card p-3 space-y-2.5 hover:shadow-md transition-all cursor-grab active:cursor-grabbing ${draggedId === task.id ? "opacity-50 scale-95" : ""}`}
                        >
                          {/* Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 min-w-0">
                              <GripVertical className="h-4 w-4 text-muted-foreground/30 mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                              <h4 className="text-sm font-medium leading-tight flex-1">{task.title}</h4>
                            </div>
                            <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setViewItem(task)}><Eye className="h-3 w-3" /></Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEditTask(task)}><Pencil className="h-3 w-3" /></Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDeleteId(task.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                            </div>
                          </div>

                          {/* Description */}
                          {task.description && <p className="text-xs text-muted-foreground line-clamp-2 pl-6">{task.description}</p>}

                          {/* Completion progress bar */}
                          {taskProgress !== null && taskProgress > 0 && (
                            <div className="pl-6 space-y-1">
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="text-muted-foreground">Progress</span>
                                <span className="font-medium">{taskProgress}%</span>
                              </div>
                              <Progress value={taskProgress} className="h-1.5" />
                            </div>
                          )}

                          {/* Time tracking progress */}
                          {hoursProgress !== null && (
                            <div className="pl-6 space-y-1">
                              <div className="flex items-center gap-2 text-[10px]">
                                <Timer className="h-3 w-3 text-muted-foreground" />
                                <span className="text-muted-foreground">{task.actual_hours}h / {task.estimated_hours}h</span>
                              </div>
                              <Progress value={hoursProgress} className="h-1" />
                            </div>
                          )}

                          {/* Assignee */}
                          {assigneeName && (
                            <div className="pl-6 flex items-center gap-1 text-[10px] text-muted-foreground">
                              <User className="h-3 w-3" />{assigneeName}
                            </div>
                          )}

                          {/* Footer */}
                          <div className="flex items-center justify-between pl-6">
                            <div className="flex items-center gap-1.5">
                              <div className={`h-1.5 w-1.5 rounded-full ${pConfig.dot}`} />
                              <span className={`text-[10px] font-medium ${pConfig.color.split(" ")[1]}`}>{pConfig.label}</span>
                            </div>
                            {dueDateInfo && (
                              <div className={`flex items-center gap-1 text-[10px] ${dueDateInfo.className}`}>
                                <dueDateInfo.icon className="h-3 w-3" />
                                <span>{dueDateInfo.label}</span>
                              </div>
                            )}
                          </div>

                          {/* Move buttons */}
                          <div className="flex gap-1 pt-0.5 pl-6">
                            {prevStatus[col.key] && (
                              <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 gap-1" onClick={() => moveTask.mutate({ id: task.id, status: prevStatus[col.key]! })}>
                                <ArrowLeft className="h-3 w-3" />{columns.find(c => c.key === prevStatus[col.key])?.label}
                              </Button>
                            )}
                            {nextStatus[col.key] && (
                              <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 gap-1 ml-auto" onClick={() => moveTask.mutate({ id: task.id, status: nextStatus[col.key]! })}>
                                {columns.find(c => c.key === nextStatus[col.key])?.label}<ArrowRight className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditingTask(null); }}><DialogContent>
        <DialogHeader><DialogTitle>{editingTask ? "Edit Task" : "Create Task"}</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="What needs to be done?" /></div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Add details..." /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Priority</Label><ComboboxSelect value={form.priority} onValueChange={v => setForm({ ...form, priority: v as TaskPriority })} options={["low", "medium", "high"]} allowCustom={false} /></div>
            <div><Label>Due Date</Label><Input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} /></div>
            <div><Label>Est. Hours</Label><Input type="number" value={form.estimated_hours} onChange={e => setForm({ ...form, estimated_hours: e.target.value })} placeholder="0" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Assigned To</Label><ComboboxSelect value={form.assigned_to} onValueChange={v => setForm({ ...form, assigned_to: v })} options={employeeOptions} placeholder="Select employee..." allowCustom={false} /></div>
            <div><Label>Progress (%)</Label><Input type="number" min="0" max="100" value={form.progress} onChange={e => setForm({ ...form, progress: e.target.value })} placeholder="0-100" /></div>
          </div>
          <Button onClick={() => addTask.mutate()} className="w-full h-9" disabled={!form.title || addTask.isPending}>
            {addTask.isPending && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
            {editingTask ? "Update Task" : "Create Task"}
          </Button>
        </div>
      </DialogContent></Dialog>

      {/* View Dialog - Enhanced */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}><DialogContent>
        <DialogHeader><DialogTitle>{viewItem?.title}</DialogTitle></DialogHeader>
        {viewItem && (() => {
          const dueDateInfo = getDueDateInfo(viewItem.due_date);
          const pConfig = priorityConfig[viewItem.priority || "medium"];
          const hoursProgress = viewItem.estimated_hours && viewItem.actual_hours ? Math.min(100, Math.round((viewItem.actual_hours / viewItem.estimated_hours) * 100)) : null;
          const taskProgress = viewItem.progress != null ? Number(viewItem.progress) : null;
          const assigneeName = employees.find((e: any) => e.id === viewItem.assigned_to)?.name;
          return (
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <Badge variant="secondary" className={`border-0 ${pConfig.color}`}>{pConfig.label} Priority</Badge>
                <Badge variant="outline">{viewItem.status?.replace(/_/g, " ")}</Badge>
                {dueDateInfo && (
                  <Badge variant="secondary" className={`border-0 ${dueDateInfo.className.includes("destructive") ? "bg-destructive/15" : dueDateInfo.className.includes("warning") ? "bg-warning/15" : "bg-secondary"}`}>
                    {dueDateInfo.label}
                  </Badge>
                )}
              </div>
              {viewItem.description && <p className="text-sm text-muted-foreground">{viewItem.description}</p>}
              <div className="grid grid-cols-2 gap-4 text-sm">
                {viewItem.due_date && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">Due Date</p>
                    <p className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-muted-foreground" />{format(new Date(viewItem.due_date), "dd MMM yyyy")}</p>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Created</p>
                  <p>{format(new Date(viewItem.created_at), "dd MMM yyyy")}</p>
                </div>
                {assigneeName && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">Assigned To</p>
                    <p className="flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-muted-foreground" />{assigneeName}</p>
                  </div>
                )}
              </div>
              {taskProgress !== null && (
                <div className="p-3 rounded-lg bg-secondary/50 space-y-2">
                  <div className="flex justify-between text-xs font-medium text-muted-foreground">
                    <span>Completion Progress</span><span>{taskProgress}%</span>
                  </div>
                  <Progress value={taskProgress} className="h-2" />
                </div>
              )}
              {(viewItem.estimated_hours > 0 || viewItem.actual_hours > 0) && (
                <div className="p-3 rounded-lg bg-secondary/50 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Time Tracking</p>
                  <div className="flex gap-4 text-sm">
                    {viewItem.estimated_hours > 0 && <div><span className="text-muted-foreground">Estimated:</span> <span className="font-medium">{viewItem.estimated_hours}h</span></div>}
                    {viewItem.actual_hours > 0 && <div><span className="text-muted-foreground">Actual:</span> <span className="font-medium">{viewItem.actual_hours}h</span></div>}
                  </div>
                  {hoursProgress !== null && <Progress value={hoursProgress} className="h-2" />}
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => { setViewItem(null); handleEditTask(viewItem); }}>
                  <Pencil className="h-4 w-4 mr-2" />Edit
                </Button>
                <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => { setViewItem(null); setDeleteId(viewItem.id); }}>
                  <Trash2 className="h-4 w-4 mr-2" />Delete
                </Button>
              </div>
            </div>
          );
        })()}
      </DialogContent></Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} onConfirm={() => deleteId && remove.mutate(deleteId)} title="Delete Task?" />
    </div>
  );
}
