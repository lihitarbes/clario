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
