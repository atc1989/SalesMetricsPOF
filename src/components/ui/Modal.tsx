"use client";

// Compat wrapper over shadcn Dialog. Preserves the legacy isOpen/title/onClose/footer
// API used by ~16 existing call sites. Future cleanup: migrate call sites to use
// <Dialog> + <DialogContent> directly from "@/components/ui/dialog" and delete this file.

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
        <div className="text-sm text-slate-700">{children}</div>
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
