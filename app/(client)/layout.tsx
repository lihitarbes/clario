import { redirect } from "next/navigation";
import { ClientNav } from "@/components/layout/ClientNav";
import { linkClientsByAuthenticatedEmail } from "@/lib/auth/client-linking";
import {
  getCurrentProfile,
  isClientUser,
} from "@/lib/auth/permissions";
import {
  getRecentNotifications,
  getUnreadNotificationCount,
} from "@/lib/notifications/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ClientLayout({
  children,
}: LayoutProps<"/">) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  if (!isClientUser(profile)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  await linkClientsByAuthenticatedEmail(supabase, profile.id);

  const notifications = await getRecentNotifications(supabase, profile.id);
  const unreadCount = await getUnreadNotificationCount(supabase, profile.id);

  return (
    <div className="min-h-full bg-zinc-50">
      <ClientNav
        profile={profile}
        notifications={notifications}
        unreadCount={unreadCount}
      />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
