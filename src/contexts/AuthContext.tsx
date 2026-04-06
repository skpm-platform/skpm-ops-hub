import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Role = "admin" | "manager" | "staff";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: Role | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

async function fetchUserRole(userId: string): Promise<Role> {
  try {
    const result = await Promise.race([
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 4000)
      ),
    ]);

    if (result.error) {
      console.warn("[Auth] Role fetch error:", result.error.message);
      return "staff";
    }

    return (result.data?.role as Role) ?? "staff";
  } catch {
    console.warn("[Auth] Role fetch timed out, defaulting to staff");
    return "staff";
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const syncRole = async (nextUser: User | null) => {
      if (!mounted) return;

      if (!nextUser) {
        setRole(null);
        return;
      }

      const nextRole = await fetchUserRole(nextUser.id);
      if (mounted) {
        setRole(nextRole);
      }
    };

    // Safety timeout: if auth doesn't resolve in 5 seconds, stop loading
    const timeout = setTimeout(() => {
      if (mounted) {
        console.warn('[Auth] Timed out waiting for session — redirecting to login');
        setLoading(false);
      }
    }, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      clearTimeout(timeout);
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      await syncRole(nextSession?.user ?? null);
      setLoading(false);
    });

    void supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (!mounted) return;
      clearTimeout(timeout);

      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      await syncRole(initialSession?.user ?? null);

      if (mounted) {
        setLoading(false);
      }
    }).catch((err) => {
      console.error('[Auth] Failed to get session:', err);
      if (mounted) {
        clearTimeout(timeout);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("[Auth] Sign out error:", err);
    }
    setSession(null);
    setUser(null);
    setRole(null);
    setLoading(false);
    // Force redirect to login
    window.location.href = window.location.origin + (import.meta.env.BASE_URL || "/");
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
