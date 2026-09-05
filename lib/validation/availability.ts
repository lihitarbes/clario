import { z } from "zod";
import { timeToMinutes } from "@/lib/appointments/time";

const timeStringSchema = z
  .string()
  .trim()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, "Enter a valid time.");

const endAfterStart = (
  data: { startTime: string; endTime: string },
  ctx: z.RefinementCtx,
) => {
  const start = timeToMinutes(data.startTime);
  const end = timeToMinutes(data.endTime);
  if (end <= start) {
    ctx.addIssue({
      code: "custom",
      message: "End time must be after start time.",
      path: ["endTime"],
    });
  }
};

export const availabilityFormSchema = z
  .object({
    dayOfWeek: z.coerce
      .number()
      .int()
      .min(0, "Select a day of the week.")
      .max(6, "Select a day of the week."),
    startTime: timeStringSchema,
    endTime: timeStringSchema,
  })
  .superRefine(endAfterStart);

export const specificDateAvailabilityFormSchema = z
  .object({
    specificDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Select a date."),
    startTime: timeStringSchema,
    endTime: timeStringSchema,
  })
  .superRefine(endAfterStart);

export type AvailabilityFormInput = z.infer<typeof availabilityFormSchema>;
export type SpecificDateAvailabilityFormInput = z.infer<
  typeof specificDateAvailabilityFormSchema
>;

export const availabilityIdSchema = z.string().uuid("Invalid availability slot.");
