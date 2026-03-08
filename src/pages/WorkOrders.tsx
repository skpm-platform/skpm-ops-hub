import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Wrench } from "lucide-react";
import { toast } from "sonner";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";

export default function WorkOrders() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", type: "corrective", priority: "medium", description: "", due_date: "" });

  const { data = [], isLoading } = useQuery({
    queryKey: ["work_orders"],
    queryFn: async () => { const { data } = await (supabase as any).from("work_orders").select("*").order("created_at", { ascending: false }); return data || []; },
  });

  const save = useMutation({
    mutationFn: async () => { const { error } = await (supabase as any).from("work_orders").insert({ ...form, wo_no: `WO-${Date.now().toString().slice(-6)}`, created_by: user?.id }); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["work_orders"] }); toast.success("Work order created"); setOpen(false); setForm({ title: "", type: "corrective", priority: "medium", description: "", due_date: "" }); },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = data.filter((r: any) => r.title?.toLowerCase().includes(search.toLowerCase()));
  const stColor: Record<string,string> = { open: "bg-blue-100 text-blue-700", in_progress: "bg-amber-100 text-amber-700", completed: "bg-emerald-100 text-emerald-700", closed: "bg-gray-100 text-gray-700" };
  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><Wrench className="h-7 w-7 text-primary" /><h1 className="text-2xl font-bold">Work Orders</h1></div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New Work Order</Button>
      </div>
      <Card><CardContent className="pt-6">
        <div className="mb-4 relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No work orders</p> : (
          <>
          <Table><TableHeader><TableRow>
            <SortableHeader label="WO #" sortKey="wo_no" direction={getSortDirection("wo_no")} onToggle={toggleSort} />
            <SortableHeader label="Title" sortKey="title" direction={getSortDirection("title")} onToggle={toggleSort} />
            <SortableHeader label="Type" sortKey="type" direction={getSortDirection("type")} onToggle={toggleSort} />
            <SortableHeader label="Priority" sortKey="priority" direction={getSortDirection("priority")} onToggle={toggleSort} />
            <SortableHeader label="Status" sortKey="status" direction={getSortDirection("status")} onToggle={toggleSort} />
            <SortableHeader label="Due Date" sortKey="due_date" direction={getSortDirection("due_date")} onToggle={toggleSort} />
          </TableRow></TableHeader>
            <TableBody>{pageData.map((r: any) => (
              <TableRow key={r.id}><TableCell className="text-xs">{r.wo_no}</TableCell><TableCell className="font-medium">{r.title}</TableCell><TableCell><Badge variant="outline">{r.type}</Badge></TableCell><TableCell><Badge variant={r.priority === "high" ? "destructive" : "secondary"}>{r.priority}</Badge></TableCell><TableCell><Badge className={stColor[r.status] || ""}>{r.status}</Badge></TableCell><TableCell>{r.due_date}</TableCell></TableRow>
            ))}</TableBody></Table>
          <DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
          </>
        )}
      </CardContent></Card>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent>
        <DialogHeader><DialogTitle>New Work Order</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Type</Label><Select value={form.type} onValueChange={v => setForm({...form, type: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="corrective">Corrective</SelectItem><SelectItem value="preventive">Preventive</SelectItem><SelectItem value="emergency">Emergency</SelectItem></SelectContent></Select></div>
            <div><Label>Priority</Label><Select value={form.priority} onValueChange={v => setForm({...form, priority: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select></div>
          </div>
          <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} /></div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
          <Button className="w-full" onClick={() => save.mutate()} disabled={!form.title || save.isPending}>{save.isPending ? "Creating..." : "Create"}</Button>
        </div>
      </DialogContent></Dialog>
    </div>
  );
}
