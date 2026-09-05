import { z } from "zod";

export const productIdSchema = z.string().uuid("Invalid product.");

export const productCurrencySchema = z.enum(["ILS", "USD"], {
  message: "Select ILS or USD.",
});

export const productFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required.")
    .max(120, "Name is too long."),
  description: z
    .string()
    .trim()
    .max(2000, "Description is too long.")
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  price: z.coerce
    .number({ message: "Enter a valid price." })
    .finite("Enter a valid price.")
    .min(0, "Price cannot be negative.")
    .max(999999.99, "Price is too large."),
  currency: productCurrencySchema,
});

export const updateProductFormSchema = productFormSchema.extend({
  productId: productIdSchema,
});
