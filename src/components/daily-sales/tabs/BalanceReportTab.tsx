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

// ── constants ─────────────────────────────────────────────────────────────────

// Mirrors EncoderTab primaryPaymentModes
const SALES_PAYMENT_MODES = [
  'CASH', 'BANK', 'MAYA(IGI)', 'MAYA(ATC)', 'SBCOLLECT(IGI)', 'SBCOLLECT(ATC)',
  'EWALLET', 'CHEQUE', 'EPOINTS', 'CONSIGNMENT', 'AR(CSA)', 'AR(LEADERSUPPORT)',
] as const;

// Bill payment methods from billing schema
const BILL_PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'check', label: 'Check' },
  { value: 'cash', label: 'Cash' },
  { value: 'other', label: 'Other' },
] as const;

type BillPaymentMethod = (typeof BILL_PAYMENT_METHODS)[number]['value'];

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

function methodLabel(value: string) {
  return BILL_PAYMENT_METHODS.find((m) => m.value === value)?.label ?? value;
}

// ── types ─────────────────────────────────────────────────────────────────────

type BalanceRow = {
  date: string;
  salesByMode: Record<string, number>;
  totalSales: number;
  expensesByPaymentMethod: Record<string, number>;
  expensesByCategory: Record<string, number>;
  totalExpenses: number;
  balance: number;
};

type ApiResponse = {
  success: boolean;
  rows: BalanceRow[];
  totals: { totalSales: number; totalExpenses: number; balance: number };
  allPaymentModes: string[];
  allBillPaymentMethods: string[];
};

// ── ExemptionDropdown — reusable Select + chips ───────────────────────────────

