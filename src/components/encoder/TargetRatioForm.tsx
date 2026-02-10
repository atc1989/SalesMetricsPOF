"use client";

import { FormEvent, useState } from "react";
import { TargetRatio } from "@/types/encoder";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

type TargetRatioFormProps = {
  initialValue: TargetRatio;
};

export function TargetRatioForm({ initialValue }: TargetRatioFormProps) {
  const [value, setValue] = useState(initialValue);
  const [savedValue, setSavedValue] = useState(initialValue);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavedValue(value);
    setIsSuccessOpen(true);
  };

  return (
    <>
      <Card>
        <h3 className="mb-3 text-lg font-semibold text-slate-900">Target Ratio</h3>
        <form className="grid gap-3 sm:grid-cols-4" onSubmit={onSubmit}>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Global Target Ratio
            <input
              type="number"
              min="0"
              value={value.globalTargetRatio}
              onChange={(event) =>
                setValue((prev) => ({ ...prev, globalTargetRatio: Number(event.target.value) }))
              }
              className="h-10 rounded-md border border-slate-300 px-3"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Package %
            <input
              type="number"
              min="0"
              max="100"
              value={value.package}
              onChange={(event) => setValue((prev) => ({ ...prev, package: Number(event.target.value) }))}
              className="h-10 rounded-md border border-slate-300 px-3"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Retail %
            <input
              type="number"
              min="0"
              max="100"
              value={value.retail}
              onChange={(event) => setValue((prev) => ({ ...prev, retail: Number(event.target.value) }))}
              className="h-10 rounded-md border border-slate-300 px-3"
            />
          </label>
          <div className="flex items-end">
            <Button type="submit">Save Ratio</Button>
          </div>
        </form>
        <p className="mt-3 text-sm text-slate-600">
          Saved: Global {savedValue.globalTargetRatio}% | Package {savedValue.package}% | Retail{" "}
          {savedValue.retail}%
        </p>
      </Card>
      <Modal isOpen={isSuccessOpen} title="Saved" onClose={() => setIsSuccessOpen(false)}>
        Target ratio saved successfully (mock).
      </Modal>
    </>
  );
}
