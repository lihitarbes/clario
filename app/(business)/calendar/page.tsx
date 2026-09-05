import Link from "next/link";
import { Suspense } from "react";
import { CollapsibleAvailabilityEditor } from "@/components/availability/CollapsibleAvailabilityEditor";
import { AppointmentCalendar } from "@/components/appointments/AppointmentCalendar";
import { PendingAppointmentRequests } from "@/components/appointments/PendingAppointmentRequests";
import { WeekNavigator } from "@/components/appointments/WeekNavigator";
import { getOwnedBusiness } from "@/lib/auth/permissions";
import type { AppointmentWithClient } from "@/actions/appointments";
import {
  formatWeekParam,
  getWeekEnd,
  getWeekStart,
  parseWeekParam,
  resolveWeekSearchParam,
} from "@/lib/appointments/time";
import { normalizeAvailabilityDateKey } from "@/lib/appointments/slots";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import type { BusinessAvailability } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function CalendarPage({
  searchParams,
}: PageProps<"/calendar">) {
  const params = await searchParams;
  const week = resolveWeekSearchParam(params.week);
  const business = await getOwnedBusiness();

  if (!business) {
    return null;
  }

  const weekReference = parseWeekParam(week);
  const weekStart = getWeekStart(weekReference ?? new Date());
  const weekEnd = getWeekEnd(weekStart);

  const supabase = await createClient();

  const [availabilityResult, appointmentsResult, pendingResult] =
    await Promise.all([
      supabase
        .from("business_availability")
        .select("*")
        .eq("business_id", business.id)
        .order("start_time"),
      supabase
        .from("appointments")
        .select("*, clients(full_name, email)")
        .eq("business_id", business.id)
        .gte("start_time", weekStart.toISOString())
        .lt("start_time", weekEnd.toISOString())
        .order("start_time"),
      supabase
        .from("appointments")
        .select("*, clients(full_name, email)")
        .eq("business_id", business.id)
        .eq("status", "pending")
        .order("start_time"),
    ]);

  const availability = ((availabilityResult.data ?? []) as BusinessAvailability[]).map(
    (row) => ({
      ...row,
      specific_date: normalizeAvailabilityDateKey(row.specific_date),
    }),
  );
  const appointments = (appointmentsResult.data ??
    []) as AppointmentWithClient[];
  const pendingAppointments = (pendingResult.data ??
    []) as AppointmentWithClient[];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Calendar</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Manage appointments and bookable slots for {business.name}.
          </p>
        </div>
        <Button asChild>
          <Link href="/calendar/new">New appointment</Link>
        </Button>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-zinc-900">Pending requests</h2>
        <p className="text-sm text-zinc-600">
          Review and approve client appointment requests. Pending times remain
          blocked until approved or declined.
        </p>
        <PendingAppointmentRequests appointments={pendingAppointments} />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-zinc-900">Schedule</h2>
        <Suspense fallback={null}>
          <WeekNavigator weekStart={formatWeekParam(weekStart)} />
        </Suspense>
        <AppointmentCalendar
          weekStart={formatWeekParam(weekStart)}
          appointments={appointments}
          availability={availability}
        />
      </section>

      <CollapsibleAvailabilityEditor slots={availability} />
    </div>
  );
}
