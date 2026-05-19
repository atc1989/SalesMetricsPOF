"use client";

import Link from "next/link";

export default function ErrorPage() {
  return (
    <div className="rounded-lg border border-red-200 bg-card p-6">
      <h2 className="text-xl font-semibold text-foreground">Something went wrong.</h2>
      <p className="mt-2 text-sm text-muted-foreground">A mock error page is available for graceful fallback routing.</p>
      <div className="mt-4">
        <Link
          href="/"
          className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
