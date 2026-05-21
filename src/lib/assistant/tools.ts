import type { SupabaseClient } from "@supabase/supabase-js";
import type { FunctionDeclaration } from "@google/genai";
import type {
  FunctionTool,
  ResponseFunctionToolCall,
} from "openai/resources/responses/responses";

import {
  ASSISTANT_TOOLS,
  getAllowedAssistantTools,
  isAssistantToolAllowed,
} from "@/lib/assistant/permissions";
import {
  assertValidExportDateRange,
  createSalesBudgetExportUrl,
  getSalesBudgetExportScope,
} from "@/lib/assistant/salesBudgetExport";
import type { AppRole } from "@/lib/auth/roles";

type ToolArgs = Record<string, unknown>;

type NumericRecord = Record<string, number>;

const dateRangeSchema = {
  type: "object",
  properties: {
    dateFrom: {
      type: "string",
      description: "Start date in YYYY-MM-DD format.",
    },
    dateTo: {
      type: "string",
      description: "End date in YYYY-MM-DD format.",
    },
  },
  required: ["dateFrom", "dateTo"],
  additionalProperties: false,
};

const noArgsSchema = {
  type: "object",
  properties: {},
  required: [],
  additionalProperties: false,
};

const salesBudgetExportSchema = {
  type: "object",
  properties: {
    dateFrom: {
      type: "string",
      description: "Start date in YYYY-MM-DD format.",
    },
    dateTo: {
      type: "string",
      description: "End date in YYYY-MM-DD format.",
    },
    includeSales: {
      type: "boolean",
      description: "Whether to include sales rows when allowed by the user role.",
    },
    includeOperations: {
      type: "boolean",
      description:
        "Whether to include bills and PCF budget request rows when allowed by the user role.",
    },
  },
  required: ["dateFrom", "dateTo", "includeSales", "includeOperations"],
  additionalProperties: false,
};

const TOOL_PARAMETERS: Record<string, FunctionTool["parameters"]> = {
  get_sales_summary: dateRangeSchema,
  get_daily_sales_report: dateRangeSchema,
  get_inventory_movement_summary: dateRangeSchema,
  get_sales_dashboard_kpis: dateRangeSchema,
  get_bills_summary: dateRangeSchema,
  get_pcf_summary: dateRangeSchema,
  get_event_forms_summary: dateRangeSchema,
  generate_sales_budget_xlsx: salesBudgetExportSchema,
  explain_system_navigation: noArgsSchema,
};

type DailySalesRow = {
  trans_date: string | null;
  pof_number: string | null;
  member_name: string | null;
  username: string | null;
  package_type: string | null;
  quantity: number | string | null;
  released_count: number | string | null;
  released_blpk_count: number | string | null;
  to_follow_count: number | string | null;
  to_follow_blpk_count: number | string | null;
  sales: number | string | null;
  sales_two: number | string | null;
  sales_three: number | string | null;
};

type InventoryMovementRow = {
  movement_date: string | null;
  bottle_opening: number | string | null;
  bottle_in: number | string | null;
  bottle_out: number | string | null;
  bottle_closing: number | string | null;
  blister_opening: number | string | null;
  blister_in: number | string | null;
  blister_out: number | string | null;
  blister_closing: number | string | null;
};

type BillRow = {
  request_date: string | null;
  status: string | null;
  priority_level: string | null;
  payment_method: string | null;
  total_amount: number | string | null;
};

type PcfRow = {
  date: string | null;
  status: string | null;
  transaction_type: string | null;
  amount_in: number | string | null;
  amount_out: number | string | null;
  balance: number | string | null;
  is_liquidated: boolean | null;
};

type FormSubmissionRow = {
  form_type: string | null;
  created_at: string | null;
};

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function asDate(value: unknown) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : null;
}

function getDateRange(args: ToolArgs) {
  const dateFrom = asDate(args.dateFrom);
  const dateTo = asDate(args.dateTo);

  if (!dateFrom || !dateTo) {
    throw new Error("dateFrom and dateTo are required in YYYY-MM-DD format.");
  }

  if (dateFrom > dateTo) {
    throw new Error("dateFrom must be before or equal to dateTo.");
  }

  return { dateFrom, dateTo };
}

