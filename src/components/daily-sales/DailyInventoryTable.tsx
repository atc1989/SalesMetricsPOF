import { DataTable } from "@/components/ui/DataTable";
import { InventoryRow } from "@/types/dailySales";

type DailyInventoryTableProps = {
  rows: InventoryRow[];
};

export function DailyInventoryTable({ rows }: DailyInventoryTableProps) {
  return (
    <DataTable
      data={rows}
      columns={[
        { key: "date", header: "Date" },
        { key: "item", header: "Item" },
        { key: "beginning", header: "Beginning" },
        { key: "sold", header: "Sold" },
        { key: "ending", header: "Ending" },
      ]}
    />
  );
}
