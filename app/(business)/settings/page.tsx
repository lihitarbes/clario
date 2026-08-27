import { redirect } from "next/navigation";
import { BusinessSettingsForm } from "@/components/business/BusinessSettingsForm";
import { getOwnedBusiness } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const business = await getOwnedBusiness();

  if (!business) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">
          Business settings
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Manage your business profile and appointment defaults.
        </p>
      </div>

      <BusinessSettingsForm business={business} />
    </div>
  );
}
