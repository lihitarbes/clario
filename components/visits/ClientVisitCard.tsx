import Link from "next/link";
import { formatAppointmentTimeRange } from "@/lib/appointments/display";
import { clientVisitListExcerpt } from "@/lib/visits/display";
import type { ClientVisitListItem } from "@/lib/visits/client-queries";

type ClientVisitCardProps = {
  visit: ClientVisitListItem;
  showBusinessName: boolean;
};

export function ClientVisitCard({
  visit,
  showBusinessName,
}: ClientVisitCardProps) {
  const appointment = visit.appointment;
  const businessName = appointment?.businesses?.name ?? "Business";
  const timeLabel = appointment
    ? formatAppointmentTimeRange(
        appointment.start_time,
        appointment.end_time,
      )
    : "Visit date unavailable";

  return (
    <li className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          {showBusinessName ? (
            <p className="text-sm font-medium text-zinc-900">{businessName}</p>
          ) : null}
          <p className="text-sm text-zinc-600">{timeLabel}</p>
          <p className="text-sm text-zinc-700">
            {clientVisitListExcerpt(visit.publication_scope, visit.summary)}
          </p>
        </div>

        <Link
          href={`/visits/${visit.id}`}
          className="text-sm font-medium text-zinc-900 underline hover:text-zinc-700"
        >
          View details
        </Link>
      </div>
    </li>
  );
}
