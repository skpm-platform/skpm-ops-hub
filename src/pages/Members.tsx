import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "inactive";
}

const initialMembers: Member[] = [
  { id: "1", name: "Ahmad Fauzi", email: "ahmad@skpm.com", role: "Technician", status: "active" },
  { id: "2", name: "Siti Rahayu", email: "siti@skpm.com", role: "Admin", status: "active" },
  { id: "3", name: "Budi Santoso", email: "budi@skpm.com", role: "Engineer", status: "active" },
  { id: "4", name: "Dewi Lestari", email: "dewi@skpm.com", role: "Manager", status: "inactive" },
];

export default function Members() {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [form, setForm] = useState<{ name: string; email: string; role: string; status: "active" | "inactive" }>({ name: "", email: "", role: "", status: "active" });

  const filtered = members.filter(
    (m) => m.name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = () => {
    if (!form.name || !form.email || !form.role) { toast.error("Fill all fields"); return; }
    if (editingMember) {
      setMembers(members.map((m) => (m.id === editingMember.id ? { ...m, ...form } : m)));
      toast.success("Member updated");
    } else {
      setMembers([...members, { ...form, id: Date.now().toString() }]);
      toast.success("Member added");
    }
    setDialogOpen(false);
    setEditingMember(null);
    setForm({ name: "", email: "", role: "", status: "active" });
  };

  const handleEdit = (m: Member) => {
    setEditingMember(m);
    setForm({ name: m.name, email: m.email, role: m.role, status: m.status });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setMembers(members.filter((m) => m.id !== id));
    toast.success("Member removed");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Members</h1>
          <p className="text-muted-foreground">Manage your team directory</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditingMember(null); setForm({ name: "", email: "", role: "", status: "active" }); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-1 h-4 w-4" /> Add Member</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingMember ? "Edit" : "Add"} Member</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="space-y-2"><Label>Role</Label><Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} /></div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v: "active" | "inactive") => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSave} className="w-full">Save</Button>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead className="hidden sm:table-cell">Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">{m.name.split(" ").map((n) => n[0]).join("")}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{m.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">{m.email}</TableCell>
                  <TableCell>{m.role}</TableCell>
                  <TableCell>
                    <Badge variant={m.status === "active" ? "default" : "secondary"} className={m.status === "active" ? "bg-success/15 text-success hover:bg-success/20 border-0" : ""}>
                      {m.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(m)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
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
