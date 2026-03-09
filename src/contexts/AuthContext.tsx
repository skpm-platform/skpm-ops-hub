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

const SESSION_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes

async function fetchUserRole(userId: string): Promise<Role> {
  try {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();
    return (data?.role as Role) ?? "staff";
  } catch {
    return "staff";
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener BEFORE getSession (per Supabase best practice)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Fetch role asynchronously without blocking auth state update
        fetchUserRole(session.user.id).then(setRole);
      } else {
        setRole(null);
      }

      setLoading(false);

      // Handle token refresh errors - sign out on invalid session
      if (event === "TOKEN_REFRESHED" && !session) {
        supabase.auth.signOut();
      }

      // Handle sign out events
      if (event === "SIGNED_OUT") {
        setSession(null);
        setUser(null);
        setRole(null);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const userRole = await fetchUserRole(session.user.id);
        setRole(userRole);
      }

      setLoading(false);
    });

    // Periodic session refresh to keep tokens fresh
    const refreshInterval = setInterval(async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession) {
        await supabase.auth.refreshSession();
      }
    }, SESSION_REFRESH_INTERVAL);

    return () => {
      subscription.unsubscribe();
      clearInterval(refreshInterval);
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
