import Link from "next/link";
import { FormTemplateList } from "@/components/forms/FormTemplateList";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getOwnedBusiness } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import {
  HEALTH_DECLARATION_HEBREW_STARTER_KEY,
  HEALTH_DECLARATION_STARTER_KEY,
} from "@/lib/forms/starters";
import type { Form } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function BusinessFormsPage() {
  const business = await getOwnedBusiness();

  if (!business) {
    return null;
  }

  const supabase = await createClient();
  const { data: forms } = await supabase
    .from("forms")
    .select("*")
    .eq("business_id", business.id)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Forms</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Create reusable form templates for {business.name}.
          </p>
        </div>
        <Button asChild>
          <Link href="/forms/new">Create form</Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Start from a template</CardTitle>
          <CardDescription>
            Create a blank form or use a Health Declaration starter in English
            or Hebrew.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <Link
            href="/forms/new"
            className="font-medium text-zinc-900 underline hover:text-zinc-700"
          >
            Blank form
          </Link>
          <Link
            href={`/forms/new?starter=${HEALTH_DECLARATION_STARTER_KEY}`}
            className="font-medium text-zinc-900 underline hover:text-zinc-700"
          >
            Health Declaration — English
          </Link>
          <Link
            href={`/forms/new?starter=${HEALTH_DECLARATION_HEBREW_STARTER_KEY}`}
            className="font-medium text-zinc-900 underline hover:text-zinc-700"
            dir="auto"
          >
            הצהרת בריאות — עברית
          </Link>
        </CardContent>
      </Card>

      <FormTemplateList forms={(forms ?? []) as Form[]} />
    </div>
  );
}
