import type { Metadata } from "next";
import { AppTopbar } from "@/components/layout/AppTopbar";
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
        <div className="flex min-h-screen flex-col">
          <AppTopbar />
          <main className="flex-1">
            <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
