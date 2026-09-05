"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createAvailabilityAction,
  createSpecificDateAvailabilityAction,
  deleteAvailabilityAction,
  updateAvailabilityAction,
} from "@/actions/availability";
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
import { DAY_OF_WEEK_LABELS } from "@/lib/appointments/constants";
import { formatTimeDisplay } from "@/lib/appointments/display";
import { listSlotTimes } from "@/lib/appointments/time";
import type { BusinessAvailability } from "@/types/database";
import type { ActionResult } from "@/types/actions";

type AvailabilitySettingsProps = {
  slots: BusinessAvailability[];
};

type AvailabilityState = ActionResult<{
  message?: string;
  weekDate?: string;
}> | null;

const selectClassName =
  "flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400";

function dayOptions() {
  return DAY_OF_WEEK_LABELS.map((label, value) => ({ label, value }));
}

function timeOptionsFor(value?: string): string[] {
  const slots = listSlotTimes();
  if (!value) {
    return slots;
  }
  const normalized = value.slice(0, 5);
  if (slots.includes(normalized)) {
    return slots;
  }
  return [normalized, ...slots].sort();
}

function formatSpecificDateLabel(value: string) {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function isWeeklySlot(slot: BusinessAvailability): boolean {
  return slot.specific_date == null && slot.day_of_week != null;
}

function isSpecificDateSlot(slot: BusinessAvailability): boolean {
  return Boolean(slot.specific_date);
}

function useCloseOnSuccess(
  state: AvailabilityState,
  onSuccess: () => void,
) {
  const onSuccessRef = useRef(onSuccess);
  const router = useRouter();

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    if (state?.success) {
      onSuccessRef.current();
      const weekDate = state.data?.weekDate;
      if (weekDate) {
        router.push(`/calendar?week=${weekDate}`);
        return;
      }
      router.refresh();
    }
  }, [state, router]);
}

