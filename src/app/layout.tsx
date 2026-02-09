import type { Metadata } from "next";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { Sidebar } from "@/components/layout/Sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "SalesMetrics",
  description: "SalesMetrics UI-first App Router skeleton",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex min-h-screen min-w-0 flex-1 flex-col">
            <header className="border-b border-slate-200 bg-white md:hidden">
              <div className="flex items-center justify-between px-4 py-4 sm:px-6">
                <h1 className="text-xl font-semibold tracking-tight">SalesMetrics</h1>
                <MobileSidebar />
              </div>
            </header>
            <main className="flex-1">
              <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
