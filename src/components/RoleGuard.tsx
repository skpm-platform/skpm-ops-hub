import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

type Role = "admin" | "manager" | "staff";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: Role[];
  fallback?: string;
}

export function RoleGuard({ children, allowedRoles, fallback = "/" }: RoleGuardProps) {
  const { role, loading } = useAuth();

  if (loading) return (
    <div className="min-h-[50vh] flex items-center justify-center text-muted-foreground text-sm">
      Checking access...
    </div>
  );

  if (!role || !allowedRoles.includes(role as Role)) {
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}
