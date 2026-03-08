import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  const handler = useCallback((e: KeyboardEvent) => {
    // Don't fire in input/textarea
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

    // Alt+D = Dashboard
    if (e.altKey && e.key === "d") { e.preventDefault(); navigate("/"); }
    // Alt+P = Projects
    if (e.altKey && e.key === "p") { e.preventDefault(); navigate("/projects"); }
    // Alt+T = Tasks
    if (e.altKey && e.key === "t") { e.preventDefault(); navigate("/tasks"); }
    // Alt+E = Employees
    if (e.altKey && e.key === "e") { e.preventDefault(); navigate("/employees"); }
    // Alt+I = Invoices
    if (e.altKey && e.key === "i") { e.preventDefault(); navigate("/invoices"); }
    // Alt+S = Settings
    if (e.altKey && e.key === "s") { e.preventDefault(); navigate("/settings"); }
    // Alt+M = My Profile
    if (e.altKey && e.key === "m") { e.preventDefault(); navigate("/my-profile"); }
    // Escape = close modals (handled by radix)
  }, [navigate]);

  useEffect(() => {
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [handler]);
}
