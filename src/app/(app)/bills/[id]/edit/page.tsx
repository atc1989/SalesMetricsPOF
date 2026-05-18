import { Suspense } from "react";
import { EditBillPage } from "@/components/bills/EditBillPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <EditBillPage />
    </Suspense>
  );
}
