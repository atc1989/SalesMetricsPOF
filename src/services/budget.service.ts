import { supabase } from "@/lib/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import type {
  Budget,
  BudgetBreakdown,
  BudgetDetails,
  BudgetStatus
} from "../types/billing";
import {
  buildBudgetSearchOrFilter,
  findVendorIdsForBudgetSearch,
  normalizeBudgetSearchTerm
} from "./budgetSearchFilters";

export interface ListBudgetsParams {
  status?: BudgetStatus;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface ListBudgetsForExportParams {
  status?: BudgetStatus;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  batchSize?: number;
}

export type ServiceError =
  | {
      code: "DUPLICATE_PRF";
      message: string;
    };

const BUDGET_BREAKDOWN_BASE_SELECT =
  "id,bill_id,payment_method,description,amount,bank_name,bank_account_name,bank_account_no";

function isMissingBudgetBreakdownsCategoryError(error: PostgrestError | null | undefined) {
  if (!error) return false;
  const joined = [error.message, error.details, error.hint]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ")
    .toLowerCase();

  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    joined.includes("bill_breakdowns.category") ||
    joined.includes("breakdowns(category)") ||
    joined.includes("could not find the 'category' column") ||
    joined.includes("could not find the 'category'") ||
    joined.includes("column category does not exist") ||
    (joined.includes("bill_breakdowns") && joined.includes("category") && joined.includes("does not exist"))
  );
}

function buildBudgetDetailsSelect(includeCategory: boolean) {
  const breakdownSelect = includeCategory
    ? `id,bill_id,payment_method,category,description,amount,bank_name,bank_account_name,bank_account_no`
    : BUDGET_BREAKDOWN_BASE_SELECT;

  return `
      id,
      vendor_id,
      reference_no,
      request_date,
      priority_level,
      payment_method,
      bank_name,
      bank_account_name,
      bank_account_no,
      status,
      remarks,
      rejection_reason,
      total_amount,
      created_by,
      created_at,
      updated_at,
      vendor:vendors!inner(id,name,address),
      breakdowns:bill_breakdowns(${breakdownSelect})
    `;
}

async function fetchBudgetBreakdownSummaries(budgetIds: string[]) {
  const withCategory = await supabase
    .from("bill_breakdowns")
    .select("bill_id,payment_method,category")
    .in("bill_id", budgetIds);

  if (!withCategory.error) {
    return {
      data: withCategory.data ?? [],
      hasCategory: true,
      error: null as PostgrestError | null
    };
  }

  if (!isMissingBudgetBreakdownsCategoryError(withCategory.error)) {
    return { data: [], hasCategory: false, error: withCategory.error };
  }

  const fallback = await supabase
    .from("bill_breakdowns")
    .select("bill_id,payment_method")
    .in("bill_id", budgetIds);

  if (fallback.error) {
    return { data: [], hasCategory: false, error: fallback.error };
  }

  return {
    data: (fallback.data ?? []).map((row: any) => ({ ...row, category: null })),
    hasCategory: false,
    error: null as PostgrestError | null
  };
}

function buildBreakdownInsertRows(
  billId: string,
  breakdowns: Array<Omit<BudgetBreakdown, "id" | "bill_id">>,
  includeCategory: boolean
) {
  return breakdowns.map((b) => {
    const row: Record<string, unknown> = {
      bill_id: billId,
      payment_method: b.payment_method,
      description: b.description ?? "",
      amount: roundMoney(b.amount),
      bank_name: b.payment_method === "bank_transfer" ? b.bank_name ?? null : null,
      bank_account_name: b.payment_method === "bank_transfer" ? b.bank_account_name ?? null : null,
      bank_account_no: b.payment_method === "bank_transfer" ? b.bank_account_no ?? null : null
    };

    if (includeCategory) {
      row.category = b.category?.trim() || null;
    }

    return row;
  });
}

