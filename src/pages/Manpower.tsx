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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, HardHat } from "lucide-react";
import { toast } from "sonner";

export default function Manpower() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", trade: "electrician", nationality: "" });

  const { data: workers = [], isLoading } = useQuery({
    queryKey: ["workers"],
    queryFn: async () => { const { data } = await (supabase as any).from("workers").select("*").order("created_at", { ascending: false }); return data || []; },
  });

  const save = useMutation({
    mutationFn: async () => { const { error } = await (supabase as any).from("workers").insert({ ...form, worker_id: `WKR-${Date.now().toString().slice(-6)}` }); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["workers"] }); toast.success("Worker added"); setOpen(false); setForm({ name: "", trade: "electrician", nationality: "" }); },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = workers.filter((r: any) => r.name?.toLowerCase().includes(search.toLowerCase()));
  const stC: Record<string,string> = { available: "bg-emerald-100 text-emerald-700", deployed: "bg-blue-100 text-blue-700", on_leave: "bg-amber-100 text-amber-700", sick: "bg-red-100 text-red-700" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><HardHat className="h-7 w-7 text-primary" /><h1 className="text-2xl font-bold">Manpower</h1></div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Worker</Button>
      </div>
      <Card><CardContent className="pt-6">
        <div className="mb-4 relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search workers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No workers</p> : (
          <Table><TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>Trade</TableHead><TableHead>Nationality</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>{filtered.map((r: any) => (
              <TableRow key={r.id}><TableCell className="text-xs">{r.worker_id}</TableCell><TableCell className="font-medium">{r.name}</TableCell><TableCell>{r.trade}</TableCell><TableCell>{r.nationality}</TableCell><TableCell><Badge className={stC[r.status] || ""}>{r.status}</Badge></TableCell></TableRow>
            ))}</TableBody></Table>)}
      </CardContent></Card>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent>
        <DialogHeader><DialogTitle>Add Worker</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
          <div><Label>Trade</Label><Select value={form.trade} onValueChange={v => setForm({...form, trade: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="electrician">Electrician</SelectItem><SelectItem value="plumber">Plumber</SelectItem><SelectItem value="carpenter">Carpenter</SelectItem><SelectItem value="welder">Welder</SelectItem><SelectItem value="helper">Helper</SelectItem><SelectItem value="driver">Driver</SelectItem><SelectItem value="mason">Mason</SelectItem><SelectItem value="painter">Painter</SelectItem></SelectContent></Select></div>
          <div><Label>Nationality</Label><Input value={form.nationality} onChange={e => setForm({...form, nationality: e.target.value})} /></div>
          <Button className="w-full" onClick={() => save.mutate()} disabled={!form.name || save.isPending}>{save.isPending ? "Saving..." : "Add Worker"}</Button>
        </div>
      </DialogContent></Dialog>
    </div>
  );
}
