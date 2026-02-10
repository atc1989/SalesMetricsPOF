export type RecentSale = {
  id: string;
  pofNumber: string;
  invoice: string;
  ggTransNo: string;
  customer: string;
  amount: number;
  date: string;
};

export type ReportRow = {
  id: string;
  name: string;
  value: string;
  type: string;
  date: string;
};

export type InventoryRow = {
  id: string;
  date: string;
  item: string;
  beginning: number;
  sold: number;
  ending: number;
};

export type BreakdownRow = {
  id: string;
  label: string;
  amount: number;
};

export type CashOnHandRow = {
  id: string;
  label: string;
  amount: number;
};

export type SalesMetricKpi = {
  id: string;
  label: string;
  value: string;
};

export type PrintTransaction = {
  date: string;
  pofNumber: string;
  customer: string;
  ggTransNo: string;
  modeOfPayment: string;
  encoder: string;
};

export type PrintLineItem = {
  id: string;
  productPackage: string;
  srp: number;
  discount: number;
  discountedPrice: number;
  quantity: number;
  amount: number;
  releasedBottle: number;
  releasedBlister: number;
  balanceBottle: number;
  balanceBlister: number;
};