async function insertBudgetBreakdowns(
  billId: string,
  breakdowns: Array<Omit<BudgetBreakdown, "id" | "bill_id">>
) {
  const rowsWithCategory = buildBreakdownInsertRows(billId, breakdowns, true);
  let { error } = await supabase.from("bill_breakdowns").insert(rowsWithCategory);

  if (!error) {
    return { error: null as string | null, categoryPersisted: true };
  }

  if (!isMissingBudgetBreakdownsCategoryError(error)) {
    return { error: mapDbError(error, "Failed to save breakdown lines."), categoryPersisted: true };
  }

  const rowsWithoutCategory = buildBreakdownInsertRows(billId, breakdowns, false);
  ({ error } = await supabase.from("bill_breakdowns").insert(rowsWithoutCategory));

  if (error) {
    return { error: mapDbError(error, "Failed to save breakdown lines."), categoryPersisted: false };
  }

  return { error: null as string | null, categoryPersisted: false };
}

export async function listBudgets(params: ListBudgetsParams) {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 10;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let request = supabase
    .from("bills")
    .select(
      `
      id,
      vendor_id,
      reference_no,
      request_date,
      priority_level,
      payment_method,
      bank_name,
      bank_account_name,
      bank_account_no,
      status,
      remarks,
      rejection_reason,
      total_amount,
      created_by,
      created_at,
      updated_at,
      vendor:vendors!inner(id,name,address)
    `,
      { count: "exact" }
    )
    .order("request_date", { ascending: false })
    .range(from, to);

  if (params.status) {
    request = request.eq("status", params.status);
  }

  if (params.dateFrom) {
    request = request.gte("request_date", params.dateFrom);
  }

  if (params.dateTo) {
    request = request.lte("request_date", params.dateTo);
  }

  if (params.search && params.search.trim()) {
    const searchTerm = normalizeBudgetSearchTerm(params.search);
    if (searchTerm) {
      const vendorSearch = await findVendorIdsForBudgetSearch(searchTerm);

      if (vendorSearch.error) {
        return { data: [], count: 0, error: vendorSearch.error };
      }

      request = request.or(buildBudgetSearchOrFilter(searchTerm, vendorSearch.data));
    }
  }

  const { data, error, count } = await request;

  if (error) {
    return { data: [], count: 0, error: error.message };
  }

  const budgets = (data ?? []) as unknown as Array<Budget & { vendor?: { id: string; name: string } }>;
  budgets.forEach((budget) => {
    if (Array.isArray(budget.vendor)) {
      budget.vendor = budget.vendor[0];
    }
  });

  if (budgets.length === 0) {
    return {
      data: budgets as Array<Budget & { vendor?: { id: string; name: string }; payment_methods: string[] }>,
      count: count ?? 0,
      error: null as string | null
    };
  }

  const budgetIds = budgets.map((budget) => budget.id);
  const { data: breakdowns, error: breakdownError, hasCategory } =
    await fetchBudgetBreakdownSummaries(budgetIds);

  if (breakdownError) {
    return { data: [], count: 0, error: breakdownError.message };
  }

  const paymentMethodsByBudget = new Map<string, Set<string>>();
  const categoriesByBudget = new Map<string, Set<string>>();
  (breakdowns ?? []).forEach((breakdown: any) => {
    if (!paymentMethodsByBudget.has(breakdown.bill_id)) {
      paymentMethodsByBudget.set(breakdown.bill_id, new Set());
    }
    if (!categoriesByBudget.has(breakdown.bill_id)) {
      categoriesByBudget.set(breakdown.bill_id, new Set());
    }
    if (breakdown.payment_method) {
      paymentMethodsByBudget.get(breakdown.bill_id)?.add(breakdown.payment_method);
    }
    if (typeof breakdown.category === "string" && breakdown.category.trim()) {
      categoriesByBudget.get(breakdown.bill_id)?.add(breakdown.category.trim());
    }
  });

  return {
    data: budgets.map((budget) => ({
      ...budget,
      payment_methods: Array.from(paymentMethodsByBudget.get(budget.id) ?? []),
      categories: hasCategory ? Array.from(categoriesByBudget.get(budget.id) ?? []) : []
    })) as Array<Budget & { vendor?: { id: string; name: string }; payment_methods: string[] }>,
    count: count ?? 0,
    error: null as string | null
  };
}

