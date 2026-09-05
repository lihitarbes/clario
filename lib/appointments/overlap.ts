import type { SupabaseClient } from "@supabase/supabase-js";
import type { BusinessAvailability, Database } from "@/types/database";
import {
  formatWeekParam,
  joinDateTimeLocal,
  parseDateTimeLocal,
  timeRangesOverlap,
} from "@/lib/appointments/time";

type AppSupabaseClient = SupabaseClient<Database>;

/** Statuses that reserve a calendar slot (business-wide). */
export const BLOCKING_APPOINTMENT_STATUSES = [
  "pending",
  "scheduled",
  "completed",
] as const;

export type BlockingAppointmentStatus =
  (typeof BLOCKING_APPOINTMENT_STATUSES)[number];

/** User-facing message when availability overlaps a blocking appointment. */
export const AVAILABILITY_APPOINTMENT_OVERLAP_MESSAGE =
  "This time overlaps an existing appointment. Please choose another time.";

/**
 * How far ahead recurring availability is checked against existing appointments.
 * Matches the client booking date horizon (14 days) — no indefinite scan.
 */
export const RECURRING_AVAILABILITY_APPOINTMENT_HORIZON_DAYS = 14;

type AppointmentIntervalInput = {
  status: string;
  start_time: string;
  end_time: string;
};

function isBlockingAppointmentStatus(
  status: string,
): status is BlockingAppointmentStatus {
  return (BLOCKING_APPOINTMENT_STATUSES as readonly string[]).includes(status);
}

function normalizeClock(time: string): string {
  return time.slice(0, 5);
}

/** True when [startA, endA) overlaps [startB, endB) in epoch ms (adjacent = no overlap). */
function intervalsOverlapMs(
  startA: number,
  endA: number,
  startB: number,
  endB: number,
): boolean {
  return startA < endB && startB < endA;
}

/**
 * Whether a proposed availability instant range overlaps any blocking appointment.
 * Cancelled (and any non-blocking status) are ignored.
 */
export function availabilityRangeOverlapsBlockingAppointments(
  appointments: AppointmentIntervalInput[],
  rangeStart: Date,
  rangeEnd: Date,
): boolean {
  const rangeStartMs = rangeStart.getTime();
  const rangeEndMs = rangeEnd.getTime();
  if (!(rangeEndMs > rangeStartMs)) {
    return false;
  }

  return appointments.some((appointment) => {
    if (!isBlockingAppointmentStatus(appointment.status)) {
      return false;
    }
    const startMs = new Date(appointment.start_time).getTime();
    const endMs = new Date(appointment.end_time).getTime();
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
      return false;
    }
    return intervalsOverlapMs(rangeStartMs, rangeEndMs, startMs, endMs);
  });
}

/**
 * Build local start/end Dates for a same-day availability clock range.
 * Returns null when the range is invalid.
 */
export function availabilityLocalRange(
  dateKey: string,
  startTime: string,
  endTime: string,
): { start: Date; end: Date } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return null;
  }
  const start = parseDateTimeLocal(
    joinDateTimeLocal(dateKey, normalizeClock(startTime)),
  );
  const end = parseDateTimeLocal(
    joinDateTimeLocal(dateKey, normalizeClock(endTime)),
  );
  if (!start || !end || end.getTime() <= start.getTime()) {
    return null;
  }
  return { start, end };
}

/**
 * Specific-date availability vs appointments on that calendar date/time.
 */
export function specificDateAvailabilityOverlapsBlockingAppointments(
  appointments: AppointmentIntervalInput[],
  specificDate: string,
  startTime: string,
  endTime: string,
): boolean {
  const range = availabilityLocalRange(
    specificDate.slice(0, 10),
    startTime,
    endTime,
  );
  if (!range) {
    return false;
  }
  return availabilityRangeOverlapsBlockingAppointments(
    appointments,
    range.start,
    range.end,
  );
}

/**
 * Recurring weekly availability vs appointments whose local weekday matches.
 * Callers should pass only appointments inside a bounded horizon.
 */
