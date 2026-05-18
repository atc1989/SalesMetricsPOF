import { Suspense } from "react";
import { EventRequestForm } from "@/components/forms/EventRequestForm";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <EventRequestForm />
    </Suspense>
  );
}
