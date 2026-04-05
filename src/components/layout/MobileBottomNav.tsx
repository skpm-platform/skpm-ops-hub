import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  CheckSquare,
  Wallet,
  Users,
  MoreHorizontal,
} from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";

// ============================================================================
// MobileBottomNav — Glass-effect bottom navigation bar for mobile.
// The "More" button now toggles the full-screen sidebar overlay.
// ============================================================================

interface NavTab {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  action?: "sidebar";
}

const tabs: NavTab[] = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Tasks", path: "/tasks", icon: CheckSquare },
  { label: "Finance", path: "/finance", icon: Wallet },
  { label: "People", path: "/employees", icon: Users },
  { label: "More", path: "", icon: MoreHorizontal, action: "sidebar" },
];

function isTabActive(tabPath: string, currentPath: string): boolean {
  if (!tabPath) return false;
  if (tabPath === "/") return currentPath === "/";
  return currentPath.startsWith(tabPath);
}

interface MobileBottomNavProps {
  taskCount?: number;
}

export function MobileBottomNav({ taskCount }: MobileBottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { toggleSidebar, openMobile } = useSidebar();

  return (
    <nav
      className="
        sm:hidden fixed bottom-0 inset-x-0 z-50
        border-t border-white/15 dark:border-white/10
        bg-background/80 backdrop-blur-2xl
        supports-[backdrop-filter]:bg-background/65
      "
      style={{
        boxShadow: "0 -4px 30px rgb(0 0 0 / 0.06)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex items-stretch justify-around h-16 max-w-lg mx-auto px-1">
        {tabs.map((tab) => {
          const active = tab.action === "sidebar" ? openMobile : isTabActive(tab.path, location.pathname);
          const IconComp = tab.icon;
          const badgeValue = tab.label === "Tasks" && taskCount ? taskCount : tab.badge;

          return (
            <button
              key={tab.label}
              onClick={() => {
                if (tab.action === "sidebar") {
                  toggleSidebar();
                } else {
                  navigate(tab.path);
                }
              }}
              className={`
                relative flex flex-col items-center justify-center flex-1
                min-w-0 gap-0.5 pt-1.5 pb-1
                transition-colors duration-200
                ${active ? "text-primary" : "text-muted-foreground"}
              `}
              aria-label={tab.label}
              aria-current={active && tab.action !== "sidebar" ? "page" : undefined}
            >
              {active && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-[3px] w-8 rounded-b-full"
                  style={{
                    background: "linear-gradient(90deg, hsl(var(--primary)), hsl(260 70% 58%))",
                  }}
                />
              )}

              <span className="relative">
                <IconComp
                  className={`h-5 w-5 transition-transform duration-200 ${active ? "scale-110" : ""}`}
                />
                {badgeValue != null && badgeValue > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full text-[10px] font-bold leading-none bg-destructive text-destructive-foreground ring-2 ring-background">
                    {badgeValue > 99 ? "99+" : badgeValue}
                  </span>
                )}
                {active && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary animate-pulse-soft" />
                )}
              </span>

              <span className={`text-[10px] leading-tight font-medium truncate max-w-full ${active ? "text-primary" : ""}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
