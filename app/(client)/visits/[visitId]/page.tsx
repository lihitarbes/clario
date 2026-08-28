import Link from "next/link";
import { notFound } from "next/navigation";
import { ClientRecommendationList } from "@/components/visits/ClientRecommendationList";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatAppointmentTimeRange } from "@/lib/appointments/display";
import { isFullClientPublication } from "@/lib/visits/display";
import { createClient } from "@/lib/supabase/server";
import type { ClientVisit, VisitRecommendation } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function ClientVisitDetailPage({
  params,
}: PageProps<"/visits/[visitId]">) {
  const { visitId } = await params;
  const supabase = await createClient();

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

  const { data: appointmentRaw } = await supabase
    .from("appointments")
    .select("start_time, end_time, businesses(name)")
    .eq("id", typedVisit.appointment_id)
    .maybeSingle();

  const appointment = appointmentRaw as {
    start_time: string;
    end_time: string;
    businesses: { name: string } | null;
  } | null;

  const { data: recommendations } = await supabase
    .from("visit_recommendations")
    .select("*, products(name)")
    .eq("visit_id", visitId)
    .order("created_at", { ascending: true });

  const businessName = appointment?.businesses?.name ?? "Business";
  const appointmentLabel = appointment
    ? formatAppointmentTimeRange(
        appointment.start_time,
        appointment.end_time,
      )
    : "—";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
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

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-zinc-900">
          {showFullVisit
            ? "Recommendations"
            : "Recommendations from this visit"}
        </h2>
        <ClientRecommendationList
          recommendations={(recommendations ?? []) as Array<
            VisitRecommendation & { products: { name: string } | null }
          >}
        />
      </section>
    </div>
  );
}
