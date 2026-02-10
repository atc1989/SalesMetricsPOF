"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

type ConfirmDialogProps = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  tone?: "danger" | "default";
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = "Remove",
  cancelText = "Cancel",
  tone = "default",
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {cancelText}
          </Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm}>
            {confirmText}
          </Button>
        </>
      }
    >
      <p>{message}</p>
    </Modal>
  );
}
