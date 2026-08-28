import Link from "next/link";
import type { AppointmentWithClient } from "@/actions/appointments";
import { PendingAppointmentRowActions } from "@/components/appointments/PendingAppointmentRowActions";
import { formatAppointmentTimeRange } from "@/lib/appointments/display";

type PendingAppointmentRequestsProps = {
  appointments: AppointmentWithClient[];
};

export function PendingAppointmentRequests({
  appointments,
}: PendingAppointmentRequestsProps) {
  if (appointments.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-200 bg-white px-4 py-6 text-center">
        <p className="text-sm text-zinc-600">No pending appointment requests.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
      {appointments.map((appointment) => {
        const clientName =
          appointment.clients?.full_name ?? "Unknown client";

        return (
          <li
            key={appointment.id}
            className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 space-y-1">
              <p className="font-medium text-zinc-900">
                <Link
                  href={`/calendar/${appointment.id}`}
                  className="hover:underline"
                >
                  {clientName}
                </Link>
              </p>
              <p className="text-sm text-zinc-600">
                {formatAppointmentTimeRange(
                  appointment.start_time,
                  appointment.end_time,
                )}
              </p>
            </div>
            <PendingAppointmentRowActions appointmentId={appointment.id} />
          </li>
        );
      })}
    </ul>
  );
}
