"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/Modal";
import { Card } from "@/components/ui/card";

export function SalesEntryForm() {
  const [invoice, setInvoice] = useState("");
  const [amount, setAmount] = useState("");
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSuccessOpen(true);
    setInvoice("");
    setAmount("");
  };

  return (
    <>
      <Card>
        <h3 className="mb-3 text-lg font-semibold text-slate-900">Sales Entry</h3>
        <form className="grid gap-3 sm:grid-cols-3" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Invoice
            <input
              required
              value={invoice}
              onChange={(event) => setInvoice(event.target.value)}
              className="h-10 rounded-md border border-slate-300 px-3 focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Amount
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="h-10 rounded-md border border-slate-300 px-3 focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
          </label>
          <div className="flex items-end">
            <Button type="submit">Submit Entry</Button>
          </div>
        </form>
      </Card>
      <Modal isOpen={isSuccessOpen} title="Saved" onClose={() => setIsSuccessOpen(false)}>
        Sales entry saved successfully (mock).
      </Modal>
    </>
  );
}
