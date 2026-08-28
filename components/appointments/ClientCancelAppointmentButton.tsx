"use client";

import { useActionState } from "react";
import { cancelClientAppointmentAction } from "@/actions/appointments";
import { Button } from "@/components/ui/button";

type ClientCancelAppointmentButtonProps = {
  appointmentId: string;
};

export function ClientCancelAppointmentButton({
  appointmentId,
}: ClientCancelAppointmentButtonProps) {
  const [state, formAction, pending] = useActionState(
    cancelClientAppointmentAction,
    null,
  );

  function handleCancel(event: React.FormEvent<HTMLFormElement>) {
    if (
      !window.confirm(
        "Cancel this appointment? You can book a new time afterward.",
      )
    ) {
      event.preventDefault();
    }
  }

  return (
    <div className="space-y-2">
      <form action={formAction} onSubmit={handleCancel}>
        <input type="hidden" name="appointmentId" value={appointmentId} />
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          {pending ? "Cancelling…" : "Cancel appointment"}
        </Button>
      </form>
      {state && !state.success ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.success && state.data?.message ? (
        <p className="text-sm text-green-700" role="status">
          {state.data.message}
        </p>
      ) : null}
    </div>
  );
}
