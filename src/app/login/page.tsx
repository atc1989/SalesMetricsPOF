import { Suspense } from "react";
import { LoginForm } from "./LoginForm";
import { AuthProvider } from "@/lib/auth/AuthContext";

export const metadata = {
  title: "Sign in · SalesMetrics",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 px-4 py-12">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">SalesMetrics</h1>
          <p className="text-sm text-muted-foreground">Sign in to continue</p>
        </div>
        <AuthProvider>
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </AuthProvider>
      </div>
    </div>
  );
}
