"use client";

import { CheckCircle2, ShieldAlert } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PcfApproveRejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  action: "approve" | "reject";
  pcvNumber: string;
  payee: string;
  amount: number;
}

export function PcfApproveRejectModal({
  isOpen,
  onClose,
  onConfirm,
  action,
  pcvNumber,
  payee,
  amount,
}: PcfApproveRejectModalProps) {
  const isApprove = action === "approve";
  const Icon = isApprove ? CheckCircle2 : ShieldAlert;

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Icon className="size-5" />
            {isApprove ? "Approve PCV" : "Reject PCV"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isApprove
              ? "Mark this petty cash voucher as approved. It can then be liquidated or marked as paid."
              : "Return this petty cash voucher to draft so it can be edited and resubmitted."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="rounded-md border bg-muted/40 p-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">PCV No.</div>
              <div className="font-medium">{pcvNumber}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Amount</div>
              <div className="font-semibold tabular-nums">
                ₱
                {amount.toLocaleString("en-PH", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
            <div className="col-span-2">
              <div className="text-xs text-muted-foreground">Payee</div>
              <div className="font-medium">{payee}</div>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={cn(
              buttonVariants({ variant: isApprove ? "default" : "destructive" }),
            )}
          >
            {isApprove ? "Confirm Approval" : "Confirm Rejection"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
