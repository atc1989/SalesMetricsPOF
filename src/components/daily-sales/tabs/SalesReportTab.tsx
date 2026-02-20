'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';

type PackageRow = {
  label: string;
  qty: number;
  price: number;
};

type RetailRow = {
  label: string;
  qty: number;
  price: number;
};

type AmountRow = {
  label: string;
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
    { label: 'Platinum', qty: 0, price: 35000 },
    { label: 'Gold', qty: 0, price: 10500 },
    { label: 'Silver', qty: 0, price: 3500 },
  ],
  msPackageRows: [
    { label: 'Platinum', qty: 0, price: 34500 },
    { label: 'Gold', qty: 0, price: 10350 },
    { label: 'Silver', qty: 0, price: 3450 },
  ],
  cdPackageRows: [
    { label: 'Platinum', qty: 0, price: 34200 },
    { label: 'Gold', qty: 0, price: 10260 },
    { label: 'Silver', qty: 0, price: 3420 },
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
  ],
  newAccounts: { silver: 0, gold: 0, platinum: 0 },
  upgrades: { silver: 0, gold: 0, platinum: 0 },
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
  const rowAmounts = rows.map((row) => row.qty * row.price);
  const total = rowAmounts.reduce((sum, amount) => sum + amount, 0);

  return (
    <Card className="p-0">
      <table id={id} className="min-w-full text-xs">
        <thead className="bg-slate-50 text-left text-[10px] uppercase text-slate-700">
          <tr>
            <th className="border border-slate-300 px-2 py-1">{title}</th>
            <th className="border border-slate-300 px-2 py-1">QTY</th>
            <th className="border border-slate-300 px-2 py-1">PRICE</th>
            <th className="border border-slate-300 px-2 py-1">AMOUNT TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${id}-${row.label}`}>
              <td className="border border-slate-300 px-2 py-1">{row.label}</td>
              <td className="border border-slate-300 px-2 py-1">{row.qty}</td>
              <td className="border border-slate-300 px-2 py-1">{formatAmount(row.price)}</td>
              <td className="border border-slate-300 px-2 py-1">{formatAmount(rowAmounts[index])}</td>
            </tr>
          ))}
          <tr className="font-semibold">
            <td className="border border-slate-300 px-2 py-1" colSpan={3}>
              {totalLabel}
            </td>
            <td className="border border-slate-300 px-2 py-1">{formatAmount(total)}</td>
          </tr>
          {includeGrandTotal ? (
            <tr className="font-semibold">
              <td className="border border-slate-300 px-2 py-1 text-center" colSpan={3}>
                GRAND TOTAL
              </td>
              <td className="border border-slate-300 px-2 py-1">{formatAmount(total)}</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </Card>
  );
}

function PaymentTable({ id, title, rows }: { id: string; title: string; rows: AmountRow[] }) {
  const total = rows.reduce((sum, row) => sum + row.amount, 0);

  return (
    <Card className="p-0">
      <table id={id} className="min-w-full text-xs">
        <thead className="bg-slate-50 text-left text-[10px] uppercase text-slate-700">
          <tr>
            <th className="border border-slate-300 px-2 py-1" colSpan={2}>
              {title}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${id}-${row.label}`}>
              <td className="border border-slate-300 px-2 py-1">{row.label}</td>
              <td className="border border-slate-300 px-2 py-1">{formatAmount(row.amount)}</td>
            </tr>
          ))}
          <tr className="font-semibold">
            <td className="border border-slate-300 px-2 py-1 text-center">TOTAL</td>
            <td className="border border-slate-300 px-2 py-1">{formatAmount(total)}</td>
          </tr>
        </tbody>
      </table>
    </Card>
  );
}

