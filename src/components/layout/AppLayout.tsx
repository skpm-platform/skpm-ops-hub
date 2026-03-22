import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, useUserRole } from "@/hooks/use-profile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/NotificationBell";
import { GlobalSearch } from "@/components/GlobalSearch";
import { Button } from "@/components/ui/button";
import { Search, PanelLeft, Sparkles } from "lucide-react";
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
          {/* Premium Header */}
          <header className="h-[60px] flex items-center justify-between border-b border-border/40 bg-card/60 backdrop-blur-2xl px-3 sm:px-5 shrink-0 sticky top-0 z-30">
            <div className="flex items-center gap-2 sm:gap-3">
              <SidebarTrigger className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-secondary/80 rounded-xl transition-all duration-200">
                <PanelLeft className="h-4 w-4" />
              </SidebarTrigger>
              <Separator orientation="vertical" className="h-5 mx-0.5 hidden sm:block opacity-30" />
              {/* Desktop search bar */}
              <Button
                variant="ghost"
                size="sm"
                className="hidden md:flex items-center gap-2.5 text-muted-foreground h-9 w-64 justify-start text-xs font-normal hover:bg-secondary/60 rounded-xl border border-border/40 bg-muted/30 shadow-sm"
                onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
              >
                <Search className="h-3.5 w-3.5 opacity-50" />
                <span className="opacity-60">Search anything...</span>
                <kbd className="ml-auto text-[10px] bg-background/80 px-1.5 py-0.5 rounded-md font-mono text-muted-foreground/60 border border-border/40">⌘K</kbd>
              </Button>
              {/* Mobile search */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-9 w-9 text-muted-foreground hover:text-foreground rounded-xl"
                onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              <ThemeToggle />
              <NotificationBell />
              <Separator orientation="vertical" className="h-5 hidden sm:block opacity-20" />
              <div className="flex items-center gap-2.5 pl-1 cursor-pointer hover:bg-secondary/40 rounded-xl px-2.5 py-2 transition-all duration-200 -mr-1">
                <div className="hidden sm:flex flex-col items-end leading-none">
                  <span className="text-[13px] font-semibold text-foreground">{displayName}</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5 font-medium">{roleLabel}</span>
                </div>
                <div className="relative">
                  <Avatar className="h-8 w-8 ring-2 ring-primary/15 ring-offset-2 ring-offset-background shadow-sm">
                    {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={displayName} />}
                    <AvatarFallback className="bg-gradient-to-br from-primary via-primary to-info text-primary-foreground text-[10px] font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-card" />
                </div>
              </div>
            </div>
          </header>

          {/* Main content with gradient mesh background */}
          <main className="flex-1 overflow-auto p-3 sm:p-5 md:p-6 scrollbar-thin gradient-mesh">
            <Outlet />
          </main>
        </div>
      </div>
      <GlobalSearch />
    </SidebarProvider>
  );
}
