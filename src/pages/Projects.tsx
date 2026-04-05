import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logAudit } from "@/lib/audit";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, Search, FolderKanban, Pencil, Trash2, Eye, TrendingUp,
  Calendar, DollarSign, AlertTriangle, LayoutGrid, List, User, Flag,
} from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays, isPast } from "date-fns";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { ComboboxSelect } from "@/components/ComboboxSelect";
import { StatusFilter } from "@/components/StatusFilter";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ExportButton } from "@/components/ExportButton";

const statusColors: Record<string, string> = { active: "bg-success/15 text-success", completed: "bg-primary/15 text-primary", on_hold: "bg-warning/15 text-warning", cancelled: "bg-destructive/15 text-destructive" };
const statusDot: Record<string, string> = { active: "bg-success", completed: "bg-primary", on_hold: "bg-warning", cancelled: "bg-destructive" };
const priorityColors: Record<string, string> = { high: "bg-destructive/15 text-destructive border-destructive/20", medium: "bg-warning/15 text-warning border-warning/20", low: "bg-info/15 text-info border-info/20" };
const emptyForm = { name: "", description: "", status: "active", priority: "medium", budget: "", actual_spend: "", start_date: "", end_date: "", client_id: "", completion_pct: "", manager_id: "", milestones_total: "", milestones_done: "" };

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
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [inlineStatus, setInlineStatus] = useState<Record<string, boolean>>({});

  const { data: projects = [], isLoading , isError: dataLoadError} = useQuery({
    queryKey: ["projects"],
    queryFn: async () => { const { data } = await supabase.from("projects").select("*, clients(name)").order("created_at", { ascending: false }); return data || []; },
  });
  const { data: clients = [] } = useQuery({
    queryKey: ["clients-list"],
    queryFn: async () => { const { data } = await supabase.from("clients").select("id, name"); return data || []; },
  });
  const { data: employees = [] } = useQuery({
    queryKey: ["employees-list-proj"],
    queryFn: async () => { const { data } = await supabase.from("employees").select("id, name").order("name"); return data || []; },
  });

  const employeeOptions = employees.map((e: any) => ({ value: e.id, label: e.name }));
  const getManagerName = (id: string) => employees.find((e: any) => e.id === id)?.name || id;

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        budget: parseFloat(form.budget) || 0,
        actual_spend: form.actual_spend ? parseFloat(form.actual_spend) : null,
        client_id: form.client_id || null,
        manager_id: form.manager_id || null,
        completion_pct: form.completion_pct ? parseInt(form.completion_pct) : null,
        milestones_total: form.milestones_total ? parseInt(form.milestones_total) : null,
        milestones_done: form.milestones_done ? parseInt(form.milestones_done) : null,
      };
      if (editingId) {
        const { error } = await supabase.from("projects").update(payload).eq("id", editingId);
        if (error) throw error;
        await logAudit("Updated project", form.name, "projects");
      } else {
        const { error } = await supabase.from("projects").insert({ ...payload, project_no: `PRJ-${Date.now().toString().slice(-6)}`, created_by: user?.id });
        if (error) throw error;
        await logAudit("Created project", form.name, "projects");
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["projects"] }); toast.success(editingId ? "Project updated" : "Project created"); setOpen(false); setEditingId(null); setForm(emptyForm); },
    onError: (e: any) => toast.error(e.message),
  });

  const quickStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("projects").update({ status }).eq("id", id);
      if (error) throw error;
      await logAudit("Updated project status", `${id} → ${status}`, "projects");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["projects"] }); toast.success("Status updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const proj = projects.find((p: any) => p.id === id);
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
      await logAudit("Deleted project", proj?.name, "projects");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["projects"] }); toast.success("Project deleted"); setDeleteId(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const handleEdit = (p: any) => {
    setEditingId(p.id);
    setForm({
      name: p.name || "", description: p.description || "", status: p.status || "active", priority: p.priority || "medium",
      budget: String(p.budget || ""), actual_spend: p.actual_spend != null ? String(p.actual_spend) : "",
      start_date: p.start_date || "", end_date: p.end_date || "", client_id: p.client_id || "",
      completion_pct: p.completion_pct != null ? String(p.completion_pct) : "",
      manager_id: p.manager_id || "",
      milestones_total: p.milestones_total != null ? String(p.milestones_total) : "",
      milestones_done: p.milestones_done != null ? String(p.milestones_done) : "",
    });
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
    { value: "cancelled", label: "Cancelled", count: projects.filter((p: any) => p.status === "cancelled").length },
  ];

  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);
  const totalBudget = projects.reduce((s: number, p: any) => s + (p.budget || 0), 0);
  const totalSpent = projects.reduce((s: number, p: any) => s + (p.actual_spend || p.spent || 0), 0);
  const overallBudgetUsed = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  const getCompletionPct = (p: any) => {
    if (p.completion_pct != null) return Number(p.completion_pct);
    if (!p.start_date || !p.end_date) return null;
    const total = differenceInDays(new Date(p.end_date), new Date(p.start_date));
    const elapsed = differenceInDays(new Date(), new Date(p.start_date));
    if (total <= 0) return 100;
    return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  };

  const getDaysRemainingBadge = (p: any) => {
    if (!p.end_date) return null;
    const days = differenceInDays(new Date(p.end_date), new Date());
    if (days < 0) return <Badge variant="destructive" className="text-[10px] px-1.5">{Math.abs(days)}d overdue</Badge>;
    if (days <= 30) return <Badge className="text-[10px] px-1.5 bg-warning/15 text-warning border-0">{days}d left</Badge>;
    return <Badge className="text-[10px] px-1.5 bg-success/15 text-success border-0">{days}d left</Badge>;
  };

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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FolderKanban className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Projects</h1>
            <p className="text-sm text-muted-foreground">{projects.length} projects • AED {totalBudget.toLocaleString()} total budget</p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex border rounded-lg overflow-hidden">
            <Button variant={viewMode === "table" ? "default" : "ghost"} size="sm" className="h-9 rounded-none" onClick={() => setViewMode("table")}><List className="h-4 w-4" /></Button>
            <Button variant={viewMode === "grid" ? "default" : "ghost"} size="sm" className="h-9 rounded-none" onClick={() => setViewMode("grid")}><LayoutGrid className="h-4 w-4" /></Button>
          </div>
          <ExportButton data={filtered} filename="projects" columns={[{key:"project_no",label:"No"},{key:"name",label:"Name"},{key:"status",label:"Status"},{key:"priority",label:"Priority"},{key:"budget",label:"Budget"}]} />
          <Button onClick={() => { setEditingId(null); setForm(emptyForm); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />New Project</Button>
        </div>
      </div>

      {/* Enhanced KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Card className="group hover:shadow-md transition-all border hover:border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Total Projects</p>
                <p className="text-2xl font-bold mt-1">{projects.length}</p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FolderKanban className="h-4 w-4 text-primary" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">{projects.filter((p:any) => p.status === "active").length} active</p>
          </CardContent>
        </Card>
        <Card className="group hover:shadow-md transition-all border hover:border-success/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Active</p>
                <p className="text-2xl font-bold text-success mt-1">{projects.filter((p:any)=>p.status==="active").length}</p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-success/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingUp className="h-4 w-4 text-success" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">{projects.filter((p:any)=>p.status==="completed").length} completed</p>
          </CardContent>
        </Card>
        <Card className="group hover:shadow-md transition-all border hover:border-warning/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Budget Used</p>
                <p className="text-2xl font-bold mt-1">{overallBudgetUsed}%</p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-warning/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <DollarSign className="h-4 w-4 text-warning" />
              </div>
            </div>
            <Progress value={overallBudgetUsed} className="h-1.5 mt-2" />
            <p className="text-[11px] text-muted-foreground mt-1.5">AED {totalSpent.toLocaleString()} of {totalBudget.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="group hover:shadow-md transition-all border hover:border-destructive/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">High Priority</p>
                <p className="text-2xl font-bold text-destructive mt-1">{projects.filter((p:any)=>p.priority==="high").length}</p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">{projects.filter((p:any)=>p.end_date && isPast(new Date(p.end_date)) && p.status === "active").length} overdue</p>
          </CardContent>
        </Card>
      </div>

      <Card><CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
          <StatusFilter statuses={statuses} selected={statusFilter} onSelect={setStatusFilter} />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-12 gap-3">
            <FolderKanban className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">No projects found</p>
            <Button variant="outline" size="sm" onClick={() => { setEditingId(null); setForm(emptyForm); setOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />Create your first project
            </Button>
          </div>
        ) : viewMode === "grid" ? (
          /* Grid View */
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p: any) => {
              const actualSpend = p.actual_spend != null ? p.actual_spend : (p.spent || 0);
              const budgetPct = p.budget > 0 ? Math.min(100, Math.round((actualSpend / p.budget) * 100)) : 0;
              const budgetOver = p.budget > 0 && actualSpend > p.budget;
              const completionPct = getCompletionPct(p);
              return (
                <Card key={p.id} className="group hover:shadow-lg transition-all border hover:border-primary/20 overflow-hidden">
                  <CardContent className="p-0">
                    {/* Color strip */}
                    <div className={`h-1 ${statusDot[p.status] || "bg-muted"}`} />
                    <div className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm truncate">{p.name}</h3>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{p.project_no} {p.clients?.name ? `• ${p.clients.name}` : ""}</p>
                        </div>
                        <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setViewing(p); setViewOpen(true); }}><Eye className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Badge className={`border-0 text-[10px] ${statusColors[p.status] || ""}`}>{p.status}</Badge>
                        <Badge variant="outline" className={`text-[10px] ${priorityColors[p.priority] || ""}`}>{p.priority}</Badge>
                        {p.manager_id && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><User className="h-3 w-3" />{getManagerName(p.manager_id)}</span>}
                      </div>

                      {p.description && <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>}

                      {/* Completion Progress */}
                      {completionPct !== null && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-muted-foreground">Completion</span>
                            <span className="font-medium">{completionPct}%</span>
                          </div>
                          <Progress value={completionPct} className="h-1.5" />
                        </div>
                      )}

                      {/* Budget vs Actual */}
                      {p.budget > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-muted-foreground">Budget</span>
                            <span className={`font-medium ${budgetOver ? "text-destructive" : budgetPct >= 80 ? "text-destructive" : "text-muted-foreground"}`}>{budgetPct}% used</span>
                          </div>
                          <Progress value={budgetPct} className="h-1.5" />
                          <p className={`text-[10px] ${budgetOver ? "text-destructive" : "text-muted-foreground"}`}>AED {actualSpend.toLocaleString()} / {p.budget.toLocaleString()}</p>
                        </div>
                      )}

                      {/* Days remaining */}
                      {p.end_date && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">{format(new Date(p.end_date), "dd MMM yyyy")}</span>
                          {getDaysRemainingBadge(p)}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <>
          <div className="overflow-x-auto">
          <Table><TableHeader><TableRow>
            <SortableHeader label="Project" sortKey="name" direction={getSortDirection("name")} onToggle={toggleSort} />
            <SortableHeader label="Client" sortKey="clients.name" direction={getSortDirection("clients.name")} onToggle={toggleSort} />
            <SortableHeader label="Status" sortKey="status" direction={getSortDirection("status")} onToggle={toggleSort} />
            <SortableHeader label="Priority" sortKey="priority" direction={getSortDirection("priority")} onToggle={toggleSort} />
            <SortableHeader label="Progress" sortKey="completion_pct" direction={getSortDirection("completion_pct")} onToggle={toggleSort} />
            <SortableHeader label="Budget" sortKey="budget" direction={getSortDirection("budget")} onToggle={toggleSort} />
            <SortableHeader label="Days Left" sortKey="end_date" direction={getSortDirection("end_date")} onToggle={toggleSort} />
            <SortableHeader label="Actions" sortKey="" direction={null} onToggle={() => {}} />
          </TableRow></TableHeader>
            <TableBody>{pageData.map((p: any) => {
              const actualSpend = p.actual_spend != null ? p.actual_spend : (p.spent || 0);
              const budgetPct = p.budget > 0 ? Math.min(100, Math.round((actualSpend / p.budget) * 100)) : 0;
              const budgetOver = p.budget > 0 && actualSpend > p.budget;
              const budgetWarning = budgetPct >= 80;
              const completionPct = getCompletionPct(p);
              return (
              <TableRow key={p.id} className="group hover:bg-secondary/30">
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full shrink-0 ${statusDot[p.status] || "bg-muted"}`} />
                    <div>
                      <span className="font-medium">{p.name}</span>
                      <br/><span className="text-xs text-muted-foreground">{p.project_no}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{p.clients?.name || "—"}</TableCell>
                <TableCell>
                  {inlineStatus[p.id] ? (
                    <Select value={p.status} onValueChange={v => { quickStatus.mutate({ id: p.id, status: v }); setInlineStatus(s => ({ ...s, [p.id]: false })); }}>
                      <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="on_hold">On Hold</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent>
                    </Select>
                  ) : (
                    <Badge className={`border-0 cursor-pointer ${statusColors[p.status] || ""}`} onClick={() => setInlineStatus(s => ({ ...s, [p.id]: true }))}>{p.status}</Badge>
                  )}
                </TableCell>
                <TableCell><Badge variant="outline" className={`${priorityColors[p.priority] || ""}`}>{p.priority}</Badge></TableCell>
                <TableCell>
                  {completionPct !== null ? (
                    <div className="space-y-1 min-w-[100px]">
                      <div className="flex items-center gap-2">
                        <Progress value={completionPct} className="h-1.5 flex-1" />
                        <span className="text-[10px] font-medium text-muted-foreground">{completionPct}%</span>
                      </div>
                    </div>
                  ) : <span className="text-xs text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                  <div className="space-y-1 min-w-[120px]">
                    <span className="text-xs font-medium">AED {p.budget?.toLocaleString() || 0}</span>
                    {p.budget > 0 && (
                      <div className="flex items-center gap-2">
                        <Progress value={budgetPct} className="h-1.5 flex-1" />
                        <span className={`text-[10px] font-medium ${budgetOver || budgetWarning ? "text-destructive" : "text-muted-foreground"}`}>{budgetPct}%</span>
                      </div>
                    )}
                    {actualSpend > 0 && <span className={`text-[10px] ${budgetOver ? "text-destructive" : "text-muted-foreground"}`}>Spent: {actualSpend.toLocaleString()}</span>}
                  </div>
                </TableCell>
                <TableCell>{getDaysRemainingBadge(p) || <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                <TableCell>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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

      {/* Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditingId(null); setForm(emptyForm); } }}><DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editingId ? "Edit Project" : "New Project"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
          <div><Label>Client</Label>
            <ComboboxSelect value={form.client_id} onValueChange={v => setForm({...form, client_id: v})} options={clients.map((c:any) => ({value:c.id, label:c.name}))} placeholder="Select client..." allowCustom={false} />
          </div>
          <div><Label>Project Manager</Label>
            <ComboboxSelect value={form.manager_id} onValueChange={v => setForm({...form, manager_id: v})} options={employeeOptions} placeholder="Select manager..." allowCustom={false} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Status</Label><Select value={form.status} onValueChange={v => setForm({...form, status: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="on_hold">On Hold</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select></div>
            <div><Label>Priority</Label><Select value={form.priority} onValueChange={v => setForm({...form, priority: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Budget (AED)</Label><Input type="number" value={form.budget} onChange={e => setForm({...form, budget: e.target.value})} /></div>
            <div><Label>Actual Spend (AED)</Label><Input type="number" value={form.actual_spend} onChange={e => setForm({...form, actual_spend: e.target.value})} placeholder="0" /></div>
          </div>
          <div><Label>Completion % (0-100)</Label><Input type="number" min="0" max="100" value={form.completion_pct} onChange={e => setForm({...form, completion_pct: e.target.value})} placeholder="0" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Milestones Total</Label><Input type="number" min="0" value={form.milestones_total} onChange={e => setForm({...form, milestones_total: e.target.value})} placeholder="0" /></div>
            <div><Label>Milestones Done</Label><Input type="number" min="0" value={form.milestones_done} onChange={e => setForm({...form, milestones_done: e.target.value})} placeholder="0" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Start</Label><Input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} /></div>
            <div><Label>End</Label><Input type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} /></div>
          </div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
          <Button className="w-full" onClick={() => save.mutate()} disabled={!form.name || save.isPending}>{save.isPending ? "Saving..." : editingId ? "Update Project" : "Create Project"}</Button>
        </div>
      </DialogContent></Dialog>

      {/* View Dialog - Enhanced */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}><DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Project Details</DialogTitle></DialogHeader>
        {viewing && (() => {
          const actualSpend = viewing.actual_spend != null ? viewing.actual_spend : (viewing.spent || 0);
          const budgetPct = viewing.budget > 0 ? Math.min(100, Math.round((actualSpend / viewing.budget) * 100)) : 0;
          const budgetOver = viewing.budget > 0 && actualSpend > viewing.budget;
          const completionPct = getCompletionPct(viewing);
          return (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full ${statusDot[viewing.status] || "bg-muted"}`} />
                <div>
                  <h3 className="font-semibold">{viewing.name}</h3>
                  <p className="text-xs text-muted-foreground">{viewing.project_no}</p>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Badge className={`border-0 ${statusColors[viewing.status] || ""}`}>{viewing.status}</Badge>
                <Badge variant="outline" className={priorityColors[viewing.priority] || ""}>{viewing.priority}</Badge>
                {viewing.clients?.name && <Badge variant="secondary">{viewing.clients.name}</Badge>}
                {viewing.manager_id && <Badge variant="outline" className="gap-1"><User className="h-3 w-3" />{getManagerName(viewing.manager_id)}</Badge>}
              </div>

              {viewing.description && <p className="text-sm text-muted-foreground">{viewing.description}</p>}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Start Date</p>
                  <p className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-muted-foreground" />{viewing.start_date ? format(new Date(viewing.start_date), "dd MMM yyyy") : "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">End Date</p>
                  <p className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-muted-foreground" />{viewing.end_date ? format(new Date(viewing.end_date), "dd MMM yyyy") : "—"}{viewing.end_date && <span className="ml-1">{getDaysRemainingBadge(viewing)}</span>}</p>
                </div>
              </div>

              {/* Completion progress */}
              {completionPct !== null && (
                <div className="space-y-2 p-3 rounded-lg bg-secondary/50">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Completion</span>
                    <span className="font-semibold">{completionPct}%</span>
                  </div>
                  <Progress value={completionPct} className="h-2" />
                </div>
              )}

              {/* Budget vs Actual */}
              {viewing.budget > 0 && (
                <div className="space-y-2 p-3 rounded-lg bg-secondary/50">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Budget vs Actual</span>
                    <span className={`font-semibold ${budgetOver ? "text-destructive" : budgetPct >= 80 ? "text-destructive" : "text-foreground"}`}>{budgetPct}%{budgetOver ? " OVER BUDGET" : ""}</span>
                  </div>
                  <Progress value={budgetPct} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span className={budgetOver ? "text-destructive" : ""}>Actual: AED {actualSpend.toLocaleString()}</span>
                    <span>Budget: AED {viewing.budget.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Milestones */}
              {(viewing.milestones_total > 0) && (
                <div className="p-3 rounded-lg bg-secondary/50 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Flag className="h-3.5 w-3.5" />Milestones</p>
                  <p className="text-sm font-semibold">{viewing.milestones_done || 0} / {viewing.milestones_total} completed</p>
                  <Progress value={viewing.milestones_total > 0 ? Math.round(((viewing.milestones_done || 0) / viewing.milestones_total) * 100) : 0} className="h-1.5" />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => { setViewOpen(false); handleEdit(viewing); }}>
                  <Pencil className="h-4 w-4 mr-2" />Edit
                </Button>
                <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => { setViewOpen(false); setDeleteId(viewing.id); }}>
                  <Trash2 className="h-4 w-4 mr-2" />Delete
                </Button>
              </div>
            </div>
          );
        })()}
      </DialogContent></Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete Project?" description="This will permanently remove this project." onConfirm={() => deleteId && remove.mutate(deleteId)} />
    </div>
  );
}
