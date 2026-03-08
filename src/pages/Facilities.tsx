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
import { Plus, Search, Building, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { ExportButton } from "@/components/ExportButton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusFilter } from "@/components/StatusFilter";
import { ComboboxSelect } from "@/components/ComboboxSelect";

export default function Facilities() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", location: "", emirate: "Dubai", type: "office", area_sqm: "", contract_type: "amc", status: "active" });

  const { data = [], isLoading } = useQuery({
    queryKey: ["facilities"],
    queryFn: async () => { const { data } = await (supabase as any).from("facilities").select("*, clients(name)").order("created_at", { ascending: false }); return data || []; },
  });

  const resetForm = () => setForm({ name: "", location: "", emirate: "Dubai", type: "office", area_sqm: "", contract_type: "amc", status: "active" });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { name: form.name, location: form.location, emirate: form.emirate, type: form.type, area_sqm: parseFloat(form.area_sqm) || null, contract_type: form.contract_type, status: form.status };
      if (editingId) { const { error } = await (supabase as any).from("facilities").update(payload).eq("id", editingId); if (error) throw error; }
      else { const { error } = await (supabase as any).from("facilities").insert(payload); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["facilities"] }); toast.success(editingId ? "Updated" : "Added"); setOpen(false); setEditingId(null); resetForm(); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase as any).from("facilities").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["facilities"] }); toast.success("Deleted"); setDeleteId(null); },
  });

  const handleEdit = (r: any) => {
    setEditingId(r.id);
    setForm({ name: r.name, location: r.location || "", emirate: r.emirate || "Dubai", type: r.type || "office", area_sqm: String(r.area_sqm || ""), contract_type: r.contract_type || "amc", status: r.status || "active" });
    setOpen(true);
  };

  const statusCounts = data.reduce((a: Record<string, number>, r: any) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {});
  const totalArea = data.reduce((s: number, r: any) => s + (r.area_sqm || 0), 0);

  const filtered = data
    .filter((r: any) => r.name?.toLowerCase().includes(search.toLowerCase()) || r.location?.toLowerCase().includes(search.toLowerCase()))
    .filter((r: any) => statusFilter === "all" || r.status === statusFilter);
  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><Building className="h-7 w-7 text-primary" /><h1 className="text-2xl font-bold">Facilities</h1></div>
        <div className="flex gap-2">
          <ExportButton data={data} filename="facilities" />
          <Button onClick={() => { resetForm(); setEditingId(null); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add Facility</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Facilities</p><p className="text-2xl font-semibold mt-1">{data.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Area</p><p className="text-2xl font-semibold mt-1">{totalArea.toLocaleString()} sqm</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Active</p><p className="text-2xl font-semibold mt-1 text-success">{statusCounts.active || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Emirates</p><p className="text-2xl font-semibold mt-1">{new Set(data.map((r: any) => r.emirate).filter(Boolean)).size}</p></CardContent></Card>
      </div>

      <StatusFilter value={statusFilter} onChange={setStatusFilter} counts={statusCounts} options={["active", "inactive"]} />

      <Card><CardContent className="pt-6">
        <div className="mb-4 relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No facilities</p> : (
          <>
          <Table><TableHeader><TableRow>
            <SortableHeader label="Name" sortKey="name" direction={getSortDirection("name")} onToggle={toggleSort} />
            <SortableHeader label="Emirate" sortKey="emirate" direction={getSortDirection("emirate")} onToggle={toggleSort} />
            <SortableHeader label="Type" sortKey="type" direction={getSortDirection("type")} onToggle={toggleSort} />
            <SortableHeader label="Area (sqm)" sortKey="area_sqm" direction={getSortDirection("area_sqm")} onToggle={toggleSort} />
            <SortableHeader label="Contract" sortKey="contract_type" direction={getSortDirection("contract_type")} onToggle={toggleSort} />
            <SortableHeader label="Status" sortKey="status" direction={getSortDirection("status")} onToggle={toggleSort} />
            <SortableHeader label="Actions" sortKey="" direction={null} onToggle={() => {}} />
          </TableRow></TableHeader>
            <TableBody>{pageData.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}<br/><span className="text-xs text-muted-foreground">{r.location}</span></TableCell>
                <TableCell>{r.emirate}</TableCell>
                <TableCell><Badge variant="outline">{r.type}</Badge></TableCell>
                <TableCell>{r.area_sqm?.toLocaleString() || "—"}</TableCell>
                <TableCell>{r.contract_type}</TableCell>
                <TableCell><Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(r)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}</TableBody></Table>
          <DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
          </>
        )}
      </CardContent></Card>

      <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { setEditingId(null); resetForm(); } }}><DialogContent>
        <DialogHeader><DialogTitle>{editingId ? "Edit" : "Add"} Facility</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
          <div><Label>Location</Label><Input value={form.location} onChange={e => setForm({...form, location: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Emirate</Label><ComboboxSelect value={form.emirate} onChange={v => setForm({...form, emirate: v})} options={["Abu Dhabi","Dubai","Sharjah","Ajman","RAK","UAQ","Fujairah"]} placeholder="Select emirate" /></div>
            <div><Label>Type</Label><ComboboxSelect value={form.type} onChange={v => setForm({...form, type: v})} options={["office","industrial","residential","commercial","warehouse"]} placeholder="Select type" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Area (sqm)</Label><Input type="number" value={form.area_sqm} onChange={e => setForm({...form, area_sqm: e.target.value})} /></div>
            <div><Label>Contract Type</Label><ComboboxSelect value={form.contract_type} onChange={v => setForm({...form, contract_type: v})} options={["amc","project","lease","service"]} placeholder="Select" /></div>
          </div>
          <div><Label>Status</Label><Select value={form.status} onValueChange={v => setForm({...form, status: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select></div>
          <Button className="w-full" onClick={() => save.mutate()} disabled={!form.name || save.isPending}>{save.isPending ? "Saving..." : editingId ? "Update" : "Add"}</Button>
        </div>
      </DialogContent></Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} onConfirm={() => deleteId && del.mutate(deleteId)} />
    </div>
  );
}
