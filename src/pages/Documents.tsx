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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { ComboboxSelect } from "@/components/ComboboxSelect";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ExportButton } from "@/components/ExportButton";
import { StatusFilter, buildStatuses } from "@/components/StatusFilter";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTablePagination } from "@/components/DataTablePagination";
import { SortableHeader } from "@/components/SortableHeader";
import { Plus, FileText, Download, Search, Trash2, Upload, Loader2, Eye, File, Image, FileSpreadsheet , AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const categories = ["Reports", "Contracts", "Invoices", "Manuals", "Certificates", "Policies", "Templates", "Other"];

const iconForCategory = (cat: string) => {
  if (cat === "Invoices" || cat === "Reports") return FileSpreadsheet;
  if (cat === "Contracts" || cat === "Policies") return FileText;
  return File;
};

export default function Documents() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewItem, setViewItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", category: "Reports" });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: docs = [], isLoading , isError: dataLoadError} = useQuery({
    queryKey: ["documents"],
    queryFn: async () => { const { data, error } = await supabase.from("documents").select("*").order("created_at", { ascending: false }); if (error) throw error; return data ?? []; },
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
      const { error } = await supabase.from("documents").insert({ name: form.name, category: form.category, file_url: fileUrl, uploaded_by: user.id });
      if (error) throw error;
      await logAudit("Uploaded document", form.name, "documents");
      qc.invalidateQueries({ queryKey: ["documents"] });
      setDialogOpen(false); setForm({ name: "", category: "Reports" }); setFile(null);
      toast.success("Document uploaded");
    } catch (e: any) { toast.error(e.message); }
    setUploading(false);
  };

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("documents").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["documents"] }); toast.success("Deleted"); setDeleteId(null); },
  });

  const catCounts = docs.reduce((acc: Record<string, number>, d) => { acc[d.category || "Other"] = (acc[d.category || "Other"] || 0) + 1; return acc; }, {});
  const statusList = buildStatuses(catCounts, categories);

  const filtered = docs.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === "all" || d.category === catFilter;
    return matchSearch && matchCat;
  });

  const { pageData, page, totalPages, totalItems, setPage, toggleSort, getSortDirection, pageSize } = useDataTable(filtered);

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
        <div><h1 className="text-2xl font-bold">Documents</h1><p className="text-muted-foreground">Manage files and documents</p></div>
        <div className="flex gap-2">
          <ExportButton data={docs} filename="documents" columns={[{ key: "name", label: "Name" }, { key: "category", label: "Category" }, { key: "created_at", label: "Date" }]} />
          <Button size="sm" className="h-9" onClick={() => setDialogOpen(true)}><Plus className="mr-1 h-4 w-4" />Upload Document</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Docs</p><p className="text-2xl font-semibold mt-1">{docs.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Reports</p><p className="text-2xl font-semibold mt-1">{catCounts["Reports"] || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Contracts</p><p className="text-2xl font-semibold mt-1">{catCounts["Contracts"] || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Certificates</p><p className="text-2xl font-semibold mt-1">{catCounts["Certificates"] || 0}</p></CardContent></Card>
      </div>

      <StatusFilter statuses={statusList} selected={catFilter} onSelect={setCatFilter} />

      <Card>
        <CardHeader className="pb-3">
          <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search documents..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : (
            <>
              <Table><TableHeader><TableRow>
                <SortableHeader label="Name" sortKey="name" direction={getSortDirection("name")} onToggle={toggleSort} />
                <SortableHeader label="Category" sortKey="category" direction={getSortDirection("category")} onToggle={toggleSort} className="hidden sm:table-cell" />
                <SortableHeader label="Date" sortKey="created_at" direction={getSortDirection("created_at")} onToggle={toggleSort} />
                <SortableHeader label="Actions" sortKey="" direction={null} onToggle={() => {}} className="w-28" />
              </TableRow></TableHeader>
                <TableBody>
                  {pageData.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No documents</TableCell></TableRow> : pageData.map((doc: any) => {
                    const Icon = iconForCategory(doc.category || "Other");
                    return (
                      <TableRow key={doc.id}>
                        <TableCell><div className="flex items-center gap-2"><Icon className="h-4 w-4 text-primary shrink-0" /><span className="font-medium">{doc.name}</span></div></TableCell>
                        <TableCell className="hidden sm:table-cell"><Badge variant="secondary" className="border-0">{doc.category}</Badge></TableCell>
                        <TableCell className="text-muted-foreground">{format(new Date(doc.created_at), "dd MMM yyyy")}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewItem(doc)}><Eye className="h-4 w-4" /></Button>
                            {doc.file_url && <Button variant="ghost" size="icon" className="h-8 w-8" asChild><a href={doc.file_url} target="_blank" rel="noopener noreferrer"><Download className="h-4 w-4" /></a></Button>}
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(doc.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
            </>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent>
        <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div><Label>Document Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g., Report Q1 2026" /></div>
          <div><Label>Category</Label><ComboboxSelect value={form.category} onValueChange={v => setForm({ ...form, category: v })} options={categories} /></div>
          <div>
            <Label>File</Label>
            <div className="relative">
              <input type="file" onChange={e => setFile(e.target.files?.[0] ?? null)} className="absolute inset-0 opacity-0 cursor-pointer" />
              <div className="border-2 border-dashed rounded-lg p-6 text-center text-muted-foreground text-sm hover:border-primary/50 transition-colors">
                <Upload className="h-6 w-6 mx-auto mb-2" />{file ? file.name : "Click or drag to upload"}
              </div>
            </div>
          </div>
          <Button onClick={handleUpload} className="w-full h-9" disabled={uploading || !form.name}>{uploading && <Loader2 className="animate-spin mr-2 h-4 w-4" />}Upload</Button>
        </div>
      </DialogContent></Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}><DialogContent>
        <DialogHeader><DialogTitle>{viewItem?.name}</DialogTitle></DialogHeader>
        {viewItem && (
          <div className="space-y-3">
            <Badge variant="secondary">{viewItem.category}</Badge>
            <p className="text-sm text-muted-foreground">Uploaded: {format(new Date(viewItem.created_at), "dd MMM yyyy, HH:mm")}</p>
            {viewItem.file_url && <Button size="sm" className="h-9" asChild><a href={viewItem.file_url} target="_blank" rel="noopener noreferrer"><Download className="h-4 w-4 mr-2" />Download File</a></Button>}
          </div>
        )}
      </DialogContent></Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} onConfirm={() => deleteId && remove.mutate(deleteId)} />
    </div>
  );
}
