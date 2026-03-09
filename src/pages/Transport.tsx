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
import { Plus, Search, Truck, Pencil, Trash2, Eye, LayoutGrid, List, Car, Bus, AlertTriangle, Calendar, Gauge, CheckCircle, Fuel, Wrench, User } from "lucide-react";
import { toast } from "sonner";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { ExportButton } from "@/components/ExportButton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusFilter } from "@/components/StatusFilter";
import { ComboboxSelect } from "@/components/ComboboxSelect";
import { differenceInDays, parseISO, format } from "date-fns";

const vehicleTypeIcons: Record<string, any> = {
  car: Car, bus: Bus, van: Truck, pickup: Truck, truck: Truck, crane: Gauge, forklift: Gauge,
};
const vehicleTypeColors: Record<string, string> = {
  car: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  bus: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  van: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  pickup: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  truck: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  crane: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  forklift: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
};
const fuelLevelColors: Record<string, string> = {
  Full: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "3/4": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Half: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "1/4": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  Empty: "bg-destructive/10 text-destructive",
};

function expiryBadge(expiry: string | null, label?: string) {
  if (!expiry) return null;
  const days = differenceInDays(parseISO(expiry), new Date());
  if (days < 0) return <Badge className="bg-destructive/10 text-destructive text-[10px] border-0">{label ? `${label} Expired` : "Expired"}</Badge>;
  if (days <= 30) return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] border-0">{label ? `${label} ` : ""}{days}d left</Badge>;
  return null;
}

function maintenanceBadge(serviceDate: string | null) {
  if (!serviceDate) return null;
  const days = differenceInDays(parseISO(serviceDate), new Date());
  if (days < 0) return <Badge variant="destructive" className="text-[10px]">Overdue</Badge>;
  if (days <= 7) return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] border-0">Due Soon</Badge>;
  return null;
}

