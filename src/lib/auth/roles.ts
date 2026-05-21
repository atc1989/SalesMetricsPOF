export const APP_ROLES = ["super_admin", "sales", "operations"] as const;

export type AppRole = (typeof APP_ROLES)[number];

export type AppUserProfile = {
  userId: string;
  email: string;
  fullName: string | null;
  role: AppRole;
  isActive: boolean;
};

export const DEFAULT_APP_ROLE: AppRole = "sales";

export const ROLE_DEFAULT_PATH: Record<AppRole, string> = {
  super_admin: "/",
  sales: "/",
  operations: "/",
};

const ROLE_PAGE_PREFIXES: Record<AppRole, string[]> = {
  super_admin: ["/"],
  sales: [
    "/",
    "/sales",
    "/daily-sales",
    "/encoder",
    "/inventory-movement",
  ],
  operations: ["/bills", "/pcf", "/event-forms", "/forms"],
};

const ROLE_API_PREFIXES: Record<AppRole, string[]> = {
  super_admin: ["/api"],
  sales: [
    "/api/assistant",
    "/api/cash-on-hand",
    "/api/daily-sales",
    "/api/dashboard",
    "/api/inventory-movement",
    "/api/reports",
    "/api/sales",
    "/api/user-account",
  ],
  operations: ["/api/assistant", "/api/user-account"],
};

function matchesPrefix(pathname: string, prefix: string) {
  if (prefix === "/") {
    return pathname === "/";
  }

  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && APP_ROLES.includes(value as AppRole);
}

export function normalizeAppRole(value: unknown): AppRole {
  return isAppRole(value) ? value : DEFAULT_APP_ROLE;
}

export function isPathAllowedForRole(role: AppRole, pathname: string) {
  if (role === "super_admin") {
    return true;
  }

  const prefixes = pathname.startsWith("/api")
    ? ROLE_API_PREFIXES[role]
    : ROLE_PAGE_PREFIXES[role];

  return prefixes.some((prefix) => matchesPrefix(pathname, prefix));
}

export function getDefaultPathForRole(role: AppRole) {
  return ROLE_DEFAULT_PATH[role];
}

export function getRolePagePrefixes(role: AppRole) {
  return ROLE_PAGE_PREFIXES[role];
}
