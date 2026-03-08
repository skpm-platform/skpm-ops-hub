import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

export default function PurchaseOrders() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ vendor: "", total: "" });

  const { data = [], isLoading } = useQuery({
    queryKey: ["purchase_orders"],
    queryFn: async () => { const { data } = await (supabase as any).from("purchase_orders").select("*").order("created_at", { ascending: false }); return data || []; },
  });

  const save = useMutation({
    mutationFn: async () => { const { error } = await (supabase as any).from("purchase_orders").insert({ ...form, total: parseFloat(form.total) || 0, po_no: `PO-${Date.now().toString().slice(-6)}`, created_by: user?.id }); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["purchase_orders"] }); toast.success("PO created"); setOpen(false); setForm({ vendor: "", total: "" }); },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = data.filter((r: any) => JSON.stringify(r).toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><ShoppingCart className="h-7 w-7 text-primary" /><h1 className="text-2xl font-bold">Purchase Orders</h1></div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New PO</Button>
      </div>
      <Card><CardContent className="pt-6">
        <div className="mb-4 relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No purchase orders</p> : (
          <Table><TableHeader><TableRow><TableHead>PO #</TableHead><TableHead>Vendor</TableHead><TableHead>Total (AED)</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>{filtered.map((r: any) => (
              <TableRow key={r.id}><TableCell className="font-medium">{r.po_no}</TableCell><TableCell>{r.vendor}</TableCell><TableCell>{r.total?.toLocaleString()}</TableCell><TableCell><Badge variant={r.status === "received" ? "default" : "secondary"}>{r.status}</Badge></TableCell></TableRow>
            ))}</TableBody></Table>)}
      </CardContent></Card>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent>
        <DialogHeader><DialogTitle>New Purchase Order</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Vendor</Label><Input value={form.vendor} onChange={e => setForm({...form, vendor: e.target.value})} /></div>
          <div><Label>Total (AED)</Label><Input type="number" value={form.total} onChange={e => setForm({...form, total: e.target.value})} /></div>
          <Button className="w-full" onClick={() => save.mutate()} disabled={!form.vendor || save.isPending}>{save.isPending ? "Creating..." : "Create PO"}</Button>
        </div>
      </DialogContent></Dialog>
    </div>
  );
}
