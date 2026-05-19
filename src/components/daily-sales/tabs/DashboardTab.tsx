"use client";

import { useEffect, useMemo, useState } from "react";

import { Search } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMemberName, formatPofNumber, formatZeroOne } from "@/lib/dailySalesDisplay";
import type { PaymentMode, RecentSale } from "@/types/dailySales";

const paymentModes: PaymentMode[] = [
  "ALL",
  "CASH",
  "BANK",
  "MAYA(IGI)",
  "MAYA(ATC)",
  "SBCOLLECT(IGI)",
  "SBCOLLECT(ATC)",
  "EWALLET",
  "CHEQUE",
  "EPOINTS",
  "CONSIGNMENT",
  "AR(CSA)",
];

const validPaymentModes: Array<RecentSale["paymentMode"]> = [
  "CASH",
  "BANK",
  "MAYA(IGI)",
  "MAYA(ATC)",
  "SBCOLLECT(IGI)",
  "SBCOLLECT(ATC)",
  "EWALLET",
  "CHEQUE",
  "EPOINTS",
  "CONSIGNMENT",
  "AR(CSA)",
  "AR(LEADERSUPPORT)",
];

function normalizePaymentMode(value: string | null): RecentSale["paymentMode"] {
  if (!value) return "CASH";
  if (validPaymentModes.includes(value as RecentSale["paymentMode"])) {
    return value as RecentSale["paymentMode"];
  }
  return "CASH";
}

const sortRecentSalesAscending = (input: RecentSale[]) =>
  [...input].sort(
    (left, right) =>
      left.pofNumber.localeCompare(right.pofNumber) ||
      left.date.localeCompare(right.date) ||
      left.memberName.localeCompare(right.memberName),
  );

