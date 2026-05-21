import type { AppRole } from "@/lib/auth/roles";

export const ASSISTANT_DOMAINS = ["sales", "operations", "system"] as const;

export type AssistantDomain = (typeof ASSISTANT_DOMAINS)[number];

export type AssistantToolDefinition = {
  name: string;
  domain: AssistantDomain;
  description: string;
};

export const ASSISTANT_TOOLS = [
  {
    name: "get_sales_summary",
    domain: "sales",
    description: "Summarize sales totals, transactions, and revenue for a date range.",
  },
  {
    name: "get_daily_sales_report",
    domain: "sales",
    description: "Read daily sales entries, POF records, and related report data.",
  },
  {
    name: "get_inventory_movement_summary",
    domain: "sales",
    description: "Summarize stock-in, releases, bottle movement, and inventory changes.",
  },
  {
    name: "get_sales_dashboard_kpis",
    domain: "sales",
    description: "Answer dashboard KPI questions about sales performance and agents.",
  },
  {
    name: "get_bills_summary",
    domain: "operations",
    description: "Summarize bills, statuses, approvals, payments, and vendors.",
  },
  {
    name: "get_pcf_summary",
    domain: "operations",
    description: "Summarize petty cash fund requests, liquidation, approvals, and voids.",
  },
  {
    name: "get_event_forms_summary",
    domain: "operations",
    description: "Summarize event forms, prospect invitations, print logs, and submissions.",
  },
  {
    name: "explain_system_navigation",
    domain: "system",
    description: "Explain accessible app pages, modules, and how to use visible features.",
  },
] as const satisfies readonly AssistantToolDefinition[];

const ROLE_ASSISTANT_DOMAINS: Record<AppRole, AssistantDomain[]> = {
  super_admin: ["sales", "operations", "system"],
  sales: ["sales", "system"],
  operations: ["operations", "system"],
};

const DOMAIN_KEYWORDS: Record<AssistantDomain, string[]> = {
  sales: [
    "agent",
    "bottle",
    "cash on hand",
    "dashboard",
    "daily sales",
    "encoder",
    "inventory",
    "movement",
    "pof",
    "release",
    "released",
    "sales",
    "stock",
  ],
  operations: [
    "approval",
    "bill",
    "billing",
    "event",
    "form",
    "liquidation",
    "payment",
    "pcf",
    "pcv",
    "petty cash",
    "print",
    "vendor",
    "void",
  ],
  system: [
    "access",
    "account",
    "feature",
    "help",
    "module",
    "navigate",
    "navigation",
    "page",
    "permission",
    "role",
  ],
};

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

export function getAllowedAssistantDomains(role: AppRole) {
  return ROLE_ASSISTANT_DOMAINS[role];
}

export function isAssistantDomainAllowed(role: AppRole, domain: AssistantDomain) {
  return ROLE_ASSISTANT_DOMAINS[role].includes(domain);
}

export function getAllowedAssistantTools(role: AppRole) {
  const domains = getAllowedAssistantDomains(role);
  return ASSISTANT_TOOLS.filter((tool) => domains.includes(tool.domain));
}

export function getAssistantTool(name: string) {
  return ASSISTANT_TOOLS.find((tool) => tool.name === name) ?? null;
}

export function isAssistantToolAllowed(role: AppRole, toolName: string) {
  const tool = getAssistantTool(toolName);
  return Boolean(tool && isAssistantDomainAllowed(role, tool.domain));
}

export function inferAssistantDomainsFromMessage(message: string): AssistantDomain[] {
  const normalized = normalizeText(message);
  if (!normalized) {
    return [];
  }

  return ASSISTANT_DOMAINS.filter((domain) =>
    DOMAIN_KEYWORDS[domain].some((keyword) => normalized.includes(keyword)),
  );
}

export function checkAssistantMessageAccess(role: AppRole, message: string) {
  const requestedDomains = inferAssistantDomainsFromMessage(message);
  const allowedDomains = getAllowedAssistantDomains(role);
  const deniedDomains = requestedDomains.filter(
    (domain) => !allowedDomains.includes(domain),
  );

  return {
    allowed: deniedDomains.length === 0,
    requestedDomains,
    allowedDomains,
    deniedDomains,
  };
}
