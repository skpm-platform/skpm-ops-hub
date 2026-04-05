import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, FileText, Pencil, Trash2, Eye, AlertTriangle, ExternalLink } from "lucide-react";
import { Progress } from "@/components/ui/progress";
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
const emptyForm = { client_id: "", type: "project", start_date: "", end_date: "", value: "", description: "", status: "active", document_url: "", renewal_date: "" };

export default function Contracts() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewing, setViewing] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data = [], isLoading , isError: dataLoadError} = useQuery({
    queryKey: ["contracts"],
    queryFn: async () => { const { data } = await supabase.from("contracts").select("*, clients(name)").order("created_at", { ascending: false }); return data || []; },
  });
  const { data: clients = [] } = useQuery({ queryKey: ["clients-c"], queryFn: async () => { const { data } = await supabase.from("clients").select("id,name"); return data || []; } });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        value: parseFloat(form.value) || 0,
        client_id: form.client_id || null,
        document_url: form.document_url || null,
        renewal_date: form.renewal_date || null,
      };
      if (editingId) {
        const { error } = await supabase.from("contracts").update(payload).eq("id", editingId);
        if (error) throw error;
        await logAudit("Updated contract", `Contract ${editingId}`, "contracts");
      } else {
        const { error } = await supabase.from("contracts").insert({ ...payload, contract_no: `CON-${Date.now().toString().slice(-6)}` });
        if (error) throw error;
        await logAudit("Created contract", payload.type, "contracts");
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contracts"] }); toast.success(editingId ? "Updated" : "Contract added"); setOpen(false); setEditingId(null); setForm(emptyForm); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contracts").delete().eq("id", id);
      if (error) throw error;
      await logAudit("Deleted contract", id, "contracts");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contracts"] }); toast.success("Deleted"); setDeleteId(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const handleEdit = (r: any) => {
    setEditingId(r.id);
    setForm({
      client_id: r.client_id || "",
      type: r.type || "project",
      start_date: r.start_date || "",
      end_date: r.end_date || "",
      value: String(r.value || ""),
      description: r.description || "",
      status: r.status || "active",
      document_url: r.document_url || "",
      renewal_date: r.renewal_date || "",
    });
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
    { value: "terminated", label: "Terminated", count: data.filter((r: any) => r.status === "terminated").length },
  ];

  const totalValue = data.reduce((s:number,r:any)=>s+(r.value||0),0);
  const activeValue = data.filter((r:any)=>r.status==="active").reduce((s:number,r:any)=>s+(r.value||0),0);
  const expiringSoon = data.filter((r:any)=>r.end_date && new Date(r.end_date) < new Date(Date.now()+30*86400000) && r.status==="active").length;
  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

  const expiringContracts = data.filter((r: any) => r.end_date && new Date(r.end_date) < new Date(Date.now() + 90 * 86400000) && r.status === "active");

  const getRowClass = (r: any) => {
    if (!r.end_date || r.status !== "active") return "";
    const msLeft = new Date(r.end_date).getTime() - Date.now();
    if (msLeft < 0) return "bg-destructive/5";
    if (msLeft < 30 * 86400000) return "bg-orange-50 dark:bg-orange-900/10";
    return "";
  };

  return (
    <div className="space-y-6">
      {dataLoadError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 flex items-center gap-3 mb-4">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">Failed to load some data</p>
            <p className="text-xs text-muted-foreground">Please refresh or contact your administrator.</p>
          </div>
          <button onClick={() => window.location.reload()} className="text-xs underline text-muted-foreground hover:text-foreground">Retry</button>
        </div>
      )}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3"><FileText className="h-7 w-7 text-primary" /><div><h1 className="text-2xl font-bold">Contracts & AMC</h1><p className="text-sm text-muted-foreground">{data.length} contracts</p></div></div>
        <div className="flex gap-2">
          <ExportButton data={filtered} filename="contracts" columns={[{key:"contract_no",label:"Contract#"},{key:"type",label:"Type"},{key:"value",label:"Value"},{key:"start_date",label:"Start"},{key:"end_date",label:"End"},{key:"status",label:"Status"}]} />
          <Button size="sm" className="h-9" onClick={() => { setEditingId(null); setForm(emptyForm); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />New Contract</Button>
        </div>
      </div>

      {/* Expiry Alert Banner */}
      {expiringContracts.length > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2"><AlertTriangle className="h-4 w-4 text-warning" /><span className="text-sm font-medium">Contracts Expiring Within 90 Days</span></div>
            <div className="space-y-1">
              {expiringContracts.slice(0, 5).map((c: any) => {
                const daysLeft = Math.ceil((new Date(c.end_date).getTime() - Date.now()) / 86400000);
                return (
                  <div key={c.id} className="flex items-center justify-between text-xs">
                    <span className="font-medium">{c.contract_no} — {c.clients?.name || "Unknown"}</span>
                    <Badge variant={daysLeft <= 30 ? "destructive" : "secondary"} className="text-[10px]">{daysLeft} days left</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Value</p><p className="text-2xl font-bold">AED {totalValue.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Active Value</p><p className="text-2xl font-bold text-success">AED {activeValue.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Active</p><p className="text-2xl font-bold text-primary">{data.filter((r:any)=>r.status==="active").length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Expiring in 30 Days</p><p className={`text-2xl font-bold ${expiringSoon > 0 ? "text-destructive" : "text-muted-foreground"}`}>{expiringSoon}</p></CardContent></Card>
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
            <TableBody>{pageData.map((r: any) => {
              const expiring30 = r.end_date && new Date(r.end_date) < new Date(Date.now()+30*86400000) && r.status==="active";
              const expired = r.end_date && new Date(r.end_date) < new Date() && r.status === "active";
              return (
              <TableRow key={r.id} className={getRowClass(r)}>
                <TableCell className="font-mono text-xs font-semibold">{r.contract_no}</TableCell>
                <TableCell>{r.clients?.name || "—"}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{r.type}</Badge></TableCell>
                <TableCell className="font-medium">AED {Number(r.value || 0).toLocaleString()}</TableCell>
                <TableCell className="text-xs">
                  {r.start_date || "—"} – <span className={expiring30 ? "text-destructive font-medium" : ""}>{r.end_date || "—"}</span>
                  {expiring30 && !expired && <Badge variant="secondary" className="ml-1 text-[10px] bg-orange-100 text-orange-700 border-0">Expiring</Badge>}
                  {expired && <Badge variant="destructive" className="ml-1 text-[10px]">Expired</Badge>}
                </TableCell>
                <TableCell><Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setViewing(r); setViewOpen(true); }}><Eye className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            );})}</TableBody></Table>
          </div>
          <DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
          </>
        )}
      </CardContent></Card>

      {/* Create/Edit Dialog */}
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
          <div><Label>Renewal Date</Label><Input type="date" value={form.renewal_date} onChange={e => setForm({...form, renewal_date: e.target.value})} /></div>
          <div><Label>Document URL <span className="text-muted-foreground text-xs">(link to contract document)</span></Label><Input value={form.document_url} onChange={e => setForm({...form, document_url: e.target.value})} placeholder="https://..." /></div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
          <Button className="w-full h-9" onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving..." : editingId ? "Update" : "Create Contract"}</Button>
        </div>
      </DialogContent></Dialog>

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}><DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Contract Details</DialogTitle></DialogHeader>
        {viewing && (
          <div className="space-y-3 text-sm">
            <div className="pb-2 border-b">
              <p className="font-mono text-lg font-bold text-primary">{viewing.contract_no}</p>
              <p className="text-muted-foreground text-sm">{viewing.clients?.name || "No Client"}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[["Type", viewing.type], ["Value", `AED ${Number(viewing.value || 0).toLocaleString()}`], ["Start", viewing.start_date], ["End", viewing.end_date], ["Renewal Date", viewing.renewal_date], ["Auto Renew", viewing.auto_renew ? "Yes" : "No"], ["Status", viewing.status]].map(([l, v]) => (
                <div key={l as string}><p className="text-muted-foreground text-xs">{l}</p><p className="font-medium capitalize">{v || "—"}</p></div>
              ))}
            </div>
            {viewing.description && <div><p className="text-muted-foreground text-xs">Description</p><p>{viewing.description}</p></div>}
            {viewing.document_url && (
              <div>
                <p className="text-muted-foreground text-xs">Contract Document</p>
                <a href={viewing.document_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary underline text-sm mt-0.5">
                  <ExternalLink className="h-3 w-3" />View Document
                </a>
              </div>
            )}
            <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => { setViewOpen(false); handleEdit(viewing); }}><Pencil className="h-3.5 w-3.5 mr-2" />Edit Contract</Button>
          </div>
        )}
      </DialogContent></Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete Contract?" onConfirm={() => deleteId && remove.mutate(deleteId)} />
    </div>
  );
}