export function DashboardTab() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [pendingFromDate, setPendingFromDate] = useState(today);
  const [pendingToDate, setPendingToDate] = useState(today);
  const [pendingPaymentMode, setPendingPaymentMode] = useState<PaymentMode>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rows, setRows] = useState<RecentSale[]>([]);
  const [totals, setTotals] = useState({
    totalSales: 0,
    totalBottles: 0,
    totalBlisters: 0,
    totalTransactions: 0,
    newMembers: 0,
  });

  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("ALL");

  useEffect(() => {
    const controller = new AbortController();

    async function loadDailySales() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const params = new URLSearchParams({
          dateFrom: fromDate,
          dateTo: toDate,
          modeOfPayment: paymentMode,
        });
        const response = await fetch(`/api/daily-sales/today?${params.toString()}`, {
          signal: controller.signal,
        });
        const payload = (await response.json()) as {
          success: boolean;
          rows?: Array<{
            daily_sales_id: number | string | null;
            trans_date: string | null;
            pof_number: string | null;
            member_name: string | null;
            username: string | null;
            package_type: string | null;
            bottle_count: number;
            blister_count: number;
            sales: number;
            mode_of_payment: string | null;
          }>;
          totals?: {
            totalSales: number;
            totalBottles: number;
            totalBlisters: number;
            totalTransactions: number;
            newMembers: number;
          };
          message?: string;
        };

        if (!response.ok || !payload.success || !payload.rows) {
          throw new Error(payload.message ?? "Failed to load daily sales.");
        }

        const mappedRows: RecentSale[] = payload.rows.map((row, index) => ({
          id: String(row.daily_sales_id ?? `daily-sales-${index + 1}`),
          pofNumber: formatPofNumber(row.pof_number),
          ggTransNo: formatZeroOne(row.username),
          date: row.trans_date ?? "",
          memberName: formatMemberName(row.member_name),
          zeroOne: formatZeroOne(row.username),
          packageType: row.package_type ?? "",
          bottles: row.bottle_count ?? 0,
          blisters: row.blister_count ?? 0,
          sales: row.sales ?? 0,
          paymentMode: normalizePaymentMode(row.mode_of_payment),
          status: "Released",
        }));

        setRows(mappedRows);
        if (payload.totals) setTotals(payload.totals);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        setErrorMessage("Failed to load daily sales.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadDailySales();

    return () => {
      controller.abort();
    };
  }, [fromDate, toDate, paymentMode]);

  const filteredRows = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();

    return sortRecentSalesAscending(
      rows.filter((row) => {
        if (
          search &&
          !row.pofNumber.toLowerCase().includes(search) &&
          !row.memberName.toLowerCase().includes(search) &&
          !row.ggTransNo.toLowerCase().includes(search) &&
          !row.paymentMode.toLowerCase().includes(search)
        ) {
          return false;
        }
        return true;
      }),
    );
  }, [rows, searchQuery]);

  const totalSales = filteredRows.reduce((sum, row) => sum + row.sales, 0);
  const totalOrders = filteredRows.length;
  const totalNewMembers = totals.newMembers;
  const totalBottles = filteredRows.reduce((sum, row) => sum + row.bottles, 0);
  const totalBlisters = filteredRows.reduce((sum, row) => sum + row.blisters, 0);

  const onApply = () => {
    setFromDate(pendingFromDate);
    setToDate(pendingToDate);
    setPaymentMode(pendingPaymentMode);
  };

  const onExportCsv = () => {
    const headers = [
      "POF Number",
      "Date",
      "Member Name",
      "Zero One",
      "Package",
      "Bottles",
      "Blisters",
      "Sales",
      "Mode of Payment",
      "Status",
    ];
    const toCsv = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const lines = [
      headers.map((header) => toCsv(header)).join(","),
      ...filteredRows.map((row) =>
        [
          row.pofNumber,
          row.date,
          row.memberName,
          row.zeroOne,
          row.packageType,
          row.bottles,
          row.blisters,
          row.sales,
          row.paymentMode,
          row.status,
        ]
          .map((value) => toCsv(value))
          .join(","),
      ),
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = "recent-sales.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const kpiCards = [
    { label: "Total Sales", value: `PHP ${totalSales.toLocaleString()}` },
    { label: "Total Orders", value: totalOrders.toLocaleString() },
    { label: "New Members", value: totalNewMembers.toLocaleString() },
    { label: "Total Bottles Sold", value: totalBottles.toLocaleString() },
    { label: "Total Blister Sold", value: totalBlisters.toLocaleString() },
  ];

  return (
    <section className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Narrow down the daily sales view.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto_1.25fr] lg:items-end">
              <Field>
                <FieldLabel htmlFor="db-start-date">From</FieldLabel>
                <DatePicker
                  id="db-start-date"
                  value={pendingFromDate}
                  onChange={setPendingFromDate}
                  placeholder="Start date"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="db-end-date">To</FieldLabel>
                <DatePicker
                  id="db-end-date"
                  value={pendingToDate}
                  onChange={setPendingToDate}
                  placeholder="End date"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="dbPaymentMode">Mode of Payment</FieldLabel>
                <Select
                  value={pendingPaymentMode}
                  onValueChange={(value) => setPendingPaymentMode(value as PaymentMode)}
                >
                  <SelectTrigger id="dbPaymentMode" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentModes.map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        {mode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <Button
                  id="db-apply-custom-date"
                  className="w-full lg:w-auto"
                  onClick={onApply}
                >
                  Apply
                </Button>
              </Field>

              <Field>
                <FieldLabel htmlFor="tblSalesTodaySearch">Search</FieldLabel>
                <InputGroup>
                  <InputGroupAddon>
                    <Search />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="tblSalesTodaySearch"
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search table…"
                  />
                </InputGroup>
              </Field>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {kpiCards.map((card) => (
          <Card key={card.label}>
            <CardHeader>
              <CardDescription>{card.label}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{card.value}</CardTitle>
            </CardHeader>
            <CardContent />
          </Card>
        ))}
      </div>

      {/* Recent Sales */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Recent Sales</CardTitle>
          <Button size="sm" onClick={onExportCsv}>
            Excel
          </Button>
        </CardHeader>
        <CardContent className="overflow-hidden p-0">
          {errorMessage ? (
            <div className="px-4 pb-4">
              <Alert variant="destructive">
                <AlertTitle>Could not load daily sales</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            </div>
          ) : null}

          {isLoading ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="p-4">
              <Empty className="border-0">
                <EmptyHeader>
                  <EmptyTitle>No recent sales</EmptyTitle>
                  <EmptyDescription>
                    No recent sales found for the selected filters.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>POF Number</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Member Name</TableHead>
                    <TableHead>Zero One</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead className="text-right">Bottles</TableHead>
                    <TableHead className="text-right">Blisters</TableHead>
                    <TableHead className="text-right">Sales</TableHead>
                    <TableHead>Mode of Payment</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.pofNumber}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{row.date}</TableCell>
                      <TableCell>{row.memberName}</TableCell>
                      <TableCell>{row.zeroOne}</TableCell>
                      <TableCell>{row.packageType}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.bottles}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.blisters}</TableCell>
                      <TableCell className="whitespace-nowrap text-right font-semibold tabular-nums">
                        PHP {row.sales.toLocaleString()}
                      </TableCell>
                      <TableCell>{row.paymentMode}</TableCell>
                      <TableCell>{row.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
