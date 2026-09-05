import Link from "next/link";
import { FormContentText } from "@/components/forms/FormContentFields";
import { UpdateMyInformationButton } from "@/components/forms/UpdateMyInformationButton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  normalizeFormHistory,
  type FormHistoryAssignment,
} from "@/lib/forms/history";
import {
  formAssignmentKindLabel,
  pendingAssignmentActionLabel,
} from "@/lib/forms/display";
import {
  formatSubmissionDate,
  getSubmissionValidityStatus,
} from "@/lib/forms/submission-view";

type ClientMyFormsListProps = {
  assignments: FormHistoryAssignment[];
  showSuccessMessage?: boolean;
};

export function ClientMyFormsList({
  assignments,
  showSuccessMessage = false,
}: ClientMyFormsListProps) {
  const items = normalizeFormHistory(assignments);
  const pending = items.filter((item) => item.status === "pending");
  const completed = items.filter((item) => item.status === "completed");

  return (
    <div className="space-y-6">
      {showSuccessMessage ? (
        <p
          className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
          role="status"
        >
          Your form was submitted successfully.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Forms requiring action</CardTitle>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="text-sm text-zinc-600">
              You have no forms waiting to be completed.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {pending.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-start justify-between gap-3 py-4 first:pt-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <FormContentText className="text-sm font-medium text-zinc-900">
                      {item.title}
                    </FormContentText>
                    {item.description ? (
                      <FormContentText className="text-sm text-zinc-600">
                        {item.description}
                      </FormContentText>
                    ) : null}
                    <p className="text-sm text-zinc-500">
                      Assigned {formatSubmissionDate(item.assignedAt)}
                    </p>
                    <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      {pendingAssignmentActionLabel(item.assignmentKind)}
                    </span>
                    <p className="text-xs text-zinc-500">
                      {formAssignmentKindLabel(item.assignmentKind)}
                    </p>
                  </div>
                  <Button asChild size="sm">
                    <Link href={`/my-forms/${item.id}`}>Open form</Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Completed &amp; history</CardTitle>
        </CardHeader>
        <CardContent>
          {completed.length === 0 ? (
            <p className="text-sm text-zinc-600">No completed forms yet.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {completed.map((item) => {
                const validity = getSubmissionValidityStatus(item.validUntil);
                const canUpdate =
                  item.isCurrentCompleted &&
                  Boolean(item.submissionId) &&
                  !item.formArchived &&
                  !item.formHasPending;

                return (
                  <li key={item.id} className="space-y-3 py-4 first:pt-0 last:pb-0">
                    <Link
                      href={`/my-forms/${item.id}`}
                      className="flex flex-wrap items-start justify-between gap-3 transition-colors hover:bg-zinc-50"
                    >
                      <div className="space-y-1">
                        <FormContentText className="text-sm font-medium text-zinc-900">
                          {item.title}
                        </FormContentText>
                        <div className="flex flex-wrap gap-2 text-xs">
                          {item.isCurrentCompleted ? (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-800">
                              Current
                            </span>
                          ) : (
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium text-zinc-600">
                              Previous version
                            </span>
                          )}
                          {validity === "expired" ? (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-900">
                              Expired
                            </span>
                          ) : null}
                        </div>
                        <p className="text-sm text-zinc-600">
                          Submitted{" "}
                          {item.submittedAt || item.completedAt
                            ? formatSubmissionDate(
                                item.submittedAt ?? item.completedAt!,
                              )
                            : "—"}
                        </p>
                      </div>
                      <span className="text-sm font-medium text-zinc-600">
                        View submission →
                      </span>
                    </Link>
                    {canUpdate && item.submissionId ? (
                      <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-3">
                        <p className="mb-2 text-sm text-zinc-600">
                          Something changed? Update this form without waiting
                          for your practitioner.
                        </p>
                        <UpdateMyInformationButton
                          clientId={item.clientId}
                          formId={item.formId}
                          fromSubmissionId={item.submissionId}
                        />
                      </div>
                    ) : null}
                    {item.isCurrentCompleted && item.formHasPending ? (
                      <p className="text-sm text-zinc-600">
                        An update is already in progress.{" "}
                        <Link
                          href={`/my-forms/${
                            pending.find((p) => p.formId === item.formId)?.id ??
                            item.id
                          }`}
                          className="font-medium text-zinc-900 underline"
                        >
                          Open pending form
                        </Link>
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
