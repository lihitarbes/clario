import type { FormAssignmentKind, FormFieldType } from "@/types/database";

export const FORM_FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  short_text: "Short text",
  long_text: "Long text",
  yes_no: "Yes / No",
  single_choice: "Single choice",
  multiple_choice: "Multiple choice",
  date: "Date",
  checkbox: "Checkbox",
};

export const FORM_FIELD_TYPES: FormFieldType[] = [
  "short_text",
  "long_text",
  "yes_no",
  "single_choice",
  "multiple_choice",
  "date",
  "checkbox",
];

export const formFormSelectClassName =
  "flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:cursor-not-allowed disabled:opacity-50";

export function formatRenewalInterval(months: number | null): string {
  if (months === null) {
    return "No renewal";
  }

  return `Every ${months} month${months === 1 ? "" : "s"}`;
}

export function formAssignmentKindLabel(kind: FormAssignmentKind): string {
  switch (kind) {
    case "owner_assign":
      return "New assignment";
    case "owner_update_request":
      return "Update requested";
    case "client_update":
      return "Client update";
    default:
      return "Assignment";
  }
}

export function pendingAssignmentActionLabel(kind: FormAssignmentKind): string {
  switch (kind) {
    case "owner_update_request":
      return "Update requested";
    case "client_update":
      return "Updating your information";
    default:
      return "Needs action";
  }
}

export type RenewalPreset = "never" | "3" | "6" | "12" | "custom";

export function renewalMonthsFromPreset(
  preset: RenewalPreset,
  customMonths: number | null,
): number | null {
  switch (preset) {
    case "never":
      return null;
    case "3":
      return 3;
    case "6":
      return 6;
    case "12":
      return 12;
    case "custom":
      return customMonths;
  }
}

export function renewalPresetFromMonths(
  months: number | null,
): { preset: RenewalPreset; customMonths: number | null } {
  if (months === null) {
    return { preset: "never", customMonths: null };
  }

  if (months === 3) {
    return { preset: "3", customMonths: null };
  }

  if (months === 6) {
    return { preset: "6", customMonths: null };
  }

  if (months === 12) {
    return { preset: "12", customMonths: null };
  }

  return { preset: "custom", customMonths: months };
}
