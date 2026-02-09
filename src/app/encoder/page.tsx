import { ExpensesForm } from "@/components/encoder/ExpensesForm";
import { LeaderSelector } from "@/components/encoder/LeaderSelector";
import { TargetRatioForm } from "@/components/encoder/TargetRatioForm";
import { TopHeader } from "@/components/layout/TopHeader";
import { initialExpenses, initialTargetRatio, leaders } from "@/lib/mock/encoder";

export default function EncoderPage() {
  return (
    <section className="space-y-4">
      <TopHeader title="Encoder" subtitle="Encoder/Index - mock settings and updates" />
      <TargetRatioForm initialValue={initialTargetRatio} />
      <LeaderSelector leaders={leaders} />
      <ExpensesForm initialExpenses={initialExpenses} />
    </section>
  );
}
