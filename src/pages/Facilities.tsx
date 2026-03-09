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
import { ComboboxSelect } from "@/components/ComboboxSelect";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ExportButton } from "@/components/ExportButton";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { StatusFilter } from "@/components/StatusFilter";
import { useDataTable } from "@/hooks/use-data-table";
import { Building2, Plus, Search, Pencil, Trash2, Eye, List, LayoutGrid, Wrench, AlertTriangle, DollarSign, Phone, User } from "lucide-react";
import { toast } from "sonner";
import { format, addDays, isPast, differenceInDays } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-success/15 text-success border-0",
  inactive: "bg-muted text-muted-foreground border-0",
  maintenance: "bg-warning/15 text-warning border-0",
};

export default function Facilities() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewing, setViewing] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const emptyForm = { name: "", type: "", location: "", status: "active", client_id: "", capacity: "", notes: "", monthly_cost: "", contact_person: "", contact_phone: "", next_maintenance_date: "", last_maintenance_date: "" };
  const [form, setForm] = useState({ ...emptyForm });

  const { data = [], isLoading } = useQuery({
    queryKey: ["facilities"],
    queryFn: async () => { const { data } = await (supabase as any).from("facilities").select("*").order("created_at", { ascending: false }); return data || []; },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-simple"],
    queryFn: async () => { const { data } = await supabase.from("clients").select("id, name").order("name"); return data || []; },
  });

  const clientOptions = clients.map((c: any) => ({ value: c.id, label: c.name }));
  const getClientName = (id: string) => clients.find((c: any) => c.id === id)?.name || "—";

  const resetForm = () => setForm({ ...emptyForm });

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = { name: form.name, type: form.type, location: form.location, status: form.status, notes: form.notes };
      if (form.client_id) payload.client_id = form.client_id;
      if (form.capacity) payload.capacity = parseInt(form.capacity);
      if (form.monthly_cost) payload.monthly_cost = parseFloat(form.monthly_cost);
      if (form.contact_person) payload.contact_person = form.contact_person;
      if (form.contact_phone) payload.contact_phone = form.contact_phone;
      if (form.next_maintenance_date) payload.next_maintenance_date = form.next_maintenance_date;
      if (form.last_maintenance_date) payload.last_maintenance_date = form.last_maintenance_date;
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
    setForm({ name: r.name || "", type: r.type || "", location: r.location || "", status: r.status || "active", client_id: r.client_id || "", capacity: r.capacity ? String(r.capacity) : "", notes: r.notes || "", monthly_cost: r.monthly_cost ? String(r.monthly_cost) : "", contact_person: r.contact_person || "", contact_phone: r.contact_phone || "", next_maintenance_date: r.next_maintenance_date ? r.next_maintenance_date.slice(0, 10) : "", last_maintenance_date: r.last_maintenance_date ? r.last_maintenance_date.slice(0, 10) : "" });
    setOpen(true);
  };

  const getMaintenanceBadge = (r: any) => {
    if (!r.next_maintenance_date) return null;
    const days = differenceInDays(new Date(r.next_maintenance_date), new Date());
    if (isPast(new Date(r.next_maintenance_date))) return <Badge className="bg-destructive/15 text-destructive border-0 text-[10px]"><Wrench className="h-2.5 w-2.5 mr-1" />Overdue</Badge>;
    if (days <= 30) return <Badge className="bg-warning/15 text-warning border-0 text-[10px]"><Wrench className="h-2.5 w-2.5 mr-1" />Due in {days}d</Badge>;
    return null;
  };

  const totalMonthlyCost = data.filter((r: any) => r.status === "active").reduce((s: number, r: any) => s + (r.monthly_cost || 0), 0);
  const maintenanceDue = data.filter((r: any) => r.next_maintenance_date && differenceInDays(new Date(r.next_maintenance_date), new Date()) <= 30).length;
  const activeFacilities = data.filter((r: any) => r.status === "active").length;
  const statusCounts = data.reduce((a: Record<string, number>, r: any) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {});

  const filtered = data
    .filter((r: any) => r.name?.toLowerCase().includes(search.toLowerCase()) || r.location?.toLowerCase().includes(search.toLowerCase()) || r.type?.toLowerCase().includes(search.toLowerCase()))
    .filter((r: any) => statusFilter === "all" || r.status === statusFilter);
  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Building2 className="h-6 w-6 text-primary" /></div>
          <div><h1 className="text-2xl font-bold">Facilities</h1><p className="text-sm text-muted-foreground">{data.length} facilities</p></div>
        </div>
        <div className="flex gap-2">
          <div className="flex border rounded-md">
            <Button variant={viewMode === "table" ? "secondary" : "ghost"} size="icon" className="h-9 w-9 rounded-r-none" onClick={() => setViewMode("table")}><List className="h-4 w-4" /></Button>
            <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon" className="h-9 w-9 rounded-l-none" onClick={() => setViewMode("grid")}><LayoutGrid className="h-4 w-4" /></Button>
          </div>
          <ExportButton data={data} filename="facilities" />
          <Button onClick={() => { resetForm(); setEditingId(null); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add Facility</Button>
        </div>
      </div>

      {maintenanceDue > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
            <p className="text-sm"><span className="font-medium text-warning">{maintenanceDue} facilit{maintenanceDue > 1 ? "ies have" : "y has"} maintenance due</span> within 30 days.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Facilities</p>
          <p className="text-2xl font-bold mt-1">{data.length}</p>
        </CardContent></Card>
        <Card className="hover:shadow-md transition-shadow"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Active</p>
          <p className="text-2xl font-bold text-success mt-1">{activeFacilities}</p>
        </CardContent></Card>
        <Card className="hover:shadow-md transition-shadow"><CardContent className="p-4">
          <div className="flex items-center justify-between"><p className="text-xs text-muted-foreground uppercase tracking-wider">Monthly Cost</p><DollarSign className="h-4 w-4 text-muted-foreground" /></div>
          <p className="text-2xl font-bold mt-1">AED {totalMonthlyCost.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">Active only</p>
        </CardContent></Card>
        <Card className={`hover:shadow-md transition-shadow ${maintenanceDue > 0 ? "border-warning/30" : ""}`}><CardContent className="p-4">
          <div className="flex items-center justify-between"><p className="text-xs text-muted-foreground uppercase tracking-wider">Maintenance Due</p><Wrench className="h-4 w-4 text-warning" /></div>
          <p className={`text-2xl font-bold mt-1 ${maintenanceDue > 0 ? "text-warning" : ""}`}>{maintenanceDue}</p>
          <p className="text-xs text-muted-foreground mt-1">Within 30 days</p>
        </CardContent></Card>
      </div>

      <StatusFilter statuses={[{ value: "all", label: "All", count: data.length }, { value: "active", label: "Active", count: statusCounts.active || 0 }, { value: "inactive", label: "Inactive", count: statusCounts.inactive || 0 }, { value: "maintenance", label: "Maintenance", count: statusCounts.maintenance || 0 }]} selected={statusFilter} onSelect={setStatusFilter} />

      <Card><CardContent className="pt-6">
        <div className="mb-4 relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search facilities..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>

        {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No facilities found</p> : viewMode === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pageData.map((r: any) => (
              <Card key={r.id} className="group hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer" onClick={() => { setViewing(r); setViewOpen(true); }}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Building2 className="h-5 w-5 text-primary" /></div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className={STATUS_COLORS[r.status] || ""}>{r.status}</Badge>
                      {getMaintenanceBadge(r)}
                    </div>
                  </div>
                  <div><p className="font-semibold">{r.name}</p><p className="text-sm text-muted-foreground">{r.type || "No type"}</p></div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {r.location && <div><span className="text-muted-foreground">Location: </span>{r.location}</div>}
                    {r.client_id && <div><span className="text-muted-foreground">Client: </span>{getClientName(r.client_id)}</div>}
                    {r.monthly_cost && <div><span className="text-muted-foreground">Monthly: </span>AED {r.monthly_cost.toLocaleString()}</div>}
                    {r.contact_person && <div><span className="text-muted-foreground">Contact: </span>{r.contact_person}</div>}
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
          <Table><TableHeader><TableRow>
            <SortableHeader label="Name" sortKey="name" direction={getSortDirection("name")} onToggle={toggleSort} />
            <SortableHeader label="Type" sortKey="type" direction={getSortDirection("type")} onToggle={toggleSort} />
            <SortableHeader label="Location" sortKey="location" direction={getSortDirection("location")} onToggle={toggleSort} />
            <SortableHeader label="Client" sortKey="client_id" direction={getSortDirection("client_id")} onToggle={toggleSort} />
            <SortableHeader label="Monthly Cost" sortKey="monthly_cost" direction={getSortDirection("monthly_cost")} onToggle={toggleSort} />
            <SortableHeader label="Maintenance" sortKey="next_maintenance_date" direction={getSortDirection("next_maintenance_date")} onToggle={toggleSort} />
            <SortableHeader label="Status" sortKey="status" direction={getSortDirection("status")} onToggle={toggleSort} />
            <SortableHeader label="" sortKey="" direction={null} onToggle={() => {}} />
          </TableRow></TableHeader>
            <TableBody>{pageData.map((r: any) => (
              <TableRow key={r.id} className="group">
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell>{r.type || "—"}</TableCell>
                <TableCell>{r.location || "—"}</TableCell>
                <TableCell className="text-xs">{r.client_id ? getClientName(r.client_id) : "—"}</TableCell>
                <TableCell>{r.monthly_cost ? `AED ${r.monthly_cost.toLocaleString()}` : "—"}</TableCell>
                <TableCell>
                  {r.next_maintenance_date ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs">{format(new Date(r.next_maintenance_date), "dd MMM yy")}</span>
                      {getMaintenanceBadge(r)}
                    </div>
                  ) : "—"}
                </TableCell>
                <TableCell><Badge className={STATUS_COLORS[r.status] || ""}>{r.status}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setViewing(r); setViewOpen(true); }}><Eye className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}</TableBody></Table>
        )}
        <DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
      </CardContent></Card>

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}><DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Facility Details</DialogTitle></DialogHeader>
        {viewing && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center"><Building2 className="h-6 w-6 text-primary" /></div>
              <div>
                <p className="font-semibold text-lg">{viewing.name}</p>
                <div className="flex items-center gap-2"><Badge className={STATUS_COLORS[viewing.status] || ""}>{viewing.status}</Badge>{getMaintenanceBadge(viewing)}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-muted-foreground">Type</p><p className="font-medium">{viewing.type || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Location</p><p className="font-medium">{viewing.location || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Client</p><p className="font-medium">{viewing.client_id ? getClientName(viewing.client_id) : "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Capacity</p><p className="font-medium">{viewing.capacity || "—"}</p></div>
              {viewing.monthly_cost && <div className="col-span-2"><p className="text-xs text-muted-foreground">Monthly Cost</p><p className="font-bold text-lg text-emerald-600">AED {viewing.monthly_cost.toLocaleString()}</p></div>}
              {viewing.contact_person && <div><p className="text-xs text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" />Contact</p><p className="font-medium text-xs">{viewing.contact_person}</p></div>}
              {viewing.contact_phone && <div><p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />Phone</p><p className="font-medium text-xs">{viewing.contact_phone}</p></div>}
              {viewing.next_maintenance_date && <div><p className="text-xs text-muted-foreground">Next Maintenance</p><p className="font-medium text-xs">{format(new Date(viewing.next_maintenance_date), "dd MMM yyyy")}</p></div>}
              {viewing.last_maintenance_date && <div><p className="text-xs text-muted-foreground">Last Maintenance</p><p className="font-medium text-xs">{format(new Date(viewing.last_maintenance_date), "dd MMM yyyy")}</p></div>}
            </div>
            {viewing.notes && <div className="bg-muted/50 rounded-lg p-3"><p className="text-xs text-muted-foreground mb-1">Notes</p><p className="text-sm">{viewing.notes}</p></div>}
          </div>
        )}
      </DialogContent></Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { setEditingId(null); resetForm(); } }}><DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{editingId ? "Edit" : "Add"} Facility</DialogTitle></DialogHeader>
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Type</Label><Input value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} /></div>
            <div><Label>Location</Label><Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
          </div>
          <div><Label>Client</Label><ComboboxSelect value={form.client_id} onValueChange={v => setForm({ ...form, client_id: v })} options={clientOptions} placeholder="Select client..." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Monthly Cost (AED)</Label><Input type="number" value={form.monthly_cost} onChange={e => setForm({ ...form, monthly_cost: e.target.value })} /></div>
            <div><Label>Capacity</Label><Input type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Contact Person</Label><Input value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })} /></div>
            <div><Label>Contact Phone</Label><Input value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Next Maintenance</Label><Input type="date" value={form.next_maintenance_date} onChange={e => setForm({ ...form, next_maintenance_date: e.target.value })} /></div>
            <div><Label>Last Maintenance</Label><Input type="date" value={form.last_maintenance_date} onChange={e => setForm({ ...form, last_maintenance_date: e.target.value })} /></div>
          </div>
          <div><Label>Status</Label><Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="maintenance">Maintenance</SelectItem></SelectContent></Select></div>
          <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          <Button className="w-full" onClick={() => save.mutate()} disabled={!form.name || save.isPending}>{save.isPending ? "Saving..." : editingId ? "Update" : "Add Facility"}</Button>
        </div>
      </DialogContent></Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} onConfirm={() => deleteId && del.mutate(deleteId)} />
    </div>
  );
}
