import Link from "next/link";
import type { AppointmentWithClient } from "@/actions/appointments";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  appointmentStatusClassName,
  appointmentStatusLabel,
  formatAppointmentTimeRange,
} from "@/lib/appointments/display";
import {
  getCurrentProfile,
  getOwnedBusiness,
} from "@/lib/auth/permissions";
import {
  purchaseStatusClassName,
  purchaseStatusLabel,
} from "@/lib/products/display";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { Purchase, PurchaseStatus } from "@/types/database";

export const dynamic = "force-dynamic";

function greetingName(fullName: string) {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return "there";
  }
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

type LatestPurchase = Pick<Purchase, "id" | "status" | "created_at"> & {
  clients: { full_name: string } | null;
};

type RecentVisit = {
  id: string;
  created_at: string;
  published_at: string | null;
  clients: { full_name: string } | null;
  appointments: { start_time: string } | null;
};

export default async function BusinessDashboardPage() {
  const profile = await getCurrentProfile();
  const business = await getOwnedBusiness();

  if (!business) {
    return null;
  }

  const supabase = await createClient();
  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const nowIso = now.toISOString();
  const dayStartIso = dayStart.toISOString();
  const dayEndIso = dayEnd.toISOString();

  const [
    todayAppointmentsResult,
    nextTodayResult,
    pendingAppointmentsResult,
    activeClientsResult,
    pendingFormsResult,
    latestPurchaseResult,
    recentVisitResult,
  ] = await Promise.all([
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .gte("start_time", dayStartIso)
      .lt("start_time", dayEndIso)
      .in("status", ["pending", "scheduled", "completed"]),
    supabase
      .from("appointments")
      .select("*, clients(full_name, email)")
      .eq("business_id", business.id)
      .gte("start_time", nowIso)
      .lt("start_time", dayEndIso)
      .in("status", ["pending", "scheduled"])
      .order("start_time", { ascending: true })
      .limit(1),
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .eq("status", "pending"),
    supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .is("archived_at", null),
    supabase
      .from("form_assignments")
      .select("id, forms!inner(business_id)", { count: "exact", head: true })
      .eq("forms.business_id", business.id)
      .eq("status", "pending"),
    supabase
      .from("purchases")
      .select("id, status, created_at, clients(full_name)")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("visits")
      .select(
        "id, created_at, published_at, clients(full_name), appointments!inner(start_time, business_id)",
      )
      .eq("appointments.business_id", business.id)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const todayCount = todayAppointmentsResult.count ?? 0;
  const nextToday =
    ((nextTodayResult.data ?? [])[0] as AppointmentWithClient | undefined) ??
    null;
  const pendingAppointmentCount = pendingAppointmentsResult.count ?? 0;
  const activeClientCount = activeClientsResult.count ?? 0;
  const pendingFormCount = pendingFormsResult.count ?? 0;
  const latestPurchase =
    ((latestPurchaseResult.data ?? [])[0] as LatestPurchase | undefined) ??
    null;
  const recentVisit =
    ((recentVisitResult.data ?? [])[0] as RecentVisit | undefined) ?? null;

  const firstName = greetingName(profile?.full_name ?? "");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">
          Hi, {firstName}
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Here&apos;s what&apos;s happening with {business.name}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Today&apos;s appointments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {todayCount > 0 ? (
              <>
                <p className="text-sm text-zinc-700">
                  <span className="font-semibold text-zinc-900">
                    {todayCount}
                  </span>{" "}
                  {todayCount === 1 ? "appointment" : "appointments"} today
                </p>
                {nextToday ? (
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Next up
                    </p>
                    <p className="text-sm font-medium text-zinc-900">
                      {formatAppointmentTimeRange(
                        nextToday.start_time,
                        nextToday.end_time,
                      )}
                    </p>
                    <p className="text-sm text-zinc-600">
                      {nextToday.clients?.full_name ?? "Client"}
                    </p>
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                        appointmentStatusClassName(nextToday.status),
                      )}
                    >
                      {appointmentStatusLabel(nextToday.status)}
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-600">
                    No more upcoming appointments left today.
                  </p>
                )}
                <Button asChild variant="outline" size="sm">
                  <Link href="/calendar">Open calendar</Link>
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-zinc-600">
                  No appointments scheduled for today.
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link href="/calendar">Open calendar</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pending requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingAppointmentCount > 0 ? (
              <>
                <p className="text-sm text-zinc-700">
                  <span className="font-semibold text-zinc-900">
                    {pendingAppointmentCount}
                  </span>{" "}
                  {pendingAppointmentCount === 1
                    ? "appointment request"
                    : "appointment requests"}{" "}
                  waiting for review.
                </p>
                <Button asChild size="sm">
                  <Link href="/calendar">Review requests</Link>
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-zinc-600">
                  You&apos;re all caught up — no pending requests.
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link href="/calendar">View calendar</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Active clients</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-zinc-700">
              <span className="font-semibold text-zinc-900">
                {activeClientCount}
              </span>{" "}
              {activeClientCount === 1 ? "active client" : "active clients"}
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href="/clients">View clients</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Forms requiring attention</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingFormCount > 0 ? (
              <>
                <p className="text-sm text-zinc-700">
                  <span className="font-semibold text-zinc-900">
                    {pendingFormCount}
                  </span>{" "}
                  {pendingFormCount === 1
                    ? "form assignment"
                    : "form assignments"}{" "}
                  still pending with clients.
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link href="/clients">View clients</Link>
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-zinc-600">
                  No pending form assignments.
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link href="/forms">Manage forms</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent purchase</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {latestPurchase ? (
              <>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-zinc-900">
                    {latestPurchase.clients?.full_name ?? "Client"}
                  </p>
                  <p className="text-sm text-zinc-600">
                    {new Date(latestPurchase.created_at).toLocaleDateString(
                      undefined,
                      {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      },
                    )}
                  </p>
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                      purchaseStatusClassName(
                        latestPurchase.status as PurchaseStatus,
                      ),
                    )}
                  >
                    {purchaseStatusLabel(
                      latestPurchase.status as PurchaseStatus,
                    )}
                  </span>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href="/products">View products & orders</Link>
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-zinc-600">No purchase requests yet.</p>
                <Button asChild variant="outline" size="sm">
                  <Link href="/products">View products</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent visit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentVisit ? (
              <>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-zinc-900">
                    {recentVisit.clients?.full_name ?? "Client"}
                  </p>
                  <p className="text-sm text-zinc-600">
                    {recentVisit.appointments?.start_time
                      ? new Date(
                          recentVisit.appointments.start_time,
                        ).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : new Date(recentVisit.created_at).toLocaleDateString(
                          undefined,
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          },
                        )}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {recentVisit.published_at
                      ? "Shared with client"
                      : "Draft — not shared"}
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/calendar/visits/${recentVisit.id}`}>
                    Open visit
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-zinc-600">No visit records yet.</p>
                <Button asChild variant="outline" size="sm">
                  <Link href="/calendar">Open calendar</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/clients/new">Add client</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/calendar">Manage slots</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/calendar">View calendar</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/products">Products</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/forms">Forms</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
