"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

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
    if (typeof window !== "undefined") {
      window.print();
    }
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
