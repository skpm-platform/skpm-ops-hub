import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logAudit } from "@/lib/audit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, LogIn, LogOut, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";

export default function Attendance() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const { data: records, isLoading } = useQuery({
    queryKey: ["attendance", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("attendance")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const todayRecord = records?.find(r => r.date === format(new Date(), "yyyy-MM-dd"));
  const isClockedIn = todayRecord && !todayRecord.clock_out;

  const clockIn = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not logged in");
      const now = new Date().toISOString();
      const isLate = new Date().getHours() >= 9;
      const { error } = await supabase.from("attendance").insert({
        user_id: user.id,
        clock_in: now,
        date: format(new Date(), "yyyy-MM-dd"),
        status: isLate ? "late" : "present",
      });
      if (error) throw error;
      await logAudit("Clocked in", `At ${format(new Date(), "HH:mm")}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      toast.success(`Clocked in at ${format(new Date(), "HH:mm")}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const clockOut = useMutation({
    mutationFn: async () => {
      if (!todayRecord) throw new Error("No clock in record");
      const { error } = await supabase.from("attendance").update({
        clock_out: new Date().toISOString(),
      }).eq("id", todayRecord.id);
      if (error) throw error;
      await logAudit("Clocked out", `At ${format(new Date(), "HH:mm")}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      toast.success(`Clocked out at ${format(new Date(), "HH:mm")}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const getStatusColor = (s: string) => {
    if (s === "present") return "bg-success/15 text-success";
    if (s === "late") return "bg-warning/15 text-warning";
    return "bg-destructive/15 text-destructive";
  };

  const getDayStatus = (day: Date) => {
    const record = records?.find((r) => isSameDay(new Date(r.date), day));
    return record?.status ?? null;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Attendance</h1>
          <p className="text-muted-foreground">Track your daily attendance</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => clockIn.mutate()} disabled={!!isClockedIn || !!todayRecord || clockIn.isPending} className="gap-2">
            {clockIn.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />} Clock In
          </Button>
          <Button onClick={() => clockOut.mutate()} disabled={!isClockedIn || clockOut.isPending} variant="outline" className="gap-2">
            {clockOut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />} Clock Out
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> {format(currentMonth, "MMMM yyyy")}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 text-center">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-xs font-medium text-muted-foreground py-2">{d}</div>
            ))}
            {Array.from({ length: monthStart.getDay() }).map((_, i) => <div key={`e-${i}`} />)}
            {daysInMonth.map((day) => {
              const status = getDayStatus(day);
              return (
                <div key={day.toISOString()} className={`aspect-square flex items-center justify-center rounded-md text-sm ${
                  status === "present" ? "bg-success/15 text-success font-medium" :
                  status === "late" ? "bg-warning/15 text-warning font-medium" :
                  day > new Date() ? "text-muted-foreground/30" : "text-muted-foreground"
                }`}>
                  {day.getDate()}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Records</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(records ?? []).length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No records yet. Clock in to start.</TableCell></TableRow>
                ) : (
                  (records ?? []).slice(0, 20).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{format(new Date(r.date), "dd MMM yyyy")}</TableCell>
                      <TableCell>{r.clock_in ? format(new Date(r.clock_in), "HH:mm") : "—"}</TableCell>
                      <TableCell>{r.clock_out ? format(new Date(r.clock_out), "HH:mm") : "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`border-0 ${getStatusColor(r.status ?? "present")}`}>{r.status ?? "present"}</Badge>
                      </TableCell>
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
