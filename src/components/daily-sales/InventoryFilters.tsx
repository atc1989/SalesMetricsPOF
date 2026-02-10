import { Button } from '@/components/ui/Button';

type InventoryFiltersProps = {
  transDateFrom: string;
  transDateTo: string;
  searchQuery: string;
  onTransDateFromChange: (value: string) => void;
  onTransDateToChange: (value: string) => void;
  onSearchQueryChange: (value: string) => void;
  onGenerateReport: () => void;
};

export default function InventoryFilters({
  transDateFrom,
  transDateTo,
  searchQuery,
  onTransDateFromChange,
  onTransDateToChange,
  onSearchQueryChange,
  onGenerateReport,
}: InventoryFiltersProps) {
  return (
    <div className="mb-4 grid gap-2 rounded-md border border-gray-200 bg-white p-3 md:grid-cols-4">
      <label className="flex flex-col text-xs font-medium text-gray-700">
        FROM
        <input
          id="inv-start-date"
          type="date"
          value={transDateFrom}
          onChange={(event) => onTransDateFromChange(event.target.value)}
          className="mt-1 rounded border border-gray-300 px-2 py-1 text-sm"
        />
      </label>

      <label className="flex flex-col text-xs font-medium text-gray-700">
        TO
        <input
          id="inv-end-date"
          type="date"
          value={transDateTo}
          onChange={(event) => onTransDateToChange(event.target.value)}
          className="mt-1 rounded border border-gray-300 px-2 py-1 text-sm"
        />
      </label>

      <label className="flex flex-col text-xs font-medium text-gray-700">
        SEARCH
        <input
          id="tblDailyInventorySearch"
          type="text"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder="Search inventory item"
          className="mt-1 rounded border border-gray-300 px-2 py-1 text-sm"
        />
      </label>

      <div className="flex items-end">
        <Button className="w-full md:w-auto" onClick={onGenerateReport}>
          Generate Report
        </Button>
      </div>
    </div>
  );
}
