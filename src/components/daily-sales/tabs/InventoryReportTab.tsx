'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { inventoryRows } from '@/lib/mock/dailySales';

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

const mapToReportRow = (
  row: (typeof inventoryRows)[number]
): InventoryReportRow => {
  const seq = row.id.replace('inv-', '');
  const ggTransNo = `GG-24${seq}`;
  const pofNumber = `POF-${row.date.replace(/-/g, '').slice(2)}-${seq}`;
  const upperItem = row.item.toUpperCase();
  const isBlister = upperItem.includes('BLISTER');
  const isRetail = upperItem.includes('RETAIL');

  return {
    id: row.id,
    date: row.date,
    name: row.item,
    ggTransNo,
    pofNumber,
    platinum: upperItem.includes('PLATINUM') ? row.sold : 0,
    gold: upperItem.includes('GOLD') ? row.sold : 0,
    silver: upperItem.includes('SILVER') ? row.sold : 0,
    synbioticBottle: isRetail ? row.sold : 0,
    synbioticBlister: isBlister ? row.sold : 0,
    voucher: 0,
    employeeDiscount: 0,
    numberOfBottles: row.sold,
    numberOfBlisters: isBlister ? row.sold : 0,
    releasedBottle: row.sold,
    releasedBlister: isBlister ? row.sold : 0,
    toFollowBottle: 0,
    toFollowBlister: 0,
    amount: row.sold * (isBlister ? 400 : 3500),
    modeOfPayment: 'CASH',
  };
};

const mapApiRowToReportRow = (
  row: DailyInventoryApiRow,
  index: number,
): InventoryReportRow => {
  const upperPackageType = row.package_type.toUpperCase();
  const isBlister = upperPackageType.includes('BLISTER');
  const isRetail = upperPackageType.includes('RETAIL');
  const amountMultiplier = isBlister ? 400 : 3500;

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
  const defaultInventoryDate = inventoryRows[inventoryRows.length - 1]?.date ?? new Date().toISOString().slice(0, 10);
  const [pendingFromDate, setPendingFromDate] = useState('');
  const [pendingToDate, setPendingToDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState(defaultInventoryDate);
  const [toDate, setToDate] = useState(defaultInventoryDate);
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [rows, setRows] = useState<InventoryReportRow[] | null>(null);
  const [lastLoadedFromBackend, setLastLoadedFromBackend] = useState(false);
  const [displayDateRange, setDisplayDateRange] = useState(
    `${formatDateDMYY(defaultInventoryDate)} To ${formatDateDMYY(defaultInventoryDate)}`
  );

  const getMockRowsInRange = (dateFrom: string, dateTo: string) =>
    inventoryRows
      .filter((row) => {
        if (dateFrom && row.date < dateFrom) {
          return false;
        }

        if (dateTo && row.date > dateTo) {
          return false;
        }

        return true;
      })
      .map((row) => mapToReportRow(row));

  const filteredMockRows = useMemo(() => {
    return inventoryRows
      .filter((row) => {
        if (fromDate && row.date < fromDate) {
          return false;
        }

        if (toDate && row.date > toDate) {
          return false;
        }

        return true;
      })
      .map((row) => mapToReportRow(row));
  }, [fromDate, toDate]);

  const displayedRows = rows ?? filteredMockRows;

  const onGenerate = async () => {
    if (!pendingFromDate || !pendingToDate) {
      setIsWarningOpen(true);
      return;
    }

    setFromDate(pendingFromDate);
    setToDate(pendingToDate);
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
      setLastLoadedFromBackend(true);
    } catch {
      setRows(getMockRowsInRange(pendingFromDate, pendingToDate));
      setErrorMessage('Backend error... showing fallback');
      setLastLoadedFromBackend(false);
    } finally {
      setIsLoading(false);
    }
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

      <Card className="p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <span id="spnTransDate" className="text-sm text-slate-700">
            {displayDateRange}
          </span>
          <Button id="printDailyInventory" size="sm" variant="secondary">
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
              {displayedRows.length === 0 ? (
                <tr>
                  <td colSpan={18} className="px-3 py-6 text-center text-slate-500">
                    {lastLoadedFromBackend
                      ? 'No inventory results for selected range'
                      : 'No inventory rows found for the selected filters.'}
                  </td>
                </tr>
              ) : (
                displayedRows.map((row) => (
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
