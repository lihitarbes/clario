import { describe, expect, it } from "vitest";
import {
  availabilityAppliesToDate,
  listBookableSlots,
  normalizeAvailabilityDateKey,
  type AvailabilitySlotRow,
} from "@/lib/appointments/slots";

/** Monday 2030-06-03 local. */
const monday = new Date(2030, 5, 3, 8, 0, 0, 0);
/** Tuesday 2030-06-04 local. */
const tuesday = new Date(2030, 5, 4, 8, 0, 0, 0);
/** Fixed "now" earlier the same Monday morning. */
const mondayMorning = new Date(2030, 5, 3, 7, 0, 0, 0);

const recurringMonday: AvailabilitySlotRow = {
  id: "recurring-mon",
  day_of_week: 1,
  specific_date: null,
  start_time: "10:00",
  end_time: "11:00",
};

const oneTimeMonday: AvailabilitySlotRow = {
  id: "one-time-mon",
  day_of_week: null,
  specific_date: "2030-06-03",
  start_time: "14:00",
  end_time: "15:30",
};

describe("normalizeAvailabilityDateKey", () => {
  it("keeps plain YYYY-MM-DD values", () => {
    expect(normalizeAvailabilityDateKey("2026-09-06")).toBe("2026-09-06");
  });

  it("maps local-midnight ISO encodings to the local calendar day", () => {
    // 2026-09-06 00:00 in UTC+3 == 2026-09-05T21:00:00.000Z
    const localMidnight = new Date(2026, 8, 6, 0, 0, 0, 0).toISOString();
    expect(normalizeAvailabilityDateKey(localMidnight)).toBe("2026-09-06");
  });

  it("maps UTC-midnight ISO date encodings to the UTC calendar day", () => {
    expect(normalizeAvailabilityDateKey("2026-09-06T00:00:00.000Z")).toBe(
      "2026-09-06",
    );
  });
});

describe("availabilityAppliesToDate", () => {
  it("applies recurring availability to the matching weekday", () => {
    expect(availabilityAppliesToDate(monday, recurringMonday)).toBe(true);
    expect(availabilityAppliesToDate(tuesday, recurringMonday)).toBe(false);
  });

  it("applies one-time availability only to its date", () => {
    expect(availabilityAppliesToDate(monday, oneTimeMonday)).toBe(true);
    expect(availabilityAppliesToDate(tuesday, oneTimeMonday)).toBe(false);
  });

  it("does not show a next-Sunday one-time slot on the prior Saturday week day", () => {
    // Mirrors: today Sat 2026-09-05 "this week" ends Sat; slot on Sun 2026-09-06.
    const saturday = new Date(2026, 8, 5, 8, 0, 0, 0);
    const sunday = new Date(2026, 8, 6, 8, 0, 0, 0);
    const nextSundaySlot: AvailabilitySlotRow = {
      id: "next-sun",
      day_of_week: null,
      specific_date: "2026-09-06",
      start_time: "13:00",
      end_time: "14:15",
    };

    expect(availabilityAppliesToDate(saturday, nextSundaySlot)).toBe(false);
    expect(availabilityAppliesToDate(sunday, nextSundaySlot)).toBe(true);

    const slots = listBookableSlots({
      dateLocal: sunday,
      availability: [nextSundaySlot],
      blocking: [],
      now: new Date(2026, 8, 5, 7, 0, 0, 0),
    });
    expect(slots).toHaveLength(1);
    expect(slots[0]?.startLocal).toBe("2026-09-06T13:00");
    expect(slots[0]?.endLocal).toBe("2026-09-06T14:15");
  });

  it("matches one-time slots when specific_date is a local-midnight ISO string", () => {
    const sunday = new Date(2026, 8, 6, 8, 0, 0, 0);
    const encoded = new Date(2026, 8, 6, 0, 0, 0, 0).toISOString();
    const slot: AvailabilitySlotRow = {
      id: "iso-encoded",
      day_of_week: null,
      specific_date: encoded,
      start_time: "13:00",
      end_time: "14:15",
    };
    expect(availabilityAppliesToDate(sunday, slot)).toBe(true);
    expect(
      availabilityAppliesToDate(new Date(2026, 8, 5, 8, 0, 0, 0), slot),
    ).toBe(false);
  });
});

