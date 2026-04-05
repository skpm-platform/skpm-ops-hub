import {
  LayoutDashboard, FolderKanban, CheckSquare, Wrench, Calendar as CalendarIcon,
  Users, Clock, DollarSign, FileText, Settings, LogOut,
  Briefcase, Receipt, CreditCard, ShoppingCart, FileSignature,
  HardHat, Wallet, Package, Shield, GraduationCap, Building,
  MapPin, Megaphone, BarChart3, UserCheck, ClipboardList,
  Truck, Home, Monitor, Contact, UserMinus, Send, CalendarPlus,
  KeyRound, Timer, CalendarClock, Banknote, ChevronDown, UserCircle,
  ClipboardCheck, PieChart,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
import { useSystemSetting } from "@/hooks/use-system-settings";
import { useUserRole, useProfile } from "@/hooks/use-profile";
import { usePermissions } from "@/hooks/use-permissions";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarFooter, SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import skpmLogo from "@/assets/skpm-logo.png";

/* ── Types ── */
type NavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<any>;
  adminOnly?: boolean;
  managerUp?: boolean;
  badgeKey?: string;
};
type NavGroup = { label: string; items: NavItem[]; adminOnly?: boolean };

/* ── Navigation structure ── */
const navGroups: NavGroup[] = [
  { label: "Overview", items: [
    { title: "Dashboard",  url: "/",           icon: LayoutDashboard },
    { title: "My Profile", url: "/my-profile", icon: UserCircle },
    { title: "Approvals",  url: "/approvals",  icon: ClipboardCheck, managerUp: true, badgeKey: "pendingApprovals" },
  ]},
  { label: "Operations", items: [
    { title: "Projects",    url: "/projects",    icon: FolderKanban },
    { title: "Tasks",       url: "/tasks",       icon: CheckSquare,  badgeKey: "openTasks" },
    { title: "Work Orders", url: "/work-orders", icon: Wrench,       badgeKey: "openWorkOrders" },
    { title: "Maintenance", url: "/maintenance", icon: CalendarIcon },
  ]},
  { label: "Finance", items: [
    { title: "Finance",         url: "/finance",         icon: DollarSign,    managerUp: true },
    { title: "Quotations",      url: "/quotations",      icon: FileSignature },
    { title: "Invoices",        url: "/invoices",        icon: Receipt },
    { title: "Expenses",        url: "/expenses",        icon: CreditCard,    badgeKey: "pendingExpenses" },
    { title: "Purchase Orders", url: "/purchase-orders", icon: ShoppingCart,  managerUp: true },
  ]},
  { label: "Clients & Contracts", items: [
    { title: "Clients",   url: "/clients",   icon: Briefcase },
    { title: "Contracts", url: "/contracts", icon: FileText },
  ]},
  { label: "People", items: [
    { title: "Employees",   url: "/employees",  icon: Users },
    { title: "Attendance",  url: "/attendance", icon: Clock },
    { title: "Leave",       url: "/leave",      icon: UserMinus,  badgeKey: "pendingLeaves" },
    { title: "Manpower",    url: "/manpower",   icon: HardHat },
    { title: "Requisitions",url: "/requisitions",icon: Send },
    { title: "Deployments", url: "/deployments",icon: CalendarPlus },
    { title: "Payroll",     url: "/payroll",    icon: Wallet,     managerUp: true },
    { title: "Timesheets",  url: "/timesheets", icon: Timer },
    { title: "Duty Roster", url: "/duty-roster",icon: CalendarClock },
  ]},
  { label: "Site Access", items: [
    { title: "Gate Passes", url: "/gate-passes", icon: KeyRound },
    { title: "MP Billing",  url: "/mp-billing",  icon: Banknote, managerUp: true },
  ]},
  { label: "Assets & Inventory", items: [
    { title: "Assets",    url: "/assets",    icon: Package },
    { title: "Warehouse", url: "/warehouse", icon: Package },
  ]},
  { label: "HSE", items: [
    { title: "Health & Safety", url: "/hse",      icon: Shield,        badgeKey: "openHSE" },
    { title: "Training",        url: "/training",  icon: GraduationCap },
  ]},
  { label: "Facilities", items: [
    { title: "Facilities",    url: "/facilities",    icon: Building },
    { title: "Sites",         url: "/sites",         icon: MapPin },
    { title: "Accommodation", url: "/accommodation", icon: Home },
    { title: "Transport",     url: "/transport",     icon: Truck },
  ]},
  { label: "Communication", items: [
    { title: "Calendar",          url: "/calendar",          icon: CalendarIcon },
    { title: "Announcements",     url: "/announcements",     icon: Megaphone },
    { title: "Documents",         url: "/documents",         icon: FileText },
    { title: "Reports",           url: "/reports",           icon: BarChart3 },
    { title: "Financial Reports", url: "/financial-reports", icon: PieChart, managerUp: true },
  ]},
  { label: "IT & Admin", items: [
    { title: "Helpdesk",   url: "/helpdesk",    icon: Monitor },
    { title: "Visitor Log",url: "/visitor-log", icon: Contact },
  ]},
  { label: "Admin", adminOnly: true, items: [
    { title: "Members",    url: "/members",    icon: UserCheck,     adminOnly: true },
    { title: "Audit Logs", url: "/audit-logs", icon: ClipboardList, adminOnly: true },
    { title: "Settings",   url: "/settings",   icon: Settings,      adminOnly: true },
  ]},
];

