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
import { Plus, Search, MapPin, Pencil, Trash2, Eye, LayoutGrid, List, Building2, Factory, Home, Warehouse, Globe , AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { ExportButton } from "@/components/ExportButton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusFilter } from "@/components/StatusFilter";
import { ComboboxSelect } from "@/components/ComboboxSelect";

const typeIcons: Record<string, any> = {
  office: Building2, industrial: Factory, residential: Home, camp: Warehouse, commercial: Globe,
};
const typeColors: Record<string, string> = {
  office: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  industrial: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  residential: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  camp: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  commercial: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};
const emirateColors: Record<string, string> = {
  "Dubai": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "Abu Dhabi": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "Sharjah": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "Ajman": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  "RAK": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  "UAQ": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  "Fujairah": "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
};

export default function Sites() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewing, setViewing] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", location: "", emirate: "Dubai", type: "industrial", gps_coordinates: "", status: "active" });

  const { data = [], isLoading , isError: dataLoadError} = useQuery({
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
  const emirateCounts = data.reduce((a: Record<string, number>, r: any) => { if (r.emirate) a[r.emirate] = (a[r.emirate] || 0) + 1; return a; }, {});
  const typeCounts = data.reduce((a: Record<string, number>, r: any) => { if (r.type) a[r.type] = (a[r.type] || 0) + 1; return a; }, {});

  const filtered = data
    .filter((r: any) => r.name?.toLowerCase().includes(search.toLowerCase()) || r.location?.toLowerCase().includes(search.toLowerCase()))
    .filter((r: any) => statusFilter === "all" || r.status === statusFilter);
  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

  const STypeIcon = ({ type }: { type: string }) => {
    const Icon = typeIcons[type] || MapPin;
    return <Icon className="h-4 w-4" />;
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
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><MapPin className="h-6 w-6 text-primary" /></div>
          <div><h1 className="text-2xl font-bold">Sites & Locations</h1><p className="text-sm text-muted-foreground">{data.length} sites across {Object.keys(emirateCounts).length} emirates</p></div>
        </div>
        <div className="flex gap-2">
          <div className="flex border rounded-md">
            <Button variant={viewMode === "table" ? "secondary" : "ghost"} size="icon" className="h-9 w-9 rounded-r-none" onClick={() => setViewMode("table")}><List className="h-4 w-4" /></Button>
            <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon" className="h-9 w-9 rounded-l-none" onClick={() => setViewMode("grid")}><LayoutGrid className="h-4 w-4" /></Button>
          </div>
          <ExportButton data={data} filename="sites" />
          <Button onClick={() => { resetForm(); setEditingId(null); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add Site</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Sites</p>
          <p className="text-2xl font-bold mt-1">{data.length}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {Object.entries(typeCounts).map(([type, count]) => (
              <Badge key={type} variant="outline" className="text-[10px] capitalize">{type}: {count as number}</Badge>
            ))}
          </div>
        </CardContent></Card>
        <Card className="hover:shadow-md transition-shadow"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Active Sites</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{statusCounts.active || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">{data.length > 0 ? Math.round(((statusCounts.active || 0) / data.length) * 100) : 0}% operational</p>
        </CardContent></Card>
        <Card className="hover:shadow-md transition-shadow"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Emirates</p>
          <p className="text-2xl font-bold mt-1">{Object.keys(emirateCounts).length}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {Object.entries(emirateCounts).slice(0, 3).map(([em, count]) => (
              <Badge key={em} className={`text-[10px] border-0 ${emirateColors[em] || "bg-muted"}`}>{em}: {count as number}</Badge>
            ))}
          </div>
        </CardContent></Card>
        <Card className="hover:shadow-md transition-shadow"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">With Clients</p>
          <p className="text-2xl font-bold mt-1">{data.filter((r: any) => r.clients?.name).length}</p>
          <p className="text-xs text-muted-foreground mt-1">Client-linked sites</p>
        </CardContent></Card>
      </div>

      <StatusFilter statuses={[{ value: "all", label: "All", count: data.length }, { value: "active", label: "Active", count: statusCounts.active || 0 }, { value: "inactive", label: "Inactive", count: statusCounts.inactive || 0 }]} selected={statusFilter} onSelect={setStatusFilter} />

      <Card><CardContent className="pt-6">
        <div className="mb-4 relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search sites..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>

        {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No sites found</p> : viewMode === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pageData.map((r: any) => (
              <Card key={r.id} className="hover:shadow-md transition-all group cursor-pointer" onClick={() => { setViewing(r); setViewOpen(true); }}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${typeColors[r.type] || "bg-muted"}`}>
                      <STypeIcon type={r.type} />
                    </div>
                    <Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status}</Badge>
                  </div>
                  <div>
                    <p className="font-semibold">{r.name}</p>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                      <MapPin className="h-3 w-3" />
                      <span>{r.location || "No location set"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[10px] border-0 ${emirateColors[r.emirate] || "bg-muted"}`}>{r.emirate}</Badge>
                    <Badge variant="outline" className="text-[10px] capitalize">{r.type}</Badge>
                  </div>
                  {r.clients?.name && (
                    <div className="text-xs bg-muted/50 rounded px-2 py-1">
                      <span className="text-muted-foreground">Client: </span>
                      <span className="font-medium">{r.clients.name}</span>
                    </div>
                  )}
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
            <Table><TableHeader><TableRow>
              <SortableHeader label="Site Name" sortKey="name" direction={getSortDirection("name")} onToggle={toggleSort} />
              <SortableHeader label="Client" sortKey="clients.name" direction={getSortDirection("clients.name")} onToggle={toggleSort} />
              <SortableHeader label="Emirate" sortKey="emirate" direction={getSortDirection("emirate")} onToggle={toggleSort} />
              <SortableHeader label="Type" sortKey="type" direction={getSortDirection("type")} onToggle={toggleSort} />
              <SortableHeader label="Status" sortKey="status" direction={getSortDirection("status")} onToggle={toggleSort} />
              <SortableHeader label="Actions" sortKey="" direction={null} onToggle={() => {}} />
            </TableRow></TableHeader>
              <TableBody>{pageData.map((r: any) => (
                <TableRow key={r.id} className="group">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={`h-7 w-7 rounded flex items-center justify-center shrink-0 ${typeColors[r.type] || "bg-muted"}`}>
                        <STypeIcon type={r.type} />
                      </div>
                      <div>
                        <p className="font-medium">{r.name}</p>
                        <p className="text-xs text-muted-foreground">{r.location}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{r.clients?.name || <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell><Badge className={`text-xs border-0 ${emirateColors[r.emirate] || "bg-muted"}`}>{r.emirate}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{r.type}</Badge></TableCell>
                  <TableCell><Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setViewing(r); setViewOpen(true); }}><Eye className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}</TableBody></Table>
          </>
        )}
        <DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
      </CardContent></Card>

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}><DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Site Details</DialogTitle></DialogHeader>
        {viewing && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${typeColors[viewing.type] || "bg-muted"}`}>
                <STypeIcon type={viewing.type} />
              </div>
              <div>
                <p className="font-semibold text-lg">{viewing.name}</p>
                <div className="flex gap-2 mt-1">
                  <Badge className={`text-xs border-0 ${emirateColors[viewing.emirate] || "bg-muted"}`}>{viewing.emirate}</Badge>
                  <Badge variant={viewing.status === "active" ? "default" : "secondary"}>{viewing.status}</Badge>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-muted-foreground text-xs">Location</p><p className="font-medium">{viewing.location || "—"}</p></div>
              <div><p className="text-muted-foreground text-xs">Type</p><p className="font-medium capitalize">{viewing.type}</p></div>
              <div><p className="text-muted-foreground text-xs">Client</p><p className="font-medium">{viewing.clients?.name || "—"}</p></div>
              <div><p className="text-muted-foreground text-xs">GPS</p><p className="font-medium">{viewing.gps_coordinates || "—"}</p></div>
            </div>
          </div>
        )}
      </DialogContent></Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { setEditingId(null); resetForm(); } }}><DialogContent>
        <DialogHeader><DialogTitle>{editingId ? "Edit" : "Add"} Site</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Site Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Location</Label><Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Emirate</Label><ComboboxSelect value={form.emirate} onChange={v => setForm({ ...form, emirate: v })} options={["Abu Dhabi", "Dubai", "Sharjah", "Ajman", "RAK", "UAQ", "Fujairah"]} placeholder="Select emirate" /></div>
            <div><Label>Type</Label><ComboboxSelect value={form.type} onChange={v => setForm({ ...form, type: v })} options={["office", "industrial", "residential", "camp", "commercial"]} placeholder="Select type" /></div>
          </div>
          <div><Label>GPS Coordinates</Label><Input value={form.gps_coordinates} onChange={e => setForm({ ...form, gps_coordinates: e.target.value })} placeholder="e.g. 25.2048,55.2708" /></div>
          {editingId && <div><Label>Status</Label><ComboboxSelect value={form.status} onChange={v => setForm({ ...form, status: v })} options={["active", "inactive"]} placeholder="Select status" /></div>}
          <Button className="w-full" onClick={() => save.mutate()} disabled={!form.name || save.isPending}>{save.isPending ? "Saving..." : editingId ? "Update" : "Add Site"}</Button>
        </div>
      </DialogContent></Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} onConfirm={() => deleteId && del.mutate(deleteId)} />
    </div>
  );
}
