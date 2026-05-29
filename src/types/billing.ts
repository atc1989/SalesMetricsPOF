export type BudgetStatus =
  | "draft"
  | "awaiting_approval"
  | "rejected"
  | "approved"
  | "paid"
  | "void";

export type PriorityLevel = "urgent" | "high" | "standard" | "low";

export type PaymentMethod = "bank_transfer" | "check" | "cash" | "other";

export interface Vendor {
  id: string;
  name: string;
  address?: string | null;
}

export interface Budget {
  id: string;
  vendor_id: string;
  reference_no: string;
  request_date: string;
  priority_level: PriorityLevel;
  payment_method: PaymentMethod;
  bank_name?: string | null;
  bank_account_name?: string | null;
  bank_account_no?: string | null;
  status: BudgetStatus;
  remarks?: string | null;
  rejection_reason?: string | null;
  total_amount: number;
  created_by: string;
  created_at?: string;
  updated_at?: string;
}

export interface BudgetBreakdown {
  id?: string;
  bill_id: string;
  payment_method: PaymentMethod;
  category?: string | null;
  description?: string | null;
  amount: number;
  bank_name?: string | null;
  bank_account_name?: string | null;
  bank_account_no?: string | null;
}

export interface BudgetAttachment {
  id: string;
  bill_id: string;
  file_path: string;
  file_name: string;
  mime_type?: string | null;
  file_size?: number | null;
  uploaded_by?: string | null;
  created_at?: string;
}

export interface BudgetDetails {
  Budget: Budget;
  vendor: Vendor;
  breakdowns: BudgetBreakdown[];
  attachments: BudgetAttachment[];
}

export type PcfTransactionType =
  | "beginning_balance"
  | "replenishment"
  | "expense";

export type PcfTransactionStatus =
  | "draft"
  | "awaiting_approval"
  | "rejected"
  | "approved"
  | "paid"
  | "void";

export interface PcfTransaction {
  id: string;
  date: string;
  pcv_number: string | null;
  payee: string | null;
  invoice_no: string | null;
  description: string | null;
  amount_in: number;
  amount_out: number;
  balance: number;
  transaction_type: PcfTransactionType;
  status: PcfTransactionStatus;
  is_liquidated: boolean;
  liquidated_at?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PcfQueryParams {
  search?: string;
  type?: Exclude<PcfTransactionType, "beginning_balance"> | PcfTransactionType;
  status?: PcfTransactionStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
  offset?: number;
  limit?: number;
}

export interface PcfSummary {
  beginningBalance: number;
  totalIn: number;
  totalOut: number;
  endingBalance: number;
}
