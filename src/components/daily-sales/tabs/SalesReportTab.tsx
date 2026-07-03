'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { Modal } from '@/components/ui/Modal';
import {
  getDailySalesNetPrice,
  getDailySalesPackagePrice,
} from '@/lib/dailySalesPackages';
import { openSalesReportPrintWindow } from '@/lib/salesReportPrint';

type PackageRow = {
  label: string;
  qty: number;
  price: number;
  amount?: number;
};

type RetailRow = {
  label: string;
  qty: number;
  price: number;
  amount?: number;
};

type AmountRow = {
  label: string;
  amount: number;
};

type UpgradePackageRow = {
  label: string;
  packageType: string;
  amount: number;
};

type SnapshotData = {
  packageRows: PackageRow[];
  msPackageRows: PackageRow[];
  cdPackageRows: PackageRow[];
  retailRows: RetailRow[];
  msRetailRows: RetailRow[];
  cdRetailRows: RetailRow[];
  paymentBreakdownRows: AmountRow[];
  newAccounts: { silver: number; gold: number; platinum: number };
  upgrades: { silver: number; gold: number; platinum: number };
  upgradePackages: UpgradePackageRow[];
};

type PackageTotalsApiRow = {
  package_type: string;
  total_quantity: number;
  total_bottles: number;
  total_blisters: number;
  total_sales: number;
};

type PaymentSummaryApiRow = {
  mode_of_payment: string;
  total_sales: number;
  transactions: number;
};

type SalesReportApiPayload = {
  success: boolean;
  message?: string;
  packageTotals?: PackageTotalsApiRow[];
  paymentSummary?: PaymentSummaryApiRow[];
  totals?: {
    total_sales: number;
    total_bottles: number;
    total_blisters: number;
    total_transactions: number;
  };
  stockistPackageTotals?: PackageTotalsApiRow[];
  stockistRetailTotals?: PackageTotalsApiRow[];
  centerPackageTotals?: PackageTotalsApiRow[];
  centerRetailTotals?: PackageTotalsApiRow[];
  newAccounts?: { silver: number; gold: number; platinum: number };
  upgrades?: { silver: number; gold: number; platinum: number };
};

type CashOnHandApiRow = {
  pcs_one_thousand?: number | string | null;
  pcs_five_hundred?: number | string | null;
  pcs_two_hundred?: number | string | null;
  pcs_one_hundred?: number | string | null;
  pcs_fifty?: number | string | null;
  pcs_twenty?: number | string | null;
  pcs_ten?: number | string | null;
  pcs_five?: number | string | null;
  pcs_one?: number | string | null;
  pcs_cents?: number | string | null;
} | null;

type CashOnHandApiPayload = {
  success: boolean;
  message?: string;
  row?: CashOnHandApiRow;
  total_cash?: number;
};

type CashFieldId =
  | 'cohOneThousand'
  | 'cohFiveHundred'
  | 'cohTwoHundred'
  | 'cohOneHundred'
  | 'cohFifty'
  | 'cohTwenty'
  | 'cohTen'
  | 'cohFive'
  | 'cohOne'
  | 'cohCents';

const paymentTypeTableIds: Array<{ id: string; title: string; label: string }> = [
  { id: 'tblEwallet', title: 'Ewallet', label: 'E-Wallet' },
  { id: 'tblBank', title: 'Bank', label: 'Bank Transfer - Security Bank' },
  { id: 'tblMayaIgi', title: 'Maya(IGI)', label: 'Maya (IGI)' },
  { id: 'tblMayaAtc', title: 'Maya(ATC)', label: 'Maya (ATC)' },
  { id: 'tblSbCollectIgi', title: 'SbCollect(IGI)', label: 'SB Collect (IGI)' },
  { id: 'tblSbCollectAtc', title: 'SbCollect(ATC)', label: 'SB Collect (ATC)' },
  { id: 'tblArCsa', title: 'AR(CSA)', label: 'Accounts Receivable - CSA' },
  { id: 'tblArLeaderSupport', title: 'AR Leader Support', label: 'Accounts Receivable - Leaders Support' },
  { id: 'tblCreditCard', title: 'Credit Card', label: 'Credit Card' },
  { id: 'tblCheque', title: 'Cheque', label: 'Cheque' },
  { id: 'tblEpoints', title: 'Epoints', label: 'E-Points' },
  { id: 'tblConsignment', title: 'Consignment', label: 'Consignment' },
];

