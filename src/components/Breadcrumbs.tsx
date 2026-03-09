import { useLocation, Link } from "react-router-dom";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Home } from "lucide-react";
import { Fragment } from "react";

const nameMap: Record<string, string> = {
  projects: "Projects", tasks: "Tasks", "work-orders": "Work Orders", maintenance: "Maintenance",
  finance: "Finance", quotations: "Quotations", invoices: "Invoices", expenses: "Expenses",
  "purchase-orders": "Purchase Orders", clients: "Clients", contracts: "Contracts",
  employees: "Employees", attendance: "Attendance", leave: "Leave Management",
  manpower: "Manpower", requisitions: "Requisitions", deployments: "Deployments",
  payroll: "Payroll", assets: "Assets", warehouse: "Warehouse", hse: "Health & Safety",
  training: "Training", facilities: "Facilities", sites: "Sites", accommodation: "Accommodation",
  transport: "Transport", calendar: "Calendar", announcements: "Announcements",
  documents: "Documents", reports: "Reports", "visitor-log": "Visitor Log", helpdesk: "Helpdesk",
  members: "Members", "audit-logs": "Audit Logs", settings: "Settings",
  timesheets: "Timesheets", "duty-roster": "Duty Roster", "gate-passes": "Gate Passes",
  "mp-billing": "MP Billing"
};

export function Breadcrumbs() {
  const { pathname } = useLocation();
  if (pathname === "/") return null;

  const segments = pathname.split("/").filter(Boolean);

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild><Link to="/"><Home className="h-3.5 w-3.5" /></Link></BreadcrumbLink>
        </BreadcrumbItem>
        {segments.map((seg, i) =>
        <Fragment key={seg}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {i === segments.length - 1 ?
            <span className="text-foreground font-medium">{nameMap[seg] ?? seg}</span> :

            <BreadcrumbLink asChild><Link to={`/${segments.slice(0, i + 1).join("/")}`}>{nameMap[seg] ?? seg}</Link></BreadcrumbLink>
            }
            </BreadcrumbItem>
          </Fragment>
        )}
      </BreadcrumbList>
    </Breadcrumb>);

}