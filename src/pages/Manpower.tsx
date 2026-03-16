import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Plus, Search, HardHat, Pencil, Trash2, Eye, AlertTriangle,
  CheckCircle2, Clock, LayoutGrid, List, TrendingUp, Users,
  FileText, Download,
} from "lucide-react";
import { toast } from "sonner";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { ComboboxSelect } from "@/components/ComboboxSelect";
import { StatusFilter } from "@/components/StatusFilter";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ExportButton } from "@/components/ExportButton";
import { BulkActions, useBulkSelect } from "@/components/BulkActions";
import { PhotoUpload } from "@/components/PhotoUpload";
import { format, differenceInDays } from "date-fns";
import * as XLSX from "xlsx";

const tradeOptions = [
  { value: "electrician", label: "Electrician" },
  { value: "plumber", label: "Plumber" },
  { value: "carpenter", label: "Carpenter" },
  { value: "welder", label: "Welder" },
  { value: "helper", label: "Helper" },
  { value: "driver", label: "Driver" },
  { value: "mason", label: "Mason" },
  { value: "painter", label: "Painter" },
  { value: "hvac", label: "HVAC Technician" },
  { value: "scaffolder", label: "Scaffolder" },
  { value: "rigger", label: "Rigger" },
  { value: "insulator", label: "Insulator" },
  { value: "supervisor", label: "Supervisor" },
  { value: "foreman", label: "Foreman" },
];
const nationalityOptions = [
  { value: "Indian", label: "Indian" },
  { value: "Pakistani", label: "Pakistani" },
  { value: "Bangladeshi", label: "Bangladeshi" },
  { value: "Filipino", label: "Filipino" },
  { value: "Nepalese", label: "Nepalese" },
  { value: "Sri Lankan", label: "Sri Lankan" },
  { value: "Egyptian", label: "Egyptian" },
  { value: "Indonesian", label: "Indonesian" },
  { value: "Ethiopian", label: "Ethiopian" },
];
const statusColors: Record<string, string> = {
  available: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  deployed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  on_leave: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  sick: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  terminated: "bg-muted text-muted-foreground",
};
const emptyForm = {
  name: "", trade: "electrician", nationality: "",
  visa_expiry: "", medical_expiry: "", safety_card_expiry: "",
  daily_rate: "", status: "available", photo_url: "",
};

// Returns days until expiry (negative = expired)
function daysUntil(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  return differenceInDays(new Date(dateStr), new Date());
}

