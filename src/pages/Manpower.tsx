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
import { Plus, Search, HardHat, Pencil, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { ComboboxSelect } from "@/components/ComboboxSelect";
import { StatusFilter } from "@/components/StatusFilter";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ExportButton } from "@/components/ExportButton";

const tradeOptions = [
  { value: "electrician", label: "Electrician" }, { value: "plumber", label: "Plumber" },
  { value: "carpenter", label: "Carpenter" }, { value: "welder", label: "Welder" },
  { value: "helper", label: "Helper" }, { value: "driver", label: "Driver" },
  { value: "mason", label: "Mason" }, { value: "painter", label: "Painter" },
  { value: "hvac", label: "HVAC Technician" }, { value: "scaffolder", label: "Scaffolder" },
  { value: "rigger", label: "Rigger" }, { value: "insulator", label: "Insulator" },
];
const nationalityOptions = [
  { value: "Indian", label: "Indian" }, { value: "Pakistani", label: "Pakistani" },
  { value: "Bangladeshi", label: "Bangladeshi" }, { value: "Filipino", label: "Filipino" },
  { value: "Nepalese", label: "Nepalese" }, { value: "Sri Lankan", label: "Sri Lankan" },
  { value: "Egyptian", label: "Egyptian" },
];
const stC: Record<string,string> = { available: "bg-emerald-100 text-emerald-700", deployed: "bg-blue-100 text-blue-700", on_leave: "bg-amber-100 text-amber-700", sick: "bg-red-100 text-red-700" };
const emptyForm = { name: "", trade: "electrician", nationality: "", visa_expiry: "", medical_expiry: "", safety_card_expiry: "" };

