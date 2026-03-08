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
import { Plus, Search, Users, Pencil, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { ComboboxSelect } from "@/components/ComboboxSelect";
import { StatusFilter } from "@/components/StatusFilter";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ExportButton } from "@/components/ExportButton";
import { CSVImportButton } from "@/components/CSVImportButton";
import { BulkActions, useBulkSelect } from "@/components/BulkActions";
import { Checkbox } from "@/components/ui/checkbox";

const positionOptions = [
  { value: "Electrician", label: "Electrician" }, { value: "Plumber", label: "Plumber" },
  { value: "Carpenter", label: "Carpenter" }, { value: "Welder", label: "Welder" },
  { value: "Mason", label: "Mason" }, { value: "Painter", label: "Painter" },
  { value: "Driver", label: "Driver" }, { value: "Helper", label: "Helper" },
  { value: "Supervisor", label: "Supervisor" }, { value: "Engineer", label: "Engineer" },
  { value: "Foreman", label: "Foreman" }, { value: "Technician", label: "Technician" },
  { value: "Accountant", label: "Accountant" }, { value: "HR Officer", label: "HR Officer" },
  { value: "Admin", label: "Admin" }, { value: "Manager", label: "Manager" },
];

const nationalityOptions = [
  { value: "Indian", label: "Indian" }, { value: "Pakistani", label: "Pakistani" },
  { value: "Bangladeshi", label: "Bangladeshi" }, { value: "Filipino", label: "Filipino" },
  { value: "Nepalese", label: "Nepalese" }, { value: "Sri Lankan", label: "Sri Lankan" },
  { value: "Egyptian", label: "Egyptian" }, { value: "Jordanian", label: "Jordanian" },
  { value: "Emirati", label: "Emirati" }, { value: "Syrian", label: "Syrian" },
];

const emptyForm = { name: "", email: "", phone: "", nationality: "", position: "", salary: "", join_date: "", visa_expiry: "", passport_no: "", visa_no: "" };

