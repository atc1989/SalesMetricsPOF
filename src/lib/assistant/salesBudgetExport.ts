import type { SupabaseClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

import type { AppRole } from "@/lib/auth/roles";

type ExportScope = {
  includeSales: boolean;
  includeOperations: boolean;
};

type SalesRow = {
  daily_sales_id?: number | string | null;
  trans_date?: string | null;
  pof_number?: string | null;
  member_name?: string | null;
  username?: string | null;
  package_type?: string | null;
  quantity?: number | string | null;
  released_count?: number | string | null;
  released_blpk_count?: number | string | null;
  sales?: number | string | null;
  sales_two?: number | string | null;
  sales_three?: number | string | null;
  mode_of_payment?: string | null;
  payment_type?: string | null;
  remarks?: string | null;
};

type BillRow = {
  request_date?: string | null;
  reference_no?: string | null;
  vendor?: { name?: string | null } | Array<{ name?: string | null }> | null;
  remarks?: string | null;
  payment_method?: string | null;
  priority_level?: string | null;
  total_amount?: number | string | null;
  status?: string | null;
};

type PcfRow = {
  date?: string | null;
  pcv_number?: string | null;
  payee?: string | null;
  invoice_no?: string | null;
  description?: string | null;
  amount_in?: number | string | null;
  amount_out?: number | string | null;
  balance?: number | string | null;
  transaction_type?: string | null;
  status?: string | null;
  is_liquidated?: boolean | null;
};

export type SalesBudgetExportResult = {
  buffer: Buffer;
  filename: string;
  summary: {
    dateFrom: string;
    dateTo: string;
    salesRows: number;
    billsRows: number;
    pcfRows: number;
    totalSales: number;
    totalReleasedBottles: number;
    totalBills: number;
    totalPcfOut: number;
  };
};

export function isValidExportDate(value: string | null) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export function assertValidExportDateRange(dateFrom: string | null, dateTo: string | null) {
  if (!isValidExportDate(dateFrom) || !isValidExportDate(dateTo)) {
    throw new Error("dateFrom and dateTo are required in YYYY-MM-DD format.");
  }

  const validDateFrom = dateFrom as string;
  const validDateTo = dateTo as string;

  if (validDateFrom > validDateTo) {
    throw new Error("dateFrom must be before or equal to dateTo.");
  }

  return { dateFrom: validDateFrom, dateTo: validDateTo };
}

export function getSalesBudgetExportScope(role: AppRole, requested?: Partial<ExportScope>) {
  const wantsSales = requested?.includeSales ?? role !== "operations";
  const wantsOperations = requested?.includeOperations ?? role !== "sales";

  return {
    includeSales: role === "operations" ? false : wantsSales,
    includeOperations: role === "sales" ? false : wantsOperations,
  };
}

export function createSalesBudgetExportUrl(input: {
  dateFrom: string;
  dateTo: string;
  includeSales: boolean;
  includeOperations: boolean;
}) {
  const params = new URLSearchParams({
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    includeSales: String(input.includeSales),
    includeOperations: String(input.includeOperations),
  });

  return `/api/assistant/exports/sales-budget?${params.toString()}`;
}

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

function formatValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function getVendorName(vendor: BillRow["vendor"]) {
  if (Array.isArray(vendor)) {
    return vendor[0]?.name ?? "";
  }

  return vendor?.name ?? "";
}

function setColumnWidths(sheet: XLSX.WorkSheet, widths: number[]) {
  sheet["!cols"] = widths.map((wch) => ({ wch }));
}

function appendSheet(workbook: XLSX.WorkBook, name: string, rows: object[], widths: number[]) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  setColumnWidths(worksheet, widths);
  XLSX.utils.book_append_sheet(workbook, worksheet, name);
}

