import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Download, FileText, Users, Clock, DollarSign, Package, Shield, GraduationCap, HardHat } from "lucide-react";
import { toast } from "sonner";

const reports = [
  { title: "Attendance Report", desc: "Employee attendance by department, site, or date range", icon: Clock, color: "text-blue-600" },
  { title: "Payroll Summary", desc: "Monthly payroll breakdown with allowances and deductions", icon: DollarSign, color: "text-emerald-600" },
  { title: "Project Status", desc: "All projects with status, budget, and completion percentage", icon: FileText, color: "text-purple-600" },
  { title: "Invoice Aging", desc: "Outstanding invoices grouped by age (0-30, 31-60, 61-90, 90+ days)", icon: DollarSign, color: "text-amber-600" },
  { title: "Asset Register", desc: "Full asset register with values and depreciation", icon: Package, color: "text-orange-600" },
  { title: "Manpower Deployment", desc: "Workers deployed per client/site with daily rates", icon: HardHat, color: "text-indigo-600" },
  { title: "HSE Incident Report", desc: "Incidents by type, site, and month", icon: Shield, color: "text-red-600" },
  { title: "Training Completion", desc: "Employee training records and certification status", icon: GraduationCap, color: "text-teal-600" },
  { title: "Employee Directory", desc: "Full staff list with visa status and department info", icon: Users, color: "text-pink-600" },
];

export default function Reports() {
  const handleExport = (title: string) => {
    toast.info(`${title} export will be available soon`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3"><BarChart3 className="h-7 w-7 text-primary" /><h1 className="text-2xl font-bold">Reports</h1></div>
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
                <Button size="sm" variant="outline" onClick={() => handleExport(r.title)}><Download className="h-3 w-3 mr-1" />PDF</Button>
                <Button size="sm" variant="outline" onClick={() => handleExport(r.title)}><Download className="h-3 w-3 mr-1" />Excel</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
