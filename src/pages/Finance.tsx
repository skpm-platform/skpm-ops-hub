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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Plus, TrendingUp, TrendingDown, DollarSign, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

export default function Finance() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ type: "income" as "income" | "expense", amount: "", category: "", description: "" });

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("transactions").select("*").order("date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addTransaction = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not logged in");
      const { error } = await supabase.from("transactions").insert({
        type: form.type,
        amount: parseFloat(form.amount),
        category: form.category,
        description: form.description,
        created_by: user.id,
      });
      if (error) throw error;
      await logAudit("Added transaction", `${form.type}: $${form.amount} - ${form.description}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      setDialogOpen(false);
      setForm({ type: "income", amount: "", category: "", description: "" });
      toast.success("Transaction added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalIncome = (transactions ?? []).filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = (transactions ?? []).filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);

  const chartData = Array.from({ length: 6 }, (_, i) => {
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

  const exportCSV = () => {
    if (!transactions?.length) { toast.error("No data to export"); return; }
    const header = "Date,Type,Amount,Category,Description\n";
    const rows = transactions.map(t => `${t.date},${t.type},${t.amount},"${t.category ?? ""}","${t.description ?? ""}"`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `transactions-${format(new Date(), "yyyy-MM-dd")}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Finance</h1>
          <p className="text-muted-foreground">Track income and expenses</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV} className="gap-2"><Download className="h-4 w-4" /> Export CSV</Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" /> Add Transaction</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Transaction</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v: "income" | "expense") => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Amount</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
                <div className="space-y-2"><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g., Service, Equipment" /></div>
                <div className="space-y-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <Button onClick={() => addTransaction.mutate()} className="w-full" disabled={!form.amount || !form.category || addTransaction.isPending}>
                  {addTransaction.isPending && <Loader2 className="animate-spin mr-2 h-4 w-4" />} Save
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-5"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Income</p><p className="text-2xl font-bold text-success">${totalIncome.toLocaleString()}</p></div><TrendingUp className="h-5 w-5 text-success" /></div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Expenses</p><p className="text-2xl font-bold text-destructive">${totalExpense.toLocaleString()}</p></div><TrendingDown className="h-5 w-5 text-destructive" /></div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Net Balance</p><p className="text-2xl font-bold">${(totalIncome - totalExpense).toLocaleString()}</p></div><DollarSign className="h-5 w-5 text-primary" /></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Cash Flow</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
              <Area type="monotone" dataKey="income" stroke="hsl(var(--success))" fill="hsl(var(--success))" fillOpacity={0.1} />
              <Area type="monotone" dataKey="expense" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.1} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent Transactions</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(transactions ?? []).length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No transactions yet.</TableCell></TableRow>
                ) : (
                  (transactions ?? []).map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>{format(new Date(t.date), "dd MMM")}</TableCell>
                      <TableCell className="font-medium">{t.description ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{t.category ?? "—"}</TableCell>
                      <TableCell><Badge variant="secondary" className={`border-0 ${t.type === "income" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>{t.type}</Badge></TableCell>
                      <TableCell className={`text-right font-medium ${t.type === "income" ? "text-success" : "text-destructive"}`}>{t.type === "income" ? "+" : "-"}${Number(t.amount).toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
