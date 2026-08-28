"use client";

import { useActionState } from "react";
import { updateVisitAction } from "@/actions/visits";
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

type VisitEditorProps = {
  visit: Visit;
};

export function VisitEditor({ visit }: VisitEditorProps) {
  const [state, formAction, pending] = useActionState(updateVisitAction, null);

  return (
    <form action={formAction} className="space-y-6">
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
            Next steps, reminders, or care instructions — visible to your client.
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
          {pending ? "Saving…" : "Save visit record"}
        </Button>

        {state && !state.success ? (
          <p className="text-sm text-red-600" role="alert">
            {state.error}
          </p>
        ) : null}

        {state?.success && state.data?.message ? (
          <p className="text-sm text-green-700" role="status">
            {state.data.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
