import { redirect } from "next/navigation";
import { ClientProfileForm } from "@/components/profile/ClientProfileForm";
import { getCurrentProfile, getLinkedClients } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export default async function ClientProfilePage() {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }

  if (profile.role !== "client") {
    redirect("/dashboard");
  }

  const linkedClients = await getLinkedClients();
  const phone =
    linkedClients.find((client) => client.phone)?.phone ??
    profile.phone ??
    "";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Profile</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Manage the contact information shared with your practitioners.
        </p>
      </div>

      {linkedClients.length === 0 ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          No linked client records yet. Your profile is saved on your account.
          After a business links you by email, your phone will also sync to
          their client record for WhatsApp contact.
        </p>
      ) : null}

      <ClientProfileForm
        fullName={profile.full_name}
        email={profile.email}
        phone={phone}
        linkedBusinessCount={linkedClients.length}
      />
    </div>
  );
}
