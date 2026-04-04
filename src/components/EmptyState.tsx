import { ReactNode } from "react";

// ============================================================================
// EmptyState — Premium empty state component with animated SVG illustrations
// Supports multiple scene types with floating/pulsing animations and
// glassmorphism container styling.
// ============================================================================

/* --------------------------------------------------------------------------
   Illustration types — each renders a unique animated SVG scene
   -------------------------------------------------------------------------- */

type IllustrationType =
  | "inbox"
  | "search"
  | "folder"
  | "file"
  | "projects"
  | "tasks"
  | "finance"
  | "people";

interface EmptyStateProps {
  /** Which SVG illustration to show */
  icon?: IllustrationType;
  /** Main heading */
  title: string;
  /** Supporting description text */
  description?: string;
  /** Optional CTA rendered below the description */
  action?: ReactNode;
}

/* --------------------------------------------------------------------------
   Shared SVG animation styles (injected once via <style> inside the SVG)
   -------------------------------------------------------------------------- */
const svgAnimationStyles = `
  @keyframes es-float {
    0%, 100% { transform: translateY(0); }
    50%      { transform: translateY(-6px); }
  }
  @keyframes es-float-slow {
    0%, 100% { transform: translateY(0); }
    50%      { transform: translateY(-4px); }
  }
  @keyframes es-pulse-dot {
    0%, 100% { opacity: 0.4; r: 2; }
    50%      { opacity: 1;   r: 3; }
  }
  @keyframes es-pulse-ring {
    0%   { opacity: 0.6; transform: scale(1); }
    100% { opacity: 0;   transform: scale(1.8); }
  }
  @keyframes es-dash {
    to { stroke-dashoffset: 0; }
  }
  .es-float       { animation: es-float 4s ease-in-out infinite; }
  .es-float-slow  { animation: es-float-slow 5s ease-in-out infinite; }
  .es-float-delay { animation: es-float 4s ease-in-out 1s infinite; }
  .es-pulse-dot   { animation: es-pulse-dot 2.5s ease-in-out infinite; }
  .es-pulse-ring  { animation: es-pulse-ring 2s ease-out infinite; transform-origin: center; }
  .es-dash        { stroke-dasharray: 100; stroke-dashoffset: 100; animation: es-dash 1.5s ease forwards; }
`;

const SvgStyle = () => <style>{svgAnimationStyles}</style>;

/* --------------------------------------------------------------------------
   SVG Illustrations
   -------------------------------------------------------------------------- */

function InboxIllustration() {
  return (
    <svg viewBox="0 0 160 130" fill="none" className="w-full h-full">
      <SvgStyle />
      {/* Decorative dots */}
      <circle cx="20" cy="20" r="2" fill="hsl(var(--primary)/0.3)" className="es-pulse-dot" />
      <circle cx="140" cy="30" r="2" fill="hsl(var(--primary)/0.2)" className="es-pulse-dot" style={{ animationDelay: "0.6s" }} />
      <circle cx="30" cy="110" r="1.5" fill="hsl(var(--primary)/0.25)" className="es-pulse-dot" style={{ animationDelay: "1.2s" }} />
      {/* Inbox tray */}
      <g className="es-float-slow">
        <rect x="35" y="45" width="90" height="60" rx="8" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1.5" />
        <path d="M35 75 h25 l5 10 h30 l5 -10 h25" stroke="hsl(var(--border))" strokeWidth="1.5" fill="none" />
        <rect x="50" y="55" width="35" height="3" rx="1.5" fill="hsl(var(--primary)/0.3)" />
        <rect x="50" y="62" width="25" height="3" rx="1.5" fill="hsl(var(--primary)/0.15)" />
      </g>
      {/* Floating envelope */}
      <g className="es-float" style={{ animationDelay: "0.5s" }}>
        <rect x="60" y="20" width="40" height="28" rx="4" fill="hsl(var(--background))" stroke="hsl(var(--primary)/0.4)" strokeWidth="1.2" />
        <path d="M62 22 l18 14 l18 -14" stroke="hsl(var(--primary)/0.4)" strokeWidth="1.2" fill="none" />
      </g>
      {/* Pulse ring on envelope */}
      <circle cx="80" cy="34" r="6" fill="none" stroke="hsl(var(--primary)/0.3)" strokeWidth="1" className="es-pulse-ring" />
    </svg>
  );
}

