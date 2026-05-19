"use client";

import { AlertTriangle } from "lucide-react";

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

interface PcfVoidModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  pcvNumber: string;
  payee: string;
  amount: number;
}

export function PcfVoidModal({
  isOpen,
  onClose,
  onConfirm,
  pcvNumber,
  payee,
  amount,
}: PcfVoidModalProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" />
            Void PCV
          </AlertDialogTitle>
          <AlertDialogDescription>
            Voiding this petty cash voucher will permanently cancel it. The entry stays in
            history for audit but can no longer be paid. This action cannot be undone.
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
            className={cn(buttonVariants({ variant: "destructive" }))}
          >
            Confirm Void
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
