import { FileX, Inbox, Search, FolderOpen } from "lucide-react";

interface EmptyStateProps {
  icon?: "inbox" | "search" | "folder" | "file";
  title: string;
  description?: string;
  action?: React.ReactNode;
}

const iconMap = {
  inbox: Inbox,
  search: Search,
  folder: FolderOpen,
  file: FileX,
};

export function EmptyState({ icon = "inbox", title, description, action }: EmptyStateProps) {
  const Icon = iconMap[icon];
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
      {description && <p className="text-xs text-muted-foreground max-w-[260px]">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