function SearchIllustration() {
  return (
    <svg viewBox="0 0 160 130" fill="none" className="w-full h-full">
      <SvgStyle />
      <circle cx="130" cy="25" r="2" fill="hsl(var(--primary)/0.2)" className="es-pulse-dot" />
      <circle cx="25" cy="100" r="2" fill="hsl(var(--primary)/0.2)" className="es-pulse-dot" style={{ animationDelay: "0.8s" }} />
      {/* Magnifying glass */}
      <g className="es-float-slow">
        <circle cx="72" cy="55" r="28" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="2" />
        <circle cx="72" cy="55" r="20" fill="hsl(var(--background))" stroke="hsl(var(--primary)/0.3)" strokeWidth="1.5" />
        <line x1="92" y1="75" x2="115" y2="98" stroke="hsl(var(--muted-foreground)/0.4)" strokeWidth="6" strokeLinecap="round" />
        <line x1="92" y1="75" x2="115" y2="98" stroke="hsl(var(--muted-foreground)/0.25)" strokeWidth="4" strokeLinecap="round" />
      </g>
      {/* Sparkle */}
      <g className="es-float" style={{ animationDelay: "0.3s" }}>
        <path d="M110 30 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 z" fill="hsl(var(--primary)/0.4)" />
      </g>
      {/* Search lines inside lens */}
      <rect x="62" y="48" width="20" height="2.5" rx="1.25" fill="hsl(var(--primary)/0.2)" />
      <rect x="62" y="54" width="14" height="2.5" rx="1.25" fill="hsl(var(--primary)/0.12)" />
      <rect x="62" y="60" width="17" height="2.5" rx="1.25" fill="hsl(var(--primary)/0.08)" />
    </svg>
  );
}

function FolderIllustration() {
  return (
    <svg viewBox="0 0 160 130" fill="none" className="w-full h-full">
      <SvgStyle />
      <circle cx="135" cy="20" r="2" fill="hsl(var(--primary)/0.25)" className="es-pulse-dot" />
      <circle cx="20" cy="90" r="1.5" fill="hsl(var(--primary)/0.2)" className="es-pulse-dot" style={{ animationDelay: "1s" }} />
      {/* Folder back */}
      <g className="es-float-slow">
        <path d="M30 40 h30 l8 -10 h52 a6 6 0 0 1 6 6 v60 a6 6 0 0 1 -6 6 h-84 a6 6 0 0 1 -6 -6 v-50 a6 6 0 0 1 6 -6z"
          fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1.5" />
        {/* Folder front flap */}
        <rect x="28" y="50" width="104" height="48" rx="6" fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth="1.5" />
        {/* Content lines */}
        <rect x="44" y="62" width="40" height="3" rx="1.5" fill="hsl(var(--primary)/0.2)" />
        <rect x="44" y="70" width="28" height="3" rx="1.5" fill="hsl(var(--primary)/0.1)" />
      </g>
      {/* Floating label */}
      <g className="es-float" style={{ animationDelay: "0.4s" }}>
        <rect x="95" y="22" width="30" height="16" rx="4" fill="hsl(var(--primary)/0.1)" stroke="hsl(var(--primary)/0.25)" strokeWidth="1" />
        <rect x="101" y="28" width="18" height="2.5" rx="1.25" fill="hsl(var(--primary)/0.3)" />
      </g>
    </svg>
  );
}

