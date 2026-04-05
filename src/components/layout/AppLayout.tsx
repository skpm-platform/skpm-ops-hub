import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, useUserRole } from "@/hooks/use-profile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/NotificationBell";
import { GlobalSearch } from "@/components/GlobalSearch";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useIdleTimeout } from "@/hooks/use-idle-timeout";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { MobileBottomNav } from "./MobileBottomNav";

// ============================================================================
// AppLayout — Main application shell with sidebar, header, mobile bottom nav,
// and a subtle page-transition animation on the content area.
// All existing functionality is preserved; improvements are additive only.
// ============================================================================

export function AppLayout() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: role } = useUserRole();
  const location = useLocation();

  const displayName =
    profile?.name || user?.email?.split("@")[0] || "User";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
  const roleLabel = role
    ? role.charAt(0).toUpperCase() + role.slice(1)
    : "Staff";

  const roleBadgeStyle: Record<string, string> = {
    Admin: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-200/60 dark:border-violet-500/25",
    Manager: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200/60 dark:border-blue-500/25",
    Staff: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-200/60 dark:border-slate-500/25",
  };

  useIdleTimeout();
  useKeyboardShortcuts();

  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="flex-1 flex flex-col min-h-svh overflow-hidden">

        {/* ─────────────── Premium Sticky Header ─────────────── */}
        <header className="sticky top-0 z-30 h-14 border-b border-border/50 bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
          {/* Subtle gradient accent at bottom of header */}
          <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

          <div className="flex items-center justify-between h-full px-4 sm:px-6">
            {/* Left section */}
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-200" />
              <Separator orientation="vertical" className="h-5 hidden sm:block opacity-40" />
              <div className="hidden sm:block">
                <GlobalSearch />
              </div>
            </div>

            {/* Right section */}
            <div className="flex items-center gap-2">
              <div className="sm:hidden">
                <GlobalSearch />
              </div>
              <ThemeToggle />
              <NotificationBell />
              <Separator orientation="vertical" className="h-5 mx-1 hidden sm:block opacity-40" />

              {/* User profile chip */}
              <div className="flex items-center gap-2.5 pl-1 py-1 pr-2 rounded-xl hover:bg-muted/50 transition-colors duration-200 cursor-default">
                <Avatar className="h-7 w-7 ring-2 ring-primary/20">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-violet-500/15 text-primary text-[10px] font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:flex flex-col gap-0.5">
                  <span className="text-[13px] font-semibold leading-none text-foreground/90">
                    {displayName}
                  </span>
                  <span className={`text-[9.5px] font-bold leading-none px-1.5 py-0.5 rounded-full border w-fit ${roleBadgeStyle[roleLabel] ?? roleBadgeStyle["Staff"]}`}>
                    {roleLabel}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ─────────────── Main content ─────────────── */}
        <main className="flex-1 overflow-y-auto">
          <div className="gradient-mesh min-h-full">
            {/*
              Page transition: re-mount the animation wrapper when route
              changes using location.pathname as key. This triggers the
              fade-in-up CSS animation on each navigation.
            */}
            <div
              key={location.pathname}
              className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto pb-20 sm:pb-8 animate-fade-in"
              style={{ animationDuration: "0.3s" }}
            >
              <Outlet />
            </div>
          </div>
        </main>

        {/* ─────────────── Mobile bottom nav ─────────────── */}
        <MobileBottomNav />
      </div>
    </SidebarProvider>
  );
}
