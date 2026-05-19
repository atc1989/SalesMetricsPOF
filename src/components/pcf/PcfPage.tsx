"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownRight,
  ArrowUpRight,
  FileText,
  Loader2,
  Plus,
  Scale,
  Search,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import {
  getPcfSummary,
  listPcfTransactions,
  listPcfTransactionsForExport,
} from "@/services/pcf.service";
import type {
  PcfSummary,
  PcfTransaction,
  PcfTransactionStatus,
  PcfTransactionType,
} from "@/types/billing";
import {
  exportPcfToCSV,
  exportPcfToExcel,
  exportPcfToPDF,
  formatPeso as formatExportPeso,
  type PcfExportFilterSummary,
} from "@/utils/pcfExport";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import { DataPagination } from "@/components/ui/data-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ExportType = "csv" | "xlsx" | "pdf";

type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "warning"
  | "neutral";

const tabs = [
  "All",
  "Draft",
  "Awaiting Approval",
  "Rejected",
  "Approved",
  "Paid",
  "Void",
] as const;

type PcfTab = (typeof tabs)[number];

const formatTransactionType = (value: PcfTransactionType) => {
  switch (value) {
    case "beginning_balance":
      return "Beginning Balance";
    case "replenishment":
      return "Replenishment";
    case "expense":
      return "Expense";
    default:
      return value;
  }
};

const formatStatus = (value: PcfTransactionStatus) => {
  switch (value) {
    case "draft":
      return "Draft";
    case "awaiting_approval":
      return "Awaiting Approval";
    case "rejected":
      return "Rejected";
    case "approved":
      return "Approved";
    case "paid":
      return "Paid";
    case "void":
      return "Void";
    default:
      return value;
  }
};

