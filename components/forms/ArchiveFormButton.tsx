"use client";

import { useActionState } from "react";
import { archiveFormAction } from "@/actions/forms";
import { ActionPendingLabel } from "@/components/ui/action-pending-label";
import { Button } from "@/components/ui/button";

type ArchiveFormButtonProps = {
  formId: string;
  formTitle: string;
};

export function ArchiveFormButton({
  formId,
  formTitle,
}: ArchiveFormButtonProps) {
  const [state, formAction, pending] = useActionState(archiveFormAction, null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (
      !window.confirm(
        `Archive "${formTitle}"? It will be hidden from your active forms list. Historical data will be preserved.`,
      )
    ) {
      event.preventDefault();
    }
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="inline">
      <input type="hidden" name="formId" value={formId} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        <ActionPendingLabel
          pending={pending}
          pendingLabel="Archiving…"
          idleLabel="Archive"
        />
      </Button>
      {state && !state.success ? (
        <p className="mt-2 text-sm text-red-600" role="alert">{state.error}</p>
      ) : null}
    </form>
  );
}
