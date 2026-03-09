import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, GraduationCap, Pencil, Trash2, Eye, LayoutGrid, List, ShieldCheck, Zap, BookOpen, HeartPulse, UserCheck, Award, DollarSign, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { differenceInDays } from "date-fns";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { ExportButton } from "@/components/ExportButton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusFilter } from "@/components/StatusFilter";
import { ComboboxSelect } from "@/components/ComboboxSelect";

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};
const typeIcons: Record<string, any> = {
  safety: ShieldCheck, technical: Zap, soft_skills: BookOpen, compliance: Award, induction: UserCheck, first_aid: HeartPulse,
};

const resultColors: Record<string, string> = {
  Pass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  Fail: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  "In Progress": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

const getCertExpiryClass = (dateStr: string): string => {
  if (!dateStr) return "";
  const exp = new Date(dateStr);
  const today = new Date();
  const diffDays = differenceInDays(exp, today);
  if (diffDays < 0) return "text-red-600 font-medium";
  if (diffDays <= 90) return "text-amber-600 font-medium";
  return "text-emerald-600 font-medium";
};

const getCertExpiryLabel = (dateStr: string): string => {
  if (!dateStr) return "—";
  const exp = new Date(dateStr);
  const today = new Date();
  const diffDays = differenceInDays(exp, today);
  const formatted = exp.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  if (diffDays < 0) return `${formatted} (Expired)`;
  if (diffDays <= 90) return `${formatted} (${diffDays}d left)`;
  return formatted;
};

export default function Training() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewItem, setViewItem] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [form, setForm] = useState({
    title: "", type: "safety", date: "", duration: "", trainer: "", venue: "", status: "scheduled",
    completion_pct: "0", cost: "", certificate_expiry: "", result: "In Progress", provider: "",
  });

  const { data = [], isLoading } = useQuery({
    queryKey: ["training"],
    queryFn: async () => { const { data } = await (supabase as any).from("training_programs").select("*").order("date", { ascending: false }); return data || []; },
  });

  const resetForm = () => setForm({
    title: "", type: "safety", date: "", duration: "", trainer: "", venue: "", status: "scheduled",
    completion_pct: "0", cost: "", certificate_expiry: "", result: "In Progress", provider: "",
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title, type: form.type, date: form.date || null, duration: form.duration,
        trainer: form.trainer, venue: form.venue, status: form.status,
        completion_pct: parseInt(form.completion_pct) || 0,
        cost: parseFloat(form.cost) || null,
        certificate_expiry: form.certificate_expiry || null,
        result: form.result,
        provider: form.provider,
      };
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

  const markComplete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("training_programs").update({ status: "completed", completion_pct: 100 }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["training"] });
      toast.success("Marked as complete ✓");
      setViewItem((prev: any) => prev?.id === id ? { ...prev, status: "completed", completion_pct: 100 } : prev);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleEdit = (r: any) => {
    setEditingId(r.id);
    setForm({
      title: r.title, type: r.type || "safety", date: r.date || "", duration: r.duration || "",
      trainer: r.trainer || "", venue: r.venue || "", status: r.status || "scheduled",
      completion_pct: String(r.completion_pct ?? 0), cost: String(r.cost || ""),
      certificate_expiry: r.certificate_expiry || "", result: r.result || "In Progress",
      provider: r.provider || "",
    });
    setOpen(true);
  };

  const statusCounts = data.reduce((a: Record<string, number>, r: any) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {});
  const completionRate = data.length > 0 ? Math.round(((statusCounts.completed || 0) / data.length) * 100) : 0;
  const totalCost = data.reduce((s: number, r: any) => s + (r.cost || 0), 0);

  const filtered = data
    .filter((r: any) => r.title?.toLowerCase().includes(search.toLowerCase()) || r.trainer?.toLowerCase().includes(search.toLowerCase()) || r.provider?.toLowerCase().includes(search.toLowerCase()))
    .filter((r: any) => statusFilter === "all" || r.status === statusFilter);
  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><GraduationCap className="h-5 w-5 text-primary" /></div>
          <div><h1 className="text-2xl font-bold">Training</h1><p className="text-sm text-muted-foreground">{data.length} programs</p></div>
        </div>
        <div className="flex gap-2">
          <div className="flex border rounded-lg overflow-hidden">
            <Button variant={viewMode === "table" ? "default" : "ghost"} size="sm" className="h-9 rounded-none" onClick={() => setViewMode("table")}><List className="h-4 w-4" /></Button>
            <Button variant={viewMode === "grid" ? "default" : "ghost"} size="sm" className="h-9 rounded-none" onClick={() => setViewMode("grid")}><LayoutGrid className="h-4 w-4" /></Button>
          </div>
          <ExportButton data={data} filename="training" />
          <Button onClick={() => { resetForm(); setEditingId(null); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add Training</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-5">
        <Card className="group hover:shadow-md transition-all"><CardContent className="p-4">
          <div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Programs</p><p className="text-2xl font-bold mt-1">{data.length}</p></div>
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform"><GraduationCap className="h-4 w-4 text-primary" /></div></div>
        </CardContent></Card>
        <Card className="group hover:shadow-md transition-all"><CardContent className="p-4">
          <div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase tracking-wider">Scheduled</p><p className="text-2xl font-bold mt-1 text-blue-600">{statusCounts.scheduled || 0}</p></div>
          <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform"><BookOpen className="h-4 w-4 text-blue-600" /></div></div>
        </CardContent></Card>
        <Card className="group hover:shadow-md transition-all"><CardContent className="p-4">
          <div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase tracking-wider">In Progress</p><p className="text-2xl font-bold mt-1 text-warning">{statusCounts.in_progress || 0}</p></div>
          <div className="h-9 w-9 rounded-lg bg-warning/10 flex items-center justify-center group-hover:scale-110 transition-transform"><Zap className="h-4 w-4 text-warning" /></div></div>
        </CardContent></Card>
        <Card className="group hover:shadow-md transition-all"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Completion Rate</p>
          <p className="text-2xl font-bold mt-1 text-success">{completionRate}%</p>
          <Progress value={completionRate} className="h-1.5 mt-2" />
        </CardContent></Card>
        <Card className="group hover:shadow-md transition-all"><CardContent className="p-4">
          <div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Cost</p><p className="text-2xl font-bold mt-1">AED {totalCost.toLocaleString()}</p></div>
          <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform"><DollarSign className="h-4 w-4 text-emerald-600" /></div></div>
        </CardContent></Card>
      </div>

      <StatusFilter statuses={[{value:"all",label:"All",count:data.length},{value:"scheduled",label:"Scheduled",count:statusCounts.scheduled||0},{value:"in_progress",label:"In Progress",count:statusCounts.in_progress||0},{value:"completed",label:"Completed",count:statusCounts.completed||0},{value:"cancelled",label:"Cancelled",count:statusCounts.cancelled||0}]} selected={statusFilter} onSelect={setStatusFilter} />

      <div className="relative max-w-sm"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search training..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>

      {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No training programs</p> : viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r: any) => {
            const TypeIcon = typeIcons[r.type] || GraduationCap;
            const certClass = getCertExpiryClass(r.certificate_expiry);
            return (
              <Card key={r.id} className="group hover:shadow-lg transition-all border hover:border-primary/20 overflow-hidden">
                <CardContent className="p-0">
                  <div className={`h-1 ${r.status === "completed" ? "bg-success" : r.status === "in_progress" ? "bg-warning" : r.status === "cancelled" ? "bg-destructive" : "bg-blue-500"}`} />
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><TypeIcon className="h-4 w-4 text-primary" /></div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm truncate">{r.title}</h3>
                          <p className="text-[11px] text-muted-foreground capitalize">{r.type?.replace("_", " ")}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="secondary" className={`border-0 text-[10px] ${statusColors[r.status] || ""}`}>{r.status}</Badge>
                        {r.result && <Badge variant="secondary" className={`border-0 text-[10px] ${resultColors[r.result] || ""}`}>{r.result}</Badge>}
                      </div>
                    </div>
                    {r.trainer && <p className="text-xs text-muted-foreground">Trainer: <span className="font-medium text-foreground">{r.trainer}</span></p>}
                    {r.provider && <p className="text-xs text-muted-foreground">Provider: <span className="font-medium text-foreground">{r.provider}</span></p>}
                    {r.date && <p className="text-xs text-muted-foreground">Date: {r.date}</p>}
                    {r.certificate_expiry && <p className={`text-xs ${certClass}`}>Cert Expiry: {getCertExpiryLabel(r.certificate_expiry)}</p>}
                    {typeof r.completion_pct === "number" && (
                      <div>
                        <div className="flex items-center justify-between text-[10px] mb-1">
                          <span className="text-muted-foreground">Completion</span>
                          <span className="font-medium">{r.completion_pct}%</span>
                        </div>
                        <Progress value={r.completion_pct} className="h-1.5" />
                      </div>
                    )}
                    <div className="flex gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewItem(r)}><Eye className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteId(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card><CardContent className="pt-6">
          <Table><TableHeader><TableRow>
            <SortableHeader label="Title" sortKey="title" direction={getSortDirection("title")} onToggle={toggleSort} />
            <SortableHeader label="Type" sortKey="type" direction={getSortDirection("type")} onToggle={toggleSort} />
            <SortableHeader label="Provider" sortKey="provider" direction={getSortDirection("provider")} onToggle={toggleSort} />
            <SortableHeader label="Date" sortKey="date" direction={getSortDirection("date")} onToggle={toggleSort} />
            <SortableHeader label="Completion" sortKey="completion_pct" direction={getSortDirection("completion_pct")} onToggle={toggleSort} />
            <SortableHeader label="Cert Expiry" sortKey="certificate_expiry" direction={getSortDirection("certificate_expiry")} onToggle={toggleSort} />
            <SortableHeader label="Result" sortKey="result" direction={getSortDirection("result")} onToggle={toggleSort} />
            <SortableHeader label="Status" sortKey="status" direction={getSortDirection("status")} onToggle={toggleSort} />
            <SortableHeader label="Actions" sortKey="" direction={null} onToggle={() => {}} />
          </TableRow></TableHeader>
            <TableBody>{pageData.map((r: any) => {
              const TypeIcon = typeIcons[r.type] || GraduationCap;
              const certClass = getCertExpiryClass(r.certificate_expiry);
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.title}</TableCell>
                  <TableCell><div className="flex items-center gap-1.5"><TypeIcon className="h-3.5 w-3.5 text-muted-foreground" /><Badge variant="outline" className="capitalize">{r.type?.replace("_"," ")}</Badge></div></TableCell>
                  <TableCell className="text-sm">{r.provider || "—"}</TableCell>
                  <TableCell>{r.date || "—"}</TableCell>
                  <TableCell className="min-w-[120px]">
                    <div className="flex items-center gap-2">
                      <Progress value={r.completion_pct || 0} className="h-1.5 flex-1" />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{r.completion_pct || 0}%</span>
                    </div>
                  </TableCell>
                  <TableCell className={`text-xs ${certClass}`}>{getCertExpiryLabel(r.certificate_expiry)}</TableCell>
                  <TableCell>
                    {r.result && <Badge variant="secondary" className={`border-0 text-xs ${resultColors[r.result] || ""}`}>{r.result}</Badge>}
                  </TableCell>
                  <TableCell><Badge variant="secondary" className={`border-0 ${statusColors[r.status] || ""}`}>{r.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewItem(r)}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(r)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}</TableBody></Table>
          <DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
        </CardContent></Card>
      )}

      {/* View Dialog */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}><DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{viewItem?.title}</DialogTitle></DialogHeader>
        {viewItem && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              {[["Type", viewItem.type], ["Date", viewItem.date], ["Duration", viewItem.duration], ["Trainer", viewItem.trainer], ["Provider", viewItem.provider], ["Venue", viewItem.venue], ["Status", viewItem.status], ["Cost (AED)", viewItem.cost ? Number(viewItem.cost).toLocaleString() : "—"]].map(([l, v]) => (
                <div key={l as string}><p className="text-muted-foreground text-xs">{l}</p><p className="font-medium capitalize">{v || "—"}</p></div>
              ))}
              <div>
                <p className="text-muted-foreground text-xs">Result</p>
                {viewItem.result ? <Badge variant="secondary" className={`border-0 ${resultColors[viewItem.result] || ""}`}>{viewItem.result}</Badge> : <p className="font-medium">—</p>}
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Certificate Expiry</p>
                <p className={`font-medium ${getCertExpiryClass(viewItem.certificate_expiry)}`}>{getCertExpiryLabel(viewItem.certificate_expiry)}</p>
              </div>
            </div>
            {typeof viewItem.completion_pct === "number" && (
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Completion</span>
                  <span className="font-medium">{viewItem.completion_pct}%</span>
                </div>
                <Progress value={viewItem.completion_pct} className="h-2" />
              </div>
            )}
            {viewItem.status !== "completed" && (
              <Button className="w-full h-9 bg-success text-white hover:bg-success/90" onClick={() => markComplete.mutate(viewItem.id)} disabled={markComplete.isPending}>
                <CheckCircle className="h-4 w-4 mr-2" />{markComplete.isPending ? "Updating..." : "Mark Complete"}
              </Button>
            )}
          </div>
        )}
      </DialogContent></Dialog>

      <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { setEditingId(null); resetForm(); } }}><DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editingId ? "Edit" : "Add"} Training Program</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
          <div><Label>Type</Label><ComboboxSelect value={form.type} onChange={v => setForm({...form, type: v})} options={["safety","technical","soft_skills","compliance","induction","first_aid"]} placeholder="Select type" /></div>
          <div><Label>Training Provider</Label><Input value={form.provider} onChange={e => setForm({...form, provider: e.target.value})} placeholder="e.g. ABC Safety Training" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
            <div><Label>Duration</Label><Input value={form.duration} onChange={e => setForm({...form, duration: e.target.value})} placeholder="e.g. 4 hours" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Trainer</Label><Input value={form.trainer} onChange={e => setForm({...form, trainer: e.target.value})} /></div>
            <div><Label>Venue</Label><Input value={form.venue} onChange={e => setForm({...form, venue: e.target.value})} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Cost (AED)</Label><Input type="number" value={form.cost} onChange={e => setForm({...form, cost: e.target.value})} placeholder="0.00" /></div>
            <div><Label>Certificate Expiry</Label><Input type="date" value={form.certificate_expiry} onChange={e => setForm({...form, certificate_expiry: e.target.value})} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Result</Label>
              <Select value={form.result} onValueChange={v => setForm({...form, result: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Pass">Pass</SelectItem>
                  <SelectItem value="Fail">Fail</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Completion %</Label><Input type="number" min="0" max="100" value={form.completion_pct} onChange={e => setForm({...form, completion_pct: e.target.value})} /></div>
          </div>
          <Button className="w-full" onClick={() => save.mutate()} disabled={!form.title || save.isPending}>{save.isPending ? "Saving..." : editingId ? "Update" : "Add Training"}</Button>
        </div>
      </DialogContent></Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} onConfirm={() => deleteId && del.mutate(deleteId)} />
    </div>
  );
}
