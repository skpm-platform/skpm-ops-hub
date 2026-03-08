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
import { Plus, Search, Calendar } from "lucide-react";
import { toast } from "sonner";

export default function Maintenance() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ asset_name: "", type: "preventive", frequency: "monthly", next_due: "", status: "scheduled" });

  const { data = [], isLoading } = useQuery({
    queryKey: ["maintenance"],
    queryFn: async () => { const { data } = await (supabase as any).from("maintenance_schedules").select("*").order("next_due", { ascending: true }); return data || []; },
  });

  const save = useMutation({
    mutationFn: async () => { const { error } = await (supabase as any).from("maintenance_schedules").insert(form); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["maintenance"] }); toast.success("Schedule added"); setOpen(false); setForm({ asset_name: "", type: "preventive", frequency: "monthly", next_due: "", status: "scheduled" }); },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = data.filter((r: any) => r.asset_name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><Calendar className="h-7 w-7 text-primary" /><h1 className="text-2xl font-bold">Maintenance & PPM</h1></div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Schedule</Button>
      </div>
      <Card><CardContent className="pt-6">
        <div className="mb-4 relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No schedules</p> : (
          <Table><TableHeader><TableRow><TableHead>Asset</TableHead><TableHead>Type</TableHead><TableHead>Frequency</TableHead><TableHead>Next Due</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>{filtered.map((r: any) => (
              <TableRow key={r.id}><TableCell className="font-medium">{r.asset_name}</TableCell><TableCell><Badge variant="outline">{r.type}</Badge></TableCell><TableCell>{r.frequency}</TableCell><TableCell>{r.next_due}</TableCell><TableCell><Badge variant={r.status === "completed" ? "default" : "secondary"}>{r.status}</Badge></TableCell></TableRow>
            ))}</TableBody></Table>)}
      </CardContent></Card>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent>
        <DialogHeader><DialogTitle>Add PPM Schedule</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Asset Name</Label><Input value={form.asset_name} onChange={e => setForm({...form, asset_name: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Type</Label><Select value={form.type} onValueChange={v => setForm({...form, type: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="preventive">Preventive</SelectItem><SelectItem value="corrective">Corrective</SelectItem><SelectItem value="predictive">Predictive</SelectItem></SelectContent></Select></div>
            <div><Label>Frequency</Label><Select value={form.frequency} onValueChange={v => setForm({...form, frequency: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem><SelectItem value="annual">Annual</SelectItem></SelectContent></Select></div>
          </div>
          <div><Label>Next Due Date</Label><Input type="date" value={form.next_due} onChange={e => setForm({...form, next_due: e.target.value})} /></div>
          <Button className="w-full" onClick={() => save.mutate()} disabled={!form.asset_name || save.isPending}>{save.isPending ? "Saving..." : "Save"}</Button>
        </div>
      </DialogContent></Dialog>
    </div>
  );
}
