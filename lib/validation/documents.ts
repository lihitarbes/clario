import { z } from "zod";

export const documentIdSchema = z.string().uuid("Invalid document.");

export const documentTypeSchema = z.enum([
  "receipt",
  "visit_summary",
  "insurance",
  "other",
]);

export const uploadDocumentSchema = z.object({
  clientId: z.string().uuid("Invalid client."),
  type: documentTypeSchema,
  visitId: z.string().uuid("Invalid visit.").optional(),
});
