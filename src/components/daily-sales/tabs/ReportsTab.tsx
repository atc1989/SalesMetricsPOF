'use client';

import { useEffect, useMemo, useState } from 'react';
import { ModifyGgTransNoModal } from '@/components/daily-sales/ModifyGgTransNoModal';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { formatMemberName, formatPofNumber, formatZeroOne } from '@/lib/dailySalesDisplay';
import { buildPofPrintHtml } from '@/lib/print/buildPofPrintHtml';
import { openPrintWindow } from '@/lib/print/openPrintWindow';
import type { RecentSale } from '@/types/dailySales';

type ReportRangeType = 'daily' | 'weekly' | 'monthly' | 'custom';

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

const toIsoDate = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const reportDateToday = toIsoDate(new Date());
const formatPeso = (value: number) =>
  `PHP ${value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;

type ReportsSaleRow = RecentSale & {
  dailySalesIds: number[];
  usernames: string[];
  pofNumbers: string[];
  quantity: number;
  originalPrice: number;
  discount: number;
  discountedPrice: number;
  releasedBottle: number;
  releasedBlister: number;
  balanceBottle: number;
  balanceBlister: number;
  paymentModes: string[];
};

type ReportsRawSaleRow = {
  id: string;
  dailySalesId: number;
  rawPofNumber: string;
  pofNumber: string;
  ggTransNo: string;
  date: string;
  memberName: string;
  zeroOne: string;
  packageType: string;
  bottles: number;
  blisters: number;
  sales: number;
  paymentMode: RecentSale['paymentMode'];
  paymentModeTwo: string;
  status: 'Released';
  quantity: number;
  originalPrice: number;
  discount: number;
  discountedPrice: number;
  releasedBottle: number;
  releasedBlister: number;
  balanceBottle: number;
  balanceBlister: number;
};

function normalizePaymentMode(value: string | null): RecentSale['paymentMode'] {
  if (!value) {
    return 'CASH';
  }

  if (validPaymentModes.includes(value as RecentSale['paymentMode'])) {
    return value as RecentSale['paymentMode'];
  }

  return 'CASH';
}

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

function comparePofNumbers(left: string, right: string) {
  const normalize = (value: string) => value.trim();
  const leftValue = normalize(left);
  const rightValue = normalize(right);

  const leftMatch = leftValue.match(/^(\d{6})\s*-\s*(\d+)$/);
  const rightMatch = rightValue.match(/^(\d{6})\s*-\s*(\d+)$/);

  if (leftMatch && rightMatch) {
    const [, leftBase, leftSuffix] = leftMatch;
    const [, rightBase, rightSuffix] = rightMatch;

    if (leftBase !== rightBase) {
      return leftBase.localeCompare(rightBase);
    }

    return Number(leftSuffix) - Number(rightSuffix);
  }

  return leftValue.localeCompare(rightValue, undefined, { numeric: true, sensitivity: 'base' });
}

async function fetchSalesReportRows(dateFrom: string, dateTo: string) {
  const params = new URLSearchParams({
    dateFrom,
    dateTo,
  });
  const response = await fetch(`/api/reports/sales-report?${params.toString()}`);
  const payload = (await response.json()) as {
    success: boolean;
    rows?: Array<{
      daily_sales_id: number;
      pof_number: string | null;
      trans_date: string | null;
      member_name: string | null;
      username: string | null;
      package_type: string | null;
      quantity: number;
      original_price: number;
      discount: number;
      price_after_discount: number;
      bottle_count: number;
      blister_count: number;
      released_count: number;
      released_blpk_count: number;
      to_follow_count: number;
      to_follow_blpk_count: number;
      sales: number;
      mode_of_payment: string | null;
      mode_of_payment_two: string | null;
    }>;
    message?: string;
  };

  if (!response.ok || !payload.success || !payload.rows) {
    throw new Error(payload.message ?? 'Failed to load sales report.');
  }

  return payload.rows.map((row, index) => ({
    id: `${row.daily_sales_id ?? row.pof_number ?? 'sales'}-${index}`,
    dailySalesId: row.daily_sales_id ?? 0,
    rawPofNumber: row.pof_number ?? '',
    pofNumber: formatPofNumber(row.pof_number),
    ggTransNo: formatZeroOne(row.username) || 'N/A',
    date: row.trans_date ?? '',
    memberName: formatMemberName(row.member_name),
    zeroOne: formatZeroOne(row.username),
    packageType: row.package_type ?? '',
    bottles: row.bottle_count ?? 0,
    blisters: row.blister_count ?? 0,
    sales: row.sales ?? 0,
    paymentMode: normalizePaymentMode(row.mode_of_payment),
    paymentModeTwo: row.mode_of_payment_two ?? '',
    status: 'Released' as const,
    quantity: row.quantity ?? 0,
    originalPrice: row.original_price ?? 0,
    discount: row.discount ?? 0,
    discountedPrice: row.price_after_discount ?? 0,
    releasedBottle: row.released_count ?? 0,
    releasedBlister: row.released_blpk_count ?? 0,
    balanceBottle: row.to_follow_count ?? 0,
    balanceBlister: row.to_follow_blpk_count ?? 0,
  }));
}

export function ReportsTab() {
  const [pendingType, setPendingType] = useState<ReportRangeType>('daily');
  const [pendingStartDate, setPendingStartDate] = useState(reportDateToday);
  const [pendingEndDate, setPendingEndDate] = useState(reportDateToday);
  const [searchQuery, setSearchQuery] = useState('');
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [isActionNoticeOpen, setIsActionNoticeOpen] = useState(false);
  const [actionNotice, setActionNotice] = useState('');
  const [selectedModifyRow, setSelectedModifyRow] = useState<{ id: string; dailySalesIds: number[]; pofNumber: string; ggTransNo: string } | null>(null);
  const [isModifyModalOpen, setIsModifyModalOpen] = useState(false);
  const [isSavingGgTransNo, setIsSavingGgTransNo] = useState(false);
  const [selectedRemoveRow, setSelectedRemoveRow] = useState<ReportsSaleRow | null>(null);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [isRemovingRow, setIsRemovingRow] = useState(false);

  const [reportType, setReportType] = useState<ReportRangeType>('daily');
  const [startDate, setStartDate] = useState(reportDateToday);
  const [endDate, setEndDate] = useState(reportDateToday);
  const [rawRows, setRawRows] = useState<ReportsRawSaleRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  const activeRange = useMemo(
    () => calculateRange(reportType, startDate, endDate, reportDateToday),
    [reportType, startDate, endDate]
  );

  const rows = useMemo<ReportsSaleRow[]>(() => {
    const grouped = new Map<string, ReportsSaleRow>();

    for (const row of rawRows) {
      const normalizedUsername = row.ggTransNo.trim().toLowerCase();
      const normalizedPofNumber = row.rawPofNumber.trim().toLowerCase();
      const groupKey = `${normalizedPofNumber || 'no-pof'}::${normalizedUsername || 'no-username'}`;
      const paymentModes = [row.paymentMode, row.paymentModeTwo]
        .map((value) => value.trim())
        .filter((value) => value.length > 0 && value !== 'N/A');

      const existing = grouped.get(groupKey);
      if (!existing) {
        grouped.set(groupKey, {
          id: groupKey,
          dailySalesIds: [row.dailySalesId],
          usernames: row.ggTransNo ? [row.ggTransNo] : [],
          pofNumbers: row.rawPofNumber ? [row.rawPofNumber] : [],
          pofNumber: formatPofNumber(row.rawPofNumber),
          ggTransNo: row.ggTransNo || 'N/A',
          date: row.date,
          memberName: row.memberName,
          zeroOne: row.zeroOne,
          packageType: row.packageType,
          bottles: row.bottles,
          blisters: row.blisters,
          sales: row.sales,
          paymentMode: (paymentModes.join(', ') || 'CASH') as RecentSale['paymentMode'],
          paymentModes,
          status: 'Released',
          quantity: row.quantity,
          originalPrice: row.originalPrice,
          discount: row.discount,
          discountedPrice: row.discountedPrice,
          releasedBottle: row.releasedBottle,
          releasedBlister: row.releasedBlister,
          balanceBottle: row.balanceBottle,
          balanceBlister: row.balanceBlister,
        });
        continue;
      }

      existing.dailySalesIds.push(row.dailySalesId);
      if (row.ggTransNo && !existing.usernames.includes(row.ggTransNo)) {
        existing.usernames.push(row.ggTransNo);
      }
      if (row.rawPofNumber && !existing.pofNumbers.includes(row.rawPofNumber)) {
        existing.pofNumbers.push(row.rawPofNumber);
      }
      if (row.date > existing.date) {
        existing.date = row.date;
      }
      if (!existing.memberName && row.memberName) {
        existing.memberName = row.memberName;
      }

      existing.bottles += row.bottles;
      existing.blisters += row.blisters;
      existing.sales += row.sales;
      existing.quantity += row.quantity;
      existing.originalPrice += row.originalPrice;
      existing.discount += row.discount;
      existing.discountedPrice += row.discountedPrice;
      existing.releasedBottle += row.releasedBottle;
      existing.releasedBlister += row.releasedBlister;
      existing.balanceBottle += row.balanceBottle;
      existing.balanceBlister += row.balanceBlister;

      for (const mode of paymentModes) {
        if (!existing.paymentModes.includes(mode)) {
          existing.paymentModes.push(mode);
        }
      }

      existing.paymentMode = (existing.paymentModes.join(', ') || 'CASH') as RecentSale['paymentMode'];
      existing.pofNumber = existing.pofNumbers.map((value) => formatPofNumber(value)).join(', ');
    }

    return Array.from(grouped.values()).sort((left, right) => {
      const dateCompare = right.date.localeCompare(left.date);
      if (dateCompare !== 0) {
        return dateCompare;
      }

      return comparePofNumbers(left.pofNumbers[0] ?? left.pofNumber, right.pofNumbers[0] ?? right.pofNumber);
    });
  }, [rawRows]);

  const filteredRows = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();

    return rows.filter((row) => {
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
        row.memberName,
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
  }, [activeRange, searchQuery, rows]);

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

  useEffect(() => {
    const loadCurrentDateReport = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const mappedRows = await fetchSalesReportRows(reportDateToday, reportDateToday);
        setRawRows(mappedRows);
        setHasGenerated(true);
      } catch {
        setErrorMessage('Failed to load sales report.');
        setRawRows([]);
        setHasGenerated(true);
      } finally {
        setIsLoading(false);
      }
    };

    void loadCurrentDateReport();
  }, []);

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

  const onGenerateReport = async () => {
    if (!pendingStartDate || !pendingEndDate) {
      setIsWarningOpen(true);
      return;
    }

    setReportType(pendingType);
    setStartDate(pendingStartDate);
    setEndDate(pendingEndDate);
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const mappedRows = await fetchSalesReportRows(pendingStartDate, pendingEndDate);
      setRawRows(mappedRows);
      setHasGenerated(true);
    } catch {
      setErrorMessage('Failed to load sales report.');
      setRawRows([]);
      setHasGenerated(true);
    } finally {
      setIsLoading(false);
    }
  };

  const onRowAction = (message: string) => {
    setActionNotice(message);
    setIsActionNoticeOpen(true);
  };

  const onOpenModifyGgTransNo = (row: ReportsSaleRow) => {
    setSelectedModifyRow({
      id: row.id,
      dailySalesIds: row.dailySalesIds,
      pofNumber: row.pofNumber,
      ggTransNo: row.ggTransNo,
    });
    setIsModifyModalOpen(true);
  };

  const onSaveModifyGgTransNo = async (newValue: string) => {
    if (!selectedModifyRow) {
      return;
    }

    setIsSavingGgTransNo(true);

    try {
      const response = await fetch('/api/daily-sales/modify-gg-trans-no', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dailySalesId: selectedModifyRow.dailySalesIds[0],
          daily_sales_id: selectedModifyRow.dailySalesIds[0],
          username: newValue,
          ggTransNo: newValue,
          gg_trans_no: newValue,
        }),
      });

      const firstPayload = (await response.json()) as { success?: boolean; message?: string };

      if (!response.ok || !firstPayload.success) {
        throw new Error(firstPayload.message ?? 'Failed to modify GG transaction number.');
      }

      for (const dailySalesId of selectedModifyRow.dailySalesIds.slice(1)) {
        const batchResponse = await fetch('/api/daily-sales/modify-gg-trans-no', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dailySalesId,
            daily_sales_id: dailySalesId,
            username: newValue,
            ggTransNo: newValue,
            gg_trans_no: newValue,
          }),
        });

        const batchPayload = (await batchResponse.json()) as { success?: boolean; message?: string };
        if (!batchResponse.ok || !batchPayload.success) {
          throw new Error(batchPayload.message ?? 'Failed to modify GG transaction number.');
        }
      }

      setRawRows((prev) =>
        prev.map((row) =>
          selectedModifyRow.dailySalesIds.includes(row.dailySalesId)
            ? { ...row, ggTransNo: newValue, zeroOne: newValue }
            : row
        )
      );
      setIsModifyModalOpen(false);
      setSelectedModifyRow(null);
      onRowAction(`GG Transaction Number updated for ${selectedModifyRow.pofNumber}.`);
    } catch (error) {
      onRowAction(
        error instanceof Error ? error.message : 'Failed to modify GG transaction number.'
      );
    } finally {
      setIsSavingGgTransNo(false);
    }
  };

  const onPrintRow = async (row: ReportsSaleRow) => {
    try {
      const params = new URLSearchParams({
        pofNumber: row.pofNumbers[0] ?? '',
        username: row.ggTransNo,
      });

      const response = await fetch(`/api/daily-sales/get?${params.toString()}`);
      const payload = (await response.json()) as {
        success?: boolean;
        message?: string;
        data?: Array<{
          pof_number: string;
          member_name: string;
          username: string;
          package_type: string;
          quantity: number;
          original_price: number;
          discount: number;
          price_after_discount: number;
          bottle_count: number;
          blister_count: number;
          one_time_discount: number;
          released_count: number;
          released_blpk_count: number;
          to_follow_count: number;
          to_follow_blpk_count: number;
          sales: number;
          mode_of_payment: string;
          payment_type: string;
          reference_number: string;
          sales_two: number;
          mode_of_payment_two: string;
          payment_type_two: string;
          reference_number_two: string;
          sales_three: number;
          mode_of_payment_three: string;
          payment_type_three: string;
          reference_number_three: string;
          remarks: string;
          received_by: string;
          collected_by: string;
        }>;
      };

      if (!response.ok || !payload.success || !payload.data?.length) {
        throw new Error(payload.message ?? 'Failed to load print details.');
      }

      const printHtml = buildPofPrintHtml(payload.data);
      openPrintWindow('Package / Retail Order Form', printHtml);
    } catch (error) {
      onRowAction(error instanceof Error ? error.message : `Failed to print ${row.pofNumber}.`);
    }
  };

  const onOpenRemoveRow = (row: ReportsSaleRow) => {
    setSelectedRemoveRow(row);
    setIsRemoveModalOpen(true);
  };

  const onCloseRemoveModal = () => {
    if (isRemovingRow) {
      return;
    }

    setIsRemoveModalOpen(false);
    setSelectedRemoveRow(null);
  };

  const onConfirmRemoveRow = async () => {
    if (!selectedRemoveRow) {
      return;
    }

    setIsRemovingRow(true);

    try {
      const response = await fetch('/api/daily-sales/remove-pof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pofNumber: selectedRemoveRow.pofNumbers[0],
          pof_number: selectedRemoveRow.pofNumbers[0],
          username: selectedRemoveRow.ggTransNo,
          ggTransNo: selectedRemoveRow.ggTransNo,
        }),
      });

      const firstPayload = (await response.json()) as { success?: boolean; message?: string };

      if (!response.ok || !firstPayload.success) {
        throw new Error(firstPayload.message ?? 'Failed to remove POF.');
      }

      for (const pofNumber of selectedRemoveRow.pofNumbers.slice(1)) {
        const batchResponse = await fetch('/api/daily-sales/remove-pof', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pofNumber,
            pof_number: pofNumber,
            username: selectedRemoveRow.ggTransNo,
            ggTransNo: selectedRemoveRow.ggTransNo,
          }),
        });

        const batchPayload = (await batchResponse.json()) as { success?: boolean; message?: string };
        if (!batchResponse.ok || !batchPayload.success) {
          throw new Error(batchPayload.message ?? 'Failed to remove POF.');
        }
      }

      setRawRows((prev) =>
        prev.filter(
          (row) =>
            !(
              selectedRemoveRow.pofNumbers.includes(row.pofNumber) &&
              row.ggTransNo === selectedRemoveRow.ggTransNo
            )
        )
      );
      setIsRemoveModalOpen(false);
      onRowAction(`Removed ${selectedRemoveRow.pofNumber} from reports and Supabase.`);
      setSelectedRemoveRow(null);
    } catch (error) {
      onRowAction(error instanceof Error ? error.message : 'Failed to remove POF.');
    } finally {
      setIsRemovingRow(false);
    }
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
        {isLoading ? <p className="px-4 pb-2 text-xs text-slate-500">Loading sales report...</p> : null}
        {errorMessage ? <p className="px-4 pb-2 text-xs text-amber-600">{errorMessage}</p> : null}
        {!isLoading && !errorMessage && hasGenerated && filteredRows.length === 0 ? (
          <p className="px-4 pb-2 text-xs text-slate-500">No results for selected date range</p>
        ) : null}
        <div className="app-table-scroll">
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
                        <Button size="sm" variant="secondary" onClick={() => onOpenModifyGgTransNo(row)}>
                          Trans No.
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => onPrintRow(row)}>
                          Print
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => onOpenRemoveRow(row)}>
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
      <ModifyGgTransNoModal
        isOpen={isModifyModalOpen}
        row={selectedModifyRow}
        onSave={onSaveModifyGgTransNo}
        isSaving={isSavingGgTransNo}
        onClose={() => {
          if (isSavingGgTransNo) {
            return;
          }

          setIsModifyModalOpen(false);
          setSelectedModifyRow(null);
        }}
      />
      <Modal
        isOpen={isRemoveModalOpen}
        title="Remove Report Row"
        onClose={onCloseRemoveModal}
        footer={
          <>
            <Button variant="secondary" onClick={onCloseRemoveModal} disabled={isRemovingRow}>
              Cancel
            </Button>
            <Button variant="danger" onClick={onConfirmRemoveRow} disabled={isRemovingRow}>
              {isRemovingRow ? 'Removing...' : 'Remove'}
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-900">
            Delete POF <span className="text-red-600">{selectedRemoveRow?.pofNumber}</span>?
          </p>
          <p>
            This will remove the entries for this POF and username row from the table and delete the matching record(s) in Supabase.
          </p>
        </div>
      </Modal>
    </section>
  );
}
