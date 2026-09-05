"use client";

import { useActionState } from "react";
import { startClientFormUpdateAction } from "@/actions/forms";
import { ActionPendingLabel } from "@/components/ui/action-pending-label";
import { Button } from "@/components/ui/button";

type UpdateMyInformationButtonProps = {
  clientId: string;
  formId: string;
  fromSubmissionId: string;
};

export function UpdateMyInformationButton({
  clientId,
  formId,
  fromSubmissionId,
}: UpdateMyInformationButtonProps) {
  const [state, action, pending] = useActionState(
    startClientFormUpdateAction,
    null,
  );

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="formId" value={formId} />
      <input type="hidden" name="fromSubmissionId" value={fromSubmissionId} />
      <Button type="submit" disabled={pending}>
        <ActionPendingLabel
          pending={pending}
          pendingLabel="Starting…"
          idleLabel="Update my information"
        />
      </Button>
      {state && !state.success ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
