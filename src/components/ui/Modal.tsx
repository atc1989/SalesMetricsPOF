"use client";

// @deprecated — use shadcn Dialog directly: import { Dialog, DialogContent,
// DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog".
//
// Compat wrapper over shadcn Dialog. Preserves the legacy isOpen/title/onClose/footer
// API used by ~20 existing call sites in salesmetrics. This wrapper already renders a
// real shadcn Dialog — there is no behavioral difference between using it and using
// Dialog directly. Migrate call sites incrementally; once all are migrated, delete
// this file.

import { ReactNode } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type ModalProps = {
  isOpen: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  panelClassName?: string;
  headerClassName?: string;
  titleClassName?: string;
  closeButtonContent?: ReactNode;
  closeButtonClassName?: string;
  closeButtonAriaLabel?: string;
};

export function Modal({
  isOpen,
  title,
  children,
  onClose,
  footer,
  panelClassName = "",
  headerClassName = "",
  titleClassName = "",
}: ModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={panelClassName || "max-w-lg"}>
        <DialogHeader className={headerClassName}>
          <DialogTitle className={titleClassName}>{title}</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-muted-foreground">{children}</div>
        <DialogFooter>
          {footer ?? (
            <Button variant="secondary" onClick={onClose}>
              OK
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
