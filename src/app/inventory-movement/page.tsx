"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import {
  INITIAL_BLISTER_STOCK,
  INITIAL_BOTTLE_STOCK,
  type InventoryMovementDayRow,
  type InventoryStockInRow,
} from "@/lib/inventoryMovement";

type InventoryMovementResponse = {
  success: boolean;
  message?: string;
  stockInSetupRequired?: boolean;
  rows?: InventoryMovementDayRow[];
  stockIns?: InventoryStockInRow[];
  totals?: {
    bottleIn: number;
    bottleOut: number;
    blisterIn: number;
    blisterOut: number;
  };
  summary?: {
    initialBottleStock: number;
    initialBlisterStock: number;
    rangeOpeningBottleStock: number;
    rangeOpeningBlisterStock: number;
    rangeClosingBottleStock: number;
    rangeClosingBlisterStock: number;
  };
};

type SaveStockInResponse = {
  success: boolean;
  message?: string;
};

function toIsoDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateLabel(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}

function formatExcelDateLabel(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const day = String(parsed.getDate()).padStart(2, "0");
  const month = parsed.toLocaleString("en-US", { month: "short" });
  const year = String(parsed.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

function getDefaultDateRange() {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  return {
    dateFrom: toIsoDate(monthStart),
    dateTo: toIsoDate(today),
  };
}

export default function InventoryMovementPage() {
  const defaults = useMemo(() => getDefaultDateRange(), []);
  const [dateFrom, setDateFrom] = useState(defaults.dateFrom);
  const [dateTo, setDateTo] = useState(defaults.dateTo);
  const [rows, setRows] = useState<InventoryMovementDayRow[]>([]);
  const [stockIns, setStockIns] = useState<InventoryStockInRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [noticeMessage, setNoticeMessage] = useState("");
  const [stockInSetupRequired, setStockInSetupRequired] = useState(false);
  const [isStockInModalOpen, setIsStockInModalOpen] = useState(false);
  const [movementDate, setMovementDate] = useState(defaults.dateTo);
  const [bottleIn, setBottleIn] = useState("");
  const [blisterIn, setBlisterIn] = useState("");
  const [note, setNote] = useState("");
  const [summary, setSummary] = useState({
    initialBottleStock: INITIAL_BOTTLE_STOCK,
    initialBlisterStock: INITIAL_BLISTER_STOCK,
    rangeOpeningBottleStock: INITIAL_BOTTLE_STOCK,
    rangeOpeningBlisterStock: INITIAL_BLISTER_STOCK,
    rangeClosingBottleStock: INITIAL_BOTTLE_STOCK,
    rangeClosingBlisterStock: INITIAL_BLISTER_STOCK,
  });
  const [totals, setTotals] = useState({
    bottleIn: 0,
    bottleOut: 0,
    blisterIn: 0,
    blisterOut: 0,
  });

  useEffect(() => {
    const controller = new AbortController();

    async function loadInventoryMovement() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const params = new URLSearchParams({ dateFrom, dateTo });
        const response = await fetch(`/api/inventory-movement?${params.toString()}`, {
          signal: controller.signal,
        });
        const payload = (await response.json()) as InventoryMovementResponse;

        if (!response.ok || !payload.success) {
          throw new Error(payload.message ?? "Failed to load inventory movement.");
        }

        setRows(payload.rows ?? []);
        setStockIns(payload.stockIns ?? []);
        setStockInSetupRequired(payload.stockInSetupRequired === true);
        setTotals(
          payload.totals ?? {
            bottleIn: 0,
            bottleOut: 0,
            blisterIn: 0,
            blisterOut: 0,
          },
        );
        setSummary(
          payload.summary ?? {
            initialBottleStock: INITIAL_BOTTLE_STOCK,
            initialBlisterStock: INITIAL_BLISTER_STOCK,
            rangeOpeningBottleStock: INITIAL_BOTTLE_STOCK,
            rangeOpeningBlisterStock: INITIAL_BLISTER_STOCK,
            rangeClosingBottleStock: INITIAL_BOTTLE_STOCK,
            rangeClosingBlisterStock: INITIAL_BLISTER_STOCK,
          },
        );
        setNoticeMessage(payload.stockInSetupRequired ? payload.message ?? "" : "");
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        setRows([]);
        setStockIns([]);
        setTotals({
          bottleIn: 0,
          bottleOut: 0,
          blisterIn: 0,
          blisterOut: 0,
        });
        setSummary({
          initialBottleStock: INITIAL_BOTTLE_STOCK,
          initialBlisterStock: INITIAL_BLISTER_STOCK,
          rangeOpeningBottleStock: INITIAL_BOTTLE_STOCK,
          rangeOpeningBlisterStock: INITIAL_BLISTER_STOCK,
          rangeClosingBottleStock: INITIAL_BOTTLE_STOCK,
          rangeClosingBlisterStock: INITIAL_BLISTER_STOCK,
        });
        setStockInSetupRequired(false);
        setErrorMessage(error instanceof Error ? error.message : "Failed to load inventory movement.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadInventoryMovement();

    return () => controller.abort();
  }, [dateFrom, dateTo]);

  const handleSaveStockIn = async () => {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setNoticeMessage("");

    try {
      const response = await fetch("/api/inventory-movement/stock-in", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          movementDate,
          bottleIn,
          blisterIn,
          note,
        }),
      });
      const payload = (await response.json()) as SaveStockInResponse;

      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Failed to save stock-in record.");
      }

      setIsStockInModalOpen(false);
      setBottleIn("");
      setBlisterIn("");
      setNote("");
      setNoticeMessage("Stock-in entry saved.");

      const params = new URLSearchParams({ dateFrom, dateTo });
      const reloadResponse = await fetch(`/api/inventory-movement?${params.toString()}`);
      const reloadPayload = (await reloadResponse.json()) as InventoryMovementResponse;

      if (!reloadResponse.ok || !reloadPayload.success) {
        throw new Error(reloadPayload.message ?? "Saved, but failed to refresh inventory movement.");
      }

      setRows(reloadPayload.rows ?? []);
      setStockIns(reloadPayload.stockIns ?? []);
      setStockInSetupRequired(reloadPayload.stockInSetupRequired === true);
      setTotals(
        reloadPayload.totals ?? {
          bottleIn: 0,
          bottleOut: 0,
          blisterIn: 0,
          blisterOut: 0,
        },
      );
      setSummary(
        reloadPayload.summary ?? {
          initialBottleStock: INITIAL_BOTTLE_STOCK,
          initialBlisterStock: INITIAL_BLISTER_STOCK,
          rangeOpeningBottleStock: INITIAL_BOTTLE_STOCK,
          rangeOpeningBlisterStock: INITIAL_BLISTER_STOCK,
          rangeClosingBottleStock: INITIAL_BOTTLE_STOCK,
          rangeClosingBlisterStock: INITIAL_BLISTER_STOCK,
        },
      );
      if (reloadPayload.stockInSetupRequired) {
        setNoticeMessage(reloadPayload.message ?? "");
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save stock-in record.");
    } finally {
      setIsSaving(false);
    }
  };

  const disableSave =
    isSaving ||
    !movementDate ||
    ((bottleIn.trim() === "" || Number(bottleIn) === 0) &&
      (blisterIn.trim() === "" || Number(blisterIn) === 0));

  const handleExportExcel = () => {
    const worksheetData: Array<Array<string | number>> = [
      ["", "", "Inventory Movement", "", "", "", "", "", ""],
      ["Date", "Bottles", "", "", "", "Blister", "", "", ""],
      ["", "Opening", "In", "Out", "Closing", "Opening", "In", "Out", "Closing"],
      ...rows.map((row) => [
        formatExcelDateLabel(row.date),
        row.bottleOpening,
        row.bottleIn,
        row.bottleOut,
        row.bottleClosing,
        row.blisterOpening,
        row.blisterIn,
        row.blisterOut,
        row.blisterClosing,
      ]),
    ];

    if (rows.length === 0) {
      worksheetData.push([
        "No rows found",
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
      ]);
    }

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    worksheet["!merges"] = [
      { s: { r: 0, c: 2 }, e: { r: 0, c: 7 } },
      { s: { r: 1, c: 1 }, e: { r: 1, c: 4 } },
      { s: { r: 1, c: 5 }, e: { r: 1, c: 8 } },
      { s: { r: 1, c: 0 }, e: { r: 2, c: 0 } },
    ];
    worksheet["!cols"] = [
      { wch: 14 },
      { wch: 12 },
      { wch: 9 },
      { wch: 9 },
      { wch: 12 },
      { wch: 12 },
      { wch: 9 },
      { wch: 9 },
      { wch: 12 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory Movement");
    XLSX.writeFile(workbook, `inventory-movement-${dateFrom}-to-${dateTo}.xlsx`);
  };

  return (
    <main className="mx-auto max-w-7xl space-y-6">
      <Card className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Inventory Movement</h1>
            <p className="mt-1 text-sm text-slate-600">
              Track bottle and blister opening, stock-in, released, and closing balances by date.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={handleExportExcel} disabled={isLoading}>
              Export Excel
            </Button>
            <Button onClick={() => setIsStockInModalOpen(true)} disabled={stockInSetupRequired}>
              Add Stock In
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <label className="flex flex-col text-xs font-medium text-slate-700">
            FROM
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="mt-1 rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col text-xs font-medium text-slate-700">
            TO
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="mt-1 rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Initial Bottle Stock</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{formatNumber(summary.initialBottleStock)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Initial Blister Stock</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{formatNumber(summary.initialBlisterStock)}</p>
            </div>
          </div>
        </div>

        {errorMessage ? <p className="text-sm text-amber-700">{errorMessage}</p> : null}
        {noticeMessage ? <p className="text-sm text-emerald-700">{noticeMessage}</p> : null}
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-slate-500">Bottle Range Opening</p>
          <p className="text-2xl font-semibold text-slate-900">{formatNumber(summary.rangeOpeningBottleStock)}</p>
          <p className="text-xs text-slate-500">Closing: {formatNumber(summary.rangeClosingBottleStock)}</p>
        </Card>
        <Card className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-slate-500">Blister Range Opening</p>
          <p className="text-2xl font-semibold text-slate-900">{formatNumber(summary.rangeOpeningBlisterStock)}</p>
          <p className="text-xs text-slate-500">Closing: {formatNumber(summary.rangeClosingBlisterStock)}</p>
        </Card>
        <Card className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-slate-500">Bottle Movement</p>
          <p className="text-sm text-slate-700">In: {formatNumber(totals.bottleIn)}</p>
          <p className="text-sm text-slate-700">Out: {formatNumber(totals.bottleOut)}</p>
        </Card>
        <Card className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-slate-500">Blister Movement</p>
          <p className="text-sm text-slate-700">In: {formatNumber(totals.blisterIn)}</p>
          <p className="text-sm text-slate-700">Out: {formatNumber(totals.blisterOut)}</p>
        </Card>
      </div>

      <Card className="p-0">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-base font-semibold text-slate-900">
            Daily Movement Table ({formatDateLabel(dateFrom)} to {formatDateLabel(dateTo)})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Bottle Opening</th>
                <th className="px-3 py-2">Bottle In</th>
                <th className="px-3 py-2">Bottle Out</th>
                <th className="px-3 py-2">Bottle Closing</th>
                <th className="px-3 py-2">Blister Opening</th>
                <th className="px-3 py-2">Blister In</th>
                <th className="px-3 py-2">Blister Out</th>
                <th className="px-3 py-2">Blister Closing</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-slate-500">
                    Loading inventory movement...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-slate-500">
                    No inventory movement rows found for the selected date range.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.date} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium text-slate-900">{formatDateLabel(row.date)}</td>
                    <td className="px-3 py-2">{formatNumber(row.bottleOpening)}</td>
                    <td className="px-3 py-2 text-emerald-700">{formatNumber(row.bottleIn)}</td>
                    <td className="px-3 py-2 text-rose-700">{formatNumber(row.bottleOut)}</td>
                    <td className="px-3 py-2 font-semibold text-slate-900">{formatNumber(row.bottleClosing)}</td>
                    <td className="px-3 py-2">{formatNumber(row.blisterOpening)}</td>
                    <td className="px-3 py-2 text-emerald-700">{formatNumber(row.blisterIn)}</td>
                    <td className="px-3 py-2 text-rose-700">{formatNumber(row.blisterOut)}</td>
                    <td className="px-3 py-2 font-semibold text-slate-900">{formatNumber(row.blisterClosing)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-0">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-base font-semibold text-slate-900">Stock-In Entries In Selected Range</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Bottle In</th>
                <th className="px-3 py-2">Blister In</th>
                <th className="px-3 py-2">Note</th>
                <th className="px-3 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {stockIns.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                    No stock-in entries in this date range yet.
                  </td>
                </tr>
              ) : (
                stockIns.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">{formatDateLabel(row.movement_date)}</td>
                    <td className="px-3 py-2">{formatNumber(row.bottle_in)}</td>
                    <td className="px-3 py-2">{formatNumber(row.blister_in)}</td>
                    <td className="px-3 py-2">{row.note || "-"}</td>
                    <td className="px-3 py-2">
                      {row.created_at ? new Date(row.created_at).toLocaleString("en-US") : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        isOpen={isStockInModalOpen}
        title="Add Stock In"
        onClose={() => setIsStockInModalOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsStockInModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveStockIn} disabled={disableSave}>
              {isSaving ? "Saving..." : "Save Stock In"}
            </Button>
          </>
        }
      >
        <div className="grid gap-3">
          <label className="flex flex-col text-xs font-medium text-slate-700">
            DATE
            <input
              type="date"
              value={movementDate}
              onChange={(event) => setMovementDate(event.target.value)}
              className="mt-1 rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col text-xs font-medium text-slate-700">
            BOTTLE IN
            <input
              type="number"
              min="0"
              step="1"
              value={bottleIn}
              onChange={(event) => setBottleIn(event.target.value)}
              className="mt-1 rounded border border-slate-300 px-3 py-2 text-sm"
              placeholder="0"
            />
          </label>
          <label className="flex flex-col text-xs font-medium text-slate-700">
            BLISTER IN
            <input
              type="number"
              min="0"
              step="1"
              value={blisterIn}
              onChange={(event) => setBlisterIn(event.target.value)}
              className="mt-1 rounded border border-slate-300 px-3 py-2 text-sm"
              placeholder="0"
            />
          </label>
          <label className="flex flex-col text-xs font-medium text-slate-700">
            NOTE
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="mt-1 min-h-24 rounded border border-slate-300 px-3 py-2 text-sm"
              placeholder="Optional note"
            />
          </label>
        </div>
      </Modal>
    </main>
  );
}
