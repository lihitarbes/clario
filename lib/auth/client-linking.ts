import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { mapDatabaseError } from "@/lib/auth/errors";

type AppSupabaseClient = SupabaseClient<Database>;

/**
 * Links all eligible unlinked client records to the authenticated user.
 * Matching is enforced by RLS (profile email must match clients.email).
 * Never accepts client IDs from the caller.
 */
export async function linkClientsByAuthenticatedEmail(
  supabase: AppSupabaseClient,
  userId: string,
): Promise<
  | { ok: true; linkedCount: number }
  | { ok: false; error: string }
> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    return { ok: false, error: "Unable to load your profile. Please try again." };
  }

  if (profile.role !== "client") {
    return { ok: true, linkedCount: 0 };
  }

  // RLS policy "clients_link_by_email" restricts which rows may be updated.
  const { data, error } = await supabase
    .from("clients")
    .update({ user_id: userId })
    .is("user_id", null)
    .is("archived_at", null)
    .select("id");

  if (error) {
    return { ok: false, error: mapDatabaseError(error.message) };
  }

  return { ok: true, linkedCount: data?.length ?? 0 };
}
