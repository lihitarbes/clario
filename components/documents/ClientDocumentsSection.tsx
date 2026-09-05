"use client";

import { useState } from "react";
import {
  DocumentUploadFields,
  OwnerDocumentList,
  type OwnerDocumentListItem,
} from "@/components/documents/OwnerDocumentList";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type { OwnerDocumentListItem };

type ClientDocumentsSectionProps = {
  clientId: string;
  documents: OwnerDocumentListItem[];
  canUpload: boolean;
  loadError?: string | null;
};

export function ClientDocumentsSection({
  clientId,
  documents,
  canUpload,
  loadError = null,
}: ClientDocumentsSectionProps) {
  const [uploadOpen, setUploadOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">All documents</CardTitle>
          <CardDescription className="mt-1.5">
            Visit-linked and general files for this client. Prefer uploading
            visit files from the visit page.
          </CardDescription>
        </div>
        {canUpload && !uploadOpen ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setUploadOpen(true)}
          >
            + Add document
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-6">
        {loadError ? (
          <p className="text-sm text-red-600" role="alert">
            {loadError}
          </p>
        ) : (
          <OwnerDocumentList
            documents={documents}
            emptyMessage="No documents yet."
            showVisitLink
          />
        )}

        {uploadOpen && canUpload ? (
          <DocumentUploadFields
            clientId={clientId}
            description="This upload is a general document (not linked to a visit)."
            onCancel={() => setUploadOpen(false)}
            onSuccess={() => setUploadOpen(false)}
          />
        ) : null}

        {!canUpload ? (
          <p className="text-sm text-zinc-600">
            This client is archived. Existing documents can still be opened or
            deleted.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
