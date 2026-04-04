import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/use-profile";
import { logAudit } from "@/lib/audit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, LogIn, LogOut, Loader2, Users, TrendingUp, AlertTriangle, Calendar, Search, Pencil, Timer, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, differenceInMinutes, differenceInHours, isWeekend } from "date-fns";
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

  const { data: records, isLoading , isError: dataLoadError} = useQuery({
    queryKey: ["attendance", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("attendance").select("*").eq("user_id", user.id).order("date", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: allRecords } = useQuery({
    queryKey: ["attendance-all"],
    queryFn: async () => {
      const { data } = await supabase.from("attendance").select("*").order("date", { ascending: false }).limit(500);
      return data ?? [];
    },
    enabled: isAdmin,
  });

  const { data: allActiveEmployees = [] } = useQuery({
    queryKey: ["active-employees-count"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("employees").select("id, name").eq("status", "active");
      return data || [];
    },
    enabled: isAdmin,
  });

  const markAllPresent = useMutation({
    mutationFn: async () => {
      if (!isAdmin) throw new Error("Unauthorized");
      const today = format(new Date(), "yyyy-MM-dd");
      const { data: existing } = await supabase.from("attendance").select("user_id").eq("date", today);
      const existingIds = new Set((existing || []).map((r: any) => r.user_id));
      const toInsert = allActiveEmployees
        .filter((e: any) => !existingIds.has(e.id))
        .map((e: any) => ({ user_id: e.id, date: today, status: "present", clock_in: new Date().toISOString() }));
      if (toInsert.length === 0) { toast.info("All employees already marked for today"); return; }
      const { error } = await supabase.from("attendance").insert(toInsert);
      if (error) throw error;
      await logAudit("Mark all present", `${toInsert.length} employees marked for ${today}`, "attendance");
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["attendance"] }); queryClient.invalidateQueries({ queryKey: ["attendance-all"] }); toast.success("All active employees marked present for today"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const todayRecord = records?.find(r => r.date === format(new Date(), "yyyy-MM-dd"));
  const isClockedIn = todayRecord && !todayRecord.clock_out;

  const clockIn = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not logged in");
      const now = new Date();
      const isLate = now.getHours() >= 9;
      const { error } = await supabase.from("attendance").insert({ user_id: user.id, clock_in: now.toISOString(), date: format(now, "yyyy-MM-dd"), status: isLate ? "late" : "present" });
      if (error) throw error;
      await logAudit("Clocked in", `At ${format(now, "HH:mm")}`, "attendance");
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["attendance"] }); toast.success(`Clocked in at ${format(new Date(), "HH:mm")}`); },
    onError: (e: Error) => toast.error(e.message),
  });

  const clockOut = useMutation({
    mutationFn: async () => {
      if (!todayRecord) throw new Error("No clock in record");
      const now = new Date();
      const mins = differenceInMinutes(now, new Date(todayRecord.clock_in));
      const { error } = await supabase.from("attendance").update({ clock_out: now.toISOString(), notes: `Total: ${Math.floor(mins / 60)}h ${mins % 60}m` }).eq("id", todayRecord.id);
      if (error) throw error;
      await logAudit("Clocked out", `At ${format(now, "HH:mm")} — ${Math.floor(mins / 60)}h ${mins % 60}m`, "attendance");
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["attendance"] }); toast.success(`Clocked out at ${format(new Date(), "HH:mm")}`); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateRecord = useMutation({
    mutationFn: async () => {
      if (!editRecord) return;
      const { error } = await supabase.from("attendance").update({ status: editForm.status, notes: editForm.notes, clock_in: editForm.clock_in || null, clock_out: editForm.clock_out || null }).eq("id", editRecord.id);
      if (error) throw error;
      await logAudit("Admin edited attendance", `Record ${editRecord.id}`, "attendance");
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["attendance"] }); queryClient.invalidateQueries({ queryKey: ["attendance-all"] }); toast.success("Record updated"); setEditOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  const getStatusColor = (s: string) => {
    if (s === "present") return "bg-success/15 text-success";
    if (s === "late") return "bg-warning/15 text-warning";
    if (s === "absent") return "bg-destructive/15 text-destructive";
    if (s === "half-day") return "bg-accent text-accent-foreground";
    return "bg-muted text-muted-foreground";
  };

  const getStatusIcon = (s: string) => {
    if (s === "present") return <CheckCircle2 className="h-3 w-3" />;
    if (s === "late") return <AlertTriangle className="h-3 w-3" />;
    if (s === "absent") return <XCircle className="h-3 w-3" />;
    return <Clock className="h-3 w-3" />;
  };

  const getDayStatus = (day: Date) => records?.find((r) => isSameDay(new Date(r.date), day))?.status ?? null;

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
    if (r.clock_in && r.clock_out) return sum + differenceInMinutes(new Date(r.clock_out), new Date(r.clock_in));
    return sum;
  }, 0);
  const workingDays = daysInMonth.filter(d => !isWeekend(d) && d <= new Date()).length;
  const attendanceRate = workingDays > 0 ? Math.round(((presentDays + lateDays) / workingDays) * 100) : 0;

  // Current session timer
  const sessionMinutes = isClockedIn && todayRecord ? differenceInMinutes(new Date(), new Date(todayRecord.clock_in)) : 0;
  const sessionHours = Math.floor(sessionMinutes / 60);
  const sessionMins = sessionMinutes % 60;

  const [statusFilterAtt, setStatusFilterAtt] = useState("all");

  const isLateCheckIn = (clockIn: string | null) => {
    if (!clockIn) return false;
    const t = new Date(clockIn);
    return t.getHours() > 9 || (t.getHours() === 9 && t.getMinutes() > 0);
  };

  const displayRecords = records ?? [];

  const handleEdit = (r: any) => {
    setEditRecord(r);
    setEditForm({ status: r.status ?? "present", notes: r.notes ?? "", clock_in: r.clock_in ? format(new Date(r.clock_in), "yyyy-MM-dd'T'HH:mm") : "", clock_out: r.clock_out ? format(new Date(r.clock_out), "yyyy-MM-dd'T'HH:mm") : "" });
    setEditOpen(true);
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold">Attendance</h1><p className="text-muted-foreground">Track daily attendance & working hours</p></div>
        <div className="flex gap-2">
          <ExportButton data={displayRecords} filename="attendance" columns={[{key:"date",label:"Date"},{key:"clock_in",label:"Clock In"},{key:"clock_out",label:"Clock Out"},{key:"status",label:"Status"},{key:"notes",label:"Notes"}]} />
          {isAdmin && (
            <Button onClick={() => markAllPresent.mutate()} disabled={markAllPresent.isPending} variant="outline" size="sm" className="h-9 gap-2">
              {markAllPresent.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />} Mark All Present
            </Button>
          )}
          <Button onClick={() => clockIn.mutate()} disabled={!!isClockedIn || !!todayRecord || clockIn.isPending} size="sm" className="h-9 gap-2">
            {clockIn.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />} Clock In
          </Button>
          <Button onClick={() => clockOut.mutate()} disabled={!isClockedIn || clockOut.isPending} variant="outline" size="sm" className="h-9 gap-2">
            {clockOut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />} Clock Out
          </Button>
        </div>
      </div>

      {/* Live Session Banner */}
      {isClockedIn && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-success animate-pulse" />
              <div>
                <p className="text-sm font-semibold">Currently Clocked In</p>
                <p className="text-xs text-muted-foreground">Since {format(new Date(todayRecord!.clock_in!), "HH:mm")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-primary" />
              <span className="text-lg font-bold font-mono">{sessionHours}h {sessionMins}m</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      {isAdmin && allActiveEmployees.length > 0 && (() => {
        const todayStr = format(new Date(), "yyyy-MM-dd");
        const todayPresentCount = (allRecords ?? []).filter((r: any) => r.date === todayStr && (r.status === "present" || r.status === "late")).length;
        const todayAbsentCount = allActiveEmployees.length - todayPresentCount;
        return (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 flex items-center gap-6">
              <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Today's Attendance</p>
                <p className="text-lg font-bold"><span className="text-success">{todayPresentCount}</span> / {allActiveEmployees.length} employees present</p>
              </div>
              {todayAbsentCount > 0 && <Badge variant="secondary" className="border-0 bg-destructive/10 text-destructive">{todayAbsentCount} absent</Badge>}
            </CardContent>
          </Card>
        );
      })()}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Present</p>
                <p className="text-2xl font-bold text-success">{presentDays}</p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Late</p>
                <p className="text-2xl font-bold text-warning">{lateDays}</p>
              </div>
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Absent</p>
                <p className="text-2xl font-bold text-destructive">{absentDays}</p>
              </div>
              <XCircle className="h-5 w-5 text-destructive" />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Hours</p>
                <p className="text-2xl font-bold">{Math.floor(totalHours / 60)}h</p>
              </div>
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow col-span-2 lg:col-span-1">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Attendance Rate</p>
            <p className="text-2xl font-bold mt-1">{attendanceRate}%</p>
            <Progress value={attendanceRate} className="mt-2 h-1.5" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calendar" className="gap-1.5"><Calendar className="h-3.5 w-3.5" />Calendar</TabsTrigger>
          <TabsTrigger value="records" className="gap-1.5"><Clock className="h-3.5 w-3.5" />Records</TabsTrigger>
          {isAdmin && <TabsTrigger value="team" className="gap-1.5"><Users className="h-3.5 w-3.5" />Team View</TabsTrigger>}
        </TabsList>

        <TabsContent value="calendar">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{format(currentMonth, "MMMM yyyy")}</CardTitle>
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
                  const weekend = isWeekend(day);
                  const record = records?.find((r) => isSameDay(new Date(r.date), day));
                  return (
                    <div key={day.toISOString()} className={`aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-all cursor-default group relative ${
                      isToday ? "ring-2 ring-primary ring-offset-1 ring-offset-background font-bold" :
                      status === "present" ? "bg-success/15 text-success font-medium" :
                      status === "late" ? "bg-warning/15 text-warning font-medium" :
                      status === "absent" ? "bg-destructive/15 text-destructive font-medium" :
                      weekend ? "text-muted-foreground/40" :
                      day > new Date() ? "text-muted-foreground/30" : "text-muted-foreground hover:bg-muted/50"
                    }`}>
                      {day.getDate()}
                      {status && <span className="text-[8px] leading-none">{getStatusIcon(status)}</span>}
                      {record && record.clock_in && (
                        <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-popover border rounded-md shadow-md p-2 text-xs whitespace-nowrap pointer-events-none">
                          <p>In: {format(new Date(record.clock_in), "HH:mm")}</p>
                          {record.clock_out && <p>Out: {format(new Date(record.clock_out), "HH:mm")}</p>}
                          <p className="font-medium">{getWorkHours(record)}</p>
                        </div>
                      )}
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
        </TabsContent>

        <TabsContent value="records">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-base">Attendance Records</CardTitle>
                <div className="flex gap-2 items-center flex-wrap">
                  <select className="h-8 rounded-md border border-input bg-background px-2 text-xs" value={statusFilterAtt} onChange={e => setStatusFilterAtt(e.target.value)}>
                    <option value="all">All</option>
                    <option value="present">Present</option>
                    <option value="late">Late</option>
                    <option value="absent">Absent</option>
                    <option value="half-day">Half Day</option>
                    <option value="leave">On Leave</option>
                  </select>
                  <div className="relative w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search records..." className="pl-9 h-8" value={search} onChange={e => setSearch(e.target.value)} />
                  </div>
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
                      displayRecords.filter(r => (!search || r.date.includes(search) || r.status?.includes(search)) && (statusFilterAtt === "all" || r.status === statusFilterAtt)).slice(0, 31).map((r) => (
                        <TableRow key={r.id} className="group">
                          <TableCell className="font-medium">{format(new Date(r.date), "dd MMM yyyy")}</TableCell>
                          <TableCell className="font-mono text-sm">
                            <div className="flex items-center gap-1.5">
                              {r.clock_in ? format(new Date(r.clock_in), "HH:mm:ss") : "—"}
                              {r.clock_in && isLateCheckIn(r.clock_in) && r.status !== "late" && (
                                <Badge variant="secondary" className="border-0 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-[10px]">Late</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{r.clock_out ? format(new Date(r.clock_out), "HH:mm:ss") : "—"}</TableCell>
                          <TableCell className="font-medium">{getWorkHours(r)}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={`border-0 gap-1 ${getStatusColor(r.status ?? "present")}`}>
                              {getStatusIcon(r.status ?? "present")}
                              {r.status ?? "present"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm max-w-[150px] truncate">{r.notes ?? "—"}</TableCell>
                          {isAdmin && (
                            <TableCell>
                              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleEdit(r)}>
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
        </TabsContent>

        {isAdmin && (
          <TabsContent value="team">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Team Attendance Today</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Clock In</TableHead>
                      <TableHead>Clock Out</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Monthly Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(allRecords ?? []).slice(0, 20).map((r: any) => {
                      const mStart = format(monthStart, "yyyy-MM-dd");
                      const mEnd = format(monthEnd, "yyyy-MM-dd");
                      const empMonthRecords = (allRecords ?? []).filter((ar: any) => ar.user_id === r.user_id && ar.date >= mStart && ar.date <= mEnd);
                      const empPresent = empMonthRecords.filter((ar: any) => ar.status === "present" || ar.status === "late").length;
                      const empRate = workingDays > 0 ? Math.round((empPresent / workingDays) * 100) : 0;
                      return (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">{r.user_id?.slice(0, 8)}...</TableCell>
                        <TableCell>{format(new Date(r.date), "dd MMM")}</TableCell>
                        <TableCell className="font-mono text-sm">{r.clock_in ? format(new Date(r.clock_in), "HH:mm") : "—"}</TableCell>
                        <TableCell className="font-mono text-sm">{r.clock_out ? format(new Date(r.clock_out), "HH:mm") : "—"}</TableCell>
                        <TableCell>{getWorkHours(r)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={`border-0 gap-1 ${getStatusColor(r.status ?? "present")}`}>
                            {getStatusIcon(r.status ?? "present")}
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">{empRate}%</span>
                            <Progress value={empRate} className="h-1.5 w-16" />
                          </div>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                    {(allRecords ?? []).length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No team records</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

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
              <div className="space-y-2"><Label>Clock In</Label><Input type="datetime-local" value={editForm.clock_in} onChange={e => setEditForm({ ...editForm, clock_in: e.target.value })} /></div>
              <div className="space-y-2"><Label>Clock Out</Label><Input type="datetime-local" value={editForm.clock_out} onChange={e => setEditForm({ ...editForm, clock_out: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Admin notes..." /></div>
            <Button className="w-full h-9" onClick={() => updateRecord.mutate()} disabled={updateRecord.isPending}>
              {updateRecord.isPending && <Loader2 className="animate-spin mr-2 h-4 w-4" />} Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
