
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up listener FIRST per best practices
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    // Then fetch current session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Ensure a profile row exists for the authenticated user.
  // We intentionally avoid calling Supabase inside the auth callback; instead, we react to user changes here.
  useEffect(() => {
    if (loading || !user?.id) return;

    console.log("[AuthProvider] Ensuring profile for", user.id, user.email);
    const t = setTimeout(() => {
      supabase.functions
        .invoke("ensure-profile")
        .then(({ data, error }) => {
          if (error) {
            console.error("[AuthProvider] ensure-profile error:", error);
          } else {
            console.log("[AuthProvider] ensure-profile success:", data);
          }
        })
        .catch((e) => {
          console.error("[AuthProvider] ensure-profile unexpected error:", e);
        });
    }, 0);

    return () => clearTimeout(t);
  }, [user?.id, loading]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    session,
    loading,
    signOut: async () => {
      await supabase.auth.signOut();
    },
  }), [user, session, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
