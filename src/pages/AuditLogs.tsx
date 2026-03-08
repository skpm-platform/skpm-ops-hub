import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { ExportButton } from "@/components/ExportButton";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { Search, ClipboardList, Loader2, Shield, Activity } from "lucide-react";
import { format } from "date-fns";

export default function AuditLogs() {
  const [search, setSearch] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => { const { data } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(500); return data || []; },
  });

  const todayLogs = data.filter((r: any) => format(new Date(r.created_at), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")).length;
  const uniqueActions = new Set(data.map((r: any) => r.action)).size;

  const filtered = data.filter((r: any) => JSON.stringify(r).toLowerCase().includes(search.toLowerCase()));
  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3"><ClipboardList className="h-7 w-7 text-primary" /><h1 className="text-2xl font-bold">Audit Logs</h1></div>
        <ExportButton data={data} filename="audit-logs" columns={[{ key: "created_at", label: "Date" }, { key: "action", label: "Action" }, { key: "module", label: "Module" }, { key: "details", label: "Details" }]} />
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Logs</p><p className="text-2xl font-semibold mt-1">{data.length}</p></CardContent></Card>
        <Card><CardContent className="p-4 flex items-start justify-between"><div><p className="text-xs text-muted-foreground uppercase tracking-wider">Today's Activity</p><p className="text-2xl font-semibold mt-1 text-primary">{todayLogs}</p></div><Activity className="h-5 w-5 text-primary" /></CardContent></Card>
        <Card><CardContent className="p-4 flex items-start justify-between"><div><p className="text-xs text-muted-foreground uppercase tracking-wider">Unique Actions</p><p className="text-2xl font-semibold mt-1">{uniqueActions}</p></div><Shield className="h-5 w-5 text-muted-foreground" /></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Latest</p><p className="text-sm font-medium mt-1 truncate">{data[0]?.action || "—"}</p></CardContent></Card>
      </div>

      <Card><CardContent className="pt-6">
        <div className="mb-4 relative max-w-sm"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search logs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        {isLoading ? <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
          <>
            <Table><TableHeader><TableRow>
              <SortableHeader label="Date/Time" sortKey="created_at" direction={getSortDirection("created_at")} onToggle={toggleSort} />
              <SortableHeader label="Action" sortKey="action" direction={getSortDirection("action")} onToggle={toggleSort} />
              <SortableHeader label="Module" sortKey="module" direction={getSortDirection("module")} onToggle={toggleSort} />
              <SortableHeader label="Details" sortKey="details" direction={getSortDirection("details")} onToggle={toggleSort} />
            </TableRow></TableHeader>
              <TableBody>
                {pageData.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No audit logs</TableCell></TableRow> : pageData.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs whitespace-nowrap">{format(new Date(r.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                    <TableCell className="font-medium">{r.action}</TableCell>
                    <TableCell>{r.module ? <Badge variant="outline" className="text-[10px]">{r.module}</Badge> : "—"}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">{r.details || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
          </>
        )}
      </CardContent></Card>
    </div>
  );
}
