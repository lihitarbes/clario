"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  deleteClientDocumentAction,
  uploadClientDocumentAction,
} from "@/actions/documents";
import { ActionPendingLabel } from "@/components/ui/action-pending-label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DOCUMENT_TYPE_OPTIONS,
  documentTypeLabel,
} from "@/lib/documents/display";
import { DOCUMENT_MAX_BYTES } from "@/lib/documents/storage";
import type { Document, DocumentType } from "@/types/database";

export type OwnerDocumentListItem = Document & {
  signedUrl: string | null;
  visitLabel: string | null;
};

const selectClassName =
  "flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400";

export function DeleteDocumentButton({ documentId }: { documentId: string }) {
  const [state, formAction, pending] = useActionState(
    deleteClientDocumentAction,
    null,
  );

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm("Delete this document? This cannot be undone.")) {
          event.preventDefault();
        }
      }}
      className="space-y-1"
    >
      <input type="hidden" name="documentId" value={documentId} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        <ActionPendingLabel
          pending={pending}
          pendingLabel="Deleting…"
          idleLabel="Delete"
        />
      </Button>
      {state && !state.success ? (
        <p className="text-xs text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

type DocumentUploadFieldsProps = {
  clientId: string;
  /** When set, upload is locked to this visit (no picker). */
  visitId?: string;
  description?: string;
  onCancel?: () => void;
  onSuccess?: () => void;
};

export function DocumentUploadFields({
  clientId,
  visitId,
  description,
  onCancel,
  onSuccess,
}: DocumentUploadFieldsProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    uploadClientDocumentAction,
    null,
  );
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  useEffect(() => {
    if (state?.success) {
      onSuccessRef.current?.();
      router.refresh();
    }
  }, [state, router]);

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-md border border-zinc-200 bg-zinc-50 p-4"
    >
      <input type="hidden" name="clientId" value={clientId} />
      {visitId ? <input type="hidden" name="visitId" value={visitId} /> : null}

      {description ? (
        <p className="text-sm text-zinc-600">{description}</p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="document-type">Type</Label>
        <select
          id="document-type"
          name="type"
          required
          defaultValue={"receipt" satisfies DocumentType}
          className={selectClassName}
        >
          {DOCUMENT_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="document-file">File</Label>
        <Input
          id="document-file"
          name="file"
          type="file"
          required
          accept="application/pdf,image/jpeg,image/png,image/webp,text/plain,.pdf,.jpg,.jpeg,.png,.webp,.txt"
        />
        <p className="text-xs text-zinc-500">
          PDF, JPG, PNG, WebP, or text · max {DOCUMENT_MAX_BYTES / (1024 * 1024)}{" "}
          MB
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          <ActionPendingLabel
            pending={pending}
            pendingLabel="Uploading…"
            idleLabel="Upload"
          />
        </Button>
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={onCancel}
          >
            Cancel
          </Button>
        ) : null}
      </div>

      {state && !state.success ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

type OwnerDocumentListProps = {
  documents: OwnerDocumentListItem[];
  emptyMessage: string;
  showVisitLink?: boolean;
};

export function OwnerDocumentList({
  documents,
  emptyMessage,
  showVisitLink = false,
}: OwnerDocumentListProps) {
  if (documents.length === 0) {
    return <p className="text-sm text-zinc-600">{emptyMessage}</p>;
  }

  return (
    <ul className="space-y-3">
      {documents.map((document) => (
        <li
          key={document.id}
          className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-zinc-200 bg-white p-3"
        >
          <div className="min-w-0 space-y-1">
            <p className="truncate text-sm font-medium text-zinc-900">
              {document.file_name}
            </p>
            <p className="text-xs text-zinc-500">
              {documentTypeLabel(document.type)} ·{" "}
              {new Date(document.created_at).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
            {showVisitLink ? (
              document.visit_id ? (
                <p className="text-xs text-zinc-500">
                  Visit:{" "}
                  <Link
                    href={`/calendar/visits/${document.visit_id}`}
                    className="underline hover:text-zinc-900"
                  >
                    {document.visitLabel ?? "View visit"}
                  </Link>
                </p>
              ) : (
                <p className="text-xs text-zinc-500">General (no visit)</p>
              )
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {document.signedUrl ? (
              <Button asChild variant="outline" size="sm">
                <a
                  href={document.signedUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open
                </a>
              </Button>
            ) : (
              <p className="text-xs text-zinc-500">Unavailable</p>
            )}
            <DeleteDocumentButton documentId={document.id} />
          </div>
        </li>
      ))}
    </ul>
  );
}
