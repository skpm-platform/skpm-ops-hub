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
import { Plus, Search, Package, AlertTriangle, Pencil, Trash2, LayoutGrid, List, Eye, Boxes, TrendingUp, BarChart3, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { toast } from "sonner";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { ExportButton } from "@/components/ExportButton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ComboboxSelect } from "@/components/ComboboxSelect";
import { format } from "date-fns";

const categoryColors: Record<string, string> = {
  tools: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  safety: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  electrical: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  plumbing: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  paint: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  hardware: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  consumables: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

export default function Warehouse() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewing, setViewing] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [stockAdjQty, setStockAdjQty] = useState("");
  const [form, setForm] = useState({ name: "", sku: "", category: "", quantity: "", min_stock: "", reorder_level: "", unit_cost: "", unit: "pcs", location: "" });

  const { data = [], isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => { const { data } = await (supabase as any).from("inventory").select("*").order("name"); return data || []; },
  });

  const resetForm = () => setForm({ name: "", sku: "", category: "", quantity: "", min_stock: "", reorder_level: "", unit_cost: "", unit: "pcs", location: "" });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { name: form.name, category: form.category, quantity: parseInt(form.quantity) || 0, min_stock: parseInt(form.min_stock) || 0, reorder_level: parseInt(form.reorder_level) || null, unit_cost: parseFloat(form.unit_cost) || 0, unit: form.unit, location: form.location, last_updated: new Date().toISOString(), ...(editingId ? {} : { sku: form.sku || `SKU-${Date.now().toString().slice(-6)}` }), ...(editingId && form.sku ? { sku: form.sku } : {}) };
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

  const stockAdjust = useMutation({
    mutationFn: async ({ id, delta, type }: { id: string; delta: number; type: "in" | "out" }) => {
      const item = data.find((r: any) => r.id === id);
      if (!item) throw new Error("Item not found");
      const newQty = Math.max(0, (item.quantity || 0) + delta);
      const { error } = await (supabase as any).from("inventory").update({ quantity: newQty, last_updated: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
      // Log movement
      await (supabase as any).from("inventory_movements").insert({ inventory_id: id, type, quantity: Math.abs(delta), note: `Stock ${type === "in" ? "In" : "Out"} via quick action` }).catch(() => {});
      return newQty;
    },
    onSuccess: (newQty, vars) => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      setViewing((prev: any) => prev ? { ...prev, quantity: newQty } : prev);
      setStockAdjQty("");
      toast.success(`Stock ${vars.type === "in" ? "added" : "removed"} successfully`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleEdit = (r: any) => {
    setEditingId(r.id);
    setForm({ name: r.name, sku: r.sku || "", category: r.category || "", quantity: String(r.quantity || ""), min_stock: String(r.min_stock || ""), reorder_level: String(r.reorder_level || ""), unit_cost: String(r.unit_cost || ""), unit: r.unit || "pcs", location: r.location || "" });
    setOpen(true);
  };

  const lowStockItems = data.filter((r: any) => r.quantity <= r.min_stock && r.min_stock > 0);
  const reorderItems = data.filter((r: any) => r.reorder_level != null && r.quantity <= r.reorder_level);
  const totalValue = data.reduce((s: number, r: any) => s + (r.quantity || 0) * (r.unit_cost || 0), 0);
  const totalItems = data.reduce((s: number, r: any) => s + (r.quantity || 0), 0);
  const categories = [...new Set(data.map((r: any) => r.category).filter(Boolean))] as string[];

  const categoryValues = categories.map(cat => ({
    name: cat,
    value: data.filter((r: any) => r.category === cat).reduce((s: number, r: any) => s + (r.quantity || 0) * (r.unit_cost || 0), 0),
    count: data.filter((r: any) => r.category === cat).length,
  })).sort((a, b) => b.value - a.value);

  const filtered = data
    .filter((r: any) => r.name?.toLowerCase().includes(search.toLowerCase()) || r.sku?.toLowerCase().includes(search.toLowerCase()))
    .filter((r: any) => stockFilter === "all" || (stockFilter === "low" && r.quantity <= r.min_stock && r.min_stock > 0) || (stockFilter === "ok" && (r.quantity > r.min_stock || r.min_stock === 0)))
    .filter((r: any) => categoryFilter === "all" || r.category === categoryFilter);
  const { pageData, page, totalPages, totalItems: paginatedTotal, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

  const stockLevel = (r: any) => {
    if (!r.min_stock || r.min_stock === 0) return "normal";
    const ratio = r.quantity / r.min_stock;
    if (ratio <= 1) return "critical";
    if (ratio <= 1.5) return "warning";
    return "normal";
  };

  const isLowStock = (r: any) => r.reorder_level != null ? r.quantity <= r.reorder_level : (r.min_stock > 0 && r.quantity <= r.min_stock);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Boxes className="h-6 w-6 text-primary" /></div>
          <div><h1 className="text-2xl font-bold">Warehouse</h1><p className="text-sm text-muted-foreground">{data.length} items, {totalItems.toLocaleString()} units</p></div>
        </div>
        <div className="flex gap-2">
          <div className="flex border rounded-md">
            <Button variant={viewMode === "table" ? "secondary" : "ghost"} size="icon" className="h-9 w-9 rounded-r-none" onClick={() => setViewMode("table")}><List className="h-4 w-4" /></Button>
            <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon" className="h-9 w-9 rounded-l-none" onClick={() => setViewMode("grid")}><LayoutGrid className="h-4 w-4" /></Button>
          </div>
          <ExportButton data={data} filename="inventory" />
          <Button onClick={() => { resetForm(); setEditingId(null); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add Item</Button>
        </div>
      </div>

      {/* Low Stock Alert */}
      {(lowStockItems.length > 0 || reorderItems.length > 0) && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <p className="font-semibold text-destructive">{lowStockItems.length} item{lowStockItems.length > 1 ? "s" : ""} below minimum stock{reorderItems.length > 0 ? ` • ${reorderItems.length} at reorder level` : ""}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {lowStockItems.slice(0, 5).map((r: any) => (
                <Badge key={r.id} variant="outline" className="text-destructive border-destructive/30">
                  {r.name}: {r.quantity}/{r.min_stock} {r.unit}
                </Badge>
              ))}
              {lowStockItems.length > 5 && <Badge variant="outline">+{lowStockItems.length - 5} more</Badge>}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow"><CardContent className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Items</p>
            <Package className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold mt-1">{data.length}</p>
          <p className="text-xs text-muted-foreground mt-1">{categories.length} categories</p>
        </CardContent></Card>
        <Card className="hover:shadow-md transition-shadow"><CardContent className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Stock Value</p>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold mt-1">AED {totalValue.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">{totalItems.toLocaleString()} total units</p>
        </CardContent></Card>
        <Card className="hover:shadow-md transition-shadow"><CardContent className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Low Stock Items</p>
            <AlertTriangle className={`h-4 w-4 ${lowStockItems.length > 0 ? "text-destructive" : "text-muted-foreground"}`} />
          </div>
          <p className={`text-2xl font-bold mt-1 ${lowStockItems.length > 0 ? "text-destructive" : ""}`}>{lowStockItems.length}</p>
          <p className="text-xs text-muted-foreground mt-1">{reorderItems.length} at reorder level</p>
        </CardContent></Card>
        <Card className="hover:shadow-md transition-shadow"><CardContent className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Top Category</p>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold mt-1 capitalize">{categoryValues[0]?.name || "—"}</p>
          <p className="text-xs text-muted-foreground mt-1">AED {(categoryValues[0]?.value || 0).toLocaleString()}</p>
        </CardContent></Card>
      </div>

      {/* Stock Filter */}
      <div className="flex gap-2 flex-wrap">
        <Button variant={stockFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setStockFilter("all")}>All ({data.length})</Button>
        <Button variant={stockFilter === "low" ? "destructive" : "outline"} size="sm" onClick={() => setStockFilter(stockFilter === "low" ? "all" : "low")} className="gap-1"><AlertTriangle className="h-3 w-3" />Low Stock ({lowStockItems.length})</Button>
        <Button variant={stockFilter === "ok" ? "default" : "outline"} size="sm" onClick={() => setStockFilter(stockFilter === "ok" ? "all" : "ok")}>In Stock ({data.length - lowStockItems.length})</Button>
      </div>

      {/* Category Filter */}
      {categories.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <Button variant={categoryFilter === "all" ? "secondary" : "outline"} size="sm" onClick={() => setCategoryFilter("all")}>All Categories</Button>
          {categories.map(cat => (
            <Button key={cat} variant={categoryFilter === cat ? "secondary" : "outline"} size="sm" className="capitalize" onClick={() => setCategoryFilter(categoryFilter === cat ? "all" : cat)}>{cat}</Button>
          ))}
        </div>
      )}

      <Card><CardContent className="pt-6">
        <div className="mb-4 relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search inventory..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>

        {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No inventory items found</p> : viewMode === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pageData.map((r: any) => {
              const level = stockLevel(r);
              const lowStock = isLowStock(r);
              const stockPct = r.min_stock > 0 ? Math.min(100, Math.round((r.quantity / (r.min_stock * 2)) * 100)) : 100;
              return (
                <Card key={r.id} className={`hover:shadow-md transition-all group cursor-pointer ${level === "critical" ? "border-destructive/30" : ""}`} onClick={() => { setViewing(r); setViewOpen(true); }}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <Badge className={`${categoryColors[r.category] || "bg-muted"} border-0 capitalize`}>{r.category || "other"}</Badge>
                      {lowStock ? <Badge variant="destructive" className="text-[10px]">Low Stock</Badge> :
                        level === "warning" ? <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] border-0">Warning</Badge> :
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] border-0">OK</Badge>}
                    </div>
                    <div>
                      <p className="font-semibold">{r.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{r.sku}</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Stock</span>
                        <span className="font-medium">{r.quantity} / {r.min_stock > 0 ? `${r.min_stock} min` : "∞"} {r.unit}</span>
                      </div>
                      <Progress value={stockPct} className={`h-1.5 ${level === "critical" ? "[&>div]:bg-destructive" : level === "warning" ? "[&>div]:bg-amber-500" : ""}`} />
                    </div>
                    <div className="flex justify-between text-sm pt-1">
                      <span className="text-muted-foreground">{r.location || "No location"}</span>
                      <span className="font-semibold">AED {((r.quantity || 0) * (r.unit_cost || 0)).toLocaleString()}</span>
                    </div>
                    {r.last_updated && <p className="text-[10px] text-muted-foreground">Updated: {format(new Date(r.last_updated), "dd MMM, HH:mm")}</p>}
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
          <>
            <Table><TableHeader><TableRow>
              <SortableHeader label="SKU" sortKey="sku" direction={getSortDirection("sku")} onToggle={toggleSort} />
              <SortableHeader label="Item" sortKey="name" direction={getSortDirection("name")} onToggle={toggleSort} />
              <SortableHeader label="Category" sortKey="category" direction={getSortDirection("category")} onToggle={toggleSort} />
              <SortableHeader label="Qty" sortKey="quantity" direction={getSortDirection("quantity")} onToggle={toggleSort} />
              <SortableHeader label="Min" sortKey="min_stock" direction={getSortDirection("min_stock")} onToggle={toggleSort} />
              <SortableHeader label="Reorder" sortKey="reorder_level" direction={getSortDirection("reorder_level")} onToggle={toggleSort} />
              <SortableHeader label="Unit Cost" sortKey="unit_cost" direction={getSortDirection("unit_cost")} onToggle={toggleSort} />
              <SortableHeader label="Status" sortKey="quantity" direction={null} onToggle={() => {}} />
              <SortableHeader label="Last Updated" sortKey="last_updated" direction={getSortDirection("last_updated")} onToggle={toggleSort} />
              <SortableHeader label="Actions" sortKey="" direction={null} onToggle={() => {}} />
            </TableRow></TableHeader>
              <TableBody>{pageData.map((r: any) => {
                const level = stockLevel(r);
                const lowStock = isLowStock(r);
                const stockPct = r.min_stock > 0 ? Math.min(100, Math.round((r.quantity / (r.min_stock * 2)) * 100)) : 100;
                return (
                  <TableRow key={r.id} className={`group ${level === "critical" ? "bg-destructive/5" : ""}`}>
                    <TableCell className="text-xs font-mono">{r.sku}</TableCell>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell><Badge className={`${categoryColors[r.category] || "bg-muted"} border-0 capitalize text-xs`}>{r.category || "—"}</Badge></TableCell>
                    <TableCell>
                      <span className={level === "critical" ? "text-destructive font-bold" : ""}>{r.quantity}</span>
                      <span className="text-muted-foreground text-xs ml-1">{r.unit}</span>
                    </TableCell>
                    <TableCell>{r.min_stock}</TableCell>
                    <TableCell>{r.reorder_level ?? "—"}</TableCell>
                    <TableCell>AED {r.unit_cost?.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <Progress value={stockPct} className={`h-1.5 flex-1 ${level === "critical" ? "[&>div]:bg-destructive" : level === "warning" ? "[&>div]:bg-amber-500" : ""}`} />
                        {lowStock && <Badge variant="destructive" className="text-[10px] shrink-0">Low</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.last_updated ? format(new Date(r.last_updated), "dd/MM HH:mm") : "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setViewing(r); setViewOpen(true); }}><Eye className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}</TableBody></Table>
          </>
        )}
        <DataTablePagination page={page} totalPages={totalPages} totalItems={paginatedTotal} pageSize={pageSize} onPageChange={setPage} />
      </CardContent></Card>

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}><DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Item Details</DialogTitle></DialogHeader>
        {viewing && (() => {
          const level = stockLevel(viewing);
          const lowStock = isLowStock(viewing);
          const stockPct = viewing.min_stock > 0 ? Math.min(100, Math.round((viewing.quantity / (viewing.min_stock * 2)) * 100)) : 100;
          const itemValue = (viewing.quantity || 0) * (viewing.unit_cost || 0);
          return (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${categoryColors[viewing.category] || "bg-muted"}`}>
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-lg">{viewing.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{viewing.sku}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-muted-foreground text-xs">Category</p><p className="font-medium capitalize">{viewing.category || "—"}</p></div>
                <div><p className="text-muted-foreground text-xs">Location</p><p className="font-medium">{viewing.location || "—"}</p></div>
                <div><p className="text-muted-foreground text-xs">Unit</p><p className="font-medium">{viewing.unit}</p></div>
                <div><p className="text-muted-foreground text-xs">Unit Cost</p><p className="font-medium">AED {viewing.unit_cost?.toLocaleString()}</p></div>
                {viewing.reorder_level != null && <div><p className="text-muted-foreground text-xs">Reorder Level</p><p className="font-medium">{viewing.reorder_level} {viewing.unit}</p></div>}
                {viewing.last_updated && <div><p className="text-muted-foreground text-xs">Last Updated</p><p className="font-medium">{format(new Date(viewing.last_updated), "dd MMM yyyy, HH:mm")}</p></div>}
              </div>
              {lowStock && <Badge variant="destructive" className="text-xs">⚠ Low Stock Alert</Badge>}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Current Stock</span>
                  <span className={`font-bold ${level === "critical" ? "text-destructive" : ""}`}>{viewing.quantity} {viewing.unit}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Minimum Required</span>
                  <span>{viewing.min_stock} {viewing.unit}</span>
                </div>
                <Progress value={stockPct} className={`h-2 ${level === "critical" ? "[&>div]:bg-destructive" : level === "warning" ? "[&>div]:bg-amber-500" : ""}`} />
                <div className="flex justify-between text-sm pt-1 border-t">
                  <span>Total Value</span>
                  <span className="font-semibold">AED {itemValue.toLocaleString()}</span>
                </div>
              </div>
              {/* Stock In/Out */}
              <div className="border rounded-lg p-3 space-y-2">
                <p className="text-sm font-medium">Quick Stock Adjustment</p>
                <Input type="number" placeholder="Quantity" value={stockAdjQty} onChange={e => setStockAdjQty(e.target.value)} className="h-8" min="1" />
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 gap-1 bg-emerald-600 hover:bg-emerald-700" disabled={!stockAdjQty || stockAdjust.isPending} onClick={() => stockAdjust.mutate({ id: viewing.id, delta: parseInt(stockAdjQty) || 0, type: "in" })}>
                    <ArrowDownToLine className="h-3.5 w-3.5" />Stock In
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 gap-1 text-destructive border-destructive/30" disabled={!stockAdjQty || stockAdjust.isPending} onClick={() => stockAdjust.mutate({ id: viewing.id, delta: -(parseInt(stockAdjQty) || 0), type: "out" })}>
                    <ArrowUpFromLine className="h-3.5 w-3.5" />Stock Out
                  </Button>
                </div>
              </div>
            </div>
          );
        })()}
      </DialogContent></Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { setEditingId(null); resetForm(); } }}><DialogContent>
        <DialogHeader><DialogTitle>{editingId ? "Edit" : "Add"} Inventory Item</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Item Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>SKU</Label><Input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} placeholder="Auto-generated" /></div>
            <div><Label>Category</Label><ComboboxSelect value={form.category} onChange={v => setForm({ ...form, category: v })} options={["tools", "safety", "electrical", "plumbing", "paint", "hardware", "consumables"]} placeholder="Select or type" /></div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <div><Label>Quantity</Label><Input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></div>
            <div><Label>Min Stock</Label><Input type="number" value={form.min_stock} onChange={e => setForm({ ...form, min_stock: e.target.value })} /></div>
            <div><Label>Reorder Level</Label><Input type="number" value={form.reorder_level} onChange={e => setForm({ ...form, reorder_level: e.target.value })} placeholder="Optional" /></div>
            <div><Label>Unit Cost</Label><Input type="number" value={form.unit_cost} onChange={e => setForm({ ...form, unit_cost: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Unit</Label><ComboboxSelect value={form.unit} onChange={v => setForm({ ...form, unit: v })} options={["pcs", "kg", "m", "ltr", "box", "set", "roll"]} placeholder="Select unit" /></div>
            <div><Label>Location</Label><Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
          </div>
          <Button className="w-full" onClick={() => save.mutate()} disabled={!form.name || save.isPending}>{save.isPending ? "Saving..." : editingId ? "Update" : "Add Item"}</Button>
        </div>
      </DialogContent></Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} onConfirm={() => deleteId && del.mutate(deleteId)} />
    </div>
  );
}
