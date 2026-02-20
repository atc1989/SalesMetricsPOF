import type {
  InventoryRow,
  PrintLineItem,
  PrintTransaction,
  RecentSale,
  ReportType,
} from '@/types/dailySales';
export type { PaymentMode, RecentSale, ReportType } from '@/types/dailySales';

export interface ReportRow {
  id: string;
  name: string;
  value: string;
  type: Exclude<ReportType, 'ALL'>;
  date: string;
}

export const reportTypes: ReportType[] = [
  'ALL',
  'SALES SUMMARY',
  'PAYMENT SUMMARY',
  'INVENTORY SUMMARY',
  'AGENT PERFORMANCE',
];

export const recentSalesRows: RecentSale[] = [
  {
    id: 'sale-001',
    pofNumber: 'POF-040325-001',
    ggTransNo: 'GG-24001',
    date: '2025-04-03',
    memberName: 'Airyne Dytes Obalag',
    zeroOne: 'HeadEagle01',
    packageType: 'SILVER',
    bottles: 1,
    blisters: 0,
    sales: 3500,
    paymentMode: 'CASH',
    status: 'Released',
  },
  {
    id: 'sale-002',
    pofNumber: 'POF-040425-002',
    ggTransNo: 'GG-24002',
    date: '2025-04-04',
    memberName: 'Jane Cruz',
    zeroOne: 'HERA01',
    packageType: 'GOLD',
    bottles: 3,
    blisters: 0,
    sales: 10500,
    paymentMode: 'BANK',
    status: 'Released',
  },
  {
    id: 'sale-003',
    pofNumber: 'POF-040525-003',
    ggTransNo: 'GG-24003',
    date: '2025-04-05',
    memberName: 'Mark Villanueva',
    zeroOne: 'Romar01',
    packageType: 'RETAIL',
    bottles: 2,
    blisters: 0,
    sales: 7000,
    paymentMode: 'EWALLET',
    status: 'To Follow',
  },
  {
    id: 'sale-004',
    pofNumber: 'POF-040625-004',
    ggTransNo: 'GG-24004',
    date: '2025-04-06',
    memberName: 'Leah Santos',
    zeroOne: 'Ironman',
    packageType: 'BLISTER',
    bottles: 0,
    blisters: 8,
    sales: 3200,
    paymentMode: 'MAYA(ATC)',
    status: 'Released',
  },
];

export const reportsRows: ReportRow[] = [
  {
    id: 'rpt-001',
    name: 'Net Sales',
    value: 'PHP 24,200',
    type: 'SALES SUMMARY',
    date: '2025-04-03',
  },
  {
    id: 'rpt-002',
    name: 'Gross Sales',
    value: 'PHP 27,800',
    type: 'SALES SUMMARY',
    date: '2025-04-04',
  },
  {
    id: 'rpt-003',
    name: 'Cash Collection',
    value: 'PHP 15,000',
    type: 'PAYMENT SUMMARY',
    date: '2025-04-05',
  },
  {
    id: 'rpt-004',
    name: 'E-Wallet Collection',
    value: 'PHP 8,600',
    type: 'PAYMENT SUMMARY',
    date: '2025-04-06',
  },
  {
    id: 'rpt-005',
    name: 'Bottle Ending Inventory',
    value: '312',
    type: 'INVENTORY SUMMARY',
    date: '2025-04-06',
  },
  {
    id: 'rpt-006',
    name: 'Top Agent Sales',
    value: 'PHP 11,900',
    type: 'AGENT PERFORMANCE',
    date: '2025-04-07',
  },
];

export const inventoryRows: InventoryRow[] = [
  {
    id: 'inv-001',
    date: '2025-04-03',
    item: 'SILVER Bottle',
    beginning: 120,
    sold: 15,
    ending: 105,
  },
  {
    id: 'inv-002',
    date: '2025-04-04',
    item: 'GOLD Bottle',
    beginning: 98,
    sold: 9,
    ending: 89,
  },
  {
    id: 'inv-003',
    date: '2025-04-05',
    item: 'RETAIL Bottle',
    beginning: 210,
    sold: 21,
    ending: 189,
  },
  {
    id: 'inv-004',
    date: '2025-04-06',
    item: 'BLISTER Pack',
    beginning: 340,
    sold: 42,
    ending: 298,
  },
  {
    id: 'inv-005',
    date: '2025-04-07',
    item: 'SILVER Bottle',
    beginning: 105,
    sold: 13,
    ending: 92,
  },
];

export const printPreviewSample: {
  transaction: PrintTransaction;
  lineItems: PrintLineItem[];
} = {
  transaction: {
    date: '2025-04-06',
    pofNumber: 'POF-040625-004',
    customer: 'Leah Santos',
    ggTransNo: 'GG-24004',
    modeOfPayment: 'MAYA(ATC)',
    encoder: 'HeadEagle01',
  },
  lineItems: [
    {
      id: 'pli-001',
      productPackage: 'SILVER PACKAGE',
      srp: 3500,
      discount: 300,
      discountedPrice: 3200,
      quantity: 1,
      amount: 3200,
      releasedBottle: 1,
      releasedBlister: 0,
      balanceBottle: 0,
      balanceBlister: 0,
    },
    {
      id: 'pli-002',
      productPackage: 'BLISTER PACK',
      srp: 400,
      discount: 0,
      discountedPrice: 400,
      quantity: 8,
      amount: 3200,
      releasedBottle: 0,
      releasedBlister: 8,
      balanceBottle: 0,
      balanceBlister: 0,
    },
    {
      id: 'pli-003',
      productPackage: 'RETAIL BOTTLE',
      srp: 3500,
      discount: 200,
      discountedPrice: 3300,
      quantity: 1,
      amount: 3300,
      releasedBottle: 1,
      releasedBlister: 0,
      balanceBottle: 0,
      balanceBlister: 0,
    },
  ],
};
