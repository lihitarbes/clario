import Link from "next/link";
import { notFound } from "next/navigation";
import { AppointmentForm } from "@/components/appointments/AppointmentForm";
import { AppointmentStatusActions } from "@/components/appointments/AppointmentStatusActions";
import { PendingAppointmentActions } from "@/components/appointments/PendingAppointmentActions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AppointmentWithClient } from "@/actions/appointments";
import {
  appointmentStatusClassName,
  appointmentStatusLabel,
  formatAppointmentTimeRange,
} from "@/lib/appointments/display";
import { getOwnedBusiness } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AppointmentDetailPage({
  params,
}: PageProps<"/calendar/[id]">) {
  const { id } = await params;
  const business = await getOwnedBusiness();

  if (!business) {
    notFound();
  }

  const supabase = await createClient();
  const { data: appointment } = await supabase
    .from("appointments")
    .select("*, clients(full_name, email)")
    .eq("id", id)
    .eq("business_id", business.id)
    .maybeSingle();

  if (!appointment) {
    notFound();
  }

  const typedAppointment = appointment as AppointmentWithClient;
  const clientName =
    typedAppointment.clients?.full_name ?? "Unknown client";
  const isScheduled = typedAppointment.status === "scheduled";
  const isPending = typedAppointment.status === "pending";
  const isCompleted = typedAppointment.status === "completed";

  const { data: visit } = isCompleted
    ? await supabase
        .from("visits")
        .select("id")
        .eq("appointment_id", typedAppointment.id)
        .maybeSingle()
    : { data: null };

  const { data: clients } = isScheduled
    ? await supabase
        .from("clients")
        .select("id, full_name")
        .eq("business_id", business.id)
        .is("archived_at", null)
        .order("full_name")
    : { data: [] };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/calendar"
          className="text-sm text-zinc-600 hover:text-zinc-900 hover:underline"
        >
          ← Back to calendar
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          {clientName}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span
            className={cn(
              "rounded-full border px-2 py-1 text-xs font-medium",
              appointmentStatusClassName(typedAppointment.status),
            )}
          >
            {appointmentStatusLabel(typedAppointment.status)}
          </span>
          <span className="text-zinc-600">
            {formatAppointmentTimeRange(
              typedAppointment.start_time,
              typedAppointment.end_time,
            )}
          </span>
        </div>
      </div>

      {isPending ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Appointment details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="font-medium text-zinc-900">Client</p>
                <p className="text-zinc-600">{clientName}</p>
                {typedAppointment.clients?.email ? (
                  <p className="text-zinc-500">
                    {typedAppointment.clients.email}
                  </p>
                ) : null}
              </div>
              {typedAppointment.notes ? (
                <div>
                  <p className="font-medium text-zinc-900">Notes</p>
                  <p className="whitespace-pre-wrap text-zinc-600">
                    {typedAppointment.notes}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>
          <PendingAppointmentActions appointmentId={typedAppointment.id} />
        </>
      ) : null}

      {isScheduled ? (
        <AppointmentForm
          mode="edit"
          clients={clients ?? []}
          defaultDurationMinutes={
            business.default_appointment_duration_minutes
          }
          appointment={typedAppointment}
        />
      ) : null}

      <AppointmentStatusActions
        appointmentId={typedAppointment.id}
        isScheduled={isScheduled}
      />

      {!isPending && !isScheduled ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Appointment details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="font-medium text-zinc-900">Client</p>
                <p className="text-zinc-600">{clientName}</p>
                {typedAppointment.clients?.email ? (
                  <p className="text-zinc-500">{typedAppointment.clients.email}</p>
                ) : null}
              </div>
              {typedAppointment.notes ? (
                <div>
                  <p className="font-medium text-zinc-900">Notes</p>
                  <p className="whitespace-pre-wrap text-zinc-600">
                    {typedAppointment.notes}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {isCompleted && visit ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Visit record</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-zinc-600">
                  This appointment has a completed visit record with summary,
                  follow-up, and recommendations.
                </p>
                <Button asChild className="mt-3">
                  <Link href={`/calendar/visits/${visit.id}`}>
                    View visit record
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
