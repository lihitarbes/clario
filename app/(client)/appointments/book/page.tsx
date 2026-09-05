import Link from "next/link";
import {
  BookingWizard,
  type BookingBusinessOption,
} from "@/components/appointments/BookingWizard";
import { BLOCKING_APPOINTMENT_STATUSES } from "@/lib/appointments/overlap";
import { getLinkedClients } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import type { Business } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function BookAppointmentPage() {
  const linkedClients = await getLinkedClients();
  const supabase = await createClient();

  const businessIds = [...new Set(linkedClients.map((c) => c.business_id))];

  const businessesById = new Map<string, Business>();
  if (businessIds.length > 0) {
    const { data: businesses } = await supabase
      .from("businesses")
      .select("*")
      .in("id", businessIds);

    for (const business of businesses ?? []) {
      businessesById.set(business.id, business);
    }
  }

  const { data: availabilityRows } =
    businessIds.length > 0
      ? await supabase
          .from("business_availability")
          .select(
            "id, business_id, day_of_week, specific_date, start_time, end_time",
          )
          .in("business_id", businessIds)
      : { data: [] };

  const availabilityByBusiness = new Map<
    string,
    {
      id: string;
      day_of_week: number | null;
      specific_date: string | null;
      start_time: string;
      end_time: string;
    }[]
  >();
  for (const row of availabilityRows ?? []) {
    const list = availabilityByBusiness.get(row.business_id) ?? [];
    list.push({
      id: row.id,
      day_of_week: row.day_of_week,
      specific_date: row.specific_date,
      start_time: row.start_time,
      end_time: row.end_time,
    });
    availabilityByBusiness.set(row.business_id, list);
  }

  const horizonStart = new Date();
  horizonStart.setHours(0, 0, 0, 0);
  const horizonEnd = new Date(horizonStart);
  horizonEnd.setDate(horizonEnd.getDate() + 15);

  const { data: blockingRows } =
    businessIds.length > 0
      ? await supabase
          .from("appointments")
          .select("business_id, start_time, end_time")
          .in("business_id", businessIds)
          .in("status", [...BLOCKING_APPOINTMENT_STATUSES])
          .lt("start_time", horizonEnd.toISOString())
          .gt("end_time", horizonStart.toISOString())
      : { data: [] };

  const bookingBusinesses: BookingBusinessOption[] = linkedClients
    .map((client) => {
      const business = businessesById.get(client.business_id);
      if (!business) {
        return null;
      }
      return {
        clientId: client.id,
        businessId: business.id,
        businessName: business.name,
        availability: availabilityByBusiness.get(business.id) ?? [],
      };
    })
    .filter((item): item is BookingBusinessOption => item !== null);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/appointments"
          className="text-sm text-zinc-600 hover:text-zinc-900 hover:underline"
        >
          ← Back to appointments
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          Book appointment
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Choose a date and an open appointment slot. Your request will wait
          for business approval.
        </p>
      </div>

      <BookingWizard
        businesses={bookingBusinesses}
        blocking={blockingRows ?? []}
      />
    </div>
  );
}
