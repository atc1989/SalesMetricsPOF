"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { PrintLineItem, PrintTransaction } from "@/types/dailySales";

type PrintPreviewModalProps = {
  isOpen: boolean;
  transaction: PrintTransaction;
  lineItems: PrintLineItem[];
  onClose: () => void;
};

export function PrintPreviewModal({ isOpen, transaction, lineItems, onClose }: PrintPreviewModalProps) {
  const onPrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      title="Print Preview"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button onClick={onPrint}>Print</Button>
        </>
      }
    >
      <div id="print-preview-content" className="space-y-4 text-xs text-slate-700">
        <header className="border-b border-slate-200 pb-3">
          <h3 className="text-sm font-semibold text-slate-900">SalesMetrics</h3>
          <p>SalesMetrics Distribution Inc.</p>
          <p>123 Business Avenue, Metro Manila</p>
        </header>

        <section className="grid gap-2 sm:grid-cols-2">
          <p>
            <span className="font-semibold text-slate-900">Date:</span> {transaction.date}
          </p>
          <p>
            <span className="font-semibold text-slate-900">POF No:</span> {transaction.pofNumber}
          </p>
          <p>
            <span className="font-semibold text-slate-900">Customer:</span> {transaction.customer}
          </p>
          <p>
            <span className="font-semibold text-slate-900">GG Trans No:</span> {transaction.ggTransNo}
          </p>
          <p>
            <span className="font-semibold text-slate-900">Mode of Payment:</span>{" "}
            {transaction.modeOfPayment}
          </p>
          <p>
            <span className="font-semibold text-slate-900">Encoder:</span> {transaction.encoder}
          </p>
        </section>

        <div className="overflow-x-auto">
          <table className="min-w-[1100px] border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50">
                <th className="border border-slate-200 px-2 py-2 text-left font-semibold">
                  PRODUCT/PACKAGE
                </th>
                <th className="border border-slate-200 px-2 py-2 text-left font-semibold">SRP</th>
                <th className="border border-slate-200 px-2 py-2 text-left font-semibold">
                  DISCOUNT
                </th>
                <th className="border border-slate-200 px-2 py-2 text-left font-semibold">
                  DISCOUNTED PRICE
                </th>
                <th className="border border-slate-200 px-2 py-2 text-left font-semibold">
                  QUANTITY
                </th>
                <th className="border border-slate-200 px-2 py-2 text-left font-semibold">AMOUNT</th>
                <th className="border border-slate-200 px-2 py-2 text-left font-semibold">
                  RELEASED(BOTTLE)
                </th>
                <th className="border border-slate-200 px-2 py-2 text-left font-semibold">
                  RELEASED(BLISTER)
                </th>
                <th className="border border-slate-200 px-2 py-2 text-left font-semibold">
                  BALANCE(BOTTLE)
                </th>
                <th className="border border-slate-200 px-2 py-2 text-left font-semibold">
                  BALANCE(BLISTER)
                </th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item) => (
                <tr key={item.id}>
                  <td className="border border-slate-200 px-2 py-2">{item.productPackage}</td>
                  <td className="border border-slate-200 px-2 py-2">PHP {item.srp.toLocaleString()}</td>
                  <td className="border border-slate-200 px-2 py-2">
                    PHP {item.discount.toLocaleString()}
                  </td>
                  <td className="border border-slate-200 px-2 py-2">
                    PHP {item.discountedPrice.toLocaleString()}
                  </td>
                  <td className="border border-slate-200 px-2 py-2">{item.quantity}</td>
                  <td className="border border-slate-200 px-2 py-2">PHP {item.amount.toLocaleString()}</td>
                  <td className="border border-slate-200 px-2 py-2">{item.releasedBottle}</td>
                  <td className="border border-slate-200 px-2 py-2">{item.releasedBlister}</td>
                  <td className="border border-slate-200 px-2 py-2">{item.balanceBottle}</td>
                  <td className="border border-slate-200 px-2 py-2">{item.balanceBlister}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}
