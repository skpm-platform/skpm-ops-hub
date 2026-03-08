import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusFilterProps {
  statuses: { value: string; label: string; count?: number }[];
  selected: string;
  onSelect: (value: string) => void;
}

export function StatusFilter({ statuses, selected, onSelect }: StatusFilterProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {statuses.map((s) => (
        <button
          key={s.value}
          onClick={() => onSelect(s.value)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors border",
            selected === s.value
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground"
          )}
        >
          {s.label}
          {s.count !== undefined && (
            <span className={cn(
              "inline-flex items-center justify-center h-4 min-w-4 rounded-full text-[10px] px-1",
              selected === s.value ? "bg-primary-foreground/20" : "bg-muted"
            )}>
              {s.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
