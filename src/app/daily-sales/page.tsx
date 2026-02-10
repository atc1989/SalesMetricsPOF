'use client';

import { useMemo, useState } from 'react';
import DashboardFilters from '../../components/daily-sales/DashboardFilters';
import RecentSalesTable from '../../components/daily-sales/RecentSalesTable';
import { recentSalesRows, type PaymentMode } from '../../lib/mock/dailySales';

export default function DailySalesPage() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

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
        !row.invoice.toLowerCase().includes(search) &&
        !row.customer.toLowerCase().includes(search)
      ) {
        return false;
      }

      return true;
    });
  }, [fromDate, toDate, paymentMode, searchQuery]);

  const totalSales = filteredRows.reduce((sum, row) => sum + row.sales, 0);
  const totalOrders = filteredRows.length;
  const totalBottles = filteredRows.reduce((sum, row) => sum + row.bottles, 0);
  const totalBlisters = filteredRows.reduce((sum, row) => sum + row.blisters, 0);

  return (
    <main className="mx-auto max-w-7xl p-6">
      <h1 className="mb-4 text-2xl font-semibold text-slate-900">Daily Sales</h1>

      <section id="dashboard" className="space-y-4">
        <DashboardFilters
          fromDate={fromDate}
          toDate={toDate}
          paymentMode={paymentMode}
          searchQuery={searchQuery}
          onFromDateChange={setFromDate}
          onToDateChange={setToDate}
          onPaymentModeChange={setPaymentMode}
          onSearchQueryChange={setSearchQuery}
        />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-md border border-gray-200 bg-white p-3">
            <p className="text-xs text-gray-600">Total Sales</p>
            <p className="text-lg font-semibold">₱{totalSales.toLocaleString()}</p>
          </div>
          <div className="rounded-md border border-gray-200 bg-white p-3">
            <p className="text-xs text-gray-600">Total Orders</p>
            <p className="text-lg font-semibold">{totalOrders}</p>
          </div>
          <div className="rounded-md border border-gray-200 bg-white p-3">
            <p className="text-xs text-gray-600">Total Bottles Sold</p>
            <p className="text-lg font-semibold">{totalBottles}</p>
          </div>
          <div className="rounded-md border border-gray-200 bg-white p-3">
            <p className="text-xs text-gray-600">Total Blister Sold</p>
            <p className="text-lg font-semibold">{totalBlisters}</p>
          </div>
        </div>

        <RecentSalesTable rows={filteredRows} />
      </section>
    </main>
  );
}
