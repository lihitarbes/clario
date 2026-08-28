import Link from "next/link";
import { notFound } from "next/navigation";
import { RecommendationsSection } from "@/components/visits/RecommendationsSection";
import { VisitPublicationBanner } from "@/components/visits/VisitPublicationBanner";
import { VisitEditor } from "@/components/visits/VisitEditor";
import type { VisitRecommendationWithProduct } from "@/actions/visits";
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
import { createClient } from "@/lib/supabase/server";
import type { VisitWithDetails } from "@/actions/visits";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

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
      "*, appointments(id, start_time, end_time, status, business_id), clients(full_name, email)",
    )
    .eq("id", visitId)
    .maybeSingle();

  if (!visit) {
    notFound();
  }

  const typedVisit = visit as VisitWithDetails;
  const clientName = typedVisit.clients?.full_name ?? "Unknown client";
  const appointment = typedVisit.appointments;
  const appointmentLabel = appointment
    ? formatAppointmentTimeRange(
        appointment.start_time,
        appointment.end_time,
      )
    : "—";

  const { data: recommendations } = await supabase
    .from("visit_recommendations")
    .select("*, products(id, name)")
    .eq("visit_id", visitId)
    .order("created_at", { ascending: true });

  const { data: products } = await supabase
    .from("products")
    .select("id, name")
    .eq("business_id", business.id)
    .eq("is_active", true)
    .order("name");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/calendar"
          className="text-sm text-zinc-600 hover:text-zinc-900 hover:underline"
        >
          ← Back to calendar
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
          <CardTitle className="text-base">Visit information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="font-medium text-zinc-900">Client</p>
            <p className="text-zinc-600">{clientName}</p>
            {typedVisit.clients?.email ? (
              <p className="text-zinc-500">{typedVisit.clients.email}</p>
            ) : null}
          </div>
          <div>
            <p className="font-medium text-zinc-900">Appointment</p>
            <p className="text-zinc-600">{appointmentLabel}</p>
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

      <VisitEditor visit={typedVisit} />

      <RecommendationsSection
        visitId={typedVisit.id}
        recommendations={
          (recommendations ?? []) as VisitRecommendationWithProduct[]
        }
        products={products ?? []}
      />
    </div>
  );
}
