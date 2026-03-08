import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, LogIn, LogOut } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";

interface AttendanceRecord {
  id: string;
  date: Date;
  clockIn: string;
  clockOut: string | null;
  status: "present" | "late" | "absent";
}

const mockRecords: AttendanceRecord[] = [
  { id: "1", date: new Date(), clockIn: "08:00", clockOut: "17:00", status: "present" },
  { id: "2", date: new Date(Date.now() - 86400000), clockIn: "08:45", clockOut: "17:00", status: "late" },
  { id: "3", date: new Date(Date.now() - 86400000 * 2), clockIn: "08:00", clockOut: "17:30", status: "present" },
];

export default function Attendance() {
  const [records, setRecords] = useState(mockRecords);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [currentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const handleClockIn = () => {
    setIsClockedIn(true);
    const now = format(new Date(), "HH:mm");
    setRecords([{ id: Date.now().toString(), date: new Date(), clockIn: now, clockOut: null, status: now > "08:15" ? "late" : "present" }, ...records]);
    toast.success(`Clocked in at ${now}`);
  };

  const handleClockOut = () => {
    setIsClockedIn(false);
    const now = format(new Date(), "HH:mm");
    setRecords(records.map((r, i) => (i === 0 ? { ...r, clockOut: now } : r)));
    toast.success(`Clocked out at ${now}`);
  };

  const getStatusColor = (s: string) => {
    if (s === "present") return "bg-success/15 text-success";
    if (s === "late") return "bg-warning/15 text-warning";
    return "bg-destructive/15 text-destructive";
  };

  const getDayStatus = (day: Date) => {
    const record = records.find((r) => isSameDay(r.date, day));
    if (!record) return null;
    return record.status;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Attendance</h1>
          <p className="text-muted-foreground">Track your daily attendance</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleClockIn} disabled={isClockedIn} className="gap-2">
            <LogIn className="h-4 w-4" /> Clock In
          </Button>
          <Button onClick={handleClockOut} disabled={!isClockedIn} variant="outline" className="gap-2">
            <LogOut className="h-4 w-4" /> Clock Out
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
            {Array.from({ length: monthStart.getDay() }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {daysInMonth.map((day) => {
              const status = getDayStatus(day);
              return (
                <div
                  key={day.toISOString()}
                  className={`aspect-square flex items-center justify-center rounded-md text-sm ${
                    status === "present" ? "bg-success/15 text-success font-medium" :
                    status === "late" ? "bg-warning/15 text-warning font-medium" :
                    status === "absent" ? "bg-destructive/15 text-destructive font-medium" :
                    day > new Date() ? "text-muted-foreground/30" : "text-muted-foreground"
                  }`}
                >
                  {day.getDate()}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent Records</CardTitle></CardHeader>
        <CardContent className="p-0">
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
              {records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{format(r.date, "dd MMM yyyy")}</TableCell>
                  <TableCell>{r.clockIn}</TableCell>
                  <TableCell>{r.clockOut ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={`border-0 ${getStatusColor(r.status)}`}>{r.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
