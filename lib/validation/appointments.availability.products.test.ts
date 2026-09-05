import { describe, expect, it } from "vitest";
import {
  appointmentFormSchema,
  clientBookAppointmentSchema,
} from "@/lib/validation/appointments";
import {
  availabilityFormSchema,
  specificDateAvailabilityFormSchema,
} from "@/lib/validation/availability";
import { productFormSchema } from "@/lib/validation/products";

const CLIENT_ID = "c1111111-1111-4111-8111-111111111111";
const AVAILABILITY_ID = "a1111111-1111-4111-8111-111111111111";

const futureAlignedStart = (() => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  date.setHours(10, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
})();

describe("clientBookAppointmentSchema", () => {
  it("accepts a valid explicit-slot booking payload", () => {
    const result = clientBookAppointmentSchema.safeParse({
      clientId: CLIENT_ID,
      availabilityId: AVAILABILITY_ID,
      dateKey: "2030-06-03",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid uuid and dateKey", () => {
    expect(
      clientBookAppointmentSchema.safeParse({
        clientId: "not-a-uuid",
        availabilityId: AVAILABILITY_ID,
        dateKey: "2030-06-03",
      }).success,
    ).toBe(false);

    expect(
      clientBookAppointmentSchema.safeParse({
        clientId: CLIENT_ID,
        availabilityId: AVAILABILITY_ID,
        dateKey: "06-03-2030",
      }).success,
    ).toBe(false);
  });
});

describe("appointmentFormSchema", () => {
  it("accepts a future 15-minute-aligned start", () => {
    const result = appointmentFormSchema.safeParse({
      clientId: CLIENT_ID,
      startTimeLocal: futureAlignedStart,
      durationMinutes: 30,
    });
    expect(result.success).toBe(true);
  });

  it("rejects past starts and non-aligned times", () => {
    expect(
      appointmentFormSchema.safeParse({
        clientId: CLIENT_ID,
        startTimeLocal: "2020-01-01T10:00",
        durationMinutes: 30,
      }).success,
    ).toBe(false);

    expect(
      appointmentFormSchema.safeParse({
        clientId: CLIENT_ID,
        startTimeLocal: futureAlignedStart.replace(/T(\d{2}):00$/, "T$1:07"),
        durationMinutes: 30,
      }).success,
    ).toBe(false);
  });

  it("rejects invalid durations", () => {
    expect(
      appointmentFormSchema.safeParse({
        clientId: CLIENT_ID,
        startTimeLocal: futureAlignedStart,
        durationMinutes: 20,
      }).success,
    ).toBe(false);
  });
});

describe("availabilityFormSchema", () => {
  it("accepts a valid recurring range", () => {
    expect(
      availabilityFormSchema.safeParse({
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "10:00",
      }).success,
    ).toBe(true);
  });

  it("rejects end before or equal to start", () => {
    expect(
      availabilityFormSchema.safeParse({
        dayOfWeek: 1,
        startTime: "10:00",
        endTime: "09:00",
      }).success,
    ).toBe(false);
  });
});

describe("specificDateAvailabilityFormSchema", () => {
  it("rejects invalid date keys", () => {
    expect(
      specificDateAvailabilityFormSchema.safeParse({
        specificDate: "10/06/2030",
        startTime: "09:00",
        endTime: "10:00",
      }).success,
    ).toBe(false);
  });
});

describe("productFormSchema", () => {
  it("accepts a valid ILS product", () => {
    expect(
      productFormSchema.safeParse({
        name: "Serum",
        price: 49.9,
        currency: "ILS",
      }).success,
    ).toBe(true);
  });

  it("rejects negative price and unsupported currency", () => {
    expect(
      productFormSchema.safeParse({
        name: "Serum",
        price: -1,
        currency: "ILS",
      }).success,
    ).toBe(false);

    expect(
      productFormSchema.safeParse({
        name: "Serum",
        price: 10,
        currency: "EUR",
      }).success,
    ).toBe(false);
  });
});
