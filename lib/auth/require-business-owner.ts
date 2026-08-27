import {
  getCurrentProfile,
  getOwnedBusiness,
  isBusinessOwner,
} from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import type { Business, Profile } from "@/types/database";

export type BusinessOwnerContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  profile: Profile;
  business: Business;
};

export type BusinessOwnerContextResult =
  | { ok: true; ctx: BusinessOwnerContext }
  | { ok: false; error: string };

/** Loads authenticated business-owner context for Server Actions. */
export async function requireBusinessOwnerContext(): Promise<BusinessOwnerContextResult> {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  if (!profile || !isBusinessOwner(profile)) {
    return { ok: false, error: "You must be signed in as a business owner." };
  }

  const business = await getOwnedBusiness();

  if (!business) {
    return { ok: false, error: "Business workspace not found." };
  }

  return {
    ok: true,
    ctx: { supabase, profile, business },
  };
}
