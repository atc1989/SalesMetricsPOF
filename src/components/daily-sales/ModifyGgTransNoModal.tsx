"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

type ModifyRow = {
  id: string;
  pofNumber: string;
  ggTransNo: string;
};

type ModifyGgTransNoModalProps = {
  isOpen: boolean;
  row: ModifyRow | null;
  onSave: (newValue: string) => void;
  onClose: () => void;
};

export function ModifyGgTransNoModal({ isOpen, row, onSave, onClose }: ModifyGgTransNoModalProps) {
  const ggTransNoRef = useRef<HTMLInputElement | null>(null);

  const onSubmit = () => {
    const trimmed = ggTransNoRef.current?.value.trim() ?? "";
    if (!trimmed) {
      return;
    }

    onSave(trimmed);
  };

  return (
    <Modal
      isOpen={isOpen}
      title="Modify GG Trans No"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSubmit}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          POF Number
          <input
            type="text"
            value={row?.pofNumber ?? ""}
            readOnly
            className="h-10 rounded-md border border-slate-300 bg-slate-50 px-3 text-slate-600"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          GG Trans No
          <input
            key={row?.id ?? "empty"}
            ref={ggTransNoRef}
            type="text"
            defaultValue={row?.ggTransNo ?? ""}
            required
            className="h-10 rounded-md border border-slate-300 px-3"
          />
        </label>
      </div>
    </Modal>
  );
}
