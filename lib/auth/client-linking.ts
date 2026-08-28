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
  // Do not chain `.select()` on this update: RETURNING re-checks SELECT RLS, and
  // unlinked rows are not visible to clients via SELECT. That can fail or return
  // empty even when the UPDATE WITH CHECK would succeed (same class of bug as
  // createClientAction insert + select).
  const { error } = await supabase
    .from("clients")
    .update({ user_id: userId })
    .is("user_id", null)
    .is("archived_at", null);

  if (error) {
    return { ok: false, error: mapDatabaseError(error.message) };
  }

  // Count linked rows with a separate SELECT (allowed once user_id is set).
  const { data: linked, error: linkedError } = await supabase
    .from("clients")
    .select("id")
    .eq("user_id", userId)
    .is("archived_at", null);

  if (linkedError) {
    return { ok: false, error: mapDatabaseError(linkedError.message) };
  }

  return { ok: true, linkedCount: linked?.length ?? 0 };
}