function FileIllustration() {
  return (
    <svg viewBox="0 0 160 130" fill="none" className="w-full h-full">
      <SvgStyle />
      <circle cx="130" cy="110" r="2" fill="hsl(var(--primary)/0.2)" className="es-pulse-dot" />
      <circle cx="30" cy="25" r="2" fill="hsl(var(--primary)/0.25)" className="es-pulse-dot" style={{ animationDelay: "0.5s" }} />
      {/* Main document */}
      <g className="es-float-slow">
        <rect x="42" y="20" width="68" height="90" rx="6" fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth="1.5" />
        {/* Dog-ear fold */}
        <path d="M90 20 v16 a4 4 0 0 0 4 4 h16" stroke="hsl(var(--border))" strokeWidth="1.5" fill="hsl(var(--muted))" />
        {/* Lines */}
        <rect x="54" y="50" width="36" height="3" rx="1.5" fill="hsl(var(--primary)/0.25)" />
        <rect x="54" y="58" width="28" height="3" rx="1.5" fill="hsl(var(--primary)/0.15)" />
        <rect x="54" y="66" width="32" height="3" rx="1.5" fill="hsl(var(--primary)/0.1)" />
        <rect x="54" y="74" width="20" height="3" rx="1.5" fill="hsl(var(--primary)/0.08)" />
      </g>
      {/* Red X badge */}
      <g className="es-float" style={{ animationDelay: "0.6s" }}>
        <circle cx="115" cy="85" r="12" fill="hsl(var(--destructive)/0.1)" stroke="hsl(var(--destructive)/0.3)" strokeWidth="1.2" />
        <path d="M110 80 l10 10 M120 80 l-10 10" stroke="hsl(var(--destructive)/0.5)" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  );
}

function ProjectsIllustration() {
  return (
    <svg viewBox="0 0 160 130" fill="none" className="w-full h-full">
      <SvgStyle />
      <circle cx="140" cy="18" r="2" fill="hsl(var(--primary)/0.3)" className="es-pulse-dot" />
      <circle cx="18" cy="105" r="1.5" fill="hsl(var(--primary)/0.2)" className="es-pulse-dot" style={{ animationDelay: "0.7s" }} />
      {/* Kanban board */}
      <g className="es-float-slow">
        {/* Column 1 */}
        <rect x="20" y="35" width="36" height="70" rx="5" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1" />
        <rect x="26" y="42" width="24" height="4" rx="2" fill="hsl(var(--primary)/0.3)" />
        <rect x="26" y="52" width="24" height="16" rx="3" fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth="0.8" />
        <rect x="26" y="72" width="24" height="16" rx="3" fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth="0.8" />
        {/* Column 2 */}
        <rect x="62" y="35" width="36" height="70" rx="5" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1" />
        <rect x="68" y="42" width="24" height="4" rx="2" fill="hsl(var(--warning)/0.3)" />
        <rect x="68" y="52" width="24" height="16" rx="3" fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth="0.8" />
        {/* Column 3 */}
        <rect x="104" y="35" width="36" height="70" rx="5" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1" />
        <rect x="110" y="42" width="24" height="4" rx="2" fill="hsl(var(--success)/0.3)" />
        <rect x="110" y="52" width="24" height="16" rx="3" fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth="0.8" />
        <rect x="110" y="72" width="24" height="16" rx="3" fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth="0.8" />
        <rect x="110" y="92" width="24" height="8" rx="3" fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth="0.8" />
      </g>
      {/* Floating sparkle */}
      <g className="es-float" style={{ animationDelay: "0.4s" }}>
        <path d="M135 25 l2 4 l4 2 l-4 2 l-2 4 l-2 -4 l-4 -2 l4 -2 z" fill="hsl(var(--primary)/0.35)" />
      </g>
    </svg>
  );
}

