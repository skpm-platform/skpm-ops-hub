import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/use-profile";
import { logAudit } from "@/lib/audit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Clock, LogIn, LogOut, Loader2, Users, TrendingUp, AlertTriangle, Calendar, Search, Pencil, Download } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, differenceInMinutes, differenceInHours } from "date-fns";
import { ExportButton } from "@/components/ExportButton";

export default function Attendance() {
  const { user } = useAuth();
  const { data: role } = useUserRole();
  const isAdmin = role === "admin" || role === "manager";
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [search, setSearch] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [editForm, setEditForm] = useState({ status: "", notes: "", clock_in: "", clock_out: "" });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Fetch own records
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

  // Admin: fetch all attendance
  const { data: allRecords } = useQuery({
    queryKey: ["attendance-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance")
        .select("*, profiles!attendance_user_id_fkey(name)")
        .order("date", { ascending: false })
        .limit(500);
      return data ?? [];
    },
    enabled: isAdmin,
  });

  const todayRecord = records?.find(r => r.date === format(new Date(), "yyyy-MM-dd"));
  const isClockedIn = todayRecord && !todayRecord.clock_out;

  const clockIn = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not logged in");
      const now = new Date();
      const isLate = now.getHours() >= 9;
      const { error } = await supabase.from("attendance").insert({
        user_id: user.id,
        clock_in: now.toISOString(),
        date: format(now, "yyyy-MM-dd"),
        status: isLate ? "late" : "present",
      });
      if (error) throw error;
      await logAudit("Clocked in", `At ${format(now, "HH:mm")}`);
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
      const now = new Date();
      const clockInTime = new Date(todayRecord.clock_in);
      const totalMinutes = differenceInMinutes(now, clockInTime);
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      const { error } = await supabase.from("attendance").update({
        clock_out: now.toISOString(),
        notes: `Total: ${hours}h ${mins}m`,
      }).eq("id", todayRecord.id);
      if (error) throw error;
      await logAudit("Clocked out", `At ${format(now, "HH:mm")} — ${hours}h ${mins}m`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      toast.success(`Clocked out at ${format(new Date(), "HH:mm")}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Admin edit
  const updateRecord = useMutation({
    mutationFn: async () => {
      if (!editRecord) return;
      const { error } = await supabase.from("attendance").update({
        status: editForm.status,
        notes: editForm.notes,
        clock_in: editForm.clock_in || null,
        clock_out: editForm.clock_out || null,
      }).eq("id", editRecord.id);
      if (error) throw error;
      await logAudit("Admin edited attendance", `Record ${editRecord.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-all"] });
      toast.success("Record updated");
      setEditOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const getStatusColor = (s: string) => {
    if (s === "present") return "bg-success/15 text-success";
    if (s === "late") return "bg-warning/15 text-warning";
    if (s === "absent") return "bg-destructive/15 text-destructive";
    if (s === "half-day") return "bg-info/15 text-info";
    return "bg-muted text-muted-foreground";
  };

  const getDayStatus = (day: Date) => {
    const record = records?.find((r) => isSameDay(new Date(r.date), day));
    return record?.status ?? null;
  };

  const getWorkHours = (r: any) => {
    if (!r.clock_in || !r.clock_out) return "—";
    const mins = differenceInMinutes(new Date(r.clock_out), new Date(r.clock_in));
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  // Stats
  const monthRecords = records?.filter(r => r.date >= format(monthStart, "yyyy-MM-dd") && r.date <= format(monthEnd, "yyyy-MM-dd")) ?? [];
  const presentDays = monthRecords.filter(r => r.status === "present").length;
  const lateDays = monthRecords.filter(r => r.status === "late").length;
  const absentDays = monthRecords.filter(r => r.status === "absent").length;
  const totalHours = monthRecords.reduce((sum, r) => {
    if (r.clock_in && r.clock_out) return sum + differenceInHours(new Date(r.clock_out), new Date(r.clock_in));
    return sum;
  }, 0);

  const displayRecords = records ?? [];

  const handleEdit = (r: any) => {
    setEditRecord(r);
    setEditForm({
      status: r.status ?? "present",
      notes: r.notes ?? "",
      clock_in: r.clock_in ? format(new Date(r.clock_in), "yyyy-MM-dd'T'HH:mm") : "",
      clock_out: r.clock_out ? format(new Date(r.clock_out), "yyyy-MM-dd'T'HH:mm") : "",
    });
    setEditOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Attendance</h1>
          <p className="text-muted-foreground">Track daily attendance & working hours</p>
        </div>
        <div className="flex gap-2">
          <ExportButton data={displayRecords} filename="attendance" columns={[{key:"date",label:"Date"},{key:"clock_in",label:"Clock In"},{key:"clock_out",label:"Clock Out"},{key:"status",label:"Status"},{key:"notes",label:"Notes"}]} />
          <Button onClick={() => clockIn.mutate()} disabled={!!isClockedIn || !!todayRecord || clockIn.isPending} size="sm" className="h-9 gap-2">
            {clockIn.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />} Clock In
          </Button>
          <Button onClick={() => clockOut.mutate()} disabled={!isClockedIn || clockOut.isPending} variant="outline" size="sm" className="h-9 gap-2">
            {clockOut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />} Clock Out
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase tracking-wider">Present</p><p className="text-2xl font-bold text-success">{presentDays}</p></div><Users className="h-5 w-5 text-success" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase tracking-wider">Late</p><p className="text-2xl font-bold text-warning">{lateDays}</p></div><AlertTriangle className="h-5 w-5 text-warning" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase tracking-wider">Absent</p><p className="text-2xl font-bold text-destructive">{absentDays}</p></div><Calendar className="h-5 w-5 text-destructive" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Hours</p><p className="text-2xl font-bold">{totalHours}h</p></div><TrendingUp className="h-5 w-5 text-primary" /></div></CardContent></Card>
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> {format(currentMonth, "MMMM yyyy")}</CardTitle>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" className="h-8" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>←</Button>
              <Button variant="outline" size="sm" className="h-8" onClick={() => setCurrentMonth(new Date())}>Today</Button>
              <Button variant="outline" size="sm" className="h-8" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>→</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 text-center">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-xs font-medium text-muted-foreground py-2">{d}</div>
            ))}
            {Array.from({ length: monthStart.getDay() }).map((_, i) => <div key={`e-${i}`} />)}
            {daysInMonth.map((day) => {
              const status = getDayStatus(day);
              const isToday = isSameDay(day, new Date());
              return (
                <div key={day.toISOString()} className={`aspect-square flex items-center justify-center rounded-md text-sm transition-colors ${
                  isToday ? "ring-2 ring-primary ring-offset-1 font-bold" :
                  status === "present" ? "bg-success/15 text-success font-medium" :
                  status === "late" ? "bg-warning/15 text-warning font-medium" :
                  status === "absent" ? "bg-destructive/15 text-destructive font-medium" :
                  day > new Date() ? "text-muted-foreground/30" : "text-muted-foreground"
                }`}>
                  {day.getDate()}
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-4 text-xs text-muted-foreground justify-center">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-success/30" /> Present</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-warning/30" /> Late</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-destructive/30" /> Absent</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded ring-2 ring-primary" /> Today</span>
          </div>
        </CardContent>
      </Card>

      {/* Records Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Attendance Records</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search records..." className="pl-9 h-8" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
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
                  <TableHead>Working Hours</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  {isAdmin && <TableHead className="w-12">Edit</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayRecords.length === 0 ? (
                  <TableRow><TableCell colSpan={isAdmin ? 7 : 6} className="text-center text-muted-foreground py-8">No records yet. Clock in to start.</TableCell></TableRow>
                ) : (
                  displayRecords.filter(r => !search || r.date.includes(search) || r.status?.includes(search)).slice(0, 31).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{format(new Date(r.date), "dd MMM yyyy")}</TableCell>
                      <TableCell className="font-mono text-sm">{r.clock_in ? format(new Date(r.clock_in), "HH:mm:ss") : "—"}</TableCell>
                      <TableCell className="font-mono text-sm">{r.clock_out ? format(new Date(r.clock_out), "HH:mm:ss") : "—"}</TableCell>
                      <TableCell className="font-medium">{getWorkHours(r)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`border-0 ${getStatusColor(r.status ?? "present")}`}>{r.status ?? "present"}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[150px] truncate">{r.notes ?? "—"}</TableCell>
                      {isAdmin && (
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(r)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Admin Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Attendance Record</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={v => setEditForm({ ...editForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="half-day">Half Day</SelectItem>
                  <SelectItem value="leave">On Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Clock In</Label>
                <Input type="datetime-local" value={editForm.clock_in} onChange={e => setEditForm({ ...editForm, clock_in: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Clock Out</Label>
                <Input type="datetime-local" value={editForm.clock_out} onChange={e => setEditForm({ ...editForm, clock_out: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Admin notes..." />
            </div>
            <Button className="w-full h-9" onClick={() => updateRecord.mutate()} disabled={updateRecord.isPending}>
              {updateRecord.isPending && <Loader2 className="animate-spin mr-2 h-4 w-4" />} Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
