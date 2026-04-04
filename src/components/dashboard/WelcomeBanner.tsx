import { useNavigate } from "react-router-dom";
import {
  Plus,
  ClipboardList,
  FileText,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ============================================================================
// WelcomeBanner — Premium dashboard welcome banner with time-based greeting,
// date display, animated mesh background, decorative elements, and quick
// action chips. Designed to feel premium and professional.
// ============================================================================

/* --------------------------------------------------------------------------
   Helpers
   -------------------------------------------------------------------------- */

/** Returns a greeting based on the current hour */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** Returns a formatted date string, e.g. "Saturday, 4 April 2026" */
function getFormattedDate(): string {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Returns a motivational subtitle based on time of day */
function getSubtitle(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Ready to start a productive day?";
  if (hour < 17) return "Keep the momentum going!";
  return "Wrapping up for the day?";
}

/* --------------------------------------------------------------------------
   Quick-action chip data
   -------------------------------------------------------------------------- */
interface QuickAction {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

const quickActions: QuickAction[] = [
  { label: "New Task", icon: Plus, path: "/tasks" },
  { label: "Work Orders", icon: ClipboardList, path: "/work-orders" },
  { label: "Invoices", icon: FileText, path: "/invoices" },
  { label: "Calendar", icon: Calendar, path: "/calendar" },
];

/* --------------------------------------------------------------------------
   Decorative background elements (animated mesh + shapes)
   -------------------------------------------------------------------------- */
function DecorativeElements() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Animated gradient orbs */}
      <div
        className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-40 animate-float"
        style={{
          background:
            "radial-gradient(circle, hsl(var(--primary) / 0.2), transparent 70%)",
          animationDuration: "8s",
        }}
      />
      <div
        className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full opacity-30 animate-float"
        style={{
          background:
            "radial-gradient(circle, hsl(260 70% 58% / 0.15), transparent 70%)",
          animationDelay: "2s",
          animationDuration: "7s",
        }}
      />

      {/* Subtle dot pattern overlay */}
      <div className="absolute inset-0 dot-pattern opacity-[0.35]" />

      {/* Weather-inspired decorative clouds / sun rays */}
      <svg
        className="absolute top-4 right-8 w-24 h-24 opacity-[0.08]"
        viewBox="0 0 96 96"
        fill="none"
      >
        {/* Sun */}
        <circle cx="48" cy="48" r="16" fill="hsl(var(--warning))" />
        {/* Rays */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
          <line
            key={angle}
            x1="48"
            y1="48"
            x2={48 + Math.cos((angle * Math.PI) / 180) * 36}
            y2={48 + Math.sin((angle * Math.PI) / 180) * 36}
            stroke="hsl(var(--warning))"
            strokeWidth="2"
            strokeLinecap="round"
          />
        ))}
      </svg>

      {/* Cloud shape */}
      <svg
        className="absolute bottom-6 right-24 w-20 h-12 opacity-[0.06] animate-float"
        viewBox="0 0 80 48"
        fill="hsl(var(--foreground))"
        style={{ animationDelay: "1s", animationDuration: "6s" }}
      >
        <ellipse cx="30" cy="32" rx="20" ry="12" />
        <ellipse cx="50" cy="28" rx="16" ry="14" />
        <ellipse cx="24" cy="28" rx="12" ry="10" />
        <ellipse cx="44" cy="22" rx="14" ry="11" />
      </svg>

      {/* Small geometric accents */}
      <div className="absolute top-8 left-[40%] w-2 h-2 rounded-full bg-primary/20 animate-pulse-soft" />
      <div
        className="absolute bottom-10 left-[60%] w-1.5 h-1.5 rounded-full bg-primary/15 animate-pulse-soft"
        style={{ animationDelay: "0.7s" }}
      />
    </div>
  );
}

/* --------------------------------------------------------------------------
   WelcomeBanner component
   -------------------------------------------------------------------------- */
interface WelcomeBannerProps {
  /** User's display name (e.g. "John" or "John Doe") */
  userName?: string;
}

export function WelcomeBanner({ userName = "there" }: WelcomeBannerProps) {
  const navigate = useNavigate();
  const greeting = getGreeting();
  const dateStr = getFormattedDate();
  const subtitle = getSubtitle();
  const firstName = userName.split(" ")[0];

  return (
    <div
      className="
        relative overflow-hidden
        rounded-2xl
        p-6 sm:p-8
        border border-white/20 dark:border-white/10
        animate-fade-in
      "
      style={{
        background:
          "linear-gradient(135deg, hsl(var(--primary) / 0.08) 0%, hsl(260 70% 58% / 0.06) 50%, hsl(var(--primary) / 0.04) 100%)",
      }}
    >
      <DecorativeElements />

      {/* Content */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
        {/* Text block */}
        <div className="space-y-1.5">
          {/* Date pill */}
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-soft" />
            {dateStr}
          </span>

          {/* Greeting */}
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {greeting},{" "}
            <span className="text-gradient-premium">{firstName}</span>
          </h2>

          {/* Subtitle */}
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>

        {/* Quick action chips */}
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => {
            const IconComp = action.icon;
            return (
              <Button
                key={action.path}
                variant="outline"
                size="sm"
                onClick={() => navigate(action.path)}
                className="
                  gap-1.5 h-8 px-3
                  bg-white/60 dark:bg-white/[0.06]
                  backdrop-blur-md
                  border-white/30 dark:border-white/10
                  hover:bg-white/80 dark:hover:bg-white/10
                  hover:border-primary/30
                  text-xs font-medium
                  shadow-sm
                  transition-all duration-200
                  group
                "
              >
                <IconComp className="h-3.5 w-3.5 text-primary/70 group-hover:text-primary transition-colors" />
                {action.label}
                <ArrowRight className="h-3 w-3 opacity-0 -ml-1 group-hover:opacity-60 group-hover:ml-0 transition-all duration-200" />
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
