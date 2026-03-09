import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, differenceInDays, parseISO } from "date-fns";
import { TrendingUp, TrendingDown, DollarSign, FileText, Download, Calculator } from "lucide-react";
import { ExportButton } from "@/components/ExportButton";

export default function FinancialReports() {
  const [period, setPeriod] = useState("12m");
  const months = period === "3m" ? 3 : period === "6m" ? 6 : 12;

  const { data: transactions = [] } = useQuery({
    queryKey: ["fin-reports-tx", months],
    queryFn: async () => {
      const rangeAgo = format(subMonths(new Date(), months), "yyyy-MM-dd");
      const { data } = await supabase.from("transactions").select("*").gte("date", rangeAgo).order("date");
      return data ?? [];
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["fin-reports-invoices"],
    queryFn: async () => {
      const { data } = await supabase.from("invoices").select("id, invoice_no, client_id, total, status, due_date, issue_date").limit(500);
      return data ?? [];
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["fin-reports-projects"],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id, name, budget, spent, status").limit(100);
      return data ?? [];
    },
  });

  // P&L Data
  const plData = Array.from({ length: months }, (_, i) => {
    const month = subMonths(new Date(), months - 1 - i);
    const start = format(startOfMonth(month), "yyyy-MM-dd");
    const end = format(endOfMonth(month), "yyyy-MM-dd");
    const monthTx = transactions.filter((t) => t.date >= start && t.date <= end);
    const income = monthTx.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const expense = monthTx.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
    return { name: format(month, "MMM yyyy"), income, expense, profit: income - expense };
  });

  const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const netProfit = totalIncome - totalExpense;
  const profitMargin = totalIncome > 0 ? Math.round((netProfit / totalIncome) * 100) : 0;

  // Expense breakdown by category
  const categoryBreakdown = transactions
    .filter((t) => t.type === "expense")
    .reduce((acc, t) => {
      const cat = t.category || "Uncategorized";
      acc[cat] = (acc[cat] || 0) + Number(t.amount);
      return acc;
    }, {} as Record<string, number>);
  const categoryPie = Object.entries(categoryBreakdown)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const pieColors = ["hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--info))", "hsl(var(--destructive))", "hsl(var(--muted-foreground))"];

  // Aging Report
  const today = new Date();
  const unpaidInvoices = invoices.filter((i) => i.status !== "paid");
  const agingBuckets = {
    current: unpaidInvoices.filter((i) => !i.due_date || differenceInDays(today, parseISO(i.due_date)) <= 0),
    "1-30": unpaidInvoices.filter((i) => i.due_date && differenceInDays(today, parseISO(i.due_date)) > 0 && differenceInDays(today, parseISO(i.due_date)) <= 30),
    "31-60": unpaidInvoices.filter((i) => i.due_date && differenceInDays(today, parseISO(i.due_date)) > 30 && differenceInDays(today, parseISO(i.due_date)) <= 60),
    "61-90": unpaidInvoices.filter((i) => i.due_date && differenceInDays(today, parseISO(i.due_date)) > 60 && differenceInDays(today, parseISO(i.due_date)) <= 90),
    "90+": unpaidInvoices.filter((i) => i.due_date && differenceInDays(today, parseISO(i.due_date)) > 90),
  };
  const agingData = Object.entries(agingBuckets).map(([name, items]) => ({
    name: name === "current" ? "Current" : `${name} days`,
    count: items.length,
    total: items.reduce((s, i) => s + Number(i.total || 0), 0),
  }));

  // Budget vs Actual
  const budgetData = projects
    .filter((p) => p.budget && Number(p.budget) > 0)
    .slice(0, 10)
    .map((p) => ({
      name: p.name.length > 15 ? p.name.substring(0, 15) + "…" : p.name,
      budget: Number(p.budget || 0),
      spent: Number(p.spent || 0),
      variance: Number(p.budget || 0) - Number(p.spent || 0),
    }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Financial Reports</h1>
          <p className="text-sm text-muted-foreground">P&L statements, aging reports & budget analysis</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="h-9 w-[130px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="3m">3 Months</SelectItem>
              <SelectItem value="6m">6 Months</SelectItem>
              <SelectItem value="12m">12 Months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Revenue", value: `AED ${totalIncome.toLocaleString()}`, icon: TrendingUp, color: "text-success" },
          { label: "Total Expenses", value: `AED ${totalExpense.toLocaleString()}`, icon: TrendingDown, color: "text-destructive" },
          { label: "Net Profit", value: `AED ${netProfit.toLocaleString()}`, icon: DollarSign, color: netProfit >= 0 ? "text-success" : "text-destructive" },
          { label: "Profit Margin", value: `${profitMargin}%`, icon: Calculator, color: profitMargin >= 20 ? "text-success" : "text-warning" },
        ].map((k) => (
          <Card key={k.label} className="border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{k.label}</p>
                  <p className="text-xl font-bold text-foreground mt-1">{k.value}</p>
                </div>
                <div className={`h-9 w-9 rounded-lg bg-secondary flex items-center justify-center ${k.color}`}>
                  <k.icon className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="pnl">
        <TabsList>
          <TabsTrigger value="pnl">P&L Statement</TabsTrigger>
          <TabsTrigger value="aging">Aging Report</TabsTrigger>
          <TabsTrigger value="budget">Budget vs Actual</TabsTrigger>
          <TabsTrigger value="breakdown">Expense Breakdown</TabsTrigger>
        </TabsList>

        <TabsContent value="pnl" className="space-y-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Profit & Loss Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={plData}>
                  <defs>
                    <linearGradient id="plIncomeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} width={60} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} formatter={(v: number) => `AED ${v.toLocaleString()}`} />
                  <Area type="monotone" dataKey="income" stroke="hsl(var(--success))" strokeWidth={2} fill="url(#plIncomeGrad)" name="Revenue" />
                  <Line type="monotone" dataKey="expense" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} name="Expenses" />
                  <Line type="monotone" dataKey="profit" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} name="Net Profit" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Monthly P&L Detail</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Expenses</TableHead>
                    <TableHead className="text-right">Net Profit</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plData.map((m) => {
                    const margin = m.income > 0 ? Math.round((m.profit / m.income) * 100) : 0;
                    return (
                      <TableRow key={m.name}>
                        <TableCell className="text-xs font-medium">{m.name}</TableCell>
                        <TableCell className="text-right text-xs text-success">AED {m.income.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-xs text-destructive">AED {m.expense.toLocaleString()}</TableCell>
                        <TableCell className={`text-right text-xs font-semibold ${m.profit >= 0 ? "text-success" : "text-destructive"}`}>
                          AED {m.profit.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className={`text-[10px] ${margin >= 20 ? "text-success" : margin >= 0 ? "text-warning" : "text-destructive"}`}>
                            {margin}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-secondary/50 font-semibold">
                    <TableCell className="text-xs">Total</TableCell>
                    <TableCell className="text-right text-xs text-success">AED {totalIncome.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-xs text-destructive">AED {totalExpense.toLocaleString()}</TableCell>
                    <TableCell className={`text-right text-xs ${netProfit >= 0 ? "text-success" : "text-destructive"}`}>
                      AED {netProfit.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right"><Badge variant="outline" className="text-[10px]">{profitMargin}%</Badge></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aging" className="space-y-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Accounts Receivable Aging</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={agingData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} width={60} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} formatter={(v: number) => `AED ${v.toLocaleString()}`} />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Outstanding Amount" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aging Bucket</TableHead>
                    <TableHead className="text-right">Invoices</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agingData.map((b) => (
                    <TableRow key={b.name}>
                      <TableCell className="text-xs font-medium">{b.name}</TableCell>
                      <TableCell className="text-right text-xs">{b.count}</TableCell>
                      <TableCell className="text-right text-xs font-semibold">AED {b.total.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-secondary/50 font-semibold">
                    <TableCell className="text-xs">Total</TableCell>
                    <TableCell className="text-right text-xs">{unpaidInvoices.length}</TableCell>
                    <TableCell className="text-right text-xs">
                      AED {unpaidInvoices.reduce((s, i) => s + Number(i.total || 0), 0).toLocaleString()}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budget" className="space-y-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Budget vs Actual by Project</CardTitle></CardHeader>
            <CardContent>
              {budgetData.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={budgetData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} width={120} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} formatter={(v: number) => `AED ${v.toLocaleString()}`} />
                    <Bar dataKey="budget" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Budget" />
                    <Bar dataKey="spent" fill="hsl(var(--warning))" radius={[0, 4, 4, 0]} name="Spent" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center py-12 gap-2">
                  <Calculator className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">No projects with budget data</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Expense Distribution</CardTitle></CardHeader>
            <CardContent className="flex flex-col items-center">
              {categoryPie.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={categoryPie} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                        {categoryPie.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} formatter={(v: number) => `AED ${v.toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-3 mt-2 justify-center">
                    {categoryPie.map((d, i) => (
                      <div key={d.name} className="flex items-center gap-1.5 text-[11px]">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: pieColors[i % pieColors.length] }} />
                        <span className="text-muted-foreground">{d.name}</span>
                        <span className="font-semibold">AED {d.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center py-12 gap-2">
                  <DollarSign className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">No expense data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
