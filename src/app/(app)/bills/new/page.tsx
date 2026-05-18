import { Suspense } from "react";
import { CreateBillPage } from "@/components/bills/CreateBillPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CreateBillPage />
    </Suspense>
  );
}
