import { z } from "zod";

/** Digits only after stripping common phone punctuation; empty → null. */
export function normalizePhoneInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) {
    return null;
  }

  return hasPlus ? `+${digits}` : digits;
}

/**
 * Digits for wa.me (no +). Returns null if unusable.
 * Israeli national numbers starting with 0 become 972…; numbers already in
 * international form (e.g. 972…) are left unchanged.
 */
export function phoneDigitsForWhatsApp(
  phone: string | null | undefined,
): string | null {
  if (!phone) {
    return null;
  }

  let digits = phone.replace(/\D/g, "");
  if (!digits) {
    return null;
  }

  if (digits.startsWith("0")) {
    digits = `972${digits.slice(1)}`;
  }

  if (digits.length < 7 || digits.length > 15) {
    return null;
  }

  return digits;
}

const phoneField = z
  .string()
  .trim()
  .max(50, "Phone number is too long.")
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined))
  .superRefine((value, ctx) => {
    if (value === undefined) {
      return;
    }
    if (normalizePhoneInput(value) === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a valid phone number (include country code if possible).",
      });
    }
  })
  .transform((value) =>
    value === undefined ? null : normalizePhoneInput(value),
  );

export const clientProfileFormSchema = z.object({
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
  phone: phoneField,
});

export type ClientProfileFormInput = z.infer<typeof clientProfileFormSchema>;
