import { Suspense } from "react";
import { EditPcfPage } from "@/components/pcf/EditPcfPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <EditPcfPage />
    </Suspense>
  );
}
