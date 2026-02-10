"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";

type YesNo = "yes" | "no";
type PaymentMode = "cash" | "card" | "transfer" | "gcash" | "maya";
type PaymentType = "full" | "partial" | "deposit";
type MemberType = "guest" | "member" | "vip";
type PackageType = "starter" | "growth" | "premium";
type DiscountType = "none" | "senior-5" | "promo-10";

type PaymentEntry = {
  paymentMode: PaymentMode | "";
  paymentType: PaymentType | "";
  referenceNo: string;
  salesAmount: string;
};

type DailySalesEntryFormModel = {
  event: string;
  date: string;
  pofNumber: string;
  memberName: string;
  username: string;
  newMember: YesNo;
  memberType: MemberType;
  packageType: PackageType;
  toBlister: YesNo;
  quantity: string;
  discount: DiscountType;
  oneTimeDiscount: string;
  payments: [PaymentEntry, PaymentEntry, PaymentEntry];
  releasedBottle: string;
  releasedBlister: string;
  toFollowBottle: string;
  toFollowBlister: string;
  remarks: string;
  receivedBy: string;
  collectedBy: string;
};

const packageCatalog: Record<PackageType, { originalPrice: number; bottlesPerQuantity: number }> = {
  starter: { originalPrice: 1200, bottlesPerQuantity: 6 },
  growth: { originalPrice: 1800, bottlesPerQuantity: 10 },
  premium: { originalPrice: 2400, bottlesPerQuantity: 14 },
};

const discountCatalog: Record<DiscountType, number> = {
  none: 0,
  "senior-5": 0.05,
  "promo-10": 0.1,
};

const makePayment = (): PaymentEntry => ({
  paymentMode: "",
  paymentType: "",
  referenceNo: "",
  salesAmount: "",
});

const initialForm: DailySalesEntryFormModel = {
  event: "DAVAO",
  date: "",
  pofNumber: "",
  memberName: "",
  username: "",
  newMember: "no",
  memberType: "guest",
  packageType: "starter",
  toBlister: "no",
  quantity: "1",
  discount: "none",
  oneTimeDiscount: "0",
  payments: [makePayment(), makePayment(), makePayment()],
  releasedBottle: "0",
  releasedBlister: "0",
  toFollowBottle: "0",
  toFollowBlister: "0",
  remarks: "",
  receivedBy: "",
  collectedBy: "",
};

