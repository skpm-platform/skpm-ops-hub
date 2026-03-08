import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function LeaveManagement() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: "annual", start_date: "", end_date: "", days: 1, reason: "" });

  const { data: leaves = [], isLoading } = useQuery({
    queryKey: ["leave_requests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leave_requests").select("*, employees(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("leave_requests").insert({
        ...form,
        days: Number(form.days),
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leave_requests"] }); setOpen(false); setForm({ type: "annual", start_date: "", end_date: "", days: 1, reason: "" }); toast({ title: "Leave request submitted" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("leave_requests").update({ status, approved_by: user?.id }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leave_requests"] }); toast({ title: "Status updated" }); },
  });

  const filtered = leaves.filter((l: any) => l.type?.toLowerCase().includes(search.toLowerCase()) || l.reason?.toLowerCase().includes(search.toLowerCase()));

  const statusColor = (s: string) => {
    if (s === "approved") return "default";
    if (s === "rejected") return "destructive";
    return "secondary";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Leave Management</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Request Leave</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Leave Request</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="sick">Sick</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
              <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
              <Input type="number" min={1} placeholder="Days" value={form.days} onChange={e => setForm(f => ({ ...f, days: Number(e.target.value) }))} />
              <Input placeholder="Reason" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
              <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending}>Submit</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search leaves..." value={search} onChange={e => setSearch(e.target.value)} /></div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Employee</TableHead><TableHead>Type</TableHead><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Days</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Loading...</TableCell></TableRow> :
            filtered.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No leave requests</TableCell></TableRow> :
            filtered.map((l: any) => (
              <TableRow key={l.id}>
                <TableCell>{l.employees?.name ?? "—"}</TableCell>
                <TableCell className="capitalize">{l.type}</TableCell>
                <TableCell>{l.start_date ? format(new Date(l.start_date), "dd MMM yyyy") : "—"}</TableCell>
                <TableCell>{l.end_date ? format(new Date(l.end_date), "dd MMM yyyy") : "—"}</TableCell>
                <TableCell>{l.days}</TableCell>
                <TableCell><Badge variant={statusColor(l.status)}>{l.status}</Badge></TableCell>
                <TableCell>
                  {l.status === "pending" && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: l.id, status: "approved" })}>Approve</Button>
                      <Button size="sm" variant="destructive" onClick={() => updateStatus.mutate({ id: l.id, status: "rejected" })}>Reject</Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