async function fetchSalesRows(
  supabase: SupabaseClient,
  dateFrom: string,
  dateTo: string,
) {
  const { data, error } = await supabase
    .from("daily_sales")
    .select(
      "daily_sales_id,trans_date,pof_number,member_name,username,package_type,quantity,released_count,released_blpk_count,sales,sales_two,sales_three,mode_of_payment,payment_type,remarks",
    )
    .gte("trans_date", dateFrom)
    .lte("trans_date", dateTo)
    .order("trans_date", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as SalesRow[];
}

async function fetchBillRows(
  supabase: SupabaseClient,
  dateFrom: string,
  dateTo: string,
) {
  const { data, error } = await supabase
    .from("bills")
    .select(
      "request_date,reference_no,remarks,payment_method,priority_level,total_amount,status,vendor:vendors(name)",
    )
    .gte("request_date", dateFrom)
    .lte("request_date", dateTo)
    .order("request_date", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as BillRow[];
}

async function fetchPcfRows(
  supabase: SupabaseClient,
  dateFrom: string,
  dateTo: string,
) {
  const { data, error } = await supabase
    .from("pcf_transactions")
    .select(
      "date,pcv_number,payee,invoice_no,description,amount_in,amount_out,balance,transaction_type,status,is_liquidated",
    )
    .gte("date", dateFrom)
    .lte("date", dateTo)
    .order("date", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as PcfRow[];
}

export async function buildSalesBudgetWorkbook(
  supabase: SupabaseClient,
  input: {
    dateFrom: string;
    dateTo: string;
    scope: ExportScope;
  },
): Promise<SalesBudgetExportResult> {
  const [salesRows, billRows, pcfRows] = await Promise.all([
    input.scope.includeSales ? fetchSalesRows(supabase, input.dateFrom, input.dateTo) : [],
    input.scope.includeOperations
      ? fetchBillRows(supabase, input.dateFrom, input.dateTo)
      : [],
    input.scope.includeOperations
      ? fetchPcfRows(supabase, input.dateFrom, input.dateTo)
      : [],
  ]);

  const salesExportRows = salesRows.map((row) => {
    const totalSales =
      toNumber(row.sales) + toNumber(row.sales_two) + toNumber(row.sales_three);

    return {
      Date: formatValue(row.trans_date),
      "POF Number": formatValue(row.pof_number),
      Member: formatValue(row.member_name),
      Username: formatValue(row.username),
      Package: formatValue(row.package_type),
      Quantity: toNumber(row.quantity),
      "Released Bottles": toNumber(row.released_count),
      "Released Blisters": toNumber(row.released_blpk_count),
      "Sales 1": toNumber(row.sales),
      "Sales 2": toNumber(row.sales_two),
      "Sales 3": toNumber(row.sales_three),
      "Total Sales": totalSales,
      "Mode of Payment": formatValue(row.mode_of_payment),
      "Payment Type": formatValue(row.payment_type),
      Remarks: formatValue(row.remarks),
    };
  });

  const billsExportRows = billRows.map((row) => ({
    Date: formatValue(row.request_date),
    "Reference No.": formatValue(row.reference_no),
    Vendor: getVendorName(row.vendor),
    Remarks: formatValue(row.remarks),
    "Payment Method": formatValue(row.payment_method),
    Priority: formatValue(row.priority_level),
    Amount: toNumber(row.total_amount),
    Status: formatValue(row.status),
  }));

  const pcfExportRows = pcfRows.map((row) => ({
    Date: formatValue(row.date),
    "PCV Number": formatValue(row.pcv_number),
    Payee: formatValue(row.payee),
    "Invoice No.": formatValue(row.invoice_no),
    Description: formatValue(row.description),
    "Amount In": toNumber(row.amount_in),
    "Amount Out": toNumber(row.amount_out),
    Balance: toNumber(row.balance),
    Type: formatValue(row.transaction_type),
    Status: formatValue(row.status),
    Liquidated: row.is_liquidated ? "Yes" : "No",
  }));

  const totalSales = salesExportRows.reduce(
    (sum, row) => sum + toNumber(row["Total Sales"]),
    0,
  );
  const totalReleasedBottles = salesExportRows.reduce(
    (sum, row) => sum + toNumber(row["Released Bottles"]),
    0,
  );
  const totalBills = billsExportRows.reduce((sum, row) => sum + toNumber(row.Amount), 0);
  const totalPcfOut = pcfExportRows.reduce(
    (sum, row) => sum + toNumber(row["Amount Out"]),
    0,
  );

  const workbook = XLSX.utils.book_new();
  appendSheet(
    workbook,
    "Summary",
    [
      { Metric: "Date From", Value: input.dateFrom },
      { Metric: "Date To", Value: input.dateTo },
      { Metric: "Sales Rows", Value: salesRows.length },
      { Metric: "Total Sales", Value: totalSales },
      { Metric: "Released Bottles", Value: totalReleasedBottles },
      { Metric: "Bills Rows", Value: billRows.length },
      { Metric: "Total Bills", Value: totalBills },
      { Metric: "PCF Rows", Value: pcfRows.length },
      { Metric: "Total PCF Out", Value: totalPcfOut },
    ],
    [24, 18],
  );

  if (input.scope.includeSales) {
    appendSheet(
      workbook,
      "Sales",
      salesExportRows,
      [12, 16, 26, 22, 18, 12, 18, 18, 14, 14, 14, 14, 18, 18, 32],
    );
  }

  if (input.scope.includeOperations) {
    appendSheet(
      workbook,
      "Bills",
      billsExportRows,
      [12, 18, 28, 36, 18, 14, 14, 18],
    );
    appendSheet(
      workbook,
      "PCF",
      pcfExportRows,
      [12, 18, 28, 18, 36, 14, 14, 14, 18, 18, 12],
    );
  }

  const buffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "buffer",
  }) as Buffer;

  return {
    buffer,
    filename: `sales-budget-${input.dateFrom}-to-${input.dateTo}.xlsx`,
    summary: {
      dateFrom: input.dateFrom,
      dateTo: input.dateTo,
      salesRows: salesRows.length,
      billsRows: billRows.length,
      pcfRows: pcfRows.length,
      totalSales,
      totalReleasedBottles,
      totalBills,
      totalPcfOut,
    },
  };
}
