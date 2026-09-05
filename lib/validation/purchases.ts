import { z } from "zod";

export const purchaseIdSchema = z.string().uuid("Invalid purchase.");

export const purchaseStatusSchema = z.enum([
  "pending",
  "confirmed",
  "completed",
  "cancelled",
]);

export const createPurchaseSchema = z.object({
  businessId: z.string().uuid("Invalid business."),
  clientId: z.string().uuid("Invalid client."),
  itemsJson: z.string().min(1, "Select at least one product."),
});

export const purchaseItemInputSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).max(99),
});

export const purchaseItemsSchema = z
  .array(purchaseItemInputSchema)
  .min(1, "Select at least one product.")
  .max(50, "Too many items.");

export function parsePurchaseItemsJson(raw: string) {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return purchaseItemsSchema.safeParse(parsed);
  } catch {
    return purchaseItemsSchema.safeParse(null);
  }
}
