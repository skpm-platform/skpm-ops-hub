import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Clock, DollarSign, CheckSquare, TrendingUp, TrendingDown } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

export default function Dashboard() {
  const { user } = useAuth();

  const { data: profiles } = useQuery({
    queryKey: ["dashboard-profiles"],
    queryFn: async () => {
      const { data, count } = await supabase.from("profiles").select("*", { count: "exact" });
      return { list: data ?? [], count: count ?? 0 };
    },
  });

  const { data: tasks } = useQuery({
    queryKey: ["dashboard-tasks"],
    queryFn: async () => {
      const { data } = await supabase.from("tasks").select("*").neq("status", "done");
      return data ?? [];
    },
  });

  const { data: transactions } = useQuery({
    queryKey: ["dashboard-transactions"],
    queryFn: async () => {
      const { data } = await supabase.from("transactions").select("*").order("date", { ascending: true });
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

  // Build revenue chart from transactions
  const revenueChart = Array.from({ length: 6 }, (_, i) => {
    const month = subMonths(new Date(), 5 - i);
    const start = format(startOfMonth(month), "yyyy-MM-dd");
    const end = format(endOfMonth(month), "yyyy-MM-dd");
    const monthTx = (transactions ?? []).filter(t => t.date >= start && t.date <= end);
    return {
      name: format(month, "MMM"),
      income: monthTx.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0),
      expense: monthTx.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0),
    };
  });

  const totalIncome = (transactions ?? []).filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const memberCount = profiles?.count ?? 0;
  const presentToday = todayAttendance?.length ?? 0;
  const attendanceRate = memberCount > 0 ? Math.round((presentToday / memberCount) * 100) : 0;
  const openTasks = tasks?.length ?? 0;

  const kpis = [
    { title: "Total Members", value: memberCount.toString(), change: `${presentToday} present today`, icon: Users, trend: "up" as const },
    { title: "Attendance Rate", value: `${attendanceRate}%`, change: `${presentToday}/${memberCount} today`, icon: Clock, trend: attendanceRate >= 80 ? "up" as const : "down" as const },
    { title: "Monthly Revenue", value: `$${totalIncome.toLocaleString()}`, change: "All time income", icon: DollarSign, trend: "up" as const },
    { title: "Open Tasks", value: openTasks.toString(), change: `${tasks?.filter(t => t.priority === "high").length ?? 0} high priority`, icon: CheckSquare, trend: openTasks > 10 ? "down" as const : "up" as const },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back. Here's your overview.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{kpi.title}</p>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                  <div className="flex items-center gap-1 text-xs">
                    {kpi.trend === "up" ? <TrendingUp className="h-3 w-3 text-success" /> : <TrendingDown className="h-3 w-3 text-destructive" />}
                    <span className="text-muted-foreground">{kpi.change}</span>
                  </div>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
                  <kpi.icon className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Revenue (Last 6 Months)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={revenueChart}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Line type="monotone" dataKey="income" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="expense" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Recent Activity</CardTitle></CardHeader>
          <CardContent>
            {auditLogs && auditLogs.length > 0 ? (
              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <div key={log.id} className="flex items-start justify-between py-2 border-b last:border-0">
                    <div>
                      <span className="text-sm font-medium">{log.action}</span>
                      {log.details && <p className="text-xs text-muted-foreground">{log.details}</p>}
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                      {format(new Date(log.created_at), "HH:mm")}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No recent activity. Actions will appear here as you use the platform.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
