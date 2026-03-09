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
import { useUserRole } from "@/hooks/use-profile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import skpmLogo from "@/assets/skpm-logo.png";

type NavItem = { title: string; url: string; icon: React.ComponentType<any>; adminOnly?: boolean; managerUp?: boolean; badgeKey?: string };
type NavGroup = { label: string; items: NavItem[]; adminOnly?: boolean };

const navGroups: NavGroup[] = [
  { label: "Overview", items: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "My Profile", url: "/my-profile", icon: UserCircle },
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
      return {
        pendingLeaves: leaves.count ?? 0,
        pendingExpenses: expenses.count ?? 0,
        openWorkOrders: workOrders.count ?? 0,
        openTasks: tasks.count ?? 0,
        openHSE: hse.count ?? 0,
      };
    },
    refetchInterval: 60000, // refresh every minute
    enabled: isManagerUp,
  });
  return badges ?? {};
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut } = useAuth();
  const location = useLocation();
  const { data: companyLogoUrl } = useSystemSetting("company_logo_url");
  const { data: role } = useUserRole();
  const userRole = role ?? "staff";
  const isAdmin = userRole === "admin";
  const isManagerUp = userRole === "admin" || userRole === "manager";
  const badges = useSidebarBadges(isManagerUp);

  const logoSrc = companyLogoUrl || skpmLogo;

  const isActive = (url: string) => url === "/" ? location.pathname === "/" : location.pathname.startsWith(url);
  const groupHasActive = (items: { url: string }[]) => items.some((i) => isActive(i.url));

  const filterItems = (items: NavItem[]) => items.filter(item => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.managerUp && !isManagerUp) return false;
    return true;
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
      <SidebarHeader className="px-4 py-5">
        <div className="flex items-center gap-3">
          <img src={logoSrc} alt="SKPM" className="h-8 w-8 shrink-0 rounded-md object-contain" />
          {!collapsed && (
            <div className="flex flex-col leading-none">
              <span className="text-[13px] font-semibold tracking-tight text-sidebar-accent-foreground">SKPM</span>
              <span className="text-[10px] text-sidebar-foreground mt-0.5">Technical Services LLC</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <Separator className="bg-sidebar-border mx-3 w-auto" />

      <SidebarContent className="px-2 py-2">
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
                              className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors rounded relative"
                              activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                            >
                              <item.icon className="h-4 w-4" />
                              {count > 0 && (
                                <span className="absolute -top-1 -right-1 h-4 min-w-[16px] rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center px-1">
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
                <CollapsibleTrigger className="flex w-full items-center justify-between px-2 py-1.5 group">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/50 group-hover:text-sidebar-foreground/70 transition-colors">
                    {group.label}
                  </span>
                  <ChevronDown className="h-3 w-3 text-sidebar-foreground/40 transition-transform group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent>
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
                                className="text-[13px] text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors rounded px-2 py-1.5"
                                activeClassName="bg-sidebar-primary/15 text-sidebar-primary font-medium border-l-2 border-sidebar-primary"
                              >
                                <item.icon className="mr-2.5 h-3.5 w-3.5 shrink-0" />
                                <span className="flex-1">{item.title}</span>
                                {count > 0 && (
                                  <span className="ml-auto h-5 min-w-[20px] rounded-full bg-destructive/15 text-destructive text-[10px] font-semibold flex items-center justify-center px-1.5">
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

      <Separator className="bg-sidebar-border mx-3 w-auto" />

      <SidebarFooter className="p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} className="text-[13px] text-sidebar-foreground hover:bg-destructive/15 hover:text-destructive transition-colors rounded">
              <LogOut className="mr-2.5 h-3.5 w-3.5" />
              {!collapsed && <span>Sign Out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}