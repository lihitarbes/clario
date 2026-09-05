import Link from "next/link";
import { notFound } from "next/navigation";
import { ArchiveClientButton } from "@/components/clients/ArchiveClientButton";
import { ClientProfile } from "@/components/clients/ClientProfile";
import { ClientDocumentsEntry } from "@/components/documents/ClientDocumentsEntry";
import { ClientFormsSection } from "@/components/forms/ClientFormsSection";
import { VisitHistorySection } from "@/components/visits/VisitHistorySection";
import { getOwnedBusiness } from "@/lib/auth/permissions";
import type { FormHistoryAssignment } from "@/lib/forms/history";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({
  params,
}: PageProps<"/clients/[id]">) {
  const { id } = await params;
  const business = await getOwnedBusiness();

  if (!business) {
    notFound();
  }

  const supabase = await createClient();
  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .eq("business_id", business.id)
    .maybeSingle();

  if (!client) {
    notFound();
  }

  const isArchived = Boolean(client.archived_at);

  const [
    visitsResult,
    activeFormsResult,
    formAssignmentsResult,
    documentsCountResult,
  ] = await Promise.all([
    supabase
      .from("visits")
      .select(
        "id, summary, published_at, publication_scope, appointments(start_time, end_time, status)",
      )
      .eq("client_id", client.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("forms")
      .select("id, title")
      .eq("business_id", business.id)
      .is("archived_at", null)
      .order("title"),
    supabase
      .from("form_assignments")
      .select(
        "id, form_id, client_id, status, assignment_kind, assigned_at, completed_at, forms(title, description, archived_at), form_submissions!form_assignment_id(id, submitted_at, valid_until)",
      )
      .eq("client_id", client.id)
      .order("assigned_at", { ascending: false }),
    supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("client_id", client.id),
  ]);

  const visits = (visitsResult.data ?? []) as Array<{
    id: string;
    summary: string | null;
    published_at: string | null;
    publication_scope: import("@/types/database").VisitPublicationScope;
    appointments: {
      start_time: string;
      end_time: string;
      status: string;
    } | null;
  }>;
  const activeForms = activeFormsResult.data ?? [];
  const formAssignments = formAssignmentsResult.data ?? [];
  const formAssignmentsError = formAssignmentsResult.error;
  const documentCount = documentsCountResult.count ?? 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/clients"
          className="text-sm text-zinc-600 hover:text-zinc-900 hover:underline"
        >
          ← Back to clients
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          {client.full_name}
        </h1>
        <div className="mt-2 flex flex-wrap gap-2 text-sm">
          {isArchived ? (
            <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-800">
              Archived
            </span>
          ) : null}
          {client.user_id ? (
            <span className="rounded-full bg-green-100 px-2 py-1 text-green-800">
              Account linked
            </span>
          ) : (
            <span className="rounded-full bg-zinc-100 px-2 py-1 text-zinc-600">
              No account yet
            </span>
          )}
        </div>
      </div>

      <ClientProfile client={client} />

      {!isArchived ? (
        <ArchiveClientButton
          clientId={client.id}
          clientName={client.full_name}
        />
      ) : null}

      <ClientDocumentsEntry
        clientId={client.id}
        documentCount={documentCount}
        loadError={
          documentsCountResult.error
            ? "Could not load documents. Please try again."
            : null
        }
      />

      {formAssignmentsError ? (
        <p
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          Could not load form history. Please try again.
        </p>
      ) : (
        <ClientFormsSection
          clientId={client.id}
          assignments={formAssignments as FormHistoryAssignment[]}
          forms={activeForms}
          canAssign={!isArchived}
        />
      )}

      <VisitHistorySection visits={visits} />
    </div>
  );
}
