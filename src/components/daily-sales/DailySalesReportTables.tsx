import { BreakdownRow } from "@/types/dailySales";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/DataTable";

type DailySalesReportTablesProps = {
  packageRows: BreakdownRow[];
  retailRows: BreakdownRow[];
  paymentRows: BreakdownRow[];
};

export function DailySalesReportTables({ packageRows, retailRows, paymentRows }: DailySalesReportTablesProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="space-y-2">
        <h3 className="text-base font-semibold text-foreground">Package Breakdown</h3>
        <DataTable
          data={packageRows}
          columns={[
            { key: "label", header: "Type" },
            { key: "amount", header: "Amount", render: (value) => `$${Number(value).toFixed(2)}` },
          ]}
        />
      </Card>
      <Card className="space-y-2">
        <h3 className="text-base font-semibold text-foreground">Retail Breakdown</h3>
        <DataTable
          data={retailRows}
          columns={[
            { key: "label", header: "Type" },
            { key: "amount", header: "Amount", render: (value) => `$${Number(value).toFixed(2)}` },
          ]}
        />
      </Card>
      <Card className="space-y-2">
        <h3 className="text-base font-semibold text-foreground">Payment Breakdown</h3>
        <DataTable
          data={paymentRows}
          columns={[
            { key: "label", header: "Method" },
            { key: "amount", header: "Amount", render: (value) => `$${Number(value).toFixed(2)}` },
          ]}
        />
      </Card>
    </div>
  );
}
