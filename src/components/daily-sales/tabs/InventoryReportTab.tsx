'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { formatMemberName, formatPofNumber, formatZeroOne } from '@/lib/dailySalesDisplay';
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
  memberType: string;
  pofNumber: string;
  platinum: number;
  gold: number;
  silver: number;
  oldPlatinum: number;
  oldGold: number;
  oldSilver: number;
  synbioticBottle: number;
  synbioticBlister: number;
  voucher: number;
  employeeDiscount: number;
  silverBag: number;
  blueBag: number;
  brochure: number;
  trifold: number;
  flyers: number;
  tumbler: number;
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
  trans_date: string | null;
  member_name: string;
  username: string;
  member_type: string;
  pof_number: string;
  package_type: string;
  quantity: number;
  bottle_count: number;
  blister_count: number;
  released_count: number;
  released_blpk_count: number;
  to_follow_count: number;
  to_follow_blpk_count: number;
  sales: number;
  mode_of_payment: string;
  bag_type: string;
  bag_quantity: number;
  marketing_tool: string;
  marketing_quantity: number;
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

const comparePofNumbers = (left: string, right: string) => {
  const normalize = (value: string) => {
    const trimmed = value.trim();
    const match = /^(\d+)\s*-\s*(\d+)$/.exec(trimmed);

    if (!match) {
      return { base: trimmed, suffix: Number.NaN };
    }

    return { base: match[1], suffix: Number(match[2]) };
  };

  const leftPof = normalize(left);
  const rightPof = normalize(right);
  const baseComparison = leftPof.base.localeCompare(rightPof.base, undefined, { numeric: true });

  if (baseComparison !== 0) {
    return baseComparison;
  }

  if (Number.isFinite(leftPof.suffix) && Number.isFinite(rightPof.suffix)) {
    return leftPof.suffix - rightPof.suffix;
  }

  return left.localeCompare(right, undefined, { numeric: true });
};

const sortInventoryRowsAscending = (input: InventoryReportRow[]) =>
  [...input].sort(
    (left, right) =>
      comparePofNumbers(left.pofNumber, right.pofNumber) ||
      left.name.localeCompare(right.name) ||
      left.ggTransNo.localeCompare(right.ggTransNo, undefined, { numeric: true }),
  );

const sumInventoryRows = (input: InventoryReportRow[]) =>
  input.reduce(
    (totals, row) => ({
      platinum: totals.platinum + row.platinum,
      gold: totals.gold + row.gold,
      silver: totals.silver + row.silver,
      oldPlatinum: totals.oldPlatinum + row.oldPlatinum,
      oldGold: totals.oldGold + row.oldGold,
      oldSilver: totals.oldSilver + row.oldSilver,
      synbioticBottle: totals.synbioticBottle + row.synbioticBottle,
      synbioticBlister: totals.synbioticBlister + row.synbioticBlister,
      voucher: totals.voucher + row.voucher,
      employeeDiscount: totals.employeeDiscount + row.employeeDiscount,
      silverBag: totals.silverBag + row.silverBag,
      blueBag: totals.blueBag + row.blueBag,
      brochure: totals.brochure + row.brochure,
      trifold: totals.trifold + row.trifold,
      flyers: totals.flyers + row.flyers,
      tumbler: totals.tumbler + row.tumbler,
      numberOfBottles: totals.numberOfBottles + row.numberOfBottles,
      numberOfBlisters: totals.numberOfBlisters + row.numberOfBlisters,
      releasedBottle: totals.releasedBottle + row.releasedBottle,
      releasedBlister: totals.releasedBlister + row.releasedBlister,
      toFollowBottle: totals.toFollowBottle + row.toFollowBottle,
      toFollowBlister: totals.toFollowBlister + row.toFollowBlister,
      amount: totals.amount + row.amount,
    }),
    {
      platinum: 0,
      gold: 0,
      silver: 0,
      oldPlatinum: 0,
      oldGold: 0,
      oldSilver: 0,
      synbioticBottle: 0,
      synbioticBlister: 0,
      voucher: 0,
      employeeDiscount: 0,
      silverBag: 0,
      blueBag: 0,
      brochure: 0,
      trifold: 0,
      flyers: 0,
      tumbler: 0,
      numberOfBottles: 0,
      numberOfBlisters: 0,
      releasedBottle: 0,
      releasedBlister: 0,
      toFollowBottle: 0,
      toFollowBlister: 0,
      amount: 0,
    },
  );

