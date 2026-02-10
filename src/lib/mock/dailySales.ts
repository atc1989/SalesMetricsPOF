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
  | 'AR(CSA)';

export interface RecentSale {
  invoice: string;
  date: string;
  customer: string;
  zeroOne: string;
  packageType: string;
  bottles: number;
  blisters: number;
  sales: number;
  paymentMode: Exclude<PaymentMode, 'ALL'>;
  status: 'Released' | 'To Follow';
}

export const recentSalesRows: RecentSale[] = [
  {
    invoice: 'POF-040325-001',
    date: '2025-04-03',
    customer: 'Airyne Dytes Obalag',
    zeroOne: 'HeadEagle01',
    packageType: 'SILVER',
    bottles: 1,
    blisters: 0,
    sales: 3500,
    paymentMode: 'CASH',
    status: 'Released',
  },
  {
    invoice: 'POF-040425-002',
    date: '2025-04-04',
    customer: 'Jane Cruz',
    zeroOne: 'HERA01',
    packageType: 'GOLD',
    bottles: 3,
    blisters: 0,
    sales: 10500,
    paymentMode: 'BANK',
    status: 'Released',
  },
  {
    invoice: 'POF-040525-003',
    date: '2025-04-05',
    customer: 'Mark Villanueva',
    zeroOne: 'Romar01',
    packageType: 'RETAIL',
    bottles: 2,
    blisters: 0,
    sales: 7000,
    paymentMode: 'EWALLET',
    status: 'To Follow',
  },
  {
    invoice: 'POF-040625-004',
    date: '2025-04-06',
    customer: 'Leah Santos',
    zeroOne: 'Ironman',
    packageType: 'BLISTER',
    bottles: 0,
    blisters: 8,
    sales: 3200,
    paymentMode: 'MAYA(ATC)',
    status: 'Released',
  },
];
