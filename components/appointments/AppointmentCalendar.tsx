import Link from "next/link";
import type { AppointmentWithClient } from "@/actions/appointments";
import { DAY_OF_WEEK_LABELS } from "@/lib/appointments/constants";
import {
  appointmentCalendarStatusLabel,
  appointmentStatusClassName,
  availabilityCalendarClassName,
  formatTimeDisplay,
} from "@/lib/appointments/display";
import { availabilityRangesForDate } from "@/lib/appointments/slots";
import {
  formatWeekParam,
  getAppointmentBlockLayout,
  getTimeOfDayBlockLayout,
  getWeekDays,
  getWeekVisibleHourRange,
  parseWeekParam,
} from "@/lib/appointments/time";
import { cn } from "@/lib/utils";
import type { BusinessAvailability } from "@/types/database";

type AppointmentCalendarProps = {
  weekStart: string;
  appointments: AppointmentWithClient[];
  availability?: BusinessAvailability[];
};

function formatHourLabel(hour: number): string {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatClockLabel(time: string): string {
  const [hoursRaw, minutesRaw] = formatTimeDisplay(time).split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return formatTimeDisplay(time);
  }
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function AppointmentCalendar({
  weekStart,
  appointments,
  availability = [],
}: AppointmentCalendarProps) {
  const start = parseWeekParam(weekStart);
  if (!start) {
    return null;
  }

  const days = getWeekDays(start);
  const hourRange = getWeekVisibleHourRange(appointments, availability);
  const hourCount = hourRange.endHour - hourRange.startHour;
  const hours = Array.from(
    { length: hourCount },
    (_, i) => hourRange.startHour + i,
  );
  const today = new Date();
  const gridHeightPx = Math.max(hourCount * 64, 320);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-zinc-600">
        <span className="inline-flex items-center gap-1.5">
          <span
            className={cn(
              "inline-block size-2.5 rounded-sm border",
              availabilityCalendarClassName,
            )}
            aria-hidden
          />
          Open slot
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className={cn(
              "inline-block size-2.5 rounded-sm border",
              appointmentStatusClassName("pending"),
            )}
            aria-hidden
          />
          Pending
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className={cn(
              "inline-block size-2.5 rounded-sm border",
              appointmentStatusClassName("scheduled"),
            )}
            aria-hidden
          />
          Booked
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className={cn(
              "inline-block size-2.5 rounded-sm border",
              appointmentStatusClassName("completed"),
            )}
            aria-hidden
          />
          Completed
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className={cn(
              "inline-block size-2.5 rounded-sm border",
              appointmentStatusClassName("cancelled"),
            )}
            aria-hidden
          />
          Cancelled
        </span>
      </div>

      {appointments.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-200 bg-white px-4 py-4 text-center">
          <p className="text-sm text-zinc-600">
            No appointments this week.
            {availability.length > 0
              ? " Open bookable slots are shown on the grid."
              : " Create one to get started."}
          </p>
        </div>
      ) : null}

      <div className="rounded-lg border border-zinc-200 bg-white">
        <p className="border-b border-zinc-100 px-3 py-2 text-xs text-zinc-500 sm:hidden">
          Swipe horizontally to see the full week.
        </p>
        <div className="overflow-x-auto">
          <div className="min-w-[44rem]">
            <div className="grid grid-cols-[3rem_repeat(7,minmax(0,1fr))] border-b border-zinc-200">
              <div className="border-r border-zinc-100" aria-hidden />
              {days.map((day) => {
                const isToday = isSameLocalDay(day, today);
                return (
                  <div
                    key={formatWeekParam(day)}
                    className={cn(
                      "border-r border-zinc-100 px-1 py-2 text-center last:border-r-0",
                      isToday && "bg-zinc-50",
                    )}
                  >
                    <p className="text-xs font-medium text-zinc-500">
                      {DAY_OF_WEEK_LABELS[day.getDay()]?.slice(0, 3)}
                    </p>
                    <p
                      className={cn(
                        "mt-0.5 text-sm font-semibold",
                        isToday ? "text-zinc-900" : "text-zinc-700",
                      )}
                    >
                      {day.getDate()}
                    </p>
                  </div>
                );
              })}
            </div>

            <div
              className="grid grid-cols-[3rem_repeat(7,minmax(0,1fr))]"
              style={{ height: gridHeightPx }}
            >
              <div className="relative border-r border-zinc-100">
                {hours.map((hour, index) => (
                  <div
                    key={hour}
                    className="absolute right-1 -translate-y-1/2 text-[10px] leading-none text-zinc-400"
                    style={{ top: `${(index / hourCount) * 100}%` }}
                  >
                    {formatHourLabel(hour)}
                  </div>
                ))}
              </div>

              {days.map((day) => {
                const isToday = isSameLocalDay(day, today);
                const dayAppointments = appointments.filter((appointment) =>
                  isSameLocalDay(new Date(appointment.start_time), day),
                );
                const dayAvailability = availabilityRangesForDate(
                  day,
                  availability,
                ).map((slot) => ({
                  id: slot.id,
                  start_time: formatTimeDisplay(slot.start_time),
                  end_time: formatTimeDisplay(slot.end_time),
                }));

                return (
                  <div
                    key={formatWeekParam(day)}
                    className={cn(
                      "relative border-r border-zinc-100 last:border-r-0",
                      isToday && "bg-zinc-50/60",
                    )}
                  >
                    {hours.map((hour, index) => (
                      <div
                        key={hour}
                        className="absolute inset-x-0 border-t border-zinc-100"
                        style={{ top: `${(index / hourCount) * 100}%` }}
                        aria-hidden
                      />
                    ))}

                    {dayAvailability.map((slot) => {
                      const layout = getTimeOfDayBlockLayout(
                        slot.start_time,
                        slot.end_time,
                        hourRange,
                      );
                      const startLabel = formatClockLabel(slot.start_time);
                      const endLabel = formatClockLabel(slot.end_time);

                      return (
                        <div
                          key={
                            slot.id ??
                            `${formatWeekParam(day)}-${slot.start_time}-${slot.end_time}`
                          }
                          className={cn(
                            "pointer-events-none absolute inset-x-0.5 z-0 overflow-hidden rounded-md px-1.5 py-1",
                            availabilityCalendarClassName,
                          )}
                          style={{
                            top: `${layout.topPercent}%`,
                            height: `${Math.max(layout.heightPercent, 3)}%`,
                            minHeight: "1.25rem",
                          }}
                          title={`Open slot · ${startLabel}–${endLabel}`}
                        >
                          <span className="block truncate text-[10px] font-medium leading-tight">
                            Open slot · {startLabel}–{endLabel}
                          </span>
                        </div>
                      );
                    })}

                    {dayAppointments.map((appointment) => {
                      const layout = getAppointmentBlockLayout(
                        appointment.start_time,
                        appointment.end_time,
                        hourRange,
                      );
                      const clientName =
                        appointment.clients?.full_name ?? "Unknown client";
                      const statusLabel = appointmentCalendarStatusLabel(
                        appointment.status,
                      );
                      const startLabel = new Date(
                        appointment.start_time,
                      ).toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                      });
                      const endLabel = new Date(
                        appointment.end_time,
                      ).toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                      });

                      return (
                        <Link
                          key={appointment.id}
                          href={`/calendar/${appointment.id}`}
                          title={`${statusLabel} · ${clientName} · ${startLabel}–${endLabel}`}
                          className={cn(
                            "absolute inset-x-0.5 z-10 overflow-hidden rounded-md border px-1.5 py-1 text-left shadow-sm transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400",
                            appointmentStatusClassName(appointment.status),
                            appointment.status === "cancelled" &&
                              "opacity-90 line-through decoration-red-300",
                          )}
                          style={{
                            top: `${layout.topPercent}%`,
                            height: `${Math.max(layout.heightPercent, 4)}%`,
                            minHeight: "1.75rem",
                          }}
                        >
                          <span className="block truncate text-[11px] font-semibold leading-tight">
                            {statusLabel} · {clientName}
                          </span>
                          <span className="block truncate text-[10px] leading-tight opacity-80">
                            {startLabel}–{endLabel}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
