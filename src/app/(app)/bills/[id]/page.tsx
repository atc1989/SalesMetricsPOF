import { Suspense } from "react";
import { ViewBillPage } from "@/components/bills/ViewBillPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ViewBillPage />
    </Suspense>
  );
}
