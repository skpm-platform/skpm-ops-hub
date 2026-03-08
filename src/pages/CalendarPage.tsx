import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";

const typeColors: Record<string,string> = { meeting: "bg-blue-500", deadline: "bg-red-500", training: "bg-emerald-500", maintenance: "bg-amber-500", inspection: "bg-purple-500", holiday: "bg-gray-500" };

export default function CalendarPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", type: "meeting", start_datetime: "", description: "", location: "" });

  const { data: events = [] } = useQuery({
    queryKey: ["events", format(currentMonth, "yyyy-MM")],
    queryFn: async () => {
      const start = startOfMonth(currentMonth).toISOString();
      const end = endOfMonth(currentMonth).toISOString();
      const { data } = await (supabase as any).from("calendar_events").select("*").gte("start_datetime", start).lte("start_datetime", end).order("start_datetime");
      return data || [];
    },
  });

  const save = useMutation({
    mutationFn: async () => { const { error } = await (supabase as any).from("calendar_events").insert({ ...form, created_by: user?.id }); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["events"] }); toast.success("Event added"); setOpen(false); setForm({ title: "", type: "meeting", start_datetime: "", description: "", location: "" }); },
    onError: (e: any) => toast.error(e.message),
  });

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const firstDayOffset = startOfMonth(currentMonth).getDay();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><Calendar className="h-7 w-7 text-primary" /><h1 className="text-2xl font-bold">Calendar</h1></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>←</Button>
          <span className="flex items-center font-medium px-3">{format(currentMonth, "MMMM yyyy")}</span>
          <Button variant="outline" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>→</Button>
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Event</Button>
        </div>
      </div>
      <Card><CardContent className="pt-6">
        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => <div key={d} className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground">{d}</div>)}
          {Array.from({ length: firstDayOffset }).map((_, i) => <div key={`e${i}`} className="bg-card p-2 min-h-[80px]" />)}
          {days.map(day => {
            const dayEvents = events.filter((e: any) => isSameDay(new Date(e.start_datetime), day));
            return (
              <div key={day.toISOString()} className="bg-card p-2 min-h-[80px] border-t">
                <span className={`text-sm ${isSameDay(day, new Date()) ? "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center" : ""}`}>{format(day, "d")}</span>
                {dayEvents.map((e: any) => (
                  <div key={e.id} className={`mt-1 text-[10px] px-1 py-0.5 rounded text-white truncate ${typeColors[e.type] || "bg-blue-500"}`}>{e.title}</div>
                ))}
              </div>
            );
          })}
        </div>
      </CardContent></Card>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent>
        <DialogHeader><DialogTitle>Add Event</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
          <div><Label>Type</Label><Select value={form.type} onValueChange={v => setForm({...form, type: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="meeting">Meeting</SelectItem><SelectItem value="deadline">Deadline</SelectItem><SelectItem value="training">Training</SelectItem><SelectItem value="maintenance">Maintenance</SelectItem><SelectItem value="inspection">Inspection</SelectItem><SelectItem value="holiday">Holiday</SelectItem></SelectContent></Select></div>
          <div><Label>Date & Time</Label><Input type="datetime-local" value={form.start_datetime} onChange={e => setForm({...form, start_datetime: e.target.value})} /></div>
          <div><Label>Location</Label><Input value={form.location} onChange={e => setForm({...form, location: e.target.value})} /></div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
          <Button className="w-full" onClick={() => save.mutate()} disabled={!form.title || save.isPending}>{save.isPending ? "Saving..." : "Add Event"}</Button>
        </div>
      </DialogContent></Dialog>
    </div>
  );
}
