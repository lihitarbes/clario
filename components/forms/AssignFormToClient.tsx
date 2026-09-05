"use client";

import { useActionState } from "react";
import { assignFormToClientAction } from "@/actions/forms";
import { formFormSelectClassName } from "@/lib/forms/display";
import { ActionPendingLabel } from "@/components/ui/action-pending-label";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { Form } from "@/types/database";

type AssignFormToClientProps = {
  clientId: string;
  forms: Pick<Form, "id" | "title">[];
  disabled?: boolean;
};

export function AssignFormToClient({
  clientId,
  forms,
  disabled = false,
}: AssignFormToClientProps) {
  const [state, formAction, pending] = useActionState(
    assignFormToClientAction,
    null,
  );

  if (disabled || forms.length === 0) {
    return (
      <p className="text-sm text-zinc-600">
        {disabled
          ? "Archived clients cannot receive new form assignments."
          : "Create an active form template before assigning."}
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="clientId" value={clientId} />
      <div className="min-w-[220px] space-y-2">
        <Label htmlFor="assignFormId">Form template</Label>
        <select
          id="assignFormId"
          name="formId"
          required
          disabled={pending}
          className={formFormSelectClassName}
          defaultValue=""
        >
          <option value="" disabled>Select a form…</option>
          {forms.map((form) => (
            <option key={form.id} value={form.id} dir="auto">
              {form.title}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={pending}>
        <ActionPendingLabel
          pending={pending}
          pendingLabel="Assigning…"
          idleLabel="Assign form"
        />
      </Button>
      {state?.success && state.data?.message ? (
        <p className="text-sm text-green-700" role="status">
          {state.data.message}
        </p>
      ) : null}
      {state && !state.success ? (
        <p className="text-sm text-red-600" role="alert">{state.error}</p>
      ) : null}
    </form>
  );
}
