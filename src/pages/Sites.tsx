import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, MapPin, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { ExportButton } from "@/components/ExportButton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusFilter } from "@/components/StatusFilter";
import { ComboboxSelect } from "@/components/ComboboxSelect";

export default function Sites() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", location: "", emirate: "Dubai", type: "industrial", gps_coordinates: "", status: "active" });

  const { data = [], isLoading } = useQuery({
    queryKey: ["sites"],
    queryFn: async () => { const { data } = await (supabase as any).from("sites").select("*, clients(name)").order("created_at", { ascending: false }); return data || []; },
  });

  const resetForm = () => setForm({ name: "", location: "", emirate: "Dubai", type: "industrial", gps_coordinates: "", status: "active" });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { name: form.name, location: form.location, emirate: form.emirate, type: form.type, gps_coordinates: form.gps_coordinates || null, status: form.status };
      if (editingId) {
        const { error } = await (supabase as any).from("sites").update(payload).eq("id", editingId);
        if (error) throw error;
        await logAudit("Updated site", form.name, "sites");
      } else {
        const { error } = await (supabase as any).from("sites").insert(payload);
        if (error) throw error;
        await logAudit("Created site", `${form.name} — ${form.emirate}`, "sites");
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sites"] }); toast.success(editingId ? "Updated" : "Added"); setOpen(false); setEditingId(null); resetForm(); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const site = data.find((r: any) => r.id === id);
      const { error } = await (supabase as any).from("sites").delete().eq("id", id);
      if (error) throw error;
      await logAudit("Deleted site", site?.name, "sites");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sites"] }); toast.success("Deleted"); setDeleteId(null); },
  });

  const handleEdit = (r: any) => {
    setEditingId(r.id);
    setForm({ name: r.name, location: r.location || "", emirate: r.emirate || "Dubai", type: r.type || "industrial", gps_coordinates: r.gps_coordinates || "", status: r.status || "active" });
    setOpen(true);
  };

  const statusCounts = data.reduce((a: Record<string, number>, r: any) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {});

  const filtered = data
    .filter((r: any) => r.name?.toLowerCase().includes(search.toLowerCase()) || r.location?.toLowerCase().includes(search.toLowerCase()))
    .filter((r: any) => statusFilter === "all" || r.status === statusFilter);
  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><MapPin className="h-7 w-7 text-primary" /><h1 className="text-2xl font-bold">Sites & Locations</h1></div>
        <div className="flex gap-2">
          <ExportButton data={data} filename="sites" />
          <Button onClick={() => { resetForm(); setEditingId(null); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add Site</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Sites</p><p className="text-2xl font-semibold mt-1">{data.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Active</p><p className="text-2xl font-semibold mt-1 text-success">{statusCounts.active || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Emirates</p><p className="text-2xl font-semibold mt-1">{new Set(data.map((r: any) => r.emirate).filter(Boolean)).size}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Types</p><p className="text-2xl font-semibold mt-1">{new Set(data.map((r: any) => r.type).filter(Boolean)).size}</p></CardContent></Card>
      </div>

      <StatusFilter statuses={[{value:"all",label:"All",count:data.length},{value:"active",label:"Active",count:statusCounts.active||0},{value:"inactive",label:"Inactive",count:statusCounts.inactive||0}]} selected={statusFilter} onSelect={setStatusFilter} />

      <Card><CardContent className="pt-6">
        <div className="mb-4 relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No sites</p> : (
          <>
          <Table><TableHeader><TableRow>
            <SortableHeader label="Site Name" sortKey="name" direction={getSortDirection("name")} onToggle={toggleSort} />
            <SortableHeader label="Client" sortKey="clients.name" direction={getSortDirection("clients.name")} onToggle={toggleSort} />
            <SortableHeader label="Emirate" sortKey="emirate" direction={getSortDirection("emirate")} onToggle={toggleSort} />
            <SortableHeader label="Type" sortKey="type" direction={getSortDirection("type")} onToggle={toggleSort} />
            <SortableHeader label="Status" sortKey="status" direction={getSortDirection("status")} onToggle={toggleSort} />
            <SortableHeader label="Actions" sortKey="" direction={null} onToggle={() => {}} />
          </TableRow></TableHeader>
            <TableBody>{pageData.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}<br/><span className="text-xs text-muted-foreground">{r.location}</span></TableCell>
                <TableCell>{r.clients?.name || "—"}</TableCell>
                <TableCell>{r.emirate}</TableCell>
                <TableCell><Badge variant="outline">{r.type}</Badge></TableCell>
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
        <DialogHeader><DialogTitle>{editingId ? "Edit" : "Add"} Site</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Site Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
          <div><Label>Location</Label><Input value={form.location} onChange={e => setForm({...form, location: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Emirate</Label><ComboboxSelect value={form.emirate} onChange={v => setForm({...form, emirate: v})} options={["Abu Dhabi","Dubai","Sharjah","Ajman","RAK","UAQ","Fujairah"]} placeholder="Select emirate" /></div>
            <div><Label>Type</Label><ComboboxSelect value={form.type} onChange={v => setForm({...form, type: v})} options={["office","industrial","residential","camp","commercial"]} placeholder="Select type" /></div>
          </div>
          <div><Label>GPS Coordinates</Label><Input value={form.gps_coordinates} onChange={e => setForm({...form, gps_coordinates: e.target.value})} placeholder="e.g. 25.2048,55.2708" /></div>
          <Button className="w-full" onClick={() => save.mutate()} disabled={!form.name || save.isPending}>{save.isPending ? "Saving..." : editingId ? "Update" : "Add Site"}</Button>
        </div>
      </DialogContent></Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} onConfirm={() => deleteId && del.mutate(deleteId)} />
    </div>
  );
}
