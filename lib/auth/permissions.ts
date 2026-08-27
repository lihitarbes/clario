import { createClient } from "@/lib/supabase/server";
import type { Business, Client, Profile, UserRole } from "@/types/database";

/** Returns the authenticated user's profile, or null if not signed in. */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/** Business owned by the current user (MVP: at most one). */
export async function getOwnedBusiness(): Promise<Business | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/** Client records linked to the current user (may be multiple businesses). */
export async function getLinkedClients(): Promise<Client[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("user_id", user.id)
    .is("archived_at", null);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export function isBusinessOwner(profile: Profile | null): profile is Profile & {
  role: "business_owner";
} {
  return profile?.role === "business_owner";
}

export function isClientUser(profile: Profile | null): profile is Profile & {
  role: "client";
} {
  return profile?.role === "client";
}

export function assertRole(
  profile: Profile | null,
  role: UserRole,
): asserts profile is Profile & { role: typeof role } {
  if (!profile || profile.role !== role) {
    throw new Error("Unauthorized");
  }
}
