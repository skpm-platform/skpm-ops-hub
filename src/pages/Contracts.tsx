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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, FileText, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { ComboboxSelect } from "@/components/ComboboxSelect";
import { StatusFilter } from "@/components/StatusFilter";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ExportButton } from "@/components/ExportButton";

const typeOptions = [
  { value: "project", label: "Project" }, { value: "amc", label: "AMC" },
  { value: "service", label: "Service" }, { value: "supply", label: "Supply" },
  { value: "manpower", label: "Manpower" }, { value: "subcontract", label: "Subcontract" },
];
const emptyForm = { client_id: "", type: "project", start_date: "", end_date: "", value: "", description: "", status: "active" };

export default function Contracts() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data = [], isLoading } = useQuery({
    queryKey: ["contracts"],
    queryFn: async () => { const { data } = await supabase.from("contracts").select("*, clients(name)").order("created_at", { ascending: false }); return data || []; },
  });
  const { data: clients = [] } = useQuery({ queryKey: ["clients-c"], queryFn: async () => { const { data } = await supabase.from("clients").select("id,name"); return data || []; } });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, value: parseFloat(form.value) || 0, client_id: form.client_id || null };
      if (editingId) {
        const { error } = await supabase.from("contracts").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("contracts").insert({ ...payload, contract_no: `CON-${Date.now().toString().slice(-6)}` });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contracts"] }); toast.success(editingId ? "Updated" : "Contract added"); setOpen(false); setEditingId(null); setForm(emptyForm); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("contracts").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contracts"] }); toast.success("Deleted"); setDeleteId(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const handleEdit = (r: any) => {
    setEditingId(r.id);
    setForm({ client_id: r.client_id||"", type: r.type||"project", start_date: r.start_date||"", end_date: r.end_date||"", value: String(r.value||""), description: r.description||"", status: r.status||"active" });
    setOpen(true);
  };

  const filtered = data.filter((r: any) => {
    const matchSearch = JSON.stringify(r).toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statuses = [
    { value: "all", label: "All", count: data.length },
    { value: "active", label: "Active", count: data.filter((r: any) => r.status === "active").length },
    { value: "expired", label: "Expired", count: data.filter((r: any) => r.status === "expired").length },
  ];

  const totalValue = data.reduce((s:number,r:any)=>s+(r.value||0),0);
  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3"><FileText className="h-7 w-7 text-primary" /><div><h1 className="text-2xl font-bold">Contracts & AMC</h1><p className="text-sm text-muted-foreground">{data.length} contracts</p></div></div>
        <div className="flex gap-2">
          <ExportButton data={filtered} filename="contracts" columns={[{key:"contract_no",label:"Contract#"},{key:"clients.name",label:"Client"},{key:"type",label:"Type"},{key:"value",label:"Value"},{key:"status",label:"Status"}]} />
          <Button onClick={() => { setEditingId(null); setForm(emptyForm); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />New Contract</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Contracts</p><p className="text-2xl font-bold">{data.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Value</p><p className="text-2xl font-bold">AED {totalValue.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Active</p><p className="text-2xl font-bold text-success">{data.filter((r:any)=>r.status==="active").length}</p></CardContent></Card>
      </div>

      <Card><CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
          <StatusFilter statuses={statuses} selected={statusFilter} onSelect={setStatusFilter} />
        </div>
        {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No contracts</p> : (
          <>
          <div className="overflow-x-auto">
          <Table><TableHeader><TableRow>
            <SortableHeader label="Contract #" sortKey="contract_no" direction={getSortDirection("contract_no")} onToggle={toggleSort} />
            <SortableHeader label="Client" sortKey="clients.name" direction={getSortDirection("clients.name")} onToggle={toggleSort} />
            <SortableHeader label="Type" sortKey="type" direction={getSortDirection("type")} onToggle={toggleSort} />
            <SortableHeader label="Value (AED)" sortKey="value" direction={getSortDirection("value")} onToggle={toggleSort} />
            <SortableHeader label="Dates" sortKey="start_date" direction={getSortDirection("start_date")} onToggle={toggleSort} />
            <SortableHeader label="Status" sortKey="status" direction={getSortDirection("status")} onToggle={toggleSort} />
            <SortableHeader label="Actions" sortKey="" direction={null} onToggle={() => {}} />
          </TableRow></TableHeader>
            <TableBody>{pageData.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.contract_no}</TableCell>
                <TableCell>{r.clients?.name || "—"}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{r.type}</Badge></TableCell>
                <TableCell className="font-medium">{r.value?.toLocaleString()}</TableCell>
                <TableCell className="text-xs">{r.start_date || "—"} – {r.end_date || "—"}</TableCell>
                <TableCell><Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>))}</TableBody></Table>
          </div>
          <DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
          </>
        )}
      </CardContent></Card>

      <Dialog open={open} onOpenChange={(o)=>{setOpen(o);if(!o){setEditingId(null);setForm(emptyForm);}}}><DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editingId ? "Edit Contract" : "New Contract"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Client</Label><ComboboxSelect value={form.client_id} onValueChange={v => setForm({...form, client_id: v})} options={clients.map((c:any)=>({value:c.id,label:c.name}))} placeholder="Select client..." allowCustom={false} /></div>
          <div><Label>Type</Label><ComboboxSelect value={form.type} onValueChange={v => setForm({...form, type: v})} options={typeOptions} placeholder="Select or type..." /></div>
          {editingId && <div><Label>Status</Label><Select value={form.status} onValueChange={v => setForm({...form, status: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="expired">Expired</SelectItem><SelectItem value="terminated">Terminated</SelectItem></SelectContent></Select></div>}
          <div><Label>Value (AED)</Label><Input type="number" value={form.value} onChange={e => setForm({...form, value: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Start</Label><Input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} /></div>
            <div><Label>End</Label><Input type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} /></div>
          </div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
          <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving..." : editingId ? "Update" : "Create Contract"}</Button>
        </div>
      </DialogContent></Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete Contract?" onConfirm={() => deleteId && remove.mutate(deleteId)} />
    </div>
  );
}
