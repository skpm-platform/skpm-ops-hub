import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/NotificationBell";
import { GlobalSearch } from "@/components/GlobalSearch";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export function AppLayout() {
  const { user } = useAuth();
  const initials = user?.email?.substring(0, 2).toUpperCase() ?? "U";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b bg-card px-4 shrink-0">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <Button variant="outline" size="sm" className="hidden md:flex items-center gap-2 text-muted-foreground h-8 w-56 justify-start"
                onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}>
                <Search className="h-3.5 w-3.5" />
                <span className="text-xs">Search... ⌘K</span>
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell />
              <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6">
            <Breadcrumbs />
            <Outlet />
          </main>
        </div>
      </div>
      <GlobalSearch />
    </SidebarProvider>
  );
}
