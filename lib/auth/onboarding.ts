import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { mapDatabaseError } from "@/lib/auth/errors";

type AppSupabaseClient = SupabaseClient<Database>;

/**
 * Ensures a business owner has exactly one business workspace (MVP).
 * Creates a minimal workspace if none exists yet.
 */
export async function ensureBusinessOwnerOnboarded(
  supabase: AppSupabaseClient,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: existing, error: existingError } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();

  if (existingError) {
    return { ok: false, error: mapDatabaseError(existingError.message) };
  }

  if (existing) {
    return { ok: true };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    return { ok: false, error: "Unable to load your profile. Please try again." };
  }

  if (profile.role !== "business_owner") {
    return { ok: false, error: "Unauthorized" };
  }

  const { error: insertError } = await supabase.from("businesses").insert({
    owner_id: userId,
    name: "My Business",
  });

  if (insertError) {
    return { ok: false, error: mapDatabaseError(insertError.message) };
  }

  return { ok: true };
}