export function DailySalesEntryForm() {
  const [form, setForm] = useState<DailySalesEntryFormModel>(initialForm);
  const [isSavedOpen, setIsSavedOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const quantity = Number(form.quantity) || 0;
  const originalPrice = packageCatalog[form.packageType].originalPrice;
  const discountRate = discountCatalog[form.discount];
  const oneTimeDiscountValue = Number(form.oneTimeDiscount) || 0;
  const price = Math.max(originalPrice * (1 - discountRate) - oneTimeDiscountValue, 0);
  // Keep mock logic simple and consistent: bottles/blisters derive directly from package quantity.
  const bottleCount = quantity * packageCatalog[form.packageType].bottlesPerQuantity;
  const blisterCount = form.toBlister === "yes" ? bottleCount * 10 : 0;
  const sales = price * quantity;

  const updatePayment = (index: number, field: keyof PaymentEntry, value: string) => {
    setForm((prev) => {
      const payments = [...prev.payments] as [PaymentEntry, PaymentEntry, PaymentEntry];
      payments[index] = { ...payments[index], [field]: value };
      return { ...prev, payments };
    });
  };

  const clearForm = () => {
    setForm(initialForm);
    setErrorMessage("");
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const paymentOneAmount = Number(form.payments[0].salesAmount);
    if (!form.event || !form.date || !form.pofNumber || !form.memberName || !form.payments[0].paymentMode || !paymentOneAmount) {
      setErrorMessage("Please complete required fields: Event, Date, POF Number, Member Name, Payment 1 mode, and Payment 1 amount.");
      return;
    }

    setErrorMessage("");
    setIsSavedOpen(true);
    clearForm();
  };

  return (
    <>
      <Card>
        <h3 className="mb-3 text-lg font-semibold text-slate-900">Daily Sales Entry</h3>
        <form className="space-y-5" onSubmit={onSubmit}>
          <section className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Basic Info</h4>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Event
                <input
                  id="event"
                  value={form.event}
                  onChange={(event) => setForm((prev) => ({ ...prev, event: event.target.value }))}
                  className="h-10 rounded-md border border-slate-300 px-3"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Date
                <input
                  id="date"
                  type="date"
                  value={form.date}
                  onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
                  className="h-10 rounded-md border border-slate-300 px-3"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                POF Number
                <input
                  id="pof-number"
                  value={form.pofNumber}
                  onChange={(event) => setForm((prev) => ({ ...prev, pofNumber: event.target.value }))}
                  className="h-10 rounded-md border border-slate-300 px-3"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Member Name
                <input
                  id="member-name"
                  value={form.memberName}
                  onChange={(event) => setForm((prev) => ({ ...prev, memberName: event.target.value }))}
                  className="h-10 rounded-md border border-slate-300 px-3"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Username
                <input
                  id="username"
                  value={form.username}
                  onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
                  className="h-10 rounded-md border border-slate-300 px-3"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                New Member
                <select
                  id="new-member"
                  value={form.newMember}
                  onChange={(event) => setForm((prev) => ({ ...prev, newMember: event.target.value as YesNo }))}
                  className="h-10 rounded-md border border-slate-300 px-3"
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Order Details</h4>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Member Type
                <select
                  id="member-type"
                  value={form.memberType}
                  onChange={(event) => setForm((prev) => ({ ...prev, memberType: event.target.value as MemberType }))}
                  className="h-10 rounded-md border border-slate-300 px-3"
                >
                  <option value="guest">Guest</option>
                  <option value="member">Member</option>
                  <option value="vip">VIP</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Package Type
                <select
                  id="package-type"
                  value={form.packageType}
                  onChange={(event) => setForm((prev) => ({ ...prev, packageType: event.target.value as PackageType }))}
                  className="h-10 rounded-md border border-slate-300 px-3"
                >
                  <option value="starter">Starter</option>
                  <option value="growth">Growth</option>
                  <option value="premium">Premium</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                To Blister
                <select
                  id="to-blister"
                  value={form.toBlister}
                  onChange={(event) => setForm((prev) => ({ ...prev, toBlister: event.target.value as YesNo }))}
                  className="h-10 rounded-md border border-slate-300 px-3"
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Original Price
                <input id="original-price" type="number" value={originalPrice} readOnly className="h-10 rounded-md border border-slate-300 bg-slate-50 px-3" />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Quantity
                <input
                  id="quantity"
                  type="number"
                  min="0"
                  value={form.quantity}
                  onChange={(event) => setForm((prev) => ({ ...prev, quantity: event.target.value }))}
                  className="h-10 rounded-md border border-slate-300 px-3"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Blister Count
                <input id="blister-count" type="number" value={blisterCount} readOnly className="h-10 rounded-md border border-slate-300 bg-slate-50 px-3" />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Discount
                <select
                  id="discount"
                  value={form.discount}
                  onChange={(event) => setForm((prev) => ({ ...prev, discount: event.target.value as DiscountType }))}
                  className="h-10 rounded-md border border-slate-300 px-3"
                >
                  <option value="none">None</option>
                  <option value="senior-5">Senior 5%</option>
                  <option value="promo-10">Promo 10%</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Price
                <input id="price" type="number" value={Number(price.toFixed(2))} readOnly className="h-10 rounded-md border border-slate-300 bg-slate-50 px-3" />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                One Time Discount
                <input
                  id="one-time-discount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.oneTimeDiscount}
                  onChange={(event) => setForm((prev) => ({ ...prev, oneTimeDiscount: event.target.value }))}
                  className="h-10 rounded-md border border-slate-300 px-3"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                No. of Bottles
                <input id="no-of-bottles" type="number" value={bottleCount} readOnly className="h-10 rounded-md border border-slate-300 bg-slate-50 px-3" />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Sales
                <input id="sales" type="number" value={Number(sales.toFixed(2))} readOnly className="h-10 rounded-md border border-slate-300 bg-slate-50 px-3" />
              </label>
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Payments</h4>
            {[0, 1, 2].map((index) => {
              const payment = form.payments[index];
              const suffix = index === 0 ? "one" : index === 1 ? "two" : "three";
              const label = `Payment ${index + 1}`;

              return (
                <div key={suffix} className="rounded-md border border-slate-200 p-3">
                  <p className="mb-2 text-sm font-medium text-slate-800">{label}</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="flex flex-col gap-1 text-sm text-slate-700">
                      Payment Mode
                      <select
                        id={`payment-${suffix}-mode`}
                        value={payment.paymentMode}
                        onChange={(event) => updatePayment(index, "paymentMode", event.target.value)}
                        className="h-10 rounded-md border border-slate-300 px-3"
                      >
                        <option value="">Select mode</option>
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="transfer">Transfer</option>
                        <option value="gcash">GCash</option>
                        <option value="maya">Maya</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-sm text-slate-700">
                      Payment Type
                      <select
                        id={`payment-${suffix}-type`}
                        value={payment.paymentType}
                        onChange={(event) => updatePayment(index, "paymentType", event.target.value)}
                        className="h-10 rounded-md border border-slate-300 px-3"
                      >
                        <option value="">Select type</option>
                        <option value="full">Full</option>
                        <option value="partial">Partial</option>
                        <option value="deposit">Deposit</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-sm text-slate-700">
                      Reference No
                      <input
                        id={`payment-${suffix}-reference-no`}
                        value={payment.referenceNo}
                        onChange={(event) => updatePayment(index, "referenceNo", event.target.value)}
                        className="h-10 rounded-md border border-slate-300 px-3"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm text-slate-700">
                      Sales Amount
                      <input
                        id={`payment-${suffix}-sales-amount`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={payment.salesAmount}
                        onChange={(event) => updatePayment(index, "salesAmount", event.target.value)}
                        className="h-10 rounded-md border border-slate-300 px-3"
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Release / Follow-up</h4>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Released bottle
                <input
                  id="released-bottle"
                  type="number"
                  min="0"
                  value={form.releasedBottle}
                  onChange={(event) => setForm((prev) => ({ ...prev, releasedBottle: event.target.value }))}
                  className="h-10 rounded-md border border-slate-300 px-3"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Released blister
                <input
                  id="released-blister"
                  type="number"
                  min="0"
                  value={form.releasedBlister}
                  onChange={(event) => setForm((prev) => ({ ...prev, releasedBlister: event.target.value }))}
                  className="h-10 rounded-md border border-slate-300 px-3"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                To Follow bottle
                <input
                  id="to-follow-bottle"
                  type="number"
                  min="0"
                  value={form.toFollowBottle}
                  onChange={(event) => setForm((prev) => ({ ...prev, toFollowBottle: event.target.value }))}
                  className="h-10 rounded-md border border-slate-300 px-3"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                To Follow blister
                <input
                  id="to-follow-blister"
                  type="number"
                  min="0"
                  value={form.toFollowBlister}
                  onChange={(event) => setForm((prev) => ({ ...prev, toFollowBlister: event.target.value }))}
                  className="h-10 rounded-md border border-slate-300 px-3"
                />
              </label>
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Remarks / Staff</h4>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="md:col-span-2 flex flex-col gap-1 text-sm text-slate-700">
                Remarks
                <textarea
                  id="remarks"
                  rows={3}
                  value={form.remarks}
                  onChange={(event) => setForm((prev) => ({ ...prev, remarks: event.target.value }))}
                  className="rounded-md border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Received By
                <input
                  id="received-by"
                  value={form.receivedBy}
                  onChange={(event) => setForm((prev) => ({ ...prev, receivedBy: event.target.value }))}
                  className="h-10 rounded-md border border-slate-300 px-3"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Collected By
                <input
                  id="collected-by"
                  value={form.collectedBy}
                  onChange={(event) => setForm((prev) => ({ ...prev, collectedBy: event.target.value }))}
                  className="h-10 rounded-md border border-slate-300 px-3"
                />
              </label>
            </div>
          </section>

          {errorMessage ? <p className="text-sm font-medium text-red-600">{errorMessage}</p> : null}

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="secondary" onClick={clearForm}>
              Clear Form
            </Button>
            <Button type="submit">Submit Entry</Button>
          </div>
        </form>
      </Card>

      <Modal isOpen={isSavedOpen} title="Saved" onClose={() => setIsSavedOpen(false)}>
        Daily sales entry saved successfully (mock).
      </Modal>
    </>
  );
}
