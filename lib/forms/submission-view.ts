import { snapshotFieldDefinitions } from "@/lib/forms/build-snapshot";
import { yesNoDisplayLabels } from "@/lib/forms/render";
import type { FormAnswersMap } from "@/lib/forms/visibility";
import { getVisibleFormFields } from "@/lib/forms/visibility";
import type {
  FormFieldDefinition,
  FormSubmissionSnapshot,
} from "@/types/database";

/** Normalize jsonb snapshot from the database for historical rendering. */
export function parseFormSubmissionSnapshot(
  raw: unknown,
): FormSubmissionSnapshot | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const formTitle =
    typeof record.formTitle === "string" && record.formTitle.trim().length > 0
      ? record.formTitle.trim()
      : "Form";
  const formDescription =
    typeof record.formDescription === "string"
      ? record.formDescription
      : null;
  const renewalIntervalMonths =
    typeof record.renewalIntervalMonths === "number" &&
    Number.isInteger(record.renewalIntervalMonths) &&
    record.renewalIntervalMonths > 0
      ? record.renewalIntervalMonths
      : null;

  return {
    formTitle,
    formDescription,
    renewalIntervalMonths,
    submittedFieldDefinitions: snapshotFieldDefinitions({
      formTitle,
      formDescription,
      renewalIntervalMonths,
      submittedFieldDefinitions: Array.isArray(record.submittedFieldDefinitions)
        ? (record.submittedFieldDefinitions as FormFieldDefinition[])
        : [],
    }),
  };
}

/** Normalize jsonb answers into a plain map for visibility + display. */
export function parseFormSubmissionAnswers(raw: unknown): FormAnswersMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }

  return { ...(raw as FormAnswersMap) };
}

export type SubmissionValidityStatus = "no_expiry" | "valid" | "expired";

export function getSubmissionValidityStatus(
  validUntil: string | null,
  now: Date = new Date(),
): SubmissionValidityStatus {
  if (!validUntil) {
    return "no_expiry";
  }

  const until = new Date(validUntil);
  if (Number.isNaN(until.getTime())) {
    return "no_expiry";
  }

  return until.getTime() >= now.getTime() ? "valid" : "expired";
}

export function formatSubmissionDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatSubmissionDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Format a single answer for read-only display using snapshot field metadata. */
export function formatFormAnswerDisplay(
  field: FormFieldDefinition,
  value: unknown,
  contextText: string,
): string {
  if (value === undefined || value === null || value === "") {
    return "—";
  }

  switch (field.type) {
    case "yes_no": {
      const labels = yesNoDisplayLabels(contextText);
      if (value === "yes") {
        return labels.yes;
      }
      if (value === "no") {
        return labels.no;
      }
      return String(value);
    }
    case "checkbox": {
      if (value === true) {
        return "Yes";
      }
      if (value === false) {
        return "No";
      }
      return String(value);
    }
    case "multiple_choice": {
      if (!Array.isArray(value) || value.length === 0) {
        return "—";
      }
      return value
        .filter((item): item is string => typeof item === "string")
        .join(", ");
    }
    case "short_text":
    case "long_text":
    case "single_choice":
    case "date":
    default:
      return typeof value === "string" ? value : String(value);
  }
}

export type SnapshotAnswerRow = {
  field: FormFieldDefinition;
  displayValue: string;
};

/**
 * Build read-only Q&A rows from the immutable snapshot + answers.
 * Only includes fields that were visible for the submitted answers.
 */
export function buildSnapshotAnswerRows(
  snapshot: FormSubmissionSnapshot,
  answers: FormAnswersMap,
): SnapshotAnswerRow[] {
  const fields = snapshot.submittedFieldDefinitions;
  const visible = getVisibleFormFields(fields, answers);
  const contextText = `${snapshot.formTitle} ${snapshot.formDescription ?? ""}`;

  return visible.map((field) => ({
    field,
    displayValue: formatFormAnswerDisplay(field, answers[field.id], contextText),
  }));
}
