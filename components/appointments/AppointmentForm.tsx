"use client";

import { useActionState } from "react";
import {
  createAppointmentAction,
  updateAppointmentAction,
} from "@/actions/appointments";
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
import { computeDurationMinutes } from "@/lib/appointments/display";
import { formatDateTimeLocal } from "@/lib/appointments/time";
import type { Appointment, Client } from "@/types/database";

type ClientOption = Pick<Client, "id" | "full_name">;

type AppointmentFormProps =
  | {
      mode: "create";
      clients: ClientOption[];
      defaultDurationMinutes: number;
      defaultStartTimeLocal?: string;
      appointment?: undefined;
    }
  | {
      mode: "edit";
      clients: ClientOption[];
      defaultDurationMinutes: number;
      appointment: Appointment;
      defaultStartTimeLocal?: undefined;
    };

export function AppointmentForm({
  mode,
  clients,
  defaultDurationMinutes,
  appointment,
  defaultStartTimeLocal,
}: AppointmentFormProps) {
  const action =
    mode === "create" ? createAppointmentAction : updateAppointmentAction;
  const [state, formAction, pending] = useActionState(action, null);

  const startTimeLocal =
    mode === "edit"
      ? formatDateTimeLocal(new Date(appointment.start_time))
      : (defaultStartTimeLocal ?? "");

  const durationMinutes =
    mode === "edit"
      ? computeDurationMinutes(appointment.start_time, appointment.end_time)
      : defaultDurationMinutes;

  if (clients.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No active clients</CardTitle>
          <CardDescription>
            Add an active client before scheduling appointments.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {mode === "create" ? "New appointment" : "Edit appointment"}
        </CardTitle>
        <CardDescription>
          Times use 15-minute increments. Appointments are stored in UTC.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {mode === "edit" ? (
            <input type="hidden" name="appointmentId" value={appointment.id} />
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="clientId">Client</Label>
            <select
              id="clientId"
              name="clientId"
              defaultValue={mode === "edit" ? appointment.client_id : ""}
              required
              className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
            >
              <option value="" disabled>
                Select a client
              </option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.full_name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startTimeLocal">Start date & time</Label>
              <Input
                id="startTimeLocal"
                name="startTimeLocal"
                type="datetime-local"
                step={900}
                defaultValue={startTimeLocal}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="durationMinutes">Duration (minutes)</Label>
              <Input
                id="durationMinutes"
                name="durationMinutes"
                type="number"
                min={15}
                max={480}
                step={15}
                defaultValue={durationMinutes}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={appointment?.notes ?? ""}
              placeholder="Optional internal notes"
            />
          </div>

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

          <Button type="submit" disabled={pending}>
            {pending
              ? mode === "create"
                ? "Creating…"
                : "Saving…"
              : mode === "create"
                ? "Create appointment"
                : "Save changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
