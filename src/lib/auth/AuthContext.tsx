"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AuthContextValue } from "@/lib/auth/authTypes";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const devBypassUser = {
  id: "dev-bypass-user",
  email: "dev@salesmetrics.local",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: { display_name: "Dev User" },
  aud: "authenticated",
  created_at: "1970-01-01T00:00:00.000Z",
} as User;

export function AuthProvider({
  children,
  initialUser = null,
  initialSession = null,
}: {
  children: React.ReactNode;
  initialUser?: User | null;
  initialSession?: Session | null;
}) {
  const devBypassEnabled =
    process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true";

  const [user, setUser] = useState<User | null>(
    devBypassEnabled ? devBypassUser : initialUser,
  );
  const [session, setSession] = useState<Session | null>(initialSession);
  const [isLoading, setIsLoading] = useState(!initialUser && !devBypassEnabled);

  useEffect(() => {
    if (devBypassEnabled) {
      setUser(devBypassUser);
      setSession(null);
      setIsLoading(false);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    let isMounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) return;
        setSession(data.session ?? null);
        setUser(data.session?.user ?? null);
        setIsLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setSession(null);
        setUser(null);
        setIsLoading(false);
      });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!isMounted) return;
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
      },
    );

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [devBypassEnabled]);

  const signIn: AuthContextValue["signIn"] = async (email, password) => {
    if (devBypassEnabled) {
      setUser(devBypassUser);
      setSession(null);
      setIsLoading(false);
      return { ok: true };
    }

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      return { ok: false, error: "Email and password are required." };
    }

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password: trimmedPassword,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  };

  const signOut: AuthContextValue["signOut"] = async () => {
    if (devBypassEnabled) {
      setUser(null);
      setSession(null);
      return;
    }
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      isAuthenticated: Boolean(user),
      isLoading,
      signIn,
      signOut,
    }),
    [user, session, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
