"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

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

interface VoidBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  budgetReference: string;
  budgetVendor: string;
  budgetAmount: number;
}

export function VoidBudgetModal({
  isOpen,
  onClose,
  onConfirm,
  budgetReference,
  budgetVendor,
  budgetAmount,
}: VoidBudgetModalProps) {
  const [voidReason, setVoidReason] = useState("");

  useEffect(() => {
    if (!isOpen) setVoidReason("");
  }, [isOpen]);

  const handleConfirm = () => {
    if (!voidReason.trim()) return;
    onConfirm(voidReason);
    setVoidReason("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" />
            Void Payment Request
          </DialogTitle>
          <DialogDescription>
            Voiding this payment request will permanently cancel it. This action cannot be undone and the request will no longer be payable.
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
            <div className="col-span-2">
              <div className="text-xs text-muted-foreground">Vendor / Payee</div>
              <div className="font-medium">{budgetVendor}</div>
            </div>
          </div>
        </div>

        <FieldGroup>
          <Field data-invalid={!voidReason.trim() ? true : undefined}>
            <FieldLabel htmlFor="void-reason">
              Reason for voiding<span className="text-destructive"> *</span>
            </FieldLabel>
            <Textarea
              id="void-reason"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              rows={4}
              autoFocus
              placeholder="Enter the reason for voiding this payment request…"
            />
            <FieldDescription>
              Required for audit history. Voided requests are retained but can no longer be paid.
            </FieldDescription>
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!voidReason.trim()}
          >
            Confirm Void
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
