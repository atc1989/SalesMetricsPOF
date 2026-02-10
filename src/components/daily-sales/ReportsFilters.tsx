import { Button } from '@/components/ui/Button';
import type { ReportType } from '../../lib/mock/dailySales';

type ReportsFiltersProps = {
  reportType: ReportType;
  startDate: string;
  endDate: string;
  searchQuery: string;
  reportTypes: ReportType[];
  onReportTypeChange: (value: ReportType) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onSearchQueryChange: (value: string) => void;
  onGenerateReport: () => void;
};

export default function ReportsFilters({
  reportType,
  startDate,
  endDate,
  searchQuery,
  reportTypes,
  onReportTypeChange,
  onStartDateChange,
  onEndDateChange,
  onSearchQueryChange,
  onGenerateReport,
}: ReportsFiltersProps) {
  return (
    <div className="mb-4 grid gap-2 rounded-md border border-gray-200 bg-white p-3 md:grid-cols-5">
      <label className="flex flex-col text-xs font-medium text-gray-700">
        REPORT TYPE
        <select
          id="ddlReportType"
          value={reportType}
          onChange={(event) => onReportTypeChange(event.target.value as ReportType)}
          className="mt-1 rounded border border-gray-300 px-2 py-1 text-sm"
        >
          {reportTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col text-xs font-medium text-gray-700">
        FROM
        <input
          id="rpt-start-date"
          type="date"
          value={startDate}
          onChange={(event) => onStartDateChange(event.target.value)}
          className="mt-1 rounded border border-gray-300 px-2 py-1 text-sm"
        />
      </label>

      <label className="flex flex-col text-xs font-medium text-gray-700">
        TO
        <input
          id="rpt-end-date"
          type="date"
          value={endDate}
          onChange={(event) => onEndDateChange(event.target.value)}
          className="mt-1 rounded border border-gray-300 px-2 py-1 text-sm"
        />
      </label>

      <label className="flex flex-col text-xs font-medium text-gray-700">
        SEARCH
        <input
          id="tblSalesReportSearch"
          type="text"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder="Search report item"
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
