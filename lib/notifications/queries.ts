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

/** Unread visit_published notifications for Visits nav / card indicators. */
export async function getUnreadVisitPublishedVisitIds(
  supabase: SupabaseClient<Database>,
  profileId: string,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("notifications")
    .select("visit_id")
    .eq("recipient_profile_id", profileId)
    .eq("type", "visit_published")
    .is("read_at", null)
    .not("visit_id", "is", null);

  if (error) {
    throw new Error(error.message);
  }

  const ids = new Set<string>();
  for (const row of data ?? []) {
    if (row.visit_id) {
      ids.add(row.visit_id);
    }
  }
  return ids;
}

export async function markVisitPublishedNotificationsRead(
  supabase: SupabaseClient<Database>,
  profileId: string,
  visitId: string,
): Promise<number> {
  const readAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("notifications")
    .update({ read_at: readAt })
    .eq("recipient_profile_id", profileId)
    .eq("type", "visit_published")
    .eq("visit_id", visitId)
    .is("read_at", null)
    .select("id");

  if (error) {
    throw new Error(error.message);
  }

  return data?.length ?? 0;
}
