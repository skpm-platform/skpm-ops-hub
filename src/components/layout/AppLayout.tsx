import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, useUserRole } from "@/hooks/use-profile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/NotificationBell";
import { GlobalSearch } from "@/components/GlobalSearch";
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
  useIdleTimeout();
  useKeyboardShortcuts();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Enhanced header */}
          <header className="h-14 flex items-center justify-between border-b border-border/60 bg-card/80 backdrop-blur-xl px-3 sm:px-4 shrink-0 sticky top-0 z-30">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <SidebarTrigger className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors">
                <PanelLeft className="h-4 w-4" />
              </SidebarTrigger>
              <Separator orientation="vertical" className="h-5 mx-0.5 sm:mx-1 hidden sm:block" />
              <Button
                variant="ghost"
                size="sm"
                className="hidden md:flex items-center gap-2 text-muted-foreground h-8 w-56 justify-start text-xs font-normal hover:bg-secondary/80 rounded-lg border border-border/50 bg-secondary/30"
                onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
              >
                <Search className="h-3.5 w-3.5" />
                <span>Search anything...</span>
                <kbd className="ml-auto text-[10px] bg-background/80 px-1.5 py-0.5 rounded font-mono text-muted-foreground border border-border/50">⌘K</kbd>
              </Button>
              {/* Mobile search button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-9 w-9 text-muted-foreground hover:text-foreground"
                onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <ThemeToggle />
              <NotificationBell />
              <Separator orientation="vertical" className="h-5 hidden sm:block" />
              <div className="flex items-center gap-2 pl-1 cursor-pointer hover:bg-secondary/50 rounded-lg px-2 py-1.5 transition-colors -mr-1">
                <div className="hidden sm:flex flex-col items-end leading-none">
                  <span className="text-xs font-semibold text-foreground">{displayName}</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">{roleLabel}</span>
                </div>
                <Avatar className="h-8 w-8 ring-2 ring-primary/10 ring-offset-1 ring-offset-background">
                  {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={displayName} />}
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-[10px] font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </header>

          {/* Main content with better padding on mobile */}
          <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 scrollbar-thin">
            <Outlet />
          </main>
        </div>
      </div>
      <GlobalSearch />
    </SidebarProvider>
  );
}
