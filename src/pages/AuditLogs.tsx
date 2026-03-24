import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { ExportButton } from "@/components/ExportButton";
import { SortableHeader } from "@/components/SortableHeader";
import { Search, ClipboardList, Loader2, Shield, Activity, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";

const PAGE_SIZE = 50;

export default function AuditLogs() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<string>("created_at");
  const [sortAsc, setSortAsc] = useState(false);

  // Server-side paginated query
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["audit-logs", page, sortKey, sortAsc, search],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("*", { count: "exact" });

      // Server-side search filter
      if (search.trim()) {
        query = query.or(`action.ilike.%${search}%,details.ilike.%${search}%,module.ilike.%${search}%`);
      }

      query = query
        .order(sortKey, { ascending: sortAsc })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      const { data, count, error } = await query;
      if (error) throw error;
      return { rows: data || [], total: count || 0 };
    },
  });

  // Stats query (lightweight, separate from paginated data)
  const { data: stats } = useQuery({
    queryKey: ["audit-logs-stats"],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { count: todayCount } = await supabase
        .from("audit_logs")
        .select("*", { count: "exact", head: true })
        .gte("created_at", `${today}T00:00:00`);

      const { count: totalCount } = await supabase
        .from("audit_logs")
        .select("*", { count: "exact", head: true });

      return {
        today: todayCount || 0,
        total: totalCount || 0,
      };
    },
    staleTime: 30 * 1000,
  });

  const rows = data?.rows || [];
  const totalItems = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
    setPage(0);
  };

  const getSortDirection = (key: string) => {
    if (sortKey !== key) return undefined;
    return sortAsc ? ("asc" as const) : ("desc" as const);
  };

  // Error state
  if (isError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold">Audit Logs</h1>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground">Failed to load audit logs</p>
            <p className="text-xs text-destructive">{(error as Error)?.message || "Unknown error"}</p>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3"><ClipboardList className="h-7 w-7 text-primary" /><h1 className="text-2xl font-bold">Audit Logs</h1></div>
        <ExportButton data={rows} filename="audit-logs" columns={[{ key: "created_at", label: "Date" }, { key: "action", label: "Action" }, { key: "module", label: "Module" }, { key: "details", label: "Details" }]} />
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Logs</p><p className="text-2xl font-semibold mt-1">{(stats?.total || totalItems).toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4 flex items-start justify-between"><div><p className="text-xs text-muted-foreground uppercase tracking-wider">Today's Activity</p><p className="text-2xl font-semibold mt-1 text-primary">{stats?.today || 0}</p></div><Activity className="h-5 w-5 text-primary" /></CardContent></Card>
        <Card><CardContent className="p-4 flex items-start justify-between"><div><p className="text-xs text-muted-foreground uppercase tracking-wider">Page</p><p className="text-2xl font-semibold mt-1">{page + 1} / {totalPages}</p></div><Shield className="h-5 w-5 text-muted-foreground" /></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Latest</p><p className="text-sm font-medium mt-1 truncate">{rows[0]?.action || "—"}</p></CardContent></Card>
      </div>

      <Card><CardContent className="pt-6">
        <div className="mb-4 relative max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="pl-9"
          />
        </div>
        {isLoading ? <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
          <>
            <Table><TableHeader><TableRow>
              <SortableHeader label="Date/Time" sortKey="created_at" direction={getSortDirection("created_at")} onToggle={toggleSort} />
              <SortableHeader label="Action" sortKey="action" direction={getSortDirection("action")} onToggle={toggleSort} />
              <SortableHeader label="Module" sortKey="module" direction={getSortDirection("module")} onToggle={toggleSort} />
              <SortableHeader label="Details" sortKey="details" direction={getSortDirection("details")} onToggle={toggleSort} />
            </TableRow></TableHeader>
              <TableBody>
                {rows.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No audit logs</TableCell></TableRow> : rows.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs whitespace-nowrap">{format(new Date(r.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                    <TableCell className="font-medium">{r.action}</TableCell>
                    <TableCell>{r.module ? <Badge variant="outline" className="text-[10px]">{r.module}</Badge> : "—"}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">{r.details || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {/* Server-side pagination controls */}
            <div className="flex items-center justify-between mt-4 px-2">
              <p className="text-sm text-muted-foreground">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalItems)} of {totalItems.toLocaleString()}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent></Card>
    </div>
  );
}
