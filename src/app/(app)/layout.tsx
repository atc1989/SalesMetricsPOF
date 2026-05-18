import { redirect } from "next/navigation";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const devBypass = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true";

  let user = null;
  if (!devBypass) {
    const supabase = await getSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
    if (!user) {
      redirect("/login");
    }
  }

  return (
    <AuthProvider initialUser={user}>
      <div className="flex min-h-screen flex-col">
        <AppTopbar />
        <main className="flex-1">
          <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </AuthProvider>
  );
}