function countBy(rows: Array<Record<string, unknown>>, key: string) {
  return rows.reduce<NumericRecord>((acc, row) => {
    const value = typeof row[key] === "string" && row[key] ? row[key] : "Unknown";
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

function sumBy(rows: Array<Record<string, unknown>>, key: string) {
  return rows.reduce((sum, row) => sum + toNumber(row[key]), 0);
}

function parseArguments(call: ResponseFunctionToolCall): ToolArgs {
  if (!call.arguments.trim()) {
    return {};
  }

  const parsed = JSON.parse(call.arguments) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {};
  }

  return parsed as ToolArgs;
}

export function getGeminiAssistantTools(role: AppRole): FunctionDeclaration[] {
  const allowed = new Set(getAllowedAssistantTools(role).map((tool) => tool.name));

  return ASSISTANT_TOOLS.filter((tool) => allowed.has(tool.name)).map((tool) => ({
    name: tool.name,
    description: tool.description,
    parametersJsonSchema: TOOL_PARAMETERS[tool.name] ?? noArgsSchema,
  }));
}

export function getOpenAIAssistantTools(role: AppRole): FunctionTool[] {
  const allowed = new Set(getAllowedAssistantTools(role).map((tool) => tool.name));

  return ASSISTANT_TOOLS.filter((tool) => allowed.has(tool.name)).map((tool) => ({
    type: "function",
    name: tool.name,
    description: tool.description,
    parameters: TOOL_PARAMETERS[tool.name] ?? noArgsSchema,
    strict: true,
  }));
}

export async function runAssistantToolByName(
  supabase: SupabaseClient,
  role: AppRole,
  name: string,
  args: ToolArgs,
) {
  if (!isAssistantToolAllowed(role, name)) {
    return {
      error: `Tool ${name} is not allowed for role ${role}.`,
    };
  }

  switch (name) {
    case "get_sales_summary":
    case "get_daily_sales_report":
    case "get_sales_dashboard_kpis":
      return getSalesSummary(supabase, args);
    case "get_inventory_movement_summary":
      return getInventoryMovementSummary(supabase, args);
    case "get_bills_summary":
      return getBillsSummary(supabase, args);
    case "get_pcf_summary":
      return getPcfSummary(supabase, args);
    case "get_event_forms_summary":
      return getEventFormsSummary(supabase, args);
    case "generate_sales_budget_xlsx":
      return generateSalesBudgetXlsx(role, args);
    case "explain_system_navigation":
      return getSystemNavigation(role);
    default:
      return {
        error: `Unknown tool ${name}.`,
      };
  }
}

function getBooleanArg(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function generateSalesBudgetXlsx(role: AppRole, args: ToolArgs) {
  const { dateFrom, dateTo } = assertValidExportDateRange(
    typeof args.dateFrom === "string" ? args.dateFrom : null,
    typeof args.dateTo === "string" ? args.dateTo : null,
  );
  const requestedScope = {
    includeSales: getBooleanArg(args.includeSales),
    includeOperations: getBooleanArg(args.includeOperations),
  };
  const scope = getSalesBudgetExportScope(role, requestedScope);

  if (!scope.includeSales && !scope.includeOperations) {
    return {
      error: "No exportable sheets are allowed for this role.",
      role,
    };
  }

  return {
    dateFrom,
    dateTo,
    role,
    includedSheets: {
      sales: scope.includeSales,
      bills: scope.includeOperations,
      pcf: scope.includeOperations,
    },
    downloadUrl: createSalesBudgetExportUrl({
      dateFrom,
      dateTo,
      includeSales: scope.includeSales,
      includeOperations: scope.includeOperations,
    }),
    note:
      "Return the downloadUrl to the user. Explain that the file is generated when they open the link.",
  };
}

export async function runAssistantTool(
  supabase: SupabaseClient,
  role: AppRole,
  call: ResponseFunctionToolCall,
) {
  return runAssistantToolByName(supabase, role, call.name, parseArguments(call));
}

async function getSalesSummary(supabase: SupabaseClient, args: ToolArgs) {
  const { dateFrom, dateTo } = getDateRange(args);
  const { data, error } = await supabase
    .from("daily_sales")
    .select(
      "trans_date,pof_number,member_name,username,package_type,quantity,released_count,released_blpk_count,to_follow_count,to_follow_blpk_count,sales,sales_two,sales_three",
    )
    .gte("trans_date", dateFrom)
    .lte("trans_date", dateTo)
    .order("trans_date", { ascending: false });

  if (error) {
    return { error: error.message, code: error.code };
  }

  const rows = (data ?? []) as DailySalesRow[];
  const recordRows = rows as Array<Record<string, unknown>>;
  const totalSales = rows.reduce(
    (sum, row) =>
      sum + toNumber(row.sales) + toNumber(row.sales_two) + toNumber(row.sales_three),
    0,
  );

  return {
    dateFrom,
    dateTo,
    totalTransactions: rows.length,
    totalSales,
    totalQuantity: sumBy(recordRows, "quantity"),
    totalReleasedBottles: sumBy(recordRows, "released_count"),
    totalReleasedBlisters: sumBy(recordRows, "released_blpk_count"),
    totalToFollowBottles: sumBy(recordRows, "to_follow_count"),
    totalToFollowBlisters: sumBy(recordRows, "to_follow_blpk_count"),
    byPackageType: countBy(recordRows, "package_type"),
    recentRows: rows.slice(0, 10),
  };
}

async function getInventoryMovementSummary(supabase: SupabaseClient, args: ToolArgs) {
  const { dateFrom, dateTo } = getDateRange(args);
  const { data, error } = await supabase
    .from("inventory_movement_daily")
    .select(
      "movement_date,bottle_opening,bottle_in,bottle_out,bottle_closing,blister_opening,blister_in,blister_out,blister_closing",
    )
    .gte("movement_date", dateFrom)
    .lte("movement_date", dateTo)
    .order("movement_date", { ascending: true });

  if (error) {
    return { error: error.message, code: error.code };
  }

  const rows = (data ?? []) as InventoryMovementRow[];
  const first = rows[0] ?? null;
  const last = rows[rows.length - 1] ?? null;
  const recordRows = rows as Array<Record<string, unknown>>;

  return {
    dateFrom,
    dateTo,
    days: rows.length,
    bottleIn: sumBy(recordRows, "bottle_in"),
    bottleOut: sumBy(recordRows, "bottle_out"),
    blisterIn: sumBy(recordRows, "blister_in"),
    blisterOut: sumBy(recordRows, "blister_out"),
    openingBottleStock: toNumber(first?.bottle_opening),
    closingBottleStock: toNumber(last?.bottle_closing),
    openingBlisterStock: toNumber(first?.blister_opening),
    closingBlisterStock: toNumber(last?.blister_closing),
    rows,
  };
}

async function getBillsSummary(supabase: SupabaseClient, args: ToolArgs) {
  const { dateFrom, dateTo } = getDateRange(args);
  const { data, error } = await supabase
    .from("bills")
    .select("request_date,status,priority_level,payment_method,total_amount")
    .gte("request_date", dateFrom)
    .lte("request_date", dateTo)
    .order("request_date", { ascending: false });

  if (error) {
    return { error: error.message, code: error.code };
  }

  const rows = (data ?? []) as BillRow[];
  const recordRows = rows as Array<Record<string, unknown>>;

  return {
    dateFrom,
    dateTo,
    totalBills: rows.length,
    totalAmount: sumBy(recordRows, "total_amount"),
    byStatus: countBy(recordRows, "status"),
    byPriority: countBy(recordRows, "priority_level"),
    byPaymentMethod: countBy(recordRows, "payment_method"),
  };
}

async function getPcfSummary(supabase: SupabaseClient, args: ToolArgs) {
  const { dateFrom, dateTo } = getDateRange(args);
  const { data, error } = await supabase
    .from("pcf_transactions")
    .select("date,status,transaction_type,amount_in,amount_out,balance,is_liquidated")
    .gte("date", dateFrom)
    .lte("date", dateTo)
    .order("date", { ascending: false });

  if (error) {
    return { error: error.message, code: error.code };
  }

  const rows = (data ?? []) as PcfRow[];
  const recordRows = rows as Array<Record<string, unknown>>;
  const liquidatedCount = rows.filter((row) => row.is_liquidated).length;

  return {
    dateFrom,
    dateTo,
    totalTransactions: rows.length,
    totalIn: sumBy(recordRows, "amount_in"),
    totalOut: sumBy(recordRows, "amount_out"),
    endingBalance: rows.length ? toNumber(rows[0]?.balance) : 0,
    liquidatedCount,
    unliquidatedCount: rows.length - liquidatedCount,
    byStatus: countBy(recordRows, "status"),
    byType: countBy(recordRows, "transaction_type"),
  };
}

async function getEventFormsSummary(supabase: SupabaseClient, args: ToolArgs) {
  const { dateFrom, dateTo } = getDateRange(args);
  const fromTimestamp = `${dateFrom}T00:00:00.000Z`;
  const toTimestamp = `${dateTo}T23:59:59.999Z`;

  const [{ data: submissions, error: submissionsError }, { count: printCount, error: printError }] =
    await Promise.all([
      supabase
        .from("form_submissions")
        .select("form_type,created_at")
        .gte("created_at", fromTimestamp)
        .lte("created_at", toTimestamp),
      supabase
        .from("print_logs")
        .select("id", { count: "exact", head: true })
        .gte("printed_at", fromTimestamp)
        .lte("printed_at", toTimestamp),
    ]);

  if (submissionsError) {
    return { error: submissionsError.message, code: submissionsError.code };
  }

  if (printError) {
    return { error: printError.message, code: printError.code };
  }

  const rows = (submissions ?? []) as FormSubmissionRow[];
  const recordRows = rows as Array<Record<string, unknown>>;

  return {
    dateFrom,
    dateTo,
    totalSubmissions: rows.length,
    totalPrints: printCount ?? 0,
    byFormType: countBy(recordRows, "form_type"),
  };
}

function getSystemNavigation(role: AppRole) {
  if (role === "super_admin") {
    return {
      role,
      pages: ["Dashboard", "Sales API", "Daily Sales", "Encoder", "Inventory Movement", "Bills", "PCF", "Event Forms"],
    };
  }

  if (role === "sales") {
    return {
      role,
      pages: ["Dashboard", "Sales API", "Daily Sales", "Encoder", "Inventory Movement"],
    };
  }

  return {
    role,
    pages: ["Bills", "PCF", "Event Forms"],
  };
}
