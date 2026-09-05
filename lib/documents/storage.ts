import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export const DOCUMENTS_BUCKET = "documents";
export const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
export const DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
] as const;

export type DocumentMimeType = (typeof DOCUMENT_MIME_TYPES)[number];

export function buildDocumentStoragePath(params: {
  businessId: string;
  clientId: string;
  documentId: string;
  storageFileName: string;
}): string {
  return `${params.businessId}/${params.clientId}/${params.documentId}/${params.storageFileName}`;
}

export function extensionForDocumentMime(
  mime: string,
): "pdf" | "jpg" | "png" | "webp" | "txt" | null {
  switch (mime) {
    case "application/pdf":
      return "pdf";
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "text/plain":
      return "txt";
    default:
      return null;
  }
}

/** Safe object-name segment (no path separators). */
export function buildDocumentStorageFileName(mime: string): string | null {
  const extension = extensionForDocumentMime(mime);
  if (!extension) {
    return null;
  }
  return `${crypto.randomUUID()}.${extension}`;
}

export function validateDocumentFile(file: File): string | null {
  if (!DOCUMENT_MIME_TYPES.includes(file.type as DocumentMimeType)) {
    return "Use a PDF, JPG, PNG, WebP, or plain text file.";
  }
  if (file.size <= 0) {
    return "File is empty.";
  }
  if (file.size > DOCUMENT_MAX_BYTES) {
    return "File must be 10 MB or smaller.";
  }
  return null;
}

export async function createDocumentSignedUrl(
  supabase: SupabaseClient<Database>,
  filePath: string | null | undefined,
  expiresInSeconds = 60 * 60,
): Promise<string | null> {
  if (!filePath) {
    return null;
  }

  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(filePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    return null;
  }

  return data.signedUrl;
}

export async function signDocumentPaths(
  supabase: SupabaseClient<Database>,
  documents: { id: string; file_path: string }[],
): Promise<Map<string, string | null>> {
  const entries = await Promise.all(
    documents.map(async (document) => {
      const url = await createDocumentSignedUrl(supabase, document.file_path);
      return [document.id, url] as const;
    }),
  );
  return new Map(entries);
}