const cashDenominations: Array<{ label: string; id: CashFieldId; spanId: string; multiplier: number }> = [
  { label: '1000.00', id: 'cohOneThousand', spanId: 'spnOneThousand', multiplier: 1000 },
  { label: '500.00', id: 'cohFiveHundred', spanId: 'spnFiveHundred', multiplier: 500 },
  { label: '200.00', id: 'cohTwoHundred', spanId: 'spnTwoHundred', multiplier: 200 },
  { label: '100.00', id: 'cohOneHundred', spanId: 'spnOneHundred', multiplier: 100 },
  { label: '50.00', id: 'cohFifty', spanId: 'spnFifty', multiplier: 50 },
  { label: '20.00', id: 'cohTwenty', spanId: 'spnTwenty', multiplier: 20 },
  { label: '10.00', id: 'cohTen', spanId: 'spnTen', multiplier: 10 },
  { label: '5.00', id: 'cohFive', spanId: 'spnFive', multiplier: 5 },
  { label: '1.00', id: 'cohOne', spanId: 'spnOne', multiplier: 1 },
  { label: '0.25', id: 'cohCents', spanId: 'spnCents', multiplier: 0.25 },
];

const reportDateToday = new Date().toISOString().slice(0, 10);

const defaultSnapshot: SnapshotData = {
  packageRows: [
    { label: 'Mobile Stockist', qty: 0, price: 250000 },
    { label: 'Platinum', qty: 0, price: getDailySalesPackagePrice('PLATINUM') },
    { label: 'Gold', qty: 0, price: getDailySalesPackagePrice('GOLD') },
    { label: 'Silver', qty: 0, price: getDailySalesPackagePrice('SILVER') },
  ],
  msPackageRows: [
    { label: 'Platinum', qty: 0, price: getDailySalesNetPrice('STOCKIST', 'PLATINUM') },
    { label: 'Gold', qty: 0, price: getDailySalesNetPrice('STOCKIST', 'GOLD') },
    { label: 'Silver', qty: 0, price: getDailySalesNetPrice('STOCKIST', 'SILVER') },
  ],
  cdPackageRows: [
    { label: 'Platinum', qty: 0, price: getDailySalesNetPrice('CENTER', 'PLATINUM') },
    { label: 'Gold', qty: 0, price: getDailySalesNetPrice('CENTER', 'GOLD') },
    { label: 'Silver', qty: 0, price: getDailySalesNetPrice('CENTER', 'SILVER') },
  ],
  retailRows: [
    { label: 'SynBIOTIC+ (Bottle)', qty: 0, price: 2280 },
    { label: 'SynBIOTIC+ (Blister)', qty: 0, price: 1299 },
    { label: 'Employees Discount', qty: 0, price: 1200 },
  ],
  msRetailRows: [{ label: 'SynBIOTIC+ (Bottle)', qty: 0, price: 2280 }],
  cdRetailRows: [{ label: 'SynBIOTIC+ (Bottle)', qty: 0, price: 1900 }],
  paymentBreakdownRows: [
    { label: 'Cash on hand', amount: 0 },
    { label: 'E-Wallet', amount: 0 },
    { label: 'Bank Transfer - Security Bank', amount: 0 },
    { label: 'Maya (IGI)', amount: 0 },
    { label: 'Maya (ATC)', amount: 0 },
    { label: 'SB Collect (IGI)', amount: 0 },
    { label: 'SB Collect (ATC)', amount: 0 },
    { label: 'Accounts Receivable - CSA', amount: 0 },
    { label: 'Accounts Receivable - Leaders Support', amount: 0 },
    { label: 'Cheque', amount: 0 },
    { label: 'E-Points', amount: 0 },
    { label: 'Consignment', amount: 0 },
  ],
  newAccounts: { silver: 0, gold: 0, platinum: 0 },
  upgrades: { silver: 0, gold: 0, platinum: 0 },
  upgradePackages: [
    { label: 'USilverGold', packageType: 'USILVERGOLD', amount: 0 },
    { label: 'UGoldPlatinum', packageType: 'UGOLDPLATINUM', amount: 0 },
    { label: 'USilverPlatinum', packageType: 'USILVERPLATINUM', amount: 0 },
  ],
};

const defaultCashPieces: Record<CashFieldId, number> = {
  cohOneThousand: 0,
  cohFiveHundred: 0,
  cohTwoHundred: 0,
  cohOneHundred: 0,
  cohFifty: 0,
  cohTwenty: 0,
  cohTen: 0,
  cohFive: 0,
  cohOne: 0,
  cohCents: 0,
};

