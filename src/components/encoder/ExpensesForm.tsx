"use client";

import { FormEvent, useState } from "react";
import { Expense } from "@/types/encoder";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

type ExpensesFormProps = {
  initialExpenses: Expense[];
};

export function ExpensesForm({ initialExpenses }: ExpensesFormProps) {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [expenseName, setExpenseName] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);

  const addExpense = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!expenseName || !amount || !expenseDate) {
      return;
    }

    setExpenses((prev) => [
      ...prev,
      {
        id: `e-${prev.length + 1}`,
        expenseName,
        amount: Number(amount),
        expenseDate,
        remarks,
      },
    ]);
    setExpenseName("");
    setAmount("");
    setExpenseDate("");
    setRemarks("");
    setIsSuccessOpen(true);
  };

  return (
    <>
      <Card>
        <h3 className="mb-3 text-lg font-semibold text-slate-900">Expenses</h3>
        <form className="mb-4 grid gap-3 sm:grid-cols-5" onSubmit={addExpense}>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Expense Name
            <input
              value={expenseName}
              onChange={(event) => setExpenseName(event.target.value)}
              className="h-10 rounded-md border border-slate-300 px-3"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Amount
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="h-10 rounded-md border border-slate-300 px-3"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Expense Date
            <input
              type="datetime-local"
              value={expenseDate}
              onChange={(event) => setExpenseDate(event.target.value)}
              className="h-10 rounded-md border border-slate-300 px-3"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Remarks
            <input
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              className="h-10 rounded-md border border-slate-300 px-3"
            />
          </label>
          <div className="flex items-end">
            <Button type="submit">Add Expense</Button>
          </div>
        </form>
        <ul className="space-y-2 text-sm">
          {expenses.map((expense) => (
            <li key={expense.id} className="rounded border border-slate-200 px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-800">{expense.expenseName}</span>
                <span>${expense.amount.toFixed(2)}</span>
              </div>
              <p className="text-slate-600">
                {expense.expenseDate} {expense.remarks ? `| ${expense.remarks}` : ""}
              </p>
            </li>
          ))}
        </ul>
      </Card>
      <Modal isOpen={isSuccessOpen} title="Saved" onClose={() => setIsSuccessOpen(false)}>
        Expense added successfully (mock).
      </Modal>
    </>
  );
}
