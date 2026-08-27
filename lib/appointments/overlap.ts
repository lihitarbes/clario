import type { SupabaseClient } from "@supabase/supabase-js";
import type { BusinessAvailability, Database } from "@/types/database";
import { timeRangesOverlap } from "@/lib/appointments/time";

type AppSupabaseClient = SupabaseClient<Database>;

/** Returns true if a new availability range overlaps existing ranges on the same day. */
export function availabilityRangesOverlap(
  existing: Pick<BusinessAvailability, "id" | "day_of_week" | "start_time" | "end_time">[],
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  excludeId?: string,
): boolean {
  return existing.some((row) => {
    if (row.day_of_week !== dayOfWeek) {
      return false;
    }
    if (excludeId && row.id === excludeId) {
      return false;
    }
    return timeRangesOverlap(row.start_time, row.end_time, startTime, endTime);
  });
}

/** Server-side check for overlapping scheduled appointments in the same business. */
export async function hasScheduledAppointmentOverlap(
  supabase: AppSupabaseClient,
  businessId: string,
  startTimeIso: string,
  endTimeIso: string,
  excludeAppointmentId?: string,
): Promise<boolean> {
  let query = supabase
    .from("appointments")
    .select("id")
    .eq("business_id", businessId)
    .eq("status", "scheduled")
    .lt("start_time", endTimeIso)
    .gt("end_time", startTimeIso);

  if (excludeAppointmentId) {
    query = query.neq("id", excludeAppointmentId);
  }

  const { data, error } = await query.limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return (data?.length ?? 0) > 0;
}