function ExpiryBadge({ dateStr, label }: { dateStr?: string | null; label: string }) {
  const days = daysUntil(dateStr);
  if (days === null) return <span className="text-muted-foreground text-xs">—</span>;
  if (days < 0) return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge className="bg-destructive/15 text-destructive text-[10px] gap-1 cursor-default">
            <AlertTriangle className="h-2.5 w-2.5" /> EXPIRED
          </Badge>
        </TooltipTrigger>
        <TooltipContent>{label}: {format(new Date(dateStr!), "dd MMM yyyy")} ({Math.abs(days)}d ago)</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
  if (days <= 30) return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge className="bg-warning/15 text-warning text-[10px] gap-1 cursor-default">
            <Clock className="h-2.5 w-2.5" /> {days}d
          </Badge>
        </TooltipTrigger>
        <TooltipContent>{label}: {format(new Date(dateStr!), "dd MMM yyyy")} ({days} days left)</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
  if (days <= 90) return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge className="bg-amber-100 text-amber-700 text-[10px] cursor-default">{days}d</Badge>
        </TooltipTrigger>
        <TooltipContent>{label}: {format(new Date(dateStr!), "dd MMM yyyy")} ({days} days left)</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge className="bg-emerald-100 text-emerald-700 text-[10px] cursor-default">
            <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />{format(new Date(dateStr!), "dd MMM yy")}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>{label}: {format(new Date(dateStr!), "dd MMM yyyy")} ({days} days left)</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function Manpower() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: workers = [], isLoading } = useQuery({
    queryKey: ["workers"],
    queryFn: async () => {
      const { data } = await supabase.from("workers").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        daily_rate: parseFloat(form.daily_rate) || null,
        visa_expiry: form.visa_expiry || null,
        medical_expiry: form.medical_expiry || null,
        safety_card_expiry: form.safety_card_expiry || null,
        photo_url: form.photo_url || null,
      };
      if (editingId) {
        const { error } = await supabase.from("workers").update(payload).eq("id", editingId);
        if (error) throw error;
        await logAudit("Updated worker", form.name);
      } else {
        const { error } = await supabase.from("workers").insert({
          ...payload,
          worker_id: `WKR-${Date.now().toString().slice(-6)}`,
        });
        if (error) throw error;
        await logAudit("Added worker", form.name);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workers"] });
      toast.success(editingId ? "Worker updated" : "Worker added");
      setOpen(false);
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const worker = workers.find((w: any) => w.id === id);
      const { error } = await supabase.from("workers").delete().eq("id", id);
      if (error) throw error;
      await logAudit("Deleted worker", worker?.name || id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workers"] });
      toast.success("Worker deleted");
      setDeleteId(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("workers").update({ status }).eq("id", id);
      if (error) throw error;
      await logAudit("Updated worker status", status);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workers"] });
      toast.success("Status updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleEdit = (r: any) => {
    setEditingId(r.id);
    setForm({
      name: r.name || "",
      trade: r.trade || "electrician",
      nationality: r.nationality || "",
      visa_expiry: r.visa_expiry || "",
      medical_expiry: r.medical_expiry || "",
      safety_card_expiry: r.safety_card_expiry || "",
      daily_rate: r.daily_rate ? String(r.daily_rate) : "",
      status: r.status || "available",
      photo_url: r.photo_url || "",
    });
    setOpen(true);
  };

  const filtered = workers.filter((r: any) => {
    const matchSearch =
      r.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.trade?.toLowerCase().includes(search.toLowerCase()) ||
      r.worker_id?.toLowerCase().includes(search.toLowerCase()) ||
      r.nationality?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statuses = [
    { value: "all", label: "All", count: workers.length },
    { value: "available", label: "Available", count: workers.filter((r: any) => r.status === "available").length },
    { value: "deployed", label: "Deployed", count: workers.filter((r: any) => r.status === "deployed").length },
    { value: "on_leave", label: "On Leave", count: workers.filter((r: any) => r.status === "on_leave").length },
    { value: "sick", label: "Sick", count: workers.filter((r: any) => r.status === "sick").length },
  ];

  const visaExpired = workers.filter((r: any) => r.visa_expiry && daysUntil(r.visa_expiry) !== null && daysUntil(r.visa_expiry)! < 0).length;
  const visaExpiring = workers.filter((r: any) => r.visa_expiry && daysUntil(r.visa_expiry) !== null && daysUntil(r.visa_expiry)! >= 0 && daysUntil(r.visa_expiry)! <= 30).length;
  const medExpired = workers.filter((r: any) => r.medical_expiry && daysUntil(r.medical_expiry) !== null && daysUntil(r.medical_expiry)! < 0).length;
  const safetyExpired = workers.filter((r: any) => r.safety_card_expiry && daysUntil(r.safety_card_expiry) !== null && daysUntil(r.safety_card_expiry)! < 0).length;

  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);
  const { selectedIds: selected, toggle: toggleOne, selectAll, clearSelection, allSelected: isAllSelected, isSelected } = useBulkSelect(pageData.map((r: any) => ({ id: r.id })));
  const isSomeSelected = selected.length > 0 && !isAllSelected;
  const toggleAll = (checked: boolean) => selectAll(checked);

  const bulkUpdateStatus = async (status: string) => {
    try {
      const ids = Array.from(selected) as string[];
      const { error } = await supabase.from("workers").update({ status }).in("id", ids);
      if (error) throw error;
      await logAudit("Bulk status update", `${ids.length} workers → ${status}`);
      qc.invalidateQueries({ queryKey: ["workers"] });
      clearSelection();
      toast.success(`${ids.length} workers updated to ${status}`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const bulkDelete = async () => {
    try {
      const ids = Array.from(selected) as string[];
      const { error } = await supabase.from("workers").delete().in("id", ids);
      if (error) throw error;
      await logAudit("Bulk deleted workers", `${ids.length} workers`);
      qc.invalidateQueries({ queryKey: ["workers"] });
      clearSelection();
      setBulkDeleteOpen(false);
      toast.success(`${ids.length} workers deleted`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const exportDetailed = () => {
    const rows = filtered.map((r: any) => ({
      "Worker ID": r.worker_id,
      "Name": r.name,
      "Trade": r.trade,
      "Nationality": r.nationality,
      "Status": r.status,
      "Daily Rate (AED)": r.daily_rate || "",
      "Visa Expiry": r.visa_expiry || "",
      "Medical Expiry": r.medical_expiry || "",
      "Safety Card Expiry": r.safety_card_expiry || "",
      "Visa Status": r.visa_expiry ? (daysUntil(r.visa_expiry)! < 0 ? "EXPIRED" : daysUntil(r.visa_expiry)! <= 30 ? "EXPIRING SOON" : "VALID") : "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Workers");
    XLSX.writeFile(wb, `Workers-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast.success("Workers report exported");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <HardHat className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Manpower</h1>
            <p className="text-sm text-muted-foreground">{workers.length} workers registered</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-9 gap-2" onClick={exportDetailed}>
            <Download className="h-3.5 w-3.5" /> Export Report
          </Button>
          <Button size="sm" className="h-9" onClick={() => { setEditingId(null); setForm(emptyForm); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />Add Worker
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Workers</p>
              <p className="text-2xl font-bold">{workers.length}</p>
            </div>
            <Users className="h-8 w-8 text-muted-foreground/20" />
          </div>
          <Progress value={100} className="h-1 mt-2" />
        </CardContent></Card>

        <Card><CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Available</p>
              <p className="text-2xl font-bold text-success">{workers.filter((r: any) => r.status === "available").length}</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-success/20" />
          </div>
          <Progress value={workers.length > 0 ? (workers.filter((r: any) => r.status === "available").length / workers.length) * 100 : 0} className="h-1 mt-2" />
        </CardContent></Card>

        <Card><CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Deployed</p>
              <p className="text-2xl font-bold text-blue-600">{workers.filter((r: any) => r.status === "deployed").length}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-300/40" />
          </div>
          <Progress value={workers.length > 0 ? (workers.filter((r: any) => r.status === "deployed").length / workers.length) * 100 : 0} className="h-1 mt-2" />
        </CardContent></Card>

        <Card className={visaExpired > 0 ? "border-destructive/30 bg-destructive/5" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Doc Issues</p>
                <p className={`text-2xl font-bold ${visaExpired + medExpired + safetyExpired > 0 ? "text-destructive" : "text-success"}`}>
                  {visaExpired + medExpired + safetyExpired}
                </p>
              </div>
              <AlertTriangle className={`h-8 w-8 ${visaExpired + medExpired + safetyExpired > 0 ? "text-destructive/30" : "text-success/20"}`} />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {visaExpired > 0 && `${visaExpired} visa expired · `}
              {visaExpiring > 0 && `${visaExpiring} visa expiring · `}
              {medExpired > 0 && `${medExpired} medical expired · `}
              {safetyExpired > 0 && `${safetyExpired} safety expired`}
              {visaExpired + medExpired + safetyExpired === 0 && "All docs OK"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name, trade, nationality, ID..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="flex border rounded-lg overflow-hidden h-9">
              <Button variant={viewMode === "table" ? "secondary" : "ghost"} size="sm" className="rounded-none h-full px-2.5" onClick={() => setViewMode("table")}><List className="h-4 w-4" /></Button>
              <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="sm" className="rounded-none h-full px-2.5" onClick={() => setViewMode("grid")}><LayoutGrid className="h-4 w-4" /></Button>
            </div>
            <StatusFilter statuses={statuses} selected={statusFilter} onSelect={setStatusFilter} />
          </div>

          {selected.size > 0 && (
            <div className="mb-3 flex items-center gap-2 p-2 rounded-md bg-primary/5 border border-primary/20">
              <span className="text-sm font-medium">{selected.size} selected</span>
              <Select onValueChange={bulkUpdateStatus}>
                <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Change status..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">→ Available</SelectItem>
                  <SelectItem value="deployed">→ Deployed</SelectItem>
                  <SelectItem value="on_leave">→ On Leave</SelectItem>
                  <SelectItem value="sick">→ Sick</SelectItem>
                  <SelectItem value="terminated">→ Terminated</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="destructive" size="sm" className="h-8 ml-auto" onClick={() => setBulkDeleteOpen(true)}>Delete Selected</Button>
              <Button variant="ghost" size="sm" className="h-8" onClick={clearSelection}>Clear</Button>
            </div>
          )}

          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No workers found</p>
          ) : viewMode === "table" ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox checked={isAllSelected} onCheckedChange={v => v ? toggleAll() : clearSelection()} />
                      </TableHead>
                      <SortableHeader label="ID" sortKey="worker_id" direction={getSortDirection("worker_id")} onToggle={toggleSort} />
                      <SortableHeader label="Name" sortKey="name" direction={getSortDirection("name")} onToggle={toggleSort} />
                      <SortableHeader label="Trade" sortKey="trade" direction={getSortDirection("trade")} onToggle={toggleSort} />
                      <SortableHeader label="Nationality" sortKey="nationality" direction={getSortDirection("nationality")} onToggle={toggleSort} />
                      <SortableHeader label="Status" sortKey="status" direction={getSortDirection("status")} onToggle={toggleSort} />
                      <TableHead className="text-xs">Visa</TableHead>
                      <TableHead className="text-xs">Medical</TableHead>
                      <TableHead className="text-xs">Safety</TableHead>
                      <SortableHeader label="Rate/Day" sortKey="daily_rate" direction={getSortDirection("daily_rate")} onToggle={toggleSort} />
                      <TableHead className="w-28">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageData.map((r: any) => (
                      <TableRow key={r.id} className={selected.has(r.id) ? "bg-primary/5" : ""}>
                        <TableCell>
                          <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleOne(r.id)} />
                        </TableCell>
                        <TableCell className="text-xs font-mono">{r.worker_id}</TableCell>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell className="capitalize">{r.trade}</TableCell>
                        <TableCell>{r.nationality || "—"}</TableCell>
                        <TableCell>
                          <Select value={r.status || "available"} onValueChange={v => updateStatus.mutate({ id: r.id, status: v })}>
                            <SelectTrigger className={`h-7 text-xs border-0 p-1 w-28 ${statusColors[r.status] || ""}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="available">Available</SelectItem>
                              <SelectItem value="deployed">Deployed</SelectItem>
                              <SelectItem value="on_leave">On Leave</SelectItem>
                              <SelectItem value="sick">Sick</SelectItem>
                              <SelectItem value="terminated">Terminated</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell><ExpiryBadge dateStr={r.visa_expiry} label="Visa" /></TableCell>
                        <TableCell><ExpiryBadge dateStr={r.medical_expiry} label="Medical" /></TableCell>
                        <TableCell><ExpiryBadge dateStr={r.safety_card_expiry} label="Safety Card" /></TableCell>
                        <TableCell className="text-sm">{r.daily_rate ? `AED ${Number(r.daily_rate).toLocaleString()}` : "—"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setViewing(r); setViewOpen(true); }}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(r)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(r.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
            </>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pageData.map((r: any) => (
                <Card key={r.id} className="hover:shadow-md transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold">{r.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{r.trade} · {r.nationality || "—"}</p>
                      </div>
                      <Badge className={`${statusColors[r.status] || ""} text-[10px]`}>{r.status}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div className="flex justify-between">
                        <span>Worker ID</span>
                        <span className="font-mono">{r.worker_id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Daily Rate</span>
                        <span>{r.daily_rate ? `AED ${Number(r.daily_rate).toLocaleString()}` : "—"}</span>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-1">
                      <ExpiryBadge dateStr={r.visa_expiry} label="Visa" />
                      <ExpiryBadge dateStr={r.medical_expiry} label="Medical" />
                      <ExpiryBadge dateStr={r.safety_card_expiry} label="Safety" />
                    </div>
                    <div className="flex gap-1 mt-3">
                      <Button variant="ghost" size="sm" className="h-7 flex-1 text-xs" onClick={() => { setViewing(r); setViewOpen(true); }}>
                        <Eye className="h-3 w-3 mr-1" /> View
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 flex-1 text-xs" onClick={() => handleEdit(r)}>
                        <Pencil className="h-3 w-3 mr-1" /> Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditingId(null); setForm(emptyForm); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Edit Worker" : "Add Worker"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <PhotoUpload value={form.photo_url} onChange={(url) => setForm({...form, photo_url: url || ""})} label="Worker Photo" size="md" folder="workers" />
            <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Full name" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Trade</Label><ComboboxSelect value={form.trade} onValueChange={v => setForm({ ...form, trade: v })} options={tradeOptions} placeholder="Select or type trade..." /></div>
              <div><Label>Nationality</Label><ComboboxSelect value={form.nationality} onValueChange={v => setForm({ ...form, nationality: v })} options={nationalityOptions} placeholder="Select or type..." /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="deployed">Deployed</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                    <SelectItem value="sick">Sick</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Daily Rate (AED)</Label><Input type="number" value={form.daily_rate} onChange={e => setForm({ ...form, daily_rate: e.target.value })} placeholder="0.00" /></div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Visa Expiry</Label>
                <Input type="date" value={form.visa_expiry} onChange={e => setForm({ ...form, visa_expiry: e.target.value })} />
                {form.visa_expiry && daysUntil(form.visa_expiry) !== null && (
                  <p className={`text-[10px] mt-0.5 ${daysUntil(form.visa_expiry)! < 0 ? "text-destructive" : daysUntil(form.visa_expiry)! <= 30 ? "text-warning" : "text-muted-foreground"}`}>
                    {daysUntil(form.visa_expiry)! < 0 ? `Expired ${Math.abs(daysUntil(form.visa_expiry)!)}d ago` : `${daysUntil(form.visa_expiry)} days left`}
                  </p>
                )}
              </div>
              <div>
                <Label className="text-xs">Medical Expiry</Label>
                <Input type="date" value={form.medical_expiry} onChange={e => setForm({ ...form, medical_expiry: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Safety Card</Label>
                <Input type="date" value={form.safety_card_expiry} onChange={e => setForm({ ...form, safety_card_expiry: e.target.value })} />
              </div>
            </div>
            <Button className="w-full" onClick={() => save.mutate()} disabled={!form.name || save.isPending}>
              {save.isPending ? "Saving..." : editingId ? "Update Worker" : "Add Worker"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Worker Profile</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 rounded-full border overflow-hidden bg-muted flex items-center justify-center shrink-0">
                  {viewing.photo_url ? <img src={viewing.photo_url} alt={viewing.name} className="w-full h-full object-cover" /> : <span className="text-2xl font-bold text-muted-foreground">{viewing.name?.[0]?.toUpperCase()}</span>}
                </div>
                <div className="flex-1">
                  <p className="text-lg font-semibold">{viewing.name}</p>
                  <p className="text-sm text-muted-foreground capitalize">{viewing.trade}</p>
                  <Badge className={statusColors[viewing.status] || ""}>{viewing.status}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Worker ID", viewing.worker_id],
                  ["Nationality", viewing.nationality || "—"],
                  ["Daily Rate", viewing.daily_rate ? `AED ${Number(viewing.daily_rate).toLocaleString()}` : "—"],
                  ["Added", viewing.created_at ? format(new Date(viewing.created_at), "dd MMM yyyy") : "—"],
                ].map(([l, v]) => (
                  <div key={l}><p className="text-muted-foreground text-xs">{l}</p><p className="font-medium">{v}</p></div>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Document Expiry</p>
                {[
                  { label: "Visa", date: viewing.visa_expiry },
                  { label: "Medical", date: viewing.medical_expiry },
                  { label: "Safety Card", date: viewing.safety_card_expiry },
                ].map(({ label, date }) => {
                  const days = daysUntil(date);
                  return (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-sm">{label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{date ? format(new Date(date), "dd MMM yyyy") : "—"}</span>
                        <ExpiryBadge dateStr={date} label={label} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => { setViewOpen(false); handleEdit(viewing); }}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                </Button>
                <Button size="sm" variant="destructive" className="flex-1" onClick={() => { setViewOpen(false); setDeleteId(viewing.id); }}>
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete Worker?" onConfirm={() => deleteId && remove.mutate(deleteId)} />
      <ConfirmDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen} title={`Delete ${selected.size} workers?`} onConfirm={bulkDelete} />
    </div>
  );
}
