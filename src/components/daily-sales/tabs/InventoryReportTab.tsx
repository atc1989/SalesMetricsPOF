'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import {
  getDailySalesPackagePrice,
  normalizeDailySalesPackageType,
} from '@/lib/dailySalesPackages';
import { openPrintWindow } from '@/lib/print/openPrintWindow';

type InventoryReportRow = {
  id: string;
  date: string;
  name: string;
  ggTransNo: string;
  pofNumber: string;
  platinum: number;
  gold: number;
  silver: number;
  synbioticBottle: number;
  synbioticBlister: number;
  voucher: number;
  employeeDiscount: number;
  numberOfBottles: number;
  numberOfBlisters: number;
  releasedBottle: number;
  releasedBlister: number;
  toFollowBottle: number;
  toFollowBlister: number;
  amount: number;
  modeOfPayment: string;
};

type DailyInventoryApiRow = {
  package_type: string;
  total_quantity: number;
  total_bottles: number;
  total_blisters: number;
};

type DailyInventoryApiResponse = {
  success: boolean;
  message?: string;
  rows?: DailyInventoryApiRow[];
};

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const formatAmount = (value: number) => `PHP ${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

const renderInventoryPrintHtml = (rows: InventoryReportRow[], dateRange: string) => {
  const bodyRows =
    rows.length === 0
      ? `<tr><td colspan="18">No inventory results for selected range</td></tr>`
      : rows
          .map(
            (row) => `
              <tr>
                <td>${escapeHtml(row.name)}</td>
                <td>${escapeHtml(row.ggTransNo)}</td>
                <td>${escapeHtml(row.pofNumber)}</td>
                <td>${row.platinum}</td>
                <td>${row.gold}</td>
                <td>${row.silver}</td>
                <td>${row.synbioticBottle}</td>
                <td>${row.synbioticBlister}</td>
                <td>${row.voucher}</td>
                <td>${row.employeeDiscount}</td>
                <td>${row.numberOfBottles}</td>
                <td>${row.numberOfBlisters}</td>
                <td>${row.releasedBottle}</td>
                <td>${row.releasedBlister}</td>
                <td>${row.toFollowBottle}</td>
                <td>${row.toFollowBlister}</td>
                <td>${escapeHtml(formatAmount(row.amount))}</td>
                <td>${escapeHtml(row.modeOfPayment)}</td>
              </tr>`,
          )
          .join('');

  return `
    <div class="print-header">
      <h1>Innovision Grand International</h1>
      <h2>Inventory Report</h2>
      <p>${escapeHtml(dateRange)}</p>
    </div>
    <div class="tbl-di-container">
      <table class="tbl-daily-inventory">
        <thead>
          <tr>
            <th rowspan="2">NAME</th>
            <th rowspan="2">GG TRANS NO.</th>
            <th rowspan="2">POF NUMBER</th>
            <th colspan="3">PACKAGE TYPE</th>
            <th colspan="4">RETAIL</th>
            <th rowspan="2">NUMBER OF BOTTLES</th>
            <th rowspan="2">NUMBER OF BLISTERS</th>
            <th rowspan="2">RELEASED (BOTTLE)</th>
            <th rowspan="2">RELEASED (BLISTER)</th>
            <th rowspan="2">TO FOLLOW (BOTTLE)</th>
            <th rowspan="2">TO FOLLOW (BLISTER)</th>
            <th rowspan="2">AMOUNT</th>
            <th rowspan="2">MODE OF PAYMENT</th>
          </tr>
          <tr>
            <th>PLATINUM</th>
            <th>GOLD</th>
            <th>SILVER</th>
            <th>SYNBIOTIC+ BOTTLE</th>
            <th>SYNBIOTIC+ BLISTER</th>
            <th>VOUCHER</th>
            <th>EMPLOYEE DISCOUNT</th>
          </tr>
        </thead>
        <tbody>
          ${bodyRows}
        </tbody>
        <tfoot></tfoot>
      </table>
    </div>
    <div class="print-signoff">
      <div class="form-row">
        <span>PREPARED BY:</span>
        <span>CHECKED BY:</span>
      </div>
      <div class="form-row">
        <span>____________________________</span>
        <span>____________________________</span>
      </div>
    </div>
  `;
};

const mapApiRowToReportRow = (
  row: DailyInventoryApiRow,
  index: number,
): InventoryReportRow => {
  const upperPackageType = row.package_type.toUpperCase();
  const normalizedPackageType = normalizeDailySalesPackageType(row.package_type);
  const isBlister = upperPackageType.includes('BLISTER');
  const isRetail = upperPackageType.includes('RETAIL');
  const amountMultiplier = normalizedPackageType
    ? getDailySalesPackagePrice(normalizedPackageType)
    : 0;

  return {
    id: `api-${index}-${upperPackageType}`,
    date: '',
    name: row.package_type,
    ggTransNo: '-',
    pofNumber: '-',
    platinum: upperPackageType.includes('PLATINUM') ? row.total_quantity : 0,
    gold: upperPackageType.includes('GOLD') ? row.total_quantity : 0,
    silver: upperPackageType.includes('SILVER') ? row.total_quantity : 0,
    synbioticBottle: isRetail ? row.total_bottles : 0,
    synbioticBlister: isBlister ? row.total_blisters : 0,
    voucher: 0,
    employeeDiscount: 0,
    numberOfBottles: row.total_bottles,
    numberOfBlisters: row.total_blisters,
    releasedBottle: row.total_bottles,
    releasedBlister: row.total_blisters,
    toFollowBottle: 0,
    toFollowBlister: 0,
    amount: row.total_quantity * amountMultiplier,
    modeOfPayment: 'N/A',
  };
};

const formatDateDMYY = (value: string) => {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const day = String(parsed.getDate()).padStart(2, '0');
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const year = parsed.getFullYear();
  return `${day}/${month}/${year}`;
};

export function InventoryReportTab() {
  const defaultInventoryDate = new Date().toISOString().slice(0, 10);
  const [pendingFromDate, setPendingFromDate] = useState('');
  const [pendingToDate, setPendingToDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [rows, setRows] = useState<InventoryReportRow[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [displayDateRange, setDisplayDateRange] = useState(
    `${formatDateDMYY(defaultInventoryDate)} To ${formatDateDMYY(defaultInventoryDate)}`
  );

  const onGenerate = async () => {
    if (!pendingFromDate || !pendingToDate) {
      setIsWarningOpen(true);
      return;
    }

    setDisplayDateRange(`${formatDateDMYY(pendingFromDate)} To ${formatDateDMYY(pendingToDate)}`);
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch(
        `/api/reports/daily-inventory?dateFrom=${encodeURIComponent(pendingFromDate)}&dateTo=${encodeURIComponent(pendingToDate)}`
      );
      const payload = (await response.json()) as DailyInventoryApiResponse;

      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? 'Request failed');
      }

      const mappedRows = (payload.rows ?? []).map((row, index) => mapApiRowToReportRow(row, index));
      setRows(mappedRows);
      setHasLoaded(true);
    } catch {
      setRows([]);
      setErrorMessage('Failed to load inventory report.');
      setHasLoaded(true);
    } finally {
      setIsLoading(false);
    }
  };

  const onPrint = () => {
    const printHtml = renderInventoryPrintHtml(rows, displayDateRange);
    openPrintWindow('Inventory Report', printHtml);
  };

  return (
    <section id="inventory-report" className="mt-4 space-y-4">
      <Card className="p-3">
        <div className="grid gap-2 md:grid-cols-4">
          <label className="flex flex-col text-xs font-medium text-slate-700">
            FROM
            <input
              id="transDateFrom"
              type="date"
              value={pendingFromDate}
              onChange={(event) => setPendingFromDate(event.target.value)}
              className="mt-1 rounded border border-slate-300 px-2 py-1 text-sm"
            />
          </label>
          <label className="flex flex-col text-xs font-medium text-slate-700">
            TO
            <input
              id="transDateTo"
              type="date"
              value={pendingToDate}
              onChange={(event) => setPendingToDate(event.target.value)}
              className="mt-1 rounded border border-slate-300 px-2 py-1 text-sm"
            />
          </label>
          <div className="flex items-end">
            <Button
              id="generateDailyInventory"
              variant="secondary"
              className="w-full md:w-auto"
              onClick={onGenerate}
              disabled={isLoading}
            >
              {isLoading ? 'Generating...' : 'Generate Report'}
            </Button>
          </div>
          <label className="flex flex-col text-xs font-medium text-slate-700">
            SEARCH
            <input
              id="tblDailyInventorySearch"
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search table..."
              className="mt-1 rounded border border-slate-300 px-2 py-1 text-sm"
            />
          </label>
        </div>
      </Card>

      <Card id="cntnrDailyInventory" className="p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <span id="spnTransDate" className="text-sm text-slate-700">
            {displayDateRange}
          </span>
          <Button id="printDailyInventory" size="sm" variant="secondary" onClick={onPrint}>
            Print
          </Button>
        </div>
        {errorMessage ? (
          <p className="px-4 pb-2 text-xs text-amber-700">{errorMessage}</p>
        ) : null}
        <div className="overflow-x-auto">
          <table id="tblDailyInventory" className="min-w-[1600px] text-sm">
            <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-600">
              <tr>
                <th rowSpan={2} className="px-3 py-2">
                  name
                </th>
                <th rowSpan={2} className="px-3 py-2">
                  GG TRANS NO.
                </th>
                <th rowSpan={2} className="px-3 py-2">
                  POF NUMBER
                </th>
                <th colSpan={3} className="px-3 py-2 text-center">
                  PACKAGE TYPE
                </th>
                <th colSpan={4} className="px-3 py-2 text-center">
                  RETAIL
                </th>
                <th rowSpan={2} className="px-3 py-2">
                  NUMBER OF BOTTLES
                </th>
                <th rowSpan={2} className="px-3 py-2">
                  NUMBER OF BLISTERS
                </th>
                <th rowSpan={2} className="px-3 py-2">
                  RELEASED (BOTTLE)
                </th>
                <th rowSpan={2} className="px-3 py-2">
                  RELEASED (BLISTER)
                </th>
                <th rowSpan={2} className="px-3 py-2">
                  TO FOLLOW (BOTTLE)
                </th>
                <th rowSpan={2} className="px-3 py-2">
                  TO FOLLOW (BLISTER)
                </th>
                <th rowSpan={2} className="px-3 py-2">
                  amount
                </th>
                <th rowSpan={2} className="px-3 py-2">
                  MODE OF PAYMENT
                </th>
              </tr>
              <tr>
                <th className="px-3 py-2">PLATINUM</th>
                <th className="px-3 py-2">GOLD</th>
                <th className="px-3 py-2">SILVER</th>
                <th className="px-3 py-2">SYNBIOTIC+ (BOTTLE)</th>
                <th className="px-3 py-2">SYNBIOTIC+ (BLISTER)</th>
                <th className="px-3 py-2">VOUCHER</th>
                <th className="px-3 py-2">EMPLOYEE DISCOUNT</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={18} className="px-3 py-6 text-center text-slate-500">
                    {hasLoaded
                      ? 'No inventory results for selected range'
                      : 'No inventory rows found for the selected filters.'}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">{row.name}</td>
                    <td className="px-3 py-2">{row.ggTransNo}</td>
                    <td className="px-3 py-2">{row.pofNumber}</td>
                    <td className="px-3 py-2">{row.platinum}</td>
                    <td className="px-3 py-2">{row.gold}</td>
                    <td className="px-3 py-2">{row.silver}</td>
                    <td className="px-3 py-2">{row.synbioticBottle}</td>
                    <td className="px-3 py-2">{row.synbioticBlister}</td>
                    <td className="px-3 py-2">{row.voucher}</td>
                    <td className="px-3 py-2">{row.employeeDiscount}</td>
                    <td className="px-3 py-2">{row.numberOfBottles}</td>
                    <td className="px-3 py-2">{row.numberOfBlisters}</td>
                    <td className="px-3 py-2">{row.releasedBottle}</td>
                    <td className="px-3 py-2">{row.releasedBlister}</td>
                    <td className="px-3 py-2">{row.toFollowBottle}</td>
                    <td className="px-3 py-2">{row.toFollowBlister}</td>
                    <td className="px-3 py-2">PHP {row.amount.toLocaleString()}</td>
                    <td className="px-3 py-2">{row.modeOfPayment}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot />
          </table>
        </div>
      </Card>

      <Modal isOpen={isWarningOpen} title="Warning!" onClose={() => setIsWarningOpen(false)}>
        Please input valid date.
      </Modal>
    </section>
  );
}
