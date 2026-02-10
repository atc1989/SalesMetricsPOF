'use client';

import { useMemo, useState } from 'react';
import { DailyInventoryTable } from '../../components/daily-sales/DailyInventoryTable';
import DashboardFilters from '../../components/daily-sales/DashboardFilters';
import InventoryFilters from '../../components/daily-sales/InventoryFilters';
import { ModifyGgTransNoModal } from '../../components/daily-sales/ModifyGgTransNoModal';
import { PrintPreviewModal } from '../../components/daily-sales/PrintPreviewModal';
import RecentSalesTable from '../../components/daily-sales/RecentSalesTable';
import ReportsFilters from '../../components/daily-sales/ReportsFilters';
import { ReportsTable } from '../../components/daily-sales/ReportsTable';
import { Tabs } from '../../components/daily-sales/Tabs';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import {
  inventoryRows,
  printPreviewSample,
  recentSalesRows,
  reportTypes,
  reportsRows,
  type PaymentMode,
  type RecentSale,
  type ReportType,
} from '../../lib/mock/dailySales';

export default function DailySalesPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [salesRows, setSalesRows] = useState<RecentSale[]>(recentSalesRows);

  const [reportType, setReportType] = useState<ReportType>('ALL');
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [reportSearchQuery, setReportSearchQuery] = useState('');
  const [transDateFrom, setTransDateFrom] = useState('');
  const [transDateTo, setTransDateTo] = useState('');
  const [inventorySearchQuery, setInventorySearchQuery] = useState('');

  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [isReportGeneratedOpen, setIsReportGeneratedOpen] = useState(false);
  const [isInventoryReportGeneratedOpen, setIsInventoryReportGeneratedOpen] = useState(false);
  const [selectedSaleIdToRemove, setSelectedSaleIdToRemove] = useState<string | null>(null);
  const [selectedSaleIdToEditGgTransNo, setSelectedSaleIdToEditGgTransNo] = useState<string | null>(null);

  const filteredRecentSalesRows = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();

    return salesRows.filter((row) => {
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
  }, [fromDate, toDate, paymentMode, searchQuery, salesRows]);

  const filteredReportRows = useMemo(() => {
    const search = reportSearchQuery.trim().toLowerCase();

    return reportsRows.filter((row) => {
      if (reportType !== 'ALL' && row.type !== reportType) {
        return false;
      }

      if (reportStartDate && row.date < reportStartDate) {
        return false;
      }

      if (reportEndDate && row.date > reportEndDate) {
        return false;
      }

      if (
        search &&
        !row.name.toLowerCase().includes(search) &&
        !row.value.toLowerCase().includes(search) &&
        !row.type.toLowerCase().includes(search) &&
        !row.date.toLowerCase().includes(search)
      ) {
        return false;
      }

      return true;
    });
  }, [reportType, reportStartDate, reportEndDate, reportSearchQuery]);

  const filteredInventoryRows = useMemo(() => {
    const search = inventorySearchQuery.trim().toLowerCase();

    return inventoryRows.filter((row) => {
      if (transDateFrom && row.date < transDateFrom) {
        return false;
      }

      if (transDateTo && row.date > transDateTo) {
        return false;
      }

      if (
        search &&
        !row.item.toLowerCase().includes(search) &&
        !row.date.toLowerCase().includes(search)
      ) {
        return false;
      }

      return true;
    });
  }, [transDateFrom, transDateTo, inventorySearchQuery]);

  const totalSales = filteredRecentSalesRows.reduce((sum, row) => sum + row.sales, 0);
  const totalOrders = filteredRecentSalesRows.length;
  const totalBottles = filteredRecentSalesRows.reduce((sum, row) => sum + row.bottles, 0);
  const totalBlisters = filteredRecentSalesRows.reduce((sum, row) => sum + row.blisters, 0);

  const tabItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'reports', label: 'Reports' },
    { id: 'daily-inventory', label: 'Daily Inventory' },
  ];

  const selectedRow = salesRows.find((row) => row.id === selectedSaleIdToRemove);
  const selectedEditRow = salesRows.find((row) => row.id === selectedSaleIdToEditGgTransNo);

  const onConfirmRemove = () => {
    if (!selectedSaleIdToRemove) {
      return;
    }

    setSalesRows((prev) => prev.filter((row) => row.id !== selectedSaleIdToRemove));
    setSelectedSaleIdToRemove(null);
  };

  const onSaveGgTransNo = (newValue: string) => {
    if (!selectedSaleIdToEditGgTransNo) {
      return;
    }

    setSalesRows((prev) =>
      prev.map((row) =>
        row.id === selectedSaleIdToEditGgTransNo ? { ...row, ggTransNo: newValue } : row
      )
    );
    setSelectedSaleIdToEditGgTransNo(null);
  };

  return (
    <main className="mx-auto max-w-7xl p-6">
      <h1 className="mb-4 text-2xl font-semibold text-slate-900">Daily Sales</h1>
      <Tabs items={tabItems} activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'dashboard' && (
        <section id="dashboard" className="mt-4 space-y-4">
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
              <p className="text-lg font-semibold">PHP {totalSales.toLocaleString()}</p>
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

          <RecentSalesTable
            rows={filteredRecentSalesRows}
            onRemove={(id) => setSelectedSaleIdToRemove(id)}
            onEditTransNo={(id) => setSelectedSaleIdToEditGgTransNo(id)}
          />
        </section>
      )}

      {activeTab === 'reports' && (
        <section id="reports" className="mt-4">
          <ReportsFilters
            reportType={reportType}
            startDate={reportStartDate}
            endDate={reportEndDate}
            searchQuery={reportSearchQuery}
            reportTypes={reportTypes}
            onReportTypeChange={setReportType}
            onStartDateChange={setReportStartDate}
            onEndDateChange={setReportEndDate}
            onSearchQueryChange={setReportSearchQuery}
            onGenerateReport={() => setIsReportGeneratedOpen(true)}
          />
          <ReportsTable rows={filteredReportRows} onPreview={() => setIsPrintPreviewOpen(true)} />
        </section>
      )}

      {activeTab === 'daily-inventory' && (
        <section id="daily-inventory" className="mt-4">
          <InventoryFilters
            transDateFrom={transDateFrom}
            transDateTo={transDateTo}
            searchQuery={inventorySearchQuery}
            onTransDateFromChange={setTransDateFrom}
            onTransDateToChange={setTransDateTo}
            onSearchQueryChange={setInventorySearchQuery}
            onGenerateReport={() => setIsInventoryReportGeneratedOpen(true)}
          />
          <DailyInventoryTable rows={filteredInventoryRows} />
        </section>
      )}

      <PrintPreviewModal
        isOpen={isPrintPreviewOpen}
        transaction={printPreviewSample.transaction}
        lineItems={printPreviewSample.lineItems}
        onClose={() => setIsPrintPreviewOpen(false)}
      />
      <Modal
        isOpen={isReportGeneratedOpen}
        title="Report Generated"
        onClose={() => setIsReportGeneratedOpen(false)}
      >
        Mock report generation complete.
      </Modal>
      <Modal
        isOpen={isInventoryReportGeneratedOpen}
        title="Inventory Report Generated"
        onClose={() => setIsInventoryReportGeneratedOpen(false)}
      >
        Mock inventory report generation complete.
      </Modal>
      <ConfirmDialog
        isOpen={Boolean(selectedSaleIdToRemove)}
        title="Confirm Remove"
        message={
          selectedRow
            ? `Are you sure you want to remove ${selectedRow.pofNumber}?`
            : 'Are you sure you want to remove this row?'
        }
        confirmText="Remove"
        cancelText="Cancel"
        tone="danger"
        onConfirm={onConfirmRemove}
        onClose={() => setSelectedSaleIdToRemove(null)}
      />
      <ModifyGgTransNoModal
        isOpen={Boolean(selectedSaleIdToEditGgTransNo)}
        row={
          selectedEditRow
            ? {
                id: selectedEditRow.id,
                pofNumber: selectedEditRow.pofNumber,
                ggTransNo: selectedEditRow.ggTransNo,
              }
            : null
        }
        onSave={onSaveGgTransNo}
        onClose={() => setSelectedSaleIdToEditGgTransNo(null)}
      />
    </main>
  );
}
