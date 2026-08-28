"use client";

import { useActionState, useMemo, useState } from "react";
import { bookAppointmentAction } from "@/actions/appointments";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { DAY_OF_WEEK_LABELS } from "@/lib/appointments/constants";
import {
  generateAvailableSlots,
  listUpcomingDates,
  slotTimeLabel,
  type AvailabilityRangeInput,
  type BlockingIntervalInput,
} from "@/lib/appointments/slots";
import { formatWeekParam } from "@/lib/appointments/time";
import { cn } from "@/lib/utils";

export type BookingBusinessOption = {
  clientId: string;
  businessId: string;
  businessName: string;
  durationMinutes: number;
  availability: AvailabilityRangeInput[];
};

type BookingWizardProps = {
  businesses: BookingBusinessOption[];
  blocking: (BlockingIntervalInput & { business_id: string })[];
};

const BOOKING_DAY_COUNT = 14;

export function BookingWizard({ businesses, blocking }: BookingWizardProps) {
  const [selectedClientId, setSelectedClientId] = useState(
    businesses.length === 1 ? businesses[0].clientId : "",
  );
  const [selectedDateKey, setSelectedDateKey] = useState(() =>
    formatWeekParam(new Date()),
  );
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [state, formAction, pending] = useActionState(
    bookAppointmentAction,
    null,
  );

  const selectedBusiness = businesses.find(
    (item) => item.clientId === selectedClientId,
  );

  const dates = useMemo(() => listUpcomingDates(BOOKING_DAY_COUNT), []);

  const availableSlots = useMemo(() => {
    if (!selectedBusiness) {
      return [];
    }
    const dateLocal = new Date(`${selectedDateKey}T00:00:00`);
    if (Number.isNaN(dateLocal.getTime())) {
      return [];
    }
    const businessBlocking = blocking.filter(
      (row) => row.business_id === selectedBusiness.businessId,
    );
    return generateAvailableSlots({
      dateLocal,
      durationMinutes: selectedBusiness.durationMinutes,
      availability: selectedBusiness.availability,
      blocking: businessBlocking,
    });
  }, [blocking, selectedBusiness, selectedDateKey]);

  function handleBusinessChange(clientId: string) {
    setSelectedClientId(clientId);
    setSelectedSlot("");
  }

  function handleDateChange(dateKey: string) {
    setSelectedDateKey(dateKey);
    setSelectedSlot("");
  }

  if (businesses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No business linked</CardTitle>
          <CardDescription>
            You are not linked to any business yet. Ask the business owner to
            add you as a client using your account email, then sign in again.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {businesses.length > 1 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Choose a business</CardTitle>
            <CardDescription>
              You are linked to more than one business. Select where you want to
              book.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Label htmlFor="booking-business" className="sr-only">
              Business
            </Label>
            <select
              id="booking-business"
              value={selectedClientId}
              onChange={(event) => handleBusinessChange(event.target.value)}
              className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
            >
              <option value="" disabled>
                Select a business
              </option>
              {businesses.map((item) => (
                <option key={item.clientId} value={item.clientId}>
                  {item.businessName}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>
      ) : null}

      {selectedBusiness ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Book with {selectedBusiness.businessName}
              </CardTitle>
              <CardDescription>
                Appointments are {selectedBusiness.durationMinutes} minutes.
                Requests need business approval.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium text-zinc-900">Date</p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {dates.map((date) => {
                    const key = formatWeekParam(date);
                    const isSelected = key === selectedDateKey;
                    const weekday = DAY_OF_WEEK_LABELS[date.getDay()]?.slice(0, 3);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleDateChange(key)}
                        className={cn(
                          "min-w-[4.5rem] shrink-0 rounded-md border px-3 py-2 text-center text-sm transition-colors",
                          isSelected
                            ? "border-zinc-900 bg-zinc-900 text-white"
                            : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
                        )}
                      >
                        <span className="block text-xs opacity-80">
                          {weekday}
                        </span>
                        <span className="block font-semibold">
                          {date.getDate()}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-zinc-900">
                  Available times
                </p>
                {availableSlots.length === 0 ? (
                  <p className="text-sm text-zinc-600">
                    No available slots on this day. Try another date.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {availableSlots.map((slot) => {
                      const isSelected = selectedSlot === slot;
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={cn(
                            "rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                            isSelected
                              ? "border-zinc-900 bg-zinc-900 text-white"
                              : "border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50",
                          )}
                        >
                          {slotTimeLabel(slot)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {selectedSlot ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Confirm request</CardTitle>
                <CardDescription>
                  {selectedBusiness.businessName} ·{" "}
                  {new Date(selectedSlot).toLocaleString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  ({selectedBusiness.durationMinutes} min)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form action={formAction} className="space-y-3">
                  <input
                    type="hidden"
                    name="clientId"
                    value={selectedBusiness.clientId}
                  />
                  <input
                    type="hidden"
                    name="startTimeLocal"
                    value={selectedSlot}
                  />
                  <Button type="submit" disabled={pending}>
                    {pending ? "Submitting…" : "Request appointment"}
                  </Button>
                  {state && !state.success ? (
                    <p className="text-sm text-red-600" role="alert">
                      {state.error}
                    </p>
                  ) : null}
                </form>
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