export function recurringAvailabilityOverlapsBlockingAppointments(
  appointments: AppointmentIntervalInput[],
  dayOfWeek: number,
  startTime: string,
  endTime: string,
): boolean {
  return appointments.some((appointment) => {
    if (!isBlockingAppointmentStatus(appointment.status)) {
      return false;
    }
    const appointmentStart = new Date(appointment.start_time);
    if (Number.isNaN(appointmentStart.getTime())) {
      return false;
    }
    if (appointmentStart.getDay() !== dayOfWeek) {
      return false;
    }
    const dateKey = formatWeekParam(appointmentStart);
    const range = availabilityLocalRange(dateKey, startTime, endTime);
    if (!range) {
      return false;
    }
    const appointmentEnd = new Date(appointment.end_time);
    if (Number.isNaN(appointmentEnd.getTime())) {
      return false;
    }
    return intervalsOverlapMs(
      range.start.getTime(),
      range.end.getTime(),
      appointmentStart.getTime(),
      appointmentEnd.getTime(),
    );
  });
}

type AvailabilityOverlapRow = Pick<
  BusinessAvailability,
  "id" | "day_of_week" | "specific_date" | "start_time" | "end_time"
>;

/** Overlap among recurring weekly ranges on the same weekday. */
export function recurringAvailabilityRangesOverlap(
  existing: AvailabilityOverlapRow[],
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  excludeId?: string,
): boolean {
  return existing.some((row) => {
    if (row.specific_date !== null || row.day_of_week !== dayOfWeek) {
      return false;
    }
    if (excludeId && row.id === excludeId) {
      return false;
    }
    return timeRangesOverlap(row.start_time, row.end_time, startTime, endTime);
  });
}

/** Overlap among date-specific ranges on the same calendar date. */
export function specificDateAvailabilityRangesOverlap(
  existing: AvailabilityOverlapRow[],
  specificDate: string,
  startTime: string,
  endTime: string,
  excludeId?: string,
): boolean {
  const dateKey = specificDate.slice(0, 10);
  return existing.some((row) => {
    if (!row.specific_date || row.specific_date.slice(0, 10) !== dateKey) {
      return false;
    }
    if (excludeId && row.id === excludeId) {
      return false;
    }
    return timeRangesOverlap(row.start_time, row.end_time, startTime, endTime);
  });
}

/** @deprecated Prefer recurringAvailabilityRangesOverlap */
export function availabilityRangesOverlap(
  existing: Pick<
    BusinessAvailability,
    "id" | "day_of_week" | "start_time" | "end_time"
  >[],
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  excludeId?: string,
): boolean {
  return recurringAvailabilityRangesOverlap(
    existing.map((row) => ({ ...row, specific_date: null })),
    dayOfWeek,
    startTime,
    endTime,
    excludeId,
  );
}

/**
 * Server-side check for overlapping blocking appointments
 * (pending, scheduled, completed) in the same business.
 */
export async function hasBlockingAppointmentOverlap(
  supabase: AppSupabaseClient,
  businessId: string,
  startTimeIso: string,
  endTimeIso: string,
  excludeAppointmentId?: string,
): Promise<boolean> {
  let query = supabase
    .from("appointments")
    .select("id")
    .eq("business_id", businessId)
    .in("status", [...BLOCKING_APPOINTMENT_STATUSES])
    .lt("start_time", endTimeIso)
    .gt("end_time", startTimeIso);

  if (excludeAppointmentId) {
    query = query.neq("id", excludeAppointmentId);
  }

  const { data, error } = await query.limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return (data?.length ?? 0) > 0;
}

/**
 * Blocking appointments that intersect [horizonStart, horizonEnd).
 * Used when validating recurring availability against a bounded window.
 */
export async function listBlockingAppointmentsInHorizon(
  supabase: AppSupabaseClient,
  businessId: string,
  horizonStart: Date,
  horizonEnd: Date,
): Promise<AppointmentIntervalInput[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select("status, start_time, end_time")
    .eq("business_id", businessId)
    .in("status", [...BLOCKING_APPOINTMENT_STATUSES])
    .lt("start_time", horizonEnd.toISOString())
    .gt("end_time", horizonStart.toISOString());

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

/** @deprecated Use hasBlockingAppointmentOverlap — kept as alias during M5. */
export const hasScheduledAppointmentOverlap = hasBlockingAppointmentOverlap;
