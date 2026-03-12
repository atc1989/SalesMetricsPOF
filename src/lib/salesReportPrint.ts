import { openPrintWindow } from '@/lib/printWindow';

export type SalesReportPrintRow = {
  label: string;
  qty?: number;
  price?: number;
  amount?: number;
};

export type SalesReportPrintSnapshot = {
  packageRows: SalesReportPrintRow[];
  msPackageRows: SalesReportPrintRow[];
  cdPackageRows: SalesReportPrintRow[];
  retailRows: SalesReportPrintRow[];
  msRetailRows: SalesReportPrintRow[];
  cdRetailRows: SalesReportPrintRow[];
  paymentBreakdownRows: Array<{ label: string; amount: number }>;
  newAccounts: { silver: number; gold: number; platinum: number };
  upgrades: { silver: number; gold: number; platinum: number };
};

export type SalesReportPrintInput = {
  dateCaption: string;
  snapshot: SalesReportPrintSnapshot;
  cashRows: Array<{ label: string; pieces: number; amount: number }>;
  totalCash: number;
  paymentTypeRows: Array<{ title: string; rows: Array<{ label: string; amount: number }> }>;
};

const formatAmount = (value: number) =>
  value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

function renderPackageTable(title: string, rows: SalesReportPrintRow[], totalLabel: string, includeGrandTotal = false) {
  const normalizedRows = rows.map((row) => {
    const qty = row.qty ?? 0;
    const price = row.price ?? 0;
    return { ...row, qty, price, amount: qty * price };
  });
  const total = normalizedRows.reduce((sum, row) => sum + row.amount, 0);

  const bodyRows = normalizedRows
    .map(
      (row) => `<tr><td>${escapeHtml(row.label)}</td><td class="num">${row.qty}</td><td class="num">${formatAmount(row.price)}</td><td class="num">${formatAmount(row.amount)}</td></tr>`
    )
    .join('');

  const grandTotalRow = includeGrandTotal
    ? `<tr class="strong"><td colspan="3" class="center">GRAND TOTAL</td><td class="num">${formatAmount(total)}</td></tr>`
    : '';

  return `
    <table class="print-table">
      <thead><tr><th>${escapeHtml(title)}</th><th>QTY</th><th>PRICE</th><th>AMOUNT TOTAL</th></tr></thead>
      <tbody>
        ${bodyRows}
        <tr class="strong"><td colspan="3">${escapeHtml(totalLabel)}</td><td class="num">${formatAmount(total)}</td></tr>
        ${grandTotalRow}
      </tbody>
    </table>
  `;
}

function renderAmountTable(title: string, rows: Array<{ label: string; amount: number }>) {
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  const bodyRows = rows
    .map((row) => `<tr><td>${escapeHtml(row.label)}</td><td class="num">${formatAmount(row.amount)}</td></tr>`)
    .join('');

  return `
    <table class="print-table">
      <thead><tr><th colspan="2">${escapeHtml(title)}</th></tr></thead>
      <tbody>
        ${bodyRows}
        <tr class="strong"><td class="center">TOTAL</td><td class="num">${formatAmount(total)}</td></tr>
      </tbody>
    </table>
  `;
}

export function openSalesReportPrintWindow(input: SalesReportPrintInput) {
  const cashRows = input.cashRows
    .map(
      (entry) => `<tr><td>${escapeHtml(entry.label)}</td><td class="num">${entry.pieces}</td><td class="num">${formatAmount(entry.amount)}</td></tr>`
    )
    .join('');

  const paymentTypeTables = input.paymentTypeRows
    .map((entry) => renderAmountTable(entry.title, entry.rows))
    .join('');

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Daily Sales Report</title>
  <style>
    @page { size: A4 portrait; margin: 8mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, sans-serif; color: #111; }
    .page { width: 194mm; margin: 0 auto; padding: 2mm; font-size: 9px; line-height: 1.15; }
    .header { text-align: center; margin-bottom: 6px; font-weight: 700; }
    .sub { font-weight: 400; }
    .layout { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; align-items: start; }
    .stack { display: grid; gap: 6px; }
    .print-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    .print-table th, .print-table td { border: 1px solid #000; padding: 2px 3px; vertical-align: middle; }
    .print-table thead th { text-align: left; font-size: 8px; }
    .num { text-align: right; white-space: nowrap; }
    .center { text-align: center; }
    .strong td { font-weight: 700; }
    .triplet { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 6px; }
    .payments-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; margin-top: 6px; }
    .signatories { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 10px; }
    .signature-box { text-align: center; }
    @media print {
      .page { margin: 0; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div>Innovision Grand International</div>
      <div>Daily Sales Report</div>
      <div class="sub">${escapeHtml(input.dateCaption)}</div>
    </div>

    <div class="layout">
      <div class="stack">
        ${renderPackageTable('PACKAGE', input.snapshot.packageRows, 'Total Package Sales')}
        ${renderPackageTable('MOBILE STOCKIST PACKAGE', input.snapshot.msPackageRows, 'Total Mobile Stockist Package Sales')}
        ${renderPackageTable('DEPOT PACKAGE', input.snapshot.cdPackageRows, 'Total Depot Package Sales')}
        ${renderPackageTable('RETAIL', input.snapshot.retailRows, 'Total Retail Sales', true)}
        ${renderPackageTable('MOBILE STOCKIST RETAIL', input.snapshot.msRetailRows, 'Total Mobile Stockist Retail Sales', true)}
        ${renderPackageTable('DEPOT RETAIL', input.snapshot.cdRetailRows, 'Total Depot Retail Sales')}
      </div>
      <div class="stack">
        <table class="print-table">
          <thead><tr><th>Cash on Hand</th><th>Pieces</th><th>Amount</th></tr></thead>
          <tbody>
            ${cashRows}
            <tr class="strong"><td colspan="2" class="center">TOTAL CASH ON HAND</td><td class="num">${formatAmount(input.totalCash)}</td></tr>
          </tbody>
        </table>
        ${renderAmountTable('PAYMENT BREAKDOWN', input.snapshot.paymentBreakdownRows)}
      </div>
    </div>

    <div class="triplet">
      <table class="print-table">
        <thead>
          <tr><th colspan="3">New Accounts</th></tr>
          <tr><th>Silver</th><th>Gold</th><th>Platinum</th></tr>
        </thead>
        <tbody>
          <tr><td class="center">${input.snapshot.newAccounts.silver}</td><td class="center">${input.snapshot.newAccounts.gold}</td><td class="center">${input.snapshot.newAccounts.platinum}</td></tr>
        </tbody>
      </table>
      <table class="print-table">
        <thead>
          <tr><th colspan="3">Upgrades</th></tr>
          <tr><th>Silver</th><th>Gold</th><th>Platinum</th></tr>
        </thead>
        <tbody>
          <tr><td class="center">${input.snapshot.upgrades.silver}</td><td class="center">${input.snapshot.upgrades.gold}</td><td class="center">${input.snapshot.upgrades.platinum}</td></tr>
        </tbody>
      </table>
    </div>

    <div class="payments-grid">
      ${paymentTypeTables}
    </div>

    <div class="signatories">
      <div class="signature-box"><div>Prepared By:</div><div><strong>Alaiza Jane Emoylan</strong></div><div>Cashier</div></div>
      <div class="signature-box"><div>Checked By:</div><div><strong>Erica Villaester</strong></div><div>Accounting Staff</div></div>
    </div>
  </div>
</body>
</html>`;

  openPrintWindow({ html });
}
