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
import { Plus, Search, Truck, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { ExportButton } from "@/components/ExportButton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusFilter } from "@/components/StatusFilter";
import { ComboboxSelect } from "@/components/ComboboxSelect";

export default function Transport() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ make_model: "", plate_number: "", type: "car", capacity: "", registration_expiry: "", status: "active" });

  const { data = [], isLoading } = useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => { const { data } = await (supabase as any).from("vehicles").select("*").order("created_at", { ascending: false }); return data || []; },
  });

  const resetForm = () => setForm({ make_model: "", plate_number: "", type: "car", capacity: "", registration_expiry: "", status: "active" });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { make_model: form.make_model, plate_number: form.plate_number, type: form.type, capacity: parseInt(form.capacity) || null, registration_expiry: form.registration_expiry || null, status: form.status, ...(editingId ? {} : { vehicle_no: `VEH-${Date.now().toString().slice(-6)}` }) };
      if (editingId) { const { error } = await (supabase as any).from("vehicles").update(payload).eq("id", editingId); if (error) throw error; }
      else { const { error } = await (supabase as any).from("vehicles").insert(payload); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vehicles"] }); toast.success(editingId ? "Updated" : "Added"); setOpen(false); setEditingId(null); resetForm(); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase as any).from("vehicles").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vehicles"] }); toast.success("Deleted"); setDeleteId(null); },
  });

  const handleEdit = (r: any) => {
    setEditingId(r.id);
    setForm({ make_model: r.make_model || "", plate_number: r.plate_number || "", type: r.type || "car", capacity: String(r.capacity || ""), registration_expiry: r.registration_expiry || "", status: r.status || "active" });
    setOpen(true);
  };

  const statusCounts = data.reduce((a: Record<string, number>, r: any) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {});

  const filtered = data
    .filter((r: any) => JSON.stringify(r).toLowerCase().includes(search.toLowerCase()))
    .filter((r: any) => statusFilter === "all" || r.status === statusFilter);
  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><Truck className="h-7 w-7 text-primary" /><h1 className="text-2xl font-bold">Transport</h1></div>
        <div className="flex gap-2">
          <ExportButton data={data} filename="transport" />
          <Button onClick={() => { resetForm(); setEditingId(null); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add Vehicle</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Vehicles</p><p className="text-2xl font-semibold mt-1">{data.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Active</p><p className="text-2xl font-semibold mt-1 text-success">{statusCounts.active || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Maintenance</p><p className="text-2xl font-semibold mt-1 text-warning">{statusCounts.maintenance || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Capacity</p><p className="text-2xl font-semibold mt-1">{data.reduce((s: number, r: any) => s + (r.capacity || 0), 0)}</p></CardContent></Card>
      </div>

      <StatusFilter statuses={[{value:"all",label:"All",count:data.length},{value:"active",label:"Active",count:statusCounts.active||0},{value:"maintenance",label:"Maintenance",count:statusCounts.maintenance||0},{value:"inactive",label:"Inactive",count:statusCounts.inactive||0}]} selected={statusFilter} onSelect={setStatusFilter} />

      <Card><CardContent className="pt-6">
        <div className="mb-4 relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No vehicles</p> : (
          <>
          <Table><TableHeader><TableRow>
            <SortableHeader label="Vehicle #" sortKey="vehicle_no" direction={getSortDirection("vehicle_no")} onToggle={toggleSort} />
            <SortableHeader label="Make/Model" sortKey="make_model" direction={getSortDirection("make_model")} onToggle={toggleSort} />
            <SortableHeader label="Plate" sortKey="plate_number" direction={getSortDirection("plate_number")} onToggle={toggleSort} />
            <SortableHeader label="Type" sortKey="type" direction={getSortDirection("type")} onToggle={toggleSort} />
            <SortableHeader label="Capacity" sortKey="capacity" direction={getSortDirection("capacity")} onToggle={toggleSort} />
            <SortableHeader label="Reg Expiry" sortKey="registration_expiry" direction={getSortDirection("registration_expiry")} onToggle={toggleSort} />
            <SortableHeader label="Status" sortKey="status" direction={getSortDirection("status")} onToggle={toggleSort} />
            <SortableHeader label="Actions" sortKey="" direction={null} onToggle={() => {}} />
          </TableRow></TableHeader>
            <TableBody>{pageData.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs font-mono">{r.vehicle_no}</TableCell>
                <TableCell className="font-medium">{r.make_model}</TableCell>
                <TableCell>{r.plate_number}</TableCell>
                <TableCell><Badge variant="outline">{r.type}</Badge></TableCell>
                <TableCell>{r.capacity}</TableCell>
                <TableCell>{r.registration_expiry || "—"}</TableCell>
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
        <DialogHeader><DialogTitle>{editingId ? "Edit" : "Add"} Vehicle</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Make/Model</Label><Input value={form.make_model} onChange={e => setForm({...form, make_model: e.target.value})} /></div>
          <div><Label>Plate Number</Label><Input value={form.plate_number} onChange={e => setForm({...form, plate_number: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Type</Label><ComboboxSelect value={form.type} onChange={v => setForm({...form, type: v})} options={["bus","van","pickup","car","truck","crane","forklift"]} placeholder="Select type" /></div>
            <div><Label>Capacity</Label><Input type="number" value={form.capacity} onChange={e => setForm({...form, capacity: e.target.value})} /></div>
          </div>
          <div><Label>Registration Expiry</Label><Input type="date" value={form.registration_expiry} onChange={e => setForm({...form, registration_expiry: e.target.value})} /></div>
          <Button className="w-full" onClick={() => save.mutate()} disabled={!form.make_model || save.isPending}>{save.isPending ? "Saving..." : editingId ? "Update" : "Add Vehicle"}</Button>
        </div>
      </DialogContent></Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} onConfirm={() => deleteId && del.mutate(deleteId)} />
    </div>
  );
}