const paymentLabelToModes: Record<string, string[]> = {
  'E-Wallet': ['EWALLET', 'E-WALLET'],
  'Bank Transfer - Security Bank': ['BANK'],
  'Maya (IGI)': ['MAYA(IGI)'],
  'Maya (ATC)': ['MAYA(ATC)'],
  'SB Collect (IGI)': ['SBCOLLECT(IGI)', 'SBCOLLECT (IGI)'],
  'SB Collect (ATC)': ['SBCOLLECT(ATC)', 'SBCOLLECT (ATC)'],
  'Accounts Receivable - CSA': ['AR(CSA)'],
  'Accounts Receivable - Leaders Support': ['AR(LEADERSUPPORT)', 'AR LEADER SUPPORT'],
  Cheque: ['CHEQUE'],
  'E-Points': ['EPOINTS', 'E-POINTS'],
  Consignment: ['CONSIGNMENT'],
};

const paymentTitleToModes: Record<string, string[]> = {
  EWALLET: ['EWALLET', 'E-WALLET'],
  BANK: ['BANK'],
  'MAYA(IGI)': ['MAYA(IGI)'],
  'MAYA(ATC)': ['MAYA(ATC)'],
  'SBCOLLECT(IGI)': ['SBCOLLECT(IGI)', 'SBCOLLECT (IGI)'],
  'SBCOLLECT(ATC)': ['SBCOLLECT(ATC)', 'SBCOLLECT (ATC)'],
  'AR(CSA)': ['AR(CSA)'],
  'AR LEADER SUPPORT': ['AR(LEADERSUPPORT)', 'AR LEADER SUPPORT'],
  'CREDIT CARD': ['CREDIT CARD'],
  CHEQUE: ['CHEQUE'],
  EPOINTS: ['EPOINTS', 'E-POINTS'],
  CONSIGNMENT: ['CONSIGNMENT'],
};

const normalizeKey = (value: string) => value.trim().toUpperCase();
const CASH_MODES = ['CASH'];

const sumForModes = (
  paymentTotals: Map<string, number>,
  modes: string[],
) => modes.reduce((sum, mode) => sum + (paymentTotals.get(normalizeKey(mode)) ?? 0), 0);

const toNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
};

const sumCashRowPieces = (row: CashOnHandApiRow) =>
  toNumber(row?.pcs_one_thousand) +
  toNumber(row?.pcs_five_hundred) +
  toNumber(row?.pcs_two_hundred) +
  toNumber(row?.pcs_one_hundred) +
  toNumber(row?.pcs_fifty) +
  toNumber(row?.pcs_twenty) +
  toNumber(row?.pcs_ten) +
  toNumber(row?.pcs_five) +
  toNumber(row?.pcs_one) +
  toNumber(row?.pcs_cents);

