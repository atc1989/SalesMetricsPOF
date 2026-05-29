"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams, usePathname } from "next/navigation";
import {
  Download,
  Edit2,
  FileDown,
  Loader2,
  Printer,
} from "lucide-react";

import { VoidBudgetModal } from "./VoidBudgetModal";
import { ApproveRejectModal } from "./ApproveRejectModal";
import { useAuth } from "@/lib/auth/AuthContext";
import { getUserDisplayName } from "@/lib/auth/userDisplayName";
import { getBudgetById, updateBudgetStatus } from "@/services/budget.service";
import type { BudgetDetails } from "@/types/billing";
import { buildReceiptHtml as buildPrintReceiptHtml } from "@/print/receiptTemplate";
import { printReceipt } from "@/print/printReceipt";
import {
  buildA4Html,
  buildReceiptHtml as buildReceiptPdfHtml,
  type PdfTemplateData,
} from "@/pdf/pdfTemplates";
import { downloadBudgetAttachment } from "@/services/budgetAttachments.service";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "warning"
  | "neutral";

const getStatusVariant = (status?: string): BadgeVariant => {
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

const getPriorityVariant = (priority?: string): BadgeVariant => {
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

const formatStatus = (status?: string) => {
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
      return status || "—";
  }
};

const formatPriority = (priority?: string) => {
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
      return priority || "—";
  }
};

const formatPaymentMethod = (method?: string) => {
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
      return method || "—";
  }
};

