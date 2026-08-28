import type { SupabaseClient } from "@supabase/supabase-js";
import type { BusinessAvailability, Database } from "@/types/database";
import { timeRangesOverlap } from "@/lib/appointments/time";

type AppSupabaseClient = SupabaseClient<Database>;

/** Statuses that reserve a calendar slot (business-wide). */
export const BLOCKING_APPOINTMENT_STATUSES = [
  "pending",
  "scheduled",
  "completed",
] as const;

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

/**
 * Server-side check for overlapping blocking appointments
 * (pending, scheduled, completed) in the same business.
 */
export async function hasBlockingAppointmentOverlap(
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
    .in("status", [...BLOCKING_APPOINTMENT_STATUSES])
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

/** @deprecated Use hasBlockingAppointmentOverlap — kept as alias during M5. */
export const hasScheduledAppointmentOverlap = hasBlockingAppointmentOverlap;
