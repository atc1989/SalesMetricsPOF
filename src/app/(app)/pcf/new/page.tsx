import { Suspense } from "react";
import { NewPcfPage } from "@/components/pcf/NewPcfPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <NewPcfPage />
    </Suspense>
  );
}
