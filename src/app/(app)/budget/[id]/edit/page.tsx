import { Suspense } from "react";
import { EditBudgetPage } from "@/components/budget/EditBudgetPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <EditBudgetPage />
    </Suspense>
  );
}
