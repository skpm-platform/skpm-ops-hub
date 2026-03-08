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
import { Plus, Search, MapPin } from "lucide-react";
import { toast } from "sonner";

export default function Sites() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", location: "", emirate: "Dubai", type: "industrial" });

  const { data = [], isLoading } = useQuery({
    queryKey: ["sites"],
    queryFn: async () => { const { data } = await (supabase as any).from("sites").select("*, clients(name)").order("created_at", { ascending: false }); return data || []; },
  });

  const save = useMutation({
    mutationFn: async () => { const { error } = await (supabase as any).from("sites").insert(form); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sites"] }); toast.success("Site added"); setOpen(false); setForm({ name: "", location: "", emirate: "Dubai", type: "industrial" }); },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = data.filter((r: any) => r.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><MapPin className="h-7 w-7 text-primary" /><h1 className="text-2xl font-bold">Sites & Locations</h1></div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Site</Button>
      </div>
      <Card><CardContent className="pt-6">
        <div className="mb-4 relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No sites</p> : (
          <Table><TableHeader><TableRow><TableHead>Site Name</TableHead><TableHead>Client</TableHead><TableHead>Emirate</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>{filtered.map((r: any) => (
              <TableRow key={r.id}><TableCell className="font-medium">{r.name}</TableCell><TableCell>{r.clients?.name || "—"}</TableCell><TableCell>{r.emirate}</TableCell><TableCell><Badge variant="outline">{r.type}</Badge></TableCell><TableCell><Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status}</Badge></TableCell></TableRow>
            ))}</TableBody></Table>)}
      </CardContent></Card>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent>
        <DialogHeader><DialogTitle>Add Site</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Site Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
          <div><Label>Location</Label><Input value={form.location} onChange={e => setForm({...form, location: e.target.value})} /></div>
          <div><Label>Emirate</Label><Select value={form.emirate} onValueChange={v => setForm({...form, emirate: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Abu Dhabi">Abu Dhabi</SelectItem><SelectItem value="Dubai">Dubai</SelectItem><SelectItem value="Sharjah">Sharjah</SelectItem><SelectItem value="Ajman">Ajman</SelectItem><SelectItem value="RAK">RAK</SelectItem><SelectItem value="UAQ">UAQ</SelectItem><SelectItem value="Fujairah">Fujairah</SelectItem></SelectContent></Select></div>
          <div><Label>Type</Label><Select value={form.type} onValueChange={v => setForm({...form, type: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="office">Office</SelectItem><SelectItem value="industrial">Industrial</SelectItem><SelectItem value="residential">Residential</SelectItem><SelectItem value="camp">Camp</SelectItem></SelectContent></Select></div>
          <Button className="w-full" onClick={() => save.mutate()} disabled={!form.name || save.isPending}>{save.isPending ? "Saving..." : "Add Site"}</Button>
        </div>
      </DialogContent></Dialog>
    </div>
  );
}
