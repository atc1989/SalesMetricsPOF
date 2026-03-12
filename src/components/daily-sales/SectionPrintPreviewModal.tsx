"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { buildPrintHtmlDocument, openPrintWindow } from "@/lib/printWindow";

type SectionPrintPreviewModalProps = {
  isOpen: boolean;
  title: string;
  html: string;
  onClose: () => void;
};

export function SectionPrintPreviewModal({
  isOpen,
  title,
  html,
  onClose,
}: SectionPrintPreviewModalProps) {
  const onPrint = () => {
    if (!html) {
      return;
    }

    const printRoot = document.createElement("div");
    printRoot.innerHTML = html;

    printRoot.querySelectorAll('[data-print-exclude="true"]').forEach((node) => {
      node.remove();
    });

    printRoot
      .querySelectorAll<HTMLElement>(".overflow-auto, .overflow-x-auto, .overflow-y-auto")
      .forEach((node) => {
        node.classList.remove("overflow-auto", "overflow-x-auto", "overflow-y-auto");
      });

    printRoot.querySelectorAll<HTMLElement>("table").forEach((table) => {
      table.style.minWidth = "0";
      table.style.width = "100%";
    });

    openPrintWindow({
      html: buildPrintHtmlDocument(printRoot.innerHTML, title),
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      title={title}
      onClose={onClose}
      panelClassName="max-w-6xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button onClick={onPrint}>Print</Button>
        </>
      }
    >
      <div
        className="max-h-[70vh] overflow-auto text-xs text-slate-700"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </Modal>
  );
}
