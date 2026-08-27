import Link from "next/link";
import { Suspense } from "react";
import { AvailabilitySettings } from "@/components/availability/AvailabilitySettings";
import { AppointmentList } from "@/components/appointments/AppointmentList";
import { WeekNavigator } from "@/components/appointments/WeekNavigator";
import { getOwnedBusiness } from "@/lib/auth/permissions";
import type { AppointmentWithClient } from "@/actions/appointments";
import {
  formatWeekParam,
  getWeekEnd,
  getWeekStart,
  parseWeekParam,
} from "@/lib/appointments/time";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function CalendarPage({
  searchParams,
}: PageProps<"/calendar">) {
  const { week } = await searchParams;
  const business = await getOwnedBusiness();

  if (!business) {
    return null;
  }

  const weekReference = parseWeekParam(typeof week === "string" ? week : undefined);
  const weekStart = getWeekStart(weekReference ?? new Date());
  const weekEnd = getWeekEnd(weekStart);

  const supabase = await createClient();

  const [availabilityResult, appointmentsResult] = await Promise.all([
    supabase
      .from("business_availability")
      .select("*")
      .eq("business_id", business.id)
      .order("day_of_week")
      .order("start_time"),
    supabase
      .from("appointments")
      .select("*, clients(full_name, email)")
      .eq("business_id", business.id)
      .gte("start_time", weekStart.toISOString())
      .lt("start_time", weekEnd.toISOString())
      .order("start_time"),
  ]);

  const availability = availabilityResult.data ?? [];
  const appointments = (appointmentsResult.data ??
    []) as AppointmentWithClient[];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Calendar</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Manage appointments and weekly availability for {business.name}.
          </p>
        </div>
        <Button asChild>
          <Link href="/calendar/new">New appointment</Link>
        </Button>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-zinc-900">Appointments</h2>
        <Suspense fallback={null}>
          <WeekNavigator weekStart={formatWeekParam(weekStart)} />
        </Suspense>
        <AppointmentList appointments={appointments} />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-zinc-900">Availability</h2>
        <AvailabilitySettings slots={availability} />
      </section>
    </div>
  );
}
