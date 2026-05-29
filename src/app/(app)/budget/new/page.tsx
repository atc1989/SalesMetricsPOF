import { Suspense } from "react";
import { CreateBudgetPage } from "@/components/budget/CreateBudgetPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CreateBudgetPage />
    </Suspense>
  );
}
