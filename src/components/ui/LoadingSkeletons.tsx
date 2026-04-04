import { Skeleton } from "@/components/ui/skeleton";

// ============================================================================
// LoadingSkeletons — Enhanced skeleton loading components with shimmer effects
// Provides consistent loading states across the application.
// ============================================================================

/* --------------------------------------------------------------------------
   Shimmer wrapper — adds a sweeping highlight animation over children
   -------------------------------------------------------------------------- */
function ShimmerOverlay() {
  return (
    <div
      className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] pointer-events-none"
      style={{
        background:
          "linear-gradient(90deg, transparent 0%, hsl(var(--primary) / 0.04) 40%, hsl(var(--primary) / 0.08) 50%, hsl(var(--primary) / 0.04) 60%, transparent 100%)",
      }}
    />
  );
}

function ShimmerCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 ${className}`}>
      {children}
      <ShimmerOverlay />
    </div>
  );
}

/* --------------------------------------------------------------------------
   TableSkeleton — Improved table loading with header & shimmer
   -------------------------------------------------------------------------- */
export function TableSkeleton({
  rows = 5,
  cols = 6,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card">
      {/* Toolbar skeleton */}
      <div className="flex items-center justify-between p-4 border-b border-border/40">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-[200px] rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-9 w-20 rounded-lg" />
        </div>
      </div>

      {/* Table header */}
      <div className="flex gap-4 px-4 py-3 bg-muted/40 border-b border-border/30">
        <Skeleton className="h-3 w-6 rounded" /> {/* Checkbox */}
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton
            key={`header-${i}`}
            className="h-3 flex-1 rounded"
            style={{ maxWidth: i === 0 ? "180px" : undefined }}
          />
        ))}
      </div>

      {/* Table rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={`row-${r}`}
          className="flex items-center gap-4 px-4 py-3.5 border-b border-border/20 last:border-0"
          style={{ opacity: 1 - r * 0.1 }}
        >
          <Skeleton className="h-4 w-4 rounded" />
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton
              key={`cell-${r}-${c}`}
              className="h-4 flex-1 rounded"
              style={{
                maxWidth:
                  c === 0 ? "180px" : c === cols - 1 ? "80px" : undefined,
              }}
            />
          ))}
        </div>
      ))}

      {/* Pagination skeleton */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border/30">
        <Skeleton className="h-3 w-32 rounded" />
        <div className="flex items-center gap-1">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </div>

      <ShimmerOverlay />
    </div>
  );
}

/* --------------------------------------------------------------------------
   CardSkeleton — Enhanced stat card skeleton
   -------------------------------------------------------------------------- */
export function CardSkeleton() {
  return (
    <ShimmerCard>
      <div className="flex items-start justify-between mb-3">
        <Skeleton className="h-3 w-24 rounded" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="h-7 w-28 rounded mb-2" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-3 w-12 rounded-full" />
        <Skeleton className="h-3 w-20 rounded" />
      </div>
    </ShimmerCard>
  );
}

/* --------------------------------------------------------------------------
   KPIGridSkeleton — Grid of stat card skeletons
   -------------------------------------------------------------------------- */
export function KPIGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={`kpi-${i}`} />
      ))}
    </div>
  );
}

/* --------------------------------------------------------------------------
   ChartSkeleton — Chart placeholder with animated bars
   -------------------------------------------------------------------------- */
export function ChartSkeleton({
  height = 280,
  type = "bar",
}: {
  height?: number;
  type?: "bar" | "line" | "pie";
}) {
  return (
    <ShimmerCard>
      {/* Chart title */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Skeleton className="h-4 w-32 rounded mb-2" />
          <Skeleton className="h-3 w-48 rounded" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </div>

      {/* Chart body */}
      <div
        className="relative flex items-end gap-3 px-4"
        style={{ height: `${height - 80}px` }}
      >
        {type === "bar" &&
          Array.from({ length: 8 }).map((_, i) => (
            <div key={`bar-${i}`} className="flex-1 flex flex-col justify-end">
              <Skeleton
                className="w-full rounded-t-md"
                style={{
                  height: `${30 + Math.sin(i * 0.8) * 25 + 25}%`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            </div>
          ))}

        {type === "line" && (
          <div className="w-full h-full flex flex-col justify-between py-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={`line-${i}`} className="h-[1px] w-full rounded opacity-40" />
            ))}
            {/* Simulated line area */}
            <div className="absolute inset-x-4 bottom-4 top-1/3">
              <Skeleton className="w-full h-full rounded-lg opacity-20" />
            </div>
          </div>
        )}

        {type === "pie" && (
          <div className="w-full flex items-center justify-center py-6">
            <Skeleton className="h-36 w-36 rounded-full" />
            <div className="ml-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={`legend-${i}`} className="flex items-center gap-2">
                  <Skeleton className="h-3 w-3 rounded-full" />
                  <Skeleton className="h-3 w-16 rounded" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* X-axis labels */}
      {type !== "pie" && (
        <div className="flex gap-3 px-4 mt-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={`xlabel-${i}`} className="h-2 flex-1 rounded" />
          ))}
        </div>
      )}
    </ShimmerCard>
  );
}

/* --------------------------------------------------------------------------
   FormSkeleton — Form loading state
   -------------------------------------------------------------------------- */
export function FormSkeleton({
  fields = 6,
  columns = 2,
}: {
  fields?: number;
  columns?: number;
}) {
  return (
    <ShimmerCard>
      {/* Form title */}
      <div className="mb-6">
        <Skeleton className="h-5 w-40 rounded mb-2" />
        <Skeleton className="h-3 w-64 rounded" />
      </div>

      {/* Form fields */}
      <div
        className="grid gap-5"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: fields }).map((_, i) => (
          <div key={`field-${i}`} className="space-y-2">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>

      {/* Textarea */}
      <div className="mt-5 space-y-2">
        <Skeleton className="h-3 w-24 rounded" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-border/30">
        <Skeleton className="h-10 w-24 rounded-lg" />
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>
    </ShimmerCard>
  );
}

/* --------------------------------------------------------------------------
   DashboardSkeleton — Full dashboard loading state
   -------------------------------------------------------------------------- */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome banner skeleton */}
      <ShimmerCard className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24 rounded" />
            <Skeleton className="h-7 w-56 rounded" />
            <Skeleton className="h-3 w-40 rounded" />
          </div>
          <div className="hidden sm:flex gap-2">
            <Skeleton className="h-9 w-28 rounded-lg" />
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
        </div>
      </ShimmerCard>

      {/* KPI cards */}
      <KPIGridSkeleton count={4} />

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartSkeleton type="bar" />
        <ChartSkeleton type="line" />
      </div>

      {/* Table and side panel */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TableSkeleton rows={5} cols={4} />
        </div>
        <div className="space-y-4">
          <ShimmerCard>
            <Skeleton className="h-4 w-28 rounded mb-4" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={`activity-${i}`} className="flex items-center gap-3 mb-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-full rounded" />
                  <Skeleton className="h-2.5 w-2/3 rounded" />
                </div>
              </div>
            ))}
          </ShimmerCard>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
   PageSkeleton — Generic full-page loading state
   -------------------------------------------------------------------------- */
export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-7 w-48 rounded mb-2" />
          <Skeleton className="h-3.5 w-72 rounded" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Skeleton className="h-9 w-[220px] rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-9 w-20 rounded-lg" />
      </div>

      {/* KPI cards */}
      <KPIGridSkeleton count={4} />

      {/* Main table */}
      <TableSkeleton rows={8} cols={5} />
    </div>
  );
}
