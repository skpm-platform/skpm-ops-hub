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
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import skpmLogo from "@/assets/skpm-logo.png";

type NavItem = { title: string; url: string; icon: React.ComponentType<any>; adminOnly?: boolean; managerUp?: boolean; badgeKey?: string };
type NavGroup = { label: string; items: NavItem[]; adminOnly?: boolean };

const navGroups: NavGroup[] = [
  { label: "Overview", items: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "My Profile", url: "/my-profile", icon: UserCircle },
    { title: "Approvals", url: "/approvals", icon: ClipboardCheck, managerUp: true, badgeKey: "pendingApprovals" },
  ]},
  { label: "Operations", items: [
    { title: "Projects", url: "/projects", icon: FolderKanban },
    { title: "Tasks", url: "/tasks", icon: CheckSquare, badgeKey: "openTasks" },
    { title: "Work Orders", url: "/work-orders", icon: Wrench, badgeKey: "openWorkOrders" },
    { title: "Maintenance", url: "/maintenance", icon: CalendarIcon },
  ]},
  { label: "Finance", items: [
    { title: "Finance", url: "/finance", icon: DollarSign, managerUp: true },
    { title: "Quotations", url: "/quotations", icon: FileSignature },
    { title: "Invoices", url: "/invoices", icon: Receipt },
    { title: "Expenses", url: "/expenses", icon: CreditCard, badgeKey: "pendingExpenses" },
    { title: "Purchase Orders", url: "/purchase-orders", icon: ShoppingCart, managerUp: true },
  ]},
  { label: "Clients & Contracts", items: [
    { title: "Clients", url: "/clients", icon: Briefcase },
    { title: "Contracts", url: "/contracts", icon: FileText },
  ]},
  { label: "People", items: [
    { title: "Employees", url: "/employees", icon: Users },
    { title: "Attendance", url: "/attendance", icon: Clock },
    { title: "Leave", url: "/leave", icon: UserMinus, badgeKey: "pendingLeaves" },
    { title: "Manpower", url: "/manpower", icon: HardHat },
    { title: "Requisitions", url: "/requisitions", icon: Send },
    { title: "Deployments", url: "/deployments", icon: CalendarPlus },
    { title: "Payroll", url: "/payroll", icon: Wallet, managerUp: true },
    { title: "Timesheets", url: "/timesheets", icon: Timer },
    { title: "Duty Roster", url: "/duty-roster", icon: CalendarClock },
  ]},
  { label: "Site Access", items: [
    { title: "Gate Passes", url: "/gate-passes", icon: KeyRound },
    { title: "MP Billing", url: "/mp-billing", icon: Banknote, managerUp: true },
  ]},
  { label: "Assets & Inventory", items: [
    { title: "Assets", url: "/assets", icon: Package },
    { title: "Warehouse", url: "/warehouse", icon: Package },
  ]},
  { label: "HSE", items: [
    { title: "Health & Safety", url: "/hse", icon: Shield, badgeKey: "openHSE" },
    { title: "Training", url: "/training", icon: GraduationCap },
  ]},
  { label: "Facilities", items: [
    { title: "Facilities", url: "/facilities", icon: Building },
    { title: "Sites", url: "/sites", icon: MapPin },
    { title: "Accommodation", url: "/accommodation", icon: Home },
    { title: "Transport", url: "/transport", icon: Truck },
  ]},
  { label: "Communication", items: [
    { title: "Calendar", url: "/calendar", icon: CalendarIcon },
    { title: "Announcements", url: "/announcements", icon: Megaphone },
    { title: "Documents", url: "/documents", icon: FileText },
    { title: "Reports", url: "/reports", icon: BarChart3 },
    { title: "Financial Reports", url: "/financial-reports", icon: PieChart, managerUp: true },
  ]},
  { label: "IT & Admin", items: [
    { title: "Helpdesk", url: "/helpdesk", icon: Monitor },
    { title: "Visitor Log", url: "/visitor-log", icon: Contact },
  ]},
  { label: "Admin", adminOnly: true, items: [
    { title: "Members", url: "/members", icon: UserCheck, adminOnly: true },
    { title: "Audit Logs", url: "/audit-logs", icon: ClipboardList, adminOnly: true },
    { title: "Settings", url: "/settings", icon: Settings, adminOnly: true },
  ]},
];

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
        pendingLeaves: leaves.count ?? 0,
        pendingExpenses: expenses.count ?? 0,
        openWorkOrders: workOrders.count ?? 0,
        openTasks: tasks.count ?? 0,
        openHSE: hse.count ?? 0,
        pendingApprovals,
      };
    },
    refetchInterval: 60000,
    enabled: isManagerUp,
  });
  return badges ?? {};
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut, user } = useAuth();
  const location = useLocation();
  const { data: companyLogoUrl } = useSystemSetting("company_logo_url");
  const { data: role } = useUserRole();
  const { data: profile } = useProfile();
  const userRole = role ?? "staff";
  const isAdmin = userRole === "admin";
  const isManagerUp = userRole === "admin" || userRole === "manager";
  const badges = useSidebarBadges(isManagerUp);
  const { canAccess } = usePermissions();

  const logoSrc = companyLogoUrl || skpmLogo;

  const displayName = profile?.name || user?.email?.split("@")[0] || "User";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase();
  const roleLabel = userRole.charAt(0).toUpperCase() + userRole.slice(1);

  const isActive = (url: string) => url === "/" ? location.pathname === "/" : location.pathname.startsWith(url);
  const groupHasActive = (items: { url: string }[]) => items.some((i) => isActive(i.url));

  const filterItems = (items: NavItem[]) => items.filter(item => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.managerUp && !isManagerUp) return false;
    const moduleKey = item.url.replace("/", "");
    return canAccess(moduleKey);
  });

  const visibleGroups = navGroups.map(g => ({
    ...g,
    items: filterItems(g.items),
  })).filter(g => {
    if (g.adminOnly && !isAdmin) return false;
    return g.items.length > 0;
  });

  const getBadgeCount = (key?: string): number => {
    if (!key || !isManagerUp) return 0;
    return (badges as Record<string, number>)[key] ?? 0;
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      {/* ── Premium Header ── */}
      <SidebarHeader className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-white/12 to-white/[0.04] backdrop-blur-sm flex items-center justify-center p-1.5 shrink-0 ring-1 ring-white/[0.08] shadow-lg shadow-black/30">
            <img src={logoSrc} alt="SKPM" className="h-full w-full rounded-lg object-contain" />
          </div>
          {!collapsed && (
            <>
              <div className="flex flex-col leading-none min-w-0">
                <span className="text-[13px] font-bold tracking-tight text-white truncate">SKPM</span>
                <span className="text-[10px] text-sidebar-foreground/38 mt-0.5 font-medium truncate">Technical Services LLC</span>
              </div>
              <div className="ml-auto shrink-0">
                <span className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[9px] text-emerald-400 font-bold tracking-wide">LIVE</span>
                </span>
              </div>
            </>
          )}
        </div>
      </SidebarHeader>

      <div className="mx-3.5 h-px bg-gradient-to-r from-transparent via-sidebar-border/50 to-transparent" />

      {/* ── Navigation ── */}
      <SidebarContent className="px-2.5 py-3 scrollbar-thin">
        {visibleGroups.map((group) => {
          const active = groupHasActive(group.items);

          if (collapsed) {
            return (
              <SidebarGroup key={group.label} className="py-1">
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => {
                      const count = getBadgeCount(item.badgeKey);
                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton asChild>
                            <NavLink
                              to={item.url}
                              end={item.url === "/"}
                              className="text-sidebar-foreground/55 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200 rounded-xl relative"
                              activeClassName="bg-sidebar-primary/20 text-sidebar-primary shadow-sm"
                            >
                              <item.icon className="h-4 w-4" />
                              {count > 0 && (
                                <span className="absolute -top-1 -right-1 h-4 min-w-[16px] rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center px-1 shadow-sm animate-pulse-soft">
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

          return (
            <Collapsible key={group.label} defaultOpen={active || group.label === "Overview"}>
              <SidebarGroup className="py-0.5">
                <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-1.5 group rounded-lg hover:bg-sidebar-accent/30 transition-colors duration-200">
                  <span className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-sidebar-foreground/28 group-hover:text-sidebar-foreground/50 transition-colors">
                    {group.label}
                  </span>
                  <ChevronDown className="h-3 w-3 text-sidebar-foreground/20 transition-transform duration-300 group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {group.items.map((item) => {
                        const count = getBadgeCount(item.badgeKey);
                        const itemActive = isActive(item.url);
                        return (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton asChild>
                              <NavLink
                                to={item.url}
                                end={item.url === "/"}
                                className="text-[12.5px] text-sidebar-foreground/60 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground transition-all duration-150 rounded-xl px-3 py-2 group/item"
                                activeClassName="bg-gradient-to-r from-sidebar-primary/22 via-sidebar-primary/12 to-transparent text-white font-semibold border-l-[2.5px] border-sidebar-primary/80"
                              >
                                <item.icon className={`mr-2.5 h-[15px] w-[15px] shrink-0 transition-colors duration-150 ${itemActive ? "text-sidebar-primary" : "text-sidebar-foreground/38 group-hover/item:text-sidebar-foreground/65"}`} />
                                <span className="flex-1 truncate">{item.title}</span>
                                {count > 0 && (
                                  <span className={`ml-auto h-5 min-w-[22px] rounded-full text-[10px] font-bold flex items-center justify-center px-1.5 tabular-nums shadow-sm ${count > 5 ? "bg-destructive/20 text-destructive" : "bg-amber-500/15 text-amber-400"}`}>
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

      <div className="mx-3.5 h-px bg-gradient-to-r from-transparent via-sidebar-border/50 to-transparent" />

      {/* ── Footer: User profile + Sign out ── */}
      <SidebarFooter className="p-3 space-y-1">
        {/* User profile card */}
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-sidebar-accent/40 border border-sidebar-border/40 mb-1">
            <Avatar className="h-7 w-7 ring-1 ring-sidebar-primary/30 shrink-0">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback className="bg-sidebar-primary/20 text-sidebar-primary text-[10px] font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col leading-none min-w-0 flex-1">
              <span className="text-[12px] font-semibold text-sidebar-foreground/85 truncate">{displayName}</span>
              <span className="text-[10px] text-sidebar-foreground/32 mt-0.5 font-medium truncate">{roleLabel}</span>
            </div>
          </div>
        )}

        {/* Sign out button */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={signOut}
              className="text-[12.5px] text-sidebar-foreground/45 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 rounded-xl py-2"
            >
              <LogOut className="mr-2.5 h-[15px] w-[15px] shrink-0" />
              {!collapsed && <span>Sign Out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
