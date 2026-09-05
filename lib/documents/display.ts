import type { DocumentType } from "@/types/database";

export function documentTypeLabel(type: DocumentType): string {
  switch (type) {
    case "receipt":
      return "Receipt";
    case "visit_summary":
      return "Visit Summary";
    case "insurance":
      return "Insurance";
    case "other":
      return "Other";
  }
}

export const DOCUMENT_TYPE_OPTIONS: Array<{
  value: DocumentType;
  label: string;
}> = [
  { value: "receipt", label: "Receipt" },
  { value: "visit_summary", label: "Visit Summary" },
  { value: "insurance", label: "Insurance" },
  { value: "other", label: "Other" },
];

export function documentTypeFileSlug(type: DocumentType): string {
  switch (type) {
    case "receipt":
      return "receipt";
    case "visit_summary":
      return "visit-summary";
    case "insurance":
      return "insurance-document";
    case "other":
      return "document";
  }
}