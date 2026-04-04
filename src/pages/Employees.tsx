import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Plus, Search, Users, Pencil, Trash2, Eye, LayoutGrid, List, AlertTriangle, Shield, Briefcase, UserCheck } from "lucide-react";
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
import { PhotoUpload } from "@/components/PhotoUpload";
import { Checkbox } from "@/components/ui/checkbox";
import { format, differenceInDays } from "date-fns";

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

const emptyForm = { name: "", email: "", phone: "", nationality: "", position: "", salary: "", join_date: "", visa_expiry: "", passport_no: "", visa_no: "", department: "", status: "active", photo_url: "" };

export default function Employees() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  const { data = [], isLoading , isError: dataLoadError} = useQuery({
    queryKey: ["employees"],
    queryFn: async () => { const { data } = await supabase.from("employees").select("*").order("created_at", { ascending: false }); return data || []; },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, salary: parseFloat(form.salary) || 0, department: form.department || null, status: form.status || "active", photo_url: form.photo_url || null };
      if (editingId) {
        const { error } = await supabase.from("employees").update(payload).eq("id", editingId);
        if (error) throw error;
        await logAudit("Updated employee", form.name, "employees");
      } else {
        const { error } = await supabase.from("employees").insert({ ...payload, employee_id: `EMP-${Date.now().toString().slice(-6)}` });
        if (error) throw error;
        await logAudit("Added employee", form.name, "employees");
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
      await logAudit("Deleted employee", emp?.name, "employees");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["employees"] }); toast.success("Employee deleted"); setDeleteId(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const handleEdit = (r: any) => {
    setEditingId(r.id);
    setForm({ name: r.name || "", email: r.email || "", phone: r.phone || "", nationality: r.nationality || "", position: r.position || "", salary: String(r.salary || ""), join_date: r.join_date || "", visa_expiry: r.visa_expiry || "", passport_no: r.passport_no || "", visa_no: r.visa_no || "", department: r.department || "", status: r.status || "active", photo_url: r.photo_url || "" });
    setOpen(true);
  };

  const departments = ["all", ...Array.from(new Set(data.map((r: any) => r.department).filter(Boolean))) as string[]];

  const filtered = data.filter((r: any) => {
    const matchSearch = r.name?.toLowerCase().includes(search.toLowerCase()) || r.employee_id?.toLowerCase().includes(search.toLowerCase()) || r.position?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    const matchDept = deptFilter === "all" || r.department === deptFilter;
    return matchSearch && matchStatus && matchDept;
  });

  const getContractBadge = (contractEndDate: string | null) => {
    if (!contractEndDate) return null;
    const days = differenceInDays(new Date(contractEndDate), new Date());
    if (days >= 0 && days <= 30) return <Badge variant="secondary" className="border-0 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-[10px]">Expiring Soon</Badge>;
    return null;
  };

  const getProbationTooltip = (probationEndDate: string | null) => {
    if (!probationEndDate) return null;
    const days = differenceInDays(new Date(probationEndDate), new Date());
    if (days > 0) return `${days} days until probation ends`;
    return "Probation ended";
  };

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

  // Derived stats
  const activeCount = data.filter((r: any) => r.status === "active").length;
  const visaExpiringCount = data.filter((r: any) => r.visa_expiry && new Date(r.visa_expiry) < new Date(Date.now() + 30 * 86400000)).length;
  const visaExpiringSoon = data.filter((r: any) => {
    if (!r.visa_expiry) return false;
    const days = differenceInDays(new Date(r.visa_expiry), new Date());
    return days >= 0 && days <= 60;
  }).sort((a: any, b: any) => new Date(a.visa_expiry).getTime() - new Date(b.visa_expiry).getTime());
  const totalSalary = data.reduce((s: number, r: any) => s + (r.salary || 0), 0);
  const avgSalary = data.length ? Math.round(totalSalary / data.length) : 0;

  // Position distribution
  const positionCounts: Record<string, number> = {};
  data.forEach((r: any) => { if (r.position) positionCounts[r.position] = (positionCounts[r.position] || 0) + 1; });
  const topPositions = Object.entries(positionCounts).sort(([, a], [, b]) => b - a).slice(0, 5);

  const getVisaBadge = (visaExpiry: string | null) => {
    if (!visaExpiry) return null;
    const days = differenceInDays(new Date(visaExpiry), new Date());
    if (days < 0) return <Badge variant="destructive" className="text-[10px] px-1.5">Expired</Badge>;
    if (days <= 30) return <Badge variant="destructive" className="text-[10px] px-1.5 animate-pulse">{days}d left</Badge>;
    if (days <= 60) return <Badge className="text-[10px] px-1.5 bg-warning/15 text-warning border-0">{days}d left</Badge>;
    return null;
  };

  const handlePhoneCopy = (phone: string) => {
    if (!phone) return;
    navigator.clipboard.writeText(phone).then(() => toast.success(`Copied: ${phone}`)).catch(() => toast.error("Failed to copy"));
  };

  const handleBulkExport = () => {
    const selectedRows = data.filter((r: any) => bulk.selectedIds.includes(r.id));
    if (selectedRows.length === 0) { toast.error("No employees selected"); return; }
    const cols = ["employee_id","name","position","nationality","salary","status","phone","email","visa_expiry"];
    const header = cols.join(",");
    const csvRows = selectedRows.map((r: any) => cols.map(c => `"${(r[c] ?? "").toString().replace(/"/g, '""')}"`).join(","));
    const csv = [header, ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "employees-selected.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${selectedRows.length} employees`);
  };

  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  const getAvatarColor = (name: string) => {
    const colors = ["bg-primary/15 text-primary", "bg-accent text-accent-foreground", "bg-destructive/15 text-destructive", "bg-warning/15 text-warning", "bg-success/15 text-success"];
    return colors[name.charCodeAt(0) % colors.length];
  };

  return (
    <div className="space-y-6 animate-fade-in">
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
        <div className="flex items-center gap-3"><Users className="h-7 w-7 text-primary" /><div><h1 className="text-2xl font-bold">Employees</h1><p className="text-sm text-muted-foreground">{data.length} total employees</p></div></div>
        <div className="flex gap-2">
          <CSVImportButton onImport={handleCSVImport} expectedColumns={["name", "email", "phone", "position", "nationality", "salary"]} label="Import" />
          <ExportButton data={filtered} filename="employees" columns={[{key:"employee_id",label:"ID"},{key:"name",label:"Name"},{key:"position",label:"Position"},{key:"nationality",label:"Nationality"},{key:"salary",label:"Salary"},{key:"status",label:"Status"}]} />
          <Button size="sm" variant="outline" className="h-9" onClick={handleBulkExport} disabled={bulk.selectedIds.length === 0} title="Export selected rows">Export Selected ({bulk.selectedIds.length})</Button>
          <Button size="sm" className="h-9" onClick={() => { setEditingId(null); setForm(emptyForm); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add Employee</Button>
        </div>
      </div>

      {/* Enhanced KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="group hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Employees</p>
                <p className="text-2xl font-bold mt-1">{data.length}</p>
                <p className="text-xs text-muted-foreground mt-1">{activeCount} active · {data.length - activeCount} inactive</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
            {data.length > 0 && <Progress value={(activeCount / data.length) * 100} className="mt-3 h-1.5" />}
          </CardContent>
        </Card>
        <Card className="group hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Visa Alerts</p>
                <p className="text-2xl font-bold text-destructive mt-1">{visaExpiringCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Expiring within 30 days</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="group hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg Salary</p>
                <p className="text-2xl font-bold mt-1">AED {avgSalary.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">Total: AED {totalSalary.toLocaleString()}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-accent-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="group hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Top Positions</p>
            <div className="space-y-1.5">
              {topPositions.length === 0 && <p className="text-xs text-muted-foreground">No data</p>}
              {topPositions.map(([pos, count]) => (
                <div key={pos} className="flex items-center justify-between text-xs">
                  <span className="truncate">{pos}</span>
                  <Badge variant="secondary" className="text-[10px] h-5">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visa Expiry Alerts Banner */}
      {visaExpiringSoon.length > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-warning" />
              <span className="text-sm font-semibold">Visa Expiry Alerts ({visaExpiringSoon.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {visaExpiringSoon.slice(0, 8).map((emp: any) => {
                const days = differenceInDays(new Date(emp.visa_expiry), new Date());
                return (
                  <div key={emp.id} className="flex items-center gap-1.5 bg-background rounded-full px-3 py-1 text-xs border">
                    <span className="font-medium">{emp.name}</span>
                    <Badge variant={days <= 30 ? "destructive" : "secondary"} className="text-[10px] px-1.5 h-4">{days < 0 ? "Expired" : `${days}d`}</Badge>
                  </div>
                );
              })}
              {visaExpiringSoon.length > 8 && <span className="text-xs text-muted-foreground self-center">+{visaExpiringSoon.length - 8} more</span>}
            </div>
          </CardContent>
        </Card>
      )}

      <Card><CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search by name, ID, position..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
          {departments.length > 1 && (
            <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
              {departments.map(d => <option key={d} value={d}>{d === "all" ? "All Departments" : d}</option>)}
            </select>
          )}
          <StatusFilter statuses={statuses} selected={statusFilter} onSelect={setStatusFilter} />
          <div className="flex border rounded-md">
            <Button variant={viewMode === "table" ? "secondary" : "ghost"} size="icon" className="h-9 w-9 rounded-r-none" onClick={() => setViewMode("table")}><List className="h-4 w-4" /></Button>
            <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon" className="h-9 w-9 rounded-l-none" onClick={() => setViewMode("grid")}><LayoutGrid className="h-4 w-4" /></Button>
          </div>
        </div>

        {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No employees found</p> : viewMode === "grid" ? (
          /* Grid View */
          <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pageData.map((r: any) => (
              <Card key={r.id} className="group hover:shadow-md transition-all hover:-translate-y-0.5">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden ${!r.photo_url ? getAvatarColor(r.name || "") : ""}`}>
                      {r.photo_url ? <img src={r.photo_url} alt={r.name} className="w-full h-full object-cover" onError={(e) => { (e.target as any).style.display='none'; }} /> : getInitials(r.name || "?")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm truncate">{r.name}</h3>
                        <Badge variant={r.status === "active" ? "default" : "secondary"} className="text-[10px] shrink-0">{r.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{r.position || "No position"}</p>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{r.employee_id}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                    <div><span className="text-muted-foreground">Nationality:</span> <span className="font-medium">{r.nationality || "—"}</span></div>
                    <div><span className="text-muted-foreground">Salary:</span> <span className="font-medium">{r.salary?.toLocaleString() || "—"}</span></div>
                    <div className="col-span-2 flex items-center gap-1.5">
                      <span className="text-muted-foreground">Visa:</span>
                      <span className="font-medium">{r.visa_expiry || "—"}</span>
                      {getVisaBadge(r.visa_expiry)}
                    </div>
                  </div>
                  <div className="flex gap-1 mt-3 pt-3 border-t justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setViewing(r); setViewOpen(true); }}><Eye className="h-3 w-3 mr-1" />View</Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleEdit(r)}><Pencil className="h-3 w-3 mr-1" />Edit</Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => setDeleteId(r.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-4"><DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} /></div>
          </>
        ) : (
          /* Table View */
          <>
          <BulkActions selectedIds={bulk.selectedIds} totalItems={pageData.length} onSelectAll={bulk.selectAll} onClearSelection={bulk.clearSelection} onBulkDelete={() => bulkDelete.mutate()} allSelected={bulk.allSelected} />
          <div className="overflow-x-auto">
          <Table><TableHeader><TableRow>
            <TableHead className="w-10"><Checkbox checked={bulk.allSelected} onCheckedChange={(c) => bulk.selectAll(!!c)} /></TableHead>
            <SortableHeader label="Employee" sortKey="name" direction={getSortDirection("name")} onToggle={toggleSort} />
            <SortableHeader label="Position" sortKey="position" direction={getSortDirection("position")} onToggle={toggleSort} />
            <SortableHeader label="Nationality" sortKey="nationality" direction={getSortDirection("nationality")} onToggle={toggleSort} />
            <SortableHeader label="Salary" sortKey="salary" direction={getSortDirection("salary")} onToggle={toggleSort} />
            <TableHead>Phone</TableHead>
            <SortableHeader label="Visa Expiry" sortKey="visa_expiry" direction={getSortDirection("visa_expiry")} onToggle={toggleSort} />
            <SortableHeader label="Status" sortKey="status" direction={getSortDirection("status")} onToggle={toggleSort} />
            <TableHead>Actions</TableHead>
          </TableRow></TableHeader>
            <TableBody>{pageData.map((r: any) => (
              <TableRow key={r.id} className={`group ${bulk.isSelected(r.id) ? "bg-primary/5" : ""}`}>
                <TableCell><Checkbox checked={bulk.isSelected(r.id)} onCheckedChange={() => bulk.toggle(r.id)} /></TableCell>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden ${!r.photo_url ? getAvatarColor(r.name || "") : ""}`}>
                      {r.photo_url ? <img src={r.photo_url} alt={r.name} className="w-full h-full object-cover" onError={(e) => { (e.target as any).style.display='none'; }} /> : getInitials(r.name || "?")}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{r.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{r.employee_id}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span>{r.position || "—"}</span>
                    {getContractBadge(r.contract_end_date)}
                  </div>
                </TableCell>
                <TableCell>{r.nationality || "—"}</TableCell>
                <TableCell className="font-medium">{r.salary ? `AED ${r.salary.toLocaleString()}` : "—"}</TableCell>
                <TableCell>
                  {r.phone ? (
                    <button type="button" className="text-sm hover:underline cursor-pointer text-left" title="Click to copy phone" onClick={() => handlePhoneCopy(r.phone)}>
                      {r.phone}
                    </button>
                  ) : "—"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <span>{r.visa_expiry || "—"}</span>
                    {getVisaBadge(r.visa_expiry)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status}</Badge>
                    {r.probation_end_date && <span title={getProbationTooltip(r.probation_end_date) || ""} className="cursor-help text-muted-foreground text-xs border-b border-dashed">{getProbationTooltip(r.probation_end_date)?.includes("until") ? "On Probation" : ""}</span>}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setViewing(r); setViewOpen(true); }}><Eye className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}</TableBody></Table>
          </div>
          <DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
          </>
        )}
      </CardContent></Card>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditingId(null); setForm(emptyForm); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Edit Employee" : "Add Employee"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <PhotoUpload value={form.photo_url} onChange={(url) => setForm({...form, photo_url: url || ""})} label="Employee Photo" size="md" folder="employees" />
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
            <div><Label>Department</Label><Input value={form.department} onChange={e => setForm({...form, department: e.target.value})} placeholder="e.g. Operations, HR, Finance..." /></div>
            <div><Label>Status</Label><select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.status} onChange={e => setForm({...form, status: e.target.value})}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
            <Button className="w-full h-9" onClick={() => save.mutate()} disabled={!form.name || save.isPending}>{save.isPending ? "Saving..." : editingId ? "Update Employee" : "Add Employee"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Dialog - Enhanced */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Employee Details</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b">
                <div className={`h-14 w-14 rounded-full flex items-center justify-center text-lg font-bold overflow-hidden ${!viewing.photo_url ? getAvatarColor(viewing.name || "") : ""}`}>
                  {viewing.photo_url ? <img src={viewing.photo_url} alt={viewing.name} className="w-full h-full object-cover" onError={(e) => { (e.target as any).style.display='none'; }} /> : getInitials(viewing.name || "?")}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{viewing.name}</h3>
                  <p className="text-sm text-muted-foreground">{viewing.position || "No position"} · {viewing.employee_id}</p>
                  <Badge variant={viewing.status === "active" ? "default" : "secondary"} className="mt-1">{viewing.status}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Email", viewing.email], ["Phone", viewing.phone],
                  ["Nationality", viewing.nationality], ["Salary", `AED ${viewing.salary?.toLocaleString() || 0}`],
                  ["Join Date", viewing.join_date ? format(new Date(viewing.join_date), "dd MMM yyyy") : null],
                  ["Passport", viewing.passport_no], ["Visa No", viewing.visa_no],
                ].map(([label, val]) => (
                  <div key={label as string}><p className="text-muted-foreground text-xs">{label}</p><p className="font-medium">{val || "—"}</p></div>
                ))}
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs">Visa Expiry</p>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{viewing.visa_expiry ? format(new Date(viewing.visa_expiry), "dd MMM yyyy") : "—"}</p>
                    {getVisaBadge(viewing.visa_expiry)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete Employee?" description="This will permanently remove this employee record." onConfirm={() => deleteId && remove.mutate(deleteId)} />
    </div>
  );
}
