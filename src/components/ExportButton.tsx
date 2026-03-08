import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { format } from "date-fns";

export interface ExportButtonProps {
  data: any[];
  filename: string;
  columns?: { key: string; label: string }[];
}

export function ExportButton({ data, filename, columns }: ExportButtonProps) {
  const exportCSV = () => {
    if (!data.length) { toast.error("No data to export"); return; }
    if (columns) {
      const header = columns.map(c => c.label).join(",") + "\n";
      const rows = data.map(row => columns.map(c => {
        const val = c.key.includes(".") ? c.key.split(".").reduce((o: any, k) => o?.[k], row) : row[c.key];
        return `"${String(val ?? "").replace(/"/g, '""')}"`;
      }).join(",")).join("\n");
      const blob = new Blob([header + rows], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${filename}-${format(new Date(), "yyyy-MM-dd")}.csv`; a.click();
      URL.revokeObjectURL(url);
    } else {
      // Auto-detect columns from first row
      const keys = Object.keys(data[0]).filter(k => typeof data[0][k] !== "object");
      const header = keys.join(",") + "\n";
      const rows = data.map(row => keys.map(k => `"${String(row[k] ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([header + rows], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${filename}-${format(new Date(), "yyyy-MM-dd")}.csv`; a.click();
      URL.revokeObjectURL(url);
    }
    toast.success("CSV exported");
  };

  const exportJSON = () => {
    if (!data.length) { toast.error("No data to export"); return; }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${filename}-${format(new Date(), "yyyy-MM-dd")}.json`; a.click();
    URL.revokeObjectURL(url);
    toast.success("JSON exported");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Download className="h-3.5 w-3.5" />Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={exportCSV}>Export CSV</DropdownMenuItem>
        <DropdownMenuItem onClick={exportJSON}>Export JSON</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
