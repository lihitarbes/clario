import Link from "next/link";
import {
  clientVisitListExcerpt,
} from "@/lib/visits/display";
import { formatAppointmentTimeRange } from "@/lib/appointments/display";
import type { ClientVisitListItem } from "@/lib/visits/client-queries";
import { cn } from "@/lib/utils";

type ClientVisitCardProps = {
  visit: ClientVisitListItem;
  showBusinessName: boolean;
  unread?: boolean;
};

export function ClientVisitCard({
  visit,
  showBusinessName,
  unread = false,
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
    <li
      className={cn(
        "rounded-lg border bg-white p-4",
        unread ? "border-blue-200" : "border-zinc-200",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            {showBusinessName ? (
              <p className="text-sm font-medium text-zinc-900">{businessName}</p>
            ) : null}
            {unread ? (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-800">
                New
              </span>
            ) : null}
          </div>
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
