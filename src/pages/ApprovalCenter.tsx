import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { CheckCircle, XCircle, Clock, UserMinus, CreditCard, ShoppingCart, FileText, Quote , AlertTriangle } from "lucide-react";
import { logAudit } from "@/lib/audit";

export default function ApprovalCenter() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [confirmAction, setConfirmAction] = useState<{ type: string; id: string; action: "approve" | "reject"; table: string } | null>(null);

  const { data: leaves = [] , isError: dataLoadError} = useQuery({
    queryKey: ["approval-leaves"],
    queryFn: async () => {
      const { data } = await supabase.from("leave_requests").select("*, employees(name)").eq("status", "pending").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["approval-expenses"],
    queryFn: async () => {
      const { data } = await supabase.from("expenses").select("*").eq("status", "pending").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ["approval-pos"],
    queryFn: async () => {
      const { data } = await supabase.from("purchase_orders").select("*").eq("status", "pending").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: requisitions = [] } = useQuery({
    queryKey: ["approval-requisitions"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("requisitions").select("*, employees(name)").eq("status", "pending").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: quotations = [] } = useQuery({
    queryKey: ["approval-quotations"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("quotations").select("*, clients(name)").in("status", ["draft", "sent"]).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ table, id, action }: { table: string; id: string; action: "approve" | "reject" }) => {
      const status = action === "approve" ? "approved" : "rejected";
      const updateData: Record<string, unknown> = {
        status,
        approved_by: user?.id ?? null,
        approved_at: new Date().toISOString(),
      };
      const { error } = await (supabase as any).from(table).update(updateData).eq("id", id);
      if (error) throw error;
      await logAudit(`${action === "approve" ? "Approved" : "Rejected"} ${table.replace(/_/g, " ")}`, `Record ID: ${id}`, table);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approval-leaves"] });
      qc.invalidateQueries({ queryKey: ["approval-expenses"] });
      qc.invalidateQueries({ queryKey: ["approval-pos"] });
      qc.invalidateQueries({ queryKey: ["approval-requisitions"] });
      qc.invalidateQueries({ queryKey: ["approval-quotations"] });
      qc.invalidateQueries({ queryKey: ["sidebar-badges"] });
      toast({ title: confirmAction?.action === "approve" ? "Approved" : "Rejected", description: "Record updated successfully." });
      setConfirmAction(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const totalPending = leaves.length + expenses.length + purchaseOrders.length + requisitions.length + quotations.length;

  const ApproveRejectButtons = ({ type, id, table }: { type: string; id: string; table: string }) => (
    <div className="flex gap-1 justify-end">
      <Button size="sm" className="h-7 text-xs gap-1 bg-success hover:bg-success/90"
        onClick={() => setConfirmAction({ type, id, action: "approve", table })}>
        <CheckCircle className="h-3 w-3" /> Approve
      </Button>
      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive border-destructive/30"
        onClick={() => setConfirmAction({ type, id, action: "reject", table })}>
        <XCircle className="h-3 w-3" /> Reject
      </Button>
    </div>
  );

  const EmptyState = ({ label }: { label: string }) => (
    <div className="flex flex-col items-center py-12 gap-2">
      <Clock className="h-8 w-8 text-muted-foreground/30" />
      <p className="text-sm text-muted-foreground">No pending {label}</p>
    </div>
  );

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Approval Center</h1>
          <p className="text-sm text-muted-foreground">
            {totalPending > 0 ? `${totalPending} item${totalPending > 1 ? "s" : ""} awaiting your review` : "All caught up!"}
          </p>
        </div>
        {totalPending > 0 && <Badge className="bg-warning text-warning-foreground text-xs">{totalPending} Pending</Badge>}
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
        {[
          { label: "Leave Requests", count: leaves.length, icon: UserMinus, color: "text-info" },
          { label: "Expenses", count: expenses.length, icon: CreditCard, color: "text-warning" },
          { label: "Purchase Orders", count: purchaseOrders.length, icon: ShoppingCart, color: "text-primary" },
          { label: "Requisitions", count: requisitions.length, icon: FileText, color: "text-emerald-600" },
          { label: "Quotations", count: quotations.length, icon: Quote, color: "text-purple-600" },
        ].map((s) => (
          <Card key={s.label} className="border shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg bg-secondary flex items-center justify-center ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{s.count}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="leaves">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="leaves" className="gap-1.5"><UserMinus className="h-3.5 w-3.5" />Leave ({leaves.length})</TabsTrigger>
          <TabsTrigger value="expenses" className="gap-1.5"><CreditCard className="h-3.5 w-3.5" />Expenses ({expenses.length})</TabsTrigger>
          <TabsTrigger value="pos" className="gap-1.5"><ShoppingCart className="h-3.5 w-3.5" />POs ({purchaseOrders.length})</TabsTrigger>
          <TabsTrigger value="requisitions" className="gap-1.5"><FileText className="h-3.5 w-3.5" />Requisitions ({requisitions.length})</TabsTrigger>
          <TabsTrigger value="quotations" className="gap-1.5"><Quote className="h-3.5 w-3.5" />Quotations ({quotations.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="leaves">
          <Card className="border shadow-sm"><CardContent className="p-0">
            {leaves.length > 0 ? (
              <Table><TableHeader><TableRow>
                <TableHead>Employee</TableHead><TableHead>Type</TableHead><TableHead>Dates</TableHead><TableHead>Days</TableHead><TableHead>Reason</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
                <TableBody>{leaves.map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium text-xs">{l.employees?.name || "—"}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{l.type}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(l.start_date), "dd MMM")} – {format(new Date(l.end_date), "dd MMM yyyy")}</TableCell>
                    <TableCell className="text-xs">{l.days}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">{l.reason || "—"}</TableCell>
                    <TableCell className="text-right"><ApproveRejectButtons type="Leave" id={l.id} table="leave_requests" /></TableCell>
                  </TableRow>
                ))}</TableBody></Table>
            ) : <EmptyState label="leave requests" />}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="expenses">
          <Card className="border shadow-sm"><CardContent className="p-0">
            {expenses.length > 0 ? (
              <Table><TableHeader><TableRow>
                <TableHead>Description</TableHead><TableHead>Category</TableHead><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
                <TableBody>{expenses.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs font-medium">{e.description || "—"}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{e.category || "—"}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{e.date ? format(new Date(e.date), "dd MMM yyyy") : "—"}</TableCell>
                    <TableCell className="text-xs font-semibold">AED {Number(e.amount).toLocaleString()}</TableCell>
                    <TableCell className="text-right"><ApproveRejectButtons type="Expense" id={e.id} table="expenses" /></TableCell>
                  </TableRow>
                ))}</TableBody></Table>
            ) : <EmptyState label="expenses" />}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="pos">
          <Card className="border shadow-sm"><CardContent className="p-0">
            {purchaseOrders.length > 0 ? (
              <Table><TableHeader><TableRow>
                <TableHead>PO No</TableHead><TableHead>Vendor</TableHead><TableHead>Date</TableHead><TableHead>Total</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
                <TableBody>{purchaseOrders.map((po: any) => (
                  <TableRow key={po.id}>
                    <TableCell className="text-xs font-medium">{po.po_no || "—"}</TableCell>
                    <TableCell className="text-xs">{po.vendor || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{po.date ? format(new Date(po.date), "dd MMM yyyy") : "—"}</TableCell>
                    <TableCell className="text-xs font-semibold">AED {Number(po.total || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right"><ApproveRejectButtons type="Purchase Order" id={po.id} table="purchase_orders" /></TableCell>
                  </TableRow>
                ))}</TableBody></Table>
            ) : <EmptyState label="purchase orders" />}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="requisitions">
          <Card className="border shadow-sm"><CardContent className="p-0">
            {requisitions.length > 0 ? (
              <Table><TableHeader><TableRow>
                <TableHead>Req No</TableHead><TableHead>Item / Title</TableHead><TableHead>Requested By</TableHead><TableHead>Qty</TableHead><TableHead>Est. Cost</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
                <TableBody>{requisitions.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs font-mono">{r.req_no || r.id?.slice(0, 8)}</TableCell>
                    <TableCell className="text-xs font-medium">{r.title || r.item_name || "—"}</TableCell>
                    <TableCell className="text-xs">{r.employees?.name || r.requested_by || "—"}</TableCell>
                    <TableCell className="text-xs">{r.quantity || "—"}</TableCell>
                    <TableCell className="text-xs font-semibold">{r.estimated_cost ? `AED ${Number(r.estimated_cost).toLocaleString()}` : "—"}</TableCell>
                    <TableCell className="text-right"><ApproveRejectButtons type="Requisition" id={r.id} table="requisitions" /></TableCell>
                  </TableRow>
                ))}</TableBody></Table>
            ) : <EmptyState label="requisitions" />}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="quotations">
          <Card className="border shadow-sm"><CardContent className="p-0">
            {quotations.length > 0 ? (
              <Table><TableHeader><TableRow>
                <TableHead>Quote No</TableHead><TableHead>Client</TableHead><TableHead>Date</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
                <TableBody>{quotations.map((q: any) => (
                  <TableRow key={q.id}>
                    <TableCell className="text-xs font-mono">{q.quote_no || q.id?.slice(0, 8)}</TableCell>
                    <TableCell className="text-xs font-medium">{q.clients?.name || q.client_name || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{q.date ? format(new Date(q.date), "dd MMM yyyy") : q.created_at ? format(new Date(q.created_at), "dd MMM yyyy") : "—"}</TableCell>
                    <TableCell className="text-xs font-semibold">{q.total ? `AED ${Number(q.total).toLocaleString()}` : "—"}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px] capitalize">{q.status}</Badge></TableCell>
                    <TableCell className="text-right"><ApproveRejectButtons type="Quotation" id={q.id} table="quotations" /></TableCell>
                  </TableRow>
                ))}</TableBody></Table>
            ) : <EmptyState label="quotations" />}
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={() => setConfirmAction(null)}
        title={`${confirmAction?.action === "approve" ? "Approve" : "Reject"} ${confirmAction?.type}?`}
        description={`Are you sure you want to ${confirmAction?.action} this ${confirmAction?.type?.toLowerCase()}? This action will be recorded in the audit log.`}
        onConfirm={() => { if (confirmAction) approveMutation.mutate({ table: confirmAction.table, id: confirmAction.id, action: confirmAction.action }); }}
        destructive={confirmAction?.action === "reject"}
      />
    </div>
  );
}
