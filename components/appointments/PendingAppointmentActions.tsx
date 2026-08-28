"use client";

import { useActionState } from "react";
import {
  approveAppointmentAction,
  rejectAppointmentAction,
} from "@/actions/appointments";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type PendingAppointmentActionsProps = {
  appointmentId: string;
};

export function PendingAppointmentActions({
  appointmentId,
}: PendingAppointmentActionsProps) {
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

  const successMessage =
    (approveState?.success && approveState.data?.message
      ? approveState.data.message
      : null) ??
    (rejectState?.success && rejectState.data?.message
      ? rejectState.data.message
      : null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pending request</CardTitle>
        <CardDescription>
          Approve to confirm this appointment, or decline to cancel the request.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <form action={approveAction}>
          <input type="hidden" name="appointmentId" value={appointmentId} />
          <Button type="submit" disabled={approvePending || rejectPending}>
            {approvePending ? "Approving…" : "Approve"}
          </Button>
        </form>

        <form action={rejectAction} onSubmit={handleDecline}>
          <input type="hidden" name="appointmentId" value={appointmentId} />
          <Button
            type="submit"
            variant="outline"
            disabled={approvePending || rejectPending}
          >
            {rejectPending ? "Declining…" : "Decline"}
          </Button>
        </form>

        {error ? (
          <p className="w-full text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        {successMessage ? (
          <p className="w-full text-sm text-green-700" role="status">
            {successMessage}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