export default function Employees() {
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
    queryKey: ["employees"],
    queryFn: async () => { const { data } = await supabase.from("employees").select("*").order("created_at", { ascending: false }); return data || []; },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, salary: parseFloat(form.salary) || 0 };
      if (editingId) {
        const { error } = await supabase.from("employees").update(payload).eq("id", editingId);
        if (error) throw error;
        await logAudit("Updated employee", form.name);
      } else {
        const { error } = await supabase.from("employees").insert({ ...payload, employee_id: `EMP-${Date.now().toString().slice(-6)}` });
        if (error) throw error;
        await logAudit("Added employee", form.name);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["employees"] }); toast.success(editingId ? "Employee updated" : "Employee added"); setOpen(false); setEditingId(null); setForm(emptyForm); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const emp = data.find((e: any) => e.id === id);
      const { error } = await supabase.from("employees").delete().eq("id", id);
      if (error) throw error;
      await logAudit("Deleted employee", emp?.name);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["employees"] }); toast.success("Employee deleted"); setDeleteId(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const handleEdit = (r: any) => {
    setEditingId(r.id);
    setForm({ name: r.name || "", email: r.email || "", phone: r.phone || "", nationality: r.nationality || "", position: r.position || "", salary: String(r.salary || ""), join_date: r.join_date || "", visa_expiry: r.visa_expiry || "", passport_no: r.passport_no || "", visa_no: r.visa_no || "" });
    setOpen(true);
  };

  const filtered = data.filter((r: any) => {
    const matchSearch = r.name?.toLowerCase().includes(search.toLowerCase()) || r.employee_id?.toLowerCase().includes(search.toLowerCase()) || r.position?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statuses = [
    { value: "all", label: "All", count: data.length },
    { value: "active", label: "Active", count: data.filter((r: any) => r.status === "active").length },
    { value: "inactive", label: "Inactive", count: data.filter((r: any) => r.status === "inactive").length },
  ];

  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);
  const bulk = useBulkSelect(pageData);

  const bulkDelete = useMutation({
    mutationFn: async () => {
      for (const id of bulk.selectedIds) {
        const { error } = await supabase.from("employees").delete().eq("id", id);
        if (error) throw error;
      }
      await logAudit("Bulk deleted employees", `${bulk.selectedIds.length} records`, "employees");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["employees"] }); toast.success(`${bulk.selectedIds.length} employees deleted`); bulk.clearSelection(); },
    onError: (e: any) => toast.error(e.message),
  });

  const handleCSVImport = async (rows: Record<string, string>[]) => {
    const records = rows.map(r => ({
      name: r.name || r.Name || "",
      email: r.email || r.Email || null,
      phone: r.phone || r.Phone || null,
      nationality: r.nationality || r.Nationality || null,
      position: r.position || r.Position || null,
      salary: parseFloat(r.salary || r.Salary || "0") || 0,
      join_date: r.join_date || r.JoinDate || null,
      visa_expiry: r.visa_expiry || r.VisaExpiry || null,
      passport_no: r.passport_no || r.PassportNo || null,
      visa_no: r.visa_no || r.VisaNo || null,
      employee_id: `EMP-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 5)}`,
    })).filter(r => r.name);
    const { error } = await supabase.from("employees").insert(records);
    if (error) throw error;
    await logAudit("Imported employees via CSV", `${records.length} records`, "employees");
    qc.invalidateQueries({ queryKey: ["employees"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3"><Users className="h-7 w-7 text-primary" /><div><h1 className="text-2xl font-bold">Employees</h1><p className="text-sm text-muted-foreground">{data.length} total employees</p></div></div>
        <div className="flex gap-2">
          <CSVImportButton onImport={handleCSVImport} expectedColumns={["name", "email", "phone", "position", "nationality", "salary"]} label="Import" />
          <ExportButton data={filtered} filename="employees" columns={[{key:"employee_id",label:"ID"},{key:"name",label:"Name"},{key:"position",label:"Position"},{key:"nationality",label:"Nationality"},{key:"salary",label:"Salary"},{key:"status",label:"Status"}]} />
          <Button size="sm" className="h-9" onClick={() => { setEditingId(null); setForm(emptyForm); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add Employee</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p><p className="text-2xl font-bold">{data.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Active</p><p className="text-2xl font-bold text-success">{data.filter((r:any)=>r.status==="active").length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Visa Expiring</p><p className="text-2xl font-bold text-destructive">{data.filter((r:any)=>r.visa_expiry && new Date(r.visa_expiry) < new Date(Date.now()+30*86400000)).length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Salary</p><p className="text-2xl font-bold">AED {data.reduce((s:number,r:any)=>s+(r.salary||0),0).toLocaleString()}</p></CardContent></Card>
      </div>

      <Card><CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search by name, ID, position..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
          <StatusFilter statuses={statuses} selected={statusFilter} onSelect={setStatusFilter} />
        </div>
        {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No employees found</p> : (
          <>
          <BulkActions selectedIds={bulk.selectedIds} totalItems={pageData.length} onSelectAll={bulk.selectAll} onClearSelection={bulk.clearSelection} onBulkDelete={() => bulkDelete.mutate()} allSelected={bulk.allSelected} />
          <div className="overflow-x-auto">
          <Table><TableHeader><TableRow>
            <SortableHeader label="" sortKey="" direction={null} onToggle={() => {}}>
              <Checkbox checked={bulk.allSelected} onCheckedChange={(c) => bulk.selectAll(!!c)} />
            </SortableHeader>
            <SortableHeader label="ID" sortKey="employee_id" direction={getSortDirection("employee_id")} onToggle={toggleSort} />
            <SortableHeader label="Name" sortKey="name" direction={getSortDirection("name")} onToggle={toggleSort} />
            <SortableHeader label="Position" sortKey="position" direction={getSortDirection("position")} onToggle={toggleSort} />
            <SortableHeader label="Nationality" sortKey="nationality" direction={getSortDirection("nationality")} onToggle={toggleSort} />
            <SortableHeader label="Salary" sortKey="salary" direction={getSortDirection("salary")} onToggle={toggleSort} />
            <SortableHeader label="Visa Expiry" sortKey="visa_expiry" direction={getSortDirection("visa_expiry")} onToggle={toggleSort} />
            <SortableHeader label="Status" sortKey="status" direction={getSortDirection("status")} onToggle={toggleSort} />
            <SortableHeader label="Actions" sortKey="" direction={null} onToggle={() => {}} />
          </TableRow></TableHeader>
            <TableBody>{pageData.map((r: any) => {
              const visaExpiring = r.visa_expiry && new Date(r.visa_expiry) < new Date(Date.now() + 30*86400000);
              return (
              <TableRow key={r.id} className={bulk.isSelected(r.id) ? "bg-primary/5" : ""}>
                <TableCell><Checkbox checked={bulk.isSelected(r.id)} onCheckedChange={() => bulk.toggle(r.id)} /></TableCell>
                <TableCell className="text-xs font-mono">{r.employee_id}</TableCell>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell>{r.position || "—"}</TableCell>
                <TableCell>{r.nationality || "—"}</TableCell>
                <TableCell>{r.salary?.toLocaleString() || "—"}</TableCell>
                <TableCell><span className={visaExpiring ? "text-destructive font-medium" : ""}>{r.visa_expiry || "—"}</span></TableCell>
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

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditingId(null); setForm(emptyForm); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Edit Employee" : "Add Employee"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Full Name *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nationality</Label><ComboboxSelect value={form.nationality} onValueChange={v => setForm({...form, nationality: v})} options={nationalityOptions} placeholder="Select or type..." /></div>
              <div><Label>Position</Label><ComboboxSelect value={form.position} onValueChange={v => setForm({...form, position: v})} options={positionOptions} placeholder="Select or type..." /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Salary (AED)</Label><Input type="number" value={form.salary} onChange={e => setForm({...form, salary: e.target.value})} /></div>
              <div><Label>Join Date</Label><Input type="date" value={form.join_date} onChange={e => setForm({...form, join_date: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Passport No.</Label><Input value={form.passport_no} onChange={e => setForm({...form, passport_no: e.target.value})} /></div>
              <div><Label>Visa No.</Label><Input value={form.visa_no} onChange={e => setForm({...form, visa_no: e.target.value})} /></div>
            </div>
            <div><Label>Visa Expiry</Label><Input type="date" value={form.visa_expiry} onChange={e => setForm({...form, visa_expiry: e.target.value})} /></div>
            <Button className="w-full h-9" onClick={() => save.mutate()} disabled={!form.name || save.isPending}>{save.isPending ? "Saving..." : editingId ? "Update Employee" : "Add Employee"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Employee Details</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Employee ID", viewing.employee_id], ["Name", viewing.name], ["Position", viewing.position],
                  ["Nationality", viewing.nationality], ["Email", viewing.email], ["Phone", viewing.phone],
                  ["Salary", `AED ${viewing.salary?.toLocaleString() || 0}`], ["Join Date", viewing.join_date],
                  ["Passport", viewing.passport_no], ["Visa No", viewing.visa_no],
                  ["Visa Expiry", viewing.visa_expiry], ["Status", viewing.status],
                ].map(([label, val]) => (
                  <div key={label as string}><p className="text-muted-foreground text-xs">{label}</p><p className="font-medium">{val || "—"}</p></div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete Employee?" description="This will permanently remove this employee record." onConfirm={() => deleteId && remove.mutate(deleteId)} />
    </div>
  );
}
