import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Package } from "lucide-react";
import { toast } from "sonner";

export default function Warehouse() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", sku: "", category: "", quantity: "", min_stock: "", unit_cost: "", unit: "pcs", location: "" });

  const { data = [], isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => { const { data } = await (supabase as any).from("inventory").select("*").order("name"); return data || []; },
  });

  const save = useMutation({
    mutationFn: async () => { const { error } = await (supabase as any).from("inventory").insert({ ...form, quantity: parseInt(form.quantity) || 0, min_stock: parseInt(form.min_stock) || 0, unit_cost: parseFloat(form.unit_cost) || 0, sku: form.sku || `SKU-${Date.now().toString().slice(-6)}` }); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["inventory"] }); toast.success("Item added"); setOpen(false); setForm({ name: "", sku: "", category: "", quantity: "", min_stock: "", unit_cost: "", unit: "pcs", location: "" }); },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = data.filter((r: any) => r.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><Package className="h-7 w-7 text-primary" /><h1 className="text-2xl font-bold">Warehouse</h1></div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Item</Button>
      </div>
      <Card><CardContent className="pt-6">
        <div className="mb-4 relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search inventory..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No inventory</p> : (
          <Table><TableHeader><TableRow><TableHead>SKU</TableHead><TableHead>Item</TableHead><TableHead>Category</TableHead><TableHead>Qty</TableHead><TableHead>Min</TableHead><TableHead>Unit Cost</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>{filtered.map((r: any) => (
              <TableRow key={r.id}><TableCell className="text-xs">{r.sku}</TableCell><TableCell className="font-medium">{r.name}</TableCell><TableCell>{r.category}</TableCell><TableCell>{r.quantity}</TableCell><TableCell>{r.min_stock}</TableCell><TableCell>{r.unit_cost?.toLocaleString()}</TableCell><TableCell>{r.quantity <= r.min_stock ? <Badge variant="destructive">Low Stock</Badge> : <Badge variant="default">OK</Badge>}</TableCell></TableRow>
            ))}</TableBody></Table>)}
      </CardContent></Card>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent>
        <DialogHeader><DialogTitle>Add Inventory Item</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Item Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>SKU</Label><Input value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} placeholder="Auto-generated" /></div>
            <div><Label>Category</Label><Input value={form.category} onChange={e => setForm({...form, category: e.target.value})} /></div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label>Quantity</Label><Input type="number" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} /></div>
            <div><Label>Min Stock</Label><Input type="number" value={form.min_stock} onChange={e => setForm({...form, min_stock: e.target.value})} /></div>
            <div><Label>Unit Cost</Label><Input type="number" value={form.unit_cost} onChange={e => setForm({...form, unit_cost: e.target.value})} /></div>
          </div>
          <div><Label>Location</Label><Input value={form.location} onChange={e => setForm({...form, location: e.target.value})} /></div>
          <Button className="w-full" onClick={() => save.mutate()} disabled={!form.name || save.isPending}>{save.isPending ? "Saving..." : "Add Item"}</Button>
        </div>
      </DialogContent></Dialog>
    </div>
  );
}
