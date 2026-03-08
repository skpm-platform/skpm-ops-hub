import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, ClipboardList } from "lucide-react";
import { format } from "date-fns";

export default function AuditLogs() {
  const [search, setSearch] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => { const { data } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200); return data || []; },
  });

  const filtered = data.filter((r: any) => JSON.stringify(r).toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3"><ClipboardList className="h-7 w-7 text-primary" /><h1 className="text-2xl font-bold">Audit Logs</h1></div>
      <Card><CardContent className="pt-6">
        <div className="mb-4 relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search logs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        {isLoading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <p className="text-center text-muted-foreground py-8">No audit logs</p> : (
          <Table><TableHeader><TableRow><TableHead>Date/Time</TableHead><TableHead>Action</TableHead><TableHead>Module</TableHead><TableHead>Details</TableHead></TableRow></TableHeader>
            <TableBody>{filtered.map((r: any) => (
              <TableRow key={r.id}><TableCell className="text-xs whitespace-nowrap">{format(new Date(r.created_at), "dd/MM/yyyy HH:mm")}</TableCell><TableCell className="font-medium">{r.action}</TableCell><TableCell>{r.module || "—"}</TableCell><TableCell className="max-w-xs truncate text-muted-foreground">{r.details}</TableCell></TableRow>
            ))}</TableBody></Table>)}
      </CardContent></Card>
    </div>
  );
}
