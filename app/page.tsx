import Link from "next/link";
import { UserMenu } from "@/components/layout/UserMenu";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getHomePathForRole } from "@/lib/auth/routing";
import { getCurrentProfile } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const profile = await getCurrentProfile();

  return (
    <div className="min-h-full bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <span className="text-lg font-semibold text-zinc-900">Clario</span>
          <div className="flex items-center gap-2">
            {profile ? (
              <>
                <Button asChild variant="ghost">
                  <Link href={getHomePathForRole(profile.role)}>
                    Go to app
                  </Link>
                </Button>
                <UserMenu profile={profile} />
              </>
            ) : (
              <>
                <Button asChild variant="ghost">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild>
                  <Link href="/signup">Sign up</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-16">
        <section className="max-w-2xl">
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-900">
            Client management made simple
          </h1>
          <p className="mt-4 text-lg text-zinc-600">
            Clario helps small service-based businesses manage clients,
            appointments, visits, forms, products, and documents in one place —
            while giving clients a personal area to book appointments and access
            shared information.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {profile ? (
              <Button asChild size="lg">
                <Link href={getHomePathForRole(profile.role)}>
                  Continue to your workspace
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg">
                  <Link href="/signup">Get started</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/login">Log in</Link>
                </Button>
              </>
            )}
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>For business owners</CardTitle>
              <CardDescription>
                Manage clients, calendar, visits, forms, and products from one
                workspace.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link
                  href={
                    profile?.role === "business_owner"
                      ? "/dashboard"
                      : "/login"
                  }
                >
                  Business area
                </Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>For clients</CardTitle>
              <CardDescription>
                Book appointments, complete forms, and access visit documents
                independently.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link
                  href={
                    profile?.role === "client" ? "/home" : "/login"
                  }
                >
                  Client area
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
