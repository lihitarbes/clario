import { z } from "zod";
import {
  isSlotAligned,
  parseDateTimeLocal,
} from "@/lib/appointments/time";

export const appointmentStatusSchema = z.enum([
  "pending",
  "scheduled",
  "completed",
  "cancelled",
]);

/** Client booking: selects a prepared slot (datetime-local) and linked client. */
export const clientBookAppointmentSchema = z.object({
  clientId: z.string().uuid("Select a business."),
  startTimeLocal: z
    .string()
    .trim()
    .min(1, "Select an available time slot."),
});

const optionalNotes = z
  .string()
  .trim()
  .max(5000)
  .optional()
  .transform((value) => (value === "" ? undefined : value));

export const appointmentFormSchema = z
  .object({
    clientId: z.string().uuid("Select a client."),
    startTimeLocal: z
      .string()
      .trim()
      .min(1, "Start date and time are required."),
    durationMinutes: z.coerce
      .number()
      .int("Duration must be a whole number.")
      .min(15, "Minimum duration is 15 minutes.")
      .max(480, "Maximum duration is 480 minutes.")
      .refine(
        (value) => value % 15 === 0,
        "Duration must be in 15-minute increments.",
      ),
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    const start = parseDateTimeLocal(data.startTimeLocal);
    if (!start) {
      ctx.addIssue({
        code: "custom",
        message: "Enter a valid date and time.",
        path: ["startTimeLocal"],
      });
      return;
    }

    if (!isSlotAligned(start)) {
      ctx.addIssue({
        code: "custom",
        message: "Start time must use 15-minute increments (e.g. 10:00, 10:15).",
        path: ["startTimeLocal"],
      });
    }

    if (start.getTime() <= Date.now()) {
      ctx.addIssue({
        code: "custom",
        message: "Appointments cannot be scheduled in the past.",
        path: ["startTimeLocal"],
      });
    }
  });

export type AppointmentFormInput = z.infer<typeof appointmentFormSchema>;

export const appointmentIdSchema = z.string().uuid("Invalid appointment.");
