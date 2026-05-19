// @deprecated — use shadcn Table primitives directly: import { Table, TableBody,
// TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table".
// For complex data tables consider pairing with @tanstack/react-table (already
// installed).
//
// Compat wrapper over shadcn Table. Preserves the legacy columns/data/emptyMessage
// API used by 3 existing call sites in salesmetrics. This wrapper already renders the
// real shadcn Table primitives — no behavioral difference between using it and using
// Table directly. Migrate call sites incrementally; once all are migrated, delete
// this file.

import { ReactNode } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="app-table-scroll">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              {columns.map((column) => (
                <TableHead key={String(column.key)} className={column.className}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-8 text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={row.id}>
                  {columns.map((column) => (
                    <TableCell key={`${String(row.id)}-${String(column.key)}`} className={column.className}>
                      {column.render ? column.render(row[column.key], row) : String(row[column.key])}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
