import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, useUserRole } from "@/hooks/use-profile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/NotificationBell";
import { GlobalSearch } from "@/components/GlobalSearch";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Search, PanelLeft } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useIdleTimeout } from "@/hooks/use-idle-timeout";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

export function AppLayout() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: role } = useUserRole();
  const displayName = profile?.name || user?.email?.split("@")[0] || "User";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase();
  const roleLabel = role ? role.charAt(0).toUpperCase() + role.slice(1) : "Staff";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center justify-between border-b border-border bg-card px-3 shrink-0">
            <div className="flex items-center gap-1.5">
              <SidebarTrigger className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <PanelLeft className="h-4 w-4" />
              </SidebarTrigger>
              <Separator orientation="vertical" className="h-5 mx-1" />
              <Button
                variant="ghost"
                size="sm"
                className="hidden md:flex items-center gap-2 text-muted-foreground h-7 w-52 justify-start text-xs font-normal hover:bg-secondary rounded-sm border border-border"
                onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
              >
                <Search className="h-3 w-3" />
                <span>Search...</span>
                <kbd className="ml-auto text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">⌘K</kbd>
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <NotificationBell />
              <Separator orientation="vertical" className="h-5" />
              <div className="flex items-center gap-2 pl-1">
                <div className="hidden sm:flex flex-col items-end leading-none">
                  <span className="text-xs font-medium text-foreground">{displayName}</span>
                  <span className="text-[10px] text-muted-foreground">{roleLabel}</span>
                </div>
                <Avatar className="h-7 w-7">
                  {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={displayName} />}
                  <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </div>
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
