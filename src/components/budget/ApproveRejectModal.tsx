"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

type Priority = "Urgent" | "High" | "Standard" | "Low";

interface ApproveRejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (notes: string) => void;
  action: "approve" | "reject";
  budgetReference: string;
  budgetVendor: string;
  budgetAmount: number;
  budgetPriority: Priority;
}

const PRIORITY_VARIANT: Record<Priority, "destructive" | "warning" | "secondary" | "neutral"> = {
  Urgent: "destructive",
  High: "warning",
  Standard: "secondary",
  Low: "neutral",
};

export function ApproveRejectModal({
  isOpen,
  onClose,
  onConfirm,
  action,
  budgetReference,
  budgetVendor,
  budgetAmount,
  budgetPriority,
}: ApproveRejectModalProps) {
  const [notes, setNotes] = useState("");
  const isApprove = action === "approve";

  useEffect(() => {
    if (!isOpen) setNotes("");
  }, [isOpen]);

  const handleConfirm = () => {
    if (!isApprove && !notes.trim()) return;
    onConfirm(notes);
    setNotes("");
  };

  const Icon = isApprove ? CheckCircle2 : ShieldAlert;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="size-5" />
            {isApprove ? "Approve Payment Request" : "Reject Payment Request"}
          </DialogTitle>
          <DialogDescription>
            {isApprove
              ? "You are about to approve this payment request for processing."
              : "You are about to reject this payment request and return it to the requester."}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/40 p-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Reference</div>
              <div className="font-medium">{budgetReference}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total Amount</div>
              <div className="font-semibold tabular-nums">
                ₱
                {budgetAmount.toLocaleString("en-PH", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Vendor / Payee</div>
              <div className="font-medium">{budgetVendor}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Priority</div>
              <Badge variant={PRIORITY_VARIANT[budgetPriority]}>{budgetPriority}</Badge>
            </div>
          </div>
        </div>

        <FieldGroup>
          <Field data-invalid={!isApprove && !notes.trim() ? true : undefined}>
            <FieldLabel htmlFor="approve-reject-notes">
              {isApprove ? "Approval notes" : "Rejection reason"}
              {!isApprove && <span className="text-destructive"> *</span>}
            </FieldLabel>
            <Textarea
              id="approve-reject-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              autoFocus
              placeholder={
                isApprove
                  ? "Optional notes for audit reference…"
                  : "Enter the reason for rejection…"
              }
            />
            <FieldDescription>
              {isApprove
                ? "Optional. Stored on the bill record for audit history."
                : "Required. Sent back to the requester and stored for audit history."}
            </FieldDescription>
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={isApprove ? "default" : "destructive"}
            onClick={handleConfirm}
            disabled={!isApprove && !notes.trim()}
          >
            {isApprove ? "Confirm Approval" : "Confirm Rejection"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
