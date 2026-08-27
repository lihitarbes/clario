"use client";

import { useActionState } from "react";
import {
  createAvailabilityAction,
  deleteAvailabilityAction,
  updateAvailabilityAction,
} from "@/actions/availability";
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
import { DAY_OF_WEEK_LABELS } from "@/lib/appointments/constants";
import { formatTimeDisplay } from "@/lib/appointments/display";
import type { BusinessAvailability } from "@/types/database";

type AvailabilitySettingsProps = {
  slots: BusinessAvailability[];
};

function dayOptions() {
  return DAY_OF_WEEK_LABELS.map((label, value) => ({ label, value }));
}

export function AvailabilitySettings({ slots }: AvailabilitySettingsProps) {
  const [createState, createAction, createPending] = useActionState(
    createAvailabilityAction,
    null,
  );

  const sorted = [...slots].sort((a, b) => {
    if (a.day_of_week !== b.day_of_week) {
      return a.day_of_week - b.day_of_week;
    }
    return a.start_time.localeCompare(b.start_time);
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add availability</CardTitle>
          <CardDescription>
            Set recurring weekly hours when clients can book (used in later
            milestones).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createAction} className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="add-dayOfWeek">Day</Label>
              <select
                id="add-dayOfWeek"
                name="dayOfWeek"
                required
                className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
              >
                {dayOptions().map(({ label, value }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-startTime">Start</Label>
              <Input id="add-startTime" name="startTime" type="time" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-endTime">End</Label>
              <Input id="add-endTime" name="endTime" type="time" required />
            </div>

            <div className="flex items-end">
              <Button type="submit" disabled={createPending}>
                {createPending ? "Adding…" : "Add"}
              </Button>
            </div>

            {createState && !createState.success ? (
              <p className="text-sm text-red-600 sm:col-span-4" role="alert">
                {createState.error}
              </p>
            ) : null}

            {createState?.success && createState.data?.message ? (
              <p className="text-sm text-green-700 sm:col-span-4" role="status">
                {createState.data.message}
              </p>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Weekly availability</CardTitle>
          <CardDescription>
            Your recurring working hours by day of the week.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sorted.length === 0 ? (
            <p className="text-sm text-zinc-600">
              No availability configured yet.
            </p>
          ) : (
            <ul className="space-y-4">
              {sorted.map((slot) => (
                <AvailabilityRow key={slot.id} slot={slot} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AvailabilityRow({ slot }: { slot: BusinessAvailability }) {
  const [updateState, updateAction, updatePending] = useActionState(
    updateAvailabilityAction,
    null,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteAvailabilityAction,
    null,
  );

  function handleDelete(event: React.FormEvent<HTMLFormElement>) {
    if (!window.confirm("Remove this availability range?")) {
      event.preventDefault();
    }
  }

  const error =
    (updateState && !updateState.success ? updateState.error : null) ??
    (deleteState && !deleteState.success ? deleteState.error : null);

  const successMessage =
    (updateState?.success && updateState.data?.message
      ? updateState.data.message
      : null) ??
    (deleteState?.success && deleteState.data?.message
      ? deleteState.data.message
      : null);

  return (
    <li className="rounded-lg border border-zinc-200 p-4">
      <form action={updateAction} className="grid gap-4 sm:grid-cols-4">
        <input type="hidden" name="availabilityId" value={slot.id} />

        <div className="space-y-2">
          <Label htmlFor={`day-${slot.id}`}>Day</Label>
          <select
            id={`day-${slot.id}`}
            name="dayOfWeek"
            defaultValue={slot.day_of_week}
            required
            className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          >
            {dayOptions().map(({ label, value }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`start-${slot.id}`}>Start</Label>
          <Input
            id={`start-${slot.id}`}
            name="startTime"
            type="time"
            defaultValue={formatTimeDisplay(slot.start_time)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`end-${slot.id}`}>End</Label>
          <Input
            id={`end-${slot.id}`}
            name="endTime"
            type="time"
            defaultValue={formatTimeDisplay(slot.end_time)}
            required
          />
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <Button type="submit" size="sm" disabled={updatePending || deletePending}>
            {updatePending ? "Saving…" : "Save"}
          </Button>
        </div>

        {error ? (
          <p className="text-sm text-red-600 sm:col-span-4" role="alert">
            {error}
          </p>
        ) : null}

        {successMessage ? (
          <p className="text-sm text-green-700 sm:col-span-4" role="status">
            {successMessage}
          </p>
        ) : null}
      </form>

      <form
        action={deleteAction}
        onSubmit={handleDelete}
        className="mt-3 border-t border-zinc-100 pt-3"
      >
        <input type="hidden" name="availabilityId" value={slot.id} />
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          disabled={updatePending || deletePending}
        >
          {deletePending ? "Removing…" : "Remove"}
        </Button>
      </form>
    </li>
  );
}
