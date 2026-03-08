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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ComboboxSelect } from "@/components/ComboboxSelect";
import { ExportButton } from "@/components/ExportButton";
import { StatusFilter } from "@/components/StatusFilter";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { Plus, TrendingUp, TrendingDown, DollarSign, Loader2, Search, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

const incomeCategories = ["Service Revenue", "Contract Payment", "Manpower Billing", "Consultation", "Other Income"];
const expenseCategories = ["Salaries", "Rent", "Equipment", "Transport", "Utilities", "Materials", "Other Expense"];

export default function Finance() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewItem, setViewItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [form, setForm] = useState({ type: "income", amount: "", category: "", description: "", date: format(new Date(), "yyyy-MM-dd") });

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => { const { data, error } = await supabase.from("transactions").select("*").order("date", { ascending: false }); if (error) throw error; return data ?? []; },
  });

  const addTransaction = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not logged in");
      const { error } = await supabase.from("transactions").insert({ type: form.type, amount: parseFloat(form.amount), category: form.category, description: form.description, date: form.date, created_by: user.id });
      if (error) throw error;
      await logAudit("Added transaction", `${form.type}: AED ${form.amount}`);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["transactions"] }); setDialogOpen(false); setForm({ type: "income", amount: "", category: "", description: "", date: format(new Date(), "yyyy-MM-dd") }); toast.success("Transaction added"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("transactions").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["transactions"] }); toast.success("Deleted"); setDeleteId(null); },
  });

  const totalIncome = transactions.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);

  const chartData = Array.from({ length: 6 }, (_, i) => {
    const month = subMonths(new Date(), 5 - i);
    const start = format(startOfMonth(month), "yyyy-MM-dd");
    const end = format(endOfMonth(month), "yyyy-MM-dd");
    const monthTx = transactions.filter(t => t.date >= start && t.date <= end);
    return { name: format(month, "MMM"), income: monthTx.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0), expense: monthTx.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0) };
  });

  const typeStatuses = [
    { value: "all", label: "All", count: transactions.length },
    { value: "income", label: "Income", count: transactions.filter(t => t.type === "income").length },
    { value: "expense", label: "Expense", count: transactions.filter(t => t.type === "expense").length },
  ];

  const filtered = transactions.filter(t => {
    const matchSearch = (t.description || "").toLowerCase().includes(search.toLowerCase()) || (t.category || "").toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || t.type === typeFilter;
    return matchSearch && matchType;
  });

  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold">Finance</h1><p className="text-muted-foreground">Track income and expenses</p></div>
        <div className="flex gap-2">
          <ExportButton data={transactions} filename="transactions" columns={[{ key: "date", label: "Date" }, { key: "type", label: "Type" }, { key: "amount", label: "Amount" }, { key: "category", label: "Category" }, { key: "description", label: "Description" }]} />
          <Button size="sm" className="h-9" onClick={() => setDialogOpen(true)}><Plus className="mr-1 h-4 w-4" />Add Transaction</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Income</p><p className="text-2xl font-semibold mt-1 text-success">AED {totalIncome.toLocaleString()}</p></div><TrendingUp className="h-5 w-5 text-success" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Expenses</p><p className="text-2xl font-semibold mt-1 text-destructive">AED {totalExpense.toLocaleString()}</p></div><TrendingDown className="h-5 w-5 text-destructive" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase tracking-wider">Net Balance</p><p className="text-2xl font-semibold mt-1">AED {(totalIncome - totalExpense).toLocaleString()}</p></div><DollarSign className="h-5 w-5 text-primary" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Transactions</p><p className="text-2xl font-semibold mt-1">{transactions.length}</p></CardContent></Card>
      </div>

      <Card><CardHeader><CardTitle className="text-base">Cash Flow (Last 6 Months)</CardTitle></CardHeader><CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="ig" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.15} /><stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} /></linearGradient>
              <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.1} /><stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} /></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px" }} />
            <Area type="monotone" dataKey="income" stroke="hsl(var(--success))" strokeWidth={2} fill="url(#ig)" name="Income" />
            <Area type="monotone" dataKey="expense" stroke="hsl(var(--destructive))" strokeWidth={2} fill="url(#eg)" name="Expense" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent></Card>

      <StatusFilter statuses={typeStatuses} selected={typeFilter} onSelect={setTypeFilter} />

      <Card><CardContent className="pt-6">
        <div className="mb-4 relative max-w-sm"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search transactions..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        {isLoading ? <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
          <>
            <Table><TableHeader><TableRow>
              <SortableHeader label="Date" sortKey="date" direction={getSortDirection("date")} onToggle={toggleSort} />
              <SortableHeader label="Description" sortKey="description" direction={getSortDirection("description")} onToggle={toggleSort} />
              <SortableHeader label="Category" sortKey="category" direction={getSortDirection("category")} onToggle={toggleSort} />
              <SortableHeader label="Type" sortKey="type" direction={getSortDirection("type")} onToggle={toggleSort} />
              <SortableHeader label="Amount" sortKey="amount" direction={getSortDirection("amount")} onToggle={toggleSort} className="text-right" />
              <SortableHeader label="" sortKey="" direction={null} onToggle={() => {}} className="w-20" />
            </TableRow></TableHeader>
              <TableBody>
                {pageData.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No transactions</TableCell></TableRow> : pageData.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell>{format(new Date(t.date), "dd MMM")}</TableCell>
                    <TableCell className="font-medium">{t.description ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{t.category ?? "—"}</TableCell>
                    <TableCell><Badge variant="secondary" className={`border-0 ${t.type === "income" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>{t.type}</Badge></TableCell>
                    <TableCell className={`text-right font-medium ${t.type === "income" ? "text-success" : "text-destructive"}`}>{t.type === "income" ? "+" : "-"}AED {Number(t.amount).toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewItem(t)}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
          </>
        )}
      </CardContent></Card>

      {/* Add Transaction Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent>
        <DialogHeader><DialogTitle>New Transaction</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div><Label>Type</Label><ComboboxSelect value={form.type} onValueChange={v => setForm({ ...form, type: v, category: "" })} options={["income", "expense"]} allowCustom={false} /></div>
          <div><Label>Amount (AED)</Label><Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
          <div><Label>Category</Label><ComboboxSelect value={form.category} onValueChange={v => setForm({ ...form, category: v })} options={form.type === "income" ? incomeCategories : expenseCategories} /></div>
          <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} /></div>
          <Button onClick={() => addTransaction.mutate()} className="w-full h-9" disabled={!form.amount || !form.category || addTransaction.isPending}>{addTransaction.isPending && <Loader2 className="animate-spin mr-2 h-4 w-4" />}Save</Button>
        </div>
      </DialogContent></Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}><DialogContent>
        <DialogHeader><DialogTitle>Transaction Details</DialogTitle></DialogHeader>
        {viewItem && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-xs text-muted-foreground">Type</p><Badge variant="secondary" className={`border-0 ${viewItem.type === "income" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>{viewItem.type}</Badge></div>
              <div><p className="text-xs text-muted-foreground">Amount</p><p className="font-semibold">AED {Number(viewItem.amount).toLocaleString()}</p></div>
              <div><p className="text-xs text-muted-foreground">Category</p><p className="text-sm">{viewItem.category}</p></div>
              <div><p className="text-xs text-muted-foreground">Date</p><p className="text-sm">{format(new Date(viewItem.date), "dd MMM yyyy")}</p></div>
            </div>
            {viewItem.description && <div><p className="text-xs text-muted-foreground">Description</p><p className="text-sm">{viewItem.description}</p></div>}
          </div>
        )}
      </DialogContent></Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} onConfirm={() => deleteId && remove.mutate(deleteId)} title="Delete Transaction?" />
    </div>
  );
}
