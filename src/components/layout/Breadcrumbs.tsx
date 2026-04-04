import { useLocation, Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Home, ChevronRight } from "lucide-react";
import { Fragment } from "react";

// ============================================================================
// Breadcrumbs — Improved breadcrumb navigation with glass styling, animated
// chevron separators, long-path truncation, and a Home icon for the root.
// Preserves all existing route-name mappings and functional logic.
// ============================================================================

/** Human-readable names for URL path segments */
const nameMap: Record<string, string> = {
  projects: "Projects",
  tasks: "Tasks",
  "work-orders": "Work Orders",
  maintenance: "Maintenance",
  finance: "Finance",
  quotations: "Quotations",
  invoices: "Invoices",
  expenses: "Expenses",
  "purchase-orders": "Purchase Orders",
  clients: "Clients",
  contracts: "Contracts",
  employees: "Employees",
  attendance: "Attendance",
  leave: "Leave Management",
  manpower: "Manpower",
  requisitions: "Requisitions",
  deployments: "Deployments",
  payroll: "Payroll",
  assets: "Assets",
  warehouse: "Warehouse",
  hse: "Health & Safety",
  training: "Training",
  facilities: "Facilities",
  sites: "Sites",
  accommodation: "Accommodation",
  transport: "Transport",
  calendar: "Calendar",
  announcements: "Announcements",
  documents: "Documents",
  reports: "Reports",
  "visitor-log": "Visitor Log",
  helpdesk: "Helpdesk",
  members: "Members",
  "audit-logs": "Audit Logs",
  settings: "Settings",
  timesheets: "Timesheets",
  "duty-roster": "Duty Roster",
  "gate-passes": "Gate Passes",
  "mp-billing": "MP Billing",
};

/** Maximum characters before a segment label is truncated */
const MAX_LABEL_LENGTH = 24;

function truncateLabel(label: string): string {
  if (label.length <= MAX_LABEL_LENGTH) return label;
  return label.slice(0, MAX_LABEL_LENGTH - 1) + "…";
}

/** Animated chevron separator */
function AnimatedSeparator() {
  return (
    <BreadcrumbSeparator className="[&>svg]:hidden">
      <ChevronRight className="h-3 w-3 text-muted-foreground/40 animate-slide-in" style={{ animationDuration: "0.25s" }} />
    </BreadcrumbSeparator>
  );
}

export function Breadcrumbs() {
  const { pathname } = useLocation();

  // Don't show breadcrumbs on the dashboard root
  if (pathname === "/") return null;

  const segments = pathname.split("/").filter(Boolean);

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList
        className="
          flex-nowrap overflow-x-auto scrollbar-thin
          px-3 py-1.5 -mx-1
          rounded-lg
          bg-white/50 dark:bg-white/[0.03]
          backdrop-blur-md
          border border-white/30 dark:border-white/8
          shadow-[0_1px_8px_rgb(0_0_0/0.03)]
          text-xs sm:text-sm
        "
      >
        {/* Home item — always the root icon */}
        <BreadcrumbItem className="shrink-0">
          <BreadcrumbLink asChild>
            <Link
              to="/"
              className="
                inline-flex items-center justify-center
                h-6 w-6 rounded-md
                text-muted-foreground
                hover:text-primary hover:bg-primary/10
                transition-all duration-150
              "
              aria-label="Home"
            >
              <Home className="h-3.5 w-3.5" />
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {/* Path segments */}
        {segments.map((seg, i) => {
          const label = nameMap[seg] ?? seg;
          const isLast = i === segments.length - 1;
          const href = `/${segments.slice(0, i + 1).join("/")}`;

          return (
            <Fragment key={seg}>
              <AnimatedSeparator />

              <BreadcrumbItem className="shrink-0 max-w-[180px]">
                {isLast ? (
                  <span
                    className="
                      inline-block truncate
                      text-foreground font-medium
                      px-1.5 py-0.5 rounded
                      bg-primary/[0.06]
                    "
                    title={label}
                  >
                    {truncateLabel(label)}
                  </span>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link
                      to={href}
                      className="
                        inline-block truncate
                        text-muted-foreground
                        hover:text-foreground
                        transition-colors duration-150
                        px-1.5 py-0.5 rounded
                        hover:bg-muted/60
                      "
                      title={label}
                    >
                      {truncateLabel(label)}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
