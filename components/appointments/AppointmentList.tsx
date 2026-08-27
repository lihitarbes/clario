import Link from "next/link";
import {
  appointmentStatusClassName,
  appointmentStatusLabel,
  formatAppointmentTimeRange,
} from "@/lib/appointments/display";
import type { AppointmentWithClient } from "@/actions/appointments";

type AppointmentListProps = {
  appointments: AppointmentWithClient[];
};

export function AppointmentList({ appointments }: AppointmentListProps) {
  if (appointments.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-200 bg-white px-4 py-8 text-center">
        <p className="text-sm text-zinc-600">
          No appointments this week. Create one to get started.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
      {appointments.map((appointment) => {
        const clientName =
          appointment.clients?.full_name ?? "Unknown client";

        return (
          <li key={appointment.id}>
            <Link
              href={`/calendar/${appointment.id}`}
              className="flex flex-col gap-2 px-4 py-4 transition-colors hover:bg-zinc-50 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-zinc-900">{clientName}</p>
                <p className="text-sm text-zinc-600">
                  {formatAppointmentTimeRange(
                    appointment.start_time,
                    appointment.end_time,
                  )}
                </p>
              </div>
              <span
                className={`w-fit rounded-full px-2 py-1 text-xs font-medium ${appointmentStatusClassName(appointment.status)}`}
              >
                {appointmentStatusLabel(appointment.status)}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
