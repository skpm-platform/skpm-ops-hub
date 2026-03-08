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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, FileSignature } from "lucide-react";
import { toast } from "sonner";

export default function Quotations() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ client_id: "", valid_until: "", subtotal: "", status: "draft" });

  const { data = [], isLoading } = useQuery({
    queryKey: ["quotations"],
    queryFn: async () => { const { data } = await (supabase as any).from("quotations").select("*, clients(name)").order("created_at", { ascending: false }); return data || []; },
  });
  const { data: clients = [] } = useQuery({ queryKey: ["clients-q"], queryFn: async () => { const { data } = await (supabase as any).from("clients").select("id,name"); return data || []; } });

  const save = useMutation({
    mutationFn: async () => {
      const subtotal = parseFloat(form.subtotal) || 0;
      const vat = subtotal * 0.05;
      const { error } = await (supabase as any).from("quotations").insert({ ...form, subtotal, vat, total: subtotal + vat, quote_no: `QT-${Date.now().toString().slice(-6)}`, created_by: user?.id, client_id: form.client_id || null });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quotations"] }); toast.success("Quotation created"); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = data.filter((r: any) => (r.quote_no || "").toLowerCase().includes(search.toLowerCase()) || (r.clients?.name || "").toLowerCase().includes(search.toLowerCase()));
  const stC: Record<string,string> = { draft: "bg-gray-100 text-gray-700", sent: "bg-blue-100 text-blue-700", approved: "bg-emerald-100 text-emerald-700", rejected: "bg-red-100 text-red-700" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><FileSignature className="h-7 w-7 text-primary" /><h1 className="text-2xl font-bold">Quotations</h1></div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New Quotation</Button>
      </div>
      <Card><CardContent className="pt-6">
        <div className="mb-4 relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No quotations</p> : (
          <Table><TableHeader><TableRow><TableHead>Quote #</TableHead><TableHead>Client</TableHead><TableHead>Total (AED)</TableHead><TableHead>Valid Until</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>{filtered.map((r: any) => (
              <TableRow key={r.id}><TableCell className="font-medium">{r.quote_no}</TableCell><TableCell>{r.clients?.name || "—"}</TableCell><TableCell>{r.total?.toLocaleString()}</TableCell><TableCell>{r.valid_until}</TableCell><TableCell><Badge className={stC[r.status] || ""}>{r.status}</Badge></TableCell></TableRow>
            ))}</TableBody></Table>)}
      </CardContent></Card>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent>
        <DialogHeader><DialogTitle>New Quotation</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Client</Label><Select value={form.client_id} onValueChange={v => setForm({...form, client_id: v})}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Subtotal (AED)</Label><Input type="number" value={form.subtotal} onChange={e => setForm({...form, subtotal: e.target.value})} /><p className="text-xs text-muted-foreground mt-1">VAT (5%) will be added automatically</p></div>
          <div><Label>Valid Until</Label><Input type="date" value={form.valid_until} onChange={e => setForm({...form, valid_until: e.target.value})} /></div>
          <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Creating..." : "Create Quotation"}</Button>
        </div>
      </DialogContent></Dialog>
    </div>
  );
}
