'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { recentSalesRows, type PaymentMode } from '@/lib/mock/dailySales';

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

export function DashboardTab() {
  const [pendingFromDate, setPendingFromDate] = useState('');
  const [pendingToDate, setPendingToDate] = useState('');
  const [pendingPaymentMode, setPendingPaymentMode] = useState<PaymentMode>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('ALL');

  const filteredRows = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();

    return recentSalesRows.filter((row) => {
      if (fromDate && row.date < fromDate) {
        return false;
      }

      if (toDate && row.date > toDate) {
        return false;
      }

      if (paymentMode !== 'ALL' && row.paymentMode !== paymentMode) {
        return false;
      }

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
  }, [fromDate, toDate, paymentMode, searchQuery]);

  const totalSales = filteredRows.reduce((sum, row) => sum + row.sales, 0);
  const totalOrders = filteredRows.length;
  const totalNewMembers = 0;
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