export default function Manpower() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: workers = [], isLoading } = useQuery({
    queryKey: ["workers"],
    queryFn: async () => { const { data } = await supabase.from("workers").select("*").order("created_at", { ascending: false }); return data || []; },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (editingId) {
        const { error } = await supabase.from("workers").update(form).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("workers").insert({ ...form, worker_id: `WKR-${Date.now().toString().slice(-6)}` });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["workers"] }); toast.success(editingId ? "Updated" : "Worker added"); setOpen(false); setEditingId(null); setForm(emptyForm); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("workers").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["workers"] }); toast.success("Deleted"); setDeleteId(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const handleEdit = (r: any) => {
    setEditingId(r.id);
    setForm({ name: r.name||"", trade: r.trade||"", nationality: r.nationality||"", visa_expiry: r.visa_expiry||"", medical_expiry: r.medical_expiry||"", safety_card_expiry: r.safety_card_expiry||"" });
    setOpen(true);
  };

  const filtered = workers.filter((r: any) => {
    const matchSearch = r.name?.toLowerCase().includes(search.toLowerCase()) || r.trade?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statuses = [
    { value: "all", label: "All", count: workers.length },
    { value: "available", label: "Available", count: workers.filter((r: any) => r.status === "available").length },
    { value: "deployed", label: "Deployed", count: workers.filter((r: any) => r.status === "deployed").length },
    { value: "on_leave", label: "On Leave", count: workers.filter((r: any) => r.status === "on_leave").length },
  ];

  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3"><HardHat className="h-7 w-7 text-primary" /><div><h1 className="text-2xl font-bold">Manpower</h1><p className="text-sm text-muted-foreground">{workers.length} workers</p></div></div>
        <div className="flex gap-2">
          <ExportButton data={filtered} filename="workers" columns={[{key:"worker_id",label:"ID"},{key:"name",label:"Name"},{key:"trade",label:"Trade"},{key:"nationality",label:"Nationality"},{key:"status",label:"Status"}]} />
          <Button onClick={() => { setEditingId(null); setForm(emptyForm); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add Worker</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Workers</p><p className="text-2xl font-bold">{workers.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Available</p><p className="text-2xl font-bold text-success">{workers.filter((r:any)=>r.status==="available").length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Deployed</p><p className="text-2xl font-bold text-blue-600">{workers.filter((r:any)=>r.status==="deployed").length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Visa Expiring</p><p className="text-2xl font-bold text-destructive">{workers.filter((r:any)=>r.visa_expiry && new Date(r.visa_expiry) < new Date(Date.now()+30*86400000)).length}</p></CardContent></Card>
      </div>

      <Card><CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search workers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
          <StatusFilter statuses={statuses} selected={statusFilter} onSelect={setStatusFilter} />
        </div>
        {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No workers</p> : (
          <>
          <div className="overflow-x-auto">
          <Table><TableHeader><TableRow>
            <SortableHeader label="ID" sortKey="worker_id" direction={getSortDirection("worker_id")} onToggle={toggleSort} />
            <SortableHeader label="Name" sortKey="name" direction={getSortDirection("name")} onToggle={toggleSort} />
            <SortableHeader label="Trade" sortKey="trade" direction={getSortDirection("trade")} onToggle={toggleSort} />
            <SortableHeader label="Nationality" sortKey="nationality" direction={getSortDirection("nationality")} onToggle={toggleSort} />
            <SortableHeader label="Status" sortKey="status" direction={getSortDirection("status")} onToggle={toggleSort} />
            <SortableHeader label="Actions" sortKey="" direction={null} onToggle={() => {}} />
          </TableRow></TableHeader>
            <TableBody>{pageData.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs font-mono">{r.worker_id}</TableCell>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="capitalize">{r.trade}</TableCell>
                <TableCell>{r.nationality || "—"}</TableCell>
                <TableCell><Badge className={stC[r.status] || ""}>{r.status}</Badge></TableCell>
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

      <Dialog open={open} onOpenChange={(o)=>{setOpen(o);if(!o){setEditingId(null);setForm(emptyForm);}}}><DialogContent>
        <DialogHeader><DialogTitle>{editingId ? "Edit Worker" : "Add Worker"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
          <div><Label>Trade</Label><ComboboxSelect value={form.trade} onValueChange={v => setForm({...form, trade: v})} options={tradeOptions} placeholder="Select or type trade..." /></div>
          <div><Label>Nationality</Label><ComboboxSelect value={form.nationality} onValueChange={v => setForm({...form, nationality: v})} options={nationalityOptions} placeholder="Select or type..." /></div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label className="text-xs">Visa Expiry</Label><Input type="date" value={form.visa_expiry} onChange={e => setForm({...form, visa_expiry: e.target.value})} /></div>
            <div><Label className="text-xs">Medical Expiry</Label><Input type="date" value={form.medical_expiry} onChange={e => setForm({...form, medical_expiry: e.target.value})} /></div>
            <div><Label className="text-xs">Safety Card</Label><Input type="date" value={form.safety_card_expiry} onChange={e => setForm({...form, safety_card_expiry: e.target.value})} /></div>
          </div>
          <Button className="w-full" onClick={() => save.mutate()} disabled={!form.name || save.isPending}>{save.isPending ? "Saving..." : editingId ? "Update" : "Add Worker"}</Button>
        </div>
      </DialogContent></Dialog>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}><DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Worker Details</DialogTitle></DialogHeader>
        {viewing && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              {[["Worker ID",viewing.worker_id],["Name",viewing.name],["Trade",viewing.trade],["Nationality",viewing.nationality],["Status",viewing.status],["Visa Expiry",viewing.visa_expiry],["Medical Expiry",viewing.medical_expiry],["Safety Card",viewing.safety_card_expiry]].map(([l,v])=>(
                <div key={l as string}><p className="text-muted-foreground text-xs">{l}</p><p className="font-medium capitalize">{v||"—"}</p></div>
              ))}
            </div>
          </div>
        )}
      </DialogContent></Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete Worker?" onConfirm={() => deleteId && remove.mutate(deleteId)} />
    </div>
  );
}
