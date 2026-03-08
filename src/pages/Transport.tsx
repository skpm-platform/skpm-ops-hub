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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Truck } from "lucide-react";
import { toast } from "sonner";

export default function Transport() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ make_model: "", plate_number: "", type: "car", capacity: "" });

  const { data = [], isLoading } = useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => { const { data } = await (supabase as any).from("vehicles").select("*").order("created_at", { ascending: false }); return data || []; },
  });

  const save = useMutation({
    mutationFn: async () => { const { error } = await (supabase as any).from("vehicles").insert({ ...form, capacity: parseInt(form.capacity) || null, vehicle_no: `VEH-${Date.now().toString().slice(-6)}` }); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vehicles"] }); toast.success("Vehicle added"); setOpen(false); setForm({ make_model: "", plate_number: "", type: "car", capacity: "" }); },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = data.filter((r: any) => JSON.stringify(r).toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><Truck className="h-7 w-7 text-primary" /><h1 className="text-2xl font-bold">Transport</h1></div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Vehicle</Button>
      </div>
      <Card><CardContent className="pt-6">
        <div className="mb-4 relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No vehicles</p> : (
          <Table><TableHeader><TableRow><TableHead>Vehicle #</TableHead><TableHead>Make/Model</TableHead><TableHead>Plate</TableHead><TableHead>Type</TableHead><TableHead>Capacity</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>{filtered.map((r: any) => (
              <TableRow key={r.id}><TableCell className="text-xs">{r.vehicle_no}</TableCell><TableCell className="font-medium">{r.make_model}</TableCell><TableCell>{r.plate_number}</TableCell><TableCell><Badge variant="outline">{r.type}</Badge></TableCell><TableCell>{r.capacity}</TableCell><TableCell><Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status}</Badge></TableCell></TableRow>
            ))}</TableBody></Table>)}
      </CardContent></Card>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent>
        <DialogHeader><DialogTitle>Add Vehicle</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Make/Model</Label><Input value={form.make_model} onChange={e => setForm({...form, make_model: e.target.value})} /></div>
          <div><Label>Plate Number</Label><Input value={form.plate_number} onChange={e => setForm({...form, plate_number: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Type</Label><Select value={form.type} onValueChange={v => setForm({...form, type: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="bus">Bus</SelectItem><SelectItem value="van">Van</SelectItem><SelectItem value="pickup">Pickup</SelectItem><SelectItem value="car">Car</SelectItem></SelectContent></Select></div>
            <div><Label>Capacity</Label><Input type="number" value={form.capacity} onChange={e => setForm({...form, capacity: e.target.value})} /></div>
          </div>
          <Button className="w-full" onClick={() => save.mutate()} disabled={!form.make_model || save.isPending}>{save.isPending ? "Saving..." : "Add Vehicle"}</Button>
        </div>
      </DialogContent></Dialog>
    </div>
  );
}