/* ── Badge data hook ── */
function useSidebarBadges(isManagerUp: boolean) {
  const { data: badges } = useQuery({
    queryKey: ["sidebar-badges"],
    queryFn: async () => {
      const [leaves, expenses, workOrders, tasks, hse] = await Promise.all([
        supabase.from("leave_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("expenses").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("work_orders").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("tasks").select("id", { count: "exact", head: true }).neq("status", "done"),
        supabase.from("hse_incidents").select("id", { count: "exact", head: true }).eq("status", "open"),
      ]);
      const pendingApprovals = (leaves.count ?? 0) + (expenses.count ?? 0);
      return {
        pendingLeaves:   leaves.count ?? 0,
        pendingExpenses: expenses.count ?? 0,
        openWorkOrders:  workOrders.count ?? 0,
        openTasks:       tasks.count ?? 0,
        openHSE:         hse.count ?? 0,
        pendingApprovals,
      };
    },
    refetchInterval: 60000,
    enabled: isManagerUp,
  });
  return badges ?? {};
}

/* ══════════════════════════════════════════════
   AppSidebar
   ══════════════════════════════════════════════ */
export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut, user } = useAuth();
  const location = useLocation();
  const { data: companyLogoUrl } = useSystemSetting("company_logo_url");
  const { data: role }    = useUserRole();
  const { data: profile } = useProfile();
  const userRole     = role ?? "staff";
  const isAdmin      = userRole === "admin";
  const isManagerUp  = userRole === "admin" || userRole === "manager";
  const badges       = useSidebarBadges(isManagerUp);
  const { canAccess } = usePermissions();
  const logoSrc = companyLogoUrl || skpmLogo;

  const displayName = profile?.name || user?.email?.split("@")[0] || "User";
  const initials    = displayName.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase();
  const roleLabel   = userRole.charAt(0).toUpperCase() + userRole.slice(1);

  const isActive     = (url: string) => url === "/" ? location.pathname === "/" : location.pathname.startsWith(url);
  const groupHasActive = (items: { url: string }[]) => items.some(i => isActive(i.url));

  const filterItems = (items: NavItem[]) => items.filter(item => {
    if (item.adminOnly && !isAdmin)     return false;
    if (item.managerUp && !isManagerUp) return false;
    const moduleKey = item.url.replace("/", "");
    return canAccess(moduleKey);
  });

  const visibleGroups = navGroups
    .map(g => ({ ...g, items: filterItems(g.items) }))
    .filter(g => {
      if (g.adminOnly && !isAdmin) return false;
      return g.items.length > 0;
    });

  const getBadgeCount = (key?: string): number => {
    if (!key || !isManagerUp) return 0;
    return (badges as Record<string, number>)[key] ?? 0;
  };

  /* ── Role badge colors ── */
  const roleBadgeColor: Record<string, string> = {
    admin:   "bg-violet-500/20 text-violet-300 border border-violet-500/20",
    manager: "bg-blue-500/20 text-blue-300 border border-blue-500/20",
    staff:   "bg-slate-500/20 text-slate-400 border border-slate-500/20",
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">

      {/* ── Brand Header ── */}
      <SidebarHeader className="p-0">
        <div className="flex items-center gap-3 px-4 py-4">
          {/* Logo mark */}
          <div className="h-9 w-9 rounded-xl flex items-center justify-center p-1.5 shrink-0 relative"
            style={{
              background: "linear-gradient(135deg, rgba(99,102,241,0.3) 0%, rgba(129,140,248,0.15) 100%)",
              border: "1px solid rgba(129,140,248,0.25)",
              boxShadow: "0 2px 12px rgba(99,102,241,0.25)"
            }}
          >
            <img src={logoSrc} alt="SKPM" className="h-full w-full rounded-lg object-contain" />
          </div>

          {!collapsed && (
            <>
              <div className="flex flex-col leading-none min-w-0 flex-1">
                <span className="text-[13.5px] font-bold tracking-tight text-white/90 truncate">SKPM</span>
                <span className="text-[10px] text-sidebar-foreground/35 mt-0.5 font-medium truncate">Technical Services LLC</span>
              </div>
              {/* Live pill */}
              <div className="shrink-0 flex items-center gap-1.5 px-2 py-0.5 rounded-full"
                style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9px] text-emerald-400 font-black tracking-wider">LIVE</span>
              </div>
            </>
          )}
        </div>

        {/* Divider */}
        <div className="mx-4 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(129,140,248,0.2), transparent)" }} />
      </SidebarHeader>

      {/* ── Navigation ── */}
      <SidebarContent className="px-2.5 py-3 scrollbar-thin">
        {visibleGroups.map((group) => {
          const active = groupHasActive(group.items);

          /* Collapsed: show flat icons */
          if (collapsed) {
            return (
              <SidebarGroup key={group.label} className="py-1 px-0">
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => {
                      const count     = getBadgeCount(item.badgeKey);
                      const itemActive = isActive(item.url);
                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton asChild>
                            <NavLink
                              to={item.url}
                              end={item.url === "/"}
                              className="relative flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 text-sidebar-foreground/45 hover:text-sidebar-foreground/80 hover:bg-sidebar-accent"
                              activeClassName="text-white"
                              style={itemActive ? {
                                background: "linear-gradient(135deg, rgba(99,102,241,0.3), rgba(129,140,248,0.15))",
                                border: "1px solid rgba(129,140,248,0.25)",
                                boxShadow: "0 0 12px -2px rgba(99,102,241,0.3)"
                              } : undefined}
                            >
                              <item.icon className="h-[15px] w-[15px]" />
                              {count > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center px-1">
                                  {count > 99 ? "99+" : count}
                                </span>
                              )}
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          }

          /* Expanded: collapsible groups */
          return (
            <Collapsible key={group.label} defaultOpen={active || group.label === "Overview"}>
              <SidebarGroup className="py-0.5 px-0">
                <CollapsibleTrigger
                  className="flex w-full items-center justify-between px-3 py-1.5 rounded-lg group hover:bg-sidebar-accent/40 transition-colors duration-200"
                >
                  <span className="text-[9.5px] font-black uppercase tracking-[0.15em]"
                    style={{ color: "rgba(250,245,255,0.22)" }}
                  >
                    {group.label}
                  </span>
                  <ChevronDown className="h-3 w-3 transition-transform duration-300 group-data-[state=open]:rotate-180"
                    style={{ color: "rgba(250,245,255,0.18)" }}
                  />
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {group.items.map((item) => {
                        const count     = getBadgeCount(item.badgeKey);
                        const itemActive = isActive(item.url);

                        return (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton asChild>
                              <NavLink
                                to={item.url}
                                end={item.url === "/"}
                                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12.5px] font-medium transition-all duration-150 group/item"
                                activeClassName=""
                                style={itemActive ? {
                                  background: "linear-gradient(135deg, rgba(99,102,241,0.22) 0%, rgba(129,140,248,0.1) 100%)",
                                  color: "rgba(248,250,255,0.95)",
                                  borderLeft: "2.5px solid rgba(129,140,248,0.8)",
                                  paddingLeft: "calc(0.75rem - 2.5px)",
                                } : {
                                  color: "rgba(248,250,255,0.5)",
                                  borderLeft: "2.5px solid transparent",
                                  paddingLeft: "calc(0.75rem - 2.5px)",
                                }}
                              >
                                <item.icon
                                  className="h-[15px] w-[15px] shrink-0 transition-colors duration-150"
                                  style={{ color: itemActive ? "rgba(129,140,248,1)" : "rgba(248,250,255,0.3)" }}
                                />
                                <span className="flex-1 truncate">{item.title}</span>
                                {count > 0 && (
                                  <span className={`ml-auto h-[18px] min-w-[22px] rounded-full text-[10px] font-bold flex items-center justify-center px-1.5 tabular-nums ${count > 5 ? "bg-red-500/20 text-red-400" : "bg-amber-400/15 text-amber-400"}`}>
                                    {count > 99 ? "99+" : count}
                                  </span>
                                )}
                              </NavLink>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          );
        })}
      </SidebarContent>

      {/* ── Footer ── */}
      <div className="mx-4 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(129,140,248,0.2), transparent)" }} />

      <SidebarFooter className="p-3 space-y-1.5">

        {/* User profile card */}
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl transition-colors duration-200"
            style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(129,140,248,0.15)" }}
          >
            <Avatar className="h-8 w-8 shrink-0 ring-2" style={{ "--tw-ring-color": "rgba(99,102,241,0.3)" } as any}>
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback className="text-[10.5px] font-bold"
                style={{ background: "rgba(99,102,241,0.25)", color: "rgba(165,180,252,1)" }}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col leading-none min-w-0 flex-1">
              <span className="text-[12.5px] font-semibold truncate" style={{ color: "rgba(250,245,255,0.88)" }}>
                {displayName}
              </span>
              <span className={`text-[9.5px] font-bold mt-0.5 px-1.5 py-0.5 rounded-full w-fit ${roleBadgeColor[userRole] ?? roleBadgeColor.staff}`}>
                {roleLabel}
              </span>
            </div>
          </div>
        )}

        {/* Sign out */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={signOut}
              className="rounded-xl py-2 transition-all duration-200 group/out"
              style={{ color: "rgba(250,245,255,0.35)" }}
            >
              <LogOut className="h-[15px] w-[15px] shrink-0 group-hover/out:text-red-400 transition-colors duration-200" />
              {!collapsed && (
                <span className="text-[12.5px] font-medium group-hover/out:text-red-400 transition-colors duration-200 ml-2.5">
                  Sign Out
                </span>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
