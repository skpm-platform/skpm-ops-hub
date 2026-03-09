import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/use-profile";
import { logAudit } from "@/lib/audit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Plus, Search, Loader2, UserMinus, CheckCircle, XCircle, CalendarDays, Clock, TrendingUp, LayoutGrid, List, Eye, Ban } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { ExportButton } from "@/components/ExportButton";
import { ComboboxSelect } from "@/components/ComboboxSelect";
import { StatusFilter, buildStatuses } from "@/components/StatusFilter";
import { ConfirmDialog } from "@/components/ConfirmDialog";

const leaveTypeColors: Record<string, string> = {
  annual: "bg-primary/15 text-primary",
  sick: "bg-destructive/15 text-destructive",
  emergency: "bg-warning/15 text-warning",
  unpaid: "bg-muted text-muted-foreground",
  maternity: "bg-accent text-accent-foreground",
  paternity: "bg-accent text-accent-foreground",
  compassionate: "bg-secondary text-secondary-foreground",
};

// Count weekdays (Mon–Fri) between two dates inclusive
const countWeekdays = (startStr: string, endStr: string): number => {
  const s = new Date(startStr);
  const e = new Date(endStr);
  if (isNaN(s.getTime()) || isNaN(e.getTime()) || s > e) return 1;
  let count = 0;
  const cur = new Date(s);
  while (cur <= e) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return Math.max(1, count);
};

