import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Papa from "papaparse";
import * as XLSX from "xlsx";

type ExportableBudget = {
  request_date?: string;
  reference_no?: string;
  vendor?: { name?: string };
  remarks?: string | null;
  payment_method?: string;
  payment_methods?: string[];
  priority_level?: string;
  total_amount?: number | string | null;
  status?: string;
  created_by?: string;
};

type ExportMeta = {
  filters?: string;
};

export type ExportFormat = "csv" | "xlsx" | "pdf";

export function exportBudgets(budgets: ExportableBudget[], format: ExportFormat, meta?: ExportMeta) {
  if (format === "csv") return exportBudgetsToCSV(budgets);
  if (format === "xlsx") return exportBudgetsToExcel(budgets);
  if (format === "pdf") return exportBudgetsToPDF(budgets, meta);
  throw new Error(`Unknown export format: ${format}`);
}

const formatDate = (value: string | undefined) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toISOString().slice(0, 10);
};

const formatDateTime = (value: Date) => {
  const yyyy = value.getFullYear();
  const mm = String(value.getMonth() + 1).padStart(2, "0");
  const dd = String(value.getDate()).padStart(2, "0");
  const hh = String(value.getHours()).padStart(2, "0");
  const min = String(value.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
};

const toSentenceCase = (value: string) =>
  value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

const formatPaymentMethod = (value: string) => {
  switch (value) {
    case "bank_transfer":
      return "Bank Transfer";
    case "check":
      return "Check";
    case "cash":
      return "Cash";
    case "other":
      return "Other";
    default:
      return toSentenceCase(value);
  }
};

export const formatPeso = (amount: number) =>
  `\u20b1${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const getExportDate = () => new Date().toISOString().slice(0, 10);

export function mapBudgetsToExportRows(budgets: ExportableBudget[]) {
  return budgets.map((budget) => {
    const paymentMethods = Array.from(
      new Set(
        (budget.payment_methods?.length ? budget.payment_methods : budget.payment_method ? [budget.payment_method] : [])
          .filter(Boolean)
          .map(formatPaymentMethod)
      )
    );
    const total = Number(budget.total_amount ?? 0);

    return {
      Date: formatDate(budget.request_date),
      "Reference No.": budget.reference_no ?? "",
      "Payee / Vendor": budget.vendor?.name ?? "",
      "Purpose Summary": budget.remarks ?? "",
      "Payment Method": paymentMethods.join(", "),
      Priority: toSentenceCase(budget.priority_level ?? ""),
      "Total Amount": formatPeso(Number.isFinite(total) ? total : 0),
      Status: toSentenceCase(budget.status ?? ""),
      "Requested By": budget.created_by ?? ""
    };
  });
}

export function exportBudgetsToCSV(budgets: ExportableBudget[]) {
  const rows = mapBudgetsToExportRows(budgets);
  const csv = Papa.unparse(rows, {
    columns: [
      "Date",
      "Reference No.",
      "Payee / Vendor",
      "Purpose Summary",
      "Payment Method",
      "Priority",
      "Total Amount",
      "Status",
      "Requested By"
    ]
  });

  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  saveAs(blob, `budget_requests_${getExportDate()}.csv`);
}

export function exportBudgetsToExcel(budgets: ExportableBudget[]) {
  const rows = mapBudgetsToExportRows(budgets);
  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: [
      "Date",
      "Reference No.",
      "Payee / Vendor",
      "Purpose Summary",
      "Payment Method",
      "Priority",
      "Total Amount",
      "Status",
      "Requested By"
    ]
  });

  worksheet["!cols"] = [
    { wch: 12 },
    { wch: 18 },
    { wch: 24 },
    { wch: 36 },
    { wch: 24 },
    { wch: 12 },
    { wch: 16 },
    { wch: 18 },
    { wch: 20 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Payment Requests");
  XLSX.writeFile(workbook, `budget_requests_${getExportDate()}.xlsx`);
}

export function exportBudgetsToPDF(budgets: ExportableBudget[], meta?: ExportMeta) {
  const rows = mapBudgetsToExportRows(budgets);
  const exportedAt = formatDateTime(new Date());
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4"
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Payment Requests", 40, 34);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Exported: ${exportedAt}`, 40, 50);
  if (meta?.filters) {
    doc.text(`Filters: ${meta.filters}`, 40, 64);
  }

  autoTable(doc, {
    startY: meta?.filters ? 74 : 60,
    head: [
      [
        "Date",
        "Reference No.",
        "Payee / Vendor",
        "Purpose Summary",
        "Payment Method",
        "Priority",
        "Total Amount",
        "Status",
        "Requested By"
      ]
    ],
    body: rows.map((row) => [
      row.Date,
      row["Reference No."],
      row["Payee / Vendor"],
      row["Purpose Summary"],
      row["Payment Method"],
      row.Priority,
      row["Total Amount"],
      row.Status,
      row["Requested By"]
    ]),
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 4
    },
    headStyles: {
      fillColor: [30, 64, 175],
      textColor: [255, 255, 255]
    },
    columnStyles: {
      3: { cellWidth: 220 },
      6: { halign: "right" }
    },
    didParseCell: (hookData) => {
      if (hookData.column.index === 6) {
        hookData.cell.styles.halign = "right";
      }
    }
  });

  doc.save(`budget_requests_${getExportDate()}.pdf`);
}
