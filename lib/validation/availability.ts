import { z } from "zod";
import { timeToMinutes } from "@/lib/appointments/time";

const timeStringSchema = z
  .string()
  .trim()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, "Enter a valid time.");

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
  .superRefine((data, ctx) => {
    const start = timeToMinutes(data.startTime);
    const end = timeToMinutes(data.endTime);
    if (end <= start) {
      ctx.addIssue({
        code: "custom",
        message: "End time must be after start time.",
        path: ["endTime"],
      });
    }
  });

export type AvailabilityFormInput = z.infer<typeof availabilityFormSchema>;

export const availabilityIdSchema = z.string().uuid("Invalid availability slot.");
