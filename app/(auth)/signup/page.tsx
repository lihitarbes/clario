import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth/SignupForm";
import { getHomePathForRole } from "@/lib/auth/routing";
import { getCurrentProfile } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const profile = await getCurrentProfile();

  if (profile) {
    redirect(getHomePathForRole(profile.role));
  }

  return <SignupForm />;
}
