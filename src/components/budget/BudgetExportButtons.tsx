import React, { useState } from "react";
import { AlertCircle, Download, SearchX } from "lucide-react";
import { notify } from "@/lib/notify";
import { fetchBudgetsForExport } from "@/services/budgetExportFetch";
import { exportBudgets, type ExportFormat } from "@/utils/budgetExport";

type budgetExportButtonsProps = {
  activeTab: string;
  searchQuery: string;
  dateFrom: string;
  dateTo: string;
};

type ExportOption = {
  key: ExportFormat;
  label: string;
};

const EXPORT_OPTIONS: ExportOption[] = [
  { key: "csv", label: "CSV" },
  { key: "xlsx", label: "Excel" },
  { key: "pdf", label: "PDF" }
];

export function budgetExportButtons({
  activeTab,
  searchQuery,
  dateFrom,
  dateTo
}: budgetExportButtonsProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: ExportFormat) => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      const result = await fetchBudgetsForExport({
        activeTab,
        searchQuery,
        dateFrom,
        dateTo
      });

      if (result.error) {
        notify(AlertCircle, result.error);
        return;
      }

      if (!result.data.length) {
        notify(SearchX, "No records found for the selected filters.");
        return;
      }

      await exportBudgets(result.data, format);
      notify(Download, `Exported ${result.data.length} record(s) to ${format.toUpperCase()}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to export payment requests.";
      notify(AlertCircle, message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {EXPORT_OPTIONS.map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={() => handleExport(option.key)}
          disabled={isExporting}
          className="px-3 py-1.5 text-sm font-medium rounded-full border border-input text-muted-foreground bg-card hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
