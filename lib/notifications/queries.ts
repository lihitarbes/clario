import type { SupabaseClient } from "@supabase/supabase-js";
import type { Appointment, Database, Notification } from "@/types/database";

const RECENT_NOTIFICATION_LIMIT = 20;

export type NotificationWithAppointment = Notification & {
  appointments: Pick<Appointment, "start_time" | "end_time"> | null;
};

export async function getRecentNotifications(
  supabase: SupabaseClient<Database>,
  profileId: string,
): Promise<NotificationWithAppointment[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*, appointments(start_time, end_time)")
    .eq("recipient_profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(RECENT_NOTIFICATION_LIMIT);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getUnreadNotificationCount(
  supabase: SupabaseClient<Database>,
  profileId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("recipient_profile_id", profileId)
    .is("read_at", null);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}
