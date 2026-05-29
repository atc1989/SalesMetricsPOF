import { Suspense } from "react";
import { ViewBudgetPage } from "@/components/budget/ViewBudgetPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ViewBudgetPage />
    </Suspense>
  );
}
