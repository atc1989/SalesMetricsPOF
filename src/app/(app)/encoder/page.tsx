"use client";

import { useState } from "react";
import { ExpensesForm } from "@/components/encoder/ExpensesForm";
import { LeaderSelector } from "@/components/encoder/LeaderSelector";
import { TargetRatioForm } from "@/components/encoder/TargetRatioForm";
import { TopHeader } from "@/components/layout/TopHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Expense, Leader, TargetRatio } from "@/types/encoder";

const initialTargetRatio: TargetRatio = {
  package: 60,
  retail: 40,
  globalTargetRatio: 100,
};

const leaders: Leader[] = [];
const availableLeaders: Leader[] = [];
const initialExpenses: Expense[] = [];

export default function EncoderPage() {
  const [isSyncOpen, setIsSyncOpen] = useState(false);

  return (
    <>
      <section className="space-y-4">
        <TopHeader
          title="Encoder"
          subtitle="Encoder/Index - mock settings and updates"
          actions={<Button onClick={() => setIsSyncOpen(true)}>Sync Sales</Button>}
        />
        <TargetRatioForm initialValue={initialTargetRatio} />
        <LeaderSelector leaders={leaders} availableLeaders={availableLeaders} />
        <ExpensesForm initialExpenses={initialExpenses} />
      </section>
      <Modal isOpen={isSyncOpen} title="Sync Complete" onClose={() => setIsSyncOpen(false)}>
        Sales sync completed successfully.
      </Modal>
    </>
  );
}
