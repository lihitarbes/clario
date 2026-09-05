"use client";

import { useActionState, useMemo, useState } from "react";
import {
  createAppointmentAction,
  updateAppointmentAction,
} from "@/actions/appointments";
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
import { computeDurationMinutes } from "@/lib/appointments/display";
import {
  formatDateTimeLocal,
  joinDateTimeLocal,
  listDurationOptions,
  listSlotTimes,
  splitDateTimeLocal,
} from "@/lib/appointments/time";
import type { Appointment, Client } from "@/types/database";

type ClientOption = Pick<Client, "id" | "full_name">;

const selectClassName =
  "flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400";

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

  const initialStartLocal =
    mode === "edit"
      ? formatDateTimeLocal(new Date(appointment.start_time))
      : (defaultStartTimeLocal ?? "");

  const initialParts = splitDateTimeLocal(initialStartLocal);
  const [dateLocal, setDateLocal] = useState(initialParts.date);
  const [timeLocal, setTimeLocal] = useState(
    initialParts.time || "09:00",
  );

  const durationMinutes =
    mode === "edit"
      ? computeDurationMinutes(appointment.start_time, appointment.end_time)
      : defaultDurationMinutes;

  const slotTimes = useMemo(() => listSlotTimes(), []);
  const durationOptions = useMemo(() => {
    const options = listDurationOptions();
    if (!options.includes(durationMinutes)) {
      return [...options, durationMinutes].sort((a, b) => a - b);
    }
    return options;
  }, [durationMinutes]);
  const startTimeLocal = joinDateTimeLocal(dateLocal, timeLocal);

  // Ensure the select has a matching option even if legacy data is off-slot.
  const timeOptions = slotTimes.includes(timeLocal)
    ? slotTimes
    : [timeLocal, ...slotTimes].sort();

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
          Choose a date and a 15-minute start time.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {mode === "edit" ? (
            <input type="hidden" name="appointmentId" value={appointment.id} />
          ) : null}

          <input type="hidden" name="startTimeLocal" value={startTimeLocal} />

          <div className="space-y-2">
            <Label htmlFor="clientId">Client</Label>
            <select
              id="clientId"
              name="clientId"
              defaultValue={mode === "edit" ? appointment.client_id : ""}
              required
              className={selectClassName}
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

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="startDate">Date</Label>
              <Input
                id="startDate"
                type="date"
                value={dateLocal}
                onChange={(event) => setDateLocal(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="startTime">Start time</Label>
              <select
                id="startTime"
                value={timeLocal}
                onChange={(event) => setTimeLocal(event.target.value)}
                required
                className={selectClassName}
              >
                {timeOptions.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="durationMinutes">Duration</Label>
              <select
                id="durationMinutes"
                name="durationMinutes"
                defaultValue={durationMinutes}
                required
                className={selectClassName}
              >
                {durationOptions.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes} minutes
                  </option>
                ))}
              </select>
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
            <ActionPendingLabel
              pending={pending}
              pendingLabel={mode === "create" ? "Creating…" : "Saving…"}
              idleLabel={
                mode === "create" ? "Create appointment" : "Save changes"
              }
            />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
