import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole, useProfile } from "@/hooks/use-profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users, Clock, DollarSign, CheckSquare, TrendingUp, TrendingDown,
  ArrowUpRight, Activity, Building2, FileText, AlertTriangle, Briefcase,
  Download, Shield, CalendarRange, Plus, Send, UserMinus, Wrench,
  Receipt, Sparkles, ChevronRight, Zap, FolderKanban, UserPlus, Ticket,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Area, AreaChart, PieChart, Pie, Cell,
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, addDays } from "date-fns";
import * as XLSX from "xlsx";
import { AIInsightsWidget } from "@/components/AIInsightsWidget";
import { ExpiryAlertsWidget } from "@/components/ExpiryAlertsWidget";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: role } = useUserRole();
  const navigate = useNavigate();
  const isAdmin = role === "admin";
  const isManagerUp = role === "admin" || role === "manager";
  const [dateRange, setDateRange] = useState("6m");
  const rangeMonths = dateRange === "1m" ? 1 : dateRange === "3m" ? 3 : dateRange === "6m" ? 6 : 12;

  const displayName = profile?.name || user?.email?.split("@")[0] || "User";
  const firstName = displayName.split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const { data: employees , isError: dataLoadError} = useQuery({
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

  const { data: helpdeskTickets } = useQuery({
    queryKey: ["dashboard-helpdesk-open"],
    queryFn: async () => {
      const { data } = await supabase.from("helpdesk_tickets").select("id").eq("status", "open");
      return data ?? [];
    },
  });

  const { data: visaExpiring } = useQuery({
    queryKey: ["dashboard-visa-expiring"],
    queryFn: async () => {
      const now = format(new Date(), "yyyy-MM-dd");
      const in30 = format(addDays(new Date(), 30), "yyyy-MM-dd");
      const { data } = await supabase.from("manpower").select("id,name,visa_expiry").lte("visa_expiry", in30).gte("visa_expiry", now);
      return data ?? [];
    },
  });

  const { data: contractsExpiring } = useQuery({
    queryKey: ["dashboard-contracts-expiring"],
    queryFn: async () => {
      const now = format(new Date(), "yyyy-MM-dd");
      const in30 = format(addDays(new Date(), 30), "yyyy-MM-dd");
      const { data } = await supabase.from("contracts").select("id,title,end_date").lte("end_date", in30).gte("end_date", now);
      return data ?? [];
    },
  });

  const { data: assetsMaintDue } = useQuery({
    queryKey: ["dashboard-assets-maint"],
    queryFn: async () => {
      const now = format(new Date(), "yyyy-MM-dd");
      const in30 = format(addDays(new Date(), 30), "yyyy-MM-dd");
      const { data } = await supabase.from("assets").select("id,name,next_maintenance_date").lte("next_maintenance_date", in30).gte("next_maintenance_date", now);
      return data ?? [];
    },
  });

  // Computed values
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

  const expenseByCategory = (transactions ?? []).filter(t => t.type === "expense").reduce((acc, t) => {
    const cat = t.category || "Uncategorized";
    acc[cat] = (acc[cat] || 0) + Number(t.amount);
    return acc;
  }, {} as Record<string, number>);
  const expensePieData = Object.entries(expenseByCategory).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);

  const totalIncome = (transactions ?? []).filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = (transactions ?? []).filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const employeeCount = employees?.count ?? 0;
  const presentToday = todayAttendance?.length ?? 0;
  const attendanceRate = employeeCount > 0 ? Math.round((presentToday / employeeCount) * 100) : 0;
  const openTasks = tasks?.filter(t => t.status !== "done").length ?? 0;
  const totalTasks = tasks?.length ?? 0;
  const completedTasks = tasks?.filter(t => t.status === "done").length ?? 0;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const highPriority = tasks?.filter(t => t.priority === "high" && t.status !== "done").length ?? 0;
  const activeProjects = projects?.filter(p => p.status === "active") ?? [];
  const openWO = workOrders?.length ?? 0;
  const unpaidInvoices = invoices?.filter(i => i.status !== "paid").length ?? 0;
  const unpaidTotal = invoices?.filter(i => i.status !== "paid").reduce((s, i) => s + Number(i.total || 0), 0) ?? 0;
  const openHSE = hseIncidents?.length ?? 0;
  const pendingLeaves = leaveRequests?.length ?? 0;
  const pendingExpenses = expensesPending?.length ?? 0;
  const netProfit = totalIncome - totalExpense;
  const profitMargin = totalIncome > 0 ? Math.round((netProfit / totalIncome) * 100) : 0;
  const openTickets = helpdeskTickets?.length ?? 0;
  const totalPendingApprovals = pendingLeaves + pendingExpenses;

  const taskDist = [
    { name: "To Do", value: tasks?.filter(t => t.status === "todo").length ?? 0, color: "hsl(var(--muted-foreground))" },
    { name: "In Progress", value: tasks?.filter(t => t.status === "in_progress").length ?? 0, color: "hsl(var(--warning))" },
    { name: "Review", value: tasks?.filter(t => t.status === "review").length ?? 0, color: "hsl(var(--info))" },
    { name: "Done", value: tasks?.filter(t => t.status === "done").length ?? 0, color: "hsl(var(--success))" },
  ].filter(d => d.value > 0);

  const projectDist = [
    { name: "Active", value: projects?.filter(p => p.status === "active").length ?? 0, color: "hsl(var(--success))" },
    { name: "On Hold", value: projects?.filter(p => p.status === "on_hold").length ?? 0, color: "hsl(var(--warning))" },
    { name: "Completed", value: projects?.filter(p => p.status === "completed").length ?? 0, color: "hsl(var(--info))" },
    { name: "Cancelled", value: projects?.filter(p => p.status === "cancelled").length ?? 0, color: "hsl(var(--destructive))" },
  ].filter(d => d.value > 0);

  const quickActions = [
    { label: "Add Employee", icon: UserPlus, path: "/employees", color: "bg-primary/10 text-primary hover:bg-primary/20 border-primary/10" },
    { label: "Create Invoice", icon: FileText, path: "/invoices", color: "bg-success/10 text-success hover:bg-success/20 border-success/10", show: isManagerUp },
    { label: "New Task", icon: CheckSquare, path: "/tasks", color: "bg-info/10 text-info hover:bg-info/20 border-info/10" },
    { label: "Log Expense", icon: Receipt, path: "/expenses", color: "bg-warning/10 text-warning hover:bg-warning/20 border-warning/10" },
    { label: "New Project", icon: FolderKanban, path: "/projects", color: "bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 border-purple-500/10", show: isManagerUp },
    { label: "Work Order", icon: Wrench, path: "/work-orders", color: "bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 border-orange-500/10" },
    { label: "Leave Request", icon: UserMinus, path: "/leave", color: "bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/10" },
  ].filter(a => a.show !== false);

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

  const expiryAlertCount = (visaExpiring?.length ?? 0) + (contractsExpiring?.length ?? 0) + (assetsMaintDue?.length ?? 0);

  return (
    <div className="space-y-6 animate-fade-in max-w-[1600px] mx-auto">
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
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            <span className="text-gradient-premium">{greeting}, {firstName}</span> 👋
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground/80">
            {format(new Date(), "EEEE, MMMM d, yyyy")} — Your command center at a glance
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5">
            <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="h-8 sm:h-9 w-[120px] sm:w-[130px] text-xs rounded-full border-border/60 bg-secondary/40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1m">Last Month</SelectItem>
                <SelectItem value="3m">Last 3 Months</SelectItem>
                <SelectItem value="6m">Last 6 Months</SelectItem>
                <SelectItem value="12m">Last 12 Months</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isAdmin && (
            <Button variant="outline" size="sm" className="h-8 sm:h-9 gap-2 text-xs rounded-full border-border/60" onClick={handleFullExport}>
              <Download className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Export All</span>
            </Button>
          )}
          <Badge variant="outline" className="hidden sm:flex items-center gap-1.5 text-xs font-normal px-3 py-1 rounded-full border-success/30 bg-success/5">
            <Activity className="h-3 w-3 text-success animate-pulse" />System Online
          </Badge>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* Quick Actions */}
      <div className="space-y-3">
        <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">Quick Actions</p>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
          {quickActions.map((action) => (
            <Button key={action.label} variant="ghost" size="sm"
              className={`h-8 sm:h-9 gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-medium rounded-full border transition-all duration-200 shrink-0 ${action.color}`}
              onClick={() => navigate(action.path)}>
              <action.icon className="h-3.5 w-3.5" />{action.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* Today's Stats */}
      <div className="space-y-3">
        <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">Today</p>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
          <Card className="card-hover shadow-premium border-0 cursor-pointer overflow-hidden" onClick={() => navigate("/attendance")} style={{ borderLeft: "3px solid hsl(var(--success))" }}>
            <CardContent className="p-3.5 sm:p-4 flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-success/20 to-success/5 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5 text-success" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold tabular-nums leading-none">{presentToday}</p>
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">Check-ins Today</p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-hover shadow-premium border-0 cursor-pointer overflow-hidden" onClick={() => navigate("/helpdesk")} style={{ borderLeft: "3px solid hsl(var(--warning))" }}>
            <CardContent className="p-3.5 sm:p-4 flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-warning/20 to-warning/5 flex items-center justify-center shrink-0">
                <Ticket className="h-5 w-5 text-warning" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold tabular-nums leading-none">{openTickets}</p>
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">Open Tickets</p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-hover shadow-premium border-0 cursor-pointer overflow-hidden" onClick={() => navigate("/approvals")} style={{ borderLeft: `3px solid ${totalPendingApprovals > 0 ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))"}` }}>
            <CardContent className="p-3.5 sm:p-4 flex items-center gap-3.5">
              <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${totalPendingApprovals > 0 ? "bg-gradient-to-br from-destructive/20 to-destructive/5" : "bg-muted"}`}>
                <Clock className={`h-5 w-5 ${totalPendingApprovals > 0 ? "text-destructive" : "text-muted-foreground"}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold tabular-nums leading-none">{totalPendingApprovals}</p>
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">Pending Approvals</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Expiry Alerts Section */}
      {expiryAlertCount > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">Expiry Alerts (30 days)</p>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
            {(visaExpiring?.length ?? 0) > 0 && (
              <Card className="card-hover border-destructive/30 bg-destructive/5 cursor-pointer" onClick={() => navigate("/manpower")}>
                <CardContent className="p-3.5 sm:p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-destructive/15 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-destructive">{visaExpiring?.length} Visa Expiries</p>
                    <p className="text-[11px] text-muted-foreground">Within 30 days</p>
                  </div>
                </CardContent>
              </Card>
            )}
            {(contractsExpiring?.length ?? 0) > 0 && (
              <Card className="card-hover border-warning/30 bg-warning/5 cursor-pointer" onClick={() => navigate("/contracts")}>
                <CardContent className="p-3.5 sm:p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-warning/15 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-warning">{contractsExpiring?.length} Contracts</p>
                    <p className="text-[11px] text-muted-foreground">Expiring soon</p>
                  </div>
                </CardContent>
              </Card>
            )}
            {(assetsMaintDue?.length ?? 0) > 0 && (
              <Card className="card-hover border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 cursor-pointer" onClick={() => navigate("/assets")}>
                <CardContent className="p-3.5 sm:p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                    <Wrench className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">{assetsMaintDue?.length} Assets</p>
                    <p className="text-[11px] text-muted-foreground">Maintenance due</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Pending Approvals Banner */}
      {isManagerUp && (pendingLeaves > 0 || pendingExpenses > 0 || openWO > 0) && (
        <Card className="border-warning/30 bg-gradient-to-r from-warning/5 via-warning/3 to-transparent overflow-hidden shadow-premium">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-warning/20 to-warning/5 flex items-center justify-center shrink-0"><AlertTriangle className="h-4.5 w-4.5 text-warning" /></div>
              <div>
                <p className="text-sm font-semibold text-foreground">Pending Approvals</p>
                <p className="text-xs text-muted-foreground">{[pendingLeaves > 0 && `${pendingLeaves} leave request${pendingLeaves > 1 ? "s" : ""}`, pendingExpenses > 0 && `${pendingExpenses} expense${pendingExpenses > 1 ? "s" : ""}`, openWO > 0 && `${openWO} work order${openWO > 1 ? "s" : ""}`].filter(Boolean).join(" • ")}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1 rounded-full shrink-0" onClick={() => navigate("/approvals")}>Review <ChevronRight className="h-3 w-3" /></Button>
          </CardContent>
        </Card>
      )}

      {/* KPI Grid */}
      <div className="space-y-3">
        <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">Key Metrics</p>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {[
            { title: "Employees", value: employeeCount.toString(), sub: `${presentToday} present (${attendanceRate}%)`, icon: Users, trend: "up" as const, color: "text-primary", bgColor: "from-primary/15 to-primary/5", borderColor: "hsl(var(--primary))", progress: attendanceRate },
            { title: "Task Completion", value: `${taskCompletionRate}%`, sub: `${completedTasks}/${totalTasks} done`, icon: CheckSquare, trend: taskCompletionRate >= 50 ? "up" as const : "down" as const, color: "text-info", bgColor: "from-info/15 to-info/5", borderColor: "hsl(var(--info))", progress: taskCompletionRate },
            { title: "Revenue", value: `AED ${totalIncome.toLocaleString()}`, sub: `${profitMargin}% margin`, icon: DollarSign, trend: netProfit >= 0 ? "up" as const : "down" as const, color: "text-success", bgColor: "from-success/15 to-success/5", borderColor: "hsl(var(--success))" },
            { title: "Net Profit", value: `AED ${netProfit.toLocaleString()}`, sub: `AED ${totalExpense.toLocaleString()} spent`, icon: TrendingUp, trend: netProfit >= 0 ? "up" as const : "down" as const, color: netProfit >= 0 ? "text-success" : "text-destructive", bgColor: netProfit >= 0 ? "from-success/15 to-success/5" : "from-destructive/15 to-destructive/5", borderColor: netProfit >= 0 ? "hsl(var(--success))" : "hsl(var(--destructive))" },
            { title: "Active Projects", value: activeProjects.length.toString(), sub: `${projects?.length ?? 0} total`, icon: Briefcase, trend: "up" as const, color: "text-primary", bgColor: "from-primary/15 to-primary/5", borderColor: "hsl(var(--primary))" },
            { title: "Unpaid Invoices", value: unpaidInvoices.toString(), sub: `AED ${unpaidTotal.toLocaleString()}`, icon: FileText, trend: unpaidInvoices > 0 ? "down" as const : "up" as const, color: "text-warning", bgColor: "from-warning/15 to-warning/5", borderColor: "hsl(var(--warning))" },
            { title: "Open Work Orders", value: openWO.toString(), sub: `${highPriority} high priority`, icon: Wrench, trend: openWO > 5 ? "down" as const : "up" as const, color: "text-info", bgColor: "from-info/15 to-info/5", borderColor: "hsl(var(--info))" },
            { title: "HSE Incidents", value: openHSE.toString(), sub: openHSE === 0 ? "All clear ✓" : `${openHSE} need attention`, icon: Shield, trend: openHSE > 0 ? "down" as const : "up" as const, color: openHSE > 0 ? "text-destructive" : "text-success", bgColor: openHSE > 0 ? "from-destructive/15 to-destructive/5" : "from-success/15 to-success/5", borderColor: openHSE > 0 ? "hsl(var(--destructive))" : "hsl(var(--success))" },
          ].map((kpi, idx) => (
            <Card key={kpi.title} className={`stat-card group shadow-premium border-0 overflow-hidden opacity-0 animate-fade-in stagger-${idx + 1}`} style={{ borderLeft: `3px solid ${kpi.borderColor}` }}>
              <CardContent className="p-3.5 sm:p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate">{kpi.title}</p>
                    <p className="text-lg sm:text-xl font-extrabold tracking-tight text-foreground tabular-nums leading-none">{kpi.value}</p>
                  </div>
                  <div className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-gradient-to-br ${kpi.bgColor} group-hover:scale-110 transition-transform duration-300 shrink-0 ${kpi.color}`}>
                    <kpi.icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
                  </div>
                </div>
                {"progress" in kpi && kpi.progress !== undefined && <Progress value={kpi.progress} className="h-1.5 mt-3 rounded-full" />}
                <div className="flex items-center gap-1 mt-2.5 text-[10px] sm:text-[11px] text-muted-foreground">
                  {kpi.trend === "up" ? <TrendingUp className="h-3 w-3 text-success shrink-0" /> : <TrendingDown className="h-3 w-3 text-destructive shrink-0" />}
                  <span className="truncate">{kpi.sub}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-premium border-0 overflow-hidden">
          <CardHeader className="pb-2 px-4 sm:px-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Revenue vs Expenses</CardTitle>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Last {rangeMonths}mo</span>
            </div>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <div className="rounded-xl overflow-hidden">
              <ResponsiveContainer width="100%" height={270}>
                <AreaChart data={revenueChart}>
                  <defs>
                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} width={45} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "12px", boxShadow: "0 10px 40px -10px rgba(0,0,0,0.15)" }} />
                  <Area type="monotone" dataKey="income" stroke="hsl(var(--success))" strokeWidth={2.5} fill="url(#incomeGrad)" name="Income" />
                  <Area type="monotone" dataKey="expense" stroke="hsl(var(--destructive))" strokeWidth={2} fill="url(#expenseGrad)" name="Expense" strokeDasharray="4 4" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-premium border-0 overflow-hidden">
          <CardHeader className="pb-2 px-4 sm:px-6"><CardTitle className="text-sm font-semibold">Task Distribution</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center px-4 sm:px-6">
            {taskDist.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie data={taskDist} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={4} dataKey="value" strokeWidth={0}>
                      {taskDist.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "12px", boxShadow: "0 10px 40px -10px rgba(0,0,0,0.15)" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 justify-center">
                  {taskDist.map(d => (
                    <div key={d.name} className="flex items-center gap-1.5 text-[11px]">
                      <div className="h-2.5 w-2.5 rounded-full shadow-sm" style={{ backgroundColor: d.color }} />
                      <span className="text-muted-foreground">{d.name}</span>
                      <span className="font-bold tabular-nums">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center py-12 gap-2">
                <CheckSquare className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">No tasks yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Second Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-premium border-0 overflow-hidden">
          <CardHeader className="pb-2 px-4 sm:px-6"><CardTitle className="text-sm font-semibold">Project Status</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center px-4 sm:px-6">
            {projectDist.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie data={projectDist} cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={4} dataKey="value" strokeWidth={0}>
                      {projectDist.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "12px", boxShadow: "0 10px 40px -10px rgba(0,0,0,0.15)" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 justify-center">
                  {projectDist.map(d => (
                    <div key={d.name} className="flex items-center gap-1.5 text-[11px]">
                      <div className="h-2.5 w-2.5 rounded-full shadow-sm" style={{ backgroundColor: d.color }} />
                      <span className="text-muted-foreground">{d.name}</span>
                      <span className="font-bold tabular-nums">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center py-12 gap-2">
                <Briefcase className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">No projects yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-premium border-0 overflow-hidden">
          <CardHeader className="pb-2 px-4 sm:px-6"><CardTitle className="text-sm font-semibold">Expense Breakdown</CardTitle></CardHeader>
          <CardContent className="px-2 sm:px-6">
            {expensePieData.length > 0 ? (
              <div className="rounded-xl overflow-hidden">
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={expensePieData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} width={75} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "12px", boxShadow: "0 10px 40px -10px rgba(0,0,0,0.15)" }} formatter={(v: number) => `AED ${v.toLocaleString()}`} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex flex-col items-center py-12 gap-2">
                <DollarSign className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">No expense data</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Insights + Expiry Alerts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <AIInsightsWidget kpiData={{
          employees: employeeCount, presentToday, attendanceRate,
          totalIncome, totalExpense, netProfit,
          openTasks, highPriorityTasks: highPriority, taskCompletionRate,
          activeProjects: activeProjects.length, totalProjects: projects?.length ?? 0,
          unpaidInvoices, unpaidTotal, openWorkOrders: openWO,
          openHSEIncidents: openHSE, pendingLeaves, pendingExpenses,
        }} />
        <ExpiryAlertsWidget />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Active Projects */}
        <Card className="shadow-premium border-0 overflow-hidden">
          <CardHeader className="pb-2 px-4 sm:px-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Active Projects</CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground rounded-full hover:bg-secondary/60" onClick={() => navigate("/projects")}>View all <ChevronRight className="h-3 w-3" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-0.5 px-4 sm:px-6">
            {activeProjects.length > 0 ? activeProjects.slice(0, 6).map((p) => {
              const budgetUsed = p.budget && p.spent ? Math.min(Math.round((Number(p.spent) / Number(p.budget)) * 100), 100) : 0;
              return (
                <div key={p.id} className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-0 group hover:bg-secondary/40 -mx-2.5 px-2.5 rounded-lg transition-all duration-200 cursor-pointer" onClick={() => navigate("/projects")}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium text-foreground truncate">{p.name}</p>
                      <Badge variant="outline" className="text-[9px] h-4 px-1.5 rounded-full font-medium">{p.priority}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-[10px] text-muted-foreground">{p.project_no ?? "No ID"}</p>
                      {p.budget && <><span className="text-[10px] text-muted-foreground">•</span><span className="text-[10px] text-muted-foreground">{budgetUsed}% budget</span></>}
                    </div>
                    {p.budget && <Progress value={budgetUsed} className="h-1 mt-1.5 rounded-full" />}
                  </div>
                  <div className="flex items-center gap-1.5 ml-3 shrink-0">
                    {p.budget && <span className="text-[10px] text-muted-foreground font-medium tabular-nums hidden sm:inline">AED {Number(p.budget).toLocaleString()}</span>}
                    <ArrowUpRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              );
            }) : (
              <div className="flex flex-col items-center py-8 gap-2">
                <Briefcase className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">No active projects</p>
                {isManagerUp && <Button variant="outline" size="sm" className="h-7 text-xs gap-1 mt-1 rounded-full" onClick={() => navigate("/projects")}><Plus className="h-3 w-3" /> Create Project</Button>}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="shadow-premium border-0 overflow-hidden">
          <CardHeader className="pb-2 px-4 sm:px-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
              {isAdmin && <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground rounded-full hover:bg-secondary/60" onClick={() => navigate("/audit-logs")}>View all <ChevronRight className="h-3 w-3" /></Button>}
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            {auditLogs && auditLogs.length > 0 ? (
              <div className="space-y-0.5">
                {auditLogs.slice(0, 5).map((log: any) => (
                  <div key={log.id} className="flex items-start justify-between py-2.5 border-b border-border/30 last:border-0 hover:bg-secondary/40 -mx-2.5 px-2.5 rounded-lg transition-all duration-200">
                    <div className="min-w-0 flex items-start gap-2.5">
                      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center shrink-0 mt-0.5"><Zap className="h-3.5 w-3.5 text-primary" /></div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{log.action}</p>
                        {log.details && <p className="text-[10px] text-muted-foreground truncate max-w-[220px] sm:max-w-[280px]">{log.details}</p>}
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2 tabular-nums">{format(new Date(log.created_at), "HH:mm")}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-8 gap-2">
                <Activity className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">No recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