const formatDateDMYY = (value: string) => {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const day = String(parsed.getDate()).padStart(2, '0');
  const month = parsed.toLocaleString('en-US', { month: 'short' });
  const year = String(parsed.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
};

const formatAmount = (value: number) =>
  value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const sortByLabelAscending = <T extends { label: string }>(rows: T[]) =>
  [...rows].sort((left, right) => left.label.localeCompare(right.label));

function PackageTable({
  id,
  title,
  rows,
  totalLabel,
  includeGrandTotal = false,
}: {
  id: string;
  title: string;
  rows: PackageRow[];
  totalLabel: string;
  includeGrandTotal?: boolean;
}) {
  const sortedRows = sortByLabelAscending(rows);
  const rowAmounts = sortedRows.map((row) => row.amount ?? row.qty * row.price);
  const total = rowAmounts.reduce((sum, amount) => sum + amount, 0);

  return (
    <div className="app-table-scroll overflow-hidden rounded-md border border-border">
      <table id={id} className="min-w-full border-collapse text-xs">
        <thead className="bg-muted/50 text-left text-[10px] uppercase text-muted-foreground">
          <tr>
            <th className="border-b border-border px-2 py-1.5 font-medium">{title}</th>
            <th className="border-b border-border px-2 py-1.5 font-medium">QTY</th>
            <th className="border-b border-border px-2 py-1.5 font-medium">PRICE</th>
            <th className="border-b border-border px-2 py-1.5 font-medium">AMOUNT TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, index) => (
            <tr key={`${id}-${row.label}`} className="border-b border-border last:border-0">
              <td className="px-2 py-1.5">{row.label}</td>
              <td className="px-2 py-1.5 tabular-nums">{row.qty}</td>
              <td className="px-2 py-1.5 tabular-nums">{formatAmount(row.price)}</td>
              <td className="px-2 py-1.5 tabular-nums">{formatAmount(rowAmounts[index])}</td>
            </tr>
          ))}
          <tr className="border-t border-border bg-muted/30 font-semibold">
            <td className="px-2 py-1.5" colSpan={3}>
              {totalLabel}
            </td>
            <td className="px-2 py-1.5 tabular-nums">{formatAmount(total)}</td>
          </tr>
          {includeGrandTotal ? (
            <tr className="border-t border-border bg-muted/30 font-semibold">
              <td className="px-2 py-1.5 text-center" colSpan={3}>
                GRAND TOTAL
              </td>
              <td className="px-2 py-1.5 tabular-nums">{formatAmount(total)}</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function PaymentTable({ id, title, rows }: { id: string; title: string; rows: AmountRow[] }) {
  const sortedRows = sortByLabelAscending(rows);
  const total = sortedRows.reduce((sum, row) => sum + row.amount, 0);

  return (
    <div className="app-table-scroll overflow-hidden rounded-md border border-border">
      <table id={id} className="min-w-full border-collapse text-xs">
        <thead className="bg-muted/50 text-left text-[10px] uppercase text-muted-foreground">
          <tr>
            <th className="border-b border-border px-2 py-1.5 font-medium" colSpan={2}>
              {title}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => (
            <tr key={`${id}-${row.label}`} className="border-b border-border last:border-0">
              <td className="px-2 py-1.5">{row.label}</td>
              <td className="px-2 py-1.5 tabular-nums">{formatAmount(row.amount)}</td>
            </tr>
          ))}
          <tr className="border-t border-border bg-muted/30 font-semibold">
            <td className="px-2 py-1.5 text-center">TOTAL</td>
            <td className="px-2 py-1.5 tabular-nums">{formatAmount(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function SalesReportTab() {
  const [transDateDailySales, setTransDateDailySales] = useState(reportDateToday);
  const [selectedDate, setSelectedDate] = useState(reportDateToday);
  const [snapshot, setSnapshot] = useState<SnapshotData>(defaultSnapshot);
  const [cashPieces, setCashPieces] = useState<Record<CashFieldId, number>>(defaultCashPieces);
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [isActionNoticeOpen, setIsActionNoticeOpen] = useState(false);
  const [actionNotice, setActionNotice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingCashOnHand, setIsSavingCashOnHand] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [hasGenerated, setHasGenerated] = useState(false);
  const [loadedFromBackend, setLoadedFromBackend] = useState(false);
  const [packageTotals, setPackageTotals] = useState<PackageTotalsApiRow[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummaryApiRow[]>([]);
  const [totalCashFromBackend, setTotalCashFromBackend] = useState<number | null>(null);

  const dateCaption = `${formatDateDMYY(selectedDate)}`;

  const cashAmounts = useMemo(
    () =>
      cashDenominations.reduce(
        (acc, entry) => ({
          ...acc,
          [entry.id]: cashPieces[entry.id] * entry.multiplier,
        }),
        {} as Record<CashFieldId, number>
      ),
    [cashPieces]
  );

  const totalCashOnHand = useMemo(
    () => Object.values(cashAmounts).reduce((sum, value) => sum + value, 0),
    [cashAmounts]
  );
  const hasCashPieces = useMemo(
    () => Object.values(cashPieces).some((value) => value > 0),
    [cashPieces]
  );
  const displayedTotalCash = hasCashPieces ? totalCashOnHand : (totalCashFromBackend ?? totalCashOnHand);

  const paymentTypeRows = useMemo(
    () => {
      const paymentTotals = new Map<string, number>();
      for (const row of paymentSummary) {
        const key = normalizeKey(row.mode_of_payment);
        paymentTotals.set(key, (paymentTotals.get(key) ?? 0) + toNumber(row.total_sales));
      }

      return [...paymentTypeTableIds]
        .sort((left, right) => left.title.localeCompare(right.title))
        .map((item) => ({
        id: item.id,
        title: item.title,
        rows: [
          {
            label: item.label,
            amount: sumForModes(
              paymentTotals,
              paymentTitleToModes[normalizeKey(item.title)] ?? []
            ),
          },
        ],
      }));
    },
    [paymentSummary]
  );

  const onGenerateDailySales = async () => {
    if (!transDateDailySales) {
      setIsWarningOpen(true);
      return;
    }

    setSelectedDate(transDateDailySales);
    setErrorMessage('');
    setIsLoading(true);
    setHasGenerated(true);

    try {
      const params = new URLSearchParams({ transDate: transDateDailySales });
      const [salesResponse, cashResponse] = await Promise.all([
        fetch(`/api/daily-sales/sales-report?${params.toString()}`),
        fetch(`/api/cash-on-hand/get?${params.toString()}`),
      ]);

      const salesPayload = (await salesResponse.json()) as SalesReportApiPayload;
      const cashPayload = (await cashResponse.json()) as CashOnHandApiPayload;

      if (!salesResponse.ok || !salesPayload.success) {
        throw new Error(salesPayload.message ?? 'Failed to load sales report');
      }

      if (!cashResponse.ok || !cashPayload.success) {
        throw new Error(cashPayload.message ?? 'Failed to load cash on hand');
      }

      const packageMap = new Map(
        (salesPayload.packageTotals ?? []).map((row) => [normalizeKey(row.package_type), row]),
      );
      const stockistPackageMap = new Map(
        (salesPayload.stockistPackageTotals ?? []).map((row) => [normalizeKey(row.package_type), row]),
      );
      const stockistRetailMap = new Map(
        (salesPayload.stockistRetailTotals ?? []).map((row) => [normalizeKey(row.package_type), row]),
      );
      const centerPackageMap = new Map(
        (salesPayload.centerPackageTotals ?? []).map((row) => [normalizeKey(row.package_type), row]),
      );
      const centerRetailMap = new Map(
        (salesPayload.centerRetailTotals ?? []).map((row) => [normalizeKey(row.package_type), row]),
      );

      const packageRows: PackageRow[] = defaultSnapshot.packageRows.map((row) => {
        if (row.label === 'Mobile Stockist') {
          const mobile = packageMap.get('MOBILE STOCKIST');
          const qty = mobile?.total_quantity ?? 0;
          const amount = mobile?.total_sales ?? 0;
          return {
            ...row,
            qty,
            price: qty > 0 ? amount / qty : row.price,
            amount,
          };
        }

        const totals = packageMap.get(normalizeKey(row.label));
        const qty = totals?.total_quantity ?? 0;
        const amount = totals?.total_sales ?? 0;
        return {
          ...row,
          qty,
          price: qty > 0 ? amount / qty : row.price,
          amount,
        };
      });
      const msPackageRows: PackageRow[] = defaultSnapshot.msPackageRows.map((row) => {
        const totals = stockistPackageMap.get(normalizeKey(row.label));
        const qty = totals?.total_quantity ?? 0;
        const amount = totals?.total_sales ?? 0;
        return {
          ...row,
          qty,
          price: qty > 0 ? amount / qty : row.price,
          amount,
        };
      });
      const cdPackageRows: PackageRow[] = defaultSnapshot.cdPackageRows.map((row) => {
        const totals = centerPackageMap.get(normalizeKey(row.label));
        const qty = totals?.total_quantity ?? 0;
        const amount = totals?.total_sales ?? 0;
        return {
          ...row,
          qty,
          price: qty > 0 ? amount / qty : row.price,
          amount,
        };
      });

      const retailBottle = packageMap.get('RETAIL');
      const retailBlister = packageMap.get('BLISTER');
      const retailRows: RetailRow[] = defaultSnapshot.retailRows.map((row) => {
        if (row.label === 'SynBIOTIC+ (Bottle)') {
          const qty = retailBottle?.total_bottles ?? 0;
          const amount = retailBottle?.total_sales ?? 0;
          return {
            ...row,
            qty,
            price: qty > 0 ? amount / qty : row.price,
            amount,
          };
        }

        if (row.label === 'SynBIOTIC+ (Blister)') {
          const qty = retailBlister?.total_blisters ?? 0;
          const amount = retailBlister?.total_sales ?? 0;
          return {
            ...row,
            qty,
            price: qty > 0 ? amount / qty : row.price,
            amount,
          };
        }

        return { ...row, qty: 0, amount: 0 };
      });
      const msRetailRows: RetailRow[] = defaultSnapshot.msRetailRows.map((row) => {
        const totals = stockistRetailMap.get('RETAIL');
        const qty = totals?.total_bottles ?? 0;
        const amount = totals?.total_sales ?? 0;
        return {
          ...row,
          qty,
          price: qty > 0 ? amount / qty : row.price,
          amount,
        };
      });
      const cdRetailRows: RetailRow[] = defaultSnapshot.cdRetailRows.map((row) => {
        const totals = centerRetailMap.get('RETAIL');
        const qty = totals?.total_bottles ?? 0;
        const amount = totals?.total_sales ?? 0;
        return {
          ...row,
          qty,
          price: qty > 0 ? amount / qty : row.price,
          amount,
        };
      });

      const paymentTotals = new Map<string, number>();
      const backendPaymentSummary = salesPayload.paymentSummary ?? [];
      for (const row of backendPaymentSummary) {
        const key = normalizeKey(row.mode_of_payment);
        paymentTotals.set(key, (paymentTotals.get(key) ?? 0) + toNumber(row.total_sales));
      }

      const cashSalesAmount = sumForModes(paymentTotals, CASH_MODES);
      const hasCashSales = cashSalesAmount > 0;
      const savedCashPiecesCount = sumCashRowPieces(cashPayload.row ?? null);
      const hasCashOnHandRow = Boolean(cashPayload.row) && savedCashPiecesCount > 0;
      const effectiveCashOnHandTotal = hasCashSales
        ? (hasCashOnHandRow ? toNumber(cashPayload.total_cash ?? 0) : cashSalesAmount)
        : 0;

      const paymentBreakdownRows: AmountRow[] = defaultSnapshot.paymentBreakdownRows.map((row) => {
        if (row.label === 'Cash on hand') {
          return { ...row, amount: effectiveCashOnHandTotal };
        }

        const modes = paymentLabelToModes[row.label];
        if (!modes) {
          return { ...row, amount: 0 };
        }

        return { ...row, amount: sumForModes(paymentTotals, modes) };
      });

      const cashRow = cashPayload.row;
      const mappedCashPieces: Record<CashFieldId, number> = hasCashSales
        ? {
            cohOneThousand: toNumber(cashRow?.pcs_one_thousand),
            cohFiveHundred: toNumber(cashRow?.pcs_five_hundred),
            cohTwoHundred: toNumber(cashRow?.pcs_two_hundred),
            cohOneHundred: toNumber(cashRow?.pcs_one_hundred),
            cohFifty: toNumber(cashRow?.pcs_fifty),
            cohTwenty: toNumber(cashRow?.pcs_twenty),
            cohTen: toNumber(cashRow?.pcs_ten),
            cohFive: toNumber(cashRow?.pcs_five),
            cohOne: toNumber(cashRow?.pcs_one),
            cohCents: toNumber(cashRow?.pcs_cents),
          }
        : defaultCashPieces;

      setSnapshot((prev) => ({
        ...prev,
        packageRows,
        msPackageRows,
        cdPackageRows,
        retailRows,
        msRetailRows,
        cdRetailRows,
        paymentBreakdownRows,
        newAccounts: salesPayload.newAccounts ?? defaultSnapshot.newAccounts,
        upgrades: salesPayload.upgrades ?? defaultSnapshot.upgrades,
        upgradePackages: defaultSnapshot.upgradePackages.map((row) => {
          const totals = packageMap.get(row.packageType);
          return { ...row, amount: totals?.total_sales ?? 0 };
        }),
      }));
      setPackageTotals(salesPayload.packageTotals ?? []);
      setPaymentSummary(backendPaymentSummary);
      setCashPieces(mappedCashPieces);
      setTotalCashFromBackend(effectiveCashOnHandTotal);
      setLoadedFromBackend(true);
    } catch {
      setSnapshot(defaultSnapshot);
      setPackageTotals([]);
      setPaymentSummary([]);
      setCashPieces(defaultCashPieces);
      setTotalCashFromBackend(null);
      setErrorMessage('Backend error... showing fallback');
      setLoadedFromBackend(false);
    } finally {
      setIsLoading(false);
    }
  };

  const onCashPieceChange = (id: CashFieldId, value: string) => {
    const parsed = Number(value);
    setCashPieces((prev) => ({
      ...prev,
      [id]: Number.isFinite(parsed) ? Math.max(parsed, 0) : 0,
    }));
  };

  const onSaveCashOnHand = async () => {
    if (!selectedDate) {
      setIsWarningOpen(true);
      return;
    }

    setIsSavingCashOnHand(true);

    try {
      const response = await fetch('/api/cash-on-hand/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transDate: selectedDate,
          trans_date: selectedDate,
          pcs_one_thousand: cashPieces.cohOneThousand,
          pcs_five_hundred: cashPieces.cohFiveHundred,
          pcs_two_hundred: cashPieces.cohTwoHundred,
          pcs_one_hundred: cashPieces.cohOneHundred,
          pcs_fifty: cashPieces.cohFifty,
          pcs_twenty: cashPieces.cohTwenty,
          pcs_ten: cashPieces.cohTen,
          pcs_five: cashPieces.cohFive,
          pcs_one: cashPieces.cohOne,
          pcs_cents: cashPieces.cohCents,
        }),
      });

      const payload = (await response.json()) as { success?: boolean; message?: string };

      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? 'Failed to save cash on hand.');
      }

      setTotalCashFromBackend(totalCashOnHand);
      setActionNotice(`Cash on hand saved for ${selectedDate}.`);
      setIsActionNoticeOpen(true);
    } catch (error) {
      setActionNotice(error instanceof Error ? error.message : 'Failed to save cash on hand.');
      setIsActionNoticeOpen(true);
    } finally {
      setIsSavingCashOnHand(false);
    }
  };

  const onUpsertCashOnHand = () => {
    const cashRows = cashDenominations.map((entry) => ({
      label: entry.label,
      pieces: cashPieces[entry.id],
      amount: cashAmounts[entry.id],
    }));

    openSalesReportPrintWindow({
      dateCaption,
      snapshot: {
        ...snapshot,
        paymentBreakdownRows: snapshot.paymentBreakdownRows,
      },
      cashRows,
      totalCash: displayedTotalCash,
      paymentTypeRows,
    });
  };

  return (
    <>
      <section id="daily-sales" className="mt-4 space-y-4">
        <Card className="p-3">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto_1fr] lg:items-end">
            <div className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              <label htmlFor="transDateDailySales">DATE</label>
              <DatePicker
                id="transDateDailySales"
                value={transDateDailySales}
                onChange={setTransDateDailySales}
                placeholder="Pick a date"
              />
            </div>
            <Button
              id="generateDailySales"
              className="w-full lg:w-auto"
              onClick={onGenerateDailySales}
              disabled={isLoading}
            >
              {isLoading ? 'Generating...' : 'Generate Report'}
            </Button>
            <Button
              id="saveCashOnHand"
              variant="outline"
              className="w-full lg:w-auto"
              onClick={onSaveCashOnHand}
              disabled={isSavingCashOnHand || isLoading}
            >
              {isSavingCashOnHand ? 'Saving...' : 'Save Cash on Hand'}
            </Button>
            <Button
              id="upsertCashOnHand"
              variant="outline"
              className="w-full lg:w-auto"
              onClick={onUpsertCashOnHand}
            >
              Print
            </Button>
            <div className="flex items-center text-sm text-muted-foreground lg:justify-end">
              <span id="spnTransDateDailySales">{dateCaption}</span>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div id="cntnrDailySales" className="space-y-4">
            <div className="text-center text-sm font-semibold text-foreground">
              <p>Innovision Grand International</p>
              <p>Daily Sales Report</p>
              <p id="spnTransDate" className="font-normal">
                {dateCaption}
              </p>
            </div>
            {errorMessage ? <p className="text-xs text-amber-500">{errorMessage}</p> : null}
            {!isLoading && hasGenerated && loadedFromBackend && packageTotals.length === 0 ? (
              <p className="text-xs text-muted-foreground">No sales entries for selected date.</p>
            ) : null}

            <div className="grid gap-3 xl:grid-cols-[1fr_1fr]">
              <div className="space-y-3">
                <PackageTable id="tblPackage" title="PACKAGE" rows={snapshot.packageRows} totalLabel="Total Package Sales" />
                <PackageTable
                  id="tblMsPackage"
                  title="MOBILE STOCKIST PACKAGE"
                  rows={snapshot.msPackageRows}
                  totalLabel="Total Mobile Stockist Package Sales"
                />
                <PackageTable id="tblCdPackage" title="PACKAGE" rows={snapshot.cdPackageRows} totalLabel="Total Depot Package Sales" />
                <PackageTable id="tblRetail" title="RETAIL" rows={snapshot.retailRows} totalLabel="Total Retail Sales" includeGrandTotal />
                <PackageTable
                  id="tblMsRetail"
                  title="MOBILE STOCKIST RETAIL"
                  rows={snapshot.msRetailRows}
                  totalLabel="Total Depot Retail Sales"
                  includeGrandTotal
                />
                <PackageTable id="tblCdRetail" title="RETAIL" rows={snapshot.cdRetailRows} totalLabel="Total Depot Retail Sales" />
              </div>

              <div className="space-y-3">
                <div className="app-table-scroll overflow-hidden rounded-md border border-border">
                  <table id="tblCashOnHand" className="min-w-full border-collapse text-xs">
                    <thead className="bg-muted/50 text-left text-[10px] uppercase text-muted-foreground">
                      <tr>
                        <th className="border-b border-border px-2 py-1.5 font-medium">Cash on Hand</th>
                        <th className="border-b border-border px-2 py-1.5 font-medium">Pieces</th>
                        <th className="border-b border-border px-2 py-1.5 font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cashDenominations.map((entry) => (
                        <tr key={entry.id} className="border-b border-border last:border-0">
                          <td className="px-2 py-1.5">{entry.label}</td>
                          <td className="px-2 py-1.5">
                            <input
                              id={entry.id}
                              type="number"
                              min="0"
                              value={cashPieces[entry.id]}
                              onChange={(event) => onCashPieceChange(entry.id, event.target.value)}
                              className="h-7 w-20 rounded border border-input bg-background px-2 text-foreground"
                            />
                          </td>
                          <td className="px-2 py-1.5 tabular-nums">
                            <span id={entry.spanId}>{formatAmount(cashAmounts[entry.id])}</span>
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t border-border bg-muted/30 font-semibold">
                        <td className="px-2 py-1.5 text-center" colSpan={2}>
                          TOTAL CASH ON HAND
                        </td>
                        <td className="px-2 py-1.5 tabular-nums">
                          <span id="spnTotal">{formatAmount(displayedTotalCash)}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <PaymentTable id="tblPaymentBreakdown" title="PAYMENT BREAKDOWN" rows={snapshot.paymentBreakdownRows} />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="app-table-scroll overflow-hidden rounded-md border border-border">
                <table id="tblNewAccounts" className="min-w-full border-collapse text-xs">
                  <thead className="bg-muted/50 text-left text-[10px] uppercase text-muted-foreground">
                    <tr>
                      <th className="border-b border-border px-2 py-1.5 font-medium" colSpan={3}>
                        New Accounts
                      </th>
                    </tr>
                    <tr>
                      <th className="border-b border-border px-2 py-1.5 font-medium">Silver</th>
                      <th className="border-b border-border px-2 py-1.5 font-medium">Gold</th>
                      <th className="border-b border-border px-2 py-1.5 font-medium">Platinum</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-2 py-1.5 tabular-nums">{snapshot.newAccounts.silver}</td>
                      <td className="px-2 py-1.5 tabular-nums">{snapshot.newAccounts.gold}</td>
                      <td className="px-2 py-1.5 tabular-nums">{snapshot.newAccounts.platinum}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="app-table-scroll overflow-hidden rounded-md border border-border">
                <table id="tblUpgrades" className="min-w-full border-collapse text-xs">
                  <thead className="bg-muted/50 text-left text-[10px] uppercase text-muted-foreground">
                    <tr>
                      <th className="border-b border-border px-2 py-1.5 font-medium" colSpan={3}>
                        Upgrades
                      </th>
                    </tr>
                    <tr>
                      <th className="border-b border-border px-2 py-1.5 font-medium">Silver</th>
                      <th className="border-b border-border px-2 py-1.5 font-medium">Gold</th>
                      <th className="border-b border-border px-2 py-1.5 font-medium">Platinum</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-2 py-1.5 tabular-nums">{snapshot.upgrades.silver}</td>
                      <td className="px-2 py-1.5 tabular-nums">{snapshot.upgrades.gold}</td>
                      <td className="px-2 py-1.5 tabular-nums">{snapshot.upgrades.platinum}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {paymentTypeRows.map((table) => (
                <PaymentTable key={table.id} id={table.id} title={table.title} rows={table.rows} />
              ))}
              {snapshot.upgradePackages.map((row) => (
                <PaymentTable
                  key={row.packageType}
                  id={`tbl${row.packageType}`}
                  title={row.label}
                  rows={[{ label: row.label, amount: row.amount }]}
                />
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3 pt-2 text-center text-xs text-muted-foreground md:grid-cols-3">
              <div>
                <p>PREPARED BY:</p>
                <p id="txtPreparedBy" className="font-semibold">
                  Alaiza Jane Emoylan
                </p>
              </div>
              <div>
                <p>PREPARED BY:</p>
                <p className="font-semibold">Mary Grace Damasin</p>
              </div>
              <div>
                <p>CHECKED BY:</p>
                <p id="txtCheckedBy" className="font-semibold">
                  Erica Villaester
                </p>
              </div>
            </div>
          </div>
        </Card>
      </section>

      <Modal isOpen={isWarningOpen} title="Warning!" onClose={() => setIsWarningOpen(false)}>
        Please input valid date.
      </Modal>
      <Modal isOpen={isActionNoticeOpen} title="Info" onClose={() => setIsActionNoticeOpen(false)}>
        {actionNotice}
      </Modal>
    </>
  );
}
