"use client";

import { ReactNode, useEffect } from "react";
import { Button } from "@/components/ui/Button";

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
  closeButtonContent = "Close",
  closeButtonClassName = "",
  closeButtonAriaLabel = "Close modal",
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" aria-modal="true" role="dialog">
      <div className={`w-full max-w-lg rounded-lg border border-slate-200 bg-white shadow-lg ${panelClassName}`}>
        <div className={`flex items-center justify-between border-b border-slate-200 px-5 py-3 ${headerClassName}`}>
          <h2 className={`text-lg font-semibold text-slate-900 ${titleClassName}`}>{title}</h2>
          <Button variant="ghost" size="sm" aria-label={closeButtonAriaLabel} onClick={onClose} className={closeButtonClassName}>
            {closeButtonContent}
          </Button>
        </div>
        <div className="px-5 py-4 text-sm text-slate-700">{children}</div>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
          {footer ?? (
            <Button variant="secondary" onClick={onClose}>
              OK
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
