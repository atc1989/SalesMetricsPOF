export type TargetRatio = {
  package: number;
  retail: number;
  globalTargetRatio: number;
};

export type Leader = {
  id: string;
  name: string;
  zeroOne: string;
};

export type Expense = {
  id: string;
  expenseName: string;
  amount: number;
  expenseDate: string;
  remarks: string;
};
