import { describe, expect, it } from "vitest";
import {
  BLOCKING_APPOINTMENT_STATUSES,
  recurringAvailabilityOverlapsBlockingAppointments,
  recurringAvailabilityRangesOverlap,
  specificDateAvailabilityOverlapsBlockingAppointments,
  specificDateAvailabilityRangesOverlap,
} from "@/lib/appointments/overlap";

const weekly = (
  id: string,
  dayOfWeek: number,
  start: string,
  end: string,
) => ({
  id,
  day_of_week: dayOfWeek,
  specific_date: null,
  start_time: start,
  end_time: end,
});

const dated = (
  id: string,
  specificDate: string,
  start: string,
  end: string,
) => ({
  id,
  day_of_week: null,
  specific_date: specificDate,
  start_time: start,
  end_time: end,
});

const appointment = (status: string, start: Date, end: Date) => ({
  status,
  start_time: start.toISOString(),
  end_time: end.toISOString(),
});

describe("BLOCKING_APPOINTMENT_STATUSES", () => {
  it("blocks pending, scheduled, and completed — not cancelled", () => {
    expect(BLOCKING_APPOINTMENT_STATUSES).toEqual([
      "pending",
      "scheduled",
      "completed",
    ]);
    expect(BLOCKING_APPOINTMENT_STATUSES).not.toContain("cancelled");
  });
});

describe("recurringAvailabilityRangesOverlap", () => {
  const existing = [weekly("a", 1, "09:00", "10:00")];

  it("detects true overlap on the same weekday", () => {
    expect(
      recurringAvailabilityRangesOverlap(existing, 1, "09:30", "10:30"),
    ).toBe(true);
  });

  it("allows adjacent slots on the same weekday", () => {
    expect(
      recurringAvailabilityRangesOverlap(existing, 1, "10:00", "11:00"),
    ).toBe(false);
  });

  it("ignores different weekdays", () => {
    expect(
      recurringAvailabilityRangesOverlap(existing, 2, "09:00", "10:00"),
    ).toBe(false);
  });

  it("ignores the excluded id when updating", () => {
    expect(
      recurringAvailabilityRangesOverlap(existing, 1, "09:00", "10:00", "a"),
    ).toBe(false);
  });
});

describe("specificDateAvailabilityRangesOverlap", () => {
  const existing = [dated("d1", "2030-06-10", "14:00", "15:00")];

  it("detects overlap on the same specific date", () => {
    expect(
      specificDateAvailabilityRangesOverlap(
        existing,
        "2030-06-10",
        "14:30",
        "15:30",
      ),
    ).toBe(true);
  });

  it("allows adjacent slots on the same date", () => {
    expect(
      specificDateAvailabilityRangesOverlap(
        existing,
        "2030-06-10",
        "15:00",
        "16:00",
      ),
    ).toBe(false);
  });

  it("ignores different specific dates", () => {
    expect(
      specificDateAvailabilityRangesOverlap(
        existing,
        "2030-06-11",
        "14:00",
        "15:00",
      ),
    ).toBe(false);
  });
});

describe("specificDateAvailabilityOverlapsBlockingAppointments", () => {
  const dateKey = "2026-09-06";
  const apptStart = new Date(2026, 8, 6, 9, 0, 0, 0);
  const apptEnd = new Date(2026, 8, 6, 10, 30, 0, 0);

  it("rejects overlap with a pending appointment", () => {
    expect(
      specificDateAvailabilityOverlapsBlockingAppointments(
        [appointment("pending", apptStart, apptEnd)],
        dateKey,
        "09:00",
        "10:00",
      ),
    ).toBe(true);
  });

  it("rejects overlap with a scheduled appointment", () => {
    expect(
      specificDateAvailabilityOverlapsBlockingAppointments(
        [appointment("scheduled", apptStart, apptEnd)],
        dateKey,
        "09:00",
        "10:00",
      ),
    ).toBe(true);
  });

  it("rejects overlap with a completed appointment", () => {
    expect(
      specificDateAvailabilityOverlapsBlockingAppointments(
        [appointment("completed", apptStart, apptEnd)],
        dateKey,
        "09:00",
        "10:00",
      ),
    ).toBe(true);
  });

  it("allows overlap with a cancelled appointment", () => {
    expect(
      specificDateAvailabilityOverlapsBlockingAppointments(
        [appointment("cancelled", apptStart, apptEnd)],
        dateKey,
        "09:00",
        "10:00",
      ),
    ).toBe(false);
  });

  it("allows an adjacent appointment that ends exactly when the slot starts", () => {
    expect(
      specificDateAvailabilityOverlapsBlockingAppointments(
        [
          appointment(
            "scheduled",
            new Date(2026, 8, 6, 8, 0, 0, 0),
            new Date(2026, 8, 6, 9, 0, 0, 0),
          ),
        ],
        dateKey,
        "09:00",
        "10:00",
      ),
    ).toBe(false);
  });

  it("allows a non-overlapping slot on the same date", () => {
    expect(
      specificDateAvailabilityOverlapsBlockingAppointments(
        [appointment("scheduled", apptStart, apptEnd)],
        dateKey,
        "11:00",
        "12:00",
      ),
    ).toBe(false);
  });
});

describe("recurringAvailabilityOverlapsBlockingAppointments", () => {
  // 2026-09-06 is Sunday (day_of_week = 0)
  const sundayAppt = appointment(
    "scheduled",
    new Date(2026, 8, 6, 9, 0, 0, 0),
    new Date(2026, 8, 6, 10, 30, 0, 0),
  );

  it("rejects recurring Sunday slot that overlaps a Sunday appointment", () => {
    expect(
      recurringAvailabilityOverlapsBlockingAppointments(
        [sundayAppt],
        0,
        "09:00",
        "10:00",
      ),
    ).toBe(true);
  });

  it("ignores appointments on a different weekday", () => {
    expect(
      recurringAvailabilityOverlapsBlockingAppointments(
        [sundayAppt],
        1,
        "09:00",
        "10:00",
      ),
    ).toBe(false);
  });

  it("allows cancelled appointments on the matching weekday", () => {
    expect(
      recurringAvailabilityOverlapsBlockingAppointments(
        [
          appointment(
            "cancelled",
            new Date(2026, 8, 6, 9, 0, 0, 0),
            new Date(2026, 8, 6, 10, 30, 0, 0),
          ),
        ],
        0,
        "09:00",
        "10:00",
      ),
    ).toBe(false);
  });
});
