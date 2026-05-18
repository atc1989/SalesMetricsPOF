import { Suspense } from "react";
import { ProspectInvitationForm } from "@/components/forms/ProspectInvitationForm";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ProspectInvitationForm />
    </Suspense>
  );
}
