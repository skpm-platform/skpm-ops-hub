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
import { Switch } from "@/components/ui/switch";
import { ComboboxSelect } from "@/components/ComboboxSelect";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ExportButton } from "@/components/ExportButton";
import { Plus, Megaphone, Pin, Trash2, Eye, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const prioC: Record<string, string> = { normal: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", important: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", urgent: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" };

export default function Announcements() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [viewItem, setViewItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ title: "", message: "", priority: "normal", target_audience: "all", pinned: false, expiry_date: "" });

  const { data = [], isLoading } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => { const { data } = await supabase.from("announcements").select("*").order("pinned", { ascending: false }).order("created_at", { ascending: false }); return data || []; },
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("announcements").insert({ ...form, expiry_date: form.expiry_date || null, created_by: user?.id });
      if (error) throw error;
      await logAudit("Posted announcement", form.title);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["announcements"] }); toast.success("Announcement posted"); setOpen(false); setForm({ title: "", message: "", priority: "normal", target_audience: "all", pinned: false, expiry_date: "" }); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("announcements").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["announcements"] }); toast.success("Deleted"); setDeleteId(null); },
  });

  const filtered = data.filter((a: any) => a.title?.toLowerCase().includes(search.toLowerCase()) || a.message?.toLowerCase().includes(search.toLowerCase()));
  const pinnedCount = data.filter((a: any) => a.pinned).length;
  const urgentCount = data.filter((a: any) => a.priority === "urgent").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3"><Megaphone className="h-7 w-7 text-primary" /><h1 className="text-2xl font-bold">Announcements</h1></div>
        <div className="flex gap-2">
          <ExportButton data={data} filename="announcements" columns={[{ key: "title", label: "Title" }, { key: "priority", label: "Priority" }, { key: "target_audience", label: "Audience" }, { key: "created_at", label: "Date" }]} />
          <Button size="sm" className="h-9" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New Announcement</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p><p className="text-2xl font-semibold mt-1">{data.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Pinned</p><p className="text-2xl font-semibold mt-1 text-primary">{pinnedCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Urgent</p><p className="text-2xl font-semibold mt-1 text-destructive">{urgentCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Active</p><p className="text-2xl font-semibold mt-1 text-success">{data.filter((a: any) => !a.expiry_date || new Date(a.expiry_date) >= new Date()).length}</p></CardContent></Card>
      </div>

      <div className="relative max-w-sm"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search announcements..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>

      {isLoading ? <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : filtered.length === 0 ? <Card><CardContent className="py-8 text-center text-muted-foreground">No announcements</CardContent></Card> : filtered.map((a: any) => (
        <Card key={a.id} className={a.pinned ? "border-primary" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {a.pinned && <Pin className="h-4 w-4 text-primary shrink-0" />}
                  <h3 className="font-semibold text-lg">{a.title}</h3>
                  <Badge className={`border-0 ${prioC[a.priority] || ""}`}>{a.priority}</Badge>
                  <Badge variant="outline" className="text-[10px]">{a.target_audience}</Badge>
                </div>
                <p className="text-muted-foreground line-clamp-2">{a.message}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {format(new Date(a.created_at), "dd MMM yyyy, HH:mm")}
                  {a.expiry_date && <> · Expires {format(new Date(a.expiry_date), "dd MMM yyyy")}</>}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewItem(a)}><Eye className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Create Dialog */}
      <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New Announcement</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Message</Label><Textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} rows={4} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Priority</Label><ComboboxSelect value={form.priority} onValueChange={v => setForm({ ...form, priority: v })} options={["normal", "important", "urgent"]} allowCustom={false} /></div>
            <div><Label>Audience</Label><ComboboxSelect value={form.target_audience} onValueChange={v => setForm({ ...form, target_audience: v })} options={["all", "management", "staff", "field", "office"]} /></div>
          </div>
          <div><Label>Expiry Date (optional)</Label><Input type="date" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })} /></div>
          <div className="flex items-center gap-3">
            <Switch checked={form.pinned} onCheckedChange={v => setForm({ ...form, pinned: v })} />
            <Label>Pin to top</Label>
          </div>
          <Button className="w-full h-9" onClick={() => save.mutate()} disabled={!form.title || save.isPending}>{save.isPending ? "Posting..." : "Post Announcement"}</Button>
        </div>
      </DialogContent></Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}><DialogContent>
        <DialogHeader><DialogTitle>{viewItem?.title}</DialogTitle></DialogHeader>
        {viewItem && (
          <div className="space-y-3">
            <div className="flex gap-2"><Badge className={`border-0 ${prioC[viewItem.priority] || ""}`}>{viewItem.priority}</Badge><Badge variant="outline">{viewItem.target_audience}</Badge>{viewItem.pinned && <Badge variant="outline"><Pin className="h-3 w-3 mr-1" />Pinned</Badge>}</div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewItem.message}</p>
            <p className="text-xs text-muted-foreground">Published: {format(new Date(viewItem.created_at), "dd MMM yyyy, HH:mm")}</p>
            {viewItem.expiry_date && <p className="text-xs text-muted-foreground">Expires: {format(new Date(viewItem.expiry_date), "dd MMM yyyy")}</p>}
          </div>
        )}
      </DialogContent></Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} onConfirm={() => deleteId && remove.mutate(deleteId)} title="Delete Announcement?" description="This announcement will be permanently removed." />
    </div>
  );
}