const formatPeso = (value: unknown) =>
  `₱${Number(value ?? 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const maskAccountNumber = (accountNumber?: string | null) => {
  if (!accountNumber) return "—";
  if (accountNumber.length <= 4) return accountNumber;
  return "****" + accountNumber.slice(-4);
};

function roundMoney(value: unknown) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return 0;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function ViewBudgetPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string | undefined);
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [BudgetDetails, setBudgetDetails] = useState<BudgetDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [approveRejectModal, setApproveRejectModal] = useState({
    isOpen: false,
    action: "approve" as "approve" | "reject",
  });

  useEffect(() => {
    let isMounted = true;
    if (!id) {
      setIsLoading(false);
      setErrorMessage("Budget request not found.");
      return;
    }

    setIsLoading(true);
    getBudgetById(id)
      .then((result) => {
        if (!isMounted) return;
        if (result.error || !result.data) {
          setErrorMessage(result.error || "Budget request not found.");
          setBudgetDetails(null);
        } else {
          setBudgetDetails(result.data);
          setErrorMessage(null);
        }
      })
      .catch((error) => {
        if (!isMounted) return;
        setErrorMessage(error.message || "Failed to load budget request.");
        setBudgetDetails(null);
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const key = `Budget-${id}-attachmentError`;
    const stored = typeof window !== "undefined" ? sessionStorage.getItem(key) : null;
    if (stored) {
      setActionError(stored);
      sessionStorage.removeItem(key);
    }
  }, [id]);
  void pathname;

  const Budget = BudgetDetails?.Budget;
  const vendor = BudgetDetails?.vendor;
  const breakdowns = BudgetDetails?.breakdowns ?? [];
  const attachments = BudgetDetails?.attachments ?? [];

  const totalAmount = roundMoney(
    breakdowns.reduce((sum, b) => sum + roundMoney(b.amount), 0),
  );
  const resolvedTotalAmount =
    roundMoney(Budget?.total_amount) > 0 ? roundMoney(Budget?.total_amount) : totalAmount;
  const currentUserDisplayName = getUserDisplayName(user);
  const requestedByDisplay =
    Budget?.created_by === user?.id ? currentUserDisplayName : Budget?.created_by || "—";

  useEffect(() => {
    if (Budget?.reference_no) {
      document.title = `${Budget.reference_no} | GuildLedger`;
      return;
    }
    document.title = "Budget Details | GuildLedger";
  }, [Budget?.reference_no]);

  const buildPdfTemplateData = (): PdfTemplateData | null => {
    if (!Budget || !vendor) return null;
    return {
      reference_no: Budget.reference_no,
      request_date: Budget.request_date,
      status: Budget.status,
      vendor_name: vendor.name,
      requester_name: requestedByDisplay,
      checked_by: "—",
      approved_by: "—",
      breakdowns: breakdowns.map((breakdown) => ({
        description: breakdown.description,
        amount: breakdown.amount,
        payment_method: breakdown.payment_method,
        bank_name: breakdown.bank_name,
        bank_account_name: breakdown.bank_account_name,
        bank_account_no: breakdown.bank_account_no,
      })),
      total_amount: resolvedTotalAmount,
      remarks: Budget.remarks || "",
      attachments: attachments.map((a) => a.file_name),
      company_name: "GuildLedger",
    };
  };

  const handlePrintReceipt = () => {
    const templateData = buildPdfTemplateData();
    if (!templateData) return;
    const receiptHtml = buildPrintReceiptHtml(
      {
        reference_no: templateData.reference_no,
        request_date: templateData.request_date,
        status: templateData.status,
        vendor_name: templateData.vendor_name,
        requester_name: templateData.requester_name,
        breakdowns: templateData.breakdowns,
        total_amount: templateData.total_amount,
        remarks: templateData.remarks,
        company_name: templateData.company_name,
      },
      { paper: "80mm" },
    );
    printReceipt(receiptHtml);
  };

  const handleDownloadA4Pdf = async () => {
    const templateData = buildPdfTemplateData();
    if (!templateData) return;
    const { exportHtmlToPdf } = await import("@/pdf/exportPdf");
    const a4Html = buildA4Html(templateData);
    await exportHtmlToPdf({
      html: a4Html,
      filename: `PRF-${templateData.reference_no}-A4.pdf`,
      preset: "A4",
    });
  };

  const handleDownloadReceiptPdf = async () => {
    const templateData = buildPdfTemplateData();
    if (!templateData) return;
    const { exportHtmlToPdf } = await import("@/pdf/exportPdf");
    const receiptHtml = buildReceiptPdfHtml(templateData, { paper: "80mm" });
    await exportHtmlToPdf({
      html: receiptHtml,
      filename: `PRF-${templateData.reference_no}-RECEIPT-80mm.pdf`,
      preset: "RECEIPT_80",
    });
  };

  const handleApprove = () => setApproveRejectModal({ isOpen: true, action: "approve" });
  const handleReject = () => setApproveRejectModal({ isOpen: true, action: "reject" });
  const handleVoid = () => setIsVoidModalOpen(true);
  const handleEdit = () => budget && router.push(`/budget/${Budget.id}/edit`);

  const handleConfirmApproveReject = async (notes: string) => {
    if (!Budget || isUpdatingStatus) return;
    const nextStatus = approveRejectModal.action === "approve" ? "approved" : "rejected";
    setActionError(null);
    setIsUpdatingStatus(true);
    const result = await updateBudgetStatus(
      Budget.id,
      nextStatus,
      approveRejectModal.action === "reject" ? notes : null,
    );
    setIsUpdatingStatus(false);
    if (result.error) {
      setActionError(result.error);
      return;
    }
    setBudgetDetails((prev) =>
      prev
        ? {
            ...prev,
            Budget: {
              ...prev.Budget,
              status: nextStatus,
              rejection_reason: nextStatus === "rejected" ? notes.trim() : null,
            },
          }
        : prev,
    );
    setApproveRejectModal({ isOpen: false, action: "approve" });
  };

  const handleConfirmVoid = async (_reason: string) => {
    if (!Budget || isUpdatingStatus) return;
    setActionError(null);
    setIsUpdatingStatus(true);
    const result = await updateBudgetStatus(Budget.id, "void");
    setIsUpdatingStatus(false);
    if (result.error) {
      setActionError(result.error);
      return;
    }
    setBudgetDetails((prev) =>
      prev ? { ...prev, Budget: { ...prev.Budget, status: "void" } } : prev,
    );
    setIsVoidModalOpen(false);
  };

  const handleMarkAsPaid = async () => {
    if (!Budget || isUpdatingStatus) return;
    setActionError(null);
    setIsUpdatingStatus(true);
    const result = await updateBudgetStatus(Budget.id, "paid");
    setIsUpdatingStatus(false);
    if (result.error) {
      setActionError(result.error);
      return;
    }
    setBudgetDetails((prev) =>
      prev ? { ...prev, Budget: { ...prev.Budget, status: "paid" } } : prev,
    );
  };

  const handleSubmitForApproval = async () => {
    if (!Budget || isUpdatingStatus) return;
    setActionError(null);
    setIsUpdatingStatus(true);
    const result = await updateBudgetStatus(Budget.id, "awaiting_approval");
    setIsUpdatingStatus(false);
    if (result.error) {
      setActionError(result.error);
      return;
    }
    setBudgetDetails((prev) =>
      prev ? { ...prev, Budget: { ...prev.Budget, status: "awaiting_approval" } } : prev,
    );
  };

  const canEditBill = Budget?.status !== "paid";

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-10 w-80" />
        <Card>
          <CardContent className="space-y-3 p-6">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (errorMessage || !Budget || !vendor) {
    return (
      <div className="space-y-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/budget">Bills</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Not found</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>Budget request not found</EmptyTitle>
            <EmptyDescription>
              {errorMessage || "The budget request you are looking for does not exist."}
            </EmptyDescription>
          </EmptyHeader>
          <Button onClick={() => router.push("/budget")}>Back to Bills</Button>
        </Empty>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/budget">Bills</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{Budget.reference_no}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Page Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">Payment Request</h1>
            <Badge variant={getStatusVariant(Budget.status)}>{formatStatus(Budget.status)}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{Budget.reference_no}</span> · {vendor.name}
            {" "}· {Budget.request_date}
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrintReceipt}>
            <Printer data-icon="inline-start" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadA4Pdf}>
            <Download data-icon="inline-start" />
            A4 PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadReceiptPdf}>
            <FileDown data-icon="inline-start" />
            Receipt PDF
          </Button>
          {Budget.status !== "paid" && Budget.status !== "void" && (
            <Button variant="destructive" size="sm" onClick={handleVoid}>
              Void
            </Button>
          )}
          <Button variant="outline" size="sm" disabled={!canEditBill} onClick={handleEdit}>
            <Edit2 data-icon="inline-start" />
            Edit
          </Button>
        </div>
      </div>

      {/* Action error */}
      {actionError && (
        <Alert variant="destructive">
          <AlertTitle>Action failed</AlertTitle>
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      {/* Payee & Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Payee & Reference</CardTitle>
          <CardDescription>Vendor, dates, and priority for this request.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <DetailRow label="Vendor / Payee" value={vendor.name} />
            <DetailRow label="Reference No." value={Budget.reference_no} mono />
            <DetailRow label="Request Date" value={Budget.request_date} />
            <DetailRow
              label="Priority"
              value={
                <Badge variant={getPriorityVariant(Budget.priority_level)}>
                  {formatPriority(Budget.priority_level)}
                </Badge>
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Payment Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Breakdown</CardTitle>
          <CardDescription>Line items composing this payment request.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {breakdowns.map((breakdown, index) => (
                  <React.Fragment key={breakdown.id || index}>
                    <TableRow>
                      <TableCell>{formatPaymentMethod(breakdown.payment_method)}</TableCell>
                      <TableCell>{breakdown.category || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {breakdown.description || "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatPeso(breakdown.amount)}
                      </TableCell>
                    </TableRow>
                    {breakdown.payment_method === "bank_transfer" && (
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={4}>
                          <div className="grid grid-cols-1 gap-4 px-2 py-1 sm:grid-cols-3">
                            <DetailRow label="Bank Name" value={breakdown.bank_name || "—"} />
                            <DetailRow
                              label="Account Holder"
                              value={breakdown.bank_account_name || "—"}
                            />
                            <DetailRow
                              label="Account Number"
                              value={maskAccountNumber(breakdown.bank_account_no)}
                              mono
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>

          <Separator />

          <div className="flex justify-end">
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Total Amount</div>
              <div className="text-2xl font-semibold tabular-nums">
                {formatPeso(resolvedTotalAmount)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reason for Payment */}
      <Card>
        <CardHeader>
          <CardTitle>Reason for Payment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border bg-muted/30 p-4">
            <p className="whitespace-pre-wrap text-sm">
              {Budget.remarks || "No remarks provided."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Rejection Reason */}
      {Budget.status === "rejected" && Budget.rejection_reason && (
        <Alert variant="destructive">
          <AlertTitle>Rejection Reason</AlertTitle>
          <AlertDescription className="whitespace-pre-wrap">
            {Budget.rejection_reason}
          </AlertDescription>
        </Alert>
      )}

      {/* Attachments */}
      <Card>
        <CardHeader>
          <CardTitle>Attachments</CardTitle>
          <CardDescription>Files uploaded with this request.</CardDescription>
        </CardHeader>
        <CardContent>
          {attachments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attachments.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {attachments.map((attachment) => (
                <li
                  key={attachment.id}
                  className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm"
                >
                  <span className="truncate">{attachment.file_name}</span>
                  <Button
                    variant="link"
                    size="sm"
                    className="px-0"
                    onClick={async () => {
                      const result = await downloadBudgetAttachment(
                        attachment.file_path,
                        attachment.file_name,
                      );
                      if (result.error) setActionError(result.error);
                    }}
                  >
                    Download
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Request & Approval Info */}
      <Card>
        <CardHeader>
          <CardTitle>Request & Approval</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <DetailRow label="Requested By" value={requestedByDisplay} />
            <DetailRow label="Submitted Date" value={Budget.request_date} />
            <DetailRow label="Checked By" value="—" />
            <DetailRow label="Approved By" value="—" />
          </div>
        </CardContent>
      </Card>

      {/* Footer Actions */}
      <div className="flex flex-wrap items-center justify-end gap-2 pb-4">
        <Button variant="outline" onClick={() => router.push("/budget")}>
          Back to list
        </Button>

        {Budget.status === "draft" && (
          <Button onClick={handleSubmitForApproval} disabled={isUpdatingStatus}>
            {isUpdatingStatus && (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            )}
            Submit for Approval
          </Button>
        )}

        {Budget.status === "awaiting_approval" && (
          <>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isUpdatingStatus}
            >
              Reject
            </Button>
            <Button onClick={handleApprove} disabled={isUpdatingStatus}>
              {isUpdatingStatus && (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              )}
              Approve
            </Button>
          </>
        )}

        {Budget.status === "approved" && (
          <Button onClick={handleMarkAsPaid} disabled={isUpdatingStatus}>
            {isUpdatingStatus && (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            )}
            Mark as Paid
          </Button>
        )}
      </div>

      {/* Modals */}
      <VoidBudgetModal
        isOpen={isVoidModalOpen}
        onClose={() => setIsVoidModalOpen(false)}
        onConfirm={handleConfirmVoid}
        budgetReference={Budget.reference_no}
        budgetVendor={vendor.name}
        budgetAmount={resolvedTotalAmount}
      />

      <ApproveRejectModal
        isOpen={approveRejectModal.isOpen}
        onClose={() => setApproveRejectModal({ isOpen: false, action: "approve" })}
        onConfirm={handleConfirmApproveReject}
        action={approveRejectModal.action}
        budgetReference={Budget.reference_no}
        budgetVendor={vendor.name}
        budgetAmount={resolvedTotalAmount}
        budgetPriority={formatPriority(Budget.priority_level) as "Urgent" | "High" | "Standard" | "Low"}
      />
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={mono ? "font-mono text-sm" : "text-sm"}>{value}</div>
    </div>
  );
}
