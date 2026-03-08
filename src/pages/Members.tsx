import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logAudit } from "@/lib/audit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Search, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Members() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", status: "active" });

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: roles } = useQuery({
    queryKey: ["all-roles"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("*");
      return data ?? [];
    },
  });

  const updateMember = useMutation({
    mutationFn: async ({ id, name, status }: { id: string; name: string; status: string }) => {
      const { error } = await supabase.from("profiles").update({ name, status }).eq("id", id);
      if (error) throw error;
      await logAudit("Updated member", `Updated ${name}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      toast.success("Member updated");
      setDialogOpen(false);
      setEditingId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const getRoleForUser = (userId: string) => {
    const role = roles?.find(r => r.user_id === userId);
    return role?.role ?? "staff";
  };

  const filtered = (profiles ?? []).filter(
    (m) => (m.name?.toLowerCase() ?? "").includes(search.toLowerCase())
  );

  const handleEdit = (profile: typeof filtered[0]) => {
    setEditingId(profile.id);
    setForm({ name: profile.name ?? "", status: profile.status ?? "active" });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!editingId || !form.name) { toast.error("Fill all fields"); return; }
    updateMember.mutate({ id: editingId, name: form.name, status: form.status });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Members</h1>
          <p className="text-muted-foreground">Manage your team directory</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditingId(null); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Member</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSave} className="w-full" disabled={updateMember.isPending}>
                {updateMember.isPending && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                Save
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search members..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-16">Edit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No members found. Sign up users to see them here.</TableCell></TableRow>
                ) : (
                  filtered.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {(m.name ?? "U").split(" ").map((n) => n[0]).join("").substring(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{m.name ?? "Unnamed"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="border-0 capitalize">{getRoleForUser(m.user_id)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={m.status === "active" ? "default" : "secondary"} className={m.status === "active" ? "bg-success/15 text-success hover:bg-success/20 border-0" : "border-0"}>
                          {m.status ?? "active"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(m)}><Pencil className="h-4 w-4" /></Button>
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
