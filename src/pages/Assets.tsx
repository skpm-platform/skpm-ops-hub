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
import { Plus, Search, Package, Pencil, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { ComboboxSelect } from "@/components/ComboboxSelect";
import { StatusFilter } from "@/components/StatusFilter";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ExportButton } from "@/components/ExportButton";

const categoryOptions = [
  { value: "vehicle", label: "Vehicle" }, { value: "equipment", label: "Equipment" },
  { value: "tool", label: "Tool" }, { value: "it", label: "IT Equipment" },
  { value: "furniture", label: "Furniture" }, { value: "machinery", label: "Machinery" },
  { value: "safety", label: "Safety Equipment" },
];
const locationOptions = [
  { value: "Main Office", label: "Main Office" }, { value: "Site A", label: "Site A" },
  { value: "Site B", label: "Site B" }, { value: "Warehouse", label: "Warehouse" },
  { value: "Workshop", label: "Workshop" },
];
const emptyForm = { name: "", category: "equipment", location: "", purchase_price: "", purchase_date: "", status: "active" };

export default function Assets() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  const { data = [], isLoading } = useQuery({
    queryKey: ["assets"],
    queryFn: async () => { const { data } = await supabase.from("assets").select("*").order("created_at", { ascending: false }); return data || []; },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, purchase_price: parseFloat(form.purchase_price) || 0, current_value: parseFloat(form.purchase_price) || 0 };
      if (editingId) {
        const { error } = await supabase.from("assets").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("assets").insert({ ...payload, asset_tag: `AST-${Date.now().toString().slice(-6)}` });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["assets"] }); toast.success(editingId ? "Updated" : "Asset added"); setOpen(false); setEditingId(null); setForm(emptyForm); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("assets").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["assets"] }); toast.success("Deleted"); setDeleteId(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const handleEdit = (r: any) => {
    setEditingId(r.id);
    setForm({ name: r.name||"", category: r.category||"equipment", location: r.location||"", purchase_price: String(r.purchase_price||""), purchase_date: r.purchase_date||"", status: r.status||"active" });
    setOpen(true);
  };

  const filtered = data.filter((r: any) => {
    const matchSearch = r.name?.toLowerCase().includes(search.toLowerCase()) || r.asset_tag?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statuses = [
    { value: "all", label: "All", count: data.length },
    { value: "active", label: "Active", count: data.filter((r: any) => r.status === "active").length },
    { value: "maintenance", label: "Maintenance", count: data.filter((r: any) => r.status === "maintenance").length },
    { value: "disposed", label: "Disposed", count: data.filter((r: any) => r.status === "disposed").length },
  ];

  const totalValue = data.reduce((s:number,r:any)=>s+(r.current_value||0),0);
  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3"><Package className="h-7 w-7 text-primary" /><div><h1 className="text-2xl font-bold">Assets</h1><p className="text-sm text-muted-foreground">{data.length} assets</p></div></div>
        <div className="flex gap-2">
          <ExportButton data={filtered} filename="assets" columns={[{key:"asset_tag",label:"Tag"},{key:"name",label:"Name"},{key:"category",label:"Category"},{key:"location",label:"Location"},{key:"current_value",label:"Value"},{key:"status",label:"Status"}]} />
          <Button onClick={() => { setEditingId(null); setForm(emptyForm); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add Asset</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Assets</p><p className="text-2xl font-bold">{data.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Value</p><p className="text-2xl font-bold">AED {totalValue.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">In Maintenance</p><p className="text-2xl font-bold text-amber-600">{data.filter((r:any)=>r.status==="maintenance").length}</p></CardContent></Card>
      </div>

      <Card><CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search assets..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
          <StatusFilter statuses={statuses} selected={statusFilter} onSelect={setStatusFilter} />
        </div>
        {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No assets</p> : (
          <>
          <div className="overflow-x-auto">
          <Table><TableHeader><TableRow>
            <SortableHeader label="Tag" sortKey="asset_tag" direction={getSortDirection("asset_tag")} onToggle={toggleSort} />
            <SortableHeader label="Name" sortKey="name" direction={getSortDirection("name")} onToggle={toggleSort} />
            <SortableHeader label="Category" sortKey="category" direction={getSortDirection("category")} onToggle={toggleSort} />
            <SortableHeader label="Location" sortKey="location" direction={getSortDirection("location")} onToggle={toggleSort} />
            <SortableHeader label="Value (AED)" sortKey="current_value" direction={getSortDirection("current_value")} onToggle={toggleSort} />
            <SortableHeader label="Status" sortKey="status" direction={getSortDirection("status")} onToggle={toggleSort} />
            <SortableHeader label="Actions" sortKey="" direction={null} onToggle={() => {}} />
          </TableRow></TableHeader>
            <TableBody>{pageData.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs font-mono">{r.asset_tag}</TableCell>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{r.category}</Badge></TableCell>
                <TableCell>{r.location || "—"}</TableCell>
                <TableCell>{r.current_value?.toLocaleString()}</TableCell>
                <TableCell><Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
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
        <DialogHeader><DialogTitle>{editingId ? "Edit Asset" : "Add Asset"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
          <div><Label>Category</Label><ComboboxSelect value={form.category} onValueChange={v => setForm({...form, category: v})} options={categoryOptions} placeholder="Select or type..." /></div>
          <div><Label>Location</Label><ComboboxSelect value={form.location} onValueChange={v => setForm({...form, location: v})} options={locationOptions} placeholder="Select or type..." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Purchase Price (AED)</Label><Input type="number" value={form.purchase_price} onChange={e => setForm({...form, purchase_price: e.target.value})} /></div>
            <div><Label>Purchase Date</Label><Input type="date" value={form.purchase_date} onChange={e => setForm({...form, purchase_date: e.target.value})} /></div>
          </div>
          {editingId && <div><Label>Status</Label><ComboboxSelect value={form.status} onValueChange={v => setForm({...form, status: v})} options={[{value:"active",label:"Active"},{value:"maintenance",label:"Maintenance"},{value:"disposed",label:"Disposed"}]} allowCustom={false} /></div>}
          <Button className="w-full" onClick={() => save.mutate()} disabled={!form.name || save.isPending}>{save.isPending ? "Saving..." : editingId ? "Update" : "Add Asset"}</Button>
        </div>
      </DialogContent></Dialog>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}><DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Asset Details</DialogTitle></DialogHeader>
        {viewing && (
          <div className="space-y-3 text-sm"><div className="grid grid-cols-2 gap-2">
            {[["Tag",viewing.asset_tag],["Name",viewing.name],["Category",viewing.category],["Location",viewing.location],["Purchase Price",`AED ${viewing.purchase_price?.toLocaleString()}`],["Current Value",`AED ${viewing.current_value?.toLocaleString()}`],["Purchase Date",viewing.purchase_date],["Status",viewing.status]].map(([l,v])=>(
              <div key={l as string}><p className="text-muted-foreground text-xs">{l}</p><p className="font-medium capitalize">{v||"—"}</p></div>
            ))}
          </div></div>
        )}
      </DialogContent></Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete Asset?" onConfirm={() => deleteId && remove.mutate(deleteId)} />
    </div>
  );
}