export default function LeaveManagement() {
  const { user } = useAuth();
  const { data: role } = useUserRole();
  const isManagerUp = role === "admin" || role === "manager";
  const isAdmin = role === "admin";
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [open, setOpen] = useState(false);
  const [viewItem, setViewItem] = useState<any>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: string; status: string } | null>(null);
  const [form, setForm] = useState({ type: "annual", start_date: "", end_date: "", days: 1, reason: "" });

  // Date range filter
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const currentYear = new Date().getFullYear();

  const { data: leaves = [], isLoading } = useQuery({
    queryKey: ["leave_requests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leave_requests").select("*, employees(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("leave_requests").insert({ ...form, days: Number(form.days) });
      if (error) throw error;
      await logAudit("Submitted leave request", `${form.type} — ${form.days} days`, "leave");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leave_requests"] }); setOpen(false); setForm({ type: "annual", start_date: "", end_date: "", days: 1, reason: "" }); toast.success("Leave request submitted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("leave_requests").update({ status, approved_by: user?.id }).eq("id", id);
      if (error) throw error;
      const leave = leaves.find((l: any) => l.id === id);
      await logAudit(`Leave ${status}`, `${leave?.employees?.name ?? "Unknown"} — ${leave?.type} (${leave?.days} days)`, "leave");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leave_requests"] });
      toast.success("Status updated");
      setConfirmAction(null);
      setViewItem((prev: any) => {
        if (!prev) return prev;
        const updated = leaves.find((l: any) => l.id === prev.id);
        return updated ? { ...prev, status: confirmAction?.status } : prev;
      });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const cancelLeave = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leave_requests").update({ status: "cancelled" }).eq("id", id);
      if (error) throw error;
      const leave = leaves.find((l: any) => l.id === id);
      await logAudit("Leave cancelled", `${leave?.employees?.name ?? "Unknown"} — ${leave?.type} (${leave?.days} days)`, "leave");
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["leave_requests"] });
      toast.success("Leave request cancelled");
      setViewItem((prev: any) => prev?.id === id ? { ...prev, status: "cancelled" } : prev);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const statusColor = (s: string) => {
    if (s === "approved") return "bg-success/15 text-success border-0";
    if (s === "rejected") return "bg-destructive/15 text-destructive border-0";
    if (s === "cancelled") return "bg-gray-100 text-gray-600 border-0 dark:bg-gray-800 dark:text-gray-400";
    return "bg-warning/15 text-warning border-0";
  };

  const statusCounts: Record<string, number> = {};
  leaves.forEach((l: any) => { statusCounts[l.status ?? "pending"] = (statusCounts[l.status ?? "pending"] || 0) + 1; });
  const statuses = buildStatuses(statusCounts, ["pending", "approved", "rejected", "cancelled"]);

  const filtered = leaves.filter((l: any) => {
    const matchSearch = l.type?.toLowerCase().includes(search.toLowerCase()) || l.reason?.toLowerCase().includes(search.toLowerCase()) || l.employees?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    const matchFrom = !filterFrom || (l.start_date && l.start_date >= filterFrom);
    const matchTo = !filterTo || (l.end_date && l.end_date <= filterTo);
    return matchSearch && matchStatus && matchFrom && matchTo;
  });
  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

  const pendingCount = leaves.filter((l: any) => l.status === "pending").length;
  const approvedCount = leaves.filter((l: any) => l.status === "approved").length;
  const rejectedCount = leaves.filter((l: any) => l.status === "rejected").length;
  const totalDays = leaves.filter((l: any) => l.status === "approved").reduce((s: number, l: any) => s + (l.days || 0), 0);

  // Annual leave used this year
  const annualUsedThisYear = leaves
    .filter((l: any) => l.status === "approved" && l.type === "annual" && l.start_date?.startsWith(String(currentYear)))
    .reduce((sum: number, l: any) => sum + (l.days || 0), 0);
  const annualAllowance = 30;
  const annualProgress = Math.min(100, Math.round((annualUsedThisYear / annualAllowance) * 100));

  // Leave type breakdown
  const typeCounts: Record<string, number> = {};
  leaves.filter((l: any) => l.status === "approved").forEach((l: any) => { typeCounts[l.type || "other"] = (typeCounts[l.type || "other"] || 0) + (l.days || 0); });
  const typeBreakdown = Object.entries(typeCounts).sort(([, a], [, b]) => b - a);

  // Auto-calculate days (weekdays) when dates change
  const handleDateChange = (field: "start_date" | "end_date", value: string) => {
    const newForm = { ...form, [field]: value };
    if (newForm.start_date && newForm.end_date) {
      const weekdays = countWeekdays(newForm.start_date, newForm.end_date);
      newForm.days = weekdays;
    }
    setForm(newForm);
  };

  // Per-employee annual leave for view dialog
  const getEmployeeAnnualUsed = (employeeId: string) => {
    return leaves
      .filter((l: any) => l.employee_id === employeeId && l.status === "approved" && l.type === "annual" && l.start_date?.startsWith(String(currentYear)))
      .reduce((sum: number, l: any) => sum + (l.days || 0), 0);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <UserMinus className="h-7 w-7 text-primary" />
          <div><h1 className="text-2xl font-bold">Leave Management</h1><p className="text-muted-foreground">Handle leave requests & approvals</p></div>
        </div>
        <div className="flex gap-2">
          <ExportButton data={filtered} filename="leave" columns={[{key:"employees.name",label:"Employee"},{key:"type",label:"Type"},{key:"start_date",label:"From"},{key:"end_date",label:"To"},{key:"days",label:"Days"},{key:"status",label:"Status"}]} />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" className="h-9"><Plus className="mr-2 h-4 w-4" />Request Leave</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Leave Request</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label>Leave Type</Label>
                  <ComboboxSelect value={form.type} onChange={v => setForm(f => ({ ...f, type: v }))} options={["annual","sick","emergency","unpaid","maternity","paternity","compassionate"]} placeholder="Select type" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => handleDateChange("start_date", e.target.value)} /></div>
                  <div className="space-y-2"><Label>End Date</Label><Input type="date" value={form.end_date} onChange={e => handleDateChange("end_date", e.target.value)} /></div>
                </div>
                {form.start_date && form.end_date && (
                  <p className="text-xs text-muted-foreground">📅 {form.days} working day{form.days !== 1 ? "s" : ""} (weekends excluded)</p>
                )}
                <div className="space-y-2"><Label>Days</Label><Input type="number" min={1} value={form.days} onChange={e => setForm(f => ({ ...f, days: Number(e.target.value) }))} /></div>
                <div className="space-y-2"><Label>Reason</Label><Textarea placeholder="Reason for leave..." value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} /></div>
                <Button className="w-full h-9" onClick={() => save.mutate()} disabled={save.isPending}>
                  {save.isPending && <Loader2 className="animate-spin mr-2 h-4 w-4" />} Submit Request
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Enhanced KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Total Requests</p>
                <p className="text-2xl font-bold">{leaves.length}</p>
              </div>
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Pending</p>
                <p className="text-2xl font-bold text-warning">{pendingCount}</p>
              </div>
              <Clock className="h-5 w-5 text-warning" />
            </div>
            {isManagerUp && pendingCount > 0 && <p className="text-[10px] text-warning mt-1">Action required</p>}
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Approved</p>
                <p className="text-2xl font-bold text-success">{approvedCount}</p>
              </div>
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            {leaves.length > 0 && <Progress value={(approvedCount / leaves.length) * 100} className="mt-2 h-1" />}
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Rejected</p>
                <p className="text-2xl font-bold text-destructive">{rejectedCount}</p>
              </div>
              <XCircle className="h-5 w-5 text-destructive" />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow col-span-2 lg:col-span-1">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase">Days Used (Approved)</p>
            <p className="text-2xl font-bold mt-1">{totalDays}</p>
            {typeBreakdown.length > 0 && (
              <div className="mt-2 space-y-1">
                {typeBreakdown.slice(0, 3).map(([type, days]) => (
                  <div key={type} className="flex items-center justify-between text-[10px]">
                    <span className="capitalize text-muted-foreground">{type}</span>
                    <span className="font-medium">{days}d</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        {/* Annual Leave Balance */}
        <Card className="hover:shadow-md transition-shadow col-span-2 lg:col-span-1">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase">Annual Leave {currentYear}</p>
            <p className="text-2xl font-bold mt-1">{annualUsedThisYear}<span className="text-sm text-muted-foreground font-normal">/{annualAllowance}d</span></p>
            <Progress value={annualProgress} className="mt-2 h-1.5" />
            <p className="text-[10px] text-muted-foreground mt-1">{Math.max(0, annualAllowance - annualUsedThisYear)}d remaining typical allowance</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals Banner for Managers */}
      {isManagerUp && pendingCount > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-warning" />
                <span className="text-sm font-semibold">{pendingCount} pending leave request{pendingCount > 1 ? "s" : ""} awaiting your approval</span>
              </div>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setStatusFilter("pending")}>Review Now</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Date Range Filter */}
      <Card><CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Filter by period:</span>
          <div className="flex items-center gap-2">
            <Label className="text-xs">From</Label>
            <Input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className="h-8 w-36 text-xs" />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs">To</Label>
            <Input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className="h-8 w-36 text-xs" />
          </div>
          {(filterFrom || filterTo) && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setFilterFrom(""); setFilterTo(""); }}>Clear</Button>
          )}
        </div>
      </CardContent></Card>

      <div className="flex flex-col sm:flex-row gap-3">
        <StatusFilter statuses={statuses} selected={statusFilter} onSelect={setStatusFilter} />
        <div className="flex items-center gap-2 ml-auto">
          <div className="relative max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9 h-9" placeholder="Search leaves..." value={search} onChange={e => setSearch(e.target.value)} /></div>
          <div className="flex border rounded-md">
            <Button variant={viewMode === "table" ? "secondary" : "ghost"} size="icon" className="h-9 w-9 rounded-r-none" onClick={() => setViewMode("table")}><List className="h-4 w-4" /></Button>
            <Button variant={viewMode === "cards" ? "secondary" : "ghost"} size="icon" className="h-9 w-9 rounded-l-none" onClick={() => setViewMode("cards")}><LayoutGrid className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No leave requests found</CardContent></Card>
      ) : viewMode === "cards" ? (
        <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {pageData.map((l: any) => (
            <Card key={l.id} className="group hover:shadow-md transition-all hover:-translate-y-0.5">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-sm">{l.employees?.name ?? "Unknown"}</h3>
                    <Badge variant="secondary" className={`mt-1 capitalize text-[10px] border-0 ${leaveTypeColors[l.type] || ""}`}>{l.type}</Badge>
                  </div>
                  <Badge variant="secondary" className={`${statusColor(l.status)} text-[10px]`}>{l.status}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div>
                    <span className="text-muted-foreground">From:</span>
                    <p className="font-medium">{l.start_date ? format(new Date(l.start_date), "dd MMM yyyy") : "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">To:</span>
                    <p className="font-medium">{l.end_date ? format(new Date(l.end_date), "dd MMM yyyy") : "—"}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{l.days} day{l.days !== 1 ? "s" : ""}</span>
                  {l.reason && <span className="text-muted-foreground truncate max-w-[120px]">{l.reason}</span>}
                </div>
                <div className="flex gap-1.5 mt-3 pt-3 border-t">
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 flex-1" onClick={() => setViewItem(l)}><Eye className="h-3 w-3" /> View</Button>
                  {l.status === "pending" && isManagerUp && (
                    <>
                      <Button size="sm" className="h-7 text-xs gap-1 flex-1" onClick={() => setConfirmAction({ id: l.id, status: "approved" })}><CheckCircle className="h-3 w-3" /> Approve</Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 flex-1 text-destructive" onClick={() => setConfirmAction({ id: l.id, status: "rejected" })}><XCircle className="h-3 w-3" /> Reject</Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-4"><DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} /></div>
        </>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader><TableRow>
              <SortableHeader label="Employee" sortKey="employees.name" direction={getSortDirection("employees.name")} onToggle={toggleSort} />
              <SortableHeader label="Type" sortKey="type" direction={getSortDirection("type")} onToggle={toggleSort} />
              <SortableHeader label="From" sortKey="start_date" direction={getSortDirection("start_date")} onToggle={toggleSort} />
              <SortableHeader label="To" sortKey="end_date" direction={getSortDirection("end_date")} onToggle={toggleSort} />
              <SortableHeader label="Days" sortKey="days" direction={getSortDirection("days")} onToggle={toggleSort} />
              <SortableHeader label="Status" sortKey="status" direction={getSortDirection("status")} onToggle={toggleSort} />
              <TableHead className="w-40">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {pageData.map((l: any) => (
                <TableRow key={l.id} className="group">
                  <TableCell className="font-medium">{l.employees?.name ?? "—"}</TableCell>
                  <TableCell><Badge variant="secondary" className={`capitalize border-0 text-[10px] ${leaveTypeColors[l.type] || ""}`}>{l.type}</Badge></TableCell>
                  <TableCell>{l.start_date ? format(new Date(l.start_date), "dd MMM yyyy") : "—"}</TableCell>
                  <TableCell>{l.end_date ? format(new Date(l.end_date), "dd MMM yyyy") : "—"}</TableCell>
                  <TableCell className="font-medium">{l.days}</TableCell>
                  <TableCell><Badge variant="secondary" className={statusColor(l.status)}>{l.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewItem(l)}><Eye className="h-3.5 w-3.5" /></Button>
                      {l.status === "pending" && isManagerUp ? (
                        <>
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setConfirmAction({ id: l.id, status: "approved" })}><CheckCircle className="h-3 w-3" /> Approve</Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive" onClick={() => setConfirmAction({ id: l.id, status: "rejected" })}><XCircle className="h-3 w-3" /> Reject</Button>
                        </>
                      ) : l.status === "pending" ? (
                        <span className="text-xs text-muted-foreground">Awaiting approval</span>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="p-4"><DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} /></div>
        </div>
      )}

      {/* View Dialog */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Leave Request Details</DialogTitle></DialogHeader>
          {viewItem && (() => {
            const empAnnualUsed = getEmployeeAnnualUsed(viewItem.employee_id);
            const remaining = annualAllowance - empAnnualUsed;
            return (
              <div className="space-y-4 text-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-base">{viewItem.employees?.name ?? "Unknown"}</p>
                    <Badge variant="secondary" className={`mt-1 capitalize text-xs border-0 ${leaveTypeColors[viewItem.type] || ""}`}>{viewItem.type}</Badge>
                  </div>
                  <Badge variant="secondary" className={`${statusColor(viewItem.status)} text-xs`}>{viewItem.status}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-muted-foreground text-xs">From</p><p className="font-medium">{viewItem.start_date ? format(new Date(viewItem.start_date), "dd MMM yyyy") : "—"}</p></div>
                  <div><p className="text-muted-foreground text-xs">To</p><p className="font-medium">{viewItem.end_date ? format(new Date(viewItem.end_date), "dd MMM yyyy") : "—"}</p></div>
                  <div><p className="text-muted-foreground text-xs">Duration</p><p className="font-medium">{viewItem.days} day{viewItem.days !== 1 ? "s" : ""}</p></div>
                  {viewItem.type === "annual" && (
                    <div>
                      <p className="text-muted-foreground text-xs">Annual Leave Balance ({currentYear})</p>
                      <p className="font-medium">{empAnnualUsed}/{annualAllowance}d used</p>
                      <p className={`text-xs ${remaining < 0 ? "text-red-600" : remaining <= 5 ? "text-amber-600" : "text-emerald-600"}`}>{remaining} days remaining</p>
                    </div>
                  )}
                </div>
                {viewItem.reason && (
                  <div><p className="text-muted-foreground text-xs mb-1">Reason</p><p className="bg-muted/50 rounded-md p-3">{viewItem.reason}</p></div>
                )}
                <div className="flex gap-2 pt-2">
                  {viewItem.status === "pending" && isManagerUp && (
                    <>
                      <Button size="sm" className="flex-1 h-8 gap-1" onClick={() => { setConfirmAction({ id: viewItem.id, status: "approved" }); }}>
                        <CheckCircle className="h-3.5 w-3.5" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 h-8 gap-1 text-destructive" onClick={() => { setConfirmAction({ id: viewItem.id, status: "rejected" }); }}>
                        <XCircle className="h-3.5 w-3.5" /> Reject
                      </Button>
                    </>
                  )}
                  {viewItem.status === "approved" && isAdmin && (
                    <Button size="sm" variant="outline" className="flex-1 h-8 gap-1 text-destructive border-destructive/30" onClick={() => cancelLeave.mutate(viewItem.id)} disabled={cancelLeave.isPending}>
                      <Ban className="h-3.5 w-3.5" />{cancelLeave.isPending ? "Cancelling..." : "Cancel Leave"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={() => setConfirmAction(null)}
        title={confirmAction?.status === "approved" ? "Approve Leave Request?" : "Reject Leave Request?"}
        description={confirmAction?.status === "approved" ? "This will approve the leave request and notify the employee." : "This will reject the leave request."}
        onConfirm={() => confirmAction && updateStatus.mutate(confirmAction)}
      />
    </div>
  );
}
