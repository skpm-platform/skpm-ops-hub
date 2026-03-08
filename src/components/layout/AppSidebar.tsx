import {
  LayoutDashboard, FolderKanban, CheckSquare, Wrench, Calendar as CalendarIcon,
  Users, Clock, DollarSign, FileText, Settings, LogOut, Building2,
  Briefcase, Receipt, CreditCard, ShoppingCart, FileSignature,
  HardHat, Wallet, Package, Shield, GraduationCap, Building,
  MapPin, Megaphone, BarChart3, UserCheck, ClipboardList,
  Truck, Home, Monitor, Contact, UserMinus, Send, CalendarPlus,
  KeyRound, Timer, CalendarClock, Banknote,
} from "lucide-react";
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";

const navGroups = [
  { label: "Overview", items: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
  ]},
  { label: "Operations", items: [
    { title: "Projects", url: "/projects", icon: FolderKanban },
    { title: "Tasks", url: "/tasks", icon: CheckSquare },
    { title: "Work Orders", url: "/work-orders", icon: Wrench },
    { title: "Maintenance", url: "/maintenance", icon: CalendarIcon },
  ]},
  { label: "Finance", items: [
    { title: "Finance", url: "/finance", icon: DollarSign },
    { title: "Quotations", url: "/quotations", icon: FileSignature },
    { title: "Invoices", url: "/invoices", icon: Receipt },
    { title: "Expenses", url: "/expenses", icon: CreditCard },
    { title: "Purchase Orders", url: "/purchase-orders", icon: ShoppingCart },
  ]},
  { label: "Clients & Contracts", items: [
    { title: "Clients", url: "/clients", icon: Briefcase },
    { title: "Contracts", url: "/contracts", icon: FileText },
  ]},
  { label: "People", items: [
    { title: "Employees", url: "/employees", icon: Users },
    { title: "Attendance", url: "/attendance", icon: Clock },
    { title: "Leave", url: "/leave", icon: UserMinus },
    { title: "Manpower", url: "/manpower", icon: HardHat },
    { title: "Requisitions", url: "/requisitions", icon: Send },
    { title: "Deployments", url: "/deployments", icon: CalendarPlus },
    { title: "Payroll", url: "/payroll", icon: Wallet },
  ]},
  { label: "Assets & Inventory", items: [
    { title: "Assets", url: "/assets", icon: Package },
    { title: "Warehouse", url: "/warehouse", icon: Package },
  ]},
  { label: "HSE", items: [
    { title: "Health & Safety", url: "/hse", icon: Shield },
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
  { label: "System", items: [
    { title: "Members", url: "/members", icon: UserCheck },
    { title: "Audit Logs", url: "/audit-logs", icon: ClipboardList },
    { title: "Settings", url: "/settings", icon: Settings },
  ]},
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut } = useAuth();

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
            <Building2 className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold text-sidebar-accent-foreground">SKPM</span>
              <span className="text-[10px] text-sidebar-foreground">Technical Service</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-[10px] tracking-wider">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} className="text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive transition-colors">
              <LogOut className="mr-2 h-4 w-4" />
              {!collapsed && <span>Sign Out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
