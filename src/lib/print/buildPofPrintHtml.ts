"use client";

type DailySalesPrintDetail = {
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
};

const REFERENCE_PAYMENT_MODES = new Set([
  "BANK",
  "BANK (CC)",
  "EWALLET",
  "MAYA(IGI)",
  "MAYA(ATC)",
  "SBCOLLECT(IGI)",
  "SBCOLLECT(ATC)",
]);

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const formatPeso = (value: number) =>
  `PHP ${value.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;

function getPackageBottleLabel(packageType: string) {
  switch (packageType.toUpperCase()) {
    case "SILVER":
      return 1;
    case "GOLD":
      return 3;
    case "PLATINUM":
      return 10;
    case "RETAIL":
      return 1;
    default:
      return 0;
  }
}

function renderPaymentRows(rows: DailySalesPrintDetail[]) {
  const paymentMap = new Map<string, { mode: string; reference: string; amount: number }>();

  for (const row of rows) {
    const entries = [
      {
        mode: row.mode_of_payment,
        amount: row.sales - row.sales_two - row.sales_three,
        referenceNumber: row.reference_number,
      },
      {
        mode: row.mode_of_payment_two,
        amount: row.sales_two,
        referenceNumber: row.reference_number_two,
      },
      {
        mode: row.mode_of_payment_three,
        amount: row.sales_three,
        referenceNumber: row.reference_number_three,
      },
    ];

    for (const entry of entries) {
      const mode = entry.mode.trim();
      if (!mode || mode === "N/A") {
        continue;
      }

      const reference = REFERENCE_PAYMENT_MODES.has(mode)
        ? entry.referenceNumber.trim() || "N/A"
        : "N/A";
      const key = `${mode}::${reference}`;
      const current = paymentMap.get(key) ?? { mode, reference, amount: 0 };
      current.amount += entry.amount;
      paymentMap.set(key, current);
    }
  }

  return Array.from(paymentMap.values())
    .map((entry) => {
      const type = entry.mode;

      return `
        <tr>
          <th colspan="5" style="text-align: center;">${escapeHtml(type)}</th>
          <th colspan="3" style="text-align: center;">${escapeHtml(entry.reference)}</th>
          <th colspan="2" style="text-align: center;">${escapeHtml(formatPeso(entry.amount))}</th>
        </tr>
      `;
    })
    .join("");
}

export function buildPofPrintHtml(rows: DailySalesPrintDetail[]) {
  const firstRow = rows[0];
  if (!firstRow) {
    return `
      <div class="form-row" style="justify-content: center;">
        <p>No print data found.</p>
      </div>
    `;
  }

  let totalAmount = 0;
  let totalOneTimeDiscount = 0;
  let totalSales = 0;
  const uniquePofNumbers = Array.from(
    new Set(rows.map((row) => row.pof_number.trim()).filter((value) => value.length > 0)),
  );

  const bodyRows = rows
    .map((row) => {
      const totalProductPrice = row.quantity * row.price_after_discount;
      totalAmount += totalProductPrice;
      totalOneTimeDiscount += row.one_time_discount;
      totalSales += row.sales;

      return `
        <tr>
          <td>${escapeHtml(`${row.package_type} (${getPackageBottleLabel(row.package_type)})`)}</td>
          <td>${escapeHtml(formatPeso(row.original_price))}</td>
          <td>${escapeHtml(formatPeso(row.discount))}</td>
          <td>${escapeHtml(formatPeso(row.price_after_discount))}</td>
          <td>${row.quantity}</td>
          <td>${escapeHtml(formatPeso(totalProductPrice))}</td>
          <td>${row.released_count}</td>
          <td>${row.released_blpk_count}</td>
          <td>${row.to_follow_count}</td>
          <td>${row.to_follow_blpk_count}</td>
        </tr>
      `;
    })
    .join("");

  const formHtml = `
    <section class="pof-print-copy">
      <div class="form-row" style="justify-content: space-between;">
        <div style="height: 25px; width: 120px;"></div>
        <p>PACKAGE / RETAIL ORDER FORM</p>
      </div>
      <div class="form-row" style="justify-content: space-between;">
        <p>2nd Floor, Unit 3, CVA Building, J.P. Laurel Avenue, Davao City</p>
        <p class="spn-pof-number">PROF No: <span id="txtPofNumber" style="font-weight: bold;">${escapeHtml(uniquePofNumbers.join(", "))}</span></p>
      </div>
      <p>www.onegrindersguild.com</p>
      <br />
      <div class="form-row" style="justify-content: space-between;">
        <p>Name: <span id="txtName" style="font-weight: bold;">${escapeHtml(firstRow.member_name)}</span></p>
        <p>Username: <span id="txtUsername" style="font-weight: bold;">${escapeHtml(firstRow.username)}</span></p>
        <p></p>
      </div>
      <table border="1" width="100%" id="tblPrintOut">
        <thead>
          <tr>
            <th>PRODUCT/PACKAGE</th>
            <th>SRP</th>
            <th>DISCOUNT</th>
            <th>DISCOUNTED PRICE</th>
            <th>QUANTITY</th>
            <th>AMOUNT</th>
            <th>RELEASED (BOTTLE)</th>
            <th>RELEASED (BLISTER)</th>
            <th>BALANCE (BOTTLE)</th>
            <th>BALANCE (BLISTER)</th>
          </tr>
        </thead>
        <tbody>
          ${bodyRows}
        </tbody>
        <tfoot>
          <tr>
            <th colspan="5" style="text-align: center;">Grand Total:</th>
            <th colspan="5" style="text-align: center;">${escapeHtml(formatPeso(totalAmount))}</th>
          </tr>
          <tr>
            <th colspan="5" style="text-align: center;">One-time Discount:</th>
            <th colspan="5" style="text-align: center;">${escapeHtml(formatPeso(totalOneTimeDiscount))}</th>
          </tr>
          <tr>
            <th colspan="5" style="text-align: center;">Net Payable:</th>
            <th colspan="5" style="text-align: center;">${escapeHtml(formatPeso(totalSales))}</th>
          </tr>
          ${renderPaymentRows(rows)}
        </tfoot>
      </table>
      <br />
      <div class="form-row" style="justify-content: space-between;">
        <p>Remarks: <span id="txtRemarks" style="font-weight: bold;">${escapeHtml(firstRow.remarks)}</span></p>
      </div>
      <div class="form-row" style="justify-content: space-between;">
        <p>Checked and Verified:</p>
        <p>Received product in good order condition:</p>
        <p></p>
      </div>
      <div class="form-row" style="justify-content: space-between;">
        <p><span id="txtReceivedBy" style="font-weight: bold;">${escapeHtml(firstRow.received_by)}</span></p>
        <p><span id="txtCollectedBy" style="font-weight: bold;">${escapeHtml(firstRow.collected_by)}</span></p>
        <p></p>
      </div>
    </section>
  `;

  return `
    <div class="pof-print-sheet">
      <style>
        .pof-print-sheet {
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .pof-print-copy {
          padding-bottom: 10px;
        }

        .pof-print-divider {
          border: 0;
          border-top: 2px solid #888;
          margin: 6px 0 0;
        }
      </style>
      ${formHtml}
      <hr class="pof-print-divider" />
      ${formHtml}
    </div>
  `;
}
