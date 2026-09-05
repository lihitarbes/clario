import { normalizeFormFields } from "@/lib/forms/fields";
import type { Form, FormFieldDefinition, FormSubmissionSnapshot } from "@/types/database";

/** Build immutable submission snapshot from the live form template. */
export function buildFormSubmissionSnapshot(form: Pick<
  Form,
  "title" | "description" | "renewal_interval_months" | "fields"
>): FormSubmissionSnapshot {
  return {
    formTitle: form.title,
    formDescription: form.description,
    renewalIntervalMonths: form.renewal_interval_months,
    submittedFieldDefinitions: normalizeFormFields(form.fields),
  };
}

export function snapshotFieldDefinitions(
  snapshot: FormSubmissionSnapshot,
): FormFieldDefinition[] {
  return normalizeFormFields(snapshot.submittedFieldDefinitions);
}
