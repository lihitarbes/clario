import { z } from "zod";

export const reimbursementPackageSchema = z.object({
  visitId: z.string().uuid("Invalid visit."),
  documentIds: z
    .array(z.string().uuid("Invalid document."))
    .min(1, "Select at least one document.")
    .max(30, "Too many documents selected."),
});
