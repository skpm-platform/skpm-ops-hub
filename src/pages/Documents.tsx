import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, FileText, Download, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Document {
  id: string;
  name: string;
  category: string;
  size: string;
  uploadedBy: string;
  createdAt: Date;
}

const categories = ["Reports", "Contracts", "Invoices", "Manuals", "Certificates", "Other"];

const initialDocs: Document[] = [
  { id: "1", name: "Q1 Maintenance Report.pdf", category: "Reports", size: "2.4 MB", uploadedBy: "Ahmad", createdAt: new Date() },
  { id: "2", name: "Service Contract 2026.pdf", category: "Contracts", size: "1.1 MB", uploadedBy: "Siti", createdAt: new Date(Date.now() - 86400000 * 3) },
  { id: "3", name: "Safety Manual v3.pdf", category: "Manuals", size: "5.8 MB", uploadedBy: "Budi", createdAt: new Date(Date.now() - 86400000 * 7) },
  { id: "4", name: "Invoice #1024.pdf", category: "Invoices", size: "340 KB", uploadedBy: "Dewi", createdAt: new Date(Date.now() - 86400000 * 2) },
];

export default function Documents() {
  const [docs, setDocs] = useState(initialDocs);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", category: "Reports" });

  const filtered = docs.filter((d) => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = filterCategory === "all" || d.category === filterCategory;
    return matchSearch && matchCategory;
  });

  const handleUpload = () => {
    if (!form.name) { toast.error("Enter a document name"); return; }
    setDocs([{ id: Date.now().toString(), name: form.name, category: form.category, size: "1.0 MB", uploadedBy: "You", createdAt: new Date() }, ...docs]);
    setDialogOpen(false);
    setForm({ name: "", category: "Reports" });
    toast.success("Document uploaded");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-muted-foreground">Manage files and documents</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-1 h-4 w-4" /> Upload Document</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2"><Label>Document Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Report Q1 2026.pdf" /></div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>File</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center text-muted-foreground text-sm cursor-pointer hover:border-primary/50 transition-colors">
                  Click or drag to upload file
                </div>
              </div>
              <Button onClick={handleUpload} className="w-full">Upload</Button>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Category</TableHead>
                <TableHead className="hidden md:table-cell">Size</TableHead>
                <TableHead className="hidden md:table-cell">Uploaded By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-medium">{doc.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell"><Badge variant="secondary" className="border-0">{doc.category}</Badge></TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{doc.size}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{doc.uploadedBy}</TableCell>
                  <TableCell className="text-muted-foreground">{format(doc.createdAt, "dd MMM")}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => toast.info("Download started")}><Download className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { setDocs(docs.filter((d) => d.id !== doc.id)); toast.success("Deleted"); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
