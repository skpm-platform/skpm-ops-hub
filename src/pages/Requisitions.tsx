import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function Requisitions() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ trade: "", quantity: 1, duration: "", start_date: "" });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["requisitions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("requisitions").select("*, clients(name), sites(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("requisitions").insert({ ...form, quantity: Number(form.quantity), created_by: user?.id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["requisitions"] }); setOpen(false); setForm({ trade: "", quantity: 1, duration: "", start_date: "" }); toast({ title: "Requisition created" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filtered = rows.filter((r: any) => r.trade?.toLowerCase().includes(search.toLowerCase()) || r.status?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Requisitions</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New Requisition</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Requisition</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Trade / Skill" value={form.trade} onChange={e => setForm(f => ({ ...f, trade: e.target.value }))} />
              <Input type="number" min={1} placeholder="Quantity" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))} />
              <Input placeholder="Duration (e.g. 3 months)" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} />
              <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
              <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} /></div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Trade</TableHead><TableHead>Qty</TableHead><TableHead>Duration</TableHead><TableHead>Start</TableHead><TableHead>Client</TableHead><TableHead>Site</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Loading...</TableCell></TableRow> :
            filtered.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No requisitions</TableCell></TableRow> :
            filtered.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell>{r.trade ?? "—"}</TableCell>
                <TableCell>{r.quantity}</TableCell>
                <TableCell>{r.duration ?? "—"}</TableCell>
                <TableCell>{r.start_date ? format(new Date(r.start_date), "dd MMM yyyy") : "—"}</TableCell>
                <TableCell>{r.clients?.name ?? "—"}</TableCell>
                <TableCell>{r.sites?.name ?? "—"}</TableCell>
                <TableCell><Badge variant={r.status === "approved" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
