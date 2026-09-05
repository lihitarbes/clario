import Link from "next/link";
import { notFound } from "next/navigation";
import { VisitDocumentsSection } from "@/components/documents/VisitDocumentsSection";
import type { OwnerDocumentListItem } from "@/components/documents/OwnerDocumentList";
import { RecommendationsSection } from "@/components/visits/RecommendationsSection";
import { VisitPublicationBanner } from "@/components/visits/VisitPublicationBanner";
import { VisitRecord } from "@/components/visits/VisitRecord";
import type {
  VisitRecommendationWithProduct,
  VisitWithDetails,
} from "@/actions/visits";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  formatAppointmentTimeRange,
} from "@/lib/appointments/display";
import { getOwnedBusiness } from "@/lib/auth/permissions";
import { signDocumentPaths } from "@/lib/documents/storage";
import { ownerVisitPublicationBadge } from "@/lib/visits/display";
import { createClient } from "@/lib/supabase/server";
import type { Document } from "@/types/database";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type VisitPageDetails = VisitWithDetails & {
  clients: {
    full_name: string | null;
    email: string | null;
    archived_at: string | null;
  } | null;
};

export default async function OwnerVisitDetailPage({
  params,
}: PageProps<"/calendar/visits/[visitId]">) {
  const { visitId } = await params;
  const business = await getOwnedBusiness();

  if (!business) {
    notFound();
  }

  const supabase = await createClient();
  const { data: visit } = await supabase
    .from("visits")
    .select(
      "*, appointments(id, start_time, end_time, status, business_id), clients(full_name, email, archived_at)",
    )
    .eq("id", visitId)
    .maybeSingle();

  if (!visit) {
    notFound();
  }

  const typedVisit = visit as VisitPageDetails;
  const clientName = typedVisit.clients?.full_name ?? "Unknown client";
  const clientArchived = Boolean(typedVisit.clients?.archived_at);
  const appointment = typedVisit.appointments;
  const appointmentLabel = appointment
    ? formatAppointmentTimeRange(
        appointment.start_time,
        appointment.end_time,
      )
    : "—";

  const publicationLabel = ownerVisitPublicationBadge(
    typedVisit.published_at,
    typedVisit.publication_scope,
  );

  const [
    recommendationsResult,
    activeProductsResult,
    documentsResult,
  ] = await Promise.all([
    supabase
      .from("visit_recommendations")
      .select("*, products(id, name, is_active)")
      .eq("visit_id", visitId)
      .order("created_at", { ascending: true }),
    supabase
      .from("products")
      .select("id, name, is_active")
      .eq("business_id", business.id)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("documents")
      .select("*")
      .eq("visit_id", visitId)
      .eq("client_id", typedVisit.client_id)
      .order("created_at", { ascending: false }),
  ]);

  const typedRecommendations =
    (recommendationsResult.data ?? []) as VisitRecommendationWithProduct[];

  const activeProducts = activeProductsResult.data ?? [];
  const activeIds = new Set(activeProducts.map((product) => product.id));
  const linkedInactiveIds = [
    ...new Set(
      typedRecommendations
        .map((recommendation) => recommendation.product_id)
        .filter((productId): productId is string => Boolean(productId))
        .filter((productId) => !activeIds.has(productId)),
    ),
  ];

  const { data: linkedInactiveProducts } =
    linkedInactiveIds.length > 0
      ? await supabase
          .from("products")
          .select("id, name, is_active")
          .eq("business_id", business.id)
          .in("id", linkedInactiveIds)
          .order("name")
      : { data: [] as Array<{ id: string; name: string; is_active: boolean }> };

  const products = [...activeProducts, ...(linkedInactiveProducts ?? [])];

  const documents = (documentsResult.data ?? []) as Document[];
  const signedUrls = documentsResult.error
    ? new Map<string, string | null>()
    : await signDocumentPaths(supabase, documents);

  const documentItems: OwnerDocumentListItem[] = documents.map((document) => ({
    ...document,
    signedUrl: signedUrls.get(document.id) ?? null,
    visitLabel: null,
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Link
          href={`/clients/${typedVisit.client_id}`}
          className="text-sm text-zinc-600 hover:text-zinc-900 hover:underline"
        >
          ← Back to client
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">
              {clientName}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span
                className={cn(
                  "rounded-full border px-2 py-1 text-xs font-medium",
                  "bg-green-100 text-green-800 border-green-200",
                )}
              >
                Completed visit
              </span>
              <span className="text-zinc-600">{appointmentLabel}</span>
            </div>
            <p className="mt-1 text-sm text-zinc-500">{business.name}</p>
          </div>

          {appointment ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/calendar/${appointment.id}`}>
                Related appointment
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <VisitPublicationBanner
        key={`${typedVisit.published_at ?? "draft"}-${typedVisit.publication_scope}`}
        visit={typedVisit}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Visit details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="font-medium text-zinc-900">Client</p>
            <p className="text-zinc-600">{clientName}</p>
            {typedVisit.clients?.email ? (
              <p className="text-zinc-500">{typedVisit.clients.email}</p>
            ) : null}
            <Link
              href={`/clients/${typedVisit.client_id}`}
              className="mt-1 inline-block text-zinc-600 underline hover:text-zinc-900"
            >
              View client profile
            </Link>
          </div>
          <div>
            <p className="font-medium text-zinc-900">Appointment</p>
            <p className="text-zinc-600">{appointmentLabel}</p>
          </div>
          <div>
            <p className="font-medium text-zinc-900">Sharing</p>
            <p className="text-zinc-600">{publicationLabel}</p>
          </div>
          {appointment ? (
            <div>
              <p className="font-medium text-zinc-900">Related appointment</p>
              <Link
                href={`/calendar/${appointment.id}`}
                className="text-zinc-600 underline hover:text-zinc-900"
              >
                View appointment details
              </Link>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <VisitRecord visit={typedVisit} />

      <VisitDocumentsSection
        clientId={typedVisit.client_id}
        visitId={typedVisit.id}
        documents={documentItems}
        canUpload={!clientArchived}
        loadError={
          documentsResult.error
            ? "Could not load documents. Please try again."
            : null
        }
      />

      <RecommendationsSection
        visitId={typedVisit.id}
        recommendations={typedRecommendations}
        products={products}
      />
    </div>
  );
}
