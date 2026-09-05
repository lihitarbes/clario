import {
  formatWeekParam,
  isSlotAligned,
  joinDateTimeLocal,
  parseDateTimeLocal,
  timeToMinutes,
  timeRangesOverlap,
} from "@/lib/appointments/time";

/** Availability row shape used for booking + calendar day filtering. */
export type AvailabilityRangeInput = {
  id?: string;
  day_of_week: number | null;
  specific_date: string | null;
  start_time: string;
  end_time: string;
};

/** Availability row with required id — used for explicit bookable slots. */
export type AvailabilitySlotRow = {
  id: string;
  day_of_week: number | null;
  specific_date: string | null;
  start_time: string;
  end_time: string;
};

export type BlockingIntervalInput = {
  start_time: string;
  end_time: string;
};

export type MergedTimeRange = {
  start_time: string;
  end_time: string;
};

/** One explicit bookable appointment slot for a calendar date. */
export type BookableSlot = {
  availabilityId: string;
  /** Local datetime-local start (YYYY-MM-DDTHH:MM). */
  startLocal: string;
  /** Local datetime-local end (YYYY-MM-DDTHH:MM). */
  endLocal: string;
};

type ListBookableSlotsParams = {
  dateLocal: Date;
  availability: AvailabilitySlotRow[];
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

function normalizeClock(time: string): string {
  return time.slice(0, 5);
}

/**
 * Merge overlapping or adjacent HH:MM ranges into a minimal covering set.
 * Used by the owner calendar display only — not for client booking.
 */
export function mergeAvailabilityRanges(
  ranges: Array<Pick<AvailabilityRangeInput, "start_time" | "end_time">>,
): MergedTimeRange[] {
  if (ranges.length === 0) {
    return [];
  }

  const sorted = ranges
    .map((range) => ({
      start: timeToMinutes(range.start_time),
      end: timeToMinutes(range.end_time),
    }))
    .filter((range) => range.end > range.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);

  if (sorted.length === 0) {
    return [];
  }

  const merged: Array<{ start: number; end: number }> = [{ ...sorted[0] }];

  for (let i = 1; i < sorted.length; i += 1) {
    const current = sorted[i];
    const last = merged[merged.length - 1];
    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push({ ...current });
    }
  }

  return merged.map((range) => {
    const startHours = Math.floor(range.start / 60);
    const startMins = range.start % 60;
    const endHours = Math.floor(range.end / 60);
    const endMins = range.end % 60;
    return {
      start_time: `${String(startHours).padStart(2, "0")}:${String(startMins).padStart(2, "0")}`,
      end_time: `${String(endHours).padStart(2, "0")}:${String(endMins).padStart(2, "0")}`,
    };
  });
}

/**
 * Normalize availability `specific_date` to YYYY-MM-DD for calendar matching.
 * Handles plain date strings and ISO timestamps (including local-midnight
 * values encoded as UTC, e.g. Asia/Jerusalem → …T21:00:00.000Z prior day).
 */
