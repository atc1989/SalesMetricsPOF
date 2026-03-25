"use client";

import { useState } from "react";
import { CashOnHandRow } from "@/types/dailySales";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Card } from "@/components/ui/Card";

type CashOnHandTableProps = {
  rows: CashOnHandRow[];
};

export function CashOnHandTable({ rows }: CashOnHandTableProps) {
  const [stateRows, setStateRows] = useState(rows);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);

  const updateAmount = (id: string, amount: number) => {
    setStateRows((prev) => prev.map((row) => (row.id === id ? { ...row, amount } : row)));
  };

  return (
    <>
      <Card>
        <h3 className="mb-3 text-lg font-semibold text-slate-900">Cash On Hand</h3>
        <div className="app-table-scroll">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="border-b border-slate-200 px-4 py-2 text-left">Label</th>
                <th className="border-b border-slate-200 px-4 py-2 text-left">Amount</th>
              </tr>
            </thead>
            <tbody>
              {stateRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="border-b border-slate-100 px-4 py-2">{row.label}</td>
                  <td className="border-b border-slate-100 px-4 py-2">
                    <input
                      type="number"
                      className="h-9 w-full rounded-md border border-slate-300 px-2"
                      value={row.amount}
                      onChange={(event) => updateAmount(row.id, Number(event.target.value))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex justify-end">
          <Button onClick={() => setIsSuccessOpen(true)}>Save</Button>
        </div>
      </Card>
      <Modal isOpen={isSuccessOpen} title="Saved" onClose={() => setIsSuccessOpen(false)}>
        Cash on hand values saved successfully (mock).
      </Modal>
    </>
  );
}