function TasksIllustration() {
  return (
    <svg viewBox="0 0 160 130" fill="none" className="w-full h-full">
      <SvgStyle />
      <circle cx="140" cy="25" r="2" fill="hsl(var(--success)/0.3)" className="es-pulse-dot" />
      <circle cx="22" cy="110" r="1.5" fill="hsl(var(--primary)/0.2)" className="es-pulse-dot" style={{ animationDelay: "0.9s" }} />
      {/* Checklist */}
      <g className="es-float-slow">
        <rect x="35" y="25" width="90" height="85" rx="8" fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth="1.5" />
        {/* Task row 1 — completed */}
        <rect x="48" y="38" width="14" height="14" rx="4" fill="hsl(var(--success)/0.15)" stroke="hsl(var(--success)/0.4)" strokeWidth="1.2" />
        <path d="M52 45 l3 3 l5 -6" stroke="hsl(var(--success))" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" className="es-dash" />
        <rect x="68" y="41" width="42" height="3" rx="1.5" fill="hsl(var(--muted-foreground)/0.2)" />
        <rect x="68" y="47" width="26" height="2" rx="1" fill="hsl(var(--muted-foreground)/0.1)" />
        {/* Task row 2 — completed */}
        <rect x="48" y="60" width="14" height="14" rx="4" fill="hsl(var(--success)/0.15)" stroke="hsl(var(--success)/0.4)" strokeWidth="1.2" />
        <path d="M52 67 l3 3 l5 -6" stroke="hsl(var(--success))" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" className="es-dash" style={{ animationDelay: "0.3s" }} />
        <rect x="68" y="63" width="36" height="3" rx="1.5" fill="hsl(var(--muted-foreground)/0.2)" />
        <rect x="68" y="69" width="20" height="2" rx="1" fill="hsl(var(--muted-foreground)/0.1)" />
        {/* Task row 3 — empty */}
        <rect x="48" y="82" width="14" height="14" rx="4" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1.2" />
        <rect x="68" y="85" width="38" height="3" rx="1.5" fill="hsl(var(--primary)/0.15)" />
        <rect x="68" y="91" width="24" height="2" rx="1" fill="hsl(var(--primary)/0.08)" />
      </g>
      {/* Floating checkmark badge */}
      <g className="es-float" style={{ animationDelay: "0.5s" }}>
        <circle cx="122" cy="28" r="10" fill="hsl(var(--success)/0.1)" stroke="hsl(var(--success)/0.3)" strokeWidth="1" />
        <path d="M117 28 l3 3 l6 -7" stroke="hsl(var(--success)/0.6)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
    </svg>
  );
}

function FinanceIllustration() {
  return (
    <svg viewBox="0 0 160 130" fill="none" className="w-full h-full">
      <SvgStyle />
      <circle cx="18" cy="30" r="2" fill="hsl(var(--success)/0.3)" className="es-pulse-dot" />
      <circle cx="145" cy="100" r="2" fill="hsl(var(--primary)/0.2)" className="es-pulse-dot" style={{ animationDelay: "0.6s" }} />
      {/* Chart area */}
      <g className="es-float-slow">
        <rect x="25" y="30" width="110" height="75" rx="8" fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth="1.5" />
        {/* Grid lines */}
        <line x1="35" y1="50" x2="125" y2="50" stroke="hsl(var(--border))" strokeWidth="0.5" strokeDasharray="3 3" />
        <line x1="35" y1="65" x2="125" y2="65" stroke="hsl(var(--border))" strokeWidth="0.5" strokeDasharray="3 3" />
        <line x1="35" y1="80" x2="125" y2="80" stroke="hsl(var(--border))" strokeWidth="0.5" strokeDasharray="3 3" />
        {/* Chart bars */}
        <rect x="42" y="62" width="10" height="30" rx="2" fill="hsl(var(--primary)/0.25)" />
        <rect x="58" y="50" width="10" height="42" rx="2" fill="hsl(var(--primary)/0.35)" />
        <rect x="74" y="55" width="10" height="37" rx="2" fill="hsl(var(--primary)/0.3)" />
        <rect x="90" y="42" width="10" height="50" rx="2" fill="hsl(var(--primary)/0.45)" />
        <rect x="106" y="48" width="10" height="44" rx="2" fill="hsl(var(--success)/0.4)" />
        {/* Trend line */}
        <polyline points="47,58 63,46 79,51 95,38 111,44" stroke="hsl(var(--primary))" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
      </g>
      {/* Floating coin */}
      <g className="es-float" style={{ animationDelay: "0.4s" }}>
        <circle cx="130" cy="25" r="12" fill="hsl(var(--warning)/0.15)" stroke="hsl(var(--warning)/0.4)" strokeWidth="1.2" />
        <text x="130" y="30" textAnchor="middle" fontSize="12" fontWeight="700" fill="hsl(var(--warning)/0.6)">$</text>
      </g>
    </svg>
  );
}

