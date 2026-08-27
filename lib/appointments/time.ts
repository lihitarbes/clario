import { SLOT_GRANULARITY_MINUTES } from "@/lib/appointments/constants";

/** Parses HH:MM or HH:MM:SS into minutes since midnight. */
export function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

/** Returns true when two same-day time ranges overlap (exclusive end). */
export function timeRangesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
): boolean {
  const aStart = timeToMinutes(startA);
  const aEnd = timeToMinutes(endA);
  const bStart = timeToMinutes(startB);
  const bEnd = timeToMinutes(endB);
  return aStart < bEnd && bStart < aEnd;
}

/** Returns true when `date` aligns to 15-minute slot boundaries. */
export function isSlotAligned(date: Date): boolean {
  return (
    date.getSeconds() === 0 &&
    date.getMilliseconds() === 0 &&
    date.getMinutes() % SLOT_GRANULARITY_MINUTES === 0
  );
}

/** Parses datetime-local input value as local time. */
export function parseDateTimeLocal(value: string): Date | null {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

/** Formats a Date for datetime-local input (local timezone). */
export function formatDateTimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Sunday 00:00:00 local time for the week containing `reference`. */
export function getWeekStart(reference: Date = new Date()): Date {
  const start = new Date(reference);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

/** Exclusive end of week (next Sunday 00:00:00 local). */
export function getWeekEnd(weekStart: Date): Date {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 7);
  return end;
}

/** ISO date (YYYY-MM-DD) for week navigation links. */
export function formatWeekParam(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseWeekParam(value: string | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

/** Splits a datetime-local value into date (YYYY-MM-DD) and time (HH:MM). */
export function splitDateTimeLocal(value: string): {
  date: string;
  time: string;
} {
  const [date = "", timePart = ""] = value.split("T");
  const time = timePart.slice(0, 5);
  return { date, time };
}

/** Joins date and HH:MM into a datetime-local value. */
export function joinDateTimeLocal(date: string, time: string): string {
  return `${date}T${time}`;
}

/** All valid 15-minute clock times in a day (00:00 … 23:45). */
export function listSlotTimes(): string[] {
  const slots: string[] = [];
  for (let minutes = 0; minutes < 24 * 60; minutes += SLOT_GRANULARITY_MINUTES) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    slots.push(
      `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`,
    );
  }
  return slots;
}

/** Duration options in 15-minute steps (15 … 480). */
export function listDurationOptions(): number[] {
  const options: number[] = [];
  for (
    let minutes = SLOT_GRANULARITY_MINUTES;
    minutes <= 480;
    minutes += SLOT_GRANULARITY_MINUTES
  ) {
    options.push(minutes);
  }
  return options;
}

/** Seven local Date objects for Sun–Sat starting at `weekStart`. */
export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + index);
    return day;
  });
}

export type WeekHourRange = {
  /** Inclusive start hour (0–23). */
  startHour: number;
  /** Exclusive end hour (1–24). */
  endHour: number;
};

const DEFAULT_WEEK_START_HOUR = 8;
const DEFAULT_WEEK_END_HOUR = 18;

/**
 * Visible hour range for the week grid.
 * Defaults to 08:00–18:00 and expands to cover appointments in the week.
 */
export function getWeekVisibleHourRange(
  appointments: { start_time: string; end_time: string }[],
): WeekHourRange {
  let startHour = DEFAULT_WEEK_START_HOUR;
  let endHour = DEFAULT_WEEK_END_HOUR;

  for (const appointment of appointments) {
    const start = new Date(appointment.start_time);
    const end = new Date(appointment.end_time);
    startHour = Math.min(startHour, start.getHours());
    // Round end up to the next hour if there are leftover minutes.
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    const roundedEndHour = Math.ceil(endMinutes / 60);
    endHour = Math.max(endHour, roundedEndHour === 0 && endMinutes > 0 ? 24 : roundedEndHour);
  }

  if (endHour <= startHour) {
    endHour = startHour + 1;
  }

  return { startHour, endHour: Math.min(24, endHour) };
}

export type CalendarBlockLayout = {
  topPercent: number;
  heightPercent: number;
};

/** Positions an appointment block within a day column for the visible hour range. */
export function getAppointmentBlockLayout(
  startIso: string,
  endIso: string,
  range: WeekHourRange,
): CalendarBlockLayout {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const rangeStartMinutes = range.startHour * 60;
  const rangeEndMinutes = range.endHour * 60;
  const totalMinutes = Math.max(rangeEndMinutes - rangeStartMinutes, 1);

  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const endMinutes = end.getHours() * 60 + end.getMinutes();

  const clampedStart = Math.max(startMinutes, rangeStartMinutes);
  const clampedEnd = Math.min(endMinutes, rangeEndMinutes);
  const duration = Math.max(clampedEnd - clampedStart, SLOT_GRANULARITY_MINUTES);

  return {
    topPercent: ((clampedStart - rangeStartMinutes) / totalMinutes) * 100,
    heightPercent: (duration / totalMinutes) * 100,
  };
}