export function normalizeAvailabilityDateKey(
  value: string | null | undefined,
): string | null {
  if (value == null) {
    return null;
  }
  const raw = String(value).trim();
  if (!raw) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    const leading = /^(\d{4}-\d{2}-\d{2})/.exec(raw);
    return leading ? leading[1] : null;
  }

  // Date-column style UTC midnight → use UTC calendar day.
  if (/T00:00:00(\.\d+)?Z$/i.test(raw)) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${parsed.getUTCFullYear()}-${pad(parsed.getUTCMonth() + 1)}-${pad(parsed.getUTCDate())}`;
  }

  // Other instants (e.g. local midnight serialized to ISO) → local calendar day.
  return formatWeekParam(parsed);
}

/** Whether an availability row applies on a local calendar date. */
export function availabilityAppliesToDate(
  dateLocal: Date,
  row: Pick<AvailabilityRangeInput, "day_of_week" | "specific_date">,
): boolean {
  const dateKey = formatWeekParam(dateLocal);
  const specificKey = normalizeAvailabilityDateKey(row.specific_date);
  if (specificKey) {
    return specificKey === dateKey;
  }
  return row.day_of_week === dateLocal.getDay();
}

/** Ranges that apply on a local calendar date (recurring weekday + date-specific). */
export function availabilityRangesForDate(
  dateLocal: Date,
  availability: AvailabilityRangeInput[],
): AvailabilityRangeInput[] {
  return availability.filter((row) => availabilityAppliesToDate(dateLocal, row));
}

export function buildSlotOccurrenceLocal(
  dateKey: string,
  startTime: string,
  endTime: string,
): { startLocal: string; endLocal: string } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return null;
  }
  const startLocal = joinDateTimeLocal(dateKey, normalizeClock(startTime));
  const endLocal = joinDateTimeLocal(dateKey, normalizeClock(endTime));
  const start = parseDateTimeLocal(startLocal);
  const end = parseDateTimeLocal(endLocal);
  if (!start || !end || end.getTime() <= start.getTime()) {
    return null;
  }
  if (!isSlotAligned(start) || !isSlotAligned(end)) {
    return null;
  }
  return { startLocal, endLocal };
}

type SlotCandidate = BookableSlot & {
  startMinutes: number;
  endMinutes: number;
  isSpecific: boolean;
};

function candidateSortKey(a: SlotCandidate, b: SlotCandidate): number {
  if (a.startMinutes !== b.startMinutes) {
    return a.startMinutes - b.startMinutes;
  }
  if (a.endMinutes !== b.endMinutes) {
    return a.endMinutes - b.endMinutes;
  }
  return a.availabilityId.localeCompare(b.availabilityId);
}

function candidatesOverlap(a: SlotCandidate, b: SlotCandidate): boolean {
  return timeRangesOverlap(
    normalizeClock(a.startLocal.split("T")[1] ?? ""),
    normalizeClock(a.endLocal.split("T")[1] ?? ""),
    normalizeClock(b.startLocal.split("T")[1] ?? ""),
    normalizeClock(b.endLocal.split("T")[1] ?? ""),
  );
}

/**
 * Prefer specific-date rows over recurring when resolving conflicts.
 * Accepts non-overlapping specific-date slots first, then recurring slots
 * that do not overlap an accepted specific. No merge; final list by start.
 */
function resolveNonOverlappingSlots(candidates: SlotCandidate[]): BookableSlot[] {
  const specifics = candidates
    .filter((row) => row.isSpecific)
    .sort(candidateSortKey);
  const recurring = candidates
    .filter((row) => !row.isSpecific)
    .sort(candidateSortKey);

  const accepted: SlotCandidate[] = [];

  for (const candidate of specifics) {
    if (accepted.some((row) => candidatesOverlap(row, candidate))) {
      continue;
    }
    accepted.push(candidate);
  }

  for (const candidate of recurring) {
    if (accepted.some((row) => candidatesOverlap(row, candidate))) {
      continue;
    }
    accepted.push(candidate);
  }

  return accepted
    .sort(candidateSortKey)
    .map(({ availabilityId, startLocal, endLocal }) => ({
      availabilityId,
      startLocal,
      endLocal,
    }));
}

/**
 * Lists explicit bookable slots for a calendar day.
 * Each availability row is one slot — no 15-minute generation inside ranges.
 */
export function listBookableSlots({
  dateLocal,
  availability,
  blocking,
  now = new Date(),
}: ListBookableSlotsParams): BookableSlot[] {
  const dateKey = formatWeekParam(dateLocal);
  const dayStart = new Date(dateLocal);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const blockingMs = blocking
    .map((row) => ({
      start: new Date(row.start_time).getTime(),
      end: new Date(row.end_time).getTime(),
    }))
    .filter(
      (row) => row.end > dayStart.getTime() && row.start < dayEnd.getTime(),
    );

  const candidates: Array<
    BookableSlot & {
      startMinutes: number;
      endMinutes: number;
      isSpecific: boolean;
    }
  > = [];

  for (const row of availability) {
    if (!availabilityAppliesToDate(dateLocal, row)) {
      continue;
    }

    const occurrence = buildSlotOccurrenceLocal(
      dateKey,
      row.start_time,
      row.end_time,
    );
    if (!occurrence) {
      continue;
    }

    const start = parseDateTimeLocal(occurrence.startLocal);
    const end = parseDateTimeLocal(occurrence.endLocal);
    if (!start || !end) {
      continue;
    }

    if (start.getTime() <= now.getTime()) {
      continue;
    }

    const blocked = blockingMs.some((block) =>
      intervalsOverlapMs(
        start.getTime(),
        end.getTime(),
        block.start,
        block.end,
      ),
    );
    if (blocked) {
      continue;
    }

    candidates.push({
      availabilityId: row.id,
      startLocal: occurrence.startLocal,
      endLocal: occurrence.endLocal,
      startMinutes: timeToMinutes(row.start_time),
      endMinutes: timeToMinutes(row.end_time),
      isSpecific: Boolean(row.specific_date),
    });
  }

  return resolveNonOverlappingSlots(candidates);
}

/** Formats a datetime-local value as a short time label (e.g. 09:00). */
export function slotTimeLabel(dateTimeLocal: string): string {
  const [, time = ""] = dateTimeLocal.split("T");
  return time.slice(0, 5);
}

/** Builds upcoming local dates starting from today (inclusive). */
export function listUpcomingDates(
  count: number,
  from: Date = new Date(),
): Date[] {
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);

  return Array.from({ length: count }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}
