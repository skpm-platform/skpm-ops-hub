import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logAudit } from "@/lib/audit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import { ComboboxSelect } from "@/components/ComboboxSelect";
import { ExportButton } from "@/components/ExportButton";
import { StatusFilter } from "@/components/StatusFilter";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import {
  Plus, TrendingUp, TrendingDown, DollarSign, Loader2, Search,
  Trash2, Eye, Wallet, ArrowUpRight, ArrowDownRight, PieChartIcon, Pencil,
  AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

const incomeCategories = ["Service Revenue", "Contract Payment", "Manpower Billing", "Consultation", "Other Income"];
const expenseCategories = ["Salaries", "Rent", "Equipment", "Transport", "Utilities", "Materials", "Other Expense"];
const pieColors = ["hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--info))", "hsl(var(--destructive))", "hsl(var(--muted-foreground))", "hsl(var(--accent))"];

const emptyForm = { type: "income", amount: "", category: "", description: "", date: format(new Date(), "yyyy-MM-dd"), reference: "", receipt_url: "" };

export default function Finance() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewItem, setViewItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [form, setForm] = useState(emptyForm);

  const { data: transactions = [], isLoading , isError: dataLoadError} = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => { const { data, error } = await supabase.from("transactions").select("*").order("date", { ascending: false }); if (error) throw error; return data ?? []; },
  });

  const saveTransaction = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not logged in");
      const payload = {
        type: form.type,
        amount: parseFloat(form.amount),
        category: form.category,
        description: form.description,
        date: form.date,
        reference: form.reference || null,
        receipt_url: form.receipt_url || null,
      };
      if (editingId) {
        const { error } = await supabase.from("transactions").update(payload).eq("id", editingId);
        if (error) throw error;
        await logAudit("Updated transaction", `${form.type}: AED ${form.amount}`, "finance");
      } else {
        const { error } = await supabase.from("transactions").insert({ ...payload, created_by: user.id });
        if (error) throw error;
        await logAudit("Added transaction", `${form.type}: AED ${form.amount}`, "finance");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      toast.success(editingId ? "Transaction updated" : "Transaction added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("transactions").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["transactions"] }); toast.success("Deleted"); setDeleteId(null); },
  });

  const handleEdit = (t: any) => {
    setEditingId(t.id);
    setForm({
      type: t.type,
      amount: String(t.amount),
      category: t.category || "",
      description: t.description || "",
      date: t.date || format(new Date(), "yyyy-MM-dd"),
      reference: t.reference || "",
      receipt_url: t.receipt_url || "",
    });
    setDialogOpen(true);
  };

  const totalIncome = transactions.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const netProfit = totalIncome - totalExpense;
  const profitMargin = totalIncome > 0 ? Math.round((netProfit / totalIncome) * 100) : 0;

  // Monthly chart data
  const chartData = Array.from({ length: 6 }, (_, i) => {
    const month = subMonths(new Date(), 5 - i);
    const start = format(startOfMonth(month), "yyyy-MM-dd");
    const end = format(endOfMonth(month), "yyyy-MM-dd");
    const monthTx = transactions.filter(t => t.date >= start && t.date <= end);
    const income = monthTx.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const expense = monthTx.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
    return { name: format(month, "MMM"), income, expense, profit: income - expense };
  });

  // Category breakdown for pie chart
  const categoryBreakdown = transactions.reduce((acc, t) => {
    const cat = t.category || "Uncategorized";
    const key = `${t.type}:${cat}`;
    acc[key] = (acc[key] || 0) + Number(t.amount);
    return acc;
  }, {} as Record<string, number>);

  const expensePieData = Object.entries(categoryBreakdown)
    .filter(([k]) => k.startsWith("expense:"))
    .map(([k, v]) => ({ name: k.replace("expense:", ""), value: v }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 7);

  const incomePieData = Object.entries(categoryBreakdown)
    .filter(([k]) => k.startsWith("income:"))
    .map(([k, v]) => ({ name: k.replace("income:", ""), value: v }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 7);

  // Monthly comparison
  const currentMonthIncome = chartData[5]?.income || 0;
  const prevMonthIncome = chartData[4]?.income || 0;
  const incomeChange = prevMonthIncome > 0 ? Math.round(((currentMonthIncome - prevMonthIncome) / prevMonthIncome) * 100) : 0;
  const currentMonthExpense = chartData[5]?.expense || 0;
  const prevMonthExpense = chartData[4]?.expense || 0;
  const expenseChange = prevMonthExpense > 0 ? Math.round(((currentMonthExpense - prevMonthExpense) / prevMonthExpense) * 100) : 0;

  const typeStatuses = [
    { value: "all", label: "All", count: transactions.length },
    { value: "income", label: "Income", count: transactions.filter(t => t.type === "income").length },
    { value: "expense", label: "Expense", count: transactions.filter(t => t.type === "expense").length },
  ];

  // Available years from transactions
  const availableYears = Array.from(new Set(transactions.map(t => t.date?.substring(0, 4)))).filter(Boolean).sort().reverse();

  const filtered = transactions.filter(t => {
    const matchSearch = (t.description || "").toLowerCase().includes(search.toLowerCase()) || (t.category || "").toLowerCase().includes(search.toLowerCase()) || ((t as any).reference || "").toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || t.type === typeFilter;
    const matchMonth = filterMonth === "all" || (t.date && t.date.substring(5, 7) === filterMonth.padStart(2, "0"));
    const matchYear = filterYear === "all" || (t.date && t.date.substring(0, 4) === filterYear);
    return matchSearch && matchType && matchMonth && matchYear;
  });

  // Running balance (sorted by date ascending for calculation)
  const sortedForBalance = [...filtered].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const runningBalanceMap: Record<string, number> = {};
  let running = 0;
  sortedForBalance.forEach(t => {
    running += t.type === "income" ? Number(t.amount) : -Number(t.amount);
    runningBalanceMap[t.id] = running;
  });

  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
            <DollarSign className="h-5 w-5 text-success" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Finance</h1>
            <p className="text-sm text-muted-foreground">Track income, expenses & profitability</p>
          </div>
        </div>
        <div className="flex gap-2">
          <ExportButton data={transactions} filename="transactions" columns={[{ key: "date", label: "Date" }, { key: "type", label: "Type" }, { key: "amount", label: "Amount" }, { key: "category", label: "Category" }, { key: "description", label: "Description" }, { key: "reference", label: "Reference" }]} />
          <Button size="sm" className="h-9 gap-2" onClick={() => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); }}><Plus className="h-4 w-4" />Add Transaction</Button>
        </div>
      </div>

      {/* Enhanced KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Card className="group hover:shadow-md transition-all border hover:border-success/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Total Income</p>
                <p className="text-2xl font-bold text-success mt-1">AED {totalIncome.toLocaleString()}</p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-success/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ArrowUpRight className="h-4 w-4 text-success" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-[11px]">
              {incomeChange >= 0 ? <TrendingUp className="h-3 w-3 text-success" /> : <TrendingDown className="h-3 w-3 text-destructive" />}
              <span className={incomeChange >= 0 ? "text-success" : "text-destructive"}>{incomeChange >= 0 ? "+" : ""}{incomeChange}%</span>
              <span className="text-muted-foreground">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-md transition-all border hover:border-destructive/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Total Expenses</p>
                <p className="text-2xl font-bold text-destructive mt-1">AED {totalExpense.toLocaleString()}</p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ArrowDownRight className="h-4 w-4 text-destructive" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-[11px]">
              {expenseChange <= 0 ? <TrendingDown className="h-3 w-3 text-success" /> : <TrendingUp className="h-3 w-3 text-destructive" />}
              <span className={expenseChange <= 0 ? "text-success" : "text-destructive"}>{expenseChange >= 0 ? "+" : ""}{expenseChange}%</span>
              <span className="text-muted-foreground">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-md transition-all border hover:border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Net Profit</p>
                <p className={`text-2xl font-bold mt-1 ${netProfit >= 0 ? "text-success" : "text-destructive"}`}>AED {netProfit.toLocaleString()}</p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Wallet className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div className="mt-2">
              <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                <span>Profit Margin</span>
                <span className="font-medium">{profitMargin}%</span>
              </div>
              <Progress value={Math.max(0, profitMargin)} className="h-1.5" />
            </div>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-md transition-all border hover:border-info/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Transactions</p>
                <p className="text-2xl font-bold mt-1">{transactions.length}</p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-info/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <PieChartIcon className="h-4 w-4 text-info" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              {transactions.filter(t => t.type === "income").length} income • {transactions.filter(t => t.type === "expense").length} expenses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Cash Flow (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="ig" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.2} /><stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} /></linearGradient>
                  <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.15} /><stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} formatter={(v: number) => `AED ${v.toLocaleString()}`} />
                <Area type="monotone" dataKey="income" stroke="hsl(var(--success))" strokeWidth={2.5} fill="url(#ig)" name="Income" />
                <Area type="monotone" dataKey="expense" stroke="hsl(var(--destructive))" strokeWidth={2} fill="url(#eg)" name="Expense" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Expense Breakdown Pie */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Expense Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {expensePieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={expensePieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={2} dataKey="value">
                      {expensePieData.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px" }} formatter={(v: number) => `AED ${v.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 mt-2 justify-center">
                  {expensePieData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-[10px]">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: pieColors[i % pieColors.length] }} />
                      <span className="text-muted-foreground">{d.name}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center py-12 gap-2">
                <PieChartIcon className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">No expense data</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Profit Bar Chart */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Monthly Net Profit</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px" }} formatter={(v: number) => `AED ${v.toLocaleString()}`} />
              <Bar dataKey="profit" name="Net Profit" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.profit >= 0 ? "hsl(var(--success))" : "hsl(var(--destructive))"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <StatusFilter statuses={typeStatuses} selected={typeFilter} onSelect={setTypeFilter} />

      <Card><CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search transactions..." value={search} onChange={e => setSearch(e.target.value)} /></div>
          {/* Month/Year Filters */}
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Month" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => (
                <SelectItem key={i} value={String(i + 1).padStart(2, "0")}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger className="w-28 h-9"><SelectValue placeholder="Year" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {availableYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <Table><TableHeader><TableRow>
              <SortableHeader label="Date" sortKey="date" direction={getSortDirection("date")} onToggle={toggleSort} />
              <SortableHeader label="Description" sortKey="description" direction={getSortDirection("description")} onToggle={toggleSort} />
              <SortableHeader label="Category" sortKey="category" direction={getSortDirection("category")} onToggle={toggleSort} />
              <SortableHeader label="Reference" sortKey="reference" direction={getSortDirection("reference")} onToggle={toggleSort} />
              <SortableHeader label="Type" sortKey="type" direction={getSortDirection("type")} onToggle={toggleSort} />
              <SortableHeader label="Amount" sortKey="amount" direction={getSortDirection("amount")} onToggle={toggleSort} className="text-right" />
              <SortableHeader label="Running Balance" sortKey="" direction={null} onToggle={() => {}} className="text-right" />
              <SortableHeader label="" sortKey="" direction={null} onToggle={() => {}} className="w-24" />
            </TableRow></TableHeader>
              <TableBody>
                {pageData.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <DollarSign className="h-8 w-8 text-muted-foreground/30" />
                      <p className="text-muted-foreground">No transactions found</p>
                    </div>
                  </TableCell></TableRow>
                ) : pageData.map((t: any) => {
                  const bal = runningBalanceMap[t.id] ?? 0;
                  return (
                    <TableRow key={t.id} className="group hover:bg-secondary/30">
                      <TableCell className="text-muted-foreground">{format(new Date(t.date), "dd MMM yyyy")}</TableCell>
                      <TableCell className="font-medium">{t.description ?? "—"}</TableCell>
                      <TableCell><Badge variant="secondary" className="border-0 text-[10px]">{t.category ?? "—"}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{t.reference ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`border-0 ${t.type === "income" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
                          {t.type === "income" ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                          {t.type}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-semibold tabular-nums ${t.type === "income" ? "text-success" : "text-destructive"}`}>
                        {t.type === "income" ? "+" : "-"}AED {Number(t.amount).toLocaleString()}
                      </TableCell>
                      <TableCell className={`text-right tabular-nums text-xs font-medium ${bal >= 0 ? "text-success" : "text-destructive"}`}>
                        AED {bal.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewItem(t)}><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(t)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
          </>
        )}
      </CardContent></Card>

      {/* Add/Edit Transaction Dialog */}
      <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) { setEditingId(null); setForm(emptyForm); } }}><DialogContent>
        <DialogHeader><DialogTitle>{editingId ? "Edit Transaction" : "New Transaction"}</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label>Type</Label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              <Button variant={form.type === "income" ? "default" : "outline"} className={`h-9 gap-2 ${form.type === "income" ? "bg-success hover:bg-success/90" : ""}`} onClick={() => setForm({ ...form, type: "income", category: "" })}>
                <ArrowUpRight className="h-4 w-4" />Income
              </Button>
              <Button variant={form.type === "expense" ? "default" : "outline"} className={`h-9 gap-2 ${form.type === "expense" ? "bg-destructive hover:bg-destructive/90" : ""}`} onClick={() => setForm({ ...form, type: "expense", category: "" })}>
                <ArrowDownRight className="h-4 w-4" />Expense
              </Button>
            </div>
          </div>
          <div><Label>Amount (AED)</Label><Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" /></div>
          <div><Label>Category</Label><ComboboxSelect value={form.category} onValueChange={v => setForm({ ...form, category: v })} options={form.type === "income" ? incomeCategories : expenseCategories} /></div>
          <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
          <div><Label>Reference <span className="text-muted-foreground text-xs">(Invoice #, PO #, etc.)</span></Label><Input value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} placeholder="e.g. INV-001, PO-2024" /></div>
          <div><Label>Receipt URL <span className="text-muted-foreground text-xs">(link to document)</span></Label><Input value={form.receipt_url} onChange={e => setForm({ ...form, receipt_url: e.target.value })} placeholder="https://..." /></div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Optional notes..." /></div>
          <Button onClick={() => saveTransaction.mutate()} className="w-full h-9" disabled={!form.amount || !form.category || saveTransaction.isPending}>
            {saveTransaction.isPending && <Loader2 className="animate-spin mr-2 h-4 w-4" />}{editingId ? "Update Transaction" : "Save Transaction"}
          </Button>
        </div>
      </DialogContent></Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}><DialogContent>
        <DialogHeader><DialogTitle>Transaction Details</DialogTitle></DialogHeader>
        {viewItem && (
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <Badge variant="secondary" className={`border-0 ${viewItem.type === "income" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
                {viewItem.type === "income" ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                {viewItem.type}
              </Badge>
              <Badge variant="secondary" className="border-0">{viewItem.category}</Badge>
            </div>
            <div className="p-4 rounded-lg bg-secondary/50 text-center">
              <p className="text-xs text-muted-foreground mb-1">Amount</p>
              <p className={`text-3xl font-bold ${viewItem.type === "income" ? "text-success" : "text-destructive"}`}>
                {viewItem.type === "income" ? "+" : "-"}AED {Number(viewItem.amount).toLocaleString()}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-xs text-muted-foreground">Date</p><p className="text-sm font-medium">{format(new Date(viewItem.date), "dd MMM yyyy")}</p></div>
              <div><p className="text-xs text-muted-foreground">Category</p><p className="text-sm font-medium">{viewItem.category}</p></div>
              {viewItem.reference && <div><p className="text-xs text-muted-foreground">Reference</p><p className="text-sm font-medium">{viewItem.reference}</p></div>}
              {viewItem.receipt_url && <div><p className="text-xs text-muted-foreground">Receipt</p><a href={viewItem.receipt_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">View Document</a></div>}
            </div>
            {viewItem.description && <div><p className="text-xs text-muted-foreground">Description</p><p className="text-sm">{viewItem.description}</p></div>}
            <Button variant="outline" size="sm" className="w-full" onClick={() => { setViewItem(null); handleEdit(viewItem); }}><Pencil className="h-3.5 w-3.5 mr-2" />Edit Transaction</Button>
          </div>
        )}
      </DialogContent></Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} onConfirm={() => deleteId && remove.mutate(deleteId)} title="Delete Transaction?" />
    </div>
  );
}
