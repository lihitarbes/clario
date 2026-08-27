import Link from "next/link";
import { Suspense } from "react";
import { getOwnedBusiness } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ClientList } from "@/components/clients/ClientList";
import { ClientSearch } from "@/components/clients/ClientSearch";

export const dynamic = "force-dynamic";

function sanitizeSearchQuery(query: string | undefined) {
  if (!query) {
    return undefined;
  }

  const trimmed = query.trim().slice(0, 100);
  if (!trimmed) {
    return undefined;
  }

  return trimmed.replace(/[%_\\]/g, "");
}

export default async function ClientsPage({
  searchParams,
}: PageProps<"/clients">) {
  const { q, showArchived } = await searchParams;
  const business = await getOwnedBusiness();

  if (!business) {
    return null;
  }

  const supabase = await createClient();
  const showArchivedClients = showArchived === "true";

  let query = supabase
    .from("clients")
    .select("*")
    .eq("business_id", business.id)
    .order("full_name");

  if (!showArchivedClients) {
    query = query.is("archived_at", null);
  } else {
    query = query.not("archived_at", "is", null);
  }

  const search = sanitizeSearchQuery(typeof q === "string" ? q : undefined);
  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data: clients } = await query;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Clients</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Manage your client records for {business.name}.
          </p>
        </div>
        <Button asChild>
          <Link href="/clients/new">Add client</Link>
        </Button>
      </div>

      <Suspense fallback={null}>
        <ClientSearch
          defaultQuery={typeof q === "string" ? q : ""}
          showArchived={showArchivedClients}
        />
      </Suspense>

      <ClientList
        clients={clients ?? []}
        showArchived={showArchivedClients}
      />
    </div>
  );
}
