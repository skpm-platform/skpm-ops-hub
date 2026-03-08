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
import { Plus, Search, Home } from "lucide-react";
import { toast } from "sonner";

export default function Accommodation() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ camp_name: "", location: "", total_beds: "", cost_per_bed: "" });

  const { data = [], isLoading } = useQuery({
    queryKey: ["accommodations"],
    queryFn: async () => { const { data } = await (supabase as any).from("accommodations").select("*").order("created_at", { ascending: false }); return data || []; },
  });

  const save = useMutation({
    mutationFn: async () => { const { error } = await (supabase as any).from("accommodations").insert({ ...form, total_beds: parseInt(form.total_beds) || 0, cost_per_bed: parseFloat(form.cost_per_bed) || 0 }); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["accommodations"] }); toast.success("Camp added"); setOpen(false); setForm({ camp_name: "", location: "", total_beds: "", cost_per_bed: "" }); },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = data.filter((r: any) => r.camp_name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><Home className="h-7 w-7 text-primary" /><h1 className="text-2xl font-bold">Accommodation</h1></div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Camp</Button>
      </div>
      <Card><CardContent className="pt-6">
        <div className="mb-4 relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No accommodations</p> : (
          <Table><TableHeader><TableRow><TableHead>Camp</TableHead><TableHead>Location</TableHead><TableHead>Total Beds</TableHead><TableHead>Occupied</TableHead><TableHead>Available</TableHead><TableHead>Occupancy %</TableHead></TableRow></TableHeader>
            <TableBody>{filtered.map((r: any) => {
              const avail = (r.total_beds || 0) - (r.occupied_beds || 0);
              const occ = r.total_beds ? Math.round((r.occupied_beds || 0) / r.total_beds * 100) : 0;
              return (
              <TableRow key={r.id}><TableCell className="font-medium">{r.camp_name}</TableCell><TableCell>{r.location}</TableCell><TableCell>{r.total_beds}</TableCell><TableCell>{r.occupied_beds || 0}</TableCell><TableCell>{avail}</TableCell><TableCell><Badge variant={occ > 90 ? "destructive" : "default"}>{occ}%</Badge></TableCell></TableRow>
            );})}</TableBody></Table>)}
      </CardContent></Card>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent>
        <DialogHeader><DialogTitle>Add Camp</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Camp Name</Label><Input value={form.camp_name} onChange={e => setForm({...form, camp_name: e.target.value})} /></div>
          <div><Label>Location</Label><Input value={form.location} onChange={e => setForm({...form, location: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Total Beds</Label><Input type="number" value={form.total_beds} onChange={e => setForm({...form, total_beds: e.target.value})} /></div>
            <div><Label>Cost/Bed (AED)</Label><Input type="number" value={form.cost_per_bed} onChange={e => setForm({...form, cost_per_bed: e.target.value})} /></div>
          </div>
          <Button className="w-full" onClick={() => save.mutate()} disabled={!form.camp_name || save.isPending}>{save.isPending ? "Saving..." : "Add Camp"}</Button>
        </div>
      </DialogContent></Dialog>
    </div>
  );
}
