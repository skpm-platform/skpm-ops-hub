import { useAuth } from "@/contexts/AuthContext";
import { useProfile, useUserRole } from "@/hooks/use-profile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Calendar, Clock, UserMinus, Wallet, FileText, CheckSquare, TrendingUp } from "lucide-react";

export default function MyProfile() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: role } = useUserRole();

  // Find employee record linked to this user
  const { data: employee } = useQuery({
    queryKey: ["my-employee", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("employees").select("*").eq("user_id", user.id).single();
      return data;
    },
    enabled: !!user,
  });

  // My attendance this month
  const { data: myAttendance = [] } = useQuery({
    queryKey: ["my-attendance", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const start = format(startOfMonth(new Date()), "yyyy-MM-dd");
      const end = format(endOfMonth(new Date()), "yyyy-MM-dd");
      const { data } = await supabase.from("attendance").select("*").eq("user_id", user.id).gte("date", start).lte("date", end).order("date", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  // My leave requests
  const { data: myLeaves = [] } = useQuery({
    queryKey: ["my-leaves", employee?.id],
    queryFn: async () => {
      if (!employee) return [];
      const { data } = await supabase.from("leave_requests").select("*").eq("employee_id", employee.id).order("created_at", { ascending: false }).limit(10);
      return data ?? [];
    },
    enabled: !!employee,
  });

  // My tasks
  const { data: myTasks = [] } = useQuery({
    queryKey: ["my-tasks", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("tasks").select("*").eq("assigned_to", user.id).order("created_at", { ascending: false }).limit(10);
      return data ?? [];
    },
    enabled: !!user,
  });

  // My payroll
  const { data: myPayroll = [] } = useQuery({
    queryKey: ["my-payroll", employee?.id],
    queryFn: async () => {
      if (!employee) return [];
      const { data } = await supabase.from("payroll").select("*").eq("employee_id", employee.id).order("year", { ascending: false }).order("month", { ascending: false }).limit(6);
      return data ?? [];
    },
    enabled: !!employee,
  });

  const displayName = profile?.name || user?.email?.split("@")[0] || "User";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase();
  const presentDays = myAttendance.filter(a => a.status === "present").length;
  const pendingLeaves = myLeaves.filter(l => l.status === "pending").length;
  const approvedLeaves = myLeaves.filter(l => l.status === "approved").reduce((s, l) => s + (l.days ?? 0), 0);
  const openTasks = myTasks.filter(t => t.status !== "done").length;
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-xl font-semibold text-foreground">My Profile</h1>

      {/* Profile Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <Avatar className="h-20 w-20">
              {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
              <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-left space-y-1">
              <h2 className="text-lg font-semibold">{displayName}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <div className="flex gap-2 justify-center sm:justify-start mt-2">
                <Badge variant="secondary" className="capitalize">{role ?? "staff"}</Badge>
                {employee && <Badge variant="outline">{employee.position ?? "Employee"}</Badge>}
                {employee?.employee_id && <Badge variant="outline">{employee.employee_id}</Badge>}
              </div>
              {employee && (
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-3 text-xs text-muted-foreground">
                  {employee.department_id && <span>Department: {employee.department_id.substring(0, 8)}...</span>}
                  {employee.phone && <span>Phone: {employee.phone}</span>}
                  {employee.nationality && <span>Nationality: {employee.nationality}</span>}
                  {employee.join_date && <span>Joined: {format(new Date(employee.join_date), "dd MMM yyyy")}</span>}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Clock className="h-5 w-5 text-primary" /></div>
            <div><p className="text-2xl font-semibold">{presentDays}</p><p className="text-xs text-muted-foreground">Days Present (This Month)</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center"><UserMinus className="h-5 w-5 text-warning" /></div>
            <div><p className="text-2xl font-semibold">{approvedLeaves}</p><p className="text-xs text-muted-foreground">Leave Days Used ({pendingLeaves} pending)</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center"><CheckSquare className="h-5 w-5 text-info" /></div>
            <div><p className="text-2xl font-semibold">{openTasks}</p><p className="text-xs text-muted-foreground">Open Tasks</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center"><Wallet className="h-5 w-5 text-success" /></div>
            <div>
              <p className="text-2xl font-semibold">{myPayroll.length > 0 ? `AED ${Number(myPayroll[0].net_pay ?? 0).toLocaleString()}` : "—"}</p>
              <p className="text-xs text-muted-foreground">Last Net Pay</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Attendance */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Calendar className="h-4 w-4" /> Recent Attendance</CardTitle></CardHeader>
          <CardContent>
            {myAttendance.length > 0 ? (
              <div className="space-y-1">
                {myAttendance.slice(0, 8).map(a => (
                  <div key={a.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0 text-xs">
                    <span className="font-medium">{format(new Date(a.date), "EEE, dd MMM")}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{a.clock_in ? format(new Date(a.clock_in), "HH:mm") : "—"} → {a.clock_out ? format(new Date(a.clock_out), "HH:mm") : "—"}</span>
                      <Badge variant={a.status === "present" ? "default" : "secondary"} className={`text-[10px] ${a.status === "present" ? "bg-success/15 text-success border-0" : ""}`}>{a.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-muted-foreground py-4 text-center">No attendance records this month</p>}
          </CardContent>
        </Card>

        {/* My Tasks */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><CheckSquare className="h-4 w-4" /> My Tasks</CardTitle></CardHeader>
          <CardContent>
            {myTasks.length > 0 ? (
              <div className="space-y-1">
                {myTasks.slice(0, 8).map(t => (
                  <div key={t.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0 text-xs">
                    <span className="font-medium truncate max-w-[200px]">{t.title}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] capitalize">{t.priority}</Badge>
                      <Badge variant={t.status === "done" ? "default" : "secondary"} className={`text-[10px] ${t.status === "done" ? "bg-success/15 text-success border-0" : ""}`}>{t.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-muted-foreground py-4 text-center">No tasks assigned</p>}
          </CardContent>
        </Card>

        {/* Leave History */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><UserMinus className="h-4 w-4" /> Leave History</CardTitle></CardHeader>
          <CardContent>
            {myLeaves.length > 0 ? (
              <div className="space-y-1">
                {myLeaves.slice(0, 6).map(l => (
                  <div key={l.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0 text-xs">
                    <div>
                      <span className="font-medium capitalize">{l.type}</span>
                      <span className="text-muted-foreground ml-2">{l.days} day(s)</span>
                    </div>
                    <Badge variant={l.status === "approved" ? "default" : l.status === "rejected" ? "destructive" : "secondary"} className={`text-[10px] ${l.status === "approved" ? "bg-success/15 text-success border-0" : ""}`}>{l.status}</Badge>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-muted-foreground py-4 text-center">No leave records</p>}
          </CardContent>
        </Card>

        {/* Payslip History */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Wallet className="h-4 w-4" /> Payslip History</CardTitle></CardHeader>
          <CardContent>
            {myPayroll.length > 0 ? (
              <div className="space-y-1">
                {myPayroll.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0 text-xs">
                    <span className="font-medium">{monthNames[p.month - 1]} {p.year}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">Basic: AED {Number(p.basic_salary ?? 0).toLocaleString()}</span>
                      <span className="font-semibold text-foreground">Net: AED {Number(p.net_pay ?? 0).toLocaleString()}</span>
                      <Badge variant={p.status === "paid" ? "default" : "secondary"} className={`text-[10px] ${p.status === "paid" ? "bg-success/15 text-success border-0" : ""}`}>{p.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-muted-foreground py-4 text-center">No payroll records</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