export default function Transport() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewing, setViewing] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    make_model: "", plate_number: "", type: "car", capacity: "",
    registration_expiry: "", insurance_expiry: "", status: "active",
    last_fuel_date: "", fuel_level: "", next_service_date: "",
    driver_id: "", odometer_km: "",
  });

  const { data = [], isLoading } = useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => { const { data } = await (supabase as any).from("vehicles").select("*").order("created_at", { ascending: false }); return data || []; },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-list"],
    queryFn: async () => { const { data } = await supabase.from("employees").select("id, name").order("name"); return data || []; },
  });

  const tripLogs = useQuery({
    queryKey: ["trip_logs"],
    queryFn: async () => { const { data } = await (supabase as any).from("trip_logs").select("*"); return data || []; },
  });

  const resetForm = () => setForm({
    make_model: "", plate_number: "", type: "car", capacity: "",
    registration_expiry: "", insurance_expiry: "", status: "active",
    last_fuel_date: "", fuel_level: "", next_service_date: "",
    driver_id: "", odometer_km: "",
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        make_model: form.make_model, plate_number: form.plate_number, type: form.type,
        capacity: parseInt(form.capacity) || null, registration_expiry: form.registration_expiry || null,
        insurance_expiry: form.insurance_expiry || null, status: form.status,
        last_fuel_date: form.last_fuel_date || null, fuel_level: form.fuel_level || null,
        next_service_date: form.next_service_date || null,
        driver_id: form.driver_id || null, odometer_km: parseInt(form.odometer_km) || null,
        ...(editingId ? {} : { vehicle_no: `VEH-${Date.now().toString().slice(-6)}` }),
      };
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

  const completeTripMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("vehicles").update({ status: "active" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vehicles"] });
      setViewing((prev: any) => prev ? { ...prev, status: "active" } : prev);
      toast.success("Trip marked as complete");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleEdit = (r: any) => {
    setEditingId(r.id);
    setForm({
      make_model: r.make_model || "", plate_number: r.plate_number || "", type: r.type || "car",
      capacity: String(r.capacity || ""), registration_expiry: r.registration_expiry || "",
      insurance_expiry: r.insurance_expiry || "", status: r.status || "active",
      last_fuel_date: r.last_fuel_date || "", fuel_level: r.fuel_level || "",
      next_service_date: r.next_service_date || "", driver_id: r.driver_id || "",
      odometer_km: String(r.odometer_km || ""),
    });
    setOpen(true);
  };

  const statusCounts = data.reduce((a: Record<string, number>, r: any) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {});
  const expiringCount = data.filter((r: any) => {
    const regDays = r.registration_expiry ? differenceInDays(parseISO(r.registration_expiry), new Date()) : null;
    const insDays = r.insurance_expiry ? differenceInDays(parseISO(r.insurance_expiry), new Date()) : null;
    return (regDays !== null && regDays >= 0 && regDays <= 30) || (insDays !== null && insDays >= 0 && insDays <= 30);
  }).length;
  const expiredCount = data.filter((r: any) => {
    const regDays = r.registration_expiry ? differenceInDays(parseISO(r.registration_expiry), new Date()) : null;
    const insDays = r.insurance_expiry ? differenceInDays(parseISO(r.insurance_expiry), new Date()) : null;
    return (regDays !== null && regDays < 0) || (insDays !== null && insDays < 0);
  }).length;
  const maintenanceDueCount = data.filter((r: any) => r.next_service_date && differenceInDays(parseISO(r.next_service_date), new Date()) <= 7).length;
  const totalCapacity = data.reduce((s: number, r: any) => s + (r.capacity || 0), 0);
  const activeRate = data.length > 0 ? Math.round(((statusCounts.active || 0) / data.length) * 100) : 0;
  const trips = tripLogs.data || [];
  const totalKm = trips.reduce((s: number, r: any) => s + (r.km || 0), 0);
  const totalFuelCost = trips.reduce((s: number, r: any) => s + (r.fuel_cost || 0), 0);

  const employeeMap = employees.reduce((a: Record<string, string>, e: any) => { a[e.id] = e.name; return a; }, {});
  const employeeOptions = employees.map((e: any) => ({ value: e.id, label: e.name }));

  const filtered = data
    .filter((r: any) => JSON.stringify(r).toLowerCase().includes(search.toLowerCase()))
    .filter((r: any) => statusFilter === "all" || r.status === statusFilter);
  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

  const VTypeIcon = ({ type }: { type: string }) => {
    const Icon = vehicleTypeIcons[type] || Truck;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Truck className="h-6 w-6 text-primary" /></div>
          <div><h1 className="text-2xl font-bold">Transport</h1><p className="text-sm text-muted-foreground">{data.length} vehicles managed</p></div>
        </div>
        <div className="flex gap-2">
          <div className="flex border rounded-md">
            <Button variant={viewMode === "table" ? "secondary" : "ghost"} size="icon" className="h-9 w-9 rounded-r-none" onClick={() => setViewMode("table")}><List className="h-4 w-4" /></Button>
            <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon" className="h-9 w-9 rounded-l-none" onClick={() => setViewMode("grid")}><LayoutGrid className="h-4 w-4" /></Button>
          </div>
          <ExportButton data={data} filename="transport" />
          <Button onClick={() => { resetForm(); setEditingId(null); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add Vehicle</Button>
        </div>
      </div>

      {(expiringCount > 0 || expiredCount > 0 || maintenanceDueCount > 0) && (
        <Card className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="text-sm flex flex-wrap gap-2">
              {expiredCount > 0 && <span className="text-destructive font-medium">{expiredCount} expired document{expiredCount > 1 ? "s" : ""}.</span>}
              {expiringCount > 0 && <span className="text-amber-700 dark:text-amber-400">{expiringCount} expiring within 30 days.</span>}
              {maintenanceDueCount > 0 && <span className="text-amber-700 dark:text-amber-400">{maintenanceDueCount} maintenance due soon.</span>}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-5">
        <Card className="hover:shadow-md transition-shadow"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Fleet Size</p>
          <p className="text-2xl font-bold mt-1">{data.length}</p>
        </CardContent></Card>
        <Card className="hover:shadow-md transition-shadow"><CardContent className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Active</p>
            <Car className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold mt-1 text-emerald-600">{statusCounts.active || 0}</p>
          <Progress value={activeRate} className="mt-2 h-1.5" />
        </CardContent></Card>
        <Card className="hover:shadow-md transition-shadow"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Capacity</p>
          <p className="text-2xl font-bold mt-1">{totalCapacity}</p>
          <p className="text-xs text-muted-foreground mt-1">Total seats/load</p>
        </CardContent></Card>
        <Card className="hover:shadow-md transition-shadow"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Distance</p>
          <p className="text-2xl font-bold mt-1">{totalKm.toLocaleString()} km</p>
          <p className="text-xs text-muted-foreground mt-1">{trips.length} trips logged</p>
        </CardContent></Card>
        <Card className="hover:shadow-md transition-shadow"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Fuel Cost</p>
          <p className="text-2xl font-bold mt-1">AED {totalFuelCost.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">{totalKm > 0 ? `AED ${(totalFuelCost / totalKm * 100).toFixed(1)}/100km` : "—"}</p>
        </CardContent></Card>
      </div>

      <StatusFilter statuses={[{ value: "all", label: "All", count: data.length }, { value: "active", label: "Active", count: statusCounts.active || 0 }, { value: "in-use", label: "In Use", count: statusCounts["in-use"] || 0 }, { value: "maintenance", label: "Maintenance", count: statusCounts.maintenance || 0 }, { value: "inactive", label: "Inactive", count: statusCounts.inactive || 0 }]} selected={statusFilter} onSelect={setStatusFilter} />

      <Card><CardContent className="pt-6">
        <div className="mb-4 relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search vehicles..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>

        {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No vehicles found</p> : viewMode === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pageData.map((r: any) => (
              <Card key={r.id} className="hover:shadow-md transition-all group cursor-pointer" onClick={() => { setViewing(r); setViewOpen(true); }}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${vehicleTypeColors[r.type] || "bg-muted"}`}>
                      <VTypeIcon type={r.type} />
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      <Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status}</Badge>
                      {maintenanceBadge(r.next_service_date)}
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold">{r.make_model || "Unknown"}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground font-mono">{r.vehicle_no}</span>
                      {r.plate_number && <Badge variant="outline" className="text-[10px]">{r.plate_number}</Badge>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {r.fuel_level && <Badge className={`${fuelLevelColors[r.fuel_level] || ""} text-[10px] border-0`}><Fuel className="h-2.5 w-2.5 mr-1" />{r.fuel_level}</Badge>}
                    {r.driver_id && <Badge variant="outline" className="text-[10px]"><User className="h-2.5 w-2.5 mr-1" />{employeeMap[r.driver_id] || "Assigned"}</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {expiryBadge(r.registration_expiry, "Reg")}
                    {expiryBadge(r.insurance_expiry, "Ins")}
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
            <Table><TableHeader><TableRow>
              <SortableHeader label="Vehicle #" sortKey="vehicle_no" direction={getSortDirection("vehicle_no")} onToggle={toggleSort} />
              <SortableHeader label="Make/Model" sortKey="make_model" direction={getSortDirection("make_model")} onToggle={toggleSort} />
              <SortableHeader label="Plate" sortKey="plate_number" direction={getSortDirection("plate_number")} onToggle={toggleSort} />
              <SortableHeader label="Type" sortKey="type" direction={getSortDirection("type")} onToggle={toggleSort} />
              <SortableHeader label="Driver" sortKey="driver_id" direction={getSortDirection("driver_id")} onToggle={toggleSort} />
              <SortableHeader label="Fuel" sortKey="fuel_level" direction={getSortDirection("fuel_level")} onToggle={toggleSort} />
              <SortableHeader label="Service Date" sortKey="next_service_date" direction={getSortDirection("next_service_date")} onToggle={toggleSort} />
              <SortableHeader label="Odometer" sortKey="odometer_km" direction={getSortDirection("odometer_km")} onToggle={toggleSort} />
              <SortableHeader label="Status" sortKey="status" direction={getSortDirection("status")} onToggle={toggleSort} />
              <SortableHeader label="Actions" sortKey="" direction={null} onToggle={() => {}} />
            </TableRow></TableHeader>
              <TableBody>{pageData.map((r: any) => (
                <TableRow key={r.id} className="group">
                  <TableCell className="text-xs font-mono">{r.vehicle_no}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={`h-7 w-7 rounded flex items-center justify-center ${vehicleTypeColors[r.type] || "bg-muted"}`}>
                        <VTypeIcon type={r.type} />
                      </div>
                      <div>
                        <span className="font-medium">{r.make_model}</span>
                        {r.plate_number && <span className="text-xs text-muted-foreground block">{r.plate_number}</span>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{r.plate_number || "—"}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{r.type}</Badge></TableCell>
                  <TableCell className="text-sm">{r.driver_id ? employeeMap[r.driver_id] || "—" : "—"}</TableCell>
                  <TableCell>
                    {r.fuel_level ? <Badge className={`${fuelLevelColors[r.fuel_level] || ""} text-[10px] border-0`}>{r.fuel_level}</Badge> : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className="text-xs">{r.next_service_date ? format(parseISO(r.next_service_date), "dd MMM yyyy") : "—"}</span>
                      {maintenanceBadge(r.next_service_date)}
                    </div>
                  </TableCell>
                  <TableCell>{r.odometer_km ? `${r.odometer_km.toLocaleString()} km` : "—"}</TableCell>
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

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { setEditingId(null); resetForm(); } }}><DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{editingId ? "Edit" : "Add"} Vehicle</DialogTitle></DialogHeader>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div><Label>Make/Model *</Label><Input value={form.make_model} onChange={e => setForm({ ...form, make_model: e.target.value })} /></div>
          <div><Label>Plate Number</Label><Input value={form.plate_number} onChange={e => setForm({ ...form, plate_number: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Type</Label><ComboboxSelect value={form.type} onChange={v => setForm({ ...form, type: v })} options={["bus", "van", "pickup", "car", "truck", "crane", "forklift"]} placeholder="Select type" /></div>
            <div><Label>Capacity</Label><Input type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} /></div>
          </div>
          <div><Label>Assigned Driver</Label>
            <ComboboxSelect value={form.driver_id} onChange={v => setForm({ ...form, driver_id: v })} options={employeeOptions.map((e: any) => e.label)} placeholder="Select driver" />
          </div>
          <div><Label>Odometer (km)</Label><Input type="number" value={form.odometer_km} onChange={e => setForm({ ...form, odometer_km: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Fuel Level</Label>
              <Select value={form.fuel_level} onValueChange={v => setForm({ ...form, fuel_level: v })}>
                <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                <SelectContent>
                  {["Full", "3/4", "Half", "1/4", "Empty"].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Last Fuel Date</Label><Input type="date" value={form.last_fuel_date} onChange={e => setForm({ ...form, last_fuel_date: e.target.value })} /></div>
          </div>
          <div><Label>Next Service Date</Label><Input type="date" value={form.next_service_date} onChange={e => setForm({ ...form, next_service_date: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Registration Expiry</Label><Input type="date" value={form.registration_expiry} onChange={e => setForm({ ...form, registration_expiry: e.target.value })} /></div>
            <div><Label>Insurance Expiry</Label><Input type="date" value={form.insurance_expiry} onChange={e => setForm({ ...form, insurance_expiry: e.target.value })} /></div>
          </div>
          {editingId && <div><Label>Status</Label><ComboboxSelect value={form.status} onChange={v => setForm({ ...form, status: v })} options={["active", "in-use", "maintenance", "inactive"]} placeholder="Select status" /></div>}
          <Button className="w-full" onClick={() => save.mutate()} disabled={!form.make_model || save.isPending}>{save.isPending ? "Saving..." : editingId ? "Update" : "Add Vehicle"}</Button>
        </div>
      </DialogContent></Dialog>

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}><DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Vehicle Details</DialogTitle></DialogHeader>
        {viewing && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${vehicleTypeColors[viewing.type] || "bg-muted"}`}>
                <VTypeIcon type={viewing.type} />
              </div>
              <div>
                <p className="font-semibold text-lg">{viewing.make_model}</p>
                <p className="text-xs text-muted-foreground font-mono">{viewing.vehicle_no} • {viewing.plate_number}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-muted-foreground text-xs">Type</p><p className="font-medium capitalize">{viewing.type}</p></div>
              <div><p className="text-muted-foreground text-xs">Capacity</p><p className="font-medium">{viewing.capacity || "—"}</p></div>
              <div><p className="text-muted-foreground text-xs">Driver</p><p className="font-medium">{viewing.driver_id ? (employeeMap[viewing.driver_id] || "—") : "—"}</p></div>
              <div><p className="text-muted-foreground text-xs">Odometer</p><p className="font-medium">{viewing.odometer_km ? `${viewing.odometer_km.toLocaleString()} km` : "—"}</p></div>
              <div>
                <p className="text-muted-foreground text-xs">Fuel Level</p>
                {viewing.fuel_level ? <Badge className={`${fuelLevelColors[viewing.fuel_level] || ""} text-xs border-0`}><Fuel className="h-3 w-3 mr-1" />{viewing.fuel_level}</Badge> : <p className="font-medium">—</p>}
              </div>
              <div><p className="text-muted-foreground text-xs">Last Fuel Date</p><p className="font-medium">{viewing.last_fuel_date ? format(parseISO(viewing.last_fuel_date), "dd MMM yyyy") : "—"}</p></div>
              <div>
                <p className="text-muted-foreground text-xs">Next Service</p>
                <div className="flex items-center gap-1">
                  <p className="font-medium">{viewing.next_service_date ? format(parseISO(viewing.next_service_date), "dd MMM yyyy") : "—"}</p>
                  {maintenanceBadge(viewing.next_service_date)}
                </div>
              </div>
              <div><p className="text-muted-foreground text-xs">Status</p><Badge variant={viewing.status === "active" ? "default" : "secondary"}>{viewing.status}</Badge></div>
            </div>
            {/* Document expiry */}
            <div className="border rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase">Documents</p>
              <div className="flex justify-between text-sm">
                <span>Registration Expiry</span>
                <div className="flex items-center gap-1">
                  <span>{viewing.registration_expiry ? format(parseISO(viewing.registration_expiry), "dd MMM yyyy") : "—"}</span>
                  {expiryBadge(viewing.registration_expiry)}
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span>Insurance Expiry</span>
                <div className="flex items-center gap-1">
                  <span>{viewing.insurance_expiry ? format(parseISO(viewing.insurance_expiry), "dd MMM yyyy") : "—"}</span>
                  {expiryBadge(viewing.insurance_expiry)}
                </div>
              </div>
            </div>
            {/* Mark Trip Complete */}
            {viewing.status === "in-use" && (
              <Button className="w-full gap-2" variant="outline" onClick={() => completeTripMutation.mutate(viewing.id)} disabled={completeTripMutation.isPending}>
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                {completeTripMutation.isPending ? "Completing..." : "Mark Trip Complete"}
              </Button>
            )}
          </div>
        )}
      </DialogContent></Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} onConfirm={() => deleteId && del.mutate(deleteId)} />
    </div>
  );
}
