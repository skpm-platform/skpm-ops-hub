import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileUp, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CSVImportButtonProps {
  onImport: (rows: Record<string, string>[]) => Promise<void>;
  expectedColumns: string[];
  label?: string;
}

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map(h => h.replace(/^"|"$/g, "").trim());
  const rows = lines.slice(1).map(line => {
    const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = (values[i] || "").replace(/^"|"$/g, "").trim();
    });
    return obj;
  });
  return { headers, rows };
}

export function CSVImportButton({ onImport, expectedColumns, label = "Import CSV" }: CSVImportButtonProps) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<{ headers: string[]; rows: Record<string, string>[] } | null>(null);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".csv")) { toast.error("Please select a CSV file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("File must be under 5MB"); return; }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.rows.length === 0) { toast.error("No data rows found in CSV"); return; }
      if (parsed.rows.length > 500) { toast.error("Maximum 500 rows per import"); return; }
      setPreview(parsed);
      setOpen(true);
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const missingCols = preview ? expectedColumns.filter(c => !preview.headers.map(h => h.toLowerCase()).includes(c.toLowerCase())) : [];

  const handleImport = async () => {
    if (!preview) return;
    setImporting(true);
    try {
      await onImport(preview.rows);
      toast.success(`${preview.rows.length} records imported`);
      setOpen(false);
      setPreview(null);
    } catch (err: any) {
      toast.error(err.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <input type="file" ref={fileRef} accept=".csv" onChange={handleFile} className="hidden" />
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => fileRef.current?.click()}>
        <Upload className="h-3.5 w-3.5" />{label}
      </Button>
      <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) setPreview(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileUp className="h-5 w-5 text-primary" /> Import Preview</DialogTitle>
            <DialogDescription>{fileName} — {preview?.rows.length ?? 0} rows found</DialogDescription>
          </DialogHeader>
          {missingCols.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-warning bg-warning/10 p-2 rounded-md">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Missing columns: {missingCols.join(", ")}. These fields will be empty.</span>
            </div>
          )}
          <ScrollArea className="flex-1 max-h-[400px] border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  {preview?.headers.map(h => <TableHead key={h} className="text-xs">{h}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview?.rows.slice(0, 20).map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                    {preview.headers.map(h => <TableCell key={h} className="text-xs max-w-[150px] truncate">{row[h] || "—"}</TableCell>)}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {preview && preview.rows.length > 20 && (
              <p className="text-xs text-muted-foreground text-center py-2">Showing first 20 of {preview.rows.length} rows</p>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); setPreview(null); }}>Cancel</Button>
            <Button onClick={handleImport} disabled={importing} className="gap-2">
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {importing ? "Importing..." : `Import ${preview?.rows.length ?? 0} Records`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
