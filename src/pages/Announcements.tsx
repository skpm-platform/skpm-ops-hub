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
import { Plus, Megaphone, Pin } from "lucide-react";
import { toast } from "sonner";

export default function Announcements() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", message: "", priority: "normal", target_audience: "all" });

  const { data = [], isLoading } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => { const { data } = await (supabase as any).from("announcements").select("*").order("pinned", { ascending: false }).order("created_at", { ascending: false }); return data || []; },
  });

  const save = useMutation({
    mutationFn: async () => { const { error } = await (supabase as any).from("announcements").insert({ ...form, created_by: user?.id }); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["announcements"] }); toast.success("Announcement posted"); setOpen(false); setForm({ title: "", message: "", priority: "normal", target_audience: "all" }); },
    onError: (e: any) => toast.error(e.message),
  });

  const prioC: Record<string,string> = { normal: "bg-blue-100 text-blue-700", important: "bg-amber-100 text-amber-700", urgent: "bg-red-100 text-red-700" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><Megaphone className="h-7 w-7 text-primary" /><h1 className="text-2xl font-bold">Announcements</h1></div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New Announcement</Button>
      </div>
      {isLoading ? <p className="text-muted-foreground">Loading...</p> : data.length === 0 ? <Card><CardContent className="py-8 text-center text-muted-foreground">No announcements</CardContent></Card> : data.map((a: any) => (
        <Card key={a.id} className={a.pinned ? "border-primary" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {a.pinned && <Pin className="h-4 w-4 text-primary" />}
                  <h3 className="font-semibold text-lg">{a.title}</h3>
                  <Badge className={prioC[a.priority] || ""}>{a.priority}</Badge>
                </div>
                <p className="text-muted-foreground">{a.message}</p>
                <p className="text-xs text-muted-foreground mt-2">Audience: {a.target_audience} · {new Date(a.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      <Dialog open={open} onOpenChange={setOpen}><DialogContent>
        <DialogHeader><DialogTitle>New Announcement</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
          <div><Label>Message</Label><Textarea value={form.message} onChange={e => setForm({...form, message: e.target.value})} rows={4} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Priority</Label><Select value={form.priority} onValueChange={v => setForm({...form, priority: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="normal">Normal</SelectItem><SelectItem value="important">Important</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent></Select></div>
            <div><Label>Audience</Label><Select value={form.target_audience} onValueChange={v => setForm({...form, target_audience: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="management">Management</SelectItem><SelectItem value="staff">Staff</SelectItem></SelectContent></Select></div>
          </div>
          <Button className="w-full" onClick={() => save.mutate()} disabled={!form.title || save.isPending}>{save.isPending ? "Posting..." : "Post Announcement"}</Button>
        </div>
      </DialogContent></Dialog>
    </div>
  );
}
