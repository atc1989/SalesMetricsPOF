import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/layout/AppSidebar";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
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
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <SiteHeader />
          <main className="flex-1">
            <div className="mx-auto w-full max-w-screen-2xl px-4 py-6 lg:px-6">
              {children}
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </AuthProvider>
  );
}
