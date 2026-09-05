"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { updateVisitAction } from "@/actions/visits";
import { ActionPendingLabel } from "@/components/ui/action-pending-label";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Visit } from "@/types/database";

type VisitRecordProps = {
  visit: Visit;
};

function ReadOnlyField({
  title,
  description,
  value,
  emptyLabel,
  accent = false,
}: {
  title: string;
  description: string;
  value: string | null;
  emptyLabel: string;
  accent?: boolean;
}) {
  const trimmed = value?.trim() ?? "";
  const hasContent = trimmed.length > 0;

  return (
    <Card className={accent ? "border-amber-200 bg-amber-50/40" : undefined}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {hasContent ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">
            {trimmed}
          </p>
        ) : (
          <p className="text-sm italic text-zinc-500">{emptyLabel}</p>
        )}
      </CardContent>
    </Card>
  );
}

function VisitEditForm({
  visit,
  formKey,
  onCancel,
  onSaved,
}: {
  visit: Visit;
  formKey: number;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [state, formAction, pending] = useActionState(updateVisitAction, null);
  const onSavedRef = useRef(onSaved);

  useEffect(() => {
    onSavedRef.current = onSaved;
  }, [onSaved]);

  useEffect(() => {
    if (state?.success) {
      onSavedRef.current();
    }
  }, [state]);

  return (
    <form key={formKey} action={formAction} className="space-y-6">
      <input type="hidden" name="visitId" value={visit.id} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Visit summary</CardTitle>
          <CardDescription>
            Summary of the visit — visible to your client in their visit
            history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="summary">Summary</Label>
            <Textarea
              id="summary"
              name="summary"
              defaultValue={visit.summary ?? ""}
              rows={6}
              placeholder="What was discussed, observed, or accomplished during this visit…"
              className="min-h-[140px]"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Follow-up</CardTitle>
          <CardDescription>
            Next steps, reminders, or care instructions — visible to your
            client.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="followUp">Follow-up</Label>
            <Textarea
              id="followUp"
              name="followUp"
              defaultValue={visit.follow_up ?? ""}
              rows={4}
              placeholder="Recommended follow-up actions or timeline…"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50/40">
        <CardHeader>
          <CardTitle className="text-base">Professional notes</CardTitle>
          <CardDescription>
            Private — visible only to your business. Never shown to clients.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="professionalNotes">Professional notes</Label>
            <Textarea
              id="professionalNotes"
              name="professionalNotes"
              defaultValue={visit.professional_notes ?? ""}
              rows={5}
              placeholder="Internal clinical or operational notes…"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          <ActionPendingLabel
            pending={pending}
            pendingLabel="Saving…"
            idleLabel="Save"
          />
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={onCancel}
        >
          Cancel
        </Button>

        {state && !state.success ? (
          <p className="text-sm text-red-600" role="alert">
            {state.error}
          </p>
        ) : null}
      </div>
    </form>
  );
}

export function VisitRecord({ visit }: VisitRecordProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [formKey, setFormKey] = useState(0);

  function enterEdit() {
    setFormKey((key) => key + 1);
    setMode("edit");
  }

  function cancelEdit() {
    setMode("view");
  }

  function handleSaved() {
    setMode("view");
    router.refresh();
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium text-zinc-900">Visit record</h2>
          <p className="mt-1 text-sm text-zinc-600">
            {mode === "view"
              ? "Summary, follow-up, and private notes for this visit."
              : "Editing visit details. Save to keep changes, or cancel to discard."}
          </p>
        </div>

        {mode === "view" ? (
          <Button type="button" variant="outline" size="sm" onClick={enterEdit}>
            <Pencil className="size-3.5" aria-hidden />
            Edit
          </Button>
        ) : null}
      </div>

      {mode === "view" ? (
        <div className="space-y-4">
          <ReadOnlyField
            title="Visit summary"
            description="Visible to your client in their visit history."
            value={visit.summary}
            emptyLabel="No summary recorded yet."
          />
          <ReadOnlyField
            title="Follow-up"
            description="Next steps and care instructions — visible to your client."
            value={visit.follow_up}
            emptyLabel="No follow-up recorded yet."
          />
          <ReadOnlyField
            title="Professional notes"
            description="Private — visible only to your business."
            value={visit.professional_notes}
            emptyLabel="No professional notes recorded yet."
            accent
          />
        </div>
      ) : (
        <VisitEditForm
          visit={visit}
          formKey={formKey}
          onCancel={cancelEdit}
          onSaved={handleSaved}
        />
      )}
    </section>
  );
}
