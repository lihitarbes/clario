import Link from "next/link";
import { ArchiveFormButton } from "@/components/forms/ArchiveFormButton";
import { FormContentText } from "@/components/forms/FormContentFields";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatRenewalInterval } from "@/lib/forms/display";
import { normalizeFormFields } from "@/lib/forms/fields";
import type { Form } from "@/types/database";

type FormTemplateListProps = {
  forms: Form[];
};

export function FormTemplateList({ forms }: FormTemplateListProps) {
  if (forms.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-zinc-600">
          No active form templates yet. Create a blank form or start from a
          Health Declaration template in English or Hebrew.
        </CardContent>
      </Card>
    );
  }

  return (
    <ul className="space-y-4">
      {forms.map((form) => {
        const fields = normalizeFormFields(form.fields);
        const questionCount = fields.length;

        return (
          <li key={form.id}>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-base">
                      <FormContentText>{form.title}</FormContentText>
                    </CardTitle>
                    {form.description ? (
                      <CardDescription>
                        <FormContentText>{form.description}</FormContentText>
                      </CardDescription>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/forms/${form.id}`}>Edit</Link>
                    </Button>
                    <ArchiveFormButton formId={form.id} formTitle={form.title} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-600">
                <span>
                  {questionCount} question{questionCount === 1 ? "" : "s"}
                </span>
                <span>
                  Renewal: {formatRenewalInterval(form.renewal_interval_months)}
                </span>
              </CardContent>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
