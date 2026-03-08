import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logAudit } from "@/lib/audit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Loader2, UserMinus, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { ExportButton } from "@/components/ExportButton";
import { ComboboxSelect } from "@/components/ComboboxSelect";
import { StatusFilter, buildStatuses } from "@/components/StatusFilter";

export default function LeaveManagement() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
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
      const { error } = await supabase.from("leave_requests").insert({ ...form, days: Number(form.days) });
      if (error) throw error;
      await logAudit("Submitted leave request", `${form.type} — ${form.days} days`);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leave_requests"] }); setOpen(false); setForm({ type: "annual", start_date: "", end_date: "", days: 1, reason: "" }); toast.success("Leave request submitted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("leave_requests").update({ status, approved_by: user?.id }).eq("id", id);
      if (error) throw error;
      await logAudit(`Leave ${status}`, id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leave_requests"] }); toast.success("Status updated"); },
  });

  const statusColor = (s: string) => { if (s === "approved") return "bg-success/15 text-success border-0"; if (s === "rejected") return "bg-destructive/15 text-destructive border-0"; return "bg-warning/15 text-warning border-0"; };
  const statuses = buildStatuses(leaves, "status", ["all","pending","approved","rejected"]);

  const filtered = leaves.filter((l: any) => {
    const matchSearch = l.type?.toLowerCase().includes(search.toLowerCase()) || l.reason?.toLowerCase().includes(search.toLowerCase()) || l.employees?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });
  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

  const pendingCount = leaves.filter((l:any) => l.status === "pending").length;
  const approvedCount = leaves.filter((l:any) => l.status === "approved").length;
  const totalDays = leaves.filter((l:any) => l.status === "approved").reduce((s:number, l:any) => s + (l.days || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <UserMinus className="h-7 w-7 text-primary" />
          <div><h1 className="text-2xl font-bold">Leave Management</h1><p className="text-muted-foreground">Handle leave requests & approvals</p></div>
        </div>
        <div className="flex gap-2">
          <ExportButton data={filtered} filename="leave" columns={[{key:"employees.name",label:"Employee"},{key:"type",label:"Type"},{key:"start_date",label:"From"},{key:"end_date",label:"To"},{key:"days",label:"Days"},{key:"status",label:"Status"}]} />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" className="h-9"><Plus className="mr-2 h-4 w-4" />Request Leave</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Leave Request</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label>Leave Type</Label>
                  <ComboboxSelect value={form.type} onChange={v => setForm(f => ({ ...f, type: v }))} options={["annual","sick","emergency","unpaid","maternity","paternity","compassionate"]} placeholder="Select type" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>End Date</Label><Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
                </div>
                <div className="space-y-2"><Label>Days</Label><Input type="number" min={1} value={form.days} onChange={e => setForm(f => ({ ...f, days: Number(e.target.value) }))} /></div>
                <div className="space-y-2"><Label>Reason</Label><Textarea placeholder="Reason for leave..." value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} /></div>
                <Button className="w-full h-9" onClick={() => save.mutate()} disabled={save.isPending}>
                  {save.isPending && <Loader2 className="animate-spin mr-2 h-4 w-4" />} Submit Request
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Total Requests</p><p className="text-2xl font-bold">{leaves.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Pending</p><p className="text-2xl font-bold text-warning">{pendingCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Approved</p><p className="text-2xl font-bold text-success">{approvedCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Days Used</p><p className="text-2xl font-bold">{totalDays}</p></CardContent></Card>
      </div>

      <StatusFilter statuses={statuses} current={statusFilter} onChange={setStatusFilter} />

      <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search leaves..." value={search} onChange={e => setSearch(e.target.value)} /></div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader><TableRow>
            <SortableHeader label="Employee" sortKey="employees.name" direction={getSortDirection("employees.name")} onToggle={toggleSort} />
            <SortableHeader label="Type" sortKey="type" direction={getSortDirection("type")} onToggle={toggleSort} />
            <SortableHeader label="From" sortKey="start_date" direction={getSortDirection("start_date")} onToggle={toggleSort} />
            <SortableHeader label="To" sortKey="end_date" direction={getSortDirection("end_date")} onToggle={toggleSort} />
            <SortableHeader label="Days" sortKey="days" direction={getSortDirection("days")} onToggle={toggleSort} />
            <SortableHeader label="Status" sortKey="status" direction={getSortDirection("status")} onToggle={toggleSort} />
            <TableHead className="w-32">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Loading...</TableCell></TableRow> :
            filtered.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No leave requests</TableCell></TableRow> :
            pageData.map((l: any) => (
              <TableRow key={l.id}>
                <TableCell className="font-medium">{l.employees?.name ?? "—"}</TableCell>
                <TableCell><Badge variant="secondary" className="capitalize border-0">{l.type}</Badge></TableCell>
                <TableCell>{l.start_date ? format(new Date(l.start_date), "dd MMM yyyy") : "—"}</TableCell>
                <TableCell>{l.end_date ? format(new Date(l.end_date), "dd MMM yyyy") : "—"}</TableCell>
                <TableCell className="font-medium">{l.days}</TableCell>
                <TableCell><Badge variant="secondary" className={statusColor(l.status)}>{l.status}</Badge></TableCell>
                <TableCell>
                  {l.status === "pending" && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => updateStatus.mutate({ id: l.id, status: "approved" })}><CheckCircle className="h-3 w-3" /> Approve</Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive" onClick={() => updateStatus.mutate({ id: l.id, status: "rejected" })}><XCircle className="h-3 w-3" /> Reject</Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="p-4"><DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} /></div>
      </div>
    </div>
  );
}
