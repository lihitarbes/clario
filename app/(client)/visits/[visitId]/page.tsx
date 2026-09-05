import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ClientVisitDocumentsSection,
  type ClientVisitDocumentItem,
} from "@/components/documents/ClientVisitDocumentsSection";
import {
  ClientRecommendationList,
  type ClientRecommendationProduct,
} from "@/components/visits/ClientRecommendationList";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MarkVisitNotificationRead } from "@/components/visits/MarkVisitNotificationRead";
import { formatAppointmentTimeRange } from "@/lib/appointments/display";
import { signDocumentPaths } from "@/lib/documents/storage";
import { isFullClientPublication } from "@/lib/visits/display";
import { createClient } from "@/lib/supabase/server";
import type {
  ClientVisit,
  Document,
  VisitRecommendation,
} from "@/types/database";

export const dynamic = "force-dynamic";

export default async function ClientVisitDetailPage({
  params,
}: PageProps<"/visits/[visitId]">) {
  const { visitId } = await params;
  const supabase = await createClient();

  // Published visits only — draft visits are not exposed via client_visits.
  const { data: visit } = await supabase
    .from("client_visits")
    .select("*")
    .eq("id", visitId)
    .maybeSingle();

  if (!visit) {
    notFound();
  }

  const typedVisit = visit as ClientVisit;
  const showFullVisit = isFullClientPublication(typedVisit.publication_scope);

  const [appointmentResult, recommendationsResult, documentsResult] =
    await Promise.all([
      supabase
        .from("appointments")
        .select("start_time, end_time, businesses(name)")
        .eq("id", typedVisit.appointment_id)
        .maybeSingle(),
      supabase
        .from("visit_recommendations")
        .select("*, products(id, name, is_active)")
        .eq("visit_id", visitId)
        .order("created_at", { ascending: true }),
      supabase
        .from("documents")
        .select("id, type, file_name, file_path, created_at, mime_type")
        .eq("visit_id", visitId)
        .eq("client_id", typedVisit.client_id)
        .order("created_at", { ascending: false }),
    ]);

  const appointment = appointmentResult.data as {
    start_time: string;
    end_time: string;
    businesses: { name: string } | null;
  } | null;

  const businessName = appointment?.businesses?.name ?? "Business";
  const appointmentLabel = appointment
    ? formatAppointmentTimeRange(
        appointment.start_time,
        appointment.end_time,
      )
    : "—";

  const documents = (documentsResult.data ?? []) as Pick<
    Document,
    "id" | "type" | "file_name" | "file_path" | "created_at" | "mime_type"
  >[];

  const signedUrls = documentsResult.error
    ? new Map<string, string | null>()
    : await signDocumentPaths(supabase, documents);

  const documentItems: ClientVisitDocumentItem[] = documents.map(
    (document) => ({
      id: document.id,
      type: document.type,
      file_name: document.file_name,
      created_at: document.created_at,
      signedUrl: signedUrls.get(document.id) ?? null,
    }),
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <MarkVisitNotificationRead visitId={typedVisit.id} />
      <div>
        <Link
          href="/visits"
          className="text-sm text-zinc-600 hover:text-zinc-900 hover:underline"
        >
          ← Back to visits
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          Visit record
        </h1>
        <div className="mt-2 space-y-1 text-sm text-zinc-600">
          <p>{businessName}</p>
          <p>{appointmentLabel}</p>
        </div>
      </div>

      {showFullVisit ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Visit summary</CardTitle>
            </CardHeader>
            <CardContent>
              {typedVisit.summary ? (
                <p className="whitespace-pre-wrap text-sm text-zinc-700">
                  {typedVisit.summary}
                </p>
              ) : (
                <p className="text-sm text-zinc-600">
                  No summary was recorded for this visit.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Follow-up</CardTitle>
            </CardHeader>
            <CardContent>
              {typedVisit.follow_up ? (
                <p className="whitespace-pre-wrap text-sm text-zinc-700">
                  {typedVisit.follow_up}
                </p>
              ) : (
                <p className="text-sm text-zinc-600">
                  No follow-up instructions for this visit.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {showFullVisit
              ? "Recommendations"
              : "Recommendations from this visit"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ClientRecommendationList
            recommendations={(recommendationsResult.data ?? []) as Array<
              VisitRecommendation & { products: ClientRecommendationProduct }
            >}
          />
        </CardContent>
      </Card>

      <ClientVisitDocumentsSection
        visitId={typedVisit.id}
        documents={documentItems}
      />
    </div>
  );
}
