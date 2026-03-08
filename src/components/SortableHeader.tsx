import React from "react";
import { TableHead } from "@/components/ui/table";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SortableHeaderProps {
  label: string;
  sortKey: string;
  direction: "asc" | "desc" | null;
  onToggle: (key: string) => void;
  className?: string;
}

export const SortableHeader = React.forwardRef<HTMLTableCellElement, SortableHeaderProps>(
  ({ label, sortKey, direction, onToggle, className }, ref) => {
    return (
      <TableHead
        ref={ref}
        className={cn("cursor-pointer select-none hover:text-foreground transition-colors", className)}
        onClick={() => onToggle(sortKey)}
      >
        <div className="flex items-center gap-1">
          {label}
          {direction === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : direction === "desc" ? (
            <ArrowDown className="h-3 w-3" />
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-30" />
          )}
        </div>
      </TableHead>
    );
  }
);

SortableHeader.displayName = "SortableHeader";
