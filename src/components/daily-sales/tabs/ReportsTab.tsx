'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { recentSalesRows } from '@/lib/mock/dailySales';

type ReportRangeType = 'daily' | 'weekly' | 'monthly' | 'custom';

const toIsoDate = (value: Date) => value.toISOString().slice(0, 10);
const reportDateToday = recentSalesRows.map((row) => row.date).sort().at(-1) ?? toIsoDate(new Date());
const formatPeso = (value: number) =>
  `₱${value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;

const calculateRange = (
  type: ReportRangeType,
  startDate: string,
  endDate: string,
  fallbackDate: string
): { from: string; to: string } => {
  const anchorValue = endDate || fallbackDate;
  const anchor = new Date(`${anchorValue}T00:00:00`);

  if (type === 'custom') {
    return {
      from: startDate,
      to: endDate,
    };
  }

  if (type === 'daily') {
    const day = toIsoDate(anchor);
    return { from: day, to: day };
  }

  if (type === 'weekly') {
    const fromDate = new Date(anchor);
    fromDate.setDate(anchor.getDate() - anchor.getDay());
    const toDate = new Date(fromDate);
    toDate.setDate(fromDate.getDate() + 6);
    return {
      from: toIsoDate(fromDate),
      to: toIsoDate(toDate),
    };
  }

  const firstDay = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const lastDay = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  return {
    from: toIsoDate(firstDay),
    to: toIsoDate(lastDay),
  };
};

export function ReportsTab() {
  const [pendingType, setPendingType] = useState<ReportRangeType>('daily');
  const [pendingStartDate, setPendingStartDate] = useState('');
  const [pendingEndDate, setPendingEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [isActionNoticeOpen, setIsActionNoticeOpen] = useState(false);
  const [actionNotice, setActionNotice] = useState('');

  const [reportType, setReportType] = useState<ReportRangeType>('daily');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const activeRange = useMemo(
    () => calculateRange(reportType, startDate, endDate, reportDateToday),
    [reportType, startDate, endDate]
  );

  const filteredRows = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();

    return recentSalesRows.filter((row) => {
      if (activeRange.from && row.date < activeRange.from) {
        return false;
      }

      if (activeRange.to && row.date > activeRange.to) {
        return false;
      }

      const rowText = [
        row.date,
        row.pofNumber,
        row.ggTransNo,
        row.sales.toString(),
        row.paymentMode,
        row.bottles.toString(),
        row.blisters.toString(),
      ]
        .join(' ')
        .toLowerCase();

      if (search && !rowText.includes(search)) {
        return false;
      }

      return true;
    });
  }, [activeRange, searchQuery]);

  const totals = useMemo(
    () =>
      filteredRows.reduce(
        (acc, row) => ({
          totalSales: acc.totalSales + row.sales,
          totalBottles: acc.totalBottles + row.bottles,
          totalBlisters: acc.totalBlisters + row.blisters,
        }),
        { totalSales: 0, totalBottles: 0, totalBlisters: 0 }
      ),
    [filteredRows]
  );

  const dateInputsReadOnly = pendingType !== 'custom';

  const onReportTypeChange = (nextType: ReportRangeType) => {
    setPendingType(nextType);

    if (nextType === 'custom') {
      setPendingStartDate('');
      setPendingEndDate('');
      return;
    }

    const nextRange = calculateRange(nextType, '', '', reportDateToday);
    setPendingStartDate(nextRange.from);
    setPendingEndDate(nextRange.to);
    setReportType(nextType);
    setStartDate(nextRange.from);
    setEndDate(nextRange.to);
  };

  const onGenerateReport = () => {
    if (!pendingStartDate || !pendingEndDate) {
      setIsWarningOpen(true);
      return;
    }

    setReportType(pendingType);
    setStartDate(pendingStartDate);
    setEndDate(pendingEndDate);
  };

  const onRowAction = (message: string) => {
    setActionNotice(message);
    setIsActionNoticeOpen(true);
  };

  const onExportCsv = () => {
    const headers = [
      'Date',
      'POF Number',
      'GG Trans No.',
      'Total Sales',
      'Mode of Payment',
      'Total Bottles',
      'Total Blisters',
    ];

    const toCsv = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

    const lines = [
      headers.map((header) => toCsv(header)).join(','),
      ...filteredRows.map((row) =>
        [
          row.date,
          row.pofNumber,
          row.ggTransNo,
          row.sales,
          row.paymentMode,
          row.bottles,
          row.blisters,
        ]
          .map((value) => toCsv(value))
          .join(',')
      ),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pof.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section id="reports" className="mt-4 space-y-4">
      <Card className="p-3">
        <div className="grid gap-2 md:grid-cols-5">
          <label className="flex flex-col text-xs font-medium text-slate-700">
            Report Type
            <select
              id="reportType"
              value={pendingType}
              onChange={(event) => onReportTypeChange(event.target.value as ReportRangeType)}
              className="mt-1 rounded border border-slate-300 px-2 py-1 text-sm"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="custom">Custom Range</option>
            </select>
          </label>
          <label className="flex flex-col text-xs font-medium text-slate-700">
            Start Date
            <input
              id="startDate"
              type="date"
              value={pendingStartDate}
              onChange={(event) => setPendingStartDate(event.target.value)}
              readOnly={dateInputsReadOnly}
              className="mt-1 rounded border border-slate-300 px-2 py-1 text-sm"
            />
          </label>
          <label className="flex flex-col text-xs font-medium text-slate-700">
            End Date
            <input
              id="endDate"
              type="date"
              value={pendingEndDate}
              onChange={(event) => setPendingEndDate(event.target.value)}
              readOnly={dateInputsReadOnly}
              className="mt-1 rounded border border-slate-300 px-2 py-1 text-sm"
            />
          </label>
          <div className="flex items-end">
            <Button
              id="generateReport"
              variant="secondary"
              className="w-full md:w-auto"
              onClick={onGenerateReport}
            >
              Generate Report
            </Button>
          </div>
          <label className="flex flex-col text-xs font-medium text-slate-700">
            Search
            <input
              id="tblSalesReportSearch"
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search table..."
              className="mt-1 rounded border border-slate-300 px-2 py-1 text-sm"
            />
          </label>
        </div>
      </Card>

      <Card className="p-0">
        <div className="flex items-center justify-end px-4 py-3">
          <Button id="exportSalesReport" size="sm" onClick={onExportCsv}>
            Excel
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table id="tblSalesReport" className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">POF Number</th>
                <th className="px-3 py-2">GG Trans No.</th>
                <th className="px-3 py-2">Total Sales</th>
                <th className="px-3 py-2">Mode of Payment</th>
                <th className="px-3 py-2">Total Bottles</th>
                <th className="px-3 py-2">Total Blisters</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-slate-500">
                    No report rows found for the selected filters.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">{row.date}</td>
                    <td className="px-3 py-2">{row.pofNumber}</td>
                    <td className="px-3 py-2">{row.ggTransNo}</td>
                    <td className="px-3 py-2">{formatPeso(row.sales)}</td>
                    <td className="px-3 py-2">{row.paymentMode}</td>
                    <td className="px-3 py-2">{row.bottles}</td>
                    <td className="px-3 py-2">{row.blisters}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="secondary" onClick={() => onRowAction(`Trans No. action for ${row.pofNumber} (mock).`)}>
                          Trans No.
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => onRowAction(`Print action for ${row.pofNumber} (mock).`)}>
                          Print
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => onRowAction(`Remove action for ${row.pofNumber} (mock).`)}>
                          Remove
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50 font-semibold text-slate-700">
                <td className="px-3 py-2" colSpan={3}>
                  Total:
                </td>
                <td className="px-3 py-2">{formatPeso(totals.totalSales)}</td>
                <td className="px-3 py-2" />
                <td className="px-3 py-2">{totals.totalBottles}</td>
                <td className="px-3 py-2">{totals.totalBlisters}</td>
                <td className="px-3 py-2" />
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <Modal isOpen={isWarningOpen} title="Warning!" onClose={() => setIsWarningOpen(false)}>
        Please input valid date.
      </Modal>
      <Modal isOpen={isActionNoticeOpen} title="Info" onClose={() => setIsActionNoticeOpen(false)}>
        {actionNotice}
      </Modal>
    </section>
  );
}
