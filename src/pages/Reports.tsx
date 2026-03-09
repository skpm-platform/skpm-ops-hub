import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import {
  BarChart3, Download, FileText, Users, Clock, DollarSign, Package,
  Shield, GraduationCap, HardHat, Building2, TrendingUp, Search,
  FileSpreadsheet, Eye, RefreshCw, Loader2, CheckSquare, Wrench,
  ShoppingCart, ClipboardList, Receipt, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { format, subMonths } from "date-fns";
import * as XLSX from "xlsx";

interface ReportDef {
  title: string;
  desc: string;
  icon: any;
  color: string;
  table: string;
  category: string;
  dateField?: string;
}

const reports: ReportDef[] = [
  { title: "Attendance Report", desc: "Employee attendance by date range", icon: Clock, color: "text-blue-600", table: "attendance", category: "HR", dateField: "date" },
  { title: "Payroll Summary", desc: "Monthly payroll breakdown with allowances and deductions", icon: DollarSign, color: "text-emerald-600", table: "payroll", category: "Finance", dateField: "created_at" },
  { title: "Leave Requests", desc: "All leave requests with status and approval details", icon: Users, color: "text-violet-600", table: "leave_requests", category: "HR", dateField: "created_at" },
  { title: "Project Status", desc: "All projects with status, budget, and completion percentage", icon: FileText, color: "text-purple-600", table: "projects", category: "Operations", dateField: "created_at" },
  { title: "Invoice Aging", desc: "Outstanding invoices grouped by status", icon: DollarSign, color: "text-amber-600", table: "invoices", category: "Finance", dateField: "created_at" },
  { title: "Asset Register", desc: "Full asset register with values and assignment", icon: Package, color: "text-orange-600", table: "assets", category: "Operations", dateField: "created_at" },
  { title: "Manpower Deployment", desc: "Workers deployed per client/site with daily rates", icon: HardHat, color: "text-indigo-600", table: "deployments", category: "HR", dateField: "start_date" },
  { title: "HSE Incidents", desc: "Incidents by type, site, and status", icon: Shield, color: "text-red-600", table: "hse_incidents", category: "HSE", dateField: "date" },
  { title: "Training Programs", desc: "Employee training records and certification status", icon: GraduationCap, color: "text-teal-600", table: "training_programs", category: "HR", dateField: "date" },
  { title: "Employee Directory", desc: "Full staff list with visa status and department info", icon: Users, color: "text-pink-600", table: "employees", category: "HR", dateField: "created_at" },
  { title: "Financial Summary", desc: "Income vs expenses with category breakdowns", icon: TrendingUp, color: "text-success", table: "transactions", category: "Finance", dateField: "date" },
  { title: "Work Orders", desc: "All work orders with priority and completion status", icon: Wrench, color: "text-blue-600", table: "work_orders", category: "Operations", dateField: "created_at" },
  { title: "Purchase Orders", desc: "All POs with vendor, amount, and approval status", icon: ShoppingCart, color: "text-cyan-600", table: "purchase_orders", category: "Finance", dateField: "date" },
  { title: "Requisitions", desc: "Manpower requisitions with fulfillment status", icon: ClipboardList, color: "text-fuchsia-600", table: "requisitions", category: "HR", dateField: "created_at" },
  { title: "Tasks Overview", desc: "All tasks with status, priority, and assignee", icon: CheckSquare, color: "text-lime-600", table: "tasks", category: "Operations", dateField: "created_at" },
  { title: "Quotations", desc: "Quotes with client, value, VAT, and status", icon: Receipt, color: "text-yellow-600", table: "quotations", category: "Finance", dateField: "created_at" },
  { title: "Contracts & AMC", desc: "Active and expiring contracts with client details", icon: FileText, color: "text-rose-600", table: "contracts", category: "Finance", dateField: "start_date" },
  { title: "Worker Registry", desc: "All workers with trade, nationality and expiry dates", icon: HardHat, color: "text-slate-600", table: "workers", category: "HR", dateField: "created_at" },
  { title: "Gate Passes", desc: "All gate passes with validity and status", icon: Shield, color: "text-emerald-700", table: "gate_passes", category: "Security", dateField: "created_at" },
  { title: "Visitor Log", desc: "All visitor entries with check-in/out times", icon: Users, color: "text-sky-600", table: "visitor_log", category: "Security", dateField: "check_in" },
  { title: "Helpdesk Tickets", desc: "IT support tickets by category and priority", icon: Building2, color: "text-indigo-500", table: "helpdesk_tickets", category: "IT", dateField: "created_at" },
  { title: "Announcements", desc: "All company announcements with audience and expiry", icon: AlertTriangle, color: "text-amber-500", table: "announcements", category: "Admin", dateField: "created_at" },
];

const categories = ["All", "HR", "Finance", "Operations", "HSE", "Security", "IT", "Admin"];

export default function Reports() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [dateFrom, setDateFrom] = useState(format(subMonths(new Date(), 3), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [applyDateFilter, setApplyDateFilter] = useState(false);
  const [previewReport, setPreviewReport] = useState<ReportDef | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewCount, setPreviewCount] = useState(0);

  // Fetch record counts for all reports
  const { data: counts = {}, isLoading: countsLoading, refetch: refetchCounts } = useQuery({
    queryKey: ["report-counts"],
    queryFn: async () => {
      const result: Record<string, number> = {};
      await Promise.all(
        reports.map(async (r) => {
          try {
            const { count } = await (supabase as any)
              .from(r.table)
              .select("*", { count: "exact", head: true });
            result[r.table] = count ?? 0;
          } catch {
            result[r.table] = 0;
          }
        })
      );
      return result;
    },
    staleTime: 60000,
  });

  const filtered = reports.filter((r) => {
    const matchCat = category === "All" || r.category === category;
    const matchSearch = r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.desc.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleExport = async (r: ReportDef, exportType: "csv" | "excel") => {
    try {
      let query = (supabase as any).from(r.table).select("*").order("created_at", { ascending: false }).limit(5000);
      if (applyDateFilter && r.dateField) {
        query = query.gte(r.dateField, dateFrom).lte(r.dateField, dateTo);
      }
      const { data, error } = await query;
      if (error) throw error;
      if (!data?.length) { toast.error("No data to export"); return; }

      if (exportType === "csv") {
        const keys = Object.keys(data[0]).filter(k => typeof data[0][k] !== "object" || data[0][k] === null);
        const header = keys.join(",") + "\n";
        const rows = data.map((row: any) => keys.map(k => `"${String(row[k] ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob([header + rows], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = `${r.title.replace(/\s/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.csv`; a.click();
        URL.revokeObjectURL(url);
        toast.success(`${r.title} exported as CSV (${data.length} rows)`);
      } else {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, r.title.slice(0, 31));
        XLSX.writeFile(wb, `${r.title.replace(/\s/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
        toast.success(`${r.title} exported as Excel (${data.length} rows)`);
      }
    } catch (e: any) {
      toast.error(e.message || "Export failed");
    }
  };

  const handlePreview = async (r: ReportDef) => {
    setPreviewReport(r);
    setPreviewLoading(true);
    try {
      let query = (supabase as any).from(r.table).select("*").order("created_at", { ascending: false }).limit(10);
      if (applyDateFilter && r.dateField) {
        query = query.gte(r.dateField, dateFrom).lte(r.dateField, dateTo);
      }
      const { data, error } = await query;
      if (error) throw error;
      setPreviewData(data ?? []);
      setPreviewCount(counts[r.table] ?? 0);
    } catch (e: any) {
      toast.error(e.message || "Preview failed");
    } finally {
      setPreviewLoading(false);
    }
  };

  const previewColumns = previewData.length > 0
    ? Object.keys(previewData[0]).filter(k => !["id", "created_at"].includes(k)).slice(0, 6)
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Reports & Exports</h1>
            <p className="text-sm text-muted-foreground">{reports.length} reports available across all modules</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="h-9 gap-2" onClick={() => refetchCounts()}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh Counts
        </Button>
      </div>

      {/* Filters Row */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Search Reports</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by name or description..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date From</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 w-40" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date To</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 w-40" />
            </div>
            <Button
              variant={applyDateFilter ? "default" : "outline"}
              size="sm"
              className="h-9"
              onClick={() => setApplyDateFilter(v => !v)}
            >
              {applyDateFilter ? "✓ Date Filter ON" : "Apply Date Filter"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Category Tabs */}
      <Tabs value={category} onValueChange={setCategory}>
        <TabsList className="flex-wrap h-auto gap-1">
          {categories.map(c => (
            <TabsTrigger key={c} value={c} className="text-xs h-8">
              {c}
              {c !== "All" && (
                <Badge variant="secondary" className="ml-1 text-[9px] h-4 px-1">
                  {reports.filter(r => r.category === c).length}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map(cat => (
          <TabsContent key={cat} value={cat} className="mt-4">
            {filtered.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No reports match your search.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((r) => (
                  <Card key={r.title} className="hover:shadow-md transition-all border hover:border-primary/30">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <r.icon className={`h-6 w-6 shrink-0 ${r.color}`} />
                          <div>
                            <CardTitle className="text-sm leading-tight">{r.title}</CardTitle>
                            <Badge variant="outline" className="text-[9px] mt-0.5 h-4">{r.category}</Badge>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          {countsLoading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                          ) : (
                            <div className="text-right">
                              <p className="text-lg font-bold leading-none">{(counts[r.table] ?? 0).toLocaleString()}</p>
                              <p className="text-[10px] text-muted-foreground">records</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{r.desc}</p>
                      <div className="flex gap-1.5 flex-wrap">
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 flex-1" onClick={() => handlePreview(r)}>
                          <Eye className="h-3 w-3" /> Preview
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleExport(r, "csv")}>
                          <FileText className="h-3 w-3" /> CSV
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleExport(r, "excel")}>
                          <FileSpreadsheet className="h-3 w-3" /> Excel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Preview Panel */}
      {previewReport && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <previewReport.icon className={`h-5 w-5 ${previewReport.color}`} />
                <CardTitle className="text-base">{previewReport.title} — Preview</CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {previewCount.toLocaleString()} total records
                  {applyDateFilter ? ` (filtered: ${dateFrom} – ${dateTo})` : ""}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => handleExport(previewReport, "csv")}>
                  <Download className="h-3 w-3" /> CSV
                </Button>
                <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => handleExport(previewReport, "excel")}>
                  <Download className="h-3 w-3" /> Excel
                </Button>
                <Button size="sm" variant="ghost" className="h-8" onClick={() => setPreviewReport(null)}>✕</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {previewLoading ? (
              <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : previewData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No records found.</p>
            ) : (
              <>
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {previewColumns.map(col => (
                          <TableHead key={col} className="text-xs capitalize">{col.replace(/_/g, " ")}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.map((row, i) => (
                        <TableRow key={i}>
                          {previewColumns.map(col => (
                            <TableCell key={col} className="text-xs max-w-[150px] truncate">
                              {row[col] === null || row[col] === undefined ? "—" : String(row[col]).slice(0, 80)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Showing latest 10 of {previewCount.toLocaleString()} records. Export to see all data.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
