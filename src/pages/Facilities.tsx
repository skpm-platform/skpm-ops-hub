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
import { Plus, Search, Building, Pencil, Trash2, Eye, LayoutGrid, List, Factory, Home, Store, Warehouse as WarehouseIcon, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { ExportButton } from "@/components/ExportButton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusFilter } from "@/components/StatusFilter";
import { ComboboxSelect } from "@/components/ComboboxSelect";

const typeIcons: Record<string, any> = { office: Building, industrial: Factory, residential: Home, commercial: Store, warehouse: WarehouseIcon };
const emirateColors: Record<string, string> = { "Abu Dhabi": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", "Dubai": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", "Sharjah": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", "Ajman": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" };

export default function Facilities() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewItem, setViewItem] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
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
  const avgArea = data.length > 0 ? Math.round(totalArea / data.length) : 0;

  const filtered = data
    .filter((r: any) => r.name?.toLowerCase().includes(search.toLowerCase()) || r.location?.toLowerCase().includes(search.toLowerCase()))
    .filter((r: any) => statusFilter === "all" || r.status === statusFilter);
  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Building className="h-5 w-5 text-primary" /></div>
          <div><h1 className="text-2xl font-bold">Facilities</h1><p className="text-sm text-muted-foreground">{data.length} facilities • {totalArea.toLocaleString()} sqm total</p></div>
        </div>
        <div className="flex gap-2">
          <div className="flex border rounded-lg overflow-hidden">
            <Button variant={viewMode === "table" ? "default" : "ghost"} size="sm" className="h-9 rounded-none" onClick={() => setViewMode("table")}><List className="h-4 w-4" /></Button>
            <Button variant={viewMode === "grid" ? "default" : "ghost"} size="sm" className="h-9 rounded-none" onClick={() => setViewMode("grid")}><LayoutGrid className="h-4 w-4" /></Button>
          </div>
          <ExportButton data={data} filename="facilities" />
          <Button onClick={() => { resetForm(); setEditingId(null); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add Facility</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="group hover:shadow-md transition-all"><CardContent className="p-4">
          <div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Facilities</p><p className="text-2xl font-bold mt-1">{data.length}</p></div>
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform"><Building className="h-4 w-4 text-primary" /></div></div>
        </CardContent></Card>
        <Card className="group hover:shadow-md transition-all"><CardContent className="p-4">
          <div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Area</p><p className="text-2xl font-bold mt-1">{totalArea.toLocaleString()} sqm</p></div>
          <div className="h-9 w-9 rounded-lg bg-info/10 flex items-center justify-center group-hover:scale-110 transition-transform"><MapPin className="h-4 w-4 text-info" /></div></div>
          <p className="text-[11px] text-muted-foreground mt-2">Avg: {avgArea.toLocaleString()} sqm/facility</p>
        </CardContent></Card>
        <Card className="group hover:shadow-md transition-all"><CardContent className="p-4">
          <div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase tracking-wider">Active</p><p className="text-2xl font-bold mt-1 text-success">{statusCounts.active || 0}</p></div></div>
          <Progress value={data.length > 0 ? ((statusCounts.active || 0) / data.length) * 100 : 0} className="h-1.5 mt-2" />
        </CardContent></Card>
        <Card className="group hover:shadow-md transition-all"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Emirates</p>
          <p className="text-2xl font-bold mt-1">{new Set(data.map((r: any) => r.emirate).filter(Boolean)).size}</p>
          <p className="text-[11px] text-muted-foreground mt-2">{[...new Set(data.map((r: any) => r.type).filter(Boolean))].length} types</p>
        </CardContent></Card>
      </div>

      <StatusFilter statuses={[{value:"all",label:"All",count:data.length},{value:"active",label:"Active",count:statusCounts.active||0},{value:"inactive",label:"Inactive",count:statusCounts.inactive||0}]} selected={statusFilter} onSelect={setStatusFilter} />

      <div className="relative max-w-sm"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>

      {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No facilities</p> : viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r: any) => {
            const TypeIcon = typeIcons[r.type] || Building;
            return (
              <Card key={r.id} className="group hover:shadow-lg transition-all border hover:border-primary/20 overflow-hidden">
                <CardContent className="p-0">
                  <div className={`h-1 ${r.status === "active" ? "bg-success" : "bg-muted-foreground"}`} />
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><TypeIcon className="h-4 w-4 text-primary" /></div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm truncate">{r.name}</h3>
                          <p className="text-[11px] text-muted-foreground">{r.location || "—"}</p>
                        </div>
                      </div>
                      <Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className={`text-[10px] ${emirateColors[r.emirate] || ""} border-0`}>{r.emirate}</Badge>
                      <Badge variant="outline" className="text-[10px] capitalize">{r.type}</Badge>
                      {r.contract_type && <Badge variant="outline" className="text-[10px] uppercase">{r.contract_type}</Badge>}
                    </div>
                    {r.area_sqm && <p className="text-xs text-muted-foreground">Area: <span className="font-medium text-foreground">{r.area_sqm.toLocaleString()} sqm</span></p>}
                    {r.clients?.name && <p className="text-xs text-muted-foreground">Client: <span className="font-medium text-foreground">{r.clients.name}</span></p>}
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
            <SortableHeader label="Name" sortKey="name" direction={getSortDirection("name")} onToggle={toggleSort} />
            <SortableHeader label="Emirate" sortKey="emirate" direction={getSortDirection("emirate")} onToggle={toggleSort} />
            <SortableHeader label="Type" sortKey="type" direction={getSortDirection("type")} onToggle={toggleSort} />
            <SortableHeader label="Area (sqm)" sortKey="area_sqm" direction={getSortDirection("area_sqm")} onToggle={toggleSort} />
            <SortableHeader label="Contract" sortKey="contract_type" direction={getSortDirection("contract_type")} onToggle={toggleSort} />
            <SortableHeader label="Status" sortKey="status" direction={getSortDirection("status")} onToggle={toggleSort} />
            <SortableHeader label="Actions" sortKey="" direction={null} onToggle={() => {}} />
          </TableRow></TableHeader>
            <TableBody>{pageData.map((r: any) => {
              const TypeIcon = typeIcons[r.type] || Building;
              return (
                <TableRow key={r.id}>
                  <TableCell><div className="flex items-center gap-2"><TypeIcon className="h-4 w-4 text-muted-foreground" /><div><span className="font-medium">{r.name}</span><br/><span className="text-xs text-muted-foreground">{r.location}</span></div></div></TableCell>
                  <TableCell><Badge variant="secondary" className={`border-0 text-[10px] ${emirateColors[r.emirate] || ""}`}>{r.emirate}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{r.type}</Badge></TableCell>
                  <TableCell>{r.area_sqm?.toLocaleString() || "—"}</TableCell>
                  <TableCell className="uppercase text-xs">{r.contract_type}</TableCell>
                  <TableCell><Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
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
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}><DialogContent>
        <DialogHeader><DialogTitle>{viewItem?.name}</DialogTitle></DialogHeader>
        {viewItem && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              {[["Location",viewItem.location],["Emirate",viewItem.emirate],["Type",viewItem.type],["Area",viewItem.area_sqm ? `${viewItem.area_sqm.toLocaleString()} sqm` : "—"],["Contract",viewItem.contract_type],["Client",viewItem.clients?.name],["Status",viewItem.status]].map(([l,v])=>(
                <div key={l as string}><p className="text-muted-foreground text-xs">{l}</p><p className="font-medium capitalize">{v||"—"}</p></div>
              ))}
            </div>
          </div>
        )}
      </DialogContent></Dialog>

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