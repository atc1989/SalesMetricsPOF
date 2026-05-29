import { Suspense } from "react";
import { BudgetPage } from "@/components/budget/BudgetPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <BudgetPage />
    </Suspense>
  );
}
