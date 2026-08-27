import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value === "" ? undefined : value));

export const businessSettingsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Business name is required.")
    .max(200, "Business name is too long."),
  description: optionalText(2000),
  phone: optionalText(50),
  email: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((value) => (value === "" ? undefined : value))
    .pipe(z.union([z.undefined(), z.string().email("Enter a valid email.")])),
  defaultAppointmentDurationMinutes: z.coerce
    .number()
    .int("Duration must be a whole number.")
    .min(15, "Minimum duration is 15 minutes.")
    .max(480, "Maximum duration is 480 minutes."),
});

export type BusinessSettingsInput = z.infer<typeof businessSettingsSchema>;
