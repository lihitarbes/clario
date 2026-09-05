import Link from "next/link";
import type { AppointmentWithBusiness } from "@/actions/appointments";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  appointmentStatusClassName,
  appointmentStatusLabel,
  formatAppointmentTimeRange,
} from "@/lib/appointments/display";
import { getCurrentProfile, getLinkedClients } from "@/lib/auth/permissions";
import {
  purchaseStatusClassName,
  purchaseStatusLabel,
} from "@/lib/products/display";
import {
  buildClientVisitListItems,
  type ClientVisitAppointmentMeta,
} from "@/lib/visits/client-queries";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { ClientVisit, Purchase } from "@/types/database";

export const dynamic = "force-dynamic";

function greetingName(fullName: string) {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return "there";
  }
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

type LatestPurchase = Pick<Purchase, "id" | "status" | "created_at"> & {
  businesses: { name: string } | null;
};

export default async function ClientHomePage() {
  const profile = await getCurrentProfile();
  const linkedClients = await getLinkedClients();
  const clientIds = linkedClients.map((client) => client.id);
  const showBusinessName = linkedClients.length > 1;
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  let nextAppointment: AppointmentWithBusiness | null = null;
  let pendingFormCount = 0;
  let recentVisit: ReturnType<typeof buildClientVisitListItems>[number] | null =
    null;
  let latestPurchase: LatestPurchase | null = null;

  if (clientIds.length > 0) {
    const [
      appointmentsResult,
      pendingFormsResult,
      visitsResult,
      purchaseResult,
    ] = await Promise.all([
      supabase
        .from("appointments")
        .select("*, businesses(id, name)")
        .in("client_id", clientIds)
        .in("status", ["pending", "scheduled"])
        .gte("start_time", nowIso)
        .order("start_time", { ascending: true })
        .limit(1),
      supabase
        .from("form_assignments")
        .select("id", { count: "exact", head: true })
        .in("client_id", clientIds)
        .eq("status", "pending"),
      supabase
        .from("client_visits")
        .select("*")
        .in("client_id", clientIds)
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("purchases")
        .select("id, status, created_at, businesses(name)")
        .in("client_id", clientIds)
        .order("created_at", { ascending: false })
        .limit(1),
    ]);

    nextAppointment =
      ((appointmentsResult.data ?? [])[0] as
        | AppointmentWithBusiness
        | undefined) ?? null;
    pendingFormCount = pendingFormsResult.count ?? 0;

    const visits = (visitsResult.data ?? []) as ClientVisit[];
    if (visits.length > 0) {
      const appointmentIds = visits.map((visit) => visit.appointment_id);
      const { data: appointmentRows } = await supabase
        .from("appointments")
        .select("id, start_time, end_time, business_id, businesses(name)")
        .in("id", appointmentIds);
      const visitItems = buildClientVisitListItems(
        visits,
        (appointmentRows ?? []) as ClientVisitAppointmentMeta[],
      );
      recentVisit = visitItems[0] ?? null;
    }

    latestPurchase =
      ((purchaseResult.data ?? [])[0] as LatestPurchase | undefined) ?? null;
  }

  const firstName = greetingName(profile?.full_name ?? "");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">
          Hi, {firstName}
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Here&apos;s what&apos;s happening with your account.
        </p>
      </div>

      {clientIds.length === 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Get started</CardTitle>
            <CardDescription>
              You are not linked to any business yet. Ask your practitioner to
              add you with the email on this account.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Next appointment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {nextAppointment ? (
              <>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-zinc-900">
                    {formatAppointmentTimeRange(
                      nextAppointment.start_time,
                      nextAppointment.end_time,
                    )}
                  </p>
                  {showBusinessName || nextAppointment.businesses?.name ? (
                    <p className="text-sm text-zinc-600">
                      {nextAppointment.businesses?.name ?? "Business"}
                    </p>
                  ) : null}
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                      appointmentStatusClassName(nextAppointment.status),
                    )}
                  >
                    {appointmentStatusLabel(nextAppointment.status)}
                  </span>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href="/appointments">View appointments</Link>
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-zinc-600">
                  No upcoming appointments.
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link href="/appointments/book">Book appointment</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Forms to complete</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingFormCount > 0 ? (
              <>
                <p className="text-sm text-zinc-700">
                  <span className="font-semibold text-zinc-900">
                    {pendingFormCount}
                  </span>{" "}
                  {pendingFormCount === 1
                    ? "form needs your attention."
                    : "forms need your attention."}
                </p>
                <Button asChild size="sm">
                  <Link href="/my-forms">Open forms</Link>
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-zinc-600">
                  You&apos;re all caught up — no forms waiting.
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link href="/my-forms">View forms</Link>
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
                    {recentVisit.appointment
                      ? formatAppointmentTimeRange(
                          recentVisit.appointment.start_time,
                          recentVisit.appointment.end_time,
                        )
                      : "Visit record"}
                  </p>
                  {recentVisit.appointment?.businesses?.name ? (
                    <p className="text-sm text-zinc-600">
                      {recentVisit.appointment.businesses.name}
                    </p>
                  ) : null}
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/visits/${recentVisit.id}`}>Open visit</Link>
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-zinc-600">
                  No published visit records yet.
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link href="/visits">View visits</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent order</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {latestPurchase ? (
              <>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-zinc-900">
                    {latestPurchase.businesses?.name ?? "Order"}
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
                      purchaseStatusClassName(latestPurchase.status),
                    )}
                  >
                    {purchaseStatusLabel(latestPurchase.status)}
                  </span>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href="/shop?orders=1">View orders</Link>
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-zinc-600">No orders yet.</p>
                <Button asChild variant="outline" size="sm">
                  <Link href="/shop">Browse shop</Link>
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
              <Link href="/appointments/book">Book appointment</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/visits">View visits</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/shop">Shop</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/my-forms">Forms</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
