import { ReactNode } from "react";

export type ColumnDef<T> = {
  key: keyof T;
  header: string;
  className?: string;
  render?: (value: T[keyof T], row: T) => ReactNode;
};

type DataTableProps<T extends { id: string | number }> = {
  columns: ColumnDef<T>[];
  data: T[];
  emptyMessage?: string;
};

export function DataTable<T extends { id: string | number }>({
  columns,
  data,
  emptyMessage = "No records found.",
}: DataTableProps<T>) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="app-table-scroll">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((column) => (
                <th key={String(column.key)} className={`border-b border-slate-200 px-4 py-3 text-left font-semibold text-slate-700 ${column.className ?? ""}`}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  {columns.map((column) => (
                    <td key={`${String(row.id)}-${String(column.key)}`} className={`border-b border-slate-100 px-4 py-3 text-slate-700 ${column.className ?? ""}`}>
                      {column.render ? column.render(row[column.key], row) : String(row[column.key])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
