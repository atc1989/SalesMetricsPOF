export type PaymentMode =
  | 'ALL'
  | 'CASH'
  | 'BANK'
  | 'MAYA(IGI)'
  | 'MAYA(ATC)'
  | 'SBCOLLECT(IGI)'
  | 'SBCOLLECT(ATC)'
  | 'EWALLET'
  | 'CHEQUE'
  | 'EPOINTS'
  | 'CONSIGNMENT'
  | 'AR(CSA)'
  | 'AR(LEADERSUPPORT)';

export type SaleStatus = 'Released' | 'To Follow' | 'Pending';

export type RecentSale = {
  id: string;
  pofNumber: string;
  ggTransNo: string;
  date: string;
  memberName: string;
  zeroOne: string;
  packageType: string;
  bottles: number;
  blisters: number;
  sales: number;
  paymentMode: Exclude<PaymentMode, 'ALL'>;
  status: SaleStatus;
};

export type ReportRow = {
  id: string;
  name: string;
  value: string;
  type: Exclude<ReportType, 'ALL'>;
  date: string;
};

export type ReportType =
  | 'ALL'
  | 'SALES SUMMARY'
  | 'PAYMENT SUMMARY'
  | 'INVENTORY SUMMARY'
  | 'AGENT PERFORMANCE';

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

export type EncoderNewMemberOption = '1' | '0';

export type EncoderMemberTypeOption =
  | 'DISTRIBUTOR'
  | 'STOCKIST'
  | 'CENTER'
  | 'NON-MEMBER';

export type EncoderPackageTypeOption =
  | 'SILVER'
  | 'GOLD'
  | 'PLATINUM'
  | 'RETAIL'
  | 'BLISTER';

export type EncoderBlisterOption = '0' | '1';

export type EncoderPaymentModeOption =
  | 'N/A'
  | 'CASH'
  | 'BANK'
  | 'MAYA(IGI)'
  | 'MAYA(ATC)'
  | 'SBCOLLECT(IGI)'
  | 'SBCOLLECT(ATC)'
  | 'EWALLET'
  | 'CHEQUE'
  | 'EPOINTS'
  | 'CONSIGNMENT'
  | 'AR(CSA)'
  | 'AR(LEADERSUPPORT)';

export type EncoderFormModel = {
  event: string;
  date: string;
  pofNumber: string;
  name: string;
  username: string;
  newMember: EncoderNewMemberOption;
  memberType: EncoderMemberTypeOption;
  packageType: EncoderPackageTypeOption;
  isToBlister: EncoderBlisterOption;
  originalPrice: number;
  quantity: number;
  blisterCount: number;
  discount: number;
  price: number;
  oneTimeDiscount: number;
  noOfBottles: number;
  sales: number;
  paymentMode: EncoderPaymentModeOption;
  paymentType: string;
  referenceNo: string;
  paymentModeTwo: EncoderPaymentModeOption;
  paymentTypeTwo: string;
  referenceNoTwo: string;
  salesTwo: number;
  released: number;
  releasedBlpk: number;
  toFollow: number;
  toFollowBlpk: number;
  remarks: string;
  receivedBy: string;
  collectedBy: string;
};
