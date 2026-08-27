"use client";

import { useActionState } from "react";
import {
  cancelAppointmentAction,
  completeAppointmentAction,
} from "@/actions/appointments";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AppointmentStatusActionsProps = {
  appointmentId: string;
};

export function AppointmentStatusActions({
  appointmentId,
}: AppointmentStatusActionsProps) {
  const [cancelState, cancelAction, cancelPending] = useActionState(
    cancelAppointmentAction,
    null,
  );
  const [completeState, completeAction, completePending] = useActionState(
    completeAppointmentAction,
    null,
  );

  function handleCancel(event: React.FormEvent<HTMLFormElement>) {
    if (
      !window.confirm(
        "Cancel this appointment? It will remain in your calendar as cancelled.",
      )
    ) {
      event.preventDefault();
    }
  }

  function handleComplete(event: React.FormEvent<HTMLFormElement>) {
    if (!window.confirm("Mark this appointment as completed?")) {
      event.preventDefault();
    }
  }

  const error =
    (cancelState && !cancelState.success ? cancelState.error : null) ??
    (completeState && !completeState.success ? completeState.error : null);

  const successMessage =
    completeState?.success && completeState.data?.message
      ? completeState.data.message
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Appointment actions</CardTitle>
        <CardDescription>
          Cancel or complete this scheduled appointment.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <form action={completeAction} onSubmit={handleComplete}>
          <input type="hidden" name="appointmentId" value={appointmentId} />
          <Button type="submit" disabled={completePending || cancelPending}>
            {completePending ? "Completing…" : "Mark completed"}
          </Button>
        </form>

        <form action={cancelAction} onSubmit={handleCancel}>
          <input type="hidden" name="appointmentId" value={appointmentId} />
          <Button
            type="submit"
            variant="outline"
            disabled={completePending || cancelPending}
          >
            {cancelPending ? "Cancelling…" : "Cancel appointment"}
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
