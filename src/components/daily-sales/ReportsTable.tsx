import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { ReportRow } from "@/types/dailySales";

type ReportsTableProps = {
  rows: ReportRow[];
  onPreview: () => void;
};

export function ReportsTable({ rows, onPreview }: ReportsTableProps) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="secondary" onClick={onPreview}>
          Print Preview
        </Button>
      </div>
      <DataTable
        data={rows}
        columns={[
          { key: "name", header: "Report Item" },
          { key: "type", header: "Type" },
          { key: "date", header: "Date" },
          { key: "value", header: "Value" },
        ]}
      />
    </div>
  );
}
