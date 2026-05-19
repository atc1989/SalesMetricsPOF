"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/AuthContext";
import { getUserDisplayName } from "@/lib/auth/userDisplayName";
import { listBills, listBillsForExport } from "@/services/bills.service";
import type { BillStatus } from "@/types/billing";
import {
  exportBillsToCSV,
  exportBillsToExcel,
  exportBillsToPDF,
} from "@/utils/billsExport";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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

type BillRow = {
  id: string;
  request_date: string;
  reference_no: string;
  vendor?: { id: string; name: string };
  payment_method?: string;
  payment_methods: string[];
  categories?: string[];
  priority_level: string;
  total_amount: number;
  status: string;
  created_by: string;
  remarks?: string | null;
};

type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "warning"
  | "neutral";

export function BillsPage() {
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [bills, setBills] = useState<BillRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"csv" | "xlsx" | "pdf" | null>(null);
  const { user } = useAuth();
  const currentUserDisplayName = getUserDisplayName(user);
  const router = useRouter();

  const tabs = ["All", "Draft", "Awaiting Approval", "Rejected", "Approved", "Paid", "Void"];

  const statusFilter = useMemo<BillStatus | undefined>(() => {
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

  const getStatusVariant = (status: string): BadgeVariant => {
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

  const getPriorityVariant = (priority: string): BadgeVariant => {
    switch (priority) {
      case "urgent":
        return "destructive";
      case "high":
        return "warning";
      case "standard":
        return "secondary";
      case "low":
        return "neutral";
      default:
        return "neutral";
    }
  };

  const formatStatus = (status: string) => {
    switch (status) {
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
        return status;
    }
  };

  const formatPriority = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "Urgent";
      case "high":
        return "High";
      case "standard":
        return "Standard";
      case "low":
        return "Low";
      default:
        return priority;
    }
  };

  const formatPaymentMethod = (method: string) => {
    switch (method) {
      case "bank_transfer":
        return "Bank Transfer";
      case "check":
        return "Check";
      case "cash":
        return "Cash";
      case "other":
        return "Other";
      default:
        return method;
    }
  };

  const renderChips = (labels: string[]) => {
    const visible = labels.slice(0, 2);
    const extra = labels.length - visible.length;
    if (labels.length === 0) return <span className="text-sm text-muted-foreground">—</span>;
    return (
      <div className="flex flex-wrap gap-1.5" title={labels.join(", ")}>
        {visible.map((label) => (
          <Badge key={label} variant="neutral">
            {label}
          </Badge>
        ))}
        {extra > 0 && <Badge variant="outline">+{extra}</Badge>}
      </div>
    );
  };

  const renderPaymentMethods = (methods: string[]) => {
    const labels = Array.from(new Set(methods.filter(Boolean))).map(formatPaymentMethod);
    return renderChips(labels);
  };

  const renderCategories = (categories: string[] = []) => {
    const labels = Array.from(
      new Set(categories.map((value) => value.trim()).filter(Boolean)),
    );
    return renderChips(labels);
  };

  useEffect(() => {
    document.title = "Bills | GuildLedger";
  }, []);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setErrorMessage(null);

    listBills({
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
          setBills([]);
          setTotalCount(0);
        } else {
          setBills(result.data as BillRow[]);
          setTotalCount(result.count);
        }
      })
      .catch((error) => {
        if (!isMounted) return;
        setErrorMessage(error.message || "Failed to load bills.");
        setBills([]);
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

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const fetchBillsForExport = async () => {
    const result = await listBillsForExport({
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

  const getFilterSummary = () => {
    const filters: string[] = [];
    if (activeTab !== "All") filters.push(`Status: ${activeTab}`);
    if (searchQuery.trim()) filters.push(`Search: ${searchQuery.trim()}`);
    if (dateFrom) filters.push(`From: ${dateFrom}`);
    if (dateTo) filters.push(`To: ${dateTo}`);
    return filters.length ? filters.join(" | ") : "All records";
  };

  const handleExport = async (type: "csv" | "xlsx" | "pdf") => {
    setExporting(type);
    try {
      const exportBills = await fetchBillsForExport();
      if (!exportBills.length) {
        toast.error("No rows to export");
        return;
      }

      if (type === "csv") exportBillsToCSV(exportBills);
      if (type === "xlsx") exportBillsToExcel(exportBills);
      if (type === "pdf") exportBillsToPDF(exportBills, { filters: getFilterSummary() });

      toast.success(`Exported ${exportBills.length} rows`);
    } catch (error) {
      console.error(error);
      toast.error("Export failed");
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Payment Requests</h1>
          <p className="text-sm text-muted-foreground">View and manage payment requests</p>
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
          <Button onClick={() => router.push("/bills/new")}>
            <Plus data-icon="inline-start" />
            New Bill
          </Button>
        </div>
      </div>

      {/* Status Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value);
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
                  placeholder="Search by vendor, reference, or purpose summary"
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

      {/* Bills Table */}
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
      ) : bills.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Reference No.</TableHead>
                    <TableHead>Payee / Vendor</TableHead>
                    <TableHead>Purpose Summary</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bills.map((bill) => (
                    <TableRow key={bill.id}>
                      <TableCell className="whitespace-nowrap text-sm">{bill.request_date}</TableCell>
                      <TableCell className="font-medium">{bill.reference_no}</TableCell>
                      <TableCell>{bill.vendor?.name || "—"}</TableCell>
                      <TableCell className="max-w-xs text-sm text-muted-foreground">
                        <span className="line-clamp-2">{bill.remarks || "—"}</span>
                      </TableCell>
                      <TableCell>
                        {renderPaymentMethods(
                          bill.payment_methods?.length
                            ? bill.payment_methods
                            : bill.payment_method
                              ? [bill.payment_method]
                              : [],
                        )}
                      </TableCell>
                      <TableCell>{renderCategories(bill.categories)}</TableCell>
                      <TableCell>
                        <Badge variant={getPriorityVariant(bill.priority_level)}>
                          {formatPriority(bill.priority_level)}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right font-semibold">
                        ₱
                        {Number(bill.total_amount).toLocaleString("en-PH", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(bill.status)}>
                          {formatStatus(bill.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {bill.created_by === user?.id
                          ? currentUserDisplayName
                          : bill.created_by}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="link"
                          className="px-0"
                          onClick={() => router.push(`/bills/${bill.id}`)}
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
                currentRangeCount={bills.length}
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
            <EmptyTitle>No payment requests found</EmptyTitle>
            <EmptyDescription>
              Try adjusting your filters or create a new bill.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => router.push("/bills/new")}>
              <Plus data-icon="inline-start" />
              Create New Bill
            </Button>
          </EmptyContent>
        </Empty>
      )}
    </div>
  );
}
