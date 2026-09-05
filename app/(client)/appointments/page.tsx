import Link from "next/link";
import type { AppointmentWithBusiness } from "@/actions/appointments";
import { ClientAppointmentCard } from "@/components/appointments/ClientAppointmentCard";
import { PreviousAppointmentsSection } from "@/components/appointments/PreviousAppointmentsSection";
import { Button } from "@/components/ui/button";
import { getLinkedClients } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ClientAppointmentsPage() {
  const linkedClients = await getLinkedClients();
  const clientIds = linkedClients.map((client) => client.id);
  const showBusinessName = linkedClients.length > 1;

  const supabase = await createClient();

  let appointments: AppointmentWithBusiness[] = [];

  if (clientIds.length > 0) {
    const { data } = await supabase
      .from("appointments")
      .select("*, businesses(id, name)")
      .in("client_id", clientIds)
      .order("start_time", { ascending: true });

    appointments = (data ?? []) as AppointmentWithBusiness[];
  }

  const now = new Date();
  const upcoming = appointments.filter(
    (appointment) =>
      new Date(appointment.start_time).getTime() >= now.getTime() &&
      (appointment.status === "pending" || appointment.status === "scheduled"),
  );
  const previous = appointments
    .filter((appointment) => !upcoming.includes(appointment))
    .sort(
      (a, b) =>
        new Date(b.start_time).getTime() - new Date(a.start_time).getTime(),
    );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            My appointments
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            View upcoming appointments. Requests need business approval.
          </p>
        </div>
        <Button asChild>
          <Link href="/appointments/book">Book appointment</Link>
        </Button>
      </div>

      {clientIds.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-200 bg-white px-4 py-8 text-center">
          <p className="text-sm text-zinc-600">
            You are not linked to any business yet. Once a business adds you as
            a client with your email, your appointments will appear here.
          </p>
        </div>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-medium text-zinc-900">Upcoming</h2>
            {upcoming.length === 0 ? (
              <p className="text-sm text-zinc-600">
                No upcoming appointments.{" "}
                <Link
                  href="/appointments/book"
                  className="font-medium text-zinc-900 underline"
                >
                  Book one
                </Link>
                .
              </p>
            ) : (
              <ul className="space-y-3">
                {upcoming.map((appointment) => (
                  <ClientAppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    showBusinessName={showBusinessName}
                  />
                ))}
              </ul>
            )}
          </section>

          <PreviousAppointmentsSection
            appointments={previous}
            showBusinessName={showBusinessName}
          />
        </>
      )}
    </div>
  );
}
