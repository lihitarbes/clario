import { SLOT_GRANULARITY_MINUTES } from "@/lib/appointments/constants";
import {
  formatDateTimeLocal,
  timeToMinutes,
} from "@/lib/appointments/time";

export type AvailabilityRangeInput = {
  day_of_week: number;
  start_time: string;
  end_time: string;
};

export type BlockingIntervalInput = {
  start_time: string;
  end_time: string;
};

type GenerateAvailableSlotsParams = {
  /** Local calendar day to generate slots for (time portion ignored). */
  dateLocal: Date;
  durationMinutes: number;
  availability: AvailabilityRangeInput[];
  blocking: BlockingIntervalInput[];
  now?: Date;
};

function intervalsOverlapMs(
  startA: number,
  endA: number,
  startB: number,
  endB: number,
): boolean {
  return startA < endB && startB < endA;
}

/**
 * Generates available appointment start times (datetime-local strings)
 * for a single local calendar day.
 *
 * A start is included only when the full duration fits inside an availability
 * range and does not overlap any blocking (pending/scheduled) appointment.
 */
export function generateAvailableSlots({
  dateLocal,
  durationMinutes,
  availability,
  blocking,
  now = new Date(),
}: GenerateAvailableSlotsParams): string[] {
  if (durationMinutes < SLOT_GRANULARITY_MINUTES) {
    return [];
  }

  const dayOfWeek = dateLocal.getDay();
  const dayRanges = availability.filter((row) => row.day_of_week === dayOfWeek);
  if (dayRanges.length === 0) {
    return [];
  }

  const dayStart = new Date(dateLocal);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const blockingMs = blocking
    .map((row) => ({
      start: new Date(row.start_time).getTime(),
      end: new Date(row.end_time).getTime(),
    }))
    .filter((row) => row.end > dayStart.getTime() && row.start < dayEnd.getTime());

  const slots: string[] = [];
  const seen = new Set<string>();

  for (const range of dayRanges) {
    const rangeStartMinutes = timeToMinutes(range.start_time);
    const rangeEndMinutes = timeToMinutes(range.end_time);

    for (
      let startMinutes = rangeStartMinutes;
      startMinutes + durationMinutes <= rangeEndMinutes;
      startMinutes += SLOT_GRANULARITY_MINUTES
    ) {
      const slotStart = new Date(dayStart);
      slotStart.setMinutes(startMinutes, 0, 0);
      const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60_000);

      if (slotStart.getTime() <= now.getTime()) {
        continue;
      }

      const overlaps = blockingMs.some((block) =>
        intervalsOverlapMs(
          slotStart.getTime(),
          slotEnd.getTime(),
          block.start,
          block.end,
        ),
      );
      if (overlaps) {
        continue;
      }

      const value = formatDateTimeLocal(slotStart);
      if (!seen.has(value)) {
        seen.add(value);
        slots.push(value);
      }
    }
  }

  return slots.sort();
}

/** Formats a datetime-local value as a short time label (e.g. 09:00). */
export function slotTimeLabel(dateTimeLocal: string): string {
  const [, time = ""] = dateTimeLocal.split("T");
  return time.slice(0, 5);
}

/** Builds upcoming local dates starting from today (inclusive). */
export function listUpcomingDates(count: number, from: Date = new Date()): Date[] {
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);

  return Array.from({ length: count }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}
