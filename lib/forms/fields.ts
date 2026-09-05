import type { FormFieldDefinition, FormFieldType } from "@/types/database";

const LEGACY_TYPE_MAP: Record<string, FormFieldType> = {
  text: "short_text",
  textarea: "long_text",
  select: "single_choice",
};

/** Map legacy stored field types to the M7 contract without dropping data. */
export function normalizeLegacyFieldType(type: string): FormFieldType {
  if (LEGACY_TYPE_MAP[type]) {
    return LEGACY_TYPE_MAP[type];
  }

  const allowed: FormFieldType[] = [
    "short_text",
    "long_text",
    "yes_no",
    "single_choice",
    "multiple_choice",
    "date",
    "checkbox",
  ];

  if (allowed.includes(type as FormFieldType)) {
    return type as FormFieldType;
  }

  return "short_text";
}

/** Normalize fields loaded from the database for builder/display. */
export function normalizeFormFields(
  raw: FormFieldDefinition[] | unknown,
): FormFieldDefinition[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item, index) => normalizeFormField(item, index))
    .sort((a, b) => a.order - b.order);
}

function normalizeFormField(
  item: unknown,
  fallbackOrder: number,
): FormFieldDefinition {
  const record =
    item && typeof item === "object" ? (item as Record<string, unknown>) : {};

  const id =
    typeof record.id === "string" && record.id.trim().length > 0
      ? record.id.trim()
      : crypto.randomUUID();

  const label =
    typeof record.label === "string" ? record.label.trim() : "Question";

  const type = normalizeLegacyFieldType(
    typeof record.type === "string" ? record.type : "short_text",
  );

  const required = Boolean(record.required);

  const order =
    typeof record.order === "number" && Number.isInteger(record.order)
      ? record.order
      : fallbackOrder;

  const helpText =
    typeof record.helpText === "string" && record.helpText.trim().length > 0
      ? record.helpText.trim()
      : undefined;

  let options: string[] | undefined;
  if (Array.isArray(record.options)) {
    options = record.options
      .filter((opt): opt is string => typeof opt === "string")
      .map((opt) => opt.trim())
      .filter((opt) => opt.length > 0);
  }

  let visibleWhen: FormFieldDefinition["visibleWhen"];
  if (
    record.visibleWhen &&
    typeof record.visibleWhen === "object" &&
    typeof (record.visibleWhen as { questionId?: unknown }).questionId ===
      "string"
  ) {
    const when = record.visibleWhen as {
      questionId: string;
      value: unknown;
    };
    const value =
      typeof when.value === "boolean" || typeof when.value === "string"
        ? when.value
        : String(when.value);
    visibleWhen = {
      questionId: when.questionId.trim(),
      value,
    };
  }

  const field: FormFieldDefinition = {
    id,
    label,
    type,
    required,
    order,
    helpText,
    visibleWhen,
  };

  if (type === "single_choice" || type === "multiple_choice") {
    field.options = options ?? [];
  } else if (type === "yes_no") {
    field.options = undefined;
  } else {
    field.options = undefined;
  }

  return field;
}

/** Reassign order integers sequentially (0-based). */
export function reorderFormFields(fields: FormFieldDefinition[]): FormFieldDefinition[] {
  return fields.map((field, index) => ({ ...field, order: index }));
}

export function createEmptyQuestion(order: number): FormFieldDefinition {
  return {
    id: crypto.randomUUID(),
    label: "",
    type: "short_text",
    required: false,
    order,
  };
}
