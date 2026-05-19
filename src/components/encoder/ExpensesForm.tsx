"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/Modal";
import { Expense } from "@/types/encoder";

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
    if (!expenseName || !amount || !expenseDate) return;

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
        <CardHeader>
          <CardTitle className="text-lg">Expenses</CardTitle>
          <CardDescription>Log ad-hoc expenses against this session.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="flex flex-col gap-4 sm:flex-row sm:items-end" onSubmit={addExpense}>
            <FieldGroup className="flex-1">
              <div className="grid gap-4 sm:grid-cols-4">
                <Field>
                  <FieldLabel htmlFor="expenseName">Expense Name</FieldLabel>
                  <Input
                    id="expenseName"
                    value={expenseName}
                    onChange={(event) => setExpenseName(event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="expenseAmount">Amount</FieldLabel>
                  <Input
                    id="expenseAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    className="text-right tabular-nums"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="expenseDate">Expense Date</FieldLabel>
                  <Input
                    id="expenseDate"
                    type="datetime-local"
                    value={expenseDate}
                    onChange={(event) => setExpenseDate(event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="expenseRemarks">Remarks</FieldLabel>
                  <Input
                    id="expenseRemarks"
                    value={remarks}
                    onChange={(event) => setRemarks(event.target.value)}
                  />
                </Field>
              </div>
            </FieldGroup>
            <div>
              <Button type="submit">Add Expense</Button>
            </div>
          </form>

          {expenses.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>No expenses yet</EmptyTitle>
                <EmptyDescription>Add an expense above to start the list.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="flex flex-col gap-2">
              {expenses.map((expense) => (
                <li
                  key={expense.id}
                  className="rounded-md border bg-muted/30 px-3 py-2 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{expense.expenseName}</span>
                    <span className="tabular-nums">${expense.amount.toFixed(2)}</span>
                  </div>
                  <p className="text-muted-foreground">
                    {expense.expenseDate}
                    {expense.remarks ? ` · ${expense.remarks}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Modal isOpen={isSuccessOpen} title="Saved" onClose={() => setIsSuccessOpen(false)}>
        Expense added successfully (mock).
      </Modal>
    </>
  );
}