function PeopleIllustration() {
  return (
    <svg viewBox="0 0 160 130" fill="none" className="w-full h-full">
      <SvgStyle />
      <circle cx="20" cy="25" r="2" fill="hsl(var(--primary)/0.25)" className="es-pulse-dot" />
      <circle cx="140" cy="105" r="1.5" fill="hsl(var(--primary)/0.2)" className="es-pulse-dot" style={{ animationDelay: "1s" }} />
      {/* People group */}
      <g className="es-float-slow">
        {/* Person 1 — center */}
        <circle cx="80" cy="50" r="14" fill="hsl(var(--primary)/0.12)" stroke="hsl(var(--primary)/0.25)" strokeWidth="1.2" />
        <circle cx="80" cy="46" r="5" fill="hsl(var(--primary)/0.3)" />
        <path d="M70 58 a10 8 0 0 1 20 0" fill="hsl(var(--primary)/0.2)" />
        {/* Person 2 — left */}
        <circle cx="50" cy="60" r="11" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1" />
        <circle cx="50" cy="57" r="4" fill="hsl(var(--muted-foreground)/0.25)" />
        <path d="M42 66 a8 6 0 0 1 16 0" fill="hsl(var(--muted-foreground)/0.15)" />
        {/* Person 3 — right */}
        <circle cx="110" cy="60" r="11" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1" />
        <circle cx="110" cy="57" r="4" fill="hsl(var(--muted-foreground)/0.25)" />
        <path d="M102 66 a8 6 0 0 1 16 0" fill="hsl(var(--muted-foreground)/0.15)" />
      </g>
      {/* Connection lines */}
      <line x1="64" y1="56" x2="55" y2="58" stroke="hsl(var(--primary)/0.15)" strokeWidth="1" strokeDasharray="2 2" />
      <line x1="96" y1="56" x2="105" y2="58" stroke="hsl(var(--primary)/0.15)" strokeWidth="1" strokeDasharray="2 2" />
      {/* Floating badge */}
      <g className="es-float" style={{ animationDelay: "0.3s" }}>
        <rect x="90" y="25" width="28" height="14" rx="7" fill="hsl(var(--success)/0.1)" stroke="hsl(var(--success)/0.3)" strokeWidth="1" />
        <circle cx="99" cy="32" r="2" fill="hsl(var(--success)/0.5)" />
        <rect x="104" y="30.5" width="10" height="2.5" rx="1.25" fill="hsl(var(--success)/0.35)" />
      </g>
      {/* Bottom platform */}
      <ellipse cx="80" cy="95" rx="50" ry="8" fill="hsl(var(--muted))" opacity="0.5" />
    </svg>
  );
}

/* --------------------------------------------------------------------------
   Illustration selector
   -------------------------------------------------------------------------- */
const illustrationMap: Record<IllustrationType, () => JSX.Element> = {
  inbox: InboxIllustration,
  search: SearchIllustration,
  folder: FolderIllustration,
  file: FileIllustration,
  projects: ProjectsIllustration,
  tasks: TasksIllustration,
  finance: FinanceIllustration,
  people: PeopleIllustration,
};

/* --------------------------------------------------------------------------
   EmptyState component
   -------------------------------------------------------------------------- */
export function EmptyState({
  icon = "inbox",
  title,
  description,
  action,
}: EmptyStateProps) {
  const Illustration = illustrationMap[icon];

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
      {/* Glassmorphism container for the illustration */}
      <div
        className="relative w-40 h-32 mb-6 rounded-2xl
          bg-white/60 dark:bg-white/[0.04]
          backdrop-blur-xl
          border border-white/40 dark:border-white/10
          shadow-[0_4px_30px_rgb(0_0_0/0.04)]
          overflow-hidden"
      >
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-transparent to-primary/[0.02] pointer-events-none" />
        <Illustration />
      </div>

      {/* Title */}
      <h3 className="text-base font-semibold text-foreground tracking-tight mb-1.5">
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="text-sm text-muted-foreground max-w-[320px] leading-relaxed">
          {description}
        </p>
      )}

      {/* Action slot */}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