const abbreviateMemberType = (value: string) => {
  const normalized = value.trim().toUpperCase();

  switch (normalized) {
    case 'MOBILE STOCKIST':
      return 'MS';
    case 'CITY STOCKIST':
      return 'CS';
    case 'DISTRIBUTOR':
      return 'D';
    case 'CENTER':
      return 'CD';
    case 'NON-MEMBER':
      return 'NM';
    default: {
      const initials = normalized
        .split(/[\s-]+/)
        .filter((part) => part.length > 0)
        .map((part) => part[0])
        .join('');
      return initials || 'N/A';
    }
  }
};

const renderInventoryPrintHtml = (rows: InventoryReportRow[], dateRange: string) => {
  const sortedRows = sortInventoryRowsAscending(rows);
  const totals = sumInventoryRows(sortedRows);
  const bodyRows =
    sortedRows.length === 0
      ? `<tr><td colspan="28">No inventory results for selected range</td></tr>`
      : sortedRows
          .map(
            (row) => `
              <tr>
                <td>${escapeHtml(row.name)}</td>
                <td>${escapeHtml(row.ggTransNo)}</td>
                <td>${escapeHtml(row.pofNumber)}</td>
                <td>${row.platinum}</td>
                <td>${row.gold}</td>
                <td>${row.silver}</td>
                <td>${row.oldPlatinum}</td>
                <td>${row.oldGold}</td>
                <td>${row.oldSilver}</td>
                <td>${row.synbioticBottle}</td>
                <td>${row.synbioticBlister}</td>
                <td>${row.voucher}</td>
                <td>${row.employeeDiscount}</td>
                <td>${row.silverBag}</td>
                <td>${row.blueBag}</td>
                <td>${row.brochure}</td>
                <td>${row.trifold}</td>
                <td>${row.flyers}</td>
                <td>${row.tumbler}</td>
                <td>${row.numberOfBottles}</td>
                <td>${row.numberOfBlisters}</td>
                <td>${row.releasedBottle}</td>
                <td>${row.releasedBlister}</td>
                <td>${row.toFollowBottle}</td>
                <td>${row.toFollowBlister}</td>
                <td>${escapeHtml(formatAmount(row.amount))}</td>
                <td>${escapeHtml(row.modeOfPayment)}</td>
                <td>${escapeHtml(row.memberType)}</td>
              </tr>`,
          )
          .join('');

  return `
    <div class="card table-container tbl-di-container" id="cntnrDailyInventory">
      <div class="form-row form-header" style="justify-content: center;">
        <p></p>
        <span style="font-weight: bold;">Innovision Grand International</span>
        <p></p>
      </div>

      <div class="form-row form-header" style="justify-content: center;">
        <p></p>
        <span style="font-weight: bold;">Inventory Report</span>
        <p></p>
      </div>

      <div class="form-row form-header" style="justify-content: center;">
        <p></p>
        <span id="spnTransDate" style="font-weight: bold;">${escapeHtml(dateRange)}</span>
        <p></p>
      </div>

      <br />
      <table class="tbl-daily-inventory">
        <thead>
          <tr>
            <th rowspan="2">NAME</th>
            <th rowspan="2">GG TRANS NO.</th>
            <th rowspan="2">POF NUMBER</th>
            <th colspan="6">PACKAGE TYPE</th>
            <th colspan="4">RETAIL</th>
            <th colspan="6">OTHERS</th>
            <th rowspan="2">NUMBER OF BOTTLES</th>
            <th rowspan="2">NUMBER OF BLISTERS</th>
            <th rowspan="2">RELEASED (BOTTLE)</th>
            <th rowspan="2">RELEASED (BLISTER)</th>
            <th rowspan="2">TO FOLLOW (BOTTLE)</th>
            <th rowspan="2">TO FOLLOW (BLISTER)</th>
            <th rowspan="2">AMOUNT</th>
            <th rowspan="2">MODE OF PAYMENT</th>
            <th rowspan="2">MEMBER TYPE</th>
          </tr>
          <tr>
            <th>PLATINUM</th>
            <th>GOLD</th>
            <th>SILVER</th>
            <th>OLD PLATINUM</th>
            <th>OLD GOLD</th>
            <th>OLD SILVER</th>
            <th>SYNBIOTIC+ BOTTLE</th>
            <th>SYNBIOTIC+ BLISTER</th>
            <th>VOUCHER</th>
            <th>EMPLOYEE DISCOUNT</th>
            <th>SILVER BAG</th>
            <th>BLUE BAG</th>
            <th>BROCHURE</th>
            <th>TRIFOLD</th>
            <th>FLYERS</th>
            <th>TUMBLER</th>
          </tr>
        </thead>
        <tbody>
          ${bodyRows}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3"><strong>TOTAL</strong></td>
            <td>${totals.platinum}</td>
            <td>${totals.gold}</td>
            <td>${totals.silver}</td>
            <td>${totals.oldPlatinum}</td>
            <td>${totals.oldGold}</td>
            <td>${totals.oldSilver}</td>
            <td>${totals.synbioticBottle}</td>
            <td>${totals.synbioticBlister}</td>
            <td>${totals.voucher}</td>
            <td>${totals.employeeDiscount}</td>
            <td>${totals.silverBag}</td>
            <td>${totals.blueBag}</td>
            <td>${totals.brochure}</td>
            <td>${totals.trifold}</td>
            <td>${totals.flyers}</td>
            <td>${totals.tumbler}</td>
            <td>${totals.numberOfBottles}</td>
            <td>${totals.numberOfBlisters}</td>
            <td>${totals.releasedBottle}</td>
            <td>${totals.releasedBlister}</td>
            <td>${totals.toFollowBottle}</td>
            <td>${totals.toFollowBlister}</td>
            <td>${escapeHtml(formatAmount(totals.amount))}</td>
            <td></td>
            <td></td>
          </tr>
        </tfoot>
      </table>

      <br />
      <div class="form-row" style="justify-content: space-around;">
        <p>Prepared By:<br /><span id="txtPreparedBy" style="font-weight: bold;">Alaiza Jane Emoylan</span><br />Cashier</p>
        <p>Prepared By:<br /><span style="font-weight: bold;">Mary Grace Damasin</span></p>
        <p>Checked By:<br /><span id="txtCheckedBy" style="font-weight: bold;">Erica Villaester</span><br />Accounting Staff</p>
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
  const isBlister = upperPackageType.includes('BLISTER') && !upperPackageType.includes('OLD');
  const isRetail = upperPackageType.includes('RETAIL');
  const isOldPlatinum = upperPackageType.includes('OLD') && upperPackageType.includes('PLATINUM');
  const isOldGold = upperPackageType.includes('OLD') && upperPackageType.includes('GOLD');
  const isOldSilver = upperPackageType.includes('OLD') && upperPackageType.includes('SILVER');
  const upperBagType = (row.bag_type ?? '').toUpperCase();
  const upperMarketingTool = (row.marketing_tool ?? '').toUpperCase();
  const amountMultiplier =
    row.sales > 0
      ? 0
      : normalizedPackageType
        ? getDailySalesPackagePrice(normalizedPackageType)
        : 0;
  const totalQuantity = row.quantity ?? 0;
  const totalBottles = row.bottle_count ?? 0;
  const totalBlisters = row.blister_count ?? 0;
  const bagQuantity = row.bag_quantity ?? 0;
  const marketingQuantity = row.marketing_quantity ?? 0;

  return {
    id: `api-${index}-${upperPackageType}`,
    date: row.trans_date ?? '',
    name: formatMemberName(row.member_name) || 'N/A',
    ggTransNo: formatZeroOne(row.username) || '-',
    memberType: abbreviateMemberType(row.member_type) || 'N/A',
    pofNumber: formatPofNumber(row.pof_number) || '-',
    platinum: upperPackageType.includes('PLATINUM') && !upperPackageType.includes('OLD') ? totalQuantity : 0,
    gold: upperPackageType.includes('GOLD') && !upperPackageType.includes('OLD') ? totalQuantity : 0,
    silver: upperPackageType.includes('SILVER') && !upperPackageType.includes('OLD') ? totalQuantity : 0,
    oldPlatinum: isOldPlatinum ? totalQuantity : 0,
    oldGold: isOldGold ? totalQuantity : 0,
    oldSilver: isOldSilver ? totalQuantity : 0,
    synbioticBottle: isRetail ? totalBottles : 0,
    synbioticBlister: isBlister ? totalBlisters : 0,
    voucher: 0,
    employeeDiscount: 0,
    silverBag: upperBagType.includes('SILVER_BAG') || upperBagType.includes('SILVER BAG') ? bagQuantity : 0,
    blueBag: upperBagType.includes('BLUE_BAG') || upperBagType.includes('BLUE BAG') ? bagQuantity : 0,
    brochure: upperMarketingTool.includes('BROCHURE') ? marketingQuantity : 0,
    trifold: upperMarketingTool.includes('TRIFOLD') ? marketingQuantity : 0,
    flyers: upperMarketingTool.includes('FLYERS') ? marketingQuantity : 0,
    tumbler: upperMarketingTool.includes('TUMBLER') ? marketingQuantity : 0,
    numberOfBottles: totalBottles,
    numberOfBlisters: totalBlisters,
    releasedBottle: row.released_count ?? 0,
    releasedBlister: row.released_blpk_count ?? 0,
    toFollowBottle: row.to_follow_count ?? 0,
    toFollowBlister: row.to_follow_blpk_count ?? 0,
    amount: row.sales > 0 ? row.sales : totalQuantity * amountMultiplier,
    modeOfPayment: row.mode_of_payment || 'N/A',
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

  const sortedRows = sortInventoryRowsAscending(rows);
  const totals = sumInventoryRows(sortedRows);

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
          <Button id="printDailyInventory" data-print-exclude="true" size="sm" variant="secondary" onClick={onPrint}>
            Print
          </Button>
        </div>
        {errorMessage ? (
          <p className="px-4 pb-2 text-xs text-amber-700">{errorMessage}</p>
        ) : null}
        <div className="app-table-scroll">
          <table id="tblDailyInventory" className="min-w-[2400px] text-sm">
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
                <th colSpan={6} className="px-3 py-2 text-center">
                  PACKAGE TYPE
                </th>
                <th colSpan={4} className="px-3 py-2 text-center">
                  RETAIL
                </th>
                <th colSpan={6} className="px-3 py-2 text-center">
                  OTHERS
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
                <th rowSpan={2} className="px-3 py-2">
                  MEMBER TYPE
                </th>
              </tr>
              <tr>
                <th className="px-3 py-2">PLATINUM</th>
                <th className="px-3 py-2">GOLD</th>
                <th className="px-3 py-2">SILVER</th>
                <th className="px-3 py-2">OLD PLATINUM</th>
                <th className="px-3 py-2">OLD GOLD</th>
                <th className="px-3 py-2">OLD SILVER</th>
                <th className="px-3 py-2">SYNBIOTIC+ (BOTTLE)</th>
                <th className="px-3 py-2">SYNBIOTIC+ (BLISTER)</th>
                <th className="px-3 py-2">VOUCHER</th>
                <th className="px-3 py-2">EMPLOYEE DISCOUNT</th>
                <th className="px-3 py-2">SILVER BAG</th>
                <th className="px-3 py-2">BLUE BAG</th>
                <th className="px-3 py-2">BROCHURE</th>
                <th className="px-3 py-2">TRIFOLD</th>
                <th className="px-3 py-2">FLYERS</th>
                <th className="px-3 py-2">TUMBLER</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={28} className="px-3 py-6 text-center text-slate-500">
                    {hasLoaded
                      ? 'No inventory results for selected range'
                      : 'No inventory rows found for the selected filters.'}
                  </td>
                </tr>
              ) : (
                sortedRows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">{row.name}</td>
                    <td className="px-3 py-2">{row.ggTransNo}</td>
                    <td className="px-3 py-2">{row.pofNumber}</td>
                    <td className="px-3 py-2">{row.platinum}</td>
                    <td className="px-3 py-2">{row.gold}</td>
                    <td className="px-3 py-2">{row.silver}</td>
                    <td className="px-3 py-2">{row.oldPlatinum}</td>
                    <td className="px-3 py-2">{row.oldGold}</td>
                    <td className="px-3 py-2">{row.oldSilver}</td>
                    <td className="px-3 py-2">{row.synbioticBottle}</td>
                    <td className="px-3 py-2">{row.synbioticBlister}</td>
                    <td className="px-3 py-2">{row.voucher}</td>
                    <td className="px-3 py-2">{row.employeeDiscount}</td>
                    <td className="px-3 py-2">{row.silverBag}</td>
                    <td className="px-3 py-2">{row.blueBag}</td>
                    <td className="px-3 py-2">{row.brochure}</td>
                    <td className="px-3 py-2">{row.trifold}</td>
                    <td className="px-3 py-2">{row.flyers}</td>
                    <td className="px-3 py-2">{row.tumbler}</td>
                    <td className="px-3 py-2">{row.numberOfBottles}</td>
                    <td className="px-3 py-2">{row.numberOfBlisters}</td>
                    <td className="px-3 py-2">{row.releasedBottle}</td>
                    <td className="px-3 py-2">{row.releasedBlister}</td>
                    <td className="px-3 py-2">{row.toFollowBottle}</td>
                    <td className="px-3 py-2">{row.toFollowBlister}</td>
                    <td className="px-3 py-2">PHP {row.amount.toLocaleString()}</td>
                    <td className="px-3 py-2">{row.modeOfPayment}</td>
                    <td className="px-3 py-2">{row.memberType}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-slate-50 font-semibold text-slate-700">
              <tr>
                <td colSpan={3} className="px-3 py-2">
                  TOTAL
                </td>
                <td className="px-3 py-2">{totals.platinum}</td>
                <td className="px-3 py-2">{totals.gold}</td>
                <td className="px-3 py-2">{totals.silver}</td>
                <td className="px-3 py-2">{totals.oldPlatinum}</td>
                <td className="px-3 py-2">{totals.oldGold}</td>
                <td className="px-3 py-2">{totals.oldSilver}</td>
                <td className="px-3 py-2">{totals.synbioticBottle}</td>
                <td className="px-3 py-2">{totals.synbioticBlister}</td>
                <td className="px-3 py-2">{totals.voucher}</td>
                <td className="px-3 py-2">{totals.employeeDiscount}</td>
                <td className="px-3 py-2">{totals.silverBag}</td>
                <td className="px-3 py-2">{totals.blueBag}</td>
                <td className="px-3 py-2">{totals.brochure}</td>
                <td className="px-3 py-2">{totals.trifold}</td>
                <td className="px-3 py-2">{totals.flyers}</td>
                <td className="px-3 py-2">{totals.tumbler}</td>
                <td className="px-3 py-2">{totals.numberOfBottles}</td>
                <td className="px-3 py-2">{totals.numberOfBlisters}</td>
                <td className="px-3 py-2">{totals.releasedBottle}</td>
                <td className="px-3 py-2">{totals.releasedBlister}</td>
                <td className="px-3 py-2">{totals.toFollowBottle}</td>
                <td className="px-3 py-2">{totals.toFollowBlister}</td>
                <td className="px-3 py-2">PHP {totals.amount.toLocaleString()}</td>
                <td className="px-3 py-2" />
                <td className="px-3 py-2" />
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <Modal isOpen={isWarningOpen} title="Warning!" onClose={() => setIsWarningOpen(false)}>
        Please input valid date.
      </Modal>
    </section>
  );
}
