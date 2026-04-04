import { useState, useEffect } from "react";
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
import { Plus, Megaphone, Pin, Trash2, Eye, Search, Loader2, Pencil, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format, isPast } from "date-fns";

const prioC: Record<string, string> = { normal: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", important: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", urgent: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" };

const LS_KEY = "read_announcements";
function getReadIds(): string[] { try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; } }
function markRead(id: string) { const ids = getReadIds(); if (!ids.includes(id)) { localStorage.setItem(LS_KEY, JSON.stringify([...ids, id])); } }

const emptyForm = { title: "", message: "", priority: "normal", target_audience: "all", pinned: false, expiry_date: "" };

export default function Announcements() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewItem, setViewItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showExpired, setShowExpired] = useState(false);
  const [readIds, setReadIds] = useState<string[]>(getReadIds());
  const [form, setForm] = useState(emptyForm);

  const { data = [], isLoading , isError: dataLoadError} = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => { const { data } = await supabase.from("announcements").select("*").order("pinned", { ascending: false }).order("created_at", { ascending: false }); return data || []; },
  });

  // Refresh readIds when data changes
  useEffect(() => { setReadIds(getReadIds()); }, [data.length]);

  const isExpired = (a: any) => a.expiry_date && isPast(new Date(a.expiry_date));

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, expiry_date: form.expiry_date || null, created_by: user?.id };
      if (editingId) {
        const { error } = await supabase.from("announcements").update({ title: form.title, message: form.message, priority: form.priority, target_audience: form.target_audience, pinned: form.pinned, expiry_date: form.expiry_date || null }).eq("id", editingId);
        if (error) throw error;
        await logAudit("Updated announcement", form.title, "announcements");
      } else {
        const { error } = await supabase.from("announcements").insert(payload);
        if (error) throw error;
        await logAudit("Posted announcement", form.title, "announcements");
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["announcements"] }); toast.success(editingId ? "Announcement updated" : "Announcement posted"); setOpen(false); setEditingId(null); setForm(emptyForm); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("announcements").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["announcements"] }); toast.success("Deleted"); setDeleteId(null); },
  });

  const handleView = (a: any) => {
    markRead(a.id);
    setReadIds(getReadIds());
    setViewItem(a);
  };

  const handleEdit = (a: any) => {
    setEditingId(a.id);
    setForm({ title: a.title || "", message: a.message || "", priority: a.priority || "normal", target_audience: a.target_audience || "all", pinned: a.pinned || false, expiry_date: a.expiry_date ? a.expiry_date.slice(0, 10) : "" });
    setOpen(true);
  };

  const unreadCount = data.filter((a: any) => !readIds.includes(a.id) && !isExpired(a)).length;

  const filtered = data
    .filter((a: any) => showExpired ? true : !isExpired(a))
    .filter((a: any) => a.title?.toLowerCase().includes(search.toLowerCase()) || a.message?.toLowerCase().includes(search.toLowerCase()));
  const pinnedCount = data.filter((a: any) => a.pinned).length;
  const urgentCount = data.filter((a: any) => a.priority === "urgent").length;
  const expiredCount = data.filter((a: any) => isExpired(a)).length;

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
        <div className="flex items-center gap-3">
          <Megaphone className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Announcements</h1>
            {unreadCount > 0 && <Badge className="bg-destructive text-destructive-foreground text-[10px] ml-1">{unreadCount} unread</Badge>}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ExportButton data={data} filename="announcements" columns={[{ key: "title", label: "Title" }, { key: "priority", label: "Priority" }, { key: "target_audience", label: "Audience" }, { key: "created_at", label: "Date" }]} />
          <Button size="sm" className="h-9" onClick={() => { setEditingId(null); setForm(emptyForm); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />New Announcement</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p><p className="text-2xl font-semibold mt-1">{data.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Pinned</p><p className="text-2xl font-semibold mt-1 text-primary">{pinnedCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Urgent</p><p className="text-2xl font-semibold mt-1 text-destructive">{urgentCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Unread</p><p className="text-2xl font-semibold mt-1 text-warning">{unreadCount}</p></CardContent></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search announcements..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <div className="flex items-center gap-2">
          <Switch checked={showExpired} onCheckedChange={setShowExpired} id="show-expired" />
          <Label htmlFor="show-expired" className="text-sm cursor-pointer">Show Expired ({expiredCount})</Label>
        </div>
      </div>

      {isLoading ? <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : filtered.length === 0 ? <Card><CardContent className="py-8 text-center text-muted-foreground">No announcements</CardContent></Card> : filtered.map((a: any) => {
        const expired = isExpired(a);
        const unread = !readIds.includes(a.id) && !expired;
        return (
          <Card key={a.id} className={`${a.pinned ? "border-primary" : ""} ${expired ? "opacity-60" : ""} ${unread ? "border-l-4 border-l-primary" : ""}`}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {a.pinned && <Pin className="h-4 w-4 text-primary shrink-0" />}
                    {unread && <div className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                    <h3 className="font-semibold text-lg">{a.title}</h3>
                    <Badge className={`border-0 ${prioC[a.priority] || ""}`}>{a.priority}</Badge>
                    <Badge variant="outline" className="text-[10px]">{a.target_audience}</Badge>
                    {expired && <Badge className="bg-destructive/15 text-destructive border-0 text-[10px]"><AlertTriangle className="h-2.5 w-2.5 mr-1" />Expired</Badge>}
                  </div>
                  <p className="text-muted-foreground line-clamp-2">{a.message}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {format(new Date(a.created_at), "dd MMM yyyy, HH:mm")}
                    {a.expiry_date && <> · Expires {format(new Date(a.expiry_date), "dd MMM yyyy")}</>}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleView(a)}><Eye className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(a)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { setEditingId(null); setForm(emptyForm); } }}><DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{editingId ? "Edit" : "New"} Announcement</DialogTitle></DialogHeader>
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
          <Button className="w-full h-9" onClick={() => save.mutate()} disabled={!form.title || save.isPending}>{save.isPending ? "Saving..." : editingId ? "Update Announcement" : "Post Announcement"}</Button>
        </div>
      </DialogContent></Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}><DialogContent>
        <DialogHeader><DialogTitle>{viewItem?.title}</DialogTitle></DialogHeader>
        {viewItem && (
          <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              <Badge className={`border-0 ${prioC[viewItem.priority] || ""}`}>{viewItem.priority}</Badge>
              <Badge variant="outline">{viewItem.target_audience}</Badge>
              {viewItem.pinned && <Badge variant="outline"><Pin className="h-3 w-3 mr-1" />Pinned</Badge>}
              {isExpired(viewItem) && <Badge className="bg-destructive/15 text-destructive border-0"><AlertTriangle className="h-3 w-3 mr-1" />Expired</Badge>}
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewItem.message}</p>
            <p className="text-xs text-muted-foreground">Published: {format(new Date(viewItem.created_at), "dd MMM yyyy, HH:mm")}</p>
            {viewItem.expiry_date && <p className="text-xs text-muted-foreground">Expires: {format(new Date(viewItem.expiry_date), "dd MMM yyyy")}</p>}
            <div className="flex gap-2 pt-2">
              <Button size="sm" variant="outline" className="gap-1" onClick={() => { setViewItem(null); handleEdit(viewItem); }}><Pencil className="h-3.5 w-3.5" />Edit</Button>
            </div>
          </div>
        )}
      </DialogContent></Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} onConfirm={() => deleteId && remove.mutate(deleteId)} title="Delete Announcement?" description="This announcement will be permanently removed." />
    </div>
  );
}
