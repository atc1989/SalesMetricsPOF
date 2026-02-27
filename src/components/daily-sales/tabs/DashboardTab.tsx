'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { recentSalesRows, type PaymentMode, type RecentSale } from '@/lib/mock/dailySales';

const paymentModes: PaymentMode[] = [
  'ALL',
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
];

const validPaymentModes: Array<RecentSale['paymentMode']> = [
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
];

function normalizePaymentMode(value: string | null): RecentSale['paymentMode'] {
  if (!value) {
    return 'CASH';
  }

  if (validPaymentModes.includes(value as RecentSale['paymentMode'])) {
    return value as RecentSale['paymentMode'];
  }

  return 'CASH';
}

export function DashboardTab() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [pendingFromDate, setPendingFromDate] = useState(today);
  const [pendingToDate, setPendingToDate] = useState(today);
  const [pendingPaymentMode, setPendingPaymentMode] = useState<PaymentMode>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rows, setRows] = useState<RecentSale[]>(recentSalesRows);
  const [totals, setTotals] = useState({
    totalSales: recentSalesRows.reduce((sum, row) => sum + row.sales, 0),
    totalBottles: recentSalesRows.reduce((sum, row) => sum + row.bottles, 0),
    totalBlisters: recentSalesRows.reduce((sum, row) => sum + row.blisters, 0),
    totalTransactions: recentSalesRows.length,
    newMembers: 0,
  });

  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('ALL');

  useEffect(() => {
    const controller = new AbortController();

    async function loadDailySales() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const params = new URLSearchParams({
          dateFrom: fromDate,
          dateTo: toDate,
          modeOfPayment: paymentMode,
        });
        const response = await fetch(`/api/daily-sales/today?${params.toString()}`, {
          signal: controller.signal,
        });
        const payload = (await response.json()) as {
          success: boolean;
          rows?: Array<{
            daily_sales_id: number | string | null;
            trans_date: string | null;
            pof_number: string | null;
            member_name: string | null;
            username: string | null;
            package_type: string | null;
            bottle_count: number;
            blister_count: number;
            sales: number;
            mode_of_payment: string | null;
          }>;
          totals?: {
            totalSales: number;
            totalBottles: number;
            totalBlisters: number;
            totalTransactions: number;
            newMembers: number;
          };
          message?: string;
        };

        if (!response.ok || !payload.success || !payload.rows) {
          throw new Error(payload.message ?? 'Failed to load daily sales.');
        }

        const mappedRows: RecentSale[] = payload.rows.map((row, index) => ({
          id: String(row.daily_sales_id ?? `daily-sales-${index + 1}`),
          pofNumber: row.pof_number ?? '',
          ggTransNo:
            row.daily_sales_id !== null && row.daily_sales_id !== undefined
              ? `DS-${row.daily_sales_id}`
              : '',
          date: row.trans_date ?? '',
          memberName: row.member_name ?? '',
          zeroOne: row.username ?? '',
          packageType: row.package_type ?? '',
          bottles: row.bottle_count ?? 0,
          blisters: row.blister_count ?? 0,
          sales: row.sales ?? 0,
          paymentMode: normalizePaymentMode(row.mode_of_payment),
          status: 'Released',
        }));

        setRows(mappedRows);
        if (payload.totals) {
          setTotals(payload.totals);
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }

        setRows(recentSalesRows);
        setTotals({
          totalSales: recentSalesRows.reduce((sum, row) => sum + row.sales, 0),
          totalBottles: recentSalesRows.reduce((sum, row) => sum + row.bottles, 0),
          totalBlisters: recentSalesRows.reduce((sum, row) => sum + row.blisters, 0),
          totalTransactions: recentSalesRows.length,
          newMembers: 0,
        });
        setErrorMessage('Backend error loading daily sales, showing fallback data.');
      } finally {
        setIsLoading(false);
      }
    }

    void loadDailySales();

    return () => {
      controller.abort();
    };
  }, [fromDate, toDate, paymentMode]);

  const filteredRows = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();

    return rows.filter((row) => {
      if (
        search &&
        !row.pofNumber.toLowerCase().includes(search) &&
        !row.memberName.toLowerCase().includes(search) &&
        !row.ggTransNo.toLowerCase().includes(search) &&
        !row.paymentMode.toLowerCase().includes(search)
      ) {
        return false;
      }

      return true;
    });
  }, [rows, searchQuery]);

  const totalSales = filteredRows.reduce((sum, row) => sum + row.sales, 0);
  const totalOrders = filteredRows.length;
  const totalNewMembers = totals.newMembers;
  const totalBottles = filteredRows.reduce((sum, row) => sum + row.bottles, 0);
  const totalBlisters = filteredRows.reduce((sum, row) => sum + row.blisters, 0);

  const onApply = () => {
    setFromDate(pendingFromDate);
    setToDate(pendingToDate);
    setPaymentMode(pendingPaymentMode);
  };

  const onExportCsv = () => {
    const headers = [
      'POF Number',
      'Date',
      'Member Name',
      'Zero One',
      'Package',
      'Bottles',
      'Blisters',
      'Sales',
      'Mode of Payment',
      'Status',
    ];

    const toCsv = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const lines = [
      headers.map((header) => toCsv(header)).join(','),
      ...filteredRows.map((row) =>
        [
          row.pofNumber,
          row.date,
          row.memberName,
          row.zeroOne,
          row.packageType,
          row.bottles,
          row.blisters,
          row.sales,
          row.paymentMode,
          row.status,
        ]
          .map((value) => toCsv(value))
          .join(',')
      ),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = 'recent-sales.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section id="dashboard" className="mt-4 space-y-4">
      <Card className="p-3">
        <div className="grid gap-2 md:grid-cols-5">
          <label className="flex flex-col text-xs font-medium text-slate-700">
            FROM
            <input
              id="db-start-date"
              type="date"
              value={pendingFromDate}
              onChange={(event) => setPendingFromDate(event.target.value)}
              className="mt-1 rounded border border-slate-300 px-2 py-1 text-sm"
            />
          </label>
          <label className="flex flex-col text-xs font-medium text-slate-700">
            TO
            <input
              id="db-end-date"
              type="date"
              value={pendingToDate}
              onChange={(event) => setPendingToDate(event.target.value)}
              className="mt-1 rounded border border-slate-300 px-2 py-1 text-sm"
            />
          </label>
          <label className="flex flex-col text-xs font-medium text-slate-700">
            MODE OF PAYMENT
            <select
              id="dbPaymentMode"
              value={pendingPaymentMode}
              onChange={(event) => setPendingPaymentMode(event.target.value as PaymentMode)}
              className="mt-1 rounded border border-slate-300 px-2 py-1 text-sm"
            >
              {paymentModes.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <Button
              id="db-apply-custom-date"
              variant="secondary"
              className="w-full md:w-auto"
              onClick={onApply}
            >
              Apply
            </Button>
          </div>
          <label className="flex flex-col text-xs font-medium text-slate-700">
            SEARCH
            <input
              id="tblSalesTodaySearch"
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search table..."
              className="mt-1 rounded border border-slate-300 px-2 py-1 text-sm"
            />
          </label>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="p-3">
          <p className="text-xs text-slate-600">Total Sales</p>
          <p className="total-sales-today text-lg font-semibold text-slate-900">
            PHP {totalSales.toLocaleString()}
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-slate-600">Total Orders</p>
          <p className="total-orders-today text-lg font-semibold text-slate-900">{totalOrders}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-slate-600">New Members</p>
          <p className="total-new-members-today text-lg font-semibold text-slate-900">
            {totalNewMembers}
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-slate-600">Total Bottles Sold</p>
          <p className="total-bottles-sold-today text-lg font-semibold text-slate-900">
            {totalBottles}
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-slate-600">Total Blister Sold</p>
          <p className="total-blister-sold-today text-lg font-semibold text-slate-900">
            {totalBlisters}
          </p>
        </Card>
      </div>

      <Card className="p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Recent Sales</h2>
          <Button size="sm" onClick={onExportCsv}>
            Excel
          </Button>
        </div>
        {isLoading ? <p className="px-4 pb-2 text-xs text-slate-500">Loading daily sales...</p> : null}
        {errorMessage ? <p className="px-4 pb-2 text-xs text-amber-600">{errorMessage}</p> : null}
        <div className="overflow-x-auto">
          <table id="tblSalesToday" className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-3 py-2">POF Number</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Member Name</th>
                <th className="px-3 py-2">Zero One</th>
                <th className="px-3 py-2">Package</th>
                <th className="px-3 py-2">Bottles</th>
                <th className="px-3 py-2">Blisters</th>
                <th className="px-3 py-2">Sales</th>
                <th className="px-3 py-2">Mode of Payment</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-6 text-center text-slate-500">
                    No recent sales found for the selected filters.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">{row.pofNumber}</td>
                    <td className="px-3 py-2">{row.date}</td>
                    <td className="px-3 py-2">{row.memberName}</td>
                    <td className="px-3 py-2">{row.zeroOne}</td>
                    <td className="px-3 py-2">{row.packageType}</td>
                    <td className="px-3 py-2">{row.bottles}</td>
                    <td className="px-3 py-2">{row.blisters}</td>
                    <td className="px-3 py-2">PHP {row.sales.toLocaleString()}</td>
                    <td className="px-3 py-2">{row.paymentMode}</td>
                    <td className="px-3 py-2">{row.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}
