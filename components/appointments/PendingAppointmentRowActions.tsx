"use client";

import { useActionState } from "react";
import {
  approveAppointmentAction,
  rejectAppointmentAction,
} from "@/actions/appointments";
import { Button } from "@/components/ui/button";

type PendingAppointmentRowActionsProps = {
  appointmentId: string;
};

export function PendingAppointmentRowActions({
  appointmentId,
}: PendingAppointmentRowActionsProps) {
  const [approveState, approveAction, approvePending] = useActionState(
    approveAppointmentAction,
    null,
  );
  const [rejectState, rejectAction, rejectPending] = useActionState(
    rejectAppointmentAction,
    null,
  );

  function handleDecline(event: React.FormEvent<HTMLFormElement>) {
    if (
      !window.confirm(
        "Decline this appointment request? It will be marked as cancelled.",
      )
    ) {
      event.preventDefault();
    }
  }

  const error =
    (approveState && !approveState.success ? approveState.error : null) ??
    (rejectState && !rejectState.success ? rejectState.error : null);

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap gap-2">
        <form action={approveAction}>
          <input type="hidden" name="appointmentId" value={appointmentId} />
          <Button type="submit" size="sm" disabled={approvePending || rejectPending}>
            {approvePending ? "Approving…" : "Approve"}
          </Button>
        </form>
        <form action={rejectAction} onSubmit={handleDecline}>
          <input type="hidden" name="appointmentId" value={appointmentId} />
          <Button
            type="submit"
            variant="outline"
            size="sm"
            disabled={approvePending || rejectPending}
          >
            {rejectPending ? "Declining…" : "Decline"}
          </Button>
        </form>
      </div>
      {error ? (
        <p className="text-xs text-red-600" role="alert">{error}</p>
      ) : null}
    </div>
  );
}
