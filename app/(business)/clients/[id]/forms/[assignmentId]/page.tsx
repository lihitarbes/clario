import Link from "next/link";
import { notFound } from "next/navigation";
import { FormSubmissionViewer } from "@/components/forms/FormSubmissionViewer";
import { RequestFormUpdateButton } from "@/components/forms/RequestFormUpdateButton";
import { getOwnedBusiness } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import type { FormSubmission } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function OwnerFormSubmissionPage({
  params,
}: PageProps<"/clients/[id]/forms/[assignmentId]">) {
  const { id: clientId, assignmentId } = await params;
  const business = await getOwnedBusiness();

  if (!business) {
    notFound();
  }

  const supabase = await createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("id, full_name, archived_at")
    .eq("id", clientId)
    .eq("business_id", business.id)
    .maybeSingle();

  if (!client) {
    notFound();
  }

  const { data: assignment } = await supabase
    .from("form_assignments")
    .select("id, status, client_id, form_id")
    .eq("id", assignmentId)
    .eq("client_id", client.id)
    .maybeSingle();

  if (!assignment || assignment.status !== "completed") {
    notFound();
  }

  const { data: submission } = await supabase
    .from("form_submissions")
    .select(
      "id, form_id, form_assignment_id, client_id, answers, snapshot, submitted_at, valid_until, supersedes_submission_id",
    )
    .eq("form_assignment_id", assignmentId)
    .eq("client_id", client.id)
    .maybeSingle();

  if (!submission) {
    notFound();
  }

  const typedSubmission = submission as FormSubmission;

  const { data: latestSubmission } = await supabase
    .from("form_submissions")
    .select("id")
    .eq("form_id", typedSubmission.form_id)
    .eq("client_id", client.id)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: pendingForForm } = await supabase
    .from("form_assignments")
    .select("id")
    .eq("form_id", assignment.form_id)
    .eq("client_id", client.id)
    .eq("status", "pending")
    .limit(1)
    .maybeSingle();

  const { data: liveForm } = await supabase
    .from("forms")
    .select("archived_at")
    .eq("id", assignment.form_id)
    .eq("business_id", business.id)
    .maybeSingle();

  const isCurrent = latestSubmission?.id === typedSubmission.id;
  const canRequestUpdate =
    isCurrent &&
    !client.archived_at &&
    !pendingForForm &&
    !liveForm?.archived_at;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href={`/clients/${client.id}`}
          className="text-sm text-zinc-600 hover:text-zinc-900 hover:underline"
        >
          ← Back to {client.full_name}
        </Link>
        <p className="mt-3 text-sm font-medium text-zinc-500">
          Submitted form · {client.full_name}
        </p>
      </div>

      <FormSubmissionViewer
        submission={typedSubmission}
        subtitle="Read-only view of the answers submitted for this assignment."
      />

      {canRequestUpdate ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="mb-3 text-sm text-zinc-600">
            Ask the client to review and update this form. A new pending
            assignment will be created with previous answers pre-filled.
          </p>
          <RequestFormUpdateButton
            clientId={client.id}
            formId={typedSubmission.form_id}
            fromSubmissionId={typedSubmission.id}
          />
        </div>
      ) : null}
      {isCurrent && pendingForForm ? (
        <p className="text-sm text-zinc-600">
          An update is already waiting for this client.
        </p>
      ) : null}
    </div>
  );
}
