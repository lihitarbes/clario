"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
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
  isScheduled: boolean;
};

export function AppointmentStatusActions({
  appointmentId,
  isScheduled,
}: AppointmentStatusActionsProps) {
  const router = useRouter();
  const [dismissedVisitId, setDismissedVisitId] = useState<string | null>(null);

  const [cancelState, cancelAction, cancelPending] = useActionState(
    cancelAppointmentAction,
    null,
  );
  const [completeState, completeAction, completePending] = useActionState(
    completeAppointmentAction,
    null,
  );

  const completedVisitId =
    completeState?.success && completeState.data?.visitId
      ? completeState.data.visitId
      : null;

  const showCompletionModal =
    completedVisitId !== null && completedVisitId !== dismissedVisitId;

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

  function handleFillVisitNow() {
    if (!completedVisitId) {
      return;
    }
    setDismissedVisitId(completedVisitId);
    router.push(`/calendar/visits/${completedVisitId}`);
  }

  function handleDoItLater() {
    if (completedVisitId) {
      setDismissedVisitId(completedVisitId);
    }
    router.refresh();
  }

  const error =
    (cancelState && !cancelState.success ? cancelState.error : null) ??
    (completeState && !completeState.success ? completeState.error : null);

  return (
    <>
      {isScheduled ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Appointment actions</CardTitle>
            <CardDescription>
              Mark completed to create a visit record. You can document it now or
              later.
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
          </CardContent>
        </Card>
      ) : null}

      {showCompletionModal && completedVisitId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
        >
          <div
            className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="completion-modal-title"
          >
            <h2
              id="completion-modal-title"
              className="text-lg font-semibold text-zinc-900"
            >
              Appointment completed
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              Would you like to document the visit now?
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button type="button" onClick={handleFillVisitNow}>
                Fill visit now
              </Button>
              <Button type="button" variant="outline" onClick={handleDoItLater}>
                I&apos;ll do it later
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
