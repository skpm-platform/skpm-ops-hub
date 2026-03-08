import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Download, FileText, Users, Clock, DollarSign, Package, Shield, GraduationCap, HardHat, Building2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import * as XLSX from "xlsx";

const reports = [
  { title: "Attendance Report", desc: "Employee attendance by department, site, or date range", icon: Clock, color: "text-blue-600", table: "attendance" },
  { title: "Payroll Summary", desc: "Monthly payroll breakdown with allowances and deductions", icon: DollarSign, color: "text-emerald-600", table: "payroll" },
  { title: "Project Status", desc: "All projects with status, budget, and completion percentage", icon: FileText, color: "text-purple-600", table: "projects" },
  { title: "Invoice Aging", desc: "Outstanding invoices grouped by age", icon: DollarSign, color: "text-amber-600", table: "invoices" },
  { title: "Asset Register", desc: "Full asset register with values and depreciation", icon: Package, color: "text-orange-600", table: "assets" },
  { title: "Manpower Deployment", desc: "Workers deployed per client/site with daily rates", icon: HardHat, color: "text-indigo-600", table: "deployments" },
  { title: "HSE Incident Report", desc: "Incidents by type, site, and month", icon: Shield, color: "text-red-600", table: "hse_incidents" },
  { title: "Training Completion", desc: "Employee training records and certification status", icon: GraduationCap, color: "text-teal-600", table: "training_programs" },
  { title: "Employee Directory", desc: "Full staff list with visa status and department info", icon: Users, color: "text-pink-600", table: "employees" },
  { title: "Financial Summary", desc: "Income vs expenses with category breakdowns", icon: DollarSign, color: "text-success", table: "transactions" },
  { title: "Work Orders", desc: "All work orders with priority and completion status", icon: Building2, color: "text-blue-600", table: "work_orders" },
];

export default function Reports() {
  const handleExport = async (title: string, table: string, exportType: "csv" | "excel") => {
    try {
      const { data, error } = await (supabase as any).from(table).select("*").order("created_at", { ascending: false }).limit(1000);
      if (error) throw error;
      if (!data?.length) { toast.error("No data to export"); return; }

      if (exportType === "csv") {
        const keys = Object.keys(data[0]).filter(k => typeof data[0][k] !== "object" || data[0][k] === null);
        const header = keys.join(",") + "\n";
        const rows = data.map((row: any) => keys.map(k => `"${String(row[k] ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob([header + rows], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = `${title.replace(/\s/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.csv`; a.click();
        URL.revokeObjectURL(url);
        toast.success(`${title} CSV exported`);
      } else {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31));
        XLSX.writeFile(wb, `${title.replace(/\s/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
        toast.success(`${title} Excel exported`);
      }
    } catch (e: any) {
      toast.error(e.message || "Export failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3"><BarChart3 className="h-7 w-7 text-primary" /><h1 className="text-2xl font-bold">Reports</h1></div>
      <p className="text-muted-foreground">Export live data from any module as CSV or Excel.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((r) => (
          <Card key={r.title} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <r.icon className={`h-8 w-8 ${r.color}`} />
              </div>
              <CardTitle className="text-base">{r.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{r.desc}</p>
              <div className="flex gap-2">
                <Button size="sm" className="h-9" variant="outline" onClick={() => handleExport(r.title, r.table, "csv")}><Download className="h-3 w-3 mr-1" />CSV</Button>
                <Button size="sm" className="h-9" variant="outline" onClick={() => handleExport(r.title, r.table, "excel")}><Download className="h-3 w-3 mr-1" />Excel</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
