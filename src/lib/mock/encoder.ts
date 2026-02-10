import { Expense, Leader, TargetRatio } from "@/types/encoder";

export const initialTargetRatio: TargetRatio = {
  package: 60,
  retail: 40,
  globalTargetRatio: 100,
};

export const leaders: Leader[] = [
  { id: "l1", name: "Alex Rivera", zeroOne: "ALEX-01" },
  { id: "l2", name: "Jordan Kim", zeroOne: "JORDAN-07" },
  { id: "l3", name: "Morgan Lee", zeroOne: "MORGAN-11" },
];

export const availableLeaders: Leader[] = [
  { id: "a1", name: "Taylor Brooks", zeroOne: "TAYLOR-03" },
  { id: "a2", name: "Casey Morgan", zeroOne: "CASEY-06" },
  { id: "a3", name: "Jamie Santos", zeroOne: "JAMIE-10" },
];

export const initialExpenses: Expense[] = [
  {
    id: "e1",
    expenseName: "Utilities",
    amount: 210,
    expenseDate: "2025-04-03T09:30",
    remarks: "Electric and water",
  },
  {
    id: "e2",
    expenseName: "Supplies",
    amount: 135.5,
    expenseDate: "2025-04-04T14:00",
    remarks: "Packaging materials",
  },
];
