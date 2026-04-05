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

/* ══════════════════════════════════════════════════════════════
   AppLayout — Professional application shell
   Figma / Lovable grade header with glass effect, user profile,
   and smooth page transitions. All logic preserved.
   ══════════════════════════════════════════════════════════════ */
export function AppLayout() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: role }    = useUserRole();
  const location          = useLocation();

  const displayName = profile?.name || user?.email?.split("@")[0] || "User";
  const initials    = displayName.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase();
  const roleLabel   = role ? role.charAt(0).toUpperCase() + role.slice(1) : "Staff";

  /* Role badge appearance */
  const roleMeta: Record<string, { label: string; class: string }> = {
    Admin:   { label: "Admin",   class: "bg-violet-500/12 text-violet-600 dark:text-violet-400 border-violet-300/40 dark:border-violet-500/25 ring-violet-500/10" },
    Manager: { label: "Manager", class: "bg-blue-500/12 text-blue-600 dark:text-blue-400 border-blue-300/40 dark:border-blue-500/25 ring-blue-500/10" },
    Staff:   { label: "Staff",   class: "bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-300/40 dark:border-slate-500/25 ring-slate-500/10" },
  };
  const badge = roleMeta[roleLabel] ?? roleMeta["Staff"];

  useIdleTimeout();
  useKeyboardShortcuts();

  return (
    <SidebarProvider>
      <AppSidebar />

      <div className="flex-1 flex flex-col min-h-svh overflow-hidden">

        {/* ══════════════════════════════
            Sticky Glass Header
            ══════════════════════════════ */}
        <header className="sticky top-0 z-30 h-[56px] border-b border-border/40 bg-background/80 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/65">

          {/* Gradient accent line at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-px"
            style={{
              background: "linear-gradient(90deg, transparent 0%, hsl(var(--primary)/0.25) 40%, hsl(290 70% 60% / 0.2) 60%, transparent 100%)"
            }}
          />

          <div className="flex items-center justify-between h-full px-4 sm:px-5 gap-3">

            {/* ── Left ── */}
            <div className="flex items-center gap-2.5 min-w-0">
              <SidebarTrigger
                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all duration-200 shrink-0"
              />
              <Separator orientation="vertical" className="h-5 opacity-30 hidden sm:block" />
              <div className="hidden sm:block">
                <GlobalSearch />
              </div>
            </div>

            {/* ── Right ── */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Mobile search */}
              <div className="sm:hidden">
                <GlobalSearch />
              </div>

              <ThemeToggle />
              <NotificationBell />

              <Separator orientation="vertical" className="h-5 opacity-30 hidden sm:block mx-0.5" />

              {/* User chip */}
              <div className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl hover:bg-secondary/50 transition-colors duration-200 cursor-default group">
                <div className="relative">
                  <Avatar className="h-7 w-7 ring-2 ring-primary/20 ring-offset-1 ring-offset-background transition-all duration-200 group-hover:ring-primary/35">
                    <AvatarImage src={profile?.avatar_url} />
                    <AvatarFallback
                      className="text-[10.5px] font-bold"
                      style={{ background: "linear-gradient(135deg, hsl(var(--primary)/0.2), hsl(290 70% 60% / 0.15))", color: "hsl(var(--primary))" }}
                    >
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  {/* Online dot */}
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-background" />
                </div>

                <div className="hidden md:flex flex-col gap-0.5 leading-none">
                  <span className="text-[13px] font-semibold text-foreground/90 leading-none truncate max-w-[120px]">
                    {displayName}
                  </span>
                  <span className={`text-[9.5px] font-bold leading-none mt-0.5 px-1.5 py-0.5 rounded-full border w-fit ${badge.class}`}>
                    {badge.label}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ══════════════════════════════
            Main content
            ══════════════════════════════ */}
        <main className="flex-1 overflow-y-auto">
          <div className="gradient-mesh min-h-full">
            {/*
              key=location.pathname triggers the fade-in animation
              on every route change — smooth page transitions.
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

        {/* Mobile bottom nav */}
        <MobileBottomNav />
      </div>
    </SidebarProvider>
  );
}
