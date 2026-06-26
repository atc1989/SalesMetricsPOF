'use client';

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ── constants (mirrors EncoderTab primaryPaymentModes) ────────────────────────

const PAYMENT_MODES = [
  'CASH',
  'BANK',
  'MAYA(IGI)',
  'MAYA(ATC)',
  'SBCOLLECT(IGI)',
  'SBCOLLECT(ATC)',
  'EWALLET',
  'CHEQUE',
  'EPOINTS',
  'CONSIGNMENT',
  'AR(CSA)',
  'AR(LEADERSUPPORT)',
] as const;

type PaymentMode = (typeof PAYMENT_MODES)[number];

// ── helpers ───────────────────────────────────────────────────────────────────

type RangeType = 'daily' | 'weekly' | 'monthly' | 'custom';

const toIsoDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const today = toIsoDate(new Date());

function calcRange(type: RangeType, from: string, to: string): { from: string; to: string } {
  const anchor = new Date(`${to || today}T00:00:00`);
  if (type === 'custom') return { from, to };
  if (type === 'daily') { const d = toIsoDate(anchor); return { from: d, to: d }; }
  if (type === 'weekly') {
    const f = new Date(anchor); f.setDate(anchor.getDate() - anchor.getDay());
    const t = new Date(f); t.setDate(f.getDate() + 6);
    return { from: toIsoDate(f), to: toIsoDate(t) };
  }
  const f = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const t = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  return { from: toIsoDate(f), to: toIsoDate(t) };
}

