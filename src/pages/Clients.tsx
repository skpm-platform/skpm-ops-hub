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
import { Plus, Search, Briefcase } from "lucide-react";
import { toast } from "sonner";

export default function Clients() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", contact_person: "", phone: "", email: "", location: "", industry: "" });

  const { data = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => { const { data } = await (supabase as any).from("clients").select("*").order("created_at", { ascending: false }); return data || []; },
  });

  const save = useMutation({
    mutationFn: async () => { const { error } = await (supabase as any).from("clients").insert(form); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clients"] }); toast.success("Client added"); setOpen(false); setForm({ name: "", contact_person: "", phone: "", email: "", location: "", industry: "" }); },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = data.filter((r: any) => r.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><Briefcase className="h-7 w-7 text-primary" /><h1 className="text-2xl font-bold">Clients</h1></div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Client</Button>
      </div>
      <Card><CardContent className="pt-6">
        <div className="mb-4 relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No clients yet</p> : (
          <Table><TableHeader><TableRow><TableHead>Company</TableHead><TableHead>Contact</TableHead><TableHead>Phone</TableHead><TableHead>Location</TableHead><TableHead>Industry</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>{filtered.map((r: any) => (
              <TableRow key={r.id}><TableCell className="font-medium">{r.name}</TableCell><TableCell>{r.contact_person}</TableCell><TableCell>{r.phone}</TableCell><TableCell>{r.location}</TableCell><TableCell>{r.industry}</TableCell><TableCell><Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status}</Badge></TableCell></TableRow>
            ))}</TableBody></Table>)}
      </CardContent></Card>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent>
        <DialogHeader><DialogTitle>Add Client</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Company Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
          <div><Label>Contact Person</Label><Input value={form.contact_person} onChange={e => setForm({...form, contact_person: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
          </div>
          <div><Label>Location</Label><Select value={form.location} onValueChange={v => setForm({...form, location: v})}><SelectTrigger><SelectValue placeholder="Select emirate" /></SelectTrigger><SelectContent><SelectItem value="Abu Dhabi">Abu Dhabi</SelectItem><SelectItem value="Dubai">Dubai</SelectItem><SelectItem value="Sharjah">Sharjah</SelectItem><SelectItem value="Ajman">Ajman</SelectItem><SelectItem value="RAK">Ras Al Khaimah</SelectItem><SelectItem value="UAQ">Umm Al Quwain</SelectItem><SelectItem value="Fujairah">Fujairah</SelectItem></SelectContent></Select></div>
          <div><Label>Industry</Label><Input value={form.industry} onChange={e => setForm({...form, industry: e.target.value})} /></div>
          <Button className="w-full" onClick={() => save.mutate()} disabled={!form.name || save.isPending}>{save.isPending ? "Saving..." : "Add Client"}</Button>
        </div>
      </DialogContent></Dialog>
    </div>
  );
}
