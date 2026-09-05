import { parseFormSubmissionAnswers } from "@/lib/forms/submission-view";
import type { FormAnswersMap } from "@/lib/forms/visibility";
import { clearHiddenFormAnswers } from "@/lib/forms/visibility";
import type { FormFieldDefinition } from "@/types/database";

/**
 * Map previous submission answers onto the live template by question id.
 * Skips answers that no longer safely correspond (missing id, type change,
 * or choice values removed from options). Does not mutate the prior submission.
 */
export function buildPrefillAnswersFromPrevious(
  liveFields: FormFieldDefinition[],
  previousAnswersRaw: unknown,
  previousFields: FormFieldDefinition[] = [],
): FormAnswersMap {
  const previousAnswers = parseFormSubmissionAnswers(previousAnswersRaw);
  const previousById = new Map(previousFields.map((field) => [field.id, field]));
  const prefill: FormAnswersMap = {};

  for (const liveField of liveFields) {
    if (!(liveField.id in previousAnswers)) {
      continue;
    }

    const previousField = previousById.get(liveField.id);
    if (previousField && previousField.type !== liveField.type) {
      continue;
    }

    const value = previousAnswers[liveField.id];
    const safeValue = coercePrefillValue(liveField, value);
    if (safeValue === undefined) {
      continue;
    }

    prefill[liveField.id] = safeValue;
  }

  return clearHiddenFormAnswers(liveFields, prefill);
}

function coercePrefillValue(
  field: FormFieldDefinition,
  value: unknown,
): unknown | undefined {
  switch (field.type) {
    case "short_text":
    case "long_text":
    case "date":
      return typeof value === "string" ? value : undefined;

    case "yes_no":
      return value === "yes" || value === "no" ? value : undefined;

    case "checkbox":
      return typeof value === "boolean" ? value : undefined;

    case "single_choice": {
      if (typeof value !== "string" || !field.options?.includes(value)) {
        return undefined;
      }
      return value;
    }

    case "multiple_choice": {
      if (!Array.isArray(value) || !field.options) {
        return undefined;
      }
      const allowed = value.filter(
        (item): item is string =>
          typeof item === "string" && field.options!.includes(item),
      );
      return allowed.length > 0 ? allowed : undefined;
    }

    default:
      return undefined;
  }
}
