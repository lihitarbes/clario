import Link from "next/link";
import { notFound } from "next/navigation";
import { FormBuilder } from "@/components/forms/FormBuilder";
import { FormContentText } from "@/components/forms/FormContentFields";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getOwnedBusiness } from "@/lib/auth/permissions";
import { normalizeFormFields } from "@/lib/forms/fields";
import { createClient } from "@/lib/supabase/server";
import type { Form } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function EditFormPage({
  params,
}: PageProps<"/forms/[formId]">) {
  const { formId } = await params;
  const business = await getOwnedBusiness();

  if (!business) {
    notFound();
  }

  const supabase = await createClient();
  const { data: form } = await supabase
    .from("forms")
    .select("*")
    .eq("id", formId)
    .eq("business_id", business.id)
    .maybeSingle();

  if (!form) {
    notFound();
  }

  const typedForm = form as Form;
  const isArchived = typedForm.archived_at !== null;
  const fields = normalizeFormFields(typedForm.fields);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/forms"
          className="text-sm text-zinc-600 hover:text-zinc-900 hover:underline"
        >
          ← Back to forms
        </Link>
        <FormContentText
          as="h1"
          className="mt-2 text-2xl font-semibold text-zinc-900"
        >
          {typedForm.title}
        </FormContentText>
        <p className="mt-1 text-sm text-zinc-600">
          {isArchived
            ? "This form is archived and cannot be edited."
            : "Edit your form template. Existing answers stay linked when you save."}
        </p>
      </div>

      {isArchived ? (
        <Card className="border-amber-200 bg-amber-50/40">
          <CardHeader>
            <CardTitle className="text-base">Archived form</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-zinc-600">
            This template was archived on{" "}
            {new Date(typedForm.archived_at!).toLocaleString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
            . It can no longer be edited or assigned. Past submissions remain
            available in the client&apos;s Forms section.
          </CardContent>
        </Card>
      ) : null}

      <FormBuilder
        mode="edit"
        formId={typedForm.id}
        initialTitle={typedForm.title}
        initialDescription={typedForm.description}
        initialRenewalMonths={typedForm.renewal_interval_months}
        initialFields={fields}
        readOnly={isArchived}
      />
    </div>
  );
}
