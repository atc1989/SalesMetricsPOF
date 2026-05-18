import type { Session, User } from "@supabase/supabase-js";

export type SignInResult = { ok: true } | { ok: false; error: string };

export type AuthContextValue = {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
};