describe("listBookableSlots", () => {
  it("returns one explicit bookable slot per availability row with actual duration", () => {
    const slots = listBookableSlots({
      dateLocal: monday,
      availability: [oneTimeMonday],
      blocking: [],
      now: mondayMorning,
    });

    expect(slots).toHaveLength(1);
    expect(slots[0]).toEqual({
      availabilityId: "one-time-mon",
      startLocal: "2030-06-03T14:00",
      endLocal: "2030-06-03T15:30",
    });
  });

  it("includes recurring slots on matching weekdays only", () => {
    const onMonday = listBookableSlots({
      dateLocal: monday,
      availability: [recurringMonday],
      blocking: [],
      now: mondayMorning,
    });
    const onTuesday = listBookableSlots({
      dateLocal: tuesday,
      availability: [recurringMonday],
      blocking: [],
      now: mondayMorning,
    });

    expect(onMonday).toHaveLength(1);
    expect(onMonday[0]?.availabilityId).toBe("recurring-mon");
    expect(onTuesday).toHaveLength(0);
  });

  it("excludes past slots relative to now", () => {
    const afterSlot = new Date(2030, 5, 3, 14, 30, 0, 0);
    const slots = listBookableSlots({
      dateLocal: monday,
      availability: [recurringMonday],
      blocking: [],
      now: afterSlot,
    });

    expect(slots).toHaveLength(0);
  });

  it("removes slots blocked by overlapping appointments", () => {
    const slots = listBookableSlots({
      dateLocal: monday,
      availability: [recurringMonday],
      blocking: [
        {
          start_time: new Date(2030, 5, 3, 10, 15, 0, 0).toISOString(),
          end_time: new Date(2030, 5, 3, 10, 45, 0, 0).toISOString(),
        },
      ],
      now: mondayMorning,
    });

    expect(slots).toHaveLength(0);
  });

  it("keeps slots when a cancelled-style blocker is not provided in blocking input", () => {
    // Callers only pass blocking statuses (pending/scheduled/completed).
    // Cancelled appointments are omitted from blocking — so the slot remains.
    const slots = listBookableSlots({
      dateLocal: monday,
      availability: [recurringMonday],
      blocking: [],
      now: mondayMorning,
    });

    expect(slots).toHaveLength(1);
  });

  it("prefers specific-date occurrence over overlapping recurring candidate", () => {
    const overlappingRecurring: AvailabilitySlotRow = {
      id: "recurring-overlap",
      day_of_week: 1,
      specific_date: null,
      start_time: "14:00",
      end_time: "15:00",
    };
    const specific: AvailabilitySlotRow = {
      id: "specific-wins",
      day_of_week: null,
      specific_date: "2030-06-03",
      start_time: "14:00",
      end_time: "15:30",
    };

    const slots = listBookableSlots({
      dateLocal: monday,
      availability: [overlappingRecurring, specific],
      blocking: [],
      now: mondayMorning,
    });

    expect(slots).toHaveLength(1);
    expect(slots[0]?.availabilityId).toBe("specific-wins");
    expect(slots[0]?.endLocal).toBe("2030-06-03T15:30");
  });

  it("keeps specific when it starts later than an overlapping recurring slot", () => {
    // Regression: Sep 6 case — recurring Sunday 12:00–14:00 vs one-time 13:00–14:15.
    const sunday = new Date(2026, 8, 6, 8, 0, 0, 0);
    const recurringEarlier: AvailabilitySlotRow = {
      id: "recurring-12-14",
      day_of_week: 0,
      specific_date: null,
      start_time: "12:00",
      end_time: "14:00",
    };
    const specificLater: AvailabilitySlotRow = {
      id: "specific-13-1415",
      day_of_week: null,
      specific_date: "2026-09-06",
      start_time: "13:00",
      end_time: "14:15",
    };

    const slots = listBookableSlots({
      dateLocal: sunday,
      availability: [recurringEarlier, specificLater],
      blocking: [],
      now: new Date(2026, 8, 5, 7, 0, 0, 0),
    });

    expect(slots).toHaveLength(1);
    expect(slots[0]?.availabilityId).toBe("specific-13-1415");
    expect(slots[0]?.startLocal).toBe("2026-09-06T13:00");
    expect(slots[0]?.endLocal).toBe("2026-09-06T14:15");
  });

  it("keeps specific when it starts earlier than an overlapping recurring slot", () => {
    const specificEarlier: AvailabilitySlotRow = {
      id: "specific-09-11",
      day_of_week: null,
      specific_date: "2030-06-03",
      start_time: "09:00",
      end_time: "11:00",
    };
    const recurringLater: AvailabilitySlotRow = {
      id: "recurring-10-12",
      day_of_week: 1,
      specific_date: null,
      start_time: "10:00",
      end_time: "12:00",
    };

    const slots = listBookableSlots({
      dateLocal: monday,
      availability: [recurringLater, specificEarlier],
      blocking: [],
      now: mondayMorning,
    });

    expect(slots).toHaveLength(1);
    expect(slots[0]?.availabilityId).toBe("specific-09-11");
  });

  it("keeps specific when start times match an overlapping recurring slot", () => {
    const recurring: AvailabilitySlotRow = {
      id: "recurring-same-start",
      day_of_week: 1,
      specific_date: null,
      start_time: "14:00",
      end_time: "15:00",
    };
    const specific: AvailabilitySlotRow = {
      id: "specific-same-start",
      day_of_week: null,
      specific_date: "2030-06-03",
      start_time: "14:00",
      end_time: "15:30",
    };

    const slots = listBookableSlots({
      dateLocal: monday,
      availability: [recurring, specific],
      blocking: [],
      now: mondayMorning,
    });

    expect(slots).toHaveLength(1);
    expect(slots[0]?.availabilityId).toBe("specific-same-start");
  });

  it("keeps non-overlapping recurring slots alongside specific-date slots", () => {
    const recurringMorning: AvailabilitySlotRow = {
      id: "recurring-morning",
      day_of_week: 1,
      specific_date: null,
      start_time: "09:00",
      end_time: "10:00",
    };
    const specificAfternoon: AvailabilitySlotRow = {
      id: "specific-afternoon",
      day_of_week: null,
      specific_date: "2030-06-03",
      start_time: "14:00",
      end_time: "15:30",
    };
    const recurringEvening: AvailabilitySlotRow = {
      id: "recurring-evening",
      day_of_week: 1,
      specific_date: null,
      start_time: "18:00",
      end_time: "19:00",
    };

    const slots = listBookableSlots({
      dateLocal: monday,
      availability: [recurringEvening, specificAfternoon, recurringMorning],
      blocking: [],
      now: mondayMorning,
    });

    expect(slots.map((slot) => slot.availabilityId)).toEqual([
      "recurring-morning",
      "specific-afternoon",
      "recurring-evening",
    ]);
  });

  it("keeps multiple non-overlapping specific-date slots", () => {
    const early: AvailabilitySlotRow = {
      id: "specific-early",
      day_of_week: null,
      specific_date: "2030-06-03",
      start_time: "09:00",
      end_time: "10:00",
    };
    const late: AvailabilitySlotRow = {
      id: "specific-late",
      day_of_week: null,
      specific_date: "2030-06-03",
      start_time: "15:00",
      end_time: "16:00",
    };

    const slots = listBookableSlots({
      dateLocal: monday,
      availability: [late, early],
      blocking: [],
      now: mondayMorning,
    });

    expect(slots.map((slot) => slot.availabilityId)).toEqual([
      "specific-early",
      "specific-late",
    ]);
  });

  it("returns accepted slots sorted chronologically by start time", () => {
    const sunday = new Date(2026, 8, 6, 8, 0, 0, 0);
    const overlappingRecurring: AvailabilitySlotRow = {
      id: "recurring-overlap-suppressed",
      day_of_week: 0,
      specific_date: null,
      start_time: "12:00",
      end_time: "14:00",
    };
    const specificMid: AvailabilitySlotRow = {
      id: "specific-mid",
      day_of_week: null,
      specific_date: "2026-09-06",
      start_time: "13:00",
      end_time: "14:15",
    };
    const recurringLate: AvailabilitySlotRow = {
      id: "recurring-late",
      day_of_week: 0,
      specific_date: null,
      start_time: "18:00",
      end_time: "19:00",
    };
    const recurringEarly: AvailabilitySlotRow = {
      id: "recurring-early",
      day_of_week: 0,
      specific_date: null,
      start_time: "09:00",
      end_time: "10:00",
    };

    const slots = listBookableSlots({
      dateLocal: sunday,
      availability: [
        recurringLate,
        overlappingRecurring,
        specificMid,
        recurringEarly,
      ],
      blocking: [],
      now: new Date(2026, 8, 5, 7, 0, 0, 0),
    });

    expect(slots.map((slot) => slot.availabilityId)).toEqual([
      "recurring-early",
      "specific-mid",
      "recurring-late",
    ]);
    expect(slots.map((slot) => slot.startLocal)).toEqual([
      "2026-09-06T09:00",
      "2026-09-06T13:00",
      "2026-09-06T18:00",
    ]);
  });

  it("keeps adjacent non-overlapping slots", () => {
    const morning: AvailabilitySlotRow = {
      id: "morning",
      day_of_week: 1,
      specific_date: null,
      start_time: "09:00",
      end_time: "10:00",
    };
    const afternoon: AvailabilitySlotRow = {
      id: "afternoon",
      day_of_week: 1,
      specific_date: null,
      start_time: "10:00",
      end_time: "11:00",
    };

    const slots = listBookableSlots({
      dateLocal: monday,
      availability: [morning, afternoon],
      blocking: [],
      now: mondayMorning,
    });

    expect(slots.map((slot) => slot.availabilityId)).toEqual([
      "morning",
      "afternoon",
    ]);
  });
});
