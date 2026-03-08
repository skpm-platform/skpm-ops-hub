import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, X } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useState } from "react";

interface BulkActionsProps {
  selectedIds: string[];
  totalItems: number;
  onSelectAll: (checked: boolean) => void;
  onClearSelection: () => void;
  onBulkDelete?: () => void;
  allSelected: boolean;
  children?: React.ReactNode;
}

export function BulkActions({ selectedIds, totalItems, onSelectAll, onClearSelection, onBulkDelete, allSelected, children }: BulkActionsProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const count = selectedIds.length;

  if (count === 0) return null;

  return (
    <>
      <div className="flex items-center gap-3 px-3 py-2 bg-primary/5 border border-primary/20 rounded-md animate-fade-in">
        <Checkbox checked={allSelected} onCheckedChange={(c) => onSelectAll(!!c)} />
        <span className="text-sm font-medium text-foreground">{count} of {totalItems} selected</span>
        <div className="flex items-center gap-1.5 ml-auto">
          {children}
          {onBulkDelete && (
            <Button variant="destructive" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => setConfirmOpen(true)}>
              <Trash2 className="h-3 w-3" /> Delete ({count})
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onClearSelection}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
      {onBulkDelete && (
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={`Delete ${count} records?`}
          description={`This will permanently remove ${count} selected records. This action cannot be undone.`}
          onConfirm={() => { onBulkDelete(); setConfirmOpen(false); }}
        />
      )}
    </>
  );
}

// Hook for managing bulk selection
export function useBulkSelect(data: { id: string }[]) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggle = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAll = (checked: boolean) => {
    setSelectedIds(checked ? data.map(d => d.id) : []);
  };

  const clearSelection = () => setSelectedIds([]);

  const allSelected = data.length > 0 && selectedIds.length === data.length;
  const isSelected = (id: string) => selectedIds.includes(id);

  return { selectedIds, toggle, selectAll, clearSelection, allSelected, isSelected };
}
