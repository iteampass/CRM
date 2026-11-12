/**
 * Supabase-backed authentication.
 *
 * The exposed shape (`user`, `ready`, `signIn`, `signUp`, `signOut`) is the same
 * as the previous mocked version, so UI components did not need to change.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { supabase } from "@/integrations/supabase/client";
import type { User } from "@/lib/types";

export interface SignUpInput {
  firstName: string;
  lastName: string;
  companyPosition: string;
  email: string;
  phone: string;
  password: string;
}

export type ProfileInput = Pick<User, "firstName" | "lastName" | "phone" | "companyPosition"> & { avatarUrl: string };

interface AuthContextValue {
  user: User | null;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (input: ProfileInput) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadProfile(userId: string, email: string, avatarUrl = ""): Promise<User> {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  return {
    id: data?.id ?? userId,
    avatarUrl,
    firstName: data?.first_name ?? "",
    lastName: data?.last_name ?? "",
    email: data?.email ?? email,
    phone: data?.phone ?? "",
    companyPosition: data?.company_position ?? "",
    createdAt: data?.created_at ?? new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    const sync = async (userId?: string, email?: string, avatarUrl?: string) => {
      if (!userId) {
        if (active) setUser(null);
        return;
      }
      const profile = await loadProfile(userId, email ?? "", avatarUrl);
      if (active) setUser(profile);
    };

    supabase.auth.getSession().then(async ({ data }) => {
      await sync(data.session?.user.id, data.session?.user.email ?? "", data.session?.user.user_metadata?.["avatar_url"]);
      if (active) setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      void sync(session?.user.id, session?.user.email ?? "", session?.user.user_metadata?.["avatar_url"]);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // Load the profile before returning so the app gate never sees a signed-in
    // session with a still-empty user and bounces back to /auth.
    if (data.user) setUser(await loadProfile(data.user.id, data.user.email ?? "", data.user.user_metadata["avatar_url"]));
  }, []);

  const signUp = useCallback(async (input: SignUpInput) => {
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth?confirmed=1`,
        data: {
          first_name: input.firstName,
          last_name: input.lastName,
          phone: input.phone,
          company_position: input.companyPosition,
        },
      },
    });
    if (error) throw error;
    if (data.session?.user) {
      setUser(await loadProfile(data.session.user.id, data.session.user.email ?? "", data.session.user.user_metadata["avatar_url"]));
    }
  }, []);

  const updateProfile = useCallback(async (input: ProfileInput) => {
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) throw new Error("Please sign in again.");
    if (!input.firstName.trim() || !input.lastName.trim()) throw new Error("First and last name are required.");
    const { error } = await supabase.from("profiles").update({
      first_name: input.firstName.trim(), last_name: input.lastName.trim(),
      phone: input.phone.trim(), company_position: input.companyPosition.trim(),
    }).eq("user_id", auth.user.id).select("id").single();
    if (error) throw error;
    const { error: photoError } = await supabase.auth.updateUser({ data: { avatar_url: input.avatarUrl } });
    if (photoError) throw new Error("Profile details saved, but the photo could not be saved. Please try again.");
    setUser(await loadProfile(auth.user.id, auth.user.email ?? "", input.avatarUrl));
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, ready, signIn, signUp, signOut, updateProfile }),
    [user, ready, signIn, signUp, signOut, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