export async function listBudgetsForExport(params: ListBudgetsForExportParams) {
  const batchSize = params.batchSize ?? 1000;
  let offset = 0;
  const allBudgets: Array<Budget & { vendor?: { id: string; name: string } }> = [];

  while (true) {
    let request = supabase
      .from("bills")
      .select(
        `
        id,
        vendor_id,
        reference_no,
        request_date,
        priority_level,
        payment_method,
        bank_name,
        bank_account_name,
        bank_account_no,
        status,
        remarks,
        total_amount,
        created_by,
        created_at,
        updated_at,
        vendor:vendors!inner(id,name,address)
      `
      )
      .order("request_date", { ascending: false })
      .range(offset, offset + batchSize - 1);

    if (params.status) {
      request = request.eq("status", params.status);
    }

    if (params.dateFrom) {
      request = request.gte("request_date", params.dateFrom);
    }

    if (params.dateTo) {
      request = request.lte("request_date", params.dateTo);
    }

    if (params.search && params.search.trim()) {
      const searchTerm = normalizeBudgetSearchTerm(params.search);
      if (searchTerm) {
        const vendorSearch = await findVendorIdsForBudgetSearch(searchTerm);

        if (vendorSearch.error) {
          return { data: [], error: vendorSearch.error };
        }

        request = request.or(buildBudgetSearchOrFilter(searchTerm, vendorSearch.data));
      }
    }

    const { data, error } = await request;

    if (error) {
      return { data: [], error: error.message };
    }

    const batch = (data ?? []) as unknown as Array<Budget & { vendor?: { id: string; name: string } }>;
    batch.forEach((budget) => {
      if (Array.isArray(budget.vendor)) {
        budget.vendor = budget.vendor[0];
      }
    });

    if (!batch.length) {
      break;
    }

    allBudgets.push(...batch);

    if (batch.length < batchSize) {
      break;
    }

    offset += batchSize;
  }

  if (!allBudgets.length) {
    return {
      data: [] as Array<Budget & { vendor?: { id: string; name: string }; payment_methods: string[] }>,
      error: null as string | null
    };
  }

  const paymentMethodsByBudget = new Map<string, Set<string>>();
  const budgetIds = allBudgets.map((budget) => budget.id);
  const chunkSize = 1000;

  for (let start = 0; start < budgetIds.length; start += chunkSize) {
    const idChunk = budgetIds.slice(start, start + chunkSize);
    const { data: breakdowns, error: breakdownError } = await supabase
      .from("bill_breakdowns")
      .select("bill_id,payment_method")
      .in("bill_id", idChunk);

    if (breakdownError) {
      return { data: [], error: breakdownError.message };
    }

    (breakdowns ?? []).forEach((breakdown: any) => {
      if (!paymentMethodsByBudget.has(breakdown.bill_id)) {
        paymentMethodsByBudget.set(breakdown.bill_id, new Set());
      }
      if (breakdown.payment_method) {
        paymentMethodsByBudget.get(breakdown.bill_id)?.add(breakdown.payment_method);
      }
    });
  }

  return {
    data: allBudgets.map((budget) => ({
      ...budget,
      payment_methods: Array.from(paymentMethodsByBudget.get(budget.id) ?? [])
    })) as Array<Budget & { vendor?: { id: string; name: string }; payment_methods: string[] }>,
    error: null as string | null
  };
}

