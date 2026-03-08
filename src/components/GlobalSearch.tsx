import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  LayoutDashboard, FolderKanban, CheckSquare, Wrench, DollarSign, FileSignature, Receipt,
  CreditCard, ShoppingCart, Briefcase, FileText, Users, Clock, HardHat, Wallet, Package,
  Shield, GraduationCap, Building, MapPin, Home, Truck, Megaphone, BarChart3, Contact,
  Monitor, UserCheck, ClipboardList, Settings, CalendarDays, CalendarPlus, Send, UserMinus,
} from "lucide-react";

const pages = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard, group: "Overview" },
  { name: "Projects", path: "/projects", icon: FolderKanban, group: "Operations" },
  { name: "Tasks", path: "/tasks", icon: CheckSquare, group: "Operations" },
  { name: "Work Orders", path: "/work-orders", icon: Wrench, group: "Operations" },
  { name: "Maintenance", path: "/maintenance", icon: CalendarDays, group: "Operations" },
  { name: "Finance", path: "/finance", icon: DollarSign, group: "Finance" },
  { name: "Quotations", path: "/quotations", icon: FileSignature, group: "Finance" },
  { name: "Invoices", path: "/invoices", icon: Receipt, group: "Finance" },
  { name: "Expenses", path: "/expenses", icon: CreditCard, group: "Finance" },
  { name: "Purchase Orders", path: "/purchase-orders", icon: ShoppingCart, group: "Finance" },
  { name: "Clients", path: "/clients", icon: Briefcase, group: "Clients" },
  { name: "Contracts", path: "/contracts", icon: FileText, group: "Clients" },
  { name: "Employees", path: "/employees", icon: Users, group: "People" },
  { name: "Attendance", path: "/attendance", icon: Clock, group: "People" },
  { name: "Leave Management", path: "/leave", icon: UserMinus, group: "People" },
  { name: "Manpower", path: "/manpower", icon: HardHat, group: "People" },
  { name: "Requisitions", path: "/requisitions", icon: Send, group: "People" },
  { name: "Deployments", path: "/deployments", icon: CalendarPlus, group: "People" },
  { name: "Payroll", path: "/payroll", icon: Wallet, group: "People" },
  { name: "Timesheets", path: "/timesheets", icon: CalendarDays, group: "People" },
  { name: "Duty Roster", path: "/duty-roster", icon: CalendarDays, group: "People" },
  { name: "Gate Passes", path: "/gate-passes", icon: Send, group: "Site Access" },
  { name: "MP Billing", path: "/mp-billing", icon: Receipt, group: "Site Access" },
  { name: "Assets", path: "/assets", icon: Package, group: "Assets" },
  { name: "Warehouse", path: "/warehouse", icon: Package, group: "Assets" },
  { name: "Health & Safety", path: "/hse", icon: Shield, group: "HSE" },
  { name: "Training", path: "/training", icon: GraduationCap, group: "HSE" },
  { name: "Facilities", path: "/facilities", icon: Building, group: "Facilities" },
  { name: "Sites", path: "/sites", icon: MapPin, group: "Facilities" },
  { name: "Accommodation", path: "/accommodation", icon: Home, group: "Facilities" },
  { name: "Transport", path: "/transport", icon: Truck, group: "Facilities" },
  { name: "Calendar", path: "/calendar", icon: CalendarDays, group: "Communication" },
  { name: "Announcements", path: "/announcements", icon: Megaphone, group: "Communication" },
  { name: "Documents", path: "/documents", icon: FileText, group: "Communication" },
  { name: "Reports", path: "/reports", icon: BarChart3, group: "Communication" },
  { name: "Helpdesk", path: "/helpdesk", icon: Monitor, group: "Admin" },
  { name: "Visitor Log", path: "/visitor-log", icon: Contact, group: "Admin" },
  { name: "Members", path: "/members", icon: UserCheck, group: "System" },
  { name: "Audit Logs", path: "/audit-logs", icon: ClipboardList, group: "System" },
  { name: "Settings", path: "/settings", icon: Settings, group: "System" },
];

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setOpen(o => !o); }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const groups = [...new Set(pages.map(p => p.group))];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search modules... (⌘K)" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {groups.map(group => (
          <CommandGroup key={group} heading={group}>
            {pages.filter(p => p.group === group).map(page => (
              <CommandItem key={page.path} onSelect={() => { navigate(page.path); setOpen(false); }}>
                <page.icon className="mr-2 h-4 w-4" />
                {page.name}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
