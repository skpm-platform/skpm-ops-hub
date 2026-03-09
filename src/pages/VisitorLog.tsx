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
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ComboboxSelect } from "@/components/ComboboxSelect";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ExportButton } from "@/components/ExportButton";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { Plus, Search, Contact, LogOut, UserCheck, UserX, Eye, Trash2, Loader2, LayoutGrid, List, Users, Car } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInMinutes } from "date-fns";

export default function VisitorLog() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [open, setOpen] = useState(false);
  const [viewItem, setViewItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", company: "", purpose: "", badge_no: "", vehicle_plate: "" });

  const { data = [], isLoading } = useQuery({
    queryKey: ["visitors"],
    queryFn: async () => { const { data } = await supabase.from("visitor_log").select("*").order("check_in", { ascending: false }); return data || []; },
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("visitor_log").insert(form);
      if (error) throw error;
      await logAudit("Checked in visitor", form.name, "visitors");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["visitors"] }); toast.success("Visitor checked in"); setOpen(false); setForm({ name: "", company: "", purpose: "", badge_no: "", vehicle_plate: "" }); },
    onError: (e: any) => toast.error(e.message),
  });

  const checkout = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("visitor_log").update({ check_out: new Date().toISOString() }).eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["visitors"] }); toast.success("Checked out"); },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("visitor_log").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["visitors"] }); toast.success("Deleted"); setDeleteId(null); },
  });

  const currentlyIn = data.filter((r: any) => !r.check_out);
  const todayVisitors = data.filter((r: any) => r.check_in && format(new Date(r.check_in), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")).length;
  const checkedOut = data.filter((r: any) => r.check_out).length;
  const withVehicles = data.filter((r: any) => r.vehicle_plate).length;

  const filtered = data.filter((r: any) => r.name?.toLowerCase().includes(search.toLowerCase()) || r.company?.toLowerCase().includes(search.toLowerCase()));
  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

  const getDuration = (r: any) => {
    if (!r.check_in) return "—";
    const end = r.check_out ? new Date(r.check_out) : new Date();
    const mins = differenceInMinutes(end, new Date(r.check_in));
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Contact className="h-5 w-5 text-primary" /></div>
          <div><h1 className="text-2xl font-bold">Visitor Log</h1><p className="text-sm text-muted-foreground">{data.length} records</p></div>
        </div>
        <div className="flex gap-2">
          <ExportButton data={data} filename="visitor-log" columns={[{ key: "name", label: "Name" }, { key: "company", label: "Company" }, { key: "purpose", label: "Purpose" }, { key: "check_in", label: "Check In" }, { key: "check_out", label: "Check Out" }]} />
          <Button size="sm" className="h-9" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Check In Visitor</Button>
        </div>
      </div>

      {/* Live On-Site Banner */}
      {currentlyIn.length > 0 && (
        <Card className="border-success/30 bg-success/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2"><UserCheck className="h-4 w-4 text-success" /><span className="text-sm font-semibold">{currentlyIn.length} Visitor{currentlyIn.length > 1 ? "s" : ""} Currently On-Site</span></div>
            <div className="flex flex-wrap gap-2">
              {currentlyIn.slice(0, 8).map((v: any) => (
                <div key={v.id} className="flex items-center gap-1.5 bg-background rounded-full px-3 py-1 text-xs border">
                  <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                  <span className="font-medium">{v.name}</span>
                  {v.company && <span className="text-muted-foreground">· {v.company}</span>}
                  <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] ml-1" onClick={() => checkout.mutate(v.id)}><LogOut className="h-3 w-3" /></Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Records</p><p className="text-2xl font-bold mt-1">{data.length}</p></div><Users className="h-5 w-5 text-muted-foreground" /></div></CardContent></Card>
        <Card className="hover:shadow-md transition-shadow"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase tracking-wider">Today</p><p className="text-2xl font-bold text-primary mt-1">{todayVisitors}</p></div><Contact className="h-5 w-5 text-primary" /></div></CardContent></Card>
        <Card className="hover:shadow-md transition-shadow"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase tracking-wider">On-Site</p><p className="text-2xl font-bold text-success mt-1">{currentlyIn.length}</p></div><UserCheck className="h-5 w-5 text-success" /></div></CardContent></Card>
        <Card className="hover:shadow-md transition-shadow"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase tracking-wider">With Vehicles</p><p className="text-2xl font-bold mt-1">{withVehicles}</p></div><Car className="h-5 w-5 text-muted-foreground" /></div></CardContent></Card>
      </div>

      <Card><CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search by name or company..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
          <div className="flex border rounded-md">
            <Button variant={viewMode === "table" ? "secondary" : "ghost"} size="icon" className="h-9 w-9 rounded-r-none" onClick={() => setViewMode("table")}><List className="h-4 w-4" /></Button>
            <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon" className="h-9 w-9 rounded-l-none" onClick={() => setViewMode("grid")}><LayoutGrid className="h-4 w-4" /></Button>
          </div>
        </div>
        {isLoading ? <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No visitors</p> : viewMode === "grid" ? (
          <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pageData.map((r: any) => (
              <Card key={r.id} className={`group hover:shadow-md transition-all hover:-translate-y-0.5 ${!r.check_out ? "border-success/30" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${!r.check_out ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                        {r.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">{r.name}</h3>
                        <p className="text-[10px] text-muted-foreground">{r.company || "No company"}</p>
                      </div>
                    </div>
                    {!r.check_out ? <Badge className="bg-success/15 text-success border-0 text-[10px]">On-Site</Badge> : <Badge variant="secondary" className="text-[10px]">Left</Badge>}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs mt-3">
                    <div><span className="text-muted-foreground">Purpose:</span> <span className="font-medium">{r.purpose || "—"}</span></div>
                    <div><span className="text-muted-foreground">Duration:</span> <span className="font-medium">{getDuration(r)}</span></div>
                    {r.badge_no && <div><span className="text-muted-foreground">Badge:</span> <span className="font-medium">{r.badge_no}</span></div>}
                    {r.vehicle_plate && <div><span className="text-muted-foreground">Vehicle:</span> <span className="font-medium">{r.vehicle_plate}</span></div>}
                  </div>
                  <div className="flex gap-1 mt-3 pt-2 border-t justify-between">
                    {!r.check_out ? (
                      <Button size="sm" variant="outline" onClick={() => checkout.mutate(r.id)} className="h-7 text-xs gap-1"><LogOut className="h-3 w-3" />Check Out</Button>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">Left at {format(new Date(r.check_out), "HH:mm")}</span>
                    )}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewItem(r)}><Eye className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteId(r.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-4"><DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} /></div>
          </>
        ) : (
          <>
          <Table><TableHeader><TableRow>
            <SortableHeader label="Name" sortKey="name" direction={getSortDirection("name")} onToggle={toggleSort} />
            <SortableHeader label="Company" sortKey="company" direction={getSortDirection("company")} onToggle={toggleSort} />
            <SortableHeader label="Purpose" sortKey="purpose" direction={getSortDirection("purpose")} onToggle={toggleSort} />
            <SortableHeader label="Badge" sortKey="badge_no" direction={getSortDirection("badge_no")} onToggle={toggleSort} />
            <SortableHeader label="Check In" sortKey="check_in" direction={getSortDirection("check_in")} onToggle={toggleSort} />
            <SortableHeader label="Duration" sortKey="check_out" direction={getSortDirection("check_out")} onToggle={toggleSort} />
            <SortableHeader label="Status" sortKey="check_out" direction={getSortDirection("check_out")} onToggle={toggleSort} />
            <SortableHeader label="" sortKey="" direction={null} onToggle={() => {}} className="w-28" />
          </TableRow></TableHeader>
            <TableBody>
              {pageData.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No visitors</TableCell></TableRow> : pageData.map((r: any) => (
                <TableRow key={r.id} className="group">
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.company || "—"}</TableCell>
                  <TableCell>{r.purpose || "—"}</TableCell>
                  <TableCell className="text-xs">{r.badge_no || "—"}</TableCell>
                  <TableCell className="text-xs">{r.check_in && format(new Date(r.check_in), "dd/MM HH:mm")}</TableCell>
                  <TableCell className="text-xs font-medium">{getDuration(r)}</TableCell>
                  <TableCell>
                    {!r.check_out ? (
                      <Button size="sm" variant="outline" onClick={() => checkout.mutate(r.id)} className="h-7 text-xs gap-1"><LogOut className="h-3 w-3" />Check Out</Button>
                    ) : (
                      <Badge className="bg-muted text-muted-foreground border-0 text-[10px]">Left · {format(new Date(r.check_out), "HH:mm")}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewItem(r)}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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

      <Dialog open={open} onOpenChange={setOpen}><DialogContent>
        <DialogHeader><DialogTitle>Check In Visitor</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Company</Label><Input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} /></div>
          <div><Label>Purpose</Label><ComboboxSelect value={form.purpose} onValueChange={v => setForm({ ...form, purpose: v })} options={["Meeting", "Delivery", "Interview", "Inspection", "Maintenance", "Site Visit"]} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Badge #</Label><Input value={form.badge_no} onChange={e => setForm({ ...form, badge_no: e.target.value })} /></div>
            <div><Label>Vehicle Plate</Label><Input value={form.vehicle_plate} onChange={e => setForm({ ...form, vehicle_plate: e.target.value })} /></div>
          </div>
          <Button className="w-full h-9" onClick={() => save.mutate()} disabled={!form.name || save.isPending}>{save.isPending ? "Checking in..." : "Check In"}</Button>
        </div>
      </DialogContent></Dialog>

      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}><DialogContent>
        <DialogHeader><DialogTitle>Visitor Details</DialogTitle></DialogHeader>
        {viewItem && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-muted-foreground">Name</p><p className="font-medium">{viewItem.name}</p></div>
              <div><p className="text-xs text-muted-foreground">Company</p><p>{viewItem.company || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Purpose</p><p>{viewItem.purpose || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Badge</p><p>{viewItem.badge_no || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Vehicle</p><p>{viewItem.vehicle_plate || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Duration</p><p className="font-medium">{getDuration(viewItem)}</p></div>
              <div><p className="text-xs text-muted-foreground">Check In</p><p>{viewItem.check_in ? format(new Date(viewItem.check_in), "dd MMM yyyy, HH:mm") : "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Check Out</p><p>{viewItem.check_out ? format(new Date(viewItem.check_out), "dd MMM yyyy, HH:mm") : "Still on-site"}</p></div>
            </div>
          </div>
        )}
      </DialogContent></Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} onConfirm={() => deleteId && remove.mutate(deleteId)} />
    </div>
  );
}