function ExemptionDropdown({
  label,
  options,
  excluded,
  onAdd,
  onRemove,
}: {
  label: string;
  options: { value: string; label: string }[];
  excluded: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
}) {
  const available = options.filter((o) => !excluded.includes(o.value));

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label} — Exemptions
      </p>
      <div className="flex flex-wrap items-start gap-3">
        <div className="w-56">
          <Select value="" onValueChange={(val) => { if (val) onAdd(val); }}>
            <SelectTrigger>
              <SelectValue placeholder="Select to exempt…" />
            </SelectTrigger>
            <SelectContent>
              {available.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
              {available.length === 0 && (
                <SelectItem value="__none__" disabled>All exempted</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        {excluded.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {excluded.map((val) => {
              const found = options.find((o) => o.value === val);
              return (
                <span
                  key={val}
                  className="inline-flex items-center gap-1 rounded bg-destructive/10 border border-destructive/30 px-2 py-0.5 text-xs text-destructive"
                >
                  {found?.label ?? val}
                  <button
                    onClick={() => onRemove(val)}
                    className="hover:text-destructive/70 transition-colors"
                    aria-label={`Remove exemption`}
                  >
                    <X size={10} />
                  </button>
                </span>
              );
            })}
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
  const [excludedBillMethods, setExcludedBillMethods] = useState<string[]>([]);

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
      setExcludedBillMethods([]);
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
      // Filter sales by excluded payment modes
      let filteredSales = 0;
      const filteredSalesByMode: Record<string, number> = {};
      for (const [mode, amount] of Object.entries(row.salesByMode)) {
        if (!excludedPaymentModes.includes(mode)) {
          filteredSalesByMode[mode] = amount;
          filteredSales += amount;
        }
      }

      // Filter expenses by excluded bill payment methods
      let filteredExpenses = 0;
      const filteredExpByMethod: Record<string, number> = {};
      // Track which bill methods are excluded to proportionally reduce category totals
      const excludedMethodAmounts = Object.entries(row.expensesByPaymentMethod)
        .filter(([m]) => excludedBillMethods.includes(m))
        .reduce((sum, [, a]) => sum + a, 0);
      const totalBillAmount = Object.values(row.expensesByPaymentMethod).reduce((a, b) => a + b, 0);

      for (const [method, amount] of Object.entries(row.expensesByPaymentMethod)) {
        if (!excludedBillMethods.includes(method)) {
          filteredExpByMethod[method] = amount;
          filteredExpenses += amount;
        }
      }

      // Scale categories proportionally when methods are excluded
      const scale = totalBillAmount > 0
        ? (totalBillAmount - excludedMethodAmounts) / totalBillAmount
        : 1;
      const filteredExpByCategory: Record<string, number> = {};
      for (const [cat, amount] of Object.entries(row.expensesByCategory)) {
        const scaled = amount * scale;
        if (scaled > 0) filteredExpByCategory[cat] = scaled;
      }

      return {
        ...row,
        salesByMode: filteredSalesByMode,
        totalSales: filteredSales,
        expensesByPaymentMethod: filteredExpByMethod,
        expensesByCategory: filteredExpByCategory,
        totalExpenses: filteredExpenses,
        balance: filteredSales - filteredExpenses,
      };
    });
  }, [rawData, excludedPaymentModes, excludedBillMethods]);

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

  const salesModeOptions = useMemo(
    () => SALES_PAYMENT_MODES.map((m) => ({ value: m, label: m })),
    []
  );

  const billMethodOptions = useMemo(
    () => BILL_PAYMENT_METHODS.filter((m) =>
      !rawData || rawData.allBillPaymentMethods.includes(m.value)
    ),
    [rawData]
  );

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
                onChange={(val) => { setToDate(val); setFromDate(val); }}
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

        <div className="border-t pt-3 space-y-4">
          <ExemptionDropdown
            label="Sales (Mode of Payment)"
            options={salesModeOptions}
            excluded={excludedPaymentModes}
            onAdd={(v) => setExcludedPaymentModes((p) => p.includes(v) ? p : [...p, v])}
            onRemove={(v) => setExcludedPaymentModes((p) => p.filter((m) => m !== v))}
          />
          <ExemptionDropdown
            label="Expenses (Payment Method)"
            options={[...BILL_PAYMENT_METHODS]}
            excluded={excludedBillMethods}
            onAdd={(v) => setExcludedBillMethods((p) => p.includes(v) ? p : [...p, v])}
            onRemove={(v) => setExcludedBillMethods((p) => p.filter((m) => m !== v))}
          />
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
            {(excludedPaymentModes.length > 0 || excludedBillMethods.length > 0) && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {excludedPaymentModes.length > 0 && `Sales excludes: ${excludedPaymentModes.join(', ')}. `}
                {excludedBillMethods.length > 0 && `Expenses excludes: ${excludedBillMethods.map(methodLabel).join(', ')}.`}
              </p>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Date</th>
                  <th className="text-right px-4 py-2 font-medium">Sales</th>
                  <th className="text-right px-4 py-2 font-medium">Budget (Expenses)</th>
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
                    <td className={[
                      'px-4 py-2 text-right tabular-nums font-medium',
                      row.balance < 0 ? 'text-destructive' : 'text-green-600',
                    ].join(' ')}>
                      {peso(row.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 bg-muted/50 font-semibold">
                <tr>
                  <td className="px-4 py-2">Total</td>
                  <td className="px-4 py-2 text-right tabular-nums">{peso(grandTotals.totalSales)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-destructive/80">
                    {grandTotals.totalExpenses > 0 ? `(${peso(grandTotals.totalExpenses)})` : '—'}
                  </td>
                  <td className={[
                    'px-4 py-2 text-right tabular-nums',
                    grandTotals.balance < 0 ? 'text-destructive' : 'text-green-600',
                  ].join(' ')}>
                    {peso(grandTotals.balance)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {/* ── Budget Expenses by Category ── */}
      {categoryTotals.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b">
            <h2 className="text-sm font-semibold">Budget Expenses by Category</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Category</th>
                  <th className="text-right px-4 py-2 font-medium">Amount</th>
                  <th className="text-right px-4 py-2 font-medium">% of Budget</th>
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
                  <td className="px-4 py-2 text-right tabular-nums">{peso(grandTotals.totalExpenses)}</td>
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
