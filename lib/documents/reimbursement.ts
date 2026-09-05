import {
  documentTypeFileSlug,
  documentTypeLabel,
} from "@/lib/documents/display";
import { extensionForDocumentMime } from "@/lib/documents/storage";
import type { DocumentType } from "@/types/database";

const MAX_ZIP_ENTRY_BASENAME = 120;

/** Strip path segments and unsafe characters for ZIP entry names. */
export function sanitizeZipFileName(raw: string): string {
  const base = raw
    .replace(/\\/g, "/")
    .split("/")
    .pop()
    ?.trim()
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[<>:"|?*]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  if (!base || base === "." || base === "..") {
    return "";
  }

  return base.slice(0, MAX_ZIP_ENTRY_BASENAME);
}

function extensionFromName(name: string): string | null {
  const match = name.match(/\.([a-z0-9]{1,8})$/i);
  return match?.[1]?.toLowerCase() ?? null;
}

export function buildZipEntryFileName(
  document: {
    file_name: string;
    type: DocumentType;
    mime_type: string;
  },
  usedNames: Set<string>,
): string {
  const mimeExt = extensionForDocumentMime(document.mime_type);
  const nameExt = extensionFromName(document.file_name);
  const extension = mimeExt ?? nameExt ?? "bin";

  let sanitized = sanitizeZipFileName(document.file_name);
  if (!sanitized) {
    sanitized = `${documentTypeFileSlug(document.type)}.${extension}`;
  } else if (!extensionFromName(sanitized)) {
    sanitized = `${sanitized}.${extension}`;
  }

  const lower = sanitized.toLowerCase();
  if (!usedNames.has(lower)) {
    usedNames.add(lower);
    return sanitized;
  }

  const extMatch = sanitized.match(/^(.*)(\.[^.]+)$/);
  const stem = extMatch?.[1] ?? sanitized;
  const ext = extMatch?.[2] ?? "";

  let n = 2;
  while (n < 1000) {
    const candidate = `${stem}-${n}${ext}`;
    const candidateLower = candidate.toLowerCase();
    if (!usedNames.has(candidateLower)) {
      usedNames.add(candidateLower);
      return candidate;
    }
    n += 1;
  }

  const fallback = `${documentTypeFileSlug(document.type)}-${crypto.randomUUID().slice(0, 8)}${ext || `.${extension}`}`;
  usedNames.add(fallback.toLowerCase());
  return fallback;
}

export function reimbursementZipDownloadName(date = new Date()): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `clario-reimbursement-${yyyy}-${mm}-${dd}.zip`;
}

export function reimbursementDocumentLabel(params: {
  type: DocumentType;
  file_name: string;
}): string {
  return `${documentTypeLabel(params.type)} · ${params.file_name}`;
}