export async function generateReferenceNo(requestDate?: string) {
  const params = requestDate ? { p_request_date: requestDate } : {};
  const { data, error } = await supabase.rpc("generate_reference_no", params);

  if (error) {
    return {
      data: null as string | null,
      error: mapDbError(error, "Failed to generate reference number.")
    };
  }

  return { data: (data as string) || null, error: null as string | null };
}

export async function isReferenceNoTaken(referenceNo: string, excludeBillId?: string) {
  const value = referenceNo.trim();
  if (!value) return false;

  let query = supabase
    .from("bills")
    .select("id", { count: "exact", head: true })
    .eq("reference_no", value);

  if (excludeBillId) {
    query = query.neq("id", excludeBillId);
  }

  const { count, error } = await query;

  if (error) return false;
  return (count ?? 0) > 0;
}

function mapDbError(error: PostgrestError | null | undefined, fallback: string) {
  if (!error) return fallback;

  if (error.code === "23505") {
    const details = error.details || error.message || "";
    if (details.includes("reference_no") || details.includes("bills_reference_no_unique")) {
      return {
        code: "DUPLICATE_PRF",
        message: "PRF already existing"
      } satisfies ServiceError;
    }
  }

  if (error.code === "23514" && error.message.includes("bill_breakdowns_payment_method_check")) {
    return "One or more breakdown payment methods are invalid.";
  }

  if (error.code === "42501") {
    return "You do not have permission to perform this action.";
  }

  return error.message || fallback;
}

export async function getBudgetById(id: string) {
  let { data, error } = await supabase
    .from("bills")
    .select(buildBudgetDetailsSelect(true))
    .eq("id", id)
    .single();

  if (error && isMissingBudgetBreakdownsCategoryError(error)) {
    const fallbackResult = await supabase
      .from("bills")
      .select(buildBudgetDetailsSelect(false))
      .eq("id", id)
      .single();

    data = fallbackResult.data
      ? {
          ...fallbackResult.data,
          breakdowns: (fallbackResult.data.breakdowns ?? []).map((breakdown: any) => ({
            ...breakdown,
            category: null
          }))
        }
      : fallbackResult.data;
    error = fallbackResult.error;
  }

  if (error) {
    return { data: null as BudgetDetails | null, error: error.message };
  }

  const { data: attachments, error: attachmentError } = await supabase
    .from("bill_attachments")
    .select("id,bill_id,file_path,file_name,mime_type,file_size,uploaded_by,created_at")
    .eq("bill_id", id)
    .order("created_at", { ascending: true });

  if (attachmentError) {
    return { data: null as BudgetDetails | null, error: attachmentError.message };
  }

  return {
    data: {
      budget: {
        id: data.id,
        vendor_id: data.vendor_id,
        reference_no: data.reference_no,
        request_date: data.request_date,
        priority_level: data.priority_level,
        payment_method: data.payment_method,
        bank_name: data.bank_name,
        bank_account_name: data.bank_account_name,
        bank_account_no: data.bank_account_no,
        status: data.status,
        remarks: data.remarks,
        rejection_reason: data.rejection_reason,
        total_amount: data.total_amount,
        created_by: data.created_by,
        created_at: data.created_at,
        updated_at: data.updated_at
      },
      vendor: Array.isArray(data.vendor) ? data.vendor[0] : data.vendor,
      breakdowns: (data.breakdowns ?? []).map((breakdown: any) => ({
        ...breakdown,
        amount: roundMoney(breakdown.amount)
      })),
      attachments: attachments ?? []
    } as BudgetDetails,
    error: null as string | null
  };
}

function roundMoney(value: unknown) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return 0;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export interface CreateBillPayload {
  budget: Omit<Budget, "id" | "created_at" | "updated_at">;
  breakdowns: Array<Omit<BudgetBreakdown, "id" | "bill_id">>;
}

