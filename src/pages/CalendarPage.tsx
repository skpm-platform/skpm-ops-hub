import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logAudit } from "@/lib/audit";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ComboboxSelect } from "@/components/ComboboxSelect";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Plus, Calendar, ChevronLeft, ChevronRight, Trash2, Eye, Loader2 , AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from "date-fns";

const typeColors: Record<string, string> = { meeting: "bg-blue-500", deadline: "bg-red-500", training: "bg-emerald-500", maintenance: "bg-amber-500", inspection: "bg-purple-500", holiday: "bg-gray-500", event: "bg-pink-500" };
const eventTypes = ["meeting", "deadline", "training", "maintenance", "inspection", "holiday", "event"];

export default function CalendarPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [open, setOpen] = useState(false);
  const [viewItem, setViewItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", type: "meeting", start_datetime: "", end_datetime: "", description: "", location: "" });

  const { data: events = [], isLoading , isError: dataLoadError} = useQuery({
    queryKey: ["events", format(currentMonth, "yyyy-MM")],
    queryFn: async () => {
      const start = startOfMonth(currentMonth).toISOString();
      const end = endOfMonth(currentMonth).toISOString();
      const { data } = await supabase.from("calendar_events").select("*").gte("start_datetime", start).lte("start_datetime", end).order("start_datetime");
      return data || [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("calendar_events").insert({ ...form, end_datetime: form.end_datetime || null, created_by: user?.id });
      if (error) throw error;
      await logAudit("Added calendar event", form.title, "calendar");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["events"] }); toast.success("Event added"); setOpen(false); setForm({ title: "", type: "meeting", start_datetime: "", end_datetime: "", description: "", location: "" }); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("calendar_events").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["events"] }); toast.success("Deleted"); setDeleteId(null); setViewItem(null); },
  });

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const firstDayOffset = startOfMonth(currentMonth).getDay();
  const totalEvents = events.length;
  const meetingCount = events.filter((e: any) => e.type === "meeting").length;

  return (
    <div className="space-y-6">
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
        <div className="flex items-center gap-3"><Calendar className="h-7 w-7 text-primary" /><h1 className="text-2xl font-bold">Calendar</h1></div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setCurrentMonth(m => subMonths(m, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="font-medium px-3 min-w-[140px] text-center">{format(currentMonth, "MMMM yyyy")}</span>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setCurrentMonth(m => addMonths(m, 1))}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" className="h-9" onClick={() => setCurrentMonth(new Date())}>Today</Button>
          <Button size="sm" className="h-9" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Event</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Events This Month</p><p className="text-2xl font-semibold mt-1">{totalEvents}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Meetings</p><p className="text-2xl font-semibold mt-1 text-blue-600">{meetingCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Deadlines</p><p className="text-2xl font-semibold mt-1 text-destructive">{events.filter((e: any) => e.type === "deadline").length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Training</p><p className="text-2xl font-semibold mt-1 text-success">{events.filter((e: any) => e.type === "training").length}</p></CardContent></Card>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {eventTypes.map(t => <div key={t} className="flex items-center gap-1.5 text-xs"><div className={`h-2.5 w-2.5 rounded-full ${typeColors[t]}`} /><span className="capitalize text-muted-foreground">{t}</span></div>)}
      </div>

      <Card><CardContent className="pt-6">
        {isLoading ? <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => <div key={d} className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground">{d}</div>)}
            {Array.from({ length: firstDayOffset }).map((_, i) => <div key={`e${i}`} className="bg-card p-2 min-h-[90px]" />)}
            {days.map(day => {
              const dayEvents = events.filter((e: any) => isSameDay(new Date(e.start_datetime), day));
              const isToday = isSameDay(day, new Date());
              return (
                <div key={day.toISOString()} className={`bg-card p-2 min-h-[90px] border-t ${isToday ? "ring-1 ring-inset ring-primary/30 bg-primary/5" : ""}`}>
                  <span className={`text-sm ${isToday ? "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center font-medium" : ""}`}>{format(day, "d")}</span>
                  <div className="space-y-0.5 mt-1">
                    {dayEvents.slice(0, 3).map((e: any) => (
                      <button key={e.id} onClick={() => setViewItem(e)} className={`w-full text-left text-[10px] px-1 py-0.5 rounded text-white truncate ${typeColors[e.type] || "bg-blue-500"} hover:opacity-80 transition-opacity`}>{e.title}</button>
                    ))}
                    {dayEvents.length > 3 && <span className="text-[10px] text-muted-foreground">+{dayEvents.length - 3} more</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent></Card>

      {/* Add Event Dialog */}
      <Dialog open={open} onOpenChange={setOpen}><DialogContent>
        <DialogHeader><DialogTitle>Add Event</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Type</Label><ComboboxSelect value={form.type} onValueChange={v => setForm({ ...form, type: v })} options={eventTypes} allowCustom={false} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Start</Label><Input type="datetime-local" value={form.start_datetime} onChange={e => setForm({ ...form, start_datetime: e.target.value })} /></div>
            <div><Label>End (optional)</Label><Input type="datetime-local" value={form.end_datetime} onChange={e => setForm({ ...form, end_datetime: e.target.value })} /></div>
          </div>
          <div><Label>Location</Label><Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} /></div>
          <Button className="w-full h-9" onClick={() => save.mutate()} disabled={!form.title || !form.start_datetime || save.isPending}>{save.isPending ? "Saving..." : "Add Event"}</Button>
        </div>
      </DialogContent></Dialog>

      {/* View Event Dialog */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}><DialogContent>
        <DialogHeader><DialogTitle>{viewItem?.title}</DialogTitle></DialogHeader>
        {viewItem && (
          <div className="space-y-3">
            <div className="flex gap-2"><Badge className={`border-0 text-white ${typeColors[viewItem.type] || "bg-blue-500"}`}>{viewItem.type}</Badge></div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-muted-foreground">Start</p><p>{format(new Date(viewItem.start_datetime), "dd MMM yyyy, HH:mm")}</p></div>
              {viewItem.end_datetime && <div><p className="text-xs text-muted-foreground">End</p><p>{format(new Date(viewItem.end_datetime), "dd MMM yyyy, HH:mm")}</p></div>}
              {viewItem.location && <div><p className="text-xs text-muted-foreground">Location</p><p>{viewItem.location}</p></div>}
            </div>
            {viewItem.description && <div><p className="text-xs text-muted-foreground">Description</p><p className="text-sm">{viewItem.description}</p></div>}
            <Button variant="destructive" size="sm" className="h-9" onClick={() => setDeleteId(viewItem.id)}><Trash2 className="h-4 w-4 mr-2" />Delete Event</Button>
          </div>
        )}
      </DialogContent></Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} onConfirm={() => deleteId && remove.mutate(deleteId)} title="Delete Event?" />
    </div>
  );
}
