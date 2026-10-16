import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const AuthContext = createContext<{ user: User | null; loading: boolean }>({
  user: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<{ user: User | null; loading: boolean }>({
    user: null,
    loading: true,
  });
  const cache = useQueryClient();
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuth({ user: session?.user ?? null, loading: false });
    });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    const filters = {
      predicate: (q: { queryKey: readonly unknown[] }) =>
        q.queryKey[0] === "realestate-private" && q.queryKey[1] !== auth.user?.id,
    };
    void cache.cancelQueries(filters).then(() => cache.removeQueries(filters));
  }, [auth.user?.id, cache]);
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

export function RequireUser({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <p className="p-6" role="status">
        Checking your session…
      </p>
    );
  if (!user)
    return (
      <div className="space-y-3 p-6">
        <p>Sign in to save apartments, searches, and preferences.</p>
        <Link to="/account" className="font-medium text-primary">
          Sign in or create an account →
        </Link>
      </div>
    );
  return <div key={user.id}>{children}</div>;
}
