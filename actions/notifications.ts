"use server";

import { getCurrentProfile } from "@/lib/auth/permissions";
import { markVisitPublishedNotificationsRead } from "@/lib/notifications/queries";
import { revalidateNotificationLayouts } from "@/lib/notifications/revalidate";
import { createClient } from "@/lib/supabase/server";
import { notificationIdSchema } from "@/lib/validation/notifications";
import { visitIdSchema } from "@/lib/validation/visits";
import { actionError, actionSuccess, type ActionResult } from "@/types/actions";

type NotificationActionState = ActionResult<{ message?: string }> | null;

export async function markNotificationReadAction(
  _prevState: NotificationActionState,
  formData: FormData,
): Promise<NotificationActionState> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return actionError("You must be signed in.");
  }

  const parsed = notificationIdSchema.safeParse(formData.get("notificationId"));
  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid notification.");
  }

  const supabase = await createClient();
  const readAt = new Date().toISOString();

  const { data, error } = await supabase
    .from("notifications")
    .update({ read_at: readAt })
    .eq("id", parsed.data)
    .eq("recipient_profile_id", profile.id)
    .is("read_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    return actionError(error.message);
  }

  if (!data) {
    return actionError("Notification not found or already read.");
  }

  revalidateNotificationLayouts();
  return actionSuccess({ message: "Notification marked as read." });
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return;
  }

  const supabase = await createClient();
  const readAt = new Date().toISOString();

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: readAt })
    .eq("recipient_profile_id", profile.id)
    .is("read_at", null);

  if (error) {
    throw new Error(error.message);
  }

  revalidateNotificationLayouts();
}

/** Marks unread visit_published notifications for one visit as read. */
export async function markVisitPublishedNotificationReadAction(
  visitId: string,
): Promise<void> {
  const parsed = visitIdSchema.safeParse(visitId);
  if (!parsed.success) {
    return;
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    return;
  }

  const supabase = await createClient();

  try {
    const marked = await markVisitPublishedNotificationsRead(
      supabase,
      profile.id,
      parsed.data,
    );
    if (marked > 0) {
      revalidateNotificationLayouts();
    }
  } catch {
    // Best-effort: visit page content must still load.
  }
}
