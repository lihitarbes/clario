import Link from "next/link";
import { notFound } from "next/navigation";
import { ArchiveClientButton } from "@/components/clients/ArchiveClientButton";
import { ClientForm } from "@/components/clients/ClientForm";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getOwnedBusiness } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function ClientDetailPage({
  params,
}: PageProps<"/clients/[id]">) {
  const { id } = await params;
  const business = await getOwnedBusiness();

  if (!business) {
    notFound();
  }

  const supabase = await createClient();
  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .eq("business_id", business.id)
    .maybeSingle();

  if (!client) {
    notFound();
  }

  const isArchived = Boolean(client.archived_at);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/clients"
          className="text-sm text-zinc-600 hover:text-zinc-900 hover:underline"
        >
          ← Back to clients
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          {client.full_name}
        </h1>
        <div className="mt-2 flex flex-wrap gap-2 text-sm">
          {isArchived ? (
            <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-800">
              Archived
            </span>
          ) : null}
          {client.user_id ? (
            <span className="rounded-full bg-green-100 px-2 py-1 text-green-800">
              Account linked
            </span>
          ) : (
            <span className="rounded-full bg-zinc-100 px-2 py-1 text-zinc-600">
              No account yet
            </span>
          )}
        </div>
      </div>

      {isArchived ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Client details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="font-medium text-zinc-900">Email</p>
              <p className="text-zinc-600">{client.email}</p>
            </div>
            {client.phone ? (
              <div>
                <p className="font-medium text-zinc-900">Phone</p>
                <p className="text-zinc-600">{client.phone}</p>
              </div>
            ) : null}
            {client.notes ? (
              <div>
                <p className="font-medium text-zinc-900">Notes</p>
                <p className="whitespace-pre-wrap text-zinc-600">
                  {client.notes}
                </p>
              </div>
            ) : null}
            <div>
              <p className="font-medium text-zinc-900">Archived on</p>
              <p className="text-zinc-600">
                {client.archived_at ? formatDate(client.archived_at) : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <ClientForm mode="edit" client={client} />
          <ArchiveClientButton
            clientId={client.id}
            clientName={client.full_name}
          />
        </>
      )}
    </div>
  );
}
