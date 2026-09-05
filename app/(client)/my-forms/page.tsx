import { getCurrentProfile, getLinkedClients } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ClientMyFormsList } from "@/components/forms/ClientMyFormsList";
import type { FormHistoryAssignment } from "@/lib/forms/history";

export const dynamic = "force-dynamic";

export default async function ClientFormsPage({
  searchParams,
}: PageProps<"/my-forms">) {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }

  const linkedClients = await getLinkedClients();
  const linkedIds = linkedClients.map((client) => client.id);
  const { submitted } = await searchParams;
  const showSuccessMessage = submitted === "1";

  if (linkedIds.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-2xl font-semibold text-zinc-900">My forms</h1>
        <p className="text-sm text-zinc-600">
          No linked client records found for your account yet.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: assignments, error: assignmentsError } = await supabase
    .from("form_assignments")
    .select(
      "id, form_id, client_id, status, assignment_kind, assigned_at, completed_at, forms(title, description, archived_at), form_submissions!form_assignment_id(id, submitted_at, valid_until)",
    )
    .in("client_id", linkedIds)
    .order("assigned_at", { ascending: false });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">My forms</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Complete forms assigned by your practitioners.
        </p>
      </div>

      {assignmentsError ? (
        <p
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          Could not load your forms. Please try again.
        </p>
      ) : (
        <ClientMyFormsList
          assignments={(assignments ?? []) as FormHistoryAssignment[]}
          showSuccessMessage={showSuccessMessage}
        />
      )}
    </div>
  );
}
