import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/use-profile";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Plus, Search, Wallet, Pencil, Trash2, Eye, TrendingUp, Users, DollarSign, LayoutGrid, List, ArrowUpRight, ArrowDownRight, Printer, CheckCircle, ChevronLeft, ChevronRight, Download, Zap , AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { ExportButton } from "@/components/ExportButton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusFilter } from "@/components/StatusFilter";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const currentYear = new Date().getFullYear();
const yearOptions = [currentYear - 1, currentYear, currentYear + 1];

export default function Payroll() {
  const qc = useQueryClient();
  const { data: role } = useUserRole();
  const isAdmin = role === "admin";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewItem, setViewItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Year / Month filter
  const [filterYear, setFilterYear] = useState(String(currentYear));
  const [filterMonth, setFilterMonth] = useState("all");

  // Generate for All dialog
  const [genOpen, setGenOpen] = useState(false);
  const [genMonth, setGenMonth] = useState(String(new Date().getMonth() + 1));
  const [genYear, setGenYear] = useState(String(currentYear));

  const [form, setForm] = useState({
    employee_id: "", month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()),
    basic_salary: "", housing_allowance: "", transport_allowance: "", food_allowance: "",
    overtime_pay: "", deductions: "", status: "draft", payable_days: "30",
  });

  const { data = [], isLoading , isError: dataLoadError} = useQuery({
    queryKey: ["payroll"],
    queryFn: async () => { const { data } = await supabase.from("payroll").select("*, employees(name)").order("created_at", { ascending: false }); return data || []; },
  });
  const { data: employees = [] } = useQuery({
    queryKey: ["emp-pay"],
    queryFn: async () => { const { data } = await supabase.from("employees").select("id,name,basic_salary"); return data || []; },
  });

  const resetForm = () => setForm({
    employee_id: "", month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()),
    basic_salary: "", housing_allowance: "", transport_allowance: "", food_allowance: "",
    overtime_pay: "", deductions: "", status: "draft", payable_days: "30",
  });

  const calcNet = (f: typeof form) => {
    const b = parseFloat(f.basic_salary) || 0;
    const h = parseFloat(f.housing_allowance) || 0;
    const t = parseFloat(f.transport_allowance) || 0;
    const fo = parseFloat(f.food_allowance) || 0;
    const ot = parseFloat(f.overtime_pay) || 0;
    const d = parseFloat(f.deductions) || 0;
    const pd = parseInt(f.payable_days) || 30;
    return (b / 30 * pd) + h + t + fo + ot - d;
  };
  const calcAllowances = (f: typeof form) => (parseFloat(f.housing_allowance) || 0) + (parseFloat(f.transport_allowance) || 0) + (parseFloat(f.food_allowance) || 0);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        employee_id: form.employee_id || null, month: parseInt(form.month), year: parseInt(form.year),
        basic_salary: parseFloat(form.basic_salary) || 0, housing_allowance: parseFloat(form.housing_allowance) || 0,
        transport_allowance: parseFloat(form.transport_allowance) || 0, food_allowance: parseFloat(form.food_allowance) || 0,
        overtime_pay: parseFloat(form.overtime_pay) || 0, deductions: parseFloat(form.deductions) || 0,
        net_pay: calcNet(form), status: form.status, payable_days: parseInt(form.payable_days) || 30,
      };
      if (editingId) {
        const { error } = await supabase.from("payroll").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("payroll").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payroll"] }); toast.success(editingId ? "Updated" : "Added"); setOpen(false); setEditingId(null); resetForm(); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("payroll").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payroll"] }); toast.success("Deleted"); setDeleteId(null); },
  });

  const markPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payroll").update({ status: "paid" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["payroll"] });
      toast.success("Marked as paid ✓");
      setViewItem((prev: any) => prev?.id === id ? { ...prev, status: "paid" } : prev);
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Batch Generate Payroll for All Employees
  const generateAll = useMutation({
    mutationFn: async () => {
      const mon = parseInt(genMonth);
      const yr = parseInt(genYear);
      toast.loading("Fetching employees...");
      const { data: emps, error: empErr } = await supabase.from("employees").select("id,name,basic_salary");
      if (empErr) throw empErr;
      const { data: existing, error: exErr } = await supabase.from("payroll").select("employee_id").eq("month", mon).eq("year", yr);
      if (exErr) throw exErr;
      const existingIds = new Set((existing || []).map((r: any) => r.employee_id));
      const toInsert = (emps || []).filter((e: any) => !existingIds.has(e.id));
      if (toInsert.length === 0) {
        toast.dismiss();
        toast.info("All employees already have payroll records for this period.");
        return 0;
      }
      const records = toInsert.map((e: any) => ({
        employee_id: e.id, month: mon, year: yr,
        basic_salary: e.basic_salary || 0, housing_allowance: 0, transport_allowance: 0,
        food_allowance: 0, overtime_pay: 0, deductions: 0,
        net_pay: e.basic_salary || 0, payable_days: 30, status: "draft",
      }));
      const { error } = await supabase.from("payroll").insert(records);
      if (error) throw error;
      return records.length;
    },
    onSuccess: (count) => {
      toast.dismiss();
      if (count && count > 0) {
        qc.invalidateQueries({ queryKey: ["payroll"] });
        toast.success(`Generated ${count} payroll record${count !== 1 ? "s" : ""} for ${months[parseInt(genMonth) - 1]} ${genYear}`);
        setGenOpen(false);
      }
    },
    onError: (e: any) => { toast.dismiss(); toast.error(e.message); },
  });

  // WPS CSV Export
  const wpsExport = () => {
    const rows = filtered.map((r: any) => [
      r.employee_id || "",
      r.employees?.name || "",
      "N/A",
      "N/A",
      r.net_pay || 0,
      `${months[(r.month || 1) - 1]} ${r.year}`,
    ]);
    const header = ["Employee ID", "Employee Name", "Bank Account", "IBAN", "Net Pay", "Month"];
    const csv = [header, ...rows].map(row => row.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wps-export-${months[parseInt(filterMonth) - 1] || "all"}-${filterYear}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("WPS CSV exported");
  };

  const printPayslip = (r: any) => {
    const month = months[(r.month || 1) - 1];
    const gross = (r.basic_salary || 0) + (r.housing_allowance || 0) + (r.transport_allowance || 0) + (r.food_allowance || 0) + (r.overtime_pay || 0);
    const payableDays = r.payable_days || 30;
    const basicPayable = ((r.basic_salary || 0) / 30) * payableDays;
    const html = `<!DOCTYPE html><html><head><title>Payslip - ${r.employees?.name || ""} ${month} ${r.year}</title>
    <style>
      body { font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; color: #111; }
      h1 { font-size: 22px; margin: 0; } .subtitle { color: #666; font-size: 13px; margin-top: 4px; }
      .header { display: flex; justify-content: space-between; border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; } td { padding: 6px 0; font-size: 14px; }
      td:last-child { text-align: right; } .divider { border-top: 1px solid #ddd; margin: 8px 0; }
      .total td { font-weight: bold; font-size: 16px; border-top: 2px solid #111; padding-top: 10px; }
      .paid { color: green; font-weight: bold; } .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
      .status-paid { background: #dcfce7; color: #166534; } .status-draft { background: #f3f4f6; color: #374151; }
      @media print { body { margin: 0; } }
    </style></head><body>
    <div class="header">
      <div><h1>SKPM Technical Service</h1><div class="subtitle">Payslip — ${month} ${r.year}</div></div>
      <div style="text-align:right"><div style="font-weight:bold">${r.employees?.name || "Employee"}</div>
      <div class="badge status-${r.status}">${r.status?.toUpperCase()}</div></div>
    </div>
    <table>
      <tr><td>Basic Salary (${payableDays}/30 days)</td><td>AED ${basicPayable.toLocaleString(undefined, {maximumFractionDigits: 2})}</td></tr>
      <tr><td>Housing Allowance</td><td style="color:green">AED ${(r.housing_allowance || 0).toLocaleString()}</td></tr>
      <tr><td>Transport Allowance</td><td style="color:green">AED ${(r.transport_allowance || 0).toLocaleString()}</td></tr>
      <tr><td>Food Allowance</td><td style="color:green">AED ${(r.food_allowance || 0).toLocaleString()}</td></tr>
      <tr><td>Overtime Pay</td><td style="color:green">AED ${(r.overtime_pay || 0).toLocaleString()}</td></tr>
      <tr><td colspan="2"><div class="divider"></div></td></tr>
      <tr><td>Gross Pay</td><td>AED ${gross.toLocaleString()}</td></tr>
      <tr><td>Deductions</td><td style="color:red">- AED ${(r.deductions || 0).toLocaleString()}</td></tr>
      <tr class="total"><td>Net Pay</td><td>AED ${(r.net_pay || 0).toLocaleString()}</td></tr>
    </table>
    <div style="margin-top:30px;font-size:11px;color:#999;">Generated: ${new Date().toLocaleDateString()} · SKPM Ops Hub</div>
    </body></html>`;
    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); win.print(); }
  };

  const handleEdit = (r: any) => {
    setEditingId(r.id);
    setForm({
      employee_id: r.employee_id || "", month: String(r.month), year: String(r.year),
      basic_salary: String(r.basic_salary || ""), housing_allowance: String(r.housing_allowance || ""),
      transport_allowance: String(r.transport_allowance || ""), food_allowance: String(r.food_allowance || ""),
      overtime_pay: String(r.overtime_pay || ""), deductions: String(r.deductions || ""),
      status: r.status || "draft", payable_days: String(r.payable_days || 30),
    });
    setOpen(true);
  };

  // Month navigation
  const handlePrevMonth = () => {
    const m = filterMonth === "all" ? new Date().getMonth() + 1 : parseInt(filterMonth);
    const y = parseInt(filterYear) || currentYear;
    if (m === 1) { setFilterMonth("12"); setFilterYear(String(y - 1)); }
    else { setFilterMonth(String(m - 1)); }
  };
  const handleNextMonth = () => {
    const m = filterMonth === "all" ? new Date().getMonth() + 1 : parseInt(filterMonth);
    const y = parseInt(filterYear) || currentYear;
    if (m === 12) { setFilterMonth("1"); setFilterYear(String(y + 1)); }
    else { setFilterMonth(String(m + 1)); }
  };

  const totalNet = data.reduce((s: number, r: any) => s + (r.net_pay || 0), 0);
  const totalBasic = data.reduce((s: number, r: any) => s + (r.basic_salary || 0), 0);
  const totalAllowances = data.reduce((s: number, r: any) => s + (r.housing_allowance || 0) + (r.transport_allowance || 0) + (r.food_allowance || 0), 0);
  const totalDeductions = data.reduce((s: number, r: any) => s + (r.deductions || 0), 0);
  const statusCounts = data.reduce((a: Record<string, number>, r: any) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {} as Record<string, number>);
  const paidCount = statusCounts.paid || 0;
  const paidRate = data.length > 0 ? Math.round((paidCount / data.length) * 100) : 0;

  const filtered = data
    .filter((r: any) => JSON.stringify(r).toLowerCase().includes(search.toLowerCase()))
    .filter((r: any) => statusFilter === "all" || r.status === statusFilter)
    .filter((r: any) => filterYear === "all" || String(r.year) === filterYear)
    .filter((r: any) => filterMonth === "all" || String(r.month) === filterMonth);

  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const currentPeriodLabel = filterMonth !== "all"
    ? `${months[parseInt(filterMonth) - 1]} ${filterYear}`
    : filterYear !== "all" ? filterYear : "All Periods";

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
        <div className="flex items-center gap-3"><Wallet className="h-7 w-7 text-primary" /><div><h1 className="text-2xl font-bold">Payroll</h1><p className="text-sm text-muted-foreground">{data.length} records</p></div></div>
        <div className="flex gap-2 flex-wrap">
          <ExportButton data={data} filename="payroll" />
          {isAdmin && (
            <Button size="sm" variant="outline" className="h-9 gap-1.5" onClick={() => setGenOpen(true)}>
              <Zap className="h-4 w-4" />Generate for All
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-9 gap-1.5" onClick={wpsExport}>
            <Download className="h-4 w-4" />WPS Export
          </Button>
          <Button size="sm" className="h-9" onClick={() => { resetForm(); setEditingId(null); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add Payroll</Button>
        </div>
      </div>

      {/* Enhanced KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Net Payroll</p>
                <p className="text-2xl font-bold mt-1">AED {totalNet.toLocaleString()}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Basic Salaries</p>
            <p className="text-2xl font-bold mt-1">AED {totalBasic.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">{totalNet > 0 ? Math.round((totalBasic / totalNet) * 100) : 0}% of net</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Allowances</p>
                <p className="text-2xl font-bold mt-1 text-success">AED {totalAllowances.toLocaleString()}</p>
              </div>
              <ArrowUpRight className="h-5 w-5 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Deductions</p>
                <p className="text-2xl font-bold mt-1 text-destructive">AED {totalDeductions.toLocaleString()}</p>
              </div>
              <ArrowDownRight className="h-5 w-5 text-destructive" />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Paid Status</p>
            <p className="text-2xl font-bold mt-1">{paidCount}/{data.length}</p>
            <Progress value={paidRate} className="mt-2 h-1.5" />
          </CardContent>
        </Card>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <StatusFilter statuses={[{ value: "all", label: "All", count: data.length }, { value: "draft", label: "Draft", count: statusCounts.draft || 0 }, { value: "processed", label: "Processed", count: statusCounts.processed || 0 }, { value: "paid", label: "Paid", count: statusCounts.paid || 0 }]} selected={statusFilter} onSelect={setStatusFilter} />

        {/* Year Filter */}
        <Select value={filterYear} onValueChange={setFilterYear}>
          <SelectTrigger className="h-9 w-32"><SelectValue placeholder="Year" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {yearOptions.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Month Navigation */}
        <div className="flex items-center gap-1 border rounded-md h-9 px-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlePrevMonth}><ChevronLeft className="h-4 w-4" /></Button>
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="h-7 border-0 shadow-none w-28 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {months.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNextMonth}><ChevronRight className="h-4 w-4" /></Button>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 w-64" /></div>
          <div className="flex border rounded-md">
            <Button variant={viewMode === "table" ? "secondary" : "ghost"} size="icon" className="h-9 w-9 rounded-r-none" onClick={() => setViewMode("table")}><List className="h-4 w-4" /></Button>
            <Button variant={viewMode === "cards" ? "secondary" : "ghost"} size="icon" className="h-9 w-9 rounded-l-none" onClick={() => setViewMode("cards")}><LayoutGrid className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      {/* Period label */}
      {(filterMonth !== "all" || filterYear !== "all") && (
        <p className="text-sm text-muted-foreground">Showing: <span className="font-medium text-foreground">{currentPeriodLabel}</span> · {filtered.length} record{filtered.length !== 1 ? "s" : ""}</p>
      )}

      {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <Card><CardContent className="py-8 text-center text-muted-foreground">No payroll records</CardContent></Card> : viewMode === "cards" ? (
        <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {pageData.map((r: any) => {
            const allowances = (r.housing_allowance || 0) + (r.transport_allowance || 0) + (r.food_allowance || 0);
            return (
              <Card key={r.id} className="group hover:shadow-md transition-all hover:-translate-y-0.5">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {r.employees?.name ? getInitials(r.employees.name) : "?"}
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">{r.employees?.name || "Unknown"}</h3>
                        <p className="text-xs text-muted-foreground">{months[(r.month || 1) - 1]} {r.year}</p>
                      </div>
                    </div>
                    <Badge variant={r.status === "paid" ? "default" : "secondary"} className="text-[10px]">{r.status}</Badge>
                  </div>
                  <div className="text-2xl font-bold">AED {r.net_pay?.toLocaleString()}</div>
                  <div className="grid grid-cols-3 gap-2 mt-3 text-[10px]">
                    <div className="p-1.5 bg-muted rounded text-center">
                      <p className="text-muted-foreground">Basic</p>
                      <p className="font-semibold">{r.basic_salary?.toLocaleString()}</p>
                    </div>
                    <div className="p-1.5 bg-success/10 rounded text-center">
                      <p className="text-muted-foreground">Allowances</p>
                      <p className="font-semibold text-success">{allowances.toLocaleString()}</p>
                    </div>
                    <div className="p-1.5 bg-destructive/10 rounded text-center">
                      <p className="text-muted-foreground">Deductions</p>
                      <p className="font-semibold text-destructive">{r.deductions?.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 mt-3 pt-2 border-t justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setViewItem(r)}><Eye className="h-3 w-3 mr-1" />View</Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleEdit(r)}><Pencil className="h-3 w-3 mr-1" />Edit</Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => setDeleteId(r.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <div className="mt-4"><DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} /></div>
        </>
      ) : (
        <Card><CardContent className="pt-6">
          <Table><TableHeader><TableRow>
            <SortableHeader label="Employee" sortKey="employees.name" direction={getSortDirection("employees.name")} onToggle={toggleSort} />
            <SortableHeader label="Period" sortKey="month" direction={getSortDirection("month")} onToggle={toggleSort} />
            <SortableHeader label="Basic" sortKey="basic_salary" direction={getSortDirection("basic_salary")} onToggle={toggleSort} />
            <SortableHeader label="Payable Days" sortKey="payable_days" direction={getSortDirection("payable_days")} onToggle={toggleSort} />
            <SortableHeader label="Allowances" sortKey="housing_allowance" direction={getSortDirection("housing_allowance")} onToggle={toggleSort} />
            <SortableHeader label="Overtime" sortKey="overtime_pay" direction={getSortDirection("overtime_pay")} onToggle={toggleSort} />
            <SortableHeader label="Deductions" sortKey="deductions" direction={getSortDirection("deductions")} onToggle={toggleSort} />
            <SortableHeader label="Net Pay" sortKey="net_pay" direction={getSortDirection("net_pay")} onToggle={toggleSort} />
            <SortableHeader label="Status" sortKey="status" direction={getSortDirection("status")} onToggle={toggleSort} />
            <TableHead>Actions</TableHead>
          </TableRow></TableHeader>
            <TableBody>{pageData.map((r: any) => (
              <TableRow key={r.id} className="group">
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                      {r.employees?.name ? getInitials(r.employees.name) : "?"}
                    </div>
                    <span className="font-medium">{r.employees?.name || "—"}</span>
                  </div>
                </TableCell>
                <TableCell>{months[(r.month || 1) - 1]} {r.year}</TableCell>
                <TableCell>{r.basic_salary?.toLocaleString()}</TableCell>
                <TableCell>{r.payable_days || 30}/30</TableCell>
                <TableCell className="text-success">{((r.housing_allowance || 0) + (r.transport_allowance || 0) + (r.food_allowance || 0)).toLocaleString()}</TableCell>
                <TableCell className="text-success">{r.overtime_pay?.toLocaleString() || 0}</TableCell>
                <TableCell className="text-destructive">{r.deductions?.toLocaleString()}</TableCell>
                <TableCell className="font-bold">AED {r.net_pay?.toLocaleString()}</TableCell>
                <TableCell><Badge variant={r.status === "paid" ? "default" : "secondary"} className="text-[10px]">{r.status}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewItem(r)}><Eye className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}</TableBody></Table>
          <DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
        </CardContent></Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { setEditingId(null); resetForm(); } }}><DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editingId ? "Edit" : "Add"} Payroll Record</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Employee</Label><Select value={form.employee_id} onValueChange={v => setForm({ ...form, employee_id: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Month</Label><Select value={form.month} onValueChange={v => setForm({ ...form, month: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{months.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Year</Label><Input type="number" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} /></div>
            <div><Label>Status</Label><Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="processed">Processed</SelectItem><SelectItem value="paid">Paid</SelectItem></SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Basic Salary</Label><Input type="number" value={form.basic_salary} onChange={e => setForm({ ...form, basic_salary: e.target.value })} /></div>
            <div><Label>Payable Days (default 30)</Label><Input type="number" min="0" max="31" value={form.payable_days} onChange={e => setForm({ ...form, payable_days: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label>Housing</Label><Input type="number" value={form.housing_allowance} onChange={e => setForm({ ...form, housing_allowance: e.target.value })} /></div>
            <div><Label>Transport</Label><Input type="number" value={form.transport_allowance} onChange={e => setForm({ ...form, transport_allowance: e.target.value })} /></div>
            <div><Label>Food</Label><Input type="number" value={form.food_allowance} onChange={e => setForm({ ...form, food_allowance: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Overtime Pay</Label><Input type="number" value={form.overtime_pay} onChange={e => setForm({ ...form, overtime_pay: e.target.value })} /></div>
            <div><Label>Deductions</Label><Input type="number" value={form.deductions} onChange={e => setForm({ ...form, deductions: e.target.value })} /></div>
          </div>
          <div className="p-3 bg-muted rounded-lg space-y-1.5 text-sm">
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">Basic ({form.payable_days || 30}/30 days)</span><span>{((parseFloat(form.basic_salary) || 0) / 30 * (parseInt(form.payable_days) || 30)).toLocaleString(undefined, {maximumFractionDigits: 2})}</span></div>
            <div className="flex justify-between text-xs text-success"><span>+ Allowances</span><span>{calcAllowances(form).toLocaleString()}</span></div>
            <div className="flex justify-between text-xs text-success"><span>+ Overtime</span><span>{(parseFloat(form.overtime_pay) || 0).toLocaleString()}</span></div>
            <div className="flex justify-between text-xs text-destructive"><span>- Deductions</span><span>{(parseFloat(form.deductions) || 0).toLocaleString()}</span></div>
            <Separator />
            <div className="flex justify-between font-bold"><span>Net Pay</span><span>AED {calcNet(form).toLocaleString(undefined, {maximumFractionDigits: 2})}</span></div>
          </div>
          <Button className="w-full h-9" onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving..." : editingId ? "Update" : "Save"}</Button>
        </div>
      </DialogContent></Dialog>

      {/* Generate for All Dialog */}
      <Dialog open={genOpen} onOpenChange={setGenOpen}><DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Generate Payroll for All Employees</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Creates draft payroll records for all employees for the selected period. Employees with existing records for that month/year will be skipped.</p>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Month</Label>
              <Select value={genMonth} onValueChange={setGenMonth}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{months.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Year</Label>
              <Select value={genYear} onValueChange={setGenYear}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{yearOptions.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setGenOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={() => generateAll.mutate()} disabled={generateAll.isPending}>
              {generateAll.isPending ? "Generating..." : `Generate for ${months[parseInt(genMonth) - 1]} ${genYear}`}
            </Button>
          </div>
        </div>
      </DialogContent></Dialog>

      {/* Enhanced View Dialog */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}><DialogContent>
        <DialogHeader><DialogTitle>Payslip Details</DialogTitle></DialogHeader>
        {viewItem && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                {viewItem.employees?.name ? getInitials(viewItem.employees.name) : "?"}
              </div>
              <div>
                <h3 className="font-semibold">{viewItem.employees?.name || "Unknown"}</h3>
                <p className="text-sm text-muted-foreground">{months[(viewItem.month || 1) - 1]} {viewItem.year}</p>
              </div>
              <Badge variant={viewItem.status === "paid" ? "default" : "secondary"} className="ml-auto">{viewItem.status}</Badge>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Basic Salary</span><span>AED {viewItem.basic_salary?.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Payable Days</span><span>{viewItem.payable_days || 30}/30</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Housing Allowance</span><span className="text-success">AED {viewItem.housing_allowance?.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Transport Allowance</span><span className="text-success">AED {viewItem.transport_allowance?.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Food Allowance</span><span className="text-success">AED {viewItem.food_allowance?.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Overtime Pay</span><span className="text-success">AED {viewItem.overtime_pay?.toLocaleString()}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Deductions</span><span className="text-destructive">- AED {viewItem.deductions?.toLocaleString()}</span></div>
              <Separator />
              <div className="flex justify-between text-lg font-bold"><span>Net Pay</span><span>AED {viewItem.net_pay?.toLocaleString()}</span></div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 h-9 gap-1.5" onClick={() => printPayslip(viewItem)}>
                <Printer className="h-4 w-4" /> Print Payslip
              </Button>
              {viewItem.status !== "paid" && (
                <Button className="flex-1 h-9 gap-1.5 bg-success text-white hover:bg-success/90" onClick={() => markPaid.mutate(viewItem.id)} disabled={markPaid.isPending}>
                  <CheckCircle className="h-4 w-4" /> Mark as Paid
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent></Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} onConfirm={() => deleteId && del.mutate(deleteId)} />
    </div>
  );
}
