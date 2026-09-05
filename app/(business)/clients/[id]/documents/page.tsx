import Link from "next/link";
import { notFound } from "next/navigation";
import { ClientDocumentsSection } from "@/components/documents/ClientDocumentsSection";
import type { OwnerDocumentListItem } from "@/components/documents/OwnerDocumentList";
import { formatAppointmentTimeRange } from "@/lib/appointments/display";
import { getOwnedBusiness } from "@/lib/auth/permissions";
import { signDocumentPaths } from "@/lib/documents/storage";
import { createClient } from "@/lib/supabase/server";
import type { Document } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function ClientDocumentsPage({
  params,
}: PageProps<"/clients/[id]/documents">) {
  const { id } = await params;
  const business = await getOwnedBusiness();

  if (!business) {
    notFound();
  }

  const supabase = await createClient();
  const { data: client } = await supabase
    .from("clients")
    .select("id, full_name, archived_at")
    .eq("id", id)
    .eq("business_id", business.id)
    .maybeSingle();

  if (!client) {
    notFound();
  }

  const isArchived = Boolean(client.archived_at);

  const [documentsResult, visitsResult] = await Promise.all([
    supabase
      .from("documents")
      .select("*")
      .eq("client_id", client.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("visits")
      .select("id, appointments(start_time, end_time)")
      .eq("client_id", client.id),
  ]);

  const visits = (visitsResult.data ?? []) as Array<{
    id: string;
    appointments: { start_time: string; end_time: string } | null;
  }>;

  const visitLabelById = new Map(
    visits.map((visit) => {
      const appointment = visit.appointments;
      const label = appointment
        ? formatAppointmentTimeRange(
            appointment.start_time,
            appointment.end_time,
          )
        : "Visit";
      return [visit.id, label] as const;
    }),
  );

  const documents = (documentsResult.data ?? []) as Document[];
  const signedUrls = documentsResult.error
    ? new Map<string, string | null>()
    : await signDocumentPaths(supabase, documents);

  const documentItems: OwnerDocumentListItem[] = documents.map((document) => ({
    ...document,
    signedUrl: signedUrls.get(document.id) ?? null,
    visitLabel: document.visit_id
      ? (visitLabelById.get(document.visit_id) ?? "Linked visit")
      : null,
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href={`/clients/${client.id}`}
          className="text-sm text-zinc-600 hover:text-zinc-900 hover:underline"
        >
          ← Back to {client.full_name}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Documents</h1>
        <p className="mt-1 text-sm text-zinc-600">
          All files for {client.full_name}
        </p>
      </div>

      <ClientDocumentsSection
        clientId={client.id}
        documents={documentItems}
        canUpload={!isArchived}
        loadError={
          documentsResult.error
            ? "Could not load documents. Please try again."
            : null
        }
      />
    </div>
  );
}