export async function createBudget(payload: CreateBillPayload) {
  const normalizedBudget = {
    ...payload.budget,
    total_amount: roundMoney(payload.budget.total_amount)
  };

  const { data: budget, error: billError } = await supabase
    .from("bills")
    .insert(normalizedBudget)
    .select(
      `
      id,
      vendor_id,
      reference_no,
      request_date,
      priority_level,
      payment_method,
      bank_name,
      bank_account_name,
      bank_account_no,
      status,
      remarks,
      rejection_reason,
      total_amount,
      created_by,
      created_at,
      updated_at
    `
    )
    .single();

  if (billError || !budget) {
    return {
      data: null as Budget | null,
      error: mapDbError(billError, "Failed to create budget request.")
    };
  }

  if (payload.breakdowns.length > 0) {
    const breakdownResult = await insertBudgetBreakdowns(budget.id, payload.breakdowns);
    if (breakdownResult.error) {
      return {
        data: budget as Budget,
        error: breakdownResult.error
      };
    }
  }

  return { data: budget as Budget, error: null as string | null };
}

export interface UpdateBillPayload {
  budget: Partial<Omit<Budget, "id" | "created_at" | "updated_at">>;
  breakdowns: Array<Omit<BudgetBreakdown, "id" | "bill_id">>;
}

export async function updateBudget(id: string, payload: UpdateBillPayload) {
  const { data: existingBreakdowns, error: existingBreakdownsError } = await supabase
    .from("bill_breakdowns")
    .select(BUDGET_BREAKDOWN_BASE_SELECT)
    .eq("bill_id", id);

  if (existingBreakdownsError) {
    return {
      data: null as Budget | null,
      error: mapDbError(existingBreakdownsError, "Failed to load current breakdown lines.")
    };
  }

  const normalizedBudget = {
    ...payload.budget,
    total_amount: roundMoney(payload.budget.total_amount)
  };

  const { data: updated, error: updateError } = await supabase
    .from("bills")
    .update(normalizedBudget)
    .eq("id", id)
    .select(
      `
      id,
      vendor_id,
      reference_no,
      request_date,
      priority_level,
      payment_method,
      bank_name,
      bank_account_name,
      bank_account_no,
      status,
      remarks,
      rejection_reason,
      total_amount,
      created_by,
      created_at,
      updated_at
    `
    )
    .single();

  if (updateError || !updated) {
    return {
      data: null as Budget | null,
      error: mapDbError(updateError, "Failed to update budget request.")
    };
  }

  const { error: deleteError } = await supabase
    .from("bill_breakdowns")
    .delete()
    .eq("bill_id", id);

  if (deleteError) {
    return { data: updated as Budget, error: mapDbError(deleteError, "Failed to update breakdown lines.") };
  }

  if (payload.breakdowns.length > 0) {
    const breakdownResult = await insertBudgetBreakdowns(id, payload.breakdowns);
    if (breakdownResult.error) {
      if ((existingBreakdowns ?? []).length > 0) {
        await supabase.from("bill_breakdowns").insert(existingBreakdowns);
      }
      return { data: updated as Budget, error: breakdownResult.error };
    }
  }

  return { data: updated as Budget, error: null as string | null };
}

export async function updateBudgetStatus(id: string, status: BudgetStatus, rejectionReason?: string | null) {
  const trimmedReason = (rejectionReason || "").trim();
  const updatePayload = {
    status,
    rejection_reason: status === "rejected" ? trimmedReason || null : null
  };

  const { data, error } = await supabase
    .from("bills")
    .update(updatePayload)
    .eq("id", id)
    .select(
      `
      id,
      vendor_id,
      reference_no,
      request_date,
      priority_level,
      payment_method,
      bank_name,
      bank_account_name,
      bank_account_no,
      status,
      remarks,
      rejection_reason,
      total_amount,
      created_by,
      created_at,
      updated_at
    `
    )
    .single();

  if (error || !data) {
    return { data: null as Budget | null, error: error?.message || "Failed to update Budget status." };
  }

  return { data: data as Budget, error: null as string | null };
}
