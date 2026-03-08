import { useState, useRef, useEffect } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ComboboxSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  allowCustom?: boolean;
  className?: string;
}

export function ComboboxSelect({ value, onValueChange, options, placeholder = "Select or type...", allowCustom = true, className }: ComboboxSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));
  const selectedLabel = options.find(o => o.value === value)?.label || value;

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className={cn("w-full justify-between font-normal h-10", !value && "text-muted-foreground", className)}>
          <span className="truncate">{value ? selectedLabel : placeholder}</span>
          <div className="flex items-center gap-1 ml-2 shrink-0">
            {value && (
              <X className="h-3 w-3 opacity-50 hover:opacity-100" onClick={(e) => { e.stopPropagation(); onValueChange(""); }} />
            )}
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="p-2">
          <Input
            ref={inputRef}
            placeholder="Search or type custom..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && search && allowCustom) {
                onValueChange(search);
                setSearch("");
                setOpen(false);
              }
            }}
          />
        </div>
        <div className="max-h-48 overflow-y-auto">
          {filtered.map((option) => (
            <button
              key={option.value}
              className={cn(
                "flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors",
                value === option.value && "bg-accent"
              )}
              onClick={() => { onValueChange(option.value); setSearch(""); setOpen(false); }}
            >
              <Check className={cn("h-3.5 w-3.5 shrink-0", value === option.value ? "opacity-100" : "opacity-0")} />
              {option.label}
            </button>
          ))}
          {filtered.length === 0 && search && allowCustom && (
            <button
              className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent text-primary"
              onClick={() => { onValueChange(search); setSearch(""); setOpen(false); }}
            >
              + Use "{search}"
            </button>
          )}
          {filtered.length === 0 && !allowCustom && (
            <p className="px-3 py-2 text-xs text-muted-foreground">No results found</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
