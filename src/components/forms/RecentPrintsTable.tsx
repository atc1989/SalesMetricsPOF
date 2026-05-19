import React from "react";

import type { FormType, RecentPrintRow } from "@/services/formPrintTracking.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type RecentPrintsTableProps = {
  formType: FormType;
  rows: RecentPrintRow[];
  onLoad: (submissionId: string) => void;
};

const getPayload = (row: RecentPrintRow) => {
  const direct = row.form_submissions as { payload?: Record<string, unknown> } | undefined;
  if (direct && !Array.isArray(direct)) return direct.payload ?? {};
  const array = row.form_submissions as Array<{ payload?: Record<string, unknown> }> | undefined;
  return array?.[0]?.payload ?? {};
};

const formatPrintedAt = (value: string | null) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return value;
  return parsed.toLocaleString();
};

const getRowSummary = (formType: FormType, payload: Record<string, unknown>) => {
  if (formType === "ER") {
    const title =
      (payload.eventTitle as string) ||
      (payload.event_title as string) ||
      (payload.title as string) ||
      "—";
    const date =
      (payload.eventDate as string) ||
      (payload.event_date as string) ||
      (payload.date as string) ||
      "—";
    return { colA: title, colB: date };
  }

  if (formType === "SC") {
    const details =
      (payload.eventDetails as string) ||
      (payload.event_details as string) ||
      "—";
    const date =
      (payload.eventDate as string) ||
      (payload.event_date as string) ||
      "—";
    return { colA: details, colB: date };
  }

  const rows = (payload.rows as Array<Record<string, unknown>>) || [];
  const firstRow =
    rows.find(
      (row) =>
        (row.leaderName as string) ||
        (row.guestName as string) ||
        (row.leader_name as string) ||
        (row.guest_name as string),
    ) ?? {};
  const leader =
    (firstRow.leaderName as string) ||
    (firstRow.leader_name as string) ||
    "—";
  const guest =
    (firstRow.guestName as string) ||
    (firstRow.guest_name as string) ||
    "—";
  return { colA: leader, colB: guest };
};

const getColumns = (formType: FormType) => {
  if (formType === "ER") return { colA: "Event Title", colB: "Event Date" };
  if (formType === "SC") return { colA: "Event Details", colB: "Event Date" };
  return { colA: "Leader Name", colB: "Guest Name" };
};

export function RecentPrintsTable({ formType, rows, onLoad }: RecentPrintsTableProps) {
  const columns = getColumns(formType);

  return (
    <Card className="no-print">
      <CardHeader>
        <CardTitle>Recent Prints</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference No</TableHead>
                <TableHead>Printed At</TableHead>
                <TableHead>{columns.colA}</TableHead>
                <TableHead>{columns.colB}</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    No prints yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const payload = getPayload(row);
                  const summary = getRowSummary(formType, payload);
                  const canLoad = Boolean(row.submission_id);
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.reference_no ?? "—"}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatPrintedAt(row.printed_at)}
                      </TableCell>
                      <TableCell>{summary.colA || "—"}</TableCell>
                      <TableCell>{summary.colB || "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="link"
                          size="sm"
                          className="px-0"
                          onClick={() => row.submission_id && onLoad(row.submission_id)}
                          disabled={!canLoad}
                        >
                          Load
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
