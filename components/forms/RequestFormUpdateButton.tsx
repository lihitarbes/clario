"use client";

import { useActionState } from "react";
import { requestFormUpdateAction } from "@/actions/forms";
import { ActionPendingLabel } from "@/components/ui/action-pending-label";
import { Button } from "@/components/ui/button";

type RequestFormUpdateButtonProps = {
  clientId: string;
  formId: string;
  fromSubmissionId: string;
};

export function RequestFormUpdateButton({
  clientId,
  formId,
  fromSubmissionId,
}: RequestFormUpdateButtonProps) {
  const [state, action, pending] = useActionState(requestFormUpdateAction, null);

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="formId" value={formId} />
      <input type="hidden" name="fromSubmissionId" value={fromSubmissionId} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        <ActionPendingLabel
          pending={pending}
          pendingLabel="Requesting…"
          idleLabel="Request update"
        />
      </Button>
      {state && !state.success ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.success ? (
        <p className="text-sm text-green-700" role="status">
          {state.data?.message ?? "Update requested."}
        </p>
      ) : null}
    </form>
  );
}
