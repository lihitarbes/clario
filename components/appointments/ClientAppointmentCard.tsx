import {
  appointmentStatusClassName,
  appointmentStatusLabel,
  formatAppointmentTimeRange,
} from "@/lib/appointments/display";
import type { AppointmentWithBusiness } from "@/actions/appointments";
import { ClientCancelAppointmentButton } from "@/components/appointments/ClientCancelAppointmentButton";
import { cn } from "@/lib/utils";

type ClientAppointmentCardProps = {
  appointment: AppointmentWithBusiness;
  showBusinessName: boolean;
};

function canClientCancel(appointment: AppointmentWithBusiness): boolean {
  if (
    appointment.status !== "pending" &&
    appointment.status !== "scheduled"
  ) {
    return false;
  }
  return new Date(appointment.start_time).getTime() > Date.now();
}

export function ClientAppointmentCard({
  appointment,
  showBusinessName,
}: ClientAppointmentCardProps) {
  const businessName = appointment.businesses?.name ?? "Business";

  return (
    <li className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          {showBusinessName ? (
            <p className="text-sm font-medium text-zinc-900">{businessName}</p>
          ) : null}
          <p className="text-sm text-zinc-600">
            {formatAppointmentTimeRange(
              appointment.start_time,
              appointment.end_time,
            )}
          </p>
          <span
            className={cn(
              "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
              appointmentStatusClassName(appointment.status),
            )}
          >
            {appointmentStatusLabel(appointment.status)}
          </span>
        </div>

        {canClientCancel(appointment) ? (
          <ClientCancelAppointmentButton appointmentId={appointment.id} />
        ) : null}
      </div>
    </li>
  );
}
