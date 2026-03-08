import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Plus, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Transaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  description: string;
  date: Date;
}

const initialTransactions: Transaction[] = [
  { id: "1", type: "income", amount: 5000, category: "Service", description: "AC Maintenance - Building A", date: new Date() },
  { id: "2", type: "expense", amount: 1200, category: "Equipment", description: "Replacement parts", date: new Date(Date.now() - 86400000) },
  { id: "3", type: "income", amount: 3500, category: "Service", description: "Electrical repair", date: new Date(Date.now() - 86400000 * 2) },
  { id: "4", type: "expense", amount: 800, category: "Supplies", description: "Monthly supplies", date: new Date(Date.now() - 86400000 * 3) },
];

const chartData = [
  { name: "Jan", income: 18000, expense: 12000 },
  { name: "Feb", income: 20000, expense: 14000 },
  { name: "Mar", income: 22000, expense: 13000 },
  { name: "Apr", income: 19000, expense: 15000 },
  { name: "May", income: 24500, expense: 16000 },
];

export default function Finance() {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ type: "income" as "income" | "expense", amount: "", category: "", description: "" });

  const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  const handleAdd = () => {
    if (!form.amount || !form.category) { toast.error("Fill required fields"); return; }
    setTransactions([{ ...form, id: Date.now().toString(), amount: parseFloat(form.amount), date: new Date() }, ...transactions]);
    setDialogOpen(false);
    setForm({ type: "income", amount: "", category: "", description: "" });
    toast.success("Transaction added");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Finance</h1>
          <p className="text-muted-foreground">Track income and expenses</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-1 h-4 w-4" /> Add Transaction</Button>
          </DialogTrigger>
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
              <div className="space-y-2"><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
              <div className="space-y-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <Button onClick={handleAdd} className="w-full">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">Total Income</p><p className="text-2xl font-bold text-success">${totalIncome.toLocaleString()}</p></div>
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">Total Expenses</p><p className="text-2xl font-bold text-destructive">${totalExpense.toLocaleString()}</p></div>
              <TrendingDown className="h-5 w-5 text-destructive" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">Net Balance</p><p className="text-2xl font-bold">${(totalIncome - totalExpense).toLocaleString()}</p></div>
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Cash Flow</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} />
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
              {transactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{format(t.date, "dd MMM")}</TableCell>
                  <TableCell className="font-medium">{t.description}</TableCell>
                  <TableCell className="text-muted-foreground">{t.category}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={`border-0 ${t.type === "income" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>{t.type}</Badge>
                  </TableCell>
                  <TableCell className={`text-right font-medium ${t.type === "income" ? "text-success" : "text-destructive"}`}>
                    {t.type === "income" ? "+" : "-"}${t.amount.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
