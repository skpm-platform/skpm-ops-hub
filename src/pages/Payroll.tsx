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
import { Plus, Search, Wallet } from "lucide-react";
import { toast } from "sonner";

export default function Payroll() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ employee_id: "", month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()), basic_salary: "", housing_allowance: "", transport_allowance: "", food_allowance: "", deductions: "" });

  const { data = [], isLoading } = useQuery({
    queryKey: ["payroll"],
    queryFn: async () => { const { data } = await (supabase as any).from("payroll").select("*, employees(name)").order("created_at", { ascending: false }); return data || []; },
  });
  const { data: employees = [] } = useQuery({ queryKey: ["emp-pay"], queryFn: async () => { const { data } = await (supabase as any).from("employees").select("id,name"); return data || []; } });

  const save = useMutation({
    mutationFn: async () => {
      const basic = parseFloat(form.basic_salary) || 0;
      const housing = parseFloat(form.housing_allowance) || 0;
      const transport = parseFloat(form.transport_allowance) || 0;
      const food = parseFloat(form.food_allowance) || 0;
      const ded = parseFloat(form.deductions) || 0;
      const net = basic + housing + transport + food - ded;
      const { error } = await (supabase as any).from("payroll").insert({ ...form, basic_salary: basic, housing_allowance: housing, transport_allowance: transport, food_allowance: food, deductions: ded, net_pay: net, month: parseInt(form.month), year: parseInt(form.year), employee_id: form.employee_id || null });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payroll"] }); toast.success("Payroll added"); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = data.filter((r: any) => JSON.stringify(r).toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><Wallet className="h-7 w-7 text-primary" /><h1 className="text-2xl font-bold">Payroll</h1></div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Payroll</Button>
      </div>
      <Card><CardContent className="pt-6">
        <div className="mb-4 relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No payroll records</p> : (
          <Table><TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Month/Year</TableHead><TableHead>Basic</TableHead><TableHead>Allowances</TableHead><TableHead>Deductions</TableHead><TableHead>Net Pay (AED)</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>{filtered.map((r: any) => (
              <TableRow key={r.id}><TableCell className="font-medium">{r.employees?.name || "—"}</TableCell><TableCell>{r.month}/{r.year}</TableCell><TableCell>{r.basic_salary?.toLocaleString()}</TableCell><TableCell>{((r.housing_allowance||0)+(r.transport_allowance||0)+(r.food_allowance||0)).toLocaleString()}</TableCell><TableCell className="text-destructive">{r.deductions?.toLocaleString()}</TableCell><TableCell className="font-bold">{r.net_pay?.toLocaleString()}</TableCell><TableCell><Badge variant={r.status === "paid" ? "default" : "secondary"}>{r.status}</Badge></TableCell></TableRow>
            ))}</TableBody></Table>)}
      </CardContent></Card>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Add Payroll Record</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Employee</Label><Select value={form.employee_id} onValueChange={v => setForm({...form, employee_id: v})}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Month</Label><Input type="number" min="1" max="12" value={form.month} onChange={e => setForm({...form, month: e.target.value})} /></div>
            <div><Label>Year</Label><Input type="number" value={form.year} onChange={e => setForm({...form, year: e.target.value})} /></div>
          </div>
          <div><Label>Basic Salary</Label><Input type="number" value={form.basic_salary} onChange={e => setForm({...form, basic_salary: e.target.value})} /></div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label>Housing</Label><Input type="number" value={form.housing_allowance} onChange={e => setForm({...form, housing_allowance: e.target.value})} /></div>
            <div><Label>Transport</Label><Input type="number" value={form.transport_allowance} onChange={e => setForm({...form, transport_allowance: e.target.value})} /></div>
            <div><Label>Food</Label><Input type="number" value={form.food_allowance} onChange={e => setForm({...form, food_allowance: e.target.value})} /></div>
          </div>
          <div><Label>Deductions</Label><Input type="number" value={form.deductions} onChange={e => setForm({...form, deductions: e.target.value})} /></div>
          <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving..." : "Save Payroll"}</Button>
        </div>
      </DialogContent></Dialog>
    </div>
  );
}
