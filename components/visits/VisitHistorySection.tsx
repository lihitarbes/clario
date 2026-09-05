import Link from "next/link";
import { formatAppointmentTimeRange } from "@/lib/appointments/display";
import {
  ownerVisitPublicationBadge,
  visitSummaryExcerpt,
} from "@/lib/visits/display";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { VisitPublicationScope } from "@/types/database";

type VisitHistoryItem = {
  id: string;
  summary: string | null;
  published_at: string | null;
  publication_scope: VisitPublicationScope;
  appointments: {
    start_time: string;
    end_time: string;
    status: string;
  } | null;
};

type VisitHistorySectionProps = {
  visits: VisitHistoryItem[];
};

export function VisitHistorySection({ visits }: VisitHistorySectionProps) {
  const completedVisits = visits.filter(
    (visit) => visit.appointments?.status === "completed",
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Visit history</CardTitle>
      </CardHeader>
      <CardContent>
        {completedVisits.length === 0 ? (
          <p className="text-sm text-zinc-600">
            No completed visits yet. Visit records are created when you mark an
            appointment as completed.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {completedVisits.map((visit) => {
              const appointment = visit.appointments;
              const dateLabel = appointment
                ? formatAppointmentTimeRange(
                    appointment.start_time,
                    appointment.end_time,
                  )
                : "—";
              const isPublished = visit.published_at !== null;
              const statusLabel = ownerVisitPublicationBadge(
                visit.published_at,
                visit.publication_scope,
              );

              return (
                <li
                  key={visit.id}
                  className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-zinc-900">
                        {dateLabel}
                      </p>
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-xs font-medium",
                          isPublished
                            ? "border-green-200 bg-green-100 text-green-800"
                            : "border-amber-200 bg-amber-100 text-amber-800",
                        )}
                      >
                        {statusLabel}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-600">
                      {visitSummaryExcerpt(visit.summary, 80)}
                    </p>
                  </div>
                  <Link
                    href={`/calendar/visits/${visit.id}`}
                    className="text-sm font-medium text-zinc-900 underline hover:text-zinc-700"
                  >
                    View record
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
