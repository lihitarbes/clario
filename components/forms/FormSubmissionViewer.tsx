import { FormContentText } from "@/components/forms/FormContentFields";
import {
  buildSnapshotAnswerRows,
  formatSubmissionDate,
  formatSubmissionDateTime,
  getSubmissionValidityStatus,
  parseFormSubmissionAnswers,
  parseFormSubmissionSnapshot,
} from "@/lib/forms/submission-view";
import { cn } from "@/lib/utils";
import type { FormSubmission } from "@/types/database";

type FormSubmissionViewerProps = {
  submission: Pick<
    FormSubmission,
    "snapshot" | "answers" | "submitted_at" | "valid_until"
  >;
  /** Optional note under the title (e.g. previously submitted copy). */
  subtitle?: string;
};

export function FormSubmissionViewer({
  submission,
  subtitle,
}: FormSubmissionViewerProps) {
  const snapshot = parseFormSubmissionSnapshot(submission.snapshot);
  const answers = parseFormSubmissionAnswers(submission.answers);

  if (!snapshot) {
    return (
      <p className="text-sm text-red-600" role="alert">
        This submission could not be displayed.
      </p>
    );
  }

  const rows = buildSnapshotAnswerRows(snapshot, answers);
  const validity = getSubmissionValidityStatus(submission.valid_until);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <FormContentText
          as="h1"
          className="text-2xl font-semibold text-zinc-900"
        >
          {snapshot.formTitle}
        </FormContentText>
        {subtitle ? (
          <p className="text-sm text-zinc-600">{subtitle}</p>
        ) : null}
        {snapshot.formDescription ? (
          <FormContentText as="p" className="text-sm text-zinc-600">
            {snapshot.formDescription}
          </FormContentText>
        ) : null}

        <div className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-medium text-zinc-700">
            Submitted {formatSubmissionDateTime(submission.submitted_at)}
          </span>
          {validity === "no_expiry" ? (
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-medium text-zinc-600">
              No expiry
            </span>
          ) : null}
          {validity === "valid" && submission.valid_until ? (
            <span className="rounded-full bg-green-100 px-2.5 py-1 font-medium text-green-800">
              Valid until {formatSubmissionDate(submission.valid_until)}
            </span>
          ) : null}
          {validity === "expired" && submission.valid_until ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-900">
              Expired {formatSubmissionDate(submission.valid_until)}
            </span>
          ) : null}
        </div>
      </div>

      <div className="space-y-4">
        {rows.length === 0 ? (
          <p className="text-sm text-zinc-600">No answers were recorded.</p>
        ) : (
          rows.map(({ field, displayValue }) => (
            <div
              key={field.id}
              className="space-y-2 rounded-lg border border-zinc-200 bg-white p-4"
            >
              <FormContentText className="text-sm font-medium text-zinc-900">
                {field.label}
              </FormContentText>
              {field.helpText ? (
                <FormContentText className="text-sm text-zinc-500">
                  {field.helpText}
                </FormContentText>
              ) : null}
              <FormContentText
                as="p"
                className={cn(
                  "text-sm text-zinc-800",
                  field.type === "long_text" && "whitespace-pre-wrap",
                )}
              >
                {displayValue}
              </FormContentText>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
