import { Suspense } from "react";
import { SpecialCompanyEventsForm } from "@/components/forms/SpecialCompanyEventsForm";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SpecialCompanyEventsForm />
    </Suspense>
  );
}
