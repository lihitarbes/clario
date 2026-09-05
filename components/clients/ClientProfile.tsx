"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { updateClientAction } from "@/actions/clients";
import { ActionPendingLabel } from "@/components/ui/action-pending-label";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Client } from "@/types/database";

type ClientProfileProps = {
  client: Client;
  /** When true, profile is read-only (no Edit). */
  readOnly?: boolean;
};

function ProfileField({
  label,
  value,
  emptyLabel,
  multiline = false,
}: {
  label: string;
  value: string | null | undefined;
  emptyLabel?: string;
  multiline?: boolean;
}) {
  const trimmed = value?.trim() ?? "";
  const hasContent = trimmed.length > 0;

  return (
    <div>
      <p className="font-medium text-zinc-900">{label}</p>
      {hasContent ? (
        <p
          className={
            multiline
              ? "whitespace-pre-wrap text-zinc-600"
              : "text-zinc-600"
          }
        >
          {trimmed}
        </p>
      ) : emptyLabel ? (
        <p className="text-sm italic text-zinc-500">{emptyLabel}</p>
      ) : null}
    </div>
  );
}

function ClientEditForm({
  client,
  formKey,
  onCancel,
  onSaved,
}: {
  client: Client;
  formKey: number;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [state, formAction, pending] = useActionState(updateClientAction, null);
  const onSavedRef = useRef(onSaved);

  useEffect(() => {
    onSavedRef.current = onSaved;
  }, [onSaved]);

  useEffect(() => {
    if (state?.success) {
      onSavedRef.current();
    }
  }, [state]);

  return (
    <form key={formKey} action={formAction} className="space-y-4">
      <input type="hidden" name="clientId" value={client.id} />

      <div className="space-y-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input
          id="fullName"
          name="fullName"
          type="text"
          defaultValue={client.full_name}
          autoComplete="name"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={client.email}
          autoComplete="email"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={client.phone ?? ""}
          autoComplete="tel"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={client.notes ?? ""}
          placeholder="Optional internal notes about this client"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          <ActionPendingLabel
            pending={pending}
            pendingLabel="Saving…"
            idleLabel="Save"
          />
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={onCancel}
        >
          Cancel
        </Button>

        {state && !state.success ? (
          <p className="text-sm text-red-600" role="alert">
            {state.error}
          </p>
        ) : null}
      </div>
    </form>
  );
}

export function ClientProfile({
  client,
  readOnly = false,
}: ClientProfileProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [formKey, setFormKey] = useState(0);
  const isArchived = Boolean(client.archived_at);

  function enterEdit() {
    setFormKey((key) => key + 1);
    setMode("edit");
  }

  function cancelEdit() {
    setMode("view");
  }

  function handleSaved() {
    setMode("view");
    router.refresh();
  }

  const showEdit = !readOnly && !isArchived && mode === "view";

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">
            {mode === "edit" ? "Edit client" : "Client profile"}
          </CardTitle>
          {mode === "edit" ? (
            <CardDescription className="mt-1.5">
              Update this client&apos;s contact information.
            </CardDescription>
          ) : null}
        </div>
        {showEdit ? (
          <Button type="button" variant="outline" size="sm" onClick={enterEdit}>
            <Pencil className="size-3.5" aria-hidden />
            Edit
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {mode === "edit" && !isArchived ? (
          <ClientEditForm
            client={client}
            formKey={formKey}
            onCancel={cancelEdit}
            onSaved={handleSaved}
          />
        ) : (
          <div className="space-y-3 text-sm">
            <ProfileField label="Full name" value={client.full_name} />
            <ProfileField label="Email" value={client.email} />
            <ProfileField
              label="Phone"
              value={client.phone}
              emptyLabel="No phone on file"
            />
            {client.notes?.trim() ? (
              <ProfileField label="Notes" value={client.notes} multiline />
            ) : null}
            <div>
              <p className="font-medium text-zinc-900">Account</p>
              <p className="text-zinc-600">
                {client.user_id ? "Account linked" : "No account yet"}
              </p>
            </div>
            {isArchived && client.archived_at ? (
              <div>
                <p className="font-medium text-zinc-900">Archived on</p>
                <p className="text-zinc-600">
                  {new Date(client.archived_at).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
