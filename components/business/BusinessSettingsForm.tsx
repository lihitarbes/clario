"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { updateBusinessSettingsAction } from "@/actions/business";
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
import type { Business } from "@/types/database";

type BusinessSettingsFormProps = {
  business: Business;
};

function ProfileField({
  label,
  value,
  emptyLabel = "Not provided",
  multiline = false,
}: {
  label: string;
  value: string | number | null | undefined;
  emptyLabel?: string;
  multiline?: boolean;
}) {
  const display =
    typeof value === "number" ? String(value) : (value?.trim() ?? "");
  const hasContent = display.length > 0;

  return (
    <div>
      <p className="font-medium text-zinc-900">{label}</p>
      {hasContent ? (
        <p
          className={
            multiline ? "whitespace-pre-wrap text-zinc-600" : "text-zinc-600"
          }
        >
          {display}
        </p>
      ) : (
        <p className="text-sm italic text-zinc-500">{emptyLabel}</p>
      )}
    </div>
  );
}

function BusinessSettingsEditForm({
  business,
  formKey,
  onCancel,
  onSaved,
}: {
  business: Business;
  formKey: number;
  onCancel: () => void;
  onSaved: (message?: string) => void;
}) {
  const [state, formAction, pending] = useActionState(
    updateBusinessSettingsAction,
    null,
  );
  const onSavedRef = useRef(onSaved);

  useEffect(() => {
    onSavedRef.current = onSaved;
  }, [onSaved]);

  useEffect(() => {
    if (state?.success) {
      onSavedRef.current(state.data?.message);
    }
  }, [state]);

  return (
    <form key={formKey} action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Business name</Label>
        <Input
          id="name"
          name="name"
          type="text"
          defaultValue={business.name}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={business.description ?? ""}
          placeholder="Optional description for your business"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={business.phone ?? ""}
            autoComplete="tel"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Business email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={business.email ?? ""}
            autoComplete="email"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="defaultAppointmentDurationMinutes">
          Default appointment duration (minutes)
        </Label>
        <Input
          id="defaultAppointmentDurationMinutes"
          name="defaultAppointmentDurationMinutes"
          type="number"
          min={15}
          max={480}
          step={15}
          defaultValue={business.default_appointment_duration_minutes}
          required
        />
        <p className="text-xs text-zinc-500">
          Used as a default when creating appointments or new bookable slots
          (15–480 minutes).
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

export function BusinessSettingsForm({ business }: BusinessSettingsFormProps) {
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
    setStatusMessage(message ?? "Settings saved.");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">
            {mode === "edit" ? "Edit business profile" : "Business profile"}
          </CardTitle>
          {mode === "edit" ? (
            <CardDescription className="mt-1.5">
              Update your business details and appointment defaults.
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
          <BusinessSettingsEditForm
            business={business}
            formKey={formKey}
            onCancel={cancelEdit}
            onSaved={handleSaved}
          />
        ) : (
          <div className="space-y-3 text-sm">
            <ProfileField label="Business name" value={business.name} />
            <ProfileField
              label="Description"
              value={business.description}
              multiline
            />
            <ProfileField label="Phone" value={business.phone} />
            <ProfileField label="Business email" value={business.email} />
            <ProfileField
              label="Default appointment duration"
              value={`${business.default_appointment_duration_minutes} minutes`}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
