import Link from "next/link";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Client } from "@/types/database";

type ClientListProps = {
  clients: Client[];
  showArchived: boolean;
};

export function ClientList({ clients, showArchived }: ClientListProps) {
  if (clients.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {showArchived ? "No archived clients" : "No clients yet"}
          </CardTitle>
          <CardDescription>
            {showArchived
              ? "Archived clients will appear here."
              : "Add your first client to get started."}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
      {clients.map((client) => {
        const isArchived = Boolean(client.archived_at);

        return (
          <li key={client.id}>
            <Link
              href={`/clients/${client.id}`}
              className="flex flex-col gap-1 px-4 py-4 transition-colors hover:bg-zinc-50 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-zinc-900">{client.full_name}</p>
                <p className="text-sm text-zinc-600">{client.email}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
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
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
