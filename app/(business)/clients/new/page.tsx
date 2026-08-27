import Link from "next/link";
import { ClientForm } from "@/components/clients/ClientForm";

export default function NewClientPage() {
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
          Add client
        </h1>
      </div>

      <ClientForm mode="create" />
    </div>
  );
}
