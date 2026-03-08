import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/use-profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Clock, DollarSign, CheckSquare, TrendingUp, TrendingDown, ArrowUpRight, Activity, Building2, FileText, AlertTriangle, Briefcase, Download, Shield, CalendarRange } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, PieChart, Pie, Cell, Legend } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import * as XLSX from "xlsx";
import { AIInsightsWidget } from "@/components/AIInsightsWidget";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: role } = useUserRole();
  const isAdmin = role === "admin";
  const [dateRange, setDateRange] = useState("6m");
  const rangeMonths = dateRange === "1m" ? 1 : dateRange === "3m" ? 3 : dateRange === "6m" ? 6 : 12;

  const { data: profiles } = useQuery({
    queryKey: ["dashboard-profiles"],
    queryFn: async () => {
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      return { count: count ?? 0 };
    },
  });

  const { data: employees } = useQuery({
    queryKey: ["dashboard-employees"],
    queryFn: async () => {
      const { count } = await supabase.from("employees").select("*", { count: "exact", head: true });
      return { count: count ?? 0 };
    },
  });

  const { data: tasks } = useQuery({
    queryKey: ["dashboard-tasks"],
    queryFn: async () => {
      const { data } = await supabase.from("tasks").select("id,status,priority").limit(500);
      return data ?? [];
    },
  });

  const { data: transactions } = useQuery({
    queryKey: ["dashboard-transactions", rangeMonths],
    queryFn: async () => {
      const rangeAgo = format(subMonths(new Date(), rangeMonths), "yyyy-MM-dd");
      const { data } = await supabase.from("transactions").select("date,type,amount,category").gte("date", rangeAgo).order("date", { ascending: true });
      return data ?? [];
    },
  });

  const { data: todayAttendance } = useQuery({
    queryKey: ["dashboard-attendance-today"],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data } = await supabase.from("attendance").select("*").eq("date", today);
      return data ?? [];
    },
  });

  const { data: auditLogs } = useQuery({
    queryKey: ["dashboard-audit"],
    queryFn: async () => {
      const { data } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(10);
      return data ?? [];
    },
  });

  const { data: projects } = useQuery({
    queryKey: ["dashboard-projects"],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("*").limit(50);
      return data ?? [];
    },
  });

  const { data: invoices } = useQuery({
    queryKey: ["dashboard-invoices"],
    queryFn: async () => {
      const { data } = await supabase.from("invoices").select("id,status,total").limit(500);
      return data ?? [];
    },
  });

  const { data: workOrders } = useQuery({
    queryKey: ["dashboard-work-orders"],
    queryFn: async () => {
      const { data } = await supabase.from("work_orders").select("id,status").eq("status", "open");
      return data ?? [];
    },
  });

  const { data: hseIncidents } = useQuery({
    queryKey: ["dashboard-hse"],
    queryFn: async () => {
      const { data } = await supabase.from("hse_incidents").select("id").eq("status", "open");
      return data ?? [];
    },
  });

  const { data: leaveRequests } = useQuery({
    queryKey: ["dashboard-pending-leaves"],
    queryFn: async () => {
      const { data } = await supabase.from("leave_requests").select("*").eq("status", "pending");
      return data ?? [];
    },
  });

  const { data: expensesPending } = useQuery({
    queryKey: ["dashboard-pending-expenses"],
    queryFn: async () => {
      const { data } = await supabase.from("expenses").select("*").eq("status", "pending");
      return data ?? [];
    },
  });

  // Revenue chart
  const revenueChart = Array.from({ length: rangeMonths }, (_, i) => {
    const month = subMonths(new Date(), rangeMonths - 1 - i);
    const start = format(startOfMonth(month), "yyyy-MM-dd");
    const end = format(endOfMonth(month), "yyyy-MM-dd");
    const monthTx = (transactions ?? []).filter(t => t.date >= start && t.date <= end);
    return {
      name: format(month, "MMM"),
      income: monthTx.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0),
      expense: monthTx.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0),
    };
  });

  // Expense category breakdown
  const expenseByCategory = (transactions ?? []).filter(t => t.type === "expense").reduce((acc, t) => {
    const cat = t.category || "Uncategorized";
    acc[cat] = (acc[cat] || 0) + Number(t.amount);
    return acc;
  }, {} as Record<string, number>);
  const expensePieData = Object.entries(expenseByCategory).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  const pieColors = ["hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--info))", "hsl(var(--destructive))", "hsl(var(--muted-foreground))"];

  const totalIncome = (transactions ?? []).filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = (transactions ?? []).filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const employeeCount = employees?.count ?? 0;
  const presentToday = todayAttendance?.length ?? 0;
  const attendanceRate = employeeCount > 0 ? Math.round((presentToday / employeeCount) * 100) : 0;
  const openTasks = tasks?.filter(t => t.status !== "done").length ?? 0;
  const highPriority = tasks?.filter(t => t.priority === "high" && t.status !== "done").length ?? 0;
  const activeProjects = projects?.filter(p => p.status === "active") ?? [];
  const openWO = workOrders?.length ?? 0;
  const unpaidInvoices = invoices?.filter(i => i.status !== "paid").length ?? 0;
  const unpaidTotal = invoices?.filter(i => i.status !== "paid").reduce((s, i) => s + Number(i.total || 0), 0) ?? 0;
  const openHSE = hseIncidents?.length ?? 0;
  const pendingLeaves = leaveRequests?.length ?? 0;
  const pendingExpenses = expensesPending?.length ?? 0;

  // Task distribution for pie chart
  const taskDist = [
    { name: "To Do", value: tasks?.filter(t => t.status === "todo").length ?? 0, color: "hsl(var(--muted-foreground))" },
    { name: "In Progress", value: tasks?.filter(t => t.status === "in_progress").length ?? 0, color: "hsl(var(--warning))" },
    { name: "Review", value: tasks?.filter(t => t.status === "review").length ?? 0, color: "hsl(var(--info))" },
    { name: "Done", value: tasks?.filter(t => t.status === "done").length ?? 0, color: "hsl(var(--success))" },
  ].filter(d => d.value > 0);

  // Project status distribution
  const projectDist = [
    { name: "Active", value: projects?.filter(p => p.status === "active").length ?? 0, color: "hsl(var(--success))" },
    { name: "On Hold", value: projects?.filter(p => p.status === "on_hold").length ?? 0, color: "hsl(var(--warning))" },
    { name: "Completed", value: projects?.filter(p => p.status === "completed").length ?? 0, color: "hsl(var(--info))" },
    { name: "Cancelled", value: projects?.filter(p => p.status === "cancelled").length ?? 0, color: "hsl(var(--destructive))" },
  ].filter(d => d.value > 0);

  const kpis = [
    { title: "Employees", value: employeeCount.toString(), sub: `${presentToday} present today`, icon: Users, trend: "up" as const, color: "text-primary" },
    { title: "Attendance Rate", value: `${attendanceRate}%`, sub: `${presentToday} of ${employeeCount}`, icon: Clock, trend: attendanceRate >= 80 ? "up" as const : "down" as const, color: "text-info" },
    { title: "Revenue", value: `AED ${totalIncome.toLocaleString()}`, sub: `AED ${totalExpense.toLocaleString()} spent`, icon: DollarSign, trend: "up" as const, color: "text-success" },
    { title: "Open Tasks", value: openTasks.toString(), sub: `${highPriority} high priority`, icon: CheckSquare, trend: openTasks > 10 ? "down" as const : "up" as const, color: "text-warning" },
    { title: "Active Projects", value: activeProjects.length.toString(), sub: `${projects?.length ?? 0} total`, icon: Briefcase, trend: "up" as const, color: "text-primary" },
    { title: "Unpaid Invoices", value: unpaidInvoices.toString(), sub: `AED ${unpaidTotal.toLocaleString()} outstanding`, icon: FileText, trend: unpaidInvoices > 0 ? "down" as const : "up" as const, color: "text-warning" },
    { title: "HSE Incidents", value: openHSE.toString(), sub: `${openHSE} open incidents`, icon: Shield, trend: openHSE > 0 ? "down" as const : "up" as const, color: "text-destructive" },
    { title: "Net Profit", value: `AED ${(totalIncome - totalExpense).toLocaleString()}`, sub: totalIncome > totalExpense ? "Profitable" : "Loss", icon: TrendingUp, trend: totalIncome >= totalExpense ? "up" as const : "down" as const, color: "text-success" },
  ];

  // Full system export
  const handleFullExport = async () => {
    const tables = ["employees", "projects", "tasks", "invoices", "expenses", "attendance", "work_orders", "clients", "contracts", "assets"] as const;
    const wb = XLSX.utils.book_new();
    for (const table of tables) {
      const { data } = await supabase.from(table).select("*");
      if (data && data.length > 0) {
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, table.charAt(0).toUpperCase() + table.slice(1).replace(/_/g, " "));
      }
    }
    XLSX.writeFile(wb, `SKPM_Full_Export_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="h-9 w-[130px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1m">Last Month</SelectItem>
                <SelectItem value="3m">Last 3 Months</SelectItem>
                <SelectItem value="6m">Last 6 Months</SelectItem>
                <SelectItem value="12m">Last 12 Months</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isAdmin && (
            <Button variant="outline" size="sm" className="h-9 gap-2 text-xs" onClick={handleFullExport}>
              <Download className="h-3.5 w-3.5" /> Export All Data
            </Button>
          )}
          <Badge variant="outline" className="hidden sm:flex items-center gap-1.5 text-xs font-normal px-2.5 py-1">
            <Activity className="h-3 w-3 text-success" />System Online
          </Badge>
        </div>
      </div>

      {/* Pending Approvals Banner */}
      {isAdmin && (pendingLeaves > 0 || pendingExpenses > 0) && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-3 flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
            <p className="text-sm">
              <span className="font-medium">Pending Approvals:</span>
              {pendingLeaves > 0 && <span className="ml-2">{pendingLeaves} leave request(s)</span>}
              {pendingExpenses > 0 && <span className="ml-2">• {pendingExpenses} expense(s)</span>}
            </p>
          </CardContent>
        </Card>
      )}

      {/* KPI Grid */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title} className="border shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1.5">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{kpi.title}</p>
                  <p className="text-xl font-semibold tracking-tight text-foreground">{kpi.value}</p>
                </div>
                <div className={`flex h-8 w-8 items-center justify-center rounded-md bg-secondary ${kpi.color}`}>
                  <kpi.icon className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-2 text-[11px] text-muted-foreground">
                {kpi.trend === "up" ? <TrendingUp className="h-3 w-3 text-success" /> : <TrendingDown className="h-3 w-3 text-destructive" />}
                <span>{kpi.sub}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2 border shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Revenue vs Expenses</CardTitle>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Last {rangeMonths} month{rangeMonths > 1 ? "s" : ""}</span>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={revenueChart}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} width={50} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
                <Area type="monotone" dataKey="income" stroke="hsl(var(--success))" strokeWidth={2} fill="url(#incomeGrad)" name="Income" />
                <Area type="monotone" dataKey="expense" stroke="hsl(var(--destructive))" strokeWidth={2} fill="url(#expenseGrad)" name="Expense" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Task Distribution */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Task Distribution</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {taskDist.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={taskDist} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                      {taskDist.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 mt-2 justify-center">
                  {taskDist.map(d => (
                    <div key={d.name} className="flex items-center gap-1.5 text-[11px]">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-muted-foreground">{d.name}</span>
                      <span className="font-medium">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground py-12">No tasks yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Second Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Project Status */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Project Status Overview</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center">
            {projectDist.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={projectDist} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                      {projectDist.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 mt-2 justify-center">
                  {projectDist.map(d => (
                    <div key={d.name} className="flex items-center gap-1.5 text-[11px]">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-muted-foreground">{d.name}</span>
                      <span className="font-medium">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : <p className="text-xs text-muted-foreground py-12">No projects yet</p>}
          </CardContent>
        </Card>

        {/* Expense Breakdown */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Expense Breakdown by Category</CardTitle></CardHeader>
          <CardContent>
            {expensePieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={expensePieData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px" }} formatter={(v: number) => `AED ${v.toLocaleString()}`} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-xs text-muted-foreground py-12 text-center">No expense data</p>}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Active Projects */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Active Projects</CardTitle>
              <span className="text-[10px] text-muted-foreground">{activeProjects.length} active</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {activeProjects.length > 0 ? activeProjects.slice(0, 6).map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground">{p.project_no ?? "No ID"} • {p.priority}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {p.budget && <span className="text-[10px] text-muted-foreground">AED {Number(p.budget).toLocaleString()}</span>}
                  <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
                </div>
              </div>
            )) : (
              <p className="text-xs text-muted-foreground py-4 text-center">No active projects</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {auditLogs && auditLogs.length > 0 ? (
              <div className="space-y-1">
                {auditLogs.slice(0, 8).map((log) => (
                  <div key={log.id} className="flex items-start justify-between py-1.5 border-b border-border/50 last:border-0">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{log.action}</p>
                      {log.details && <p className="text-[10px] text-muted-foreground truncate">{log.details}</p>}
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2 tabular-nums">
                      {format(new Date(log.created_at), "HH:mm")}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-4 text-center">No recent activity</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
