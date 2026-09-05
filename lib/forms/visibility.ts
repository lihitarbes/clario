import type { FormFieldDefinition } from "@/types/database";

export type FormAnswersMap = Record<string, unknown>;

/** Read a single answer value by question id. */
export function getFormAnswer(
  answers: FormAnswersMap,
  questionId: string,
): unknown {
  return answers[questionId];
}

/**
 * Whether a field should be shown given current answers.
 * Matches server validation and client DynamicFormRenderer.
 */
export function isFormFieldVisible(
  field: FormFieldDefinition,
  answers: FormAnswersMap,
): boolean {
  if (!field.visibleWhen) {
    return true;
  }

  const parentValue = getFormAnswer(answers, field.visibleWhen.questionId);
  if (parentValue === undefined || parentValue === null) {
    return false;
  }

  return String(parentValue) === String(field.visibleWhen.value);
}

export function getVisibleFormFields(
  fields: FormFieldDefinition[],
  answers: FormAnswersMap,
): FormFieldDefinition[] {
  return fields.filter((field) => isFormFieldVisible(field, answers));
}

/** Remove answers for fields that are not currently visible. */
export function clearHiddenFormAnswers(
  fields: FormFieldDefinition[],
  answers: FormAnswersMap,
): FormAnswersMap {
  const next: FormAnswersMap = { ...answers };

  for (const field of fields) {
    if (!isFormFieldVisible(field, next)) {
      delete next[field.id];
    }
  }

  return next;
}
