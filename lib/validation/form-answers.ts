import { z } from "zod";
import type { FormFieldDefinition } from "@/types/database";
import {
  clearHiddenFormAnswers,
  getVisibleFormFields,
  type FormAnswersMap,
} from "@/lib/forms/visibility";

export const formAssignmentIdSchema = z.string().uuid("Invalid form assignment.");

export const assignFormSchema = z.object({
  clientId: z.string().uuid("Invalid client."),
  formId: z.string().uuid("Invalid form."),
});

export type FormAnswerValidationResult =
  | { ok: true; answers: FormAnswersMap }
  | { ok: false; errors: Record<string, string> };

function isNonEmptyString(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime());
}

function validateFieldAnswer(
  field: FormFieldDefinition,
  value: unknown,
): string | null {
  switch (field.type) {
    case "short_text":
    case "long_text":
      if (!isNonEmptyString(value)) {
        return "This field is required.";
      }
      return null;

    case "yes_no":
      if (value !== "yes" && value !== "no") {
        return "Select Yes or No.";
      }
      return null;

    case "single_choice":
      if (typeof value !== "string" || !field.options?.includes(value)) {
        return "Select a valid option.";
      }
      return null;

    case "multiple_choice":
      if (!Array.isArray(value) || value.length === 0) {
        return "Select at least one option.";
      }
      if (!field.options) {
        return "Invalid options.";
      }
      for (const item of value) {
        if (typeof item !== "string" || !field.options.includes(item)) {
          return "Select valid options only.";
        }
      }
      return null;

    case "date":
      if (typeof value !== "string" || !isValidDateString(value)) {
        return "Enter a valid date.";
      }
      return null;

    case "checkbox":
      if (value !== true) {
        return "This confirmation is required.";
      }
      return null;

    default:
      return "Invalid question type.";
  }
}

function validateOptionalFieldAnswer(
  field: FormFieldDefinition,
  value: unknown,
): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return validateFieldAnswer(field, value);
}

export function parseAnswersJson(raw: string): FormAnswersMap | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed as FormAnswersMap;
  } catch {
    return null;
  }
}

/** Server-side validation against the live template at submit time. */
export function validateFormAnswers(
  fields: FormFieldDefinition[],
  rawAnswers: FormAnswersMap,
): FormAnswerValidationResult {
  const cleaned = clearHiddenFormAnswers(fields, rawAnswers);
  const visibleFields = getVisibleFormFields(fields, cleaned);
  const errors: Record<string, string> = {};

  for (const key of Object.keys(cleaned)) {
    if (!fields.some((field) => field.id === key)) {
      errors[key] = "Unknown question.";
    }
  }

  for (const field of visibleFields) {
    const value = cleaned[field.id];
    const error = field.required
      ? validateFieldAnswer(field, value)
      : validateOptionalFieldAnswer(field, value);

    if (error) {
      errors[field.id] = error;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, answers: cleaned };
}
