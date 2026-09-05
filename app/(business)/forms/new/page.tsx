import Link from "next/link";
import { FormBuilder } from "@/components/forms/FormBuilder";
import { FormContentText } from "@/components/forms/FormContentFields";
import { getFormStarterDefinition } from "@/lib/forms/starters";

export const dynamic = "force-dynamic";

export default async function NewFormPage({
  searchParams,
}: PageProps<"/forms/new">) {
  const { starter } = await searchParams;
  const starterDef = getFormStarterDefinition(
    typeof starter === "string" ? starter : undefined,
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/forms"
          className="text-sm text-zinc-600 hover:text-zinc-900 hover:underline"
        >
          ← Back to forms
        </Link>
        {starterDef ? (
          <>
            <FormContentText
              as="h1"
              className="mt-2 text-2xl font-semibold text-zinc-900"
            >
              {starterDef.pageTitle}
            </FormContentText>
            <p className="mt-1 text-sm text-zinc-600">
              {starterDef.pageDescription}
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
              New form
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              Build a reusable form template for your business.
            </p>
          </>
        )}
      </div>

      <FormBuilder
        mode="create"
        initialTitle={starterDef?.title ?? ""}
        initialDescription={starterDef?.description ?? null}
        initialFields={starterDef?.fields}
      />
    </div>
  );
}
