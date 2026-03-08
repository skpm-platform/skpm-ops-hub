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
import { Plus, Search, Home, Pencil, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { ExportButton } from "@/components/ExportButton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusFilter } from "@/components/StatusFilter";

export default function Accommodation() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewItem, setViewItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ camp_name: "", location: "", total_beds: "", occupied_beds: "", cost_per_bed: "", status: "active" });

  const { data = [], isLoading } = useQuery({
    queryKey: ["accommodations"],
    queryFn: async () => { const { data } = await (supabase as any).from("accommodations").select("*").order("created_at", { ascending: false }); return data || []; },
  });

  const resetForm = () => setForm({ camp_name: "", location: "", total_beds: "", occupied_beds: "", cost_per_bed: "", status: "active" });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { camp_name: form.camp_name, location: form.location, total_beds: parseInt(form.total_beds) || 0, occupied_beds: parseInt(form.occupied_beds) || 0, cost_per_bed: parseFloat(form.cost_per_bed) || 0, status: form.status };
      if (editingId) { const { error } = await (supabase as any).from("accommodations").update(payload).eq("id", editingId); if (error) throw error; }
      else { const { error } = await (supabase as any).from("accommodations").insert(payload); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["accommodations"] }); toast.success(editingId ? "Updated" : "Added"); setOpen(false); setEditingId(null); resetForm(); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase as any).from("accommodations").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["accommodations"] }); toast.success("Deleted"); setDeleteId(null); },
  });

  const handleEdit = (r: any) => {
    setEditingId(r.id);
    setForm({ camp_name: r.camp_name, location: r.location || "", total_beds: String(r.total_beds || ""), occupied_beds: String(r.occupied_beds || ""), cost_per_bed: String(r.cost_per_bed || ""), status: r.status || "active" });
    setOpen(true);
  };

  const totalBeds = data.reduce((s: number, r: any) => s + (r.total_beds || 0), 0);
  const totalOccupied = data.reduce((s: number, r: any) => s + (r.occupied_beds || 0), 0);
  const statusCounts = data.reduce((a: Record<string, number>, r: any) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {});

  const filtered = data
    .filter((r: any) => r.camp_name?.toLowerCase().includes(search.toLowerCase()) || r.location?.toLowerCase().includes(search.toLowerCase()))
    .filter((r: any) => statusFilter === "all" || r.status === statusFilter);
  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><Home className="h-7 w-7 text-primary" /><h1 className="text-2xl font-bold">Accommodation</h1></div>
        <div className="flex gap-2">
          <ExportButton data={data} filename="accommodation" />
          <Button onClick={() => { resetForm(); setEditingId(null); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add Camp</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Camps</p><p className="text-2xl font-semibold mt-1">{data.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Beds</p><p className="text-2xl font-semibold mt-1">{totalBeds}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Occupied</p><p className="text-2xl font-semibold mt-1 text-warning">{totalOccupied}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Occupancy</p><p className="text-2xl font-semibold mt-1">{totalBeds ? Math.round(totalOccupied / totalBeds * 100) : 0}%</p></CardContent></Card>
      </div>

      <StatusFilter value={statusFilter} onChange={setStatusFilter} counts={statusCounts} options={["active", "inactive", "maintenance"]} />

      <Card><CardContent className="pt-6">
        <div className="mb-4 relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No accommodations</p> : (
          <>
          <Table><TableHeader><TableRow>
            <SortableHeader label="Camp" sortKey="camp_name" direction={getSortDirection("camp_name")} onToggle={toggleSort} />
            <SortableHeader label="Location" sortKey="location" direction={getSortDirection("location")} onToggle={toggleSort} />
            <SortableHeader label="Total Beds" sortKey="total_beds" direction={getSortDirection("total_beds")} onToggle={toggleSort} />
            <SortableHeader label="Occupied" sortKey="occupied_beds" direction={getSortDirection("occupied_beds")} onToggle={toggleSort} />
            <SortableHeader label="Available" sortKey="total_beds" direction={null} onToggle={() => {}} />
            <SortableHeader label="Occupancy" sortKey="occupied_beds" direction={null} onToggle={() => {}} />
            <SortableHeader label="Cost/Bed" sortKey="cost_per_bed" direction={getSortDirection("cost_per_bed")} onToggle={toggleSort} />
            <SortableHeader label="Actions" sortKey="" direction={null} onToggle={() => {}} />
          </TableRow></TableHeader>
            <TableBody>{pageData.map((r: any) => {
              const avail = (r.total_beds || 0) - (r.occupied_beds || 0);
              const occ = r.total_beds ? Math.round((r.occupied_beds || 0) / r.total_beds * 100) : 0;
              return (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.camp_name}</TableCell>
                <TableCell>{r.location || "—"}</TableCell>
                <TableCell>{r.total_beds}</TableCell>
                <TableCell>{r.occupied_beds || 0}</TableCell>
                <TableCell>{avail}</TableCell>
                <TableCell><Badge variant={occ > 90 ? "destructive" : "default"}>{occ}%</Badge></TableCell>
                <TableCell>AED {r.cost_per_bed?.toLocaleString()}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setViewItem(r)}><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(r)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            );})}</TableBody></Table>
          <DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
          </>
        )}
      </CardContent></Card>

      <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { setEditingId(null); resetForm(); } }}><DialogContent>
        <DialogHeader><DialogTitle>{editingId ? "Edit" : "Add"} Camp</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Camp Name</Label><Input value={form.camp_name} onChange={e => setForm({...form, camp_name: e.target.value})} /></div>
          <div><Label>Location</Label><Input value={form.location} onChange={e => setForm({...form, location: e.target.value})} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Total Beds</Label><Input type="number" value={form.total_beds} onChange={e => setForm({...form, total_beds: e.target.value})} /></div>
            <div><Label>Occupied</Label><Input type="number" value={form.occupied_beds} onChange={e => setForm({...form, occupied_beds: e.target.value})} /></div>
            <div><Label>Cost/Bed</Label><Input type="number" value={form.cost_per_bed} onChange={e => setForm({...form, cost_per_bed: e.target.value})} /></div>
          </div>
          <div><Label>Status</Label><Select value={form.status} onValueChange={v => setForm({...form, status: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="maintenance">Maintenance</SelectItem></SelectContent></Select></div>
          <Button className="w-full" onClick={() => save.mutate()} disabled={!form.camp_name || save.isPending}>{save.isPending ? "Saving..." : editingId ? "Update" : "Add Camp"}</Button>
        </div>
      </DialogContent></Dialog>

      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}><DialogContent>
        <DialogHeader><DialogTitle>Camp Details</DialogTitle></DialogHeader>
        {viewItem && (
          <div className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">Camp:</span> {viewItem.camp_name}</div>
            <div><span className="text-muted-foreground">Location:</span> {viewItem.location || "—"}</div>
            <div><span className="text-muted-foreground">Total Beds:</span> {viewItem.total_beds}</div>
            <div><span className="text-muted-foreground">Occupied:</span> {viewItem.occupied_beds || 0}</div>
            <div><span className="text-muted-foreground">Cost/Bed:</span> AED {viewItem.cost_per_bed}</div>
            <div><span className="text-muted-foreground">Status:</span> <Badge>{viewItem.status}</Badge></div>
          </div>
        )}
      </DialogContent></Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} onConfirm={() => deleteId && del.mutate(deleteId)} />
    </div>
  );
}
