"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { useAuth } from "@/lib/auth/AuthContext";
import { getUserDisplayName } from "@/lib/auth/userDisplayName";
import { Button } from "@/components/ui/button";

export function UserMenu() {
  const { user, signOut, isLoading } = useAuth();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  if (isLoading || !user) return null;

  const displayName = getUserDisplayName(user) || user.email || "Signed in";

  async function handleSignOut() {
    setIsSigningOut(true);
    await signOut();
    setIsSigningOut(false);
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-sm text-muted-foreground sm:inline">
        {displayName}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={handleSignOut}
        disabled={isSigningOut}
        aria-label="Sign out"
      >
        <LogOut data-icon="inline-start" />
        {isSigningOut ? "Signing out…" : "Sign out"}
      </Button>
    </div>
  );
}
