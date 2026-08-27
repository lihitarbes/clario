import { redirect } from "next/navigation";
import { BusinessNav } from "@/components/layout/BusinessNav";
import { ensureBusinessOwnerOnboarded } from "@/lib/auth/onboarding";
import {
  getCurrentProfile,
  isBusinessOwner,
} from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function BusinessLayout({
  children,
}: LayoutProps<"/">) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  if (!isBusinessOwner(profile)) {
    redirect("/home");
  }

  const supabase = await createClient();
  await ensureBusinessOwnerOnboarded(supabase, profile.id);

  return (
    <div className="min-h-full bg-zinc-50">
      <BusinessNav />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
