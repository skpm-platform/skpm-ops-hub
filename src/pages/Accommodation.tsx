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
import { Plus, Search, Home, Pencil, Trash2, Eye, LayoutGrid, List, BedDouble, Users, DollarSign, AlertTriangle, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { ExportButton } from "@/components/ExportButton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusFilter } from "@/components/StatusFilter";
import { format } from "date-fns";

function occupancyColor(pct: number): string {
  if (pct > 100) return "text-destructive";
  if (pct >= 90) return "text-destructive";
  if (pct >= 70) return "text-amber-600";
  return "text-emerald-600";
}
function occupancyBarColor(pct: number): string {
  if (pct >= 90) return "[&>div]:bg-destructive";
  if (pct >= 70) return "[&>div]:bg-amber-500";
  return "";
}

export default function Accommodation() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewing, setViewing] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showResidents, setShowResidents] = useState(false);
  const [form, setForm] = useState({ camp_name: "", location: "", total_beds: "", occupied_beds: "", cost_per_bed: "", status: "active", contract_start: "", contract_end: "" });

  const { data = [], isLoading } = useQuery({
    queryKey: ["accommodations"],
    queryFn: async () => { const { data } = await supabase.from("accommodations").select("*").order("created_at", { ascending: false }); return (data as any[]) || []; },
  });

  // Residents for viewing camp
  const { data: residents = [] } = useQuery({
    queryKey: ["accommodation-residents", viewing?.id],
    enabled: !!viewing && showResidents,
    queryFn: async () => {
      const { data: byId } = await (supabase as any).from("employees").select("id, name, position").eq("site_id", viewing.id);
      return (byId as any[]) || [];
    },
  });

  const resetForm = () => setForm({ camp_name: "", location: "", total_beds: "", occupied_beds: "", cost_per_bed: "", status: "active", contract_start: "", contract_end: "" });

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = { camp_name: form.camp_name, location: form.location, total_beds: parseInt(form.total_beds) || 0, occupied_beds: parseInt(form.occupied_beds) || 0, cost_per_bed: parseFloat(form.cost_per_bed) || 0, status: form.status };
      if (form.contract_start) payload.contract_start = form.contract_start;
      if (form.contract_end) payload.contract_end = form.contract_end;
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
    setForm({ camp_name: r.camp_name, location: r.location || "", total_beds: String(r.total_beds || ""), occupied_beds: String(r.occupied_beds || ""), cost_per_bed: String(r.cost_per_bed || ""), status: r.status || "active", contract_start: r.contract_start ? r.contract_start.slice(0, 10) : "", contract_end: r.contract_end ? r.contract_end.slice(0, 10) : "" });
    setOpen(true);
  };

  const totalBeds = data.reduce((s: number, r: any) => s + (r.total_beds || 0), 0);
  const totalOccupied = data.reduce((s: number, r: any) => s + (r.occupied_beds || 0), 0);
  const totalAvailable = totalBeds - totalOccupied;
  const overallOccupancy = totalBeds ? Math.round(totalOccupied / totalBeds * 100) : 0;
  const totalMonthlyCost = data.reduce((s: number, r: any) => s + ((r.occupied_beds || 0) * (r.cost_per_bed || 0)), 0);
  const fullCamps = data.filter((r: any) => r.total_beds > 0 && r.occupied_beds >= r.total_beds).length;
  const overCap = data.filter((r: any) => r.total_beds > 0 && r.occupied_beds > r.total_beds).length;
  const statusCounts = data.reduce((a: Record<string, number>, r: any) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {});

  const filtered = data
    .filter((r: any) => r.camp_name?.toLowerCase().includes(search.toLowerCase()) || r.location?.toLowerCase().includes(search.toLowerCase()))
    .filter((r: any) => statusFilter === "all" || r.status === statusFilter);
  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Home className="h-6 w-6 text-primary" /></div>
          <div><h1 className="text-2xl font-bold">Accommodation</h1><p className="text-sm text-muted-foreground">{data.length} camps managed</p></div>
        </div>
        <div className="flex gap-2">
          <div className="flex border rounded-md">
            <Button variant={viewMode === "table" ? "secondary" : "ghost"} size="icon" className="h-9 w-9 rounded-r-none" onClick={() => setViewMode("table")}><List className="h-4 w-4" /></Button>
            <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon" className="h-9 w-9 rounded-l-none" onClick={() => setViewMode("grid")}><LayoutGrid className="h-4 w-4" /></Button>
          </div>
          <ExportButton data={data} filename="accommodation" />
          <Button onClick={() => { resetForm(); setEditingId(null); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add Camp</Button>
        </div>
      </div>

      {overCap > 0 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm"><span className="font-medium text-destructive">{overCap} camp{overCap > 1 ? "s" : ""} Over Capacity!</span> Immediate action required — beds exceeded.</p>
          </CardContent>
        </Card>
      )}
      {fullCamps > 0 && overCap === 0 && (
        <Card className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-sm"><span className="font-medium text-amber-700 dark:text-amber-400">{fullCamps} camp{fullCamps > 1 ? "s" : ""} at full capacity.</span> Consider expanding or redistributing occupants.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-5">
        <Card className="hover:shadow-md transition-shadow"><CardContent className="p-4">
          <div className="flex items-center justify-between"><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Beds</p><BedDouble className="h-4 w-4 text-muted-foreground" /></div>
          <p className="text-2xl font-bold mt-1">{totalBeds}</p>
        </CardContent></Card>
        <Card className="hover:shadow-md transition-shadow"><CardContent className="p-4">
          <div className="flex items-center justify-between"><p className="text-xs text-muted-foreground uppercase tracking-wider">Occupied</p><Users className="h-4 w-4 text-amber-500" /></div>
          <p className="text-2xl font-bold mt-1">{totalOccupied}</p>
          <p className="text-xs text-muted-foreground mt-1">{totalAvailable} available</p>
        </CardContent></Card>
        <Card className="hover:shadow-md transition-shadow"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Occupancy Rate</p>
          <p className={`text-2xl font-bold mt-1 ${occupancyColor(overallOccupancy)}`}>{overallOccupancy}%</p>
          <Progress value={Math.min(overallOccupancy, 100)} className={`mt-2 h-1.5 ${occupancyBarColor(overallOccupancy)}`} />
        </CardContent></Card>
        <Card className="hover:shadow-md transition-shadow"><CardContent className="p-4">
          <div className="flex items-center justify-between"><p className="text-xs text-muted-foreground uppercase tracking-wider">Monthly Cost</p><DollarSign className="h-4 w-4 text-emerald-500" /></div>
          <p className="text-2xl font-bold mt-1">AED {totalMonthlyCost.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">{totalOccupied > 0 ? `AED ${Math.round(totalMonthlyCost / totalOccupied)}/person` : "—"}</p>
        </CardContent></Card>
        <Card className="hover:shadow-md transition-shadow"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Active Camps</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{statusCounts.active || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">of {data.length} total</p>
        </CardContent></Card>
      </div>

      <StatusFilter statuses={[{ value: "all", label: "All", count: data.length }, { value: "active", label: "Active", count: statusCounts.active || 0 }, { value: "inactive", label: "Inactive", count: statusCounts.inactive || 0 }, { value: "maintenance", label: "Maintenance", count: statusCounts.maintenance || 0 }]} selected={statusFilter} onSelect={setStatusFilter} />

      <Card><CardContent className="pt-6">
        <div className="mb-4 relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search camps..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>

        {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No accommodations found</p> : viewMode === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pageData.map((r: any) => {
              const avail = (r.total_beds || 0) - (r.occupied_beds || 0);
              const occ = r.total_beds ? Math.round((r.occupied_beds || 0) / r.total_beds * 100) : 0;
              return (
                <Card key={r.id} className={`hover:shadow-md transition-all group cursor-pointer ${occ > 100 ? "border-destructive/40" : occ >= 100 ? "border-destructive/30" : ""}`} onClick={() => { setViewing(r); setViewOpen(true); setShowResidents(false); }}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Home className="h-5 w-5 text-primary" /></div>
                      <div className="flex items-center gap-1">
                        {occ > 100 && <Badge className="bg-destructive/15 text-destructive border-0 text-[10px]">Over Capacity</Badge>}
                        <Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status}</Badge>
                      </div>
                    </div>
                    <div><p className="font-semibold">{r.camp_name}</p><p className="text-sm text-muted-foreground">{r.location || "No location"}</p></div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Occupancy</span><span className={`font-bold ${occupancyColor(occ)}`}>{occ}%</span></div>
                      <Progress value={Math.min(occ, 100)} className={`h-2 ${occupancyBarColor(occ)}`} />
                      <div className="flex justify-between text-xs text-muted-foreground"><span>{r.occupied_beds || 0} occupied</span><span>{avail} available</span></div>
                    </div>
                    <div className="flex items-center justify-between text-sm pt-2 border-t"><span className="text-muted-foreground">Cost/bed</span><span className="font-medium">AED {r.cost_per_bed?.toLocaleString()}</span></div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleEdit(r)}><Pencil className="h-3 w-3 mr-1" />Edit</Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => setDeleteId(r.id)}><Trash2 className="h-3 w-3 mr-1" />Delete</Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Table><TableHeader><TableRow>
            <SortableHeader label="Camp" sortKey="camp_name" direction={getSortDirection("camp_name")} onToggle={toggleSort} />
            <SortableHeader label="Location" sortKey="location" direction={getSortDirection("location")} onToggle={toggleSort} />
            <SortableHeader label="Total Beds" sortKey="total_beds" direction={getSortDirection("total_beds")} onToggle={toggleSort} />
            <SortableHeader label="Occupied" sortKey="occupied_beds" direction={getSortDirection("occupied_beds")} onToggle={toggleSort} />
            <SortableHeader label="Occupancy" sortKey="occupied_beds" direction={null} onToggle={() => {}} />
            <SortableHeader label="Cost/Bed" sortKey="cost_per_bed" direction={getSortDirection("cost_per_bed")} onToggle={toggleSort} />
            <SortableHeader label="Status" sortKey="status" direction={getSortDirection("status")} onToggle={toggleSort} />
            <SortableHeader label="Actions" sortKey="" direction={null} onToggle={() => {}} />
          </TableRow></TableHeader>
            <TableBody>{pageData.map((r: any) => {
              const avail = (r.total_beds || 0) - (r.occupied_beds || 0);
              const occ = r.total_beds ? Math.round((r.occupied_beds || 0) / r.total_beds * 100) : 0;
              return (
                <TableRow key={r.id} className={`group ${occ > 100 ? "bg-destructive/5" : ""}`}>
                  <TableCell className="font-medium">{r.camp_name}</TableCell>
                  <TableCell>{r.location || "—"}</TableCell>
                  <TableCell>{r.total_beds}</TableCell>
                  <TableCell>{r.occupied_beds || 0} <span className="text-xs text-muted-foreground">({avail} free)</span>{occ > 100 && <Badge className="ml-1 bg-destructive/15 text-destructive border-0 text-[10px]">Over Cap</Badge>}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <Progress value={Math.min(occ, 100)} className={`h-1.5 flex-1 ${occupancyBarColor(occ)}`} />
                      <span className={`text-xs font-bold ${occupancyColor(occ)}`}>{occ}%</span>
                    </div>
                  </TableCell>
                  <TableCell>AED {r.cost_per_bed?.toLocaleString()}</TableCell>
                  <TableCell><Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setViewing(r); setViewOpen(true); setShowResidents(false); }}><Eye className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}</TableBody></Table>
        )}
        <DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
      </CardContent></Card>

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}><DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Camp Details</DialogTitle></DialogHeader>
        {viewing && (() => {
          const avail = (viewing.total_beds || 0) - (viewing.occupied_beds || 0);
          const occ = viewing.total_beds ? Math.round((viewing.occupied_beds || 0) / viewing.total_beds * 100) : 0;
          const monthlyCost = (viewing.occupied_beds || 0) * (viewing.cost_per_bed || 0);
          const overCapacity = viewing.total_beds > 0 && viewing.occupied_beds > viewing.total_beds;
          return (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center"><Home className="h-6 w-6 text-primary" /></div>
                <div>
                  <p className="font-semibold text-lg">{viewing.camp_name}</p>
                  <p className="text-sm text-muted-foreground">{viewing.location || "No location"}</p>
                </div>
              </div>
              {overCapacity && <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg"><AlertTriangle className="h-4 w-4 text-destructive" /><p className="text-sm font-medium text-destructive">Over Capacity! ({viewing.occupied_beds}/{viewing.total_beds} beds)</p></div>}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center"><span className="text-sm">Occupancy</span><span className={`text-lg font-bold ${occupancyColor(occ)}`}>{occ}%</span></div>
                <Progress value={Math.min(occ, 100)} className={`h-2.5 ${occupancyBarColor(occ)}`} />
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div><p className="text-muted-foreground text-xs">Total</p><p className="font-bold">{viewing.total_beds}</p></div>
                  <div><p className="text-muted-foreground text-xs">Occupied</p><p className="font-bold text-amber-600">{viewing.occupied_beds || 0}</p></div>
                  <div><p className="text-muted-foreground text-xs">Available</p><p className="font-bold text-emerald-600">{avail}</p></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-muted-foreground text-xs">Cost Per Bed</p><p className="font-medium">AED {viewing.cost_per_bed?.toLocaleString()}</p></div>
                <div>
                  <p className="text-muted-foreground text-xs">Monthly Total Cost</p>
                  <p className="font-bold text-lg text-emerald-600">AED {monthlyCost.toLocaleString()}</p>
                </div>
                <div><p className="text-muted-foreground text-xs">Status</p><Badge variant={viewing.status === "active" ? "default" : "secondary"}>{viewing.status}</Badge></div>
                {viewing.contract_start && <div><p className="text-muted-foreground text-xs">Contract Start</p><p className="font-medium text-xs">{format(new Date(viewing.contract_start), "dd MMM yyyy")}</p></div>}
                {viewing.contract_end && <div><p className="text-muted-foreground text-xs">Contract End</p><p className="font-medium text-xs">{format(new Date(viewing.contract_end), "dd MMM yyyy")}</p></div>}
              </div>
              <Button size="sm" variant="outline" className="w-full gap-2" onClick={() => setShowResidents(!showResidents)}>
                <UserCheck className="h-4 w-4" />{showResidents ? "Hide" : "View"} Residents
              </Button>
              {showResidents && (
                <div className="space-y-2 pt-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Residents</p>
                  {residents.length === 0 ? <p className="text-xs text-muted-foreground">No residents found</p> : residents.map((r: any) => (
                    <div key={r.id} className="flex items-center gap-2 py-1.5 border-b last:border-0 text-sm">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold">{r.name?.charAt(0)}</div>
                      <div><p className="font-medium text-xs">{r.name}</p><p className="text-[10px] text-muted-foreground">{r.position || r.trade || "—"}</p></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </DialogContent></Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { setEditingId(null); resetForm(); } }}><DialogContent>
        <DialogHeader><DialogTitle>{editingId ? "Edit" : "Add"} Camp</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Camp Name *</Label><Input value={form.camp_name} onChange={e => setForm({ ...form, camp_name: e.target.value })} /></div>
          <div><Label>Location</Label><Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Total Beds</Label><Input type="number" value={form.total_beds} onChange={e => setForm({ ...form, total_beds: e.target.value })} /></div>
            <div><Label>Occupied</Label><Input type="number" value={form.occupied_beds} onChange={e => setForm({ ...form, occupied_beds: e.target.value })} /></div>
            <div><Label>Cost/Bed (AED)</Label><Input type="number" value={form.cost_per_bed} onChange={e => setForm({ ...form, cost_per_bed: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Contract Start</Label><Input type="date" value={form.contract_start} onChange={e => setForm({ ...form, contract_start: e.target.value })} /></div>
            <div><Label>Contract End</Label><Input type="date" value={form.contract_end} onChange={e => setForm({ ...form, contract_end: e.target.value })} /></div>
          </div>
          <div><Label>Status</Label><Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="maintenance">Maintenance</SelectItem></SelectContent></Select></div>
          <Button className="w-full" onClick={() => save.mutate()} disabled={!form.camp_name || save.isPending}>{save.isPending ? "Saving..." : editingId ? "Update" : "Add Camp"}</Button>
        </div>
      </DialogContent></Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} onConfirm={() => deleteId && del.mutate(deleteId)} />
    </div>
  );
}
