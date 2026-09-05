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

type VisitDocumentsSectionProps = {
  clientId: string;
  visitId: string;
  documents: OwnerDocumentListItem[];
  canUpload: boolean;
  loadError?: string | null;
};

export function VisitDocumentsSection({
  clientId,
  visitId,
  documents,
  canUpload,
  loadError = null,
}: VisitDocumentsSectionProps) {
  const [uploadOpen, setUploadOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">Documents</CardTitle>
          <CardDescription className="mt-1.5">
            Files linked to this visit.
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
            emptyMessage="No documents linked to this visit yet."
          />
        )}

        {uploadOpen && canUpload ? (
          <DocumentUploadFields
            clientId={clientId}
            visitId={visitId}
            description="Uploads are automatically linked to this visit."
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
