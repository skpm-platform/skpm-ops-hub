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
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return "staff";
  }

  return (data?.role as Role) ?? "staff";
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
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setRole(null);
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
