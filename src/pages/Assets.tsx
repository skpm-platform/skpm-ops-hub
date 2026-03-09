import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Package, Pencil, Trash2, Eye, LayoutGrid, List, Car, Monitor, Wrench, HardHat, Armchair, Cog, TrendingDown, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { ComboboxSelect } from "@/components/ComboboxSelect";
import { StatusFilter } from "@/components/StatusFilter";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ExportButton } from "@/components/ExportButton";
import { differenceInYears, parseISO, format } from "date-fns";

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
const categoryIcons: Record<string, any> = {
  vehicle: Car, equipment: Wrench, tool: Wrench, it: Monitor, furniture: Armchair, machinery: Cog, safety: HardHat,
};
const categoryColors: Record<string, string> = {
  vehicle: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  equipment: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  tool: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  it: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  furniture: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  machinery: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  safety: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const emptyForm = { name: "", category: "equipment", location: "", purchase_price: "", purchase_date: "", status: "active" };

function calcDepreciation(purchasePrice: number, purchaseDate: string | null): number {
  if (!purchaseDate || !purchasePrice) return purchasePrice;
  const years = differenceInYears(new Date(), parseISO(purchaseDate));
  const rate = 0.15; // 15% straight-line depreciation
  const depreciated = purchasePrice * Math.pow(1 - rate, years);
  return Math.max(0, Math.round(depreciated));
}

export default function Assets() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
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
      const purchasePrice = parseFloat(form.purchase_price) || 0;
      const currentValue = calcDepreciation(purchasePrice, form.purchase_date || null);
      const payload = { ...form, purchase_price: purchasePrice, current_value: currentValue };
      if (editingId) {
        const { error } = await supabase.from("assets").update(payload).eq("id", editingId);
        if (error) throw error;
        await logAudit("Updated asset", form.name, "assets");
      } else {
        const { error } = await supabase.from("assets").insert({ ...payload, asset_tag: `AST-${Date.now().toString().slice(-6)}` });
        if (error) throw error;
        await logAudit("Created asset", `${form.name} — AED ${purchasePrice}`, "assets");
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["assets"] }); toast.success(editingId ? "Updated" : "Asset added"); setOpen(false); setEditingId(null); setForm(emptyForm); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const asset = data.find((r: any) => r.id === id);
      const { error } = await supabase.from("assets").delete().eq("id", id);
      if (error) throw error;
      await logAudit("Deleted asset", asset?.name, "assets");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["assets"] }); toast.success("Deleted"); setDeleteId(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const handleEdit = (r: any) => {
    setEditingId(r.id);
    setForm({ name: r.name || "", category: r.category || "equipment", location: r.location || "", purchase_price: String(r.purchase_price || ""), purchase_date: r.purchase_date || "", status: r.status || "active" });
    setOpen(true);
  };

  const filtered = data.filter((r: any) => {
    const matchSearch = r.name?.toLowerCase().includes(search.toLowerCase()) || r.asset_tag?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPurchaseValue = data.reduce((s: number, r: any) => s + (r.purchase_price || 0), 0);
  const totalCurrentValue = data.reduce((s: number, r: any) => s + calcDepreciation(r.purchase_price || 0, r.purchase_date), 0);
  const totalDepreciation = totalPurchaseValue - totalCurrentValue;
  const depreciationPercent = totalPurchaseValue > 0 ? Math.round((totalDepreciation / totalPurchaseValue) * 100) : 0;
  const maintenanceCount = data.filter((r: any) => r.status === "maintenance").length;

  // Category breakdown
  const categoryBreakdown = data.reduce((acc: Record<string, number>, r: any) => {
    acc[r.category || "other"] = (acc[r.category || "other"] || 0) + 1;
    return acc;
  }, {});

  const statuses = [
    { value: "all", label: "All", count: data.length },
    { value: "active", label: "Active", count: data.filter((r: any) => r.status === "active").length },
    { value: "maintenance", label: "Maintenance", count: maintenanceCount },
    { value: "disposed", label: "Disposed", count: data.filter((r: any) => r.status === "disposed").length },
  ];

  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

  const CatIcon = ({ category }: { category: string }) => {
    const Icon = categoryIcons[category] || Package;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Package className="h-6 w-6 text-primary" /></div>
          <div><h1 className="text-2xl font-bold">Assets</h1><p className="text-sm text-muted-foreground">{data.length} assets tracked</p></div>
        </div>
        <div className="flex gap-2">
          <div className="flex border rounded-md">
            <Button variant={viewMode === "table" ? "secondary" : "ghost"} size="icon" className="h-9 w-9 rounded-r-none" onClick={() => setViewMode("table")}><List className="h-4 w-4" /></Button>
            <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon" className="h-9 w-9 rounded-l-none" onClick={() => setViewMode("grid")}><LayoutGrid className="h-4 w-4" /></Button>
          </div>
          <ExportButton data={filtered} filename="assets" columns={[{ key: "asset_tag", label: "Tag" }, { key: "name", label: "Name" }, { key: "category", label: "Category" }, { key: "location", label: "Location" }, { key: "current_value", label: "Value" }, { key: "status", label: "Status" }]} />
          <Button onClick={() => { setEditingId(null); setForm(emptyForm); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add Asset</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Assets</p>
          <p className="text-2xl font-bold mt-1">{data.length}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {Object.entries(categoryBreakdown).slice(0, 3).map(([cat, count]) => (
              <Badge key={cat} variant="outline" className="text-[10px] capitalize">{cat}: {count as number}</Badge>
            ))}
          </div>
        </CardContent></Card>
        <Card className="hover:shadow-md transition-shadow"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Purchase Value</p>
          <p className="text-2xl font-bold mt-1">AED {totalPurchaseValue.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">Original cost</p>
        </CardContent></Card>
        <Card className="hover:shadow-md transition-shadow"><CardContent className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Current Value</p>
            <TrendingDown className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold mt-1">AED {totalCurrentValue.toLocaleString()}</p>
          <div className="flex items-center gap-2 mt-1">
            <Progress value={100 - depreciationPercent} className="h-1.5 flex-1" />
            <span className="text-xs text-muted-foreground">{depreciationPercent}% dep.</span>
          </div>
        </CardContent></Card>
        <Card className="hover:shadow-md transition-shadow"><CardContent className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">In Maintenance</p>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-1">{maintenanceCount}</p>
          <p className="text-xs text-muted-foreground mt-1">{data.length > 0 ? Math.round((maintenanceCount / data.length) * 100) : 0}% of fleet</p>
        </CardContent></Card>
      </div>

      <Card><CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search assets..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
          <StatusFilter statuses={statuses} selected={statusFilter} onSelect={setStatusFilter} />
        </div>

        {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No assets found</p> : viewMode === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pageData.map((r: any) => {
              const currentVal = calcDepreciation(r.purchase_price || 0, r.purchase_date);
              const depPct = r.purchase_price ? Math.round(((r.purchase_price - currentVal) / r.purchase_price) * 100) : 0;
              return (
                <Card key={r.id} className="hover:shadow-md transition-all group cursor-pointer" onClick={() => { setViewing(r); setViewOpen(true); }}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${categoryColors[r.category] || "bg-muted"}`}>
                        <CatIcon category={r.category} />
                      </div>
                      <Badge variant={r.status === "active" ? "default" : r.status === "maintenance" ? "secondary" : "outline"}>{r.status}</Badge>
                    </div>
                    <div>
                      <p className="font-semibold">{r.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{r.asset_tag}</p>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{r.location || "No location"}</span>
                      <span className="font-semibold">AED {currentVal.toLocaleString()}</span>
                    </div>
                    {r.purchase_price > 0 && (
                      <div className="flex items-center gap-2">
                        <Progress value={100 - depPct} className="h-1.5 flex-1" />
                        <span className="text-xs text-muted-foreground">{depPct}%↓</span>
                      </div>
                    )}
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
            <div className="overflow-x-auto">
              <Table><TableHeader><TableRow>
                <SortableHeader label="Tag" sortKey="asset_tag" direction={getSortDirection("asset_tag")} onToggle={toggleSort} />
                <SortableHeader label="Name" sortKey="name" direction={getSortDirection("name")} onToggle={toggleSort} />
                <SortableHeader label="Category" sortKey="category" direction={getSortDirection("category")} onToggle={toggleSort} />
                <SortableHeader label="Location" sortKey="location" direction={getSortDirection("location")} onToggle={toggleSort} />
                <SortableHeader label="Purchase (AED)" sortKey="purchase_price" direction={getSortDirection("purchase_price")} onToggle={toggleSort} />
                <SortableHeader label="Current (AED)" sortKey="current_value" direction={getSortDirection("current_value")} onToggle={toggleSort} />
                <SortableHeader label="Status" sortKey="status" direction={getSortDirection("status")} onToggle={toggleSort} />
                <SortableHeader label="Actions" sortKey="" direction={null} onToggle={() => {}} />
              </TableRow></TableHeader>
                <TableBody>{pageData.map((r: any) => {
                  const currentVal = calcDepreciation(r.purchase_price || 0, r.purchase_date);
                  return (
                    <TableRow key={r.id} className="group">
                      <TableCell className="text-xs font-mono">{r.asset_tag}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`h-7 w-7 rounded flex items-center justify-center ${categoryColors[r.category] || "bg-muted"}`}>
                            <CatIcon category={r.category} />
                          </div>
                          <span className="font-medium">{r.name}</span>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{r.category}</Badge></TableCell>
                      <TableCell>{r.location || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{r.purchase_price?.toLocaleString()}</TableCell>
                      <TableCell className="font-medium">{currentVal.toLocaleString()}</TableCell>
                      <TableCell><Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
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
            </div>
          </>
        )}
        <DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
      </CardContent></Card>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditingId(null); setForm(emptyForm); } }}><DialogContent>
        <DialogHeader><DialogTitle>{editingId ? "Edit Asset" : "Add Asset"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Category</Label><ComboboxSelect value={form.category} onValueChange={v => setForm({ ...form, category: v })} options={categoryOptions} placeholder="Select or type..." /></div>
          <div><Label>Location</Label><ComboboxSelect value={form.location} onValueChange={v => setForm({ ...form, location: v })} options={locationOptions} placeholder="Select or type..." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Purchase Price (AED)</Label><Input type="number" value={form.purchase_price} onChange={e => setForm({ ...form, purchase_price: e.target.value })} /></div>
            <div><Label>Purchase Date</Label><Input type="date" value={form.purchase_date} onChange={e => setForm({ ...form, purchase_date: e.target.value })} /></div>
          </div>
          {editingId && <div><Label>Status</Label><ComboboxSelect value={form.status} onValueChange={v => setForm({ ...form, status: v })} options={[{ value: "active", label: "Active" }, { value: "maintenance", label: "Maintenance" }, { value: "disposed", label: "Disposed" }]} allowCustom={false} /></div>}
          <Button className="w-full" onClick={() => save.mutate()} disabled={!form.name || save.isPending}>{save.isPending ? "Saving..." : editingId ? "Update" : "Add Asset"}</Button>
        </div>
      </DialogContent></Dialog>

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}><DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Asset Details</DialogTitle></DialogHeader>
        {viewing && (() => {
          const currentVal = calcDepreciation(viewing.purchase_price || 0, viewing.purchase_date);
          const depPct = viewing.purchase_price ? Math.round(((viewing.purchase_price - currentVal) / viewing.purchase_price) * 100) : 0;
          return (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${categoryColors[viewing.category] || "bg-muted"}`}>
                  <CatIcon category={viewing.category} />
                </div>
                <div>
                  <p className="font-semibold text-lg">{viewing.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{viewing.asset_tag}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[["Category", viewing.category], ["Location", viewing.location], ["Status", viewing.status], ["Purchase Date", viewing.purchase_date ? format(parseISO(viewing.purchase_date), "MMM dd, yyyy") : "—"]].map(([l, v]) => (
                  <div key={l as string}><p className="text-muted-foreground text-xs">{l}</p><p className="font-medium capitalize">{v || "—"}</p></div>
                ))}
              </div>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Purchase Price</span><span className="font-medium">AED {viewing.purchase_price?.toLocaleString()}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Current Value</span><span className="font-semibold text-primary">AED {currentVal.toLocaleString()}</span></div>
                <Progress value={100 - depPct} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">{depPct}% depreciated (15% annual rate)</p>
              </div>
            </div>
          );
        })()}
      </DialogContent></Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete Asset?" onConfirm={() => deleteId && remove.mutate(deleteId)} />
    </div>
  );
}
