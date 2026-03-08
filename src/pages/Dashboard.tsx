import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Clock, DollarSign, CheckSquare, TrendingUp, TrendingDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const kpis = [
  { title: "Total Members", value: "48", change: "+3 this month", icon: Users, trend: "up" },
  { title: "Present Today", value: "42", change: "87.5% rate", icon: Clock, trend: "up" },
  { title: "Monthly Revenue", value: "$24,500", change: "+12% vs last", icon: DollarSign, trend: "up" },
  { title: "Open Tasks", value: "15", change: "3 overdue", icon: CheckSquare, trend: "down" },
];

const monthlyData = [
  { name: "Jan", income: 18000, expense: 12000 },
  { name: "Feb", income: 20000, expense: 14000 },
  { name: "Mar", income: 22000, expense: 13000 },
  { name: "Apr", income: 19000, expense: 15000 },
  { name: "May", income: 24500, expense: 16000 },
  { name: "Jun", income: 23000, expense: 14500 },
];

const taskData = [
  { name: "To Do", value: 8, color: "hsl(var(--muted-foreground))" },
  { name: "In Progress", value: 5, color: "hsl(var(--warning))" },
  { name: "Done", value: 12, color: "hsl(var(--success))" },
];

const activities = [
  { text: "John clocked in", time: "2 min ago" },
  { text: "Invoice #1024 paid", time: "15 min ago" },
  { text: "Sarah completed 'Fix AC Unit'", time: "1 hr ago" },
  { text: "New member added: Mike R.", time: "3 hrs ago" },
  { text: "Monthly report generated", time: "5 hrs ago" },
];

export default function Dashboard() {
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
                    {kpi.trend === "up" ? (
                      <TrendingUp className="h-3 w-3 text-success" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-destructive" />
                    )}
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
          <CardHeader><CardTitle className="text-base">Income vs Expenses</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Bar dataKey="income" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Tasks Overview</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={taskData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                  {taskData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 space-y-1">
              {taskData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent Activity</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activities.map((a, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                <span className="text-sm">{a.text}</span>
                <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">{a.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
