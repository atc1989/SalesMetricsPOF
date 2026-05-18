import { Suspense } from "react";
import { ViewPcfPage } from "@/components/pcf/ViewPcfPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ViewPcfPage />
    </Suspense>
  );
}
