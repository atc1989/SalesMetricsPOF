import { Suspense } from "react";
import { PcfPage } from "@/components/pcf/PcfPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PcfPage />
    </Suspense>
  );
}
