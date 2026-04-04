import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Home, ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

// ============================================================================
// NotFound — Premium 404 page with animated gradient text, floating geometric
// shapes, and helpful navigation options.
// ============================================================================

/** Floating geometric shapes for visual interest */
function FloatingShapes() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Large blurred circle — top left */}
      <div
        className="absolute -top-20 -left-20 w-72 h-72 rounded-full animate-float opacity-30"
        style={{
          background:
            "radial-gradient(circle, hsl(var(--primary) / 0.15), transparent 70%)",
        }}
      />

      {/* Medium ring — top right */}
      <div
        className="absolute top-10 right-[10%] w-28 h-28 rounded-full border-2 border-primary/10 animate-float"
        style={{ animationDelay: "1s", animationDuration: "6s" }}
      />

      {/* Small filled circle */}
      <div
        className="absolute top-[30%] left-[15%] w-4 h-4 rounded-full bg-primary/15 animate-bounce-soft"
        style={{ animationDelay: "0.5s" }}
      />

      {/* Rotated square — mid right */}
      <div
        className="absolute top-[40%] right-[12%] w-10 h-10 border-2 border-primary/10 rotate-45 animate-float"
        style={{ animationDelay: "2s", animationDuration: "7s" }}
      />

      {/* Dotted circle — bottom left */}
      <div
        className="absolute bottom-[20%] left-[8%] w-20 h-20 rounded-full border border-dashed border-primary/10 animate-spin-slow"
      />

      {/* Triangle shape — bottom right */}
      <svg
        className="absolute bottom-[15%] right-[18%] w-12 h-12 animate-float opacity-20"
        viewBox="0 0 48 48"
        fill="none"
        style={{ animationDelay: "1.5s" }}
      >
        <polygon points="24,4 44,40 4,40" stroke="hsl(var(--primary))" strokeWidth="2" fill="none" />
      </svg>

      {/* Small dot cluster */}
      <div className="absolute top-[55%] left-[50%] flex gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-primary/20 animate-pulse-soft" />
        <div className="w-1.5 h-1.5 rounded-full bg-primary/15 animate-pulse-soft" style={{ animationDelay: "0.3s" }} />
        <div className="w-1.5 h-1.5 rounded-full bg-primary/10 animate-pulse-soft" style={{ animationDelay: "0.6s" }} />
      </div>

      {/* Large blurred circle — bottom right */}
      <div
        className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-20"
        style={{
          background:
            "radial-gradient(circle, hsl(260 70% 58% / 0.12), transparent 70%)",
        }}
      />
    </div>
  );
}

/** Helpful quick links for navigation */
const quickLinks = [
  { label: "Dashboard", path: "/" },
  { label: "Projects", path: "/projects" },
  { label: "Tasks", path: "/tasks" },
  { label: "Finance", path: "/finance" },
  { label: "Employees", path: "/employees" },
];

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background overflow-hidden">
      {/* Background mesh gradient */}
      <div className="absolute inset-0 gradient-mesh" />

      {/* Floating geometric shapes */}
      <FloatingShapes />

      {/* Main content */}
      <div className="relative z-10 text-center px-6 max-w-lg mx-auto animate-fade-in-up">
        {/* Large animated 404 */}
        <h1
          className="text-[8rem] sm:text-[10rem] md:text-[12rem] font-black leading-none tracking-tighter select-none animate-gradient"
          style={{
            backgroundImage:
              "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(260 70% 58%) 40%, hsl(var(--primary)) 80%, hsl(260 70% 58%) 100%)",
            backgroundSize: "200% 200%",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          404
        </h1>

        {/* Subtitle */}
        <h2 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight -mt-4 mb-2">
          Page not found
        </h2>
        <p className="text-muted-foreground text-sm sm:text-base max-w-sm mx-auto mb-8 leading-relaxed">
          The page at{" "}
          <code className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono text-foreground/80">
            {location.pathname}
          </code>{" "}
          doesn't exist or has been moved.
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
          <Button
            size="lg"
            onClick={() => navigate("/")}
            className="gap-2 px-6 gradient-premium text-white shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Home className="h-4 w-4" />
            Go to Dashboard
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate(-1)}
            className="gap-2 px-6 glass"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
        </div>

        {/* Quick links */}
        <div className="glass rounded-xl p-5 max-w-sm mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Quick Links
            </span>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {quickLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium
                  bg-muted/60 text-muted-foreground
                  hover:bg-primary/10 hover:text-primary
                  transition-all duration-150"
              >
                {link.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
