import Link from "next/link";
import { AppointmentForm } from "@/components/appointments/AppointmentForm";
import { getOwnedBusiness } from "@/lib/auth/permissions";
import { formatDateTimeLocal } from "@/lib/appointments/time";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function defaultStartTimeLocal(dateParam?: string): string {
  if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    const start = new Date(`${dateParam}T09:00:00`);
    if (!Number.isNaN(start.getTime())) {
      return formatDateTimeLocal(start);
    }
  }

  const now = new Date();
  now.setSeconds(0, 0);
  const remainder = now.getMinutes() % 15;
  if (remainder !== 0) {
    now.setMinutes(now.getMinutes() + (15 - remainder));
  }
  if (now.getTime() <= Date.now()) {
    now.setMinutes(now.getMinutes() + 15);
  }
  return formatDateTimeLocal(now);
}

export default async function NewAppointmentPage({
  searchParams,
}: PageProps<"/calendar/new">) {
  const { date } = await searchParams;
  const business = await getOwnedBusiness();

  if (!business) {
    return null;
  }

  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("id, full_name")
    .eq("business_id", business.id)
    .is("archived_at", null)
    .order("full_name");

  const dateParam = typeof date === "string" ? date : undefined;

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
          New appointment
        </h1>
      </div>

      <AppointmentForm
        mode="create"
        clients={clients ?? []}
        defaultDurationMinutes={
          business.default_appointment_duration_minutes
        }
        defaultStartTimeLocal={defaultStartTimeLocal(dateParam)}
      />
    </div>
  );
}
