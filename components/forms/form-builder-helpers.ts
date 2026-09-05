import type { FormFieldDefinition } from "@/types/database";
import {
  FORM_FIELD_TYPE_LABELS,
  FORM_FIELD_TYPES,
  formFormSelectClassName,
} from "@/lib/forms/display";

export function getConditionalParentOptions(
  fields: FormFieldDefinition[],
  currentId: string,
): FormFieldDefinition[] {
  return fields.filter(
    (field) =>
      field.id !== currentId &&
      (field.type === "yes_no" || field.type === "single_choice"),
  );
}

export function getConditionalValueOptions(
  parent: FormFieldDefinition | undefined,
): Array<{ value: string; label: string }> {
  if (!parent) {
    return [];
  }

  if (parent.type === "yes_no") {
    return [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ];
  }

  if (parent.type === "single_choice" && parent.options) {
    return parent.options.map((option) => ({ value: option, label: option }));
  }

  return [];
}

export { FORM_FIELD_TYPE_LABELS, FORM_FIELD_TYPES, formFormSelectClassName };
