"use client";

import { useActionState, useState, type FormEvent } from "react";
import {
  publishVisitAction,
  unpublishVisitAction,
  updateVisitPublicationScopeAction,
} from "@/actions/visits";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ownerPublicationScopeLabel } from "@/lib/visits/display";
import type { Visit, VisitPublicationScope } from "@/types/database";
import { cn } from "@/lib/utils";

type VisitPublicationBannerProps = {
  visit: Pick<Visit, "id" | "published_at" | "publication_scope">;
};

function formatPublishedAt(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type SharingChooserProps = {
  visitId: string;
  defaultScope: VisitPublicationScope;
  submitLabel: string;
  formAction: (payload: FormData) => void;
  pending: boolean;
  error: string | null;
  successMessage: string | null;
  onCancel: () => void;
};

function SharingChooser({
  visitId,
  defaultScope,
  submitLabel,
  formAction,
  pending,
  error,
  successMessage,
  onCancel,
}: SharingChooserProps) {
  const [scope, setScope] = useState<VisitPublicationScope>(defaultScope);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (scope !== "full" && scope !== "recommendations_only") {
      event.preventDefault();
    }
  }

  return (
    <form
      action={formAction}
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4"
    >
      <input type="hidden" name="visitId" value={visitId} />
      <input type="hidden" name="publicationScope" value={scope} />

      <p className="text-sm font-medium text-zinc-900">Share visit with client</p>

      <div className="space-y-3">
        <label className="flex cursor-pointer gap-3 rounded-md border border-zinc-200 p-3 has-[:checked]:border-zinc-400 has-[:checked]:bg-zinc-50">
          <input
            type="radio"
            name="publicationScopeChoice"
            value="full"
            checked={scope === "full"}
            onChange={() => setScope("full")}
            className="mt-0.5"
          />
          <span className="space-y-1">
            <span className="block text-sm font-medium text-zinc-900">
              Full visit
            </span>
            <span className="block text-sm text-zinc-600">
              Summary, follow-up, and recommendations will be shared.
            </span>
          </span>
        </label>

        <label className="flex cursor-pointer gap-3 rounded-md border border-zinc-200 p-3 has-[:checked]:border-zinc-400 has-[:checked]:bg-zinc-50">
          <input
            type="radio"
            name="publicationScopeChoice"
            value="recommendations_only"
            checked={scope === "recommendations_only"}
            onChange={() => setScope("recommendations_only")}
            className="mt-0.5"
          />
          <span className="space-y-1">
            <span className="block text-sm font-medium text-zinc-900">
              Recommendations only
            </span>
            <span className="block text-sm text-zinc-600">
              Only the visit date and recommendations will be shared.
            </span>
          </span>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={pending}
        >
          Cancel
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-red-600" role="alert">{error}</p>
      ) : null}

      {successMessage ? (
        <p className="text-sm text-green-700" role="status">{successMessage}</p>
      ) : null}
    </form>
  );
}

type PublishSharingChooserProps = {
  visitId: string;
  onCancel: () => void;
};

function PublishSharingChooser({ visitId, onCancel }: PublishSharingChooserProps) {
  const [state, formAction, pending] = useActionState(publishVisitAction, null);

  const error = state && !state.success ? state.error : null;
  const successMessage =
    state?.success && state.data?.message ? state.data.message : null;

  return (
    <SharingChooser
      visitId={visitId}
      defaultScope="full"
      submitLabel="Confirm share"
      formAction={formAction}
      pending={pending}
      error={error}
      successMessage={successMessage}
      onCancel={onCancel}
    />
  );
}

type UpdateScopeSharingChooserProps = {
  visitId: string;
  defaultScope: VisitPublicationScope;
  onCancel: () => void;
};

function UpdateScopeSharingChooser({
  visitId,
  defaultScope,
  onCancel,
}: UpdateScopeSharingChooserProps) {
  const [state, formAction, pending] = useActionState(
    updateVisitPublicationScopeAction,
    null,
  );

  const error = state && !state.success ? state.error : null;
  const successMessage =
    state?.success && state.data?.message ? state.data.message : null;

  return (
    <SharingChooser
      visitId={visitId}
      defaultScope={defaultScope}
      submitLabel="Update sharing"
      formAction={formAction}
      pending={pending}
      error={error}
      successMessage={successMessage}
      onCancel={onCancel}
    />
  );
}

export function VisitPublicationBanner({ visit }: VisitPublicationBannerProps) {
  const isPublished = visit.published_at !== null;
  const [showShareChooser, setShowShareChooser] = useState(false);
  const [showChangeChooser, setShowChangeChooser] = useState(false);

  const [unpublishState, unpublishAction, unpublishPending] = useActionState(
    unpublishVisitAction,
    null,
  );

  const unpublishError =
    unpublishState && !unpublishState.success ? unpublishState.error : null;
  const unpublishSuccessMessage =
    unpublishState?.success && unpublishState.data?.message
      ? unpublishState.data.message
      : null;

  function handleUnpublish(event: FormEvent<HTMLFormElement>) {
    if (
      !window.confirm(
        "Unpublish this visit? Your client will no longer be able to see it.",
      )
    ) {
      event.preventDefault();
    }
  }

  function openShareChooser() {
    setShowShareChooser(true);
  }

  function closeShareChooser() {
    setShowShareChooser(false);
  }

  function openChangeChooser() {
    setShowChangeChooser(true);
  }

  function closeChangeChooser() {
    setShowChangeChooser(false);
  }

  return (
    <Card
      className={cn(
        isPublished
          ? "border-green-200 bg-green-50/40"
          : "border-amber-200 bg-amber-50/40",
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">Client visibility</CardTitle>
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-xs font-medium",
              isPublished
                ? "border-green-200 bg-green-100 text-green-800"
                : "border-amber-200 bg-amber-100 text-amber-800",
            )}
          >
            {isPublished
              ? ownerPublicationScopeLabel(visit.publication_scope)
              : "Draft — not shared with client"}
          </span>
        </div>
        <CardDescription>
          {isPublished
            ? visit.published_at
              ? `Shared on ${formatPublishedAt(visit.published_at)}.`
              : "Shared with client."
            : "This visit is private to your business until you share it."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isPublished && !showShareChooser ? (
          <>
            <p className="text-sm text-zinc-600">
              Choose what to share with your client. Professional notes remain
              private and are never shared.
            </p>
            <Button
              type="button"
              onClick={openShareChooser}
              disabled={unpublishPending}
            >
              Share visit with client
            </Button>
          </>
        ) : null}

        {!isPublished && showShareChooser ? (
          <PublishSharingChooser visitId={visit.id} onCancel={closeShareChooser} />
        ) : null}

        {isPublished && !showChangeChooser ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={openChangeChooser}
              disabled={unpublishPending}
            >
              Change sharing mode
            </Button>
            <form action={unpublishAction} onSubmit={handleUnpublish}>
              <input type="hidden" name="visitId" value={visit.id} />
              <Button type="submit" variant="outline" disabled={unpublishPending}>
                {unpublishPending ? "Unpublishing…" : "Unpublish"}
              </Button>
            </form>
          </div>
        ) : null}

        {isPublished && showChangeChooser ? (
          <UpdateScopeSharingChooser
            visitId={visit.id}
            defaultScope={visit.publication_scope}
            onCancel={closeChangeChooser}
          />
        ) : null}

        {unpublishError ? (
          <p className="text-sm text-red-600" role="alert">{unpublishError}</p>
        ) : null}

        {unpublishSuccessMessage ? (
          <p className="text-sm text-green-700" role="status">
            {unpublishSuccessMessage}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
