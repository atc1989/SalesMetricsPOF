"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AuthContextValue } from "@/lib/auth/authTypes";
import { getAppUserProfile } from "@/lib/auth/profile";
import type { AppUserProfile } from "@/lib/auth/roles";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const devBypassUser = {
  id: "dev-bypass-user",
  email: "dev@salesmetrics.local",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: { display_name: "Dev User" },
  aud: "authenticated",
  created_at: "1970-01-01T00:00:00.000Z",
} as User;

const devBypassProfile: AppUserProfile = {
  userId: devBypassUser.id,
  email: devBypassUser.email ?? "",
  fullName: "Dev User",
  role: "super_admin",
  isActive: true,
};

export function AuthProvider({
  children,
  initialUser = null,
  initialSession = null,
  initialProfile = null,
}: {
  children: React.ReactNode;
  initialUser?: User | null;
  initialSession?: Session | null;
  initialProfile?: AppUserProfile | null;
}) {
  const devBypassEnabled =
    process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true";

  const [user, setUser] = useState<User | null>(
    devBypassEnabled ? devBypassUser : initialUser,
  );
  const [session, setSession] = useState<Session | null>(initialSession);
  const [profile, setProfile] = useState<AppUserProfile | null>(
    devBypassEnabled ? devBypassProfile : initialProfile,
  );
  const [isLoading, setIsLoading] = useState(!initialUser && !devBypassEnabled);

  useEffect(() => {
    if (devBypassEnabled) {
      return;
    }

    const supabase = getSupabaseBrowserClient();
    let isMounted = true;

    async function loadSession() {
      try {
        const { data }: { data: { session: Session | null } } =
          await supabase.auth.getSession();

        if (!isMounted) return;

        const nextUser = data.session?.user ?? null;
        setSession(data.session ?? null);
        setUser(nextUser);

        if (!nextUser) {
          setProfile(null);
          setIsLoading(false);
          return;
        }

        const { profile: nextProfile } = await getAppUserProfile(
          supabase,
          nextUser.id,
        );

        if (!isMounted) return;
        if (nextProfile) {
          setProfile(nextProfile);
        }
        setIsLoading(false);
      } catch {
        if (!isMounted) return;
        setSession(null);
        setUser(null);
        setProfile(null);
        setIsLoading(false);
      }
    }

    loadSession();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event: string, nextSession: Session | null) => {
        if (!isMounted) return;

        const nextUser = nextSession?.user ?? null;
        setSession(nextSession);
        setUser(nextUser);

        if (!nextUser) {
          setProfile(null);
          return;
        }

        getAppUserProfile(supabase, nextUser.id).then(({ profile: nextProfile }) => {
          if (!isMounted) return;
          if (nextProfile) {
            setProfile(nextProfile);
          }
        });
      },
    );

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [devBypassEnabled]);

  const signIn: AuthContextValue["signIn"] = useCallback(async (email, password) => {
    if (devBypassEnabled) {
      setUser(devBypassUser);
      setSession(null);
      setProfile(devBypassProfile);
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
  }, [devBypassEnabled]);

  const signOut: AuthContextValue["signOut"] = useCallback(async () => {
    if (devBypassEnabled) {
      setUser(null);
      setSession(null);
      setProfile(null);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  }, [devBypassEnabled]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      profile,
      isAuthenticated: Boolean(user),
      isLoading,
      signIn,
      signOut,
    }),
    [user, session, profile, isLoading, signIn, signOut],
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