export function AvailabilitySettings({ slots }: AvailabilitySettingsProps) {
  const [weeklyAddOpen, setWeeklyAddOpen] = useState(false);
  const [dateAddOpen, setDateAddOpen] = useState(false);
  const [weeklyFormKey, setWeeklyFormKey] = useState(0);
  const [dateFormKey, setDateFormKey] = useState(0);

  const weeklySlots = [...slots]
    .filter(isWeeklySlot)
    .sort((a, b) => {
      const dayA = a.day_of_week ?? 0;
      const dayB = b.day_of_week ?? 0;
      if (dayA !== dayB) {
        return dayA - dayB;
      }
      return a.start_time.localeCompare(b.start_time);
    });

  const dateSlots = [...slots]
    .filter(isSpecificDateSlot)
    .sort((a, b) => {
      const dateCompare = (a.specific_date ?? "").localeCompare(
        b.specific_date ?? "",
      );
      if (dateCompare !== 0) {
        return dateCompare;
      }
      return a.start_time.localeCompare(b.start_time);
    });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">Recurring bookable slots</CardTitle>
            <CardDescription className="mt-1.5">
              Create appointment slots that repeat every week.
            </CardDescription>
          </div>
          {!weeklyAddOpen ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setWeeklyFormKey((key) => key + 1);
                setWeeklyAddOpen(true);
              }}
            >
              + Add recurring slot
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {weeklySlots.length === 0 ? (
            <p className="text-sm text-zinc-600">
              No recurring bookable slots yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {weeklySlots.map((slot) => (
                <WeeklyAvailabilityRow key={slot.id} slot={slot} />
              ))}
            </ul>
          )}

          {weeklyAddOpen ? (
            <AddWeeklyAvailabilityForm
              formKey={weeklyFormKey}
              onCancel={() => setWeeklyAddOpen(false)}
              onSuccess={() => setWeeklyAddOpen(false)}
            />
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">One-time bookable slots</CardTitle>
            <CardDescription className="mt-1.5">
              Open an appointment slot for a specific date.
            </CardDescription>
          </div>
          {!dateAddOpen ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setDateFormKey((key) => key + 1);
                setDateAddOpen(true);
              }}
            >
              + Add one-time slot
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {dateSlots.length === 0 ? (
            <p className="text-sm text-zinc-600">
              No one-time bookable slots yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {dateSlots.map((slot) => (
                <SpecificDateAvailabilityRow key={slot.id} slot={slot} />
              ))}
            </ul>
          )}

          {dateAddOpen ? (
            <AddSpecificDateAvailabilityForm
              formKey={dateFormKey}
              onCancel={() => setDateAddOpen(false)}
              onSuccess={() => setDateAddOpen(false)}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function AddWeeklyAvailabilityForm({
  formKey,
  onCancel,
  onSuccess,
}: {
  formKey: number;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    createAvailabilityAction,
    null,
  );
  const slotTimes = useMemo(() => listSlotTimes(), []);
  useCloseOnSuccess(state, onSuccess);

  return (
    <form
      key={formKey}
      action={formAction}
      className="space-y-4 rounded-md border border-zinc-200 bg-zinc-50 p-4"
    >
      <p className="text-sm font-medium text-zinc-900">Add recurring slot</p>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="add-dayOfWeek">Day</Label>
          <select
            id="add-dayOfWeek"
            name="dayOfWeek"
            required
            className={selectClassName}
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
          <select
            id="add-startTime"
            name="startTime"
            required
            defaultValue=""
            className={selectClassName}
          >
            <option value="" disabled>
              Select time
            </option>
            {slotTimes.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="add-endTime">End</Label>
          <select
            id="add-endTime"
            name="endTime"
            required
            defaultValue=""
            className={selectClassName}
          >
            <option value="" disabled>
              Select time
            </option>
            {slotTimes.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          <ActionPendingLabel
            pending={pending}
            pendingLabel="Adding…"
            idleLabel="Add"
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
      </div>

      {state && !state.success ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

function AddSpecificDateAvailabilityForm({
  formKey,
  onCancel,
  onSuccess,
}: {
  formKey: number;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    createSpecificDateAvailabilityAction,
    null,
  );
  const slotTimes = useMemo(() => listSlotTimes(), []);
  useCloseOnSuccess(state, onSuccess);

  return (
    <form
      key={formKey}
      action={formAction}
      className="space-y-4 rounded-md border border-zinc-200 bg-zinc-50 p-4"
    >
      <p className="text-sm font-medium text-zinc-900">Add one-time slot</p>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="add-specificDate">Date</Label>
          <Input
            id="add-specificDate"
            name="specificDate"
            type="date"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="add-date-startTime">Start</Label>
          <select
            id="add-date-startTime"
            name="startTime"
            required
            defaultValue=""
            className={selectClassName}
          >
            <option value="" disabled>
              Select time
            </option>
            {slotTimes.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="add-date-endTime">End</Label>
          <select
            id="add-date-endTime"
            name="endTime"
            required
            defaultValue=""
            className={selectClassName}
          >
            <option value="" disabled>
              Select time
            </option>
            {slotTimes.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          <ActionPendingLabel
            pending={pending}
            pendingLabel="Adding…"
            idleLabel="Add"
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
      </div>

      {state && !state.success ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

function WeeklyAvailabilityRow({ slot }: { slot: BusinessAvailability }) {
  const router = useRouter();
  const [updateState, updateAction, updatePending] = useActionState(
    updateAvailabilityAction,
    null,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteAvailabilityAction,
    null,
  );

  useEffect(() => {
    if (updateState?.success || deleteState?.success) {
      router.refresh();
    }
  }, [updateState, deleteState, router]);

  const startDisplay = formatTimeDisplay(slot.start_time);
  const endDisplay = formatTimeDisplay(slot.end_time);
  const startOptions = useMemo(
    () => timeOptionsFor(startDisplay),
    [startDisplay],
  );
  const endOptions = useMemo(() => timeOptionsFor(endDisplay), [endDisplay]);

  function handleDelete(event: React.FormEvent<HTMLFormElement>) {
    if (!window.confirm("Remove this recurring bookable slot?")) {
      event.preventDefault();
    }
  }

  const error =
    (updateState && !updateState.success ? updateState.error : null) ??
    (deleteState && !deleteState.success ? deleteState.error : null);

  return (
    <li className="rounded-md border border-zinc-200 p-3">
      <form action={updateAction} className="grid gap-3 sm:grid-cols-4">
        <input type="hidden" name="availabilityId" value={slot.id} />

        <div className="space-y-1.5">
          <Label htmlFor={`day-${slot.id}`}>Day</Label>
          <select
            id={`day-${slot.id}`}
            name="dayOfWeek"
            defaultValue={slot.day_of_week ?? 0}
            required
            className={selectClassName}
          >
            {dayOptions().map(({ label, value }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`start-${slot.id}`}>Start</Label>
          <select
            id={`start-${slot.id}`}
            name="startTime"
            defaultValue={startDisplay}
            required
            className={selectClassName}
          >
            {startOptions.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`end-${slot.id}`}>End</Label>
          <select
            id={`end-${slot.id}`}
            name="endTime"
            defaultValue={endDisplay}
            required
            className={selectClassName}
          >
            {endOptions.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <Button
            type="submit"
            size="sm"
            disabled={updatePending || deletePending}
          >
            <ActionPendingLabel
              pending={updatePending}
              pendingLabel="Saving…"
              idleLabel="Save"
            />
          </Button>
          <Button
            type="submit"
            form={`delete-weekly-${slot.id}`}
            variant="ghost"
            size="sm"
            disabled={updatePending || deletePending}
          >
            <ActionPendingLabel
              pending={deletePending}
              pendingLabel="Removing…"
              idleLabel="Remove"
            />
          </Button>
        </div>

        {error ? (
          <p className="text-sm text-red-600 sm:col-span-4" role="alert">
            {error}
          </p>
        ) : null}
      </form>

      <form
        id={`delete-weekly-${slot.id}`}
        action={deleteAction}
        onSubmit={handleDelete}
        className="hidden"
      >
        <input type="hidden" name="availabilityId" value={slot.id} />
      </form>
    </li>
  );
}

function SpecificDateAvailabilityRow({
  slot,
}: {
  slot: BusinessAvailability;
}) {
  const router = useRouter();
  const [updateState, updateAction, updatePending] = useActionState(
    updateAvailabilityAction,
    null,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteAvailabilityAction,
    null,
  );

  useEffect(() => {
    if (updateState?.success || deleteState?.success) {
      router.refresh();
    }
  }, [updateState, deleteState, router]);

  const startDisplay = formatTimeDisplay(slot.start_time);
  const endDisplay = formatTimeDisplay(slot.end_time);
  const dateValue = slot.specific_date?.slice(0, 10) ?? "";
  const startOptions = useMemo(
    () => timeOptionsFor(startDisplay),
    [startDisplay],
  );
  const endOptions = useMemo(() => timeOptionsFor(endDisplay), [endDisplay]);

  function handleDelete(event: React.FormEvent<HTMLFormElement>) {
    if (!window.confirm("Remove this one-time bookable slot?")) {
      event.preventDefault();
    }
  }

  const error =
    (updateState && !updateState.success ? updateState.error : null) ??
    (deleteState && !deleteState.success ? deleteState.error : null);

  return (
    <li className="rounded-md border border-zinc-200 p-3">
      <p className="mb-2 text-sm font-medium text-zinc-900">
        {formatSpecificDateLabel(dateValue)}
      </p>
      <form action={updateAction} className="grid gap-3 sm:grid-cols-4">
        <input type="hidden" name="availabilityId" value={slot.id} />

        <div className="space-y-1.5">
          <Label htmlFor={`date-${slot.id}`}>Date</Label>
          <Input
            id={`date-${slot.id}`}
            name="specificDate"
            type="date"
            defaultValue={dateValue}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`date-start-${slot.id}`}>Start</Label>
          <select
            id={`date-start-${slot.id}`}
            name="startTime"
            defaultValue={startDisplay}
            required
            className={selectClassName}
          >
            {startOptions.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`date-end-${slot.id}`}>End</Label>
          <select
            id={`date-end-${slot.id}`}
            name="endTime"
            defaultValue={endDisplay}
            required
            className={selectClassName}
          >
            {endOptions.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <Button
            type="submit"
            size="sm"
            disabled={updatePending || deletePending}
          >
            <ActionPendingLabel
              pending={updatePending}
              pendingLabel="Saving…"
              idleLabel="Save"
            />
          </Button>
          <Button
            type="submit"
            form={`delete-date-${slot.id}`}
            variant="ghost"
            size="sm"
            disabled={updatePending || deletePending}
          >
            <ActionPendingLabel
              pending={deletePending}
              pendingLabel="Removing…"
              idleLabel="Remove"
            />
          </Button>
        </div>

        {error ? (
          <p className="text-sm text-red-600 sm:col-span-4" role="alert">
            {error}
          </p>
        ) : null}
      </form>

      <form
        id={`delete-date-${slot.id}`}
        action={deleteAction}
        onSubmit={handleDelete}
        className="hidden"
      >
        <input type="hidden" name="availabilityId" value={slot.id} />
      </form>
    </li>
  );
}
