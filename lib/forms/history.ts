import type { FormAssignmentKind, FormAssignmentStatus } from "@/types/database";

export type FormHistoryAssignment = {
  id: string;
  form_id: string;
  client_id: string;
  status: FormAssignmentStatus;
  assignment_kind: FormAssignmentKind;
  assigned_at: string;
  completed_at: string | null;
  forms: {
    title: string;
    description: string | null;
    archived_at?: string | null;
  } | null;
  form_submissions:
    | {
        id: string;
        submitted_at: string;
        valid_until: string | null;
      }
    | {
        id: string;
        submitted_at: string;
        valid_until: string | null;
      }[]
    | null;
};

export type NormalizedHistoryItem = {
  id: string;
  formId: string;
  clientId: string;
  status: FormAssignmentStatus;
  assignmentKind: FormAssignmentKind;
  assignedAt: string;
  completedAt: string | null;
  title: string;
  description: string | null;
  formArchived: boolean;
  submissionId: string | null;
  submittedAt: string | null;
  validUntil: string | null;
  /** Latest completed submission for this form among the list. */
  isCurrentCompleted: boolean;
  /** Older completed versions for the same form. */
  isPreviousVersion: boolean;
  /** A pending assignment already exists for this form. */
  formHasPending: boolean;
};

function oneSubmission(
  value: FormHistoryAssignment["form_submissions"],
): {
  id: string;
  submitted_at: string;
  valid_until: string | null;
} | null {
  if (!value) {
    return null;
  }
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value;
}

export function normalizeFormHistory(
  assignments: FormHistoryAssignment[],
): NormalizedHistoryItem[] {
  const pendingFormIds = new Set(
    assignments
      .filter((item) => item.status === "pending")
      .map((item) => item.form_id),
  );

  const latestCompletedAtByForm = new Map<string, string>();
  for (const item of assignments) {
    if (item.status !== "completed") {
      continue;
    }
    const submission = oneSubmission(item.form_submissions);
    const stamp = submission?.submitted_at ?? item.completed_at;
    if (!stamp) {
      continue;
    }
    const existing = latestCompletedAtByForm.get(item.form_id);
    if (!existing || stamp > existing) {
      latestCompletedAtByForm.set(item.form_id, stamp);
    }
  }

  return assignments.map((item) => {
    const submission = oneSubmission(item.form_submissions);
    const stamp = submission?.submitted_at ?? item.completed_at;
    const isCompleted = item.status === "completed";
    const isCurrentCompleted =
      isCompleted &&
      Boolean(stamp) &&
      latestCompletedAtByForm.get(item.form_id) === stamp;
    const isPreviousVersion = isCompleted && !isCurrentCompleted;

    return {
      id: item.id,
      formId: item.form_id,
      clientId: item.client_id,
      status: item.status,
      assignmentKind: item.assignment_kind,
      assignedAt: item.assigned_at,
      completedAt: item.completed_at,
      title: item.forms?.title ?? "Form",
      description: item.forms?.description ?? null,
      formArchived: Boolean(item.forms?.archived_at),
      submissionId: submission?.id ?? null,
      submittedAt: submission?.submitted_at ?? null,
      validUntil: submission?.valid_until ?? null,
      isCurrentCompleted,
      isPreviousVersion,
      formHasPending: pendingFormIds.has(item.form_id),
    };
  });
}
