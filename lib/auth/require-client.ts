import {
  getCurrentProfile,
  isClientUser,
} from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export type ClientContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  profile: Profile;
};

export type ClientContextResult =
  | { ok: true; ctx: ClientContext }
  | { ok: false; error: string };

/** Loads authenticated client-user context for Server Actions. */
export async function requireClientContext(): Promise<ClientContextResult> {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  if (!profile || !isClientUser(profile)) {
    return { ok: false, error: "You must be signed in as a client." };
  }

  return {
    ok: true,
    ctx: { supabase, profile },
  };
}
