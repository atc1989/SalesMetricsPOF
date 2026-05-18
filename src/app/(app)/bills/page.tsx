import { Suspense } from "react";
import { BillsPage } from "@/components/bills/BillsPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <BillsPage />
    </Suspense>
  );
}
