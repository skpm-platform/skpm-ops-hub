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
import { Plus, Search, Package, AlertTriangle, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { ExportButton } from "@/components/ExportButton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ComboboxSelect } from "@/components/ComboboxSelect";

export default function Warehouse() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", sku: "", category: "", quantity: "", min_stock: "", unit_cost: "", unit: "pcs", location: "" });

  const { data = [], isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => { const { data } = await (supabase as any).from("inventory").select("*").order("name"); return data || []; },
  });

  const resetForm = () => setForm({ name: "", sku: "", category: "", quantity: "", min_stock: "", unit_cost: "", unit: "pcs", location: "" });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { name: form.name, category: form.category, quantity: parseInt(form.quantity) || 0, min_stock: parseInt(form.min_stock) || 0, unit_cost: parseFloat(form.unit_cost) || 0, unit: form.unit, location: form.location, ...(editingId ? {} : { sku: form.sku || `SKU-${Date.now().toString().slice(-6)}` }), ...(editingId && form.sku ? { sku: form.sku } : {}) };
      if (editingId) { const { error } = await (supabase as any).from("inventory").update(payload).eq("id", editingId); if (error) throw error; }
      else { const { error } = await (supabase as any).from("inventory").insert(payload); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["inventory"] }); toast.success(editingId ? "Updated" : "Added"); setOpen(false); setEditingId(null); resetForm(); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase as any).from("inventory").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["inventory"] }); toast.success("Deleted"); setDeleteId(null); },
  });

  const handleEdit = (r: any) => {
    setEditingId(r.id);
    setForm({ name: r.name, sku: r.sku || "", category: r.category || "", quantity: String(r.quantity || ""), min_stock: String(r.min_stock || ""), unit_cost: String(r.unit_cost || ""), unit: r.unit || "pcs", location: r.location || "" });
    setOpen(true);
  };

  const lowStockItems = data.filter((r: any) => r.quantity <= r.min_stock);
  const totalValue = data.reduce((s: number, r: any) => s + (r.quantity || 0) * (r.unit_cost || 0), 0);

  const filtered = data
    .filter((r: any) => r.name?.toLowerCase().includes(search.toLowerCase()) || r.sku?.toLowerCase().includes(search.toLowerCase()))
    .filter((r: any) => stockFilter === "all" || (stockFilter === "low" && r.quantity <= r.min_stock) || (stockFilter === "ok" && r.quantity > r.min_stock));
  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><Package className="h-7 w-7 text-primary" /><h1 className="text-2xl font-bold">Warehouse</h1></div>
        <div className="flex gap-2">
          <ExportButton data={data} filename="inventory" />
          <Button onClick={() => { resetForm(); setEditingId(null); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add Item</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Items</p><p className="text-2xl font-semibold mt-1">{data.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Value</p><p className="text-2xl font-semibold mt-1">AED {totalValue.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4 flex items-start justify-between"><div><p className="text-xs text-muted-foreground uppercase tracking-wider">Low Stock</p><p className="text-2xl font-semibold mt-1 text-destructive">{lowStockItems.length}</p></div>{lowStockItems.length > 0 && <AlertTriangle className="h-5 w-5 text-destructive" />}</CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Categories</p><p className="text-2xl font-semibold mt-1">{new Set(data.map((r: any) => r.category).filter(Boolean)).size}</p></CardContent></Card>
      </div>

      <div className="flex gap-2">
        <Button variant={stockFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setStockFilter("all")}>All</Button>
        <Button variant={stockFilter === "low" ? "destructive" : "outline"} size="sm" onClick={() => setStockFilter(stockFilter === "low" ? "all" : "low")} className="gap-1"><AlertTriangle className="h-3 w-3" />Low Stock</Button>
      </div>

      <Card><CardContent className="pt-6">
        <div className="mb-4 relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search inventory..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No inventory</p> : (
          <>
          <Table><TableHeader><TableRow>
            <SortableHeader label="SKU" sortKey="sku" direction={getSortDirection("sku")} onToggle={toggleSort} />
            <SortableHeader label="Item" sortKey="name" direction={getSortDirection("name")} onToggle={toggleSort} />
            <SortableHeader label="Category" sortKey="category" direction={getSortDirection("category")} onToggle={toggleSort} />
            <SortableHeader label="Qty" sortKey="quantity" direction={getSortDirection("quantity")} onToggle={toggleSort} />
            <SortableHeader label="Min" sortKey="min_stock" direction={getSortDirection("min_stock")} onToggle={toggleSort} />
            <SortableHeader label="Unit Cost" sortKey="unit_cost" direction={getSortDirection("unit_cost")} onToggle={toggleSort} />
            <SortableHeader label="Status" sortKey="quantity" direction={null} onToggle={() => {}} />
            <SortableHeader label="Actions" sortKey="" direction={null} onToggle={() => {}} />
          </TableRow></TableHeader>
            <TableBody>{pageData.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs font-mono">{r.sku}</TableCell>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell>{r.category || "—"}</TableCell>
                <TableCell>{r.quantity}</TableCell>
                <TableCell>{r.min_stock}</TableCell>
                <TableCell>AED {r.unit_cost?.toLocaleString()}</TableCell>
                <TableCell>{r.quantity <= r.min_stock ? <Badge variant="destructive">Low Stock</Badge> : <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">OK</Badge>}</TableCell>
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
        <DialogHeader><DialogTitle>{editingId ? "Edit" : "Add"} Inventory Item</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Item Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>SKU</Label><Input value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} placeholder="Auto-generated" /></div>
            <div><Label>Category</Label><ComboboxSelect value={form.category} onChange={v => setForm({...form, category: v})} options={["tools","safety","electrical","plumbing","paint","hardware","consumables"]} placeholder="Select or type" /></div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label>Quantity</Label><Input type="number" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} /></div>
            <div><Label>Min Stock</Label><Input type="number" value={form.min_stock} onChange={e => setForm({...form, min_stock: e.target.value})} /></div>
            <div><Label>Unit Cost</Label><Input type="number" value={form.unit_cost} onChange={e => setForm({...form, unit_cost: e.target.value})} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Unit</Label><ComboboxSelect value={form.unit} onChange={v => setForm({...form, unit: v})} options={["pcs","kg","m","ltr","box","set","roll"]} placeholder="Select unit" /></div>
            <div><Label>Location</Label><Input value={form.location} onChange={e => setForm({...form, location: e.target.value})} /></div>
          </div>
          <Button className="w-full" onClick={() => save.mutate()} disabled={!form.name || save.isPending}>{save.isPending ? "Saving..." : editingId ? "Update" : "Add Item"}</Button>
        </div>
      </DialogContent></Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} onConfirm={() => deleteId && del.mutate(deleteId)} />
    </div>
  );
}
