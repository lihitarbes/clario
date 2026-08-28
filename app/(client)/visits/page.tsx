import Link from "next/link";
import type { ClientVisit } from "@/types/database";
import { ClientVisitCard } from "@/components/visits/ClientVisitCard";
import {
  buildClientVisitListItems,
  type ClientVisitAppointmentMeta,
} from "@/lib/visits/client-queries";
import { getLinkedClients } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ClientVisitsPage() {
  const linkedClients = await getLinkedClients();
  const clientIds = linkedClients.map((client) => client.id);
  const showBusinessName = linkedClients.length > 1;

  const supabase = await createClient();

  let visits: ClientVisit[] = [];

  if (clientIds.length > 0) {
    const { data } = await supabase
      .from("client_visits")
      .select("*")
      .in("client_id", clientIds)
      .order("created_at", { ascending: false });

    visits = (data ?? []) as ClientVisit[];
  }

  const appointmentIds = visits.map((visit) => visit.appointment_id);
  let appointments: ClientVisitAppointmentMeta[] = [];

  if (appointmentIds.length > 0) {
    const { data } = await supabase
      .from("appointments")
      .select("id, start_time, end_time, business_id, businesses(name)")
      .in("id", appointmentIds);

    appointments = (data ?? []) as ClientVisitAppointmentMeta[];
  }

  const visitItems = buildClientVisitListItems(visits, appointments);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">My visits</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Completed visit records from your care providers, including summaries
          and recommendations.
        </p>
      </div>

      {clientIds.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-200 bg-white px-4 py-8 text-center">
          <p className="text-sm text-zinc-600">
            You are not linked to any business yet. Once a business completes a
            visit for you, it will appear here.
          </p>
        </div>
      ) : visitItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-200 bg-white px-4 py-8 text-center">
          <p className="text-sm text-zinc-600">
            No visit records yet. Completed visits from your providers will show
            up here.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visitItems.map((visit) => (
            <ClientVisitCard
              key={visit.id}
              visit={visit}
              showBusinessName={showBusinessName}
            />
          ))}
        </ul>
      )}

      <p className="text-sm text-zinc-500">
        <Link href="/appointments" className="underline hover:text-zinc-700">
          View appointments
        </Link>
      </p>
    </div>
  );
}
