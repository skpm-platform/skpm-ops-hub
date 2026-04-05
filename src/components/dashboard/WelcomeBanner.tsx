import { useNavigate } from "react-router-dom";
import {
  Plus, ClipboardList, FileText, Calendar, ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/* ══════════════════════════════════════════════════════════════
   WelcomeBanner — Premium hero banner for the dashboard.
   Figma / Lovable grade — gradient background, animated orbs,
   subtle pattern overlay, bold greeting, and quick-action chips.
   ══════════════════════════════════════════════════════════════ */

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getFormattedDate(): string {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function getSubtitle(): string {
  const h = new Date().getHours();
  if (h < 12) return "Start your day with clarity and focus.";
  if (h < 17) return "Keep the momentum — you're on track.";
  return "Wrapping up strong? Check your tasks.";
}

interface QuickAction {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

const quickActions: QuickAction[] = [
  { label: "New Task",     icon: Plus,          path: "/tasks" },
  { label: "Work Orders",  icon: ClipboardList, path: "/work-orders" },
  { label: "Invoices",     icon: FileText,      path: "/invoices" },
  { label: "Calendar",     icon: Calendar,      path: "/calendar" },
];

interface WelcomeBannerProps {
  userName?: string;
}

export function WelcomeBanner({ userName = "there" }: WelcomeBannerProps) {
  const navigate  = useNavigate();
  const greeting  = getGreeting();
  const dateStr   = getFormattedDate();
  const subtitle  = getSubtitle();
  const firstName = userName.split(" ")[0];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/25 dark:border-white/8 animate-fade-in"
      style={{
        background: "linear-gradient(135deg, hsl(263 70% 58% / 0.1) 0%, hsl(290 70% 60% / 0.07) 40%, hsl(263 70% 58% / 0.04) 100%)",
        boxShadow: "0 1px 3px rgb(0 0 0 / 0.04), 0 4px 20px rgb(0 0 0 / 0.05), inset 0 1px 0 rgba(255,255,255,0.5)"
      }}
    >

      {/* ── Background effects ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        {/* Gradient orbs */}
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-35 animate-float-slow"
          style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.2), transparent 65%)", animationDuration: "8s" }}
        />
        <div className="absolute -bottom-20 -left-16 w-56 h-56 rounded-full opacity-25 animate-float-slow"
          style={{ background: "radial-gradient(circle, hsl(290 70% 60% / 0.15), transparent 65%)", animationDelay: "2.5s", animationDuration: "9s" }}
        />

        {/* Dot pattern */}
        <div className="absolute inset-0 dot-pattern opacity-30" />

        {/* Decorative rings */}
        <div className="absolute top-1/2 right-8 -translate-y-1/2 w-40 h-40 rounded-full border border-primary/10 opacity-40" />
        <div className="absolute top-1/2 right-8 -translate-y-1/2 w-60 h-60 rounded-full border border-primary/6 opacity-25" />

        {/* Sparkle dots */}
        {[
          { top: "20%", left: "32%", delay: "0s", size: "w-1.5 h-1.5" },
          { top: "65%", left: "52%", delay: "1.2s", size: "w-1 h-1" },
          { top: "30%", left: "72%", delay: "0.6s", size: "w-1.5 h-1.5" },
          { top: "75%", left: "22%", delay: "1.8s", size: "w-1 h-1" },
        ].map((d, i) => (
          <div key={i}
            className={`absolute ${d.size} rounded-full bg-primary/25 animate-twinkle`}
            style={{ top: d.top, left: d.left, animationDelay: d.delay }}
          />
        ))}
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 p-6 sm:p-8">

        {/* Text block */}
        <div className="space-y-2">
          {/* Date pill */}
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-soft" />
            {dateStr}
          </div>

          {/* Greeting */}
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight" style={{ letterSpacing: "-0.03em" }}>
            {greeting},{" "}
            <span className="text-gradient-vivid animate-gradient" style={{ backgroundSize: "200% auto" }}>
              {firstName}
            </span>{" "}
            <span className="inline-block animate-bounce-soft" style={{ animationDuration: "2s" }}>👋</span>
          </h2>

          {/* Subtitle with sparkle */}
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary/50 shrink-0" />
            <p className="text-[13.5px] text-muted-foreground/75 font-medium">{subtitle}</p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-2 shrink-0">
          {quickActions.map((action) => (
            <Button
              key={action.path}
              variant="outline"
              size="sm"
              onClick={() => navigate(action.path)}
              className="gap-1.5 h-8 px-3.5 text-xs font-semibold group transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:text-primary rounded-xl"
              style={{
                background: "rgba(255,255,255,0.6)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.4)"
              }}
            >
              <action.icon className="h-3.5 w-3.5 text-primary/60 group-hover:text-primary transition-colors" />
              {action.label}
              <ArrowRight className="h-3 w-3 opacity-0 -ml-0.5 group-hover:opacity-60 group-hover:ml-0 transition-all duration-200" />
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
