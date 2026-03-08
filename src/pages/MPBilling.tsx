import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function MPBilling() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), total_workers: 0, total_days: 0, rate: 0, notes: "" });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["mp_billing"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mp_billing").select("*, clients(name), projects(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const total_amount = Number(form.total_workers) * Number(form.total_days) * Number(form.rate);
      const { error } = await supabase.from("mp_billing").insert({
        ...form,
        total_workers: Number(form.total_workers),
        total_days: Number(form.total_days),
        rate: Number(form.rate),
        total_amount,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mp_billing"] }); setOpen(false); setForm({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), total_workers: 0, total_days: 0, rate: 0, notes: "" }); toast({ title: "Billing record created" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filtered = rows.filter((r: any) => r.clients?.name?.toLowerCase().includes(search.toLowerCase()) || r.status?.toLowerCase().includes(search.toLowerCase()));

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">MP Billing</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New Billing</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New MP Billing</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" min={1} max={12} placeholder="Month" value={form.month} onChange={e => setForm(f => ({ ...f, month: Number(e.target.value) }))} />
                <Input type="number" placeholder="Year" value={form.year} onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) }))} />
              </div>
              <Input type="number" min={0} placeholder="Total Workers" value={form.total_workers} onChange={e => setForm(f => ({ ...f, total_workers: Number(e.target.value) }))} />
              <Input type="number" min={0} placeholder="Total Days" value={form.total_days} onChange={e => setForm(f => ({ ...f, total_days: Number(e.target.value) }))} />
              <Input type="number" min={0} placeholder="Daily Rate" value={form.rate} onChange={e => setForm(f => ({ ...f, rate: Number(e.target.value) }))} />
              <div className="text-sm text-muted-foreground">Total: {(Number(form.total_workers) * Number(form.total_days) * Number(form.rate)).toLocaleString()} AED</div>
              <Input placeholder="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} /></div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Period</TableHead><TableHead>Client</TableHead><TableHead>Project</TableHead><TableHead>Workers</TableHead><TableHead>Days</TableHead><TableHead>Rate</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Loading...</TableCell></TableRow> :
            filtered.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No billing records</TableCell></TableRow> :
            filtered.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell>{months[r.month - 1]} {r.year}</TableCell>
                <TableCell>{r.clients?.name ?? "—"}</TableCell>
                <TableCell>{r.projects?.name ?? "—"}</TableCell>
                <TableCell>{r.total_workers}</TableCell>
                <TableCell>{r.total_days}</TableCell>
                <TableCell>{r.rate}</TableCell>
                <TableCell className="font-medium">{Number(r.total_amount).toLocaleString()} AED</TableCell>
                <TableCell><Badge variant={r.status === "invoiced" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
