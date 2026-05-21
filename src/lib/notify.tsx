"use client";

// Shadcnstudio @ss-components/sonner-03 pattern as a reusable helper:
// emit a sonner toast whose body is a custom React node containing a
// lucide icon + message. Lets every call site pick a contextual icon
// (Download for exports, Save for saves, ShieldCheck for approvals, etc.)
// instead of falling back to sonner's generic success/error icon.
//
// Usage:
//   import { notify } from "@/lib/notify";
//   import { Download } from "lucide-react";
//   notify(Download, `Exported ${rows.length} rows`);

import * as React from "react";
import { toast } from "sonner";
import type { LucideIcon } from "lucide-react";

type NotifyOptions = {
  description?: React.ReactNode;
  duration?: number;
  id?: string | number;
};

function bodyWithIcon(Icon: LucideIcon, message: React.ReactNode) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function notify(
  icon: LucideIcon,
  message: React.ReactNode,
  options?: NotifyOptions,
) {
  return toast(bodyWithIcon(icon, message), options);
}

export function notifySuccess(
  icon: LucideIcon,
  message: React.ReactNode,
  options?: NotifyOptions,
) {
  return toast.success(bodyWithIcon(icon, message), {
    ...options,
    icon: null,
  });
}

export function notifyError(
  icon: LucideIcon,
  message: React.ReactNode,
  options?: NotifyOptions,
) {
  return toast.error(bodyWithIcon(icon, message), {
    ...options,
    icon: null,
  });
}
