import type { PaymentMode } from '../../lib/mock/dailySales';

type DashboardFiltersProps = {
  fromDate: string;
  toDate: string;
  paymentMode: PaymentMode;
  searchQuery: string;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
  onPaymentModeChange: (value: PaymentMode) => void;
  onSearchQueryChange: (value: string) => void;
};

const paymentModes: PaymentMode[] = [
  'ALL',
  'CASH',
  'BANK',
  'MAYA(IGI)',
  'MAYA(ATC)',
  'SBCOLLECT(IGI)',
  'SBCOLLECT(ATC)',
  'EWALLET',
  'CHEQUE',
  'EPOINTS',
  'CONSIGNMENT',
  'AR(CSA)',
];

export default function DashboardFilters({
  fromDate,
  toDate,
  paymentMode,
  searchQuery,
  onFromDateChange,
  onToDateChange,
  onPaymentModeChange,
  onSearchQueryChange,
}: DashboardFiltersProps) {
  return (
    <div className="mb-4 grid gap-2 rounded-md border border-gray-200 bg-white p-3 md:grid-cols-4">
      <label className="flex flex-col text-xs font-medium text-gray-700">
        FROM
        <input
          id="db-start-date"
          type="date"
          value={fromDate}
          onChange={(event) => onFromDateChange(event.target.value)}
          className="mt-1 rounded border border-gray-300 px-2 py-1 text-sm"
        />
      </label>

      <label className="flex flex-col text-xs font-medium text-gray-700">
        TO
        <input
          id="db-end-date"
          type="date"
          value={toDate}
          onChange={(event) => onToDateChange(event.target.value)}
          className="mt-1 rounded border border-gray-300 px-2 py-1 text-sm"
        />
      </label>

      <label className="flex flex-col text-xs font-medium text-gray-700">
        MODE OF PAYMENT
        <select
          id="dbPaymentMode"
          value={paymentMode}
          onChange={(event) => onPaymentModeChange(event.target.value as PaymentMode)}
          className="mt-1 rounded border border-gray-300 px-2 py-1 text-sm"
        >
          {paymentModes.map((mode) => (
            <option key={mode} value={mode}>
              {mode}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col text-xs font-medium text-gray-700">
        SEARCH
        <input
          id="tblSalesTodaySearch"
          type="text"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder="Search invoice or customer"
          className="mt-1 rounded border border-gray-300 px-2 py-1 text-sm"
        />
      </label>
    </div>
  );
}
