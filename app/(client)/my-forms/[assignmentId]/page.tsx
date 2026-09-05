import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FormFillForm } from "@/components/forms/FormFillForm";
import { FormContentText } from "@/components/forms/FormContentFields";
import { FormSubmissionViewer } from "@/components/forms/FormSubmissionViewer";
import { UpdateMyInformationButton } from "@/components/forms/UpdateMyInformationButton";
import { getCurrentProfile, getLinkedClients } from "@/lib/auth/permissions";
import { normalizeFormFields } from "@/lib/forms/fields";
import { formAssignmentKindLabel } from "@/lib/forms/display";
import { buildPrefillAnswersFromPrevious } from "@/lib/forms/prefill";
import { parseFormSubmissionSnapshot } from "@/lib/forms/submission-view";
import { createClient } from "@/lib/supabase/server";
import type {
  Form,
  FormAssignment,
  FormSubmission,
} from "@/types/database";

export const dynamic = "force-dynamic";

export default async function ClientFillFormPage({
  params,
}: PageProps<"/my-forms/[assignmentId]">) {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }

  const { assignmentId } = await params;
  const linkedClients = await getLinkedClients();
  const linkedIds = linkedClients.map((client) => client.id);

  if (linkedIds.length === 0) {
    notFound();
  }

  const supabase = await createClient();
  const { data: assignment } = await supabase
    .from("form_assignments")
    .select("*, forms(*)")
    .eq("id", assignmentId)
    .in("client_id", linkedIds)
    .maybeSingle();

  if (!assignment) {
    notFound();
  }

  const typed = assignment as FormAssignment & { forms: Form | null };

  if (typed.status === "completed") {
    const { data: submission } = await supabase
      .from("form_submissions")
      .select(
        "id, form_id, form_assignment_id, client_id, answers, snapshot, submitted_at, valid_until, supersedes_submission_id",
      )
      .eq("form_assignment_id", assignmentId)
      .in("client_id", linkedIds)
      .maybeSingle();

    if (!submission) {
      notFound();
    }

    const typedSubmission = submission as FormSubmission;

    const { data: latestSubmission } = await supabase
      .from("form_submissions")
      .select("id")
      .eq("form_id", typedSubmission.form_id)
      .eq("client_id", typedSubmission.client_id)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: pendingForForm } = await supabase
      .from("form_assignments")
      .select("id")
      .eq("form_id", typed.form_id)
      .eq("client_id", typed.client_id)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle();

    const { data: liveForm } = await supabase
      .from("forms")
      .select("archived_at")
      .eq("id", typed.form_id)
      .maybeSingle();

    const isCurrent = latestSubmission?.id === typedSubmission.id;
    const canUpdate =
      isCurrent &&
      !pendingForForm &&
      !liveForm?.archived_at;

    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <Link
            href="/my-forms"
            className="text-sm text-zinc-600 hover:text-zinc-900 hover:underline"
          >
            ← Back to my forms
          </Link>
          <p className="mt-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
            This is a submitted form on file. This page is read-only.
            {canUpdate
              ? " To change answers, use Update my information below — a new version will be created and the old one stays in history."
              : null}
          </p>
        </div>

        {canUpdate ? (
          <div className="rounded-lg border border-sky-200 bg-sky-50 p-4">
            <p className="mb-3 text-sm font-medium text-sky-950">
              Update my information
            </p>
            <p className="mb-3 text-sm text-sky-900">
              If something changed (for example pregnancy, medication, allergy,
              or contact details), start an update. Your previous answers will
              be pre-filled so you only need to change what is different.
            </p>
            <UpdateMyInformationButton
              clientId={typedSubmission.client_id}
              formId={typedSubmission.form_id}
              fromSubmissionId={typedSubmission.id}
            />
          </div>
        ) : null}
        {isCurrent && pendingForForm ? (
          <p className="text-sm text-zinc-600">
            An update is already in progress.{" "}
            <Link
              href={`/my-forms/${pendingForForm.id}`}
              className="font-medium text-zinc-900 underline"
            >
              Open pending form
            </Link>
          </p>
        ) : null}
        {!isCurrent ? (
          <p className="text-sm text-zinc-600">
            This is a previous version. Open the{" "}
            <span className="font-medium text-zinc-900">Current</span> submission
            from My forms to update your information.
          </p>
        ) : null}

        <FormSubmissionViewer
          submission={typedSubmission}
          subtitle="Submitted form on file for your practitioner."
        />
      </div>
    );
  }

  if (typed.status !== "pending") {
    redirect("/my-forms");
  }

  if (!typed.forms || typed.forms.archived_at) {
    notFound();
  }

  const form: Form = {
    ...typed.forms,
    fields: normalizeFormFields(typed.forms.fields),
  };

  let initialAnswers = {};
  let updateBanner: string | null = null;

  if (typed.prefill_from_submission_id) {
    const { data: previous } = await supabase
      .from("form_submissions")
      .select("answers, snapshot")
      .eq("id", typed.prefill_from_submission_id)
      .eq("client_id", typed.client_id)
      .eq("form_id", typed.form_id)
      .maybeSingle();

    if (previous) {
      const snapshot = parseFormSubmissionSnapshot(previous.snapshot);
      initialAnswers = buildPrefillAnswersFromPrevious(
        form.fields,
        previous.answers,
        snapshot?.submittedFieldDefinitions ?? [],
      );
    }

    updateBanner =
      typed.assignment_kind === "owner_update_request"
        ? "Your practitioner requested an update. Previous answers are pre-filled — review and submit."
        : "Updating your information. Previous answers are pre-filled — review and submit.";
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/my-forms"
          className="text-sm text-zinc-600 hover:text-zinc-900 hover:underline"
        >
          ← Back to my forms
        </Link>
        <FormContentText
          as="h1"
          className="mt-2 text-2xl font-semibold text-zinc-900"
        >
          {form.title}
        </FormContentText>
        <p className="mt-1 text-sm text-zinc-600">
          Complete and submit this form for your practitioner.
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          {formAssignmentKindLabel(typed.assignment_kind)}
        </p>
      </div>

      <FormFillForm
        key={typed.id}
        assignmentId={typed.id}
        form={form}
        initialAnswers={initialAnswers}
        updateBanner={updateBanner}
      />
    </div>
  );
}
