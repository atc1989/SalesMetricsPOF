"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Ban, BadgeCheck, CheckCircle2, Edit2, Loader2, ShieldAlert, ShieldCheck, Wallet, WalletMinimal } from "lucide-react";
import { notify } from "@/lib/notify";

import { PcfApproveRejectModal } from "./PcfApproveRejectModal";
import { PcfVoidModal } from "./PcfVoidModal";
import {
  getPcfTransactionById,
  setPcfLiquidationState,
  updatePcfTransactionStatus,
} from "@/services/pcf.service";
import type {
  PcfTransaction,
  PcfTransactionStatus,
  PcfTransactionType,
} from "@/types/billing";

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
import { Skeleton } from "@/components/ui/skeleton";

type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "warning"
  | "neutral";

const formatPeso = (amount: number) =>
  `₱${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const getDisplayValue = (value?: string | null) => {
  const normalized = (value ?? "").trim();
  return normalized || "—";
};

const formatTransactionType = (value?: PcfTransactionType) => {
  switch (value) {
    case "beginning_balance":
      return "Beginning Balance";
    case "replenishment":
      return "Replenishment";
    case "expense":
      return "Expense";
    default:
      return value || "—";
  }
};

const formatStatus = (value?: PcfTransactionStatus) => {
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
      return value || "—";
  }
};

const getStatusVariant = (status?: PcfTransactionStatus): BadgeVariant => {
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

const getTypeVariant = (value?: PcfTransactionType): BadgeVariant => {
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

export function ViewPcfPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string | undefined);
  const router = useRouter();
  const [transaction, setTransaction] = useState<PcfTransaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [approveRejectModal, setApproveRejectModal] = useState({
    isOpen: false,
    action: "approve" as "approve" | "reject",
  });

  useEffect(() => {
    let isMounted = true;
    if (!id) {
      setIsLoading(false);
      setErrorMessage("PCV not found.");
      return;
    }

    setIsLoading(true);
    getPcfTransactionById(id)
      .then((result) => {
        if (!isMounted) return;
        if (result.error || !result.data) {
          setTransaction(null);
          setErrorMessage(result.error || "PCV not found.");
        } else {
          setTransaction(result.data);
          setErrorMessage(null);
        }
      })
      .catch((error) => {
        if (!isMounted) return;
        setTransaction(null);
        setErrorMessage(error.message || "Failed to load petty cash transaction.");
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
    if (transaction?.pcv_number) {
      document.title = `${transaction.pcv_number} | GuildLedger`;
      return;
    }
    document.title = "PCV Details | GuildLedger";
  }, [transaction?.pcv_number]);

  const statusIcon = (status: PcfTransactionStatus) => {
    switch (status) {
      case "approved":
        return ShieldCheck;
      case "rejected":
        return ShieldAlert;
      case "paid":
        return BadgeCheck;
      case "void":
        return Ban;
      default:
        return CheckCircle2;
    }
  };

  const handleStatusChange = async (status: PcfTransactionStatus) => {
    if (!transaction || isUpdating) return;
    setActionError(null);
    setIsUpdating(true);
    const result = await updatePcfTransactionStatus(transaction.id, status);
    setIsUpdating(false);
    if (result.error || !result.data) {
      setActionError(result.error || "Failed to update petty cash status.");
      return;
    }
    setTransaction(result.data);
    notify(statusIcon(status), `PCV marked as ${formatStatus(status).toLowerCase()}`);
  };

  const handleLiquidationToggle = async (isLiquidated: boolean) => {
    if (!transaction || isUpdating) return;
    setActionError(null);
    setIsUpdating(true);
    const result = await setPcfLiquidationState(transaction.id, isLiquidated);
    setIsUpdating(false);
    if (result.error || !result.data) {
      setActionError(result.error || "Failed to update liquidation state.");
      return;
    }
    setTransaction(result.data);
    notify(
      isLiquidated ? Wallet : WalletMinimal,
      isLiquidated ? "PCV liquidated" : "PCV unliquidated",
    );
  };

  const handleOpenApprove = () => setApproveRejectModal({ isOpen: true, action: "approve" });
  const handleOpenReject = () => setApproveRejectModal({ isOpen: true, action: "reject" });
  const handleOpenVoid = () => setIsVoidModalOpen(true);

  const handleConfirmApproveReject = async () => {
    if (!transaction || isUpdating) return;
    const nextStatus =
      approveRejectModal.action === "approve" ? "approved" : "rejected";
    setActionError(null);
    setIsUpdating(true);
    const result = await updatePcfTransactionStatus(transaction.id, nextStatus);
    setIsUpdating(false);
    if (result.error || !result.data) {
      setActionError(result.error || "Failed to update petty cash status.");
      return;
    }
    setTransaction(result.data);
    setApproveRejectModal({ isOpen: false, action: "approve" });
    notify(statusIcon(nextStatus), `PCV marked as ${formatStatus(nextStatus).toLowerCase()}`);
  };

  const handleConfirmVoid = async () => {
    if (!transaction || isUpdating) return;
    setActionError(null);
    setIsUpdating(true);
    const result = await updatePcfTransactionStatus(transaction.id, "void");
    setIsUpdating(false);
    if (result.error || !result.data) {
      setActionError(result.error || "Failed to update petty cash status.");
      return;
    }
    setTransaction(result.data);
    setIsVoidModalOpen(false);
    notify(Ban, "PCV marked as void");
  };

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

  if (errorMessage || !transaction) {
    return (
      <div className="space-y-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/pcf">Petty Cash</Link>
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
            <EmptyTitle>PCV not found</EmptyTitle>
            <EmptyDescription>
              {errorMessage || "The petty cash transaction you are looking for does not exist."}
            </EmptyDescription>
          </EmptyHeader>
          <Button onClick={() => router.push("/pcf")}>Back to Petty Cash</Button>
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
              <Link href="/pcf">Petty Cash</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{getDisplayValue(transaction.pcv_number)}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">Petty Cash Voucher</h1>
            <Badge variant={getStatusVariant(transaction.status)}>
              {formatStatus(transaction.status)}
            </Badge>
            {transaction.status === "approved" && transaction.is_liquidated && (
              <Badge variant="success">Liquidated</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {getDisplayValue(transaction.pcv_number)}
            </span>{" "}
            · {getDisplayValue(transaction.payee)} · {getDisplayValue(transaction.date)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {transaction.transaction_type !== "beginning_balance" &&
            transaction.status !== "void" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/pcf/${transaction.id}/edit`)}
              >
                <Edit2 data-icon="inline-start" />
                Edit
              </Button>
            )}
          {transaction.status !== "paid" && transaction.status !== "void" && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleOpenVoid}
              disabled={isUpdating}
            >
              Void
            </Button>
          )}
        </div>
      </div>

      {/* Action error */}
      {actionError && (
        <Alert variant="destructive">
          <AlertTitle>Action failed</AlertTitle>
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      {/* Entry Details */}
      <Card>
        <CardHeader>
          <CardTitle>Entry Details</CardTitle>
          <CardDescription>Voucher reference and transaction metadata.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <DetailRow label="Date" value={getDisplayValue(transaction.date)} />
            <DetailRow label="PCV No." value={getDisplayValue(transaction.pcv_number)} mono />
            <DetailRow label="Payee" value={getDisplayValue(transaction.payee)} />
            <DetailRow label="Invoice No." value={getDisplayValue(transaction.invoice_no)} />
            <DetailRow
              label="Type"
              value={
                <Badge variant={getTypeVariant(transaction.transaction_type)}>
                  {formatTransactionType(transaction.transaction_type)}
                </Badge>
              }
            />
            <DetailRow
              label="Liquidated At"
              value={getDisplayValue(transaction.liquidated_at)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border bg-muted/30 p-4">
            <p className="whitespace-pre-wrap text-sm">
              {transaction.description?.trim() || "No description provided."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Amounts */}
      <Card>
        <CardHeader>
          <CardTitle>Amounts</CardTitle>
          <CardDescription>Cash in, cash out, and running balance.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <AmountRow label="Amount In" value={Number(transaction.amount_in ?? 0)} />
            <AmountRow label="Amount Out" value={Number(transaction.amount_out ?? 0)} />
            <AmountRow label="Balance" value={Number(transaction.balance ?? 0)} strong />
          </div>
        </CardContent>
      </Card>

      {/* Footer actions */}
      <div className="flex flex-wrap items-center justify-end gap-2 pb-4">
        <Button variant="outline" onClick={() => router.push("/pcf")}>
          Back to list
        </Button>

        {transaction.status === "draft" && (
          <Button
            onClick={() => handleStatusChange("awaiting_approval")}
            disabled={isUpdating}
          >
            {isUpdating && <Loader2 data-icon="inline-start" className="animate-spin" />}
            Submit
          </Button>
        )}

        {transaction.status === "awaiting_approval" && (
          <>
            <Button variant="destructive" onClick={handleOpenReject} disabled={isUpdating}>
              Reject
            </Button>
            <Button onClick={handleOpenApprove} disabled={isUpdating}>
              {isUpdating && <Loader2 data-icon="inline-start" className="animate-spin" />}
              Approve
            </Button>
          </>
        )}

        {transaction.status === "rejected" && (
          <Button
            onClick={() => handleStatusChange("awaiting_approval")}
            disabled={isUpdating}
          >
            Resubmit
          </Button>
        )}

        {transaction.status === "approved" && (
          <>
            <Button
              variant="outline"
              onClick={() => handleLiquidationToggle(!transaction.is_liquidated)}
              disabled={isUpdating}
            >
              {transaction.is_liquidated ? "Unliquidate" : "Liquidate"}
            </Button>
            <Button onClick={() => handleStatusChange("paid")} disabled={isUpdating}>
              {isUpdating && <Loader2 data-icon="inline-start" className="animate-spin" />}
              Mark as Paid
            </Button>
          </>
        )}
      </div>

      {/* Modals */}
      <PcfVoidModal
        isOpen={isVoidModalOpen}
        onClose={() => setIsVoidModalOpen(false)}
        onConfirm={handleConfirmVoid}
        pcvNumber={getDisplayValue(transaction.pcv_number)}
        payee={getDisplayValue(transaction.payee)}
        amount={Number(transaction.amount_out || transaction.amount_in || 0)}
      />

      <PcfApproveRejectModal
        isOpen={approveRejectModal.isOpen}
        onClose={() => setApproveRejectModal({ isOpen: false, action: "approve" })}
        onConfirm={handleConfirmApproveReject}
        action={approveRejectModal.action}
        pcvNumber={getDisplayValue(transaction.pcv_number)}
        payee={getDisplayValue(transaction.payee)}
        amount={Number(transaction.amount_out || transaction.amount_in || 0)}
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

function AmountRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={
          strong
            ? "text-2xl font-semibold tabular-nums"
            : "text-xl font-medium tabular-nums"
        }
      >
        ₱
        {value.toLocaleString("en-PH", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </div>
    </div>
  );
}
