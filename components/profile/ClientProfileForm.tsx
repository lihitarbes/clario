"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { updateClientProfileAction } from "@/actions/profile";
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

type ClientProfileFormProps = {
  fullName: string;
  email: string;
  phone: string;
  linkedBusinessCount: number;
};

function ProfileField({
  label,
  value,
  emptyLabel = "Not provided",
}: {
  label: string;
  value: string | null | undefined;
  emptyLabel?: string;
}) {
  const trimmed = value?.trim() ?? "";
  const hasContent = trimmed.length > 0;

  return (
    <div>
      <p className="font-medium text-zinc-900">{label}</p>
      {hasContent ? (
        <p className="text-zinc-600">{trimmed}</p>
      ) : (
        <p className="text-sm italic text-zinc-500">{emptyLabel}</p>
      )}
    </div>
  );
}

function ClientProfileEditForm({
  fullName,
  email,
  phone,
  formKey,
  onCancel,
  onSaved,
}: {
  fullName: string;
  email: string;
  phone: string;
  formKey: number;
  onCancel: () => void;
  onSaved: (message?: string) => void;
}) {
  const [state, formAction, pending] = useActionState(
    updateClientProfileAction,
    null,
  );
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  useEffect(() => {
    if (state?.success) {
      onSavedRef.current(state.data?.message);
    }
  }, [state]);

  return (
    <form key={formKey} action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input
          id="fullName"
          name="fullName"
          type="text"
          defaultValue={fullName}
          autoComplete="name"
          required
          maxLength={100}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={email}
          autoComplete="email"
          required
        />
        <p className="text-xs text-zinc-500">
          This is your account email. Changing it may require confirmation.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone number</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={phone}
          autoComplete="tel"
          placeholder="+972501234567"
        />
        <p className="text-xs text-zinc-500">
          Include country code so WhatsApp contact works for your practitioners.
        </p>
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

export function ClientProfileForm({
  fullName,
  email,
  phone,
  linkedBusinessCount,
}: ClientProfileFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [formKey, setFormKey] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  function enterEdit() {
    setStatusMessage(null);
    setFormKey((key) => key + 1);
    setMode("edit");
  }

  function cancelEdit() {
    setMode("view");
  }

  function handleSaved(message?: string) {
    setMode("view");
    setStatusMessage(message ?? "Profile saved.");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">
            {mode === "edit" ? "Edit contact information" : "Contact information"}
          </CardTitle>
          {mode === "edit" ? (
            <CardDescription className="mt-1.5">
              Keep your details up to date so your practitioners can reach you.
              {linkedBusinessCount > 1
                ? " Changes apply to all of your linked businesses."
                : null}
            </CardDescription>
          ) : null}
        </div>
        {mode === "view" ? (
          <Button type="button" variant="outline" size="sm" onClick={enterEdit}>
            <Pencil className="size-3.5" aria-hidden />
            Edit
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {statusMessage && mode === "view" ? (
          <p className="text-sm text-green-700" role="status">
            {statusMessage}
          </p>
        ) : null}

        {mode === "edit" ? (
          <ClientProfileEditForm
            fullName={fullName}
            email={email}
            phone={phone}
            formKey={formKey}
            onCancel={cancelEdit}
            onSaved={handleSaved}
          />
        ) : (
          <div className="space-y-3 text-sm">
            <ProfileField label="Full name" value={fullName} />
            <ProfileField label="Email" value={email} />
            <ProfileField label="Phone number" value={phone} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