const formatPeso = (amount: number) =>
  `₱${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const getDisplayValue = (value?: string | null) => {
  const normalized = (value ?? "").trim();
  return normalized || "—";
};

const getStatusVariant = (status: PcfTransactionStatus): BadgeVariant => {
  switch (status) {
    case "draft":
      return "neutral";
    case "awaiting_approval":
      return "warning";
    case "rejected":
      return "destructive";
    case "approved":
      return "secondary";
    case "paid":
      return "success";
    case "void":
      return "outline";
    default:
      return "neutral";
  }
};

const getTypeVariant = (value: PcfTransactionType): BadgeVariant => {
  switch (value) {
    case "beginning_balance":
      return "outline";
    case "replenishment":
      return "secondary";
    case "expense":
      return "warning";
    default:
      return "neutral";
  }
};

export function PcfPage() {
  const [activeTab, setActiveTab] = useState<PcfTab>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [transactions, setTransactions] = useState<PcfTransaction[]>([]);
  const [summary, setSummary] = useState<PcfSummary>({
    beginningBalance: 0,
    totalIn: 0,
    totalOut: 0,
    endingBalance: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [exporting, setExporting] = useState<ExportType | null>(null);
  const router = useRouter();

  const statusFilter = useMemo<PcfTransactionStatus | undefined>(() => {
    switch (activeTab) {
      case "Draft":
        return "draft";
      case "Awaiting Approval":
        return "awaiting_approval";
      case "Rejected":
        return "rejected";
      case "Approved":
        return "approved";
      case "Paid":
        return "paid";
      case "Void":
        return "void";
      default:
        return undefined;
    }
  }, [activeTab]);

  useEffect(() => {
    document.title = "Petty Cash Fund | GuildLedger";
  }, []);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setErrorMessage(null);

    listPcfTransactions({
      status: statusFilter,
      search: searchQuery,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page,
      pageSize,
    })
      .then((result) => {
        if (!isMounted) return;
        if (result.error) {
          setErrorMessage(result.error);
          setTransactions([]);
          setTotalCount(0);
        } else {
          setTransactions(result.data);
          setTotalCount(result.count);
        }
      })
      .catch((error) => {
        if (!isMounted) return;
        setErrorMessage(error.message || "Failed to load petty cash transactions.");
        setTransactions([]);
        setTotalCount(0);
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [statusFilter, searchQuery, dateFrom, dateTo, page, pageSize]);

  useEffect(() => {
    let isMounted = true;

    getPcfSummary({
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    })
      .then((result) => {
        if (!isMounted) return;
        if (result.error) {
          setSummary({ beginningBalance: 0, totalIn: 0, totalOut: 0, endingBalance: 0 });
          return;
        }
        setSummary(result.data);
      })
      .catch(() => {
        if (!isMounted) return;
        setSummary({ beginningBalance: 0, totalIn: 0, totalOut: 0, endingBalance: 0 });
      });

    return () => {
      isMounted = false;
    };
  }, [dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const fetchPcfForExport = async () => {
    const result = await listPcfTransactionsForExport({
      status: statusFilter,
      search: searchQuery,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    });

    if (result.error) {
      throw new Error(result.error);
    }

    return result.data;
  };

  const getFilterSummary = (
    exportTransactions: PcfTransaction[],
  ): PcfExportFilterSummary => {
    const totalIn = exportTransactions.reduce(
      (sum, t) => sum + Number(t.amount_in ?? 0),
      0,
    );
    const totalOut = exportTransactions.reduce(
      (sum, t) => sum + Number(t.amount_out ?? 0),
      0,
    );
    const endingBalance = Number(
      exportTransactions[0]?.balance ?? summary.endingBalance ?? 0,
    );

    return {
      status: activeTab === "All" ? "All" : activeTab,
      search: searchQuery.trim() || "All",
      from: dateFrom || "All",
      to: dateTo || "All",
      totalReplenishments: formatExportPeso(totalIn),
      totalExpenses: formatExportPeso(totalOut),
      endingBalance: formatExportPeso(endingBalance),
    };
  };

  const handleExport = async (type: ExportType) => {
    setExporting(type);
    try {
      const exportTransactions = await fetchPcfForExport();
      if (!exportTransactions.length) {
        toast.error("No rows to export");
        return;
      }

      if (type === "csv") exportPcfToCSV(exportTransactions);
      if (type === "xlsx") exportPcfToExcel(exportTransactions);
      if (type === "pdf") {
        exportPcfToPDF(exportTransactions, {
          filterSummary: getFilterSummary(exportTransactions),
        });
      }

      toast.success(`Exported ${exportTransactions.length} rows`);
    } catch (error) {
      console.error(error);
      toast.error("Export failed");
    } finally {
      setExporting(null);
    }
  };

  const { beginningBalance, totalReplenishments, totalExpenses, currentBalance } =
    useMemo(() => {
      const beginningBalanceRow = transactions.find(
        (t) => t.transaction_type === "beginning_balance",
      );
      const totalIn = transactions.reduce(
        (sum, t) => sum + Number(t.amount_in ?? 0),
        0,
      );
      const totalOut = transactions.reduce(
        (sum, t) => sum + Number(t.amount_out ?? 0),
        0,
      );
      const latest = transactions[0];

      return {
        beginningBalance: Number(
          beginningBalanceRow?.balance ?? summary.beginningBalance ?? 0,
        ),
        totalReplenishments: totalIn,
        totalExpenses: totalOut,
        currentBalance: Number(latest?.balance ?? summary.endingBalance ?? 0),
      };
    }, [transactions, summary.beginningBalance, summary.endingBalance]);

  const summaryCards: {
    label: string;
    value: string;
    icon: React.ComponentType<{ className?: string }>;
    hint: string;
  }[] = [
    {
      label: "Beginning Balance",
      value: formatPeso(beginningBalance),
      icon: Wallet,
      hint: "Opening balance for the current window.",
    },
    {
      label: "Total Replenishments",
      value: formatPeso(totalReplenishments),
      icon: ArrowUpRight,
      hint: "Cash added during the period.",
    },
    {
      label: "Total Expenses",
      value: formatPeso(totalExpenses),
      icon: ArrowDownRight,
      hint: "Cash paid out during the period.",
    },
    {
      label: "Current Balance",
      value: formatPeso(currentBalance),
      icon: Scale,
      hint: "Latest running balance after expenses.",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Petty Cash Fund</h1>
          <p className="text-sm text-muted-foreground">
            View and manage petty cash transactions
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("csv")}
            disabled={exporting !== null}
          >
            {exporting === "csv" ? (
              <>
                <Loader2 data-icon="inline-start" className="animate-spin" />
                Exporting…
              </>
            ) : (
              "CSV"
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("xlsx")}
            disabled={exporting !== null}
          >
            {exporting === "xlsx" ? (
              <>
                <Loader2 data-icon="inline-start" className="animate-spin" />
                Exporting…
              </>
            ) : (
              "Excel"
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("pdf")}
            disabled={exporting !== null}
          >
            {exporting === "pdf" ? (
              <>
                <Loader2 data-icon="inline-start" className="animate-spin" />
                Exporting…
              </>
            ) : (
              "PDF"
            )}
          </Button>
          <Button onClick={() => router.push("/pcf/new")}>
            <Plus data-icon="inline-start" />
            New PCV Entry
          </Button>
        </div>
      </div>

      {/* KPI summary cards (guild-vault pattern) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardHeader>
                <CardDescription className="flex items-center gap-2">
                  <Icon className="size-4" />
                  {card.label}
                </CardDescription>
                <CardTitle className="text-2xl tabular-nums">{card.value}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{card.hint}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Status Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value as PcfTab);
          setPage(1);
        }}
      >
        <TabsList className="flex flex-wrap">
          {tabs.map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <InputGroup>
                <InputGroupAddon>
                  <Search />
                </InputGroupAddon>
                <InputGroupInput
                  placeholder="Search by PCV No. or Payee"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                />
              </InputGroup>
            </div>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
            />
            <div className="flex items-center">
              <Button
                variant="link"
                className="px-0"
                onClick={() => {
                  setSearchQuery("");
                  setDateFrom("");
                  setDateTo("");
                  setPage(1);
                }}
              >
                Clear filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      {isLoading ? (
        <Card>
          <CardContent className="space-y-3 p-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </CardContent>
        </Card>
      ) : errorMessage ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-destructive">
            {errorMessage}
          </CardContent>
        </Card>
      ) : transactions.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>PCV No.</TableHead>
                    <TableHead>Payee</TableHead>
                    <TableHead>Invoice No.</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">In</TableHead>
                    <TableHead className="text-right">Out</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {getDisplayValue(transaction.date)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {getDisplayValue(transaction.pcv_number)}
                      </TableCell>
                      <TableCell>{getDisplayValue(transaction.payee)}</TableCell>
                      <TableCell className="text-sm">
                        {getDisplayValue(transaction.invoice_no)}
                      </TableCell>
                      <TableCell className="max-w-xs text-sm text-muted-foreground">
                        <span className="line-clamp-2">
                          {getDisplayValue(transaction.description)}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right tabular-nums">
                        {formatPeso(Number(transaction.amount_in ?? 0))}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right tabular-nums">
                        {formatPeso(Number(transaction.amount_out ?? 0))}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right font-semibold tabular-nums">
                        {formatPeso(Number(transaction.balance ?? 0))}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getTypeVariant(transaction.transaction_type)}>
                          {formatTransactionType(transaction.transaction_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col items-start gap-1">
                          <Badge variant={getStatusVariant(transaction.status)}>
                            {formatStatus(transaction.status)}
                          </Badge>
                          {transaction.status === "approved" &&
                            transaction.is_liquidated && (
                              <Badge variant="success">Liquidated</Badge>
                            )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="link"
                          className="px-0"
                          onClick={() => router.push(`/pcf/${transaction.id}`)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="border-t px-4 py-3">
              <DataPagination
                page={page}
                pageCount={totalPages}
                onPageChange={setPage}
                totalItems={totalCount}
                pageSize={pageSize}
                currentRangeCount={transactions.length}
                itemLabel="results"
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileText />
            </EmptyMedia>
            <EmptyTitle>No petty cash transactions found</EmptyTitle>
            <EmptyDescription>
              Try adjusting your filters or create a new PCV entry.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => router.push("/pcf/new")}>
              <Plus data-icon="inline-start" />
              Create New PCV Entry
            </Button>
          </EmptyContent>
        </Empty>
      )}
    </div>
  );
}
