"use client";

import { useMemo, useState } from "react";
import { ActionPendingLabel } from "@/components/ui/action-pending-label";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { documentTypeLabel } from "@/lib/documents/display";
import type { DocumentType } from "@/types/database";

export type ClientVisitDocumentItem = {
  id: string;
  type: DocumentType;
  file_name: string;
  created_at: string;
  signedUrl: string | null;
};

type ClientVisitDocumentsSectionProps = {
  visitId: string;
  documents: ClientVisitDocumentItem[];
};

function formatUploadedDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ClientVisitDocumentsSection({
  visitId,
  documents,
}: ClientVisitDocumentsSectionProps) {
  const [preparing, setPreparing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    documents.map((document) => document.id),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const canDownload = selectedIds.length > 0 && !pending;

  function openPrepare() {
    setSelectedIds(documents.map((document) => document.id));
    setError(null);
    setPreparing(true);
  }

  function cancelPrepare() {
    setPreparing(false);
    setError(null);
    setPending(false);
  }

  function toggleDocument(documentId: string) {
    setSelectedIds((current) =>
      current.includes(documentId)
        ? current.filter((id) => id !== documentId)
        : [...current, documentId],
    );
  }

  async function downloadPackage() {
    if (selectedIds.length === 0) {
      setError("Select at least one document.");
      return;
    }

    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/reimbursement/package", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitId,
          documentIds: selectedIds,
        }),
      });

      if (!response.ok) {
        let message = "Could not download the reimbursement package.";
        try {
          const payload = (await response.json()) as { error?: string };
          if (payload.error) {
            message = payload.error;
          }
        } catch {
          // keep default message
        }
        setError(message);
        return;
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? "clario-reimbursement.zip";

      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);

      setPreparing(false);
    } catch {
      setError("Could not download the reimbursement package.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Documents</CardTitle>
        <CardDescription>
          Files shared for this visit — receipts, summaries, and related
          records.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {documents.length === 0 ? (
          <p className="text-sm text-zinc-600">
            No documents are available for this visit yet.
          </p>
        ) : (
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
                    {formatUploadedDate(document.created_at)}
                  </p>
                </div>
                <div>
                  {document.signedUrl ? (
                    <Button asChild variant="outline" size="sm">
                      <a
                        href={document.signedUrl}
                        target="_blank"
                        rel="noreferrer"
                        download={document.file_name}
                      >
                        Open
                      </a>
                    </Button>
                  ) : (
                    <p className="text-xs text-zinc-500">Unavailable</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {documents.length === 0 ? null : !preparing ? (
          <Button type="button" variant="outline" onClick={openPrepare}>
            Prepare reimbursement
          </Button>
        ) : (
          <div className="space-y-4 rounded-md border border-zinc-200 bg-zinc-50 p-4">
            <div>
              <p className="text-sm font-medium text-zinc-900">
                Prepare reimbursement
              </p>
              <p className="mt-1 text-sm text-zinc-600">
                Choose which visit documents to include in your download
                package.
              </p>
            </div>

            <ul className="space-y-2">
              {documents.map((document) => (
                <li key={document.id}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-md border border-zinc-200 bg-white p-3">
                    <input
                      type="checkbox"
                      className="mt-1 size-4 rounded border-zinc-300"
                      checked={selectedSet.has(document.id)}
                      onChange={() => toggleDocument(document.id)}
                      disabled={pending}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-zinc-900">
                        {document.file_name}
                      </span>
                      <span className="block text-xs text-zinc-500">
                        {documentTypeLabel(document.type)} ·{" "}
                        {formatUploadedDate(document.created_at)}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                disabled={!canDownload}
                onClick={() => void downloadPackage()}
              >
                <ActionPendingLabel
                  pending={pending}
                  pendingLabel="Preparing…"
                  idleLabel="Download package"
                />
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={cancelPrepare}
              >
                Cancel
              </Button>
            </div>

            {error ? (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
