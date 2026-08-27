"use client";

import { useActionState } from "react";
import { updateBusinessSettingsAction } from "@/actions/business";
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

export function BusinessSettingsForm({ business }: BusinessSettingsFormProps) {
  const [state, formAction, pending] = useActionState(
    updateBusinessSettingsAction,
    null,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business profile</CardTitle>
        <CardDescription>
          Update your business details and default appointment duration.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
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
              Used when generating appointment slots (15–480 minutes).
            </p>
          </div>

          {state && !state.success ? (
            <p className="text-sm text-red-600" role="alert">
              {state.error}
            </p>
          ) : null}

          {state?.success ? (
            <p className="text-sm text-green-700" role="status">
              {state.data.message}
            </p>
          ) : null}

          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save settings"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
