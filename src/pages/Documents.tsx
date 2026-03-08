import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logAudit } from "@/lib/audit";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, FileText, Download, Search, Trash2, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const categories = ["Reports", "Contracts", "Invoices", "Manuals", "Certificates", "Other"];

export default function Documents() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", category: "Reports" });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: docs, isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("documents").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const handleUpload = async () => {
    if (!user || !form.name) { toast.error("Enter document name"); return; }
    setUploading(true);
    try {
      let fileUrl = null;
      if (file) {
        const ext = file.name.split(".").pop();
        const filePath = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("documents").getPublicUrl(filePath);
        fileUrl = urlData.publicUrl;
      }
      const { error } = await supabase.from("documents").insert({
        name: form.name,
        category: form.category,
        file_url: fileUrl,
        uploaded_by: user.id,
      });
      if (error) throw error;
      await logAudit("Uploaded document", form.name);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setDialogOpen(false);
      setForm({ name: "", category: "Reports" });
      setFile(null);
      toast.success("Document uploaded");
    } catch (e: any) {
      toast.error(e.message);
    }
    setUploading(false);
  };

  const deleteDoc = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("documents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = (docs ?? []).filter((d) => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = filterCategory === "all" || d.category === filterCategory;
    return matchSearch && matchCategory;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-muted-foreground">Manage files and documents</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" /> Upload Document</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2"><Label>Document Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Report Q1 2026.pdf" /></div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>File</Label>
                <div className="relative">
                  <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <div className="border-2 border-dashed rounded-lg p-6 text-center text-muted-foreground text-sm hover:border-primary/50 transition-colors">
                    <Upload className="h-6 w-6 mx-auto mb-2" />
                    {file ? file.name : "Click or drag to upload"}
                  </div>
                </div>
              </div>
              <Button onClick={handleUpload} className="w-full" disabled={uploading || !form.name}>
                {uploading && <Loader2 className="animate-spin mr-2 h-4 w-4" />} Upload
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search documents..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Category</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No documents yet.</TableCell></TableRow>
                ) : (
                  filtered.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary shrink-0" />
                          <span className="font-medium">{doc.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell"><Badge variant="secondary" className="border-0">{doc.category}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{format(new Date(doc.created_at), "dd MMM yyyy")}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {doc.file_url && (
                            <Button variant="ghost" size="icon" asChild><a href={doc.file_url} target="_blank" rel="noopener noreferrer"><Download className="h-4 w-4" /></a></Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => deleteDoc.mutate(doc.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
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
