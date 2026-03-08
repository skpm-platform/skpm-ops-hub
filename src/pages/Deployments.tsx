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
import { format } from "date-fns";

export default function Deployments() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ daily_rate: 0, start_date: "", end_date: "" });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["deployments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("deployments").select("*, workers(name), requisitions(trade)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("deployments").insert({ ...form, daily_rate: Number(form.daily_rate) });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["deployments"] }); setOpen(false); setForm({ daily_rate: 0, start_date: "", end_date: "" }); toast({ title: "Deployment created" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filtered = rows.filter((r: any) => r.workers?.name?.toLowerCase().includes(search.toLowerCase()) || r.status?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Deployments</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New Deployment</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Deployment</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input type="number" placeholder="Daily Rate" value={form.daily_rate} onChange={e => setForm(f => ({ ...f, daily_rate: Number(e.target.value) }))} />
              <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
              <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
              <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} /></div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Worker</TableHead><TableHead>Trade</TableHead><TableHead>Daily Rate</TableHead><TableHead>Start</TableHead><TableHead>End</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Loading...</TableCell></TableRow> :
            filtered.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No deployments</TableCell></TableRow> :
            filtered.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell>{r.workers?.name ?? "—"}</TableCell>
                <TableCell>{r.requisitions?.trade ?? "—"}</TableCell>
                <TableCell>{r.daily_rate}</TableCell>
                <TableCell>{r.start_date ? format(new Date(r.start_date), "dd MMM yyyy") : "—"}</TableCell>
                <TableCell>{r.end_date ? format(new Date(r.end_date), "dd MMM yyyy") : "—"}</TableCell>
                <TableCell><Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
