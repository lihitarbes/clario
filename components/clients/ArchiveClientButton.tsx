"use client";

import { useActionState } from "react";
import { archiveClientAction } from "@/actions/clients";
import { ActionPendingLabel } from "@/components/ui/action-pending-label";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ArchiveClientButtonProps = {
  clientId: string;
  clientName: string;
};

export function ArchiveClientButton({
  clientId,
  clientName,
}: ArchiveClientButtonProps) {
  const [state, formAction, pending] = useActionState(
    archiveClientAction,
    null,
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const confirmed = window.confirm(
      `Archive ${clientName}? Their history will be kept, but they will no longer appear in your active client list.`,
    );

    if (!confirmed) {
      event.preventDefault();
    }
  }

  return (
    <Card className="border-amber-200">
      <CardHeader>
        <CardTitle className="text-base">Archive client</CardTitle>
        <CardDescription>
          Remove this client from your active list without deleting their
          history.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} onSubmit={handleSubmit}>
          <input type="hidden" name="clientId" value={clientId} />

          {state && !state.success ? (
            <p className="mb-3 text-sm text-red-600" role="alert">
              {state.error}
            </p>
          ) : null}

          <Button type="submit" variant="outline" disabled={pending}>
            <ActionPendingLabel
              pending={pending}
              pendingLabel="Archiving…"
              idleLabel="Archive client"
            />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
