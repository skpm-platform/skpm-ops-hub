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
import { Plus, Search, Shield, Pencil, Trash2, Eye, AlertTriangle, Flame, Droplets, HardHat, LayoutGrid, List, TrendingDown, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { ComboboxSelect } from "@/components/ComboboxSelect";
import { StatusFilter } from "@/components/StatusFilter";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ExportButton } from "@/components/ExportButton";
import { format, differenceInDays, parseISO } from "date-fns";

const typeOptions = [
  { value: "near_miss", label: "Near Miss" }, { value: "injury", label: "Injury" },
  { value: "property_damage", label: "Property Damage" }, { value: "environmental", label: "Environmental" },
  { value: "fire", label: "Fire" }, { value: "chemical_spill", label: "Chemical Spill" },
];

const typeIcons: Record<string, any> = {
  near_miss: AlertTriangle, injury: HardHat, property_damage: AlertTriangle,
  environmental: Droplets, fire: Flame, chemical_spill: Droplets,
};
const typeColors: Record<string, string> = {
  near_miss: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  injury: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  property_damage: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  environmental: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  fire: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  chemical_spill: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};
const statusColors: Record<string, string> = {
  open: "bg-destructive/10 text-destructive border-destructive/20",
  investigating: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  closed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

const emptyForm = { type: "near_miss", description: "", injured_person: "", action_taken: "", date: "", status: "open" };

export default function HSE() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  const { data = [], isLoading } = useQuery({
    queryKey: ["hse"],
    queryFn: async () => { const { data } = await supabase.from("hse_incidents").select("*").order("created_at", { ascending: false }); return data || []; },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (editingId) {
        const { error } = await supabase.from("hse_incidents").update(form).eq("id", editingId);
        if (error) throw error;
        await logAudit("Updated HSE incident", form.type);
      } else {
        const { error } = await supabase.from("hse_incidents").insert({ ...form, reported_by: user?.id });
        if (error) throw error;
        await logAudit("Reported HSE incident", form.type);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hse"] }); toast.success(editingId ? "Updated" : "Incident reported"); setOpen(false); setEditingId(null); setForm(emptyForm); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("hse_incidents").delete().eq("id", id);
      if (error) throw error;
      await logAudit("Deleted HSE incident", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hse"] }); toast.success("Deleted"); setDeleteId(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const handleEdit = (r: any) => {
    setEditingId(r.id);
    setForm({ type: r.type || "near_miss", description: r.description || "", injured_person: r.injured_person || "", action_taken: r.action_taken || "", date: r.date || "", status: r.status || "open" });
    setOpen(true);
  };

  const filtered = data.filter((r: any) => {
    const matchSearch = JSON.stringify(r).toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openCount = data.filter((r: any) => r.status === "open").length;
  const closedCount = data.filter((r: any) => r.status === "closed").length;
  const injuryCount = data.filter((r: any) => r.type === "injury").length;
  const investigatingCount = data.filter((r: any) => r.status === "investigating").length;
  const closureRate = data.length > 0 ? Math.round((closedCount / data.length) * 100) : 0;

  // Days since last incident
  const sortedByDate = [...data].filter((r: any) => r.date).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const daysSinceLast = sortedByDate.length > 0 ? differenceInDays(new Date(), parseISO(sortedByDate[0].date)) : null;

  const statuses = [
    { value: "all", label: "All", count: data.length },
    { value: "open", label: "Open", count: openCount },
    { value: "investigating", label: "Investigating", count: investigatingCount },
    { value: "closed", label: "Closed", count: closedCount },
  ];

  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

  const TypeIcon = ({ type }: { type: string }) => {
    const Icon = typeIcons[type] || AlertTriangle;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center"><Shield className="h-6 w-6 text-destructive" /></div>
          <div><h1 className="text-2xl font-bold">Health & Safety</h1><p className="text-sm text-muted-foreground">{data.length} incidents recorded</p></div>
        </div>
        <div className="flex gap-2">
          <div className="flex border rounded-md">
            <Button variant={viewMode === "table" ? "secondary" : "ghost"} size="icon" className="h-9 w-9 rounded-r-none" onClick={() => setViewMode("table")}><List className="h-4 w-4" /></Button>
            <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon" className="h-9 w-9 rounded-l-none" onClick={() => setViewMode("grid")}><LayoutGrid className="h-4 w-4" /></Button>
          </div>
          <ExportButton data={filtered} filename="hse-incidents" columns={[{ key: "date", label: "Date" }, { key: "type", label: "Type" }, { key: "description", label: "Description" }, { key: "status", label: "Status" }]} />
          <Button size="sm" className="h-9" onClick={() => { setEditingId(null); setForm(emptyForm); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />Report Incident</Button>
        </div>
      </div>

      {/* Safety Score Banner */}
      {daysSinceLast !== null && (
        <Card className={`border-2 ${daysSinceLast >= 30 ? "border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20" : daysSinceLast >= 7 ? "border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20" : "border-destructive/30 bg-destructive/5"}`}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className={`h-14 w-14 rounded-full flex items-center justify-center text-xl font-bold ${daysSinceLast >= 30 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400" : daysSinceLast >= 7 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400" : "bg-destructive/10 text-destructive"}`}>
              {daysSinceLast}
            </div>
            <div>
              <p className="font-semibold">Days Since Last Incident</p>
              <p className="text-sm text-muted-foreground">{daysSinceLast >= 30 ? "Excellent safety record! Keep it up." : daysSinceLast >= 7 ? "Good progress. Stay vigilant." : "Recent incident reported. Review safety measures."}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-5">
        <Card className="hover:shadow-md transition-shadow"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p>
          <p className="text-2xl font-bold mt-1">{data.length}</p>
        </CardContent></Card>
        <Card className="hover:shadow-md transition-shadow"><CardContent className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Open</p>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </div>
          <p className="text-2xl font-bold text-destructive mt-1">{openCount}</p>
        </CardContent></Card>
        <Card className="hover:shadow-md transition-shadow"><CardContent className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Investigating</p>
            <Search className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-1">{investigatingCount}</p>
        </CardContent></Card>
        <Card className="hover:shadow-md transition-shadow"><CardContent className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Injuries</p>
            <HardHat className="h-4 w-4 text-destructive" />
          </div>
          <p className="text-2xl font-bold text-destructive mt-1">{injuryCount}</p>
        </CardContent></Card>
        <Card className="hover:shadow-md transition-shadow"><CardContent className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Closure Rate</p>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{closureRate}%</p>
          <Progress value={closureRate} className="mt-2 h-1.5" />
        </CardContent></Card>
      </div>

      <Card><CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search incidents..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
          <StatusFilter statuses={statuses} selected={statusFilter} onSelect={setStatusFilter} />
        </div>

        {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No incidents found</p> : viewMode === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pageData.map((r: any) => (
              <Card key={r.id} className="hover:shadow-md transition-all group cursor-pointer" onClick={() => { setViewing(r); setViewOpen(true); }}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${typeColors[r.type] || "bg-muted"}`}>
                      <TypeIcon type={r.type} />
                    </div>
                    <Badge className={`text-xs ${statusColors[r.status] || ""}`}>{r.status}</Badge>
                  </div>
                  <div>
                    <p className="font-semibold capitalize">{r.type?.replace("_", " ")}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{r.description || "No description"}</p>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                    <span>{r.date ? format(parseISO(r.date), "MMM dd, yyyy") : "No date"}</span>
                    {r.injured_person && <span className="text-destructive font-medium">Injury: {r.injured_person}</span>}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleEdit(r)}><Pencil className="h-3 w-3 mr-1" />Edit</Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => setDeleteId(r.id)}><Trash2 className="h-3 w-3 mr-1" />Delete</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table><TableHeader><TableRow>
                <SortableHeader label="Date" sortKey="date" direction={getSortDirection("date")} onToggle={toggleSort} />
                <SortableHeader label="Type" sortKey="type" direction={getSortDirection("type")} onToggle={toggleSort} />
                <SortableHeader label="Injured Person" sortKey="injured_person" direction={getSortDirection("injured_person")} onToggle={toggleSort} />
                <SortableHeader label="Description" sortKey="description" direction={getSortDirection("description")} onToggle={toggleSort} />
                <SortableHeader label="Status" sortKey="status" direction={getSortDirection("status")} onToggle={toggleSort} />
                <SortableHeader label="Actions" sortKey="" direction={null} onToggle={() => {}} />
              </TableRow></TableHeader>
                <TableBody>{pageData.map((r: any) => (
                  <TableRow key={r.id} className="group">
                    <TableCell className="text-sm">{r.date ? format(parseISO(r.date), "MMM dd, yyyy") : "—"}</TableCell>
                    <TableCell>
                      <Badge className={`gap-1 ${typeColors[r.type] || ""}`}>
                        <TypeIcon type={r.type} />
                        {r.type?.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>{r.injured_person ? <span className="text-destructive font-medium">{r.injured_person}</span> : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="max-w-xs truncate">{r.description || "—"}</TableCell>
                    <TableCell><Badge className={statusColors[r.status] || ""}>{r.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setViewing(r); setViewOpen(true); }}><Eye className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>))}</TableBody></Table>
            </div>
          </>
        )}
        <DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
      </CardContent></Card>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditingId(null); setForm(emptyForm); } }}><DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editingId ? "Edit Incident" : "Report Incident"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
          <div><Label>Type</Label><ComboboxSelect value={form.type} onValueChange={v => setForm({ ...form, type: v })} options={typeOptions} placeholder="Select or type..." /></div>
          {editingId && <div><Label>Status</Label><Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="open">Open</SelectItem><SelectItem value="investigating">Investigating</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent></Select></div>}
          <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          <div><Label>Injured Person</Label><Input value={form.injured_person} onChange={e => setForm({ ...form, injured_person: e.target.value })} placeholder="If applicable" /></div>
          <div><Label>Action Taken</Label><Textarea value={form.action_taken} onChange={e => setForm({ ...form, action_taken: e.target.value })} /></div>
          <Button className="w-full h-9" onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving..." : editingId ? "Update" : "Submit Report"}</Button>
        </div>
      </DialogContent></Dialog>

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}><DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Incident Details</DialogTitle></DialogHeader>
        {viewing && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${typeColors[viewing.type] || "bg-muted"}`}>
                <TypeIcon type={viewing.type} />
              </div>
              <div>
                <p className="font-semibold capitalize text-lg">{viewing.type?.replace("_", " ")}</p>
                <Badge className={statusColors[viewing.status] || ""}>{viewing.status}</Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-muted-foreground text-xs">Date</p><p className="font-medium">{viewing.date ? format(parseISO(viewing.date), "MMM dd, yyyy") : "—"}</p></div>
              <div><p className="text-muted-foreground text-xs">Injured Person</p><p className="font-medium">{viewing.injured_person || "None"}</p></div>
            </div>
            {viewing.description && <div className="text-sm"><p className="text-muted-foreground text-xs mb-1">Description</p><p className="bg-muted/50 rounded-md p-3">{viewing.description}</p></div>}
            {viewing.action_taken && <div className="text-sm"><p className="text-muted-foreground text-xs mb-1">Action Taken</p><p className="bg-emerald-50 dark:bg-emerald-950/20 rounded-md p-3 text-emerald-700 dark:text-emerald-400">{viewing.action_taken}</p></div>}
          </div>
        )}
      </DialogContent></Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete Incident?" onConfirm={() => deleteId && remove.mutate(deleteId)} />
    </div>
  );
}
