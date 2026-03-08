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
import { Plus, Search, Briefcase, Pencil, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { ComboboxSelect } from "@/components/ComboboxSelect";
import { StatusFilter } from "@/components/StatusFilter";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ExportButton } from "@/components/ExportButton";

const locationOptions = [
  { value: "Abu Dhabi", label: "Abu Dhabi" }, { value: "Dubai", label: "Dubai" },
  { value: "Sharjah", label: "Sharjah" }, { value: "Ajman", label: "Ajman" },
  { value: "Ras Al Khaimah", label: "Ras Al Khaimah" }, { value: "Umm Al Quwain", label: "Umm Al Quwain" },
  { value: "Fujairah", label: "Fujairah" },
];
const industryOptions = [
  { value: "Construction", label: "Construction" }, { value: "Oil & Gas", label: "Oil & Gas" },
  { value: "Real Estate", label: "Real Estate" }, { value: "Government", label: "Government" },
  { value: "Healthcare", label: "Healthcare" }, { value: "Education", label: "Education" },
  { value: "Hospitality", label: "Hospitality" }, { value: "Retail", label: "Retail" },
  { value: "Manufacturing", label: "Manufacturing" }, { value: "Technology", label: "Technology" },
];

const emptyForm = { name: "", contact_person: "", phone: "", email: "", location: "", industry: "" };

export default function Clients() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  const { data = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => { const { data } = await supabase.from("clients").select("*").order("created_at", { ascending: false }); return data || []; },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (editingId) {
        const { error } = await supabase.from("clients").update(form).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("clients").insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clients"] }); toast.success(editingId ? "Client updated" : "Client added"); setOpen(false); setEditingId(null); setForm(emptyForm); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("clients").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clients"] }); toast.success("Client deleted"); setDeleteId(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const handleEdit = (r: any) => {
    setEditingId(r.id);
    setForm({ name: r.name||"", contact_person: r.contact_person||"", phone: r.phone||"", email: r.email||"", location: r.location||"", industry: r.industry||"" });
    setOpen(true);
  };

  const filtered = data.filter((r: any) => {
    const matchSearch = r.name?.toLowerCase().includes(search.toLowerCase()) || r.contact_person?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statuses = [
    { value: "all", label: "All", count: data.length },
    { value: "active", label: "Active", count: data.filter((r: any) => r.status === "active").length },
    { value: "inactive", label: "Inactive", count: data.filter((r: any) => r.status === "inactive").length },
  ];

  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3"><Briefcase className="h-7 w-7 text-primary" /><div><h1 className="text-2xl font-bold">Clients</h1><p className="text-sm text-muted-foreground">{data.length} clients</p></div></div>
        <div className="flex gap-2">
          <ExportButton data={filtered} filename="clients" columns={[{key:"name",label:"Company"},{key:"contact_person",label:"Contact"},{key:"phone",label:"Phone"},{key:"email",label:"Email"},{key:"location",label:"Location"},{key:"industry",label:"Industry"}]} />
          <Button onClick={() => { setEditingId(null); setForm(emptyForm); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add Client</Button>
        </div>
      </div>

      <Card><CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
          <StatusFilter statuses={statuses} selected={statusFilter} onSelect={setStatusFilter} />
        </div>
        {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No clients found</p> : (
          <>
          <div className="overflow-x-auto">
          <Table><TableHeader><TableRow>
            <SortableHeader label="Company" sortKey="name" direction={getSortDirection("name")} onToggle={toggleSort} />
            <SortableHeader label="Contact" sortKey="contact_person" direction={getSortDirection("contact_person")} onToggle={toggleSort} />
            <SortableHeader label="Phone" sortKey="phone" direction={getSortDirection("phone")} onToggle={toggleSort} />
            <SortableHeader label="Location" sortKey="location" direction={getSortDirection("location")} onToggle={toggleSort} />
            <SortableHeader label="Industry" sortKey="industry" direction={getSortDirection("industry")} onToggle={toggleSort} />
            <SortableHeader label="Status" sortKey="status" direction={getSortDirection("status")} onToggle={toggleSort} />
            <SortableHeader label="Actions" sortKey="" direction={null} onToggle={() => {}} />
          </TableRow></TableHeader>
            <TableBody>{pageData.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell>{r.contact_person || "—"}</TableCell>
                <TableCell>{r.phone || "—"}</TableCell>
                <TableCell>{r.location || "—"}</TableCell>
                <TableCell>{r.industry || "—"}</TableCell>
                <TableCell><Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setViewing(r); setViewOpen(true); }}><Eye className="h-3.5 w-3.5" /></Button>
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

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if(!o){setEditingId(null);setForm(emptyForm);} }}><DialogContent>
        <DialogHeader><DialogTitle>{editingId ? "Edit Client" : "Add Client"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Company Name *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
          <div><Label>Contact Person</Label><Input value={form.contact_person} onChange={e => setForm({...form, contact_person: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
          </div>
          <div><Label>Location</Label><ComboboxSelect value={form.location} onValueChange={v => setForm({...form, location: v})} options={locationOptions} placeholder="Select or type emirate..." /></div>
          <div><Label>Industry</Label><ComboboxSelect value={form.industry} onValueChange={v => setForm({...form, industry: v})} options={industryOptions} placeholder="Select or type industry..." /></div>
          <Button className="w-full" onClick={() => save.mutate()} disabled={!form.name || save.isPending}>{save.isPending ? "Saving..." : editingId ? "Update Client" : "Add Client"}</Button>
        </div>
      </DialogContent></Dialog>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}><DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Client Details</DialogTitle></DialogHeader>
        {viewing && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              {[["Company",viewing.name],["Contact",viewing.contact_person],["Phone",viewing.phone],["Email",viewing.email],["Location",viewing.location],["Industry",viewing.industry],["Status",viewing.status]].map(([l,v])=>(
                <div key={l as string}><p className="text-muted-foreground text-xs">{l}</p><p className="font-medium">{v||"—"}</p></div>
              ))}
            </div>
          </div>
        )}
      </DialogContent></Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete Client?" description="This will permanently remove this client." onConfirm={() => deleteId && remove.mutate(deleteId)} />
    </div>
  );
}