export function SalesReportTab() {
  const [transDateDailySales, setTransDateDailySales] = useState(reportDateToday);
  const [selectedDate, setSelectedDate] = useState(reportDateToday);
  const [snapshot, setSnapshot] = useState<SnapshotData>(defaultSnapshot);
  const [cashPieces, setCashPieces] = useState<Record<CashFieldId, number>>(defaultCashPieces);
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);

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

  const paymentTypeRows = useMemo(
    () =>
      paymentTypeTableIds.map((item) => ({
        id: item.id,
        title: item.title,
        rows: [{ label: item.label, amount: 0 }],
      })),
    []
  );

  const getDailySalesPackageRetail = (transDate: string) => {
    setSelectedDate(transDate);
    setSnapshot(defaultSnapshot);
  };

  const onGenerateDailySales = () => {
    if (!transDateDailySales) {
      setIsWarningOpen(true);
      return;
    }

    getDailySalesPackageRetail(transDateDailySales);
  };

  const onCashPieceChange = (id: CashFieldId, value: string) => {
    const parsed = Number(value);
    setCashPieces((prev) => ({
      ...prev,
      [id]: Number.isFinite(parsed) ? Math.max(parsed, 0) : 0,
    }));
  };

  const onUpsertCashOnHand = () => {
    setIsPrintOpen(true);
  };

  return (
    <>
      <section id="daily-sales" className="mt-4 space-y-4">
        <Card className="p-3">
          <div className="grid gap-2 md:grid-cols-4">
            <label className="flex flex-col text-xs font-medium text-slate-700">
              DATE
              <input
                id="transDateDailySales"
                type="date"
                value={transDateDailySales}
                onChange={(event) => setTransDateDailySales(event.target.value)}
                className="mt-1 rounded border border-slate-300 px-2 py-1 text-sm"
              />
            </label>
            <div className="flex items-end">
              <Button id="generateDailySales" variant="secondary" className="w-full md:w-auto" onClick={onGenerateDailySales}>
                Generate Report
              </Button>
            </div>
            <div className="flex items-end">
              <Button id="upsertCashOnHand" className="w-full md:w-auto" onClick={onUpsertCashOnHand}>
                Print
              </Button>
            </div>
            <div className="flex items-end text-sm text-slate-700">
              <span id="spnTransDateDailySales">{dateCaption}</span>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div id="cntnrDailySales" className="space-y-4">
            <div className="text-center text-sm font-semibold text-slate-900">
              <p>Innovision Grand International</p>
              <p>Daily Sales Report</p>
              <p id="spnTransDate" className="font-normal">
                {dateCaption}
              </p>
            </div>

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
                <Card className="p-0">
                  <table id="tblCashOnHand" className="min-w-full text-xs">
                    <thead className="bg-slate-50 text-left text-[10px] uppercase text-slate-700">
                      <tr>
                        <th className="border border-slate-300 px-2 py-1">Cash on Hand</th>
                        <th className="border border-slate-300 px-2 py-1">Pieces</th>
                        <th className="border border-slate-300 px-2 py-1">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cashDenominations.map((entry) => (
                        <tr key={entry.id}>
                          <td className="border border-slate-300 px-2 py-1">{entry.label}</td>
                          <td className="border border-slate-300 px-2 py-1">
                            <input
                              id={entry.id}
                              type="number"
                              min="0"
                              value={cashPieces[entry.id]}
                              onChange={(event) => onCashPieceChange(entry.id, event.target.value)}
                              className="h-7 w-20 rounded border border-slate-300 px-2"
                            />
                          </td>
                          <td className="border border-slate-300 px-2 py-1">
                            <span id={entry.spanId}>{formatAmount(cashAmounts[entry.id])}</span>
                          </td>
                        </tr>
                      ))}
                      <tr className="font-semibold">
                        <td className="border border-slate-300 px-2 py-1 text-center" colSpan={2}>
                          TOTAL CASH ON HAND
                        </td>
                        <td className="border border-slate-300 px-2 py-1">
                          <span id="spnTotal">{formatAmount(totalCashOnHand)}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </Card>

                <PaymentTable id="tblPaymentBreakdown" title="PAYMENT BREAKDOWN" rows={snapshot.paymentBreakdownRows} />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Card className="p-0">
                <table id="tblNewAccounts" className="min-w-full text-xs">
                  <thead className="bg-slate-50 text-left text-[10px] uppercase text-slate-700">
                    <tr>
                      <th className="border border-slate-300 px-2 py-1" colSpan={3}>
                        New Accounts
                      </th>
                    </tr>
                    <tr>
                      <th className="border border-slate-300 px-2 py-1">Silver</th>
                      <th className="border border-slate-300 px-2 py-1">Gold</th>
                      <th className="border border-slate-300 px-2 py-1">Platinum</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-300 px-2 py-1">{snapshot.newAccounts.silver}</td>
                      <td className="border border-slate-300 px-2 py-1">{snapshot.newAccounts.gold}</td>
                      <td className="border border-slate-300 px-2 py-1">{snapshot.newAccounts.platinum}</td>
                    </tr>
                  </tbody>
                </table>
              </Card>

              <Card className="p-0">
                <table id="tblUpgrades" className="min-w-full text-xs">
                  <thead className="bg-slate-50 text-left text-[10px] uppercase text-slate-700">
                    <tr>
                      <th className="border border-slate-300 px-2 py-1" colSpan={3}>
                        Upgrades
                      </th>
                    </tr>
                    <tr>
                      <th className="border border-slate-300 px-2 py-1">Silver</th>
                      <th className="border border-slate-300 px-2 py-1">Gold</th>
                      <th className="border border-slate-300 px-2 py-1">Platinum</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-300 px-2 py-1">{snapshot.upgrades.silver}</td>
                      <td className="border border-slate-300 px-2 py-1">{snapshot.upgrades.gold}</td>
                      <td className="border border-slate-300 px-2 py-1">{snapshot.upgrades.platinum}</td>
                    </tr>
                  </tbody>
                </table>
              </Card>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {paymentTypeRows.map((table) => (
                <PaymentTable key={table.id} id={table.id} title={table.title} rows={table.rows} />
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3 pt-2 text-center text-xs text-slate-700 md:grid-cols-2">
              <div>
                <p>PREPARED BY:</p>
                <p id="txtPreparedBy" className="font-semibold">
                  Alaiza Jane Emoylan
                </p>
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
      <Modal isOpen={isPrintOpen} title="Print" onClose={() => setIsPrintOpen(false)}>
        upsertCashOnHand() mock action completed.
      </Modal>
    </>
  );
}
