import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value === "" ? undefined : value));

export const clientFormSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Full name is required.")
    .max(100, "Full name is too long."),
  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .email("Enter a valid email address.")
    .transform((value) => value.toLowerCase()),
  phone: optionalText(50),
  notes: optionalText(5000),
});

export type ClientFormInput = z.infer<typeof clientFormSchema>;

export const clientIdSchema = z.string().uuid("Invalid client.");
