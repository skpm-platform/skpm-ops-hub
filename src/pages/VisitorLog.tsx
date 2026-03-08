import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Contact, LogOut, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";

export default function VisitorLog() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", company: "", purpose: "", badge_no: "", vehicle_plate: "" });

  const { data = [], isLoading } = useQuery({
    queryKey: ["visitors"],
    queryFn: async () => { const { data } = await (supabase as any).from("visitor_log").select("*").order("check_in", { ascending: false }); return data || []; },
  });

  const save = useMutation({
    mutationFn: async () => { const { error } = await (supabase as any).from("visitor_log").insert(form); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["visitors"] }); toast.success("Visitor checked in"); setOpen(false); setForm({ name: "", company: "", purpose: "", badge_no: "", vehicle_plate: "" }); },
    onError: (e: any) => toast.error(e.message),
  });

  const checkout = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase as any).from("visitor_log").update({ check_out: new Date().toISOString() }).eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["visitors"] }); toast.success("Checked out"); },
  });

  const currentlyIn = data.filter((r: any) => !r.check_out).length;
  const todayVisitors = data.filter((r: any) => r.check_in && format(new Date(r.check_in), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")).length;

  const filtered = data.filter((r: any) => r.name?.toLowerCase().includes(search.toLowerCase()) || r.company?.toLowerCase().includes(search.toLowerCase()));
  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><Contact className="h-7 w-7 text-primary" /><h1 className="text-2xl font-bold">Visitor Log</h1></div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Check In Visitor</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Records</p><p className="text-2xl font-semibold mt-1">{data.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Today's Visitors</p><p className="text-2xl font-semibold mt-1">{todayVisitors}</p></CardContent></Card>
        <Card><CardContent className="p-4 flex items-start justify-between"><div><p className="text-xs text-muted-foreground uppercase tracking-wider">Currently On-Site</p><p className="text-2xl font-semibold mt-1 text-success">{currentlyIn}</p></div><UserCheck className="h-5 w-5 text-success" /></CardContent></Card>
        <Card><CardContent className="p-4 flex items-start justify-between"><div><p className="text-xs text-muted-foreground uppercase tracking-wider">Checked Out</p><p className="text-2xl font-semibold mt-1">{data.filter((r: any) => r.check_out).length}</p></div><UserX className="h-5 w-5 text-muted-foreground" /></CardContent></Card>
      </div>

      <Card><CardContent className="pt-6">
        <div className="mb-4 relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search by name or company..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No visitors</p> : (
          <>
          <Table><TableHeader><TableRow>
            <SortableHeader label="Name" sortKey="name" direction={getSortDirection("name")} onToggle={toggleSort} />
            <SortableHeader label="Company" sortKey="company" direction={getSortDirection("company")} onToggle={toggleSort} />
            <SortableHeader label="Purpose" sortKey="purpose" direction={getSortDirection("purpose")} onToggle={toggleSort} />
            <SortableHeader label="Check In" sortKey="check_in" direction={getSortDirection("check_in")} onToggle={toggleSort} />
            <SortableHeader label="Check Out" sortKey="check_out" direction={getSortDirection("check_out")} onToggle={toggleSort} />
            <SortableHeader label="Status" sortKey="check_out" direction={getSortDirection("check_out")} onToggle={toggleSort} />
          </TableRow></TableHeader>
            <TableBody>{pageData.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell>{r.company || "—"}</TableCell>
                <TableCell>{r.purpose || "—"}</TableCell>
                <TableCell className="text-xs">{r.check_in && format(new Date(r.check_in), "dd/MM HH:mm")}</TableCell>
                <TableCell className="text-xs">{r.check_out ? format(new Date(r.check_out), "dd/MM HH:mm") : "—"}</TableCell>
                <TableCell>
                  {!r.check_out ? (
                    <Button size="sm" variant="outline" onClick={() => checkout.mutate(r.id)} className="h-7 text-xs gap-1">
                      <LogOut className="h-3 w-3" />Check Out
                    </Button>
                  ) : (
                    <Badge className="bg-muted text-muted-foreground border-0">Left</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}</TableBody></Table>
          <DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
          </>
        )}
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}><DialogContent>
        <DialogHeader><DialogTitle>Check In Visitor</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
          <div><Label>Company</Label><Input value={form.company} onChange={e => setForm({...form, company: e.target.value})} /></div>
          <div><Label>Purpose</Label><Input value={form.purpose} onChange={e => setForm({...form, purpose: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Badge #</Label><Input value={form.badge_no} onChange={e => setForm({...form, badge_no: e.target.value})} /></div>
            <div><Label>Vehicle Plate</Label><Input value={form.vehicle_plate} onChange={e => setForm({...form, vehicle_plate: e.target.value})} /></div>
          </div>
          <Button className="w-full" onClick={() => save.mutate()} disabled={!form.name || save.isPending}>{save.isPending ? "Checking in..." : "Check In"}</Button>
        </div>
      </DialogContent></Dialog>
    </div>
  );
}
