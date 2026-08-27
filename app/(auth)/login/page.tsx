import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { getHomePathForRole } from "@/lib/auth/routing";
import { getCurrentProfile } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: Promise<{ redirect?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const profile = await getCurrentProfile();

  if (profile) {
    redirect(getHomePathForRole(profile.role));
  }

  const { redirect: redirectTo } = await searchParams;

  return <LoginForm redirectTo={redirectTo} />;
}
