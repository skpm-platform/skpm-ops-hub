import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Building } from "lucide-react";
import { toast } from "sonner";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";

export default function Facilities() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", location: "", emirate: "Dubai", type: "office", area_sqm: "", contract_type: "amc" });

  const { data = [], isLoading } = useQuery({
    queryKey: ["facilities"],
    queryFn: async () => { const { data } = await (supabase as any).from("facilities").select("*, clients(name)").order("created_at", { ascending: false }); return data || []; },
  });

  const save = useMutation({
    mutationFn: async () => { const { error } = await (supabase as any).from("facilities").insert({ ...form, area_sqm: parseFloat(form.area_sqm) || null }); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["facilities"] }); toast.success("Facility added"); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = data.filter((r: any) => r.name?.toLowerCase().includes(search.toLowerCase()));
  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><Building className="h-7 w-7 text-primary" /><h1 className="text-2xl font-bold">Facilities</h1></div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Facility</Button>
      </div>
      <Card><CardContent className="pt-6">
        <div className="mb-4 relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No facilities</p> : (
          <>
          <Table><TableHeader><TableRow>
            <SortableHeader label="Name" sortKey="name" direction={getSortDirection("name")} onToggle={toggleSort} />
            <SortableHeader label="Emirate" sortKey="emirate" direction={getSortDirection("emirate")} onToggle={toggleSort} />
            <SortableHeader label="Type" sortKey="type" direction={getSortDirection("type")} onToggle={toggleSort} />
            <SortableHeader label="Area (sqm)" sortKey="area_sqm" direction={getSortDirection("area_sqm")} onToggle={toggleSort} />
            <SortableHeader label="Contract" sortKey="contract_type" direction={getSortDirection("contract_type")} onToggle={toggleSort} />
            <SortableHeader label="Status" sortKey="status" direction={getSortDirection("status")} onToggle={toggleSort} />
          </TableRow></TableHeader>
            <TableBody>{pageData.map((r: any) => (
              <TableRow key={r.id}><TableCell className="font-medium">{r.name}</TableCell><TableCell>{r.emirate}</TableCell><TableCell><Badge variant="outline">{r.type}</Badge></TableCell><TableCell>{r.area_sqm}</TableCell><TableCell>{r.contract_type}</TableCell><TableCell><Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status}</Badge></TableCell></TableRow>
            ))}</TableBody></Table>
          <DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
          </>
        )}
      </CardContent></Card>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent>
        <DialogHeader><DialogTitle>Add Facility</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
          <div><Label>Location</Label><Input value={form.location} onChange={e => setForm({...form, location: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Emirate</Label><Select value={form.emirate} onValueChange={v => setForm({...form, emirate: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Abu Dhabi">Abu Dhabi</SelectItem><SelectItem value="Dubai">Dubai</SelectItem><SelectItem value="Sharjah">Sharjah</SelectItem></SelectContent></Select></div>
            <div><Label>Type</Label><Select value={form.type} onValueChange={v => setForm({...form, type: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="office">Office</SelectItem><SelectItem value="industrial">Industrial</SelectItem><SelectItem value="residential">Residential</SelectItem></SelectContent></Select></div>
          </div>
          <div><Label>Area (sqm)</Label><Input type="number" value={form.area_sqm} onChange={e => setForm({...form, area_sqm: e.target.value})} /></div>
          <Button className="w-full" onClick={() => save.mutate()} disabled={!form.name || save.isPending}>{save.isPending ? "Saving..." : "Add Facility"}</Button>
        </div>
      </DialogContent></Dialog>
    </div>
  );
}
