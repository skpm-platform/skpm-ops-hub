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
import { Plus, Search, CreditCard } from "lucide-react";
import { toast } from "sonner";

export default function Expenses() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ description: "", category: "materials", amount: "", date: "" });

  const { data = [], isLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => { const { data } = await (supabase as any).from("expenses").select("*").order("created_at", { ascending: false }); return data || []; },
  });

  const save = useMutation({
    mutationFn: async () => { const { error } = await (supabase as any).from("expenses").insert({ ...form, amount: parseFloat(form.amount) || 0, submitted_by: user?.id }); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); toast.success("Expense submitted"); setOpen(false); setForm({ description: "", category: "materials", amount: "", date: "" }); },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = data.filter((r: any) => JSON.stringify(r).toLowerCase().includes(search.toLowerCase()));
  const stC: Record<string,string> = { pending: "bg-amber-100 text-amber-700", approved: "bg-emerald-100 text-emerald-700", rejected: "bg-red-100 text-red-700" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><CreditCard className="h-7 w-7 text-primary" /><h1 className="text-2xl font-bold">Expenses</h1></div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Submit Expense</Button>
      </div>
      <Card><CardContent className="pt-6">
        <div className="mb-4 relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No expenses</p> : (
          <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Category</TableHead><TableHead>Description</TableHead><TableHead>Amount (AED)</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>{filtered.map((r: any) => (
              <TableRow key={r.id}><TableCell>{r.date}</TableCell><TableCell><Badge variant="outline">{r.category}</Badge></TableCell><TableCell>{r.description}</TableCell><TableCell className="font-medium">{r.amount?.toLocaleString()}</TableCell><TableCell><Badge className={stC[r.status] || ""}>{r.status}</Badge></TableCell></TableRow>
            ))}</TableBody></Table>)}
      </CardContent></Card>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent>
        <DialogHeader><DialogTitle>Submit Expense</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
          <div><Label>Category</Label><Select value={form.category} onValueChange={v => setForm({...form, category: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="fuel">Fuel</SelectItem><SelectItem value="materials">Materials</SelectItem><SelectItem value="labour">Labour</SelectItem><SelectItem value="equipment">Equipment</SelectItem><SelectItem value="travel">Travel</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
          <div><Label>Description</Label><Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
          <div><Label>Amount (AED)</Label><Input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} /></div>
          <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Submitting..." : "Submit"}</Button>
        </div>
      </DialogContent></Dialog>
    </div>
  );
}