const peso = (v: number) =>
  `₱${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ── types ─────────────────────────────────────────────────────────────────────

type BalanceRow = {
  date: string;
  salesByMode: Record<string, number>;
  totalSales: number;
  expensesByCategory: Record<string, number>;
  totalExpenses: number;
  balance: number;
};

type ApiResponse = {
  success: boolean;
  rows: BalanceRow[];
  totals: { totalSales: number; totalExpenses: number; balance: number };
  allPaymentModes: string[];
  allExpenseCategories: string[];
};

// ── SalesExemptionFilter — dropdown style matching EncoderTab MOP ─────────────

function SalesExemptionFilter({
  excluded,
  onAdd,
  onRemove,
}: {
  excluded: string[];
  onAdd: (mode: string) => void;
  onRemove: (mode: string) => void;
}) {
  const available = PAYMENT_MODES.filter((m) => !excluded.includes(m));

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Sales — Mode of Payment Exemptions
      </p>
      <div className="flex flex-wrap items-start gap-3">
        <div className="w-56">
          <Select
            value=""
            onValueChange={(val) => { if (val) onAdd(val); }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select mode to exempt…" />
            </SelectTrigger>
            <SelectContent>
              {available.map((mode) => (
                <SelectItem key={mode} value={mode}>
                  {mode}
                </SelectItem>
              ))}
              {available.length === 0 && (
                <SelectItem value="__none__" disabled>
                  All modes exempted
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {excluded.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {excluded.map((mode) => (
              <span
                key={mode}
                className="inline-flex items-center gap-1 rounded bg-destructive/10 border border-destructive/30 px-2 py-0.5 text-xs text-destructive"
              >
                {mode}
                <button
                  onClick={() => onRemove(mode)}
                  className="hover:text-destructive/70 transition-colors"
                  aria-label={`Remove ${mode} exemption`}
                >
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── ExpensesExemptionFilter — same dropdown pattern for expense categories ────

function ExpensesExemptionFilter({
  options,
  excluded,
  onAdd,
  onRemove,
}: {
  options: string[];
  excluded: string[];
  onAdd: (cat: string) => void;
  onRemove: (cat: string) => void;
}) {
  const available = options.filter((c) => !excluded.includes(c));
  if (!options.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Expenses — Category Exemptions
      </p>
      <div className="flex flex-wrap items-start gap-3">
        <div className="w-56">
          <Select
            value=""
            onValueChange={(val) => { if (val) onAdd(val); }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category to exempt…" />
            </SelectTrigger>
            <SelectContent>
              {available.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
              {available.length === 0 && (
                <SelectItem value="__none__" disabled>
                  All categories exempted
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {excluded.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {excluded.map((cat) => (
              <span
                key={cat}
                className="inline-flex items-center gap-1 rounded bg-destructive/10 border border-destructive/30 px-2 py-0.5 text-xs text-destructive"
              >
                {cat}
                <button
                  onClick={() => onRemove(cat)}
                  className="hover:text-destructive/70 transition-colors"
                  aria-label={`Remove ${cat} exemption`}
                >
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function BalanceReportTab() {
  const [rangeType, setRangeType] = useState<RangeType>('daily');
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);

  const [rawData, setRawData] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [excludedPaymentModes, setExcludedPaymentModes] = useState<string[]>([]);
  const [excludedExpenseCategories, setExcludedExpenseCategories] = useState<string[]>([]);

  const activeRange = useMemo(
    () => calcRange(rangeType, fromDate, toDate),
    [rangeType, fromDate, toDate]
  );

  const isCustom = rangeType === 'custom';

  const fetchReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/reports/balance-report?dateFrom=${activeRange.from}&dateTo=${activeRange.to}`
      );
      const json: ApiResponse = await res.json();
      if (!json.success) throw new Error('Failed to load balance report.');
      setRawData(json);
      setExcludedPaymentModes([]);
      setExcludedExpenseCategories([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchReport(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Client-side exemption filtering ──────────────────────────────────────

  const filteredRows = useMemo<BalanceRow[]>(() => {
    if (!rawData) return [];
    return rawData.rows.map((row) => {
      const filteredSalesByMode: Record<string, number> = {};
      let filteredSales = 0;
      for (const [mode, amount] of Object.entries(row.salesByMode)) {
        if (!excludedPaymentModes.includes(mode)) {
          filteredSalesByMode[mode] = amount;
          filteredSales += amount;
        }
      }

      const filteredExpensesByCategory: Record<string, number> = {};
      let filteredExpenses = 0;
      for (const [cat, amount] of Object.entries(row.expensesByCategory)) {
        if (!excludedExpenseCategories.includes(cat)) {
          filteredExpensesByCategory[cat] = amount;
          filteredExpenses += amount;
        }
      }

      return {
        ...row,
        salesByMode: filteredSalesByMode,
        totalSales: filteredSales,
        expensesByCategory: filteredExpensesByCategory,
        totalExpenses: filteredExpenses,
        balance: filteredSales - filteredExpenses,
      };
    });
  }, [rawData, excludedPaymentModes, excludedExpenseCategories]);

  const grandTotals = useMemo(
    () =>
      filteredRows.reduce(
        (acc, r) => ({
          totalSales: acc.totalSales + r.totalSales,
          totalExpenses: acc.totalExpenses + r.totalExpenses,
          balance: acc.balance + r.balance,
        }),
        { totalSales: 0, totalExpenses: 0, balance: 0 }
      ),
    [filteredRows]
  );

  const categoryTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of filteredRows) {
      for (const [cat, amount] of Object.entries(row.expensesByCategory)) {
        map.set(cat, (map.get(cat) ?? 0) + amount);
      }
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [filteredRows]);

  const addPaymentMode = (mode: string) =>
    setExcludedPaymentModes((prev) => (prev.includes(mode) ? prev : [...prev, mode]));
  const removePaymentMode = (mode: string) =>
    setExcludedPaymentModes((prev) => prev.filter((m) => m !== mode));

  const addExpenseCategory = (cat: string) =>
    setExcludedExpenseCategories((prev) => (prev.includes(cat) ? prev : [...prev, cat]));
  const removeExpenseCategory = (cat: string) =>
    setExcludedExpenseCategories((prev) => prev.filter((c) => c !== cat));

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Controls ── */}
      <Card className="p-4 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Range</label>
            <Select value={rangeType} onValueChange={(v) => setRangeType(v as RangeType)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!isCustom && (
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Anchor date</label>
              <DatePicker
                value={toDate}
                onChange={(val) => {
                  setToDate(val);
                  setFromDate(val);
                }}
              />
            </div>
          )}

          {isCustom && (
            <>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">From</label>
                <DatePicker value={fromDate} onChange={setFromDate} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">To</label>
                <DatePicker value={toDate} onChange={setToDate} />
              </div>
            </>
          )}

          <Button onClick={fetchReport} disabled={isLoading}>
            {isLoading ? 'Loading…' : 'Generate'}
          </Button>
        </div>

        {/* ── Exemption filters (shown after data loads) ── */}
        <div className="border-t pt-3 space-y-4">
          <SalesExemptionFilter
            excluded={excludedPaymentModes}
            onAdd={addPaymentMode}
            onRemove={removePaymentMode}
          />
          {rawData && rawData.allExpenseCategories.length > 0 && (
            <ExpensesExemptionFilter
              options={rawData.allExpenseCategories}
              excluded={excludedExpenseCategories}
              onAdd={addExpenseCategory}
              onRemove={removeExpenseCategory}
            />
          )}
        </div>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* ── Daily Balance Table ── */}
      {filteredRows.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b">
            <h2 className="text-sm font-semibold">
              Daily Balance —{' '}
              {activeRange.from === activeRange.to
                ? activeRange.from
                : `${activeRange.from} to ${activeRange.to}`}
            </h2>
            {excludedPaymentModes.length > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Sales excludes: {excludedPaymentModes.join(', ')}
              </p>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Date</th>
                  <th className="text-right px-4 py-2 font-medium">Sales</th>
                  <th className="text-right px-4 py-2 font-medium">Expenses</th>
                  <th className="text-right px-4 py-2 font-medium">Balance</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.date} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-2 tabular-nums">{row.date}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{peso(row.totalSales)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-destructive/80">
                      {row.totalExpenses > 0 ? `(${peso(row.totalExpenses)})` : '—'}
                    </td>
                    <td
                      className={[
                        'px-4 py-2 text-right tabular-nums font-medium',
                        row.balance < 0 ? 'text-destructive' : 'text-green-600',
                      ].join(' ')}
                    >
                      {peso(row.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 bg-muted/50 font-semibold">
                <tr>
                  <td className="px-4 py-2">Total</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {peso(grandTotals.totalSales)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-destructive/80">
                    {grandTotals.totalExpenses > 0
                      ? `(${peso(grandTotals.totalExpenses)})`
                      : '—'}
                  </td>
                  <td
                    className={[
                      'px-4 py-2 text-right tabular-nums',
                      grandTotals.balance < 0 ? 'text-destructive' : 'text-green-600',
                    ].join(' ')}
                  >
                    {peso(grandTotals.balance)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {/* ── Expenses by Category ── */}
      {categoryTotals.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b">
            <h2 className="text-sm font-semibold">Expenses by Category</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Category</th>
                  <th className="text-right px-4 py-2 font-medium">Amount</th>
                  <th className="text-right px-4 py-2 font-medium">% of Expenses</th>
                </tr>
              </thead>
              <tbody>
                {categoryTotals.map(([cat, amount]) => (
                  <tr key={cat} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-2">{cat}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{peso(amount)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                      {grandTotals.totalExpenses > 0
                        ? `${((amount / grandTotals.totalExpenses) * 100).toFixed(1)}%`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 bg-muted/50 font-semibold">
                <tr>
                  <td className="px-4 py-2">Total</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {peso(grandTotals.totalExpenses)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {!isLoading && rawData && filteredRows.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No data found for the selected period.
        </p>
      )}
    </div>
  );
}
