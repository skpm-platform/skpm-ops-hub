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
import { Plus, Search, Users } from "lucide-react";
import { toast } from "sonner";

export default function Employees() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", nationality: "", position: "", salary: "", join_date: "", visa_expiry: "" });

  const { data = [], isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => { const { data } = await (supabase as any).from("employees").select("*").order("created_at", { ascending: false }); return data || []; },
  });

  const save = useMutation({
    mutationFn: async () => { const { error } = await (supabase as any).from("employees").insert({ ...form, salary: parseFloat(form.salary) || 0, employee_id: `EMP-${Date.now().toString().slice(-6)}` }); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["employees"] }); toast.success("Employee added"); setOpen(false); setForm({ name: "", email: "", phone: "", nationality: "", position: "", salary: "", join_date: "", visa_expiry: "" }); },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = data.filter((r: any) => r.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><Users className="h-7 w-7 text-primary" /><h1 className="text-2xl font-bold">Employees</h1></div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Employee</Button>
      </div>
      <Card><CardContent className="pt-6">
        <div className="mb-4 relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No employees</p> : (
          <Table><TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>Position</TableHead><TableHead>Nationality</TableHead><TableHead>Visa Expiry</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>{filtered.map((r: any) => {
              const visaExpiring = r.visa_expiry && new Date(r.visa_expiry) < new Date(Date.now() + 30*86400000);
              return (
              <TableRow key={r.id}><TableCell className="text-xs">{r.employee_id}</TableCell><TableCell className="font-medium">{r.name}</TableCell><TableCell>{r.position}</TableCell><TableCell>{r.nationality}</TableCell><TableCell><span className={visaExpiring ? "text-destructive font-medium" : ""}>{r.visa_expiry || "—"}</span></TableCell><TableCell><Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status}</Badge></TableCell></TableRow>
            );})}</TableBody></Table>)}
      </CardContent></Card>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Add Employee</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Full Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nationality</Label><Input value={form.nationality} onChange={e => setForm({...form, nationality: e.target.value})} /></div>
            <div><Label>Position</Label><Input value={form.position} onChange={e => setForm({...form, position: e.target.value})} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Salary (AED)</Label><Input type="number" value={form.salary} onChange={e => setForm({...form, salary: e.target.value})} /></div>
            <div><Label>Join Date</Label><Input type="date" value={form.join_date} onChange={e => setForm({...form, join_date: e.target.value})} /></div>
          </div>
          <div><Label>Visa Expiry</Label><Input type="date" value={form.visa_expiry} onChange={e => setForm({...form, visa_expiry: e.target.value})} /></div>
          <Button className="w-full" onClick={() => save.mutate()} disabled={!form.name || save.isPending}>{save.isPending ? "Saving..." : "Add Employee"}</Button>
        </div>
      </DialogContent></Dialog>
    </div>
  );
}
