import { openPrintWindow } from '@/lib/print/openPrintWindow';

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
    <table id="${escapeHtml(tableIdForTitle(title))}">
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
    <table id="${escapeHtml(tableIdForTitle(title))}">
      <thead><tr><th colspan="2">${escapeHtml(title)}</th></tr></thead>
      <tbody>
        ${bodyRows}
        <tr class="strong"><td class="center">TOTAL</td><td class="num">${formatAmount(total)}</td></tr>
      </tbody>
    </table>
  `;
}

function tableIdForTitle(title: string) {
  switch (title) {
    case 'PACKAGE':
      return 'tblPackage';
    case 'MOBILE STOCKIST PACKAGE':
      return 'tblMsPackage';
    case 'DEPOT PACKAGE':
      return 'tblCdPackage';
    case 'RETAIL':
      return 'tblRetail';
    case 'MOBILE STOCKIST RETAIL':
      return 'tblMsRetail';
    case 'DEPOT RETAIL':
      return 'tblCdRetail';
    case 'PAYMENT BREAKDOWN':
      return 'tblPaymentBreakdown';
    case 'New Accounts':
      return 'tblNewAccounts';
    case 'Upgrades':
      return 'tblUpgrades';
    case 'Ewallet':
      return 'tblEwallet';
    case 'Bank':
      return 'tblBank';
    case 'Maya(IGI)':
      return 'tblMayaIgi';
    case 'Maya(ATC)':
      return 'tblMayaAtc';
    case 'SbCollect(IGI)':
      return 'tblSbCollectIgi';
    case 'SbCollect(ATC)':
      return 'tblSbCollectAtc';
    case 'AR(CSA)':
      return 'tblArCsa';
    case 'AR Leader Support':
      return 'tblArLeaderSupport';
    case 'Credit Card':
      return 'tblCreditCard';
    case 'Cheque':
      return 'tblCheque';
    case 'Epoints':
      return 'tblEpoints';
    default:
      return 'tblPrint';
  }
}

const SALES_REPORT_PRINT_STYLES = `
  body { font-family: Arial, sans-serif; padding: 20px !important; }
  table { border-collapse: collapse !important; width: 100% !important; }
  th, td { padding: 4px !important; border: 1px solid #000 !important; text-align: center !important; }
  .form-row { display: flex !important; justify-content: space-around !important; margin-bottom: 1px !important; line-height: 1 !important; }
  .form-header { justify-content: center !important; }
  #tblPackage, #tblRetail, #tblCdPackage, #tblCdRetail, #tblMsPackage, #tblMsRetail, #tblCashOnHand, #tblPaymentBreakdown, #tblNewAccounts, #tblUpgrades, #tblEwallet, #tblBank, #tblMayaIgi, #tblMayaAtc, #tblSbCollectIgi, #tblSbCollectAtc, #tblArCsa, #tblArLeaderSupport, #tblCreditCard, #tblCheque, #tblEpoints { border-collapse: collapse !important; width: 100% !important; font-size: 12px !important; margin-bottom: 10px !important; }
  #tblPackage th, #tblRetail th, #tblCdPackage th, #tblCdRetail th, #tblMsPackage th, #tblMsRetail th, #tblCashOnHand th, #tblPaymentBreakdown th, #tblNewAccounts th, #tblUpgrades th, #tblEwallet th, #tblBank th, #tblMayaIgi th, #tblMayaAtc th, #tblSbCollectIgi th, #tblSbCollectAtc th, #tblArCsa th, #tblArLeaderSupport th, #tblCreditCard th, #tblCheque th, #tblEpoints th,
  #tblPackage td, #tblRetail td, #tblCdPackage td, #tblCdRetail td, #tblMsPackage td, #tblMsRetail td, #tblCashOnHand td, #tblPaymentBreakdown td, #tblNewAccounts td, #tblUpgrades td, #tblEwallet td, #tblBank td, #tblMayaIgi td, #tblMayaAtc td, #tblSbCollectIgi td, #tblSbCollectAtc td, #tblArCsa td, #tblArLeaderSupport td, #tblCreditCard td, #tblCheque td, #tblEpoints td { border: 1px solid #000 !important; padding: 6px 10px !important; text-align: left !important; }
  #tblPackage th, #tblRetail th, #tblCdPackage th, #tblCdRetail th, #tblMsPackage th, #tblMsRetail th, #tblCashOnHand th, #tblPaymentBreakdown th, #tblNewAccounts th, #tblUpgrades th, #tblEwallet th, #tblBank th, #tblMayaIgi th, #tblMayaAtc th, #tblSbCollectIgi th, #tblSbCollectAtc th, #tblArCsa th, #tblArLeaderSupport th, #tblCreditCard th, #tblCheque th, #tblEpoints th { background-color: #f2f2f2 !important; }
  .center { text-align: center !important; }
  .left { text-align: left !important; }
  .bold, .strong td { font-weight: bold !important; }
  .total { background-color: #e0e0e0 !important; }
  .row { display: flex !important; justify-content: space-around !important; margin-bottom: 0 !important; gap: 20px !important; }
  .col { width: 48% !important; }
  .col-third { width: 45% !important; }
  .cont { display: grid !important; grid-template-columns: repeat(2, 1fr) !important; gap: 20px !important; }
  .num { text-align: right !important; }
`;

export function openSalesReportPrintWindow(input: SalesReportPrintInput) {
  const cashRows = input.cashRows
    .map(
      (entry) => `<tr><td class="left">${escapeHtml(entry.label)}</td><td>${entry.pieces}</td><td class="num">${formatAmount(entry.amount)}</td></tr>`
    )
    .join('');

  const paymentTypeTables = input.paymentTypeRows
    .map((entry) => renderAmountTable(entry.title, entry.rows))
    .join('');

  const bodyHtml = `
    <div class="section" id="cntnrDailySales">
      <div class="form-row form-header">
        <p></p>
        <span style="font-weight: bold;">Innovision Grand International</span>
        <p></p>
      </div>

      <div class="form-row form-header">
        <p></p>
        <span style="font-weight: bold;">Daily Sales Report</span>
        <p></p>
      </div>

      <div class="form-row form-header">
        <p></p>
        <span id="spnTransDateDailySales" style="font-weight: bold;">${escapeHtml(input.dateCaption)}</span>
        <p></p>
      </div>

      <br />
      <div class="row">
        <div class="col">
        ${renderPackageTable('PACKAGE', input.snapshot.packageRows, 'Total Package Sales')}
        ${renderPackageTable('MOBILE STOCKIST PACKAGE', input.snapshot.msPackageRows, 'Total Mobile Stockist Package Sales')}
        ${renderPackageTable('DEPOT PACKAGE', input.snapshot.cdPackageRows, 'Total Depot Package Sales')}
        ${renderPackageTable('RETAIL', input.snapshot.retailRows, 'Total Retail Sales', true)}
        ${renderPackageTable('MOBILE STOCKIST RETAIL', input.snapshot.msRetailRows, 'Total Mobile Stockist Retail Sales', true)}
        ${renderPackageTable('DEPOT RETAIL', input.snapshot.cdRetailRows, 'Total Depot Retail Sales')}
        </div>

        <div class="col">
        <table id="tblCashOnHand">
          <thead><tr><th>Cash on Hand</th><th>Pieces</th><th>Amount</th></tr></thead>
          <tbody>
            ${cashRows}
            <tr class="strong"><td colspan="2" class="center">TOTAL CASH ON HAND</td><td class="num">${formatAmount(input.totalCash)}</td></tr>
          </tbody>
        </table>
        ${renderAmountTable('PAYMENT BREAKDOWN', input.snapshot.paymentBreakdownRows)}
        </div>
      </div>

      <div class="cont">
      <table id="tblNewAccounts">
        <thead>
          <tr><th colspan="3">New Accounts</th></tr>
          <tr><th>Silver</th><th>Gold</th><th>Platinum</th></tr>
        </thead>
        <tbody>
          <tr><td class="center">${input.snapshot.newAccounts.silver}</td><td class="center">${input.snapshot.newAccounts.gold}</td><td class="center">${input.snapshot.newAccounts.platinum}</td></tr>
        </tbody>
      </table>
      <table id="tblUpgrades">
        <thead>
          <tr><th colspan="3">Upgrades</th></tr>
          <tr><th>Silver</th><th>Gold</th><th>Platinum</th></tr>
        </thead>
        <tbody>
          <tr><td class="center">${input.snapshot.upgrades.silver}</td><td class="center">${input.snapshot.upgrades.gold}</td><td class="center">${input.snapshot.upgrades.platinum}</td></tr>
        </tbody>
      </table>
      ${paymentTypeTables}
      </div>

      <br />
      <div class="form-row" style="justify-content: space-around;">
        <p>Prepared By:<br /><span id="txtPreparedBy" style="font-weight: bold;">Alaiza Jane Emoylan</span><br />Cashier</p>
        <p>Checked By:<br /><span id="txtCheckedBy" style="font-weight: bold;">Erica Villaester</span><br />Accounting Staff</p>
      </div>
    </div>
  `;

  openPrintWindow('Daily Sales Report', bodyHtml, SALES_REPORT_PRINT_STYLES);
}
