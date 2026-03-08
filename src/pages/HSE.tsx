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
import { Plus, Search, Shield, Pencil, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { ComboboxSelect } from "@/components/ComboboxSelect";
import { StatusFilter } from "@/components/StatusFilter";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ExportButton } from "@/components/ExportButton";

const typeOptions = [
  { value: "near_miss", label: "Near Miss" }, { value: "injury", label: "Injury" },
  { value: "property_damage", label: "Property Damage" }, { value: "environmental", label: "Environmental" },
  { value: "fire", label: "Fire" }, { value: "chemical_spill", label: "Chemical Spill" },
];
const typeC: Record<string,string> = { near_miss: "bg-amber-100 text-amber-700", injury: "bg-red-100 text-red-700", property_damage: "bg-orange-100 text-orange-700", environmental: "bg-emerald-100 text-emerald-700" };
const emptyForm = { type: "near_miss", description: "", injured_person: "", action_taken: "", date: "", status: "open" };

export default function HSE() {
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

  const { data = [], isLoading } = useQuery({
    queryKey: ["hse"],
    queryFn: async () => { const { data } = await supabase.from("hse_incidents").select("*").order("created_at", { ascending: false }); return data || []; },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (editingId) {
        const { error } = await supabase.from("hse_incidents").update(form).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("hse_incidents").insert({ ...form, reported_by: user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hse"] }); toast.success(editingId ? "Updated" : "Incident reported"); setOpen(false); setEditingId(null); setForm(emptyForm); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("hse_incidents").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hse"] }); toast.success("Deleted"); setDeleteId(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const handleEdit = (r: any) => {
    setEditingId(r.id);
    setForm({ type: r.type||"near_miss", description: r.description||"", injured_person: r.injured_person||"", action_taken: r.action_taken||"", date: r.date||"", status: r.status||"open" });
    setOpen(true);
  };

  const filtered = data.filter((r: any) => {
    const matchSearch = JSON.stringify(r).toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statuses = [
    { value: "all", label: "All", count: data.length },
    { value: "open", label: "Open", count: data.filter((r: any) => r.status === "open").length },
    { value: "investigating", label: "Investigating", count: data.filter((r: any) => r.status === "investigating").length },
    { value: "closed", label: "Closed", count: data.filter((r: any) => r.status === "closed").length },
  ];

  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3"><Shield className="h-7 w-7 text-primary" /><div><h1 className="text-2xl font-bold">Health & Safety</h1><p className="text-sm text-muted-foreground">{data.length} incidents</p></div></div>
        <div className="flex gap-2">
          <ExportButton data={filtered} filename="hse-incidents" columns={[{key:"date",label:"Date"},{key:"type",label:"Type"},{key:"description",label:"Description"},{key:"status",label:"Status"}]} />
          <Button onClick={() => { setEditingId(null); setForm(emptyForm); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />Report Incident</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Incidents</p><p className="text-2xl font-bold">{data.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Open</p><p className="text-2xl font-bold text-destructive">{data.filter((r:any)=>r.status==="open").length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Injuries</p><p className="text-2xl font-bold text-amber-600">{data.filter((r:any)=>r.type==="injury").length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Closed</p><p className="text-2xl font-bold text-success">{data.filter((r:any)=>r.status==="closed").length}</p></CardContent></Card>
      </div>

      <Card><CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
          <StatusFilter statuses={statuses} selected={statusFilter} onSelect={setStatusFilter} />
        </div>
        {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No incidents</p> : (
          <>
          <div className="overflow-x-auto">
          <Table><TableHeader><TableRow>
            <SortableHeader label="Date" sortKey="date" direction={getSortDirection("date")} onToggle={toggleSort} />
            <SortableHeader label="Type" sortKey="type" direction={getSortDirection("type")} onToggle={toggleSort} />
            <SortableHeader label="Description" sortKey="description" direction={getSortDirection("description")} onToggle={toggleSort} />
            <SortableHeader label="Status" sortKey="status" direction={getSortDirection("status")} onToggle={toggleSort} />
            <SortableHeader label="Actions" sortKey="" direction={null} onToggle={() => {}} />
          </TableRow></TableHeader>
            <TableBody>{pageData.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell>{r.date || "—"}</TableCell>
                <TableCell><Badge className={typeC[r.type] || ""}>{r.type?.replace("_"," ")}</Badge></TableCell>
                <TableCell className="max-w-xs truncate">{r.description || "—"}</TableCell>
                <TableCell><Badge variant={r.status === "closed" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setViewing(r); setViewOpen(true); }}><Eye className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>))}</TableBody></Table>
          </div>
          <DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
          </>
        )}
      </CardContent></Card>

      <Dialog open={open} onOpenChange={(o)=>{setOpen(o);if(!o){setEditingId(null);setForm(emptyForm);}}}><DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editingId ? "Edit Incident" : "Report Incident"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
          <div><Label>Type</Label><ComboboxSelect value={form.type} onValueChange={v => setForm({...form, type: v})} options={typeOptions} placeholder="Select or type..." /></div>
          {editingId && <div><Label>Status</Label><Select value={form.status} onValueChange={v => setForm({...form, status: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="open">Open</SelectItem><SelectItem value="investigating">Investigating</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent></Select></div>}
          <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
          <div><Label>Injured Person</Label><Input value={form.injured_person} onChange={e => setForm({...form, injured_person: e.target.value})} placeholder="If applicable" /></div>
          <div><Label>Action Taken</Label><Textarea value={form.action_taken} onChange={e => setForm({...form, action_taken: e.target.value})} /></div>
          <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving..." : editingId ? "Update" : "Submit Report"}</Button>
        </div>
      </DialogContent></Dialog>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}><DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Incident Details</DialogTitle></DialogHeader>
        {viewing && (
          <div className="space-y-3 text-sm"><div className="grid grid-cols-2 gap-2">
            {[["Date",viewing.date],["Type",viewing.type?.replace("_"," ")],["Status",viewing.status],["Injured Person",viewing.injured_person]].map(([l,v])=>(
              <div key={l as string}><p className="text-muted-foreground text-xs">{l}</p><p className="font-medium capitalize">{v||"—"}</p></div>
            ))}
          </div>
          {viewing.description && <div><p className="text-muted-foreground text-xs">Description</p><p>{viewing.description}</p></div>}
          {viewing.action_taken && <div><p className="text-muted-foreground text-xs">Action Taken</p><p>{viewing.action_taken}</p></div>}
          </div>
        )}
      </DialogContent></Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete Incident?" onConfirm={() => deleteId && remove.mutate(deleteId)} />
    </div>
  );
}
