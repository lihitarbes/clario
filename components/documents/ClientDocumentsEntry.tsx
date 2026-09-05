import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ClientDocumentsEntryProps = {
  clientId: string;
  documentCount: number;
  loadError?: string | null;
};

export function ClientDocumentsEntry({
  clientId,
  documentCount,
  loadError = null,
}: ClientDocumentsEntryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Documents</CardTitle>
        <CardDescription>
          Visit files and general client documents.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loadError ? (
          <p className="text-sm text-red-600" role="alert">
            {loadError}
          </p>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-zinc-600">
              {documentCount === 0
                ? "No documents yet."
                : documentCount === 1
                  ? "1 document"
                  : `${documentCount} documents`}
            </p>
            <Link
              href={`/clients/${clientId}/documents`}
              className="text-sm font-medium text-zinc-900 underline hover:text-zinc-700"
            >
              View all documents →
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
