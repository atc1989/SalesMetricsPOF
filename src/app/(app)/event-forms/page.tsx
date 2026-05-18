import { Suspense } from "react";
import { EventFormsHome } from "@/components/forms/EventFormsHome";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <EventFormsHome />
    </Suspense>
  );
}
