import type { Session, User } from "@supabase/supabase-js";
import type { AppUserProfile } from "@/lib/auth/roles";

export type SignInResult = { ok: true } | { ok: false; error: string };

export type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: AppUserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
};
